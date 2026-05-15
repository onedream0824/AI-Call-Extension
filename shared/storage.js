import { DEFAULTS, STORAGE_KEYS } from "./constants.js";

const RUNTIME_KEYS = [
  STORAGE_KEYS.activeThreadId,
  STORAGE_KEYS.cachedThreadId,
  STORAGE_KEYS.threads,
  STORAGE_KEYS.threadHistory,
  STORAGE_KEYS.lastCaption,
  STORAGE_KEYS.lastResponse,
  STORAGE_KEYS.lastError,
  STORAGE_KEYS.status
];

export async function getSettings() {
  const stored = await chrome.storage.sync.get([
    STORAGE_KEYS.apiUrl,
    STORAGE_KEYS.customSelector
  ]);

  return {
    apiUrl: stored[STORAGE_KEYS.apiUrl] ?? DEFAULTS.apiUrl,
    customSelector: stored[STORAGE_KEYS.customSelector] ?? DEFAULTS.customSelector
  };
}

export async function getRuntimeState() {
  return chrome.storage.local.get(RUNTIME_KEYS);
}

export async function setRuntimeState(partial) {
  return chrome.storage.local.set(partial);
}

export async function getActiveThreadId() {
  const { activeThreadId } = await chrome.storage.local.get(STORAGE_KEYS.activeThreadId);
  return activeThreadId ?? null;
}
