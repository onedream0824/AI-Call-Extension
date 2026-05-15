export const STORAGE_KEYS = {
  apiUrl: "apiUrl",
  customSelector: "customSelector",
  lastCaption: "lastCaption",
  lastResponse: "lastResponse",
  lastError: "lastError",
  sessionHistory: "sessionHistory",
  status: "status"
};

export const DEFAULTS = {
  apiUrl: "",
  customSelector: "",
  sessionHistory: []
};

/** Fixed API contract — configured on your backend */
export const API = {
  requestField: "text",
  responseField: "response"
};

export const STATUS = {
  idle: "idle",
  capturing: "capturing",
  sending: "sending",
  success: "success",
  error: "error"
};

export const MESSAGE = {
  CAPTURE_CAPTION: "CAPTURE_CAPTION",
  CAPTION_RESULT: "CAPTION_RESULT",
  RUN_PIPELINE: "RUN_PIPELINE",
  PIPELINE_UPDATE: "PIPELINE_UPDATE",
  GET_STATE: "GET_STATE",
  CLEAR_HISTORY: "CLEAR_HISTORY"
};
