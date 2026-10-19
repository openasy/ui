import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Bell, CalendarClock, CalendarPlus, CircleCheck, ExternalLink, Globe, ListChecks, MapPin, Megaphone, Plus, Siren } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { EntityChip } from "../../components/EntityChip";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { BrandMark } from "../../components/AppShell";
import { useBrand } from "../../components/BrandProvider";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { formatNumber } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, USER, rng, timeLabels, wave } from "../mocks";

const nav = [
  { id: "checks", label: "Checks", icon: ListChecks, count: 42 },
  { id: "status-pages", label: "Status pages", icon: Globe, count: 2 },
  { id: "incidents", label: "Incidents", icon: Siren },
  { id: "maintenance", label: "Maintenance", icon: CalendarClock },
  { id: "locations", label: "Locations", icon: MapPin },
];

const meta = {
  title: "Products/Uptime",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type Day = "up" | "degraded" | "down" | "none";
const DAY_TONE: Record<Day, string> = {
  up: "bg-success",
  degraded: "bg-warning",
  down: "bg-danger",
  none: "bg-subtle",
};
const DAY_TEXT: Record<Day, string> = { up: "operational", degraded: "degraded", down: "outage", none: "no data" };

/** "Oct 19" style labels for the last `n` days ending today (2026-10-19). */
function dayLabel(daysAgo: number): string {
  const d = new Date(Date.UTC(2026, 9, 19 - daysAgo));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

function history(n: number, seed: number, bad = 0.05): Day[] {
  const r = rng(seed);
  return Array.from({ length: n }, () => {
    const v = r();
    if (v < bad * 0.3) return "down";
    if (v < bad) return "degraded";
    return "up";
  });
}

/** Not in the library yet: a row of per-day uptime bars, each with its own accessible name. */
function DayBars({ days, name, className }: { days: Day[]; name: string; className?: string }) {
  return (
    <div className={cn("flex items-stretch gap-px", className)} data-testid={`days-${name}`}>
      {days.map((d, i) => {
        const ago = days.length - 1 - i;
        return <span key={i} role="img" aria-label={`${name}, ${dayLabel(ago)}: ${DAY_TEXT[d]}`} className={cn("min-w-0 flex-1 rounded-[1px]", DAY_TONE[d])} />;
      })}
    </div>
  );
}

type CheckType = "HTTP" | "TCP" | "DNS" | "TLS";
interface Check {
  id: string;
  name: string;
  type: CheckType;
  target: string;
  regions: string[];
  uptime: number;
  days: Day[];
  last: number;
  state: "up" | "down" | "degraded";
}

const BASE: Array<Omit<Check, "id" | "days" | "uptime" | "state"> & { bad?: number; state?: Check["state"] }> = [
  { name: "Checkout API", type: "HTTP", target: "https://api.example.com/v1/health", regions: ["fra", "lon", "iad"], last: 184, bad: 0.12, state: "degraded" },
  { name: "Marketing site", type: "HTTP", target: "https://www.example.com", regions: ["fra", "iad"], last: 92 },
  { name: "Customer portal", type: "HTTP", target: "https://app.example.com/login", regions: ["fra", "lon", "iad", "sin"], last: 231 },
  { name: "Webhooks receiver", type: "HTTP", target: "https://hooks.example.com/ping", regions: ["fra"], last: 0, bad: 0.2, state: "down" },
  { name: "Postgres primary", type: "TCP", target: "db-prod-01:5432", regions: ["fra"], last: 4 },
  { name: "Postgres replica", type: "TCP", target: "db-prod-02:5432", regions: ["fra"], last: 5 },
  { name: "SMTP relay", type: "TCP", target: "smtp.example.com:587", regions: ["fra", "lon"], last: 38 },
  { name: "Apex DNS", type: "DNS", target: "example.com A", regions: ["fra", "iad", "sin"], last: 21 },
  { name: "MX records", type: "DNS", target: "example.com MX", regions: ["fra"], last: 19 },
  { name: "API certificate", type: "TLS", target: "api.example.com:443", regions: ["fra"], last: 61 },
  { name: "Portal certificate", type: "TLS", target: "app.example.com:443", regions: ["fra"], last: 58 },
  { name: "Status page", type: "HTTP", target: "https://status.example.com", regions: ["iad"], last: 77 },
  { name: "Edge Frankfurt", type: "TCP", target: "192.0.2.44:443", regions: ["fra", "lon"], last: 9 },
  { name: "Edge London", type: "TCP", target: "198.51.100.7:443", regions: ["lon"], last: 7 },
];

const checks: Check[] = Array.from({ length: 42 }, (_, i) => {
  const b = BASE[i % BASE.length]!;
  const suffix = i < BASE.length ? "" : i < BASE.length * 2 ? " · staging" : " · eu-west";
  const days = history(30, 300 + i, b.bad ?? 0.03);
  if (b.state === "down") days[29] = "down";
  if (b.state === "degraded") days[29] = "degraded";
  const score = days.reduce((s, d) => s + (d === "up" ? 1 : d === "degraded" ? 0.995 : 0.97), 0) / days.length;
  return {
    ...b,
    id: `c${i}`,
    name: `${b.name}${suffix}`,
    days,
    uptime: Math.round(score * 10000) / 100,
    state: i < BASE.length ? (b.state ?? "up") : "up",
  } as Check;
});
// Two checks are down across the fleet.
checks[17]!.state = "down";
checks[17]!.days[29] = "down";

const STATE: Record<Check["state"], { tone: Tone; label: string }> = {
  up: { tone: "success", label: "Up" },
  degraded: { tone: "warning", label: "Degraded" },
  down: { tone: "danger", label: "Down" },
};

const checkColumns: Column<Check>[] = [
  {
    id: "name",
    header: "Check",
    width: "20%",
    sortValue: (c) => c.name,
    cell: (c) => (
      <span className="flex items-center gap-2">
        <StatusBadge tone={STATE[c.state].tone}>{STATE[c.state].label}</StatusBadge>
        <span className="truncate font-medium">{c.name}</span>
      </span>
    ),
  },
  { id: "type", header: "Type", width: "64px", sortValue: (c) => c.type, cell: (c) => <Badge mono>{c.type}</Badge> },
  { id: "target", header: "Target", mono: true, cell: (c) => <span className="block max-w-[220px] truncate">{c.target}</span> },
  { id: "regions", header: "Regions", cell: (c) => <span className="font-mono text-xs text-fg-muted">{c.regions.join(" · ")}</span> },
  {
    id: "uptime",
    header: "30 d",
    align: "right",
    mono: true,
    sortValue: (c) => c.uptime,
    cell: (c) => <span className={cn(c.uptime < 99.5 ? "text-danger-text" : c.uptime < 99.9 ? "text-warning-text" : "text-fg")}>{c.uptime.toFixed(2)}%</span>,
  },
  { id: "days", header: "Last 30 days", width: "170px", cell: (c) => <DayBars days={c.days} name={c.name} className="h-5 w-[150px]" /> },
  {
    id: "last",
    header: "Response",
    align: "right",
    mono: true,
    sortValue: (c) => c.last,
    cell: (c) => (c.state === "down" ? <span className="text-danger-text">timeout</span> : `${c.last} ms`),
  },
];


/* ----------------------------------------------------------------- pages */

/** Checks: every HTTP, TCP, DNS and TLS probe with 30 days of history. */
function ChecksPage() {
  const [range, setRange] = useState("24h");
  const [types, setTypes] = useState<string[]>([]);
  const rows = types.length ? checks.filter((c) => types.includes(c.type)) : checks;
  return (
    <>
      <PageHeader
        title="Checks"
        description="42 checks · 4 regions · every 5 minutes"
        meta={<StatusBadge tone="danger">2 down</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search checks" shortcut="/" className="w-60" />
            <Button icon={<Bell />}>Alert rules</Button>
            <Button variant="primary" icon={<Plus />}>
              New check
            </Button>
          </>
        }
      />
      <FilterBar onClear={types.length ? () => setTypes([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Type"
          selected={types}
          onChange={setTypes}
          options={(["HTTP", "TCP", "DNS", "TLS"] as const).map((t) => ({ value: t, count: checks.filter((c) => c.type === t).length }))}
        />
      </FilterBar>
      <Callout tone="info" title="Runs from GitHub Actions every 5 min, no server needed">
        Checks run on a scheduled workflow in acme/uptime-checks and write results to this workspace. Last run 13:55 UTC, took 41 s.
      </Callout>
      <KpiGrid>
        <KpiCard label="Up" value="40" unit="of 42" tone="success" delta={{ label: "Webhooks receiver down in prod and staging", intent: "bad" }} />
        <KpiCard label="Avg response" value="118" unit="ms" trend={[121, 117, 119, 132, 124, 118, 115, 118, 129, 118]} delta={{ label: "-6 ms vs. last week", direction: "down", intent: "good" }} />
        <KpiCard label="Uptime · 30 d" value="99.94" unit="%" delta={{ label: "SLO 99.9%" }} />
        <KpiCard label="SSL expiring" value="2" unit="in 14 days" tone="warning" delta={{ label: "app.example.com in 9 days", intent: "bad" }} />
      </KpiGrid>
      <Panel title="All checks" description="Bars show one day each, oldest on the left" flush>
        <DataTable label="Uptime checks" columns={checkColumns} rows={rows} getRowId={(c) => c.id} pageSize={14} defaultSort={{ id: "uptime", direction: "asc" }} minWidth={1000} />
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------- status page */

interface StatusComponent {
  name: string;
  description: string;
  state: "up" | "degraded" | "down";
  days: Day[];
}

const components: StatusComponent[] = [
  { name: "Checkout API", description: "Orders and payments", state: "degraded", days: history(90, 901, 0.06) },
  { name: "Customer portal", description: "app.example.com", state: "up", days: history(90, 902, 0.02) },
  { name: "Webhooks", description: "Outgoing event delivery", state: "up", days: history(90, 903, 0.04) },
  { name: "Marketing site", description: "www.example.com", state: "up", days: history(90, 904, 0.01) },
  { name: "Email delivery", description: "Receipts and notifications", state: "up", days: history(90, 905, 0.03) },
];
components[0]!.days[89] = "degraded";
components[2]!.days[85] = "down";

const COMPONENT_STATE: Record<StatusComponent["state"], { tone: Tone; label: string }> = {
  up: { tone: "success", label: "Operational" },
  degraded: { tone: "warning", label: "Degraded performance" },
  down: { tone: "danger", label: "Major outage" },
};

interface Incident {
  id: string;
  title: string;
  date: string;
  impact: Tone;
  updates: Array<{ status: string; time: string; text: string }>;
}

const incidents: Incident[] = [
  {
    id: "i1",
    title: "Slow order creation",
    date: "19 Oct 2026",
    impact: "warning",
    updates: [
      { status: "Monitoring", time: "14:02 UTC", text: "A fix for lock contention on the orders table is deployed. Order creation times are back under 1 s and we are watching closely." },
      { status: "Identified", time: "13:51 UTC", text: "Some order requests wait several seconds on a database lock. Payments are not affected." },
      { status: "Investigating", time: "13:47 UTC", text: "We are looking into slower than usual checkout times." },
    ],
  },
  {
    id: "i2",
    title: "Webhook deliveries delayed",
    date: "15 Oct 2026",
    impact: "danger",
    updates: [
      { status: "Resolved", time: "09:40 UTC", text: "All queued webhooks were delivered. No events were lost." },
      { status: "Identified", time: "08:55 UTC", text: "A full disk on a delivery worker stopped the queue. We added capacity and are draining the backlog." },
    ],
  },
  {
    id: "i3",
    title: "Scheduled database maintenance",
    date: "2 Oct 2026",
    impact: "info",
    updates: [{ status: "Completed", time: "03:30 UTC", text: "PostgreSQL minor upgrade finished in 12 minutes with no downtime." }],
  },
];

function StatusPageScreen() {
  const { brand } = useBrand();
  const anyDown = components.some((c) => c.state === "down");
  const anyDegraded = components.some((c) => c.state === "degraded");
  const overall = anyDown
    ? { tone: "danger" as const, title: "Major outage", box: "bg-danger-soft border-danger/30 text-danger-text" }
    : anyDegraded
      ? { tone: "warning" as const, title: "Some systems are degraded", box: "bg-warning-soft border-warning/35 text-warning-text" }
      : { tone: "success" as const, title: "All systems operational", box: "bg-success-soft border-success/30 text-success" };
  return (
    <div className="min-h-screen bg-canvas text-fg">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
        <header className="flex items-center gap-2.5">
          <BrandMark product="uptime" size={28} />
          <span className="flex min-w-0 grow flex-col">
            <span className="truncate text-sm font-semibold">{brand.organization ?? brand.name}</span>
            <span className="text-xs text-fg-muted">System status</span>
          </span>
          <Button size="sm" icon={<Bell />}>
            Subscribe to updates
          </Button>
        </header>

        <section aria-labelledby="overall" className={cn("flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3", overall.box)}>
          <h1 id="overall" className="grow text-lg font-semibold">
            {overall.title}
          </h1>
          <span className="text-xs">Updated 14:05 UTC</span>
        </section>

        <Panel title="Components" description="Uptime over the last 90 days">
          <ul className="flex flex-col">
            {components.map((c) => {
              const up = c.days.reduce((s, d) => s + (d === "up" ? 1 : d === "degraded" ? 0.996 : 0.96), 0) / c.days.length;
              return (
                <li key={c.name} className="flex flex-col gap-1.5 border-b border-subtle py-2.5 last:border-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex min-w-0 grow flex-col">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-xs text-fg-muted">{c.description}</span>
                    </span>
                    <StatusBadge tone={COMPONENT_STATE[c.state].tone}>{COMPONENT_STATE[c.state].label}</StatusBadge>
                  </div>
                  <DayBars days={c.days} name={c.name} className="h-7" />
                  <div className="flex justify-between text-2xs text-fg-muted">
                    <span>90 days ago</span>
                    <span>{(up * 100).toFixed(2)}% uptime</span>
                    <span>Today</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <section aria-labelledby="history" className="flex flex-col gap-2.5">
          <h2 id="history" className="text-sm font-semibold">
            Incident history
          </h2>
          {incidents.map((inc) => (
            <article key={inc.id} className="rounded-lg border border-line bg-surface px-3 py-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="grow text-sm font-semibold">{inc.title}</h3>
                <span className="text-xs text-fg-muted">{inc.date}</span>
                <Badge tone={inc.impact}>{inc.updates[0]!.status}</Badge>
              </div>
              <ol className="mt-2 flex flex-col gap-2 border-l border-line pl-3">
                {inc.updates.map((u, i) => (
                  <li key={i} className="flex flex-col gap-0.5 text-sm">
                    <span className="text-xs">
                      <span className="font-semibold">{u.status}</span> <span className="text-fg-muted">· {u.time}</span>
                    </span>
                    <p className="text-fg-muted">{u.text}</p>
                  </li>
                ))}
              </ol>
            </article>
          ))}
          <a href="#history-all" className="text-sm text-accent-text">
            View all incidents
          </a>
        </section>

        <footer className="flex flex-wrap justify-between gap-2 border-t border-line pt-3 text-xs text-fg-muted">
          <span>Times in UTC · checked every 5 minutes from 4 regions</span>
          {!brand.hidePoweredBy && <span>Powered by OpenAsy Uptime</span>}
        </footer>
      </div>
    </div>
  );
}


/* ---------------------------------------------------------- local pieces */

/** Not in the library yet: a multi-line text field with the same label and hint pattern as TextField. */
function TextArea({ label, hint, value, onChange, rows = 3, placeholder }: { label: string; hint?: string; value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const id = useId();
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-medium text-fg">
        {label}
      </label>
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm text-fg placeholder:text-fg-subtle"
      />
      {hint && (
        <span id={`${id}-hint`} className="text-xs text-fg-muted">
          {hint}
        </span>
      )}
    </div>
  );
}

/* ---------------------------------------------------------- status pages */

interface StatusSite {
  id: string;
  name: string;
  domain: string;
  visibility: "Public" | "Private · SSO";
  components: string[];
  subscribers: number;
  state: "up" | "degraded" | "down";
  updated: string;
}

const SITES: StatusSite[] = [
  { id: "sp1", name: "Acme status", domain: "status.example.com", visibility: "Public", components: components.map((c) => c.name), subscribers: 1_284, state: "degraded", updated: "14:05 UTC" },
  { id: "sp2", name: "Internal platform", domain: "status.internal.example.com", visibility: "Private · SSO", components: ["Checkout API", "Webhooks", "Postgres primary", "SMTP relay", "Kubernetes API"], subscribers: 96, state: "up", updated: "13:40 UTC" },
];

const ALL_COMPONENTS = ["Checkout API", "Customer portal", "Webhooks", "Marketing site", "Email delivery", "Postgres primary", "SMTP relay", "Kubernetes API"];

function StatusPagesPage() {
  const [active, setActive] = useState(SITES[0]!.id);
  const [drafts, setDrafts] = useState<Record<string, { name: string; components: string[]; bars: boolean; subscribe: boolean; poweredBy: boolean }>>(
    Object.fromEntries(SITES.map((s) => [s.id, { name: s.name, components: s.components, bars: true, subscribe: s.visibility === "Public", poweredBy: true }])),
  );
  const [published, setPublished] = useState("");
  const site = SITES.find((s) => s.id === active)!;
  const d = drafts[active]!;
  const set = (patch: Partial<typeof d>) => setDrafts((all) => ({ ...all, [active]: { ...all[active]!, ...patch } }));
  const cols: Column<StatusSite>[] = [
    {
      id: "name",
      header: "Status page",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{drafts[s.id]!.name}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{s.domain}</span>
        </span>
      ),
    },
    { id: "state", header: "Shows", cell: (s) => <StatusBadge tone={COMPONENT_STATE[s.state].tone}>{COMPONENT_STATE[s.state].label}</StatusBadge> },
    { id: "vis", header: "Visibility", cell: (s) => <Badge tone={s.visibility === "Public" ? "info" : "neutral"}>{s.visibility}</Badge> },
    { id: "components", header: "Components", align: "right", mono: true, cell: (s) => drafts[s.id]!.components.length },
    { id: "subs", header: "Subscribers", align: "right", mono: true, description: "People who get email or RSS updates when an incident is posted.", sortValue: (s) => s.subscribers, cell: (s) => formatNumber(s.subscribers) },
    { id: "updated", header: "Updated", cell: (s) => <span className="text-xs">{s.updated}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Status pages"
        description="Public and private pages that show component health and incidents to your users"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New status page
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Status pages" value="2" unit="1 public" />
        <KpiCard label="Subscribers" value="1,380" delta={{ label: "+42 this week", direction: "up", intent: "good" }} />
        <KpiCard label="Page views · 24 h" value="8.2k" trend={wave(24, { base: 200, amp: 60, seed: 210, spike: 900, spikeAt: 18, spikeLen: 2 })} delta={{ label: "Spike during checkout slowness" }} />
        <KpiCard label="Open incidents" value="1" tone="warning" delta={{ label: "Slow order creation · Monitoring" }} />
      </KpiGrid>
      <Panel title="Pages" flush>
        <DataTable label="Status pages" columns={cols} rows={SITES} getRowId={(s) => s.id} onRowClick={(s) => setActive(s.id)} activeRowId={active} minWidth={760} />
      </Panel>
      {published && <Callout tone="success" title={published} onDismiss={() => setPublished("")} />}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          aria-label="Status page editor"
          title={`Edit ${d.name}`}
          description={`${site.domain} · ${site.visibility}`}
          actions={
            <>
              <Button size="sm" icon={<ExternalLink />}>
                Open page
              </Button>
              <Button size="sm" variant="primary" onClick={() => setPublished(`Published ${d.name} · ${d.components.length} components`)}>
                Publish changes
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-3">
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Page name" value={d.name} onChange={(e) => set({ name: e.target.value })} />
              <TextField label="Custom domain" mono defaultValue={site.domain} key={site.id} hint="CNAME to pages.openasy.example.com" />
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-medium text-fg">Components shown</legend>
              <div className="grid gap-1.5 md:grid-cols-2">
                {ALL_COMPONENTS.map((c) => (
                  <Checkbox
                    key={c}
                    label={c}
                    checked={d.components.includes(c)}
                    onChange={(e) => set({ components: e.target.checked ? [...d.components, c] : d.components.filter((x) => x !== c) })}
                  />
                ))}
              </div>
            </fieldset>
            <Switch checked={d.bars} onCheckedChange={(v) => set({ bars: v })} label="Show 90-day uptime bars" description="One bar per day under each component." />
            <Switch checked={d.subscribe} onCheckedChange={(v) => set({ subscribe: v })} label="Allow subscriptions" description="Visitors can subscribe by email or RSS." />
            <Switch checked={d.poweredBy} onCheckedChange={(v) => set({ poweredBy: v })} label="Show “Powered by OpenAsy”" />
          </div>
        </Panel>
        <Panel title="Preview" description="How visitors see the page right now" aria-label="Status page preview">
          <div className="flex flex-col gap-2 rounded-md border border-line bg-canvas p-2.5">
            <div className="flex items-center gap-2">
              <BrandMark product="uptime" size={20} />
              <span className="grow truncate text-sm font-semibold">{d.name}</span>
              {d.subscribe && <Badge variant="outline">Subscribe</Badge>}
            </div>
            <div className={cn("rounded-md border px-2.5 py-1.5 text-sm font-semibold", site.state === "up" ? "border-success/30 bg-success-soft text-success" : "border-warning/35 bg-warning-soft text-warning-text")}>
              {site.state === "up" ? "All systems operational" : "Some systems are degraded"}
            </div>
            <ul aria-label="Preview components" className="flex flex-col">
              {d.components.map((name) => {
                const comp = components.find((x) => x.name === name);
                return (
                  <li key={name} className="flex flex-col gap-1 border-b border-subtle py-1.5 last:border-0">
                    <span className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium">{name}</span>
                      <span className={comp?.state === "degraded" ? "text-warning-text" : "text-success"}>{comp ? COMPONENT_STATE[comp.state].label : "Operational"}</span>
                    </span>
                    {d.bars && <span aria-hidden className="flex h-3 gap-px">{(comp?.days ?? history(90, name.length * 7, 0.02)).slice(-45).map((day, i) => <span key={i} className={cn("min-w-0 flex-1 rounded-[1px]", DAY_TONE[day])} />)}</span>}
                  </li>
                );
              })}
              {d.components.length === 0 && <li className="py-2 text-xs text-fg-muted">No components selected.</li>}
            </ul>
            {d.poweredBy && <span className="text-2xs text-fg-muted">Powered by OpenAsy Uptime</span>}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- incidents */

type IncidentStatus = "Investigating" | "Identified" | "Monitoring" | "Resolved";

interface ManagedIncident {
  id: string;
  title: string;
  started: string;
  impact: "Minor" | "Major" | "Maintenance";
  components: string[];
  status: IncidentStatus;
  updates: Array<{ status: string; time: string; text: string; by: string }>;
}

const MANAGED: ManagedIncident[] = [
  {
    id: "inc1",
    title: "Slow order creation",
    started: "Today 13:47 UTC",
    impact: "Minor",
    components: ["Checkout API"],
    status: "Monitoring",
    updates: incidents[0]!.updates.map((u, i) => ({ ...u, by: [PEOPLE[0], PEOPLE[2], PEOPLE[0]][i]! })),
  },
  {
    id: "inc2",
    title: "Webhook deliveries delayed",
    started: "Oct 15 08:31 UTC",
    impact: "Major",
    components: ["Webhooks"],
    status: "Resolved",
    updates: incidents[1]!.updates.map((u) => ({ ...u, by: PEOPLE[4] })),
  },
  {
    id: "inc3",
    title: "Customer portal sign-in errors",
    started: "Oct 8 17:02 UTC",
    impact: "Minor",
    components: ["Customer portal"],
    status: "Resolved",
    updates: [
      { status: "Resolved", time: "17:48 UTC", text: "Sign-in works again for all users. The identity provider certificate was renewed.", by: PEOPLE[1] },
      { status: "Investigating", time: "17:05 UTC", text: "Some users see an error when signing in to the customer portal.", by: PEOPLE[1] },
    ],
  },
];

const INCIDENT_TONE: Record<IncidentStatus, "warning" | "info" | "success" | "danger"> = { Investigating: "danger", Identified: "warning", Monitoring: "info", Resolved: "success" };

function IncidentsPage() {
  const [list, setList] = useState(MANAGED);
  const [active, setActive] = useState(MANAGED[0]!.id);
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("all");
  const [status, setStatus] = useState<IncidentStatus>("Monitoring");
  const [message, setMessage] = useState("");
  const [notify, setNotify] = useState(true);
  const inc = list.find((i) => i.id === active)!;
  const shown = list.filter((i) => filter === "all" || (filter === "open" ? i.status !== "Resolved" : i.status === "Resolved"));
  const post = () => {
    if (!message.trim()) return;
    setList((all) => all.map((i) => (i.id === active ? { ...i, status, updates: [{ status, time: "14:12 UTC", text: message.trim(), by: USER.name }, ...i.updates] } : i)));
    setMessage("");
  };
  return (
    <>
      <PageHeader
        title="Incidents"
        description="Incidents posted to your status pages, with every update subscribers received"
        meta={<StatusBadge tone="warning">1 open</StatusBadge>}
        actions={
          <Button variant="primary" icon={<Megaphone />}>
            Declare incident
          </Button>
        }
      >
        <Tabs
          label="Incident filter"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "all", label: "All", count: list.length },
            { value: "open", label: "Open", count: list.filter((i) => i.status !== "Resolved").length },
            { value: "resolved", label: "Resolved", count: list.filter((i) => i.status === "Resolved").length },
          ]}
        />
      </PageHeader>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Incidents" flush>
          <ul aria-label="Incident list" className="flex flex-col">
            {shown.map((i) => (
              <li key={i.id} className="border-b border-subtle last:border-0">
                <button
                  type="button"
                  aria-current={i.id === active ? "true" : undefined}
                  onClick={() => setActive(i.id)}
                  className={cn("flex w-full flex-col items-start gap-1 px-3 py-2 text-left hover:bg-subtle", i.id === active && "bg-accent-soft")}
                >
                  <span className="flex w-full items-center gap-2">
                    <span className="grow truncate text-sm font-medium">{i.title}</span>
                    <StatusBadge tone={INCIDENT_TONE[i.status]}>{i.status}</StatusBadge>
                  </span>
                  <span className="text-2xs text-fg-muted">
                    {i.started} · {i.impact} · {i.components.join(", ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length === 0 && <EmptyState icon={<CircleCheck />} title={`No ${filter} incidents`}>Everything on your status pages is operational.</EmptyState>}
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel aria-label="Incident detail" title={inc.title} description={`Started ${inc.started} · ${inc.impact} impact · ${inc.components.join(", ")}`} actions={<StatusBadge tone={INCIDENT_TONE[inc.status]}>{inc.status}</StatusBadge>}>
            <ol aria-label="Updates" className="flex flex-col gap-2.5 border-l border-line pl-3">
              {inc.updates.map((u, i) => (
                <li key={i} className="flex flex-col gap-0.5 text-sm">
                  <span className="text-xs">
                    <span className="font-semibold">{u.status}</span> <span className="text-fg-muted">· {u.time} · {u.by}</span>
                  </span>
                  <p className="text-fg-muted">{u.text}</p>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Post an update">
            <form
              className="flex flex-col gap-2.5"
              onSubmit={(e) => {
                e.preventDefault();
                post();
              }}
            >
              <SegmentedControl
                label="New status"
                value={status}
                onChange={setStatus}
                options={(["Investigating", "Identified", "Monitoring", "Resolved"] as const).map((s) => ({ value: s, label: s }))}
              />
              <TextArea label="Message" value={message} onChange={setMessage} placeholder="What changed, what users see, when the next update is due" hint="Shown on the status page and emailed to subscribers." />
              <Switch checked={notify} onCheckedChange={setNotify} label="Notify subscribers" description={`${formatNumber(SITES[0]!.subscribers)} people on status.example.com`} />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" disabled={!message.trim()}>
                  Post update
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- maintenance */

interface MaintWindow {
  id: string;
  title: string;
  components: string[];
  start: string;
  duration: string;
  state: "Scheduled" | "In progress" | "Completed";
  notify: boolean;
}

const WINDOWS: MaintWindow[] = [
  { id: "m1", title: "PostgreSQL 16.5 minor upgrade", components: ["Checkout API", "Customer portal"], start: "Oct 22 · 02:00 UTC", duration: "30 min", state: "Scheduled", notify: true },
  { id: "m2", title: "Edge certificate rotation", components: ["Marketing site", "Customer portal"], start: "Oct 25 · 04:00 UTC", duration: "15 min", state: "Scheduled", notify: false },
  { id: "m3", title: "Webhook workers migration", components: ["Webhooks"], start: "Oct 19 · 13:30 UTC", duration: "1 h", state: "In progress", notify: true },
  { id: "m4", title: "Scheduled database maintenance", components: ["Checkout API"], start: "Oct 2 · 03:00 UTC", duration: "30 min", state: "Completed", notify: true },
  { id: "m5", title: "SMTP relay OS patching", components: ["Email delivery"], start: "Sep 24 · 05:00 UTC", duration: "20 min", state: "Completed", notify: false },
];

const WINDOW_TONE: Record<MaintWindow["state"], "info" | "warning" | "neutral"> = { Scheduled: "info", "In progress": "warning", Completed: "neutral" };

function MaintenancePage() {
  const [rows, setRows] = useState(WINDOWS);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notice, setNotice] = useState("");
  const cols: Column<MaintWindow>[] = [
    { id: "title", header: "MaintWindow", pinned: "left", width: "260px", sortValue: (w) => w.title, cell: (w) => <span className="font-medium">{w.title}</span> },
    { id: "state", header: "State", sortValue: (w) => w.state, cell: (w) => <StatusBadge tone={WINDOW_TONE[w.state]}>{w.state}</StatusBadge> },
    { id: "start", header: "Starts", mono: true, cell: (w) => <span className="text-xs">{w.start}</span> },
    { id: "duration", header: "Duration", mono: true, cell: (w) => w.duration },
    { id: "components", header: "Components", cell: (w) => <span className="flex flex-wrap gap-1">{w.components.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}</span> },
    { id: "notify", header: "Subscribers", description: "Whether subscribers are emailed 24 hours and 1 hour before the window.", cell: (w) => (w.notify ? <span className="text-xs">Notified</span> : <span className="text-xs text-fg-muted">Silent</span>) },
    { id: "alerts", header: "Alerts", description: "Check alerts for these components are paused during the window.", cell: () => <span className="text-xs">Paused during window</span> },
  ];
  return (
    <>
      <PageHeader
        title="Maintenance"
        description="Planned windows pause alerts for affected checks and show a notice on your status pages"
        actions={
          <Button variant="primary" icon={<CalendarPlus />} onClick={() => setOpen(true)}>
            Schedule maintenance
          </Button>
        }
      />
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      {open && (
        <Panel title="Schedule maintenance" actions={<Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>}>
          <form
            className="grid gap-3 md:grid-cols-4"
            onSubmit={(e) => {
              e.preventDefault();
              const t = title.trim() || "Planned maintenance";
              setRows((r) => [{ id: `m${r.length + 1}`, title: t, components: ["Checkout API"], start: "Oct 29 · 02:00 UTC", duration: "1 h", state: "Scheduled", notify: true }, ...r]);
              setNotice(`Scheduled “${t}”`);
              setOpen(false);
              setTitle("");
            }}
          >
            <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Load balancer upgrade" className="md:col-span-2" />
            <TextField label="Starts (UTC)" type="datetime-local" defaultValue="2026-10-29T02:00" />
            <SelectField label="Duration" defaultValue="60" options={[{ value: "15", label: "15 minutes" }, { value: "30", label: "30 minutes" }, { value: "60", label: "1 hour" }, { value: "120", label: "2 hours" }]} />
            <SelectField label="Components" options={ALL_COMPONENTS.map((c) => ({ value: c, label: c }))} />
            <Checkbox label="Pause alerts for affected checks" defaultChecked />
            <Checkbox label="Email subscribers 24 h and 1 h before" defaultChecked />
            <div className="flex items-end justify-end">
              <Button type="submit" variant="primary">
                Schedule
              </Button>
            </div>
          </form>
        </Panel>
      )}
      <KpiGrid>
        <KpiCard label="Upcoming" value={String(rows.filter((w) => w.state === "Scheduled").length)} unit="next in 3 days" />
        <KpiCard label="In progress" value="1" tone="warning" delta={{ label: "Webhook workers migration · ends 14:30" }} />
        <KpiCard label="Downtime avoided in alerts" value="14" unit="pages this quarter" />
        <KpiCard label="Completed · 90 d" value="9" delta={{ label: "All finished on time", intent: "good" }} />
      </KpiGrid>
      <Callout tone="warning" title="Webhook workers migration is running now">
        Alerts for Webhooks receiver are paused until 14:30 UTC. The status page shows “Under maintenance”.
      </Callout>
      <Panel title="Maintenance windows" flush>
        <DataTable label="Maintenance windows" columns={cols} rows={rows} getRowId={(w) => w.id} minWidth={1000} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------- locations */

interface Probe {
  id: string;
  code: string;
  city: string;
  runner: string;
  egress: string;
  checks: number;
  p50: number;
  p95: number;
  success: number;
  enabled: boolean;
}

const PROBES: Probe[] = [
  { id: "fra", code: "fra", city: "Frankfurt", runner: "GitHub Actions · eu-central", egress: "192.0.2.44", checks: 42, p50: 64, p95: 141, success: 99.96, enabled: true },
  { id: "lon", code: "lon", city: "London", runner: "GitHub Actions · uk-south", egress: "198.51.100.7", checks: 21, p50: 71, p95: 158, success: 99.95, enabled: true },
  { id: "iad", code: "iad", city: "Ashburn", runner: "GitHub Actions · us-east", egress: "203.0.113.9", checks: 18, p50: 112, p95: 236, success: 99.91, enabled: true },
  { id: "sin", code: "sin", city: "Singapore", runner: "Self-hosted agent · probe-sin-01", egress: "203.0.113.181", checks: 6, p50: 208, p95: 412, success: 99.72, enabled: true },
  { id: "syd", code: "syd", city: "Sydney", runner: "Self-hosted agent · probe-syd-01", egress: "198.51.100.96", checks: 0, p50: 0, p95: 0, success: 0, enabled: false },
];

function LocationsPage() {
  const [range, setRange] = useState("24h");
  const [probes, setProbes] = useState(PROBES);
  const [active, setActive] = useState("sin");
  const p = probes.find((x) => x.id === active)!;
  const enabled = probes.filter((x) => x.enabled);
  const cols: Column<Probe>[] = [
    {
      id: "city",
      header: "Location",
      pinned: "left",
      sortValue: (x) => x.city,
      cell: (x) => (
        <span className="flex items-center gap-2">
          <Badge mono>{x.code}</Badge>
          <span className="font-medium">{x.city}</span>
        </span>
      ),
    },
    { id: "runner", header: "Runs on", cell: (x) => <span className="text-xs">{x.runner}</span> },
    { id: "egress", header: "Egress IP", description: "Allow-list this address if the target filters by source IP.", cell: (x) => <EntityChip kind="ip" value={x.egress} hideKind /> },
    { id: "checks", header: "Checks", align: "right", mono: true, sortValue: (x) => x.checks, cell: (x) => x.checks },
    { id: "p50", header: "p50", align: "right", mono: true, description: "Median response time of all HTTP checks from this location.", sortValue: (x) => x.p50, cell: (x) => (x.enabled ? `${x.p50} ms` : "–") },
    { id: "p95", header: "p95", align: "right", mono: true, sortValue: (x) => x.p95, cell: (x) => (x.enabled ? <span className={x.p95 > 300 ? "text-warning-text" : "text-fg"}>{x.p95} ms</span> : "–") },
    { id: "success", header: "Success", align: "right", mono: true, sortValue: (x) => x.success, cell: (x) => (x.enabled ? `${x.success.toFixed(2)}%` : "–") },
    {
      id: "enabled",
      header: "Enabled",
      width: "80px",
      hideable: false,
      cell: (x) => <Switch checked={x.enabled} onCheckedChange={(v) => setProbes((all) => all.map((y) => (y.id === x.id ? { ...y, enabled: v } : y)))} label={<span className="sr-only">Enable {x.city}</span>} />,
    },
  ];
  return (
    <>
      <PageHeader
        title="Locations"
        description="Where checks run from. A check is down only when two or more locations agree."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add self-hosted probe
          </Button>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Active locations" value={String(enabled.length)} unit={`of ${probes.length}`} />
        <KpiCard label="Fastest p50" value="64" unit="ms · fra" tone="success" />
        <KpiCard label="Slowest p95" value="412" unit="ms · sin" tone="warning" delta={{ label: "Targets are hosted in Frankfurt" }} />
        <KpiCard label="Disagreements · 24 h" value="3" delta={{ label: "Single-location failures ignored" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Response time by location" description="p50 of HTTP checks · ms">
          <TimeSeriesChart
            label="Response time by probe location"
            labels={timeLabels(24, 60)}
            height={200}
            format={(v) => `${Math.round(v)} ms`}
            series={PROBES.filter((x) => x.p50 > 0).map((x, i) => ({ id: x.id, name: x.city, data: wave(24, { base: x.p50, amp: x.p50 * 0.15, seed: 230 + i, spike: x.id === "iad" ? 40 : 0, spikeAt: 15 }) }))}
          />
        </Panel>
        <Panel aria-label="Location detail" title={`${p.city} · ${p.code}`} description={p.runner}>
          <dl className="grid grid-cols-2 gap-2.5 text-sm">
            <div>
              <dt className="text-2xs text-fg-muted">Status</dt>
              <dd>{p.enabled ? <StatusBadge tone="success">Running</StatusBadge> : <StatusBadge tone="neutral">Disabled</StatusBadge>}</dd>
            </div>
            <div>
              <dt className="text-2xs text-fg-muted">Last heartbeat</dt>
              <dd>{p.enabled ? "38 s ago" : "–"}</dd>
            </div>
            <div>
              <dt className="text-2xs text-fg-muted">Egress IP</dt>
              <dd className="font-mono text-xs">{p.egress}</dd>
            </div>
            <div>
              <dt className="text-2xs text-fg-muted">Checks assigned</dt>
              <dd className="font-mono">{p.checks}</dd>
            </div>
          </dl>
          <div className="mt-2.5 flex flex-col gap-1">
            <span className="text-xs font-medium">Slowest checks from here</span>
            <BarList
              label={`Slowest checks from ${p.city}`}
              format={(v) => `${Math.round(v)} ms`}
              items={checks.filter((c) => c.regions.includes(p.code) && c.last > 0).sort((a, b) => b.last - a.last).slice(0, 4).map((c) => ({ id: c.id, label: c.name, value: c.last * (p.p50 / 64) }))}
            />
            {!p.enabled && <p className="text-xs text-fg-muted">This location is off; enable it to start running checks.</p>}
          </div>
        </Panel>
      </div>
      <Panel title="Probe locations" flush>
        <DataTable label="Probe locations" columns={cols} rows={probes} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} minWidth={960} />
      </Panel>
    </>
  );
}

const PAGES = {
  checks: () => <ChecksPage />,
  "status-pages": () => <StatusPagesPage />,
  incidents: () => <IncidentsPage />,
  maintenance: () => <MaintenancePage />,
  locations: () => <LocationsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="uptime" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

export const Checks: Story = {
  ...app("checks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Checks" })).toBeInTheDocument();
    await expect(c.getByText("Runs from GitHub Actions every 5 min, no server needed")).toBeInTheDocument();
    await expect(c.getByRole("img", { name: "Webhooks receiver, 19 Oct: outage" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Uptime checks" });
    await expect(within(table).getAllByRole("row")).toHaveLength(15);
    await userEvent.click(c.getByRole("button", { name: "Next" }));
    await expect(c.getByText(/15–28 of 42/)).toBeInTheDocument();
  },
};

export const StatusPages: Story = {
  name: "Status pages",
  ...app("status-pages"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Status pages" })).getByText("status.internal.example.com"));
    const editor = within(c.getByRole("region", { name: "Status page editor" }));
    await expect(editor.getByRole("heading", { name: "Edit Internal platform" })).toBeInTheDocument();
    await userEvent.click(editor.getByRole("checkbox", { name: "Customer portal" }));
    await expect(within(c.getByRole("list", { name: "Preview components" })).getByText("Customer portal")).toBeInTheDocument();
    await userEvent.click(editor.getByRole("button", { name: "Publish changes" }));
    await expect(c.getByText("Published Internal platform · 6 components")).toBeInTheDocument();
  },
};

export const Incidents: Story = {
  ...app("incidents"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "Post update" })).toBeDisabled();
    await userEvent.click(c.getByRole("radio", { name: "Resolved" }));
    await userEvent.type(c.getByRole("textbox", { name: "Message" }), "Order creation is fast again.");
    await userEvent.click(c.getByRole("button", { name: "Post update" }));
    const updates = within(c.getByRole("list", { name: "Updates" }));
    await expect(updates.getAllByRole("listitem")[0]).toHaveTextContent("Order creation is fast again.");
    await userEvent.click(c.getByRole("tab", { name: /Open/ }));
    await expect(within(c.getByRole("list", { name: "Incident list" })).queryAllByRole("listitem")).toHaveLength(0);
    await expect(c.getByText("No open incidents")).toBeInTheDocument();
  },
};

export const Maintenance: Story = {
  ...app("maintenance"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Schedule maintenance" }));
    await userEvent.type(c.getByRole("textbox", { name: "Title" }), "Load balancer upgrade");
    await userEvent.click(c.getByRole("button", { name: "Schedule" }));
    await expect(c.getByText("Scheduled “Load balancer upgrade”")).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Maintenance windows" })).getByText("Load balancer upgrade")).toBeInTheDocument();
  },
};

export const Locations: Story = {
  ...app("locations"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = () => within(c.getByRole("region", { name: "Location detail" }));
    await expect(detail().getByRole("heading", { name: "Singapore · sin" })).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Probe locations" })).getByText("Sydney"));
    await expect(detail().getByText("Disabled")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Enable Sydney" }));
    await expect(detail().getByText("Running")).toBeInTheDocument();
  },
};

/** Public status page: no shell, the brand's logo, components with 90 days of history, incident history. */
export const StatusPage: Story = {
  render: () => <StatusPageScreen />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Some systems are degraded" })).toBeInTheDocument();
    await expect(c.getAllByRole("img", { name: /^Checkout API, / })).toHaveLength(90);
    await expect(c.getByRole("img", { name: "Checkout API, 19 Oct: degraded" })).toBeInTheDocument();
    await expect(c.getByRole("heading", { level: 3, name: "Slow order creation" })).toBeInTheDocument();
    await expect(c.queryByRole("navigation")).not.toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
