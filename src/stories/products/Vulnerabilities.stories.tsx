import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowUpCircle, Boxes, Download, FileCode2, ListChecks, Play, Plus, Server, ShieldCheck, ShieldOff, TriangleAlert, X } from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { Callout } from "../../components/Callout";
import { Avatar } from "../../components/Avatar";
import { SegmentedControl } from "../../components/SegmentedControl";
import { BarList } from "../../charts/BarList";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Tabs } from "../../components/Tabs";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, Switch } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
import { HOSTS, PEOPLE, emailOf, wave } from "../mocks";

const nav = [
  { id: "findings", label: "Findings", icon: TriangleAlert, count: 214 },
  { id: "hosts", label: "Hosts", icon: Server, count: 48 },
  { id: "images", label: "Images", icon: Boxes, count: 61 },
  { id: "sbom", label: "SBOM", icon: FileCode2 },
  { id: "policies", label: "Policies", icon: ListChecks, count: 4 },
  { id: "exceptions", label: "Exceptions", icon: ShieldOff, count: 9 },
];

const meta = {
  title: "Products/Vulnerabilities",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Tag = "Exploited" | "Internet-facing" | "Running" | "No fix yet";
const TAG_TONE: Record<Tag, Tone> = { Exploited: "danger", "Internet-facing": "warning", Running: "info", "No fix yet": "neutral" };

interface Finding {
  id: string;
  severity: Severity;
  cvss: number;
  title: string;
  pkg: string;
  installed: string;
  fixed?: string;
  hosts: number;
  images: number;
  epss: number;
  tags: Tag[];
  summary: string;
  where: string[];
}

const findings: Finding[] = [
  {
    id: "CVE-2024-6387",
    severity: "critical",
    cvss: 8.1,
    title: "regreSSHion: unauthenticated RCE in sshd signal handler",
    pkg: "openssh-server",
    installed: "1:9.6p1-3ubuntu13",
    fixed: "1:9.6p1-3ubuntu13.3",
    hosts: 14,
    images: 0,
    epss: 0.957,
    tags: ["Exploited", "Internet-facing", "Running"],
    summary: "A race condition in sshd's SIGALRM handler lets a remote attacker run code as root on glibc-based Linux. Public exploits exist.",
    where: [HOSTS[0], HOSTS[1], HOSTS[2], HOSTS[7]],
  },
  {
    id: "CVE-2024-3094",
    severity: "critical",
    cvss: 10,
    title: "xz-utils backdoor in liblzma via build scripts",
    pkg: "xz-utils",
    installed: "5.6.0-0.2",
    fixed: "5.6.1+really5.4.5-1",
    hosts: 2,
    images: 3,
    epss: 0.861,
    tags: ["Exploited", "Running"],
    summary: "Malicious code in the upstream tarballs of xz 5.6.0 and 5.6.1 hooks RSA_public_decrypt in sshd through liblzma.",
    where: [HOSTS[3], HOSTS[4]],
  },
  {
    id: "CVE-2023-4911",
    severity: "high",
    cvss: 7.8,
    title: "Looney Tunables: buffer overflow in glibc ld.so GLIBC_TUNABLES",
    pkg: "libc6",
    installed: "2.35-0ubuntu3.1",
    fixed: "2.35-0ubuntu3.4",
    hosts: 9,
    images: 17,
    epss: 0.712,
    tags: ["Exploited", "Running"],
    summary: "A local user can gain root by passing a crafted GLIBC_TUNABLES variable to a setuid binary.",
    where: [HOSTS[5], HOSTS[6]],
  },
  {
    id: "CVE-2023-44487",
    severity: "high",
    cvss: 7.5,
    title: "HTTP/2 Rapid Reset denial of service in nginx",
    pkg: "nginx",
    installed: "1.24.0-1",
    fixed: "1.25.3-1",
    hosts: 4,
    images: 6,
    epss: 0.823,
    tags: ["Exploited", "Internet-facing", "Running"],
    summary: "Clients can open and cancel streams faster than the server frees them, exhausting workers. Seen at record scale in 2023.",
    where: [HOSTS[7], HOSTS[0]],
  },
  {
    id: "CVE-2024-2961",
    severity: "high",
    cvss: 7.3,
    title: "glibc iconv() out-of-bounds write in ISO-2022-CN-EXT",
    pkg: "libc6",
    installed: "2.35-0ubuntu3.6",
    fixed: "2.35-0ubuntu3.7",
    hosts: 9,
    images: 22,
    epss: 0.344,
    tags: ["Running"],
    summary: "Converting to ISO-2022-CN-EXT can write up to 4 bytes past the output buffer; reachable from PHP filter chains.",
    where: [HOSTS[1], HOSTS[2]],
  },
  {
    id: "CVE-2024-28182",
    severity: "medium",
    cvss: 5.3,
    title: "nghttp2 unbounded CONTINUATION frames",
    pkg: "libnghttp2-14",
    installed: "1.43.0-1ubuntu0.1",
    hosts: 11,
    images: 9,
    epss: 0.021,
    tags: ["Internet-facing", "No fix yet"],
    summary: "An attacker can keep sending CONTINUATION frames and make the library read headers without limit. No fixed package in this release yet.",
    where: [HOSTS[0], HOSTS[3]],
  },
];

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

const findingColumns = (open: (f: Finding) => void): Column<Finding>[] => [
  { id: "sev", header: "Severity", width: "100px", sortValue: (f) => SEVERITY_META[f.severity].rank, cell: (f) => <SeverityBadge severity={f.severity} /> },
  {
    id: "cve",
    header: "Vulnerability",
    width: "32%",
    sortValue: (f) => f.id,
    cell: (f) => (
      <span className="flex min-w-0 flex-col">
        <button type="button" onClick={() => open(f)} className="self-start font-mono text-xs font-medium text-fg hover:underline">
          {f.id}
        </button>
        <span className="truncate text-xs text-fg-muted">{f.title}</span>
      </span>
    ),
  },
  {
    id: "pkg",
    header: "Package",
    cell: (f) => (
      <span className="flex min-w-0 flex-col font-mono text-xs">
        <span className="truncate font-medium">{f.pkg}</span>
        <span className="truncate text-2xs text-fg-muted">
          {f.installed} → {f.fixed ? <span className="text-success">{f.fixed}</span> : "no fix"}
        </span>
      </span>
    ),
  },
  {
    id: "affected",
    header: "Affected",
    align: "right",
    sortValue: (f) => f.hosts + f.images,
    cell: (f) => (
      <span className="whitespace-nowrap">
        {f.hosts} hosts · {f.images} images
      </span>
    ),
  },
  { id: "epss", header: "EPSS", align: "right", mono: true, sortValue: (f) => f.epss, cell: (f) => pct(f.epss) },
  {
    id: "tags",
    header: "Context",
    cell: (f) => (
      <span className="flex flex-wrap gap-1">
        {f.tags.map((t) => (
          <Badge key={t} tone={TAG_TONE[t]}>
            {t}
          </Badge>
        ))}
      </span>
    ),
  },
];

const DAYS = 30;
const dayLabels = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 20 + i));
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", timeZone: "UTC" });
});

/** Rank: known exploited first, then EPSS. */
const exploitRank = (f: Finding) => (f.tags.includes("Exploited") ? 10 : 0) + f.epss;

type TabId = "fix" | "hosts" | "images" | "accepted";

/** Findings ranked by exploitation, with a detail panel for the selected CVE. */
function FindingsPage() {
  const [range, setRange] = useState("30d");
  const [tab, setTab] = useState<TabId>("fix");
  const [sev, setSev] = useState<string[]>([]);
  const [open, setOpen] = useState<Finding | null>(null);
  const rows = findings.filter((f) => sev.length === 0 || sev.includes(f.severity));
  return (
    <>
      <PageHeader
        title="Findings"
        description="48 hosts · 61 images · feeds updated 14 min ago (NVD, OSV, CISA KEV, EPSS)"
        actions={
          <>
            <SearchInput label="Search CVE, package or host" shortcut="/" className="w-64" />
            <Button size="md" variant="primary" icon={<Play />}>
              Scan now
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
          options={[
            { value: "critical", label: "Critical", count: 7 },
            { value: "high", label: "High", count: 38 },
            { value: "medium", label: "Medium", count: 121 },
            { value: "low", label: "Low", count: 48 },
          ]}
        />
      </FilterBar>
      <KpiGrid minWidth={150}>
        <KpiCard label="Exploited (KEV)" value="3" unit="CVEs" tone="danger" delta={{ label: "+1 added to KEV this week", direction: "up", intent: "bad" }} />
        <KpiCard
          label="Critical"
          value="7"
          footer={<SeverityBadge severity="critical" />}
          delta={{ label: "−2 vs. last week", direction: "down", intent: "good" }}
        />
        <KpiCard label="High" value="38" footer={<SeverityBadge severity="high" />} delta={{ label: "+4 vs. last week", direction: "up", intent: "bad" }} />
        <KpiCard
          label="Medium"
          value="121"
          footer={<SeverityBadge severity="medium" />}
          delta={{ label: "−9 vs. last week", direction: "down", intent: "good" }}
        />
        <KpiCard label="Low" value="48" footer={<SeverityBadge severity="low" />} delta={{ label: "No change" }} />
      </KpiGrid>
      <Panel title="Open findings" description="By severity, last 30 days">
        <TimeSeriesChart
          label="Open vulnerability findings by severity over 30 days"
          labels={dayLabels}
          stacked
          height={180}
          xTicks={6}
          series={[
            { id: "critical", name: "Critical", color: "var(--oa-critical)", data: wave(DAYS, { base: 9, amp: 2, seed: 11 }).map(Math.round) },
            { id: "high", name: "High", color: "var(--oa-danger)", data: wave(DAYS, { base: 40, amp: 5, seed: 12 }).map(Math.round) },
            { id: "medium", name: "Medium", color: "var(--oa-warning)", data: wave(DAYS, { base: 126, amp: 10, seed: 13 }).map(Math.round) },
            { id: "low", name: "Low", color: "var(--oa-seq-2)", data: wave(DAYS, { base: 50, amp: 4, seed: 14 }).map(Math.round) },
          ]}
        />
      </Panel>
      <Tabs<TabId>
        label="Finding views"
        value={tab}
        onChange={setTab}
        items={[
          { value: "fix", label: "Fix first", count: findings.length },
          { value: "hosts", label: "Hosts", count: 48 },
          { value: "images", label: "Images", count: 61 },
          { value: "accepted", label: "Accepted risk", count: 9 },
        ]}
      />
      <div className={open ? "grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]" : "grid gap-2.5"}>
        <Panel title="Fix first" description="Ranked by known exploitation, then EPSS probability" flush>
          <DataTable
            label="Vulnerability findings"
            columns={findingColumns(setOpen)}
            rows={[...rows].sort((a, b) => exploitRank(b) - exploitRank(a))}
            getRowId={(f) => f.id}
            onRowClick={setOpen}
            activeRowId={open?.id}
            minWidth={960}
          />
        </Panel>
        {open && (
          <Panel
            aria-label={`${open.id} details`}
            title={open.id}
            description={open.title}
            actions={
              <IconButton label="Close details" size="sm" onClick={() => setOpen(null)}>
                <X />
              </IconButton>
            }
            footer={
              <span className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="primary">
                  Create fix ticket
                </Button>
                <Button size="sm" icon={<ShieldCheck />}>
                  Accept risk
                </Button>
              </span>
            }
          >
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={open.severity} />
                <Badge mono>CVSS {open.cvss.toFixed(1)}</Badge>
                <Badge mono>EPSS {pct(open.epss)}</Badge>
                {open.tags.includes("Exploited") && <StatusBadge tone="danger">In CISA KEV</StatusBadge>}
              </div>
              <p className="text-fg-muted">{open.summary}</p>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                <dt className="text-fg-muted">Package</dt>
                <dd className="font-mono">{open.pkg}</dd>
                <dt className="text-fg-muted">Installed</dt>
                <dd className="font-mono">{open.installed}</dd>
                <dt className="text-fg-muted">Fixed in</dt>
                <dd className="font-mono">{open.fixed ?? "Not yet available"}</dd>
                <dt className="text-fg-muted">Affected</dt>
                <dd>
                  {open.hosts} hosts · {open.images} images
                </dd>
              </dl>
              <div className="flex flex-col gap-1">
                <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Where</span>
                <span className="flex flex-wrap gap-1">
                  {open.where.map((h) => (
                    <EntityChip key={h} kind="host" value={h} href="#host" />
                  ))}
                </span>
              </div>
              {open.fixed && (
                <pre className="overflow-x-auto rounded-md bg-subtle px-2.5 py-2 font-mono text-xs text-fg">
                  apt-get install --only-upgrade {open.pkg}={open.fixed}
                </pre>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

const findingsPlay: Story["play"] = async ({ canvasElement }) => {
  const c = within(canvasElement);
  await expect(c.getByRole("heading", { level: 1, name: "Findings" })).toBeInTheDocument();
  const table = c.getByRole("table", { name: "Vulnerability findings" });
  const rows = within(table).getAllByRole("row");
  await expect(rows[1]).toHaveTextContent("CVE-2024-6387");
  await expect(rows[rows.length - 1]).toHaveTextContent("No fix yet");

  await userEvent.click(within(table).getByText("CVE-2024-3094"));
  const detail = c.getByRole("region", { name: "CVE-2024-3094 details" });
  await expect(within(detail).getByText("xz-utils")).toBeInTheDocument();
  await expect(within(detail).getByText("In CISA KEV")).toBeInTheDocument();
  await userEvent.click(within(detail).getByRole("button", { name: "Close details" }));
  await expect(c.queryByRole("region", { name: "CVE-2024-3094 details" })).not.toBeInTheDocument();

  await userEvent.click(c.getByRole("tab", { name: /Accepted risk/ }));
  await expect(c.getByRole("tab", { name: /Accepted risk/ })).toHaveAttribute("aria-selected", "true");
};

/* ------------------------------------------------------------------ */
/* Shared pieces                                                       */
/* ------------------------------------------------------------------ */

/** Critical / high / medium / low counts. */
type Counts = [number, number, number, number];
const SEV4 = ["critical", "high", "medium", "low"] as const;

/** Compact severity counts; each badge carries the full name for screen readers. */
function SevCounts({ counts }: { counts: Counts }) {
  return (
    <span className="flex flex-wrap gap-1">
      {SEV4.map((s, i) => (
        <Badge key={s} tone={counts[i] ? SEVERITY_META[s].tone : "neutral"} mono className="min-w-8 justify-center">
          <span aria-hidden>{SEVERITY_META[s].label[0]}</span>
          <span className="sr-only">{SEVERITY_META[s].label}</span> {counts[i]}
        </Badge>
      ))}
    </span>
  );
}

const sumCounts = (c: Counts) => c[0] * 1000 + c[1] * 100 + c[2] * 10 + c[3];

/* ------------------------------------------------------------------ */
/* Hosts                                                               */
/* ------------------------------------------------------------------ */

interface Host {
  id: string;
  os: string;
  kernel: string;
  internet: boolean;
  kev: number;
  counts: Counts;
  lastScan: string;
  agent: { version: string; ok: boolean };
  ip: string;
  owner: string;
  top: string[];
}

const HOST_ROWS: Host[] = [
  {
    id: HOSTS[0],
    os: "Ubuntu 24.04 LTS",
    kernel: "6.8.0-45-generic",
    internet: true,
    kev: 2,
    counts: [2, 4, 11, 3],
    lastScan: "6 min ago",
    agent: { version: "2.9.1", ok: true },
    ip: "203.0.113.24",
    owner: "Platform",
    top: ["CVE-2024-6387", "CVE-2023-44487", "CVE-2024-28182"],
  },
  {
    id: HOSTS[1],
    os: "Ubuntu 24.04 LTS",
    kernel: "6.8.0-45-generic",
    internet: true,
    kev: 1,
    counts: [1, 5, 9, 2],
    lastScan: "6 min ago",
    agent: { version: "2.9.1", ok: true },
    ip: "203.0.113.181",
    owner: "Platform",
    top: ["CVE-2024-6387", "CVE-2024-2961"],
  },
  {
    id: HOSTS[2],
    os: "Ubuntu 24.04 LTS",
    kernel: "6.8.0-41-generic",
    internet: true,
    kev: 1,
    counts: [1, 4, 10, 4],
    lastScan: "7 min ago",
    agent: { version: "2.9.1", ok: true },
    ip: "198.51.100.7",
    owner: "Platform",
    top: ["CVE-2024-6387", "CVE-2024-2961"],
  },
  {
    id: HOSTS[3],
    os: "Debian 12",
    kernel: "6.1.0-25-amd64",
    internet: false,
    kev: 1,
    counts: [1, 2, 8, 6],
    lastScan: "12 min ago",
    agent: { version: "2.9.0", ok: true },
    ip: "10.20.4.13",
    owner: "Data",
    top: ["CVE-2024-3094", "CVE-2024-28182"],
  },
  {
    id: HOSTS[4],
    os: "Debian 12",
    kernel: "6.1.0-25-amd64",
    internet: false,
    kev: 1,
    counts: [1, 3, 7, 5],
    lastScan: "12 min ago",
    agent: { version: "2.9.0", ok: true },
    ip: "10.20.4.19",
    owner: "Data",
    top: ["CVE-2024-3094"],
  },
  {
    id: HOSTS[5],
    os: "Rocky Linux 9.4",
    kernel: "5.14.0-427.el9",
    internet: false,
    kev: 1,
    counts: [0, 6, 14, 2],
    lastScan: "41 min ago",
    agent: { version: "2.8.4", ok: true },
    ip: "10.20.8.5",
    owner: "Database",
    top: ["CVE-2023-4911"],
  },
  {
    id: HOSTS[6],
    os: "Rocky Linux 9.4",
    kernel: "5.14.0-427.el9",
    internet: false,
    kev: 1,
    counts: [0, 6, 13, 2],
    lastScan: "3 days ago",
    agent: { version: "2.7.2", ok: false },
    ip: "10.20.8.6",
    owner: "Database",
    top: ["CVE-2023-4911"],
  },
  {
    id: HOSTS[7],
    os: "Ubuntu 22.04 LTS",
    kernel: "5.15.0-122-generic",
    internet: true,
    kev: 2,
    counts: [1, 3, 6, 1],
    lastScan: "6 min ago",
    agent: { version: "2.9.1", ok: true },
    ip: "198.51.100.96",
    owner: "Edge",
    top: ["CVE-2023-44487", "CVE-2024-6387"],
  },
  {
    id: "bastion-01",
    os: "Amazon Linux 2023",
    kernel: "6.1.109-118.189",
    internet: true,
    kev: 0,
    counts: [0, 1, 3, 0],
    lastScan: "18 min ago",
    agent: { version: "2.9.1", ok: true },
    ip: "192.0.2.44",
    owner: "Security",
    top: ["CVE-2024-28182"],
  },
  {
    id: "ci-runner-02",
    os: "Ubuntu 22.04 LTS",
    kernel: "5.15.0-119-generic",
    internet: false,
    kev: 0,
    counts: [0, 2, 12, 9],
    lastScan: "2 h ago",
    agent: { version: "2.9.1", ok: true },
    ip: "10.20.12.2",
    owner: "Developer tools",
    top: ["CVE-2024-2961"],
  },
];

const findingById = (id: string) => findings.find((f) => f.id === id);

type HostView = "all" | "internet" | "kev" | "stale";

function HostsPage({ initialOpen }: { initialOpen?: string }) {
  const [view, setView] = useState<HostView>("all");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Host | null>(HOST_ROWS.find((h) => h.id === initialOpen) ?? null);
  const [scanned, setScanned] = useState<string | null>(null);
  const rows = HOST_ROWS.filter(
    (h) =>
      (view === "all" || (view === "internet" && h.internet) || (view === "kev" && h.kev > 0) || (view === "stale" && !h.agent.ok)) &&
      (q === "" || `${h.id} ${h.os} ${h.kernel}`.toLowerCase().includes(q.toLowerCase())),
  );
  const cols: Column<Host>[] = [
    {
      id: "host",
      header: "Host",
      pinned: "left",
      width: "18%",
      sortValue: (h) => h.id,
      cell: (h) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" onClick={() => setOpen(h)} className="self-start font-mono text-xs font-medium text-fg hover:underline">
            {h.id}
          </button>
          <span className="truncate text-2xs text-fg-muted">
            {h.ip} · {h.owner}
          </span>
        </span>
      ),
    },
    {
      id: "os",
      header: "OS / kernel",
      sortValue: (h) => h.os,
      cell: (h) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{h.os}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{h.kernel}</span>
        </span>
      ),
    },
    {
      id: "exposure",
      header: "Exposure",
      sortValue: (h) => (h.internet ? 1 : 0),
      cell: (h) => (h.internet ? <Badge tone="warning">Internet-facing</Badge> : <Badge>Internal</Badge>),
    },
    {
      id: "kev",
      header: "KEV",
      align: "right",
      mono: true,
      description: "Findings listed in the CISA Known Exploited Vulnerabilities catalogue",
      sortValue: (h) => h.kev,
      cell: (h) => <span className={h.kev ? "font-semibold text-danger-text" : "text-fg-muted"}>{h.kev}</span>,
    },
    { id: "sev", header: "Findings", width: "190px", sortValue: (h) => sumCounts(h.counts), cell: (h) => <SevCounts counts={h.counts} /> },
    { id: "scan", header: "Last scan", sortValue: (h) => h.lastScan, cell: (h) => <span className="whitespace-nowrap text-fg-muted">{h.lastScan}</span> },
    {
      id: "agent",
      header: "Agent",
      sortValue: (h) => (h.agent.ok ? 1 : 0),
      cell: (h) => <StatusBadge tone={h.agent.ok ? "success" : "warning"}>{h.agent.ok ? `v${h.agent.version}` : `Stale · v${h.agent.version}`}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader
        title="Hosts"
        description="Risk per machine: exposure, exploited CVEs and open findings"
        actions={<SearchInput label="Search hosts" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
      <KpiGrid minWidth={150}>
        <KpiCard label="Hosts scanned" value="48" delta={{ label: "1 agent stale", direction: "flat", intent: "bad" }} />
        <KpiCard label="Internet-facing" value="11" tone="warning" delta={{ label: "4 with KEV findings" }} />
        <KpiCard label="Hosts with KEV" value="9" tone="danger" delta={{ label: "+2 this week", direction: "up", intent: "bad" }} />
        <KpiCard label="Reboot pending" value="6" unit="hosts" delta={{ label: "kernel updates staged" }} />
        <KpiCard label="Median scan age" value="12" unit="min" delta={{ label: "Target ≤ 60 min", intent: "good" }} />
      </KpiGrid>
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Findings by OS" description="Open findings, all severities">
          <StackedBarChart
            label="Open findings by operating system and severity"
            categories={["Ubuntu 24.04", "Ubuntu 22.04", "Debian 12", "Rocky 9.4", "AL2023"]}
            segments={[
              { id: "critical", name: "Critical", color: "var(--oa-critical)" },
              { id: "high", name: "High", color: "var(--oa-danger)" },
              { id: "medium", name: "Medium", color: "var(--oa-warning)" },
              { id: "low", name: "Low", color: "var(--oa-seq-2)" },
            ]}
            values={[
              [4, 13, 30, 9],
              [1, 5, 18, 10],
              [2, 5, 15, 11],
              [0, 12, 27, 4],
              [0, 1, 3, 0],
            ]}
            height={150}
          />
        </Panel>
        <Panel title="Riskiest internet-facing hosts" description="KEV findings × exposure">
          <BarList
            label="Riskiest internet-facing hosts"
            items={HOST_ROWS.filter((h) => h.internet)
              .sort((a, b) => b.kev * 10 + b.counts[0] - (a.kev * 10 + a.counts[0]))
              .map((h) => ({ id: h.id, label: h.id, value: h.kev * 10 + h.counts[0] * 3 + h.counts[1] }))}
          />
        </Panel>
      </div>
      <SegmentedControl<HostView>
        label="Host filter"
        value={view}
        onChange={setView}
        options={[
          { value: "all", label: "All" },
          { value: "internet", label: "Internet-facing" },
          { value: "kev", label: "With KEV" },
          { value: "stale", label: "Stale agent" },
        ]}
      />
      <div className={open ? "grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]" : "grid gap-2.5"}>
        <Panel title="Hosts" description={`${rows.length} shown · sorted by risk`} flush aria-label="Host list">
          <DataTable
            label="Hosts"
            columns={cols}
            rows={[...rows].sort((a, b) => b.kev - a.kev || sumCounts(b.counts) - sumCounts(a.counts))}
            getRowId={(h) => h.id}
            onRowClick={setOpen}
            activeRowId={open?.id}
            minWidth={980}
          />
        </Panel>
        {open && (
          <Panel
            aria-label={`${open.id} details`}
            title={open.id}
            description={`${open.os} · ${open.kernel}`}
            actions={
              <IconButton label="Close host details" size="sm" onClick={() => setOpen(null)}>
                <X />
              </IconButton>
            }
            footer={
              <span className="flex flex-wrap items-center gap-1.5">
                <Button size="sm" variant="primary" icon={<Play />} onClick={() => setScanned(open.id)}>
                  Rescan host
                </Button>
                {scanned === open.id && (
                  <span role="status" className="text-xs text-success">
                    Scan queued for {open.id}
                  </span>
                )}
              </span>
            }
          >
            <div className="flex flex-col gap-2.5 text-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                {open.internet ? <Badge tone="warning">Internet-facing</Badge> : <Badge>Internal</Badge>}
                {open.kev > 0 && <StatusBadge tone="danger">{open.kev} in CISA KEV</StatusBadge>}
                <EntityChip kind="ip" value={open.ip} />
              </div>
              <SevCounts counts={open.counts} />
              <h3 className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Top CVEs</h3>
              <ul className="flex flex-col divide-y divide-subtle rounded-md border border-line">
                {open.top.map((id) => {
                  const f = findingById(id)!;
                  return (
                    <li key={id} className="flex items-start gap-2 px-2.5 py-2">
                      <SeverityBadge severity={f.severity} compact />
                      <span className="flex min-w-0 grow flex-col">
                        <span className="font-mono text-xs font-medium">{f.id}</span>
                        <span className="truncate text-xs text-fg-muted">{f.title}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs text-fg-muted">EPSS {pct(f.epss)}</span>
                    </li>
                  );
                })}
              </ul>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                <dt className="text-fg-muted">Owner</dt>
                <dd>{open.owner}</dd>
                <dt className="text-fg-muted">Agent</dt>
                <dd className="font-mono">v{open.agent.version}</dd>
                <dt className="text-fg-muted">Last scan</dt>
                <dd>{open.lastScan}</dd>
              </dl>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

interface Image {
  id: string;
  ref: string;
  digest: string;
  base: string;
  baseNext?: string;
  fixes: number;
  pods: number;
  clusters: number;
  counts: Counts;
  pushed: string;
}

const IMAGES: Image[] = [
  {
    id: "i1",
    ref: "registry.example.com/payments/api:2.14.1",
    digest: "sha256:4f1c9e2ab07d",
    base: "node:20.11-bookworm",
    baseNext: "node:20.18-bookworm-slim",
    fixes: 41,
    pods: 24,
    clusters: 3,
    counts: [2, 9, 22, 8],
    pushed: "3 days ago",
  },
  {
    id: "i2",
    ref: "registry.example.com/web/frontend:5.3.0",
    digest: "sha256:9ab2d1f04c33",
    base: "nginx:1.24-alpine",
    baseNext: "nginx:1.27-alpine",
    fixes: 12,
    pods: 18,
    clusters: 3,
    counts: [0, 4, 6, 2],
    pushed: "yesterday",
  },
  {
    id: "i3",
    ref: "registry.example.com/data/etl-worker:0.38.2",
    digest: "sha256:17e0c4be9a52",
    base: "python:3.10-slim-bullseye",
    baseNext: "python:3.12-slim-bookworm",
    fixes: 57,
    pods: 9,
    clusters: 2,
    counts: [1, 11, 31, 14],
    pushed: "2 weeks ago",
  },
  {
    id: "i4",
    ref: "registry.example.com/auth/identity:3.1.4",
    digest: "sha256:c03f7d5e6b81",
    base: "eclipse-temurin:17-jre-jammy",
    baseNext: "eclipse-temurin:21-jre-noble",
    fixes: 19,
    pods: 6,
    clusters: 2,
    counts: [1, 3, 9, 5],
    pushed: "5 days ago",
  },
  {
    id: "i5",
    ref: "registry.example.com/platform/ingress-proxy:1.9.0",
    digest: "sha256:e81a0b33fd27",
    base: "gcr.io/distroless/static",
    fixes: 0,
    pods: 12,
    clusters: 3,
    counts: [0, 1, 0, 0],
    pushed: "today",
  },
  {
    id: "i6",
    ref: "registry.example.com/ml/feature-store:0.12.0",
    digest: "sha256:5d9ec210a6f4",
    base: "ubuntu:22.04",
    baseNext: "ubuntu:24.04",
    fixes: 33,
    pods: 4,
    clusters: 1,
    counts: [1, 7, 18, 12],
    pushed: "1 month ago",
  },
  {
    id: "i7",
    ref: "registry.example.com/tools/cron-runner:2024.10",
    digest: "sha256:2b77f9c1e840",
    base: "alpine:3.18",
    baseNext: "alpine:3.20",
    fixes: 6,
    pods: 2,
    clusters: 1,
    counts: [0, 2, 3, 1],
    pushed: "3 weeks ago",
  },
];

function ImagesPage() {
  const [prs, setPrs] = useState<string[]>([]);
  const [scope, setScope] = useState<"running" | "all">("running");
  const cols: Column<Image>[] = [
    {
      id: "ref",
      header: "Image",
      pinned: "left",
      width: "30%",
      sortValue: (i) => i.ref,
      cell: (i) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-medium" title={i.ref}>
            {i.ref}
          </span>
          <span className="truncate font-mono text-2xs text-fg-muted">
            {i.digest} · pushed {i.pushed}
          </span>
        </span>
      ),
    },
    { id: "base", header: "Base image", sortValue: (i) => i.base, cell: (i) => <span className="truncate font-mono text-xs">{i.base}</span> },
    {
      id: "running",
      header: "Running in",
      align: "right",
      sortValue: (i) => i.pods,
      cell: (i) => (
        <span className="whitespace-nowrap">
          {i.pods} pods · {i.clusters} {i.clusters === 1 ? "cluster" : "clusters"}
        </span>
      ),
    },
    { id: "sev", header: "Findings", width: "190px", sortValue: (i) => sumCounts(i.counts), cell: (i) => <SevCounts counts={i.counts} /> },
    {
      id: "fix",
      header: "Recommendation",
      width: "26%",
      description: "Findings that disappear when the base image is upgraded to the suggested tag",
      sortValue: (i) => i.fixes,
      cell: (i) =>
        i.baseNext ? (
          <span className="flex min-w-0 flex-col gap-1">
            <span className="text-xs">
              Base image upgrade fixes <strong className="text-success">{i.fixes}</strong>
            </span>
            <span className="truncate font-mono text-2xs text-fg-muted">→ {i.baseNext}</span>
            {prs.includes(i.id) ? (
              <Badge tone="success" className="self-start">
                PR opened
              </Badge>
            ) : (
              <Button
                size="xs"
                icon={<ArrowUpCircle />}
                className="self-start"
                aria-label={`Open upgrade PR for ${i.ref}`}
                onClick={() => setPrs((p) => [...p, i.id])}
              >
                Open upgrade PR
              </Button>
            )}
          </span>
        ) : (
          <span className="text-xs text-fg-muted">Minimal base, nothing to upgrade</span>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Images"
        description="Container images in the registry and running in Kubernetes"
        actions={
          <SegmentedControl<"running" | "all">
            label="Image scope"
            value={scope}
            onChange={setScope}
            options={[
              { value: "running", label: "Running" },
              { value: "all", label: "All in registry" },
            ]}
          />
        }
      />
      <KpiGrid minWidth={150}>
        <KpiCard
          label="Images"
          value={scope === "running" ? "61" : "214"}
          delta={{ label: scope === "running" ? "in 3 clusters" : "across 38 repositories" }}
        />
        <KpiCard label="With critical" value="5" tone="danger" delta={{ label: "−1 vs. last week", direction: "down", intent: "good" }} />
        <KpiCard label="Fixable by base upgrade" value="72%" tone="success" delta={{ label: "of high + critical findings" }} />
        <KpiCard label="Older than 90 days" value="9" tone="warning" delta={{ label: "rebuild recommended" }} />
      </KpiGrid>
      {prs.length > 0 && (
        <Callout tone="success" title={`${prs.length} upgrade ${prs.length === 1 ? "PR" : "PRs"} opened`}>
          The pipeline rebuilds and rescans each image; findings close when the new digest is deployed.
        </Callout>
      )}
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Images" description="Sorted by findings fixed with a base image upgrade" flush aria-label="Image list">
          <DataTable label="Container images" columns={cols} rows={[...IMAGES].sort((a, b) => b.fixes - a.fixes)} getRowId={(i) => i.id} minWidth={1040} />
        </Panel>
        <Panel title="Most used base images" description="Images built on each base">
          <BarList
            label="Most used base images"
            items={[
              { id: "b1", label: "node:20-bookworm", value: 17 },
              { id: "b2", label: "python:3.10-slim", value: 12 },
              { id: "b3", label: "nginx:1.24-alpine", value: 9 },
              { id: "b4", label: "eclipse-temurin:17", value: 8 },
              { id: "b5", label: "distroless/static", value: 7 },
              { id: "b6", label: "ubuntu:22.04", value: 5 },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* SBOM                                                                */
/* ------------------------------------------------------------------ */

type Ecosystem = "deb" | "rpm" | "npm" | "pypi" | "maven" | "golang";

interface Component {
  id: string;
  name: string;
  version: string;
  eco: Ecosystem;
  licence: string;
  hosts: string[];
  images: string[];
  vulns: number;
}

const ECO_LABEL: Record<Ecosystem, string> = { deb: "Debian", rpm: "RPM", npm: "npm", pypi: "PyPI", maven: "Maven", golang: "Go" };
const purlOf = (c: Component) => `pkg:${c.eco}/${c.eco === "deb" ? "ubuntu/" : c.eco === "rpm" ? "rocky/" : ""}${c.name}@${c.version}`;

const COMPONENTS: Component[] = [
  {
    id: "c1",
    name: "openssl",
    version: "3.0.13-0ubuntu3.4",
    eco: "deb",
    licence: "Apache-2.0",
    hosts: [HOSTS[0], HOSTS[1], HOSTS[2]],
    images: ["payments/api"],
    vulns: 2,
  },
  {
    id: "c2",
    name: "libc6",
    version: "2.35-0ubuntu3.6",
    eco: "deb",
    licence: "LGPL-2.1",
    hosts: [HOSTS[7], "ci-runner-02"],
    images: ["ml/feature-store"],
    vulns: 2,
  },
  { id: "c3", name: "xz-utils", version: "5.6.0-0.2", eco: "deb", licence: "0BSD", hosts: [HOSTS[3], HOSTS[4]], images: [], vulns: 1 },
  { id: "c4", name: "glibc", version: "2.34-100.el9", eco: "rpm", licence: "LGPL-2.1", hosts: [HOSTS[5], HOSTS[6]], images: [], vulns: 1 },
  { id: "c5", name: "lodash", version: "4.17.20", eco: "npm", licence: "MIT", hosts: [], images: ["payments/api", "web/frontend"], vulns: 1 },
  { id: "c6", name: "express", version: "4.18.2", eco: "npm", licence: "MIT", hosts: [], images: ["payments/api"], vulns: 1 },
  { id: "c7", name: "requests", version: "2.31.0", eco: "pypi", licence: "Apache-2.0", hosts: [], images: ["data/etl-worker", "ml/feature-store"], vulns: 1 },
  { id: "c8", name: "pyyaml", version: "6.0.1", eco: "pypi", licence: "MIT", hosts: [], images: ["data/etl-worker"], vulns: 0 },
  { id: "c9", name: "log4j-core", version: "2.17.1", eco: "maven", licence: "Apache-2.0", hosts: [], images: ["auth/identity"], vulns: 0 },
  { id: "c10", name: "jackson-databind", version: "2.13.4.2", eco: "maven", licence: "Apache-2.0", hosts: [], images: ["auth/identity"], vulns: 1 },
  { id: "c11", name: "golang.org/x/net", version: "0.17.0", eco: "golang", licence: "BSD-3-Clause", hosts: [], images: ["platform/ingress-proxy"], vulns: 1 },
  { id: "c12", name: "nginx", version: "1.24.0-1", eco: "deb", licence: "BSD-2-Clause", hosts: [HOSTS[7], HOSTS[0]], images: ["web/frontend"], vulns: 1 },
  { id: "c13", name: "busybox", version: "1.36.1-r2", eco: "deb", licence: "GPL-2.0-only", hosts: [], images: ["tools/cron-runner"], vulns: 0 },
];

function SbomPage() {
  const [q, setQ] = useState("");
  const [eco, setEco] = useState<string[]>([]);
  const [exported, setExported] = useState<string | null>(null);
  const rows = COMPONENTS.filter(
    (c) =>
      (eco.length === 0 || eco.includes(c.eco)) && (q === "" || `${c.name} ${c.version} ${purlOf(c)} ${c.licence}`.toLowerCase().includes(q.toLowerCase())),
  );
  const cols: Column<Component>[] = [
    {
      id: "pkg",
      header: "Package",
      pinned: "left",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-xs font-medium">{c.name}</span>
          {c.vulns > 0 && (
            <Badge tone="danger" mono>
              {c.vulns} {c.vulns === 1 ? "CVE" : "CVEs"}
            </Badge>
          )}
        </span>
      ),
    },
    { id: "version", header: "Version", mono: true, sortValue: (c) => c.version, cell: (c) => c.version },
    { id: "eco", header: "Ecosystem", sortValue: (c) => c.eco, cell: (c) => <Badge>{ECO_LABEL[c.eco]}</Badge> },
    {
      id: "purl",
      header: "purl",
      width: "26%",
      description: "Package URL: a portable identifier for the package",
      cell: (c) => <span className="block truncate font-mono text-2xs text-fg-muted">{purlOf(c)}</span>,
    },
    {
      id: "licence",
      header: "Licence",
      sortValue: (c) => c.licence,
      cell: (c) => (
        <Badge tone={c.licence.startsWith("GPL") ? "warning" : "neutral"} mono>
          {c.licence}
        </Badge>
      ),
    },
    {
      id: "used",
      header: "Used in",
      width: "24%",
      sortValue: (c) => c.hosts.length + c.images.length,
      cell: (c) => (
        <span className="flex flex-wrap gap-1">
          {c.hosts.map((h) => (
            <EntityChip key={h} kind="host" value={h} hideKind />
          ))}
          {c.images.map((i) => (
            <EntityChip key={i} kind="container" value={i} hideKind />
          ))}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="SBOM"
        description="Every component found on hosts and in images · 18,412 components, 2,906 unique"
        actions={
          <>
            <Button size="md" icon={<Download />} onClick={() => setExported("CycloneDX 1.6 JSON")}>
              Export CycloneDX
            </Button>
            <Button size="md" icon={<Download />} onClick={() => setExported("SPDX 2.3 JSON")}>
              Export SPDX
            </Button>
          </>
        }
      />
      {exported && (
        <Callout tone="success" title={`SBOM exported as ${exported}`} onDismiss={() => setExported(null)}>
          {rows.length} components in the current view · acme-sbom-2026-10-19.json
        </Callout>
      )}
      <KpiGrid minWidth={150}>
        <KpiCard label="Unique components" value="2,906" delta={{ label: "+38 this week", direction: "up", intent: "neutral" }} />
        <KpiCard label="With known CVEs" value="187" tone="danger" />
        <KpiCard label="Copyleft licences" value="64" tone="warning" delta={{ label: "GPL, AGPL, LGPL" }} />
        <KpiCard label="Unknown licence" value="23" delta={{ label: "needs review" }} />
      </KpiGrid>
      <FilterBar>
        <SearchInput label="Search package, version, purl or licence" className="w-80" value={q} onChange={(e) => setQ(e.target.value)} />
        <FacetFilter
          label="Ecosystem"
          selected={eco}
          onChange={setEco}
          options={(Object.keys(ECO_LABEL) as Ecosystem[]).map((e) => ({ value: e, label: ECO_LABEL[e], count: COMPONENTS.filter((c) => c.eco === e).length }))}
        />
      </FilterBar>
      <Panel title="Components" description={`${rows.length} of ${COMPONENTS.length} shown`} flush aria-label="Component list">
        <DataTable
          label="SBOM components"
          columns={cols}
          rows={rows}
          getRowId={(c) => c.id}
          minWidth={1040}
          empty={<span className="text-sm text-fg-muted">No component matches “{q}”.</span>}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

const SLA: Array<{ sev: Severity; days: number; open: number; breached: number; compliance: number }> = [
  { sev: "critical", days: 7, open: 7, breached: 1, compliance: 0.92 },
  { sev: "high", days: 30, open: 38, breached: 4, compliance: 0.89 },
  { sev: "medium", days: 90, open: 121, breached: 6, compliance: 0.95 },
  { sev: "low", days: 180, open: 48, breached: 0, compliance: 1 },
];

interface Gate {
  id: string;
  name: string;
  where: "Deploy" | "CI";
  rule: string;
  blocked: number;
  on: boolean;
}

const GATES: Gate[] = [
  { id: "g1", name: "Block deploys with KEV findings", where: "Deploy", rule: "kev = true AND fix_available = true", blocked: 3, on: true },
  { id: "g2", name: "Block deploys with fixable criticals", where: "Deploy", rule: "severity = critical AND fix_available = true", blocked: 5, on: true },
  { id: "g3", name: "Fail CI on new high findings", where: "CI", rule: "severity >= high AND introduced_by = this_change", blocked: 14, on: true },
  { id: "g4", name: "Fail CI on copyleft licences", where: "CI", rule: "licence IN (GPL-3.0, AGPL-3.0)", blocked: 0, on: false },
];

const BREACHES: Array<{ id: string; cve: string; sev: Severity; asset: string; owner: string; over: number }> = [
  { id: "b1", cve: "CVE-2024-6387", sev: "critical", asset: HOSTS[7], owner: PEOPLE[2], over: 3 },
  { id: "b2", cve: "CVE-2023-4911", sev: "high", asset: HOSTS[6], owner: PEOPLE[3], over: 12 },
  { id: "b3", cve: "CVE-2023-44487", sev: "high", asset: "web/frontend:5.3.0", owner: PEOPLE[0], over: 8 },
  { id: "b4", cve: "CVE-2024-2961", sev: "high", asset: "ci-runner-02", owner: PEOPLE[6], over: 2 },
  { id: "b5", cve: "CVE-2024-28182", sev: "medium", asset: HOSTS[3], owner: PEOPLE[4], over: 19 },
];

function PoliciesPage() {
  const [gates, setGates] = useState(GATES);
  const [changed, setChanged] = useState<string | null>(null);
  const toggle = (g: Gate, on: boolean) => {
    setGates((gs) => gs.map((x) => (x.id === g.id ? { ...x, on } : x)));
    setChanged(`${g.name} ${on ? "enabled" : "disabled"}`);
  };
  const breachCols: Column<(typeof BREACHES)[number]>[] = [
    { id: "sev", header: "Severity", width: "100px", sortValue: (b) => SEVERITY_META[b.sev].rank, cell: (b) => <SeverityBadge severity={b.sev} /> },
    { id: "cve", header: "CVE", sortValue: (b) => b.cve, cell: (b) => <EntityChip kind="cve" value={b.cve} hideKind /> },
    { id: "asset", header: "Asset", sortValue: (b) => b.asset, cell: (b) => <span className="font-mono text-xs">{b.asset}</span> },
    {
      id: "owner",
      header: "Owner",
      sortValue: (b) => b.owner,
      cell: (b) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={b.owner} size="sm" />
          {b.owner}
        </span>
      ),
    },
    {
      id: "over",
      header: "Over SLA",
      align: "right",
      sortValue: (b) => b.over,
      cell: (b) => <span className="font-medium text-danger-text">{b.over} days</span>,
    },
  ];
  return (
    <>
      <PageHeader title="Policies" description="Remediation SLAs and the gates that keep vulnerable builds out of production" />
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Remediation SLA" description="Days to fix after first detection" aria-label="Remediation SLA">
          <table className="w-full text-sm">
            <caption className="sr-only">SLA by severity</caption>
            <thead>
              <tr className="text-left text-xs text-fg-muted">
                <th scope="col" className="py-1 font-medium">
                  Severity
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Fix within
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Open
                </th>
                <th scope="col" className="py-1 text-right font-medium">
                  Breached
                </th>
                <th scope="col" className="py-1 pl-3 font-medium">
                  Compliance
                </th>
              </tr>
            </thead>
            <tbody>
              {SLA.map((r) => (
                <tr key={r.sev} className="border-t border-subtle">
                  <td className="py-1.5">
                    <SeverityBadge severity={r.sev} />
                  </td>
                  <td className="py-1.5 text-right font-mono">{r.days} days</td>
                  <td className="py-1.5 text-right font-mono">{r.open}</td>
                  <td className={r.breached ? "py-1.5 text-right font-mono text-danger-text" : "py-1.5 text-right font-mono text-fg-muted"}>{r.breached}</td>
                  <td className="py-1.5 pl-3">
                    <span className="flex items-center gap-2">
                      <span aria-hidden className="h-1.5 w-20 overflow-hidden rounded-full bg-subtle">
                        <span
                          className={r.compliance >= 0.95 ? "block h-full bg-success" : "block h-full bg-warning"}
                          style={{ width: `${r.compliance * 100}%` }}
                        />
                      </span>
                      <span className="font-mono text-xs">{Math.round(r.compliance * 100)}%</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel
          title="Deploy and CI gates"
          description="Checked by the admission controller and the CI plugin"
          aria-label="Deploy and CI gates"
          footer={changed ? <span role="status">{changed}</span> : "Changes apply to the next deploy or pipeline run"}
        >
          <ul className="flex flex-col">
            {gates.map((g) => (
              <li key={g.id} className="flex flex-col gap-1 border-b border-subtle py-2 last:border-0">
                <Switch
                  checked={g.on}
                  onCheckedChange={(on) => toggle(g, on)}
                  label={g.name}
                  description={
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={g.where === "Deploy" ? "info" : "neutral"}>{g.where}</Badge>
                      <code className="font-mono text-2xs">{g.rule}</code>
                      <span>· blocked {g.blocked} in 30 days</span>
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel
        title="SLA breaches"
        description="Findings past their fix-by date"
        flush
        aria-label="SLA breaches"
        actions={<Button size="sm">Notify owners</Button>}
      >
        <DataTable
          label="SLA breaches"
          columns={breachCols}
          rows={BREACHES}
          getRowId={(b) => b.id}
          defaultSort={{ id: "over", direction: "desc" }}
          minWidth={720}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                          */
/* ------------------------------------------------------------------ */

type ExStatus = "active" | "pending" | "expired" | "revoked";
const EX_TONE: Record<ExStatus, Tone> = { active: "success", pending: "info", expired: "neutral", revoked: "danger" };
const EX_LABEL: Record<ExStatus, string> = { active: "Active", pending: "Pending approval", expired: "Expired", revoked: "Revoked" };

interface RiskException {
  id: string;
  cve: string;
  severity: Severity;
  scope: string;
  justification: string;
  expires: string;
  daysLeft: number;
  requester: string;
  approver: string;
  status: ExStatus;
}

const EXCEPTIONS: RiskException[] = [
  {
    id: "EX-101",
    cve: "CVE-2024-28182",
    severity: "medium",
    scope: "All hosts · libnghttp2-14",
    justification: "No fixed package in Ubuntu 24.04 yet; HTTP/2 disabled at the load balancer.",
    expires: "28 Oct 2026",
    daysLeft: 9,
    requester: PEOPLE[0],
    approver: PEOPLE[1],
    status: "active",
  },
  {
    id: "EX-102",
    cve: "CVE-2024-2961",
    severity: "high",
    scope: "ci-runner-02",
    justification: "Runner is ephemeral and isolated; replaced by new image in sprint 44.",
    expires: "2 Nov 2026",
    daysLeft: 14,
    requester: PEOPLE[6],
    approver: PEOPLE[3],
    status: "active",
  },
  {
    id: "EX-103",
    cve: "CVE-2023-4911",
    severity: "high",
    scope: `${HOSTS[5]}, ${HOSTS[6]}`,
    justification: "No setuid binaries reachable by non-root users; kernel update in maintenance window.",
    expires: "30 Nov 2026",
    daysLeft: 42,
    requester: PEOPLE[3],
    approver: PEOPLE[1],
    status: "active",
  },
  {
    id: "EX-104",
    cve: "CVE-2023-44487",
    severity: "high",
    scope: "web/frontend:5.3.0",
    justification: "Behind CDN that mitigates Rapid Reset; upgrade blocked by module compatibility.",
    expires: "15 Dec 2026",
    daysLeft: 57,
    requester: PEOPLE[0],
    approver: PEOPLE[1],
    status: "pending",
  },
  {
    id: "EX-105",
    cve: "CVE-2022-40897",
    severity: "medium",
    scope: "data/etl-worker",
    justification: "setuptools is a build-time dependency only and not present at runtime.",
    expires: "31 Jan 2027",
    daysLeft: 104,
    requester: PEOPLE[4],
    approver: PEOPLE[3],
    status: "pending",
  },
  {
    id: "EX-106",
    cve: "CVE-2023-29491",
    severity: "high",
    scope: "tools/cron-runner",
    justification: "ncurses not invoked by the job.",
    expires: "1 Oct 2026",
    daysLeft: -18,
    requester: PEOPLE[5],
    approver: PEOPLE[1],
    status: "expired",
  },
];

function ExceptionsPage() {
  const [rows, setRows] = useState(EXCEPTIONS);
  const [msg, setMsg] = useState<string | null>(null);
  const setStatus = (id: string, status: ExStatus) => {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    setMsg(`${id} ${status === "active" ? "approved" : "revoked"}`);
  };
  const soon = rows.filter((r) => r.status === "active" && r.daysLeft >= 0 && r.daysLeft <= 14);
  const cols: Column<RiskException>[] = [
    {
      id: "id",
      header: "Exception",
      pinned: "left",
      sortValue: (r) => r.id,
      cell: (r) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="font-mono text-xs font-medium">{r.id}</span>
          <span className="flex items-center gap-1">
            <SeverityBadge severity={r.severity} compact />
            <span className="font-mono text-2xs text-fg-muted">{r.cve}</span>
          </span>
        </span>
      ),
    },
    { id: "scope", header: "Scope", sortValue: (r) => r.scope, cell: (r) => <span className="font-mono text-xs">{r.scope}</span> },
    { id: "why", header: "Justification", width: "28%", cell: (r) => <span className="text-xs text-fg-muted">{r.justification}</span> },
    {
      id: "expires",
      header: "Expires",
      sortValue: (r) => r.daysLeft,
      cell: (r) => (
        <span className="flex flex-col whitespace-nowrap">
          <span>{r.expires}</span>
          <span className={r.daysLeft < 0 ? "text-2xs text-fg-muted" : r.daysLeft <= 14 ? "text-2xs text-warning-text" : "text-2xs text-fg-muted"}>
            {r.daysLeft < 0 ? `${-r.daysLeft} days ago` : `in ${r.daysLeft} days`}
          </span>
        </span>
      ),
    },
    {
      id: "approver",
      header: "Approver",
      sortValue: (r) => r.approver,
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={r.approver} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate">{r.approver}</span>
            <span className="truncate text-2xs text-fg-muted">requested by {r.requester}</span>
          </span>
        </span>
      ),
    },
    { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge tone={EX_TONE[r.status]}>{EX_LABEL[r.status]}</StatusBadge> },
    {
      id: "actions",
      header: "Actions",
      label: "Actions",
      align: "right",
      hideable: false,
      cell: (r) =>
        r.status === "pending" ? (
          <Button size="xs" variant="primary" aria-label={`Approve ${r.id}`} onClick={() => setStatus(r.id, "active")}>
            Approve
          </Button>
        ) : r.status === "active" ? (
          <Button size="xs" variant="danger" aria-label={`Revoke ${r.id}`} onClick={() => setStatus(r.id, "revoked")}>
            Revoke
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader
        title="Exceptions"
        description={`Accepted risks; approvals go to the security owner (${emailOf(PEOPLE[1])})`}
        actions={
          <Button size="md" variant="primary" icon={<Plus />}>
            Request exception
          </Button>
        }
      />
      {soon.length > 0 && (
        <Callout tone="warning" title={`${soon.length} ${soon.length === 1 ? "exception expires" : "exceptions expire"} within 14 days`}>
          {soon.map((r) => `${r.id} (${r.cve}, ${r.daysLeft} days)`).join(" · ")}. Renew them or schedule the fix before they lapse.
        </Callout>
      )}
      <KpiGrid minWidth={150}>
        <KpiCard label="Active" value={rows.filter((r) => r.status === "active").length} tone="success" />
        <KpiCard label="Pending approval" value={rows.filter((r) => r.status === "pending").length} tone="info" />
        <KpiCard label="Expiring in 14 days" value={soon.length} tone="warning" />
        <KpiCard label="Covered findings" value="31" delta={{ label: "4% of open findings" }} />
      </KpiGrid>
      <Panel
        title="Accepted risks"
        description="Each exception is time-boxed and scoped to specific assets"
        flush
        aria-label="Accepted risks"
        footer={msg ? <span role="status">{msg}</span> : undefined}
      >
        <DataTable label="Risk exceptions" columns={cols} rows={rows} getRowId={(r) => r.id} minWidth={1100} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App and stories                                                     */
/* ------------------------------------------------------------------ */

const PAGES = {
  findings: () => <FindingsPage />,
  hosts: () => <HostsPage />,
  images: () => <ImagesPage />,
  sbom: () => <SbomPage />,
  policies: () => <PoliciesPage />,
  exceptions: () => <ExceptionsPage />,
};

const app = (initial: string, pages: PageMap = PAGES): Story => ({
  render: () => <ProductApp product="vulnerabilities" nav={nav} pages={pages} initial={initial} />,
});

/** Findings ranked by exploitation, with a detail panel for the selected CVE. */
export const Findings: Story = { ...app("findings"), play: findingsPlay };

export const Hosts: Story = {
  ...app("hosts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: "Stale agent" }));
    const table = c.getByRole("table", { name: "Hosts" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    await userEvent.click(c.getByRole("radio", { name: "All" }));
    await userEvent.click(within(c.getByRole("table", { name: "Hosts" })).getByRole("button", { name: "api-prod-01" }));
    const detail = c.getByRole("region", { name: "api-prod-01 details" });
    await expect(within(detail).getByText("CVE-2024-6387")).toBeInTheDocument();
    await userEvent.click(within(detail).getByRole("button", { name: "Rescan host" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("Scan queued for api-prod-01");
  },
};

export const Images: Story = {
  ...app("images"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Container images" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Base image upgrade fixes 57");
    await userEvent.click(within(table).getByRole("button", { name: "Open upgrade PR for registry.example.com/data/etl-worker:0.38.2" }));
    await expect(c.getByText("1 upgrade PR opened")).toBeInTheDocument();
    await expect(within(table).getByText("PR opened")).toBeInTheDocument();
  },
};

export const Sbom: Story = {
  name: "SBOM",
  ...app("sbom"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search package, version, purl or licence" }), "log4j");
    const table = c.getByRole("table", { name: "SBOM components" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    await expect(table).toHaveTextContent("pkg:maven/log4j-core@2.17.1");
    await userEvent.click(c.getByRole("button", { name: "Export CycloneDX" }));
    await expect(c.getByText("SBOM exported as CycloneDX 1.6 JSON")).toBeInTheDocument();
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "Fail CI on copyleft licences" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(c.getByRole("status")).toHaveTextContent("Fail CI on copyleft licences enabled");
    const breaches = c.getByRole("table", { name: "SLA breaches" });
    await expect(within(breaches).getAllByRole("row")[1]).toHaveTextContent("19 days");
  },
};

export const Exceptions: Story = {
  ...app("exceptions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("2 exceptions expire within 14 days")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Approve EX-104" }));
    const panel = c.getByRole("region", { name: "Accepted risks" });
    await expect(within(panel).getByRole("status")).toHaveTextContent("EX-104 approved");
    await userEvent.click(c.getByRole("button", { name: "Revoke EX-101" }));
    await expect(c.getByText("1 exception expires within 14 days")).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Revoke EX-104" })).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
