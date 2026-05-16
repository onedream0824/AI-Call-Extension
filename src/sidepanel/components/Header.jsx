import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Plus, Settings, Sun, Moon, Zap } from 'lucide-react'

export default function Header({
  threads,
  activeThreadId,
  loading,
  onSelectThread,
  onNewThread,
  onSettings,
  darkMode,
  onToggleDarkMode,
}) {
  const [open, setOpen] = useState(false)
  const dropRef = useRef(null)

  const active = threads.find((t) => t.id === activeThreadId)

  /* Close dropdown on outside click */
  useEffect(() => {
    function close(e) {
      if (!dropRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  return (
    <header className="flex shrink-0 items-center gap-2 border-b border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">

      {/* ── Logo ───────────────────────────────────────────────── */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-md shadow-blue-500/25">
        <Zap size={14} className="text-white" fill="white" strokeWidth={1.5} />
      </div>

      {/* ── Thread selector ─────────────────────────────────────── */}
      <div ref={dropRef} className="relative min-w-0 flex-1">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-1.5 rounded-lg px-2 py-1.5 text-left transition hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-gray-800"
        >
          {loading && (
            <div className="spinner shrink-0 !h-3.5 !w-3.5 !border" />
          )}
          <span className="flex-1 truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
            {active
              ? (active.title ?? `Interview #${active.id}`)
              : 'Select thread…'}
          </span>
          <ChevronDown
            size={13}
            className={`shrink-0 text-gray-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div className="absolute left-0 top-full z-50 mt-1 w-full min-w-[220px] overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">

            {/* Thread list */}
            <div className="max-h-52 overflow-y-auto">
              {threads.length === 0 ? (
                <p className="px-4 py-3 text-xs text-gray-400">
                  No threads yet — create your first one below.
                </p>
              ) : (
                threads.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { onSelectThread(t.id); setOpen(false) }}
                    className={`flex w-full flex-col px-4 py-2.5 text-left transition ${
                      t.id === activeThreadId
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="truncate text-sm font-medium">
                      {t.title ?? `Interview #${t.id}`}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(t.created_at).toLocaleDateString()} · {t.message_count} msgs
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* New thread */}
            <div className="border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={() => { onNewThread(); setOpen(false) }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
              >
                <Plus size={15} />
                New Interview Thread
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Right controls ──────────────────────────────────────── */}
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={onToggleDarkMode}
          title={darkMode ? 'Light mode' : 'Dark mode'}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button
          onClick={onSettings}
          title="Settings"
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-200"
        >
          <Settings size={16} />
        </button>
      </div>
    </header>
  )
}
