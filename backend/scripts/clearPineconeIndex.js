import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';
dotenv.config();

const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = process.env.PINECONE_INDEX_NAME;

if (!PINECONE_API_KEY || !PINECONE_INDEX_NAME) {
  console.error('Missing Pinecone environment variables.');
  process.exit(1);
}

const pinecone = new Pinecone({
  apiKey: PINECONE_API_KEY,
});

async function clearIndex() {
  try {
    const index = pinecone.Index(PINECONE_INDEX_NAME);
    // Describe index to get stats
    const stats = await index.describeIndexStats();
    const totalVectors = stats.totalVectorCount || 0;
    console.log(`Index contains ${totalVectors} vectors.`);
    if (totalVectors === 0) {
      console.log('Index is already empty.');
      return;
    }
    // Delete all vectors
    await index.delete1({ deleteAll: true });
    console.log('All vectors deleted from Pinecone index.');
  } catch (err) {
    console.error('Error clearing Pinecone index:', err);
    process.exit(1);
  }
}

clearIndex(); 