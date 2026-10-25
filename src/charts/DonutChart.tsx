import { useState, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { colorAt } from "../lib/chart";
import { formatNumber } from "../lib/format";

export interface DonutSlice {
  id: string;
  name: string;
  value: number;
  /** Defaults to the next categorical colour in fixed order; pass a tone colour for states. */
  color?: string;
  href?: string;
}

export interface DonutChartProps {
  label: string;
  slices: DonutSlice[];
  /** Under the total in the middle, e.g. "open findings". */
  caption?: ReactNode;
  format?: (v: number) => string;
  /** Diameter in pixels. */
  size?: number;
  className?: string;
}

const R = 50;
const STROKE = 13;
const C = 2 * Math.PI * (R - STROKE / 2);

/**
 * Parts of a whole: open findings by severity, checks by state. The middle shows the total, or the slice under the
 * pointer or focus; the legend beside it names every slice with its value and share.
 */
export function DonutChart({ label, slices, caption, format = (v) => formatNumber(v), size = 148, className }: DonutChartProps) {
  const [hover, setHover] = useState<string | null>(null);
  const items = slices.map((s, i) => ({ ...s, color: s.color ?? colorAt(i) }));
  const total = items.reduce((a, s) => a + Math.max(0, s.value), 0);
  const on = items.find((s) => s.id === hover);
  const share = (v: number) => (total ? `${Math.round((v / total) * 100)}%` : "0%");
  // A 2px surface gap between slices, unless one slice is all there is.
  const gap = items.filter((s) => s.value > 0).length > 1 ? 2 : 0;
  let offset = 0;
  return (
    <figure className={cn("m-0 flex min-w-0 flex-wrap items-center gap-4", className)} aria-label={label}>
      <div className="relative shrink-0" style={{ width: size, height: size }} onPointerLeave={() => setHover(null)}>
        <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
          <circle cx={50} cy={50} r={R - STROKE / 2} fill="none" stroke="var(--oa-subtle)" strokeWidth={STROKE} />
          {total > 0 &&
            items.map((s) => {
              const len = (Math.max(0, s.value) / total) * C;
              const dash = Math.max(0, len - gap);
              const el =
                len > 0 ? (
                  <circle
                    key={s.id}
                    data-slice={s.id}
                    cx={50}
                    cy={50}
                    r={R - STROKE / 2}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={hover === s.id ? STROKE + 3 : STROKE}
                    strokeDasharray={`${dash} ${C - dash}`}
                    strokeDashoffset={-offset}
                    className="cursor-default transition-[stroke-width,opacity] duration-150"
                    style={{ opacity: hover && hover !== s.id ? 0.4 : 1 }}
                    onPointerEnter={() => setHover(s.id)}
                  />
                ) : null;
              offset += len;
              return el;
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center" data-testid="donut-center">
          <span className="text-2xl leading-7 font-semibold text-fg tabular-nums">{format(on ? on.value : total)}</span>
          <span className="max-w-[70%] truncate text-2xs text-fg-muted">{on ? on.name : caption}</span>
        </div>
      </div>
      <ul aria-label={label} className="flex min-w-36 grow flex-col">
        {items.map((s) => {
          const body = (
            <>
              <span aria-hidden className="size-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
              <span className="min-w-0 grow truncate text-xs text-fg">{s.name}</span>
              <span className="font-mono text-xs font-semibold text-fg tabular-nums">{format(s.value)}</span>
              <span className="w-9 text-right font-mono text-2xs text-fg-muted tabular-nums">{share(s.value)}</span>
            </>
          );
          const props = {
            className: cn("-mx-1.5 flex h-7 items-center gap-2 rounded px-1.5 text-fg no-underline", hover === s.id ? "bg-subtle" : "hover:bg-canvas"),
            onPointerEnter: () => setHover(s.id),
            onPointerLeave: () => setHover(null),
            onFocus: () => setHover(s.id),
            onBlur: () => setHover(null),
          };
          return (
            <li key={s.id}>
              {s.href ? (
                <a href={s.href} {...props}>
                  {body}
                </a>
              ) : (
                <div tabIndex={0} {...props}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </figure>
  );
}
