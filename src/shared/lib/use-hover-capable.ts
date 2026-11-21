import { useEffect, useState } from 'react'

/** True on devices with a real hover (a mouse or trackpad), so hover-only motion never sticks on touch. */
export function useHoverCapable() {
  const [can, setCan] = useState(false)
  useEffect(() => {
    const mq = matchMedia('(hover: hover) and (pointer: fine)')
    const sync = () => setCan(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return can
}
