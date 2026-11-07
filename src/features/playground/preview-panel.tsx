import { useRef, useState } from 'react'
import type { StateDefinition } from '#/features/states'
import type { ParamValues } from '#/shared/lib/params'
import { useDotColor } from '#/shared/lib/theme'
import { CodeBlock } from '#/shared/ui/code-block'
import { CopyButton } from '#/shared/ui/copy-button'
import { CodeIcon, ExpandIcon, EyeIcon } from '#/shared/ui/icons'
import { Tabs } from '#/shared/ui/tabs'
import { AutoHeight } from '#/shared/ui/auto-height'
import type { TabItem } from '#/shared/ui/tabs'

type Tab = 'preview' | 'code'

const VIEW_TABS: TabItem<Tab>[] = [
  { value: 'preview', label: 'Preview', icon: <EyeIcon /> },
  { value: 'code', label: 'Code', icon: <CodeIcon /> },
]

export function PreviewPanel({ state, source, values }: { state: StateDefinition; source: string; values: ParamValues }) {
  const [tab, setTab] = useState<Tab>('preview')
  const stageRef = useRef<HTMLDivElement>(null)
  const { Component } = state
  const color = useDotColor(values.color)

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen()
  }

  return (
    <div className="rounded-2xl bg-surface p-2 shadow-card">
      <div className="flex items-center justify-between gap-2 p-1 pb-3">
        <Tabs label="View" items={VIEW_TABS} value={tab} onChange={setTab} />
        <div className="flex items-center gap-2">
          <CopyButton text={source} label="Copy component" />
          <button
            type="button"
            onClick={fullscreen}
            aria-label="Toggle fullscreen"
            className="press hover-grow grid size-8 place-items-center rounded-lg bg-button text-fg shadow-card hover:shadow-card-hover"
          >
            <ExpandIcon />
          </button>
        </div>
      </div>

      {/* Inset by 4px so the well's ring and shadow aren't clipped by the height clip. */}
      <AutoHeight className="-m-1">
        <div className="p-1">
      {tab === 'preview' ? (
        <div
          ref={stageRef}
          className="relative flex min-h-[320px] sm:min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-line bg-surface"
        >
          <Component {...values} color={color} />
        </div>
      ) : (
        <CodeBlock code={source} copy={false} className="max-h-[520px] overflow-hidden [&_pre]:max-h-[520px]" />
      )}
        </div>
      </AutoHeight>
    </div>
  )
}
