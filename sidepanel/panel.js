import { signIn, signOut, isAuthenticated, AUTH_ERRORS } from "../shared/auth.js";
import { DEFAULTS, MESSAGE, STATUS, STORAGE_KEYS } from "../shared/constants.js";
import { validateResumeFile } from "../shared/api.js";
import { sendRuntimeMessage } from "../shared/runtime-message.js";

const authView = document.getElementById("auth-view");
const appRoot = document.getElementById("app-root");
const signInForm = document.getElementById("sign-in-form");
const authUsernameInput = document.getElementById("auth-username");
const authPasswordInput = document.getElementById("auth-password");
const authError = document.getElementById("auth-error");
const btnSignIn = document.getElementById("btn-sign-in");

const statusBar = document.getElementById("status-bar");
const statusLabel = document.getElementById("status-label");
const threadList = document.getElementById("thread-list");
const conversation = document.getElementById("conversation");
const conversationEmpty = document.getElementById("conversation-empty");
const hotkeyHint = document.getElementById("hotkey-hint");
const mainView = document.getElementById("main-view");
const settingsView = document.getElementById("settings-view");
const btnSettings = document.getElementById("btn-settings");
const settingsForm = document.getElementById("settings-form");
const saveStatus = document.getElementById("save-status");
const settingsHotkey = document.getElementById("settings-hotkey");

let lastRenderedCount = 0;
let showingSettings = false;
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

btnSettings.addEventListener("click", () => {
  showingSettings ? showMainView() : showSettingsView();
});

document.getElementById("btn-settings-back").addEventListener("click", showMainView);

settingsForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveSettings();
});

document.getElementById("btn-shortcuts").addEventListener("click", () => {
  const isEdge = navigator.userAgent.includes("Edg/");
  chrome.tabs.create({
    url: isEdge ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts"
  });
});

document.getElementById("btn-sign-out").addEventListener("click", async () => {
  try {
    await signOut();
    await sendRuntimeMessage({ type: MESSAGE.SIGN_OUT }).catch(() => {});
    updateAuthUI(false);
    authUsernameInput.value = "";
    authPasswordInput.value = "";
    hideFieldError(authError);
  } catch (err) {
    showFieldError(authError, err.message || AUTH_ERRORS.unknown);
  }
});

document.getElementById("btn-run").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: MESSAGE.RUN_PIPELINE });
});

document.getElementById("btn-new-thread").addEventListener("click", openNewThreadModal);

signInForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFieldError(authError);
  btnSignIn.disabled = true;
  btnSignIn.textContent = "Signing in…";

  try {
    await signIn(authUsernameInput.value, authPasswordInput.value);
    authPasswordInput.value = "";
    updateAuthUI(true);
    await bootstrapApp();
  } catch (err) {
    showFieldError(authError, err.message || AUTH_ERRORS.unknown);
    authView.hidden = false;
    appRoot.hidden = true;
  } finally {
    btnSignIn.disabled = false;
    btnSignIn.textContent = "Sign in";
  }
});
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
  if (message.type === MESSAGE.AUTH_UPDATE) {
    isAuthenticated().then((authed) => {
      updateAuthUI(authed);
      if (authed) bootstrapApp();
    });
    return;
  }
  if (message.type === MESSAGE.PIPELINE_UPDATE || message.type === MESSAGE.THREADS_UPDATE) {
    if (appRoot.hidden || showingSettings) return;
    render();
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes[STORAGE_KEYS.isAuthenticated]) {
    const authed = changes[STORAGE_KEYS.isAuthenticated].newValue === true;
    updateAuthUI(authed);
    if (authed) bootstrapApp();
    return;
  }
  if (appRoot.hidden || showingSettings) return;
  if (area === "local" || area === "sync") render();
});

function updateAuthUI(authed) {
  authView.hidden = Boolean(authed);
  appRoot.hidden = !authed;
  document.body.classList.toggle("is-authed", Boolean(authed));
  if (!authed) showingSettings = false;
}

function showSettingsView() {
  showingSettings = true;
  mainView.hidden = true;
  settingsView.hidden = false;
  btnSettings.setAttribute("aria-pressed", "true");
  btnSettings.classList.add("is-active");
  loadSettingsForm();
}

async function showMainView() {
  showingSettings = false;
  settingsView.hidden = true;
  mainView.hidden = false;
  btnSettings.setAttribute("aria-pressed", "false");
  btnSettings.classList.remove("is-active");
  saveStatus.textContent = "";

  const { apiUrl } = await chrome.storage.sync.get(STORAGE_KEYS.apiUrl);
  if (apiUrl?.trim()) {
    try {
      await sendRuntimeMessage({ type: MESSAGE.FETCH_THREADS });
    } catch (err) {
      showError(err.message || "Could not load threads.");
    }
  } else {
    conversationEmpty.textContent = "Open Settings and add your backend URL.";
  }
  render();
}

async function loadSettingsForm() {
  const stored = await chrome.storage.sync.get([
    STORAGE_KEYS.apiUrl,
    STORAGE_KEYS.customSelector
  ]);

  document.getElementById("apiUrl").value = stored[STORAGE_KEYS.apiUrl] ?? DEFAULTS.apiUrl;
  document.getElementById("customSelector").value =
    stored[STORAGE_KEYS.customSelector] ?? DEFAULTS.customSelector;

  await updateSettingsHotkey();
}

async function updateSettingsHotkey() {
  if (!chrome.commands?.getAll) return;
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === "capture-and-send");
  if (cmd?.shortcut) {
    settingsHotkey.textContent = cmd.shortcut;
    hotkeyHint.textContent = cmd.shortcut;
  }
}

async function saveSettings() {
  const data = {
    [STORAGE_KEYS.apiUrl]: document.getElementById("apiUrl").value.trim(),
    [STORAGE_KEYS.customSelector]: document.getElementById("customSelector").value.trim()
  };

  await chrome.storage.sync.set(data);
  saveStatus.textContent = "Saved.";
  setTimeout(() => { saveStatus.textContent = ""; }, 2000);
}

async function checkAuth() {
  return isAuthenticated();
}

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
  el.setAttribute("role", "alert");
}

function hideFieldError(el) {
  el.hidden = true;
  el.textContent = "";
}

async function bootstrapApp() {
  showMainView();
  const { apiUrl } = await chrome.storage.sync.get(STORAGE_KEYS.apiUrl);
  if (apiUrl?.trim()) {
    try {
      await sendRuntimeMessage({ type: MESSAGE.FETCH_THREADS });
    } catch (err) {
      showError(err.message || "Could not load threads.");
    }
  } else {
    conversationEmpty.textContent = "Open Settings and add your backend URL.";
  }
  render();
}

async function init() {
  const authed = await checkAuth();
  updateAuthUI(authed);
  if (authed) await bootstrapApp();
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
  await updateSettingsHotkey();
}

init();
