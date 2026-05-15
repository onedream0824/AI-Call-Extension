import { MESSAGE, STATUS, STORAGE_KEYS } from "../shared/constants.js";

const statusBar = document.getElementById("status-bar");
const statusLabel = document.getElementById("status-label");
const captionEl = document.getElementById("caption-text");
const responseEl = document.getElementById("response-text");
const responseCard = document.querySelector(".card-response");
const historySection = document.getElementById("history-section");
const historyList = document.getElementById("history-list");
const hotkeyHint = document.getElementById("hotkey-hint");

const STATUS_LABELS = {
  [STATUS.idle]: "Ready",
  [STATUS.capturing]: "Reading live caption…",
  [STATUS.sending]: "Sending to API…",
  [STATUS.success]: "Response received",
  [STATUS.error]: "Error"
};

document.getElementById("btn-settings").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

document.getElementById("btn-run").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE.RUN_PIPELINE });
});

document.getElementById("btn-clear").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE.CLEAR_HISTORY }, () => render());
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE.PIPELINE_UPDATE) render();
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" || area === "sync") render();
});

async function render() {
  const state = await chrome.storage.local.get([
    STORAGE_KEYS.lastCaption,
    STORAGE_KEYS.lastResponse,
    STORAGE_KEYS.lastError,
    STORAGE_KEYS.status,
    STORAGE_KEYS.sessionHistory
  ]);

  const status = state[STORAGE_KEYS.status] || STATUS.idle;
  statusBar.dataset.status = status;
  statusLabel.textContent = state[STORAGE_KEYS.lastError]
    ? state[STORAGE_KEYS.lastError]
    : STATUS_LABELS[status] || STATUS_LABELS[STATUS.idle];

  setText(captionEl, state[STORAGE_KEYS.lastCaption], "Press your hotkey or Capture to fetch the latest live caption.");

  if (state[STORAGE_KEYS.lastError] && status === STATUS.error) {
    responseCard.classList.add("card-error");
    responseCard.classList.remove("has-response");
    setText(responseEl, state[STORAGE_KEYS.lastError], "Your backend response will appear here.", false);
  } else {
    responseCard.classList.remove("card-error");
    const hasResponse = Boolean(state[STORAGE_KEYS.lastResponse]);
    responseCard.classList.toggle("has-response", hasResponse);
    setText(responseEl, state[STORAGE_KEYS.lastResponse], "Your backend response will appear here.");
  }

  const history = state[STORAGE_KEYS.sessionHistory] || [];
  historySection.hidden = history.length === 0;
  historyList.innerHTML = history
    .map(
      (item) => `
      <li class="history-item">
        <time>${formatTime(item.at)}</time>
        <p class="caption-snippet">${escapeHtml(item.caption)}</p>
        <p class="response-snippet">${escapeHtml(item.response)}</p>
      </li>`
    )
    .join("");

  updateHotkeyHint();
}

function setText(el, value, placeholder, italicEmpty = true) {
  if (value?.trim()) {
    el.textContent = value;
    el.classList.remove("empty");
  } else {
    el.textContent = placeholder;
    el.classList.add("empty");
    if (!italicEmpty) el.classList.remove("empty");
  }
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

async function updateHotkeyHint() {
  if (!chrome.commands?.getAll) return;
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === "capture-and-send");
  if (cmd?.shortcut) hotkeyHint.textContent = cmd.shortcut;
}

render();
