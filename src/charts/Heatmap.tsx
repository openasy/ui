import { useState } from "react";
import { cn } from "../lib/cn";
import { SEQUENTIAL_RAMP } from "../lib/chart";
import { formatNumber } from "../lib/format";

export interface HeatmapProps {
  label: string;
  /** Row labels, top to bottom. */
  rows: string[];
  /** Column labels, left to right. */
  columns: string[];
  /** values[row][column] */
  values: number[][];
  format?: (v: number) => string;
  /** Unit for the readout, e.g. "requests". */
  unit?: string;
  cellHeight?: number;
  className?: string;
}

/** Magnitude over two dimensions in one sequential hue, light to dark. */
export function Heatmap({ label, rows, columns, values, format = (v) => formatNumber(v), unit = "", cellHeight = 20, className }: HeatmapProps) {
  const [hover, setHover] = useState<{ r: number; c: number } | null>(null);
  const max = Math.max(1, ...values.flat());
  const level = (v: number) => (v <= 0 ? 0 : Math.min(SEQUENTIAL_RAMP.length - 1, 1 + Math.floor((v / max) * (SEQUENTIAL_RAMP.length - 1))));
  const readout = hover
    ? `${columns[hover.c]} · ${rows[hover.r]} · ${format(values[hover.r]?.[hover.c] ?? 0)}${unit ? ` ${unit}` : ""}`
    : "Hover a cell";
  return (
    <figure className={cn("m-0 flex min-w-0 flex-col gap-1.5", className)} aria-label={label}>
      <figcaption aria-live="polite" className="text-right font-mono text-2xs text-fg-muted" data-testid="heatmap-readout">
        {readout}
      </figcaption>
      <div className="grid grid-cols-[64px_minmax(0,1fr)] gap-2" onPointerLeave={() => setHover(null)}>
        <div className="flex flex-col gap-[2px]">
          {rows.map((r) => (
            <span key={r} className="flex items-center justify-end font-mono text-2xs text-fg-muted" style={{ height: cellHeight }}>
              {r}
            </span>
          ))}
        </div>
        <div className="flex flex-col gap-[2px]">
          {values.map((row, r) => (
            <div key={r} className="grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` }}>
              {row.map((v, c) => {
                const on = hover?.r === r && hover.c === c;
                return (
                  <span
                    key={c}
                    data-level={level(v)}
                    onPointerEnter={() => setHover({ r, c })}
                    className={cn("rounded-[2px]", on && "ring-2 ring-fg")}
                    style={{ height: cellHeight, background: SEQUENTIAL_RAMP[level(v)] }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div aria-hidden className="flex items-center justify-between pl-[72px] font-mono text-2xs text-fg-muted">
        <span>{columns[0]}</span>
        <span className="flex items-center gap-1">
          fewer
          {SEQUENTIAL_RAMP.map((c) => (
            <span key={c} className="h-2.5 w-3.5 rounded-[2px]" style={{ background: c }} />
          ))}
          more
        </span>
        <span>{columns[columns.length - 1]}</span>
      </div>
    </figure>
  );
}
