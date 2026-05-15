import { MESSAGE, STATUS, STORAGE_KEYS } from "../shared/constants.js";

const statusBar = document.getElementById("status-bar");
const statusLabel = document.getElementById("status-label");
const threadList = document.getElementById("thread-list");
const conversation = document.getElementById("conversation");
const conversationEmpty = document.getElementById("conversation-empty");
const hotkeyHint = document.getElementById("hotkey-hint");

const STATUS_LABELS = {
  [STATUS.idle]: "Ready",
  [STATUS.capturing]: "Reading live caption…",
  [STATUS.sending]: "Sending to API…",
  [STATUS.loading]: "Loading…",
  [STATUS.success]: "Response received",
  [STATUS.error]: "Error"
};

document.getElementById("btn-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("btn-run").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE.RUN_PIPELINE });
});

document.getElementById("btn-new-thread").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE.CREATE_THREAD }, (res) => {
    if (!res?.ok) showError(res?.error || "Could not create thread.");
    else render();
  });
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE.PIPELINE_UPDATE || message.type === MESSAGE.THREADS_UPDATE) {
    render();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" || area === "sync") render();
});

async function init() {
  const { apiUrl } = await chrome.storage.sync.get(STORAGE_KEYS.apiUrl);
  if (apiUrl?.trim()) {
    chrome.runtime.sendMessage({ type: MESSAGE.FETCH_THREADS }, (res) => {
      if (!res?.ok) showError(res?.error || "Could not load threads.");
      render();
    });
  } else {
    conversationEmpty.textContent = "Configure your backend URL in Settings.";
    render();
  }
}

async function render() {
  const state = await chrome.storage.local.get([
    STORAGE_KEYS.lastCaption,
    STORAGE_KEYS.lastResponse,
    STORAGE_KEYS.lastError,
    STORAGE_KEYS.status,
    STORAGE_KEYS.threads,
    STORAGE_KEYS.activeThreadId,
    STORAGE_KEYS.threadHistory
  ]);

  const status = state[STORAGE_KEYS.status] || STATUS.idle;
  const threads = state[STORAGE_KEYS.threads] || [];
  const activeId = state[STORAGE_KEYS.activeThreadId];
  const history = state[STORAGE_KEYS.threadHistory] || [];

  statusBar.dataset.status = status;
  statusLabel.textContent = state[STORAGE_KEYS.lastError]
    ? state[STORAGE_KEYS.lastError]
    : STATUS_LABELS[status] || STATUS_LABELS[STATUS.idle];

  renderThreadBar(threads, activeId);
  renderConversation(history, status, state);
  updateHotkeyHint();
}

function renderThreadBar(threads, activeId) {
  if (threads.length === 0) {
    threadList.innerHTML = `<span class="thread-placeholder">No interviews yet</span>`;
    return;
  }

  threadList.innerHTML = threads
    .map(
      (t) => `
      <button
        type="button"
        class="thread-tab${t.id === activeId ? " is-active" : ""}"
        role="tab"
        aria-selected="${t.id === activeId}"
        data-thread-id="${escapeAttr(t.id)}"
        title="${escapeAttr(t.title)}"
      >${escapeHtml(truncate(t.title, 28))}</button>`
    )
    .join("");

  threadList.querySelectorAll(".thread-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      const threadId = btn.dataset.threadId;
      chrome.runtime.sendMessage({ type: MESSAGE.SELECT_THREAD, threadId }, (res) => {
        if (!res?.ok) showError(res?.error || "Could not load thread.");
        else render();
      });
    });
  });

  const activeBtn = threadList.querySelector(".thread-tab.is-active");
  activeBtn?.scrollIntoView({ inline: "nearest", block: "nearest" });
}

function renderConversation(history, status, state) {
  const isBusy = status === STATUS.capturing || status === STATUS.sending;
  const hasPending = isBusy && (state[STORAGE_KEYS.lastCaption] || status !== STATUS.idle);

  if (history.length === 0 && !hasPending) {
    conversationEmpty.hidden = false;
    conversation.querySelectorAll(".message-group, .message-pending").forEach((el) => el.remove());
    return;
  }

  conversationEmpty.hidden = true;

  const existing = conversation.querySelector(".conversation-messages");
  const container = existing || document.createElement("div");
  container.className = "conversation-messages";
  if (!existing) conversation.appendChild(container);

  container.innerHTML = history.map((item) => renderMessageGroup(item)).join("");

  if (hasPending) {
    const pending = document.createElement("div");
    pending.className = "message-pending";
    pending.innerHTML = `
      <div class="msg msg-caption">
        <span class="msg-label">Client</span>
        <p>${escapeHtml(state[STORAGE_KEYS.lastCaption] || "…")}</p>
      </div>
      <div class="msg msg-response">
        <span class="msg-label">Assistant</span>
        <p class="msg-loading">${status === STATUS.sending ? "Thinking…" : "Capturing…"}</p>
      </div>`;
    container.appendChild(pending);
  }

  container.scrollTop = container.scrollHeight;
}

function renderMessageGroup(item) {
  return `
    <article class="message-group" data-id="${escapeAttr(item.id)}">
      <div class="msg msg-caption">
        <span class="msg-label">Client</span>
        <p>${escapeHtml(item.caption)}</p>
        <time>${formatTime(item.createdAt)}</time>
      </div>
      <div class="msg msg-response">
        <span class="msg-label">Assistant</span>
        <p>${escapeHtml(item.response)}</p>
      </div>
    </article>`;
}

function showError(message) {
  statusBar.dataset.status = STATUS.error;
  statusLabel.textContent = message;
}

function truncate(str, max) {
  return str.length > max ? `${str.slice(0, max - 1)}…` : str;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function escapeAttr(str) {
  return String(str ?? "").replace(/"/g, "&quot;");
}

async function updateHotkeyHint() {
  if (!chrome.commands?.getAll) return;
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === "capture-and-send");
  if (cmd?.shortcut) hotkeyHint.textContent = cmd.shortcut;
}

init();
