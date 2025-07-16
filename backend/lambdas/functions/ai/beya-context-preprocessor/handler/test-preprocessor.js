require('dotenv').config();
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY);
const { handler } = require('./handler');

// Mock a Kinesis event with a Gmail-like payload
const sampleGmailEvent = {
  Records: [
    {
      kinesis: {
        data: Buffer.from(JSON.stringify({
          id: "test-event-id",
          detail: {
            eventType: "email.received",
            timestamp: new Date().toISOString(),
            data: {
              headers: {
                "From": "sender@gmail.com",
                "To": "recipient@yourdomain.com",
                "Subject": "Test Email",
                "Message-ID": "<test-message-id@gmail.com>",
                "Date": new Date().toUTCString()
              },
              bodyText: "This is a test email body for preprocessor testing."
            }
          }
        })).toString('base64'),
        sequenceNumber: "1"
      }
    }
  ]
};

handler(sampleGmailEvent)
  .then(response => {
    console.log('Preprocessor Lambda response:', response);
  })
  .catch(error => {
    console.error('Preprocessor Lambda error:', error);
  }); 