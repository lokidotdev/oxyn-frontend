/** Smooth, low-overshoot settle for things that glide into place. */
export const SPRING_GLIDE = { stiffness: 420, damping: 38, mass: 0.8 } as const

/** Critically damped settle for layout moves (Apple's default: no overshoot). */
export const SPRING_LAYOUT = { type: 'spring', bounce: 0, duration: 0.35 } as const

/** A quick, firm settle for press feedback. */
export const SPRING_PRESS = { type: 'spring', bounce: 0, duration: 0.2 } as const

/** Strong ease-out for fades and small entrances. */
export const EASE_OUT = [0.23, 1, 0.32, 1] as const
