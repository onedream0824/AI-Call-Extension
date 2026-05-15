import { signIn, signOut, isAuthenticated, AUTH_ERRORS } from "../shared/auth.js";
import { DEFAULTS, MESSAGE, STORAGE_KEYS } from "../shared/constants.js";
import { sendRuntimeMessage } from "../shared/runtime-message.js";

const authView = document.getElementById("auth-view");
const settingsPage = document.getElementById("settings-page");
const signInForm = document.getElementById("sign-in-form");
const authError = document.getElementById("auth-error");
const form = document.getElementById("settings-form");
const saveStatus = document.getElementById("save-status");
const currentHotkey = document.getElementById("current-hotkey");

function updateAuthUI(authed) {
  authView.hidden = Boolean(authed);
  settingsPage.hidden = !authed;
}

function showAuthError(message) {
  authError.textContent = message;
  authError.hidden = false;
  authError.setAttribute("role", "alert");
}

function hideAuthError() {
  authError.hidden = true;
  authError.textContent = "";
}

async function loadSettings() {
  const stored = await chrome.storage.sync.get([
    STORAGE_KEYS.apiUrl,
    STORAGE_KEYS.customSelector
  ]);

  document.getElementById("apiUrl").value = stored[STORAGE_KEYS.apiUrl] ?? DEFAULTS.apiUrl;
  document.getElementById("customSelector").value =
    stored[STORAGE_KEYS.customSelector] ?? DEFAULTS.customSelector;

  await updateHotkeyDisplay();
}

async function updateHotkeyDisplay() {
  if (!chrome.commands?.getAll) return;
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === "capture-and-send");
  if (cmd?.shortcut) currentHotkey.textContent = cmd.shortcut;
}

signInForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideAuthError();

  const submitBtn = signInForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Signing in…";

  try {
    await signIn(
      document.getElementById("auth-username").value,
      document.getElementById("auth-password").value
    );
    document.getElementById("auth-password").value = "";
    updateAuthUI(true);
    await loadSettings();
  } catch (err) {
    showAuthError(err.message || AUTH_ERRORS.unknown);
    updateAuthUI(false);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Sign in";
  }
});

document.getElementById("btn-sign-out").addEventListener("click", async () => {
  await signOut();
  await sendRuntimeMessage({ type: MESSAGE.SIGN_OUT }).catch(() => {});
  updateAuthUI(false);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    [STORAGE_KEYS.apiUrl]: document.getElementById("apiUrl").value.trim(),
    [STORAGE_KEYS.customSelector]: document.getElementById("customSelector").value.trim()
  };

  await chrome.storage.sync.set(data);
  saveStatus.textContent = "Saved.";
  setTimeout(() => { saveStatus.textContent = ""; }, 2500);
});

document.getElementById("btn-shortcuts").addEventListener("click", () => {
  const isEdge = navigator.userAgent.includes("Edg/");
  chrome.tabs.create({
    url: isEdge ? "edge://extensions/shortcuts" : "chrome://extensions/shortcuts"
  });
});

async function init() {
  const authed = await isAuthenticated();
  updateAuthUI(authed);
  if (authed) await loadSettings();
}

init();
