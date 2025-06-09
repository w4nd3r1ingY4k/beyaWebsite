#!/usr/bin/env node

// Test script for email reply functionality
import { sendEmail, replyEmail } from './beya-inbox-send/lib/email.js';

// Set environment variables for testing
process.env.AWS_REGION = 'us-east-1';

async function testEmailFunctionality() {
  console.log('🧪 Testing Email Reply Functionality\n');

  // Test 1: Send a new email
  console.log('📧 Test 1: Sending new email...');
  try {
    const result1 = await sendEmail(
      'your-test-email@example.com', // Replace with your test email
      'Test Email from Lambda',
      'This is a test email from the updated Lambda function.',
      '<h1>Test Email</h1><p>This is a test email from the updated Lambda function.</p>'
    );
    console.log('✅ New email sent successfully:', result1.MessageId);
  } catch (error) {
    console.error('❌ Failed to send new email:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Send a reply email
  console.log('📧 Test 2: Sending reply email...');
  try {
    // This would normally come from your database lookup
    const mockOriginalMessageId = '<test-message-id@example.com>';
    
    const result2 = await replyEmail(
      'your-test-email@example.com', // Replace with your test email
      'Original Subject',
      'This is a reply to your email.',
      '<p>This is a reply to your email.</p>',
      mockOriginalMessageId
    );
    console.log('✅ Reply email sent successfully:', result2.MessageId);
  } catch (error) {
    console.error('❌ Failed to send reply email:', error.message);
  }

  console.log('\n---\n');

  // Test 3: Test Message-ID formatting
  console.log('📧 Test 3: Testing Message-ID formatting...');
  
  const testCases = [
    'simple-message-id',
    '<proper-message-id@domain.com>',
    'no-brackets@domain.com',
    ''
  ];

  testCases.forEach((testId, index) => {
    console.log(`Test ${index + 1}: "${testId}"`);
    // You can import the formatMessageId function if you export it
    // For now, just showing the logic
    const formatted = testId ? (testId.startsWith('<') && testId.endsWith('>') ? testId : `<${testId}>`) : '';
    console.log(`  Formatted: "${formatted}"`);
  });

  console.log('\n---\n');

  // Test 4: Test subject formatting
  console.log('📧 Test 4: Testing subject formatting...');
  
  const subjectCases = [
    'Original Subject',
    'Re: Already has prefix',
    'RE: Different case',
    '',
    'Fwd: Forward'
  ];

  subjectCases.forEach((subject, index) => {
    console.log(`Test ${index + 1}: "${subject}"`);
    const formatted = !subject ? 'Re: ' : (/^re:\s*/i.test(subject) ? subject : `Re: ${subject}`);
    console.log(`  Formatted: "${formatted}"`);
  });
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testEmailFunctionality().catch(console.error);
}

export { testEmailFunctionality }; 