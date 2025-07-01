// Test script for the Context Engine API endpoints
// Run with: node test-api.js

const BASE_URL = 'http://localhost:2074';

async function testAPI() {
  console.log('🧪 Testing Context Engine API endpoints...\n');

  // Test 1: Basic semantic search
  console.log('1️⃣ Testing semantic search...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/search-context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "customer asking about dress",
        topK: 3
      })
    });
    
    const data = await response.json();
    console.log('✅ Semantic search results:', data.results?.length || 0, 'matches');
    if (data.results?.length > 0) {
      console.log('   Top result:', {
        threadId: data.results[0].threadId,
        sentiment: data.results[0].sentiment,
        score: data.results[0].score
      });
    }
  } catch (error) {
    console.error('❌ Semantic search failed:', error.message);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 2: AI-powered query
  console.log('2️⃣ Testing AI-powered context query...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/query-with-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: "What are customers saying about dresses?",
        responseType: "analysis",
        topK: 5
      })
    });
    
    const data = await response.json();
    console.log('✅ AI Response generated');
    console.log('   Query:', data.userQuery);
    console.log('   Response preview:', data.aiResponse?.substring(0, 100) + '...');
    console.log('   Context used:', data.contextUsed?.length || 0, 'results');
  } catch (error) {
    console.error('❌ AI query failed:', error.message);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 3: Customer context
  console.log('3️⃣ Testing customer context retrieval...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/customer-context/akbar_shamji@brown.edu`);
    
    const data = await response.json();
    console.log('✅ Customer context retrieved');
    console.log('   Thread ID:', data.threadId);
    console.log('   Total interactions:', data.totalInteractions);
    console.log('   Recent activity:', data.recentActivity?.length || 0, 'events');
    if (data.sentimentTrend) {
      console.log('   Sentiment trend:', {
        positive: (data.sentimentTrend.positive * 100).toFixed(1) + '%',
        negative: (data.sentimentTrend.negative * 100).toFixed(1) + '%',
        neutral: (data.sentimentTrend.neutral * 100).toFixed(1) + '%'
      });
    }
  } catch (error) {
    console.error('❌ Customer context failed:', error.message);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 4: Draft analysis
  console.log('4️⃣ Testing draft message analysis...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/analyze-draft`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        draftText: "Hi there! I see you're asking about our return policy. Let me help you with that.",
        threadId: "akbar_shamji@brown.edu"
      })
    });
    
    const data = await response.json();
    console.log('✅ Draft analysis completed');
    console.log('   Draft text:', data.draftText);
    console.log('   Coaching preview:', data.aiResponse?.substring(0, 100) + '...');
    console.log('   Risk level:', data.recommendations?.riskLevel);
  } catch (error) {
    console.error('❌ Draft analysis failed:', error.message);
  }

  console.log('\n' + '-'.repeat(50) + '\n');

  // Test 5: Reply suggestions
  console.log('5️⃣ Testing reply suggestions...');
  try {
    const response = await fetch(`${BASE_URL}/api/v1/suggest-reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        incomingMessage: "I'm not happy with my dress order, it doesn't fit properly",
        threadId: "akbar_shamji@brown.edu",
        tone: "empathetic"
      })
    });
    
    const data = await response.json();
    console.log('✅ Reply suggestion generated');
    console.log('   Incoming message:', data.incomingMessage);
    console.log('   Suggested reply preview:', data.aiResponse?.substring(0, 100) + '...');
    console.log('   Context used:', data.contextUsed?.length || 0, 'results');
  } catch (error) {
    console.error('❌ Reply suggestion failed:', error.message);
  }

  console.log('\n🎉 API testing complete!');
}

// Example usage patterns
function showUsageExamples() {
  console.log('\n📚 Usage Examples:\n');

  console.log('1. Basic semantic search:');
  console.log(`
fetch('${BASE_URL}/api/v1/search-context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "customer complaints about shipping",
    filters: { sentiment: "NEGATIVE" },
    topK: 10
  })
});`);

  console.log('\n2. AI-powered analysis:');
  console.log(`
fetch('${BASE_URL}/api/v1/query-with-ai', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: "What are the main customer pain points?",
    responseType: "analysis",
    filters: { eventType: "email.sent" }
  })
});`);

  console.log('\n3. Customer 360 view:');
  console.log(`
fetch('${BASE_URL}/api/v1/customer-context/customer@email.com');`);

  console.log('\n4. Draft coaching:');
  console.log(`
fetch('${BASE_URL}/api/v1/analyze-draft', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    draftText: "Your order is delayed again...",
    threadId: "customer@email.com"
  })
});`);

  console.log('\n5. Reply suggestions:');
  console.log(`
fetch('${BASE_URL}/api/v1/suggest-reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    incomingMessage: "I want to return this item",
    threadId: "customer@email.com",
    tone: "helpful"
  })
});`);
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Starting Context Engine API tests...');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('⚠️  Make sure your backend server is running!\n');
  
  testAPI().then(() => {
    showUsageExamples();
  }).catch(error => {
    console.error('🔥 Test suite failed:', error);
  });
} 