import { createContext, useContext, useState, type ReactNode } from "react";
import { Bookmark, Download, Plus } from "lucide-react";
import { Button } from "../../../components/Button";
import { Badge } from "../../../components/Badge";
import { Dialog } from "../../../components/Dialog";
import { SelectField, Switch, TextField } from "../../../components/Controls";
import { SegmentedControl } from "../../../components/SegmentedControl";
import { FilterBar, FilterChip, TimeRangePicker } from "../../../components/Filters";
import type { KpiDelta } from "../../../components/Kpi";
import { niceScale } from "../../../lib/chart";
import { cn } from "../../../lib/cn";
import { TEAM, type FlowLink, type FlowNode } from "./data";

// Pieces every Analytics report shares: the filter bar with its saved segments and comparison, CSV export on tables,
// and the few drawings no library chart covers (the path flow, the cohort grid and the annotation strip).

/* ------------------------------------------------------------ filters */

/** Each dimension a report can be filtered by, with the share of visits each value has, so a filter narrows the counts. */
export const DIMENSIONS: Array<{ id: string; label: string; values: Array<[string, number]> }> = [
  {
    id: "channel",
    label: "Channel",
    values: [
      ["Organic search", 0.354],
      ["Direct", 0.223],
      ["Email", 0.146],
      ["Referral", 0.09],
      ["Social", 0.081],
      ["Paid search", 0.069],
      ["AI assistants", 0.038],
    ],
  },
  {
    id: "source",
    label: "Source",
    values: [
      ["google.com", 0.32],
      ["newsletter", 0.146],
      ["linkedin.com", 0.046],
      ["chatgpt.com", 0.02],
    ],
  },
  {
    id: "campaign",
    label: "Campaign",
    values: [
      ["fall-2026", 0.146],
      ["brand-tr", 0.069],
      ["launch-week", 0.039],
    ],
  },
  {
    id: "page",
    label: "Page",
    values: [
      ["/", 0.31],
      ["/pricing", 0.08],
      ["/products/espresso-beans", 0.1],
      ["/blog/how-to-brew-filter-coffee", 0.14],
    ],
  },
  {
    id: "entry",
    label: "Entry page",
    values: [
      ["/", 0.157],
      ["/blog/how-to-brew-filter-coffee", 0.134],
      ["/products/espresso-beans", 0.049],
    ],
  },
  {
    id: "country",
    label: "Country",
    values: [
      ["Türkiye", 0.72],
      ["Germany", 0.089],
      ["Netherlands", 0.039],
      ["United Kingdom", 0.033],
    ],
  },
  {
    id: "city",
    label: "City",
    values: [
      ["Istanbul", 0.3],
      ["Ankara", 0.11],
      ["Izmir", 0.086],
      ["Berlin", 0.022],
    ],
  },
  {
    id: "device",
    label: "Device",
    values: [
      ["Desktop", 0.5],
      ["Mobile", 0.45],
      ["Tablet", 0.05],
    ],
  },
  {
    id: "browser",
    label: "Browser",
    values: [
      ["Chrome", 0.454],
      ["Safari", 0.261],
      ["Edge", 0.071],
      ["Yandex Browser", 0.067],
      ["Firefox", 0.053],
    ],
  },
  {
    id: "os",
    label: "Operating system",
    values: [
      ["Windows", 0.418],
      ["Android", 0.283],
      ["iOS", 0.164],
      ["macOS", 0.094],
    ],
  },
  {
    id: "language",
    label: "Language",
    values: [
      ["tr-TR", 0.699],
      ["en-US", 0.115],
      ["de-DE", 0.075],
    ],
  },
  {
    id: "visitor",
    label: "New or returning",
    values: [
      ["New", 0.63],
      ["Returning", 0.37],
    ],
  },
  {
    id: "goal",
    label: "Reached goal",
    values: [
      ["Bought", 0.0099],
      ["Signed up", 0.0144],
      ["Contact sent", 0.0056],
    ],
  },
];

export interface ReportFilter {
  dimension: string;
  exclude: boolean;
  value: string;
}

export interface Segment {
  id: string;
  name: string;
  filters: ReportFilter[];
  /** Everyone on the team sees it; otherwise only its owner. */
  shared: boolean;
  by: string;
}

export const SEGMENTS: Segment[] = [
  { id: "mobile-tr", name: "Mobile in Türkiye", filters: [cf("device", "Mobile"), cf("country", "Türkiye")], shared: true, by: TEAM.zeynep.name },
  { id: "paid", name: "Paid search", filters: [cf("channel", "Paid search")], shared: true, by: TEAM.zeynep.name },
  { id: "returning-buyers", name: "Returning buyers", filters: [cf("visitor", "Returning"), cf("goal", "Bought")], shared: false, by: TEAM.elif.name },
];

function cf(dimension: string, value: string, exclude = false): ReportFilter {
  return { dimension, value, exclude };
}

const dimension = (id: string) => DIMENSIONS.find((d) => d.id === id)!;
const share = (f: ReportFilter) => {
  const s = dimension(f.dimension).values.find(([v]) => v === f.value)?.[1] ?? 0.3;
  return f.exclude ? 1 - s : s;
};

export type Compare = "off" | "previous" | "year";

export const PERIODS = [
  { value: "today", label: "Today", previous: "yesterday", lastYear: "Nov 8, 2025" },
  { value: "7d", label: "Last 7 days", previous: "Oct 26 to Nov 1", lastYear: "Nov 2 to 8, 2025" },
  { value: "30d", label: "Last 30 days", previous: "Sep 10 to Oct 9", lastYear: "Oct 10 to Nov 8, 2025" },
  { value: "90d", label: "Last 90 days", previous: "May 12 to Aug 10", lastYear: "Aug 11 to Nov 8, 2025" },
  { value: "12mo", label: "Last 12 months", previous: "Nov 2024 to Oct 2025", lastYear: "Nov 2024 to Oct 2025" },
];

interface ReportState {
  site: string;
  setSite: (v: string) => void;
  period: string;
  setPeriod: (v: string) => void;
  compare: Compare;
  setCompare: (v: Compare) => void;
  filters: ReportFilter[];
  setFilters: (f: ReportFilter[]) => void;
  segment: string;
  setSegment: (id: string) => void;
  segments: Segment[];
  addSegment: (s: Segment) => void;
  /** The share of visits the filters and the segment keep, 1 with none. */
  scale: number;
  /** Narrows a count to the filtered visits. */
  sc: (n: number) => number;
  /** The tab a story opens a page at. */
  startTab?: string;
}

const Ctx = createContext<ReportState | null>(null);

/** Keeps the filter bar's choices while moving between reports, as the product keeps them in the address. */
export function ReportProvider({ children, startTab, compare: startCompare = "off" }: { children: ReactNode; startTab?: string; compare?: Compare }) {
  const [site, setSite] = useState("shop");
  const [period, setPeriod] = useState("30d");
  const [compare, setCompare] = useState<Compare>(startCompare);
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  const [segment, setSegment] = useState("");
  const [segments, setSegments] = useState(SEGMENTS);
  const active = [...filters, ...(segments.find((s) => s.id === segment)?.filters ?? [])];
  const scale = active.reduce((n, f) => n * share(f), 1);
  const value: ReportState = {
    site,
    setSite,
    period,
    setPeriod,
    compare,
    setCompare,
    filters,
    setFilters,
    segment,
    setSegment,
    segments,
    addSegment: (s) => setSegments((all) => [...all, s]),
    scale,
    sc: (n) => Math.round(n * scale),
    startTab,
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useReport(): ReportState {
  const r = useContext(Ctx);
  if (!r) throw new Error("useReport needs a ReportProvider");
  return r;
}

/** The tab a page opens at: the story's when it is one of the page's, else the first. */
export function useTab<T extends string>(tabs: readonly T[]): [T, (t: T) => void] {
  const { startTab } = useReport();
  return useState<T>(tabs.includes(startTab as T) ? (startTab as T) : tabs[0]!);
}

/** The change against the comparison the bar asks for, as a KPI delta. */
export function useDelta() {
  const { compare } = useReport();
  return (now: number, previous: number, lastYear: number = previous, opts: { lowerIsBetter?: boolean; points?: boolean } = {}): KpiDelta | undefined => {
    if (compare === "off") return undefined;
    const then = compare === "year" ? lastYear : previous;
    const diff = opts.points ? now - then : ((now - then) / then) * 100;
    const up = diff > 0;
    const label = `${up ? "+" : ""}${diff.toFixed(1)}${opts.points ? " pts" : "%"} vs ${compare === "year" ? "last year" : "previous period"}`;
    return { label, direction: Math.abs(diff) < 0.05 ? "flat" : up ? "up" : "down", intent: up !== !!opts.lowerIsBetter ? "good" : "bad" };
  };
}

/** Site, period, comparison, segment and filters: the same row at the top of every report. */
export function ReportBar({ live }: { live?: boolean }) {
  const r = useReport();
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const segment = r.segments.find((s) => s.id === r.segment);
  const period = PERIODS.find((p) => p.value === r.period)!;
  return (
    <>
      <FilterBar
        onClear={
          r.filters.length || r.segment
            ? () => {
                r.setFilters([]);
                r.setSegment("");
              }
            : undefined
        }
      >
        <SelectField
          aria-label="Site"
          className="w-28"
          value={r.site}
          onChange={(e) => r.setSite(e.target.value)}
          options={[
            { value: "shop", label: "shop" },
            { value: "docs", label: "docs" },
          ]}
        />
        {!live && <TimeRangePicker size="md" value={r.period} onChange={r.setPeriod} ranges={PERIODS} />}
        {!live && (
          <SelectField
            aria-label="Compare with"
            className="w-52"
            title={r.compare === "off" ? undefined : `Compared with ${r.compare === "year" ? period.lastYear : period.previous}`}
            value={r.compare}
            onChange={(e) => r.setCompare(e.target.value as Compare)}
            options={[
              { value: "off", label: "No comparison" },
              { value: "previous", label: "Previous period" },
              { value: "year", label: "Same period last year" },
            ]}
          />
        )}
        <SelectField
          aria-label="Segment"
          className="w-48"
          value={r.segment}
          onChange={(e) => r.setSegment(e.target.value)}
          options={[{ value: "", label: "All visits" }, ...r.segments.map((s) => ({ value: s.id, label: s.name }))]}
        />
        {r.filters.map((f, i) => (
          <FilterChip
            key={`${f.dimension}-${f.value}-${i}`}
            field={dimension(f.dimension).label}
            value={f.value}
            negate={f.exclude}
            onRemove={() => r.setFilters(r.filters.filter((_, j) => j !== i))}
          />
        ))}
        <Button icon={<Plus aria-hidden />} onClick={() => setAdding(true)}>
          Add filter
        </Button>
        {r.filters.length > 0 && (
          <Button variant="ghost" icon={<Bookmark aria-hidden />} onClick={() => setSaving(true)}>
            Save as segment
          </Button>
        )}
        {r.scale < 1 && (
          <Badge tone="info" title={segment ? `Segment ${segment.name}: ${segment.filters.map(chipText).join(", ")}` : undefined}>
            {Math.round(r.scale * 1000) / 10}% of visits
          </Badge>
        )}
      </FilterBar>
      <AddFilterDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={(f) => {
          r.setFilters([...r.filters, f]);
          setAdding(false);
        }}
      />
      <SaveSegmentDialog
        open={saving}
        onOpenChange={setSaving}
        filters={r.filters}
        onSave={(name, shared) => {
          const id = `s-${r.segments.length + 1}`;
          r.addSegment({ id, name, filters: r.filters, shared, by: TEAM.emily.name });
          r.setFilters([]);
          r.setSegment(id);
          setSaving(false);
        }}
      />
    </>
  );
}

const chipText = (f: ReportFilter) => `${dimension(f.dimension).label} ${f.exclude ? "is not" : "is"} ${f.value}`;

function AddFilterDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (f: ReportFilter) => void }) {
  const [dim, setDim] = useState("country");
  const [mode, setMode] = useState<"is" | "not">("is");
  const values = dimension(dim).values;
  const [value, setValue] = useState(values[0]![0]);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a filter"
      description="Every report keeps only the visits that match, until the filter is removed."
      onSubmit={(e) => {
        e.preventDefault();
        onAdd({ dimension: dim, exclude: mode === "not", value });
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Add filter
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SelectField
          label="Dimension"
          value={dim}
          onChange={(e) => {
            setDim(e.target.value);
            setValue(dimension(e.target.value).values[0]![0]);
          }}
          options={DIMENSIONS.map((d) => ({ value: d.id, label: d.label }))}
        />
        <SegmentedControl
          label="Match"
          value={mode}
          onChange={setMode}
          options={[
            { value: "is", label: "Include" },
            { value: "not", label: "Exclude" },
          ]}
        />
        <SelectField label="Value" value={value} onChange={(e) => setValue(e.target.value)} options={values.map(([v]) => ({ value: v, label: v }))} />
      </div>
    </Dialog>
  );
}

function SaveSegmentDialog({
  open,
  onOpenChange,
  filters,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  filters: ReportFilter[];
  onSave: (name: string, shared: boolean) => void;
}) {
  const [name, setName] = useState("");
  const [shared, setShared] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Save as segment"
      description={filters.map(chipText).join(", ")}
      onSubmit={(e) => {
        e.preventDefault();
        if (name.trim()) onSave(name.trim(), shared);
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Save segment
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Desktop visitors from Germany" />
        <Switch checked={shared} onCheckedChange={setShared} label="Share with the team" description="Off: only you see it in the segment list." />
      </div>
    </Dialog>
  );
}

/* ---------------------------------------------------------------- csv */

/** Exports a table as it is shown, filters applied, as a CSV file. */
export function CsvButton<T>({ name, rows, columns }: { name: string; rows: T[]; columns: Array<[string, (row: T) => string | number]> }) {
  const [done, setDone] = useState(false);
  const save = () => {
    const quote = (v: string | number) => (typeof v === "number" ? String(v) : `"${v.replace(/"/g, '""')}"`);
    const csv = [columns.map(([h]) => quote(h)).join(","), ...rows.map((r) => columns.map(([, get]) => quote(get(r))).join(","))].join("\n");
    try {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${name}.csv`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch {
      // No Blob URLs here: the message still says what the file holds.
    }
    setDone(true);
  };
  return (
    <span className="flex items-center gap-2">
      {done && (
        <span role="status" className="text-2xs text-fg-muted">
          {name}.csv, {rows.length} rows
        </span>
      )}
      <Button size="sm" variant="ghost" icon={<Download aria-hidden />} onClick={save} aria-label={`Export ${name} as CSV`}>
        CSV
      </Button>
    </span>
  );
}

/* --------------------------------------------------------------- flag */

/** A country's flag from its two-letter code, for lists; screen readers read the name beside it. */
export function Flag({ code }: { code: string }) {
  const flag = code ? [...code.toUpperCase()].map((ch) => String.fromCodePoint(127397 + ch.charCodeAt(0))).join("") : "🌐";
  return (
    <span aria-hidden className="inline-block w-5 text-center">
      {flag}
    </span>
  );
}

/* ---------------------------------------------------------- path flow */

const FLOW_W = 900;

/**
 * Where visits went from a page, step by step: each column is a step, each band the visits that moved between two
 * pages, as wide as their count. A small Sankey drawn in SVG from the theme's tokens.
 */
export function PathFlow({ label, nodes, links, height = 340 }: { label: string; nodes: FlowNode[]; links: FlowLink[]; height?: number }) {
  const [hover, setHover] = useState<string | null>(null);
  const columns = Math.max(...nodes.map((n) => n.column)) + 1;
  const nodeW = 10;
  const gap = 10;
  const total = nodes.filter((n) => n.column === 0).reduce((s, n) => s + n.value, 0);
  const most = Math.max(...Array.from({ length: columns }, (_, c) => nodes.filter((n) => n.column === c).length));
  const scale = (height - 24 - gap * (most - 1)) / total;
  const colX = (c: number) => 4 + c * ((FLOW_W - 250) / Math.max(1, columns - 1));
  const pos = new Map<string, { x: number; y: number; h: number; out: number; in: number }>();
  for (let c = 0; c < columns; c++) {
    let y = 12;
    for (const n of nodes.filter((x) => x.column === c)) {
      const h = Math.max(2, n.value * scale);
      pos.set(n.id, { x: colX(c), y, h, out: 0, in: 0 });
      y += h + gap;
    }
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const bands = links.map((l) => {
    const s = pos.get(l.from)!;
    const t = pos.get(l.to)!;
    const h = Math.max(1, l.value * scale);
    const x0 = s.x + nodeW;
    const x1 = t.x;
    const y0 = s.y + s.out;
    const y1 = t.y + t.in;
    s.out += h;
    t.in += h;
    const xm = (x0 + x1) / 2;
    const d = `M${x0},${y0} C${xm},${y0} ${xm},${y1} ${x1},${y1} L${x1},${y1 + h} C${xm},${y1 + h} ${xm},${y0 + h} ${x0},${y0 + h} Z`;
    return { id: `${l.from}>${l.to}`, d, link: l, exit: !!byId.get(l.to)?.exit };
  });
  const lit = (b: { link: FlowLink }) => !hover || b.link.from === hover || b.link.to === hover;
  return (
    <div className="overflow-x-auto">
      <svg role="img" aria-label={label} viewBox={`0 0 ${FLOW_W} ${height}`} className="block w-full min-w-[720px]">
        {bands.map((b) => (
          <path
            key={b.id}
            d={b.d}
            fill={b.exit ? "var(--oa-fg-subtle)" : "var(--oa-accent)"}
            fillOpacity={lit(b) ? (b.exit ? 0.18 : 0.28) : 0.06}
            onPointerEnter={() => setHover(b.link.to)}
            onPointerLeave={() => setHover(null)}
          >
            <title>{`${byId.get(b.link.from)!.label} to ${byId.get(b.link.to)!.label}: ${b.link.value.toLocaleString("en")} visits`}</title>
          </path>
        ))}
        {nodes.map((n) => {
          const p = pos.get(n.id)!;
          return (
            <g key={n.id} onPointerEnter={() => setHover(n.id)} onPointerLeave={() => setHover(null)}>
              <rect x={p.x} y={p.y} width={nodeW} height={p.h} rx={2} fill={n.exit ? "var(--oa-fg-subtle)" : "var(--oa-accent)"} />
              <text
                x={p.x + nodeW + 6}
                y={p.y + Math.min(p.h / 2, 14) + 4}
                fontSize={12}
                fill={n.exit ? "var(--oa-fg-muted)" : "var(--oa-fg)"}
                stroke="var(--oa-surface)"
                strokeWidth={3}
                paintOrder="stroke"
                fontFamily="var(--oa-font-mono)"
              >
                {n.label} · {n.value.toLocaleString("en")}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/* -------------------------------------------------------- cohort grid */

/**
 * Each row a cohort of visitors first seen in the same week, each column the share that came back that many weeks
 * later. Darker is more; week 0 is everyone and stays plain.
 */
export function CohortGrid({
  label,
  cohorts,
  unit,
  format = (v) => `${v.toFixed(1)}%`,
}: {
  label: string;
  cohorts: Array<{ id: string; label: string; size: number; values: number[] }>;
  unit: string;
  format?: (v: number, size: number) => string;
}) {
  const width = Math.max(...cohorts.map((c) => c.values.length));
  const max = Math.max(...cohorts.flatMap((c) => c.values.slice(1)));
  return (
    <div className="overflow-x-auto">
      <table aria-label={label} className="w-full min-w-[640px] border-separate border-spacing-[2px] text-xs">
        <thead>
          <tr className="text-2xs text-fg-muted">
            <th scope="col" className="px-2 py-1 text-left font-medium">
              First seen
            </th>
            <th scope="col" className="px-2 py-1 text-right font-medium">
              {unit}
            </th>
            {Array.from({ length: width }, (_, i) => (
              <th key={i} scope="col" className="px-2 py-1 text-center font-medium">
                Week {i}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.id}>
              <th scope="row" className="px-2 py-1.5 text-left font-medium whitespace-nowrap text-fg">
                Week of {c.label}
              </th>
              <td className="px-2 py-1.5 text-right font-mono text-fg-muted tabular-nums">{c.size.toLocaleString("en")}</td>
              {Array.from({ length: width }, (_, i) => {
                const v = c.values[i];
                return (
                  <td
                    key={i}
                    className={cn(
                      "rounded-[3px] px-2 py-1.5 text-center font-mono tabular-nums",
                      v === undefined ? "" : i === 0 ? "bg-subtle text-fg-muted" : "text-fg",
                    )}
                    style={
                      v !== undefined && i > 0
                        ? { background: `color-mix(in oklab, var(--oa-accent) ${Math.round((v / max) * 50)}%, var(--oa-surface))` }
                        : undefined
                    }
                  >
                    {v === undefined ? "" : format(v, c.size)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* --------------------------------------------------- annotation strip */

/**
 * Notes the team put on dates, as marks under a TimeSeriesChart and in line with its days: the left column copies the
 * chart's value axis so both share one x scale.
 */
export function AnnotationStrip({
  days,
  notes,
  max,
  format,
  active,
  onSelect,
}: {
  days: string[];
  notes: Array<{ id: string; day: number; text: string }>;
  max: number;
  format: (v: number) => string;
  active?: string;
  onSelect: (id: string) => void;
}) {
  const widest = niceScale(max, 4)
    .ticks.map(format)
    .reduce((a, b) => (b.length > a.length ? b : a), "");
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-1.5">
      <span aria-hidden className="invisible min-w-6 font-mono text-2xs">
        {widest}
      </span>
      <ul aria-label="Annotations on the chart" className="relative h-6">
        {notes.map((n) => (
          <li key={n.id} className="absolute top-0 -translate-x-1/2" style={{ left: `${(n.day / (days.length - 1)) * 100}%` }}>
            <button
              type="button"
              onClick={() => onSelect(n.id)}
              aria-pressed={active === n.id}
              aria-label={`${notes.indexOf(n) + 1}. ${days[n.day]}: ${n.text}`}
              title={`${days[n.day]}: ${n.text}`}
              className={cn(
                "grid size-6 place-items-center rounded-full border text-2xs font-semibold",
                active === n.id ? "border-accent bg-accent text-accent-contrast" : "border-line-strong bg-surface text-fg hover:bg-subtle",
              )}
            >
              {notes.indexOf(n) + 1}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* --------------------------------------------------------------- misc */

/** Good, needs improvement and poor as one bar, for a Core Web Vital. */
export function SplitBar({ label, split }: { label: string; split: [number, number, number] }) {
  const tones = ["var(--oa-success)", "var(--oa-warning)", "var(--oa-danger)"];
  const names = ["good", "needs improvement", "poor"];
  return (
    <div role="img" aria-label={`${label}: ${split.map((v, i) => `${v}% ${names[i]}`).join(", ")}`} className="flex h-2 overflow-hidden rounded-full bg-subtle">
      {split.map((v, i) => (
        <span key={i} style={{ width: `${v}%`, background: tones[i] }} />
      ))}
    </div>
  );
}
