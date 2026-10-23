import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Cable, Copy, FileSearch, LayoutGrid, Lock, Play, Repeat, Square, TableProperties, Waypoints } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { ChartSync } from "../../charts/ChartSync";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { formatNumber } from "../../lib/format";
import { cn } from "../../lib/cn";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "queries", label: "Queries", icon: TableProperties, count: "1.2k" },
  { id: "locks", label: "Locks", icon: Lock },
  { id: "replication", label: "Replication", icon: Repeat },
  { id: "connections", label: "Connections", icon: Cable },
  { id: "explain", label: "Explain", icon: FileSearch },
];

const meta = {
  title: "Products/Database",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const N = 48;
const labels = timeLabels(N, 5);
const AT = 34;

interface PlanNode {
  op: string;
  detail?: string;
  cost: string;
  rows: number;
  time: number;
  hot?: boolean;
  children?: PlanNode[];
}

interface Query {
  id: string;
  sql: string;
  calls: number;
  mean: number;
  rows: number;
  db: string;
  plan: PlanNode;
  index?: { sql: string; gain: string };
}

const queries: Query[] = [
  {
    id: "q1",
    sql: "SELECT * FROM orders WHERE customer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT $3",
    calls: 418_220,
    mean: 38.4,
    rows: 1_254_660,
    db: "orders",
    plan: {
      op: "Limit",
      cost: "0.00..18421.40",
      rows: 20,
      time: 41.2,
      children: [
        {
          op: "Sort",
          detail: "Sort Key: created_at DESC · top-N heapsort · 27 kB",
          cost: "18412.10..18421.40",
          rows: 20,
          time: 41.1,
          children: [
            {
              op: "Seq Scan on orders",
              detail: "Filter: (customer_id = $1) AND (status = $2) · Rows Removed by Filter: 2,481,302",
              cost: "0.00..18390.00",
              rows: 3,
              time: 40.7,
              hot: true,
            },
          ],
        },
      ],
    },
    index: {
      sql: "CREATE INDEX CONCURRENTLY idx_orders_customer_status_created\n  ON orders (customer_id, status, created_at DESC);",
      gain: "Est. 40.7 ms → 0.08 ms per call · saves 4.6 h of DB time per day",
    },
  },
  {
    id: "q2",
    sql: "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2",
    calls: 96_310,
    mean: 61.9,
    rows: 96_310,
    db: "orders",
    plan: {
      op: "Update on orders",
      cost: "0.43..8.45",
      rows: 0,
      time: 61.5,
      children: [
        {
          op: "Index Scan using orders_pkey on orders",
          detail: "Index Cond: (id = $2) · lock wait 61.2 ms (row share)",
          cost: "0.43..8.45",
          rows: 1,
          time: 61.3,
          hot: true,
        },
      ],
    },
  },
  {
    id: "q3",
    sql: "SELECT oi.*, p.name, p.sku FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ANY($1)",
    calls: 211_004,
    mean: 7.2,
    rows: 2_810_440,
    db: "orders",
    plan: {
      op: "Hash Join",
      detail: "Hash Cond: (oi.product_id = p.id)",
      cost: "412.20..1904.70",
      rows: 14,
      time: 7.0,
      children: [
        {
          op: "Index Scan using order_items_order_id_idx on order_items oi",
          detail: "Index Cond: (order_id = ANY ($1))",
          cost: "0.43..1480.10",
          rows: 14,
          time: 2.1,
        },
        {
          op: "Hash",
          detail: "Buckets: 16384 · Memory: 1 204 kB",
          cost: "290.00..290.00",
          rows: 9_812,
          time: 4.6,
          hot: true,
          children: [{ op: "Seq Scan on products p", cost: "0.00..290.00", rows: 9_812, time: 3.9 }],
        },
      ],
    },
    index: {
      sql: "CREATE INDEX CONCURRENTLY idx_order_items_order_product\n  ON order_items (order_id) INCLUDE (product_id, quantity, price);",
      gain: "Index Only Scan · est. 7.0 ms → 2.4 ms per call",
    },
  },
  {
    id: "q4",
    sql: "INSERT INTO events (type, payload, created_at) VALUES ($1, $2, $3)",
    calls: 1_920_400,
    mean: 0.41,
    rows: 1_920_400,
    db: "events",
    plan: { op: "Insert on events", cost: "0.00..0.01", rows: 0, time: 0.38, children: [{ op: "Result", cost: "0.00..0.01", rows: 1, time: 0.01 }] },
  },
  {
    id: "q5",
    sql: "SELECT count(*) FROM sessions WHERE expires_at > now() AND user_id = $1",
    calls: 640_118,
    mean: 1.1,
    rows: 640_118,
    db: "accounts",
    plan: {
      op: "Aggregate",
      cost: "8.46..8.47",
      rows: 1,
      time: 1.0,
      children: [
        {
          op: "Index Only Scan using sessions_user_id_expires_at_idx on sessions",
          detail: "Index Cond: (user_id = $1) AND (expires_at > now())",
          cost: "0.43..8.45",
          rows: 2,
          time: 0.9,
        },
      ],
    },
  },
  {
    id: "q6",
    sql: "SELECT date_trunc('day', created_at) d, sum(total) FROM orders WHERE created_at >= $1 GROUP BY 1 ORDER BY 1",
    calls: 288,
    mean: 2_840,
    rows: 8_640,
    db: "orders",
    plan: {
      op: "GroupAggregate",
      cost: "120412.00..131020.40",
      rows: 30,
      time: 2_838,
      children: [
        {
          op: "Sort",
          detail: "Sort Key: (date_trunc('day', created_at)) · external merge Disk: 182 MB",
          cost: "120412.00..124210.00",
          rows: 1_520_004,
          time: 2_610,
          hot: true,
          children: [{ op: "Seq Scan on orders", detail: "Filter: (created_at >= $1)", cost: "0.00..48210.00", rows: 1_520_004, time: 620 }],
        },
      ],
    },
    index: {
      sql: "CREATE INDEX CONCURRENTLY idx_orders_created_at\n  ON orders (created_at) INCLUDE (total);\n-- and raise work_mem for the reports role to 256MB",
      gain: "Est. 2.8 s → 310 ms · removes the on-disk sort",
    },
  },
  {
    id: "q7",
    sql: "SELECT id, email FROM users WHERE lower(email) = lower($1)",
    calls: 52_890,
    mean: 12.6,
    rows: 52_890,
    db: "accounts",
    plan: {
      op: "Seq Scan on users",
      detail: "Filter: (lower(email) = lower($1)) · Rows Removed by Filter: 214,880",
      cost: "0.00..6120.00",
      rows: 1,
      time: 12.4,
      hot: true,
    },
    index: { sql: "CREATE INDEX CONCURRENTLY idx_users_lower_email\n  ON users (lower(email));", gain: "Est. 12.4 ms → 0.05 ms per call" },
  },
];

const totalTime = (q: Query) => q.calls * q.mean;
const ALL_TIME = queries.reduce((s, q) => s + totalTime(q), 0);
const fmtMs = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} s` : v >= 10 ? `${v.toFixed(1)} ms` : `${v.toFixed(2)} ms`);
const fmtHours = (msTotal: number) => {
  const s = msTotal / 1000;
  return s >= 3600 ? `${(s / 3600).toFixed(1)} h` : s >= 60 ? `${(s / 60).toFixed(1)} min` : `${s.toFixed(1)} s`;
};

const queryColumns: Column<Query>[] = [
  {
    id: "sql",
    header: "Query",
    width: "42%",
    cell: (q) => (
      <span className="flex min-w-0 flex-col">
        <span className="block max-w-[440px] truncate font-mono text-xs" title={q.sql}>
          {q.sql}
        </span>
        <span className="text-2xs text-fg-muted">
          {q.db} · {q.id}
        </span>
      </span>
    ),
  },
  { id: "calls", header: "Calls", align: "right", mono: true, sortValue: (q) => q.calls, cell: (q) => formatNumber(q.calls, { compact: true }) },
  {
    id: "mean",
    header: "Mean",
    align: "right",
    mono: true,
    sortValue: (q) => q.mean,
    cell: (q) => <span className={cn(q.mean >= 1000 ? "text-danger-text" : q.mean >= 30 ? "text-warning-text" : "text-fg")}>{fmtMs(q.mean)}</span>,
  },
  { id: "total", header: "Total", align: "right", mono: true, sortValue: totalTime, cell: (q) => fmtHours(totalTime(q)) },
  { id: "rows", header: "Rows", align: "right", mono: true, sortValue: (q) => q.rows, cell: (q) => formatNumber(q.rows, { compact: true }) },
  {
    id: "share",
    header: "% of time",
    width: "150px",
    sortValue: totalTime,
    cell: (q) => {
      const share = (totalTime(q) / ALL_TIME) * 100;
      return (
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-subtle">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${share}%` }} />
          </span>
          <span className="font-mono text-xs">{share.toFixed(1)}%</span>
        </span>
      );
    },
  },
];

/* --------------------------------------------------------------- explain */

/** Not in the library yet: an EXPLAIN ANALYZE plan as an indented tree. */
function PlanTree({ node, depth = 0 }: { node: PlanNode; depth?: number }) {
  return (
    <li>
      <div
        className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-subtle py-1.5 pr-3 text-xs", node.hot && "bg-warning-soft")}
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <span className="flex min-w-0 flex-col">
          <span className="flex min-w-0 gap-1 font-mono">
            {depth > 0 && (
              <span aria-hidden className="text-fg-muted">
                →
              </span>
            )}
            <span className={cn(node.hot ? "font-semibold text-warning-text" : "text-fg")}>{node.op}</span>
          </span>
          {node.detail && <span className="font-mono text-2xs break-words text-fg-muted">{node.detail}</span>}
        </span>
        <span className="flex flex-col items-end font-mono text-2xs whitespace-nowrap text-fg-muted">
          <span className={cn(node.hot ? "font-semibold text-warning-text" : "text-fg")}>{fmtMs(node.time)}</span>
          <span>
            rows {formatNumber(node.rows)} · cost {node.cost}
          </span>
        </span>
      </div>
      {node.children && (
        <ul>
          {node.children.map((c, i) => (
            <PlanTree key={i} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

/* --------------------------------------------------------------- stories */

/** Queries: top statements from pg_stat_statements; selecting one shows its plan and a suggested fix. */
function QueriesPage() {
  const [range, setRange] = useState("24h");
  const [dbs, setDbs] = useState<string[]>([]);
  const [active, setActive] = useState(queries[0]!.id);
  const q = queries.find((x) => x.id === active)!;
  const rows = dbs.length ? queries.filter((x) => dbs.includes(x.db)) : queries;
  return (
    <>
      <PageHeader
        title="Queries"
        description="PostgreSQL 16.4 · pg_stat_statements · 1,214 normalised statements"
        meta={<StatusBadge tone="warning">Replica lag 1.2 s</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search SQL" shortcut="/" className="w-60" />
            <Button icon={<FileSearch />}>Run EXPLAIN</Button>
          </>
        }
      />
      <FilterBar onClear={dbs.length ? () => setDbs([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Database"
          selected={dbs}
          onChange={setDbs}
          options={[
            { value: "orders", count: 812 },
            { value: "accounts", count: 241 },
            { value: "events", count: 161 },
          ]}
        />
      </FilterBar>
      <KpiGrid minWidth={200}>
        <KpiCard
          label="db-prod-01 · primary"
          value="142"
          unit="of 200 connections"
          trend={wave(24, { base: 110, amp: 20, seed: 91, spike: 30, spikeAt: 17 })}
          delta={{ label: "2.1k tx/s · cache hit 99.2%" }}
        />
        <KpiCard
          label="db-prod-02 · replica"
          value="1.2"
          unit="s lag"
          tone="warning"
          trendColor="var(--oa-warning)"
          trend={wave(24, { base: 0.1, amp: 0.05, seed: 92, spike: 1.1, spikeAt: 18 })}
          delta={{ label: "Normally under 100 ms", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Query time p95" value="48" unit="ms" delta={{ label: "+31 ms since 13:45", direction: "up", intent: "bad" }} />
        <KpiCard label="Lock waits · 1 h" value="1,206" tone="danger" delta={{ label: "orders table, 94%", intent: "bad" }} />
      </KpiGrid>
      <ChartSync>
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Query latency" description="All statements on db-prod-01">
            <TimeSeriesChart
              label="Query latency mean and p95"
              labels={labels}
              height={160}
              area={false}
              format={(v) => fmtMs(v)}
              xTicks={5}
              series={[
                { id: "p95", name: "p95", color: "var(--oa-chart-2)", data: wave(N, { base: 17, amp: 3, seed: 93, spike: 31, spikeAt: AT, spikeLen: 3 }) },
                { id: "mean", name: "mean", color: "var(--oa-chart-1)", data: wave(N, { base: 3.1, amp: 0.6, seed: 94, spike: 6, spikeAt: AT, spikeLen: 3 }) },
              ]}
            />
          </Panel>
          <Panel title="Connections" description="db-prod-01 · max_connections 200">
            <TimeSeriesChart
              label="Connections active, idle and waiting"
              labels={labels}
              height={160}
              stacked
              format={(v) => `${Math.round(v)}`}
              threshold={{ value: 200, label: "max 200" }}
              xTicks={5}
              series={[
                { id: "active", name: "active", color: "var(--oa-chart-1)", data: wave(N, { base: 38, amp: 10, seed: 95, spike: 42, spikeAt: AT }) },
                { id: "idle", name: "idle", color: "var(--oa-chart-3)", data: wave(N, { base: 70, amp: 12, seed: 96 }) },
                { id: "wait", name: "waiting on lock", color: "var(--oa-chart-4)", data: wave(N, { base: 1, amp: 1, seed: 97, spike: 24, spikeAt: AT + 1 }) },
              ]}
            />
          </Panel>
        </div>
      </ChartSync>
      <Panel title="Top queries" description="By total time · last 24 h" flush>
        <DataTable
          label="Top queries"
          columns={queryColumns}
          rows={rows}
          getRowId={(x) => x.id}
          onRowClick={(x) => setActive(x.id)}
          activeRowId={active}
          defaultSort={{ id: "total", direction: "desc" }}
          minWidth={980}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          aria-label="Query plan"
          title={`EXPLAIN ANALYZE · ${q.id}`}
          description={`${q.db} · mean ${fmtMs(q.mean)} · ${formatNumber(q.calls)} calls`}
          actions={
            <>
              <Button size="sm" icon={<Waypoints />}>
                Slow traces
              </Button>
              <Button size="sm" icon={<Play />}>
                Re-run
              </Button>
            </>
          }
          flush
        >
          <div className="relative overflow-x-auto border-b border-line bg-canvas px-3 py-2">
            <code className="font-mono text-xs break-words text-fg">{q.sql}</code>
          </div>
          <ul aria-label="Plan nodes">
            <PlanTree node={q.plan} />
          </ul>
        </Panel>
        <Panel title="Suggested fix" aria-label="Suggested fix">
          {q.index ? (
            <div className="flex flex-col gap-2">
              <div className="relative rounded-md border border-line bg-canvas">
                <pre className="overflow-x-auto px-3 py-2 pr-10 font-mono text-xs leading-5 text-fg">{q.index.sql}</pre>
                <IconButton label="Copy SQL" size="xs" className="absolute top-1.5 right-1.5">
                  <Copy />
                </IconButton>
              </div>
              <p className="text-xs text-success">{q.index.gain}</p>
              <Callout tone="info" title="Built without blocking writes">
                CONCURRENTLY builds the index online. Expect about 3 minutes on db-prod-01; replicas apply it after.
              </Callout>
            </div>
          ) : (
            <p className="text-sm text-fg-muted">
              No index would help.{" "}
              {q.plan.children?.some((c) => c.hot) || q.plan.hot ? "Time is spent waiting on locks. See Locks." : "This plan is already efficient."}
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- overview */

interface Instance {
  id: string;
  name: string;
  role: "primary" | "replica";
  version: string;
  size: string;
  conns: number;
  maxConns: number;
  tps: number;
  cacheHit: number;
  lag?: string;
  disk: number;
  status: "healthy" | "degraded";
}

const INSTANCES: Instance[] = [
  {
    id: "i1",
    name: "db-prod-01",
    role: "primary",
    version: "PostgreSQL 16.4",
    size: "812 GB",
    conns: 142,
    maxConns: 200,
    tps: 2100,
    cacheHit: 99.2,
    disk: 71,
    status: "healthy",
  },
  {
    id: "i2",
    name: "db-prod-02",
    role: "replica",
    version: "PostgreSQL 16.4",
    size: "812 GB",
    conns: 64,
    maxConns: 200,
    tps: 940,
    cacheHit: 98.7,
    lag: "1.2 s",
    disk: 71,
    status: "degraded",
  },
  {
    id: "i3",
    name: "db-prod-03",
    role: "replica",
    version: "PostgreSQL 16.4",
    size: "812 GB",
    conns: 51,
    maxConns: 200,
    tps: 810,
    cacheHit: 99.0,
    lag: "40 ms",
    disk: 70,
    status: "healthy",
  },
  {
    id: "i4",
    name: "db-analytics-01",
    role: "primary",
    version: "PostgreSQL 16.4",
    size: "2.4 TB",
    conns: 38,
    maxConns: 100,
    tps: 120,
    cacheHit: 91.4,
    disk: 83,
    status: "healthy",
  },
];

interface TableStat {
  id: string;
  name: string;
  size: string;
  rows: string;
  bloat: number;
  seqScans: number;
  lastVacuum: string;
}

const TABLES: TableStat[] = [
  { id: "t1", name: "orders.orders", size: "214 GB", rows: "2.48 M", bloat: 18, seqScans: 418_220, lastVacuum: "2 h ago" },
  { id: "t2", name: "events.page_views", size: "388 GB", rows: "1.9 B", bloat: 4, seqScans: 12, lastVacuum: "20 min ago" },
  { id: "t3", name: "accounts.users", size: "9.1 GB", rows: "3.1 M", bloat: 7, seqScans: 31_840, lastVacuum: "6 h ago" },
  { id: "t4", name: "orders.payments", size: "61 GB", rows: "2.51 M", bloat: 29, seqScans: 211, lastVacuum: "3 d ago" },
  { id: "t5", name: "orders.order_items", size: "102 GB", rows: "9.7 M", bloat: 11, seqScans: 64, lastVacuum: "4 h ago" },
];

function OverviewPage() {
  const instCols: Column<Instance>[] = [
    { id: "name", header: "Instance", cell: (i) => <EntityChip kind="host" value={i.name} hideKind /> },
    { id: "role", header: "Role", cell: (i) => <Badge tone={i.role === "primary" ? "info" : "neutral"}>{i.role}</Badge> },
    { id: "version", header: "Version", cell: (i) => <span className="text-xs">{i.version}</span> },
    { id: "conns", header: "Connections", align: "right", mono: true, sortValue: (i) => i.conns / i.maxConns, cell: (i) => `${i.conns} / ${i.maxConns}` },
    { id: "tps", header: "tx/s", align: "right", mono: true, sortValue: (i) => i.tps, cell: (i) => formatNumber(i.tps) },
    {
      id: "hit",
      header: "Cache hit",
      align: "right",
      mono: true,
      cell: (i) => <span className={i.cacheHit < 95 ? "text-warning-text" : undefined}>{i.cacheHit}%</span>,
    },
    { id: "lag", header: "Lag", align: "right", mono: true, cell: (i) => i.lag ?? "–" },
    {
      id: "disk",
      header: "Disk",
      align: "right",
      mono: true,
      sortValue: (i) => i.disk,
      cell: (i) => <span className={i.disk >= 80 ? "text-warning-text" : undefined}>{i.disk}%</span>,
    },
    { id: "status", header: "Status", cell: (i) => <StatusBadge tone={i.status === "healthy" ? "success" : "warning"}>{i.status}</StatusBadge> },
  ];
  const tableCols: Column<TableStat>[] = [
    { id: "name", header: "Table", mono: true, cell: (t) => t.name },
    { id: "size", header: "Size", align: "right", mono: true, cell: (t) => t.size },
    { id: "rows", header: "Rows", align: "right", mono: true, cell: (t) => t.rows },
    {
      id: "bloat",
      header: "Bloat",
      align: "right",
      mono: true,
      description: "Estimated dead space from pgstattuple. Over 20% is worth a VACUUM FULL or pg_repack.",
      sortValue: (t) => t.bloat,
      cell: (t) => <span className={t.bloat > 20 ? "text-danger-text" : undefined}>{t.bloat}%</span>,
    },
    { id: "seq", header: "Seq scans · 24 h", align: "right", mono: true, sortValue: (t) => t.seqScans, cell: (t) => formatNumber(t.seqScans) },
    { id: "vac", header: "Last autovacuum", cell: (t) => <span className="text-xs">{t.lastVacuum}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Overview"
        description="4 PostgreSQL instances in 2 clusters · stats every 10 s from pg_stat_* views"
        meta={<StatusBadge tone="warning">1 degraded</StatusBadge>}
      />
      <KpiGrid>
        <KpiCard label="Transactions" value="3.97k" unit="per second" trend={wave(24, { base: 3800, amp: 600, seed: 81 })} />
        <KpiCard label="Query time p95" value="48" unit="ms" tone="warning" delta={{ label: "+31 ms since 13:45", direction: "up", intent: "bad" }} />
        <KpiCard label="Replica lag · max" value="1.2" unit="s" tone="warning" delta={{ label: "db-prod-02" }} />
        <KpiCard label="Storage" value="4.8" unit="TB" delta={{ label: "+42 GB / week · full in 7 months" }} />
      </KpiGrid>
      <Panel title="Instances" flush>
        <DataTable label="Database instances" columns={instCols} rows={INSTANCES} getRowId={(i) => i.id} minWidth={940} />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Largest tables" description="orders cluster" flush>
          <DataTable
            label="Largest tables"
            columns={tableCols}
            rows={TABLES}
            getRowId={(t) => t.id}
            defaultSort={{ id: "bloat", direction: "desc" }}
            minWidth={680}
          />
        </Panel>
        <Panel title="Wait events" description="db-prod-01 · last hour, share of active time">
          <BarList
            label="Wait events on db-prod-01"
            format={(v) => `${v}%`}
            items={[
              { id: "lock", label: "Lock: transactionid", value: 41, color: "var(--oa-danger)" },
              { id: "cpu", label: "CPU", value: 27 },
              { id: "io", label: "IO: DataFileRead", value: 18 },
              { id: "lwlock", label: "LWLock: WALWrite", value: 9 },
              { id: "client", label: "Client: ClientRead", value: 5 },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ locks */

interface LockNode {
  pid: number;
  user: string;
  app: string;
  state: string;
  waiting: string;
  query: string;
  lock: string;
  children?: LockNode[];
}

const BLOCKERS: LockNode[] = [
  {
    pid: 48211,
    user: "orders_app",
    app: "orders-api",
    state: "idle in transaction",
    waiting: "4 m 12 s",
    query: "UPDATE orders SET status = 'paid' WHERE id = 1928412",
    lock: "RowExclusiveLock on orders",
    children: [
      {
        pid: 48302,
        user: "orders_app",
        app: "orders-api",
        state: "active",
        waiting: "3 m 50 s",
        query: "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2",
        lock: "ShareLock on transaction 99812773",
      },
      {
        pid: 48315,
        user: "orders_app",
        app: "orders-api",
        state: "active",
        waiting: "3 m 41 s",
        query: "UPDATE orders SET status = $1, updated_at = now() WHERE id = $2",
        lock: "ShareLock on transaction 99812773",
      },
      {
        pid: 48399,
        user: "reports",
        app: "reports-cron",
        state: "active",
        waiting: "2 m 02 s",
        query: "SELECT … FROM orders FOR UPDATE",
        lock: "RowShareLock on orders",
        children: [
          {
            pid: 48410,
            user: "orders_app",
            app: "orders-api",
            state: "active",
            waiting: "1 m 58 s",
            query: "INSERT INTO order_items …",
            lock: "RowExclusiveLock on orders",
          },
        ],
      },
    ],
  },
  {
    pid: 50117,
    user: "migrations",
    app: "flyway",
    state: "active",
    waiting: "12 s",
    query: "ALTER TABLE payments ADD COLUMN refund_reason text",
    lock: "AccessExclusiveLock on payments",
    children: [
      {
        pid: 50120,
        user: "orders_app",
        app: "orders-api",
        state: "active",
        waiting: "11 s",
        query: "SELECT * FROM payments WHERE order_id = $1",
        lock: "AccessShareLock on payments",
      },
    ],
  },
];

function countWaiters(n: LockNode): number {
  return (n.children ?? []).reduce((s, c) => s + 1 + countWaiters(c), 0);
}

function LockTree({ node, depth = 0, onKill }: { node: LockNode; depth?: number; onKill?: (pid: number) => void }) {
  return (
    <li>
      <div
        className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-subtle py-1.5 pr-3 text-xs", depth === 0 && "bg-danger-soft")}
        style={{ paddingLeft: 12 + depth * 20 }}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="font-mono font-semibold">{node.pid}</span>
            <span className="text-fg-muted">
              {node.user} · {node.app}
            </span>
            <Badge tone={node.state.startsWith("idle") ? "warning" : "neutral"}>{node.state}</Badge>
          </span>
          <span className="truncate font-mono text-2xs" title={node.query}>
            {node.query}
          </span>
          <span className="font-mono text-2xs text-fg-muted">{node.lock}</span>
        </span>
        <span className="flex flex-col items-end gap-1">
          <span className="font-mono text-2xs">{depth === 0 ? `blocking ${countWaiters(node)}` : `waiting ${node.waiting}`}</span>
          {depth === 0 && onKill && (
            <Button size="xs" variant="danger" onClick={() => onKill(node.pid)} aria-label={`Terminate ${node.pid}`}>
              Terminate
            </Button>
          )}
        </span>
      </div>
      {node.children && (
        <ul>
          {node.children.map((c) => (
            <LockTree key={c.pid} node={c} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

function LocksPage() {
  const [blockers, setBlockers] = useState(BLOCKERS);
  const [killed, setKilled] = useState<number | null>(null);
  const waiting = blockers.reduce((s, b) => s + countWaiters(b), 0);
  return (
    <>
      <PageHeader title="Locks" description="Blocking chains on db-prod-01 from pg_locks and pg_blocking_pids(), refreshed every 5 s." />
      <KpiGrid>
        <KpiCard label="Blocking sessions" value={`${blockers.length}`} tone={blockers.length ? "danger" : "success"} />
        <KpiCard label="Waiting sessions" value={`${waiting}`} tone={waiting ? "warning" : "success"} />
        <KpiCard label="Longest wait" value={blockers.length ? "3 m 50 s" : "–"} />
        <KpiCard label="Deadlocks · 24 h" value="3" delta={{ label: "All on orders, resolved by Postgres" }} />
      </KpiGrid>
      <Panel title="Lock waits" description="Per minute, last hour">
        <TimeSeriesChart
          label="Sessions waiting on locks"
          labels={labels}
          height={120}
          xTicks={5}
          series={[{ id: "wait", name: "waiting", color: "var(--oa-chart-4)", data: wave(N, { base: 1, amp: 1, seed: 97, spike: 24, spikeAt: AT + 1 }) }]}
        />
      </Panel>
      {killed && (
        <p role="status" className="text-sm text-success">
          pg_terminate_backend({killed}) succeeded · its transaction was rolled back
        </p>
      )}
      <Callout tone="warning" title="48211 has been idle in a transaction for 4 minutes">
        orders-api opened a transaction and never committed. Set idle_in_transaction_session_timeout to 30 s to stop this from recurring.
      </Callout>
      <Panel title="Blocking chains" description="Root blockers first" flush>
        {blockers.length ? (
          <ul aria-label="Blocking chains">
            {blockers.map((b) => (
              <LockTree key={b.pid} node={b} onKill={(pid) => (setBlockers((all) => all.filter((x) => x.pid !== pid)), setKilled(pid))} />
            ))}
          </ul>
        ) : (
          <p className="py-8 text-center text-sm text-fg-muted">No sessions are blocked</p>
        )}
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ replication */

interface Slot {
  name: string;
  type: "physical" | "logical";
  consumer: string;
  active: boolean;
  retained: string;
  retainedGb: number;
}

const SLOTS: Slot[] = [
  { name: "db_prod_02", type: "physical", consumer: "db-prod-02", active: true, retained: "1.8 GB", retainedGb: 1.8 },
  { name: "db_prod_03", type: "physical", consumer: "db-prod-03", active: true, retained: "64 MB", retainedGb: 0.06 },
  { name: "debezium_orders", type: "logical", consumer: "Kafka Connect · orders CDC", active: true, retained: "220 MB", retainedGb: 0.22 },
  { name: "old_etl", type: "logical", consumer: "none (ETL v1, retired)", active: false, retained: "38 GB", retainedGb: 38 },
];

function ReplicationPage() {
  const [slots, setSlots] = useState(SLOTS);
  const cols: Column<Slot>[] = [
    { id: "name", header: "Slot", mono: true, cell: (s) => s.name },
    { id: "type", header: "Type", cell: (s) => <Badge>{s.type}</Badge> },
    { id: "consumer", header: "Consumer", cell: (s) => <span className="text-xs">{s.consumer}</span> },
    {
      id: "active",
      header: "Active",
      cell: (s) => (s.active ? <StatusBadge tone="success">active</StatusBadge> : <StatusBadge tone="danger">inactive</StatusBadge>),
    },
    {
      id: "retained",
      header: "WAL retained",
      align: "right",
      mono: true,
      sortValue: (s) => s.retainedGb,
      cell: (s) => <span className={s.retainedGb > 10 ? "text-danger-text" : undefined}>{s.retained}</span>,
    },
    {
      id: "act",
      header: "",
      width: "96px",
      hideable: false,
      cell: (s) =>
        !s.active ? (
          <Button size="xs" variant="danger" onClick={() => setSlots((all) => all.filter((x) => x.name !== s.name))} aria-label={`Drop slot ${s.name}`}>
            Drop slot
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Replication" description="Streaming replicas and replication slots for db-prod-01." />
      <KpiGrid>
        <KpiCard
          label="db-prod-02 lag"
          value="1.2"
          unit="s"
          tone="warning"
          trendColor="var(--oa-warning)"
          trend={wave(24, { base: 0.1, amp: 0.05, seed: 92, spike: 1.1, spikeAt: 18 })}
        />
        <KpiCard label="db-prod-03 lag" value="40" unit="ms" tone="success" />
        <KpiCard label="WAL generated" value="9.4" unit="GB / h" />
        <KpiCard
          label="WAL retained by slots"
          value={`${slots.reduce((s, x) => s + x.retainedGb, 0).toFixed(1)}`}
          unit="GB"
          tone={slots.some((s) => !s.active) ? "danger" : "success"}
        />
      </KpiGrid>
      <Panel title="Replay lag" description="Seconds behind the primary">
        <TimeSeriesChart
          label="Replica replay lag"
          labels={labels}
          height={150}
          xTicks={5}
          format={(v) => `${v.toFixed(2)} s`}
          threshold={{ value: 1, label: "alert 1 s" }}
          series={[
            { id: "r2", name: "db-prod-02", data: wave(N, { base: 0.08, amp: 0.03, seed: 98, spike: 1.1, spikeAt: AT, spikeLen: 4 }) },
            { id: "r3", name: "db-prod-03", data: wave(N, { base: 0.04, amp: 0.01, seed: 99 }) },
          ]}
        />
      </Panel>
      {slots.some((s) => !s.active) && (
        <Callout tone="danger" title="Inactive slot old_etl is holding 38 GB of WAL">
          Nothing has read from it for 9 days. The primary keeps WAL until the slot advances, so disk fills up. Drop it if ETL v1 is retired.
        </Callout>
      )}
      <Panel title="Replication slots" flush>
        <DataTable label="Replication slots" columns={cols} rows={slots} getRowId={(s) => s.name} minWidth={760} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ connections */

interface Backend {
  pid: number;
  user: string;
  app: string;
  client: string;
  state: "active" | "idle" | "idle in transaction";
  since: string;
  sinceSec: number;
  query: string;
}

const BACKENDS: Backend[] = [
  {
    pid: 48211,
    user: "orders_app",
    app: "orders-api",
    client: "10.20.4.31",
    state: "idle in transaction",
    since: "4 m 12 s",
    sinceSec: 252,
    query: "UPDATE orders SET status = 'paid' WHERE id = 1928412",
  },
  {
    pid: 48302,
    user: "orders_app",
    app: "orders-api",
    client: "10.20.4.32",
    state: "active",
    since: "3 m 50 s",
    sinceSec: 230,
    query: "UPDATE orders SET status = $1 WHERE id = $2",
  },
  {
    pid: 48399,
    user: "reports",
    app: "reports-cron",
    client: "10.20.6.11",
    state: "active",
    since: "2 m 02 s",
    sinceSec: 122,
    query: "SELECT … FROM orders FOR UPDATE",
  },
  { pid: 47100, user: "orders_app", app: "orders-api", client: "10.20.4.31", state: "idle", since: "8 s", sinceSec: 8, query: "COMMIT" },
  { pid: 47131, user: "orders_app", app: "checkout-web", client: "10.20.5.18", state: "idle", since: "1 s", sinceSec: 1, query: "SELECT 1" },
  {
    pid: 46820,
    user: "analyst",
    app: "psql",
    client: "10.8.0.14",
    state: "idle in transaction",
    since: "22 m",
    sinceSec: 1320,
    query: "SELECT count(*) FROM orders",
  },
  { pid: 46001, user: "pgbouncer", app: "pgbouncer", client: "10.20.1.5", state: "idle", since: "2 s", sinceSec: 2, query: "DISCARD ALL" },
  {
    pid: 45988,
    user: "monitor",
    app: "openasy-agent",
    client: "10.20.1.9",
    state: "active",
    since: "0 s",
    sinceSec: 0,
    query: "SELECT * FROM pg_stat_activity",
  },
];

function ConnectionsPage() {
  const [items, setItems] = useState(BACKENDS);
  const [state, setState] = useState<string[]>([]);
  const rows = items.filter((b) => state.length === 0 || state.includes(b.state));
  const cols: Column<Backend>[] = [
    { id: "pid", header: "PID", mono: true, align: "right", width: "70px", cell: (b) => b.pid },
    { id: "user", header: "User", mono: true, cell: (b) => b.user },
    { id: "app", header: "Application", cell: (b) => <span className="text-xs">{b.app}</span> },
    { id: "client", header: "Client", cell: (b) => <EntityChip kind="ip" value={b.client} hideKind /> },
    {
      id: "state",
      header: "State",
      sortValue: (b) => b.state,
      cell: (b) => <Badge tone={b.state === "idle in transaction" ? "warning" : b.state === "active" ? "info" : "neutral"}>{b.state}</Badge>,
    },
    { id: "since", header: "In state", align: "right", mono: true, sortValue: (b) => b.sinceSec, cell: (b) => b.since },
    {
      id: "query",
      header: "Last query",
      width: "28%",
      cell: (b) => (
        <span className="block truncate font-mono text-xs" title={b.query}>
          {b.query}
        </span>
      ),
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      width: "44px",
      hideable: false,
      cell: (b) => (
        <IconButton label={`Terminate backend ${b.pid}`} size="xs" onClick={() => setItems((all) => all.filter((x) => x.pid !== b.pid))}>
          <Square />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Connections" description="db-prod-01 · pg_stat_activity · 142 of 200 used, most through PgBouncer." />
      <Panel title="Connections by application" description="Now">
        <BarList
          label="Connections by application"
          items={[
            { id: "orders-api", label: "orders-api", value: 74 },
            { id: "checkout-web", label: "checkout-web", value: 31 },
            { id: "pgbouncer", label: "pgbouncer (pool)", value: 20 },
            { id: "reports", label: "reports-cron", value: 9 },
            { id: "psql", label: "psql (people)", value: 4 },
            { id: "agent", label: "openasy-agent", value: 4 },
          ]}
        />
      </Panel>
      <FilterBar onClear={state.length ? () => setState([]) : undefined}>
        <FacetFilter
          label="State"
          selected={state}
          onChange={setState}
          options={(["active", "idle", "idle in transaction"] as const).map((s) => ({ value: s, count: items.filter((b) => b.state === s).length }))}
        />
      </FilterBar>
      <Panel title="Backends" description={`${rows.length} shown`} flush>
        <DataTable label="Backends" columns={cols} rows={rows} getRowId={(b) => `${b.pid}`} defaultSort={{ id: "since", direction: "desc" }} minWidth={1000} />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- explain */

function ExplainPage() {
  const [sql, setSql] = useState("SELECT * FROM orders WHERE customer_id = 88213 AND status = 'open' ORDER BY created_at DESC LIMIT 20;");
  const [db, setDb] = useState("orders");
  const [ran, setRan] = useState(false);
  const [analyze, setAnalyze] = useState(false);
  const plan = queries[0]!.plan;
  return (
    <>
      <PageHeader
        title="Explain"
        description="Run EXPLAIN on a read replica. ANALYZE executes the query, so it is off by default and only allowed for SELECT."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Query" aria-label="Explain query">
          <form className="flex flex-col gap-2.5" onSubmit={(e) => (e.preventDefault(), setRan(true))}>
            <SelectField
              label="Database"
              value={db}
              onChange={(e) => setDb(e.target.value)}
              options={["orders", "accounts", "events"].map((v) => ({ value: v, label: `${v} · db-prod-03 (replica)` }))}
            />
            <label className="flex flex-col gap-1 text-xs font-medium">
              SQL
              <textarea
                value={sql}
                onChange={(e) => (setSql(e.target.value), setRan(false))}
                rows={6}
                className="rounded-md border border-line-strong bg-surface p-2 font-mono text-xs text-fg"
              />
            </label>
            <Switch
              checked={analyze}
              onCheckedChange={setAnalyze}
              label="ANALYZE (runs the query)"
              description="Statement timeout 10 s; results are discarded."
            />
            <Button type="submit" variant="primary" icon={<Play />} disabled={!sql.trim()}>
              Run EXPLAIN
            </Button>
          </form>
        </Panel>
        <Panel
          title="Plan"
          description={ran ? `${db} · ${analyze ? "EXPLAIN ANALYZE" : "EXPLAIN"} · ${analyze ? "41.2 ms" : "est. cost 18421"}` : "Not run yet"}
          aria-label="Explain result"
          flush
        >
          {ran ? (
            <>
              <ul aria-label="Explain plan nodes">
                <PlanTree node={plan} />
              </ul>
              <div className="px-3 py-2">
                <Callout tone="warning" title="Sequential scan removes 2.48 M rows">
                  An index on (customer_id, status, created_at DESC) would turn this into an index scan. See Queries → q1 for the full suggestion.
                </Callout>
              </div>
            </>
          ) : (
            <p className="py-8 text-center text-sm text-fg-muted">Run EXPLAIN to see the plan</p>
          )}
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  queries: () => <QueriesPage />,
  locks: () => <LocksPage />,
  replication: () => <ReplicationPage />,
  connections: () => <ConnectionsPage />,
  explain: () => <ExplainPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="database" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Database instances" }).querySelectorAll("tbody tr")).toHaveLength(4);
    await userEvent.click(c.getByRole("link", { name: /Locks/ }));
    await expect(c.getByRole("heading", { level: 1, name: "Locks" })).toBeInTheDocument();
  },
};

export const Queries: Story = {
  ...app("queries"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Queries" })).toBeInTheDocument();
    const plan = () => within(c.getByRole("region", { name: "Query plan" }));
    const fix = () => within(c.getByRole("region", { name: "Suggested fix" }));
    await expect(plan().getByText("Seq Scan on orders")).toBeInTheDocument();
    await expect(fix().getByText(/idx_orders_customer_status_created/)).toBeInTheDocument();

    const table = within(c.getByRole("table", { name: "Top queries" }));
    await userEvent.click(table.getByText(/WHERE lower\(email\)/));
    await expect(plan().getByRole("heading", { name: "EXPLAIN ANALYZE · q7" })).toBeInTheDocument();
    await expect(plan().getByText("Seq Scan on users")).toBeInTheDocument();
    await expect(fix().getByText(/idx_users_lower_email/)).toBeInTheDocument();

    await userEvent.click(table.getByText(/^UPDATE orders SET status/));
    await expect(plan().getByText("Index Scan using orders_pkey on orders")).toBeInTheDocument();
    await expect(fix().getByText(/No index would help/)).toBeInTheDocument();
  },
};

export const Locks: Story = {
  ...app("locks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Blocking chains" })).getByText("blocking 4")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Terminate 48211" }));
    await expect(c.getByText(/pg_terminate_backend\(48211\) succeeded/)).toBeInTheDocument();
    await expect(c.queryByRole("button", { name: "Terminate 48211" })).not.toBeInTheDocument();
  },
};

export const Replication: Story = {
  ...app("replication"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/Inactive slot old_etl/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Drop slot old_etl" }));
    await expect(c.queryByText(/Inactive slot old_etl/)).not.toBeInTheDocument();
  },
};

export const Connections: Story = {
  ...app("connections"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Terminate backend 46820" }));
    await expect(c.getByRole("table", { name: "Backends" }).querySelectorAll("tbody tr")).toHaveLength(7);
  },
};

export const Explain: Story = {
  ...app("explain"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Run EXPLAIN to see the plan")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: /ANALYZE/ }));
    await userEvent.click(c.getByRole("button", { name: "Run EXPLAIN" }));
    await expect(within(c.getByRole("list", { name: "Explain plan nodes" })).getByText("Seq Scan on orders")).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
