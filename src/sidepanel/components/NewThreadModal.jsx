import React, { useState, useCallback } from 'react'
import { X, Upload, FileText, AlertCircle, Loader2 } from 'lucide-react'

const ALLOWED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

export default function NewThreadModal({ onClose, onCreate, loading }) {
  const [file, setFile] = useState(null)
  const [jd, setJd] = useState('')
  const [drag, setDrag] = useState(false)
  const [error, setError] = useState('')

  function accept(f) {
    if (!f) return
    const validType = ALLOWED_TYPES.includes(f.type) || /\.(pdf|docx)$/i.test(f.name)
    if (!validType) {
      setError('Only PDF or DOCX files are accepted.')
      return
    }
    setError('')
    setFile(f)
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDrag(false)
    accept(e.dataTransfer.files[0])
  }, [])

  function submit(e) {
    e.preventDefault()
    setError('')
    if (!file) { setError('Please upload your resume (PDF or DOCX).'); return }
    if (!jd.trim()) { setError('Please paste the job description.'); return }
    onCreate(file, jd.trim())
  }

  return (
    /* Backdrop */
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-gray-900">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-gray-800">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">
            New Interview Thread
          </h2>
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 disabled:opacity-50 dark:hover:bg-gray-800"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-5">

          {/* Resume upload */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Resume <span className="text-red-400">*</span>
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
              onDragLeave={() => setDrag(false)}
              onClick={() => document.getElementById('resume-file').click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-5 text-center transition ${
                drag
                  ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : file
                  ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20'
                  : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50 dark:border-gray-700 dark:hover:border-blue-700'
              }`}
            >
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText size={18} className="text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {file.name}
                  </span>
                </div>
              ) : (
                <div>
                  <Upload size={22} className="mx-auto mb-1.5 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Drop PDF or DOCX, or{' '}
                    <span className="font-semibold text-blue-500">browse</span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-400">Max 10 MB</p>
                </div>
              )}
              <input
                id="resume-file"
                type="file"
                className="hidden"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => accept(e.target.files[0])}
              />
            </div>
          </div>

          {/* Job description */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
              Job Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              placeholder="Paste the full job description here…"
              rows={5}
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
            <p className="mt-0.5 text-xs text-gray-400">
              The AI uses this to tailor coaching advice to this specific role.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-500 dark:bg-red-900/20 dark:text-red-400">
              <AlertCircle size={15} className="shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-400"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-600 active:scale-[0.98] disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Creating…</>
              ) : (
                'Create Thread'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
