import { STORAGE_KEYS } from "./constants.js";

export async function getThreadCache() {
  const stored = await chrome.storage.local.get([
    STORAGE_KEYS.cachedThreadId,
    STORAGE_KEYS.threadHistory
  ]);
  return {
    threadId: stored[STORAGE_KEYS.cachedThreadId] ?? null,
    history: stored[STORAGE_KEYS.threadHistory] ?? []
  };
}

export async function setThreadCache(threadId, history) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.cachedThreadId]: threadId,
    [STORAGE_KEYS.threadHistory]: history
  });
  return history;
}

export async function clearThreadCache() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.cachedThreadId]: null,
    [STORAGE_KEYS.threadHistory]: []
  });
}

export async function appendToThreadCache(threadId, message) {
  const cache = await getThreadCache();

  if (cache.threadId !== threadId) {
    return setThreadCache(threadId, [message]);
  }

  const next = mergeMessage(cache.history, message);
  return setThreadCache(threadId, next);
}

export function mergeMessage(history, message) {
  if (!message) return history;
  if (message.id && history.some((m) => m.id === message.id)) {
    return history;
  }
  return [...history, message];
}

export function sortHistoryChronologically(history) {
  return [...history].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));
}
