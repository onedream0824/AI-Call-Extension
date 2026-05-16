/**
 * Builds the messages array sent to the OpenAI API.
 * Resume text is capped at ~3 000 tokens (≈12 000 chars) to stay within context limits.
 */

const MAX_RESUME_CHARS = 12_000

/**
 * @param {{
 *   systemPrompt: string,
 *   resumeText: string,
 *   jobDescription: string,
 *   transcription: string,
 * }} opts
 * @returns {{ role: string, content: string }[]}
 */
export function buildMessages({ systemPrompt, resumeText, jobDescription, transcription }) {
  const resume = (resumeText ?? '').trim().slice(0, MAX_RESUME_CHARS)
  const jd = (jobDescription ?? '').trim()

  const parts = []
  if (resume) parts.push(`## Candidate Resume\n${resume}`)
  if (jd)     parts.push(`## Job Description\n${jd}`)
  parts.push(`## What the interviewer just said\n${transcription.trim()}`)
  parts.push(
    '## Task\nReply with only the exact spoken answer I should say out loud. ' +
    'Include one specific example from my background (resume/JD when relevant). ' +
    'No thinking, no options, no advice — just the words I read.'
  )

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: parts.join('\n\n') },
  ]
}
