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

export async function sendWhatsAppTemplate(to, templateName, templateLanguage, templateComponents, token, phoneNumberId) {
  // Require credentials to be passed explicitly
  if (!token || !phoneNumberId) {
    throw new Error('WhatsApp credentials (token and phoneNumberId) are required');
  }
  
  if (!templateName || !templateLanguage) {
    throw new Error('Template name and language are required');
  }
  
  console.log('📱 Sending WhatsApp template:', {
    to,
    templateName,
    templateLanguage,
    componentsCount: templateComponents?.length || 0
  });
  
  const url = `https://graph.facebook.com/v17.0/${phoneNumberId}/messages`;
  
  // Build the template payload
  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: templateLanguage
      }
    }
  };
  
  // Add components if provided
  if (templateComponents && templateComponents.length > 0) {
    payload.template.components = templateComponents;
  }
  
  console.log('📤 WhatsApp template payload:', JSON.stringify(payload, null, 2));
  
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const raw = await res.text();
  let data;
  try { 
    data = JSON.parse(raw); 
  } catch { 
    throw new Error("Invalid JSON from WhatsApp: " + raw); 
  }
  
  if (!res.ok) {
    console.error('❌ WhatsApp template send failed:', data);
    throw new Error(JSON.stringify(data));
  }
  
  console.log('✅ WhatsApp template sent successfully:', data);
  return data;
}