// lib/email.js
import { SESClient, SendEmailCommand, SendRawEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: process.env.AWS_REGION });
const FROM = "akbar@usebeya.com";  // must be SES-verified

/**
 * Send a brand-new email (no threading):
 *   • `text` = plain‐text fallback, 
 *   • `html` = actual HTML body. 
 */
export async function sendEmail(to, subject, text, html) {
  try {
    const cmd = new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: {
          Text: { Data: text },
          Html: { Data: html },
        },
      },
    });
    const result = await ses.send(cmd);
    console.log('✅ Email sent successfully:', result.MessageId);

    return result;
  } catch (error) {
    console.error('❌ SES sendEmail error:', error);
    // Provide more detailed SES error information
    if (error.name === 'MessageRejected') {
      throw new Error(`SES rejected message: ${error.message}`);
    } else if (error.name === 'SendingQuotaExceeded') {
      throw new Error('SES sending quota exceeded');
    } else if (error.name === 'MailFromDomainNotVerified') {
      throw new Error('SES domain not verified');
    }
    throw error;
  }
}

/**
 * Send a "reply" to an existing message. This builds a raw MIME payload and sets:
 *   • In-Reply-To: <originalMessageId>
 *   • References:   <originalMessageId>
 *
 * @param {string} to                  – recipient email address
 * @param {string} subject             – subject line (will add "Re: " if not present)
 * @param {string} text                – plain-text body
 * @param {string} html                – HTML body
 * @param {string} originalMessageId   – the Message-ID of the incoming email you're replying to
 */
export async function replyEmail(to, subject, text, html, originalMessageId) {
  try {
    // Ensure proper Message-ID format (with angle brackets)
    const formattedMessageId = formatMessageId(originalMessageId);
    
    // Add "Re: " prefix to subject if not already present
    const replySubject = formatReplySubject(subject);
    
    // Generate a unique multipart boundary
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate our own Message-ID for this reply
    const ourMessageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@usebeya.com>`;
    
    // Build raw RFC-822 message
    const rawLines = [
      `From: ${FROM}`,
      `To: ${to}`,
      `Subject: ${replySubject}`,
      `Message-ID: ${ourMessageId}`,
      `In-Reply-To: ${formattedMessageId}`,
      `References: ${formattedMessageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      `Date: ${new Date().toUTCString()}`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      text || '',
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: 7bit`,
      ``,
      html || text || '',
      ``,
      `--${boundary}--`,
      ``,
    ];

    const rawMessage = rawLines.join("\r\n");
    
    console.log('📧 Sending reply email:', {
      to,
      subject: replySubject,
      inReplyTo: formattedMessageId,
      messageLength: rawMessage.length
    });

    const cmd = new SendRawEmailCommand({
      RawMessage: { Data: Buffer.from(rawMessage, 'utf8') },
    });

    const result = await ses.send(cmd);
    console.log('✅ Reply email sent successfully:', result.MessageId);

    return result;
    
  } catch (error) {
    console.error('❌ SES replyEmail error:', error);
    console.error('Original Message ID:', originalMessageId);
    console.error('Recipient:', to);
    
    // Provide more detailed SES error information
    if (error.name === 'MessageRejected') {
      throw new Error(`SES rejected reply message: ${error.message}`);
    } else if (error.name === 'SendingQuotaExceeded') {
      throw new Error('SES sending quota exceeded for reply');
    } else if (error.name === 'InvalidParameterValue') {
      throw new Error(`SES invalid parameter in reply: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Ensure Message-ID is in proper RFC format with angle brackets
 */
function formatMessageId(messageId) {
  if (!messageId) return '';
  
  // If already has angle brackets, return as-is
  if (messageId.startsWith('<') && messageId.endsWith('>')) {
    return messageId;
  }
  
  // Add angle brackets
  return `<${messageId}>`;
}

/**
 * Add "Re: " prefix to subject if not already present
 */
function formatReplySubject(subject) {
  if (!subject) return 'Re: ';
  
  // If already starts with "Re:" (case insensitive), return as-is
  if (/^re:\s*/i.test(subject)) {
    return subject;
  }
  
  // Add "Re: " prefix
  return `Re: ${subject}`;
}

/**
 * Get SES sending statistics for monitoring
 */
export async function getSendingStats() {
  try {
    const { GetSendStatisticsCommand } = await import("@aws-sdk/client-ses");
    const cmd = new GetSendStatisticsCommand({});
    const result = await ses.send(cmd);
    return result.SendDataPoints || [];
  } catch (error) {
    console.error('❌ Error getting SES stats:', error);
    return [];
  }
}