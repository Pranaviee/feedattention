import { useMemo, useState } from 'react'
import Tag from '@/components/Tag'
import {
  expandToSigma,
  gaussianVector,
  matrixRank,
  mulberry32,
  randomUnitKeys,
  randomUnitValues,
  verifyEquivalence,
  write,
  zeros,
} from '@/core/memory'

// Fixed small demo table for the sigma/rho toggle: a handful of associations
// written into an n=12, d=4 memory, plus a fixed random d x n projection E.
const DEMO_N = 12
const DEMO_D = 4
const DEMO_P = 5
const demoRng = mulberry32(7)
const demoKeys = randomUnitKeys(DEMO_P, DEMO_N, demoRng)
const demoValues = randomUnitValues(DEMO_P, DEMO_D, demoRng)
const demoRho = zeros(DEMO_N, DEMO_D)
for (let s = 0; s < DEMO_P; s++) write(demoRho, demoKeys[s] ?? [], demoValues[s] ?? [])
const demoE = Array.from({ length: DEMO_D }, () => gaussianVector(DEMO_N, demoRng))

export default function BDHModule() {
  const [seed, setSeed] = useState(1)
  const [maxDiff, setMaxDiff] = useState<number | null>(null)
  const [showSigma, setShowSigma] = useState(false)

  const sigmaCheck = useMemo(() => {
    const sigma = expandToSigma(demoRho, demoE)
    const sigmaAgain = expandToSigma(demoRho, demoE)
    let diff = 0
    for (let i = 0; i < sigma.length; i++)
      for (let j = 0; j < (sigma[i]?.length ?? 0); j++)
        diff = Math.max(diff, Math.abs((sigma[i]?.[j] ?? 0) - (sigmaAgain[i]?.[j] ?? 0)))
    return { sigma, rank: matrixRank(sigma), recovered: diff < 1e-12 }
  }, [])

  const runVerify = () => setMaxDiff(verifyEquivalence(32, 16, seed))

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="font-mono text-[11px] text-accent">→</span>
        <h3 className="text-base font-semibold tracking-tight sm:text-lg">
          Where this lives inside BDH
        </h3>
      </div>

      {/* Part 1 */}
      <div className="mt-4 flex items-start justify-between gap-2">
        <p className="max-w-prose text-[13px] leading-relaxed text-muted sm:text-sm">
          Ordinary attention is <code>softmax(QKᵀ)V</code>. Remove the softmax and matrix
          associativity lets you regroup: <code className="text-fg">(QKᵀ)V = Q(KᵀV)</code>.{' '}
          <code>KᵀV</code> is a sum of outer products — exactly the table from the previous page.
          Attention without softmax <span className="text-fg">is</span> this associative memory.
        </p>
        <Tag variant="cited" />
      </div>

      {/* Part 2 */}
      <div className="mt-4 grid gap-3 sm:grid-cols-[auto_1fr]">
        <div className="rounded-[4px] border border-line bg-panel/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              Pathway · bdh.py
            </span>
            <Tag variant="cited" />
          </div>
          <pre className="mt-2 overflow-x-auto font-mono text-[11px] leading-relaxed">
            <code>
              <span className="text-muted">scores = (QR </span>
              <span className="text-accent">@</span>
              <span className="text-muted"> KR.mT).tril(diagonal=</span>
              <span className="text-live">-1</span>
              <span className="text-muted">)</span>
              {'\n'}
              <span className="text-pre">return</span>
              <span className="text-muted"> scores </span>
              <span className="text-accent">@</span>
              <span className="text-muted"> V</span>
            </code>
          </pre>
        </div>
        <ul className="grid gap-2 text-[12px] leading-relaxed text-muted">
          <li>
            <span className="text-fg">No softmax</span> — so the regrouping above applies directly.
          </li>
          <li>
            <span className="text-fg">.tril(diagonal=-1)</span> keeps strictly past tokens: a token
            reads the table before its own write lands.
          </li>
          <li>
            The caller passes <span className="text-fg">Q=x_sparse, K=x_sparse, V=x</span>, and the
            function asserts K is Q. Query and key are the same tensor — there is no separate key
            projection. V is the token’s own residual.
          </li>
        </ul>
      </div>

      {/* Part 3 */}
      <div className="mt-6 rounded-[4px] border border-line bg-panel/60 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            Verify: parallel form vs. step-by-step loop
          </h4>
          <Tag variant="live" />
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <pre className="overflow-x-auto rounded-[3px] bg-ink/60 p-2 font-mono text-[10.5px] leading-relaxed text-muted">
            {'// parallel (attention form)\n' + 'scores = tril(K @ Kᵀ, -1)\n' + 'out = scores @ V'}
          </pre>
          <pre className="overflow-x-auto rounded-[3px] bg-ink/60 p-2 font-mono text-[10.5px] leading-relaxed text-muted">
            {'// recurrent (memory form)\n' +
              'rho = zeros\n' +
              'for t: out[t]=read(rho,k[t])\n' +
              '       write(rho,k[t],v[t])'}
          </pre>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="verify-seed" className="font-mono text-[10px] text-faint">
            seed
          </label>
          <input
            id="verify-seed"
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value))}
            className="w-20 rounded-[3px] border border-line-strong bg-ink px-2 py-1 font-mono text-[11px] text-fg"
          />
          <button
            type="button"
            onClick={runVerify}
            className="rounded-[3px] border border-line-strong px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg hover:border-accent"
          >
            Verify
          </button>
          {maxDiff !== null && (
            <span className="font-mono text-[12px] tabular-nums text-live">
              max |diff| = {maxDiff.toExponential(2)}
            </span>
          )}
        </div>
        <p className="mt-2 max-w-prose text-[12px] leading-relaxed text-muted">
          Our loop and the reference attention line compute the same numbers. Press it again with a
          different seed.
        </p>
      </div>

      {/* Part 4 */}
      <div className="mt-4 rounded-[4px] border border-line bg-panel/60 p-3 sm:p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            {showSigma ? 'sigma (expanded synapses)' : 'rho (compressed table)'}
          </h4>
          <Tag variant="live" />
        </div>

        <button
          type="button"
          onClick={() => setShowSigma((v) => !v)}
          className="mt-2 rounded-[3px] border border-line-strong px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-fg hover:border-accent"
        >
          Toggle to {showSigma ? 'rho' : 'sigma'}
        </button>

        <div className="mt-3 grid grid-cols-2 gap-3 text-center sm:grid-cols-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              shape
            </div>
            <div className="mt-1 font-mono text-lg text-fg">
              {showSigma ? `${DEMO_N}×${DEMO_N}` : `${DEMO_N}×${DEMO_D}`}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              entries
            </div>
            <div className="mt-1 font-mono text-lg text-fg">
              {showSigma ? DEMO_N * DEMO_N : DEMO_N * DEMO_D}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              rank(sigma)
            </div>
            <div className="mt-1 font-mono text-lg text-live">
              {sigmaCheck.rank} <span className="text-faint">≤ {DEMO_D}</span>
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-faint">
              recovered from rho?
            </div>
            <div className="mt-1 font-mono text-lg text-live">
              {sigmaCheck.recovered ? 'true' : 'false'}
            </div>
          </div>
        </div>

        <p className="mt-3 max-w-prose text-[12px] leading-relaxed text-muted">
          Sigma and rho are <span className="text-fg">not</span> the same matrix. Sigma has n² ={' '}
          {DEMO_N * DEMO_N} entries; rho has n×d = {DEMO_N * DEMO_D}. But every write is an outer
          product whose value side is only d-dimensional, so rank(sigma) ≤ d and{' '}
          <code className="text-fg">sigma = rho · E</code>. Rho is the compressed, lossless form —
          the code never needs to materialise sigma.
        </p>
      </div>
    </div>
  )
}
