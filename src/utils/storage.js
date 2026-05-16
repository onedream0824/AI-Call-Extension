/**
 * Promisified wrappers around chrome.storage.sync and chrome.storage.local.
 * Falls back to an in-memory map when the chrome API is not available
 * (e.g. during dev outside the extension context).
 */

const mem = {}
const isExt = typeof chrome !== 'undefined' && !!chrome.storage

function makeStore(area) {
  return {
    async get(key) {
      if (!isExt) return mem[`${area}:${key}`] ?? null
      return new Promise((resolve) => {
        chrome.storage[area].get(key, (result) => resolve(result[key] ?? null))
      })
    },

    async set(key, value) {
      if (!isExt) { mem[`${area}:${key}`] = value; return }
      return new Promise((resolve) => {
        chrome.storage[area].set({ [key]: value }, resolve)
      })
    },

    async remove(key) {
      if (!isExt) { delete mem[`${area}:${key}`]; return }
      return new Promise((resolve) => {
        chrome.storage[area].remove(key, resolve)
      })
    },
  }
}

/** For small settings: auth state, dark mode (8 KB limit per key). */
export const storage = makeStore('sync')

/** For larger data: API key, resume text, job description, system prompt. */
export const localStore = makeStore('local')
