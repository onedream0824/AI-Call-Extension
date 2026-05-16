/**
 * Service worker logs appear in:
 * chrome://extensions → "AI Interview Assistant" → "Service Worker" → Inspect
 */

import { MESSAGE_TYPES } from '../utils/constants.js'

const LOG = '[AI-Ext SW]'

/** ─── Open side panel on toolbar icon click ─────────────────────────────── */

chrome.action.onClicked.addListener((tab) => {
  console.log(`${LOG} action clicked — opening side panel for tab`, tab.id)
  chrome.sidePanel.open({ tabId: tab.id })
})

/** ─── Global keyboard commands (Alt+Q / Alt+W) ─────────────────────────── */

chrome.commands.onCommand.addListener(async (command) => {
  console.log(`${LOG} command fired:`, command)

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  console.log(`${LOG} active tab:`, tab?.id, tab?.url ?? '(no url)')

  if (command === 'capture-captions') {
    await performCapture(tab)
  } else if (command === 'send-message') {
    console.log(`${LOG} relaying SEND to side panel`)
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SEND }).catch((err) => {
      console.warn(`${LOG} SEND relay failed (side panel likely closed):`, err.message)
    })
  }
})

/** ─── Messages from the side panel UI ───────────────────────────────────── */

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === MESSAGE_TYPES.TRIGGER_CAPTURE) {
    console.log(`${LOG} TRIGGER_CAPTURE received from side panel`)
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      console.log(`${LOG} active tab for TRIGGER_CAPTURE:`, tab?.id, tab?.url ?? '(no url)')
      performCapture(tab)
    })
  }
  return false
})

/** ─── Caption capture logic ─────────────────────────────────────────────── */

async function performCapture(tab) {
  if (!tab?.id) {
    console.warn(`${LOG} performCapture: no active tab found`)
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: '',
      warning: 'No active tab found.',
    }).catch(() => {})
    return
  }

  const url = tab.url ?? ''
  const isMeeting =
    url.includes('meet.google.com') ||
    url.includes('zoom.us') ||
    url.includes('teams.microsoft.com') ||
    url.includes('teams.live.com')

  console.log(`${LOG} performCapture — tab ${tab.id} | isMeeting: ${isMeeting} | url: ${url}`)

  if (!isMeeting) {
    console.warn(`${LOG} not a meeting tab — aborting capture`)
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: '',
      warning: 'No active meeting tab detected. Open Google Meet, Zoom, or Teams first.',
    }).catch(() => {})
    return
  }

  try {
    console.log(`${LOG} sending CAPTURE message to tab ${tab.id}…`)
    const result = await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.CAPTURE })
    console.log(`${LOG} content script responded:`, result)

    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: result?.text ?? '',
    }).catch((err) => {
      console.warn(`${LOG} could not relay CAPTURED to side panel:`, err.message)
    })
  } catch (err) {
    console.error(`${LOG} tabs.sendMessage failed:`, err.message)
    console.error(`${LOG} → Did you refresh the Meet tab after reloading the extension?`)
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: '',
      warning: 'Could not read captions — make sure captions/subtitles are enabled in the meeting.',
    }).catch(() => {})
  }
}
