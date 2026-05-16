import React, { useRef, useEffect } from 'react'
import { Mic, SendHorizonal } from 'lucide-react'

export default function InputBar({ value, onChange, onCapture, onSend, sending, disabled }) {
  const textareaRef = useRef(null)

  /* Auto-resize textarea height as content grows */
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!sending && !disabled && value.trim()) onSend()
    }
  }

  return (
    <div className="shrink-0 border-t border-gray-100 bg-white px-3 pb-3 pt-2.5 dark:border-gray-800 dark:bg-gray-900">

      {/* ── Input container ─────────────────────────────────────── */}
      <div
        className={`flex items-end gap-2 rounded-2xl border px-3 py-2 transition ${
          disabled
            ? 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-800/50'
            : 'border-gray-200 bg-gray-50 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800'
        }`}
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            disabled
              ? 'Select a thread to begin…'
              : 'Capture or type a message… (Enter to send)'
          }
          disabled={disabled || sending}
          rows={1}
          className="flex-1 resize-none bg-transparent text-sm text-gray-800 outline-none placeholder-gray-400 dark:text-gray-200 disabled:opacity-40"
        />

        <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
          {/* Capture button */}
          <button
            onClick={onCapture}
            disabled={disabled}
            title="Capture meeting captions  (Alt+Q)"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gray-200 text-gray-600 transition hover:bg-gray-300 active:scale-90 disabled:opacity-30 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Mic size={15} />
          </button>

          {/* Send button */}
          <button
            onClick={onSend}
            disabled={sending || disabled || !value.trim()}
            title="Send to AI  (Alt+W)"
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-white shadow-sm shadow-blue-500/30 transition hover:bg-blue-600 active:scale-90 disabled:opacity-40 disabled:shadow-none"
          >
            {sending ? (
              <span className="spinner !h-4 !w-4 !border-2 !border-white/30 !border-t-white" />
            ) : (
              <SendHorizonal size={15} />
            )}
          </button>
        </div>
      </div>

      {/* ── Hotkey hint ─────────────────────────────────────────── */}
      <p className="mt-1.5 text-center text-[10px] text-gray-400">
        <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono dark:bg-gray-800">Alt+Q</kbd>
        {' '}capture
        {' · '}
        <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono dark:bg-gray-800">Alt+W</kbd>
        {' '}send
        {' · '}Enter to send
      </p>
    </div>
  )
}
