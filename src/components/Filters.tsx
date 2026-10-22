import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check, ChevronDown, Clock, Play, X } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { useT } from "./Locale";

/** One row, above the content it scopes. Date range first. */
export function FilterBar({ children, onClear, className }: { children: ReactNode; onClear?: () => void; className?: string }) {
  const t = useT();
  return (
    <div role="toolbar" aria-label={t("filters.label")} className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {children}
      {onClear && (
        <Button variant="ghost" size="sm" onClick={onClear} className="text-fg-muted">
          {t("filters.clearAll")}
        </Button>
      )}
    </div>
  );
}

export interface TimeRange {
  value: string;
  label: string;
}

export const DEFAULT_TIME_RANGES: TimeRange[] = [
  { value: "15m", label: "Last 15 minutes" },
  { value: "1h", label: "Last 1 hour" },
  { value: "6h", label: "Last 6 hours" },
  { value: "24h", label: "Last 24 hours" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
];

export interface TimeRangePickerProps {
  value: string;
  onChange: (value: string) => void;
  ranges?: TimeRange[];
  defaultOpen?: boolean;
}

/** Preset list in a popover: nobody fights a calendar for "last 24 hours". */
export function TimeRangePicker({ value, onChange, ranges: given, defaultOpen }: TimeRangePickerProps) {
  const t = useT();
  const ranges = given ?? DEFAULT_TIME_RANGES.map((r) => ({ ...r, label: t(`range.${r.value}` as "range.1h") }));
  const [open, setOpen] = useState(defaultOpen ?? false);
  const current = ranges.find((r) => r.value === value) ?? { value, label: value };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="sm" icon={<Clock aria-hidden />} iconRight={<ChevronDown aria-hidden />} aria-label={t("filters.timeRangeIs", { range: current.label })}>
          {current.label}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="oa-root z-50 w-52 rounded-lg border border-line bg-surface p-1 shadow-overlay">
          <ul role="listbox" aria-label={t("filters.timeRange")}>
            {ranges.map((r) => {
              const on = r.value === value;
              return (
                <li key={r.value} role="option" aria-selected={on}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(r.value);
                      setOpen(false);
                    }}
                    className={cn("flex h-7 w-full items-center gap-2 rounded-md px-2 text-sm hover:bg-subtle", on ? "font-semibold text-fg" : "text-fg")}
                  >
                    <span className="grow text-left">{r.label}</span>
                    {on && <Check aria-hidden className="size-4 text-accent" strokeWidth={3} />}
                  </button>
                </li>
              );
            })}
          </ul>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface FilterChipProps {
  field: string;
  value: ReactNode;
  /** Shows the field as "-field" (excluded). */
  negate?: boolean;
  onRemove?: () => void;
}

/** An applied filter, e.g. env:prod. */
export function FilterChip({ field, value, negate, onRemove }: FilterChipProps) {
  const t = useT();
  return (
    <span className="inline-flex h-7 items-stretch overflow-hidden rounded-md border border-line-strong bg-surface text-xs">
      <span className={cn("flex items-center bg-subtle px-2 font-mono", negate ? "text-warning-text" : "text-fg-muted")}>
        {negate ? "-" : ""}
        {field}
      </span>
      <span className="flex items-center px-2 font-mono text-fg">{value}</span>
      {onRemove && (
        <button type="button" aria-label={t("filters.remove", { field })} onClick={onRemove} className="grid w-6 place-items-center text-fg-muted hover:bg-subtle hover:text-fg">
          <X aria-hidden className="size-3" />
        </button>
      )}
    </span>
  );
}

export interface FacetOption {
  value: string;
  label?: ReactNode;
  count?: number;
}

export interface FacetFilterProps {
  label: string;
  options: FacetOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  /** Show a search box when there are many options. */
  searchable?: boolean;
  defaultOpen?: boolean;
}

/** Multi-select dropdown for one field: Level, Host, Severity… */
export function FacetFilter({ label, options, selected, onChange, searchable, defaultOpen }: FacetFilterProps) {
  const t = useT();
  const [open, setOpen] = useState(defaultOpen ?? false);
  const [q, setQ] = useState("");
  const shown = useMemo(() => options.filter((o) => o.value.toLowerCase().includes(q.toLowerCase())), [options, q]);
  const toggle = (v: string) => onChange(selected.includes(v) ? selected.filter((s) => s !== v) : [...selected, v]);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Button size="sm" iconRight={<ChevronDown aria-hidden />} className={cn(selected.length > 0 && "border-accent text-accent-text")}>
          {label}
          {selected.length > 0 && <span className="rounded-full bg-accent px-1.5 font-mono text-2xs text-accent-contrast">{selected.length}</span>}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="oa-root z-50 w-60 rounded-lg border border-line bg-surface p-1 shadow-overlay">
          {searchable && (
            <input
              aria-label={t("filters.search", { label })}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("filters.search", { label: label.toLowerCase() })}
              className="mb-1 h-7 w-full rounded-md border border-line px-2 text-sm"
            />
          )}
          <fieldset>
            <legend className="sr-only">{label}</legend>
            {shown.map((o) => (
              <label key={o.value} className="flex h-7 cursor-pointer items-center gap-2 rounded-md px-2 text-sm hover:bg-subtle">
                <input type="checkbox" checked={selected.includes(o.value)} onChange={() => toggle(o.value)} className="size-3.5 accent-[var(--oa-accent)]" />
                <span className="grow truncate">{o.label ?? o.value}</span>
                {o.count !== undefined && <span className="font-mono text-2xs text-fg-muted">{o.count.toLocaleString("en-US")}</span>}
              </label>
            ))}
            {shown.length === 0 && <p className="px-2 py-1.5 text-xs text-fg-muted">{t("filters.noMatches")}</p>}
          </fieldset>
          {selected.length > 0 && (
            <button type="button" onClick={() => onChange([])} className="mt-1 h-7 w-full rounded-md text-xs text-fg-muted hover:bg-subtle">
              {t("filters.clear")}
            </button>
          )}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}

export interface QueryBarProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  label?: string;
  className?: string;
}

/** Free-text query in the product's query language (Lucene-like for Logs, PromQL for Metrics). */
export function QueryBar({ value, onChange, onSubmit, placeholder = "service:api level:error", label, className }: QueryBarProps) {
  const t = useT();
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };
  return (
    <form role="search" onSubmit={submit} className={cn("flex min-w-0 grow gap-1.5", className)}>
      <input
        aria-label={label ?? t("filters.query")}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
        className="h-8 min-w-0 grow rounded-md border border-line-strong bg-surface px-2.5 font-mono text-xs text-fg placeholder:text-fg-subtle"
      />
      <Button type="submit" variant="primary" icon={<Play aria-hidden />}>
        {t("filters.run")}
      </Button>
    </form>
  );
}
