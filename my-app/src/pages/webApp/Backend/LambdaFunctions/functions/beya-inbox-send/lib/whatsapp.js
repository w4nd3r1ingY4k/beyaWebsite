// lib/whatsapp.js
import fetch from 'node-fetch';

export async function sendWhatsApp(to, text, token, phoneNumberId) {
  // Require credentials to be passed explicitly
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp credentials (token and phoneNumberId) are required');
  }
  
  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
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
  try { data = JSON.parse(raw); } 
  catch { throw new Error("Invalid JSON from WhatsApp: " + raw); }
  if (!res.ok) throw new Error(JSON.stringify(data));

  // archive under outbound/whatsapp/<to>/<timestamp>.json

  return data;
}