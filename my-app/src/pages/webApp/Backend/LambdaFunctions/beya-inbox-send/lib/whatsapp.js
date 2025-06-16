// lib/whatsapp.js
import fetch from 'node-fetch';

/**
 * Send a WhatsApp message using the specified business account
 * @param {string} to - Recipient's phone number
 * @param {string} text - Message text
 * @param {string} phoneNumberId - WhatsApp Business Phone Number ID
 * @returns {Promise<Object>} WhatsApp API response
 */
export async function sendWhatsApp(to, text, phoneNumberId) {
  if (!phoneNumberId) {
    throw new Error('WhatsApp Business Phone Number ID is required');
  }

  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WABA_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      text: { body: text },
    }),
  });

  const raw = await res.text();
  let data;
  try { 
    data = JSON.parse(raw); 
  } catch { 
    throw new Error("Invalid JSON from WhatsApp: " + raw); 
  }

  if (!res.ok) {
    console.error('WhatsApp API error:', data);
    throw new Error(data.error?.message || JSON.stringify(data));
  }

  // archive under outbound/whatsapp/<to>/<timestamp>.json

  return data;
}