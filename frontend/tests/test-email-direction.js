const axios = require('axios');

const API_BASE = 'http://localhost:2074';

async function testEmailDirectionQueries() {
  console.log('🧪 Testing Email Direction Filtering...\n');
  
  const testQueries = [
    {
      query: "tell me about my emails",
      description: "General personal email query"
    },
    {
      query: "what emails did I send recently?",
      description: "Specific sent emails query"
    },
    {
      query: "show me emails I received",
      description: "Specific received emails query"
    },
    {
      query: "my sent emails about stock",
      description: "Sent emails with topic filter"
    },
    {
      query: "urgent emails in my inbox",
      description: "Received emails with urgency filter"
    },
    {
      query: "hello how are you",
      description: "Casual greeting (should not use email context)"
    }
  ];
  
  for (const test of testQueries) {
    console.log(`\n📧 Testing: "${test.query}"`);
    console.log(`📝 Description: ${test.description}`);
    console.log('─'.repeat(50));
    
    try {
      const response = await axios.post(`${API_BASE}/api/semantic-search`, {
        query: test.query,
        conversationHistory: []
      });
      
      const data = response.data;
      
      console.log(`✅ Results: ${data.results?.length || 0} matches`);
      console.log(`🎯 Email Intent:`, data.emailIntent);
      console.log(`🔍 Filters Applied:`, data.filters);
      
      if (data.results && data.results.length > 0) {
        console.log(`📊 Top Result:`);
        const topResult = data.results[0];
        console.log(`   - Event: ${topResult.eventType}`);
        console.log(`   - Direction: ${topResult.emailDirection || 'N/A'}`);
        console.log(`   - Participant: ${topResult.emailParticipant || 'N/A'}`);
        console.log(`   - Subject: ${topResult.subject || 'N/A'}`);
        console.log(`   - Score: ${topResult.score?.toFixed(3) || 'N/A'}`);
      }
      
      console.log(`🤖 AI Response: "${data.aiResponse?.substring(0, 100)}..."`);
      
    } catch (error) {
      console.error(`❌ Error:`, error.response?.data || error.message);
    }
  }
}

// Run the test
testEmailDirectionQueries().catch(console.error); 