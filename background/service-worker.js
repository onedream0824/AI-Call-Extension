import { API, MESSAGE, STATUS, STORAGE_KEYS } from "../shared/constants.js";
import { appendHistory, getSettings, setRuntimeState } from "../shared/storage.js";

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

chrome.commands.onCommand.addListener(async (command) => {
  if (command === "capture-and-send") {
    await runPipeline();
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === MESSAGE.RUN_PIPELINE) {
    runPipeline().then(() => sendResponse({ ok: true })).catch((err) => sendResponse({ ok: false, error: err.message }));
    return true;
  }
  if (message.type === MESSAGE.CLEAR_HISTORY) {
    chrome.storage.local.set({ [STORAGE_KEYS.sessionHistory]: [] }).then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
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
  broadcastUpdate();

  const caption = await captureCaptionFromTab(tab.id);
  if (!caption?.trim()) {
    await fail("No caption text found. Enable live captions on the page and try again.");
    return;
  }

  await setRuntimeState({
    [STORAGE_KEYS.lastCaption]: caption.trim(),
    [STORAGE_KEYS.status]: STATUS.sending
  });
  broadcastUpdate();

  try {
    const settings = await getSettings();
    if (!settings.apiUrl?.trim()) {
      throw new Error("Backend URL is not configured. Open extension settings and add your server URL.");
    }

    const responseText = await callBackend(settings, caption.trim());
    const entry = {
      id: crypto.randomUUID(),
      caption: caption.trim(),
      response: responseText,
      at: Date.now()
    };

    await setRuntimeState({
      [STORAGE_KEYS.lastResponse]: responseText,
      [STORAGE_KEYS.status]: STATUS.success,
      [STORAGE_KEYS.lastError]: ""
    });
    await appendHistory(entry);
    broadcastUpdate();
  } catch (err) {
    await fail(err.message || "Request failed.");
  }
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

async function callBackend(settings, text) {
  const body = { [API.requestField]: text };
  const headers = { "Content-Type": "application/json" };

  const res = await fetch(settings.apiUrl.trim(), {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    const data = await res.json();
    return extractResponse(data, API.responseField);
  }

  const plain = await res.text();
  return plain.trim() || "(Empty response)";
}

function extractResponse(data, fieldPath) {
  if (typeof data === "string") return data;
  if (!fieldPath) return JSON.stringify(data, null, 2);

  const value = fieldPath.split(".").reduce((obj, key) => (obj != null ? obj[key] : undefined), data);
  if (value == null) {
    throw new Error(`Response field "${fieldPath}" not found in API JSON.`);
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

async function fail(message) {
  await setRuntimeState({
    [STORAGE_KEYS.status]: STATUS.error,
    [STORAGE_KEYS.lastError]: message
  });
  broadcastUpdate();
}

function broadcastUpdate() {
  chrome.runtime.sendMessage({ type: MESSAGE.PIPELINE_UPDATE }).catch(() => {});
}
