import React from 'react'
import { Settings, Sun, Moon, Zap } from 'lucide-react'

export default function Header({ onSettings, darkMode, onToggleDarkMode }) {
  return (
    <header className="flex shrink-0 items-center gap-2.5 border-b border-gray-100 bg-white px-3 py-2.5 dark:border-gray-800 dark:bg-gray-900">

      {/* Logo */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 shadow-md shadow-blue-500/25">
        <Zap size={14} className="text-white" fill="white" strokeWidth={1.5} />
      </div>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-semibold text-gray-700 dark:text-gray-200">
          AI Interview Assistant
        </p>
        <p className="text-[10px] text-gray-400">
          Capture → AI coaching in real time
        </p>
      </div>

      {/* Right controls */}
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
