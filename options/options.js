import { DEFAULTS, STORAGE_KEYS } from "../shared/constants.js";

const form = document.getElementById("settings-form");
const saveStatus = document.getElementById("save-status");
const currentHotkey = document.getElementById("current-hotkey");

async function load() {
  const stored = await chrome.storage.sync.get(Object.values(STORAGE_KEYS).filter(
    (k) => !["lastCaption", "lastResponse", "lastError", "status", "sessionHistory"].includes(k)
  ));

  document.getElementById("apiUrl").value = stored[STORAGE_KEYS.apiUrl] ?? DEFAULTS.apiUrl;
  document.getElementById("customSelector").value = stored[STORAGE_KEYS.customSelector] ?? DEFAULTS.customSelector;

  await updateHotkeyDisplay();
}

async function updateHotkeyDisplay() {
  if (!chrome.commands?.getAll) return;
  const commands = await chrome.commands.getAll();
  const cmd = commands.find((c) => c.name === "capture-and-send");
  if (cmd?.shortcut) currentHotkey.textContent = cmd.shortcut;
}

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

load();
