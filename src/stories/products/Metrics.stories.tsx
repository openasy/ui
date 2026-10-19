import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { ArrowLeft, ChartLine, Compass, Crosshair, History, LayoutDashboard, List, Pencil, Plus, RefreshCw, Share2, Sigma, Star, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Panel } from "../../components/Panel";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { FilterBar, FacetFilter, FilterChip, QueryBar, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { ChartSync } from "../../charts/ChartSync";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { Sparkline } from "../../charts/Sparkline";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, timeLabels, wave } from "../mocks";

const nav = [
  { id: "dashboards", label: "Dashboards", icon: LayoutDashboard, count: 23 },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "metrics", label: "Metric list", icon: List, count: "4.1k" },
  { id: "rules", label: "Recording rules", icon: Sigma, count: 18 },
  { id: "targets", label: "Targets", icon: Crosshair, count: 96 },
];

const meta = {
  title: "Products/Metrics",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const N = 60;
const labels = timeLabels(N, 1);
/** The incident starts here: a miner lands on api-prod-03 at 13:48. */
const AT = 36;

const pct = (v: number) => `${Math.round(v)}%`;
const clamp = (xs: number[], max = 100) => xs.map((v) => Math.min(max, v));

const PANELS = {
  cpu: [
    { id: "a1", name: "api-prod-01", data: wave(N, { base: 34, amp: 5, seed: 41 }) },
    { id: "a3", name: "api-prod-03", data: clamp(wave(N, { base: 38, amp: 5, seed: 42, spike: 58, spikeAt: AT, spikeLen: 4 })) },
    { id: "a5", name: "api-prod-05", data: wave(N, { base: 31, amp: 5, seed: 43, spike: 9, spikeAt: AT + 4 }) },
  ],
  rps: [
    { id: "2xx", name: "2xx", color: "var(--oa-chart-1)", data: wave(N, { base: 1240, amp: 120, seed: 44, spike: -380, spikeAt: AT + 2, spikeLen: 6 }) },
    { id: "5xx", name: "5xx", color: "var(--oa-danger)", data: wave(N, { base: 4, amp: 2, seed: 45, spike: 96, spikeAt: AT + 2, spikeLen: 6 }) },
  ],
  latency: [
    { id: "p95", name: "p95", color: "var(--oa-chart-2)", data: wave(N, { base: 0.42, amp: 0.06, seed: 46, spike: 2.9, spikeAt: AT + 1, spikeLen: 7 }) },
    { id: "p50", name: "p50", color: "var(--oa-chart-1)", data: wave(N, { base: 0.09, amp: 0.02, seed: 47, spike: 0.6, spikeAt: AT + 1, spikeLen: 7 }) },
  ],
  pool: [
    { id: "use", name: "in use", color: "var(--oa-chart-3)", data: clamp(wave(N, { base: 18, amp: 4, seed: 48, spike: 40, spikeAt: AT + 3, spikeLen: 5 }), 50) },
    { id: "wait", name: "waiting", color: "var(--oa-chart-4)", data: wave(N, { base: 0, amp: 0.5, seed: 49, spike: 37, spikeAt: AT + 6, spikeLen: 5 }) },
  ],
  mem: [
    { id: "a1", name: "api-prod-01", data: wave(N, { base: 58, amp: 3, seed: 50 }) },
    { id: "a3", name: "api-prod-03", data: clamp(wave(N, { base: 61, amp: 3, seed: 51, spike: 22, spikeAt: AT + 2, spikeLen: 10 })) },
    { id: "a5", name: "api-prod-05", data: wave(N, { base: 55, amp: 3, seed: 52 }) },
  ],
  net: [
    { id: "rx", name: "rx", data: wave(N, { base: 38, amp: 8, seed: 53, spike: -9, spikeAt: AT + 2 }) },
    { id: "tx", name: "tx", data: wave(N, { base: 21, amp: 5, seed: 54, spike: 34, spikeAt: AT, spikeLen: 3 }) },
  ],
};

interface DashboardRow {
  id: string;
  name: string;
  folder: string;
  owner: string;
  panels: number;
  tags: string[];
  updated: string;
  views: number;
  starred: boolean;
}

const DASHBOARDS: DashboardRow[] = [
  { id: "orders-api", name: "orders-api", folder: "Payments", owner: PEOPLE[3], panels: 6, tags: ["red", "slo"], updated: "2 h ago", views: 1840, starred: true },
  { id: "node", name: "Node exporter · full", folder: "Platform", owner: PEOPLE[2], panels: 24, tags: ["hosts"], updated: "yesterday", views: 3210, starred: true },
  { id: "k8s", name: "Kubernetes · cluster overview", folder: "Platform", owner: PEOPLE[6], panels: 18, tags: ["k8s"], updated: "3 d ago", views: 2204, starred: false },
  { id: "pg", name: "PostgreSQL · db-prod", folder: "Data", owner: PEOPLE[0], panels: 14, tags: ["db"], updated: "5 d ago", views: 980, starred: true },
  { id: "kafka", name: "Kafka consumer lag", folder: "Data", owner: PEOPLE[0], panels: 8, tags: ["queues"], updated: "1 w ago", views: 612, starred: false },
  { id: "billing", name: "billing-worker", folder: "Payments", owner: PEOPLE[3], panels: 9, tags: ["red"], updated: "1 w ago", views: 455, starred: false },
  { id: "edge", name: "Edge · nginx", folder: "Platform", owner: PEOPLE[2], panels: 11, tags: ["edge", "red"], updated: "2 w ago", views: 820, starred: false },
  { id: "slo", name: "SLO burn rates", folder: "Reliability", owner: PEOPLE[1], panels: 12, tags: ["slo"], updated: "2 w ago", views: 1503, starred: true },
  { id: "vpn", name: "VPN nodes", folder: "Security", owner: PEOPLE[4], panels: 7, tags: ["vpn"], updated: "1 mo ago", views: 214, starred: false },
  { id: "cost", name: "Ingest volume and cost", folder: "Reliability", owner: PEOPLE[1], panels: 10, tags: ["billing"], updated: "1 mo ago", views: 377, starred: false },
];

type MetricType = "counter" | "gauge" | "histogram" | "summary";

interface MetricRow {
  id: string;
  name: string;
  type: MetricType;
  unit: string;
  series: number;
  labels: Array<{ name: string; values: number }>;
  help: string;
  job: string;
  trend: number[];
}

const METRICS: MetricRow[] = [
  { name: "http_request_duration_seconds_bucket", type: "histogram" as MetricType, unit: "seconds", series: 48210, labels: [{ name: "le", values: 14 }, { name: "route", values: 62 }, { name: "service", values: 24 }, { name: "pod", values: 41 }, { name: "code", values: 9 }], help: "Latency of HTTP requests handled by the server.", job: "kubernetes-pods" },
  { name: "http_requests_total", type: "counter" as MetricType, unit: "requests", series: 6120, labels: [{ name: "route", values: 62 }, { name: "service", values: 24 }, { name: "code", values: 9 }, { name: "method", values: 5 }], help: "Total HTTP requests by route and status code.", job: "kubernetes-pods" },
  { name: "node_cpu_seconds_total", type: "counter" as MetricType, unit: "seconds", series: 3072, labels: [{ name: "instance", values: 48 }, { name: "cpu", values: 8 }, { name: "mode", values: 8 }], help: "Seconds the CPUs spent in each mode.", job: "node" },
  { name: "node_memory_MemAvailable_bytes", type: "gauge" as MetricType, unit: "bytes", series: 48, labels: [{ name: "instance", values: 48 }], help: "Memory available for new processes.", job: "node" },
  { name: "node_filesystem_avail_bytes", type: "gauge" as MetricType, unit: "bytes", series: 212, labels: [{ name: "instance", values: 48 }, { name: "mountpoint", values: 6 }, { name: "fstype", values: 3 }], help: "Filesystem space available to non-root users.", job: "node" },
  { name: "pgbouncer_pools_client_waiting_connections", type: "gauge" as MetricType, unit: "connections", series: 12, labels: [{ name: "database", values: 4 }, { name: "user", values: 3 }], help: "Clients waiting for a server connection.", job: "pgbouncer" },
  { name: "kube_pod_container_status_restarts_total", type: "counter" as MetricType, unit: "restarts", series: 1248, labels: [{ name: "namespace", values: 18 }, { name: "pod", values: 312 }, { name: "container", values: 96 }], help: "Container restarts per pod.", job: "kube-state-metrics" },
  { name: "kafka_consumergroup_lag", type: "gauge" as MetricType, unit: "messages", series: 384, labels: [{ name: "consumergroup", values: 12 }, { name: "topic", values: 16 }, { name: "partition", values: 24 }], help: "Messages behind the latest offset.", job: "kafka-exporter" },
  { name: "process_resident_memory_bytes", type: "gauge" as MetricType, unit: "bytes", series: 96, labels: [{ name: "job", values: 9 }, { name: "instance", values: 96 }], help: "Resident memory of the exporter process.", job: "all" },
  { name: "grpc_server_handling_seconds", type: "summary" as MetricType, unit: "seconds", series: 940, labels: [{ name: "grpc_method", values: 47 }, { name: "grpc_service", values: 6 }, { name: "quantile", values: 4 }], help: "gRPC handling time as a summary.", job: "kubernetes-pods" },
  { name: "up", type: "gauge" as MetricType, unit: "", series: 96, labels: [{ name: "job", values: 9 }, { name: "instance", values: 96 }], help: "1 when the last scrape of the target succeeded.", job: "all" },
  { name: "vpn_auth_failures_total", type: "counter" as MetricType, unit: "attempts", series: 14, labels: [{ name: "src_ip", values: 7 }, { name: "node", values: 2 }], help: "Failed VPN sign-ins by source address.", job: "openasy-vpn" },
].map((m, i) => ({ ...m, id: `m${i}`, trend: wave(24, { base: m.series, amp: m.series * 0.05, seed: 80 + i }) }));

interface RecordingRule {
  id: string;
  group: string;
  record: string;
  expr: string;
  interval: string;
  lastEval: string;
  evalMs: number;
  series: number;
  health: "ok" | "err";
}

const RULES: RecordingRule[] = [
  { id: "rr1", group: "http.rules", record: "service:http_requests:rate5m", expr: "sum by (service) (rate(http_requests_total[5m]))", interval: "30s", lastEval: "12 s ago", evalMs: 41, series: 24, health: "ok" },
  { id: "rr2", group: "http.rules", record: "service:http_errors:ratio5m", expr: 'sum by (service) (rate(http_requests_total{code=~"5.."}[5m])) / sum by (service) (rate(http_requests_total[5m]))', interval: "30s", lastEval: "12 s ago", evalMs: 58, series: 24, health: "ok" },
  { id: "rr3", group: "http.rules", record: "service_route:latency_p95:5m", expr: "histogram_quantile(0.95, sum by (service, route, le) (rate(http_request_duration_seconds_bucket[5m])))", interval: "30s", lastEval: "12 s ago", evalMs: 412, series: 1488, health: "ok" },
  { id: "rr4", group: "node.rules", record: "instance:node_cpu:ratio", expr: ' 1 - avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m]))', interval: "1m", lastEval: "41 s ago", evalMs: 22, series: 48, health: "ok" },
  { id: "rr5", group: "node.rules", record: "instance:node_memory_used:ratio", expr: "1 - node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes", interval: "1m", lastEval: "41 s ago", evalMs: 9, series: 48, health: "ok" },
  { id: "rr6", group: "slo.rules", record: "slo:orders_api:error_budget_burn1h", expr: "(1 - slo:orders_api:availability1h) / (1 - 0.999)", interval: "1m", lastEval: "18 s ago", evalMs: 6, series: 1, health: "ok" },
  { id: "rr7", group: "slo.rules", record: "slo:orders_api:availability1h", expr: 'sum(rate(http_requests_total{service="orders-api",code!~"5.."}[1h])) / sum(rate(http_requests_total{service="orders-api"}[1h]))', interval: "1m", lastEval: "18 s ago", evalMs: 31, series: 1, health: "ok" },
  { id: "rr8", group: "kafka.rules", record: "topic:kafka_consumergroup_lag:sum", expr: "sum by (topic, consumergroup) (kafka_consumergroup_lag)", interval: "30s", lastEval: "3 m ago", evalMs: 0, series: 0, health: "err" },
];

type TargetHealth = "up" | "down" | "unknown";

interface Target {
  id: string;
  job: string;
  endpoint: string;
  labels: string;
  health: TargetHealth;
  lastScrape: string;
  durationMs: number;
  samples: number;
  error?: string;
}

const JOBS = ["node", "kubernetes-pods", "kube-state-metrics", "pgbouncer", "kafka-exporter", "blackbox"] as const;

const TARGETS: Target[] = Array.from({ length: 30 }, (_, i) => {
  const job = JOBS[i % JOBS.length]!;
  const ip = `192.0.2.${10 + i * 3}`;
  const port = { node: 9100, "kubernetes-pods": 8080, "kube-state-metrics": 8080, pgbouncer: 9127, "kafka-exporter": 9308, blackbox: 9115 }[job];
  const down = i === 7 || i === 19;
  const unknown = i === 26;
  return {
    id: `t${i}`,
    job,
    endpoint: `http://${ip}:${port}/metrics`,
    labels: job === "node" ? `instance="${["api-prod-01", "api-prod-03", "db-prod-01", "edge-fra-02", "worker-prod-04"][i % 5]}"` : `namespace="${["orders", "billing", "platform"][i % 3]}"`,
    health: down ? "down" : unknown ? "unknown" : "up",
    lastScrape: unknown ? "never" : `${(i * 7) % 29 + 1} s ago`,
    durationMs: down ? 10000 : 18 + ((i * 37) % 260),
    samples: down || unknown ? 0 : 400 + ((i * 991) % 9000),
    error: i === 7 ? "Get \"http://192.0.2.31:8080/metrics\": context deadline exceeded" : i === 19 ? "dial tcp 192.0.2.67:8080: connect: connection refused" : undefined,
  } satisfies Target;
});

const HEALTH: Record<TargetHealth, { tone: Tone; label: string }> = {
  up: { tone: "success", label: "Up" },
  down: { tone: "danger", label: "Down" },
  unknown: { tone: "neutral", label: "Unknown" },
};

/* --------------------------------------------------------------- pages */

function DashboardView({ onBack }: { onBack?: () => void }) {
  const [range, setRange] = useState("1h");
  const [vars, setVars] = useState<Array<{ field: string; value: string }>>([
    { field: "env", value: "prod" },
    { field: "service", value: "orders-api" },
    { field: "host", value: "All" },
  ]);
  const [refresh, setRefresh] = useState("30s");
  const height = 150;
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Dashboards", href: "#dashboards" }, { label: "Payments" }, { label: "orders-api" }]}
        title="orders-api"
        description="RED metrics, saturation and host resources · owned by Payments team"
        meta={<StatusBadge tone="danger">2 alerts firing</StatusBadge>}
        actions={
          <>
            {onBack && (
              <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack}>
                All dashboards
              </Button>
            )}
            <SegmentedControl
              label="Auto refresh"
              value={refresh}
              onChange={setRefresh}
              options={[
                { value: "off", label: "Off" },
                { value: "30s", label: "30 s" },
                { value: "1m", label: "1 m" },
              ]}
            />
            <IconButton label="Refresh now">
              <RefreshCw />
            </IconButton>
            <Button icon={<Share2 />}>Share</Button>
            <Button icon={<Pencil />}>Edit</Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        {vars.map((v) => (
          <FilterChip key={v.field} field={v.field} value={v.value} onRemove={v.field === "env" ? undefined : () => setVars((xs) => xs.filter((x) => x.field !== v.field))} />
        ))}
        <Button size="sm" variant="ghost" icon={<ChartLine />}>
          Add panel
        </Button>
      </FilterBar>
      <Callout tone="danger" title="Latency p95 above the 2 s SLO since 13:49" action={<Button size="sm">Open incident INC-142</Button>}>
        CPU on api-prod-03 hit 97% at 13:48, a minute before 5xx and DB pool waiters climbed.
      </Callout>
      <ChartSync>
        <div className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
          <Panel title="CPU by host · %" description="node_cpu_seconds_total">
            <TimeSeriesChart label="CPU by host" labels={labels} height={height} yMax={100} format={pct} threshold={{ value: 85, label: "alert 85%" }} series={PANELS.cpu} xTicks={4} />
          </Panel>
          <Panel title="Requests / s" description="by status class">
            <TimeSeriesChart label="Requests per second, 2xx and 5xx" labels={labels} height={height} format={(v) => `${Math.round(v)}`} series={PANELS.rps} xTicks={4} />
          </Panel>
          <Panel title="Latency · s" description="histogram_quantile over http_request_duration_seconds">
            <TimeSeriesChart label="Latency p95 and p50" labels={labels} height={height} area={false} format={(v) => `${v.toFixed(2)} s`} threshold={{ value: 2, label: "SLO 2 s" }} series={PANELS.latency} xTicks={4} />
          </Panel>
          <Panel title="DB pool" description="pgbouncer connections">
            <TimeSeriesChart label="Database pool in use and waiting" labels={labels} height={height} format={(v) => `${Math.round(v)}`} threshold={{ value: 50, label: "pool size 50" }} series={PANELS.pool} xTicks={4} />
          </Panel>
          <Panel title="Memory by host · %">
            <TimeSeriesChart label="Memory by host" labels={labels} height={height} yMax={100} format={pct} series={PANELS.mem} area={false} xTicks={4} />
          </Panel>
          <Panel title="Network · MB/s">
            <TimeSeriesChart label="Network receive and transmit" labels={labels} height={height} format={(v) => `${v.toFixed(1)} MB/s`} series={PANELS.net} xTicks={4} />
          </Panel>
        </div>
      </ChartSync>
    </>
  );
}

function DashboardsPage({ initialOpen }: { initialOpen?: string }) {
  const [open, setOpen] = useState<string | undefined>(initialOpen);
  const [q, setQ] = useState("");
  const [folders, setFolders] = useState<string[]>([]);
  const [tab, setTab] = useState<"all" | "starred">("all");
  const [stars, setStars] = useState<Record<string, boolean>>(Object.fromEntries(DASHBOARDS.map((d) => [d.id, d.starred])));
  if (open === "orders-api") return <DashboardView onBack={() => setOpen(undefined)} />;
  const folderNames = Array.from(new Set(DASHBOARDS.map((d) => d.folder)));
  const shown = DASHBOARDS.filter(
    (d) => (tab === "all" || stars[d.id]) && (folders.length === 0 || folders.includes(d.folder)) && d.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const cols: Column<DashboardRow>[] = [
    {
      id: "star",
      header: <span className="sr-only">Starred</span>,
      label: "Starred",
      width: "44px",
      hideable: false,
      cell: (d) => (
        <IconButton label={stars[d.id] ? `Unstar ${d.name}` : `Star ${d.name}`} size="xs" aria-pressed={!!stars[d.id]} onClick={() => setStars((s) => ({ ...s, [d.id]: !s[d.id] }))}>
          <Star className={cn(stars[d.id] && "fill-current text-warning-text")} />
        </IconButton>
      ),
    },
    {
      id: "name",
      header: "Dashboard",
      pinned: "left",
      width: "30%",
      sortValue: (d) => d.name,
      cell: (d) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" onClick={() => setOpen(d.id)} className="truncate text-left font-medium text-fg hover:underline">
            {d.name}
          </button>
          <span className="text-2xs text-fg-muted">{d.folder}</span>
        </span>
      ),
    },
    { id: "tags", header: "Tags", cell: (d) => <span className="flex flex-wrap gap-1">{d.tags.map((t) => <Badge key={t} mono>{t}</Badge>)}</span> },
    {
      id: "owner",
      header: "Owner",
      sortValue: (d) => d.owner,
      cell: (d) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={d.owner} size="sm" />
          <span className="truncate text-xs">{d.owner}</span>
        </span>
      ),
    },
    { id: "panels", header: "Panels", align: "right", mono: true, sortValue: (d) => d.panels, cell: (d) => d.panels },
    { id: "views", header: "Views · 30 d", align: "right", mono: true, sortValue: (d) => d.views, cell: (d) => formatNumber(d.views), description: "Times the dashboard was opened in the last 30 days." },
    { id: "updated", header: "Updated", cell: (d) => <span className="text-xs text-fg-muted">{d.updated}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Dashboards"
        description="23 dashboards in 5 folders · provisioned from git for Platform and Payments"
        actions={
          <>
            <SearchInput label="Search dashboards" shortcut="/" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button>Import JSON</Button>
            <Button variant="primary" icon={<Plus />}>
              New dashboard
            </Button>
          </>
        }
      >
        <Tabs
          label="Dashboard scope"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: DASHBOARDS.length },
            { value: "starred", label: "Starred", count: Object.values(stars).filter(Boolean).length },
          ]}
        />
      </PageHeader>
      <FilterBar onClear={folders.length ? () => setFolders([]) : undefined}>
        <FacetFilter label="Folder" selected={folders} onChange={setFolders} options={folderNames.map((f) => ({ value: f, count: DASHBOARDS.filter((d) => d.folder === f).length }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Dashboards" description={`${shown.length} of ${DASHBOARDS.length}`} flush>
          <DataTable
            label="Dashboards"
            columns={cols}
            rows={shown}
            getRowId={(d) => d.id}
            defaultSort={{ id: "views", direction: "desc" }}
            minWidth={820}
            empty={<EmptyState title="No dashboards match" icon={<LayoutDashboard />}>Clear the search or folder filter.</EmptyState>}
          />
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Most viewed · 30 d">
            <BarList label="Most viewed dashboards" items={[...DASHBOARDS].sort((a, b) => b.views - a.views).slice(0, 5).map((d) => ({ id: d.id, label: d.name, value: d.views }))} />
          </Panel>
          <Panel title="Recently viewed" flush>
            <ul className="flex flex-col text-sm">
              {DASHBOARDS.slice(0, 4).map((d, i) => (
                <li key={d.id} className="flex items-center justify-between gap-2 border-b border-subtle px-3 py-1.5 last:border-0">
                  <span className="truncate">{d.name}</span>
                  <span className="text-2xs whitespace-nowrap text-fg-muted">{["5 min ago", "1 h ago", "yesterday", "2 d ago"][i]}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

const EXAMPLES = [
  'sum by (service) (rate(http_requests_total{code=~"5.."}[5m]))',
  'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{service="orders-api"}[5m])))',
  'avg by (instance) (rate(node_cpu_seconds_total{mode!="idle"}[5m]))',
];

function seriesFor(query: string) {
  const seed = query.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const by = /by \(([^)]+)\)/.exec(query)?.[1]?.split(",")[0]?.trim();
  const values: Record<string, string[]> = {
    service: ["orders-api", "billing-worker", "auth-service", "inventory-api"],
    instance: ["api-prod-01", "api-prod-03", "api-prod-05", "db-prod-01"],
    le: ["p95"],
  };
  const names = by ? (values[by] ?? ["a", "b", "c"]) : ["value"];
  return names.map((n, i) => ({ id: `${by ?? "v"}-${i}`, name: by && by !== "le" ? `{${by}="${n}"}` : n, data: wave(N, { base: 20 + ((seed + i * 13) % 40), amp: 6, seed: seed + i, spike: i === 1 ? 30 : 0, spikeAt: AT }) }));
}

function balanced(q: string) {
  let d = 0;
  for (const ch of q) {
    if (ch === "(") d++;
    if (ch === ")") d--;
    if (d < 0) return false;
  }
  return d === 0;
}

function ExplorePage() {
  const [draft, setDraft] = useState(EXAMPLES[0]!);
  const [query, setQuery] = useState(EXAMPLES[0]!);
  const [range, setRange] = useState("1h");
  const [mode, setMode] = useState<"lines" | "stacked">("lines");
  const [history, setHistory] = useState<string[]>([EXAMPLES[0]!, EXAMPLES[2]!]);
  const ok = balanced(query);
  const series = ok ? seriesFor(query) : [];
  const run = (q: string) => {
    setQuery(q);
    setDraft(q);
    if (balanced(q)) setHistory((h) => [q, ...h.filter((x) => x !== q)].slice(0, 6));
  };
  const stats = series.map((s) => ({
    id: s.id,
    name: s.name,
    last: s.data[s.data.length - 1]!,
    min: Math.min(...s.data),
    max: Math.max(...s.data),
    avg: s.data.reduce((a, b) => a + b, 0) / s.data.length,
  }));
  return (
    <>
      <PageHeader
        title="Explore"
        description="Ad-hoc PromQL against 4.1k metrics · results are not saved until you add them to a dashboard"
        actions={
          <>
            <Button icon={<LayoutDashboard />} disabled={!ok}>
              Add to dashboard
            </Button>
            <Button icon={<Share2 />}>Share link</Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <QueryBar value={draft} onChange={setDraft} onSubmit={run} label="PromQL query" placeholder="rate(http_requests_total[5m])" />
          <TimeRangePicker value={range} onChange={setRange} />
        </div>
      </PageHeader>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-fg-muted">Examples</span>
        {EXAMPLES.map((e, i) => (
          <Button key={e} size="xs" variant="ghost" onClick={() => run(e)} aria-label={`Run example ${i + 1}: ${e}`}>
            <span className="max-w-72 truncate font-mono">{e}</span>
          </Button>
        ))}
      </div>
      {!ok && (
        <Callout tone="danger" title="Parse error: unclosed parenthesis">
          1:{query.length} unexpected end of input in <span className="font-mono">{query}</span>
        </Callout>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel
            title="Graph"
            description={ok ? `${series.length} series · step 60 s · 2,114 samples read in 38 ms` : "No result"}
            actions={
              <SegmentedControl
                label="Chart style"
                value={mode}
                onChange={setMode}
                options={[
                  { value: "lines", label: "Lines" },
                  { value: "stacked", label: "Stacked" },
                ]}
              />
            }
          >
            {ok ? (
              <TimeSeriesChart label={`Result of ${query}`} labels={labels} series={series} stacked={mode === "stacked"} area={mode === "stacked"} height={240} xTicks={6} format={(v) => v.toFixed(1)} />
            ) : (
              <EmptyState title="Fix the query to see a graph" icon={<ChartLine />} />
            )}
          </Panel>
          <Panel title="Series" description="Values over the selected range" flush>
            <DataTable
              label="Result series"
              rows={stats}
              getRowId={(s) => s.id}
              minWidth={560}
              empty={<p className="py-6 text-sm text-fg-muted">No series</p>}
              columns={[
                { id: "name", header: "Series", pinned: "left", cell: (s) => <span className="font-mono text-xs">{s.name}</span> },
                { id: "last", header: "Last", align: "right", mono: true, sortValue: (s) => s.last, cell: (s) => s.last.toFixed(2) },
                { id: "min", header: "Min", align: "right", mono: true, sortValue: (s) => s.min, cell: (s) => s.min.toFixed(2) },
                { id: "max", header: "Max", align: "right", mono: true, sortValue: (s) => s.max, cell: (s) => s.max.toFixed(2) },
                { id: "avg", header: "Avg", align: "right", mono: true, sortValue: (s) => s.avg, cell: (s) => s.avg.toFixed(2) },
              ]}
            />
          </Panel>
        </div>
        <Panel title="Query history" flush>
          <ul aria-label="Query history" className="flex flex-col">
            {history.map((h) => (
              <li key={h} className="border-b border-subtle last:border-0">
                <button type="button" onClick={() => run(h)} className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-canvas">
                  <History aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fg-muted" />
                  <span className="font-mono text-2xs break-all text-fg">{h}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

const TYPE_TONE: Record<MetricType, Tone> = { counter: "info", gauge: "success", histogram: "warning", summary: "neutral" };

function MetricListPage() {
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [active, setActive] = useState<string | undefined>(undefined);
  const shown = METRICS.filter((m) => (types.length === 0 || types.includes(m.type)) && m.name.includes(q.trim().toLowerCase()));
  const m = METRICS.find((x) => x.id === active);
  const cols: Column<MetricRow>[] = [
    { id: "name", header: "Metric", pinned: "left", width: "36%", sortValue: (x) => x.name, cell: (x) => <span className="block truncate font-mono text-xs font-medium">{x.name}</span> },
    { id: "type", header: "Type", sortValue: (x) => x.type, cell: (x) => <Badge tone={TYPE_TONE[x.type]}>{x.type}</Badge> },
    { id: "unit", header: "Unit", cell: (x) => <span className="text-xs text-fg-muted">{x.unit || "—"}</span> },
    { id: "series", header: "Series", align: "right", mono: true, sortValue: (x) => x.series, cell: (x) => formatNumber(x.series), description: "Active time series (cardinality) in the last hour. Each unique label combination is one series." },
    { id: "labels", header: "Labels", align: "right", mono: true, sortValue: (x) => x.labels.length, cell: (x) => x.labels.length },
    { id: "trend", header: "Series · 24 h", width: "130px", cell: (x) => <Sparkline data={x.trend} label={`Series count of ${x.name}`} height={20} className="w-24" /> },
    { id: "job", header: "Job", mono: true, cell: (x) => x.job },
  ];
  return (
    <>
      <PageHeader title="Metric list" description="4,112 metric names · 412k active series · limit 1M" actions={<Button>Export CSV</Button>} />
      <KpiGrid minWidth={170}>
        <KpiCard label="Active series" value="412k" unit="of 1M" trend={wave(24, { base: 400, amp: 12, seed: 91 })} delta={{ label: "+3.2% this week", direction: "up" }} />
        <KpiCard label="Metric names" value="4,112" delta={{ label: "+38 new today", direction: "up" }} />
        <KpiCard label="Samples / s" value="182k" unit="ingested" />
        <KpiCard label="High cardinality" value="3" tone="warning" unit="metrics > 10k series" />
      </KpiGrid>
      <FilterBar onClear={types.length || q ? () => (setTypes([]), setQ("")) : undefined}>
        <SearchInput label="Search metrics" value={q} onChange={(e) => setQ(e.target.value)} className="w-72" />
        <FacetFilter label="Type" selected={types} onChange={setTypes} options={(["counter", "gauge", "histogram", "summary"] as const).map((t) => ({ value: t, count: METRICS.filter((x) => x.type === t).length }))} />
      </FilterBar>
      <div className={cn("grid gap-2.5", m && "xl:grid-cols-[minmax(0,1fr)_340px]")}>
        <Panel title="Metrics" description={`${shown.length} shown`} flush>
          <DataTable label="Metrics" columns={cols} rows={shown} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} defaultSort={{ id: "series", direction: "desc" }} minWidth={860} pageSize={12} />
        </Panel>
        {m && (
          <Panel
            title={<span className="font-mono">{m.name}</span>}
            description={m.help}
            aria-label="Metric detail"
            className="xl:sticky xl:top-3 xl:self-start"
            actions={
              <IconButton label="Close metric details" size="sm" onClick={() => setActive(undefined)}>
                <X />
              </IconButton>
            }
          >
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-1.5">
                <Badge tone={TYPE_TONE[m.type]}>{m.type}</Badge>
                {m.unit && <Badge mono>{m.unit}</Badge>}
                <Badge mono>job={m.job}</Badge>
              </div>
              {m.series > 10000 && (
                <Callout tone="warning" title="High cardinality">
                  The <span className="font-mono">pod</span> label multiplies series. Consider aggregating in a recording rule.
                </Callout>
              )}
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold">Distinct values per label</h3>
                <BarList label={`Label cardinality of ${m.name}`} items={m.labels.map((l) => ({ id: l.name, label: l.name, value: l.values }))} />
              </div>
              <Button size="sm" icon={<Compass />}>
                Open in Explore
              </Button>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

function RecordingRulesPage() {
  const [rows, setRows] = useState(RULES);
  const [adding, setAdding] = useState(false);
  const [record, setRecord] = useState("");
  const [expr, setExpr] = useState("");
  const [group, setGroup] = useState("http.rules");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const groups = Array.from(new Set(rows.map((r) => r.group)));
  const cols: Column<RecordingRule>[] = [
    {
      id: "record",
      header: "Record",
      pinned: "left",
      width: "40%",
      sortValue: (r) => r.record,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-medium">{r.record}</span>
          <code className="truncate font-mono text-2xs text-fg-muted">{r.expr}</code>
        </span>
      ),
    },
    { id: "group", header: "Group", sortValue: (r) => r.group, cell: (r) => <Badge mono>{r.group}</Badge> },
    { id: "health", header: "Health", sortValue: (r) => r.health, cell: (r) => <StatusBadge tone={r.health === "ok" ? "success" : "danger"}>{r.health === "ok" ? "OK" : "Error"}</StatusBadge> },
    { id: "interval", header: "Interval", mono: true, cell: (r) => r.interval },
    { id: "eval", header: "Eval time", align: "right", mono: true, sortValue: (r) => r.evalMs, cell: (r) => <span className={cn(r.evalMs > 300 && "text-warning-text")}>{r.evalMs} ms</span>, description: "How long the last evaluation took. Slow rules delay every rule after them in the group." },
    { id: "series", header: "Series", align: "right", mono: true, sortValue: (r) => r.series, cell: (r) => formatNumber(r.series), description: "Series written by the last evaluation." },
    { id: "last", header: "Last run", cell: (r) => <span className="text-xs text-fg-muted">{r.lastEval}</span> },
  ];
  const submit = () => {
    if (!/^[a-z][a-z0-9_:]*$/.test(record)) {
      setError("Use level:metric:operations, lower case with colons, e.g. service:http_requests:rate5m");
      return;
    }
    setRows((rs) => [...rs, { id: `rr${rs.length + 1}`, group, record, expr: expr || "sum(up)", interval: "30s", lastEval: "pending", evalMs: 0, series: 0, health: "ok" }]);
    setNotice(`Recording rule ${record} added to ${group}`);
    setAdding(false);
    setRecord("");
    setExpr("");
    setError("");
  };
  return (
    <>
      <PageHeader
        title="Recording rules"
        description="Precomputed series for dashboards and alerts · 4 groups · evaluated by 2 rulers"
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>
            New recording rule
          </Button>
        }
      />
      <Callout tone="danger" title="kafka.rules failed for 3 minutes">
        topic:kafka_consumergroup_lag:sum · many-to-many matching not allowed: matching labels must be unique on one side.
      </Callout>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      {adding && (
        <Panel title="New recording rule" actions={<Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>}>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_160px_auto] md:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <TextField label="Record name" mono value={record} onChange={(e) => setRecord(e.target.value)} placeholder="service:http_requests:rate5m" error={error || undefined} />
            <TextField label="Expression" mono value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="sum by (service) (rate(http_requests_total[5m]))" />
            <SelectField label="Group" value={group} onChange={(e) => setGroup(e.target.value)} options={groups.map((g) => ({ value: g, label: g }))} />
            <Button type="submit" variant="primary" className="md:mt-5">
              Save rule
            </Button>
          </form>
        </Panel>
      )}
      <KpiGrid minWidth={170}>
        {groups.map((g) => {
          const rs = rows.filter((r) => r.group === g);
          const bad = rs.some((r) => r.health === "err");
          return (
            <KpiCard
              key={g}
              label={g}
              value={rs.length}
              unit="rules"
              tone={bad ? "danger" : undefined}
              delta={{ label: `${rs.reduce((a, r) => a + r.evalMs, 0)} ms per run`, intent: bad ? "bad" : "neutral" }}
            />
          );
        })}
      </KpiGrid>
      <Panel title="Rules" flush>
        <DataTable label="Recording rules" columns={cols} rows={rows} getRowId={(r) => r.id} minWidth={900} />
      </Panel>
    </>
  );
}

function TargetsPage() {
  const [tab, setTab] = useState<"all" | TargetHealth>("all");
  const [jobs, setJobs] = useState<string[]>([]);
  const [active, setActive] = useState<string | undefined>("t7");
  const shown = TARGETS.filter((t) => (tab === "all" || t.health === tab) && (jobs.length === 0 || jobs.includes(t.job)));
  const t = TARGETS.find((x) => x.id === active);
  const count = (h: TargetHealth) => TARGETS.filter((x) => x.health === h).length;
  const cols: Column<Target>[] = [
    { id: "endpoint", header: "Endpoint", pinned: "left", width: "30%", sortValue: (x) => x.endpoint, cell: (x) => <span className="block truncate font-mono text-xs">{x.endpoint}</span> },
    { id: "job", header: "Job", sortValue: (x) => x.job, cell: (x) => <Badge mono>{x.job}</Badge> },
    { id: "health", header: "State", sortValue: (x) => x.health, cell: (x) => <StatusBadge tone={HEALTH[x.health].tone}>{HEALTH[x.health].label}</StatusBadge> },
    { id: "labels", header: "Labels", cell: (x) => <span className="truncate font-mono text-2xs text-fg-muted">{x.labels}</span> },
    { id: "last", header: "Last scrape", cell: (x) => <span className="text-xs">{x.lastScrape}</span> },
    { id: "dur", header: "Duration", align: "right", mono: true, sortValue: (x) => x.durationMs, cell: (x) => (x.durationMs >= 10000 ? <span className="text-danger-text">timeout</span> : `${x.durationMs} ms`), description: "Time the last scrape took. The scrape timeout is 10 s." },
    { id: "samples", header: "Samples", align: "right", mono: true, sortValue: (x) => x.samples, cell: (x) => formatNumber(x.samples), description: "Samples returned by the last scrape after relabelling." },
  ];
  return (
    <>
      <PageHeader title="Targets" description="96 scrape targets in 6 jobs · interval 30 s · service discovery: Kubernetes, file_sd" actions={<Button icon={<RefreshCw />}>Reload configuration</Button>}>
        <Tabs
          label="Target health"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: TARGETS.length },
            { value: "up", label: "Up", count: count("up") },
            { value: "down", label: "Down", count: count("down") },
            { value: "unknown", label: "Unknown", count: count("unknown") },
          ]}
        />
      </PageHeader>
      <KpiGrid minWidth={170}>
        <KpiCard label="Up" value={count("up")} tone="success" unit={`of ${TARGETS.length}`} />
        <KpiCard label="Down" value={count("down")} tone="danger" delta={{ label: "since 13:52", intent: "bad" }} />
        <KpiCard label="Avg scrape" value="94" unit="ms" trend={wave(24, { base: 90, amp: 12, seed: 95 })} />
        <KpiCard label="Samples / scrape" value="4.6k" unit="avg" />
      </KpiGrid>
      <FilterBar onClear={jobs.length ? () => setJobs([]) : undefined}>
        <FacetFilter label="Job" selected={jobs} onChange={setJobs} options={JOBS.map((j) => ({ value: j, count: TARGETS.filter((x) => x.job === j).length }))} />
      </FilterBar>
      <div className={cn("grid gap-2.5", t && "xl:grid-cols-[minmax(0,1fr)_320px]")}>
        <Panel title="Targets" description={`${shown.length} shown`} flush>
          <DataTable label="Scrape targets" columns={cols} rows={shown} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} minWidth={900} pageSize={10} defaultSort={{ id: "health", direction: "asc" }} />
        </Panel>
        {t && (
          <Panel title="Target" description={t.job} aria-label="Target detail" className="xl:sticky xl:top-3 xl:self-start" actions={<IconButton label="Close target details" size="sm" onClick={() => setActive(undefined)}><X /></IconButton>}>
            <div className="flex flex-col gap-2.5 text-sm">
              <span className="font-mono text-xs break-all">{t.endpoint}</span>
              <StatusBadge tone={HEALTH[t.health].tone}>{HEALTH[t.health].label}</StatusBadge>
              {t.error && (
                <Callout tone="danger" title="Last scrape failed">
                  <span className="font-mono text-xs break-all">{t.error}</span>
                </Callout>
              )}
              <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                <dt className="text-fg-muted">Labels</dt>
                <dd className="font-mono break-all">{t.labels}</dd>
                <dt className="text-fg-muted">Last scrape</dt>
                <dd>{t.lastScrape}</dd>
                <dt className="text-fg-muted">Scrape interval</dt>
                <dd className="font-mono">30s · timeout 10s</dd>
              </dl>
              <Sparkline data={t.health === "up" ? wave(24, { base: t.durationMs, amp: 10, seed: 3 }) : Array.from({ length: 24 }, (_, i) => (i > 17 ? 10000 : 80))} label="Scrape duration · 2 h" height={36} color={t.health === "up" ? undefined : "var(--oa-danger)"} format={(v) => `${Math.round(v)} ms`} />
              <Button size="sm">Scrape now</Button>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- app */

const PAGES = {
  dashboards: () => <DashboardsPage />,
  explore: () => <ExplorePage />,
  metrics: () => <MetricListPage />,
  rules: () => <RecordingRulesPage />,
  targets: () => <TargetsPage />,
};

const app = (initial: string, pages: Record<string, () => ReactNode> = PAGES): Story => ({
  render: () => <ProductApp product="metrics" nav={nav} pages={pages} initial={initial} />,
});

/* --------------------------------------------------------------- stories */

export const Dashboards: Story = {
  ...app("dashboards"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Dashboards" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /Starred/ }));
    await expect(within(c.getByRole("table", { name: "Dashboards" })).getAllByRole("row")).toHaveLength(5);
    await userEvent.click(c.getByRole("button", { name: "orders-api" }));
    await expect(c.getByRole("heading", { level: 1, name: "orders-api" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "All dashboards" }));
    await expect(c.getByRole("heading", { level: 1, name: "Dashboards" })).toBeInTheDocument();
  },
};

/** Dashboard: six synced panels for orders-api, during an incident that starts at 13:48. */
export const Dashboard: Story = {
  ...app("dashboards", { ...PAGES, dashboards: () => <DashboardsPage initialOpen="orders-api" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "orders-api" })).toBeInTheDocument();
    await expect(c.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Dashboards");

    // Hovering one chart marks the same moment on all six; only the hovered one shows a tooltip.
    const sliders = c.getAllByRole("slider");
    await expect(sliders).toHaveLength(6);
    const r = sliders[0]!.getBoundingClientRect();
    await fireEvent.pointerMove(sliders[0]!, { clientX: r.left + r.width * 0.7, clientY: r.top + 5 });
    await expect(c.getAllByTestId("crosshair")).toHaveLength(6);
    await expect(c.getAllByRole("status")).toHaveLength(1);
    sliders[0]!.focus();
    await userEvent.keyboard("{Escape}");
    await expect(c.queryAllByTestId("crosshair")).toHaveLength(0);

    // Template variables can be removed.
    await userEvent.click(c.getByRole("button", { name: "Remove filter host" }));
    await expect(c.queryByRole("button", { name: "Remove filter host" })).not.toBeInTheDocument();
  },
};

export const Explore: Story = {
  ...app("explore"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByRole("textbox", { name: "PromQL query" });
    await userEvent.clear(input);
    await userEvent.type(input, "sum(rate(up{Enter}");
    await expect(c.getByText("Parse error: unclosed parenthesis")).toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, 'avg by (instance) (up){Enter}');
    await expect(c.getByRole("table", { name: "Result series" })).toHaveTextContent('{instance="api-prod-03"}');
    await expect(within(c.getByRole("list", { name: "Query history" })).getAllByRole("button")[0]).toHaveTextContent("avg by (instance) (up)");
  },
};

export const MetricList: Story = {
  name: "Metric list",
  ...app("metrics"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search metrics" }), "http_request");
    const table = c.getByRole("table", { name: "Metrics" });
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await userEvent.click(within(table).getByText("http_request_duration_seconds_bucket"));
    await expect(c.getByRole("region", { name: "Metric detail" })).toHaveTextContent("High cardinality");
  },
};

export const RecordingRules: Story = {
  name: "Recording rules",
  ...app("rules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New recording rule" }));
    await userEvent.type(c.getByRole("textbox", { name: "Record name" }), "Bad Name");
    await userEvent.click(c.getByRole("button", { name: "Save rule" }));
    await expect(c.getByText(/Use level:metric:operations/)).toBeInTheDocument();
    await userEvent.clear(c.getByRole("textbox", { name: /Record name/ }));
    await userEvent.type(c.getByRole("textbox", { name: /Record name/ }), "service:http_bytes:rate5m");
    await userEvent.click(c.getByRole("button", { name: "Save rule" }));
    await expect(c.getByText("Recording rule service:http_bytes:rate5m added to http.rules")).toBeInTheDocument();
    await expect(c.getByRole("table", { name: "Recording rules" })).toHaveTextContent("service:http_bytes:rate5m");
  },
};

export const Targets: Story = {
  ...app("targets"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Target detail" })).toHaveTextContent("context deadline exceeded");
    await userEvent.click(c.getByRole("tab", { name: /Down/ }));
    const table = c.getByRole("table", { name: "Scrape targets" });
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await userEvent.click(within(table).getByText("http://192.0.2.67:8080/metrics"));
    await expect(c.getByRole("region", { name: "Target detail" })).toHaveTextContent("connection refused");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
