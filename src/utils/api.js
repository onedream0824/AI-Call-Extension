/**
 * API client — currently running in MOCK mode.
 * All methods simulate network delays and return realistic test data.
 * To switch to real backend: set USE_MOCK = false in constants.js and
 * fill in the real request implementations in the `real` object below.
 */

import { storage } from './storage.js'
import { STORAGE_KEYS, CREDENTIALS, USE_MOCK } from './constants.js'
import {
  MOCK_THREADS,
  MOCK_MESSAGES,
  getMockAiResponse,
  extractTitleFromJD,
} from './mockData.js'

const delay = (ms) => new Promise((r) => setTimeout(r, ms))

/** ─── Mock implementation ──────────────────────────────────────────────────── */

const mock = {
  async listThreads() {
    await delay(600)
    return { threads: [...MOCK_THREADS] }
  },

  async getMessages(threadId) {
    await delay(700)
    return {
      thread_id: threadId,
      messages: [...(MOCK_MESSAGES[threadId] ?? [])],
    }
  },

  async createThread(resumeFile, jobDescription) {
    await delay(1200)
    const newThread = {
      id: `th_${Date.now()}`,
      title: extractTitleFromJD(jobDescription),
      created_at: new Date().toISOString(),
      message_count: 0,
    }
    MOCK_THREADS.unshift(newThread)
    MOCK_MESSAGES[newThread.id] = []
    return newThread
  },

  async sendMessage(threadId, transcriptionText) {
    await delay(1800)
    const now = new Date().toISOString()
    const userMsg = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: transcriptionText,
      created_at: now,
    }
    const assistantMsg = {
      id: `msg_a_${Date.now() + 1}`,
      role: 'assistant',
      content: getMockAiResponse(transcriptionText),
      created_at: new Date(Date.now() + 2000).toISOString(),
    }
    if (!MOCK_MESSAGES[threadId]) MOCK_MESSAGES[threadId] = []
    MOCK_MESSAGES[threadId].push(userMsg, assistantMsg)

    const thread = MOCK_THREADS.find((t) => t.id === threadId)
    if (thread) thread.message_count += 2

    return { user_message: userMsg, assistant_message: assistantMsg }
  },
}

/** ─── Real implementation (fill in when backend is ready) ──────────────────── */

class RealApiClient {
  async #baseUrl() {
    const url = await storage.get(STORAGE_KEYS.BACKEND_URL)
    if (!url) throw new Error('Backend URL not configured. Open Settings to add it.')
    return url.replace(/\/$/, '')
  }

  #username = CREDENTIALS.username

  async #get(path, params = {}) {
    const base = await this.#baseUrl()
    const qs = new URLSearchParams(params).toString()
    const res = await fetch(`${base}${path}${qs ? `?${qs}` : ''}`)
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`API ${res.status}: ${body || res.statusText}`)
    }
    return res.json()
  }

  async #post(path, body, asFormData = false) {
    const base = await this.#baseUrl()
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      ...(asFormData
        ? { body }
        : { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw new Error(`API ${res.status}: ${text || res.statusText}`)
    }
    return res.json()
  }

  async listThreads() {
    return this.#get('/threads', { user_name: this.#username })
  }

  async getMessages(threadId) {
    return this.#get(`/threads/${threadId}/messages`, {
      user_name: this.#username,
      thread_id: threadId,
    })
  }

  async createThread(resumeFile, jobDescription) {
    const form = new FormData()
    form.append('user_name', this.#username)
    form.append('job_description', jobDescription)
    form.append('resume', resumeFile)
    return this.#post('/threads', form, true)
  }

  async sendMessage(threadId, transcriptionText) {
    return this.#post(`/threads/${threadId}/messages`, {
      user_name: this.#username,
      thread_id: threadId,
      transcription_text: transcriptionText,
    })
  }
}

export const api = USE_MOCK ? mock : new RealApiClient()
