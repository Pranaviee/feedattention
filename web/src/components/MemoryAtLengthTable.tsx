import { Caveat, Kicker } from '@/components/FigureChrome'
import { NumberTicker } from '@/components/ui/number-ticker'

const TABLE = [
  { len: 10, kv: '5 MB', ratio: '410× KV', winner: 'KV cache', kvWins: true },
  { len: 100, kv: '50 MB', ratio: '41× KV', winner: 'KV cache', kvWins: true },
  { len: 1_000, kv: '500 MB', ratio: '4× KV', winner: 'KV cache', kvWins: true },
  { len: 100_000, kv: '48.83 GB', ratio: '24.4× fixed', winner: 'Fixed table', kvWins: false },
] as const

/**
 * Table 1 — Memory at length.
 *
 * Lives after the structural view (Figure 4) in the mechanism section: by
 * then the reader has seen the fixed table's actual contents, so the payoff
 * — where a growing KV cache crosses over it — lands as a conclusion rather
 * than an early aside.
 */
export default function MemoryAtLengthTable() {
  return (
    <div className="mt-16">
      <Kicker label="TABLE 1 — MEMORY AT LENGTH" tags={['precomputed']} />
      <div className="overflow-hidden rounded-lg border border-line bg-panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className="bg-panel2">
                {['SEQUENCE LENGTH', 'GROWING KV CACHE', 'FIXED-SIZE TABLE', 'RATIO', 'CHEAPER'].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`border-b border-line px-5 py-2.5 text-[10.5px] font-semibold tracking-[0.08em] text-muted ${i === 0 ? 'text-left' : 'text-right'}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {TABLE.map((r, i) => (
                <tr key={r.len}>
                  <td
                    className="px-5 py-[13px] text-left font-mono text-[13px] font-medium text-muted"
                    style={{ borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #F0F1F3' }}
                  >
                    <NumberTicker value={r.len} />
                  </td>
                  <td
                    className="px-5 py-[13px] text-right font-mono text-[13px] font-medium"
                    style={{
                      color: r.kvWins ? '#16181D' : '#DC2626',
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #F0F1F3',
                    }}
                  >
                    {r.kv}
                  </td>
                  <td
                    className="px-5 py-[13px] text-right font-mono text-[13px] font-medium"
                    style={{
                      color: r.kvWins ? '#E8850C' : '#16A34A',
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #F0F1F3',
                    }}
                  >
                    <NumberTicker value={2} decimalPlaces={2} /> GB
                  </td>
                  <td
                    className="px-5 py-[13px] text-right font-mono text-[13px] font-medium text-fg"
                    style={{ borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #F0F1F3' }}
                  >
                    {r.ratio}
                  </td>
                  <td
                    className="px-5 py-[13px] text-right font-mono text-[13px] font-semibold"
                    style={{
                      color: r.kvWins ? '#5C6370' : '#16A34A',
                      borderBottom: i === TABLE.length - 1 ? 'none' : '1px solid #F0F1F3',
                    }}
                  >
                    {r.winner}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Caveat title="">
          <span className="text-muted">
            Honest note: the fixed table is <em className="not-italic text-fg">worse</em> at short
            lengths — it allocates its full 2.00 GB whether it holds ten associations or ten
            million. It only wins past roughly 4,000 tokens, where the KV cache overtakes it and
            keeps going. Below that crossover, a growing cache is the right engineering choice.
          </span>
        </Caveat>
      </div>
    </div>
  )
}
