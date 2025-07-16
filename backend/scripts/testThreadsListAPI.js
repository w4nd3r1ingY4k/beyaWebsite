// Script to test the threads list API endpoint
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const USER_ID = 'c4f8c458-c0c1-7073-e9be-c6856b74a3e2';
const API_BASE = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod';

async function testThreadsListAPI() {
  console.log('🔍 Testing threads list API endpoint...\n');
  
  const url = `${API_BASE}/webhook/threads?userId=${USER_ID}`;
  console.log(`📡 Calling: ${url}\n`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.threads && Array.isArray(data.threads)) {
      console.log(`\n✅ Found ${data.threads.length} thread IDs`);
      
      // Check if our target flow ID is in the list
      const targetFlowId = 'e3bdc140-167e-41d0-9a14-7efe196801cc';
      const hasTargetFlow = data.threads.includes(targetFlowId);
      
      if (hasTargetFlow) {
        console.log(`\n✅ Target flow ${targetFlowId} IS in the threads list!`);
      } else {
        console.log(`\n❌ Target flow ${targetFlowId} is NOT in the threads list!`);
        console.log('\n📋 Thread IDs returned:');
        data.threads.forEach((id, index) => {
          console.log(`  ${index + 1}. ${id}`);
        });
      }
    } else {
      console.log('\n❌ No threads array in response!');
    }
    
  } catch (error) {
    console.error('\n❌ Error calling API:', error);
  }
}

// Run the test
testThreadsListAPI().catch(console.error); 