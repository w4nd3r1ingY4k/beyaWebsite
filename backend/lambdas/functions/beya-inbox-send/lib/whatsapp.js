// lib/whatsapp.js
import fetch from 'node-fetch';

export async function sendWhatsApp(to, text) {
  const url = `https://graph.facebook.com/v17.0/${process.env.WABA_PHONE_NUMBER_ID}/messages`;
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
  try { data = JSON.parse(raw); } 
  catch { throw new Error("Invalid JSON from WhatsApp: " + raw); }
  if (!res.ok) throw new Error(JSON.stringify(data));

  // archive under outbound/whatsapp/<to>/<timestamp>.json

  return data;
}