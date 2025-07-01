// Lambda: beya-chunk-embed
// Purpose: Consume enhanced events from SQS, chunk text, embed with OpenAI, and store vectors in Pinecone.

const { SQSClient, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const OpenAI = require('openai');
const { Pinecone } = require('@pinecone-database/pinecone');

const {
  CHUNKER_QUEUE_URL,
  OPENAI_API_KEY,
  PINECONE_API_KEY,
  PINECONE_INDEX_NAME,
  MAX_CHUNK_CHARS = "2000", // default chunk size
} = process.env;

if (!CHUNKER_QUEUE_URL) throw new Error("CHUNKER_QUEUE_URL env var required");
if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY env var required");
if (!PINECONE_API_KEY) throw new Error("PINECONE_API_KEY env var required");
if (!PINECONE_INDEX_NAME) throw new Error("PINECONE_INDEX_NAME env var required");

const sqsClient = new SQSClient({ region: process.env.AWS_REGION || 'us-east-1' });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Lazy-init Pinecone index (only first invocation per container)
let pineconeIndex;
async function getPineconeIndex() {
  if (!pineconeIndex) {
    const pinecone = new Pinecone({
      apiKey: PINECONE_API_KEY,
    });
    pineconeIndex = pinecone.index(PINECONE_INDEX_NAME);
  }
  return pineconeIndex;
}

/**
 * Splits a longer string into roughly equal‐sized chunks on sentence boundaries
 */
function chunkText(text, max = Number(MAX_CHUNK_CHARS)) {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?\n]+/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > max) {
      if (current) chunks.push(current.trim());
      current = s;
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

exports.handler = async (event) => {
  const index = await getPineconeIndex();
  // SQS batch event
  for (const record of event.Records || []) {
    const receiptHandle = record.receiptHandle;
    try {
      const body = JSON.parse(record.body);
      const enhancedEvent = typeof body === "string" ? JSON.parse(body) : body;
      const {
        id: rootId,
        detail: {
          eventId,
          threadId,
          timestamp,
          eventType,
          data: { bodyText = "" } = {},
        } = {},
        naturalLanguageDescription: nld = "",
        comprehendSentiment,
      } = enhancedEvent;

      // Log threadId extraction for debugging
      console.log(`Processing event ${eventId || rootId}:`, {
        threadId: threadId,
        eventType: eventType,
        hasThreadId: !!threadId,
        detailKeys: Object.keys(enhancedEvent.detail || {}),
      });

      const baseText = `${nld}\n\n${bodyText}`.trim();
      if (!baseText) {
        console.warn("No text to embed, skipping", { rootId });
        continue;
      }
      const chunks = chunkText(baseText);

      // Generate embeddings in parallel (OpenAI allows batches up to 2048 tokens; we're safe)
      const embeddingsRes = await Promise.all(
        chunks.map((chunk) =>
          openai.embeddings.create({
            model: "text-embedding-3-small",
            input: chunk,
          })
        )
      );

      // Upsert into Pinecone (flatten comprehendSentiment for Pinecone compatibility)
      const vectors = embeddingsRes.map((embRes, idx) => ({
        id: `${eventId || rootId}-${idx}`,
        values: embRes.data[0].embedding,
        metadata: {
          threadId: threadId || enhancedEvent.detail?.data?.threadId || enhancedEvent.threadId || '',
          eventId: eventId || rootId,
          eventType,
          timestamp,
          chunkIndex: idx,
          chunkCount: chunks.length,
          // Store the actual content
          content: chunks[idx], // The actual chunked text content
          naturalLanguageDescription: nld, // AI-generated description
          bodyText: bodyText, // Original email body
          subject: enhancedEvent.detail?.data?.subject || '',
          userId: enhancedEvent.detail?.userId || '',
          messageId: enhancedEvent.detail?.data?.messageId || '',
          // Store sender/recipient information for proper email direction
          // If there's a from field (received email), store it; otherwise store to field (sent email)
          emailDirection: enhancedEvent.detail?.data?.from ? 'received' : 'sent',
          emailParticipant: enhancedEvent.detail?.data?.from || 
            (enhancedEvent.detail?.data?.to ? 
              (Array.isArray(enhancedEvent.detail.data.to) ? 
                enhancedEvent.detail.data.to.join(', ') : 
                enhancedEvent.detail.data.to) : ''),
          // Flatten comprehendSentiment object for Pinecone compatibility
          sentiment: comprehendSentiment?.sentiment || 'UNKNOWN',
          sentimentConfidence: comprehendSentiment?.confidence || 0,
          sentimentPositive: comprehendSentiment?.scores?.positive || 0,
          sentimentNegative: comprehendSentiment?.scores?.negative || 0,
          sentimentNeutral: comprehendSentiment?.scores?.neutral || 0,
          sentimentMixed: comprehendSentiment?.scores?.mixed || 0,
        },
      }));

      await index.upsert(vectors);
      console.log(`Upserted ${vectors.length} vectors for event ${eventId || rootId}`);

      // Delete the message so it's not reprocessed
      await sqsClient.send(
        new DeleteMessageCommand({
          QueueUrl: CHUNKER_QUEUE_URL,
          ReceiptHandle: receiptHandle,
        })
      );
    } catch (err) {
      console.error("Failed to process SQS record", { err, record });
      // Let the message become visible again for retry
    }
  }
}; 