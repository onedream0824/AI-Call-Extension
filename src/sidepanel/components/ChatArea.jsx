import React, { useEffect, useRef } from 'react'
import { Bot, User, Sparkles } from 'lucide-react'

/* ── Individual message bubble ─────────────────────────────────────────── */

function Bubble({ msg }) {
  const isUser = msg.role === 'user'

  return (
    <div className={`msg-enter flex gap-2.5 ${isUser ? 'flex-row-reverse' : ''}`}>
      {/* Avatar */}
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[86%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'rounded-tr-sm bg-blue-500 text-white'
            : 'rounded-tl-sm bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
        }`}
      >
        {/* Preserve line breaks from AI response */}
        <span className={msg.streaming ? 'streaming-cursor' : ''}>
          {msg.content || (msg.streaming ? '' : '…')}
        </span>
        {!msg.streaming && (
          <span
            className={`mt-1 block text-[10px] ${
              isUser ? 'text-blue-200' : 'text-gray-400'
            }`}
          >
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>
    </div>
  )
}

/* ── Empty / ready state ────────────────────────────────────────────────── */

function ReadyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        <Sparkles size={24} className="text-blue-400" />
      </div>
      <div>
        <p className="font-semibold text-gray-700 dark:text-gray-200">Ready for the interview</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-400">
          Press <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-gray-800">Alt+Q</kbd> to capture what the interviewer says,
          then <kbd className="rounded bg-gray-100 px-1 py-0.5 font-mono text-xs dark:bg-gray-800">Alt+W</kbd> to get AI coaching.
        </p>
        <p className="mt-2 text-xs text-gray-400">
          Open Settings to add your API key, resume, and job description.
        </p>
      </div>
    </div>
  )
}

/* ── Main chat area ─────────────────────────────────────────────────────── */

export default function ChatArea({ messages }) {
  const scrollRef = useRef(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: 0, behavior: messages.length > 2 ? 'smooth' : 'auto' })
  }, [messages])

  if (messages.length === 0) {
    return <ReadyState />
  }

  const newestFirst = [...messages].reverse()

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4">
        {newestFirst.map((msg, i) => (
          <Bubble key={msg.id ?? i} msg={msg} />
        ))}
      </div>
    </div>
  )
}
