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
    <div className="overflow-x-auto rounded-xl border border-line">
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
            <tr key={r.name}>
              <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-fg">{r.name}</td>
              <td className="max-w-[180px] px-4 py-2.5 font-mono text-xs text-muted">{r.type}</td>
              <td className="px-4 py-2.5 font-mono text-xs whitespace-nowrap text-muted">{r.default}</td>
              <td className="px-4 py-2.5 text-muted">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
