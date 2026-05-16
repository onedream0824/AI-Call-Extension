/**
 * Microsoft Teams — live caption extractor.
 *
 * Teams renders captions via a React tree into deeply nested spans.
 * The most stable anchors are data-tid attributes and component class prefixes.
 */

import { MESSAGE_TYPES } from '../utils/constants.js'

const SELECTORS = [
  // Teams (2024–2026) — data-tid is the most stable
  '[data-tid="caption-text"]',
  '[data-tid*="caption"]',
  // Class-based fallbacks
  '.ts-caption-text',
  '[class*="captionText"]',
  '[class*="caption-text"]',
  '[class*="transcription"]',
  // Accessibility-based broadest fallback
  '[aria-live="assertive"] span',
  '[aria-live="polite"] span',
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
