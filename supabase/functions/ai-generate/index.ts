import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const GROQ_KEY = Deno.env.get('GROQ_API_KEY') ?? ''
const MODEL    = 'llama-3.3-70b-versatile'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { systemPrompt, userMessage } = await req.json()
    if (!systemPrompt || !userMessage) {
      return new Response(JSON.stringify({ error: 'Missing prompt' }), { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } })
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${GROQ_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.1,
        max_tokens: 2048,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userMessage },
        ],
      }),
    })

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''

    return new Response(
      JSON.stringify({ text, model: MODEL, timestamp: new Date().toISOString() }),
      { headers: { ...cors, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
