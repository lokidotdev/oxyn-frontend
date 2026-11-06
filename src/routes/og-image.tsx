import { createFileRoute } from '@tanstack/react-router'

/**
 * The 1200×630 social card. Screenshot it to public/og-image.png; it is not linked from the site.
 * `?ghost=false` drops the mark's unlit dots; that version is public/og-image-no-ghost.webp.
 */
export const Route = createFileRoute('/og-image')({
  validateSearch: (search: Record<string, unknown>) => ({ ghost: search.ghost !== false && search.ghost !== 'false' }),
  head: () => ({ meta: [{ title: 'oxyn — og image' }, { name: 'robots', content: 'noindex' }] }),
  component: OgImage,
})

const W = 1200
const H = 630
const INK = '#18181b'
const PAPER = '#faf7f1'
const GUIDE = 'oklch(0.21 0.006 286 / 0.18)'
const SELECT = '#5b7cf0'

/** The selection box drawn around the lockup, like a frame picked on a design canvas. */
const BOX = { x: 240, y: 186, w: 720, h: 228 }

const N = 7
const PITCH = 10
const MARK = Array.from({ length: N * N }, (_, i) => {
  const x = i % N
  const y = Math.floor(i / N)
  const d = Math.hypot(x - 3, y - 3)
  return { x, y, lit: d >= 1.5 && d <= 3.3 }
})

function Mark({ size, ghost }: { size: number; ghost: boolean }) {
  return (
    <svg width={size} height={size} viewBox={`0 0 ${N * PITCH} ${N * PITCH}`} aria-hidden="true">
      {MARK.filter(({ lit }) => lit || ghost).map(({ x, y, lit }) => (
        <circle
          key={`${x}-${y}`}
          cx={x * PITCH + PITCH / 2}
          cy={y * PITCH + PITCH / 2}
          r={3.8}
          fill="currentColor"
          opacity={lit ? 1 : 0.1}
        />
      ))}
    </svg>
  )
}

function Handle({ x, y }: { x: number; y: number }) {
  return <rect x={x - 5} y={y - 5} width={10} height={10} fill={PAPER} stroke={SELECT} strokeWidth={1.5} />
}

/** Construction lines behind everything: a dashed grid, two circles, and the blue selection around the lockup. */
function Guides() {
  const right = BOX.x + BOX.w
  const bottom = BOX.y + BOX.h
  const footY = 540
  return (
    <svg className="absolute inset-0" width={W} height={H} aria-hidden="true">
      <g stroke={GUIDE} strokeWidth={1} strokeDasharray="4 5" fill="none">
        {[60, BOX.x, W / 2, right, W - 60].map((x) => (
          <line key={x} x1={x} y1={0} x2={x} y2={H} />
        ))}
        {[BOX.y, bottom].map((y) => (
          <line key={y} x1={0} y1={y} x2={W} y2={y} />
        ))}
        <circle cx={W / 2} cy={H / 2} r={390} />
        <circle cx={W / 2} cy={H / 2} r={560} />
      </g>
      <g stroke={SELECT} strokeWidth={1.25} fill="none">
        <line x1={BOX.x} y1={BOX.y - 90} x2={BOX.x} y2={bottom + 160} opacity={0.55} />
        <line x1={right} y1={BOX.y - 90} x2={right} y2={bottom + 160} opacity={0.55} />
        <line x1={BOX.x - 140} y1={BOX.y} x2={right + 140} y2={BOX.y} opacity={0.55} />
        <line x1={BOX.x - 140} y1={bottom} x2={right + 140} y2={bottom} opacity={0.55} />
        <line x1={360} y1={footY} x2={478} y2={footY} opacity={0.55} />
        <line x1={722} y1={footY} x2={840} y2={footY} opacity={0.55} />
      </g>
      <Handle x={BOX.x} y={BOX.y} />
      <Handle x={right} y={BOX.y} />
      <Handle x={BOX.x} y={bottom} />
      <Handle x={right} y={bottom} />
      <Handle x={478} y={footY} />
      <Handle x={722} y={footY} />
    </svg>
  )
}

function OgImage() {
  const { ghost } = Route.useSearch()
  return (
    <div
      className="fixed top-0 left-0 z-[9999] overflow-hidden"
      style={{ width: W, height: H, background: PAPER, color: INK }}
    >
      <Guides />

      <div
        className="absolute flex items-center justify-center gap-7"
        style={{ left: BOX.x, top: BOX.y, width: BOX.w, height: BOX.h }}
      >
        <Mark size={148} ghost={ghost} />
        <span className="font-sans text-[176px] leading-none font-semibold tracking-[-0.03em]">oxyn</span>
      </div>

      <div
        className="absolute flex items-center justify-center font-mono text-[26px] tracking-[0.04em]"
        style={{ left: 478, width: 244, top: 540 - 20, height: 40 }}
      >
        oxyn.space
      </div>
    </div>
  )
}
