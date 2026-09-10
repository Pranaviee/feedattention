import { AxisBottom, AxisLeft } from '@visx/axis'
import { curveLinear } from '@visx/curve'
import { GridRows } from '@visx/grid'
import { scaleLinear, scaleLog } from '@visx/scale'
import { LinePath } from '@visx/shape'
import { ParentSize } from '@visx/responsive'
import { useMemo, useState, type MouseEvent } from 'react'

/**
 * Numeric line chart on the same visx stack as bklit-linecharts
 * (`LinePath`, `ParentSize`, `curveLinear`).
 *
 * The stock `@bklit/line-chart` widget is a time-series chart (`scaleTime`,
 * date tick labels, default `curveNatural`). Mapping P or t onto fake dates
 * would misstate the axis, and natural smoothing would invent values between
 * measured points. This wrapper keeps bklit’s drawing primitives while using
 * honest numeric / log scales and straight segments.
 */

export interface ChartSeries {
  key: string
  label: string
  color: string
  /** Draw the polyline (straight segments between points). */
  line?: boolean
  /** Hollow/solid dots at each x. */
  dots?: boolean
  dash?: string
  width?: number
  muted?: boolean
  /** Per-series rows when the x sampling differs (e.g. dense theory). */
  data?: Array<Record<string, number>>
  /** Draw the live P/t marker on this series. Default true. */
  marker?: boolean
}

interface NumericLineChartProps {
  data: Array<Record<string, number>>
  xKey: string
  series: ChartSeries[]
  xLabel: string
  yLabel: string
  yDomain: [number, number]
  xDomain?: [number, number]
  xScale?: 'linear' | 'log'
  yTicks?: number[]
  xTicks?: number[]
  markerX?: number
  referenceX?: { x: number; label: string }
  height?: number
  formatX?: (n: number) => string
  formatY?: (n: number) => string
}

function nearestRow(
  data: Array<Record<string, number>>,
  xKey: string,
  x: number,
): Record<string, number> | null {
  if (data.length === 0) return null
  let best = data[0]!
  let bestD = Math.abs((best[xKey] ?? 0) - x)
  for (const row of data) {
    const d = Math.abs((row[xKey] ?? 0) - x)
    if (d < bestD) {
      best = row
      bestD = d
    }
  }
  return best
}

function rowsFor(series: ChartSeries, fallback: Array<Record<string, number>>) {
  return series.data ?? fallback
}

function ChartInner({
  width,
  height,
  data,
  xKey,
  series,
  xLabel,
  yLabel,
  yDomain,
  xDomain,
  xScale: xScaleKind = 'linear',
  yTicks,
  xTicks,
  markerX,
  referenceX,
  formatX = (n) => String(n),
  formatY = (n) => n.toFixed(2),
}: NumericLineChartProps & { width: number; height: number }) {
  const [hover, setHover] = useState<{ x: number; y: number; row: Record<string, number> } | null>(
    null,
  )
  const margin = { top: 20, right: 16, bottom: 52, left: 58 }
  const innerW = Math.max(1, width - margin.left - margin.right)
  const innerH = Math.max(1, height - margin.top - margin.bottom)

  const xs = useMemo(() => {
    const values: number[] = []
    for (const row of data) values.push(row[xKey] ?? 0)
    for (const s of series) {
      for (const row of s.data ?? []) values.push(row[xKey] ?? 0)
    }
    return values
  }, [data, series, xKey])

  const xMin = xDomain?.[0] ?? Math.min(...xs)
  const xMax = xDomain?.[1] ?? Math.max(...xs)

  const xScale = useMemo(() => {
    if (xScaleKind === 'log') {
      return scaleLog<number>({
        domain: [Math.max(xMin, 1e-6), xMax],
        range: [0, innerW],
        nice: false,
      })
    }
    return scaleLinear<number>({ domain: [xMin, xMax], range: [0, innerW], nice: false })
  }, [innerW, xMax, xMin, xScaleKind])

  const yScale = useMemo(
    () => scaleLinear<number>({ domain: yDomain, range: [innerH, 0], nice: false }),
    [innerH, yDomain],
  )

  const ticks =
    xTicks ??
    (xScaleKind === 'log'
      ? Array.from(new Set(data.map((d) => d[xKey] ?? 0))).sort((a, b) => a - b)
      : xScale.ticks(6))

  if (width < 40 || height < 40) return null

  const hoverSource = data

  return (
    <div className="relative">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={`${yLabel} against ${xLabel}`}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e: MouseEvent<SVGSVGElement>) => {
          const rect = e.currentTarget.getBoundingClientRect()
          const px = e.clientX - rect.left
          const py = e.clientY - rect.top
          const xVal = xScale.invert(px - margin.left)
          const row = nearestRow(hoverSource, xKey, xVal)
          if (!row) return
          setHover({ x: px, y: py, row })
        }}
      >
        <g transform={`translate(${margin.left},${margin.top})`}>
          <GridRows
            scale={yScale}
            width={innerW}
            stroke="#E3E5E9"
            strokeDasharray="2 3"
            tickValues={yTicks}
            numTicks={yTicks ? undefined : 5}
          />
          {referenceX && (
            <g>
              <line
                x1={xScale(referenceX.x)}
                x2={xScale(referenceX.x)}
                y1={0}
                y2={innerH}
                stroke="#C9CDD4"
                strokeDasharray="4 4"
              />
              <text
                x={Math.min(xScale(referenceX.x) + 6, innerW - 8)}
                y={innerH - 10}
                fill="#8B919C"
                fontSize={11}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
              >
                {referenceX.label}
              </text>
            </g>
          )}
          {series.map((s) => {
            const src = rowsFor(s, data)
            const pts = src
              .map((d) => {
                const xv = d[xKey]
                const yv = d[s.key]
                if (typeof xv !== 'number' || typeof yv !== 'number') return null
                return { x: xScale(xv), y: yScale(yv), xv, yv }
              })
              .filter((p): p is { x: number; y: number; xv: number; yv: number } => p !== null)
            const opacity = s.muted ? 0.35 : 1
            return (
              <g key={s.key} opacity={opacity}>
                {s.line !== false && pts.length > 1 && (
                  <LinePath
                    data={pts}
                    x={(p) => p.x}
                    y={(p) => p.y}
                    curve={curveLinear}
                    stroke={s.color}
                    strokeWidth={s.width ?? 2.5}
                    strokeDasharray={s.dash}
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
                {s.dots &&
                  pts.map((p) => (
                    <circle
                      key={`${s.key}-${p.xv}`}
                      cx={p.x}
                      cy={p.y}
                      r={3.4}
                      fill={s.line === false ? s.color : '#FCFCFD'}
                      stroke={s.color}
                      strokeWidth={1.6}
                    />
                  ))}
                {markerX != null &&
                  !s.muted &&
                  s.marker !== false &&
                  (() => {
                    const row = nearestRow(src, xKey, markerX)
                    const yv = row?.[s.key]
                    if (typeof yv !== 'number') return null
                    return (
                      <circle
                        cx={xScale(row![xKey]!)}
                        cy={yScale(yv)}
                        r={6}
                        fill={s.color}
                        stroke="#FCFCFD"
                        strokeWidth={2}
                      />
                    )
                  })()}
              </g>
            )
          })}
          {markerX != null && (
            <line
              x1={xScale(markerX)}
              x2={xScale(markerX)}
              y1={0}
              y2={innerH}
              stroke="#2C5FE8"
              strokeDasharray="3 3"
              strokeWidth={1.25}
            />
          )}
          <AxisLeft
            scale={yScale}
            tickValues={yTicks}
            numTicks={yTicks ? undefined : 5}
            stroke="#C9CDD4"
            tickStroke="#C9CDD4"
            tickFormat={(v) => formatY(Number(v))}
            tickLabelProps={{
              fill: '#8B919C',
              fontSize: 12,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              dx: -4,
              dy: 3,
            }}
            label={yLabel}
            labelOffset={40}
            labelProps={{
              fill: '#5C6370',
              fontSize: 12,
              fontFamily: 'Source Serif 4, Georgia, serif',
              textAnchor: 'middle',
            }}
          />
          <AxisBottom
            top={innerH}
            scale={xScale}
            tickValues={ticks}
            stroke="#C9CDD4"
            tickStroke="#C9CDD4"
            tickFormat={(v) => formatX(Number(v))}
            tickLabelProps={{
              fill: '#8B919C',
              fontSize: 12,
              fontFamily: 'JetBrains Mono, ui-monospace, monospace',
              dy: 4,
            }}
            label={xLabel}
            labelOffset={32}
            labelProps={{
              fill: '#5C6370',
              fontSize: 12,
              fontFamily: 'Source Serif 4, Georgia, serif',
              textAnchor: 'middle',
            }}
          />
        </g>
      </svg>
      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-md border border-line-strong bg-panel px-2.5 py-1.5 font-mono text-[11px] text-fg shadow-card"
          style={{
            left: Math.min(hover.x + 8, width - 180),
            top: Math.max(8, hover.y - 48),
          }}
        >
          <div className="text-faint">
            {xLabel.split('—')[0]?.trim()} = {formatX(hover.row[xKey] ?? 0)}
          </div>
          {series
            .filter((s) => !s.muted)
            .map((s) => {
              const src = rowsFor(s, data)
              const row = nearestRow(src, xKey, hover.row[xKey] ?? 0)
              const yv = row?.[s.key]
              return (
                <div key={s.key} style={{ color: s.color }}>
                  {s.label} {typeof yv === 'number' ? formatY(yv) : '—'}
                </div>
              )
            })}
        </div>
      )}
      <ul className="mt-2 m-0 flex flex-wrap gap-x-4 gap-y-1 list-none p-0">
        {series.map((s) => (
          <li
            key={s.key}
            className="flex items-center gap-1.5 font-mono text-[11px]"
            style={{ color: s.muted ? '#8B919C' : s.color, opacity: s.muted ? 0.7 : 1 }}
          >
            <span
              aria-hidden="true"
              className="inline-block h-px w-4"
              style={{
                background: s.line === false ? 'transparent' : s.color,
                borderTop: s.dash ? `1.5px dashed ${s.color}` : undefined,
                height: s.line === false ? 8 : 2,
                width: s.line === false ? 8 : 16,
                borderRadius: s.line === false ? 99 : 0,
                backgroundColor: s.line === false ? s.color : s.dash ? 'transparent' : s.color,
              }}
            />
            {s.label}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function NumericLineChart(props: NumericLineChartProps) {
  const h = props.height ?? 320
  return (
    <div style={{ height: h + 28 }} className="w-full">
      <ParentSize>
        {({ width }) => <ChartInner {...props} width={width} height={h} />}
      </ParentSize>
    </div>
  )
}
