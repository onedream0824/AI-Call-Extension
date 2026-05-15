import {
  createThread,
  fetchThreadHistory,
  fetchThreads,
  sendCaption
} from "../shared/api.js";
import { MESSAGE, STATUS, STORAGE_KEYS } from "../shared/constants.js";
import { getActiveThreadId, getSettings, setRuntimeState } from "../shared/storage.js";
import {
  appendToThreadCache,
  clearThreadCache,
  getThreadCache,
  setThreadCache,
  sortHistoryChronologically
} from "../shared/thread-cache.js";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "capture-and-send") {
    await runPipeline();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const handlers = {
    [MESSAGE.RUN_PIPELINE]: () => runPipeline(),
    [MESSAGE.FETCH_THREADS]: () => loadThreads(),
    [MESSAGE.SELECT_THREAD]: () => selectThread(message.threadId),
    [MESSAGE.CREATE_THREAD]: () => createAndSelectThread(message)
  };

  const handler = handlers[message.type];
  if (!handler) return false;

  handler()
    .then((result) => sendResponse({ ok: true, ...result }))
    .catch((err) => sendResponse({ ok: false, error: err.message }));
  return true;
});

async function runPipeline() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) {
    await fail("No active tab found. Focus the meeting tab and try again.");
    return;
  }

  await openSidePanel(tab.windowId);
  await setRuntimeState({
    [STORAGE_KEYS.status]: STATUS.capturing,
    [STORAGE_KEYS.lastError]: ""
  });
  broadcast(MESSAGE.PIPELINE_UPDATE);

  const caption = await captureCaptionFromTab(tab.id);
  if (!caption?.trim()) {
    await fail("No caption text found. Enable live captions on the page and try again.");
    return;
  }

  await setRuntimeState({
    [STORAGE_KEYS.lastCaption]: caption.trim(),
    [STORAGE_KEYS.status]: STATUS.sending
  });
  broadcast(MESSAGE.PIPELINE_UPDATE);

  try {
    const settings = await getSettings();
    if (!settings.apiUrl?.trim()) {
      throw new Error("Backend URL is not configured. Open extension settings and add your server URL.");
    }

    const threadId = await getActiveThreadId();
    if (!threadId) {
      throw new Error("No interview selected. Click + to create one with your resume and job description.");
    }

    const { responseText, message } = await sendCaption(settings.apiUrl, caption.trim(), threadId);

    const newMessage = message ?? {
      id: crypto.randomUUID(),
      caption: caption.trim(),
      response: responseText,
      createdAt: Date.now()
    };

    if (!newMessage.caption) newMessage.caption = caption.trim();
    if (!newMessage.response) newMessage.response = responseText;

    const history = await appendToThreadCache(threadId, newMessage);

    await setRuntimeState({
      [STORAGE_KEYS.lastResponse]: responseText,
      [STORAGE_KEYS.threadHistory]: history,
      [STORAGE_KEYS.status]: STATUS.success,
      [STORAGE_KEYS.lastError]: ""
    });
    broadcast(MESSAGE.PIPELINE_UPDATE);

    await loadThreads({ skipHistory: true });
  } catch (err) {
    await fail(err.message || "Request failed.");
  }
}

async function loadThreads({ skipHistory = false } = {}) {
  const settings = await getSettings();
  if (!settings.apiUrl?.trim()) {
    throw new Error("Backend URL is not configured.");
  }

  await setRuntimeState({ [STORAGE_KEYS.status]: STATUS.loading });
  broadcast(MESSAGE.THREADS_UPDATE);

  const threads = await fetchThreads(settings.apiUrl);
  const updates = { [STORAGE_KEYS.threads]: threads, [STORAGE_KEYS.status]: STATUS.idle };

  let activeId = await getActiveThreadId();
  if (!activeId && threads.length > 0) {
    activeId = threads[0].id;
    updates[STORAGE_KEYS.activeThreadId] = activeId;
  }

  await setRuntimeState(updates);
  broadcast(MESSAGE.THREADS_UPDATE);

  if (!skipHistory) {
    if (activeId) {
      await loadFullThreadHistory(activeId);
    } else {
      await clearThreadCache();
      await setRuntimeState({ [STORAGE_KEYS.threadHistory]: [] });
      broadcast(MESSAGE.THREADS_UPDATE);
    }
  }

  return { threads };
}

async function selectThread(threadId) {
  if (!threadId) throw new Error("Thread id is required.");

  const cache = await getThreadCache();
  await setRuntimeState({ [STORAGE_KEYS.activeThreadId]: threadId });

  if (cache.threadId === threadId) {
    await setRuntimeState({ [STORAGE_KEYS.threadHistory]: cache.history });
    broadcast(MESSAGE.THREADS_UPDATE);
    return { threadId };
  }

  await loadFullThreadHistory(threadId);
  return { threadId };
}

async function loadFullThreadHistory(threadId) {
  const settings = await getSettings();

  await clearThreadCache();
  await setRuntimeState({
    [STORAGE_KEYS.status]: STATUS.loading,
    [STORAGE_KEYS.threadHistory]: []
  });
  broadcast(MESSAGE.THREADS_UPDATE);

  const raw = await fetchThreadHistory(settings.apiUrl, threadId);
  const history = sortHistoryChronologically(raw);

  await setThreadCache(threadId, history);
  await setRuntimeState({
    [STORAGE_KEYS.threadHistory]: history,
    [STORAGE_KEYS.status]: STATUS.idle
  });
  broadcast(MESSAGE.THREADS_UPDATE);

  return history;
}

async function createAndSelectThread(payload) {
  const settings = await getSettings();
  if (!settings.apiUrl?.trim()) {
    throw new Error("Backend URL is not configured.");
  }

  if (!payload?.jobDescription?.trim()) {
    throw new Error("Job description is required.");
  }
  if (!payload?.resume?.buffer) {
    throw new Error("Resume file is required.");
  }

  const blob = new Blob([payload.resume.buffer], {
    type: payload.resume.type || "application/octet-stream"
  });

  const thread = await createThread(settings.apiUrl, {
    title: payload.title?.trim() || defaultThreadTitle(),
    jobDescription: payload.jobDescription.trim(),
    resume: { blob, name: payload.resume.name }
  });

  const { threads = [] } = await chrome.storage.local.get(STORAGE_KEYS.threads);
  const nextThreads = [thread, ...threads.filter((t) => t.id !== thread.id)];

  await clearThreadCache();
  await setThreadCache(thread.id, []);
  await setRuntimeState({
    [STORAGE_KEYS.activeThreadId]: thread.id,
    [STORAGE_KEYS.threads]: nextThreads,
    [STORAGE_KEYS.threadHistory]: [],
    [STORAGE_KEYS.status]: STATUS.idle
  });
  broadcast(MESSAGE.THREADS_UPDATE);

  return { thread };
}

function defaultThreadTitle() {
  return `Interview ${new Date().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  })}`;
}

async function openSidePanel(windowId) {
  if (!windowId) return;
  try {
    await chrome.sidePanel.open({ windowId });
  } catch {
    // Side panel may already be open
  }
}

async function captureCaptionFromTab(tabId) {
  await ensureContentScript(tabId);
  return collectCaptionFromAllFrames(tabId);
}

async function ensureContentScript(tabId) {
  const ping = await sendCaptureMessage(tabId);
  if (ping !== null) return;

  await chrome.scripting.executeScript({
    target: { tabId, allFrames: true },
    files: ["content/caption-capture.js"]
  });
}

async function collectCaptionFromAllFrames(tabId) {
  let best = "";
  const frames = await chrome.webNavigation.getAllFrames({ tabId }).catch(() => [{ frameId: 0 }]);

  for (const frame of frames) {
    const caption = await sendCaptureMessage(tabId, frame.frameId);
    if (caption && caption.length > best.length) best = caption;
  }

  return best;
}

async function sendCaptureMessage(tabId, frameId = 0) {
  try {
    const response = await chrome.tabs.sendMessage(
      tabId,
      { type: MESSAGE.CAPTURE_CAPTION },
      { frameId }
    );
    return response?.caption ?? "";
  } catch {
    return null;
  }
}

async function fail(message) {
  await setRuntimeState({
    [STORAGE_KEYS.status]: STATUS.error,
    [STORAGE_KEYS.lastError]: message
  });
  broadcast(MESSAGE.PIPELINE_UPDATE);
}

function broadcast(type) {
  chrome.runtime.sendMessage({ type }).catch(() => {});
}
