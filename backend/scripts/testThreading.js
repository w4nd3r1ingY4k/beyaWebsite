// Test script to simulate the "fresh start" / "Re: fresh start" threading issue
import { generateParticipantThreadingKey } from '../lambdas/functions/beya-inbox-email-receive/lib/flowUtils.js';
import crypto from 'crypto';

// Copy the normalizeSubject function since it's not exported
function normalizeSubject(subject) {
  if (!subject) return '';
  
  // Remove common email prefixes and clean up
  return subject
    .replace(/^(Re:|RE:|Fwd:|FWD:|Fw:)\s*/gi, '')
    .trim()
    .toLowerCase();
}

function testThreadingLogic() {
  console.log('🧪 Testing threading logic for fresh start scenario\n');
  
  // Scenario 1: Original email "fresh start"
  const originalSubject = "fresh start";
  const replySubject = "Re: fresh start";
  
  // Test participants
  const userId = "c4f8c458-c0c1-7073-e9be-c6856b74a3e2";
  const externalEmail = "akbar_shamji@brown.edu";
  
  // Scenario: You send "fresh start" 
  console.log('📤 Outgoing: You send "fresh start" to external email');
  const outgoingParticipants = [userId, externalEmail];
  const outgoingNormalizedSubject = normalizeSubject(originalSubject);
  const outgoingThreadingKey = generateParticipantThreadingKey(outgoingParticipants, outgoingNormalizedSubject);
  console.log(`  Subject: "${originalSubject}"`);
  console.log(`  Normalized: "${outgoingNormalizedSubject}"`);
  console.log(`  Participants: [${outgoingParticipants.join(', ')}]`);
  console.log(`  Threading Key: "${outgoingThreadingKey}"`);
  
  console.log('\n📥 Incoming: External email replies with "Re: fresh start"');
  const incomingParticipants = [externalEmail, userId];
  const incomingNormalizedSubject = normalizeSubject(replySubject);
  const incomingThreadingKey = generateParticipantThreadingKey(incomingParticipants, incomingNormalizedSubject);
  console.log(`  Subject: "${replySubject}"`);
  console.log(`  Normalized: "${incomingNormalizedSubject}"`);
  console.log(`  Participants: [${incomingParticipants.join(', ')}]`);
  console.log(`  Threading Key: "${incomingThreadingKey}"`);
  
  console.log('\n🔍 Analysis:');
  console.log(`  Same normalized subject? ${outgoingNormalizedSubject === incomingNormalizedSubject}`);
  console.log(`  Same threading key? ${outgoingThreadingKey === incomingThreadingKey}`);
  
  if (outgoingThreadingKey === incomingThreadingKey) {
    console.log('  ✅ Should be in same thread');
  } else {
    console.log('  ❌ Will create separate threads');
    console.log('  📋 Difference analysis:');
    console.log(`     Original key: "${outgoingThreadingKey}"`);
    console.log(`     Reply key:    "${incomingThreadingKey}"`);
  }
}

testThreadingLogic(); 