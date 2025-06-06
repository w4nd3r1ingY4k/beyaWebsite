// backend/index.js
const express = require('express');
// In Node 18+ there is a global `fetch`. No need to install node-fetch.
// If you are on Node < 18, install `node-fetch@2` and uncomment the next line:
// const fetch = require('node-fetch');
const cors = require('cors');
require('dotenv').config();

// For now you have the key hard-coded.
// In production you should do: 
//    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
// and keep your key in a .env file, not in source.

function createApp() {
  const app = express();

  // Allow all origins (so you don’t get CORS errors)
  app.use(cors({ origin: '*' }));

  // Parse JSON bodies
  app.use(express.json());

  app.post('/api/chat', async (req, res) => {
    try {
      console.log('›› Received body:', JSON.stringify(req.body, null, 2));

      // Make sure req.body actually has { model, messages }
      if (!req.body.model || !Array.isArray(req.body.messages)) {
        return res.status(400).json({ error: 'Request body must include "model" and "messages" array.' });
      }

      // Proxy to OpenAI
      const openaiResponse = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify(req.body),
          // Optional: add a timeout if your runtime supports it (Node 18+):
          // signal: AbortSignal.timeout(15000)
        }
      );

      // If OpenAI gives back a non-2xx status, log the body:
      if (!openaiResponse.ok) {
        const text = await openaiResponse.text().catch(() => '<could not read error body>');
        console.error(`⛔ OpenAI returned ${openaiResponse.status}:\n`, text);
        return res
          .status(openaiResponse.status)
          .json({ error: `OpenAI API returned status ${openaiResponse.status}`, details: text });
      }

      // Otherwise parse the JSON and return it:
      const data = await openaiResponse.json();
      console.log('›› Forwarding OpenAI response:', JSON.stringify(data, null, 2).slice(0, 500) + '…');
      return res.json(data);

    } catch (err) {
      console.error('❌ Error in /api/chat:', err);
      return res.status(500).json({ error: 'Error communicating with OpenAI API', details: err.message });
    }
  });

  return app;
}

const PORT = process.env.PORT || 2074;
const app = createApp();
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Keep a heartbeat so you know the process is still alive
setInterval(() => {
  console.log('…heartbeat: server still alive at', new Date().toISOString());
}, 30000);