import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "../lib/cn";

export interface SegmentOption<T extends string> {
  value: T;
  label: ReactNode;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentOption<T>>;
  /** Accessible name of the group. */
  label: string;
  size?: "sm" | "md";
  className?: string;
}

/** Single choice among 2–6 options, e.g. Hosts / Containers / Kubernetes. */
export function SegmentedControl<T extends string>({ value, onChange, options, label, size = "sm", className }: SegmentedControlProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const onKey = (e: KeyboardEvent, index: number) => {
    const dir = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!dir) return;
    e.preventDefault();
    const next = (index + dir + options.length) % options.length;
    const opt = options[next];
    if (!opt) return;
    onChange(opt.value);
    refs.current[next]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex gap-0.5 rounded-md bg-subtle p-0.5", className)}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKey(e, i)}
            className={cn(
              "rounded px-2.5 font-medium whitespace-nowrap transition-colors",
              size === "sm" ? "h-6 text-xs" : "h-7 text-sm",
              on ? "bg-surface text-fg shadow-raised" : "text-fg-muted hover:text-fg",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
