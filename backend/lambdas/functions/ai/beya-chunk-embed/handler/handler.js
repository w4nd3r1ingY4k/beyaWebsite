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
 * Improved chunking: splits text into overlapping chunks on sentence boundaries
 */
function chunkTextWithOverlap(text, max = Number(MAX_CHUNK_CHARS), overlap = 200) {
  if (text.length <= max) return [text];
  const sentences = text.match(/[^.!?]+[.!?\n]+/g) || [text];
  const chunks = [];
  let current = "";
  for (const s of sentences) {
    if ((current + s).length > max) {
      if (current) chunks.push(current.trim());
      // Start new chunk with overlap from previous
      current = current.slice(-overlap) + s;
    } else {
      current += s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

exports.handler = async (event) => {
  const index = await getPineconeIndex();
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
          data: { bodyText = "", from, to, subject, messageId } = {},
          inReplyTo = '',
          references = '',
          userId = '',
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
      // Improved chunking
      const chunks = chunkTextWithOverlap(baseText);
      // Deduplicate and filter short/empty chunks
      const uniqueChunks = Array.from(new Set(chunks)).filter(c => c && c.length > 20);

      // Batch embedding (OpenAI allows batching)
      const batchSize = 10;
      let embeddingsRes = [];
      for (let i = 0; i < uniqueChunks.length; i += batchSize) {
        const batch = uniqueChunks.slice(i, i + batchSize);
        const res = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: batch,
        });
        embeddingsRes.push(...res.data.map(d => d.embedding));
      }

      // Build participants array
      const participants = [from]
        .concat(Array.isArray(to) ? to : [to])
        .filter(Boolean);

      // Upsert into Pinecone with enriched metadata
      const vectors = uniqueChunks.map((chunk, idx) => ({
        id: `${eventId || rootId}-${idx}`,
        values: embeddingsRes[idx],
        metadata: {
          threadId: threadId || enhancedEvent.detail?.data?.threadId || enhancedEvent.threadId || '',
          eventId: eventId || rootId,
          eventType,
          timestamp,
          chunkIndex: idx,
          chunkCount: uniqueChunks.length,
          content: chunk,
          naturalLanguageDescription: nld,
          bodyText: bodyText,
          subject: subject || '',
          userId: userId || '',
          messageId: messageId || '',
          emailDirection: from ? 'received' : 'sent',
          emailParticipant: from || (Array.isArray(to) ? to.join(', ') : to) || '',
          sentiment: comprehendSentiment?.sentiment || 'UNKNOWN',
          sentimentConfidence: comprehendSentiment?.confidence || 0,
          sentimentPositive: comprehendSentiment?.scores?.positive || 0,
          sentimentNegative: comprehendSentiment?.scores?.negative || 0,
          sentimentNeutral: comprehendSentiment?.scores?.neutral || 0,
          sentimentMixed: comprehendSentiment?.scores?.mixed || 0,
          participants,
          inReplyTo: inReplyTo || '',
          references: references || '',
          chunkStart: baseText.indexOf(chunk),
          chunkEnd: baseText.indexOf(chunk) + chunk.length,
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