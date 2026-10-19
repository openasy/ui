import { useId, useMemo, useState, type KeyboardEvent, type PointerEvent } from "react";
import { cn } from "../lib/cn";
import { colorAt, indexFromPointer, niceScale, smoothPath, type Point } from "../lib/chart";
import { formatNumber } from "../lib/format";
import { useChartSync } from "./ChartSync";
import { ChartLegend, ChartTooltip } from "./parts";

export interface TimeSeries {
  id: string;
  name: string;
  data: number[];
  /** Defaults to the next categorical colour in fixed order. */
  color?: string;
}

export interface TimeSeriesChartProps {
  /** Accessible description of what the chart shows. */
  label: string;
  series: TimeSeries[];
  /** One label per data point, e.g. "14:05". */
  labels: string[];
  height?: number;
  /** Fixed y maximum; otherwise a nice bound above the data. */
  yMax?: number;
  format?: (value: number) => string;
  /** Fill under each line with a soft gradient. */
  area?: boolean;
  /** Stack series on top of each other (areas sum to a total). */
  stacked?: boolean;
  threshold?: { value: number; label?: string };
  /** Number of x-axis labels to show. */
  xTicks?: number;
  /** Show the legend (default: when there are 2+ series). */
  legend?: boolean;
  /** Start with these series hidden. */
  defaultHidden?: string[];
  className?: string;
}

const VB_W = 1000;

/**
 * Lines or areas over time with a crosshair that reads every series at once.
 * Inside <ChartSync> the crosshair is shared with sibling charts.
 */
export function TimeSeriesChart({
  label,
  series,
  labels,
  height = 200,
  yMax,
  format = (v) => formatNumber(v),
  area = true,
  stacked = false,
  threshold,
  xTicks = 5,
  legend,
  defaultHidden = [],
  className,
}: TimeSeriesChartProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const sync = useChartSync();
  const [localHover, setLocalHover] = useState<number | null>(null);
  const [hidden, setHidden] = useState<string[]>(defaultHidden);

  const n = labels.length;
  const colored = series.map((s, i) => ({ ...s, color: s.color ?? colorAt(i) }));
  const visible = colored.filter((s) => !hidden.includes(s.id));

  const { stacks, max } = useMemo(() => {
    const base = Array.from({ length: n }, () => 0);
    const stacks = visible.map((s) => {
      const lower = base.slice();
      const upper = s.data.slice(0, n).map((v, i) => (stacked ? lower[i]! + v : v));
      if (stacked) upper.forEach((v, i) => (base[i] = v));
      return { s, lower: stacked ? lower : base.map(() => 0), upper };
    });
    let m = 0;
    stacks.forEach((st) => st.upper.forEach((v) => (m = Math.max(m, v))));
    if (threshold) m = Math.max(m, threshold.value);
    return { stacks, max: m };
  }, [visible, n, stacked, threshold]);

  const scale = niceScale(max, 4);
  const top = yMax ?? scale.max;
  const ticks = yMax ? [0, 1, 2, 3, 4].map((k) => (yMax * k) / 4) : scale.ticks;
  const y = (v: number) => height - (Math.min(v, top) / top) * (height - 2);
  const x = (i: number) => (n <= 1 ? 0 : (i / (n - 1)) * VB_W);

  const hoverIndex = sync ? sync.index : localHover;
  const ownsTooltip = sync ? sync.source === uid : localHover !== null;
  const setHover = (i: number | null) => {
    if (sync) sync.setHover(i, i === null ? null : uid);
    else setLocalHover(i);
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const i = indexFromPointer(e.clientX, e.currentTarget.getBoundingClientRect(), n);
    if (i !== hoverIndex || !ownsTooltip) setHover(i);
  };
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const cur = hoverIndex ?? n - 1;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setHover(Math.max(0, cur - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setHover(Math.min(n - 1, cur + 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      setHover(0);
    } else if (e.key === "End") {
      e.preventDefault();
      setHover(n - 1);
    } else if (e.key === "Escape") {
      setHover(null);
    }
  };

  const tickIdx = Array.from({ length: Math.min(xTicks, n) }, (_, k) => (xTicks <= 1 ? 0 : Math.round((k / (xTicks - 1)) * (n - 1))));
  const showLegend = legend ?? series.length > 1;
  const pct = hoverIndex !== null && n > 1 ? (hoverIndex / (n - 1)) * 100 : 0;

  return (
    <figure className={cn("m-0 flex min-w-0 flex-col gap-1.5", className)} aria-label={label}>
      {showLegend && (
        <ChartLegend
          items={colored.map((s) => ({ id: s.id, name: s.name, color: s.color, hidden: hidden.includes(s.id) }))}
          onToggle={(id) => setHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]))}
        />
      )}
      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-1.5">
        <div aria-hidden className="relative min-w-6 font-mono text-2xs whitespace-nowrap text-fg-muted" style={{ height }}>
          {/* Invisible copy of the widest label sizes the axis column. */}
          <span className="invisible block">{ticks.map((t) => format(t)).reduce((a, b) => (b.length > a.length ? b : a), "")}</span>
          {ticks.map((t) => (
            <span key={t} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - t / top) * 100}%` }}>
              {format(t)}
            </span>
          ))}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <div className="relative" style={{ height }}>
            <svg aria-hidden viewBox={`0 0 ${VB_W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
              <defs>
                {stacks.map(({ s }) => (
                  <linearGradient key={s.id} id={`${uid}-${s.id}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={s.color} stopOpacity={stacked ? 0.35 : 0.18} />
                    <stop offset="1" stopColor={s.color} stopOpacity={stacked ? 0.12 : 0} />
                  </linearGradient>
                ))}
              </defs>
              {ticks.map((t, i) => (
                <line
                  key={t}
                  x1="0"
                  x2={VB_W}
                  y1={y(t)}
                  y2={y(t)}
                  stroke={i === 0 ? "var(--oa-chart-axis)" : "var(--oa-chart-grid)"}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
              {threshold && (
                <line
                  x1="0"
                  x2={VB_W}
                  y1={y(threshold.value)}
                  y2={y(threshold.value)}
                  stroke="var(--oa-danger)"
                  strokeDasharray="4 4"
                  vectorEffect="non-scaling-stroke"
                  data-testid="threshold"
                />
              )}
              {area &&
                stacks.map(({ s, lower, upper }) => {
                  const up: Point[] = upper.map((v, i) => [x(i), y(v)]);
                  const lo: Point[] = lower.map((v, i): Point => [x(i), y(v)]).reverse();
                  const d = `${smoothPath(up)} ${smoothPath(lo).replace(/^M/, "L")} Z`;
                  return <path key={s.id} d={d} fill={`url(#${uid}-${s.id})`} />;
                })}
              {stacks.map(({ s, upper }) => (
                <path
                  key={s.id}
                  data-series={s.id}
                  d={smoothPath(upper.map((v, i) => [x(i), y(v)] as Point))}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </svg>
            {threshold?.label && (
              <span
                className="pointer-events-none absolute right-1 -translate-y-full font-mono text-2xs text-danger-text"
                style={{ top: `${(y(threshold.value) / height) * 100}%` }}
              >
                {threshold.label}
              </span>
            )}
            {hoverIndex !== null && (
              <>
                <span aria-hidden className="pointer-events-none absolute inset-y-0 w-px bg-fg/35" style={{ left: `${pct}%` }} data-testid="crosshair" />
                {stacks.map(({ s, upper }) => (
                  <span
                    key={s.id}
                    aria-hidden
                    className="pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
                    style={{ left: `${pct}%`, top: `${(y(upper[hoverIndex] ?? 0) / height) * 100}%`, background: s.color }}
                  />
                ))}
                {ownsTooltip && (
                  <ChartTooltip
                    title={labels[hoverIndex]}
                    style={{ left: `${pct}%`, top: 4, transform: pct > 60 ? "translateX(calc(-100% - 10px))" : "translateX(10px)" }}
                    rows={[...stacks]
                      .sort((a, b) => (b.s.data[hoverIndex] ?? 0) - (a.s.data[hoverIndex] ?? 0))
                      .map(({ s }) => ({ id: s.id, color: s.color, value: format(s.data[hoverIndex] ?? 0), name: s.name }))}
                  />
                )}
              </>
            )}
            <div
              role="slider"
              tabIndex={0}
              aria-label={`${label}. Use arrow keys to read values.`}
              aria-valuemin={0}
              aria-valuemax={Math.max(0, n - 1)}
              aria-valuenow={hoverIndex ?? n - 1}
              aria-valuetext={labels[hoverIndex ?? n - 1]}
              onPointerMove={onMove}
              onPointerLeave={() => setHover(null)}
              onKeyDown={onKey}
              onBlur={() => setHover(null)}
              className="absolute inset-0 cursor-crosshair rounded-sm"
              data-testid="chart-hit"
            />
          </div>
          <div aria-hidden className="flex justify-between font-mono text-2xs text-fg-muted">
            {tickIdx.map((i, k) => (
              <span key={k}>{labels[i]}</span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
