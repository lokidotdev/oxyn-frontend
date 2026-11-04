import { useRef, useState } from 'react'
import type { StateDefinition } from '#/features/states'
import type { ParamValues } from '#/shared/lib/params'
import { CodeBlock } from '#/shared/ui/code-block'
import { CopyButton } from '#/shared/ui/copy-button'
import { CodeIcon, ExpandIcon, EyeIcon } from '#/shared/ui/icons'
import { Tabs } from '#/shared/ui/tabs'
import type { TabItem } from '#/shared/ui/tabs'

type Tab = 'preview' | 'code'

const VIEW_TABS: TabItem<Tab>[] = [
  { value: 'preview', label: 'Preview', icon: <EyeIcon /> },
  { value: 'code', label: 'Code', icon: <CodeIcon /> },
]

export function PreviewPanel({ state, values }: { state: StateDefinition; values: ParamValues }) {
  const [tab, setTab] = useState<Tab>('preview')
  const stageRef = useRef<HTMLDivElement>(null)
  const { Component } = state

  const fullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen()
    else stageRef.current?.requestFullscreen()
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-2">
      <div className="flex items-center justify-between gap-2 p-1 pb-3">
        <Tabs label="View" items={VIEW_TABS} value={tab} onChange={setTab} />
        <div className="flex items-center gap-2">
          <CopyButton text={state.source} label="Copy component" />
          <button
            type="button"
            onClick={fullscreen}
            aria-label="Toggle fullscreen"
            className="grid size-8 place-items-center rounded-lg border border-line bg-raised text-fg transition-colors hover:border-line-strong"
          >
            <ExpandIcon />
          </button>
        </div>
      </div>

      {tab === 'preview' ? (
        <div
          ref={stageRef}
          className="stage relative flex min-h-[320px] sm:min-h-[420px] items-center justify-center overflow-hidden rounded-xl border border-line"
        >
          <Component {...values} />
          <span className="absolute bottom-3 left-3 font-mono text-[11px] text-faint">{state.fileName}</span>
        </div>
      ) : (
        <CodeBlock code={state.source} copy={false} className="max-h-[520px] overflow-hidden [&_pre]:max-h-[520px]" />
      )}
    </div>
  )
}
