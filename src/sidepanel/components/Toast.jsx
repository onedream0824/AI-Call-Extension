import React, { useEffect } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react'

const VARIANTS = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-emerald-500',
    shadow: 'shadow-emerald-500/30',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-500',
    shadow: 'shadow-red-500/30',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-amber-500',
    shadow: 'shadow-amber-500/30',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-500',
    shadow: 'shadow-blue-500/30',
  },
}

export default function Toast({ message, type = 'info', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, type === 'error' ? 5000 : 3500)
    return () => clearTimeout(t)
  }, [])

  const { icon: Icon, bg, shadow } = VARIANTS[type] ?? VARIANTS.info

  return (
    <div
      className={`toast-enter absolute bottom-[82px] left-3 right-3 z-50 flex items-start gap-3 rounded-xl ${bg} ${shadow} px-4 py-3 text-white shadow-lg`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <p className="flex-1 text-sm font-medium leading-snug">{message}</p>
      <button
        onClick={onDismiss}
        className="mt-0.5 shrink-0 opacity-70 transition hover:opacity-100"
      >
        <X size={15} />
      </button>
    </div>
  )
}
