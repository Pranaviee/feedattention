import { curveLinear } from '@visx/curve'
import { useMemo } from 'react'
import { Line, LineChart } from '@/components/charts/line-chart'
import { Grid } from '@/components/charts/grid'
import { XAxis } from '@/components/charts/x-axis'
import { YAxis } from '@/components/charts/y-axis'
import { useChartStable, useYScale } from '@/components/charts/chart-context'
import { ChartTooltip } from '@/components/charts/tooltip'
import { TooltipContent } from '@/components/charts/tooltip/tooltip-content'

/**
 * One UTC day per unit of t so bklit’s `scaleTime` stays linear in context
 * length. Axis / tooltip labels read `t`, not calendar dates.
 */
const T_EPOCH_MS = Date.UTC(2020, 0, 1)
const MS_PER_DAY = 86_400_000

export const OVERLAP_STROKES = {
  C0: 'var(--chart-1)',
  C2: 'var(--chart-2)',
  C8: 'var(--chart-3)',
} as const

export interface OverlapPoint {
  t: number
  C0: number
  C2: number
  C8: number
}

export interface ContextSeries {
  dataKey: 'C0' | 'C2' | 'C8'
  label: string
  stroke: string
}

const DEFAULT_SERIES: ContextSeries[] = [
  { dataKey: 'C0', label: 'C=0 independent', stroke: OVERLAP_STROKES.C0 },
  { dataKey: 'C2', label: 'C=2 correlated', stroke: OVERLAP_STROKES.C2 },
  { dataKey: 'C8', label: 'C=8 repetitive', stroke: OVERLAP_STROKES.C8 },
]

function contextDate(t: number): Date {
  return new Date(T_EPOCH_MS + t * MS_PER_DAY)
}

function formatT(value: unknown): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(0)
}

function nearestByT(
  data: Record<string, unknown>[],
  t: number,
): Record<string, unknown> | null {
  if (data.length === 0) return null
  let best = data[0]!
  let bestD = Math.abs(Number(best.t) - t)
  for (const row of data) {
    const d = Math.abs(Number(row.t) - t)
    if (d < bestD) {
      best = row
      bestD = d
    }
  }
  return best
}

/** Vertical cursor at the slider’s t. Renders above the series clip. */
function ContextTMarker({
  t,
  series,
}: {
  t: number
  series: ContextSeries[]
}) {
  const { xScale, innerHeight, data } = useChartStable()
  const yScale = useYScale()
  const x = xScale(contextDate(t))
  const row = nearestByT(data, t)
  if (x == null || !Number.isFinite(x) || !row) return null

  return (
    <g aria-hidden>
      <line
        stroke="var(--chart-2)"
        strokeDasharray="3 3"
        strokeWidth={1.25}
        x1={x}
        x2={x}
        y1={0}
        y2={innerHeight}
      />
      {series.map((s) => {
        const yv = row[s.dataKey]
        if (typeof yv !== 'number' || !Number.isFinite(yv)) return null
        const y = yScale(yv)
        if (y == null || !Number.isFinite(y)) return null
        return (
          <circle
            cx={x}
            cy={y}
            fill={s.stroke}
            key={s.dataKey}
            r={6}
            stroke="var(--chart-background)"
            strokeWidth={2}
          />
        )
      })}
    </g>
  )
}
ContextTMarker.displayName = 'ContextTMarker'
;(ContextTMarker as typeof ContextTMarker & { __isPostOverlay: boolean }).__isPostOverlay = true

interface ContextLineChartProps {
  data: OverlapPoint[]
  formatY: (n: number) => string
  yLabel: string
  xLabel?: string
  height: number
  showMarkers?: boolean
  dashed?: boolean
  series?: ContextSeries[]
  /** Current t from the page slider — draws a cursor, not extra data. */
  markerT?: number
}

export default function ContextLineChart({
  data,
  formatY,
  yLabel,
  xLabel = 'Context length t',
  height,
  showMarkers = true,
  dashed = false,
  series = DEFAULT_SERIES,
  markerT,
}: ContextLineChartProps) {
  const chartData = useMemo(
    () => data.map((row) => ({ ...row, date: contextDate(row.t) })),
    [data],
  )

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-md"
        role="img"
        aria-label={`${yLabel} against ${xLabel}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 experiment-chart-wash"
        />
        <LineChart
          animationDuration={0}
          aspectRatio=""
          className="experiment-line-chart"
          data={chartData}
          margin={{ top: 18, right: 16, bottom: 32, left: 48 }}
          style={{ height }}
          xDataKey="date"
          yDomainTween={false}
        >
          <Grid horizontal highlightRowValues={[0]} />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              animate={false}
              curve={curveLinear}
              dashArray={dashed ? '6,4' : undefined}
              dashFromIndex={dashed ? 0 : undefined}
              dataKey={s.dataKey}
              fadeEdges={false}
              markers={
                showMarkers
                  ? {
                      radius: 3.25,
                      ringGap: 0,
                      stroke: 'var(--chart-background)',
                      strokeWidth: 1.5,
                    }
                  : undefined
              }
              showHighlight={false}
              showMarkers={showMarkers}
              stroke={s.stroke}
              strokeWidth={2.5}
            />
          ))}
          {markerT != null ? <ContextTMarker series={series} t={markerT} /> : null}
          <YAxis formatLargeNumbers={false} formatValue={formatY} numTicks={5} />
          <XAxis tickMode="data" />
          <ChartTooltip
            showDatePill={false}
            content={({ point }) => (
              <TooltipContent
                title={`${xLabel.split('—')[0]?.trim()} = ${formatT(point.t)}`}
                rows={series.map((s) => {
                  const raw = point[s.dataKey]
                  return {
                    color: s.stroke,
                    label: s.label,
                    value:
                      typeof raw === 'number' && Number.isFinite(raw)
                        ? formatY(raw)
                        : '—',
                  }
                })}
              />
            )}
          />
        </LineChart>
      </div>
      <p className="mt-1 mb-0 text-center font-serif text-[12px] text-muted">{xLabel}</p>
      <ul className="mt-2 mb-0 flex flex-wrap gap-x-4 gap-y-1 list-none p-0">
        {series.map((s) => (
          <li
            key={s.dataKey}
            className="flex items-center gap-1.5 font-mono text-[11px]"
            style={{ color: s.stroke }}
          >
            <span
              aria-hidden
              className="inline-block h-0.5 w-4 rounded-full"
              style={{
                backgroundColor: dashed ? 'transparent' : s.stroke,
                borderTop: dashed ? `1.5px dashed ${s.stroke}` : undefined,
              }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}
