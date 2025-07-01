const { Pinecone } = require('@pinecone-database/pinecone');
require('dotenv').config();

async function searchByThreadId() {
  try {
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
    const index = pc.index('beya-context-index');
    
    console.log('🔍 Searching for all emails in thread: akbar_shamji@brown.edu\n');
    
    // Search for all emails in a specific thread
    const results = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector for metadata-only search
      topK: 20,
      includeMetadata: true,
      filter: {
        threadId: 'akbar_shamji@brown.edu'
      }
    });
    
    console.log(`Found ${results.matches.length} emails in this thread:\n`);
    
    results.matches.forEach((match, i) => {
      console.log(`${i + 1}. Email ID: ${match.id}`);
      console.log(`   Subject: ${match.metadata.subject || 'No subject'}`);
      console.log(`   Type: ${match.metadata.eventType}`);
      console.log(`   Direction: ${match.metadata.emailDirection || 'N/A'}`);
      console.log(`   Participant: ${match.metadata.emailParticipant || 'N/A'}`);
      console.log(`   Timestamp: ${match.metadata.timestamp}`);
      console.log(`   ThreadId: ${match.metadata.threadId}`);
      console.log('');
    });
    
    // Also search for emails with semantic query + threadId filter
    console.log('\n🎯 Semantic search within thread for "stock":\n');
    
    const { OpenAI } = require('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    
    const embeddingResponse = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'stock availability',
    });
    
    const semanticResults = await index.query({
      vector: embeddingResponse.data[0].embedding,
      topK: 5,
      includeMetadata: true,
      filter: {
        threadId: 'akbar_shamji@brown.edu'
      }
    });
    
    semanticResults.matches.forEach((match, i) => {
      console.log(`${i + 1}. Score: ${match.score.toFixed(3)}`);
      console.log(`   Subject: ${match.metadata.subject}`);
      console.log(`   Content: ${match.metadata.originalText?.substring(0, 100)}...`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

searchByThreadId(); 