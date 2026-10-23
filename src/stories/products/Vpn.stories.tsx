import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Activity, Download, LayoutGrid, Monitor, Network, Plug, Plus, Power, RotateCcw, Server, Smartphone, Trash2, UserRound, Users } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, LevelBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { formatBytes } from "../../lib/format";
import type { LogLevel } from "../../tokens/levels";
import { DOC_IPS, PEOPLE, emailOf, timeLabels, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "people", label: "People", icon: Users, count: 214 },
  { id: "ip-groups", label: "IP groups", icon: Network, count: 12 },
  { id: "connections", label: "Connections", icon: Plug, count: 128 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "server", label: "Server", icon: Server, count: 2 },
  { id: "my-vpn", label: "My VPN", icon: UserRound },
];

const meta = {
  title: "Products/VPN",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const N = 25;
const labels = timeLabels(N, 60);

interface Session {
  id: string;
  person: string;
  client: string;
  realIp: string;
  vpnIp: string;
  node: string;
  minutes: number;
  bytes: number;
}

const SESSIONS: Session[] = PEOPLE.map((p, i) => ({
  id: `s${i}`,
  person: p,
  client: ["OpenVPN Connect 3.5", "Tunnelblick 4.0", "openvpn 2.6.12", "NetworkManager"][i % 4]!,
  realIp: DOC_IPS[i % DOC_IPS.length]!,
  vpnIp: `10.8.0.${14 + i * 7}`,
  node: i % 3 ? "lon-01" : "fra-01",
  minutes: [134, 48, 362, 12, 90, 7, 220, 31][i]!,
  bytes: [1.2e9, 3.1e8, 4.8e9, 2.4e7, 6.4e8, 1.1e7, 2.2e9, 9.0e7][i]!,
}));

type PersonStatus = "active" | "invited" | "suspended";
interface Person {
  id: string;
  name: string;
  groups: string[];
  devices: number;
  mfa: boolean;
  last: string;
  status: PersonStatus;
}

const GROUPS = ["Backend engineers", "SRE on-call", "Data team", "Support", "Contractors"];

const PEOPLE_ROWS: Person[] = [
  ...PEOPLE.map((name, i) => ({
    id: `p${i}`,
    name,
    groups: Array.from(new Set([GROUPS[i % 5]!, ...(i % 3 === 0 ? [GROUPS[1]!] : [])])),
    devices: 1 + (i % 3),
    mfa: i !== 4,
    last: ["now", "12 min ago", "now", "yesterday", "3 days ago", "now", "1 h ago", "now"][i]!,
    status: (i === 4 ? "suspended" : "active") as PersonStatus,
  })),
  { id: "p8", name: "Liam Turner", groups: ["Contractors"], devices: 0, mfa: false, last: "never", status: "invited" },
  { id: "p9", name: "Nina Patel", groups: ["Data team"], devices: 0, mfa: false, last: "never", status: "invited" },
];

const STATUS_TONE: Record<PersonStatus, "success" | "info" | "danger"> = { active: "success", invited: "info", suspended: "danger" };

interface IpGroup {
  id: string;
  name: string;
  cidrs: Array<{ net: string; ports: string; note: string }>;
  allowed: string[];
  people: number;
  split: boolean;
}

const IP_GROUPS: IpGroup[] = [
  {
    id: "g1",
    name: "Production databases",
    cidrs: [
      { net: "172.16.20.0/24", ports: "tcp/5432", note: "Postgres primary" },
      { net: "172.16.30.0/24", ports: "tcp/5432, 6432", note: "Replicas, pgbouncer" },
      { net: "172.16.40.12/32", ports: "tcp/6379", note: "Redis" },
    ],
    allowed: ["Backend engineers", "SRE on-call"],
    people: 14,
    split: true,
  },
  {
    id: "g2",
    name: "Kubernetes API",
    cidrs: [{ net: "172.16.0.10/32", ports: "tcp/6443", note: "prod control plane" }],
    allowed: ["SRE on-call"],
    people: 5,
    split: true,
  },
  {
    id: "g3",
    name: "Internal tools",
    cidrs: [{ net: "172.16.50.0/24", ports: "tcp/443", note: "Grafana, Jira, wiki" }],
    allowed: ["Backend engineers", "Data team", "Support"],
    people: 96,
    split: true,
  },
  {
    id: "g4",
    name: "Analytics warehouse",
    cidrs: [{ net: "172.16.60.0/24", ports: "tcp/8443", note: "ClickHouse" }],
    allowed: ["Data team"],
    people: 11,
    split: true,
  },
  {
    id: "g5",
    name: "Everything (full tunnel)",
    cidrs: [{ net: "0.0.0.0/0", ports: "any", note: "Internet through the VPN" }],
    allowed: ["Contractors"],
    people: 6,
    split: false,
  },
];

const EVENTS: Array<{ id: string; level: LogLevel; kind: "auth" | "admin" | "conn"; text: string; actor: string; ip: string; time: string }> = [
  { id: "e1", level: "info", kind: "conn", text: "Dana Kim connected to lon-01", actor: "dana.kim", ip: "203.0.113.24", time: "14:02" },
  { id: "e2", level: "error", kind: "auth", text: "Failed sign-in: wrong TOTP code (attempt 3 of 5)", actor: "ben.ortiz", ip: "198.51.100.201", time: "13:53" },
  { id: "e3", level: "info", kind: "admin", text: "Added 172.16.30.0/24 to Production databases", actor: "emily.clark", ip: "203.0.113.24", time: "13:31" },
  { id: "e4", level: "warn", kind: "conn", text: "Node fra-01 CPU above 80% for 10 minutes", actor: "system", ip: "–", time: "13:18" },
  { id: "e5", level: "info", kind: "auth", text: "MFA enrolled with a passkey", actor: "zoe.adams", ip: "192.0.2.44", time: "12:40" },
  { id: "e6", level: "info", kind: "admin", text: "Invited liam.turner@example.com to Contractors", actor: "emily.clark", ip: "203.0.113.24", time: "11:02" },
  { id: "e7", level: "warn", kind: "auth", text: "Sign-in from a new country (IE)", actor: "sarah.chen", ip: "198.51.100.96", time: "10:15" },
  { id: "e8", level: "info", kind: "conn", text: "Mark Wilson disconnected · idle timeout", actor: "mark.wilson", ip: "203.0.113.181", time: "09:44" },
  { id: "e9", level: "info", kind: "admin", text: "Syslog sink siem-prod enabled · CEF over TLS", actor: "emily.clark", ip: "203.0.113.24", time: "Yesterday" },
];

/* ------------------------------------------------------------------ */
/* Shared table pieces                                                 */
/* ------------------------------------------------------------------ */

function sessionColumns(onEnd?: (s: Session) => void): Column<Session>[] {
  return [
    {
      id: "person",
      header: "Person",
      pinned: "left",
      sortValue: (s) => s.person,
      width: "24%",
      cell: (s) => (
        <span className="flex items-center gap-2">
          <Avatar name={s.person} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{s.person}</span>
            <span className="truncate text-2xs text-fg-muted">{emailOf(s.person)}</span>
          </span>
        </span>
      ),
    },
    { id: "client", header: "Client", cell: (s) => s.client },
    {
      id: "real",
      header: "Real IP",
      description: "Public address the client connected from.",
      cell: (s) => <EntityChip kind="ip" value={s.realIp} hideKind href="#ip" />,
    },
    { id: "vpn", header: "VPN IP", mono: true, description: "Static address from the person's IP group.", cell: (s) => s.vpnIp },
    { id: "node", header: "Node", mono: true, sortValue: (s) => s.node, cell: (s) => s.node },
    { id: "since", header: "Since", align: "right", sortValue: (s) => s.minutes, cell: (s) => `${Math.floor(s.minutes / 60)} h ${s.minutes % 60} m` },
    {
      id: "bytes",
      header: "Traffic",
      align: "right",
      mono: true,
      sortValue: (s) => s.bytes,
      cell: (s) => formatBytes(s.bytes),
      description: "Bytes in plus out since the session started.",
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "48px",
      align: "right",
      hideable: false,
      cell: (s) => (
        <IconButton label={`End session for ${s.person}`} size="xs" onClick={() => onEnd?.(s)}>
          <Power />
        </IconButton>
      ),
    },
  ];
}

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function OverviewPage() {
  const [range, setRange] = useState("24h");
  const [nodes, setNodes] = useState<string[]>([]);
  return (
    <>
      <PageHeader
        title="Overview"
        description="2 nodes · OpenVPN 2.6 · split tunnel by default"
        meta={<StatusBadge tone="success">Healthy</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search people or IPs" shortcut="/" className="w-60" />
            <Button variant="primary" icon={<Users />}>
              Invite people
            </Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Node"
          selected={nodes}
          onChange={setNodes}
          options={[
            { value: "lon-01", count: 91 },
            { value: "fra-01", count: 37 },
          ]}
        />
      </FilterBar>
      <Callout tone="warning" title="4 certificates expire within 30 days" action={<Button size="sm">Review</Button>}>
        Owners get an email 14 and 3 days before.
      </Callout>
      <KpiGrid>
        <KpiCard
          label="Active connections"
          value="128"
          unit="now"
          trend={wave(24, { base: 80, amp: 50, seed: 31 })}
          delta={{ label: "+12 vs. yesterday", direction: "up" }}
        />
        <KpiCard label="People" value="214" unit="6 invited" delta={{ label: "197 with MFA" }} />
        <KpiCard label="Traffic · 24 h" value="412" unit="GB" trend={wave(24, { base: 18, amp: 8, seed: 32 })} delta={{ label: "61% via split routes" }} />
        <KpiCard
          label="Failed sign-ins · 24 h"
          value="9"
          unit="attempts"
          tone="danger"
          trendColor="var(--oa-danger)"
          trend={[0, 0, 1, 0, 2, 0, 0, 0, 3, 2, 0, 1]}
          delta={{ label: "3 from one address", direction: "up", intent: "bad" }}
        />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Concurrent sessions" description="Stacked by node">
          <TimeSeriesChart
            label="Concurrent VPN sessions by node"
            labels={labels}
            stacked
            height={200}
            series={[
              { id: "lon", name: "lon-01", data: wave(N, { base: 70, amp: 45, seed: 33, phase: -1 }) },
              { id: "fra", name: "fra-01", data: wave(N, { base: 28, amp: 16, seed: 34, phase: -1 }) },
            ]}
          />
        </Panel>
        <Panel title="Most traffic · 24 h">
          <BarList
            label="People with the most VPN traffic"
            format={(v) => formatBytes(v)}
            items={[...SESSIONS]
              .sort((a, b) => b.bytes - a.bytes)
              .slice(0, 6)
              .map((s) => ({ id: s.id, label: s.person, value: s.bytes, href: "#person" }))}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Live connections"
          actions={
            <Button size="sm" variant="ghost">
              Open Connections
            </Button>
          }
          flush
        >
          <DataTable
            label="Live connections"
            columns={sessionColumns()}
            rows={SESSIONS}
            getRowId={(s) => s.id}
            pageSize={6}
            defaultSort={{ id: "bytes", direction: "desc" }}
            minWidth={860}
          />
        </Panel>
        <Panel title="Recent activity" flush>
          <ul className="flex flex-col">
            {EVENTS.slice(0, 5).map((e) => (
              <li key={e.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <LevelBadge level={e.level} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm">{e.text}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">
                    {e.actor} · {e.ip}
                  </span>
                </span>
                <span className="text-2xs whitespace-nowrap text-fg-muted">{e.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function PeoplePage() {
  const [rows, setRows] = useState(PEOPLE_ROWS);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [inviting, setInviting] = useState(false);
  const [notice, setNotice] = useState("");
  const shown = rows.filter(
    (p) =>
      p.name.toLowerCase().includes(query.toLowerCase()) &&
      (groups.length === 0 || p.groups.some((g) => groups.includes(g))) &&
      (statuses.length === 0 || statuses.includes(p.status)),
  );
  const cols: Column<Person>[] = [
    {
      id: "name",
      header: "Person",
      pinned: "left",
      sortValue: (p) => p.name,
      width: "26%",
      cell: (p) => (
        <span className="flex items-center gap-2">
          <Avatar name={p.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{p.name}</span>
            <span className="truncate text-2xs text-fg-muted">{emailOf(p.name)}</span>
          </span>
        </span>
      ),
    },
    {
      id: "groups",
      header: "Groups",
      description: "Groups decide which IP groups a person can reach.",
      cell: (p) => (
        <span className="flex flex-wrap gap-1">
          {p.groups.map((g) => (
            <Badge key={g} variant="outline">
              {g}
            </Badge>
          ))}
        </span>
      ),
    },
    { id: "devices", header: "Devices", align: "right", mono: true, sortValue: (p) => p.devices, cell: (p) => p.devices },
    { id: "mfa", header: "MFA", cell: (p) => (p.mfa ? <StatusBadge tone="success">On</StatusBadge> : <StatusBadge tone="warning">Off</StatusBadge>) },
    { id: "last", header: "Last connected", cell: (p) => p.last },
    {
      id: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <StatusBadge tone={STATUS_TONE[p.status]}>{p.status[0]!.toUpperCase() + p.status.slice(1)}</StatusBadge>,
    },
  ];
  const bulk = (status: PersonStatus, verb: string) => {
    setRows((rs) => rs.map((r) => (selected.includes(r.id) ? { ...r, status } : r)));
    setNotice(`${verb} ${selected.length} ${selected.length === 1 ? "person" : "people"}`);
    setSelected([]);
  };
  return (
    <>
      <PageHeader
        title="People"
        description="Everyone who can sign in to the VPN, their groups, devices and MFA."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setInviting(true)}>
            Invite people
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="People" value="214" delta={{ label: "+6 this month", direction: "up" }} />
        <KpiCard label="With MFA" value="197" unit="92%" tone="success" />
        <KpiCard label="Invited" value="6" unit="not signed in yet" />
        <KpiCard label="Suspended" value="3" tone="danger" />
      </KpiGrid>
      {inviting && (
        <Panel
          title="Invite people"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setInviting(false)}>
              Cancel
            </Button>
          }
        >
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setInviting(false);
              setNotice("Invitation sent");
            }}
          >
            <TextField label="Email addresses" placeholder="name@example.com, other@example.com" hint="Separate several with commas." />
            <SelectField label="Group" options={GROUPS.map((g) => ({ value: g, label: g }))} />
            <Button type="submit" variant="primary">
              Send invitations
            </Button>
          </form>
        </Panel>
      )}
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <FilterBar onClear={groups.length || statuses.length || query ? () => (setGroups([]), setStatuses([]), setQuery("")) : undefined}>
        <SearchInput label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <FacetFilter label="Group" selected={groups} onChange={setGroups} options={GROUPS.map((g) => ({ value: g }))} />
        <FacetFilter label="Status" selected={statuses} onChange={setStatuses} options={[{ value: "active" }, { value: "invited" }, { value: "suspended" }]} />
      </FilterBar>
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" onClick={() => bulk("suspended", "Suspended")}>
            Suspend
          </Button>
          <Button size="sm" onClick={() => bulk("active", "Reactivated")}>
            Reactivate
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      <Panel title="People" description={`${shown.length} of ${rows.length}`} flush>
        <DataTable
          label="People"
          columns={cols}
          rows={shown}
          getRowId={(p) => p.id}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          pageSize={8}
          minWidth={860}
        />
      </Panel>
    </>
  );
}

function IpGroupsPage() {
  const [active, setActive] = useState(IP_GROUPS[0]!.id);
  const [split, setSplit] = useState<Record<string, boolean>>(Object.fromEntries(IP_GROUPS.map((g) => [g.id, g.split])));
  const g = IP_GROUPS.find((x) => x.id === active)!;
  const cols: Column<IpGroup>[] = [
    { id: "name", header: "IP group", sortValue: (x) => x.name, cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "nets", header: "Networks", align: "right", mono: true, sortValue: (x) => x.cidrs.length, cell: (x) => x.cidrs.length },
    { id: "allowed", header: "Allowed groups", cell: (x) => x.allowed.join(", ") },
    { id: "people", header: "People", align: "right", mono: true, sortValue: (x) => x.people, cell: (x) => x.people },
    {
      id: "mode",
      header: "Routing",
      description: "Split tunnel pushes only these routes; full tunnel sends all traffic through the VPN.",
      cell: (x) => <Badge tone={split[x.id] ? "info" : "warning"}>{split[x.id] ? "Split route" : "Full tunnel"}</Badge>,
    },
  ];
  return (
    <>
      <PageHeader
        title="IP groups"
        description="Named networks people may reach. Access is deny-by-default; routes are pushed only for allowed groups."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New IP group
          </Button>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="IP groups" flush>
          <DataTable
            label="IP groups"
            columns={cols}
            rows={IP_GROUPS}
            getRowId={(x) => x.id}
            onRowClick={(x) => setActive(x.id)}
            activeRowId={active}
            minWidth={620}
          />
        </Panel>
        <Panel title={g.name} description={`Reachable by ${g.allowed.join(" and ")} · ${g.people} people`} aria-label="IP group detail">
          <div className="flex flex-col gap-3">
            <table className="w-full text-sm">
              <caption className="sr-only">Networks in {g.name}</caption>
              <thead>
                <tr className="text-left text-2xs tracking-wider text-fg-muted uppercase">
                  <th className="py-1 font-medium">Network</th>
                  <th className="py-1 font-medium">Ports</th>
                  <th className="py-1 font-medium">Note</th>
                </tr>
              </thead>
              <tbody>
                {g.cidrs.map((c) => (
                  <tr key={c.net} className="border-t border-subtle">
                    <td className="py-1.5 font-mono text-xs">{c.net}</td>
                    <td className="py-1.5 font-mono text-xs">{c.ports}</td>
                    <td className="py-1.5 text-xs text-fg-muted">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Switch
              checked={split[g.id] ?? true}
              onCheckedChange={(v) => setSplit((s) => ({ ...s, [g.id]: v }))}
              label="Push as split-tunnel routes"
              description="Off sends all of this group's traffic through the VPN."
            />
            <div className="flex flex-wrap gap-1.5">
              {g.allowed.map((a) => (
                <Badge key={a} variant="outline">
                  {a}
                </Badge>
              ))}
              <Button size="xs" icon={<Plus />}>
                Allow a group
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function ConnectionsPage() {
  const [rows, setRows] = useState(SESSIONS);
  const [nodes, setNodes] = useState<string[]>([]);
  const [ended, setEnded] = useState("");
  const shown = rows.filter((s) => nodes.length === 0 || nodes.includes(s.node));
  return (
    <>
      <PageHeader
        title="Connections"
        description="Live tunnels across all nodes. Ending a session disconnects the client immediately."
        meta={<StatusBadge tone="success">{rows.length} live</StatusBadge>}
      />
      <FilterBar>
        <SearchInput label="Search connections" className="w-56" />
        <FacetFilter
          label="Node"
          selected={nodes}
          onChange={setNodes}
          options={[
            { value: "lon-01", count: rows.filter((r) => r.node === "lon-01").length },
            { value: "fra-01", count: rows.filter((r) => r.node === "fra-01").length },
          ]}
        />
      </FilterBar>
      {ended && <Callout tone="success" title={ended} onDismiss={() => setEnded("")} />}
      <Panel title="Live connections" flush>
        <DataTable
          label="All live connections"
          columns={sessionColumns((s) => {
            setRows((rs) => rs.filter((r) => r.id !== s.id));
            setEnded(`Ended the session for ${s.person}`);
          })}
          rows={shown}
          getRowId={(s) => s.id}
          defaultSort={{ id: "since", direction: "desc" }}
          minWidth={900}
          persistKey="vpn-connections"
        />
      </Panel>
    </>
  );
}

function ActivityPage() {
  const [tab, setTab] = useState<"all" | "auth" | "admin" | "conn">("all");
  const [range, setRange] = useState("24h");
  const rows = EVENTS.filter((e) => tab === "all" || e.kind === tab);
  return (
    <>
      <PageHeader
        title="Activity"
        description="Sign-ins, connections and every admin change. Forwarded to SIEM over Syslog CEF."
        actions={<Button>Export CSV</Button>}
      >
        <Tabs
          label="Activity type"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All events", count: EVENTS.length },
            { value: "auth", label: "Sign-ins", count: EVENTS.filter((e) => e.kind === "auth").length },
            { value: "conn", label: "Connections", count: EVENTS.filter((e) => e.kind === "conn").length },
            { value: "admin", label: "Admin", count: EVENTS.filter((e) => e.kind === "admin").length },
          ]}
        />
      </PageHeader>
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
      </FilterBar>
      <Panel title="Events" flush>
        <DataTable
          label="Activity events"
          rows={rows}
          getRowId={(e) => e.id}
          minWidth={760}
          columns={[
            { id: "time", header: "Time", width: "90px", mono: true, cell: (e) => e.time },
            { id: "level", header: "Level", width: "80px", cell: (e) => <LevelBadge level={e.level} /> },
            { id: "text", header: "Event", cell: (e) => e.text },
            { id: "actor", header: "Actor", mono: true, width: "130px", cell: (e) => e.actor },
            { id: "ip", header: "IP", width: "150px", cell: (e) => (e.ip === "–" ? "–" : <EntityChip kind="ip" value={e.ip} hideKind href="#ip" />) },
          ]}
        />
      </Panel>
    </>
  );
}

function ServerPage() {
  const [saved, setSaved] = useState(false);
  const [rotated, setRotated] = useState(false);
  return (
    <>
      <PageHeader
        title="Server"
        description="Nodes, tunnel settings, certificates and where logs go."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add node
          </Button>
        }
      />
      <div className="grid gap-2.5 md:grid-cols-2">
        {[
          {
            name: "lon-01",
            tone: "success" as const,
            status: "Healthy",
            addr: "vpn.example.com · udp/1194",
            sessions: 91,
            cpu: "23%",
            beat: "4 s",
            version: "agent 0.4.2 · OpenVPN 2.6.12",
          },
          {
            name: "fra-01",
            tone: "warning" as const,
            status: "Degraded",
            addr: "fra.vpn.example.com · tcp/443",
            sessions: 37,
            cpu: "81%",
            beat: "12 s",
            version: "agent 0.4.2 · OpenVPN 2.6.12",
          },
        ].map((n) => (
          <Panel
            key={n.name}
            title={<span className="font-mono">{n.name}</span>}
            description={n.addr}
            actions={<StatusBadge tone={n.tone}>{n.status}</StatusBadge>}
          >
            <dl className="grid grid-cols-4 gap-2 text-sm">
              <div>
                <dt className="text-2xs text-fg-muted">Sessions</dt>
                <dd className="font-semibold">{n.sessions}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">CPU</dt>
                <dd className="font-semibold">{n.cpu}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Heartbeat</dt>
                <dd className="font-semibold">{n.beat}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Version</dt>
                <dd className="truncate text-xs">{n.version}</dd>
              </div>
            </dl>
          </Panel>
        ))}
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Tunnel settings">
          <form
            className="grid gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(true);
            }}
          >
            <SelectField
              label="Protocol"
              defaultValue="udp"
              options={[
                { value: "udp", label: "UDP · 1194" },
                { value: "tcp", label: "TCP · 443" },
              ]}
            />
            <TextField label="Client subnet" mono defaultValue="10.8.0.0/16" adornment={<Badge tone="info">65,536</Badge>} />
            <TextField label="DNS servers" mono defaultValue="172.16.0.2, 172.16.0.3" hint="Pushed to clients; split DNS for *.internal.example.com." />
            <SelectField
              label="Data ciphers"
              defaultValue="gcm"
              options={[
                { value: "gcm", label: "AES-256-GCM, CHACHA20-POLY1305" },
                { value: "gcm-only", label: "AES-256-GCM only" },
              ]}
            />
            <Checkbox label="Split tunnel by default" description="Full tunnel only for groups that ask for it." defaultChecked />
            <Checkbox label="tls-crypt-v2 per client key" defaultChecked />
            <div className="flex items-center gap-2 md:col-span-2">
              <Button type="submit" variant="primary">
                Save and reload nodes
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  Saved · reloading 2 nodes
                </span>
              )}
            </div>
          </form>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Certificate authority">
            <dl className="flex flex-col gap-1.5 text-sm">
              <div className="flex justify-between gap-2">
                <dt className="text-fg-muted">Fingerprint</dt>
                <dd className="font-mono text-xs">SHA256 4F:9A:21:…:C7</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-muted">Expires</dt>
                <dd>{rotated ? "Oct 19, 2036" : "Nov 9, 2026 · 21 days"}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-fg-muted">Revoked certificates</dt>
                <dd className="font-mono">37</dd>
              </div>
            </dl>
            <div className="mt-2 flex items-center gap-2">
              <Button size="sm" icon={<RotateCcw />} onClick={() => setRotated(true)}>
                Rotate CA
              </Button>
              {rotated && (
                <span role="status" className="text-xs text-success">
                  New CA issued; clients renew on next sign-in
                </span>
              )}
            </div>
          </Panel>
          <Panel title="Log destinations" flush>
            <ul className="flex flex-col text-sm">
              {[
                { name: "siem-prod", detail: "Syslog CEF over TLS · siem.example.com:6514", ok: true },
                { name: "logs", detail: "OpenAsy Logs · OTLP", ok: true },
                { name: "archive", detail: "S3 Object Lock · 400 days", ok: true },
              ].map((d) => (
                <li key={d.name} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                  <span className="flex min-w-0 grow flex-col">
                    <span className="font-mono text-xs font-medium">{d.name}</span>
                    <span className="truncate text-2xs text-fg-muted">{d.detail}</span>
                  </span>
                  <StatusBadge tone="success">Delivering</StatusBadge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

const SETUP: Record<string, string[]> = {
  macos: ["Install OpenVPN Connect or Tunnelblick.", "Download your profile below and open it.", "Sign in with SSO when prompted; approve the MFA push."],
  windows: ["Install OpenVPN Connect for Windows.", "Download your profile and choose Import.", "Connect and complete SSO in the browser window."],
  linux: ["sudo apt install openvpn3 (or NetworkManager-openvpn).", "openvpn3 config-import --config acme.ovpn", "openvpn3 session-start --config acme.ovpn"],
  ios: ["Install OpenVPN Connect from the App Store.", "Scan the QR code below with the app.", "Allow the VPN configuration and connect."],
  android: ["Install OpenVPN Connect from Google Play.", "Scan the QR code below with the app.", "Approve the connection request and connect."],
};

function MyVpnPage() {
  const [os, setOs] = useState<keyof typeof SETUP>("macos");
  const [devices, setDevices] = useState([
    { id: "d1", name: "Emily's MacBook Pro", kind: "laptop", last: "Connected now · lon-01", created: "Aug 2" },
    { id: "d2", name: "Pixel 9", kind: "phone", last: "Yesterday 18:20", created: "Sep 14" },
  ]);
  const [downloaded, setDownloaded] = useState(false);
  return (
    <>
      <PageHeader title="My VPN" description="Your profile, devices and how to connect." meta={<StatusBadge tone="success">Connected</StatusBadge>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Set up a device">
          <div className="flex flex-col gap-3">
            <SegmentedControl
              label="Operating system"
              value={os}
              onChange={setOs}
              options={[
                { value: "macos", label: "macOS" },
                { value: "windows", label: "Windows" },
                { value: "linux", label: "Linux" },
                { value: "ios", label: "iOS" },
                { value: "android", label: "Android" },
              ]}
            />
            <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm">
              {SETUP[os]!.map((s) => (
                <li key={s}>{os === "linux" && s.includes("openvpn3") ? <code className="font-mono text-xs">{s}</code> : s}</li>
              ))}
            </ol>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" icon={<Download />} onClick={() => setDownloaded(true)}>
                Download profile (.ovpn)
              </Button>
              {downloaded && (
                <span role="status" className="text-xs text-success">
                  acme-emily.clark.ovpn downloaded · valid 365 days
                </span>
              )}
            </div>
          </div>
        </Panel>
        <Panel title="Scan to import" description="For OpenVPN Connect on phones">
          <div className="flex flex-col items-center gap-2">
            <svg
              role="img"
              aria-label="QR code for importing the VPN profile"
              viewBox="0 0 29 29"
              className="size-36 rounded-md border border-line bg-white p-2"
            >
              {Array.from({ length: 29 * 29 }, (_, i) => {
                const x = i % 29;
                const y = Math.floor(i / 29);
                const finder = (x < 7 && y < 7) || (x > 21 && y < 7) || (x < 7 && y > 21);
                const ring =
                  finder && (x % 22 === 0 || x % 22 === 6 || y % 22 === 0 || y % 22 === 6 || (x % 22 >= 2 && x % 22 <= 4 && y % 22 >= 2 && y % 22 <= 4));
                const on = finder ? ring : (x * 7 + y * 13 + x * y) % 5 < 2;
                return on ? <rect key={i} x={x} y={y} width="1" height="1" fill="#11161d" /> : null;
              })}
            </svg>
            <span className="text-xs text-fg-muted">Expires in 10 minutes</span>
          </div>
        </Panel>
      </div>
      <div className="grid gap-2.5 md:grid-cols-2">
        <Panel title="My devices" flush>
          <ul className="flex flex-col">
            {devices.map((d) => (
              <li key={d.id} className="flex items-center gap-3 border-b border-subtle px-3 py-2 last:border-0">
                {d.kind === "phone" ? <Smartphone aria-hidden className="size-4 text-fg-muted" /> : <Monitor aria-hidden className="size-4 text-fg-muted" />}
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-sm font-medium">{d.name}</span>
                  <span className="text-2xs text-fg-muted">
                    {d.last} · added {d.created}
                  </span>
                </span>
                <IconButton label={`Revoke ${d.name}`} size="sm" onClick={() => setDevices((ds) => ds.filter((x) => x.id !== d.id))}>
                  <Trash2 />
                </IconButton>
              </li>
            ))}
            {devices.length === 0 && <li className="px-3 py-4 text-sm text-fg-muted">No devices. Download a profile to add one.</li>}
          </ul>
        </Panel>
        <Panel title="Sign-in security">
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>Multi-factor authentication</span>
              <StatusBadge tone="success">Passkey + TOTP</StatusBadge>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Allowed networks</span>
              <span className="text-xs text-fg-muted">Production databases, Internal tools</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Device posture</span>
              <StatusBadge tone="success">Compliant</StatusBadge>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  people: () => <PeoplePage />,
  "ip-groups": () => <IpGroupsPage />,
  connections: () => <ConnectionsPage />,
  activity: () => <ActivityPage />,
  server: () => <ServerPage />,
  "my-vpn": () => <MyVpnPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="vpn" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("link", { name: /People/ }));
    await expect(c.getByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
  },
};

export const People: Story = {
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("checkbox", { name: "Select row p0" }));
    await userEvent.click(c.getByRole("checkbox", { name: "Select row p1" }));
    await userEvent.click(within(c.getByRole("toolbar", { name: "Bulk actions" })).getByRole("button", { name: "Suspend" }));
    await expect(c.getByText("Suspended 2 people")).toBeInTheDocument();
  },
};

export const IpGroups: Story = {
  name: "IP groups",
  ...app("ip-groups"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByText("Kubernetes API"));
    await expect(c.getByLabelText("IP group detail")).toHaveTextContent("172.16.0.10/32");
  },
};

export const Connections: Story = {
  ...app("connections"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "End session for Dana Kim" }));
    await expect(c.getByText("Ended the session for Dana Kim")).toBeInTheDocument();
    localStorage.removeItem("oa-table:vpn-connections");
  },
};

export const ActivityLog: Story = {
  name: "Activity",
  ...app("activity"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Sign-ins/ }));
    await expect(c.getByRole("table", { name: "Activity events" }).querySelectorAll("tbody tr")).toHaveLength(3);
  },
};

export const ServerSettings: Story = {
  name: "Server",
  ...app("server"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Rotate CA" }));
    await expect(c.getByText(/New CA issued/)).toBeInTheDocument();
  },
};

export const MyVpn: Story = {
  name: "My VPN",
  ...app("my-vpn"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: "Linux" }));
    await expect(c.getByText(/openvpn3 config-import/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Download profile (.ovpn)" }));
    await expect(c.getByRole("status")).toHaveTextContent("downloaded");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: "Data & GDPR" }));
    await expect(c.getByText(/Data subject access and erasure/)).toBeInTheDocument();
  },
};
