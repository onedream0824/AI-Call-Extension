/**
 * Builds the messages array sent to the OpenAI API.
 * Includes prior Q&A from this session so answers stay contextual and non-repetitive.
 */

const MAX_RESUME_CHARS = 12_000
/** Max prior turns sent (user + assistant pairs). ~10 Q&As. */
const MAX_HISTORY_MESSAGES = 20
const MAX_MSG_CHARS = 2_500

/**
 * @param {{
 *   systemPrompt: string,
 *   resumeText: string,
 *   jobDescription: string,
 *   transcription: string,
 *   history?: { role: string, content: string, streaming?: boolean }[],
 * }} opts
 * @returns {{ role: string, content: string }[]}
 */
export function buildMessages({
  systemPrompt,
  resumeText,
  jobDescription,
  transcription,
  history = [],
}) {
  const resume = (resumeText ?? '').trim().slice(0, MAX_RESUME_CHARS)
  const jd = (jobDescription ?? '').trim()

  const systemParts = [systemPrompt.trim()]

  if (resume) {
    systemParts.push(
      `\n\n---\n## Candidate resume (reference — pick a DIFFERENT story/metric each answer; do not repeat examples already used in this interview)\n${resume}`
    )
  }
  if (jd) {
    systemParts.push(`\n\n---\n## Job description\n${jd}`)
  }

  systemParts.push(
    `\n\n---\n## How this chat works\n` +
      `- Messages labeled user = what the interviewer said.\n` +
      `- Messages labeled assistant = answers you already gave me to read aloud.\n` +
      `- Read the full thread before replying. Do not re-introduce me or repeat stories/metrics/jokes from earlier turns.`
  )

  const messages = [{ role: 'system', content: systemParts.join('') }]

  for (const msg of trimHistory(history)) {
    messages.push({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: truncate(msg.content),
    })
  }

  messages.push({
    role: 'user',
    content: truncate(transcription.trim()),
  })

  return messages
}

function trimHistory(history) {
  return history
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.content?.trim() && !m.streaming)
    .slice(-MAX_HISTORY_MESSAGES)
}

function truncate(text) {
  const t = String(text).trim()
  if (t.length <= MAX_MSG_CHARS) return t
  return t.slice(0, MAX_MSG_CHARS) + '…'
}
