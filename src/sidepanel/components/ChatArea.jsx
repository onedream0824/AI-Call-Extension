import React, { useEffect, useRef } from 'react'
import { Bot, User, MessageSquarePlus, Settings, Sparkles } from 'lucide-react'

/* ── Individual message bubble ─────────────────────────────────────────────── */

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
        {msg.content}
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
      </div>
    </div>
  )
}

/* ── Typing indicator ───────────────────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="msg-enter flex gap-2.5">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        <Bot size={14} />
      </div>
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-gray-100 px-4 py-3 dark:bg-gray-800">
        <span className="typing-dot text-gray-400" />
        <span className="typing-dot text-gray-400" />
        <span className="typing-dot text-gray-400" />
      </div>
    </div>
  )
}

/* ── Empty states ───────────────────────────────────────────────────────────── */

function EmptyState({ icon, title, body, action, onAction }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-50 dark:bg-gray-800">
        {icon}
      </div>
      <div>
        <p className="font-semibold text-gray-700 dark:text-gray-200">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-gray-400">{body}</p>
      </div>
      {action && (
        <button
          onClick={onAction}
          className="rounded-xl bg-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-600 active:scale-95"
        >
          {action}
        </button>
      )}
    </div>
  )
}

/* ── Main chat area ─────────────────────────────────────────────────────────── */

export default function ChatArea({
  messages,
  loading,
  sending,
  hasThread,
  onNewThread,
}) {
  const endRef = useRef(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  /* No thread selected */
  if (!hasThread) {
    return (
      <EmptyState
        icon={<MessageSquarePlus size={28} className="text-gray-300 dark:text-gray-600" />}
        title="No Thread Selected"
        body="Create a thread for each interview session. Upload your resume and paste the job description to get started."
        action="New Interview Thread"
        onAction={onNewThread}
      />
    )
  }

  /* Loading thread history */
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  /* Thread selected but empty */
  if (messages.length === 0) {
    return (
      <EmptyState
        icon={<Sparkles size={24} className="text-blue-400" />}
        title="Ready for the interview"
        body={'Capture what the interviewer says with Alt+Q, then press Alt+W (or Send) to get AI coaching in real time.'}
      />
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4">
        {messages.map((msg, i) => (
          <Bubble key={msg.id ?? i} msg={msg} />
        ))}
        {sending && <TypingIndicator />}
        <div ref={endRef} />
      </div>
    </div>
  )
}
