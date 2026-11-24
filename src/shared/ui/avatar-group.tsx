// Adapted from beui.dev/components/motion/avatar-group. Changes for this app: `m.*` instead of `motion.*` (the root's
// LazyMotion is strict), English strings instead of the i18n helpers, oxyn's colour tokens, an optional `href` per
// member (the avatar becomes a link), `fit: 'contain'` for logos (which mustn't be cropped), and `tone` / `ring` props
// for colours, since this app's `cn` joins classes without resolving conflicts.

import { AnimatePresence, m, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import type { ComponentPropsWithRef, PointerEvent } from 'react'
import { cn } from '#/shared/lib/cn'
import { EASE_OUT, SPRING_LAYOUT, SPRING_PRESS } from '#/shared/lib/ease'
import { useHoverCapable } from '#/shared/lib/use-hover-capable'
import { Tooltip, TooltipProvider } from './tooltip'

export interface AvatarGroupMember {
  id: string
  name: string
  /** Image URL. Without one, or if it fails to load, initials show. */
  src?: string
  /** Where the avatar links to, opened in a new tab. */
  href?: string
}

const SIZES = {
  sm: { box: 'size-7 text-[10px]', px: 28 },
  md: { box: 'size-9 text-xs', px: 36 },
  lg: { box: 'size-11 text-sm', px: 44 },
} as const

type AvatarSize = keyof typeof SIZES

const MESSAGES = {
  label: 'Members',
  showFewer: 'Show fewer members',
  showMore: (count: number) => `Show ${count} more members`,
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

export interface AvatarProps extends Omit<ComponentPropsWithRef<'span'>, 'children'> {
  name: string
  src?: string
  size?: AvatarSize
  /** `cover` for photos, `contain` for logos. */
  fit?: 'cover' | 'contain'
  /** Fill and text colour. Replaces the default rather than adding to it (`cn` here doesn't merge). */
  tone?: string
  /** The ring that separates overlapping avatars: the colour of the surface they sit on. */
  ring?: string
}

/** One avatar: the image, or initials when there is no image or it fails. */
export function Avatar({
  name,
  src,
  size = 'md',
  fit = 'cover',
  tone = 'bg-raised text-muted',
  ring = 'ring-bg',
  className,
  ...props
}: AvatarProps) {
  const [failedSrc, setFailedSrc] = useState<string>()
  const showImage = src && failedSrc !== src
  return (
    <span
      {...props}
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-medium ring-2 select-none',
        tone,
        ring,
        SIZES[size].box,
        className,
      )}
    >
      {showImage ? (
        <img
          src={src}
          alt={name}
          draggable={false}
          onError={() => setFailedSrc(src)}
          className={cn('size-full', fit === 'contain' ? 'object-contain p-1' : 'object-cover')}
        />
      ) : (
        <>
          <span aria-hidden="true">{initials(name)}</span>
          <span className="sr-only">{name}</span>
        </>
      )}
    </span>
  )
}

export interface AvatarGroupProps extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  members: AvatarGroupMember[]
  /** Avatars shown before the rest collapse into a +N count. */
  max?: number
  size?: AvatarSize
  /** Whether every member is shown. Pair with `onExpandedChange`. */
  expanded?: boolean
  defaultExpanded?: boolean
  onExpandedChange?: (expanded: boolean) => void
  /** Accessible name for the list, such as "Project members". */
  label?: string
  fit?: AvatarProps['fit']
  tone?: AvatarProps['tone']
  ring?: AvatarProps['ring']
}

/**
 * Overlapping avatars that fan apart on hover, lift the one under the pointer
 * with its name, and expand from a +N count to show everyone.
 */
export function AvatarGroup({
  members,
  max = 4,
  size = 'md',
  expanded,
  defaultExpanded = false,
  onExpandedChange,
  label,
  fit,
  tone,
  ring = 'ring-bg',
  className,
  ...props
}: AvatarGroupProps) {
  const reduce = useReducedMotion()
  const canHover = useHoverCapable()
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded)
  const isExpanded = expanded ?? internalExpanded
  // Index of the avatar under a mouse pointer; the +N button counts as the last slot.
  const [hovered, setHovered] = useState<number | null>(null)

  const limit = Math.max(1, max)
  const overflow = Math.max(0, members.length - limit)
  const visible = isExpanded ? members : members.slice(0, limit)
  const px = SIZES[size].px
  // Avatars overlap by a third of their width. Hovering one parts the row around it: everything before slides back,
  // everything after slides on, so the hovered avatar shows in full while the group stays in place.
  const overlap = Math.round(px / 3)
  const push = Math.round(overlap * 0.75)
  const parting = !reduce && canHover && hovered !== null
  const offset = (index: number) => (!parting || index === hovered ? 0 : index < (hovered ?? 0) ? -push : push)
  const hoverHandlers = (index: number) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === 'mouse') setHovered(index)
    },
  })

  const toggle = () => {
    const next = !isExpanded
    if (expanded === undefined) setInternalExpanded(next)
    onExpandedChange?.(next)
  }

  return (
    <TooltipProvider skipDelay={400}>
      <div
        {...props}
        onPointerLeave={(event) => {
          props.onPointerLeave?.(event)
          setHovered(null)
        }}
        className={cn('inline-flex items-center', className)}
      >
        <ul aria-label={label ?? MESSAGES.label} className="relative flex items-center">
          <AnimatePresence initial={false} mode="popLayout">
            {visible.map((member, index) => {
              const avatar = <Avatar name={member.name} src={member.src} size={size} fit={fit} tone={tone} ring={ring} />
              return (
                <m.li
                  key={member.id}
                  layout={reduce ? false : 'position'}
                  initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: reduce ? 1 : 0.6, transition: { duration: 0.14, ease: EASE_OUT } }}
                  transition={{ layout: SPRING_LAYOUT, scale: SPRING_LAYOUT, opacity: { duration: 0.18, ease: EASE_OUT } }}
                  // Later avatars sit on top, except the hovered one.
                  style={{
                    marginLeft: index === 0 ? 0 : -overlap,
                    zIndex: parting && hovered === index ? visible.length + 1 : index,
                    position: 'relative',
                  }}
                >
                  <Tooltip content={member.name} side="top">
                    <m.span
                      className="block rounded-full"
                      {...hoverHandlers(index)}
                      animate={{
                        x: offset(index),
                        y: parting && hovered === index ? -3 : 0,
                        scale: parting && hovered === index ? 1.06 : 1,
                      }}
                      transition={SPRING_LAYOUT}
                    >
                      {member.href ? (
                        <a
                          href={member.href}
                          target="_blank"
                          rel="noreferrer sponsored"
                          aria-label={member.name}
                          className="block rounded-full outline-none focus-visible:ring-2 focus-visible:ring-fg/50"
                        >
                          {avatar}
                        </a>
                      ) : (
                        avatar
                      )}
                    </m.span>
                  </Tooltip>
                </m.li>
              )
            })}
            {overflow > 0 ? (
              <m.li
                key="overflow"
                layout={reduce ? false : 'position'}
                transition={{ layout: SPRING_LAYOUT }}
                style={{ marginLeft: -overlap, zIndex: visible.length, position: 'relative' }}
              >
                <m.span
                  className="block"
                  {...hoverHandlers(visible.length)}
                  animate={{ x: offset(visible.length) }}
                  transition={SPRING_LAYOUT}
                >
                  <m.button
                    type="button"
                    aria-expanded={isExpanded}
                    aria-label={isExpanded ? MESSAGES.showFewer : MESSAGES.showMore(overflow)}
                    onClick={toggle}
                    whileTap={reduce ? undefined : { scale: 0.92 }}
                    transition={SPRING_PRESS}
                    className={cn(
                      'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-fg font-medium text-bg tabular-nums ring-2 outline-none focus-visible:outline-2 focus-visible:outline-fg/50',
                      ring,
                      SIZES[size].box,
                    )}
                  >
                    <AnimatePresence initial={false} mode="popLayout">
                      <m.span
                        key={isExpanded ? 'less' : 'more'}
                        aria-hidden="true"
                        initial={{ opacity: 0, y: reduce ? 0 : isExpanded ? 8 : -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: reduce ? 0 : isExpanded ? -8 : 8 }}
                        transition={{ duration: 0.16, ease: EASE_OUT }}
                      >
                        {isExpanded ? '−' : `+${new Intl.NumberFormat().format(overflow)}`}
                      </m.span>
                    </AnimatePresence>
                  </m.button>
                </m.span>
              </m.li>
            ) : null}
          </AnimatePresence>
        </ul>
      </div>
    </TooltipProvider>
  )
}
