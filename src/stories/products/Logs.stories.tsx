import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Archive, Bell, Bookmark, ChartLine, ChevronRight, Download, GitBranch, Pause, Play, Radio, Search, Server, Shapes, Trash2 } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { SearchInput, Switch } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Callout } from "../../components/Callout";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, FilterChip, QueryBar, TimeRangePicker } from "../../components/Filters";
import { Badge, LevelBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { Sparkline } from "../../charts/Sparkline";
import { formatBytes, formatNumber } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { LogLevel } from "../../tokens/levels";
import { PEOPLE, timeLabels, wave } from "../mocks";

const nav = [
  { id: "explorer", label: "Explorer", icon: Search },
  { id: "live", label: "Live tail", icon: Radio },
  { id: "saved", label: "Saved views", icon: Bookmark, count: 14 },
  { id: "patterns", label: "Patterns", icon: Shapes },
  { id: "pipelines", label: "Pipelines", icon: GitBranch, count: 6 },
  { id: "archives", label: "Archives", icon: Archive },
];

const meta = {
  title: "Products/Logs",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

interface LogLine {
  id: string;
  ts: string;
  level: LogLevel;
  host: string;
  service: string;
  message: string;
  attrs: Record<string, string>;
}

const TEMPLATES: Array<Omit<LogLine, "id" | "ts" | "attrs"> & { route?: string; status?: string }> = [
  { level: "error", host: "api-prod-03", service: "orders-api", message: "upstream timeout after 5000ms calling payments-svc POST /v2/charge", route: "/v1/orders", status: "504" },
  { level: "error", host: "api-prod-03", service: "orders-api", message: "pq: remaining connection slots are reserved for non-replication superuser connections", route: "/v1/orders/:id", status: "500" },
  { level: "warn", host: "db-prod-01", service: "postgres", message: "connection pool saturated: 50/50 in use, 37 waiting", status: "-" },
  { level: "warn", host: "api-prod-03", service: "orders-api", message: "slow request GET /v1/orders?status=pending took 2841ms", route: "/v1/orders", status: "200" },
  { level: "info", host: "api-prod-01", service: "orders-api", message: "POST /v1/orders 201 in 84ms", route: "/v1/orders", status: "201" },
  { level: "info", host: "worker-prod-04", service: "billing-worker", message: "invoice batch 2026-10-19T14 processed: 1,284 invoices", status: "-" },
  { level: "fatal", host: "api-prod-03", service: "kernel", message: "Out of memory: Killed process 48211 (kworkerd) total-vm:2621440kB", status: "-" },
  { level: "error", host: "edge-fra-02", service: "nginx", message: "connect() failed (111: Connection refused) while connecting to upstream 192.0.2.13:8080", route: "/", status: "502" },
  { level: "info", host: "api-prod-05", service: "orders-api", message: "GET /v1/orders/ord_9f2a 200 in 31ms", route: "/v1/orders/:id", status: "200" },
  { level: "debug", host: "worker-prod-09", service: "billing-worker", message: "retrying job inv_44102 (attempt 2/5) after 800ms", status: "-" },
  { level: "warn", host: "api-prod-03", service: "sshd", message: "Failed password for invalid user admin from 198.51.100.201 port 51422 ssh2", status: "-" },
  { level: "info", host: "edge-fra-02", service: "nginx", message: "203.0.113.24 - - \"GET /healthz HTTP/1.1\" 200 2", route: "/healthz", status: "200" },
];

const lines: LogLine[] = Array.from({ length: 36 }, (_, i) => {
  const t = TEMPLATES[(i * 5 + (i % 3)) % TEMPLATES.length]!;
  const sec = 14 * 3600 - i * 17 - (i % 4) * 3;
  const ts = `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}.${String((i * 137) % 1000).padStart(3, "0")}`;
  return {
    id: `l${i}`,
    ts: `2026-10-19 ${ts}`,
    level: t.level,
    host: t.host,
    service: t.service,
    message: t.message,
    attrs: {
      trace_id: `4bf92f35${(0x77b34da6 + i * 7919).toString(16)}a3ce929d0e0e4736`,
      span_id: (0x00f067aa0ba902b7 + i * 131).toString(16),
      "host.name": t.host,
      "service.name": t.service,
      "container.id": t.service === "kernel" || t.service === "sshd" ? "–" : `${(0x9c3e1 + i * 4099).toString(16)}d1f07a2`,
      "http.route": t.route ?? "–",
      "http.status_code": t.status ?? "–",
      "deployment.environment": "prod",
      "log.file.path": t.service === "nginx" ? "/var/log/nginx/error.log" : t.service === "kernel" ? "/var/log/kern.log" : "stdout",
    },
  };
});

const N = 30;
const minutes = timeLabels(N, 1);
const errs = wave(N, { base: 3, amp: 2, seed: 21, spike: 38, spikeAt: 18, spikeLen: 5 });
const warns = wave(N, { base: 11, amp: 4, seed: 22, spike: 24, spikeAt: 16, spikeLen: 6 });
const histogram = minutes.map((_, i) => [Math.round(errs[i]!), Math.round(warns[i]!)]);

const count = (key: "level" | "host" | "service", v: string) => lines.filter((l) => l[key] === v).length * 1137;
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

/* ------------------------------------------------------------ fragments */

function LogRow({ line, open, onToggle }: { line: LogLine; open: boolean; onToggle: () => void }) {
  const detailId = `log-detail-${line.id}`;
  return (
    <li className={cn("border-b border-subtle last:border-0", open && "bg-canvas")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        onClick={onToggle}
        className="grid w-full grid-cols-[14px_96px_52px_110px_110px_minmax(0,1fr)] items-center gap-2 px-3 py-1 text-left hover:bg-canvas"
      >
        <ChevronRight aria-hidden className={cn("size-3.5 text-fg-muted transition-transform", open && "rotate-90")} />
        <span className="font-mono text-2xs text-fg-muted tabular-nums">{line.ts.slice(11)}</span>
        <LevelBadge level={line.level} />
        <span className="truncate font-mono text-xs text-fg-muted">{line.host}</span>
        <span className="truncate font-mono text-xs text-fg-muted">{line.service}</span>
        <span className="truncate font-mono text-xs text-fg">{line.message}</span>
      </button>
      {open && (
        <div id={detailId} role="region" aria-label={`Log details ${line.ts}`} className="grid gap-3 border-t border-subtle px-3 py-2.5 pl-8 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-mono text-xs break-words text-fg">{line.message}</p>
            <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-xs">
              {Object.entries(line.attrs).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-fg-muted">{k}</dt>
                  <dd className="truncate text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold text-fg">Open in</h3>
            <EntityChip kind="host" value={line.host} href={`#infrastructure/hosts/${line.host}`} />
            <a href={`#infrastructure/hosts/${line.host}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle">
              <Server aria-hidden className="size-3.5 text-fg-muted" />
              Infrastructure host
            </a>
            <a href={`#metrics/explore?q=http_request_duration_seconds{service="${line.service}"}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle">
              <ChartLine aria-hidden className="size-3.5 text-fg-muted" />
              Metrics latency
            </a>
            <a href={`#alerts/rules/new?from=logs&service=${line.service}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle">
              <Bell aria-hidden className="size-3.5 text-fg-muted" />
              Create alert
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

function LogHeader() {
  return (
    <div aria-hidden className="grid grid-cols-[14px_96px_52px_110px_110px_minmax(0,1fr)] gap-2 border-b border-line bg-canvas px-3 py-1.5 text-2xs font-medium tracking-wider text-fg-muted uppercase">
      <span />
      <span>Time</span>
      <span>Level</span>
      <span>Host</span>
      <span>Service</span>
      <span>Message</span>
    </div>
  );
}

/* --------------------------------------------------------------- stories */

/** Explorer: query, facets, error/warn histogram and expandable log lines that link into other products. */
function ExplorerPage() {
  const [draft, setDraft] = useState("env:prod -service:healthcheck");
  const [query, setQuery] = useState(draft);
  const [range, setRange] = useState("1h");
  const [levels, setLevels] = useState<string[]>([]);
  const [hostSel, setHostSel] = useState<string[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [open, setOpen] = useState<string | null>(null);

  const shown = useMemo(() => {
    const words = query
      .split(/\s+/)
      .filter((w) => w && !w.includes(":"))
      .map((w) => w.toLowerCase());
    return lines.filter(
      (l) =>
        (levels.length === 0 || levels.includes(l.level)) &&
        (hostSel.length === 0 || hostSel.includes(l.host)) &&
        (services.length === 0 || services.includes(l.service)) &&
        words.every((w) => l.message.toLowerCase().includes(w)),
    );
  }, [query, levels, hostSel, services]);

  const anyFilter = levels.length + hostSel.length + services.length > 0;
  return (
    <>
      <PageHeader
        title="Explorer"
        description="41.2 M lines in the last hour · 12 sources · 30 day retention"
        actions={
          <>
            <Button icon={<Bookmark />}>Save view</Button>
            <Button icon={<Download />}>Export</Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <QueryBar value={draft} onChange={setDraft} onSubmit={setQuery} label="Log query" placeholder='service:orders-api level:error "timeout"' />
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
      </PageHeader>
      <FilterBar
        onClear={
          anyFilter
            ? () => {
                setLevels([]);
                setHostSel([]);
                setServices([]);
              }
            : undefined
        }
      >
        <FacetFilter
          label="Level"
          selected={levels}
          onChange={setLevels}
          options={(["fatal", "error", "warn", "info", "debug"] as const).map((l) => ({ value: l, label: <LevelBadge level={l} />, count: count("level", l) }))}
        />
        <FacetFilter label="Host" searchable selected={hostSel} onChange={setHostSel} options={uniq(lines.map((l) => l.host)).map((h) => ({ value: h, count: count("host", h) }))} />
        <FacetFilter label="Service" selected={services} onChange={setServices} options={uniq(lines.map((l) => l.service)).map((s) => ({ value: s, count: count("service", s) }))} />
        {query
          .split(/\s+/)
          .filter((w) => w.includes(":"))
          .map((w) => {
            const neg = w.startsWith("-");
            const [f, v] = w.replace(/^-/, "").split(":");
            return <FilterChip key={w} field={f!} value={v} negate={neg} />;
          })}
      </FilterBar>
      <Callout tone="warning" title="Error rate on orders-api is 9× its 7-day baseline" action={<Button size="sm">Show pattern</Button>}>
        84% of new errors share the pattern “upstream timeout after * calling payments-svc”. Started 13:48 on api-prod-03.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Errors and warnings per minute" description="Last 30 minutes">
          <StackedBarChart
            label="Errors and warnings per minute"
            categories={minutes}
            segments={[
              { id: "error", name: "Error", color: "var(--oa-danger)" },
              { id: "warn", name: "Warn", color: "var(--oa-warning)" },
            ]}
            values={histogram}
            height={120}
            xTicks={6}
          />
        </Panel>
        <Panel title="Top error hosts">
          <BarList
            label="Hosts with the most errors"
            items={[
              { id: "a3", label: "api-prod-03", value: 1842, href: "#infrastructure/hosts/api-prod-03" },
              { id: "e2", label: "edge-fra-02", value: 412, href: "#infrastructure/hosts/edge-fra-02" },
              { id: "d1", label: "db-prod-01", value: 208, href: "#infrastructure/hosts/db-prod-01" },
              { id: "w4", label: "worker-prod-04", value: 37, href: "#infrastructure/hosts/worker-prod-04" },
            ]}
          />
        </Panel>
      </div>
      <Panel
        title="Log lines"
        description={`${shown.length} of ${lines.length} shown · newest first`}
        actions={<StatusBadge tone="info">Sampled 1:1</StatusBadge>}
        flush
      >
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <LogHeader />
            <ul aria-label="Log lines" className="flex flex-col">
              {shown.map((l) => (
                <LogRow key={l.id} line={l} open={open === l.id} onToggle={() => setOpen((o) => (o === l.id ? null : l.id))} />
              ))}
            </ul>
            {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-fg-muted">No log lines match these filters.</p>}
          </div>
        </div>
      </Panel>
    </>
  );
  
}

const STREAM = lines.slice(0, 12).reverse();

/** Live tail: new lines arrive every second until paused. */
function LiveTailPage() {
  const [paused, setPaused] = useState(false);
  const [tick, setTick] = useState(8);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [paused]);
  const shown = Array.from({ length: tick }, (_, i) => {
    const l = STREAM[i % STREAM.length]!;
    const sec = 14 * 3600 + i * 2;
    return {
      ...l,
      id: `t${i}`,
      ts: `2026-10-19 ${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}.${String((i * 211) % 1000).padStart(3, "0")}`,
    };
  })
    .reverse()
    .slice(0, 40);
  return (
    <>
      <PageHeader
        title="Live tail"
        description="service:orders-api OR host:api-prod-03"
        meta={paused ? <StatusBadge tone="neutral">Paused</StatusBadge> : <StatusBadge tone="success">Streaming</StatusBadge>}
        actions={
          <Button variant={paused ? "primary" : "secondary"} icon={paused ? <Play /> : <Pause />} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
            {paused ? "Resume" : "Pause"}
          </Button>
        }
      />
      <Panel title="Stream" description={`${tick} lines received · ~1 line/s after sampling`} flush>
        <LogHeader />
        <ul aria-label="Live log lines" aria-live={paused ? "off" : "polite"} className="flex flex-col">
          {shown.map((l) => (
            <li key={l.id} className="grid grid-cols-[14px_96px_52px_110px_110px_minmax(0,1fr)] items-center gap-2 border-b border-subtle px-3 py-1 last:border-0">
              <span />
              <span className="font-mono text-2xs text-fg-muted tabular-nums">{l.ts.slice(11)}</span>
              <LevelBadge level={l.level} />
              <span className="truncate font-mono text-xs text-fg-muted">{l.host}</span>
              <span className="truncate font-mono text-xs text-fg-muted">{l.service}</span>
              <span className="truncate font-mono text-xs text-fg">{l.message}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
  
}

/* ------------------------------------------------------------- saved views */

interface SavedView {
  id: string;
  name: string;
  query: string;
  owner: string;
  shared: boolean;
  alert?: string;
  hits24h: number;
  opened: string;
}

const SAVED: SavedView[] = [
  { id: "v1", name: "orders-api errors", query: "service:orders-api level:>=error", owner: PEOPLE[0], shared: true, alert: "> 50 / 5 min → #orders-oncall", hits24h: 4812, opened: "2 min ago" },
  { id: "v2", name: "Postgres pool saturation", query: "service:postgres \"connection pool saturated\"", owner: PEOPLE[2], shared: true, alert: "> 5 / 5 min → Alerts", hits24h: 311, opened: "14 min ago" },
  { id: "v3", name: "SSH failures", query: "service:sshd \"Failed password\"", owner: PEOPLE[4], shared: true, alert: "> 20 / 1 min → SIEM", hits24h: 1290, opened: "1 h ago" },
  { id: "v4", name: "Edge 5xx", query: "service:nginx http.status_code:>=500", owner: PEOPLE[3], shared: true, hits24h: 822, opened: "3 h ago" },
  { id: "v5", name: "Billing retries", query: "service:billing-worker retrying", owner: PEOPLE[6], shared: false, hits24h: 140, opened: "Yesterday" },
  { id: "v6", name: "OOM kills", query: "service:kernel \"Out of memory\"", owner: PEOPLE[1], shared: true, alert: "any → #infra", hits24h: 3, opened: "Yesterday" },
];

function SavedViewsPage() {
  const [query, setQuery] = useState("");
  const [mine, setMine] = useState(false);
  const [items, setItems] = useState(SAVED);
  const rows = items.filter((v) => (!mine || v.owner === PEOPLE[1]) && (!query || `${v.name} ${v.query}`.toLowerCase().includes(query.toLowerCase())));
  const cols: Column<SavedView>[] = [
    { id: "name", header: "View", width: "22%", cell: (v) => <span className="font-medium">{v.name}</span> },
    { id: "query", header: "Query", width: "32%", cell: (v) => <code className="block truncate font-mono text-xs">{v.query}</code> },
    { id: "owner", header: "Owner", cell: (v) => <span className="text-xs">{v.owner}</span> },
    { id: "alert", header: "Alert", cell: (v) => (v.alert ? <Badge tone="info" icon={<Bell />}>{v.alert}</Badge> : <span className="text-fg-subtle">–</span>) },
    { id: "hits", header: "Hits · 24 h", align: "right", mono: true, sortValue: (v) => v.hits24h, cell: (v) => formatNumber(v.hits24h) },
    { id: "opened", header: "Last opened", cell: (v) => <span className="text-xs text-fg-muted">{v.opened}</span> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      width: "44px",
      hideable: false,
      cell: (v) => (
        <IconButton label={`Delete ${v.name}`} size="xs" onClick={() => setItems((all) => all.filter((x) => x.id !== v.id))}>
          <Trash2 />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Saved views" description="Queries saved by the team. A view with an alert is evaluated every minute." />
      <FilterBar onClear={query || mine ? () => (setQuery(""), setMine(false)) : undefined}>
        <SearchInput label="Search saved views" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
        <Switch checked={mine} onCheckedChange={setMine} label="Only mine" />
      </FilterBar>
      <Panel title="Saved views" description={`${rows.length} shown`} flush>
        <DataTable label="Saved views" columns={cols} rows={rows} getRowId={(v) => v.id} defaultSort={{ id: "hits", direction: "desc" }} minWidth={940} empty={<p className="py-8">No saved views match</p>} />
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- patterns */

interface Pattern {
  id: string;
  level: LogLevel;
  service: string;
  template: string;
  count: number;
  trend: number[];
  isNew: boolean;
}

const PATTERNS: Pattern[] = [
  { id: "p1", level: "info", service: "orders-api", template: "<METHOD> /v1/orders<*> <STATUS> in <DURATION>", count: 1_840_220, trend: wave(30, { base: 60, amp: 10, seed: 11 }), isNew: false },
  { id: "p2", level: "error", service: "orders-api", template: "upstream timeout after <NUM>ms calling payments-svc POST /v2/charge", count: 4_102, trend: wave(30, { base: 2, amp: 1, seed: 12, spike: 30, spikeAt: 18, spikeLen: 5 }), isNew: true },
  { id: "p3", level: "error", service: "orders-api", template: "pq: remaining connection slots are reserved for non-replication superuser connections", count: 710, trend: wave(30, { base: 0.5, amp: 0.4, seed: 13, spike: 12, spikeAt: 19, spikeLen: 4 }), isNew: true },
  { id: "p4", level: "warn", service: "postgres", template: "connection pool saturated: <NUM>/<NUM> in use, <NUM> waiting", count: 311, trend: wave(30, { base: 0.5, amp: 0.4, seed: 14, spike: 9, spikeAt: 16, spikeLen: 6 }), isNew: false },
  { id: "p5", level: "warn", service: "sshd", template: "Failed password for invalid user <USER> from <IP> port <NUM> ssh2", count: 1_290, trend: wave(30, { base: 40, amp: 10, seed: 15 }), isNew: false },
  { id: "p6", level: "info", service: "billing-worker", template: "invoice batch <TIMESTAMP> processed: <NUM> invoices", count: 24, trend: wave(30, { base: 1, amp: 0.1, seed: 16 }), isNew: false },
  { id: "p7", level: "fatal", service: "kernel", template: "Out of memory: Killed process <PID> (<NAME>) total-vm:<NUM>kB", count: 3, trend: wave(30, { base: 0, amp: 0.1, seed: 17, spike: 1, spikeAt: 20, spikeLen: 1 }), isNew: true },
];

function PatternsPage() {
  const [range, setRange] = useState("1h");
  const [onlyNew, setOnlyNew] = useState(false);
  const [level, setLevel] = useState<string[]>([]);
  const rows = PATTERNS.filter((p) => (!onlyNew || p.isNew) && (level.length === 0 || level.includes(p.level)));
  const cols: Column<Pattern>[] = [
    { id: "level", header: "Level", width: "80px", cell: (p) => <LevelBadge level={p.level} /> },
    { id: "service", header: "Service", mono: true, cell: (p) => p.service },
    {
      id: "template",
      header: "Pattern",
      width: "46%",
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <code className="truncate font-mono text-xs" title={p.template}>
            {p.template}
          </code>
          {p.isNew && <Badge tone="info">New</Badge>}
        </span>
      ),
    },
    { id: "trend", header: "Last 30 min", width: "130px", cell: (p) => <Sparkline data={p.trend} label={`Volume of ${p.template}`} height={22} /> },
    { id: "count", header: "Count · 24 h", align: "right", mono: true, sortValue: (p) => p.count, cell: (p) => formatNumber(p.count) },
  ];
  return (
    <>
      <PageHeader title="Patterns" description="Log lines clustered into templates. Variables like IDs, IPs and durations are masked." />
      <FilterBar onClear={level.length || onlyNew ? () => (setLevel([]), setOnlyNew(false)) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter label="Level" selected={level} onChange={setLevel} options={uniq(PATTERNS.map((p) => p.level)).map((l) => ({ value: l, count: PATTERNS.filter((p) => p.level === l).length }))} />
        <Switch checked={onlyNew} onCheckedChange={setOnlyNew} label="Only new in this range" />
      </FilterBar>
      <Callout tone="warning" title="3 new error patterns since 13:45">
        They line up with the orders-api p95 spike and the Postgres pool saturation. Open INC-141 to see them together.
      </Callout>
      <Panel title="Patterns" description={`${rows.length} templates from 1.85 M lines`} flush>
        <DataTable label="Log patterns" columns={cols} rows={rows} getRowId={(p) => p.id} defaultSort={{ id: "count", direction: "desc" }} minWidth={900} />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- pipelines */

interface Pipeline {
  id: string;
  name: string;
  source: string;
  processors: string[];
  inRate: string;
  dropped: number;
  enabled: boolean;
  errors: number;
}

const PIPELINES: Pipeline[] = [
  { id: "pl1", name: "Kubernetes containers", source: "OTel collector · k8s filelog", processors: ["Parse JSON", "Add k8s metadata", "Map severity to level", "Drop health checks"], inRate: "8.4k lines/s", dropped: 22, enabled: true, errors: 0 },
  { id: "pl2", name: "nginx access", source: "Vector · /var/log/nginx/access.log", processors: ["Parse combined log format", "GeoIP on remote_addr", "Sample 2xx at 10%"], inRate: "3.1k lines/s", dropped: 81, enabled: true, errors: 0 },
  { id: "pl3", name: "System journals", source: "journald · 48 hosts", processors: ["Parse syslog", "Mask passwords", "Route sshd to SIEM"], inRate: "1.2k lines/s", dropped: 4, enabled: true, errors: 0 },
  { id: "pl4", name: "Postgres", source: "Vector · postgresql.log", processors: ["Parse csvlog", "Extract duration", "Mask query literals"], inRate: "420 lines/s", dropped: 0, enabled: true, errors: 12 },
  { id: "pl5", name: "Windows events", source: "Winlogbeat · 12 hosts", processors: ["Parse EVTX XML", "Keep security channel only"], inRate: "90 lines/s", dropped: 64, enabled: true, errors: 0 },
  { id: "pl6", name: "Legacy app (FTP)", source: "Fluent Bit · legacy-01", processors: ["Parse custom regex"], inRate: "0 lines/s", dropped: 0, enabled: false, errors: 0 },
];

function PipelinesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(PIPELINES.map((p) => [p.id, p.enabled])));
  const [active, setActive] = useState("pl1");
  const cur = PIPELINES.find((p) => p.id === active);
  const cols: Column<Pipeline>[] = [
    { id: "name", header: "Pipeline", width: "24%", cell: (p) => <span className="flex flex-col"><span className="font-medium">{p.name}</span><span className="truncate text-2xs text-fg-muted">{p.source}</span></span> },
    { id: "rate", header: "In", align: "right", mono: true, cell: (p) => p.inRate },
    { id: "dropped", header: "Dropped", align: "right", mono: true, description: "Share of lines dropped or sampled away before storage.", sortValue: (p) => p.dropped, cell: (p) => `${p.dropped}%` },
    { id: "errors", header: "Parse errors · 1 h", align: "right", mono: true, sortValue: (p) => p.errors, cell: (p) => (p.errors ? <span className="text-danger-text">{p.errors}</span> : 0) },
    { id: "on", header: "Enabled", cell: (p) => <Switch checked={enabled[p.id] ?? false} onCheckedChange={(v) => setEnabled((e) => ({ ...e, [p.id]: v }))} label={<span className="sr-only">Enable {p.name}</span>} /> },
  ];
  return (
    <>
      <PageHeader title="Pipelines" description="Parse, enrich, mask and sample logs before they are stored. Changes apply within 30 seconds." actions={<Button variant="primary" icon={<GitBranch />}>New pipeline</Button>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Pipelines" flush>
          <DataTable label="Pipelines" columns={cols} rows={PIPELINES} getRowId={(p) => p.id} onRowClick={(p) => setActive(p.id)} activeRowId={active} minWidth={720} />
        </Panel>
        <Panel title="Processors" description={cur?.name} aria-label="Pipeline processors">
          {cur && (
            <div className="flex flex-col gap-2">
              <ol aria-label={`Processors of ${cur.name}`} className="flex flex-col gap-1">
                {cur.processors.map((p, i) => (
                  <li key={p} className="flex items-center gap-2 rounded border border-line px-2 py-1 text-sm">
                    <span className="w-4 font-mono text-2xs text-fg-muted">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ol>
              {cur.errors > 0 && (
                <Callout tone="danger" title={`${cur.errors} lines failed to parse in the last hour`}>
                  Multi-line statements break the csvlog parser. Failed lines are kept raw under parse_error:true.
                </Callout>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- archives */

interface ArchiveRow {
  id: string;
  range: string;
  tier: "hot" | "warm" | "archive";
  size: number;
  lines: string;
  location: string;
  state: "searchable" | "archived" | "rehydrating";
}

const ARCHIVES: ArchiveRow[] = [
  { id: "a1", range: "Oct 12 – Oct 19", tier: "hot", size: 1.9e12, lines: "11.8 B", location: "local NVMe", state: "searchable" },
  { id: "a2", range: "Sep 19 – Oct 11", tier: "warm", size: 4.2e12, lines: "31.4 B", location: "local HDD", state: "searchable" },
  { id: "a3", range: "Aug 2026", tier: "archive", size: 3.1e12, lines: "40.2 B", location: "s3://acme-log-archive/2026/08", state: "archived" },
  { id: "a4", range: "Jul 2026", tier: "archive", size: 2.9e12, lines: "38.7 B", location: "s3://acme-log-archive/2026/07", state: "archived" },
  { id: "a5", range: "Jun 2026", tier: "archive", size: 2.7e12, lines: "36.0 B", location: "s3://acme-log-archive/2026/06", state: "archived" },
];

function ArchivesPage() {
  const [items, setItems] = useState(ARCHIVES);
  const cols: Column<ArchiveRow>[] = [
    { id: "range", header: "Range", cell: (a) => <span className="font-medium">{a.range}</span> },
    { id: "tier", header: "Tier", cell: (a) => <Badge tone={a.tier === "hot" ? "danger" : a.tier === "warm" ? "warning" : "neutral"}>{a.tier}</Badge> },
    { id: "size", header: "Size", align: "right", mono: true, sortValue: (a) => a.size, cell: (a) => formatBytes(a.size) },
    { id: "lines", header: "Lines", align: "right", mono: true, cell: (a) => a.lines },
    { id: "loc", header: "Location", cell: (a) => <span className="font-mono text-xs">{a.location}</span> },
    { id: "state", header: "State", cell: (a) => <StatusBadge tone={a.state === "searchable" ? "success" : a.state === "rehydrating" ? "info" : "neutral"}>{a.state}</StatusBadge> },
    {
      id: "act",
      header: "",
      width: "110px",
      hideable: false,
      cell: (a) =>
        a.state === "archived" ? (
          <Button size="xs" onClick={() => setItems((all) => all.map((x) => (x.id === a.id ? { ...x, state: "rehydrating" } : x)))} aria-label={`Rehydrate ${a.range}`}>
            Rehydrate
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Archives" description="Retention: 7 days hot, 30 days warm, 400 days in object storage (ISO 27001 A.8.15 and SOC 2 CC7.2)." />
      <KpiGrid>
        <KpiCard label="Ingest" value="1.2" unit="TB / day" />
        <KpiCard label="Searchable" value="30" unit="days" />
        <KpiCard label="Archived" value="400" unit="days" delta={{ label: "Write-once bucket" }} />
        <KpiCard label="Storage cost" value="$1,460" unit="/ month" />
      </KpiGrid>
      <Panel title="Data by age" flush>
        <DataTable label="Log archives" columns={cols} rows={items} getRowId={(a) => a.id} minWidth={900} />
      </Panel>
      {items.some((a) => a.state === "rehydrating") && (
        <p role="status" className="text-sm text-success">
          Rehydration started · searchable in about 40 minutes, kept for 7 days
        </p>
      )}
    </>
  );
}

const PAGES = {
  explorer: () => <ExplorerPage />,
  live: () => <LiveTailPage />,
  saved: () => <SavedViewsPage />,
  patterns: () => <PatternsPage />,
  pipelines: () => <PipelinesPage />,
  archives: () => <ArchivesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="logs" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Explorer: Story = {
  ...app("explorer"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Explorer" })).toBeInTheDocument();
    await expect(c.getAllByTestId("bar")).toHaveLength(30);

    const list = c.getByRole("list", { name: "Log lines" });
    const total = within(list).getAllByRole("button").length;

    // Level facet narrows to errors only.
    await userEvent.click(c.getByRole("button", { name: /^Level/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /ERROR/ }));
    await userEvent.keyboard("{Escape}");
    const errorRows = within(list).getAllByRole("button");
    await expect(errorRows.length).toBeLessThan(total);
    for (const row of errorRows) await expect(row.querySelector("[data-level]")).toHaveAttribute("data-level", "error");

    // Expand a line: attributes and cross-product links.
    await userEvent.click(errorRows[0]!);
    await expect(errorRows[0]).toHaveAttribute("aria-expanded", "true");
    const detail = c.getByRole("region", { name: /Log details/ });
    await expect(detail).toHaveTextContent("trace_id");
    await expect(detail).toHaveTextContent("http.route");
    await expect(within(detail).getByRole("link", { name: "Infrastructure host" })).toHaveAttribute("href", expect.stringContaining("#infrastructure/hosts/"));
    await expect(within(detail).getByRole("link", { name: "Create alert" })).toBeInTheDocument();

    // Free text query.
    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    const input = c.getByRole("textbox", { name: "Log query" });
    await userEvent.clear(input);
    await userEvent.type(input, "kworkerd{Enter}");
    await expect(within(list).getAllByRole("button").every((b) => b.textContent?.includes("kworkerd"))).toBe(true);
  },
};

export const LiveTail: Story = {
  ...app("live"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Pause" }));
    await expect(c.getByText("Paused")).toBeInTheDocument();
    const list = c.getByRole("list", { name: "Live log lines" });
    const n = within(list).getAllByRole("listitem").length;
    await new Promise((r) => setTimeout(r, 1200));
    await expect(within(list).getAllByRole("listitem")).toHaveLength(n);
    await userEvent.click(c.getByRole("button", { name: "Resume" }));
    await expect(c.getByText("Streaming")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Pause" }));
  },
};

export const SavedViews: Story = {
  name: "Saved views",
  ...app("saved"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Only mine" }));
    await expect(c.getByRole("table", { name: "Saved views" }).querySelectorAll("tbody tr")).toHaveLength(1);
    await userEvent.click(c.getByRole("button", { name: "Delete OOM kills" }));
    await expect(c.getByText("No saved views match")).toBeInTheDocument();
  },
};

export const Patterns: Story = {
  ...app("patterns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Only new in this range" }));
    await expect(c.getByRole("table", { name: "Log patterns" }).querySelectorAll("tbody tr")).toHaveLength(3);
  },
};

export const Pipelines: Story = {
  ...app("pipelines"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Pipelines" })).getByText("Postgres"));
    await expect(c.getByText("12 lines failed to parse in the last hour")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Enable Legacy app (FTP)" }));
    await expect(c.getByRole("switch", { name: "Enable Legacy app (FTP)" })).toBeChecked();
  },
};

export const Archives: Story = {
  ...app("archives"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Rehydrate Aug 2026" }));
    await expect(c.getByText(/Rehydration started/)).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Log archives" })).getByText("rehydrating")).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
