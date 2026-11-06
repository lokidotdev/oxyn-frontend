import { forwardRef, useId, useState } from 'react'
import type { ComponentPropsWithoutRef } from 'react'
import * as SelectPrimitive from '@radix-ui/react-select'
import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import type { Variants } from 'motion/react'
import { cn } from '#/shared/lib/cn'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from '#/shared/ui/icons'

export interface SelectProps extends Omit<ComponentPropsWithoutRef<typeof SelectPrimitive.Root>, 'children'> {
  label: string
  description?: string
  placeholder?: string
  id?: string
  className?: string
  options: { value: string; label: string; disabled?: boolean }[]
}

/** Same spring as the tabs pill, so the highlight moves like every other pill on the site. */
const PILL_SPRING = { type: 'spring', stiffness: 500, damping: 38, mass: 0.8 } as const

const enterEase = [0.22, 1, 0.36, 1] as const
const standardEase = [0.4, 0, 0.2, 1] as const

/** The shown value rolls in the direction of the list: a later option rises from below, an earlier one drops from above. */
const valueRoll: Variants = {
  enter: (direction: number) => ({ opacity: 0, y: `${direction * 0.35}em`, filter: 'blur(2px)' }),
  center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.24, ease: [...enterEase] } },
  exit: (direction: number) => ({ opacity: 0, y: `${direction * -0.3}em`, filter: 'blur(1px)', transition: { duration: 0.16, ease: [...standardEase] } }),
}
/** Reduced motion keeps a short crossfade; the resting state matches valueRoll so server and client markup agree. */
const valueFade: Variants = { enter: { opacity: 0 }, center: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.08 } }, exit: { opacity: 0, transition: { duration: 0.08 } } }

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { label, description, placeholder = 'Select an option', options, id, className, disabled, onValueChange, ...rootProps },
  ref,
) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const hintId = description ? `${controlId}-description` : undefined
  const reduceMotion = useReducedMotion()
  const [uncontrolledValue, setUncontrolledValue] = useState(rootProps.defaultValue ?? '')
  const currentValue = rootProps.value ?? uncontrolledValue
  const index = options.findIndex((option) => option.value === currentValue)
  const shown = currentValue ? options[index]?.label ?? '' : placeholder
  const [previousIndex, setPreviousIndex] = useState(index)
  const [direction, setDirection] = useState(1)
  const [highlighted, setHighlighted] = useState<string | null>(null)
  const pillId = `${controlId}-pill`
  if (previousIndex !== index) { setPreviousIndex(index); setDirection(index > previousIndex ? 1 : -1) }

  return (
    <div className="space-y-2.5">
      <label htmlFor={controlId} className="block font-mono text-[13px] text-muted">{label}</label>
      <SelectPrimitive.Root {...rootProps} onOpenChange={(open) => { if (!open) setHighlighted(null); rootProps.onOpenChange?.(open) }} disabled={disabled} onValueChange={(next) => { setUncontrolledValue(next); onValueChange?.(next) }}>
        <SelectPrimitive.Trigger
          ref={ref}
          id={controlId}
          aria-describedby={hintId}
          className={cn(
            'flex h-9 w-full items-center justify-between gap-2 rounded-lg bg-button px-2.5 font-mono text-xs text-fg shadow-card outline-none transition-shadow hover:shadow-card-hover focus-visible:shadow-card-hover data-[state=open]:shadow-card-hover disabled:pointer-events-none disabled:opacity-40',
            className,
          )}
        >
          {/* Radix keeps the real value for assistive tech; the visible copy below animates between values. */}
          <span className="sr-only"><SelectPrimitive.Value placeholder={placeholder} /></span>
          <span className="relative grid min-w-0 flex-1 overflow-hidden text-left [&>*]:col-start-1 [&>*]:row-start-1" aria-hidden="true">
            <AnimatePresence initial={false} custom={direction}>
              <m.span key={currentValue ? `value-${currentValue}` : 'placeholder'} className="truncate data-[placeholder]:text-faint" data-placeholder={currentValue ? undefined : ''} custom={direction} variants={reduceMotion ? valueFade : valueRoll} initial="enter" animate="center" exit="exit">{shown}</m.span>
            </AnimatePresence>
          </span>
          <SelectPrimitive.Icon className="text-muted">
            <ChevronDownIcon />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className="select-content z-50 max-h-[var(--radix-select-content-available-height)] w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-line-strong bg-raised p-1 shadow-xl shadow-black/40"
            position="popper"
            sideOffset={4}
            collisionPadding={12}
          >
            <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center text-muted">
              <ChevronUpIcon />
            </SelectPrimitive.ScrollUpButton>
            <SelectPrimitive.Viewport className="isolate">
              {options.map((option) => (
                <SelectPrimitive.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  onFocus={() => setHighlighted(option.value)}
                  className="relative flex h-8 cursor-default items-center justify-between gap-2 rounded-md px-2 font-mono text-xs text-muted transition-colors duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:text-fg data-[state=checked]:text-fg"
                >
                  {/* One pill slides between options instead of each row lighting up on its own. */}
                  {highlighted === option.value && (
                    <m.span layoutId={pillId} transition={reduceMotion ? { duration: 0 } : PILL_SPRING} className="absolute inset-0 -z-10 rounded-md bg-line" />
                  )}
                  <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  <SelectPrimitive.ItemIndicator>
                    <CheckIcon />
                  </SelectPrimitive.ItemIndicator>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
            <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center text-muted">
              <ChevronDownIcon />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
      {description && <span id={hintId} className="block font-mono text-xs text-faint">{description}</span>}
    </div>
  )
})
