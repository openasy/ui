import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface TabItem<T extends string> {
  value: T;
  label: ReactNode;
  count?: ReactNode;
}

export interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  items: ReadonlyArray<TabItem<T>>;
  label: string;
  className?: string;
}

/** Underlined tabs for switching the scope of a page (All events / Sign-ins / Admin). */
export function Tabs<T extends string>({ value, onChange, items, label, className }: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + items.length) % items.length;
    const item = items[next];
    if (!item) return;
    onChange(item.value);
    refs.current[next]?.focus();
  };
  return (
    <div role="tablist" aria-label={label} className={cn("flex gap-1 overflow-x-auto border-b border-line", className)}>
      {items.map((t, i) => {
        const on = t.value === value;
        return (
          <button
            key={t.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            aria-selected={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(t.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "-mb-px inline-flex h-8 items-center gap-1.5 border-b-2 px-2.5 text-sm font-medium whitespace-nowrap",
              on ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className="rounded-full bg-subtle px-1.5 font-mono text-2xs text-fg-muted">{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
