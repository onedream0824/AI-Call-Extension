/**
 * Google Meet — live caption extractor.
 *
 * Confirmed DOM structure (May 2026):
 *
 *   div[aria-label="Captions"]          ← caption region (stable aria-label)
 *     div.nMcdL                         ← one entry per speaker turn
 *       div.adE6rb
 *         img                           ← speaker avatar
 *         div.KcIKyf.jxFHg
 *           span.NWpY1d                 ← speaker name ("You" | "Pro Active" | …)
 *       div.ygicle.VbkSUe              ← caption text ✅
 *     div.nMcdL …                       ← next speaker turn
 *     div.IMKgW                         ← "Jump to bottom" button (ignored)
 *
 * Goal: capture ONLY what the interviewer/client says — skip any entry
 * where the speaker name is "You" (the extension user).
 *
 * Debugging: open DevTools on the Meet tab (F12) → Console tab.
 * All logs are prefixed with [AI-Ext Meet].
 */

import { MESSAGE_TYPES } from '../utils/constants.js'

const LOG = '[AI-Ext Meet]'

/** Rolling buffer of interviewer caption lines, capped at 80 entries. */
const buffer = []
let lastPushed = ''

function pushToBuffer(text) {
  if (!text || text === lastPushed) return
  lastPushed = text
  buffer.push(text)
  if (buffer.length > 80) buffer.splice(0, buffer.length - 80)
  console.log(`${LOG} buffer push →`, JSON.stringify(text))
}

/**
 * Walk every caption entry in the panel.
 * Returns the most recent non-"You" caption text, or '' if none found.
 */
function scrape() {
  const panel = document.querySelector('[aria-label="Captions"]')
  if (!panel) {
    console.warn(`${LOG} scrape: caption panel not found — is captions enabled?`)
    return ''
  }

  const entries = [...panel.querySelectorAll('.nMcdL')]
  if (!entries.length) {
    console.warn(`${LOG} scrape: panel found but no .nMcdL entries inside it`)
    return ''
  }

  console.groupCollapsed(`${LOG} scrape — ${entries.length} caption entries`)

  const interviewerLines = []

  for (const entry of entries) {
    const speakerName = entry.querySelector('.NWpY1d')?.textContent?.trim() ?? '(unknown)'
    const captionText = entry.querySelector('.ygicle')?.textContent?.trim() ?? ''

    if (!captionText) {
      console.log(`  skip  [${speakerName}] — empty text`)
      continue
    }

    if (speakerName === 'You') {
      console.log(`  skip  [You] "${captionText}"`)
      continue
    }

    console.log(`  keep  [${speakerName}] "${captionText}"`)
    interviewerLines.push(captionText)
  }

  console.groupEnd()

  const result = interviewerLines[interviewerLines.length - 1] ?? ''
  console.log(`${LOG} scrape result →`, result ? JSON.stringify(result) : '(empty)')
  return result
}

/** MutationObserver — push new interviewer lines into the buffer as they appear. */
let observer = null

function startObserver() {
  if (observer) return

  const panel = document.querySelector('[aria-label="Captions"]')

  if (panel) {
    console.log(`${LOG} observer: attaching to caption panel`)
  } else {
    console.log(`${LOG} observer: panel not found yet — attaching to document.body`)
  }

  observer = new MutationObserver(() => {
    const text = scrape()
    if (text) pushToBuffer(text)
  })

  observer.observe(panel ?? document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

console.log(`${LOG} content script loaded on`, location.href)
startObserver()

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === MESSAGE_TYPES.CAPTURE) {
    console.log(`${LOG} CAPTURE message received`)

    const live = scrape()
    const recent = [...new Set(buffer.slice(-10))].join(' ')
    const result = (live || recent).trim()

    console.log(`${LOG} sending response →`, result ? JSON.stringify(result) : '(empty)')
    console.log(`${LOG} buffer snapshot (last 10):`, buffer.slice(-10))

    sendResponse({ text: result })
    return true
  }
})
