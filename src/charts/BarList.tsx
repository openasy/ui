import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { formatNumber } from "../lib/format";

export interface BarListItem {
  id: string;
  label: ReactNode;
  value: number;
  href?: string;
  /** Override the bar colour, e.g. a status tone for hot hosts. */
  color?: string;
}

export interface BarListProps {
  label: string;
  items: BarListItem[];
  /** Upper bound of the bars (default: largest value). */
  max?: number;
  format?: (v: number) => string;
  className?: string;
}

/** Ranked list with inline bars: top hosts, top rules, top sources. */
export function BarList({ label, items, max, format = (v) => formatNumber(v), className }: BarListProps) {
  const top = max ?? Math.max(1, ...items.map((i) => i.value));
  return (
    <ul aria-label={label} className={cn("flex flex-col", className)}>
      {items.map((it) => {
        const body = (
          <>
            <span className="truncate font-mono text-xs text-fg">{it.label}</span>
            <span className="h-2 overflow-hidden rounded-r-[3px] bg-subtle">
              <span
                className="block h-2 rounded-r-[3px] transition-[filter] group-hover:brightness-90"
                style={{ width: `${Math.min(100, (it.value / top) * 100)}%`, background: it.color ?? "var(--oa-accent)" }}
              />
            </span>
            <span className="text-right font-mono text-xs font-semibold whitespace-nowrap tabular-nums">{format(it.value)}</span>
          </>
        );
        const cls =
          "group -mx-1.5 grid h-7 grid-cols-[minmax(0,140px)_minmax(0,1fr)_minmax(44px,auto)] items-center gap-2.5 rounded px-1.5 text-fg no-underline hover:bg-canvas";
        return (
          <li key={it.id}>
            {it.href ? (
              <a href={it.href} className={cls}>
                {body}
              </a>
            ) : (
              <div className={cls}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
