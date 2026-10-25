import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { TONE_COLORS, type Tone } from "../tokens/levels";

export interface StatusCell {
  id: string;
  /** The bucket, e.g. "12 Oct". */
  label: string;
  /** neutral reads as "no data". */
  tone: Tone;
  /** What happened in it, e.g. "99.2% up, 1 outage". */
  detail?: ReactNode;
}

export interface StatusStripProps {
  label: string;
  cells: StatusCell[];
  height?: number;
  /** Words under the first and last cell, e.g. "90 days ago" and "Today". */
  start?: ReactNode;
  end?: ReactNode;
  className?: string;
}

/** One bar per day or run, coloured by how it went, like a status page. */
export function StatusStrip({ label, cells, height = 32, start, end, className }: StatusStripProps) {
  const [hover, setHover] = useState<number | null>(null);
  const on = hover === null ? undefined : cells[hover];
  return (
    <figure className={cn("m-0 flex min-w-0 flex-col gap-1", className)} aria-label={label}>
      <div className="relative flex gap-[2px]" style={{ height }} onPointerLeave={() => setHover(null)}>
        {cells.map((c, i) => (
          <button
            key={c.id}
            type="button"
            data-tone={c.tone}
            aria-label={`${c.label}${typeof c.detail === "string" ? `: ${c.detail}` : ""}`}
            onPointerEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="min-w-[2px] grow cursor-default rounded-[2px] transition-opacity"
            style={{
              background: c.tone === "neutral" ? "var(--oa-subtle)" : TONE_COLORS[c.tone],
              opacity: hover !== null && hover !== i ? 0.55 : 1,
            }}
          />
        ))}
        {on && hover !== null && (
          <div
            role="status"
            className="pointer-events-none absolute bottom-full z-10 mb-1.5 flex min-w-32 flex-col gap-0.5 rounded-md border border-line bg-surface px-2 py-1.5 shadow-overlay"
            style={{
              left: `${((hover + 0.5) / cells.length) * 100}%`,
              transform: hover / cells.length > 0.7 ? "translateX(-100%)" : hover / cells.length < 0.3 ? "none" : "translateX(-50%)",
            }}
          >
            <span className="font-mono text-2xs text-fg-muted">{on.label}</span>
            {on.detail && <span className="text-xs text-fg">{on.detail}</span>}
          </div>
        )}
      </div>
      {(start || end) && (
        <div aria-hidden className="flex justify-between font-mono text-2xs text-fg-muted">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      )}
    </figure>
  );
}
