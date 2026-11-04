/** Stops the browser from treating a drag as scroll / pinch / text selection. */
export const TOUCH_GESTURE_CLASS = '[-webkit-tap-highlight-color:transparent] [-webkit-touch-callout:none]'

export function capturePointer(el: Element, pointerId: number) {
  try {
    el.setPointerCapture(pointerId)
  } catch {
    // Pointer already released.
  }
}

export function releasePointer(el: Element, pointerId: number) {
  if (el.hasPointerCapture(pointerId)) el.releasePointerCapture(pointerId)
}
