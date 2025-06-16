// lib/email.js
import sgMail from '@sendgrid/mail';

// ─── 0) Load & validate env vars ──────────────────────────────────────────────
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
if (!SENDGRID_API_KEY) {
  throw new Error('Missing required env var: SENDGRID_API_KEY');
}

sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Send a brand-new email (no threading):
 *   • `text` = plain‐text fallback
 *   • `html` = HTML body
 *   • `from` = sender's email address (must be verified in SendGrid)
 */
export async function sendEmail(to, subject, text, html, from) {
  if (!from) {
    throw new Error('Sender email address is required');
  }

  try {
    const msg = {
      to,
      from,
      subject,
      text,
      html,
      // Add tracking settings
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    const [response] = await sgMail.send(msg);
    console.log('✅ SendGrid sendEmail response:', response.statusCode);
    return response;
  } catch (error) {
    console.error('❌ SendGrid sendEmail error:', error);
    if (error.response?.body) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw error;
  }
}

/**
 * Send a reply email (with threading):
 *   • `text` = plain‐text fallback
 *   • `html` = HTML body
 *   • `replyTo` = original message ID to reply to
 *   • `from` = sender's email address (must be verified in SendGrid)
 */
export async function replyEmail(to, subject, text, html, replyTo, from) {
  if (!from) {
    throw new Error('Sender email address is required');
  }

  if (!replyTo) {
    throw new Error('Reply-To message ID is required for threading');
  }

  try {
    const msg = {
      to,
      from,
      subject: formatReplySubject(subject),
      text,
      html,
      // Add headers for proper threading
      headers: {
        'In-Reply-To': formatMessageId(replyTo),
        'References': formatMessageId(replyTo)
      },
      // Add tracking settings
      trackingSettings: {
        clickTracking: { enable: true },
        openTracking: { enable: true }
      }
    };

    const [response] = await sgMail.send(msg);
    console.log('✅ SendGrid replyEmail response:', response.statusCode);
    return response;
  } catch (error) {
    console.error('❌ SendGrid replyEmail error:', error);
    if (error.response?.body) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw error;
  }
}

/**
 * Ensure Message-ID is in proper RFC format with angle brackets
 */
function formatMessageId(messageId) {
  if (!messageId) return '';
  return messageId.startsWith('<') && messageId.endsWith('>')
    ? messageId
    : `<${messageId}>`;
}

/**
 * Add "Re: " prefix to subject if not already present
 */
function formatReplySubject(subject) {
  if (!subject) return 'Re:';
  return /^re:\s*/i.test(subject) ? subject : `Re: ${subject}`;
}

/**
 * Get SendGrid account stats (e.g. billing, usage)
 */
export async function getSendingStats() {
  try {
    // SendGrid doesn't expose send statistics via this SDK;
    // you can call the REST API or use their dashboard instead.
    console.warn('getSendingStats is not implemented for SendGrid.');
    return [];
  } catch (error) {
    console.error('❌ Error getting SendGrid stats:', error);
    return [];
  }
}
