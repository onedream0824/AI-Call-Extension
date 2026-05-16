import React, { useState, useEffect, useCallback } from 'react'
import Header from './Header.jsx'
import ChatArea from './ChatArea.jsx'
import InputBar from './InputBar.jsx'
import Settings from './Settings.jsx'
import NewThreadModal from './NewThreadModal.jsx'
import Toast from './Toast.jsx'
import { api } from '../../utils/api.js'
import { MESSAGE_TYPES } from '../../utils/constants.js'

export default function MainLayout({
  darkMode,
  onToggleDarkMode,
  onLogout,
  pendingCapture,
  onCaptureConsumed,
  captureWarning,
  onWarningDismissed,
}) {
  /* ── State ──────────────────────────────────────────────────────────────── */
  const [threads, setThreads] = useState([])
  const [activeThreadId, setActiveThreadId] = useState(null)
  /** Per-thread message cache: { [threadId]: Message[] } */
  const [msgCache, setMsgCache] = useState({})
  const [inputText, setInputText] = useState('')
  const [loadingThreads, setLoadingThreads] = useState(false)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [sending, setSending] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showNewThread, setShowNewThread] = useState(false)
  const [creatingThread, setCreatingThread] = useState(false)
  const [toasts, setToasts] = useState([])

  /* ── Bootstrap: load thread list ───────────────────────────────────────── */
  useEffect(() => {
    fetchThreads()
  }, [])

  /* ── Listen for Alt+W relay from service worker ─────────────────────────── */
  useEffect(() => {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime?.onMessage
    if (!isExtension) return

    const handler = (msg) => {
      if (msg.type === MESSAGE_TYPES.SEND) handleSend()
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  })

  /* ── Populate input when a capture arrives ──────────────────────────────── */
  useEffect(() => {
    if (pendingCapture) {
      setInputText(pendingCapture)
      onCaptureConsumed()
    }
  }, [pendingCapture])

  /* ── Show capture warning as a toast ────────────────────────────────────── */
  useEffect(() => {
    if (captureWarning) {
      addToast(captureWarning, 'warning')
      onWarningDismissed()
    }
  }, [captureWarning])

  /* ── Helpers ────────────────────────────────────────────────────────────── */

  function addToast(message, type = 'info') {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
  }

  function dismissToast(id) {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  async function fetchThreads() {
    setLoadingThreads(true)
    try {
      const data = await api.listThreads()
      const list = Array.isArray(data) ? data : (data.threads ?? [])
      setThreads(list)
    } catch (err) {
      addToast(`Could not load threads: ${err.message}`, 'error')
    } finally {
      setLoadingThreads(false)
    }
  }

  async function handleSelectThread(id) {
    setActiveThreadId(id)
    // Already cached — skip fetch
    if (msgCache[id] !== undefined) return

    setLoadingMsgs(true)
    try {
      const data = await api.getMessages(id)
      const msgs = Array.isArray(data) ? data : (data.messages ?? [])
      setMsgCache((c) => ({ ...c, [id]: msgs }))
    } catch (err) {
      addToast(`Failed to load messages: ${err.message}`, 'error')
    } finally {
      setLoadingMsgs(false)
    }
  }

  const handleSend = useCallback(async () => {
    const text = inputText.trim()
    if (!text || sending) return

    if (!activeThreadId) {
      addToast('Select or create a thread first.', 'warning')
      return
    }

    /* Optimistically append user message */
    const optimisticUser = {
      id: `opt_${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    }
    setMsgCache((c) => ({
      ...c,
      [activeThreadId]: [...(c[activeThreadId] ?? []), optimisticUser],
    }))
    setInputText('')
    setSending(true)

    try {
      const res = await api.sendMessage(activeThreadId, text)

      /* Replace optimistic message with confirmed pair from backend */
      const userMsg = res.user_message ?? {
        ...optimisticUser,
        id: `confirmed_${Date.now()}`,
      }
      const aiMsg = res.assistant_message ?? {
        id: `ai_${Date.now()}`,
        role: 'assistant',
        content: res.content ?? res.message ?? res.response ?? JSON.stringify(res),
        created_at: new Date().toISOString(),
      }

      setMsgCache((c) => ({
        ...c,
        [activeThreadId]: [
          ...(c[activeThreadId] ?? []).filter((m) => m.id !== optimisticUser.id),
          userMsg,
          aiMsg,
        ],
      }))
    } catch (err) {
      /* Roll back optimistic message */
      setMsgCache((c) => ({
        ...c,
        [activeThreadId]: (c[activeThreadId] ?? []).filter(
          (m) => m.id !== optimisticUser.id
        ),
      }))
      setInputText(text)
      addToast(`Send failed: ${err.message}`, 'error')
    } finally {
      setSending(false)
    }
  }, [inputText, sending, activeThreadId])

  async function handleCreateThread(resumeFile, jobDescription) {
    setCreatingThread(true)
    try {
      const newThread = await api.createThread(resumeFile, jobDescription)
      setThreads((prev) => [newThread, ...prev])
      setMsgCache((c) => ({ ...c, [newThread.id]: [] }))
      setActiveThreadId(newThread.id)
      setShowNewThread(false)
      addToast('Thread created — ready for the interview!', 'success')
    } catch (err) {
      addToast(`Could not create thread: ${err.message}`, 'error')
    } finally {
      setCreatingThread(false)
    }
  }

  function handleCapture() {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime?.sendMessage
    if (isExtension) {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.TRIGGER_CAPTURE })
    } else {
      /* Dev fallback: insert sample text */
      setInputText('Tell me about your experience with React and TypeScript.')
      addToast('Dev mode: sample caption inserted.', 'info')
    }
  }

  /* ── Derived ────────────────────────────────────────────────────────────── */
  const messages = activeThreadId ? (msgCache[activeThreadId] ?? []) : []

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="relative flex h-full flex-col bg-white dark:bg-gray-900">

      <Header
        threads={threads}
        activeThreadId={activeThreadId}
        loading={loadingThreads}
        onSelectThread={handleSelectThread}
        onNewThread={() => setShowNewThread(true)}
        onSettings={() => setShowSettings(true)}
        darkMode={darkMode}
        onToggleDarkMode={onToggleDarkMode}
      />

      <ChatArea
        messages={messages}
        loading={loadingMsgs}
        sending={sending}
        hasThread={!!activeThreadId}
        onNewThread={() => setShowNewThread(true)}
      />

      <InputBar
        value={inputText}
        onChange={setInputText}
        onCapture={handleCapture}
        onSend={handleSend}
        sending={sending}
        disabled={!activeThreadId}
      />

      {/* ── Overlays ─────────────────────────────────────────────── */}

      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          onLogout={onLogout}
          onBackendSaved={() => {}}
        />
      )}

      {showNewThread && (
        <NewThreadModal
          onClose={() => setShowNewThread(false)}
          onCreate={handleCreateThread}
          loading={creatingThread}
        />
      )}

      {/* ── Toast stack (latest on top) ───────────────────────────── */}
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
