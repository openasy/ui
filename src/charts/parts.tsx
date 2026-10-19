import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface LegendItem {
  id: string;
  name: string;
  color: string;
  hidden?: boolean;
}

/** Legend that mirrors the mark (line or box) and toggles series when clickable. */
export function ChartLegend({
  items,
  onToggle,
  mark = "line",
  className,
}: {
  items: LegendItem[];
  onToggle?: (id: string) => void;
  mark?: "line" | "box";
  className?: string;
}) {
  return (
    <ul aria-label="Legend" className={cn("flex flex-wrap items-center gap-1", className)}>
      {items.map((it) => {
        const key = (
          <span
            aria-hidden
            className={cn("shrink-0", mark === "line" ? "h-0.5 w-2.5 rounded-full" : "size-2.5 rounded-sm")}
            style={{ background: it.color }}
          />
        );
        return (
          <li key={it.id}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!it.hidden}
                onClick={() => onToggle(it.id)}
                className={cn(
                  "inline-flex h-6 items-center gap-1.5 rounded px-1.5 font-mono text-2xs text-fg hover:bg-subtle",
                  it.hidden && "text-fg-muted line-through",
                )}
              >
                <span className={cn("contents", it.hidden && "[&>span]:opacity-30")}>{key}</span>
                {it.name}
              </button>
            ) : (
              <span className="inline-flex h-6 items-center gap-1.5 px-1 text-xs text-fg-muted">
                {key}
                {it.name}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export interface TooltipRow {
  id: string;
  color: string;
  value: ReactNode;
  name: ReactNode;
  emphasis?: boolean;
}

/** Values lead, names follow; keyed with a short stroke of the series colour. */
export function ChartTooltip({
  title,
  rows,
  mark = "line",
  className,
  style,
}: {
  title: ReactNode;
  rows: TooltipRow[];
  mark?: "line" | "box";
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      role="status"
      className={cn(
        "pointer-events-none absolute z-10 flex min-w-36 flex-col gap-1 rounded-md border border-line bg-surface px-2 py-1.5 shadow-overlay",
        className,
      )}
      style={style}
    >
      <span className="font-mono text-2xs text-fg-muted">{title}</span>
      {rows.map((r) => (
        <span key={r.id} className={cn("-mx-1 grid grid-cols-[10px_auto_1fr] items-center gap-1.5 rounded px-1", r.emphasis && "bg-subtle")} data-emphasis={r.emphasis || undefined}>
          <span
            aria-hidden
            className={mark === "line" ? "h-0.5 w-2.5 rounded-full" : "size-2.5 rounded-sm"}
            style={{ background: r.color }}
          />
          <span className="font-mono text-xs font-semibold tabular-nums text-fg">{r.value}</span>
          <span className="truncate text-2xs text-fg-muted">{r.name}</span>
        </span>
      ))}
    </div>
  );
}
