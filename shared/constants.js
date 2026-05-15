export const STORAGE_KEYS = {
  isAuthenticated: "isAuthenticated",
  authUsername: "authUsername",
  apiUrl: "apiUrl",
  customSelector: "customSelector",
  activeThreadId: "activeThreadId",
  cachedThreadId: "cachedThreadId",
  threads: "threads",
  threadHistory: "threadHistory",
  lastCaption: "lastCaption",
  lastResponse: "lastResponse",
  lastError: "lastError",
  status: "status"
};

export const DEFAULTS = {
  apiUrl: "",
  customSelector: "",
  threads: [],
  threadHistory: []
};

export const API = {
  requestField: "text",
  responseField: "response"
};

export const STATUS = {
  idle: "idle",
  capturing: "capturing",
  sending: "sending",
  loading: "loading",
  success: "success",
  error: "error"
};

export const MESSAGE = {
  CAPTURE_CAPTION: "CAPTURE_CAPTION",
  RUN_PIPELINE: "RUN_PIPELINE",
  PIPELINE_UPDATE: "PIPELINE_UPDATE",
  THREADS_UPDATE: "THREADS_UPDATE",
  FETCH_THREADS: "FETCH_THREADS",
  SELECT_THREAD: "SELECT_THREAD",
  CREATE_THREAD: "CREATE_THREAD",
  SIGN_IN: "SIGN_IN",
  SIGN_OUT: "SIGN_OUT",
  AUTH_UPDATE: "AUTH_UPDATE",
  GET_AUTH_STATE: "GET_AUTH_STATE"
};
