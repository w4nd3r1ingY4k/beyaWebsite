require('dotenv').config();
const { handler } = require('./handler');

// Mock an SQS event with a preprocessed Gmail event
const sampleEnhancedEvent = {
  id: "test-event-id",
  detail: {
    eventType: "email.received",
    timestamp: new Date().toISOString(),
    data: {
      from: "sender@gmail.com",
      to: "recipient@yourdomain.com",
      subject: "Test Email",
      messageId: "<test-message-id@gmail.com>",
      bodyText: "This is a test email body for embedding."
    }
  },
  naturalLanguageDescription: "A test email was received with a positive tone.",
  comprehendSentiment: {
    sentiment: "POSITIVE",
    confidence: 0.99,
    scores: {
      positive: 0.99,
      negative: 0.01,
      neutral: 0.0,
      mixed: 0.0
    }
  }
};

const sqsEvent = {
  Records: [
    {
      body: JSON.stringify(sampleEnhancedEvent),
      receiptHandle: "test-receipt-handle"
    }
  ]
};

handler(sqsEvent)
  .then(response => {
    console.log('Embed Lambda response:', response);
  })
  .catch(error => {
    console.error('Embed Lambda error:', error);
  }); 