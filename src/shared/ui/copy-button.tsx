import { useEffect, useRef, useState } from 'react'
import { cn } from '#/shared/lib/cn'
import { CheckIcon, CopyIcon } from './icons'

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)
  useEffect(() => () => clearTimeout(timer.current), [])

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ?? 'Copy'}
      className={cn(
        'press inline-flex h-8 items-center whitespace-nowrap gap-1.5 rounded-lg bg-button px-2.5 font-mono text-xs text-fg shadow-card hover:shadow-card-hover',
        className,
      )}
    >
      {/* Both states share one cell, so the button keeps the wider one's width and each sits centered in it. */}
      <span className="swap" aria-hidden="true">
        <span data-off={copied || undefined} className="inline-flex items-center gap-1.5">
          <CopyIcon />
          {label}
        </span>
        <span data-off={!copied || undefined} className="inline-flex items-center gap-1.5">
          <CheckIcon />
          {label && 'Copied'}
        </span>
      </span>
      <span className="sr-only" aria-live="polite">{copied ? 'Copied' : ''}</span>
    </button>
  )
}
