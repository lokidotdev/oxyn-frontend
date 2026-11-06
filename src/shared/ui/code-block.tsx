import { useMemo } from 'react'
import { highlight } from 'sugar-high'
import { cn } from '#/shared/lib/cn'
import { CopyButton } from './copy-button'

interface CodeBlockProps {
  code: string
  className?: string
  copy?: boolean
  /** Off for shell commands, where `//` in URLs would read as a comment. */
  highlighted?: boolean
}

export function CodeBlock({ code, className, copy = true, highlighted = true }: CodeBlockProps) {
  const html = useMemo(() => (highlighted ? highlight(code) : escapeHtml(code)), [code, highlighted])
  return (
    <div className={cn('group relative rounded-xl bg-surface shadow-card', className)}>
      {copy && <CopyButton text={code} className="absolute top-2.5 right-2.5 z-10" />}
      <pre className="code overflow-auto p-4 pr-14 font-mono text-[12.5px] leading-relaxed">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}

function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
