import { useState } from 'react'
import { cn } from '#/shared/lib/cn'
import { CheckIcon, CopyIcon } from './icons'

export function CopyButton({ text, label, className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ?? 'Copy'}
      className={cn(
        'inline-flex h-8 items-center whitespace-nowrap gap-1.5 rounded-lg border border-line bg-raised px-2.5 font-mono text-xs text-fg transition-colors hover:border-line-strong',
        className,
      )}
    >
      {copied ? <CheckIcon /> : <CopyIcon />}
      {label && <span>{copied ? 'Copied' : label}</span>}
    </button>
  )
}
