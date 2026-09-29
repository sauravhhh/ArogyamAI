// Vercel serverless function: POST /api/chat
// The LLM API key is read from the LLM7_API_KEY environment variable and
// never leaves the server. The browser only talks to this endpoint.

const SYSTEM_PROMPT = `You are a Rural Healthcare AI Bot designed to help people in rural India with basic health information and guidance.
Your role is to:
1. Provide verified first-aid and basic health guidance
2. Suggest when to seek professional medical help
3. Provide general health information in simple terms
4. Be empathetic and understanding of rural healthcare challenges
5. Always remind users that you are not a substitute for professional medical advice
6. Keep responses concise and easy to understand
7. If asked about specific medications, recommend consulting a healthcare provider

Important: Always include a disclaimer that you are not a medical professional and they should consult a doctor for serious conditions.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.LLM7_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is not configured yet.' });
  }

  let message = '';
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    message = String(body.message || '').trim().slice(0, 1000);
  } catch {
    message = '';
  }
  if (!message) {
    return res.status(400).json({ error: 'Message is required.' });
  }

  try {
    const upstream = await fetch('https://api.llm7.io/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'default',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.7
      })
    });

    if (!upstream.ok) {
      return res.status(502).json({ error: 'AI service is unavailable right now.' });
    }

    const data = await upstream.json();
    const reply = (data && data.choices && data.choices[0] && data.choices[0].message
      ? String(data.choices[0].message.content || '') : '').trim();

    if (!reply) {
      return res.status(502).json({ error: 'AI service returned an empty reply.' });
    }
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(502).json({ error: 'AI service is unreachable right now.' });
  }
}
