import React, { useState, useEffect } from 'react'
import { X, Save, LogOut, CheckCircle2, Info } from 'lucide-react'
import { storage } from '../../utils/storage.js'
import { STORAGE_KEYS, USE_MOCK } from '../../utils/constants.js'

export default function Settings({ onClose, onLogout, onBackendSaved }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    storage.get(STORAGE_KEYS.BACKEND_URL).then((v) => setUrl(v ?? ''))
  }, [])

  async function save() {
    const trimmed = url.trim()
    await storage.set(STORAGE_KEYS.BACKEND_URL, trimmed)
    onBackendSaved?.(trimmed)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function confirmLogout() {
    if (window.confirm('Sign out of AI Interview Assistant?')) onLogout()
  }

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
      </div>

      {/* ── Content ─────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-7">

        {/* Mock mode banner */}
        {USE_MOCK && (
          <div className="flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 dark:bg-amber-900/20">
            <Info size={15} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs leading-relaxed text-amber-700 dark:text-amber-400">
              <strong>Mock mode active.</strong> All data is local test data. To connect a real
              backend, add the URL below and set <code className="rounded bg-amber-100 px-1 dark:bg-amber-800">USE_MOCK = false</code>{' '}
              in <code className="rounded bg-amber-100 px-1 dark:bg-amber-800">constants.js</code>.
            </p>
          </div>
        )}

        {/* Backend URL */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Backend
          </h3>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Base URL
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://api.example.com"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <p className="mt-1 text-xs text-gray-400">
            All API requests will be sent to this URL.
          </p>
          <button
            onClick={save}
            className={`mt-3 flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition active:scale-95 ${
              saved
                ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
                : 'bg-blue-500 shadow-md shadow-blue-500/20 hover:bg-blue-600'
            }`}
          >
            {saved ? (
              <><CheckCircle2 size={15} /> Saved!</>
            ) : (
              <><Save size={15} /> Save URL</>
            )}
          </button>
        </section>

        {/* Hotkeys */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Hotkeys
          </h3>
          <div className="overflow-hidden rounded-xl border border-gray-100 dark:border-gray-700">
            {[
              ['Capture meeting captions', 'Alt+Q'],
              ['Send message to AI', 'Alt+W'],
            ].map(([label, key], i) => (
              <div
                key={key}
                className={`flex items-center justify-between px-4 py-3 ${
                  i > 0 ? 'border-t border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <span className="text-sm text-gray-600 dark:text-gray-300">{label}</span>
                <kbd className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 font-mono text-xs text-gray-700 shadow-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  {key}
                </kbd>
              </div>
            ))}
          </div>
          <button
            onClick={() =>
              typeof chrome !== 'undefined' &&
              chrome.tabs?.create({ url: 'chrome://extensions/shortcuts' })
            }
            className="mt-2 text-xs text-blue-500 hover:underline"
          >
            Customize at chrome://extensions/shortcuts →
          </button>
        </section>

        {/* Account */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Account
          </h3>
          <button
            onClick={confirmLogout}
            className="flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2 text-sm font-semibold text-red-500 transition hover:bg-red-50 active:scale-95 dark:border-red-800 dark:hover:bg-red-900/20"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </section>
      </div>
    </div>
  )
}
