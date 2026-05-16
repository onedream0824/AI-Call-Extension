/**
 * Thin promisified wrapper around chrome.storage.sync.
 * Falls back to an in-memory object when the chrome API is unavailable
 * (e.g. during unit tests or hot-reload dev sessions outside the extension context).
 */

const memoryFallback = {}

const isExtension = typeof chrome !== 'undefined' && chrome.storage

export const storage = {
  async get(key) {
    if (!isExtension) return memoryFallback[key] ?? null
    return new Promise((resolve) => {
      chrome.storage.sync.get(key, (result) => resolve(result[key] ?? null))
    })
  },

  async set(key, value) {
    if (!isExtension) { memoryFallback[key] = value; return }
    return new Promise((resolve) => {
      chrome.storage.sync.set({ [key]: value }, resolve)
    })
  },

  async remove(key) {
    if (!isExtension) { delete memoryFallback[key]; return }
    return new Promise((resolve) => {
      chrome.storage.sync.remove(key, resolve)
    })
  },
}
