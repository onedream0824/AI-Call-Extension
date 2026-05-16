import React, { useState, useEffect, useCallback } from 'react'
import Login from './components/Login.jsx'
import MainLayout from './components/MainLayout.jsx'
import { storage } from '../utils/storage.js'
import { STORAGE_KEYS, MESSAGE_TYPES } from '../utils/constants.js'

export default function App() {
  /** null = still checking storage (show nothing yet) */
  const [auth, setAuth] = useState(null)
  const [darkMode, setDarkMode] = useState(false)
  const [pendingCapture, setPendingCapture] = useState('')
  const [captureWarning, setCaptureWarning] = useState('')

  /* ── Bootstrap: read persisted auth + dark-mode preference ─────────────── */
  useEffect(() => {
    Promise.all([
      storage.get(STORAGE_KEYS.AUTH),
      storage.get(STORAGE_KEYS.DARK_MODE),
    ]).then(([a, dm]) => {
      setAuth(!!a)
      setDarkMode(!!dm)
    })
  }, [])

  /* ── Apply dark mode class to <html> ────────────────────────────────────── */
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode)
    storage.set(STORAGE_KEYS.DARK_MODE, darkMode)
  }, [darkMode])

  /* ── Messages from service worker (caption capture / send trigger) ──────── */
  useEffect(() => {
    const isExtension = typeof chrome !== 'undefined' && chrome.runtime?.onMessage
    if (!isExtension) return

    const handler = (msg) => {
      if (msg.type === MESSAGE_TYPES.CAPTURED) {
        if (msg.text) setPendingCapture(msg.text)
        if (msg.warning) setCaptureWarning(msg.warning)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  /* ── Auth helpers ───────────────────────────────────────────────────────── */
  const handleLogin = useCallback(async () => {
    await storage.set(STORAGE_KEYS.AUTH, { ts: Date.now() })
    setAuth(true)
  }, [])

  const handleLogout = useCallback(async () => {
    await storage.remove(STORAGE_KEYS.AUTH)
    setAuth(false)
  }, [])

  /* ── Loading splash (before storage resolves) ───────────────────────────── */
  if (auth === null) {
    return (
      <div className="flex h-full items-center justify-center bg-white dark:bg-gray-900">
        <div className="spinner" />
      </div>
    )
  }

  if (!auth) return <Login onLogin={handleLogin} />

  return (
    <MainLayout
      darkMode={darkMode}
      onToggleDarkMode={() => setDarkMode((d) => !d)}
      onLogout={handleLogout}
      pendingCapture={pendingCapture}
      onCaptureConsumed={() => setPendingCapture('')}
      captureWarning={captureWarning}
      onWarningDismissed={() => setCaptureWarning('')}
    />
  )
}
