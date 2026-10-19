import { useId, useState } from "react";
import { cn } from "../lib/cn";
import { indexFromPointer, smoothPath, type Point } from "../lib/chart";

export interface SparklineProps {
  data: number[];
  /** Accessible name, e.g. "Sessions over 24 hours". */
  label: string;
  height?: number;
  color?: string;
  /** Formats the hover readout. */
  format?: (value: number, index: number) => string;
  className?: string;
}

/** Tiny trend without axes. Hover shows the value at that point. */
export function Sparkline({ data, label, height = 32, color = "var(--oa-accent)", format, className }: SparklineProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const W = 300;
  const n = data.length;
  const max = Math.max(...data, 0) * 1.1 || 1;
  const min = Math.min(...data, 0);
  const pts: Point[] = data.map((v, i) => [n <= 1 ? 0 : (i / (n - 1)) * W, height - 1 - ((v - min) / (max - min || 1)) * (height - 4)]);
  const line = smoothPath(pts);
  const last = data[n - 1];
  return (
    <div className={cn("relative", className)} style={{ height }}>
      <svg role="img" aria-label={`${label}${last !== undefined ? `, latest ${last}` : ""}`} viewBox={`0 0 ${W} ${height}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
        <defs>
          <linearGradient id={uid} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity={0.22} />
            <stop offset="1" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        {n > 1 && <path d={`${line} L${W},${height} L0,${height} Z`} fill={`url(#${uid})`} />}
        <path d={line} fill="none" stroke={color} strokeWidth={1.75} vectorEffect="non-scaling-stroke" />
      </svg>
      {hover !== null && pts[hover] && (
        <>
          <span aria-hidden className="absolute inset-y-0 w-px bg-fg/30" style={{ left: `${(pts[hover][0] / W) * 100}%` }} />
          <span
            aria-hidden
            className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
            style={{ left: `${(pts[hover][0] / W) * 100}%`, top: `${(pts[hover][1] / height) * 100}%`, background: color }}
          />
          <span className="pointer-events-none absolute -top-5 right-0 rounded bg-fg px-1 font-mono text-2xs text-surface" data-testid="spark-readout">
            {format ? format(data[hover]!, hover) : data[hover]}
          </span>
        </>
      )}
      <div
        aria-hidden
        className="absolute inset-0"
        onPointerMove={(e) => setHover(indexFromPointer(e.clientX, e.currentTarget.getBoundingClientRect(), n))}
        onPointerLeave={() => setHover(null)}
        data-testid="spark-hit"
      />
    </div>
  );
}
