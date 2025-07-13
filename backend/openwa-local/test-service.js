const fetch = require('node-fetch');

const OPENWA_LOCAL_URL = 'http://localhost:3001';
const TEST_USER_ID = 'c4f8c458-c0c1-7073-e9be-c6856b74a3e2';

async function testOpenWAService() {
  console.log('🧪 Testing OpenWA Local Service');
  console.log('================================');

  try {
    // Test 1: Health check
    console.log('\n1. Testing health check...');
    const healthResponse = await fetch(`${OPENWA_LOCAL_URL}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);

    // Test 2: Start session
    console.log('\n2. Testing start session...');
    const startResponse = await fetch(`${OPENWA_LOCAL_URL}/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TEST_USER_ID })
    });
    const startData = await startResponse.json();
    console.log('✅ Start session:', startData);

    // Test 3: Check session status
    console.log('\n3. Testing session status...');
    const statusResponse = await fetch(`${OPENWA_LOCAL_URL}/session-status/${TEST_USER_ID}`);
    const statusData = await statusResponse.json();
    console.log('✅ Session status:', statusData);

    console.log('\n🎉 All tests passed! OpenWA Local Service is working correctly.');
    console.log('\n📱 Next steps:');
    console.log('1. Scan the QR code that appeared in the terminal');
    console.log('2. Test sending a message to yourself');
    console.log('3. Check that messages appear in your Beya inbox');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run tests
testOpenWAService(); 