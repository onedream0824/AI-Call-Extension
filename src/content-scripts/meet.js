/**
 * Google Meet — live caption extractor.
 *
 * Meet injects caption text into DOM elements using class names that rotate
 * between UI versions. We try several known selectors in priority order and
 * keep a rolling buffer via MutationObserver so text captured between keypress
 * and extraction is not lost.
 */

import { MESSAGE_TYPES } from '../utils/constants.js'

const SELECTORS = [
  // Current Meet (2024–2026)
  '[data-message-text]',
  '.zs7s8d.jxFHg',
  // Mid-era Meet
  '.a4cQT',
  '.iTTPOb',
  '[jsname="tgaKEf"]',
  // Generic caption/subtitle containers (broadest fallback)
  '[class*="caption"] span',
  '[class*="subtitle"] span',
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
