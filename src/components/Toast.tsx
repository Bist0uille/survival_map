import { useEffect, useRef, useState } from 'react'
import { TOAST_EVENT, type ToastDetail, type ToastKind } from '../data/toast'

interface ToastItem {
  id: number
  text: string
  kind: ToastKind
}

const STYLES: Record<ToastKind, string> = {
  info: 'bg-slate-800/95 text-white',
  error: 'bg-red-700/95 text-white',
  success: 'bg-green-700/95 text-white',
}

const DURATION = 4000

/** Affiche les toasts émis via `toast()`. À monter une fois (dans App). */
export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>([])
  const idc = useRef(0)

  useEffect(() => {
    const onToast = (e: Event) => {
      const { text, kind } = (e as CustomEvent<ToastDetail>).detail
      const id = ++idc.current
      setItems((prev) => [...prev, { id, text, kind }])
      setTimeout(
        () => setItems((prev) => prev.filter((i) => i.id !== id)),
        DURATION,
      )
    }
    window.addEventListener(TOAST_EVENT, onToast)
    return () => window.removeEventListener(TOAST_EVENT, onToast)
  }, [])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none absolute bottom-24 left-1/2 z-40 flex w-[min(92vw,22rem)] -translate-x-1/2 flex-col items-center gap-2">
      {items.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`pointer-events-auto w-full rounded-lg px-4 py-2 text-center text-sm shadow-lg ${STYLES[t.kind]}`}
        >
          {t.text}
        </div>
      ))}
    </div>
  )
}
