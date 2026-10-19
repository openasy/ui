import { useState } from "react";
import { cn } from "../lib/cn";
import { colorAt } from "../lib/chart";
import { formatNumber } from "../lib/format";
import { ChartLegend, ChartTooltip } from "./parts";

export interface BarSegment {
  id: string;
  name: string;
  color?: string;
}

export interface StackedBarChartProps {
  label: string;
  /** Category per bar, e.g. hour labels. */
  categories: string[];
  /** Stack order bottom to top. */
  segments: BarSegment[];
  /** values[categoryIndex][segmentIndex] */
  values: number[][];
  height?: number;
  format?: (v: number) => string;
  /** Number of category labels on the axis. */
  xTicks?: number;
  className?: string;
}

/** Counts per bucket split by a category, with a per-segment tooltip. */
export function StackedBarChart({ label, categories, segments, values, height = 160, format = (v) => formatNumber(v), xTicks = 5, className }: StackedBarChartProps) {
  const [hover, setHover] = useState<{ i: number; k: number } | null>(null);
  const segs = segments.map((s, i) => ({ ...s, color: s.color ?? colorAt(i) }));
  const totals = values.map((row) => row.reduce((a, b) => a + b, 0));
  const max = Math.max(1, ...totals);
  const ticks = Array.from({ length: Math.min(xTicks, categories.length) }, (_, k) =>
    xTicks <= 1 ? 0 : Math.round((k / (xTicks - 1)) * (categories.length - 1)),
  );
  return (
    <figure className={cn("m-0 flex min-w-0 flex-col gap-1.5", className)} aria-label={label}>
      <ChartLegend items={segs.map((s) => ({ id: s.id, name: s.name, color: s.color }))} mark="box" />
      <div className="relative flex items-end gap-[3px] border-b border-chart-axis" style={{ height }} onPointerLeave={() => setHover(null)}>
        {values.map((row, i) => (
          <div
            key={i}
            className="flex grow flex-col-reverse gap-[2px] overflow-hidden rounded-t-[3px]"
            style={{ height: `${(totals[i]! / max) * 100}%` }}
            data-testid="bar"
          >
            {row.map((v, k) =>
              v > 0 ? (
                <button
                  key={k}
                  type="button"
                  aria-label={`${categories[i]}: ${segs[k]?.name} ${format(v)}`}
                  onPointerEnter={() => setHover({ i, k })}
                  onFocus={() => setHover({ i, k })}
                  onBlur={() => setHover(null)}
                  className="block w-full cursor-default transition-opacity"
                  style={{ flex: `${v} 0 0px`, background: segs[k]?.color, opacity: hover && hover.i !== i ? 0.45 : 1 }}
                />
              ) : null,
            )}
          </div>
        ))}
        {hover && (
          <ChartTooltip
            mark="box"
            title={categories[hover.i]}
            style={{ left: `${((hover.i + 0.5) / values.length) * 100}%`, bottom: "100%", transform: "translate(-50%, -6px)" }}
            rows={segs.map((s, k) => ({ id: s.id, color: s.color, value: format(values[hover.i]?.[k] ?? 0), name: s.name, emphasis: k === hover.k }))}
          />
        )}
      </div>
      <div aria-hidden className="flex justify-between font-mono text-2xs text-fg-muted">
        {ticks.map((i, k) => (
          <span key={k}>{categories[i]}</span>
        ))}
      </div>
    </figure>
  );
}
