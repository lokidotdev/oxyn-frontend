import type { ParamDef } from '#/shared/lib/params'
import { typeLabel } from '#/shared/lib/params'

const COMMON_PROPS = [
  { name: 'label', type: 'string', default: '"Thinking"', description: 'Accessible name; the wrapper is role="status".' },
  { name: 'className / style', type: '—', default: '—', description: 'Spread onto the wrapper div, along with any other div props.' },
]

export function PropsTable({ schema }: { schema: ParamDef[] }) {
  const rows = [
    ...schema.map((p) => ({
      name: p.key,
      type: typeLabel(p),
      default: typeof p.default === 'string' ? `"${p.default}"` : String(p.default),
      description: p.description,
    })),
    ...COMMON_PROPS,
  ]

  return (
    <div className="overflow-x-auto rounded-xl shadow-card">
      <table className="w-full min-w-[560px] text-left text-[13px]">
        <thead className="border-b border-line bg-surface font-mono text-xs text-muted">
          <tr>
            <th className="px-4 py-2.5 font-medium">Prop</th>
            <th className="px-4 py-2.5 font-medium">Type</th>
            <th className="px-4 py-2.5 font-medium">Default</th>
            <th className="px-4 py-2.5 font-medium">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {rows.map((r) => (
            // Top-aligned with one shared line height: when any cell wraps, every first line still sits on the same row.
            <tr key={r.name} className="align-top leading-5">
              <td className="px-4 py-3 text-xs whitespace-nowrap text-fg">{r.name}</td>
              <td className="max-w-[200px] px-4 py-3 font-mono text-xs text-muted">
                <TypeLabel type={r.type} />
              </td>
              <td className="px-4 py-3 font-mono text-xs whitespace-nowrap text-muted">{r.default}</td>
              <td className="max-w-[44ch] px-4 py-3 font-mono text-pretty text-muted">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Unions wrap between members, never inside one; the pipes recede so the values carry the line. */
function TypeLabel({ type }: { type: string }) {
  const members = type.split(' | ')
  return (
    <span className="flex flex-wrap gap-x-1.5">
      {members.map((m, i) => (
        <span key={m} className="whitespace-nowrap">
          {m}
          {i < members.length - 1 && <span className="ml-1.5 text-faint">|</span>}
        </span>
      ))}
    </span>
  )
}
