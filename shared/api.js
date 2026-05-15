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

async function request(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options
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

export function normalizeHistory(data) {
  const list = data?.messages ?? data?.history ?? data?.items ?? (Array.isArray(data) ? data : []);
  return list.map((m, i) => ({
    id: String(m.id ?? m.messageId ?? `msg-${i}`),
    caption: m.caption ?? m.text ?? m.input ?? "",
    response: m.response ?? m.output ?? m.answer ?? "",
    createdAt: m.createdAt ?? m.created_at ?? m.at ?? Date.now()
  }));
}

export async function fetchThreads(assistUrl) {
  const url = `${getApiBase(assistUrl)}/threads`;
  const data = await request(url);
  return normalizeThreads(data);
}

export async function createThread(assistUrl, title) {
  const url = `${getApiBase(assistUrl)}/threads`;
  const data = await request(url, {
    method: "POST",
    body: JSON.stringify(title ? { title } : {})
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

  return extractResponse(data, API.responseField);
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
