export const CREDENTIALS = {
  username: 'team14',
  password: 'Onedream0824!',
}

/** chrome.storage.sync — small values (<8 KB each) */
export const STORAGE_KEYS = {
  AUTH: 'auth_state',
  DARK_MODE: 'dark_mode',
}

/** chrome.storage.local — larger values (resume text, API key, etc.) */
export const LOCAL_KEYS = {
  API_KEY: 'api_key',
  MODEL: 'ai_model',
  SYSTEM_PROMPT: 'system_prompt',
  RESUME_TEXT: 'resume_text',
  JOB_DESCRIPTION: 'job_description',
}

export const MESSAGE_TYPES = {
  CAPTURE: 'CAPTURE_CAPTIONS',
  CAPTURED: 'CAPTIONS_CAPTURED',
  TRIGGER_CAPTURE: 'TRIGGER_CAPTURE',
  SEND: 'SEND_MESSAGE',
}

export const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o (recommended)' },
  { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
  { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (fastest)' },
]

export const DEFAULT_MODEL = 'gpt-4o'

export const DEFAULT_SYSTEM_PROMPT =
  'You are an expert interview coach. When given a question or context from a job interview, provide a concise, strategic response the candidate should say. Focus on highlighting relevant experience, using concrete examples, and aligning with the job requirements. Be direct and actionable. Keep your response under 3 sentences.'
