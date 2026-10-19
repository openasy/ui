import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Biohazard, Boxes, Bug, ChartLine, Cpu, LayoutGrid, Network, Plus, ScrollText, Server, Ship, Square, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { Sparkline } from "../../charts/Sparkline";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { formatBytes } from "../../lib/format";
import type { Tone } from "../../tokens/levels";
import { HOSTS, rng, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "hosts", label: "Hosts", icon: Server, count: 48 },
  { id: "containers", label: "Containers", icon: Boxes, count: 312 },
  { id: "kubernetes", label: "Kubernetes", icon: Ship, count: 2 },
  { id: "processes", label: "Processes", icon: Cpu },
  { id: "network", label: "Network map", icon: Network },
];

const meta = {
  title: "Products/Infrastructure",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type HostState = "running" | "degraded" | "unreachable";

interface Host {
  id: string;
  name: string;
  os: string;
  role: string;
  ip: string;
  state: HostState;
  cpu: number;
  mem: number;
  containers: number;
  cves: { critical: number; high: number };
  malware: number;
  uptime: string;
}

const ROLES = ["api", "worker", "db", "edge", "cache", "ci-runner"] as const;
const OS = ["Ubuntu 24.04", "Ubuntu 22.04", "Debian 12", "Rocky Linux 9"] as const;

const hosts: Host[] = (() => {
  const r = rng(42);
  const extra = Array.from({ length: 48 - HOSTS.length }, (_, i) => {
    const role = ROLES[i % ROLES.length]!;
    return `${role}-prod-${String(10 + i).padStart(2, "0")}`;
  });
  return [...HOSTS, ...extra].map((name, i) => {
    const role = name.split("-")[0]!;
    const hot = name === "api-prod-03";
    const cpu = hot ? 97 : name === "db-prod-01" ? 88 : Math.round(8 + r() * 68);
    const mem = hot ? 81 : Math.round(22 + r() * 58);
    const state: HostState = name === "edge-fra-02" ? "unreachable" : cpu >= 85 ? "degraded" : "running";
    return {
      id: `h${i}`,
      name,
      os: OS[i % OS.length]!,
      role: role === "ci" ? "ci-runner" : role,
      ip: `192.0.2.${10 + i * 3}`,
      state,
      cpu: state === "unreachable" ? 0 : cpu,
      mem: state === "unreachable" ? 0 : mem,
      containers: role === "db" ? 2 : role === "edge" ? 4 : Math.round(3 + r() * 11),
      cves: hot
        ? { critical: 2, high: 5 }
        : { critical: r() > 0.88 ? 1 : 0, high: r() > 0.6 ? Math.round(1 + r() * 4) : 0 },
      malware: hot ? 1 : 0,
      uptime: `${Math.round(2 + r() * 60)} d`,
    };
  });
})();

const STATE_META: Record<HostState, { tone: Tone; label: string; dot: string }> = {
  running: { tone: "success", label: "Running", dot: "bg-success" },
  degraded: { tone: "warning", label: "Degraded", dot: "bg-warning" },
  unreachable: { tone: "danger", label: "Unreachable", dot: "bg-danger" },
};

/** CPU to the sequential ramp, with warning reserved for >= 85 %. */
function cpuColor(cpu: number): string {
  if (cpu >= 85) return "var(--oa-warning)";
  if (cpu >= 70) return "var(--oa-seq-5)";
  if (cpu >= 55) return "var(--oa-seq-4)";
  if (cpu >= 40) return "var(--oa-seq-3)";
  if (cpu >= 20) return "var(--oa-seq-2)";
  return "var(--oa-seq-1)";
}

interface Container {
  id: string;
  name: string;
  image: string;
  host: string;
  state: "running" | "restarting" | "exited";
  cpu: number;
  mem: number;
  restarts: number;
  age: string;
}

const IMAGES = [
  "ghcr.io/acme/orders-api:2.14.1",
  "ghcr.io/acme/billing-worker:1.9.0",
  "postgres:16.4",
  "redis:7.4-alpine",
  "nginx:1.27",
  "otel/opentelemetry-collector:0.110.0",
  "openasy/agent:3.2.0",
];

const containers: Container[] = (() => {
  const r = rng(7);
  return Array.from({ length: 40 }, (_, i) => {
    const host = hosts[i % 12]!;
    const image = IMAGES[i % IMAGES.length]!;
    const base = image.split("/").pop()!.split(":")[0]!;
    const miner = host.name === "api-prod-03" && i === 1;
    return {
      id: `c${i}`,
      name: miner ? "kworkerd" : `${base}-${(0x3a1f + i * 977).toString(16)}`,
      image: miner ? "docker.io/library/alpine:3.20" : image,
      host: host.name,
      state: miner ? "running" : i % 17 === 5 ? "restarting" : i % 23 === 9 ? "exited" : "running",
      cpu: miner ? 312 : Math.round(r() * 90),
      mem: Math.round((64 + r() * 1800) * 1024 * 1024),
      restarts: i % 17 === 5 ? 14 : Math.round(r() * 1.4),
      age: `${Math.round(1 + r() * 30)} d`,
    } satisfies Container;
  });
})();

interface K8sRow {
  id: string;
  cluster: string;
  node: string;
  pods: number;
  podsMax: number;
  cpu: number;
  mem: number;
  version: string;
  ready: boolean;
}

const k8sRows: K8sRow[] = ["prod-lon", "prod-fra"].flatMap((cluster, ci) =>
  Array.from({ length: ci === 0 ? 6 : 4 }, (_, i) => ({
    id: `${cluster}-${i}`,
    cluster,
    node: `${cluster}-node-${String(i + 1).padStart(2, "0")}`,
    pods: [38, 41, 29, 46, 12, 33][i] ?? 20,
    podsMax: 110,
    cpu: [44, 61, 37, 86, 18, 52][i] ?? 40,
    mem: [58, 71, 49, 79, 30, 64][i] ?? 50,
    version: ci === 0 ? "v1.31.2" : "v1.30.6",
    ready: !(ci === 1 && i === 3),
  })),
);

/* ------------------------------------------------------------ fragments */

function UsageBar({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-center gap-2" title={`${label} ${value}%`}>
      <span aria-hidden className="h-1.5 w-16 overflow-hidden rounded-full bg-subtle">
        <span className="block h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: cpuColor(value) }} />
      </span>
      <span className={cn("w-9 text-right font-mono text-xs tabular-nums", value >= 85 ? "font-semibold text-warning-text" : "text-fg")}>
        {value}%
      </span>
    </span>
  );
}

function StateDot({ state }: { state: HostState }) {
  const m = STATE_META[state];
  return (
    <span className="inline-flex items-center" title={m.label}>
      <span aria-hidden className={cn("size-2 rounded-full", m.dot)} />
      <span className="sr-only">{m.label}</span>
    </span>
  );
}

function Findings({ h }: { h: Host }) {
  const total = h.cves.critical + h.cves.high;
  if (!total && !h.malware) return <span className="text-xs text-fg-muted">None</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {total > 0 && (
        <a
          href={`#vulnerabilities?host=${h.name}`}
          onClick={(e) => e.stopPropagation()}
          className="no-underline"
        >
          <Badge tone={h.cves.critical ? "danger" : "warning"} icon={<Bug aria-hidden className="size-3" />}>
            {total} CVE{total > 1 ? "s" : ""}
            <span className="sr-only"> on {h.name}, open in Vulnerabilities</span>
          </Badge>
        </a>
      )}
      {h.malware > 0 && (
        <a
          href={`#malware?host=${h.name}`}
          onClick={(e) => e.stopPropagation()}
          className="no-underline"
        >
          <Badge tone="critical" icon={<Biohazard aria-hidden className="size-3" />}>
            Malware
            <span className="sr-only"> on {h.name}, open in Malware</span>
          </Badge>
        </a>
      )}
    </span>
  );
}

function hostColumns(onOpen: (h: Host) => void): Column<Host>[] {
  return [
    { id: "state", header: <span className="sr-only">Status</span>, width: "32px", sortValue: (h) => h.state, cell: (h) => <StateDot state={h.state} /> },
    {
      id: "name",
      header: "Host",
      width: "24%",
      sortValue: (h) => h.name,
      cell: (h) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" onClick={(e) => (e.stopPropagation(), onOpen(h))} className="truncate text-left font-mono text-xs font-medium text-fg hover:underline">
            {h.name}
          </button>
          <span className="truncate text-2xs text-fg-muted">
            {h.os} · {h.ip}
          </span>
        </span>
      ),
    },
    { id: "role", header: "Role", sortValue: (h) => h.role, cell: (h) => <Badge mono>{h.role}</Badge> },
    { id: "cpu", header: "CPU", sortValue: (h) => h.cpu, cell: (h) => (h.state === "unreachable" ? <span className="text-xs text-fg-muted">No data</span> : <UsageBar label="CPU" value={h.cpu} />) },
    { id: "mem", header: "Memory", sortValue: (h) => h.mem, cell: (h) => (h.state === "unreachable" ? <span className="text-xs text-fg-muted">No data</span> : <UsageBar label="Memory" value={h.mem} />) },
    { id: "containers", header: "Containers", align: "right", mono: true, sortValue: (h) => h.containers, cell: (h) => h.containers },
    { id: "findings", header: "Findings", sortValue: (h) => h.cves.critical * 100 + h.cves.high + h.malware * 1000, cell: (h) => <Findings h={h} /> },
  ];
}

const containerColumns: Column<Container>[] = [
  {
    id: "name",
    header: "Container",
    width: "26%",
    sortValue: (c) => c.name,
    cell: (c) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-xs font-medium">{c.name}</span>
        <span className="truncate font-mono text-2xs text-fg-muted">{c.image}</span>
      </span>
    ),
  },
  { id: "host", header: "Host", sortValue: (c) => c.host, cell: (c) => <EntityChip kind="host" value={c.host} hideKind href={`#host/${c.host}`} /> },
  {
    id: "state",
    header: "State",
    sortValue: (c) => c.state,
    cell: (c) => (
      <StatusBadge tone={c.state === "running" ? "success" : c.state === "restarting" ? "warning" : "neutral"}>
        {c.state === "running" ? "Running" : c.state === "restarting" ? "Restarting" : "Exited"}
      </StatusBadge>
    ),
  },
  { id: "cpu", header: "CPU", align: "right", mono: true, sortValue: (c) => c.cpu, cell: (c) => `${c.cpu}%` },
  { id: "mem", header: "Memory", align: "right", mono: true, sortValue: (c) => c.mem, cell: (c) => `${Math.round(c.mem / 1024 / 1024)} MB` },
  { id: "restarts", header: "Restarts", align: "right", mono: true, sortValue: (c) => c.restarts, cell: (c) => c.restarts },
  { id: "age", header: "Age", align: "right", mono: true, cell: (c) => c.age },
];

const k8sColumns: Column<K8sRow>[] = [
  { id: "cluster", header: "Cluster", sortValue: (k) => k.cluster, cell: (k) => <Badge mono>{k.cluster}</Badge> },
  { id: "node", header: "Node", width: "26%", sortValue: (k) => k.node, cell: (k) => <span className="font-mono text-xs font-medium">{k.node}</span> },
  {
    id: "ready",
    header: "Status",
    sortValue: (k) => (k.ready ? 1 : 0),
    cell: (k) => <StatusBadge tone={k.ready ? "success" : "danger"}>{k.ready ? "Ready" : "NotReady"}</StatusBadge>,
  },
  { id: "pods", header: "Pods", align: "right", mono: true, sortValue: (k) => k.pods, cell: (k) => `${k.pods} / ${k.podsMax}` },
  { id: "cpu", header: "CPU", sortValue: (k) => k.cpu, cell: (k) => <UsageBar label="CPU" value={k.cpu} /> },
  { id: "mem", header: "Memory", sortValue: (k) => k.mem, cell: (k) => <UsageBar label="Memory" value={k.mem} /> },
  { id: "version", header: "Kubelet", mono: true, cell: (k) => k.version },
];

/** One square per host, coloured by CPU; hover or focus shows a preview card. */
function HostMap({ items, onOpen, activeId }: { items: Host[]; onOpen: (h: Host) => void; activeId?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <ul aria-label="Host map" className="flex flex-wrap gap-1">
        {items.map((h) => {
          const shown = hover === h.id;
          const tipId = `hostmap-tip-${h.id}`;
          return (
            <li key={h.id} className="relative">
              <button
                type="button"
                aria-label={`${h.name}, CPU ${h.cpu}%`}
                aria-describedby={shown ? tipId : undefined}
                aria-pressed={activeId === h.id}
                onPointerEnter={() => setHover(h.id)}
                onPointerLeave={() => setHover((v) => (v === h.id ? null : v))}
                onFocus={() => setHover(h.id)}
                onBlur={() => setHover((v) => (v === h.id ? null : v))}
                onClick={() => onOpen(h)}
                data-testid="host-tile"
                className={cn(
                  "block size-5 rounded-[3px] border border-transparent hover:border-fg",
                  h.state === "unreachable" && "border-danger bg-surface",
                  activeId === h.id && "ring-2 ring-fg ring-offset-1 ring-offset-surface",
                )}
                style={h.state === "unreachable" ? undefined : { background: cpuColor(h.cpu) }}
              />
              {shown && (
                <div
                  id={tipId}
                  role="tooltip"
                  className="pointer-events-none absolute top-full left-1/2 z-20 mt-1.5 flex w-48 -translate-x-1/2 flex-col gap-1 rounded-md border border-line bg-surface px-2.5 py-2 shadow-overlay"
                >
                  <span className="flex items-center gap-1.5">
                    <StateDot state={h.state} />
                    <span className="truncate font-mono text-xs font-semibold text-fg">{h.name}</span>
                  </span>
                  <span className="text-2xs text-fg-muted">
                    {h.role} · {h.os}
                  </span>
                  <dl className="grid grid-cols-3 gap-1 text-2xs">
                    {[
                      ["CPU", h.state === "unreachable" ? "–" : `${h.cpu}%`],
                      ["Mem", h.state === "unreachable" ? "–" : `${h.mem}%`],
                      ["Containers", String(h.containers)],
                    ].map(([k, v]) => (
                      <div key={k} className="flex flex-col">
                        <dt className="text-fg-muted">{k}</dt>
                        <dd className="font-mono text-xs font-semibold text-fg">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div aria-hidden className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-2xs text-fg-muted">
        <span className="flex items-center gap-1">
          CPU 0%
          {[1, 2, 3, 4, 5].map((k) => (
            <span key={k} className="h-2.5 w-3.5 rounded-[2px]" style={{ background: `var(--oa-seq-${k})` }} />
          ))}
          85%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-3.5 rounded-[2px] bg-warning" />≥ 85%
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2.5 w-3.5 rounded-[2px] border border-danger bg-surface" />
          unreachable
        </span>
      </div>
    </div>
  );
}

const OPEN_IN = [
  { id: "logs", label: "Logs", icon: ScrollText },
  { id: "metrics", label: "Metrics", icon: ChartLine },
  { id: "vulnerabilities", label: "Vulnerabilities", icon: Bug },
] as const;

function HostDetail({ host, onClose }: { host: Host; onClose: () => void }) {
  const seed = Number(host.id.slice(1)) + 3;
  const hot = host.name === "api-prod-03";
  const cpuTrend = wave(30, { base: hot ? 40 : host.cpu * 0.85, amp: 6, seed, spike: hot ? 55 : 0, spikeAt: 18, min: 0 }).map((v) => Math.min(100, v));
  const memTrend = wave(30, { base: host.mem * 0.92, amp: 3, seed: seed + 1, spike: hot ? 14 : 0, spikeAt: 20 }).map((v) => Math.min(100, v));
  const own = containers.filter((c) => c.host === host.name);
  return (
    <Panel
      title={host.name}
      description={`${host.role} · ${host.os} · up ${host.uptime}`}
      aria-label={`Host ${host.name}`}
      actions={
        <IconButton label="Close host details" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      }
      className="xl:sticky xl:top-3 xl:self-start"
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={STATE_META[host.state].tone}>{STATE_META[host.state].label}</StatusBadge>
          <EntityChip kind="host" value={host.name} />
          <EntityChip kind="ip" value={host.ip} hideKind />
        </div>
        {hot && (
          <Callout tone="critical" title="Malware on this host">
            YARA rule <span className="font-mono">XMRig_Miner</span> matched /tmp/.x/kworkerd. Incident INC-142 is open.
          </Callout>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { k: "CPU · 30 min", v: host.cpu, data: cpuTrend, color: host.cpu >= 85 ? "var(--oa-warning)" : "var(--oa-accent)" },
            { k: "Memory · 30 min", v: host.mem, data: memTrend, color: "var(--oa-chart-3)" },
          ].map((m) => (
            <div key={m.k} className="flex flex-col gap-1 rounded-md border border-line px-2 py-1.5">
              <span className="flex items-baseline justify-between">
                <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{m.k}</span>
                <span className="font-mono text-sm font-semibold tabular-nums">{host.state === "unreachable" ? "–" : `${m.v}%`}</span>
              </span>
              <Sparkline data={m.data} label={`${m.k} on ${host.name}`} height={32} color={m.color} format={(v) => `${Math.round(v)}%`} />
            </div>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-fg">Containers · {own.length || host.containers}</h3>
          <ul className="flex flex-col">
            {(own.length ? own : containers.slice(0, 3)).map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle py-1 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-mono text-xs">{c.name}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">{c.image}</span>
                </span>
                <span className={cn("font-mono text-xs tabular-nums", c.cpu >= 85 ? "font-semibold text-warning-text" : "text-fg-muted")}>{c.cpu}% CPU</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-fg">Findings</h3>
          <Findings h={host} />
        </div>
        <div className="flex flex-col gap-1">
          <h3 className="text-xs font-semibold text-fg">Open in</h3>
          <div className="flex flex-wrap gap-1.5">
            {OPEN_IN.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}?host=${host.name}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle"
              >
                <p.icon aria-hidden className="size-3.5 text-fg-muted" />
                {p.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- stories */

type View = "hosts" | "containers" | "kubernetes";

/** Hosts: a CPU host map, a table that switches between hosts, containers and nodes, and a host side panel. */
function HostsPage() {
  const [view, setView] = useState<View>("hosts");
  const [range, setRange] = useState("1h");
  const [roles, setRoles] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [activeId, setActiveId] = useState<string | undefined>(undefined);
  const filtered = hosts.filter((h) => (roles.length === 0 || roles.includes(h.role)) && h.name.includes(q.trim().toLowerCase()));
  const active = hosts.find((h) => h.id === activeId);
  const open = (h: Host) => {
    setView("hosts");
    setActiveId(h.id);
  };
  const hot = hosts.filter((h) => h.cpu >= 85).length;
  return (
    <>
      <PageHeader
        title="Hosts"
        description="48 hosts · 312 containers · 2 Kubernetes clusters · agent 3.2"
        meta={<StatusBadge tone="warning">{hot} hosts over 85% CPU</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search hosts" shortcut="/" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button size="md" variant="primary" icon={<Plus />}>
              Install agent
            </Button>
          </>
        }
      />
      <FilterBar onClear={roles.length ? () => setRoles([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Role"
          selected={roles}
          onChange={setRoles}
          options={ROLES.map((r) => ({ value: r, count: hosts.filter((h) => h.role === r).length }))}
        />
        <SegmentedControl<View>
          label="Inventory view"
          value={view}
          onChange={setView}
          options={[
            { value: "hosts", label: "Hosts" },
            { value: "containers", label: "Containers" },
            { value: "kubernetes", label: "Kubernetes" },
          ]}
          className="ml-auto"
        />
      </FilterBar>
      <KpiGrid minWidth={170}>
        <KpiCard label="Hosts reporting" value="47" unit="of 48" delta={{ label: "edge-fra-02 silent 14 m", intent: "bad" }} />
        <KpiCard label="Avg CPU" value="41" unit="%" trend={wave(24, { base: 38, amp: 6, seed: 2, spike: 8 })} delta={{ label: "+6 pts in 1 h", direction: "up", intent: "bad" }} />
        <KpiCard label="Avg memory" value="57" unit="%" trend={wave(24, { base: 55, amp: 3, seed: 3 })} delta={{ label: "flat", direction: "flat" }} />
        <KpiCard label="Containers" value="312" unit="9 restarting" delta={{ label: "+14 since deploy", direction: "up" }} />
        <KpiCard label="Hosts with findings" value="19" tone="danger" unit="2 critical" delta={{ label: "1 malware", intent: "bad" }} />
      </KpiGrid>
      <div className={cn("grid gap-2.5", active && "xl:grid-cols-[minmax(0,1fr)_360px]")}>
        <div className="flex min-w-0 flex-col gap-2.5">
          <div className="grid gap-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Panel title="Host map" description="One square per host, coloured by CPU">
              <HostMap items={filtered} onOpen={open} activeId={activeId} />
            </Panel>
            <Panel title="Hottest hosts · CPU">
              <BarList
                label="Hosts with the highest CPU"
                max={100}
                format={(v) => `${v}%`}
                items={[...hosts]
                  .sort((a, b) => b.cpu - a.cpu)
                  .slice(0, 6)
                  .map((h) => ({ id: h.id, label: h.name, value: h.cpu, color: cpuColor(h.cpu) }))}
              />
            </Panel>
          </div>
          {view === "hosts" && (
            <Panel title="Hosts" description={`${filtered.length} of ${hosts.length}`} flush>
              <DataTable
                label="Hosts"
                columns={hostColumns(open)}
                rows={filtered}
                getRowId={(h) => h.id}
                onRowClick={open}
                activeRowId={activeId}
                defaultSort={{ id: "cpu", direction: "desc" }}
                pageSize={10}
                minWidth={820}
              />
            </Panel>
          )}
          {view === "containers" && (
            <Panel title="Containers" description="312 running across 47 hosts" flush>
              <DataTable label="Containers" columns={containerColumns} rows={containers} getRowId={(c) => c.id} defaultSort={{ id: "cpu", direction: "desc" }} pageSize={10} minWidth={820} />
            </Panel>
          )}
          {view === "kubernetes" && (
            <Panel title="Kubernetes nodes" description="prod-lon (6 nodes) · prod-fra (4 nodes)" flush>
              <DataTable label="Kubernetes nodes" columns={k8sColumns} rows={k8sRows} getRowId={(k) => k.id} minWidth={820} />
            </Panel>
          )}
        </div>
        {active && <HostDetail host={active} onClose={() => setActiveId(undefined)} />}
      </div>
    </>
  );
  
}

/** Kubernetes: clusters, then nodes with pod capacity. */
function KubernetesPage() {
  const [cluster, setCluster] = useState<"all" | "prod-lon" | "prod-fra">("all");
  const rows = k8sRows.filter((k) => cluster === "all" || k.cluster === cluster);
  return (
    <>
      <PageHeader
        title="Kubernetes"
        description="2 clusters · 10 nodes · 312 pods"
        meta={<StatusBadge tone="warning">1 node NotReady</StatusBadge>}
        actions={<Button icon={<Plus />}>Connect cluster</Button>}
      />
      <KpiGrid minWidth={220}>
        {[
          { id: "prod-lon", nodes: 6, pods: 199, ver: "v1.31.2", tone: "success" as Tone, state: "Healthy", region: "London" },
          { id: "prod-fra", nodes: 4, pods: 113, ver: "v1.30.6", tone: "warning" as Tone, state: "Degraded", region: "Frankfurt" },
        ].map((k) => (
          <KpiCard
            key={k.id}
            label={`${k.id} · ${k.region}`}
            value={k.pods}
            unit={`pods on ${k.nodes} nodes`}
            footer={
              <span className="flex items-center gap-1.5">
                <StatusBadge tone={k.tone}>{k.state}</StatusBadge>
                <Badge mono>{k.ver}</Badge>
              </span>
            }
          />
        ))}
      </KpiGrid>
      <Panel
        title="Nodes"
        flush
        actions={
          <SegmentedControl
            label="Cluster"
            value={cluster}
            onChange={setCluster}
            options={[
              { value: "all", label: "All" },
              { value: "prod-lon", label: "prod-lon" },
              { value: "prod-fra", label: "prod-fra" },
            ]}
          />
        }
      >
        <DataTable label="Kubernetes nodes" columns={k8sColumns} rows={rows} getRowId={(k) => k.id} defaultSort={{ id: "cpu", direction: "desc" }} minWidth={760} />
      </Panel>
    </>
  );
  
}

/* ---------------------------------------------------------------- overview */

function OverviewPage() {
  const [range, setRange] = useState("1h");
  const byRole = ROLES.map((r) => ({ id: r, label: r, value: hosts.filter((h) => h.role === r).length }));
  const byState = (["running", "degraded", "unreachable"] as const).map((s) => ({ id: s, label: STATE_META[s].label, value: hosts.filter((h) => h.state === s).length, color: `var(--oa-${STATE_META[s].tone})` }));
  const top = [...hosts].sort((a, b) => b.cpu - a.cpu).slice(0, 6);
  const cols: Column<Host>[] = [
    { id: "name", header: "Host", cell: (h) => <EntityChip kind="host" value={h.name} hideKind /> },
    { id: "role", header: "Role", cell: (h) => <Badge mono>{h.role}</Badge> },
    { id: "cpu", header: "CPU", cell: (h) => <UsageBar label="CPU" value={h.cpu} /> },
    { id: "mem", header: "Memory", cell: (h) => <UsageBar label="Memory" value={h.mem} /> },
    { id: "trend", header: "CPU · 1 h", width: "130px", cell: (h) => <Sparkline data={wave(30, { base: h.cpu, amp: 6, seed: Number(h.id.slice(1)) + 3 })} label={`CPU trend for ${h.name}`} height={22} /> },
  ];
  return (
    <>
      <PageHeader title="Overview" description="48 hosts in 3 sites · agent 3.2 on all of them · shared asset list for every other product" />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
      </FilterBar>
      <Callout tone="danger" title="api-prod-03 is at 97% CPU with a malware finding">
        Malware quarantined a crypto miner at 02:19, but CPU is still high. INC-142 is open.
      </Callout>
      <KpiGrid>
        <KpiCard label="Hosts" value="48" unit={`${hosts.filter((h) => h.state === "running").length} running`} />
        <KpiCard label="Containers" value="312" unit="running" delta={{ label: "3 restarting" }} />
        <KpiCard label="Avg. CPU" value={`${Math.round(hosts.reduce((s, h) => s + h.cpu, 0) / hosts.length)}`} unit="%" trend={wave(30, { base: 42, amp: 6, seed: 31 })} />
        <KpiCard label="Unreachable" value={`${hosts.filter((h) => h.state === "unreachable").length}`} tone="danger" delta={{ label: "edge-fra-02 since 11:20", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="By role">
          <BarList label="Hosts by role" items={byRole} />
        </Panel>
        <Panel title="By state">
          <BarList label="Hosts by state" items={byState} />
        </Panel>
        <Panel title="Findings on hosts" description="From Vulnerabilities and Malware">
          <BarList
            label="Findings on hosts"
            items={[
              { id: "crit", label: "Critical CVEs", value: hosts.reduce((s, h) => s + h.cves.critical, 0), color: "var(--oa-critical)" },
              { id: "high", label: "High CVEs", value: hosts.reduce((s, h) => s + h.cves.high, 0), color: "var(--oa-danger)" },
              { id: "mal", label: "Malware", value: hosts.reduce((s, h) => s + h.malware, 0), color: "var(--oa-danger)" },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Busiest hosts" description="By CPU, now" flush>
        <DataTable label="Busiest hosts" columns={cols} rows={top} getRowId={(h) => h.id} minWidth={720} />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- containers */

function ContainersPage() {
  const [state, setState] = useState<string[]>([]);
  const [image, setImage] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [items, setItems] = useState(containers);
  const rows = items.filter((c) => (state.length === 0 || state.includes(c.state)) && (image.length === 0 || image.includes(c.image)) && (!q || `${c.name} ${c.host}`.includes(q.toLowerCase())));
  const cols: Column<Container>[] = [
    ...containerColumns,
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      width: "44px",
      hideable: false,
      cell: (c) =>
        c.state === "running" ? (
          <IconButton label={`Stop ${c.name}`} size="xs" onClick={() => setItems((all) => all.map((x) => (x.id === c.id ? { ...x, state: "exited" } : x)))}>
            <Square />
          </IconButton>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Containers" description="312 containers on 48 hosts, from the Docker and containerd APIs. 40 shown." actions={<SearchInput label="Search containers" value={q} onChange={(e) => setQ(e.target.value)} className="w-60" />} />
      <Callout tone="danger" title="kworkerd on api-prod-03 uses 312% CPU from an unpinned alpine image">
        Not part of any deployment. Runtime and Malware both flagged it.
      </Callout>
      <FilterBar onClear={state.length || image.length ? () => (setState([]), setImage([])) : undefined}>
        <FacetFilter label="State" selected={state} onChange={setState} options={(["running", "restarting", "exited"] as const).map((s) => ({ value: s, count: items.filter((c) => c.state === s).length }))} />
        <FacetFilter label="Image" selected={image} onChange={setImage} searchable options={[...new Set(items.map((c) => c.image))].map((i) => ({ value: i, count: items.filter((c) => c.image === i).length }))} />
      </FilterBar>
      <Panel title="Containers" description={`${rows.length} shown`} flush>
        <DataTable label="Containers" columns={cols} rows={rows} getRowId={(c) => c.id} defaultSort={{ id: "cpu", direction: "desc" }} pageSize={15} minWidth={880} empty={<p className="py-8">No containers match</p>} />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- processes */

interface HostProc {
  pid: number;
  name: string;
  cmd: string;
  user: string;
  cpu: number;
  memMb: number;
  threads: number;
}

const HOST_PROCS: Record<string, HostProc[]> = {
  "api-prod-03": [
    { pid: 30121, name: "kworkerd", cmd: "/tmp/.x/kworkerd -o 198.51.100.201:3333", user: "www-data", cpu: 312, memMb: 210, threads: 8 },
    { pid: 1012, name: "gunicorn", cmd: "gunicorn payments.wsgi -w 4", user: "app", cpu: 41, memMb: 840, threads: 12 },
    { pid: 1013, name: "gunicorn", cmd: "gunicorn payments.wsgi -w 4 (worker)", user: "app", cpu: 18, memMb: 412, threads: 4 },
    { pid: 702, name: "containerd", cmd: "/usr/bin/containerd", user: "root", cpu: 2.1, memMb: 96, threads: 22 },
    { pid: 990, name: "openasy-agent", cmd: "/opt/openasy/agent --config /etc/openasy/agent.yaml", user: "root", cpu: 1.2, memMb: 74, threads: 9 },
    { pid: 1188, name: "sshd", cmd: "/usr/sbin/sshd -D", user: "root", cpu: 0, memMb: 6, threads: 1 },
  ],
  "db-prod-01": [
    { pid: 2201, name: "postgres", cmd: "postgres: walwriter", user: "postgres", cpu: 9.4, memMb: 180, threads: 1 },
    { pid: 2198, name: "postgres", cmd: "postgres: checkpointer", user: "postgres", cpu: 6.2, memMb: 4100, threads: 1 },
    { pid: 48302, name: "postgres", cmd: "postgres: orders_app orders 10.20.4.32 UPDATE waiting", user: "postgres", cpu: 0.1, memMb: 22, threads: 1 },
    { pid: 990, name: "openasy-agent", cmd: "/opt/openasy/agent --config /etc/openasy/agent.yaml", user: "root", cpu: 1.0, memMb: 70, threads: 9 },
    { pid: 812, name: "sshd", cmd: "/usr/sbin/sshd -D", user: "root", cpu: 0, memMb: 6, threads: 1 },
  ],
};

function ProcessesPage() {
  const [host, setHost] = useState("api-prod-03");
  const procs = HOST_PROCS[host] ?? [];
  const cols: Column<HostProc>[] = [
    { id: "pid", header: "PID", mono: true, align: "right", width: "70px", cell: (p) => p.pid },
    { id: "name", header: "Name", mono: true, cell: (p) => p.name },
    { id: "cmd", header: "Command", width: "40%", cell: (p) => <span className="block truncate font-mono text-xs" title={p.cmd}>{p.cmd}</span> },
    { id: "user", header: "User", mono: true, cell: (p) => p.user },
    { id: "cpu", header: "CPU %", align: "right", mono: true, sortValue: (p) => p.cpu, cell: (p) => <span className={p.cpu > 100 ? "text-danger-text" : undefined}>{p.cpu.toFixed(1)}</span> },
    { id: "mem", header: "Memory", align: "right", mono: true, sortValue: (p) => p.memMb, cell: (p) => `${p.memMb} MB` },
    { id: "threads", header: "Threads", align: "right", mono: true, cell: (p) => p.threads },
  ];
  return (
    <>
      <PageHeader title="Processes" description="Top processes per host, sampled every 15 s by the agent." />
      <FilterBar>
        <SelectField label="Host" value={host} onChange={(e) => setHost(e.target.value)} options={Object.keys(HOST_PROCS).map((h) => ({ value: h, label: h }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title={`Processes on ${host}`} flush>
          <DataTable label="Host processes" columns={cols} rows={procs} getRowId={(p) => `${p.pid}`} defaultSort={{ id: "cpu", direction: "desc" }} minWidth={860} />
        </Panel>
        <Panel title="CPU by process" description={host}>
          <BarList label={`CPU by process on ${host}`} items={procs.map((p) => ({ id: `${p.pid}`, label: p.name, value: p.cpu }))} format={(v) => `${v.toFixed(1)}%`} />
        </Panel>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- network */

interface Flow {
  id: string;
  from: string;
  to: string;
  port: string;
  rate: string;
  bytes: number;
  expected: boolean;
}

const FLOWS: Flow[] = [
  { id: "f1", from: "edge-fra-02", to: "api-prod-01", port: "443/tcp", rate: "1.2k req/s", bytes: 4.1e9, expected: true },
  { id: "f2", from: "api-prod-01", to: "db-prod-01", port: "5432/tcp", rate: "2.1k q/s", bytes: 9.8e9, expected: true },
  { id: "f3", from: "api-prod-03", to: "db-prod-01", port: "5432/tcp", rate: "880 q/s", bytes: 3.2e9, expected: true },
  { id: "f4", from: "worker-prod-04", to: "cache-prod-14", port: "6379/tcp", rate: "4.4k op/s", bytes: 1.4e9, expected: true },
  { id: "f5", from: "db-prod-01", to: "db-prod-02", port: "5432/tcp (replication)", rate: "9.4 GB/h", bytes: 2.2e10, expected: true },
  { id: "f6", from: "api-prod-03", to: "198.51.100.201", port: "3333/tcp", rate: "12 conn", bytes: 2.1e7, expected: false },
  { id: "f7", from: "worker-prod-09", to: "203.0.113.181", port: "80/tcp", rate: "1 conn", bytes: 4.0e6, expected: false },
];

const ZONES: Array<{ id: string; name: string; hosts: string[] }> = [
  { id: "edge", name: "Edge", hosts: ["edge-fra-02", "edge-lon-01"] },
  { id: "app", name: "Application", hosts: ["api-prod-01", "api-prod-03", "api-prod-05", "worker-prod-04", "worker-prod-09"] },
  { id: "data", name: "Data", hosts: ["db-prod-01", "db-prod-02", "cache-prod-14"] },
  { id: "internet", name: "Internet", hosts: ["198.51.100.201", "203.0.113.181"] },
];

function NetworkPage() {
  const [selected, setSelected] = useState<string | null>(null);
  const [unexpected, setUnexpected] = useState(false);
  const rows = FLOWS.filter((f) => (!unexpected || !f.expected) && (!selected || f.from === selected || f.to === selected));
  const cols: Column<Flow>[] = [
    { id: "from", header: "From", cell: (f) => <EntityChip kind={f.from.match(/^\d/) ? "ip" : "host"} value={f.from} hideKind /> },
    { id: "to", header: "To", cell: (f) => <EntityChip kind={f.to.match(/^\d/) ? "ip" : "host"} value={f.to} hideKind /> },
    { id: "port", header: "Port", mono: true, cell: (f) => f.port },
    { id: "rate", header: "Rate", align: "right", mono: true, cell: (f) => f.rate },
    { id: "bytes", header: "Bytes · 1 h", align: "right", mono: true, sortValue: (f) => f.bytes, cell: (f) => formatBytes(f.bytes) },
    { id: "exp", header: "Baseline", description: "Expected flows have been seen daily for 14 days. New flows to the internet are flagged.", cell: (f) => (f.expected ? <Badge>Expected</Badge> : <Badge tone="danger">New</Badge>) },
  ];
  return (
    <>
      <PageHeader title="Network map" description="Flows between hosts from eBPF socket stats, grouped by zone. Select a host to see only its flows." />
      <Panel title="Zones" description={selected ? `Showing flows of ${selected}` : "All flows"} actions={selected && <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>Show all</Button>}>
        <div className="grid gap-2.5 md:grid-cols-4">
          {ZONES.map((z) => (
            <section key={z.id} aria-label={`${z.name} zone`} className={cn("flex min-w-0 flex-col gap-1.5 rounded-md border p-2", z.id === "internet" ? "border-danger/40 bg-danger-soft" : "border-line bg-canvas")}>
              <h3 className="text-xs font-semibold text-fg-muted uppercase">{z.name}</h3>
              {z.hosts.map((h) => {
                const bad = FLOWS.some((f) => !f.expected && (f.from === h || f.to === h));
                return (
                  <button
                    key={h}
                    type="button"
                    aria-pressed={selected === h}
                    onClick={() => setSelected(selected === h ? null : h)}
                    className={cn("flex min-w-0 items-center justify-between gap-1 rounded border px-2 py-1 text-left font-mono text-xs", selected === h ? "border-accent bg-accent-soft" : "border-line bg-surface hover:bg-subtle")}
                  >
                    <span className="truncate">{h}</span>
                    {bad && <span aria-label="has unexpected flows" role="img" className="size-2 shrink-0 rounded-full bg-danger" />}
                  </button>
                );
              })}
            </section>
          ))}
        </div>
      </Panel>
      <FilterBar>
        <Switch checked={unexpected} onCheckedChange={setUnexpected} label="Only flows not in baseline" />
      </FilterBar>
      <Panel title="Flows" description={`${rows.length} flows`} flush>
        <DataTable label="Network flows" columns={cols} rows={rows} getRowId={(f) => f.id} defaultSort={{ id: "bytes", direction: "desc" }} minWidth={820} empty={<p className="py-8">No flows</p>} />
      </Panel>
    </>
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  hosts: () => <HostsPage />,
  containers: () => <ContainersPage />,
  kubernetes: () => <KubernetesPage />,
  processes: () => <ProcessesPage />,
  network: () => <NetworkPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="infrastructure" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Busiest hosts" }).querySelectorAll("tbody tr")[0]).toHaveTextContent("api-prod-03");
    await userEvent.click(c.getByRole("link", { name: /Containers/ }));
    await expect(c.getByRole("heading", { level: 1, name: "Containers" })).toBeInTheDocument();
  },
};

export const Hosts: Story = {
  ...app("hosts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Hosts" })).toBeInTheDocument();

    // Host map: one tile per host, hover shows the preview card.
    const tile = c.getByRole("button", { name: "api-prod-03, CPU 97%" });
    await expect(c.getAllByTestId("host-tile")).toHaveLength(48);
    await userEvent.hover(tile);
    const tip = await c.findByRole("tooltip");
    await expect(tip).toHaveTextContent("Containers");
    await userEvent.unhover(tile);

    // SegmentedControl switches the table.
    await userEvent.click(c.getByRole("radio", { name: "Containers" }));
    await expect(c.getByRole("table", { name: "Containers" })).toBeInTheDocument();
    await expect(c.queryByRole("table", { name: "Hosts" })).not.toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "Kubernetes" }));
    await expect(c.getByRole("table", { name: "Kubernetes nodes" })).toHaveTextContent("prod-fra-node-04");
    await userEvent.click(c.getByRole("radio", { name: "Hosts" }));

    // Clicking a row opens the side panel.
    const table = c.getByRole("table", { name: "Hosts" });
    await userEvent.click(within(table).getByRole("button", { name: "api-prod-03" }));
    const detail = c.getByRole("region", { name: "Host api-prod-03" });
    await expect(detail).toHaveTextContent("Malware on this host");
    await expect(within(detail).getByRole("link", { name: "Metrics" })).toHaveAttribute("href", "#metrics?host=api-prod-03");
    await expect(table.querySelector('[data-row-id="h1"]')).toHaveClass("bg-accent-soft");
    await userEvent.click(within(detail).getByRole("button", { name: "Close host details" }));
    await expect(c.queryByRole("region", { name: "Host api-prod-03" })).not.toBeInTheDocument();
  },
};

export const Kubernetes: Story = {
  ...app("kubernetes"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Kubernetes nodes" });
    await expect(within(table).getAllByRole("row")).toHaveLength(11);
    await userEvent.click(c.getByRole("radio", { name: "prod-fra" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(5);
    await expect(table).toHaveTextContent("NotReady");
  },
};

export const Containers: Story = {
  ...app("containers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search containers" }), "kworkerd");
    await expect(c.getByRole("table", { name: "Containers" }).querySelectorAll("tbody tr")).toHaveLength(1);
    await userEvent.click(c.getByRole("button", { name: "Stop kworkerd" }));
    await expect(within(c.getByRole("table", { name: "Containers" })).getByText("Exited")).toBeInTheDocument();
  },
};

export const Processes: Story = {
  ...app("processes"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Host processes" }).querySelectorAll("tbody tr")[0]).toHaveTextContent("kworkerd");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Host" }), "db-prod-01");
    await expect(c.getByRole("heading", { name: "Processes on db-prod-01" })).toBeInTheDocument();
  },
};

export const NetworkMap: Story = {
  name: "Network map",
  ...app("network"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("region", { name: "Application zone" })).getByRole("button", { name: /api-prod-03/ }));
    await expect(c.getByRole("table", { name: "Network flows" }).querySelectorAll("tbody tr")).toHaveLength(2);
    await userEvent.click(c.getByRole("switch", { name: "Only flows not in baseline" }));
    await expect(c.getByRole("table", { name: "Network flows" }).querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
