import { Fragment, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowRight, Boxes, ChevronRight, CircleDot, Flame, GitCompare, Layers, Plus, Share2, Waypoints } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { EmptyState } from "../../components/EmptyState";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { ChartLegend } from "../../charts/parts";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { formatNumber } from "../../lib/format";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "profiles", label: "Profiles", icon: Layers },
  { id: "flame", label: "Flame graphs", icon: Flame },
  { id: "compare", label: "Compare", icon: GitCompare },
  { id: "services", label: "Services", icon: Boxes },
];

const meta = {
  title: "Products/Profiling",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type Category = "app" | "database" | "stdlib" | "runtime";

const CATEGORY: Record<Category, { name: string; color: string }> = {
  app: { name: "github.com/acme/orders", color: "var(--oa-chart-1)" },
  database: { name: "database/sql · lib/pq", color: "var(--oa-chart-2)" },
  stdlib: { name: "Go standard library", color: "var(--oa-chart-3)" },
  runtime: { name: "Go runtime", color: "var(--oa-chart-4)" },
};

interface Node {
  fn: string;
  cat: Category;
  value: number;
  children?: Node[];
}

const n = (fn: string, cat: Category, value: number, children?: Node[]): Node => ({ fn, cat, value, children });

/** CPU samples (10 ms each) for orders-api over 1 hour. */
const ROOT: Node = n("all", "runtime", 10000, [
  n("runtime.main", "runtime", 8900, [
    n("main.main", "app", 8900, [
      n("net/http.(*Server).Serve", "stdlib", 8900, [
        n("net/http.(*conn).serve", "stdlib", 8900, [
          n("net/http.serverHandler.ServeHTTP", "stdlib", 8700, [
            n("orders/api.(*Router).ServeHTTP", "app", 8700, [
              n("orders/api.(*Handler).CreateOrder", "app", 5200, [
                n("orders/store.(*Store).CreateOrder", "app", 3600, [
                  n("database/sql.(*DB).QueryContext", "database", 2400, [
                    n("github.com/lib/pq.(*conn).query", "database", 2200, [
                      n("net.(*conn).Read", "stdlib", 1300, [n("syscall.Syscall", "runtime", 1100)]),
                      n("github.com/lib/pq.(*readBuf).string", "database", 600),
                    ]),
                  ]),
                  n("orders/store.buildInsert", "app", 700, [n("fmt.Sprintf", "stdlib", 500, [n("fmt.(*pp).doPrintf", "stdlib", 420)])]),
                ]),
                n("encoding/json.Marshal", "stdlib", 1100, [n("encoding/json.(*encodeState).reflectValue", "stdlib", 900)]),
                n("orders/pricing.Calculate", "app", 400, [n("math/big.(*Float).Mul", "stdlib", 180)]),
              ]),
              n("orders/api.(*Handler).ListOrders", "app", 2600, [
                n("encoding/json.Marshal", "stdlib", 1500, [n("encoding/json.(*encodeState).reflectValue", "stdlib", 1300, [n("runtime.mallocgc", "runtime", 520)])]),
                n("orders/store.(*Store).ListOrders", "app", 900, [n("database/sql.(*Rows).Next", "database", 700, [n("github.com/lib/pq.(*conn).recv", "database", 560)])]),
              ]),
              n("orders/api.authMiddleware", "app", 800, [n("crypto/ecdsa.Verify", "stdlib", 650, [n("crypto/internal/nistec.(*P256Point).ScalarMult", "stdlib", 590)])]),
            ]),
          ]),
          n("bufio.(*Reader).Peek", "stdlib", 120),
        ]),
      ]),
    ]),
  ]),
  n("runtime.gcBgMarkWorker", "runtime", 800, [n("runtime.gcDrain", "runtime", 760, [n("runtime.scanobject", "runtime", 610)])]),
  n("runtime.mcall", "runtime", 300, [n("runtime.schedule", "runtime", 260)]),
]);

const TOTAL = ROOT.value;
const pct = (v: number) => `${((v / TOTAL) * 100).toFixed(1)}%`;
const selfOf = (node: Node) => node.value - (node.children ?? []).reduce((s, c) => s + c.value, 0);

/** Find the path from the root to a node, by reference. */
function pathTo(target: Node, node: Node = ROOT, acc: Node[] = []): Node[] | null {
  const here = [...acc, node];
  if (node === target) return here;
  for (const c of node.children ?? []) {
    const p = pathTo(target, c, here);
    if (p) return p;
  }
  return null;
}

interface Placed {
  node: Node;
  depth: number;
  x: number;
  key: string;
}

/** Lay out a subtree as rows of frames with x offset (in samples from the zoom root). */
function layout(root: Node): Placed[][] {
  const rows: Placed[][] = [];
  const walk = (node: Node, depth: number, x: number, key: string) => {
    (rows[depth] ??= []).push({ node, depth, x, key });
    let cx = x;
    (node.children ?? []).forEach((c, i) => {
      walk(c, depth + 1, cx, `${key}.${i}`);
      cx += c.value;
    });
  };
  walk(root, 0, 0, "0");
  return rows;
}

interface FnRow {
  id: string;
  fn: string;
  cat: Category;
  self: number;
  total: number;
}

function topFunctions(): FnRow[] {
  const map = new Map<string, FnRow>();
  const walk = (node: Node, stack: Set<string>) => {
    const r = map.get(node.fn) ?? { id: node.fn, fn: node.fn, cat: node.cat, self: 0, total: 0 };
    r.self += selfOf(node);
    if (!stack.has(node.fn)) r.total += node.value;
    map.set(node.fn, r);
    const next = new Set(stack).add(node.fn);
    (node.children ?? []).forEach((c) => walk(c, next));
  };
  walk(ROOT, new Set());
  map.delete("all");
  return [...map.values()].sort((a, b) => b.self - a.self).slice(0, 12);
}

/* --------------------------------------------------------- flame graph */

/** Not in the library yet: an icicle-style flame graph of buttons. Width = share of samples. */
function FlameGraphView({ zoom, onZoom }: { zoom: Node; onZoom: (n: Node) => void }) {
  const [hover, setHover] = useState<Node | null>(null);
  const rows = useMemo(() => layout(zoom), [zoom]);
  const shown = hover ?? zoom;
  return (
    <div className="flex flex-col gap-2">
      <p aria-live="polite" data-testid="frame-info" className="flex min-h-5 flex-wrap items-center gap-x-3 gap-y-0.5 text-xs">
        <span className="min-w-0 truncate font-mono font-semibold">{shown.fn}</span>
        <span className="text-fg-muted">
          self <span className="font-mono text-fg">{pct(selfOf(shown))}</span>
        </span>
        <span className="text-fg-muted">
          total <span className="font-mono text-fg">{pct(shown.value)}</span>
        </span>
        <span className="text-fg-muted">
          <span className="font-mono text-fg">{formatNumber(shown.value)}</span> samples
        </span>
      </p>
      <div className="flex flex-col gap-px" onMouseLeave={() => setHover(null)}>
        {rows.map((row, d) => (
          <div key={d} className="relative h-6">
            {row.map((p) => {
              const w = p.node.value / zoom.value;
              if (w < 0.004) return null;
              const color = CATEGORY[p.node.cat].color;
              return (
                <button
                  key={p.key}
                  type="button"
                  data-fn={p.node.fn}
                  onClick={() => onZoom(p.node)}
                  onMouseEnter={() => setHover(p.node)}
                  onFocus={() => setHover(p.node)}
                  onBlur={() => setHover(null)}
                  className={cn(
                    "absolute inset-y-0 overflow-hidden rounded-sm border-l-2 px-1 text-left font-mono text-2xs text-fg hover:brightness-95",
                    hover === p.node && "ring-1 ring-fg",
                  )}
                  style={{
                    left: `${(p.x / zoom.value) * 100}%`,
                    width: `calc(${w * 100}% - 1px)`,
                    borderLeftColor: color,
                    background: `color-mix(in srgb, ${color} 22%, var(--oa-surface))`,
                  }}
                >
                  <span className="block truncate leading-6">{p.node.fn}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

const FNS = topFunctions();
const MAX_SELF = Math.max(...FNS.map((f) => f.self));

const fnColumns: Column<FnRow>[] = [
  {
    id: "fn",
    header: "Function",
    width: "48%",
    sortValue: (r) => r.fn,
    cell: (r) => (
      <span className="flex min-w-0 items-center gap-2">
        <span aria-hidden className="size-2 shrink-0 rounded-sm" style={{ background: CATEGORY[r.cat].color }} />
        <span className="truncate font-mono text-xs">{r.fn}</span>
      </span>
    ),
  },
  { id: "pkg", header: "Package", cell: (r) => <span className="text-xs text-fg-muted">{CATEGORY[r.cat].name}</span> },
  {
    id: "self",
    header: "Self",
    align: "right",
    mono: true,
    sortValue: (r) => r.self,
    cell: (r) => (
      <span className="flex items-center justify-end gap-2">
        <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-subtle">
          <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.self / MAX_SELF) * 100}%` }} />
        </span>
        {pct(r.self)}
      </span>
    ),
  },
  { id: "total", header: "Total", align: "right", mono: true, sortValue: (r) => r.total, cell: (r) => pct(r.total) },
  { id: "cpu", header: "CPU time", align: "right", mono: true, sortValue: (r) => r.self, cell: (r) => `${(r.self / 100).toFixed(1)} s` },
];

/* ----------------------------------------------------------------- pages */

/** Flame graph: CPU profile of orders-api; hover a frame for its numbers, click to zoom in. */
function FlameGraphPage() {
  const [range, setRange] = useState("1h");
  const [services, setServices] = useState<string[]>(["orders-api"]);
  const [type, setType] = useState("cpu");
  const [zoom, setZoom] = useState<Node>(ROOT);
  const path = pathTo(zoom) ?? [ROOT];
  const fns = FNS;
  return (
    <>
      <PageHeader
        title="Flame graphs"
        description="Continuous eBPF profiling · 100 Hz · 6 pods of orders-api"
        meta={<StatusBadge tone="success">Collecting</StatusBadge>}
        actions={
          <>
            <SegmentedControl
              label="Profile type"
              value={type}
              onChange={setType}
              options={[
                { value: "cpu", label: "CPU" },
                { value: "alloc", label: "Allocations" },
                { value: "heap", label: "Heap" },
              ]}
            />
            <Button icon={<GitCompare />}>Compare with v2.14.0</Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Service"
          selected={services}
          onChange={setServices}
          options={[
            { value: "orders-api", count: 6 },
            { value: "payments-api", count: 4 },
            { value: "inventory-api", count: 3 },
            { value: "reports-worker", count: 2 },
          ]}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="CPU · avg" value="1.84" unit="cores" trend={[1.6, 1.7, 1.65, 1.8, 2.4, 2.1, 1.9, 1.84]} delta={{ label: "+22% since v2.14.1", direction: "up", intent: "bad" }} />
        <KpiCard label="Samples" value="10k" unit="in 1 h" />
        <KpiCard label="Hottest function" value={<span className="font-mono text-base">json.reflectValue</span>} delta={{ label: "16.8% self · encoding/json" }} />
        <KpiCard label="GC share" value="8.0" unit="%" tone="warning" delta={{ label: "mallocgc under JSON encoding: 5.2%", intent: "bad" }} />
      </KpiGrid>
      <Panel
        title="CPU flame graph"
        description="Width is share of samples · click a frame to zoom"
        actions={
          <Button size="sm" icon={<Waypoints />}>
            Traces for this profile
          </Button>
        }
      >
        <div className="flex flex-col gap-2">
          <ChartLegend items={(Object.keys(CATEGORY) as Category[]).map((k) => ({ id: k, name: CATEGORY[k].name, color: CATEGORY[k].color }))} mark="box" />
          <nav aria-label="Zoom path">
            <ol className="flex flex-wrap items-center gap-1 text-xs">
              {path.map((p, i) => (
                <Fragment key={i}>
                  <li>
                    {i < path.length - 1 ? (
                      <Button size="xs" variant="ghost" className="font-mono" onClick={() => setZoom(p)}>
                        {p.fn}
                      </Button>
                    ) : (
                      <span aria-current="page" className="px-2 font-mono font-semibold">
                        {p.fn}
                      </span>
                    )}
                  </li>
                  {i < path.length - 1 && (
                    <li aria-hidden>
                      <ChevronRight className="size-3 text-fg-muted" />
                    </li>
                  )}
                </Fragment>
              ))}
              {zoom !== ROOT && (
                <li className="ml-auto">
                  <Button size="xs" onClick={() => setZoom(ROOT)}>
                    Reset zoom
                  </Button>
                </li>
              )}
            </ol>
          </nav>
          <FlameGraphView zoom={zoom} onZoom={setZoom} />
        </div>
      </Panel>
      <Panel title="Top functions" description="By self time" actions={<Badge>{fns.length} of 214</Badge>} flush>
        <DataTable label="Top functions by self time" columns={fnColumns} rows={fns} getRowId={(r) => r.id} defaultSort={{ id: "self", direction: "desc" }} minWidth={760} />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- profiles */

type ProfileType = "CPU" | "Allocations" | "Heap" | "Goroutines" | "Mutex";

interface Profile {
  id: string;
  time: string;
  service: string;
  type: ProfileType;
  duration: string;
  samples: number;
  pod: string;
  version: string;
  trigger: "Continuous" | "On demand" | "CPU spike";
  status: "Ready" | "Capturing";
}

const SERVICES_LIST = ["orders-api", "payments-api", "inventory-api", "reports-worker"] as const;
const TYPES: ProfileType[] = ["CPU", "Allocations", "Heap", "Goroutines", "Mutex"];

const PROFILES: Profile[] = Array.from({ length: 18 }, (_, i) => {
  const service = SERVICES_LIST[i % 4]!;
  const minutes = 14 * 60 - i * 7;
  return {
    id: `pr${i}`,
    time: `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`,
    service,
    type: TYPES[(i * 3) % 5]!,
    duration: i % 5 === 2 ? "30 s" : "60 s",
    samples: 4_000 + ((i * 1_733) % 6_000),
    pod: `${service}-7d9f${(i * 13) % 97}-x${i % 7}`,
    version: service === "orders-api" ? (i < 8 ? "v2.14.1" : "v2.14.0") : service === "payments-api" ? "v5.3.0" : service === "inventory-api" ? "v1.22.4" : "v5.0.3",
    trigger: i === 4 ? "CPU spike" : i % 6 === 1 ? "On demand" : "Continuous",
    status: "Ready",
  };
});

const TYPE_TOP: Record<ProfileType, Array<{ id: string; label: string; value: number }>> = {
  CPU: [
    { id: "a", label: "encoding/json.(*encodeState).reflectValue", value: 16.8 },
    { id: "b", label: "syscall.Syscall", value: 11.0 },
    { id: "c", label: "runtime.scanobject", value: 6.1 },
    { id: "d", label: "crypto/internal/nistec.(*P256Point).ScalarMult", value: 5.9 },
  ],
  Allocations: [
    { id: "a", label: "encoding/json.Marshal", value: 31.2 },
    { id: "b", label: "fmt.Sprintf", value: 14.6 },
    { id: "c", label: "github.com/lib/pq.(*readBuf).string", value: 9.8 },
    { id: "d", label: "bytes.(*Buffer).grow", value: 7.4 },
  ],
  Heap: [
    { id: "a", label: "orders/cache.(*LRU).Add", value: 38.0 },
    { id: "b", label: "github.com/lib/pq.(*conn).recv", value: 12.4 },
    { id: "c", label: "net/http.(*conn).readRequest", value: 8.1 },
    { id: "d", label: "encoding/json.Unmarshal", value: 6.6 },
  ],
  Goroutines: [
    { id: "a", label: "net/http.(*conn).serve", value: 61.0 },
    { id: "b", label: "database/sql.(*DB).connectionOpener", value: 12.0 },
    { id: "c", label: "orders/events.(*Publisher).loop", value: 8.0 },
    { id: "d", label: "runtime.gopark", value: 4.0 },
  ],
  Mutex: [
    { id: "a", label: "orders/cache.(*LRU).Get", value: 44.0 },
    { id: "b", label: "database/sql.(*DB).conn", value: 27.0 },
    { id: "c", label: "sync.(*Pool).Get", value: 9.0 },
    { id: "d", label: "log/slog.(*TextHandler).Handle", value: 6.0 },
  ],
};

function ProfilesPage() {
  const [range, setRange] = useState("1h");
  const [rows, setRows] = useState(PROFILES);
  const [services, setServices] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [active, setActive] = useState(PROFILES[0]!.id);
  const [capturing, setCapturing] = useState(false);
  const [capService, setCapService] = useState<string>("orders-api");
  const [capType, setCapType] = useState<ProfileType>("CPU");
  const shown = rows.filter((p) => (services.length === 0 || services.includes(p.service)) && (types.length === 0 || types.includes(p.type)));
  const p = rows.find((x) => x.id === active) ?? rows[0]!;
  const cols: Column<Profile>[] = [
    { id: "time", header: "Captured", pinned: "left", width: "96px", mono: true, sortValue: (x) => x.time, cell: (x) => x.time },
    { id: "service", header: "Service", sortValue: (x) => x.service, cell: (x) => <span className="font-medium">{x.service}</span> },
    { id: "type", header: "Type", sortValue: (x) => x.type, cell: (x) => <Badge>{x.type}</Badge> },
    { id: "version", header: "Version", mono: true, cell: (x) => x.version },
    { id: "pod", header: "Pod", mono: true, cell: (x) => <span className="block max-w-[200px] truncate text-xs">{x.pod}</span> },
    { id: "duration", header: "Duration", align: "right", mono: true, cell: (x) => x.duration },
    { id: "samples", header: "Samples", align: "right", mono: true, description: "Stack samples taken at 100 Hz for CPU; allocation events for memory profiles.", sortValue: (x) => x.samples, cell: (x) => formatNumber(x.samples) },
    { id: "trigger", header: "Trigger", description: "Continuous profiles are taken every minute; CPU spike profiles start when CPU passes 80% of the limit.", cell: (x) => <span className={cn("text-xs", x.trigger === "CPU spike" && "text-warning-text")}>{x.trigger}</span> },
    { id: "status", header: "Status", cell: (x) => <StatusBadge tone={x.status === "Ready" ? "success" : "info"}>{x.status}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Profiles"
        description="Every captured profile across 4 services · kept for 14 days"
        actions={
          <>
            <SearchInput label="Search profiles" className="w-56" />
            <Button variant="primary" icon={<CircleDot />} onClick={() => setCapturing(true)}>
              Capture profile
            </Button>
          </>
        }
      />
      {capturing && (
        <Panel title="Capture a profile now" actions={<Button size="sm" variant="ghost" onClick={() => setCapturing(false)}>Cancel</Button>}>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              const id = `pr-new-${rows.length}`;
              setRows((r) => [{ id, time: "14:03", service: capService, type: capType, duration: "60 s", samples: 0, pod: `${capService}-7d9f12-x0`, version: capService === "orders-api" ? "v2.14.1" : "latest", trigger: "On demand", status: "Capturing" }, ...r]);
              setActive(id);
              setCapturing(false);
            }}
          >
            <SelectField label="Service" value={capService} onChange={(e) => setCapService(e.target.value)} options={SERVICES_LIST.map((s) => ({ value: s, label: s }))} />
            <SelectField label="Profile type" value={capType} onChange={(e) => setCapType(e.target.value as ProfileType)} options={TYPES.map((t) => ({ value: t, label: t }))} />
            <SelectField label="Duration" defaultValue="60" options={[{ value: "30", label: "30 seconds" }, { value: "60", label: "60 seconds" }, { value: "300", label: "5 minutes" }]} />
            <Button type="submit" variant="primary">
              Start capture
            </Button>
          </form>
        </Panel>
      )}
      <FilterBar onClear={services.length || types.length ? () => (setServices([]), setTypes([])) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter label="Service" selected={services} onChange={setServices} options={SERVICES_LIST.map((s) => ({ value: s, count: rows.filter((x) => x.service === s).length }))} />
        <FacetFilter label="Type" selected={types} onChange={setTypes} options={TYPES.map((t) => ({ value: t, count: rows.filter((x) => x.type === t).length }))} />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Profiles · 1 h" value={String(rows.length)} unit="4 services" />
        <KpiCard label="Profiler overhead" value="0.6" unit="% CPU" tone="success" delta={{ label: "Budget 1%", intent: "good" }} />
        <KpiCard label="Spike captures" value="1" tone="warning" delta={{ label: "orders-api at 13:32", intent: "bad" }} />
        <KpiCard label="Storage" value="3.4" unit="GB · 14 d" />
      </KpiGrid>
      <Panel title="CPU by service" description="Cores, from continuous CPU profiles">
        <TimeSeriesChart
          label="CPU cores by service"
          labels={timeLabels(30, 2)}
          stacked
          height={170}
          format={(v) => `${v.toFixed(2)} cores`}
          series={SERVICES_LIST.map((s, i) => ({ id: s, name: s, data: wave(30, { base: [1.8, 1.1, 0.6, 0.4][i]!, amp: 0.2, seed: 300 + i, spike: i === 0 ? 0.6 : 0, spikeAt: 18, spikeLen: 3 }) }))}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Captured profiles" description={`${shown.length} of ${rows.length}`} flush>
          <DataTable label="Captured profiles" columns={cols} rows={shown} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={p.id} pageSize={10} minWidth={980} />
        </Panel>
        <Panel
          aria-label="Profile detail"
          title={`${p.service} · ${p.type}`}
          description={`${p.time} · ${p.duration} · ${p.pod}`}
          actions={
            <Button size="sm" icon={<Flame />} disabled={p.status !== "Ready"}>
              Open flame graph
            </Button>
          }
        >
          {p.status === "Capturing" ? (
            <EmptyState icon={<CircleDot />} title="Capturing…">
              Sampling {p.pod} for {p.duration}. The profile appears here when it is uploaded.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2.5">
              <dl className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <dt className="text-2xs text-fg-muted">Samples</dt>
                  <dd className="font-mono font-semibold">{formatNumber(p.samples)}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-fg-muted">Version</dt>
                  <dd className="font-mono font-semibold">{p.version}</dd>
                </div>
                <div>
                  <dt className="text-2xs text-fg-muted">Trigger</dt>
                  <dd className="font-semibold">{p.trigger}</dd>
                </div>
              </dl>
              <span className="text-xs font-medium">Top functions by self {p.type === "CPU" ? "time" : "share"}</span>
              <BarList label={`Top functions in ${p.service} ${p.type} profile`} format={(v) => `${v.toFixed(1)}%`} items={TYPE_TOP[p.type]} max={100} />
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- compare */

interface DiffRow {
  id: string;
  fn: string;
  cat: Category;
  base: number;
  head: number;
}

/** Self-time share in v2.14.0 vs v2.14.1, derived from the current profile with known changes. */
const DIFF: DiffRow[] = (() => {
  const shift: Record<string, number> = {
    "encoding/json.(*encodeState).reflectValue": -6.1,
    "runtime.mallocgc": -2.4,
    "runtime.scanobject": -1.9,
    "fmt.(*pp).doPrintf": -2.6,
    "orders/store.buildInsert": -0.9,
    "crypto/internal/nistec.(*P256Point).ScalarMult": 1.8,
    "math/big.(*Float).Mul": 0.3,
  };
  return FNS.map((f) => {
    const head = (f.self / TOTAL) * 100;
    const base = Math.max(0.1, head - (shift[f.fn] ?? (f.fn.length % 3 === 0 ? 0.2 : -0.1)));
    return { id: f.id, fn: f.fn, cat: f.cat, base: Math.round(base * 10) / 10, head: Math.round(head * 10) / 10 };
  });
})();

const VERSIONS = [
  { value: "v2.13.4", label: "v2.13.4 · Oct 2" },
  { value: "v2.14.0", label: "v2.14.0 · Oct 16" },
  { value: "v2.14.1", label: "v2.14.1 · today" },
];

function ComparePage() {
  const [base, setBase] = useState("v2.14.0");
  const [head, setHead] = useState("v2.14.1");
  const [show, setShow] = useState<"all" | "worse" | "better">("all");
  const delta = (r: DiffRow) => Math.round((r.head - r.base) * 10) / 10;
  const rows = DIFF.filter((r) => (show === "all" ? true : show === "worse" ? delta(r) > 0 : delta(r) < 0));
  const maxAbs = Math.max(...DIFF.map((r) => Math.abs(delta(r))));
  const same = base === head;
  const cols: Column<DiffRow>[] = [
    {
      id: "fn",
      header: "Function",
      pinned: "left",
      width: "40%",
      sortValue: (r) => r.fn,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className="size-2 shrink-0 rounded-sm" style={{ background: CATEGORY[r.cat].color }} />
          <span className="truncate font-mono text-xs">{r.fn}</span>
        </span>
      ),
    },
    { id: "base", header: `Self · ${base}`, align: "right", mono: true, sortValue: (r) => r.base, cell: (r) => `${r.base.toFixed(1)}%` },
    { id: "head", header: `Self · ${head}`, align: "right", mono: true, sortValue: (r) => r.head, cell: (r) => `${r.head.toFixed(1)}%` },
    {
      id: "delta",
      header: "Change",
      align: "right",
      description: "Difference in share of CPU samples spent in the function itself. Positive means slower in the newer version.",
      sortValue: (r) => delta(r),
      cell: (r) => {
        const d = delta(r);
        return <span className={cn("font-mono text-xs font-semibold", d > 0 ? "text-danger-text" : d < 0 ? "text-success" : "text-fg-muted")}>{d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)} pts</span>;
      },
    },
    {
      id: "bar",
      header: "Slower · faster",
      label: "Change bar",
      width: "180px",
      cell: (r) => {
        const d = delta(r);
        const w = (Math.abs(d) / maxAbs) * 50;
        return (
          <span aria-hidden className="relative block h-2 w-40 rounded-full bg-subtle">
            <span className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
            <span className={cn("absolute inset-y-0 rounded-full", d > 0 ? "bg-danger" : "bg-success")} style={d > 0 ? { left: "50%", width: `${w}%` } : { right: "50%", width: `${w}%` }} />
          </span>
        );
      },
    },
  ];
  return (
    <>
      <PageHeader
        title="Compare"
        description="Differential profile: where CPU time moved between two versions of orders-api"
        actions={<Button icon={<Share2 />}>Share comparison</Button>}
      />
      <Panel title="Versions" aria-label="Comparison setup">
        <div className="flex flex-wrap items-end gap-2.5">
          <SelectField label="Service" defaultValue="orders-api" className="w-44" options={SERVICES_LIST.map((s) => ({ value: s, label: s }))} />
          <SelectField label="Baseline" value={base} onChange={(e) => setBase(e.target.value)} className="w-44" options={VERSIONS} />
          <ArrowRight aria-hidden className="mb-2 size-4 text-fg-muted" />
          <SelectField label="Comparison" value={head} onChange={(e) => setHead(e.target.value)} className="w-44" options={VERSIONS} />
          <SelectField label="Profile type" defaultValue="cpu" className="w-36" options={[{ value: "cpu", label: "CPU" }, { value: "alloc", label: "Allocations" }]} />
        </div>
      </Panel>
      {same ? (
        <Panel>
          <EmptyState icon={<GitCompare />} title="Pick two different versions">
            Baseline and comparison are both {base}. Choose another version to see what changed.
          </EmptyState>
        </Panel>
      ) : (
        <>
          <KpiGrid>
            <KpiCard label="CPU per request" value="+22" unit="%" tone="danger" delta={{ label: `${base} 3.1 ms → ${head} 3.8 ms`, direction: "up", intent: "bad" }} />
            <KpiCard label="Biggest regression" value={<span className="font-mono text-base">P256Point.ScalarMult</span>} delta={{ label: "+1.8 pts · JWT verification", intent: "bad" }} />
            <KpiCard label="Biggest improvement" value={<span className="font-mono text-base">json.reflectValue</span>} delta={{ label: "-6.1 pts · pooled encoder", intent: "good" }} />
            <KpiCard label="Functions changed" value={String(DIFF.filter((r) => Math.abs(delta(r)) >= 0.5).length)} unit="by 0.5 pts or more" />
          </KpiGrid>
          <Callout tone="warning" title="JWT signature checks got slower in v2.14.1">
            authMiddleware now verifies ECDSA tokens on every request instead of using the 60 s cache. That accounts for most of the extra CPU.
          </Callout>
          <Panel
            title="Functions by change"
            description={`Self time, ${base} → ${head}`}
            actions={
              <SegmentedControl
                label="Show functions"
                value={show}
                onChange={setShow}
                options={[
                  { value: "all", label: "All" },
                  { value: "worse", label: "Regressions" },
                  { value: "better", label: "Improvements" },
                ]}
              />
            }
            flush
          >
            <DataTable label="Function changes" columns={cols} rows={rows} getRowId={(r) => r.id} defaultSort={{ id: "delta", direction: "desc" }} minWidth={860} />
          </Panel>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------- services */

interface Service {
  id: string;
  name: string;
  runtime: string;
  pods: number;
  cpu: number;
  mem: string;
  hottest: string;
  agent: string;
  state: "Collecting" | "Agent outdated" | "No data";
  types: Record<string, boolean>;
}

const SERVICES: Service[] = [
  { id: "orders-api", name: "orders-api", runtime: "Go 1.23.2", pods: 6, cpu: 1.84, mem: "412 MB", hottest: "encoding/json.(*encodeState).reflectValue", agent: "0.9.2", state: "Collecting", types: { cpu: true, alloc: true, heap: true, goroutines: true, mutex: false } },
  { id: "payments-api", name: "payments-api", runtime: "Java 21 · OpenJDK", pods: 4, cpu: 1.12, mem: "1.4 GB", hottest: "com.acme.payments.Ledger.post", agent: "0.9.2", state: "Collecting", types: { cpu: true, alloc: true, heap: true, goroutines: false, mutex: false } },
  { id: "inventory-api", name: "inventory-api", runtime: "Python 3.12", pods: 3, cpu: 0.61, mem: "288 MB", hottest: "inventory.sync.reconcile", agent: "0.8.4", state: "Agent outdated", types: { cpu: true, alloc: false, heap: false, goroutines: false, mutex: false } },
  { id: "reports-worker", name: "reports-worker", runtime: "Java 21 · OpenJDK", pods: 2, cpu: 0.42, mem: "2.1 GB", hottest: "com.acme.reports.CsvExporter.write", agent: "0.9.2", state: "Collecting", types: { cpu: true, alloc: true, heap: true, goroutines: false, mutex: false } },
  { id: "search-indexer", name: "search-indexer", runtime: "Rust 1.82", pods: 0, cpu: 0, mem: "—", hottest: "—", agent: "—", state: "No data", types: { cpu: false, alloc: false, heap: false, goroutines: false, mutex: false } },
];

const STATE_TONE: Record<Service["state"], "success" | "warning" | "neutral"> = { Collecting: "success", "Agent outdated": "warning", "No data": "neutral" };
const TYPE_LABELS: Record<string, string> = { cpu: "CPU", alloc: "Allocations", heap: "Heap", goroutines: "Goroutines", mutex: "Mutex contention" };

function ServicesPage() {
  const [list, setList] = useState(SERVICES);
  const [active, setActive] = useState("orders-api");
  const s = list.find((x) => x.id === active)!;
  const toggle = (k: string, v: boolean) => setList((all) => all.map((x) => (x.id === active ? { ...x, types: { ...x.types, [k]: v } } : x)));
  const cols: Column<Service>[] = [
    {
      id: "name",
      header: "Service",
      pinned: "left",
      sortValue: (x) => x.name,
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{x.name}</span>
          <span className="text-2xs text-fg-muted">{x.runtime}</span>
        </span>
      ),
    },
    { id: "state", header: "State", sortValue: (x) => x.state, cell: (x) => <StatusBadge tone={STATE_TONE[x.state]}>{x.state}</StatusBadge> },
    { id: "pods", header: "Pods", align: "right", mono: true, sortValue: (x) => x.pods, cell: (x) => x.pods },
    { id: "cpu", header: "CPU", align: "right", mono: true, description: "Average cores used across all pods in the last hour.", sortValue: (x) => x.cpu, cell: (x) => (x.cpu ? `${x.cpu.toFixed(2)} cores` : "—") },
    { id: "mem", header: "Heap in use", align: "right", mono: true, cell: (x) => x.mem },
    { id: "hottest", header: "Hottest function", cell: (x) => <span className="block max-w-[260px] truncate font-mono text-xs">{x.hottest}</span> },
    { id: "types", header: "Profile types", cell: (x) => <span className="text-xs">{Object.entries(x.types).filter(([, on]) => on).map(([k]) => TYPE_LABELS[k]).join(", ") || "None"}</span> },
    { id: "agent", header: "Agent", mono: true, description: "Version of the profiling agent running beside the service. Latest is 0.9.2.", cell: (x) => x.agent },
  ];
  return (
    <>
      <PageHeader
        title="Services"
        description="Services the eBPF agent profiles, and which profile types each one sends"
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add service
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Profiled services" value="4" unit="of 5" />
        <KpiCard label="Pods" value="15" delta={{ label: "All on agent 0.9.x but 3" }} />
        <KpiCard label="Total CPU" value="3.99" unit="cores" trend={wave(20, { base: 3.8, amp: 0.3, seed: 330, spike: 0.6, spikeAt: 12 })} />
        <KpiCard label="Outdated agents" value="1" tone="warning" delta={{ label: "inventory-api on 0.8.4", intent: "bad" }} />
      </KpiGrid>
      <Panel title="Services" flush>
        <DataTable label="Profiled services" columns={cols} rows={list} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} minWidth={1060} />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel aria-label="Service detail" title={s.name} description={`${s.runtime} · ${s.pods} pods · agent ${s.agent}`}>
          {s.state === "No data" ? (
            <EmptyState icon={<Boxes />} title="No profiles yet" action={<Button size="sm">Show install steps</Button>}>
              Deploy the agent as a DaemonSet on the nodes that run {s.name}.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-2.5">
              {s.state === "Agent outdated" && (
                <Callout tone="warning" title="Agent 0.8.4 is out of date">
                  Upgrade to 0.9.2 for allocation and heap profiles on Python.
                </Callout>
              )}
              <TimeSeriesChart
                label={`CPU cores for ${s.name}`}
                labels={timeLabels(30, 2)}
                height={150}
                format={(v) => `${v.toFixed(2)} cores`}
                series={[{ id: "cpu", name: "CPU cores", data: wave(30, { base: s.cpu, amp: s.cpu * 0.15, seed: 340 + s.pods }) }]}
              />
            </div>
          )}
        </Panel>
        <Panel title="Collection" description="Changes apply to new pods within a minute">
          <div className="flex flex-col gap-2.5">
            {Object.keys(TYPE_LABELS).map((k) => (
              <Switch key={k} checked={s.types[k] ?? false} onCheckedChange={(v) => toggle(k, v)} label={TYPE_LABELS[k]!} disabled={s.state === "No data"} />
            ))}
            <SelectField label="CPU sampling rate" defaultValue="100" options={[{ value: "19", label: "19 Hz · lowest overhead" }, { value: "100", label: "100 Hz · default" }, { value: "250", label: "250 Hz · detailed" }]} />
          </div>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  profiles: () => <ProfilesPage />,
  flame: () => <FlameGraphPage />,
  compare: () => <ComparePage />,
  services: () => <ServicesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="profiling" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

export const Profiles: Story = {
  ...app("profiles"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Profiles" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Capture profile" }));
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Service" }), "payments-api");
    await userEvent.click(c.getByRole("button", { name: "Start capture" }));
    const detail = within(c.getByRole("region", { name: "Profile detail" }));
    await expect(detail.getByRole("heading", { name: "payments-api · CPU" })).toBeInTheDocument();
    await expect(detail.getByText("Capturing…")).toBeInTheDocument();
    await expect(detail.getByRole("button", { name: "Open flame graph" })).toBeDisabled();
  },
};

/** Flame graph: CPU profile of orders-api; hover a frame for its numbers, click to zoom in. */
export const FlameGraph: Story = {
  name: "Flame graphs",
  ...app("flame"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Flame graphs" })).toBeInTheDocument();
    const info = c.getByTestId("frame-info");
    await expect(info).toHaveTextContent("all");

    const frame = c.getByRole("button", { name: "orders/store.(*Store).CreateOrder" });
    await userEvent.hover(frame);
    await expect(info).toHaveTextContent("orders/store.(*Store).CreateOrder");
    await expect(info).toHaveTextContent("total 36.0%");

    await userEvent.click(frame);
    const crumbs = within(c.getByRole("navigation", { name: "Zoom path" }));
    await expect(crumbs.getByText("orders/store.(*Store).CreateOrder")).toHaveAttribute("aria-current", "page");
    await expect(crumbs.getByRole("button", { name: "orders/api.(*Handler).CreateOrder" })).toBeInTheDocument();
    // Frames outside the zoomed subtree are gone.
    await expect(c.queryByRole("button", { name: "runtime.gcBgMarkWorker" })).not.toBeInTheDocument();

    await userEvent.click(crumbs.getByRole("button", { name: "Reset zoom" }));
    await expect(c.getByRole("button", { name: "runtime.gcBgMarkWorker" })).toBeInTheDocument();
  },
};

export const Compare: Story = {
  ...app("compare"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = () => within(c.getByRole("table", { name: "Function changes" }));
    await expect(table().getByText("encoding/json.(*encodeState).reflectValue")).toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "Regressions" }));
    await expect(table().getByText("crypto/internal/nistec.(*P256Point).ScalarMult")).toBeInTheDocument();
    await expect(table().queryByText("encoding/json.(*encodeState).reflectValue")).not.toBeInTheDocument();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Baseline" }), "v2.14.1");
    await expect(c.getByText("Pick two different versions")).toBeInTheDocument();
  },
};

export const Services: Story = {
  ...app("services"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Profiled services" })).getByText("inventory-api"));
    await expect(within(c.getByRole("region", { name: "Service detail" })).getByText("Agent 0.8.4 is out of date")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Heap" }));
    await expect(c.getByRole("switch", { name: "Heap" })).toHaveAttribute("aria-checked", "true");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
