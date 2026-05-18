import { storage } from '../utils/storage.js'
import { STORAGE_KEYS, UI_MODES, DEFAULT_UI_MODE } from '../utils/constants.js'

const SESSION_WINDOW_KEY = 'floating_window_id'
const ASSISTANT_PAGE = 'src/sidepanel/index.html'
const FLOATING_WIDTH = 440
const FLOATING_HEIGHT = 780

export async function getUiMode() {
  const mode = await storage.get(STORAGE_KEYS.UI_MODE)
  return mode === UI_MODES.SIDEPANEL ? UI_MODES.SIDEPANEL : DEFAULT_UI_MODE
}

async function getStoredWindowId() {
  const data = await chrome.storage.session.get(SESSION_WINDOW_KEY)
  return data[SESSION_WINDOW_KEY] ?? null
}

async function setStoredWindowId(id) {
  if (id == null) {
    await chrome.storage.session.remove(SESSION_WINDOW_KEY)
  } else {
    await chrome.storage.session.set({ [SESSION_WINDOW_KEY]: id })
  }
}

export function listenForFloatingWindowClose() {
  chrome.windows.onRemoved.addListener(async (windowId) => {
    const stored = await getStoredWindowId()
    if (stored === windowId) await setStoredWindowId(null)
  })
}

export async function openOrFocusFloatingWindow() {
  const url = chrome.runtime.getURL(`${ASSISTANT_PAGE}?display=floating`)

  const existingId = await getStoredWindowId()
  if (existingId != null) {
    try {
      await chrome.windows.get(existingId)
      await chrome.windows.update(existingId, { focused: true, drawAttention: true })
      return existingId
    } catch {
      await setStoredWindowId(null)
    }
  }

  const win = await chrome.windows.create({
    url,
    type: 'popup',
    width: FLOATING_WIDTH,
    height: FLOATING_HEIGHT,
    focused: true,
  })

  if (win?.id != null) await setStoredWindowId(win.id)
  return win?.id
}

export async function openAssistant(tab) {
  const mode = await getUiMode()
  if (mode === UI_MODES.SIDEPANEL && tab?.id != null) {
    await chrome.sidePanel.open({ tabId: tab.id })
    return
  }
  await openOrFocusFloatingWindow()
}
