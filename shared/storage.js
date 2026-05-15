import { DEFAULTS, STORAGE_KEYS } from "./constants.js";

export async function getSettings() {
  const keys = Object.values(STORAGE_KEYS).filter(
    (k) => k !== STORAGE_KEYS.lastCaption && k !== STORAGE_KEYS.lastResponse &&
      k !== STORAGE_KEYS.lastError && k !== STORAGE_KEYS.status &&
      k !== STORAGE_KEYS.sessionHistory
  );
  const stored = await chrome.storage.sync.get([
    ...keys,
    STORAGE_KEYS.sessionHistory
  ]);

  return {
    apiUrl: stored[STORAGE_KEYS.apiUrl] ?? DEFAULTS.apiUrl,
    customSelector: stored[STORAGE_KEYS.customSelector] ?? DEFAULTS.customSelector,
    sessionHistory: stored[STORAGE_KEYS.sessionHistory] ?? DEFAULTS.sessionHistory
  };
}

export async function getRuntimeState() {
  return chrome.storage.local.get([
    STORAGE_KEYS.lastCaption,
    STORAGE_KEYS.lastResponse,
    STORAGE_KEYS.lastError,
    STORAGE_KEYS.status,
    STORAGE_KEYS.sessionHistory
  ]);
}

export async function setRuntimeState(partial) {
  return chrome.storage.local.set(partial);
}

export async function appendHistory(entry) {
  const { sessionHistory = [] } = await chrome.storage.local.get(STORAGE_KEYS.sessionHistory);
  const next = [entry, ...sessionHistory].slice(0, 50);
  await chrome.storage.local.set({ [STORAGE_KEYS.sessionHistory]: next });
  return next;
}
