import { MESSAGE, STATUS, STORAGE_KEYS } from "../shared/constants.js";
import { validateResumeFile } from "../shared/api.js";

const statusBar = document.getElementById("status-bar");
const statusLabel = document.getElementById("status-label");
const threadList = document.getElementById("thread-list");
const conversation = document.getElementById("conversation");
const conversationEmpty = document.getElementById("conversation-empty");
const hotkeyHint = document.getElementById("hotkey-hint");

let lastRenderedCount = 0;
let lastRenderedThreadId = null;

const newThreadModal = document.getElementById("new-thread-modal");
const newThreadForm = document.getElementById("new-thread-form");
const threadTitleInput = document.getElementById("thread-title");
const resumeFileInput = document.getElementById("resume-file");
const resumeDrop = document.getElementById("resume-drop");
const resumeLabel = document.getElementById("resume-label");
const resumeName = document.getElementById("resume-name");
const resumeError = document.getElementById("resume-error");
const jobDescriptionInput = document.getElementById("job-description");
const jobError = document.getElementById("job-error");
const modalSubmitBtn = document.getElementById("btn-modal-submit");

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

document.getElementById("btn-new-thread").addEventListener("click", openNewThreadModal);
document.getElementById("btn-modal-close").addEventListener("click", closeNewThreadModal);
document.getElementById("btn-modal-cancel").addEventListener("click", closeNewThreadModal);

newThreadModal.addEventListener("cancel", (e) => {
  e.preventDefault();
  closeNewThreadModal();
});

newThreadModal.addEventListener("click", (e) => {
  if (e.target === newThreadModal) closeNewThreadModal();
});

resumeFileInput.addEventListener("change", () => updateResumeDisplay(resumeFileInput.files[0]));

resumeDrop.addEventListener("dragover", (e) => {
  e.preventDefault();
  resumeDrop.classList.add("is-dragover");
});

resumeDrop.addEventListener("dragleave", () => {
  resumeDrop.classList.remove("is-dragover");
});

resumeDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  resumeDrop.classList.remove("is-dragover");
  const file = e.dataTransfer?.files?.[0];
  if (!file) return;
  setResumeFile(file);
});

newThreadForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateNewThreadForm()) return;

  const file = resumeFileInput.files[0];
  const jobDescription = jobDescriptionInput.value.trim();
  const title = threadTitleInput.value.trim();

  modalSubmitBtn.disabled = true;
  modalSubmitBtn.textContent = "Creating…";

  try {
    const buffer = await file.arrayBuffer();
    chrome.runtime.sendMessage(
      {
        type: MESSAGE.CREATE_THREAD,
        title: title || undefined,
        jobDescription,
        resume: {
          name: file.name,
          type: file.type,
          buffer
        }
      },
      (res) => {
        modalSubmitBtn.disabled = false;
        modalSubmitBtn.textContent = "Create interview";
        if (!res?.ok) {
          showError(res?.error || "Could not create interview.");
          return;
        }
        closeNewThreadModal();
        render();
      }
    );
  } catch {
    modalSubmitBtn.disabled = false;
    modalSubmitBtn.textContent = "Create interview";
    showError("Could not read resume file.");
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === MESSAGE.PIPELINE_UPDATE || message.type === MESSAGE.THREADS_UPDATE) {
    render();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" || area === "sync") render();
});

function openNewThreadModal() {
  newThreadForm.reset();
  resumeName.hidden = true;
  resumeLabel.hidden = false;
  hideFieldError(resumeError);
  hideFieldError(jobError);
  resumeDrop.classList.remove("has-file", "is-invalid");
  newThreadModal.showModal();
  threadTitleInput.focus();
}

function closeNewThreadModal() {
  newThreadModal.close();
}

function setResumeFile(file) {
  const dt = new DataTransfer();
  dt.items.add(file);
  resumeFileInput.files = dt.files;
  updateResumeDisplay(file);
}

function updateResumeDisplay(file) {
  hideFieldError(resumeError);
  resumeDrop.classList.remove("is-invalid");

  if (!file) {
    resumeName.hidden = true;
    resumeLabel.hidden = false;
    resumeDrop.classList.remove("has-file");
    return;
  }

  resumeDrop.classList.add("has-file");
  resumeLabel.hidden = true;
  resumeName.hidden = false;
  resumeName.textContent = file.name;
}

function validateNewThreadForm() {
  let valid = true;

  const file = resumeFileInput.files[0];
  const resumeErr = validateResumeFile(file);
  if (resumeErr) {
    showFieldError(resumeError, resumeErr);
    resumeDrop.classList.add("is-invalid");
    valid = false;
  } else {
    hideFieldError(resumeError);
    resumeDrop.classList.remove("is-invalid");
  }

  if (!jobDescriptionInput.value.trim()) {
    showFieldError(jobError, "Job description is required.");
    valid = false;
  } else {
    hideFieldError(jobError);
  }

  return valid;
}

function showFieldError(el, message) {
  el.textContent = message;
  el.hidden = false;
}

function hideFieldError(el) {
  el.hidden = true;
  el.textContent = "";
}

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
  renderConversation(history, status, state, activeId);
  updateHotkeyHint();
}

function renderThreadBar(threads, activeId) {
  if (threads.length === 0) {
    threadList.innerHTML = `<span class="thread-placeholder">Click + to start an interview</span>`;
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

function renderConversation(history, status, state, activeThreadId) {
  if (activeThreadId !== lastRenderedThreadId) {
    lastRenderedThreadId = activeThreadId;
    lastRenderedCount = 0;
  }

  const isBusy = status === STATUS.capturing || status === STATUS.sending;
  const hasPending = isBusy && (state[STORAGE_KEYS.lastCaption] || status !== STATUS.idle);
  const sorted = [...history].sort((a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0));

  if (sorted.length === 0 && !hasPending) {
    conversationEmpty.hidden = false;
    conversation.querySelectorAll(".conversation-messages, .message-pending").forEach((el) => el.remove());
    lastRenderedCount = 0;
    return;
  }

  conversationEmpty.hidden = true;

  const stickToBottom =
    hasPending || sorted.length > lastRenderedCount || status === STATUS.loading;

  let container = conversation.querySelector(".conversation-messages");
  if (!container) {
    container = document.createElement("div");
    container.className = "conversation-messages";
    conversation.appendChild(container);
  }

  conversation.querySelectorAll(".message-pending").forEach((el) => el.remove());
  container.innerHTML = sorted.map((item) => renderMessageGroup(item)).join("");

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

  lastRenderedCount = sorted.length;

  if (stickToBottom) {
    requestAnimationFrame(() => {
      conversation.scrollTop = conversation.scrollHeight;
    });
  }
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
