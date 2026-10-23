import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowLeft, ArrowLeftRight, Boxes, Database, GitCompare, Plus, Route, ScrollText, Share2, Waypoints } from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EmptyState } from "../../components/EmptyState";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { Sparkline } from "../../charts/Sparkline";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "services", label: "Services", icon: Boxes, count: 24 },
  { id: "map", label: "Service map", icon: Share2 },
  { id: "traces", label: "Traces", icon: Waypoints },
  { id: "endpoints", label: "Endpoints", icon: Route },
  { id: "compare", label: "Compare", icon: GitCompare },
];

const meta = {
  title: "Products/Traces",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const N = 48;
const labels = timeLabels(N, 5);
const AT = 34;

const ms = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${Math.round(v)} ms`);

interface Endpoint {
  id: string;
  method: string;
  route: string;
  rps: number;
  p95: number;
  errors: number;
  trend: number[];
}

const endpoints: Endpoint[] = [
  {
    id: "e1",
    method: "POST",
    route: "/v1/orders",
    rps: 182.4,
    p95: 4920,
    errors: 2.9,
    trend: wave(24, { base: 600, amp: 120, seed: 61, spike: 4200, spikeAt: 17, spikeLen: 3 }),
  },
  { id: "e2", method: "GET", route: "/v1/orders/{id}", rps: 611.2, p95: 84, errors: 0.1, trend: wave(24, { base: 80, amp: 10, seed: 62 }) },
  { id: "e3", method: "GET", route: "/v1/orders", rps: 248.9, p95: 312, errors: 0.3, trend: wave(24, { base: 290, amp: 40, seed: 63 }) },
  {
    id: "e4",
    method: "PATCH",
    route: "/v1/orders/{id}/status",
    rps: 74.1,
    p95: 1840,
    errors: 1.2,
    trend: wave(24, { base: 300, amp: 40, seed: 64, spike: 1500, spikeAt: 18 }),
  },
  { id: "e5", method: "POST", route: "/v1/orders/{id}/refunds", rps: 6.3, p95: 690, errors: 0.6, trend: wave(24, { base: 640, amp: 60, seed: 65 }) },
  { id: "e6", method: "GET", route: "/v1/customers/{id}/orders", rps: 92.7, p95: 241, errors: 0, trend: wave(24, { base: 220, amp: 30, seed: 66 }) },
  { id: "e7", method: "DELETE", route: "/v1/orders/{id}", rps: 1.8, p95: 133, errors: 0, trend: wave(24, { base: 120, amp: 20, seed: 67 }) },
  { id: "e8", method: "GET", route: "/healthz", rps: 20.0, p95: 3, errors: 0, trend: wave(24, { base: 3, amp: 0.5, seed: 68 }) },
];

const endpointColumns: Column<Endpoint>[] = [
  {
    id: "route",
    header: "Route",
    width: "34%",
    sortValue: (e) => e.route,
    cell: (e) => (
      <span className="flex items-center gap-2">
        <Badge mono className="w-14 justify-center">
          {e.method}
        </Badge>
        <span className="truncate font-mono text-xs">{e.route}</span>
      </span>
    ),
  },
  { id: "rps", header: "Req/s", align: "right", mono: true, sortValue: (e) => e.rps, cell: (e) => e.rps.toFixed(1) },
  {
    id: "p95",
    header: "p95",
    align: "right",
    mono: true,
    sortValue: (e) => e.p95,
    cell: (e) => <span className={cn(e.p95 > 2000 && "font-semibold text-danger-text")}>{ms(e.p95)}</span>,
  },
  {
    id: "err",
    header: "Errors",
    align: "right",
    mono: true,
    sortValue: (e) => e.errors,
    cell: (e) => <span className={cn(e.errors >= 1 ? "text-danger-text" : "text-fg-muted")}>{e.errors.toFixed(1)}%</span>,
  },
  {
    id: "trend",
    header: "p95 · 2 h",
    width: "140px",
    cell: (e) => <Sparkline data={e.trend} label={`p95 latency of ${e.method} ${e.route}`} height={22} format={(v) => ms(v)} className="w-28" />,
  },
];

interface Span {
  id: string;
  service: string;
  op: string;
  start: number;
  dur: number;
  depth: number;
  kind: "server" | "client" | "internal" | "producer";
  status?: "error";
  attrs: Record<string, string>;
}

const TRACE_ID = "4bf92f3577b34da6a3ce929d0e0e4736";
const TOTAL = 5420;

const SPANS: Span[] = [
  {
    id: "s1",
    service: "api-gateway",
    op: "POST /v1/orders",
    start: 0,
    dur: 5420,
    depth: 0,
    kind: "server",
    attrs: { "http.method": "POST", "http.route": "/v1/orders", "http.status_code": "201", "client.address": "203.0.113.24", "host.name": "edge-fra-02" },
  },
  {
    id: "s2",
    service: "orders-api",
    op: "POST /v1/orders",
    start: 12,
    dur: 5392,
    depth: 1,
    kind: "server",
    attrs: { "http.method": "POST", "http.route": "/v1/orders", "http.status_code": "201", "host.name": "api-prod-03", "service.version": "2.14.1" },
  },
  {
    id: "s3",
    service: "orders-api",
    op: "auth.verify_token",
    start: 20,
    dur: 38,
    depth: 2,
    kind: "internal",
    attrs: { "enduser.id": "usr_8f21c", "auth.method": "jwt", "host.name": "api-prod-03" },
  },
  {
    id: "s4",
    service: "auth-service",
    op: "GET /v1/tokens/introspect",
    start: 24,
    dur: 30,
    depth: 3,
    kind: "server",
    attrs: { "http.method": "GET", "http.status_code": "200", "host.name": "api-prod-01" },
  },
  {
    id: "s5",
    service: "orders-api",
    op: "inventory.reserve",
    start: 64,
    dur: 182,
    depth: 2,
    kind: "client",
    attrs: { "rpc.system": "http", "server.address": "inventory-api", "http.status_code": "200" },
  },
  {
    id: "s6",
    service: "inventory-api",
    op: "POST /v1/reservations",
    start: 70,
    dur: 168,
    depth: 3,
    kind: "server",
    attrs: { "http.method": "POST", "http.status_code": "200", "host.name": "api-prod-05", "inventory.sku_count": "3" },
  },
  {
    id: "s7",
    service: "inventory-api",
    op: "redis.EVALSHA",
    start: 82,
    dur: 6,
    depth: 4,
    kind: "client",
    attrs: { "db.system": "redis", "db.operation": "EVALSHA", "server.address": "cache-prod-01" },
  },
  {
    id: "s8",
    service: "orders-api",
    op: "db.query",
    start: 252,
    dur: 4800,
    depth: 2,
    kind: "client",
    attrs: {
      "db.system": "postgresql",
      "db.name": "orders",
      "db.operation": "SELECT",
      "db.statement": "SELECT * FROM orders WHERE customer_id = $1 AND status = $2 FOR UPDATE",
      "server.address": "db-prod-01",
      "db.rows_returned": "1",
      "db.lock_wait_ms": "4612",
    },
  },
  {
    id: "s9",
    service: "orders-api",
    op: "payments.authorize",
    start: 5060,
    dur: 286,
    depth: 2,
    kind: "client",
    attrs: { "rpc.system": "http", "server.address": "payments-api", "http.status_code": "200" },
  },
  {
    id: "s10",
    service: "payments-api",
    op: "POST /v1/charges",
    start: 5068,
    dur: 270,
    depth: 3,
    kind: "server",
    attrs: { "http.method": "POST", "http.status_code": "200", "host.name": "api-prod-01", "payment.amount_minor": "12900", "payment.currency": "EUR" },
  },
  {
    id: "s11",
    service: "payments-api",
    op: "psp.authorize",
    start: 5082,
    dur: 231,
    depth: 4,
    kind: "client",
    attrs: { "server.address": "psp.example.com", "http.status_code": "200", "psp.retry": "0" },
  },
  {
    id: "s12",
    service: "orders-api",
    op: "kafka.produce orders.created",
    start: 5352,
    dur: 22,
    depth: 2,
    kind: "producer",
    attrs: { "messaging.system": "kafka", "messaging.destination.name": "orders.created", "messaging.kafka.partition": "7" },
  },
  { id: "s13", service: "orders-api", op: "json.encode", start: 5380, dur: 9, depth: 2, kind: "internal", attrs: { "response.bytes": "1840" } },
];

const SLOW = "s8";

const SERVICE_COLOR: Record<string, string> = {
  "api-gateway": "var(--oa-chart-4)",
  "orders-api": "var(--oa-chart-1)",
  "auth-service": "var(--oa-chart-3)",
  "inventory-api": "var(--oa-chart-3)",
  "payments-api": "var(--oa-chart-2)",
};

/* ----------------------------------------------------------- waterfall */

/** Not in the library yet: a trace waterfall. Each row is a button; bars sit on a shared time axis. */
function Waterfall({
  selected,
  onSelect,
  spans = SPANS,
  total = TOTAL,
  traceId = TRACE_ID,
}: {
  selected: string | null;
  onSelect: (id: string) => void;
  spans?: Span[];
  total?: number;
  traceId?: string;
}) {
  const step = total > 2000 ? 1000 : total > 400 ? 100 : 20;
  const ticks = Array.from({ length: Math.floor(total / step) + 1 }, (_, i) => i * step);
  const TOTAL = total;
  const TRACE_ID = traceId;
  return (
    <div className="relative overflow-x-auto">
      <div className="min-w-[760px]">
        <div className="grid grid-cols-[280px_minmax(0,1fr)_72px] border-b border-line bg-canvas text-2xs font-medium tracking-wider text-fg-muted uppercase">
          <span className="px-2.5 py-1.5">Service · operation</span>
          <span className="relative h-full">
            {ticks.map((t) => (
              <span key={t} className="absolute top-1.5 -translate-x-1/2 font-mono normal-case first:translate-x-0" style={{ left: `${(t / TOTAL) * 100}%` }}>
                {t === 0 ? "0" : ms(t)}
              </span>
            ))}
          </span>
          <span className="px-2.5 py-1.5 text-right">Duration</span>
        </div>
        <ul aria-label={`Spans of trace ${TRACE_ID}`} className="flex flex-col">
          {spans.map((s) => {
            const slow = s.id === SLOW && s.dur > 1000;
            const active = s.id === selected;
            return (
              <li key={s.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => onSelect(s.id)}
                  className={cn(
                    "grid w-full grid-cols-[280px_minmax(0,1fr)_72px] items-center border-b border-subtle text-left text-xs hover:bg-canvas",
                    active && "bg-accent-soft hover:bg-accent-soft",
                    !active && slow && "bg-danger-soft hover:bg-danger-soft",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-1.5 py-1 pr-2" style={{ paddingLeft: 10 + s.depth * 14 }}>
                    <span aria-hidden className="size-2 shrink-0 rounded-sm" style={{ background: SERVICE_COLOR[s.service] }} />
                    <span className="shrink-0 font-medium text-fg">{s.service}</span>
                    <span className={cn("truncate font-mono", slow ? "text-danger-text" : "text-fg-muted")}>{s.op}</span>
                  </span>
                  <span aria-hidden className="relative h-5">
                    {ticks.slice(1).map((t) => (
                      <span key={t} className="absolute inset-y-0 w-px bg-subtle" style={{ left: `${(t / TOTAL) * 100}%` }} />
                    ))}
                    <span
                      className={cn("absolute top-1 h-3 min-w-0.5 rounded-sm", slow && "ring-2 ring-danger")}
                      style={{
                        left: `${(s.start / TOTAL) * 100}%`,
                        width: `${Math.max(0.15, (s.dur / TOTAL) * 100)}%`,
                        background: slow ? "var(--oa-danger)" : SERVICE_COLOR[s.service],
                      }}
                    />
                  </span>
                  <span className={cn("px-2.5 text-right font-mono", slow ? "font-semibold text-danger-text" : "text-fg-muted")}>{ms(s.dur)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function SpanDetails({ span, total = TOTAL }: { span: Span | undefined; total?: number }) {
  if (!span) return <p className="py-6 text-center text-sm text-fg-muted">Select a span to see its attributes.</p>;
  const slow = span.id === SLOW && span.dur > 1000;
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <h3 className="font-mono text-sm font-semibold">{span.op}</h3>
        <Badge>{span.service}</Badge>
        <Badge mono>{span.kind}</Badge>
        {slow && <StatusBadge tone="danger">Slowest span</StatusBadge>}
      </div>
      <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
        <dt className="text-fg-muted">Duration</dt>
        <dd className="font-mono">{ms(span.dur)}</dd>
        <dt className="text-fg-muted">Start offset</dt>
        <dd className="font-mono">+{span.start} ms</dd>
        <dt className="text-fg-muted">Self time share</dt>
        <dd className="font-mono">{((span.dur / total) * 100).toFixed(1)}% of trace</dd>
        {Object.entries(span.attrs).map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="font-mono text-fg-muted">{k}</dt>
            <dd className="font-mono break-all">{v}</dd>
          </div>
        ))}
      </dl>
      {slow && (
        <Callout tone="warning" title="Waited 4.6 s for a row lock">
          A concurrent PATCH /v1/orders/{"{id}"}/status held the lock on the same customer row. See it in Database › Locks.
        </Callout>
      )}
      <div className="flex flex-wrap gap-1.5">
        <Button size="sm" icon={<ScrollText />}>
          Logs for this span
        </Button>
        {slow && (
          <Button size="sm" icon={<Database />}>
            Open query in Database
          </Button>
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------------------- more data */

interface ServiceRow {
  id: string;
  name: string;
  lang: string;
  team: string;
  instances: number;
  rps: number;
  errors: number;
  p95: number;
  apdex: number;
  trend: number[];
}

const SERVICES: ServiceRow[] = [
  { name: "orders-api", lang: "Go", team: "Payments", instances: 6, rps: 1240, errors: 0.82, p95: 2410, apdex: 0.87 },
  { name: "api-gateway", lang: "Envoy", team: "Platform", instances: 4, rps: 3820, errors: 0.31, p95: 2480, apdex: 0.9 },
  { name: "payments-api", lang: "Java", team: "Payments", instances: 4, rps: 410, errors: 0.12, p95: 290, apdex: 0.97 },
  { name: "inventory-api", lang: "Go", team: "Fulfilment", instances: 3, rps: 690, errors: 0.05, p95: 180, apdex: 0.99 },
  { name: "auth-service", lang: "Rust", team: "Identity", instances: 3, rps: 2210, errors: 0.01, p95: 34, apdex: 1 },
  { name: "billing-worker", lang: "Python", team: "Payments", instances: 2, rps: 38, errors: 0.4, p95: 820, apdex: 0.93 },
  { name: "search-api", lang: "Node.js", team: "Catalog", instances: 5, rps: 940, errors: 0.2, p95: 210, apdex: 0.98 },
  { name: "notifications", lang: "Node.js", team: "Platform", instances: 2, rps: 72, errors: 1.4, p95: 640, apdex: 0.91 },
].map((s, i) => ({
  ...s,
  id: s.name,
  trend: wave(24, { base: s.p95, amp: s.p95 * 0.1, seed: 90 + i, spike: s.name === "orders-api" ? 2000 : 0, spikeAt: 17 }),
}));

interface Edge {
  from: string;
  to: string;
  rps: number;
  p95: number;
  errors: number;
  proto: string;
}

const EDGES: Edge[] = [
  { from: "api-gateway", to: "orders-api", rps: 1240, p95: 2400, errors: 0.8, proto: "HTTP" },
  { from: "api-gateway", to: "search-api", rps: 940, p95: 210, errors: 0.2, proto: "HTTP" },
  { from: "api-gateway", to: "auth-service", rps: 1640, p95: 31, errors: 0, proto: "gRPC" },
  { from: "orders-api", to: "auth-service", rps: 570, p95: 38, errors: 0, proto: "HTTP" },
  { from: "orders-api", to: "inventory-api", rps: 690, p95: 182, errors: 0.05, proto: "HTTP" },
  { from: "orders-api", to: "payments-api", rps: 410, p95: 286, errors: 0.1, proto: "HTTP" },
  { from: "orders-api", to: "postgres · db-prod-01", rps: 3100, p95: 4800, errors: 0.6, proto: "PostgreSQL" },
  { from: "orders-api", to: "kafka · orders.created", rps: 182, p95: 22, errors: 0, proto: "Kafka" },
  { from: "inventory-api", to: "redis · cache-prod-01", rps: 2070, p95: 6, errors: 0, proto: "Redis" },
  { from: "payments-api", to: "psp.example.com", rps: 410, p95: 231, errors: 0.1, proto: "HTTPS" },
  { from: "billing-worker", to: "payments-api", rps: 12, p95: 300, errors: 0, proto: "HTTP" },
  { from: "billing-worker", to: "notifications", rps: 38, p95: 640, errors: 1.4, proto: "HTTP" },
];

const LAYERS: Array<{ name: string; items: string[] }> = [
  { name: "Edge", items: ["api-gateway", "billing-worker"] },
  { name: "Services", items: ["orders-api", "search-api", "auth-service", "notifications"] },
  { name: "Downstream", items: ["payments-api", "inventory-api"] },
  { name: "Data stores and external", items: ["postgres · db-prod-01", "kafka · orders.created", "redis · cache-prod-01", "psp.example.com"] },
];

interface TraceRow {
  id: string;
  root: string;
  service: string;
  start: string;
  dur: number;
  spans: number;
  services: number;
  status: "ok" | "error";
}

const TRACES: TraceRow[] = [
  { id: TRACE_ID, root: "POST /v1/orders", service: "api-gateway", start: "13:47:12", dur: TOTAL, spans: SPANS.length, services: 5, status: "ok" },
  {
    id: "7d1e0a52c4b3f9e8a1d2c3b4e5f60718",
    root: "POST /v1/orders",
    service: "api-gateway",
    start: "13:47:09",
    dur: 660,
    spans: 13,
    services: 5,
    status: "ok",
  },
  {
    id: "a03c99d1e2f4b5a6c7d8e9f0a1b2c3d4",
    root: "PATCH /v1/orders/{id}/status",
    service: "api-gateway",
    start: "13:47:05",
    dur: 4710,
    spans: 9,
    services: 3,
    status: "error",
  },
  {
    id: "c4b5a6d7e8f90a1b2c3d4e5f6a7b8c9d",
    root: "GET /v1/orders/{id}",
    service: "api-gateway",
    start: "13:47:02",
    dur: 74,
    spans: 6,
    services: 3,
    status: "ok",
  },
  {
    id: "e1f2a3b4c5d6e7f8091a2b3c4d5e6f70",
    root: "POST /v1/orders",
    service: "api-gateway",
    start: "13:46:58",
    dur: 3920,
    spans: 13,
    services: 5,
    status: "error",
  },
  { id: "f0e1d2c3b4a5968778695a4b3c2d1e0f", root: "GET /v1/orders", service: "api-gateway", start: "13:46:51", dur: 288, spans: 7, services: 3, status: "ok" },
  {
    id: "0a1b2c3d4e5f60718293a4b5c6d7e8f9",
    root: "invoice.batch",
    service: "billing-worker",
    start: "13:46:40",
    dur: 812,
    spans: 41,
    services: 3,
    status: "ok",
  },
  {
    id: "1b2c3d4e5f60718293a4b5c6d7e8f90a",
    root: "POST /v1/orders/{id}/refunds",
    service: "api-gateway",
    start: "13:46:33",
    dur: 701,
    spans: 11,
    services: 4,
    status: "ok",
  },
];

/** A fast POST /v1/orders: same shape, no lock wait. */
const FAST_SPANS: Span[] = SPANS.map((s) => {
  if (s.id === "s1" || s.id === "s2") return { ...s, dur: s.dur - 4760 };
  if (s.id === SLOW) return { ...s, dur: 40, attrs: { ...s.attrs, "db.lock_wait_ms": "0" } };
  if (s.start > 252) return { ...s, start: s.start - 4760 };
  return s;
});

interface EndpointRow extends Endpoint {
  service: string;
}

const ALL_ENDPOINTS: EndpointRow[] = [
  ...endpoints.map((e) => ({ ...e, service: "orders-api" })),
  {
    id: "p1",
    service: "payments-api",
    method: "POST",
    route: "/v1/charges",
    rps: 410,
    p95: 286,
    errors: 0.1,
    trend: wave(24, { base: 280, amp: 20, seed: 101 }),
  },
  {
    id: "p2",
    service: "payments-api",
    method: "POST",
    route: "/v1/refunds",
    rps: 6.1,
    p95: 512,
    errors: 0.4,
    trend: wave(24, { base: 500, amp: 40, seed: 102 }),
  },
  {
    id: "i1",
    service: "inventory-api",
    method: "POST",
    route: "/v1/reservations",
    rps: 690,
    p95: 182,
    errors: 0.05,
    trend: wave(24, { base: 170, amp: 15, seed: 103 }),
  },
  {
    id: "i2",
    service: "inventory-api",
    method: "GET",
    route: "/v1/stock/{sku}",
    rps: 1320,
    p95: 12,
    errors: 0,
    trend: wave(24, { base: 11, amp: 2, seed: 104 }),
  },
  {
    id: "a1",
    service: "auth-service",
    method: "GET",
    route: "/v1/tokens/introspect",
    rps: 2210,
    p95: 34,
    errors: 0.01,
    trend: wave(24, { base: 32, amp: 3, seed: 105 }),
  },
  { id: "s1", service: "search-api", method: "GET", route: "/v1/search", rps: 940, p95: 210, errors: 0.2, trend: wave(24, { base: 200, amp: 20, seed: 106 }) },
  { id: "n1", service: "notifications", method: "POST", route: "/v1/send", rps: 72, p95: 640, errors: 1.4, trend: wave(24, { base: 600, amp: 60, seed: 107 }) },
];

const BUCKETS = ["<25", "50", "100", "250", "500", "1s", "2.5s", "5s", ">5s"];

/* --------------------------------------------------------------- pages */

function ServiceDetail({ onBack }: { onBack?: () => void }) {
  const [range, setRange] = useState("3h");
  const [env, setEnv] = useState<string[]>(["prod"]);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Services", href: "#services" }, { label: "orders-api" }]}
        title="orders-api"
        description="Go 1.23 · OpenTelemetry SDK 1.32 · 6 instances · owned by Payments team"
        meta={<StatusBadge tone="warning">p95 above SLO</StatusBadge>}
        actions={
          <>
            {onBack && (
              <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack}>
                All services
              </Button>
            )}
            <SearchInput label="Find trace ID" shortcut="/" className="w-60" />
            <Button icon={<GitCompare />}>Compare deploys</Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Environment"
          selected={env}
          onChange={setEnv}
          options={[
            { value: "prod", count: 6 },
            { value: "staging", count: 2 },
          ]}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Rate"
          value="1.24k"
          unit="req/s"
          trend={wave(24, { base: 1200, amp: 180, seed: 71 })}
          delta={{ label: "+4% vs. last week", direction: "up" }}
        />
        <KpiCard
          label="Errors"
          value="0.82"
          unit="%"
          tone="danger"
          trendColor="var(--oa-danger)"
          trend={wave(24, { base: 0.2, amp: 0.05, seed: 72, spike: 0.7, spikeAt: 17 })}
          delta={{ label: "SLO 1% · 18% budget left", direction: "up", intent: "bad" }}
        />
        <KpiCard
          label="Latency p95"
          value="2.41"
          unit="s"
          tone="warning"
          trendColor="var(--oa-warning)"
          trend={wave(24, { base: 0.4, amp: 0.05, seed: 73, spike: 2, spikeAt: 17 })}
          delta={{ label: "SLO 2 s since 13:45", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Apdex · 500 ms" value="0.87" delta={{ label: "-0.08 vs. yesterday", direction: "down", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Latency" description="Server spans of orders-api, percentiles">
          <TimeSeriesChart
            label="orders-api latency p50, p95 and p99"
            labels={labels}
            height={180}
            area={false}
            format={(v) => ms(v)}
            threshold={{ value: 2000, label: "SLO 2 s" }}
            xTicks={5}
            series={[
              { id: "p99", name: "p99", color: "var(--oa-chart-4)", data: wave(N, { base: 820, amp: 90, seed: 74, spike: 4300, spikeAt: AT, spikeLen: 4 }) },
              { id: "p95", name: "p95", color: "var(--oa-chart-2)", data: wave(N, { base: 410, amp: 50, seed: 75, spike: 2000, spikeAt: AT, spikeLen: 4 }) },
              { id: "p50", name: "p50", color: "var(--oa-chart-1)", data: wave(N, { base: 88, amp: 12, seed: 76, spike: 140, spikeAt: AT, spikeLen: 4 }) },
            ]}
          />
        </Panel>
        <Panel title="Endpoints" description="Sorted by p95" flush>
          <DataTable
            label="orders-api endpoints"
            columns={endpointColumns}
            rows={endpoints}
            getRowId={(e) => e.id}
            defaultSort={{ id: "p95", direction: "desc" }}
            minWidth={620}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={`Trace ${TRACE_ID.slice(0, 16)} · POST /v1/orders`}
          description={`${SPANS.length} spans · 5 services · ${ms(TOTAL)} · 13:47:12 UTC`}
          actions={<Badge tone="danger">Slow · 11× p50</Badge>}
          flush
        >
          <Waterfall selected={selected} onSelect={setSelected} />
        </Panel>
        <Panel title="Span details" aria-label="Span details">
          <SpanDetails span={SPANS.find((s) => s.id === selected)} />
        </Panel>
      </div>
    </>
  );
}

function ServicesPage({ initialOpen }: { initialOpen?: string }) {
  const [open, setOpen] = useState(initialOpen);
  const [q, setQ] = useState("");
  const [teams, setTeams] = useState<string[]>([]);
  const [range, setRange] = useState("1h");
  if (open === "orders-api") return <ServiceDetail onBack={() => setOpen(undefined)} />;
  const shown = SERVICES.filter((s) => (teams.length === 0 || teams.includes(s.team)) && s.name.includes(q.trim().toLowerCase()));
  const cols: Column<ServiceRow>[] = [
    {
      id: "name",
      header: "Service",
      pinned: "left",
      width: "22%",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          {s.name === "orders-api" ? (
            <button type="button" onClick={() => setOpen(s.name)} className="truncate text-left font-mono text-xs font-medium text-fg hover:underline">
              {s.name}
            </button>
          ) : (
            <a href={`#services/${s.name}`} className="truncate font-mono text-xs font-medium text-fg no-underline hover:underline">
              {s.name}
            </a>
          )}
          <span className="text-2xs text-fg-muted">
            {s.lang} · {s.team}
          </span>
        </span>
      ),
    },
    { id: "rps", header: "Req/s", align: "right", mono: true, sortValue: (s) => s.rps, cell: (s) => formatNumber(s.rps) },
    {
      id: "errors",
      header: "Errors",
      align: "right",
      mono: true,
      sortValue: (s) => s.errors,
      cell: (s) => <span className={cn(s.errors >= 1 ? "text-danger-text" : s.errors >= 0.5 ? "text-warning-text" : "text-fg")}>{s.errors.toFixed(2)}%</span>,
    },
    {
      id: "p95",
      header: "p95",
      align: "right",
      mono: true,
      sortValue: (s) => s.p95,
      cell: (s) => <span className={cn(s.p95 > 2000 && "font-semibold text-danger-text")}>{ms(s.p95)}</span>,
    },
    {
      id: "apdex",
      header: "Apdex",
      align: "right",
      mono: true,
      sortValue: (s) => s.apdex,
      cell: (s) => s.apdex.toFixed(2),
      description: "Share of satisfied requests (under 500 ms) plus half the tolerated ones (under 2 s).",
    },
    {
      id: "trend",
      header: "p95 · 2 h",
      width: "130px",
      cell: (s) => <Sparkline data={s.trend} label={`p95 latency of ${s.name}`} height={20} className="w-24" format={(v) => ms(v)} />,
    },
    { id: "inst", header: "Instances", align: "right", mono: true, sortValue: (s) => s.instances, cell: (s) => s.instances },
  ];
  return (
    <>
      <PageHeader
        title="Services"
        description="24 services sending OpenTelemetry spans · 4.2k spans/s after tail sampling"
        actions={
          <>
            <SearchInput label="Search services" shortcut="/" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button icon={<Plus />}>Instrument a service</Button>
          </>
        }
      />
      <FilterBar onClear={teams.length ? () => setTeams([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Team"
          selected={teams}
          onChange={setTeams}
          options={Array.from(new Set(SERVICES.map((s) => s.team))).map((t) => ({ value: t, count: SERVICES.filter((s) => s.team === t).length }))}
        />
      </FilterBar>
      <KpiGrid minWidth={170}>
        <KpiCard label="Services" value="24" unit="8 shown" />
        <KpiCard label="Spans / s" value="4.2k" unit="kept" trend={wave(24, { base: 4200, amp: 400, seed: 111 })} delta={{ label: "12% of 35k received" }} />
        <KpiCard label="Above SLO" value="2" tone="danger" unit="orders-api, api-gateway" />
        <KpiCard label="Error traces · 1 h" value="1,912" tone="warning" delta={{ label: "+340% vs. last hour", direction: "up", intent: "bad" }} />
      </KpiGrid>
      <Panel title="Services" description={`${shown.length} of ${SERVICES.length}`} flush>
        <DataTable label="Services" columns={cols} rows={shown} getRowId={(s) => s.id} defaultSort={{ id: "p95", direction: "desc" }} minWidth={860} />
      </Panel>
    </>
  );
}

function ServiceMapPage() {
  const [active, setActive] = useState("orders-api");
  const callers = EDGES.filter((e) => e.to === active);
  const callees = EDGES.filter((e) => e.from === active);
  const linked = new Set([active, ...callers.map((e) => e.from), ...callees.map((e) => e.to)]);
  const stat = (name: string) => SERVICES.find((s) => s.name === name);
  const edgeCols: Column<Edge>[] = [
    { id: "peer", header: "Service", pinned: "left", cell: (e) => <span className="font-mono text-xs">{e.from === active ? e.to : e.from}</span> },
    { id: "proto", header: "Protocol", cell: (e) => <Badge mono>{e.proto}</Badge> },
    { id: "rps", header: "Calls/s", align: "right", mono: true, sortValue: (e) => e.rps, cell: (e) => formatNumber(e.rps) },
    {
      id: "p95",
      header: "p95",
      align: "right",
      mono: true,
      sortValue: (e) => e.p95,
      cell: (e) => <span className={cn(e.p95 > 2000 && "font-semibold text-danger-text")}>{ms(e.p95)}</span>,
    },
    { id: "err", header: "Errors", align: "right", mono: true, sortValue: (e) => e.errors, cell: (e) => `${e.errors.toFixed(1)}%` },
  ];
  return (
    <>
      <PageHeader
        title="Service map"
        description="Built from client and server spans over the last 15 minutes · select a service to see who it calls"
        actions={<Button icon={<Share2 />}>Share</Button>}
      />
      <Callout tone="warning" title="orders-api → postgres p95 is 4.8 s">
        Most of the time is a row lock wait on orders. It started at 13:45, together with the PATCH status endpoint.
      </Callout>
      <Panel title="Topology" description="Left to right: edge to data stores. Highlighted: the selected service and its direct neighbours." flush>
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="Service topology, scrollable">
          <div className="grid min-w-[880px] grid-cols-4 gap-3 p-3">
            {LAYERS.map((l) => (
              <div key={l.name} className="flex flex-col gap-2">
                <h3 className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{l.name}</h3>
                <ul className="flex flex-col gap-2" aria-label={l.name}>
                  {l.items.map((name) => {
                    const s = stat(name);
                    const on = name === active;
                    const near = linked.has(name);
                    const bad = s && (s.p95 > 2000 || s.errors >= 1);
                    return (
                      <li key={name}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => setActive(name)}
                          className={cn(
                            "flex w-full flex-col gap-1 rounded-md border px-2.5 py-2 text-left",
                            on ? "border-accent bg-accent-soft" : near ? "border-line-strong bg-surface" : "border-line bg-canvas",
                            bad && !on && "border-danger",
                          )}
                        >
                          <span className="flex items-center gap-1.5">
                            <span aria-hidden className={cn("size-2 rounded-full", bad ? "bg-danger" : s ? "bg-success" : "bg-fg-subtle")} />
                            <span className="truncate font-mono text-xs font-medium text-fg">{name}</span>
                          </span>
                          {s ? (
                            <span className="grid grid-cols-3 gap-1 font-mono text-2xs text-fg-muted">
                              <span>{formatNumber(s.rps)}/s</span>
                              <span className={cn(s.errors >= 1 && "text-danger-text")}>{s.errors.toFixed(1)}%</span>
                              <span className={cn(s.p95 > 2000 && "text-danger-text")}>{ms(s.p95)}</span>
                            </span>
                          ) : (
                            <span className="text-2xs text-fg-muted">inferred from client spans</span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title={`Calls into ${active}`} description={`${callers.length} callers`} flush>
          <DataTable
            label="Callers"
            columns={edgeCols}
            rows={callers}
            getRowId={(e) => `${e.from}>${e.to}`}
            minWidth={480}
            empty={<p className="py-6 text-sm text-fg-muted">No instrumented callers. Traffic enters here.</p>}
          />
        </Panel>
        <Panel title={`Calls from ${active}`} description={`${callees.length} dependencies`} flush>
          <DataTable
            label="Dependencies"
            columns={edgeCols}
            rows={callees}
            getRowId={(e) => `${e.from}>${e.to}`}
            minWidth={480}
            defaultSort={{ id: "p95", direction: "desc" }}
            empty={<p className="py-6 text-sm text-fg-muted">Leaf: calls nothing that is instrumented.</p>}
          />
        </Panel>
      </div>
    </>
  );
}

function TracesPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string[]>([]);
  const [minDur, setMinDur] = useState<"any" | "500" | "2000">("any");
  const [range, setRange] = useState("15m");
  const [traceId, setTraceId] = useState<string>(TRACE_ID);
  const [selected, setSelected] = useState<string | null>(null);
  const shown = TRACES.filter(
    (t) =>
      (status.length === 0 || status.includes(t.status)) &&
      (minDur === "any" || t.dur >= Number(minDur)) &&
      (t.root.toLowerCase().includes(q.trim().toLowerCase()) || t.id.startsWith(q.trim())),
  );
  const t = TRACES.find((x) => x.id === traceId)!;
  const detail = t.id === TRACE_ID ? { spans: SPANS, total: TOTAL } : t.id === TRACES[1]!.id ? { spans: FAST_SPANS, total: TRACES[1]!.dur } : null;
  const cols: Column<TraceRow>[] = [
    { id: "start", header: "Start", width: "90px", mono: true, cell: (x) => x.start },
    {
      id: "root",
      header: "Root span",
      pinned: "left",
      sortValue: (x) => x.root,
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-medium">{x.root}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{x.id.slice(0, 16)}</span>
        </span>
      ),
    },
    { id: "service", header: "Service", mono: true, cell: (x) => x.service },
    {
      id: "dur",
      header: "Duration",
      align: "right",
      mono: true,
      sortValue: (x) => x.dur,
      cell: (x) => <span className={cn(x.dur > 2000 && "font-semibold text-danger-text")}>{ms(x.dur)}</span>,
    },
    { id: "spans", header: "Spans", align: "right", mono: true, sortValue: (x) => x.spans, cell: (x) => x.spans },
    {
      id: "status",
      header: "Status",
      cell: (x) => <StatusBadge tone={x.status === "ok" ? "success" : "danger"}>{x.status === "ok" ? "OK" : "Error"}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader
        title="Traces"
        description="Search sampled traces · errors and slow traces are always kept"
        actions={<SearchInput label="Search root span or trace ID" className="w-72" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
      <FilterBar onClear={status.length || minDur !== "any" ? () => (setStatus([]), setMinDur("any")) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Status"
          selected={status}
          onChange={setStatus}
          options={[
            { value: "ok", count: TRACES.filter((x) => x.status === "ok").length },
            { value: "error", count: TRACES.filter((x) => x.status === "error").length },
          ]}
        />
        <SegmentedControl
          label="Minimum duration"
          value={minDur}
          onChange={setMinDur}
          options={[
            { value: "any", label: "Any duration" },
            { value: "500", label: "≥ 500 ms" },
            { value: "2000", label: "≥ 2 s" },
          ]}
        />
      </FilterBar>
      <Panel title="Duration distribution" description="POST /v1/orders · last 15 minutes">
        <StackedBarChart
          label="Trace count by duration bucket"
          categories={BUCKETS}
          segments={[
            { id: "ok", name: "OK", color: "var(--oa-chart-1)" },
            { id: "err", name: "Error", color: "var(--oa-danger)" },
          ]}
          values={[
            [120, 0],
            [610, 1],
            [980, 2],
            [402, 3],
            [133, 2],
            [61, 4],
            [44, 12],
            [38, 31],
            [9, 22],
          ]}
          height={110}
          xTicks={9}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Traces" description={`${shown.length} shown`} flush>
          <DataTable
            label="Traces"
            columns={cols}
            rows={shown}
            getRowId={(x) => x.id}
            onRowClick={(x) => (setTraceId(x.id), setSelected(null))}
            activeRowId={traceId}
            minWidth={620}
            defaultSort={{ id: "dur", direction: "desc" }}
          />
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title={`${t.root} · ${ms(t.dur)}`} description={`Trace ${t.id}`} aria-label="Trace waterfall" flush>
            {detail ? (
              <Waterfall spans={detail.spans} total={detail.total} traceId={t.id} selected={selected} onSelect={setSelected} />
            ) : (
              <EmptyState icon={<Waypoints />} title="Spans are being fetched from cold storage" action={<Button size="sm">Load now</Button>}>
                Traces older than 10 minutes are kept in object storage and load in a few seconds.
              </EmptyState>
            )}
          </Panel>
          {detail && (
            <Panel title="Span details" aria-label="Trace span details">
              <SpanDetails span={detail.spans.find((s) => s.id === selected)} total={detail.total} />
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

function EndpointsPage() {
  const [services, setServices] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState("e1");
  const shown = ALL_ENDPOINTS.filter((e) => (services.length === 0 || services.includes(e.service)) && e.route.includes(q.trim()));
  const e = ALL_ENDPOINTS.find((x) => x.id === active)!;
  const cols: Column<EndpointRow>[] = [
    endpointColumns[0]!,
    { id: "service", header: "Service", mono: true, sortValue: (x) => x.service, cell: (x) => x.service },
    ...endpointColumns.slice(1),
  ];
  cols[0] = { ...cols[0]!, pinned: "left" };
  const hist = BUCKETS.map((_, i) => {
    const center = e.p95 > 2000 ? 6 : e.p95 > 500 ? 4 : e.p95 > 100 ? 3 : 1;
    const ok = Math.round(900 * Math.exp(-((i - center + 1.5) ** 2) / 2));
    return [ok, Math.round((e.errors / 100) * ok * 6)];
  });
  return (
    <>
      <PageHeader
        title="Endpoints"
        description="Every route of every service, from server spans · grouped by http.route"
        actions={<SearchInput label="Search routes" className="w-56" value={q} onChange={(ev) => setQ(ev.target.value)} />}
      />
      <FilterBar onClear={services.length ? () => setServices([]) : undefined}>
        <FacetFilter
          label="Service"
          selected={services}
          onChange={setServices}
          options={Array.from(new Set(ALL_ENDPOINTS.map((x) => x.service))).map((s) => ({
            value: s,
            count: ALL_ENDPOINTS.filter((x) => x.service === s).length,
          }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Endpoints" description={`${shown.length} routes`} flush>
          <DataTable
            label="All endpoints"
            columns={cols}
            rows={shown}
            getRowId={(x) => x.id}
            onRowClick={(x) => setActive(x.id)}
            activeRowId={active}
            defaultSort={{ id: "rps", direction: "desc" }}
            minWidth={760}
            pageSize={10}
          />
        </Panel>
        <Panel title={`${e.method} ${e.route}`} description={e.service} aria-label="Endpoint detail" className="xl:sticky xl:top-3 xl:self-start">
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-2xs text-fg-muted">Req/s</dt>
                <dd className="font-mono font-semibold">{e.rps.toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">p95</dt>
                <dd className={cn("font-mono font-semibold", e.p95 > 2000 && "text-danger-text")}>{ms(e.p95)}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Errors</dt>
                <dd className="font-mono font-semibold">{e.errors.toFixed(2)}%</dd>
              </div>
            </dl>
            <StackedBarChart
              label={`Latency histogram of ${e.method} ${e.route}`}
              categories={BUCKETS}
              segments={[
                { id: "ok", name: "OK", color: "var(--oa-chart-1)" },
                { id: "err", name: "Error", color: "var(--oa-danger)" },
              ]}
              values={hist}
              height={120}
              xTicks={9}
            />
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold">Where the time goes</h3>
              <BarList
                label={`Time by span type for ${e.route}`}
                format={(v) => `${v}%`}
                max={100}
                items={
                  e.p95 > 2000
                    ? [
                        { id: "db", label: "postgres", value: 88, color: "var(--oa-danger)" },
                        { id: "http", label: "HTTP calls", value: 9 },
                        { id: "self", label: "self time", value: 3 },
                      ]
                    : [
                        { id: "self", label: "self time", value: 46 },
                        { id: "http", label: "HTTP calls", value: 38 },
                        { id: "db", label: "database", value: 16 },
                      ]
                }
              />
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

const VERSIONS = ["2.14.1", "2.14.0", "2.13.4"];

function ComparePage() {
  const [base, setBase] = useState("2.14.0");
  const [target, setTarget] = useState("2.14.1");
  const regress = target === "2.14.1" && base !== "2.14.1";
  const factor = (id: string) => (!regress ? 1 : id === "e1" ? 6.2 : id === "e4" ? 4.1 : 1.05);
  const rows = endpoints.map((e) => {
    const after = e.p95;
    const before = Math.round(after / factor(e.id));
    return { ...e, before, after, delta: before ? (after - before) / before : 0 };
  });
  const lbl = timeLabels(N, 5);
  return (
    <>
      <PageHeader
        title="Compare"
        description="orders-api · latency by version, same time window and traffic mix"
        actions={
          <Button
            icon={<ArrowLeftRight />}
            onClick={() => {
              setBase(target);
              setTarget(base);
            }}
          >
            Swap versions
          </Button>
        }
      />
      <Panel>
        <div className="grid gap-3 md:grid-cols-3 md:items-end">
          <SelectField
            label="Baseline version"
            value={base}
            onChange={(e) => setBase(e.target.value)}
            options={VERSIONS.map((v) => ({ value: v, label: `${v}${v === "2.14.0" ? " · Oct 17" : v === "2.13.4" ? " · Oct 9" : " · today 13:40"}` }))}
          />
          <SelectField
            label="Comparison version"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            options={VERSIONS.map((v) => ({ value: v, label: v }))}
          />
          <SelectField label="Service" defaultValue="orders-api" options={[{ value: "orders-api", label: "orders-api" }]} />
        </div>
      </Panel>
      {regress ? (
        <Callout tone="danger" title={`${target} is 6.2× slower on POST /v1/orders than ${base}`}>
          The new SELECT … FOR UPDATE in orders.reserve takes a row lock that PATCH /status also needs.
        </Callout>
      ) : (
        <Callout tone="success" title={`No significant latency change between ${base} and ${target}`} />
      )}
      <KpiGrid minWidth={170}>
        <KpiCard
          label="p95"
          value={regress ? "2.41 s" : "412 ms"}
          delta={{ label: regress ? "+1.99 s vs. baseline" : "±0", direction: regress ? "up" : "flat", intent: regress ? "bad" : "neutral" }}
        />
        <KpiCard
          label="Error rate"
          value={regress ? "0.82%" : "0.19%"}
          delta={{ label: regress ? "+0.63 pts" : "±0", direction: regress ? "up" : "flat", intent: regress ? "bad" : "neutral" }}
        />
        <KpiCard label="Throughput" value="1.24k" unit="req/s" delta={{ label: "same traffic mix", direction: "flat" }} />
        <KpiCard label="Traces compared" value="18.4k" unit="vs 21.0k" />
      </KpiGrid>
      <Panel title="p95 latency" description={`${base} vs ${target}`}>
        <TimeSeriesChart
          label={`p95 latency, ${base} compared with ${target}`}
          labels={lbl}
          height={200}
          area={false}
          format={(v) => ms(v)}
          xTicks={6}
          series={[
            { id: "base", name: base, color: "var(--oa-chart-1)", data: wave(N, { base: 410, amp: 40, seed: 121 }) },
            { id: "target", name: target, color: "var(--oa-chart-2)", data: wave(N, { base: regress ? 2400 : 415, amp: regress ? 200 : 40, seed: 122 }) },
          ]}
        />
      </Panel>
      <Panel title="By endpoint" flush>
        <DataTable
          label="Endpoint comparison"
          rows={rows}
          getRowId={(r) => r.id}
          defaultSort={{ id: "delta", direction: "desc" }}
          minWidth={720}
          columns={[
            { ...endpointColumns[0]!, pinned: "left" },
            { id: "before", header: base, align: "right", mono: true, label: `p95 ${base}`, cell: (r) => ms(r.before) },
            { id: "after", header: target, align: "right", mono: true, label: `p95 ${target}`, cell: (r) => ms(r.after) },
            {
              id: "delta",
              header: "Change",
              align: "right",
              mono: true,
              sortValue: (r) => r.delta,
              description: "Relative change of p95 latency from the baseline.",
              cell: (r) => (
                <span className={cn(r.delta > 0.5 ? "font-semibold text-danger-text" : r.delta < -0.1 ? "text-success" : "text-fg-muted")}>
                  {r.delta >= 0 ? "+" : ""}
                  {Math.round(r.delta * 100)}%
                </span>
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- app */

const PAGES = {
  services: () => <ServicesPage />,
  map: () => <ServiceMapPage />,
  traces: () => <TracesPage />,
  endpoints: () => <EndpointsPage />,
  compare: () => <ComparePage />,
};

const app = (initial: string, pages: PageMap = PAGES): Story => ({ render: () => <ProductApp product="traces" nav={nav} pages={pages} initial={initial} /> });

/* --------------------------------------------------------------- stories */

export const Services: Story = {
  ...app("services"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Services" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("api-gateway");
    await userEvent.type(c.getByRole("searchbox", { name: "Search services" }), "orders");
    await userEvent.click(within(table).getByRole("button", { name: "orders-api" }));
    await expect(c.getByRole("heading", { level: 1, name: "orders-api" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "All services" }));
    await expect(c.getByRole("heading", { level: 1, name: "Services" })).toBeInTheDocument();
  },
};

/** One service: RED metrics, latency percentiles, endpoints and a waterfall for one slow request. */
export const Service: Story = {
  ...app("services", { ...PAGES, services: () => <ServicesPage initialOpen="orders-api" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "orders-api" })).toBeInTheDocument();
    const details = within(c.getByRole("region", { name: "Span details" }));
    await expect(details.getByText("Select a span to see its attributes.")).toBeInTheDocument();

    const slow = c.getByRole("button", { name: /orders-api db\.query/ });
    await userEvent.click(slow);
    await expect(slow).toHaveAttribute("aria-pressed", "true");
    await expect(details.getByRole("heading", { name: "db.query" })).toBeInTheDocument();
    await expect(details.getByText("db.statement")).toBeInTheDocument();
    await expect(details.getByText(/FOR UPDATE/)).toBeInTheDocument();
    await expect(details.getByText("Slowest span")).toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: /payments-api POST \/v1\/charges/ }));
    await expect(details.getByText("payment.currency")).toBeInTheDocument();
    await expect(details.queryByText("db.statement")).not.toBeInTheDocument();
  },
};

export const ServiceMap: Story = {
  name: "Service map",
  ...app("map"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Dependencies" })).toHaveTextContent("postgres · db-prod-01");
    await userEvent.click(c.getByRole("button", { name: /^payments-api/ }));
    await expect(c.getByRole("button", { name: /^payments-api/ })).toHaveAttribute("aria-pressed", "true");
    const callers = c.getByRole("table", { name: "Callers" });
    await expect(callers).toHaveTextContent("orders-api");
    await expect(callers).toHaveTextContent("billing-worker");
    await expect(c.getByRole("table", { name: "Dependencies" })).toHaveTextContent("psp.example.com");
  },
};

export const TraceSearch: Story = {
  name: "Traces",
  ...app("traces"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: "≥ 2 s" }));
    const table = c.getByRole("table", { name: "Traces" });
    await expect(within(table).getAllByRole("row")).toHaveLength(4);
    await userEvent.click(c.getByRole("radio", { name: "Any duration" }));
    await userEvent.click(within(table).getByText("7d1e0a52c4b3f9e8"));
    const wf = c.getByRole("region", { name: "Trace waterfall" });
    await expect(wf).toHaveTextContent("660 ms");
    await userEvent.click(within(wf).getByRole("button", { name: /orders-api db\.query/ }));
    await expect(c.getByRole("region", { name: "Trace span details" })).toHaveTextContent("db.lock_wait_ms");
    await expect(c.getByRole("region", { name: "Trace span details" })).not.toHaveTextContent("Slowest span");
  },
};

export const Endpoints: Story = {
  ...app("endpoints"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getAllByRole("button", { name: "Service" }).find((b) => b.hasAttribute("aria-expanded"))!);
    await userEvent.click(await body.findByRole("checkbox", { name: /payments-api/ }));
    await userEvent.keyboard("{Escape}");
    const table = c.getByRole("table", { name: "All endpoints" });
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await userEvent.click(within(table).getByText("/v1/refunds"));
    await expect(c.getByRole("region", { name: "Endpoint detail" })).toHaveTextContent("POST /v1/refunds");
  },
};

export const Compare: Story = {
  ...app("compare"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toHaveTextContent("6.2× slower");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Comparison version" }), "2.13.4");
    await expect(c.getByText("No significant latency change between 2.14.0 and 2.13.4")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Swap versions" }));
    await expect(c.getByRole("combobox", { name: "Baseline version" })).toHaveValue("2.13.4");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
