export const STORAGE_KEYS = {
  apiUrl: "apiUrl",
  customSelector: "customSelector",
  activeThreadId: "activeThreadId",
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
  CREATE_THREAD: "CREATE_THREAD"
};
