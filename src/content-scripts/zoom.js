/**
 * Zoom Web Client — live caption extractor.
 *
 * Zoom's web client renders captions inside a container that is dynamically
 * mounted and unmounted. Multiple selector patterns are tried in order of
 * specificity; a MutationObserver buffers recent text.
 */

import { MESSAGE_TYPES } from '../utils/constants.js'

const SELECTORS = [
  // Zoom web client (2024–2026)
  '.live-transcription-subtitle',
  '.caption-kit-subtitle',
  '[class*="caption-text"]',
  '[class*="captionText"]',
  '[class*="live-transcription"]',
  // Aria-based fallback
  '[aria-label*="caption"]',
  '[role="log"] span',
]

const buffer = []
let observer = null

function scrape() {
  for (const sel of SELECTORS) {
    const els = [...document.querySelectorAll(sel)]
    if (!els.length) continue
    const texts = els
      .map((el) => el.textContent?.trim())
      .filter((t) => t && t.length > 1)
    if (texts.length) return [...new Set(texts)].join(' ')
  }
  return ''
}

function startObserver() {
  if (observer) return
  observer = new MutationObserver(() => {
    const text = scrape()
    if (text) {
      buffer.push(text)
      if (buffer.length > 60) buffer.splice(0, buffer.length - 60)
    }
  })
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  })
}

startObserver()

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === MESSAGE_TYPES.CAPTURE) {
    const live = scrape()
    const buffered = [...new Set(buffer.slice(-12))].join(' ')
    sendResponse({ text: (live || buffered).trim() })
    return true
  }
})
