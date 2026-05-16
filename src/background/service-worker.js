import { MESSAGE_TYPES } from '../utils/constants.js'

/** ─── Open side panel on toolbar icon click ─────────────────────────────── */

chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id })
})

/** ─── Global keyboard commands (Alt+Q / Alt+W) ─────────────────────────── */

chrome.commands.onCommand.addListener(async (command) => {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })

  if (command === 'capture-captions') {
    await performCapture(tab)
  } else if (command === 'send-message') {
    // Relay to side panel so it triggers the send action
    chrome.runtime.sendMessage({ type: MESSAGE_TYPES.SEND }).catch(() => {})
  }
})

/** ─── Messages from the side panel UI ───────────────────────────────────── */

chrome.runtime.onMessage.addListener((message, _sender, _sendResponse) => {
  if (message.type === MESSAGE_TYPES.TRIGGER_CAPTURE) {
    chrome.tabs.query({ active: true, lastFocusedWindow: true }).then(([tab]) => {
      performCapture(tab)
    })
  }
  return false
})

/** ─── Caption capture logic ─────────────────────────────────────────────── */

async function performCapture(tab) {
  if (!tab?.id) return

  const url = tab.url ?? ''
  const isMeeting =
    url.includes('meet.google.com') ||
    url.includes('zoom.us') ||
    url.includes('teams.microsoft.com') ||
    url.includes('teams.live.com')

  if (!isMeeting) {
    // Not a meeting tab — send empty capture so the panel at least focuses input
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: '',
      warning: 'No active meeting tab detected. Open Google Meet, Zoom, or Teams first.',
    }).catch(() => {})
    return
  }

  try {
    const result = await chrome.tabs.sendMessage(tab.id, { type: MESSAGE_TYPES.CAPTURE })
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: result?.text ?? '',
    }).catch(() => {})
  } catch {
    chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.CAPTURED,
      text: '',
      warning: 'Could not read captions — make sure captions/subtitles are enabled in the meeting.',
    }).catch(() => {})
  }
}
