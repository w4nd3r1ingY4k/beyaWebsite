/**
 * Email utility functions for cleaning and processing email content
 */

/**
 * Clean email body by removing quoted replies, signatures, and excessive whitespace
 * Enhanced version with more comprehensive quote detection patterns
 * @param {string} body - Raw email body text
 * @returns {string} - Cleaned email body with quotes and signatures removed
 */
export function cleanEmailBody(body) {
  if (!body || typeof body !== 'string') return '';
  
  let cleanedBody = body;
  
  // Remove common reply separators and quoted content
  // Pattern 1: "On [date] [person] wrote:" followed by quoted content
  cleanedBody = cleanedBody.replace(/(^|\n)(On .+wrote:|From:.+\nSent:.+\nTo:.+\nSubject:.+).*/is, '$1');
  
  // Pattern 2: Lines starting with ">" (email quote prefix)
  cleanedBody = cleanedBody.replace(/(\n|^)>.*$/gm, '');
  
  // Pattern 3: "-----Original Message-----" and everything after
  cleanedBody = cleanedBody.replace(/-----Original Message-----[\s\S]*$/i, '');
  
  // Pattern 4: Gmail-style quoted replies (often starts with specific patterns)
  cleanedBody = cleanedBody.replace(/(\n|^)(On [A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}, \d{4} at \d{1,2}:\d{2} [AP]M .+ wrote:)[\s\S]*$/i, '$1');
  
  // Pattern 5: Outlook-style forwarded/replied messages
  cleanedBody = cleanedBody.replace(/(\n|^)(From: .+\nSent: .+\nTo: .+\nSubject: .+)[\s\S]*$/i, '$1');
  
  // Pattern 6: Apple Mail style quotes
  cleanedBody = cleanedBody.replace(/(\n|^)(Begin forwarded message:|On .+ at .+ wrote:)[\s\S]*$/i, '$1');
  
  // Pattern 7: Common quote indicators followed by content
  cleanedBody = cleanedBody.replace(/(\n|^)(Sent from my iPhone|Sent from my iPad|Get Outlook for iOS|Get Outlook for Android)[\s\S]*$/i, '$1');
  
  // Remove email signatures (lines starting with -- or __)
  cleanedBody = cleanedBody.replace(/(^|\n)(--|__)[\s\S]*$/, '$1');
  
  // Remove common signature patterns
  cleanedBody = cleanedBody.replace(/(\n|^)(Best regards|Best|Regards|Sincerely|Thanks|Thank you|Cheers|BR),?\s*\n[\s\S]*$/i, '$1$2,\n');
  
  // Remove excessive whitespace and normalize line breaks
  cleanedBody = cleanedBody.replace(/\n{3,}/g, '\n\n');
  cleanedBody = cleanedBody.replace(/[ \t]+$/gm, ''); // Remove trailing spaces
  cleanedBody = cleanedBody.trim();
  
  return cleanedBody;
}

/**
 * Clean HTML email body by removing quoted content from HTML emails
 * @param {string} htmlBody - Raw HTML email body
 * @returns {string} - Cleaned HTML body with quotes removed
 */
export function cleanHtmlEmailBody(htmlBody) {
  if (!htmlBody || typeof htmlBody !== 'string') return '';
  
  let cleanedHtml = htmlBody;
  
  // Remove Gmail quote divs
  cleanedHtml = cleanedHtml.replace(/<div class="gmail_quote">[\s\S]*?<\/div>/gi, '');
  cleanedHtml = cleanedHtml.replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi, '');
  
  // Remove Outlook quote sections
  cleanedHtml = cleanedHtml.replace(/<div[^>]*id="divRplyFwdMsg"[^>]*>[\s\S]*?<\/div>/gi, '');
  
  // Remove quoted content that starts with common patterns
  cleanedHtml = cleanedHtml.replace(/<div[^>]*>(\s*From:|\s*Sent:|\s*To:|\s*Subject:)[\s\S]*?<\/div>/gi, '');
  
  // Remove forwarded message markers
  cleanedHtml = cleanedHtml.replace(/<p[^>]*>(\s*-----Original Message-----|\s*Begin forwarded message:)[\s\S]*?<\/p>/gi, '');
  
  // Clean up empty paragraphs and excessive spacing
  cleanedHtml = cleanedHtml.replace(/<p[^>]*>\s*<\/p>/gi, '');
  cleanedHtml = cleanedHtml.replace(/(<br\s*\/?>){3,}/gi, '<br><br>');
  
  return cleanedHtml.trim();
}

/**
 * Extract the actual reply content from an email, handling both text and HTML
 * @param {string} textBody - Plain text email body
 * @param {string} htmlBody - HTML email body (optional)
 * @returns {Object} - Object with cleaned text and HTML bodies
 */
export function extractReplyContent(textBody, htmlBody = '') {
  return {
    text: cleanEmailBody(textBody),
    html: htmlBody ? cleanHtmlEmailBody(htmlBody) : ''
  };
}

/**
 * Detect if an email body contains quoted content (useful for logging/debugging)
 * @param {string} body - Email body to analyze
 * @returns {boolean} - True if quoted content is detected
 */
export function hasQuotedContent(body) {
  if (!body) return false;
  
  const quotePatterns = [
    /On .+wrote:/i,
    /From:.+\nSent:.+\nTo:.+\nSubject:/i,
    /-----Original Message-----/i,
    /^>/m,
    /Begin forwarded message:/i,
    /Sent from my iPhone/i,
    /Get Outlook for/i
  ];
  
  return quotePatterns.some(pattern => pattern.test(body));
} 