import React, { useState, useEffect, useCallback } from 'react'
import {
  X, Save, LogOut, CheckCircle2, Eye, EyeOff, Upload,
  FileText, AlertCircle, ChevronDown, Info, Loader2,
} from 'lucide-react'
import { localStore, storage } from '../../utils/storage.js'
import {
  LOCAL_KEYS,
  STORAGE_KEYS,
  OPENAI_MODELS,
  DEFAULT_MODEL,
  DEFAULT_SYSTEM_PROMPT,
  UI_MODES,
  DEFAULT_UI_MODE,
  MESSAGE_TYPES,
} from '../../utils/constants.js'
import { parsePdf } from '../../parsers/pdf-parser.js'
import { parseDocx } from '../../parsers/docx-parser.js'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default function Settings({ onClose, onLogout, onSaved }) {
  const [apiKey, setApiKey]           = useState('')
  const [showKey, setShowKey]         = useState(false)
  const [model, setModel]             = useState(DEFAULT_MODEL)
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT)
  const [resumeText, setResumeText]   = useState('')
  const [resumeFileName, setResumeFileName] = useState('')
  const [jobDescription, setJobDescription] = useState('')
  const [parsing, setParsing]         = useState(false)
  const [parseError, setParseError]   = useState('')
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [dragOver, setDragOver]       = useState(false)
  const [uiMode, setUiMode]           = useState(DEFAULT_UI_MODE)

  /* Load persisted settings on mount */
  useEffect(() => {
    Promise.all([
      localStore.get(LOCAL_KEYS.API_KEY),
      localStore.get(LOCAL_KEYS.MODEL),
      localStore.get(LOCAL_KEYS.SYSTEM_PROMPT),
      localStore.get(LOCAL_KEYS.RESUME_TEXT),
      localStore.get(LOCAL_KEYS.JOB_DESCRIPTION),
      storage.get(STORAGE_KEYS.UI_MODE),
    ]).then(([key, mdl, prompt, resume, jd, mode]) => {
      if (key)    setApiKey(key)
      if (mdl)    setModel(mdl)
      if (prompt) setSystemPrompt(prompt)
      if (resume) setResumeText(resume)
      if (jd)     setJobDescription(jd)
      setUiMode(mode === UI_MODES.SIDEPANEL ? UI_MODES.SIDEPANEL : DEFAULT_UI_MODE)
    })
  }, [])

  function openFloatingNow() {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: MESSAGE_TYPES.OPEN_FLOATING })
    }
  }

  /* ── File parsing ─────────────────────────────────────────────────────── */

  async function handleFile(file) {
    if (!file) return
    const isPdf  = file.type === 'application/pdf' || /\.pdf$/i.test(file.name)
    const isDocx = file.type === ALLOWED_TYPES[1] || /\.docx$/i.test(file.name)

    if (!isPdf && !isDocx) {
      setParseError('Only PDF or DOCX files are accepted.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setParseError('File is too large (max 10 MB).')
      return
    }

    setParseError('')
    setParsing(true)
    setResumeFileName(file.name)

    try {
      const text = isPdf ? await parsePdf(file) : await parseDocx(file)
      if (!text.trim()) {
        setParseError('Could not extract text — the file may be scanned or image-based.')
        setResumeFileName('')
      } else {
        setResumeText(text)
      }
    } catch (err) {
      setParseError(`Parse error: ${err.message}`)
      setResumeFileName('')
    } finally {
      setParsing(false)
    }
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files[0])
  }, [])

  /* ── Save ─────────────────────────────────────────────────────────────── */

  async function save() {
    setSaving(true)
    await Promise.all([
      localStore.set(LOCAL_KEYS.API_KEY, apiKey.trim()),
      localStore.set(LOCAL_KEYS.MODEL, model),
      localStore.set(LOCAL_KEYS.SYSTEM_PROMPT, systemPrompt.trim()),
      localStore.set(LOCAL_KEYS.RESUME_TEXT, resumeText),
      localStore.set(LOCAL_KEYS.JOB_DESCRIPTION, jobDescription.trim()),
      storage.set(STORAGE_KEYS.UI_MODE, uiMode),
    ])
    setSaving(false)
    setSaved(true)
    onSaved?.()
    setTimeout(() => setSaved(false), 2500)
  }

  function confirmLogout() {
    if (window.confirm('Sign out of AI Interview Assistant?')) onLogout()
  }

  /* ── Render ───────────────────────────────────────────────────────────── */

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-white dark:bg-gray-900">

      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
        <h2 className="font-semibold text-gray-800 dark:text-gray-100">Settings</h2>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-8">

        {/* ── OpenAI API Key ──────────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            OpenAI
          </h3>

          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            API Key <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              autoComplete="off"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 pr-11 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <button
              type="button"
              onClick={() => setShowKey((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-gray-600 dark:hover:text-gray-200"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 dark:bg-amber-900/20">
            <Info size={13} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
              Your API key is stored only in this browser. Never share this device with others.
            </p>
          </div>

          {/* Model */}
          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Model
          </label>
          <div className="relative">
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              {OPENAI_MODELS.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
          </div>
        </section>

        {/* ── System Prompt ───────────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            AI Behavior
          </h3>
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            System Prompt
          </label>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <button
            onClick={() => setSystemPrompt(DEFAULT_SYSTEM_PROMPT)}
            className="mt-1 text-xs text-blue-500 hover:underline"
          >
            Reset to default
          </button>
        </section>

        {/* ── Resume Upload ───────────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Your Profile
          </h3>

          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Resume (PDF or DOCX)
          </label>

          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !parsing && document.getElementById('resume-upload').click()}
            className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${
              dragOver
                ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                : resumeText
                ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 dark:border-gray-700'
            }`}
          >
            {parsing ? (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Parsing resume…
              </div>
            ) : resumeText ? (
              <div className="flex items-center justify-center gap-2">
                <FileText size={16} className="text-emerald-500" />
                <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  {resumeFileName || 'Resume loaded'}
                </span>
                <span className="text-xs text-gray-400">
                  ({Math.round(resumeText.length / 1000)}k chars)
                </span>
              </div>
            ) : (
              <>
                <Upload size={20} className="mx-auto mb-1.5 text-gray-400" />
                <p className="text-sm text-gray-500">
                  Drop PDF / DOCX or{' '}
                  <span className="font-semibold text-blue-500">browse</span>
                </p>
                <p className="mt-0.5 text-xs text-gray-400">Max 10 MB</p>
              </>
            )}
            <input
              id="resume-upload"
              type="file"
              className="hidden"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => handleFile(e.target.files[0])}
            />
          </div>

          {parseError && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={14} className="shrink-0" />
              {parseError}
            </div>
          )}

          {resumeText && (
            <button
              onClick={() => { setResumeText(''); setResumeFileName('') }}
              className="mt-1.5 text-xs text-red-400 hover:underline"
            >
              Clear resume
            </button>
          )}

          {/* Job Description */}
          <label className="mb-1.5 mt-4 block text-sm font-medium text-gray-700 dark:text-gray-300">
            Job Description
          </label>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here…"
            rows={5}
            className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          />
          <p className="mt-1 text-xs text-gray-400">
            The AI uses this to tailor responses to this specific role.
          </p>
        </section>

        {/* ── Display ─────────────────────────────────────────────────── */}
        <section>
          <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-400">
            Display
          </h3>
          <p className="mb-3 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            Floating window opens beside your meeting on the desktop. Side panel stays docked inside Chrome.
          </p>
          <div className="space-y-2">
            {[
              [UI_MODES.FLOATING, 'Floating window', 'Recommended — drag to a second monitor'],
              [UI_MODES.SIDEPANEL, 'Side panel', 'Docked inside the browser'],
            ].map(([value, label, hint]) => (
              <label
                key={value}
                className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition ${
                  uiMode === value
                    ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-900/20'
                    : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                }`}
              >
                <input
                  type="radio"
                  name="ui-mode"
                  value={value}
                  checked={uiMode === value}
                  onChange={() => setUiMode(value)}
                  className="mt-1"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-800 dark:text-gray-200">{label}</span>
                  <span className="text-xs text-gray-400">{hint}</span>
                </span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={openFloatingNow}
            className="mt-3 w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-blue-600 transition hover:bg-blue-50 dark:border-gray-700 dark:text-blue-400 dark:hover:bg-blue-900/20"
          >
            Open floating window now
          </button>
        </section>

        {/* ── Hotkeys ─────────────────────────────────────────────────── */}
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

        {/* ── Account ─────────────────────────────────────────────────── */}
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

      {/* ── Footer: Save / Close ──────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-gray-800">
        <button
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400"
        >
          Cancel
        </button>
        <button
          onClick={save}
          disabled={saving}
          className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition active:scale-95 disabled:opacity-60 ${
            saved
              ? 'bg-emerald-500 shadow-md shadow-emerald-500/20'
              : 'bg-blue-500 shadow-md shadow-blue-500/20 hover:bg-blue-600'
          }`}
        >
          {saving ? (
            <Loader2 size={14} className="animate-spin" />
          ) : saved ? (
            <><CheckCircle2 size={14} /> Saved!</>
          ) : (
            <><Save size={14} /> Save</>
          )}
        </button>
      </div>
    </div>
  )
}
