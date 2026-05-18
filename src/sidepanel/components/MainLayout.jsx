import React, { useState, useEffect, useCallback, useRef } from 'react'
import Header from './Header.jsx'
import ChatArea from './ChatArea.jsx'
import InputBar from './InputBar.jsx'
import Settings from './Settings.jsx'
import Toast from './Toast.jsx'
import { streamCompletion, OpenAIError } from '../../utils/openai-client.js'
import { buildMessages } from '../../utils/prompt-builder.js'
import { localStore } from '../../utils/storage.js'
import {
  LOCAL_KEYS,
  MESSAGE_TYPES,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
} from '../../utils/constants.js'

export default function MainLayout({
  darkMode,
  onToggleDarkMode,
  onLogout,
  pendingCapture,
  onCaptureConsumed,
  captureWarning,
  onWarningDismissed,
}) {
  /* ── Chat state (single session, not persisted) ─────────────────────── */
  const [messages, setMessages]     = useState([])
  const [inputText, setInputText]   = useState('')
  const [sending, setSending]       = useState(false)

  /* ── Rate-limit back-off ────────────────────────────────────────────── */
  const [rateLimited, setRateLimited] = useState(false)
  const rateLimitTimer = useRef(null)

  /* ── Settings cache (loaded from localStore) ────────────────────────── */
  const [settings, setSettings] = useState({
    apiKey: '',
    model: DEFAULT_MODEL,
    systemPrompt: DEFAULT_SYSTEM_PROMPT,
    resumeText: '',
    jobDescription: '',
  })

  /* ── UI overlays & toasts ───────────────────────────────────────────── */
  const [showSettings, setShowSettings] = useState(false)
  const [toasts, setToasts]             = useState([])

  /* ── Bootstrap: load settings from storage ──────────────────────────── */
  const loadSettings = useCallback(async () => {
    const [apiKey, model, systemPrompt, resumeText, jobDescription] = await Promise.all([
      localStore.get(LOCAL_KEYS.API_KEY),
      localStore.get(LOCAL_KEYS.MODEL),
      localStore.get(LOCAL_KEYS.SYSTEM_PROMPT),
      localStore.get(LOCAL_KEYS.RESUME_TEXT),
      localStore.get(LOCAL_KEYS.JOB_DESCRIPTION),
    ])
    setSettings({
      apiKey:        apiKey        ?? '',
      model:         model         ?? DEFAULT_MODEL,
      systemPrompt:  systemPrompt  ?? DEFAULT_SYSTEM_PROMPT,
      resumeText:    resumeText    ?? '',
      jobDescription: jobDescription ?? '',
    })
  }, [])

  useEffect(() => { loadSettings() }, [loadSettings])

  /* ── Populate input when a caption capture arrives ──────────────────── */
  useEffect(() => {
    if (pendingCapture) {
      setInputText(pendingCapture)
      onCaptureConsumed()
    }
  }, [pendingCapture])

  /* ── Show capture warning as toast ─────────────────────────────────── */
  useEffect(() => {
    if (captureWarning) {
      addToast(captureWarning, 'warning')
      onWarningDismissed()
    }
  }, [captureWarning])

  /* ── Listen for Alt+W relay from service worker ─────────────────────── */
  useEffect(() => {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime?.onMessage
    if (!isExtension) return

    const handler = (msg) => {
      if (msg.type === MESSAGE_TYPES.SEND) handleSend()
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  })

  /* ── Online / offline detection ─────────────────────────────────────── */
  useEffect(() => {
    const onOffline = () => addToast('Offline — AI requires an internet connection.', 'warning')
    window.addEventListener('offline', onOffline)
    return () => window.removeEventListener('offline', onOffline)
  }, [])

  /* ── Toast helpers ──────────────────────────────────────────────────── */
  function addToast(message, type = 'info') {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
  }
  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  /* ── Capture button (Capture icon / Alt+Q) ──────────────────────────── */
  function handleCapture() {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime?.sendMessage
    if (isExtension) {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TRIGGER_CAPTURE })
    } else {
      setInputText('Tell me about your experience with React and TypeScript.')
      addToast('Dev mode: sample caption inserted.', 'info')
    }
  }

  /* ── Send to AI ─────────────────────────────────────────────────────── */
  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending) return

    /* Offline guard */
    if (!navigator.onLine) {
      addToast('Offline — AI requires an internet connection.', 'warning')
      return
    }

    /* Rate-limit guard */
    if (rateLimited) {
      addToast('Rate limit active. Please wait a moment before sending.', 'warning')
      return
    }

    /* Settings guard */
    if (!settings.apiKey) {
      addToast('Add your OpenAI API key in Settings first.', 'error')
      setShowSettings(true)
      return
    }

    /* Add user message */
    const userMsg = {
      id:         `u_${Date.now()}`,
      role:       'user',
      content:    text,
      created_at: new Date().toISOString(),
    }
    const aiId = `a_${Date.now() + 1}`
    const aiMsg = {
      id:         aiId,
      role:       'assistant',
      content:    '',
      streaming:  true,
      created_at: new Date().toISOString(),
    }

    const historyForApi = messages.filter(
      (m) => (m.role === 'user' || m.role === 'assistant') && m.content?.trim() && !m.streaming
    )

    setMessages((m) => [...m, userMsg, aiMsg])
    setInputText('')
    setSending(true)

    try {
      const msgs = buildMessages({
        systemPrompt:   settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
        resumeText:     settings.resumeText,
        jobDescription: settings.jobDescription,
        transcription:  text,
        history:        historyForApi,
      })

      for await (const token of streamCompletion({
        apiKey:   settings.apiKey,
        model:    settings.model || DEFAULT_MODEL,
        messages: msgs,
      })) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiId ? { ...msg, content: msg.content + token } : msg
          )
        )
      }

      /* Mark streaming complete */
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiId ? { ...msg, streaming: false } : msg
        )
      )
    } catch (err) {
      /* Remove placeholder on error */
      setMessages((prev) => prev.filter((msg) => msg.id !== aiId))

      if (err instanceof OpenAIError) {
        if (err.status === 401) {
          addToast('Invalid API key — check your settings.', 'error')
        } else if (err.status === 429) {
          addToast('Rate limit reached. Sending is paused for 60 seconds.', 'error')
          setRateLimited(true)
          clearTimeout(rateLimitTimer.current)
          rateLimitTimer.current = setTimeout(() => setRateLimited(false), 60_000)
        } else if (err.status === 0) {
          addToast(err.message, 'error')
        } else {
          addToast(`OpenAI error: ${err.message}`, 'error')
        }
      } else {
        addToast(`Unexpected error: ${err.message}`, 'error')
      }
    } finally {
      setSending(false)
    }
  }, [inputText, sending, rateLimited, settings, messages])

  function handleClearSession() {
    if (messages.length === 0) return
    if (!window.confirm('Clear this interview chat? Use this when starting a new call.')) return
    setMessages([])
    setInputText('')
    addToast('Chat cleared — fresh session for this interview.', 'info')
  }

  function handlePopOut() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_FLOATING })
      addToast('Opening floating window…', 'info')
    }
  }

  const isFloatingWindow =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('display') === 'floating'

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-gray-900">
      <Header
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
        onSettings={() => setShowSettings(true)}
        onClearSession={handleClearSession}
        onPopOut={handlePopOut}
        hasMessages={messages.length > 0}
        isFloatingWindow={isFloatingWindow}
      />

      <ChatArea messages={messages} />

      <InputBar
        value={inputText}
        onChange={setInputText}
        onCapture={handleCapture}
        onSend={handleSend}
        sending={sending}
        disabled={rateLimited}
      />

      {/* Settings overlay */}
      {showSettings && (
        <Settings
          onClose={() => { setShowSettings(false); loadSettings() }}
          onLogout={onLogout}
          onSaved={loadSettings}
        />
      )}

      {/* Toast stack — show latest only */}
      {toasts.slice(-1).map((t) => (
        <Toast
          key={t.id}
          message={t.message}
          type={t.type}
          onDismiss={() => dismissToast(t.id)}
        />
      ))}
    </div>
  )
}
