export const STORAGE_KEYS = {
  apiUrl: "apiUrl",
  apiKey: "apiKey",
  apiKeyHeader: "apiKeyHeader",
  customSelector: "customSelector",
  requestField: "requestField",
  responseField: "responseField",
  lastCaption: "lastCaption",
  lastResponse: "lastResponse",
  lastError: "lastError",
  sessionHistory: "sessionHistory",
  status: "status"
};

export const DEFAULTS = {
  apiUrl: "",
  apiKey: "",
  apiKeyHeader: "Authorization",
  customSelector: "",
  requestField: "text",
  responseField: "response",
  sessionHistory: []
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
