import { m, useReducedMotion } from 'motion/react'
import { useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '#/shared/lib/cn'

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: ReactNode
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the group. */
  label: string
  /** "tabs" switches panels (tablist); "radio" picks a value (radiogroup). */
  mode?: 'tabs' | 'radio'
  /** Stretch items to fill the width, e.g. inside a form. */
  fill?: boolean
  className?: string
}

const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 38, mass: 0.8 } as const

/** Segmented tabs with a pill that slides to the active item. */
export function Tabs<T extends string>({
  items,
  value,
  onChange,
  label,
  mode = 'tabs',
  fill = false,
  className,
}: TabsProps<T>) {
  // Scope the shared layout id to this instance so two tab groups never trade pills.
  const pillId = useId()
  const reduce = useReducedMotion()
  const itemRole = mode === 'tabs' ? 'tab' : 'radio'

  return (
    <div
      role={mode === 'tabs' ? 'tablist' : 'radiogroup'}
      aria-label={label}
      className={cn('flex rounded-[10px] bg-bg p-1 shadow-card', fill ? 'w-full' : 'w-fit', className)}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role={itemRole}
            aria-selected={mode === 'tabs' ? active : undefined}
            aria-checked={mode === 'tabs' ? undefined : active}
            onClick={() => onChange(item.value)}
            className={cn(
              'press relative inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 font-mono text-xs',
              fill && 'flex-1',
              active ? 'text-fg' : 'text-muted hover:text-fg',
            )}
          >
            {active && (
              <m.span
                layoutId={pillId}
                transition={reduce ? { duration: 0 } : PILL_SPRING}
                className="absolute inset-0 rounded-md bg-button shadow-card"
              />
            )}
            <span className="relative inline-flex items-center gap-1.5">
              {item.icon}
              {item.label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
