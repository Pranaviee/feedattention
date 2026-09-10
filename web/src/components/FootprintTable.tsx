import Tag from '@/components/Tag'
import precomputed from '@/data/precomputed.json'

const COLUMNS = ['tokens', 'KV cache', 'fixed table', 'smaller']

const FOOTPRINT = precomputed.memoryFootprint
const first = FOOTPRINT[0]
/** Numbers the KV cache adds per token, derived from the swept data. */
const PER_TOKEN = first && first.T > 0 ? first.transformerKV / first.T : 0
const TABLE_SIZE = first?.bdhTable ?? 0
/** Where the two lines cross: 2,097,152 / 512 = 4,096 tokens. */
const CROSSOVER = PER_TOKEN > 0 ? Math.round(TABLE_SIZE / PER_TOKEN) : 0

const n = (x: number) => x.toLocaleString('en-US')

/**
 * Numbers held by each scheme at a given context length.
 *
 * The `smaller` column is deliberately not spun: it names whichever scheme
 * actually wins at that row, and the cache wins the first three.
 */
export default function FootprintTable() {
  return (
    <div className="rounded-[4px] border border-line bg-panel/60 p-3 sm:p-4">
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
          Numbers held, by context length
        </h4>
        <Tag variant="precomputed" />
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[340px] border-collapse font-mono text-[11px] tabular-nums">
          <thead>
            <tr className="border-b border-line-strong text-faint">
              {COLUMNS.map((c, i) => (
                <th
                  key={c}
                  className={`py-1.5 font-normal ${i === 0 ? 'text-left' : 'pl-3 text-right'}`}
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {FOOTPRINT.map((row) => {
              const tableWins = row.bdhTable < row.transformerKV
              return (
                <tr key={row.T} className="border-b border-line last:border-b-0">
                  <td className="py-1.5 text-muted">{n(row.T)}</td>
                  <td className="py-1.5 pl-3 text-right text-fg">{n(row.transformerKV)}</td>
                  <td className="py-1.5 pl-3 text-right text-fg">{n(row.bdhTable)}</td>
                  <td
                    className={`py-1.5 pl-3 text-right ${tableWins ? 'text-live' : 'text-accent'}`}
                  >
                    {tableWins ? 'table' : 'cache'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-muted">
        <span className="text-fg">Read this honestly: the fixed table is bigger first.</span> At 10
        tokens it holds {n(TABLE_SIZE)} numbers against the cache’s {n(PER_TOKEN * 10)} — about{' '}
        {Math.round(TABLE_SIZE / (PER_TOKEN * 10))}× more, and it stays behind until{' '}
        <span className="text-fg">{n(CROSSOVER)} tokens</span>. Below that you are paying a large
        constant for nothing. What you buy is not a smaller number today but a{' '}
        <span className="text-fg">flat</span> one: the cache column keeps climbing, the table column
        never moves.
      </p>
    </div>
  )
}
