import type { ReactNode } from 'react'
import { cn } from '#/shared/lib/cn'

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border border-line-strong bg-bg/60 px-2 py-0.5 font-mono text-[10.5px] text-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}
