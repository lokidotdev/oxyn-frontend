import type { ReactNode } from 'react'
import { cn } from '#/shared/lib/cn'

export function Field({ label, value, children }: { label: string; value?: ReactNode; children: ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-muted">{label}</span>
        {value !== undefined && <span className="font-mono text-xs text-fg tabular-nums">{value}</span>}
      </div>
      {children}
    </div>
  )
}

export function ColorInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <label className="flex items-center gap-2.5 rounded-lg border border-line bg-bg px-2.5 py-1.5">
      <span className="relative size-5 shrink-0 overflow-hidden rounded-md border border-line-strong" style={{ background: value }}>
        <input
          type="color"
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </span>
      <span className="font-mono text-xs uppercase text-fg">{value}</span>
    </label>
  )
}

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={cn(
        'relative h-5 w-9 rounded-full border transition-colors',
        value ? 'border-fg bg-fg' : 'border-line-strong bg-raised',
      )}
    >
      <span
        className={cn(
          'absolute top-1/2 size-3.5 -translate-y-1/2 rounded-full transition-all',
          value ? 'left-[18px] bg-bg' : 'left-0.5 bg-muted',
        )}
      />
    </button>
  )
}
