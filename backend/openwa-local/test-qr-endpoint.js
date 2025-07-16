const fetch = require('node-fetch');

const OPENWA_LOCAL_URL = 'http://localhost:3001';
const TEST_USER_ID = 'c4f8c458-c0c1-7073-e9be-c6856b74a3e2';

async function testQREndpoint() {
  console.log('🧪 Testing QR Code Endpoint');
  console.log('============================');

  try {
    // Test 1: Start session first
    console.log('\n1. Starting OpenWA session...');
    const startResponse = await fetch(`${OPENWA_LOCAL_URL}/start-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: TEST_USER_ID })
    });
    const startData = await startResponse.json();
    console.log('✅ Session started:', startData.success ? 'Success' : 'Failed');

    // Test 2: Wait a moment for QR code generation
    console.log('\n2. Waiting for QR code generation...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Test 3: Get QR code
    console.log('\n3. Fetching QR code...');
    const qrResponse = await fetch(`${OPENWA_LOCAL_URL}/qr-code/${TEST_USER_ID}`);
    
    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      console.log('✅ QR Code received:');
      console.log('   - Status:', qrData.status);
      console.log('   - QR Code length:', qrData.qrCode ? qrData.qrCode.length : 'null');
      console.log('   - Timestamp:', new Date(qrData.timestamp).toLocaleString());
      
      // Test 4: Verify QR code can be used to generate image
      if (qrData.qrCode) {
        const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData.qrCode)}`;
        console.log('✅ QR Code image URL generated:', qrImageUrl.substring(0, 100) + '...');
      }
    } else {
      console.log('❌ QR Code not available yet (this is normal if OpenWA is still starting)');
      console.log('   Status:', qrResponse.status);
    }

    console.log('\n🎉 QR Code endpoint test completed!');
    console.log('\n📱 Next steps:');
    console.log('1. The QR code should now be available via the frontend modal');
    console.log('2. Open your frontend and click "Connect" on WhatsApp Personal');
    console.log('3. The QR code modal should appear with a scannable code');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testQREndpoint(); 