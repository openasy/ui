import { useId, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AppWindow, Bell, ClipboardCheck, Download, Laptop, Play, Plus, Save, ShieldCheck, Terminal } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { BarList } from "../../charts/BarList";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { TONE_COLORS, type Severity } from "../../tokens/levels";
import { PEOPLE, emailOf, wave } from "../mocks";

const nav = [
  { id: "devices", label: "Devices", icon: Laptop, count: 186 },
  { id: "compliance", label: "Compliance", icon: ClipboardCheck },
  { id: "software", label: "Software", icon: AppWindow },
  { id: "queries", label: "Queries", icon: Terminal },
  { id: "policies", label: "Policies", icon: ShieldCheck },
];

const meta = {
  title: "Products/Endpoints",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Posture = "compliant" | "at-risk" | "non-compliant";

const POSTURE: Record<Posture, { label: string; tone: "success" | "warning" | "danger" }> = {
  compliant: { label: "Compliant", tone: "success" },
  "at-risk": { label: "At risk", tone: "warning" },
  "non-compliant": { label: "Non-compliant", tone: "danger" },
};

interface Device {
  id: string;
  name: string;
  owner: string;
  os: "macOS" | "Windows" | "Ubuntu";
  version: string;
  encrypted: boolean;
  encryption: string;
  lastSeen: string;
  posture: Posture;
  issue?: string;
}

const devices: Device[] = [
  {
    id: "d1",
    name: "MBP-DKIM-14",
    owner: PEOPLE[0],
    os: "macOS",
    version: "15.1",
    encrypted: true,
    encryption: "FileVault",
    lastSeen: "2 min ago",
    posture: "compliant",
  },
  {
    id: "d2",
    name: "MBA-ECLARK",
    owner: PEOPLE[1],
    os: "macOS",
    version: "15.1",
    encrypted: true,
    encryption: "FileVault",
    lastSeen: "5 min ago",
    posture: "compliant",
  },
  {
    id: "d3",
    name: "WIN-MWILSON-01",
    owner: PEOPLE[2],
    os: "Windows",
    version: "11 23H2",
    encrypted: true,
    encryption: "BitLocker",
    lastSeen: "14 min ago",
    posture: "at-risk",
    issue: "OS update pending 9 days",
  },
  {
    id: "d4",
    name: "sarah-thinkpad",
    owner: PEOPLE[3],
    os: "Ubuntu",
    version: "24.04 LTS",
    encrypted: true,
    encryption: "LUKS2",
    lastSeen: "1 h ago",
    posture: "compliant",
  },
  {
    id: "d5",
    name: "WIN-BORTIZ-02",
    owner: PEOPLE[4],
    os: "Windows",
    version: "10 22H2",
    encrypted: false,
    encryption: "Off",
    lastSeen: "3 h ago",
    posture: "non-compliant",
    issue: "Disk not encrypted",
  },
  {
    id: "d6",
    name: "MBP-ADAVIS",
    owner: PEOPLE[5],
    os: "macOS",
    version: "14.6",
    encrypted: true,
    encryption: "FileVault",
    lastSeen: "26 min ago",
    posture: "at-risk",
    issue: "macOS 15 available",
  },
  {
    id: "d7",
    name: "chris-xps",
    owner: PEOPLE[6],
    os: "Ubuntu",
    version: "22.04 LTS",
    encrypted: true,
    encryption: "LUKS2",
    lastSeen: "4 days ago",
    posture: "non-compliant",
    issue: "EDR not running",
  },
  {
    id: "d8",
    name: "MBP-ZADAMS",
    owner: PEOPLE[7],
    os: "macOS",
    version: "15.1",
    encrypted: true,
    encryption: "FileVault",
    lastSeen: "9 min ago",
    posture: "compliant",
  },
  {
    id: "d9",
    name: "WIN-DKIM-LAB",
    owner: PEOPLE[0],
    os: "Windows",
    version: "11 24H2",
    encrypted: true,
    encryption: "BitLocker",
    lastSeen: "2 h ago",
    posture: "compliant",
  },
  {
    id: "d10",
    name: "MM-ECLARK-DESK",
    owner: PEOPLE[1],
    os: "macOS",
    version: "15.0.1",
    encrypted: true,
    encryption: "FileVault",
    lastSeen: "1 day ago",
    posture: "at-risk",
    issue: "Screen lock after 30 min",
  },
];

const columns: Column<Device>[] = [
  {
    id: "name",
    header: "Device",
    mono: true,
    sortValue: (d) => d.name,
    cell: (d) => (
      <a href={`#${d.id}`} className="text-fg no-underline hover:underline">
        {d.name}
      </a>
    ),
  },
  {
    id: "owner",
    header: "Owner",
    width: "22%",
    sortValue: (d) => d.owner,
    cell: (d) => (
      <span className="flex items-center gap-2">
        <Avatar name={d.owner} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{d.owner}</span>
          <span className="truncate text-2xs text-fg-muted">{emailOf(d.owner)}</span>
        </span>
      </span>
    ),
  },
  {
    id: "os",
    header: "OS",
    sortValue: (d) => d.os,
    cell: (d) => (
      <span className="whitespace-nowrap">
        {d.os} <span className="font-mono text-xs text-fg-muted">{d.version}</span>
      </span>
    ),
  },
  {
    id: "enc",
    header: "Disk encryption",
    cell: (d) =>
      d.encrypted ? <span className="text-xs text-success">{d.encryption}</span> : <span className="text-xs font-medium text-danger-text">Not encrypted</span>,
  },
  { id: "seen", header: "Last seen", cell: (d) => <span className="whitespace-nowrap text-fg-muted">{d.lastSeen}</span> },
  {
    id: "posture",
    header: "Posture",
    sortValue: (d) => ["compliant", "at-risk", "non-compliant"].indexOf(d.posture),
    cell: (d) => (
      <span className="flex flex-col items-start gap-0.5">
        <StatusBadge tone={POSTURE[d.posture].tone}>{POSTURE[d.posture].label}</StatusBadge>
        {d.issue && <span className="text-2xs text-fg-muted">{d.issue}</span>}
      </span>
    ),
  },
  {
    id: "vpn",
    header: "VPN allowed",
    align: "center",
    cell: (d) => (d.posture === "non-compliant" ? <Badge tone="danger">No</Badge> : <Badge tone="success">Yes</Badge>),
  },
];

const DEFAULT_SQL = `SELECT name, version, path
FROM apps
WHERE name LIKE '%Zoom%' AND version < '6.2.0';`;

interface QueryRow {
  id: string;
  device: string;
  name: string;
  version: string;
  path: string;
}

const queryResult: QueryRow[] = [
  { id: "q1", device: "MBP-ADAVIS", name: "zoom.us.app", version: "6.0.11", path: "/Applications/zoom.us.app" },
  { id: "q2", device: "MM-ECLARK-DESK", name: "zoom.us.app", version: "5.17.5", path: "/Applications/zoom.us.app" },
  { id: "q3", device: "MBA-ECLARK", name: "zoom.us.app", version: "6.1.6", path: "/Applications/zoom.us.app" },
];

const queryColumns: Column<QueryRow>[] = [
  { id: "device", header: "Device", mono: true, cell: (r) => r.device },
  { id: "name", header: "name", mono: true, cell: (r) => r.name },
  { id: "version", header: "version", mono: true, cell: (r) => r.version },
  { id: "path", header: "path", mono: true, cell: (r) => r.path },
];

function LiveQuery() {
  const id = useId();
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const run = () => {
    setState("running");
    setTimeout(() => setState("done"), 300);
  };
  return (
    <Panel title="Live query" description="osquery · runs on online devices only" actions={<Badge mono>macOS · 112 online</Badge>}>
      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={id} className="text-xs font-medium text-fg">
            SQL
          </label>
          <textarea
            id={id}
            value={sql}
            onChange={(e) => setSql(e.target.value)}
            rows={4}
            spellCheck={false}
            className="w-full resize-y rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-fg"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" icon={<Play aria-hidden />} loading={state === "running"} onClick={run}>
            Run
          </Button>
          <span role="status" className="text-xs text-fg-muted">
            {state === "running" ? "Running on 112 devices…" : state === "done" ? `${queryResult.length} rows from 112 devices · 1.8 s` : ""}
          </span>
        </div>
        {state === "done" ? (
          <div className="rounded-md border border-line">
            <DataTable label="Query results" columns={queryColumns} rows={queryResult} getRowId={(r) => r.id} minWidth={520} />
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-line py-4 text-center text-xs text-fg-muted">Run the query to see results</p>
        )}
      </div>
    </Panel>
  );
}

function Owner({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-2xs text-fg-muted">{emailOf(name)}</span>
      </span>
    </span>
  );
}

/* ---------------------------------------------------------------- Devices */

/** Devices: laptop and workstation inventory with posture that Access and VPN enforce. */
function DevicesPage() {
  const [posture, setPosture] = useState<string[]>([]);
  const [os, setOs] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const rows = devices.filter(
    (d) =>
      (posture.length === 0 || posture.includes(d.posture)) &&
      (os.length === 0 || os.includes(d.os)) &&
      (!q || `${d.name} ${d.owner}`.toLowerCase().includes(q.toLowerCase())),
  );
  return (
    <>
      <PageHeader
        title="Devices"
        description="186 devices · osquery 5.13 via fleet agent · checked every 15 min"
        meta={<StatusBadge tone="warning">14 non-compliant</StatusBadge>}
        actions={
          <Button size="md" variant="primary" icon={<Download aria-hidden />}>
            Enrol device
          </Button>
        }
      />
      <FilterBar
        onClear={
          posture.length || os.length || q
            ? () => {
                setPosture([]);
                setOs([]);
                setQ("");
              }
            : undefined
        }
      >
        <FacetFilter
          label="Posture"
          selected={posture}
          onChange={setPosture}
          options={(Object.keys(POSTURE) as Posture[]).map((p) => ({
            value: p,
            label: POSTURE[p].label,
            count: devices.filter((d) => d.posture === p).length,
          }))}
        />
        <FacetFilter
          label="OS"
          selected={os}
          onChange={setOs}
          options={["macOS", "Windows", "Ubuntu"].map((o) => ({ value: o, count: devices.filter((d) => d.os === o).length }))}
        />
        <SearchInput label="Search devices or owners" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Disk encrypted"
          value="97%"
          unit="181 of 186"
          trend={wave(12, { base: 95, amp: 2, seed: 51 })}
          delta={{ label: "+2 pts this month", direction: "up", intent: "good" }}
        />
        <KpiCard label="OS up to date" value="84%" unit="156 of 186" tone="warning" delta={{ label: "macOS 15.1 rollout in progress" }} />
        <KpiCard label="Screen lock ≤ 5 min" value="95%" unit="177 of 186" delta={{ label: "9 above policy", intent: "bad" }} />
        <KpiCard label="EDR running" value="98%" unit="183 of 186" delta={{ label: "3 silent for over 24 h", intent: "bad" }} />
      </KpiGrid>
      <Callout tone="info" title="Access and VPN deny non-compliant devices">
        Posture is checked at sign-in and every 15 minutes. A device that loses disk encryption or stops running EDR is disconnected from VPN and cannot open
        Access sessions until it is compliant again. At-risk devices get a 7-day grace period.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Devices" description={`${rows.length} of 186 shown`} flush>
          <DataTable
            label="Devices"
            columns={columns}
            rows={rows}
            getRowId={(d) => d.id}
            defaultSort={{ id: "posture", direction: "desc" }}
            minWidth={880}
            empty={<p className="py-8">No devices match these filters</p>}
          />
        </Panel>
        <LiveQuery />
      </div>
    </>
  );
}

/* ------------------------------------------------------------- Compliance */

interface Check {
  id: string;
  name: string;
  requirement: string;
  platforms: string;
  passing: number;
  failing: number;
  severity: "block" | "grace";
}

const CHECKS: Check[] = [
  {
    id: "c-enc",
    name: "Disk encryption",
    requirement: "FileVault, BitLocker or LUKS2 on the system disk",
    platforms: "All",
    passing: 181,
    failing: 5,
    severity: "block",
  },
  { id: "c-edr", name: "EDR running", requirement: "Agent reported in the last 24 h", platforms: "All", passing: 183, failing: 3, severity: "block" },
  {
    id: "c-os",
    name: "OS up to date",
    requirement: "macOS ≥ 15.0, Windows 11 ≥ 23H2, Ubuntu ≥ 22.04",
    platforms: "All",
    passing: 156,
    failing: 30,
    severity: "grace",
  },
  { id: "c-lock", name: "Screen lock", requirement: "Locks after 5 min or less", platforms: "All", passing: 177, failing: 9, severity: "grace" },
  { id: "c-fw", name: "Firewall on", requirement: "Application firewall or ufw enabled", platforms: "All", passing: 172, failing: 14, severity: "grace" },
  { id: "c-sip", name: "System integrity protection", requirement: "SIP enabled", platforms: "macOS", passing: 112, failing: 0, severity: "block" },
  { id: "c-boot", name: "Secure boot", requirement: "UEFI secure boot enabled", platforms: "Windows, Ubuntu", passing: 70, failing: 4, severity: "grace" },
];

interface Failing {
  id: string;
  device: string;
  owner: string;
  os: string;
  check: string;
  detail: string;
  since: string;
  grace: string;
  blocked: boolean;
}

const FAILING: Failing[] = [
  {
    id: "f1",
    device: "WIN-BORTIZ-02",
    owner: PEOPLE[4],
    os: "Windows 10 22H2",
    check: "Disk encryption",
    detail: "BitLocker off on C:",
    since: "3 days",
    grace: "None",
    blocked: true,
  },
  {
    id: "f2",
    device: "chris-xps",
    owner: PEOPLE[6],
    os: "Ubuntu 22.04",
    check: "EDR running",
    detail: "Last report 4 days ago",
    since: "4 days",
    grace: "None",
    blocked: true,
  },
  {
    id: "f3",
    device: "WIN-BORTIZ-02",
    owner: PEOPLE[4],
    os: "Windows 10 22H2",
    check: "OS up to date",
    detail: "Windows 10 below minimum",
    since: "12 days",
    grace: "Expired",
    blocked: true,
  },
  {
    id: "f4",
    device: "WIN-MWILSON-01",
    owner: PEOPLE[2],
    os: "Windows 11 23H2",
    check: "OS up to date",
    detail: "KB5044284 pending",
    since: "9 days",
    grace: "Ends in 2 days",
    blocked: false,
  },
  {
    id: "f5",
    device: "MBP-ADAVIS",
    owner: PEOPLE[5],
    os: "macOS 14.6",
    check: "OS up to date",
    detail: "macOS 15 available",
    since: "5 days",
    grace: "Ends in 2 days",
    blocked: false,
  },
  {
    id: "f6",
    device: "MM-ECLARK-DESK",
    owner: PEOPLE[1],
    os: "macOS 15.0.1",
    check: "Screen lock",
    detail: "Locks after 30 min",
    since: "1 day",
    grace: "Ends in 6 days",
    blocked: false,
  },
  {
    id: "f7",
    device: "chris-xps",
    owner: PEOPLE[6],
    os: "Ubuntu 22.04",
    check: "Firewall on",
    detail: "ufw inactive",
    since: "4 days",
    grace: "Ends in 3 days",
    blocked: false,
  },
  {
    id: "f8",
    device: "WIN-DKIM-LAB",
    owner: PEOPLE[0],
    os: "Windows 11 24H2",
    check: "Secure boot",
    detail: "Secure boot disabled in firmware",
    since: "2 h",
    grace: "Ends in 7 days",
    blocked: false,
  },
];

function CompliancePage() {
  const [check, setCheck] = useState<string | null>(null);
  const [notified, setNotified] = useState<string[]>([]);
  const rows = FAILING.filter((f) => !check || f.check === check);
  const checkCols: Column<Check>[] = [
    {
      id: "name",
      header: "Check",
      width: "36%",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="truncate text-2xs text-fg-muted">{c.requirement}</span>
        </span>
      ),
    },
    { id: "platforms", header: "Platforms", cell: (c) => <span className="text-xs">{c.platforms}</span> },
    {
      id: "pass",
      header: "Passing",
      align: "right",
      sortValue: (c) => c.passing / (c.passing + c.failing),
      cell: (c) => <span className="font-mono text-xs">{Math.round((c.passing / (c.passing + c.failing)) * 100)}%</span>,
    },
    {
      id: "failing",
      header: "Failing",
      align: "right",
      mono: true,
      sortValue: (c) => c.failing,
      cell: (c) => <span className={c.failing ? "text-danger-text" : "text-fg-muted"}>{c.failing}</span>,
    },
    {
      id: "sev",
      header: "On failure",
      description: "Block denies VPN and Access immediately. Grace gives the owner 7 days to fix it first.",
      cell: (c) => (c.severity === "block" ? <Badge tone="danger">Block</Badge> : <Badge tone="warning">7-day grace</Badge>),
    },
  ];
  const cols: Column<Failing>[] = [
    { id: "device", header: "Device", mono: true, sortValue: (f) => f.device, cell: (f) => f.device },
    { id: "owner", header: "Owner", width: "22%", sortValue: (f) => f.owner, cell: (f) => <Owner name={f.owner} /> },
    {
      id: "check",
      header: "Failing check",
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{f.check}</span>
          <span className="truncate text-2xs text-fg-muted">{f.detail}</span>
        </span>
      ),
    },
    { id: "since", header: "Failing for", cell: (f) => <span className="text-xs whitespace-nowrap">{f.since}</span> },
    { id: "grace", header: "Grace period", cell: (f) => <span className={f.blocked ? "text-xs text-danger-text" : "text-xs"}>{f.grace}</span> },
    {
      id: "access",
      header: "Access",
      cell: (f) => (f.blocked ? <StatusBadge tone="danger">Blocked</StatusBadge> : <StatusBadge tone="warning">Allowed</StatusBadge>),
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "110px",
      align: "right",
      hideable: false,
      cell: (f) =>
        notified.includes(f.id) ? (
          <span className="text-xs text-success">Notified</span>
        ) : (
          <Button size="xs" icon={<Bell />} aria-label={`Notify owner of ${f.device} about ${f.check}`} onClick={() => setNotified((n) => [...n, f.id])}>
            Notify
          </Button>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Compliance"
        description="Posture checks every device must pass, and the devices that fail them"
        meta={<StatusBadge tone="warning">172 of 186 compliant</StatusBadge>}
      />
      <KpiGrid>
        <KpiCard label="Compliant" value="92%" unit="172 of 186" tone="success" trend={wave(14, { base: 90, amp: 2, seed: 52 })} />
        <KpiCard label="Blocked from VPN and Access" value="3" unit="devices" tone="danger" delta={{ label: "2 since Friday", intent: "bad" }} />
        <KpiCard label="In grace period" value="11" unit="devices" tone="warning" delta={{ label: "4 expire within 48 h" }} />
        <KpiCard label="Median time to fix" value="1.8" unit="days" delta={{ label: "−0.6 vs. last month", direction: "down", intent: "good" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Posture checks" description="Select a check to see the devices failing it" flush>
          <DataTable
            label="Posture checks"
            columns={checkCols}
            rows={CHECKS}
            getRowId={(c) => c.id}
            onRowClick={(c) => setCheck(check === c.name ? null : c.name)}
            activeRowId={CHECKS.find((c) => c.name === check)?.id}
            minWidth={720}
          />
        </Panel>
        <Panel title="Compliance by OS" description="Devices per platform">
          <StackedBarChart
            label="Device compliance by operating system"
            categories={["macOS", "Windows", "Ubuntu"]}
            segments={[
              { id: "ok", name: "Compliant", color: TONE_COLORS.success },
              { id: "risk", name: "At risk", color: TONE_COLORS.warning },
              { id: "bad", name: "Non-compliant", color: TONE_COLORS.danger },
            ]}
            values={[
              [104, 7, 1],
              [41, 6, 1],
              [27, 0, 1],
            ]}
            height={180}
          />
        </Panel>
      </div>
      <Panel
        title="Failing devices"
        description={check ? `Failing “${check}”` : `${FAILING.length} failing checks on ${new Set(FAILING.map((f) => f.device)).size} devices`}
        actions={
          check ? (
            <Button size="sm" variant="ghost" onClick={() => setCheck(null)}>
              Show all checks
            </Button>
          ) : undefined
        }
        flush
      >
        <DataTable label="Failing devices" columns={cols} rows={rows} getRowId={(f) => f.id} minWidth={960} />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- Software */

interface Software {
  id: string;
  name: string;
  publisher: string;
  latest: string;
  installs: number;
  outdated: number;
  versions: Array<{ v: string; n: number }>;
  cves: Array<{ id: string; severity: Severity }>;
  category: string;
}

const SOFTWARE: Software[] = [
  {
    id: "s-chrome",
    name: "Google Chrome",
    publisher: "Google",
    latest: "130.0.6723.58",
    installs: 172,
    outdated: 21,
    versions: [
      { v: "130.0.6723.58", n: 151 },
      { v: "129.0.6668.100", n: 17 },
      { v: "128.0.6613.138", n: 4 },
    ],
    cves: [{ id: "CVE-2024-9602", severity: "high" }],
    category: "Browser",
  },
  {
    id: "s-zoom",
    name: "Zoom Workplace",
    publisher: "Zoom",
    latest: "6.2.5",
    installs: 148,
    outdated: 3,
    versions: [
      { v: "6.2.5", n: 145 },
      { v: "6.1.6", n: 1 },
      { v: "6.0.11", n: 1 },
      { v: "5.17.5", n: 1 },
    ],
    cves: [{ id: "CVE-2024-39825", severity: "critical" }],
    category: "Communication",
  },
  {
    id: "s-slack",
    name: "Slack",
    publisher: "Slack",
    latest: "4.41.97",
    installs: 183,
    outdated: 0,
    versions: [{ v: "4.41.97", n: 183 }],
    cves: [],
    category: "Communication",
  },
  {
    id: "s-docker",
    name: "Docker Desktop",
    publisher: "Docker",
    latest: "4.34.3",
    installs: 94,
    outdated: 38,
    versions: [
      { v: "4.34.3", n: 56 },
      { v: "4.33.0", n: 26 },
      { v: "4.29.0", n: 12 },
    ],
    cves: [
      { id: "CVE-2024-8695", severity: "critical" },
      { id: "CVE-2024-8696", severity: "high" },
    ],
    category: "Developer",
  },
  {
    id: "s-vscode",
    name: "Visual Studio Code",
    publisher: "Microsoft",
    latest: "1.94.2",
    installs: 121,
    outdated: 9,
    versions: [
      { v: "1.94.2", n: 112 },
      { v: "1.93.1", n: 9 },
    ],
    cves: [],
    category: "Developer",
  },
  {
    id: "s-firefox",
    name: "Firefox",
    publisher: "Mozilla",
    latest: "131.0.3",
    installs: 44,
    outdated: 6,
    versions: [
      { v: "131.0.3", n: 38 },
      { v: "130.0", n: 6 },
    ],
    cves: [{ id: "CVE-2024-9680", severity: "critical" }],
    category: "Browser",
  },
  {
    id: "s-7zip",
    name: "7-Zip",
    publisher: "Igor Pavlov",
    latest: "24.08",
    installs: 31,
    outdated: 12,
    versions: [
      { v: "24.08", n: 19 },
      { v: "23.01", n: 12 },
    ],
    cves: [{ id: "CVE-2024-11477", severity: "high" }],
    category: "Utility",
  },
  {
    id: "s-1pw",
    name: "1Password",
    publisher: "AgileBits",
    latest: "8.10.48",
    installs: 186,
    outdated: 2,
    versions: [
      { v: "8.10.48", n: 184 },
      { v: "8.10.44", n: 2 },
    ],
    cves: [],
    category: "Security",
  },
  {
    id: "s-node",
    name: "Node.js",
    publisher: "OpenJS Foundation",
    latest: "22.10.0",
    installs: 88,
    outdated: 27,
    versions: [
      { v: "22.10.0", n: 40 },
      { v: "20.18.0", n: 21 },
      { v: "18.20.4", n: 27 },
    ],
    cves: [{ id: "CVE-2024-27980", severity: "medium" }],
    category: "Developer",
  },
  {
    id: "s-teamviewer",
    name: "TeamViewer",
    publisher: "TeamViewer",
    latest: "15.58.5",
    installs: 2,
    outdated: 2,
    versions: [{ v: "15.48.4", n: 2 }],
    cves: [{ id: "CVE-2024-7479", severity: "high" }],
    category: "Remote access",
  },
];

function SoftwarePage() {
  const [tab, setTab] = useState<"all" | "outdated" | "vulnerable">("all");
  const [cat, setCat] = useState<string[]>([]);
  const [active, setActive] = useState("s-docker");
  const rows = SOFTWARE.filter(
    (s) =>
      (tab === "all" || (tab === "outdated" && s.outdated > 0) || (tab === "vulnerable" && s.cves.length > 0)) &&
      (cat.length === 0 || cat.includes(s.category)),
  );
  const cur = SOFTWARE.find((s) => s.id === active)!;
  const worst = (s: Software): Severity | null =>
    s.cves.some((c) => c.severity === "critical") ? "critical" : s.cves.some((c) => c.severity === "high") ? "high" : (s.cves[0]?.severity ?? null);
  const cols: Column<Software>[] = [
    {
      id: "name",
      header: "Application",
      width: "24%",
      pinned: "left",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{s.name}</span>
          <span className="truncate text-2xs text-fg-muted">
            {s.publisher} · {s.category}
          </span>
        </span>
      ),
    },
    { id: "installs", header: "Devices", align: "right", mono: true, sortValue: (s) => s.installs, cell: (s) => s.installs },
    { id: "versions", header: "Versions", align: "right", mono: true, sortValue: (s) => s.versions.length, cell: (s) => s.versions.length },
    { id: "latest", header: "Latest", mono: true, cell: (s) => s.latest },
    {
      id: "outdated",
      header: "Outdated",
      align: "right",
      description: "Devices not on the latest version.",
      sortValue: (s) => s.outdated,
      cell: (s) => <span className={s.outdated ? "font-mono text-warning-text" : "font-mono text-fg-muted"}>{s.outdated}</span>,
    },
    {
      id: "vulns",
      header: "Vulnerabilities",
      sortValue: (s) => (worst(s) ? ["low", "medium", "high", "critical"].indexOf(worst(s)!) + 1 : 0),
      cell: (s) => {
        const w = worst(s);
        return w ? (
          <span className="flex items-center gap-1.5">
            <SeverityBadge severity={w} />
            <span className="font-mono text-2xs text-fg-muted">{s.cves.map((c) => c.id).join(", ")}</span>
          </span>
        ) : (
          <span className="text-xs text-fg-muted">None known</span>
        );
      },
    },
  ];
  return (
    <>
      <PageHeader
        title="Software"
        description="Installed applications on every device, from osquery's apps, programs and deb_packages tables"
        actions={<Button icon={<Download />}>Export inventory</Button>}
      >
        <Tabs
          label="Software filter"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: SOFTWARE.length },
            { value: "outdated", label: "Outdated", count: SOFTWARE.filter((s) => s.outdated > 0).length },
            { value: "vulnerable", label: "Vulnerable", count: SOFTWARE.filter((s) => s.cves.length > 0).length },
          ]}
        />
      </PageHeader>
      <KpiGrid>
        <KpiCard label="Applications" value="1,412" unit="distinct titles" />
        <KpiCard label="Vulnerable installs" value="96" tone="danger" delta={{ label: "3 critical titles", intent: "bad" }} />
        <KpiCard label="Outdated installs" value="120" tone="warning" delta={{ label: "Docker Desktop is 38 of them" }} />
        <KpiCard label="Unapproved remote access" value="2" unit="TeamViewer" tone="warning" />
      </KpiGrid>
      <FilterBar onClear={cat.length ? () => setCat([]) : undefined}>
        <FacetFilter
          label="Category"
          selected={cat}
          onChange={setCat}
          options={[...new Set(SOFTWARE.map((s) => s.category))].map((c) => ({ value: c, count: SOFTWARE.filter((s) => s.category === c).length }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Inventory" description={`${rows.length} shown`} flush>
          <DataTable
            label="Software inventory"
            columns={cols}
            rows={rows}
            getRowId={(s) => s.id}
            onRowClick={(s) => setActive(s.id)}
            activeRowId={active}
            defaultSort={{ id: "vulns", direction: "desc" }}
            minWidth={900}
          />
        </Panel>
        <Panel title={cur.name} description={`Versions installed · latest ${cur.latest}`} aria-label="Software detail">
          <div className="flex flex-col gap-3">
            <BarList
              label={`${cur.name} versions`}
              items={cur.versions.map((v) => ({ id: v.v, label: v.v, value: v.n, color: v.v === cur.latest ? TONE_COLORS.success : TONE_COLORS.warning }))}
            />
            <Button size="sm" icon={<Terminal />}>
              Query devices with old versions
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Queries */

interface SavedQuery {
  id: string;
  name: string;
  description: string;
  sql: string;
  schedule: string;
  platforms: string;
  lastRun: string;
  rows: number;
  author: string;
}

const SAVED: SavedQuery[] = [
  {
    id: "sq-zoom",
    name: "Outdated Zoom",
    description: "Zoom below 6.2.0",
    sql: DEFAULT_SQL,
    schedule: "Hourly",
    platforms: "macOS",
    lastRun: "14 min ago",
    rows: 3,
    author: PEOPLE[1],
  },
  {
    id: "sq-usb",
    name: "USB storage devices",
    description: "Removable disks connected now",
    sql: "SELECT vendor, model, serial\nFROM usb_devices\nWHERE removable = 1;",
    schedule: "Every 15 min",
    platforms: "All",
    lastRun: "6 min ago",
    rows: 4,
    author: PEOPLE[3],
  },
  {
    id: "sq-ssh",
    name: "SSH keys without passphrase",
    description: "Private keys readable by the user",
    sql: "SELECT path, encrypted\nFROM user_ssh_keys\nWHERE encrypted = 0;",
    schedule: "Daily",
    platforms: "macOS, Ubuntu",
    lastRun: "3 h ago",
    rows: 11,
    author: PEOPLE[7],
  },
  {
    id: "sq-admin",
    name: "Local admin accounts",
    description: "Members of admin or Administrators",
    sql: "SELECT u.username, g.groupname\nFROM users u JOIN user_groups ug USING (uid)\nJOIN groups g USING (gid)\nWHERE g.groupname IN ('admin', 'Administrators');",
    schedule: "Daily",
    platforms: "All",
    lastRun: "3 h ago",
    rows: 27,
    author: PEOPLE[1],
  },
  {
    id: "sq-ext",
    name: "Browser extensions",
    description: "Chrome extensions with broad permissions",
    sql: "SELECT name, identifier, permissions\nFROM chrome_extensions\nWHERE permissions LIKE '%<all_urls>%';",
    schedule: "Daily",
    platforms: "All",
    lastRun: "3 h ago",
    rows: 19,
    author: PEOPLE[5],
  },
  {
    id: "sq-listen",
    name: "Listening ports",
    description: "Processes listening on all interfaces",
    sql: "SELECT p.name, l.port, l.address\nFROM listening_ports l JOIN processes p USING (pid)\nWHERE l.address = '0.0.0.0';",
    schedule: "Manual",
    platforms: "All",
    lastRun: "Yesterday",
    rows: 58,
    author: PEOPLE[2],
  },
];

const USB_ROWS = [
  { id: "u1", device: "MBP-DKIM-14", c1: "SanDisk", c2: "Ultra Fit", c3: "4C530001" },
  { id: "u2", device: "WIN-MWILSON-01", c1: "Kingston", c2: "DataTraveler 3.0", c3: "E0D55EA5" },
  { id: "u3", device: "WIN-BORTIZ-02", c1: "Samsung", c2: "T7 Shield", c3: "S6WTNS0T" },
  { id: "u4", device: "sarah-thinkpad", c1: "Yubico", c2: "YubiKey 5C", c3: "21934117" },
];

function QueriesPage() {
  const editor = useId();
  const [active, setActive] = useState("sq-zoom");
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [state, setState] = useState<"idle" | "running" | "done">("idle");
  const [target, setTarget] = useState("online");
  const q = SAVED.find((s) => s.id === active)!;
  const load = (s: SavedQuery) => {
    setActive(s.id);
    setSql(s.sql);
    setState("idle");
  };
  const results = active === "sq-usb" ? USB_ROWS : queryResult.map((r) => ({ id: r.id, device: r.device, c1: r.name, c2: r.version, c3: r.path }));
  const heads = active === "sq-usb" ? ["vendor", "model", "serial"] : ["name", "version", "path"];
  const cols: Column<SavedQuery>[] = [
    {
      id: "name",
      header: "Query",
      width: "34%",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{s.name}</span>
          <span className="truncate text-2xs text-fg-muted">{s.description}</span>
        </span>
      ),
    },
    { id: "schedule", header: "Schedule", cell: (s) => <Badge tone={s.schedule === "Manual" ? "neutral" : "info"}>{s.schedule}</Badge> },
    { id: "platforms", header: "Platforms", cell: (s) => <span className="text-xs">{s.platforms}</span> },
    { id: "rows", header: "Last rows", align: "right", mono: true, sortValue: (s) => s.rows, cell: (s) => s.rows },
    { id: "last", header: "Last run", cell: (s) => <span className="text-xs whitespace-nowrap text-fg-muted">{s.lastRun}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Queries"
        description="osquery SQL across the fleet · saved queries run on a schedule and feed Logs and SIEM"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New query
          </Button>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Saved queries" description="Select one to load it into the editor" flush>
          <DataTable label="Saved queries" columns={cols} rows={SAVED} getRowId={(s) => s.id} onRowClick={load} activeRowId={active} minWidth={620} />
        </Panel>
        <Panel title={q.name} description={`by ${q.author} · ${q.platforms}`} aria-label="Query editor">
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor={editor} className="text-xs font-medium text-fg">
                Query SQL
              </label>
              <textarea
                id={editor}
                value={sql}
                onChange={(e) => setSql(e.target.value)}
                rows={5}
                spellCheck={false}
                className="w-full resize-y rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-fg"
              />
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <SelectField
                label="Run on"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                options={[
                  { value: "online", label: "All online devices (171)" },
                  { value: "macos", label: "macOS (112)" },
                  { value: "noncompliant", label: "Non-compliant devices (14)" },
                ]}
              />
              <Button
                variant="primary"
                icon={<Play aria-hidden />}
                loading={state === "running"}
                onClick={() => {
                  setState("running");
                  setTimeout(() => setState("done"), 250);
                }}
              >
                Run live
              </Button>
              <Button icon={<Save />}>Save</Button>
            </div>
            <span role="status" className="text-xs text-fg-muted">
              {state === "running" ? "Running…" : state === "done" ? `${results.length} rows · 171 of 171 devices answered · 2.1 s` : ""}
            </span>
            {state === "done" && (
              <div className="rounded-md border border-line">
                <DataTable
                  label="Live results"
                  rows={results}
                  getRowId={(r) => r.id}
                  minWidth={520}
                  columns={[
                    { id: "device", header: "Device", mono: true, cell: (r) => r.device },
                    { id: "c1", header: heads[0]!, mono: true, cell: (r) => r.c1 },
                    { id: "c2", header: heads[1]!, mono: true, cell: (r) => r.c2 },
                    { id: "c3", header: heads[2]!, mono: true, cell: (r) => r.c3 },
                  ]}
                />
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- Policies */

const EXCEPTIONS = [
  { id: "x1", device: "WIN-DKIM-LAB", check: "Secure boot", reason: "Hardware test bench, isolated VLAN", approver: PEOPLE[1], expires: "Dec 31" },
  { id: "x2", device: "build-mac-mini-03", check: "Screen lock", reason: "Unattended CI runner in locked rack", approver: PEOPLE[7], expires: "Mar 1" },
  { id: "x3", device: "kiosk-lobby-01", check: "OS up to date", reason: "Vendor-certified image, upgrade with vendor", approver: PEOPLE[1], expires: "Nov 30" },
];

function PoliciesPage() {
  const [enforce, setEnforce] = useState({ vpn: true, access: true, identity: false });
  const [saved, setSaved] = useState("");
  const [macMin, setMacMin] = useState("15.0");
  return (
    <>
      <PageHeader title="Policies" description="What a compliant device looks like, and what happens when one is not" />
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(`Policy saved · macOS minimum ${macMin} · re-evaluating 186 devices`);
        }}
      >
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title="Requirements" description="Default policy · applies to all devices">
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 md:grid-cols-3">
                <SelectField
                  label="Minimum macOS"
                  value={macMin}
                  onChange={(e) => setMacMin(e.target.value)}
                  options={[
                    { value: "14.0", label: "macOS 14 Sonoma" },
                    { value: "15.0", label: "macOS 15.0 Sequoia" },
                    { value: "15.1", label: "macOS 15.1" },
                  ]}
                />
                <SelectField
                  label="Minimum Windows"
                  defaultValue="23H2"
                  options={[
                    { value: "22H2", label: "Windows 11 22H2" },
                    { value: "23H2", label: "Windows 11 23H2" },
                    { value: "24H2", label: "Windows 11 24H2" },
                  ]}
                />
                <SelectField
                  label="Minimum Ubuntu"
                  defaultValue="22.04"
                  options={[
                    { value: "22.04", label: "22.04 LTS" },
                    { value: "24.04", label: "24.04 LTS" },
                  ]}
                />
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                <Checkbox label="Disk encryption required" description="FileVault, BitLocker or LUKS2" defaultChecked />
                <Checkbox label="EDR must report every 24 h" defaultChecked />
                <Checkbox label="Firewall enabled" defaultChecked />
                <Checkbox label="Secure boot (Windows, Ubuntu)" defaultChecked />
                <Checkbox label="Screen lock within 5 minutes" defaultChecked />
                <Checkbox label="No unapproved remote access tools" description="TeamViewer, AnyDesk outside the IT group" />
              </div>
              <SelectField
                label="Grace period for non-critical checks"
                defaultValue="7"
                options={[
                  { value: "0", label: "None" },
                  { value: "3", label: "3 days" },
                  { value: "7", label: "7 days" },
                  { value: "14", label: "14 days" },
                ]}
              />
            </div>
          </Panel>
          <Panel title="Enforcement" description="Where a non-compliant device is refused">
            <div className="flex flex-col gap-3">
              <Switch
                checked={enforce.vpn}
                onCheckedChange={(v) => setEnforce((s) => ({ ...s, vpn: v }))}
                label="VPN"
                description="Disconnect and refuse new tunnels"
              />
              <Switch
                checked={enforce.access}
                onCheckedChange={(v) => setEnforce((s) => ({ ...s, access: v }))}
                label="Access"
                description="Refuse database and SSH sessions"
              />
              <Switch
                checked={enforce.identity}
                onCheckedChange={(v) => setEnforce((s) => ({ ...s, identity: v }))}
                label="Identity sign-in"
                description="Refuse SSO to every application"
              />
              <Callout tone="info" title="Owners are told first">
                The device owner gets an email and a desktop notification with fix instructions before access is removed.
              </Callout>
            </div>
          </Panel>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" variant="primary" icon={<ShieldCheck />}>
            Save policy
          </Button>
          {saved && (
            <span role="status" className="text-xs text-success">
              {saved}
            </span>
          )}
        </div>
      </form>
      <Panel title="Exceptions" description="Approved deviations with an expiry date" flush>
        <DataTable
          label="Policy exceptions"
          rows={EXCEPTIONS}
          getRowId={(x) => x.id}
          minWidth={760}
          columns={[
            { id: "device", header: "Device", mono: true, cell: (x) => x.device },
            { id: "check", header: "Check", cell: (x) => x.check },
            { id: "reason", header: "Reason", width: "34%", cell: (x) => <span className="text-xs">{x.reason}</span> },
            { id: "approver", header: "Approved by", cell: (x) => <Owner name={x.approver} /> },
            { id: "expires", header: "Expires", cell: (x) => <span className="text-xs">{x.expires}</span> },
          ]}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ app */

const PAGES = {
  devices: () => <DevicesPage />,
  compliance: () => <CompliancePage />,
  software: () => <SoftwarePage />,
  queries: () => <QueriesPage />,
  policies: () => <PoliciesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="endpoints" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

/** Devices: laptop and workstation inventory with posture that Access and VPN enforce. */
export const Devices: Story = {
  ...app("devices"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Devices" })).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Devices" })).getAllByRole("row")).toHaveLength(devices.length + 1);
    await expect(c.getByRole("textbox", { name: "SQL" })).toHaveValue(DEFAULT_SQL);
    await expect(c.queryByRole("table", { name: "Query results" })).not.toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Run" }));
    const results = await c.findByRole("table", { name: "Query results" });
    await expect(within(results).getAllByRole("row")).toHaveLength(queryResult.length + 1);
    await expect(within(results).getByText("5.17.5")).toBeInTheDocument();
    await expect(c.getByText(/3 rows from 112 devices/)).toBeInTheDocument();
  },
};

export const Compliance: Story = {
  ...app("compliance"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const failing = c.getByRole("table", { name: "Failing devices" });
    await expect(within(failing).getAllByRole("row")).toHaveLength(FAILING.length + 1);
    await userEvent.click(within(c.getByRole("table", { name: "Posture checks" })).getByText("OS up to date"));
    await expect(within(failing).getAllByRole("row")).toHaveLength(FAILING.filter((f) => f.check === "OS up to date").length + 1);
    await userEvent.click(within(failing).getByRole("button", { name: "Notify owner of MBP-ADAVIS about OS up to date" }));
    await expect(within(failing).getByText("Notified")).toBeInTheDocument();
  },
};

export const SoftwareInventory: Story = {
  name: "Software",
  ...app("software"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Software inventory" });
    await userEvent.click(c.getByRole("tab", { name: /Vulnerable/ }));
    await expect(within(table).getAllByRole("row")).toHaveLength(SOFTWARE.filter((s) => s.cves.length > 0).length + 1);
    await expect(within(table).queryByText("Slack")).not.toBeInTheDocument();
    await userEvent.click(within(table).getByText("Zoom Workplace"));
    await expect(c.getByRole("region", { name: "Software detail" })).toHaveTextContent("5.17.5");
  },
};

export const Queries: Story = {
  ...app("queries"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Saved queries" })).getByText("USB storage devices"));
    await expect(c.getByRole("textbox", { name: "Query SQL" })).toHaveValue(SAVED[1]!.sql);
    await userEvent.click(c.getByRole("button", { name: "Run live" }));
    const results = await c.findByRole("table", { name: "Live results" });
    await expect(within(results).getAllByRole("row")).toHaveLength(USB_ROWS.length + 1);
    await expect(results).toHaveTextContent("YubiKey 5C");
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Minimum macOS" }), "15.1");
    await userEvent.click(c.getByRole("switch", { name: /Identity sign-in/ }));
    await userEvent.click(c.getByRole("button", { name: "Save policy" }));
    await expect(c.getByText(/Policy saved · macOS minimum 15\.1/)).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
