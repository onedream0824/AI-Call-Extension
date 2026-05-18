/**
 * Minimal OpenAI streaming client.
 * Yields tokens one at a time as they arrive from the server-sent events stream.
 *
 * Usage:
 *   for await (const token of streamCompletion({ apiKey, model, messages })) {
 *     appendToken(token)
 *   }
 */

export class OpenAIError extends Error {
  constructor(status, body) {
    const msg = body?.error?.message ?? `HTTP ${status}`
    super(msg)
    this.name = 'OpenAIError'
    this.status = status
    this.code = body?.error?.code ?? null
  }
}

/**
 * @param {{ apiKey: string, model: string, messages: {role:string, content:string}[] }} opts
 * @yields {string} Token strings from the completion delta
 */
export async function* streamCompletion({ apiKey, model, messages }) {
  let response
  try {
    response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 350,
        temperature: 0.55,
        stream: true,
      }),
    })
  } catch (networkErr) {
    throw new OpenAIError(0, { error: { message: 'Network error — check your connection.' } })
  }

  if (!response.ok) {
    let body = {}
    try { body = await response.json() } catch (_) {}
    throw new OpenAIError(response.status, body)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buf = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buf += decoder.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() // keep any incomplete trailing line

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed.startsWith('data: ')) continue
      const data = trimmed.slice(6)
      if (data === '[DONE]') return

      try {
        const json = JSON.parse(data)
        const token = json.choices?.[0]?.delta?.content
        if (token) yield token
      } catch (_) {
        // malformed chunk — skip
      }
    }
  }
}
