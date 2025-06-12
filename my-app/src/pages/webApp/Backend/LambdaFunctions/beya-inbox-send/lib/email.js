// lib/email.js
import sgMail from '@sendgrid/mail';

// ─── 0) Load & validate env vars ──────────────────────────────────────────────
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_ADDRESS     = process.env.EMAIL_FROM || 'noreply@yourdomain.com';

if (!SENDGRID_API_KEY) {
  throw new Error('Missing required env var: SENDGRID_API_KEY');
}

sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Send a brand-new email (no threading):
 *   • `text` = plain‐text fallback
 *   • `html` = HTML body
 */
export async function sendEmail(to, subject, text, html) {
  try {
    const msg = {
      to,
      from: FROM_ADDRESS,
      subject,
      text,
      html,
    };
    const [response] = await sgMail.send(msg);
    console.log('✅ SendGrid sendEmail response:', response.statusCode);
    return response;
  } catch (error) {
    console.error('❌ SendGrid sendEmail error:', error);
    // surface common SendGrid errors
    if (error.response?.body) {
      console.error('SendGrid error details:', error.response.body);
    }
    throw error;
  }
}

/**
 * Send a "reply" to an existing message by setting In-Reply-To and References headers.
 *
 * @param {string} to                 – recipient email address
 * @param {string} subject            – subject line (will add "Re: " if not present)
 * @param {string} text               – plain-text body
 * @param {string} html               – HTML body
 * @param {string} originalMessageId  – the Message-ID of the incoming email you're replying to
 */
export async function replyEmail(to, subject, text, html, originalMessageId) {
  try {
    const replySubject = formatReplySubject(subject);
    const formattedMessageId = formatMessageId(originalMessageId);

    const msg = {
      to,
      from: FROM_ADDRESS,
      subject: replySubject,
      text,
      html,
      headers: {
        'In-Reply-To': formattedMessageId,
        References: formattedMessageId,
      },
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
