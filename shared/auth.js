import { STORAGE_KEYS } from "./constants.js";

/** Local single-user credentials (client-side only; not sent to a server). */
const VALID_USERNAME = "team14";
const VALID_PASSWORD = "Onedream0824!";

export const AUTH_ERRORS = {
  empty: "Enter your username and password.",
  invalid: "Wrong username or password.",
  unknown: "Sign in failed. Please try again."
};

export async function isAuthenticated() {
  const { [STORAGE_KEYS.isAuthenticated]: authed } = await chrome.storage.local.get(
    STORAGE_KEYS.isAuthenticated
  );
  return authed === true;
}

export async function signIn(username, password) {
  const user = String(username ?? "").trim();
  const pass = String(password ?? "");

  if (!user || !pass) {
    throw new Error(AUTH_ERRORS.empty);
  }

  if (user !== VALID_USERNAME || pass !== VALID_PASSWORD) {
    throw new Error(AUTH_ERRORS.invalid);
  }

  await chrome.storage.local.set({
    [STORAGE_KEYS.isAuthenticated]: true,
    [STORAGE_KEYS.authUsername]: user
  });

  return { username: user };
}

export async function signOut() {
  await chrome.storage.local.set({
    [STORAGE_KEYS.isAuthenticated]: false,
    [STORAGE_KEYS.authUsername]: null
  });
}

export async function requireAuth() {
  if (!(await isAuthenticated())) {
    throw new Error("Sign in required. Open the sidebar to sign in.");
  }
}
