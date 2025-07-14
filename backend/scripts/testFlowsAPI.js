// Script to test the flows API endpoint
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const USER_ID = 'c4f8c458-c0c1-7073-e9be-c6856b74a3e2';
const API_BASE = 'https://8zsaycb149.execute-api.us-east-1.amazonaws.com/prod';

async function testFlowsAPI() {
  console.log('🔍 Testing flows API endpoint...\n');
  
  const url = `${API_BASE}/flows?userId=${USER_ID}`;
  console.log(`📡 Calling: ${url}\n`);
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log('\n📦 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.flows && Array.isArray(data.flows)) {
      console.log(`\n✅ Found ${data.flows.length} flows`);
      
      // Look for the specific flow
      const targetFlow = data.flows.find(f => f.flowId === 'e3bdc140-167e-41d0-9a14-7efe196801cc');
      
      if (targetFlow) {
        console.log('\n🎯 Found target flow for akbar_shamji@brown.edu:');
        console.log(JSON.stringify(targetFlow, null, 2));
      } else {
        console.log('\n❌ Target flow e3bdc140-167e-41d0-9a14-7efe196801cc NOT FOUND in flows list!');
        
        // Check if any flows have the email
        const emailFlows = data.flows.filter(f => 
          f.contactIdentifier === 'akbar_shamji@brown.edu' ||
          f.contactEmail === 'akbar_shamji@brown.edu' ||
          f.fromEmail === 'akbar_shamji@brown.edu'
        );
        
        if (emailFlows.length > 0) {
          console.log('\n📧 But found other flows with akbar_shamji@brown.edu:');
          emailFlows.forEach(f => {
            console.log(`  - FlowId: ${f.flowId}, Contact: ${f.contactIdentifier}`);
          });
        }
      }
    } else {
      console.log('\n❌ No flows array in response!');
    }
    
  } catch (error) {
    console.error('\n❌ Error calling API:', error);
  }
}

// Run the test
testFlowsAPI().catch(console.error); 