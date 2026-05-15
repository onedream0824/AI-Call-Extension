import { API } from "./constants.js";

export function getApiBase(apiUrl) {
  const url = new URL(apiUrl.trim());
  let path = url.pathname.replace(/\/$/, "");
  if (path.endsWith("/assist")) {
    path = path.slice(0, -"/assist".length);
  }
  url.pathname = path || "/";
  const base = url.origin + url.pathname;
  return base.replace(/\/$/, "") || url.origin;
}

export function assistEndpoint(apiUrl) {
  const trimmed = apiUrl.trim();
  const path = new URL(trimmed).pathname;
  if (path.includes("assist")) return trimmed.replace(/\/$/, "");
  return `${getApiBase(trimmed)}/assist`;
}

const RESUME_TYPES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]);

const RESUME_EXTENSIONS = [".pdf", ".docx"];

export function validateResumeFile(file) {
  if (!file) return "Resume file is required (PDF or DOCX).";
  const name = file.name.toLowerCase();
  const extOk = RESUME_EXTENSIONS.some((ext) => name.endsWith(ext));
  const typeOk = !file.type || RESUME_TYPES.has(file.type);
  if (!extOk && !typeOk) return "Resume must be a PDF or DOCX file.";
  if (file.size > 10 * 1024 * 1024) return "Resume must be 10 MB or smaller.";
  return null;
}

async function request(url, options = {}) {
  const headers = { ...options.headers };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, {
    ...options,
    headers
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}${errText ? `: ${errText.slice(0, 200)}` : ""}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return res.json();
  const text = await res.text();
  return text.trim() ? { response: text.trim() } : {};
}

export function normalizeThreads(data) {
  const list = data?.threads ?? data?.data ?? (Array.isArray(data) ? data : []);
  return list
    .map((t) => ({
      id: String(t.id ?? t.threadId ?? ""),
      title: t.title ?? t.name ?? "Interview",
      updatedAt: t.updatedAt ?? t.updated_at ?? t.createdAt ?? t.created_at ?? 0
    }))
    .filter((t) => t.id);
}

export function normalizeMessage(m, index = 0) {
  return {
    id: String(m.id ?? m.messageId ?? `msg-${index}-${Date.now()}`),
    caption: m.caption ?? m.text ?? m.input ?? "",
    response: m.response ?? m.output ?? m.answer ?? "",
    createdAt: m.createdAt ?? m.created_at ?? m.at ?? Date.now()
  };
}

export function normalizeHistory(data) {
  const list = data?.messages ?? data?.history ?? data?.items ?? (Array.isArray(data) ? data : []);
  return list.map((m, i) => normalizeMessage(m, i));
}

export async function fetchThreads(assistUrl) {
  const url = `${getApiBase(assistUrl)}/threads`;
  const data = await request(url);
  return normalizeThreads(data);
}

export async function createThread(apiUrl, { title, jobDescription, resume }) {
  if (!jobDescription?.trim()) {
    throw new Error("Job description is required.");
  }
  if (!resume?.blob || !resume?.name) {
    throw new Error("Resume file is required.");
  }

  const url = `${getApiBase(apiUrl)}/threads`;
  const formData = new FormData();
  formData.append("jobDescription", jobDescription.trim());
  formData.append("resume", resume.blob, resume.name);
  if (title?.trim()) formData.append("title", title.trim());

  const data = await request(url, {
    method: "POST",
    body: formData
  });
  const threads = normalizeThreads(data.threads ? data : { threads: [data.thread ?? data] });
  if (threads[0]) return threads[0];
  if (data.id || data.threadId) {
    return {
      id: String(data.id ?? data.threadId),
      title: data.title ?? data.name ?? title ?? "New interview",
      updatedAt: data.updatedAt ?? Date.now()
    };
  }
  throw new Error("Could not create thread — unexpected API response.");
}

export async function fetchThreadHistory(assistUrl, threadId) {
  const url = `${getApiBase(assistUrl)}/threads/${encodeURIComponent(threadId)}/history`;
  const data = await request(url);
  return normalizeHistory(data);
}

export async function sendCaption(assistUrl, text, threadId) {
  const url = assistEndpoint(assistUrl);
  const body = { [API.requestField]: text, threadId };

  const data = await request(url, {
    method: "POST",
    body: JSON.stringify(body)
  });

  const responseText = extractResponse(data, API.responseField);
  let message = null;

  if (data.message) {
    message = normalizeMessage(data.message);
  } else if (Array.isArray(data.messages) && data.messages.length === 1) {
    message = normalizeMessage(data.messages[0]);
  }

  return { responseText, message };
}

function extractResponse(data, fieldPath) {
  if (typeof data === "string") return data;
  if (!fieldPath) return JSON.stringify(data, null, 2);

  const value = fieldPath.split(".").reduce((obj, key) => (obj != null ? obj[key] : undefined), data);
  if (value == null) {
    throw new Error(`Response field "${fieldPath}" not found in API JSON.`);
  }
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}
