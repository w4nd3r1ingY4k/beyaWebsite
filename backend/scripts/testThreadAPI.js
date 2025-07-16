// Script to test the thread API endpoint directly
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const FLOW_ID = 'e3bdc140-167e-41d0-9a14-7efe196801cc';
const USER_ID = 'c4f8c458-c0c1-7073-e9be-c6856b74a3e2';
const API_BASE = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod';

async function testThreadAPI() {
  console.log('🔍 Testing thread API endpoint...\n');
  
  const url = `${API_BASE}/webhook/threads/${FLOW_ID}?userId=${USER_ID}`;
  console.log(`📡 Calling: ${url}\n`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, response.headers.raw());
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.messages && Array.isArray(data.messages)) {
      console.log(`\n✅ Found ${data.messages.length} messages`);
      
      data.messages.forEach((msg, index) => {
        console.log(`\n--- Message ${index + 1} ---`);
        console.log(`MessageId: ${msg.MessageId}`);
        console.log(`Direction: ${msg.Direction}`);
        console.log(`Body: ${msg.Body}`);
        console.log(`Timestamp: ${msg.Timestamp} (${new Date(msg.Timestamp).toISOString()})`);
        console.log(`ThreadId: ${msg.ThreadId}`);
        console.log(`Channel: ${msg.Channel}`);
      });
    } else {
      console.log('\n❌ No messages array in response!');
    }
    
  } catch (error) {
    console.error('\n❌ Error calling API:', error);
  }
}

// Run the test
testThreadAPI().catch(console.error); 