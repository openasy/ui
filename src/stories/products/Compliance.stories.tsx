import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Bell, ClipboardList, Download, FileCheck2, FileText, Gavel, Library, Plus, RefreshCw, ScrollText, Send, ShieldCheck, Upload } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, TextField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import { TONE_COLORS, type Tone } from "../../tokens/levels";
import { PEOPLE, wave } from "../mocks";

const nav = [
  { id: "frameworks", label: "Frameworks", icon: Library, count: 4 },
  { id: "controls", label: "Controls", icon: ShieldCheck, count: 312 },
  { id: "evidence", label: "Evidence", icon: FileCheck2 },
  { id: "policies", label: "Policies", icon: ScrollText },
  { id: "audits", label: "Audits", icon: Gavel },
  { id: "reports", label: "Reports", icon: FileText },
];

const meta = {
  title: "Products/Compliance",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type Framework = "ISO 27001" | "GDPR" | "SOC 2" | "PCI DSS";
type CtlStatus = "passing" | "failing" | "needs-evidence";

const STATUS: Record<CtlStatus, { label: string; tone: Tone }> = {
  passing: { label: "Passing", tone: "success" },
  failing: { label: "Failing", tone: "danger" },
  "needs-evidence": { label: "Needs evidence", tone: "warning" },
};

const FRAMEWORKS: Array<{ id: Framework; total: number; passing: number; failing: number; audit: string; trend: number }> = [
  { id: "ISO 27001", total: 93, passing: 86, failing: 2, audit: "Surveillance audit Nov 18", trend: 3 },
  { id: "GDPR", total: 41, passing: 38, failing: 1, audit: "ROPA updated Sep 30", trend: 1 },
  { id: "SOC 2", total: 64, passing: 55, failing: 3, audit: "Type II window ends Dec 31", trend: -2 },
  { id: "PCI DSS", total: 114, passing: 96, failing: 6, audit: "ROC due Jan 15", trend: 5 },
];

interface Control {
  id: string;
  title: string;
  framework: Framework;
  status: CtlStatus;
  source: ProductId;
  evidence: string;
  owner: string;
  checked: string;
  checkedSort: number;
}

const CONTROLS: Control[] = [
  {
    id: "A.8.16",
    title: "Monitoring activities",
    framework: "ISO 27001",
    status: "passing",
    source: "logs",
    evidence: "Retention 30 d on 48 hosts",
    owner: PEOPLE[2],
    checked: "4 m ago",
    checkedSort: 4,
  },
  {
    id: "A.8.8",
    title: "Management of technical vulnerabilities",
    framework: "ISO 27001",
    status: "failing",
    source: "vulnerabilities",
    evidence: "2 critical CVEs older than 14 d",
    owner: PEOPLE[7],
    checked: "12 m ago",
    checkedSort: 12,
  },
  {
    id: "A.8.7",
    title: "Protection against malware",
    framework: "ISO 27001",
    status: "failing",
    source: "malware",
    evidence: "Active detection on api-prod-03",
    owner: PEOPLE[4],
    checked: "9 m ago",
    checkedSort: 9,
  },
  {
    id: "A.5.15",
    title: "Access control",
    framework: "ISO 27001",
    status: "passing",
    source: "identity",
    evidence: "SSO enforced, 197/214 with MFA",
    owner: PEOPLE[1],
    checked: "1 h ago",
    checkedSort: 60,
  },
  {
    id: "A.8.24",
    title: "Use of cryptography",
    framework: "ISO 27001",
    status: "needs-evidence",
    source: "posture",
    evidence: "Key rotation policy not uploaded",
    owner: PEOPLE[5],
    checked: "2 d ago",
    checkedSort: 2880,
  },
  {
    id: "A.5.24",
    title: "Incident management planning",
    framework: "ISO 27001",
    status: "passing",
    source: "incidents",
    evidence: "8 incidents, 6 postmortems",
    owner: PEOPLE[4],
    checked: "3 h ago",
    checkedSort: 180,
  },
  {
    id: "GDPR Art. 32",
    title: "Security of processing for personal data",
    framework: "GDPR",
    status: "passing",
    source: "access",
    evidence: "JIT database access, sessions recorded",
    owner: PEOPLE[0],
    checked: "18 m ago",
    checkedSort: 18,
  },
  {
    id: "GDPR Art. 30",
    title: "Records of processing, incl. access audit logs",
    framework: "GDPR",
    status: "failing",
    source: "audit",
    evidence: "db-prod-02 audit log gap 13:20–13:55",
    owner: PEOPLE[3],
    checked: "6 m ago",
    checkedSort: 6,
  },
  {
    id: "GDPR Art. 44",
    title: "Transfers of personal data outside the EEA",
    framework: "GDPR",
    status: "needs-evidence",
    source: "infrastructure",
    evidence: "us-east-1 replica needs signed SCCs",
    owner: PEOPLE[6],
    checked: "5 d ago",
    checkedSort: 7200,
  },
  {
    id: "CC6.1",
    title: "Logical access security",
    framework: "SOC 2",
    status: "passing",
    source: "vpn",
    evidence: "214 people, per-group routes",
    owner: PEOPLE[1],
    checked: "22 m ago",
    checkedSort: 22,
  },
  {
    id: "CC6.8",
    title: "Prevent unauthorized software",
    framework: "SOC 2",
    status: "failing",
    source: "runtime",
    evidence: "Unsigned binary kworkerd executed",
    owner: PEOPLE[4],
    checked: "9 m ago",
    checkedSort: 9,
  },
  {
    id: "CC7.2",
    title: "Monitor system components for anomalies",
    framework: "SOC 2",
    status: "passing",
    source: "siem",
    evidence: "142 Sigma rules enabled",
    owner: PEOPLE[2],
    checked: "31 m ago",
    checkedSort: 31,
  },
  {
    id: "CC8.1",
    title: "Change management",
    framework: "SOC 2",
    status: "failing",
    source: "sast",
    evidence: "3 merges without review this week",
    owner: PEOPLE[0],
    checked: "2 h ago",
    checkedSort: 120,
  },
  {
    id: "CC7.4",
    title: "Respond to security incidents",
    framework: "SOC 2",
    status: "failing",
    source: "incidents",
    evidence: "INC-137 postmortem overdue",
    owner: PEOPLE[3],
    checked: "1 h ago",
    checkedSort: 60,
  },
  {
    id: "PCI 6.3.3",
    title: "Patch critical vulnerabilities within one month",
    framework: "PCI DSS",
    status: "failing",
    source: "vulnerabilities",
    evidence: "CVE-2024-6387 on 3 in-scope hosts",
    owner: PEOPLE[7],
    checked: "12 m ago",
    checkedSort: 12,
  },
  {
    id: "PCI 10.2.1",
    title: "Audit logs capture user access to cardholder data",
    framework: "PCI DSS",
    status: "passing",
    source: "logs",
    evidence: "Pipeline pci-audit · 1 y archive",
    owner: PEOPLE[2],
    checked: "8 m ago",
    checkedSort: 8,
  },
  {
    id: "PCI 11.3.1",
    title: "Internal vulnerability scans quarterly",
    framework: "PCI DSS",
    status: "passing",
    source: "vulnerabilities",
    evidence: "Last full scan Oct 14",
    owner: PEOPLE[7],
    checked: "5 d ago",
    checkedSort: 7200,
  },
  {
    id: "PCI 6.4.2",
    title: "Web application firewall or automated testing",
    framework: "PCI DSS",
    status: "needs-evidence",
    source: "dast",
    evidence: "checkout.example.com not scanned in 45 d",
    owner: PEOPLE[6],
    checked: "45 d ago",
    checkedSort: 64800,
  },
  {
    id: "PCI 8.4.2",
    title: "MFA for all access into the CDE",
    framework: "PCI DSS",
    status: "passing",
    source: "identity",
    evidence: "Passkeys or TOTP on CDE group",
    owner: PEOPLE[1],
    checked: "1 h ago",
    checkedSort: 60,
  },
  {
    id: "PCI 3.6.1",
    title: "Protect cryptographic keys",
    framework: "PCI DSS",
    status: "failing",
    source: "secrets",
    evidence: "Leaked Stripe key, rotated, review pending",
    owner: PEOPLE[5],
    checked: "2 d ago",
    checkedSort: 2880,
  },
];

/** Cross-framework mapping: the same control satisfies requirements in other frameworks. */
const MAPPED: Record<string, string[]> = {
  "A.8.16": ["CC7.2", "PCI 10.2.1"],
  "A.8.8": ["PCI 6.3.3", "CC7.1"],
  "A.8.7": ["CC6.8", "PCI 5.2.1"],
  "A.5.15": ["CC6.1", "PCI 7.2.1", "GDPR Art. 32"],
  "A.8.24": ["PCI 3.6.1", "GDPR Art. 32"],
  "A.5.24": ["CC7.4"],
  "CC8.1": ["A.8.32", "PCI 6.5.1"],
  "PCI 8.4.2": ["A.8.5", "CC6.1"],
};

const TESTS: Record<string, Array<{ name: string; ok: boolean; detail: string }>> = {
  "A.8.8": [
    { name: "No critical CVE open longer than 14 days", ok: false, detail: "CVE-2024-6387 on api-prod-01, api-prod-03" },
    { name: "Scanner coverage above 95% of hosts", ok: true, detail: "47 of 48 hosts scanned in 24 h" },
    { name: "Exceptions approved by the CISO", ok: true, detail: "3 exceptions, all signed" },
  ],
  "A.8.7": [
    { name: "EDR running on every server", ok: true, detail: "48 of 48 reporting" },
    { name: "No open malware detection", ok: false, detail: "INC-142 crypto miner on api-prod-03" },
  ],
};

const DAYS = 90;
const dayLabels = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 19 - (DAYS - 1 - i)));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
});
const score = (base: number, seed: number, drop = 0, dropAt = 70) =>
  wave(DAYS, { base, amp: 1.2, noise: 0.6, seed, spike: drop, spikeAt: dropAt, spikeLen: 3 }).map((v, i) => Math.min(100, v + i * 0.06));

function SourceLink({ source }: { source: ProductId }) {
  const P = PRODUCTS[source];
  return (
    <a href={`#${source}`} className="inline-flex items-center gap-1.5 text-xs text-fg no-underline hover:underline">
      <P.icon aria-hidden className="size-3.5 text-fg-muted" />
      {P.name}
    </a>
  );
}

function SourceName({ source }: { source: ProductId }) {
  const P = PRODUCTS[source];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <P.icon aria-hidden className="size-3.5 text-fg-muted" />
      {P.name}
    </span>
  );
}

function Owner({ name }: { name: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <Avatar name={name} size="sm" />
      <span className="truncate text-xs">{name}</span>
    </span>
  );
}

/** Thin bar with a visible percentage next to it; the bar itself is decorative. */
function Meter({ value, tone = "success" }: { value: number; tone?: Tone }) {
  return (
    <span className="flex items-center gap-2">
      <span aria-hidden className="flex h-1.5 w-20 overflow-hidden rounded-full bg-subtle">
        <span style={{ width: `${value}%`, background: TONE_COLORS[tone] }} />
      </span>
      <span className="font-mono text-xs">{value}%</span>
    </span>
  );
}

const columns: Column<Control>[] = [
  { id: "id", header: "Control", width: "96px", mono: true, sortValue: (c) => c.id, cell: (c) => c.id },
  {
    id: "title",
    header: "Title",
    width: "30%",
    sortValue: (c) => c.title,
    cell: (c) => (
      <span className="flex min-w-0 flex-col">
        <a href={`#control/${c.id}`} className="truncate font-medium text-fg no-underline hover:underline">
          {c.title}
        </a>
        <span className="truncate text-2xs text-fg-muted">{c.evidence}</span>
      </span>
    ),
  },
  { id: "framework", header: "Framework", sortValue: (c) => c.framework, cell: (c) => <Badge>{c.framework}</Badge> },
  {
    id: "status",
    header: "Status",
    sortValue: (c) => ["passing", "needs-evidence", "failing"].indexOf(c.status),
    cell: (c) => <StatusBadge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</StatusBadge>,
  },
  { id: "source", header: "Evidence from", sortValue: (c) => PRODUCTS[c.source].name, cell: (c) => <SourceLink source={c.source} /> },
  { id: "owner", header: "Owner", sortValue: (c) => c.owner, cell: (c) => <Owner name={c.owner} /> },
  {
    id: "checked",
    header: "Last checked",
    align: "right",
    sortValue: (c) => -c.checkedSort,
    cell: (c) => <span className="text-xs whitespace-nowrap text-fg-muted">{c.checked}</span>,
  },
];

/* ------------------------------------------------------------- Frameworks */

type StatusTab = "all" | CtlStatus;

/** Overview: score per framework, 90-day trend and the controls with their evidence source. */
function FrameworksPage() {
  const [tab, setTab] = useState<StatusTab>("all");
  const [fw, setFw] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const rows = CONTROLS.filter(
    (c) =>
      (tab === "all" || c.status === tab) &&
      (fw.length === 0 || fw.includes(c.framework)) &&
      `${c.id} ${c.title}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const failing = CONTROLS.filter((c) => c.status === "failing");
  const count = (s: CtlStatus) => CONTROLS.filter((c) => c.status === s && (fw.length === 0 || fw.includes(c.framework))).length;
  return (
    <>
      <PageHeader
        title="Compliance overview"
        description="312 controls across 4 frameworks · evidence collected automatically from 14 products"
        actions={
          <>
            <SearchInput label="Search controls" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button icon={<Download />}>Export for auditor</Button>
            <Button variant="primary" icon={<ClipboardList />}>
              Start audit
            </Button>
          </>
        }
      />
      <Callout
        tone="danger"
        title={`${FRAMEWORKS.reduce((a, f) => a + f.failing, 0)} controls failing, ${failing.filter((c) => c.source === "malware" || c.source === "runtime").length} caused by incident INC-142`}
        action={
          <Button size="sm" onClick={() => setTab("failing")}>
            Show failing
          </Button>
        }
      >
        A.8.7 and CC6.8 fail while the crypto miner on api-prod-03 is open. They will re-check when the incident is resolved.
      </Callout>
      <KpiGrid minWidth={200}>
        {FRAMEWORKS.map((f) => {
          const pct = Math.round((f.passing / f.total) * 100);
          return (
            <KpiCard
              key={f.id}
              label={f.id}
              value={pct}
              unit="% passing"
              tone={pct < 85 ? "warning" : undefined}
              delta={{
                label: `${f.trend > 0 ? "+" : "−"}${Math.abs(f.trend)} pts in 30 d`,
                direction: f.trend > 0 ? "up" : "down",
                intent: f.trend > 0 ? "good" : "bad",
              }}
              footer={
                <span className="flex flex-col gap-1">
                  <span aria-hidden className="flex h-1.5 overflow-hidden rounded-full bg-subtle">
                    <span className="bg-success" style={{ width: `${(f.passing / f.total) * 100}%` }} />
                    <span className="bg-danger" style={{ width: `${(f.failing / f.total) * 100}%` }} />
                    <span className="bg-warning" style={{ width: `${((f.total - f.passing - f.failing) / f.total) * 100}%` }} />
                  </span>
                  <span className="text-2xs text-fg-muted">
                    {f.passing} of {f.total} · {f.failing} failing · {f.audit}
                  </span>
                </span>
              }
            />
          );
        })}
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Compliance score · 90 days" description="% of controls passing, per framework">
          <TimeSeriesChart
            label="Compliance score per framework over 90 days"
            labels={dayLabels}
            height={180}
            yMax={100}
            area={false}
            format={(v) => `${v.toFixed(1)}%`}
            threshold={{ value: 80, label: "audit target 80%" }}
            xTicks={6}
            series={[
              { id: "iso", name: "ISO 27001", data: score(87, 71, -3, 86) },
              { id: "gdpr", name: "GDPR", data: score(88, 72, -2, 86) },
              { id: "soc2", name: "SOC 2", data: score(84, 73, -4, 86) },
              { id: "pci", name: "PCI DSS", data: score(77, 74, -5, 86) },
            ]}
          />
        </Panel>
        <Panel title="Evidence sources" description="Controls backed by each product">
          <BarList
            label="Controls backed by each product"
            items={[
              { id: "logs", label: "Logs", value: 54, href: "#logs" },
              { id: "identity", label: "Identity", value: 47, href: "#identity" },
              { id: "vulns", label: "Vulnerabilities", value: 38, href: "#vulnerabilities" },
              { id: "posture", label: "Posture", value: 33, href: "#posture" },
              { id: "siem", label: "SIEM", value: 29, href: "#siem" },
              { id: "access", label: "Access", value: 21, href: "#access" },
              { id: "manual", label: "Manual upload", value: 44 },
            ]}
          />
        </Panel>
      </div>
      <Panel flush>
        <div className="flex flex-col gap-2 px-3 pt-2">
          <Tabs<StatusTab>
            label="Control status"
            value={tab}
            onChange={setTab}
            items={[
              { value: "all", label: "All", count: CONTROLS.filter((c) => fw.length === 0 || fw.includes(c.framework)).length },
              { value: "failing", label: "Failing", count: count("failing") },
              { value: "needs-evidence", label: "Needs evidence", count: count("needs-evidence") },
              { value: "passing", label: "Passing", count: count("passing") },
            ]}
          />
          <FilterBar onClear={fw.length ? () => setFw([]) : undefined} className="pb-2">
            <FacetFilter
              label="Framework"
              selected={fw}
              onChange={setFw}
              options={FRAMEWORKS.map((f) => ({ value: f.id, count: CONTROLS.filter((c) => c.framework === f.id).length }))}
            />
          </FilterBar>
        </div>
        <div className="border-t border-line">
          <DataTable
            label="Controls"
            columns={columns}
            rows={rows}
            getRowId={(c) => c.id}
            defaultSort={{ id: "status", direction: "desc" }}
            pageSize={12}
            minWidth={960}
          />
        </div>
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- Controls */

function ControlsPage() {
  const [rows, setRows] = useState(CONTROLS);
  const [active, setActive] = useState("A.8.8");
  const [fw, setFw] = useState<string[]>([]);
  const [status, setStatus] = useState<string[]>([]);
  const [owners, setOwners] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [rechecked, setRechecked] = useState("");
  const shown = rows.filter(
    (c) =>
      (fw.length === 0 || fw.includes(c.framework)) &&
      (status.length === 0 || status.includes(c.status)) &&
      (owners.length === 0 || owners.includes(c.owner)) &&
      `${c.id} ${c.title} ${c.evidence}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const current = rows.find((c) => c.id === active)!;
  const tests = TESTS[current.id] ?? [
    { name: "Automated check", ok: current.status === "passing", detail: current.evidence },
    { name: "Owner review in the last 90 days", ok: true, detail: `Reviewed by ${current.owner}` },
  ];
  const cols: Column<Control>[] = [
    { id: "id", header: "Control", width: "110px", mono: true, pinned: "left", sortValue: (c) => c.id, cell: (c) => c.id },
    { id: "title", header: "Title", width: "28%", sortValue: (c) => c.title, cell: (c) => <span className="truncate font-medium">{c.title}</span> },
    { id: "framework", header: "Framework", sortValue: (c) => c.framework, cell: (c) => <Badge>{c.framework}</Badge> },
    {
      id: "mapped",
      header: "Also covers",
      description: "Requirements in other frameworks satisfied by the same evidence. Fix once, pass everywhere.",
      sortValue: (c) => (MAPPED[c.id] ?? []).length,
      cell: (c) => <span className="font-mono text-2xs text-fg-muted">{(MAPPED[c.id] ?? []).join(", ") || "–"}</span>,
    },
    {
      id: "status",
      header: "Status",
      sortValue: (c) => ["passing", "needs-evidence", "failing"].indexOf(c.status),
      cell: (c) => <StatusBadge tone={STATUS[c.status].tone}>{STATUS[c.status].label}</StatusBadge>,
    },
    { id: "source", header: "Evidence from", sortValue: (c) => PRODUCTS[c.source].name, cell: (c) => <SourceName source={c.source} /> },
    { id: "owner", header: "Owner", sortValue: (c) => c.owner, cell: (c) => <Owner name={c.owner} /> },
    {
      id: "checked",
      header: "Last checked",
      align: "right",
      sortValue: (c) => -c.checkedSort,
      cell: (c) => <span className="text-xs whitespace-nowrap text-fg-muted">{c.checked}</span>,
    },
  ];
  return (
    <>
      <PageHeader
        title="Controls"
        description="312 controls · 94 mapped across two or more frameworks · tested continuously"
        actions={
          <>
            <Button icon={<Download />}>Export CSV</Button>
            <Button variant="primary" icon={<Plus />}>
              Custom control
            </Button>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Passing" value="275" unit="of 312" tone="success" delta={{ label: "88%", direction: "up", intent: "good" }} />
        <KpiCard label="Failing" value="12" tone="danger" delta={{ label: "5 owned by Ben Ortiz", intent: "bad" }} />
        <KpiCard label="Needs evidence" value="25" tone="warning" delta={{ label: "11 due before Nov 18" }} />
        <KpiCard label="Without owner" value="3" unit="controls" delta={{ label: "Assign before the audit" }} />
      </KpiGrid>
      <FilterBar
        onClear={
          fw.length || status.length || owners.length || q
            ? () => {
                setFw([]);
                setStatus([]);
                setOwners([]);
                setQ("");
              }
            : undefined
        }
      >
        <SearchInput label="Search controls" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
        <FacetFilter
          label="Framework"
          selected={fw}
          onChange={setFw}
          options={FRAMEWORKS.map((f) => ({ value: f.id, count: rows.filter((c) => c.framework === f.id).length }))}
        />
        <FacetFilter
          label="Status"
          selected={status}
          onChange={setStatus}
          options={(Object.keys(STATUS) as CtlStatus[]).map((s) => ({ value: s, label: STATUS[s].label, count: rows.filter((c) => c.status === s).length }))}
        />
        <FacetFilter
          label="Owner"
          selected={owners}
          onChange={setOwners}
          options={[...new Set(rows.map((c) => c.owner))].map((o) => ({ value: o, count: rows.filter((c) => c.owner === o).length }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="All controls" description={`${shown.length} shown · select one for its tests`} flush>
          <DataTable
            label="All controls"
            columns={cols}
            rows={shown}
            getRowId={(c) => c.id}
            onRowClick={(c) => setActive(c.id)}
            activeRowId={active}
            defaultSort={{ id: "status", direction: "desc" }}
            pageSize={12}
            minWidth={1040}
            empty={<p className="py-8">No controls match these filters</p>}
          />
        </Panel>
        <Panel
          title={
            <span className="flex items-center gap-2">
              <span className="font-mono">{current.id}</span>
              <StatusBadge tone={STATUS[current.status].tone}>{STATUS[current.status].label}</StatusBadge>
            </span>
          }
          description={current.title}
          aria-label="Control detail"
        >
          <div className="flex flex-col gap-3 text-sm">
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1.5">
              <dt className="text-fg-muted">Framework</dt>
              <dd>{current.framework}</dd>
              <dt className="text-fg-muted">Owner</dt>
              <dd>
                <Owner name={current.owner} />
              </dd>
              <dt className="text-fg-muted">Evidence from</dt>
              <dd>
                <SourceLink source={current.source} />
              </dd>
              <dt className="text-fg-muted">Also covers</dt>
              <dd className="font-mono text-xs">{(MAPPED[current.id] ?? []).join(", ") || "–"}</dd>
            </dl>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold text-fg">Tests</h3>
              <ul aria-label={`Tests for ${current.id}`} className="flex flex-col gap-1.5">
                {tests.map((t) => (
                  <li key={t.name} className="flex items-start gap-2 rounded-md border border-subtle px-2 py-1.5">
                    <StatusBadge tone={t.ok ? "success" : "danger"}>{t.ok ? "Pass" : "Fail"}</StatusBadge>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-xs font-medium">{t.name}</span>
                      <span className="text-2xs text-fg-muted">{t.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={<RefreshCw />}
                onClick={() => {
                  setRows((rs) => rs.map((r) => (r.id === current.id ? { ...r, checked: "just now", checkedSort: 0 } : r)));
                  setRechecked(`Re-checked ${current.id} just now`);
                }}
              >
                Re-check now
              </Button>
              <Button size="sm" variant="ghost" icon={<Upload />}>
                Attach evidence
              </Button>
            </div>
            {rechecked && (
              <span role="status" className="text-xs text-success">
                {rechecked}
              </span>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- Evidence */

type Freshness = "fresh" | "stale" | "expired";

const FRESH: Record<Freshness, { label: string; tone: Tone }> = {
  fresh: { label: "Fresh", tone: "success" },
  stale: { label: "Stale", tone: "warning" },
  expired: { label: "Expired", tone: "danger" },
};

interface Evidence {
  id: string;
  name: string;
  source: ProductId | "manual";
  kind: string;
  controls: number;
  collected: string;
  freshness: Freshness;
  validFor: string;
  by: string;
}

const EVIDENCE: Evidence[] = [
  {
    id: "ev1",
    name: "Log retention configuration, all pipelines",
    source: "logs",
    kind: "Config snapshot",
    controls: 9,
    collected: "4 m ago",
    freshness: "fresh",
    validFor: "24 h",
    by: "Automatic",
  },
  {
    id: "ev2",
    name: "MFA enrolment per user",
    source: "identity",
    kind: "User export",
    controls: 7,
    collected: "1 h ago",
    freshness: "fresh",
    validFor: "24 h",
    by: "Automatic",
  },
  {
    id: "ev3",
    name: "Open critical vulnerabilities with age",
    source: "vulnerabilities",
    kind: "Findings report",
    controls: 6,
    collected: "12 m ago",
    freshness: "fresh",
    validFor: "24 h",
    by: "Automatic",
  },
  {
    id: "ev4",
    name: "Sigma rule inventory and alert volume",
    source: "siem",
    kind: "Rule export",
    controls: 5,
    collected: "31 m ago",
    freshness: "fresh",
    validFor: "7 d",
    by: "Automatic",
  },
  {
    id: "ev5",
    name: "Database session recordings index",
    source: "access",
    kind: "Session list",
    controls: 4,
    collected: "18 m ago",
    freshness: "fresh",
    validFor: "24 h",
    by: "Automatic",
  },
  {
    id: "ev6",
    name: "Cloud posture benchmark, CIS AWS 3.0",
    source: "posture",
    kind: "Benchmark result",
    controls: 14,
    collected: "3 d ago",
    freshness: "stale",
    validFor: "24 h",
    by: "Automatic",
  },
  {
    id: "ev7",
    name: "DAST baseline, checkout.example.com",
    source: "dast",
    kind: "Scan report",
    controls: 2,
    collected: "45 d ago",
    freshness: "expired",
    validFor: "30 d",
    by: "Automatic",
  },
  {
    id: "ev8",
    name: "Postmortems for P1 incidents",
    source: "incidents",
    kind: "Documents",
    controls: 3,
    collected: "3 h ago",
    freshness: "fresh",
    validFor: "90 d",
    by: "Automatic",
  },
  {
    id: "ev9",
    name: "Signed SCCs with cloud provider",
    source: "manual",
    kind: "PDF",
    controls: 1,
    collected: "14 months ago",
    freshness: "expired",
    validFor: "12 months",
    by: PEOPLE[6],
  },
  {
    id: "ev10",
    name: "Penetration test report 2026",
    source: "manual",
    kind: "PDF",
    controls: 6,
    collected: "Jul 2",
    freshness: "fresh",
    validFor: "12 months",
    by: PEOPLE[3],
  },
  {
    id: "ev11",
    name: "Background check confirmations",
    source: "manual",
    kind: "Spreadsheet",
    controls: 2,
    collected: "5 months ago",
    freshness: "stale",
    validFor: "6 months",
    by: PEOPLE[5],
  },
  {
    id: "ev12",
    name: "Secret rotation history",
    source: "secrets",
    kind: "Audit trail",
    controls: 3,
    collected: "2 d ago",
    freshness: "stale",
    validFor: "24 h",
    by: "Automatic",
  },
  {
    id: "ev13",
    name: "VPN group membership and routes",
    source: "vpn",
    kind: "Config snapshot",
    controls: 4,
    collected: "22 m ago",
    freshness: "fresh",
    validFor: "24 h",
    by: "Automatic",
  },
];

function EvidencePage() {
  const [rows, setRows] = useState(EVIDENCE);
  const [tab, setTab] = useState<"all" | "auto" | "manual" | "attention">("all");
  const [q, setQ] = useState("");
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState("");
  const shown = rows.filter(
    (e) =>
      (tab === "all" ||
        (tab === "auto" && e.source !== "manual") ||
        (tab === "manual" && e.source === "manual") ||
        (tab === "attention" && e.freshness !== "fresh")) &&
      e.name.toLowerCase().includes(q.toLowerCase()),
  );
  const collect = (e: Evidence) => {
    setRows((rs) => rs.map((r) => (r.id === e.id ? { ...r, collected: "just now", freshness: "fresh" } : r)));
    setNotice(`Collected “${e.name}” again`);
  };
  const cols: Column<Evidence>[] = [
    {
      id: "name",
      header: "Evidence",
      width: "32%",
      sortValue: (e) => e.name,
      cell: (e) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{e.name}</span>
          <span className="truncate text-2xs text-fg-muted">{e.kind}</span>
        </span>
      ),
    },
    {
      id: "source",
      header: "Source",
      sortValue: (e) => e.source,
      cell: (e) => (e.source === "manual" ? <Badge variant="outline">Manual upload</Badge> : <SourceName source={e.source} />),
    },
    {
      id: "controls",
      header: "Controls",
      align: "right",
      mono: true,
      description: "Controls that cite this evidence.",
      sortValue: (e) => e.controls,
      cell: (e) => e.controls,
    },
    { id: "collected", header: "Collected", cell: (e) => <span className="text-xs whitespace-nowrap text-fg-muted">{e.collected}</span> },
    {
      id: "valid",
      header: "Valid for",
      description: "After this period the evidence is stale and the controls that cite it need evidence again.",
      cell: (e) => <span className="text-xs">{e.validFor}</span>,
    },
    {
      id: "fresh",
      header: "Freshness",
      sortValue: (e) => ["fresh", "stale", "expired"].indexOf(e.freshness),
      cell: (e) => <StatusBadge tone={FRESH[e.freshness].tone}>{FRESH[e.freshness].label}</StatusBadge>,
    },
    {
      id: "by",
      header: "Collected by",
      cell: (e) => (e.by === "Automatic" ? <span className="text-xs text-fg-muted">Automatic</span> : <Owner name={e.by} />),
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      width: "120px",
      hideable: false,
      cell: (e) =>
        e.source === "manual" ? (
          <Button size="xs" icon={<Upload />} aria-label={`Replace ${e.name}`} onClick={() => setUploading(true)}>
            Replace
          </Button>
        ) : (
          <Button size="xs" icon={<RefreshCw />} aria-label={`Collect now: ${e.name}`} onClick={() => collect(e)}>
            Collect now
          </Button>
        ),
    },
  ];
  const attention = rows.filter((e) => e.freshness !== "fresh").length;
  return (
    <>
      <PageHeader
        title="Evidence"
        description="Evidence library · collected automatically from connected products, plus manual uploads"
        actions={
          <>
            <SearchInput label="Search evidence" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="primary" icon={<Upload />} onClick={() => setUploading(true)}>
              Upload evidence
            </Button>
          </>
        }
      >
        <Tabs
          label="Evidence type"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All", count: rows.length },
            { value: "auto", label: "Automatic", count: rows.filter((e) => e.source !== "manual").length },
            { value: "manual", label: "Manual", count: rows.filter((e) => e.source === "manual").length },
            { value: "attention", label: "Stale or expired", count: attention },
          ]}
        />
      </PageHeader>
      <KpiGrid>
        <KpiCard
          label="Evidence items"
          value="1,284"
          unit="in library"
          trend={wave(12, { base: 1200, amp: 60, seed: 81 })}
          delta={{ label: "+96 this month", direction: "up" }}
        />
        <KpiCard label="Collected automatically" value="86%" unit="from 14 products" tone="success" />
        <KpiCard label="Stale or expired" value={attention} unit="need action" tone="warning" delta={{ label: "Blocks 18 controls", intent: "bad" }} />
        <KpiCard label="Next collection" value="06:00" unit="UTC daily" delta={{ label: "Hourly for identity and logs" }} />
      </KpiGrid>
      {uploading && (
        <Panel
          title="Upload evidence"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setUploading(false)}>
              Cancel
            </Button>
          }
        >
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setUploading(false);
              setNotice("Evidence uploaded and linked to 1 control");
            }}
          >
            <TextField label="Title" placeholder="Signed SCCs with cloud provider" />
            <SelectField label="Control" options={CONTROLS.map((c) => ({ value: c.id, label: `${c.id} · ${c.title}` }))} />
            <SelectField label="Valid for" options={["30 days", "90 days", "6 months", "12 months"].map((v) => ({ value: v, label: v }))} />
            <Button type="submit" variant="primary">
              Upload
            </Button>
          </form>
        </Panel>
      )}
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Evidence library" description={`${shown.length} of ${rows.length} shown`} flush>
          <DataTable
            label="Evidence library"
            columns={cols}
            rows={shown}
            getRowId={(e) => e.id}
            defaultSort={{ id: "fresh", direction: "desc" }}
            minWidth={1040}
            persistKey="compliance-evidence"
          />
        </Panel>
        <Panel title="Freshness by source" description="Items per product">
          <StackedBarChart
            label="Evidence freshness by source"
            categories={["Logs", "Identity", "Vulns", "Posture", "SIEM", "Manual"]}
            segments={[
              { id: "fresh", name: "Fresh", color: TONE_COLORS.success },
              { id: "stale", name: "Stale", color: TONE_COLORS.warning },
              { id: "expired", name: "Expired", color: TONE_COLORS.danger },
            ]}
            values={[
              [210, 0, 0],
              [180, 4, 0],
              [140, 6, 1],
              [96, 22, 0],
              [118, 0, 0],
              [140, 31, 12],
            ]}
            height={200}
            xTicks={6}
          />
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- Policies */

type PolicyStatus = "published" | "review-due" | "draft";

interface Policy {
  id: string;
  name: string;
  version: string;
  owner: string;
  approved: string;
  nextReview: string;
  ack: number;
  pending: number;
  status: PolicyStatus;
  frameworks: Framework[];
}

const POLICY_STATUS: Record<PolicyStatus, { label: string; tone: Tone }> = {
  published: { label: "Published", tone: "success" },
  "review-due": { label: "Review due", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
};

const POLICIES: Policy[] = [
  {
    id: "pol-is",
    name: "Information security policy",
    version: "v4.2",
    owner: PEOPLE[1],
    approved: "Mar 3, 2026",
    nextReview: "Mar 2027",
    ack: 98,
    pending: 4,
    status: "published",
    frameworks: ["ISO 27001", "SOC 2", "PCI DSS"],
  },
  {
    id: "pol-ac",
    name: "Access control policy",
    version: "v3.1",
    owner: PEOPLE[0],
    approved: "Jan 18, 2026",
    nextReview: "Jan 2027",
    ack: 94,
    pending: 12,
    status: "published",
    frameworks: ["ISO 27001", "SOC 2", "PCI DSS"],
  },
  {
    id: "pol-aup",
    name: "Acceptable use policy",
    version: "v2.6",
    owner: PEOPLE[5],
    approved: "Aug 1, 2026",
    nextReview: "Aug 2027",
    ack: 81,
    pending: 41,
    status: "published",
    frameworks: ["ISO 27001", "SOC 2"],
  },
  {
    id: "pol-ir",
    name: "Incident response plan",
    version: "v5.0",
    owner: PEOPLE[4],
    approved: "Oct 2, 2025",
    nextReview: "Oct 2026",
    ack: 100,
    pending: 0,
    status: "review-due",
    frameworks: ["ISO 27001", "SOC 2", "PCI DSS"],
  },
  {
    id: "pol-dp",
    name: "Data protection and privacy policy",
    version: "v2.0",
    owner: PEOPLE[3],
    approved: "May 24, 2026",
    nextReview: "May 2027",
    ack: 89,
    pending: 23,
    status: "published",
    frameworks: ["GDPR", "ISO 27001"],
  },
  {
    id: "pol-crypto",
    name: "Cryptography and key management",
    version: "v1.3 draft",
    owner: PEOPLE[5],
    approved: "–",
    nextReview: "–",
    ack: 0,
    pending: 0,
    status: "draft",
    frameworks: ["ISO 27001", "PCI DSS"],
  },
  {
    id: "pol-vm",
    name: "Vulnerability management standard",
    version: "v2.4",
    owner: PEOPLE[7],
    approved: "Jun 9, 2026",
    nextReview: "Jun 2027",
    ack: 97,
    pending: 2,
    status: "published",
    frameworks: ["ISO 27001", "PCI DSS", "SOC 2"],
  },
  {
    id: "pol-bc",
    name: "Business continuity and backup",
    version: "v1.8",
    owner: PEOPLE[2],
    approved: "Sep 12, 2025",
    nextReview: "Sep 2026",
    ack: 92,
    pending: 8,
    status: "review-due",
    frameworks: ["ISO 27001", "SOC 2"],
  },
  {
    id: "pol-ret",
    name: "Data retention schedule",
    version: "v1.2",
    owner: PEOPLE[3],
    approved: "Feb 2, 2026",
    nextReview: "Feb 2027",
    ack: 76,
    pending: 52,
    status: "published",
    frameworks: ["GDPR"],
  },
];

const TEAMS_ACK = [
  { team: "Engineering", ack: 96, people: 92 },
  { team: "Operations", ack: 91, people: 34 },
  { team: "Support", ack: 74, people: 41 },
  { team: "Sales", ack: 62, people: 29 },
  { team: "Contractors", ack: 55, people: 18 },
];

function PoliciesPage() {
  const [rows, setRows] = useState(POLICIES);
  const [active, setActive] = useState("pol-aup");
  const [status, setStatus] = useState<"all" | PolicyStatus>("all");
  const [sent, setSent] = useState("");
  const current = rows.find((p) => p.id === active)!;
  const shown = rows.filter((p) => status === "all" || p.status === status);
  const cols: Column<Policy>[] = [
    {
      id: "name",
      header: "Policy",
      width: "30%",
      sortValue: (p) => p.name,
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{p.name}</span>
          <span className="truncate text-2xs text-fg-muted">{p.frameworks.join(" · ")}</span>
        </span>
      ),
    },
    { id: "version", header: "Version", mono: true, cell: (p) => p.version },
    { id: "owner", header: "Owner", sortValue: (p) => p.owner, cell: (p) => <Owner name={p.owner} /> },
    { id: "approved", header: "Approved", cell: (p) => <span className="text-xs whitespace-nowrap">{p.approved}</span> },
    {
      id: "review",
      header: "Next review",
      cell: (p) => (
        <span className={p.status === "review-due" ? "text-xs whitespace-nowrap text-warning-text" : "text-xs whitespace-nowrap"}>{p.nextReview}</span>
      ),
    },
    {
      id: "ack",
      header: "Acknowledged",
      description: "Share of people in scope who accepted the current version.",
      sortValue: (p) => p.ack,
      cell: (p) =>
        p.status === "draft" ? (
          <span className="text-xs text-fg-muted">Not published</span>
        ) : (
          <Meter value={p.ack} tone={p.ack >= 90 ? "success" : p.ack >= 75 ? "warning" : "danger"} />
        ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (p) => p.status,
      cell: (p) => <StatusBadge tone={POLICY_STATUS[p.status].tone}>{POLICY_STATUS[p.status].label}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader
        title="Policies"
        description="Policy documents with versions, approvals and who has acknowledged them"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New policy
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Policies" value={rows.length} unit="1 draft" />
        <KpiCard label="Acknowledged" value="89%" unit="average" tone="success" delta={{ label: "+4 pts since reminders", direction: "up", intent: "good" }} />
        <KpiCard
          label="Review overdue"
          value={rows.filter((p) => p.status === "review-due").length}
          tone="warning"
          delta={{ label: "ISO 27001 A.5.1 needs yearly review", intent: "bad" }}
        />
        <KpiCard label="Pending signatures" value={rows.reduce((a, p) => a + p.pending, 0)} unit="people" />
      </KpiGrid>
      <FilterBar>
        <SegmentedControl
          label="Policy status"
          value={status}
          onChange={setStatus}
          options={[
            { value: "all", label: "All" },
            { value: "published", label: "Published" },
            { value: "review-due", label: "Review due" },
            { value: "draft", label: "Draft" },
          ]}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Policy documents" flush>
          <DataTable
            label="Policy documents"
            columns={cols}
            rows={shown}
            getRowId={(p) => p.id}
            onRowClick={(p) => setActive(p.id)}
            activeRowId={active}
            minWidth={920}
          />
        </Panel>
        <Panel title={current.name} description={`${current.version} · owner ${current.owner}`} aria-label="Policy detail">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold">Acknowledgement by team</h3>
              <ul aria-label="Acknowledgement by team" className="flex flex-col gap-1">
                {TEAMS_ACK.map((t) => {
                  const v = Math.max(0, Math.min(100, Math.round(t.ack * (current.ack / 90))));
                  return (
                    <li key={t.team} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs">
                      <span>
                        {t.team} <span className="text-fg-muted">· {t.people} people</span>
                      </span>
                      <Meter value={current.status === "draft" ? 0 : v} tone={v >= 90 ? "success" : v >= 75 ? "warning" : "danger"} />
                    </li>
                  );
                })}
              </ul>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold">Version history</h3>
              <ol className="flex flex-col text-xs">
                {[
                  { v: current.version, note: "Current version", who: current.owner, when: current.approved },
                  { v: "previous", note: "Clarified scope for contractors", who: PEOPLE[1], when: "Last year" },
                  { v: "initial", note: "First approved version", who: PEOPLE[1], when: "2023" },
                ].map((h) => (
                  <li key={h.v} className="flex justify-between gap-2 border-b border-subtle py-1 last:border-0">
                    <span className="flex min-w-0 flex-col">
                      <span className="font-mono">{h.v}</span>
                      <span className="text-fg-muted">{h.note}</span>
                    </span>
                    <span className="shrink-0 text-right text-fg-muted">
                      {h.who}
                      <br />
                      {h.when}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                icon={<Bell />}
                disabled={current.pending === 0}
                onClick={() => {
                  setSent(`Reminder sent to ${current.pending} people`);
                  setRows((rs) => rs.map((r) => (r.id === current.id ? { ...r, pending: 0 } : r)));
                }}
              >
                Send reminder to {current.pending} people
              </Button>
              <Button size="sm" variant="ghost" icon={<Download />}>
                PDF
              </Button>
            </div>
            {sent && (
              <span role="status" className="text-xs text-success">
                {sent}
              </span>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- Audits */

type ReqStatus = "open" | "submitted" | "accepted";
const REQ_STATUS: Record<ReqStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "warning" },
  submitted: { label: "Submitted", tone: "info" },
  accepted: { label: "Accepted", tone: "success" },
};

interface AuditRequest {
  id: string;
  audit: string;
  text: string;
  controls: string;
  assignee: string;
  due: string;
  status: ReqStatus;
}

const AUDITS = [
  {
    id: "iso",
    name: "ISO 27001 surveillance 2026",
    framework: "ISO 27001",
    auditor: "Harbor & Finch Assurance",
    lead: "Grace Miller",
    window: "Nov 18 – Nov 20",
    progress: 72,
    tone: "warning" as Tone,
    stage: "Fieldwork in 30 days",
  },
  {
    id: "soc2",
    name: "SOC 2 Type II · 2026",
    framework: "SOC 2",
    auditor: "Linden CPA Group",
    lead: "Owen Brooks",
    window: "Jul 1 – Dec 31",
    progress: 58,
    tone: "info" as Tone,
    stage: "Observation period",
  },
  {
    id: "pci",
    name: "PCI DSS 4.0 ROC",
    framework: "PCI DSS",
    auditor: "Northgate QSA",
    lead: "Ruth Hale",
    window: "Jan 6 – Jan 15",
    progress: 31,
    tone: "info" as Tone,
    stage: "Planning",
  },
];

const REQUESTS: AuditRequest[] = [
  {
    id: "R-101",
    audit: "iso",
    text: "Population of joiners and leavers, Jan to Oct",
    controls: "A.5.15, A.5.18",
    assignee: PEOPLE[1],
    due: "Oct 24",
    status: "open",
  },
  { id: "R-102", audit: "iso", text: "Evidence of quarterly access reviews", controls: "A.5.18", assignee: PEOPLE[0], due: "Oct 24", status: "submitted" },
  { id: "R-103", audit: "iso", text: "Vulnerability scan reports for in-scope hosts", controls: "A.8.8", assignee: PEOPLE[7], due: "Oct 28", status: "open" },
  {
    id: "R-104",
    audit: "iso",
    text: "Incident register and two sample postmortems",
    controls: "A.5.24, A.5.27",
    assignee: PEOPLE[4],
    due: "Oct 31",
    status: "accepted",
  },
  {
    id: "R-105",
    audit: "iso",
    text: "Supplier security assessments for top 10 vendors",
    controls: "A.5.19",
    assignee: PEOPLE[3],
    due: "Nov 4",
    status: "open",
  },
  { id: "R-106", audit: "iso", text: "Backup restore test results", controls: "A.8.13", assignee: PEOPLE[2], due: "Nov 4", status: "accepted" },
  { id: "R-201", audit: "soc2", text: "Change tickets sample, 25 items", controls: "CC8.1", assignee: PEOPLE[0], due: "Nov 2", status: "open" },
  { id: "R-202", audit: "soc2", text: "Alert triage evidence for September", controls: "CC7.2, CC7.3", assignee: PEOPLE[2], due: "Nov 9", status: "submitted" },
  {
    id: "R-301",
    audit: "pci",
    text: "Network diagram of the cardholder data environment",
    controls: "PCI 1.2.3",
    assignee: PEOPLE[6],
    due: "Dec 1",
    status: "open",
  },
];

function AuditsPage() {
  const [audit, setAudit] = useState("iso");
  const [reqs, setReqs] = useState(REQUESTS);
  const a = AUDITS.find((x) => x.id === audit)!;
  const rows = reqs.filter((r) => r.audit === audit);
  const cols: Column<AuditRequest>[] = [
    { id: "id", header: "Request", width: "80px", mono: true, cell: (r) => r.id },
    { id: "text", header: "Auditor asks for", width: "34%", cell: (r) => <span className="font-medium">{r.text}</span> },
    { id: "controls", header: "Controls", mono: true, cell: (r) => <span className="text-xs">{r.controls}</span> },
    { id: "assignee", header: "Assignee", sortValue: (r) => r.assignee, cell: (r) => <Owner name={r.assignee} /> },
    { id: "due", header: "Due", cell: (r) => <span className="text-xs whitespace-nowrap">{r.due}</span> },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => ["open", "submitted", "accepted"].indexOf(r.status),
      cell: (r) => <StatusBadge tone={REQ_STATUS[r.status].tone}>{REQ_STATUS[r.status].label}</StatusBadge>,
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "110px",
      align: "right",
      hideable: false,
      cell: (r) =>
        r.status === "open" ? (
          <Button
            size="xs"
            icon={<Send />}
            aria-label={`Submit ${r.id}`}
            onClick={() => setReqs((rs) => rs.map((x) => (x.id === r.id ? { ...x, status: "submitted" } : x)))}
          >
            Submit
          </Button>
        ) : null,
    },
  ];
  const open = rows.filter((r) => r.status === "open").length;
  return (
    <>
      <PageHeader
        title="Audits"
        description="Audit projects, auditor requests and what is still open"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New audit
          </Button>
        }
      />
      <div className="grid gap-2.5 md:grid-cols-3">
        {AUDITS.map((x) => (
          <Panel
            key={x.id}
            title={x.name}
            description={`${x.auditor} · lead ${x.lead}`}
            actions={<StatusBadge tone={x.tone}>{x.stage}</StatusBadge>}
            className={x.id === audit ? "border-accent" : undefined}
          >
            <div className="flex flex-col gap-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-fg-muted">Window {x.window}</span>
                <Meter value={x.progress} tone="info" />
              </div>
              <Button size="sm" variant={x.id === audit ? "primary" : "secondary"} aria-pressed={x.id === audit} onClick={() => setAudit(x.id)}>
                {x.id === audit ? `Showing ${x.framework} requests` : `Show ${x.framework} requests`}
              </Button>
            </div>
          </Panel>
        ))}
      </div>
      {open > 0 && (
        <Callout tone="warning" title={`${open} requests open for ${a.name}`}>
          Auditor {a.lead} sees submitted evidence in the auditor portal; links expire after the audit window.
        </Callout>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Auditor requests" description={a.name} flush>
          <DataTable label="Auditor requests" columns={cols} rows={rows} getRowId={(r) => r.id} minWidth={900} />
        </Panel>
        <Panel title="Auditor portal access" flush>
          <ul aria-label="Auditor portal access" className="flex flex-col text-sm">
            {[
              { name: a.lead, role: "Lead auditor", last: "Viewed 2 h ago" },
              { name: "Ivy Grant", role: "Associate", last: "Viewed yesterday" },
            ].map((p) => (
              <li key={p.name} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <Avatar name={p.name} size="sm" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate font-medium">{p.name}</span>
                  <span className="text-2xs text-fg-muted">
                    {p.role} · {p.last}
                  </span>
                </span>
                <Badge tone="info">Read only</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Reports */

interface Report {
  id: string;
  name: string;
  framework: string;
  period: string;
  size: string;
  by: string;
  created: string;
}

const REPORTS: Report[] = [
  { id: "rp1", name: "SOC 2 readiness pack", framework: "SOC 2", period: "Q3 2026", size: "48 MB", by: PEOPLE[1], created: "Oct 2" },
  { id: "rp2", name: "GDPR Article 30 register", framework: "GDPR", period: "Sep 2026", size: "2.1 MB", by: PEOPLE[3], created: "Sep 30" },
  { id: "rp3", name: "PCI DSS evidence binder", framework: "PCI DSS", period: "H1 2026", size: "112 MB", by: PEOPLE[6], created: "Jul 14" },
  { id: "rp4", name: "ISO 27001 statement of applicability", framework: "ISO 27001", period: "2026", size: "860 KB", by: PEOPLE[1], created: "Mar 3" },
];

const PACKS: Array<{ id: string; framework: Framework; title: string; contents: string }> = [
  {
    id: "iso",
    framework: "ISO 27001",
    title: "Statement of applicability and evidence",
    contents: "SoA, Annex A control status, evidence index, risk treatment plan",
  },
  { id: "soc2", framework: "SOC 2", title: "Trust services criteria pack", contents: "Control matrix, population lists, samples, exceptions" },
  { id: "gdpr", framework: "GDPR", title: "Records of processing and DPIAs", contents: "Article 30 register, DPIAs, transfer register, breach log" },
  { id: "pci", framework: "PCI DSS", title: "Report on compliance binder", contents: "Requirement status, CDE scope, scan reports, key management" },
];

function ReportsPage() {
  const [reports, setReports] = useState(REPORTS);
  const [pack, setPack] = useState<string>("iso");
  const [period, setPeriod] = useState("q4");
  const [format, setFormat] = useState<"pdf" | "zip">("zip");
  const [generated, setGenerated] = useState("");
  const p = PACKS.find((x) => x.id === pack)!;
  const cols: Column<Report>[] = [
    { id: "name", header: "Report", width: "32%", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
    { id: "framework", header: "Framework", cell: (r) => <Badge>{r.framework}</Badge> },
    { id: "period", header: "Period", cell: (r) => r.period },
    { id: "size", header: "Size", align: "right", mono: true, cell: (r) => r.size },
    { id: "by", header: "Created by", cell: (r) => <Owner name={r.by} /> },
    { id: "created", header: "Created", cell: (r) => <span className="text-xs text-fg-muted">{r.created}</span> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "48px",
      align: "right",
      hideable: false,
      cell: (r) => (
        <IconButton label={`Download ${r.name}`} size="xs">
          <Download />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Reports" description="Audit-ready packs with control status, evidence and signatures, exported for your auditor" />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Choose a pack">
          <div role="radiogroup" aria-label="Report pack" className="grid gap-2 sm:grid-cols-2">
            {PACKS.map((x) => (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={pack === x.id}
                onClick={() => setPack(x.id)}
                className={
                  pack === x.id
                    ? "flex flex-col items-start gap-1 rounded-md border border-accent bg-accent-soft px-3 py-2 text-left"
                    : "flex flex-col items-start gap-1 rounded-md border border-line bg-surface px-3 py-2 text-left hover:bg-subtle"
                }
              >
                <span className="text-sm font-semibold text-fg">{x.framework}</span>
                <span className="text-xs text-fg-muted">{x.title}</span>
              </button>
            ))}
          </div>
        </Panel>
        <Panel title={`${p.framework} · ${p.title}`} description={p.contents}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const name = `${p.framework} ${p.title.toLowerCase()}`;
              setReports((rs) => [
                {
                  id: `rp${rs.length + 1}`,
                  name,
                  framework: p.framework,
                  period: period === "q4" ? "Q4 2026" : period === "ytd" ? "2026 to date" : "Last 12 months",
                  size: format === "zip" ? "64 MB" : "3.4 MB",
                  by: "Emily Clark",
                  created: "Just now",
                },
                ...rs,
              ]);
              setGenerated(`Generated ${name}`);
            }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField
                label="Period"
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                options={[
                  { value: "q4", label: "Q4 2026" },
                  { value: "ytd", label: "2026 to date" },
                  { value: "12m", label: "Last 12 months" },
                ]}
              />
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium">Format</span>
                <SegmentedControl
                  label="Format"
                  value={format}
                  onChange={setFormat}
                  options={[
                    { value: "zip", label: "ZIP with evidence" },
                    { value: "pdf", label: "PDF summary" },
                  ]}
                />
              </div>
            </div>
            <Checkbox label="Include failing controls with remediation plans" defaultChecked />
            <Checkbox label="Sign the pack" description="Adds a detached signature so the auditor can verify nothing changed." defaultChecked />
            <Checkbox label="Redact personal data in user lists" description="Names become pseudonymous IDs; required for GDPR minimisation." />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary" icon={<FileText />}>
                Generate report
              </Button>
              {generated && (
                <span role="status" className="text-xs text-success">
                  {generated}
                </span>
              )}
            </div>
          </form>
        </Panel>
      </div>
      <Panel title="Generated reports" description="Kept for 400 days · downloads are logged in Audit" flush>
        <DataTable label="Generated reports" columns={cols} rows={reports} getRowId={(r) => r.id} minWidth={820} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ app */

const PAGES = {
  frameworks: () => <FrameworksPage />,
  controls: () => <ControlsPage />,
  evidence: () => <EvidencePage />,
  policies: () => <PoliciesPage />,
  audits: () => <AuditsPage />,
  reports: () => <ReportsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="compliance" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

/** Overview: score per framework, 90-day trend and the controls with their evidence source. */
export const Overview: Story = {
  ...app("frameworks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Compliance overview" })).toBeInTheDocument();
    for (const f of ["ISO 27001", "GDPR", "SOC 2", "PCI DSS"]) await expect(c.getAllByText(f).length).toBeGreaterThan(0);

    const table = c.getByRole("table", { name: "Controls" });
    // Failing first by default.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Failing");

    // The callout jumps to failing controls.
    await userEvent.click(c.getByRole("button", { name: "Show failing" }));
    await expect(c.getByRole("tab", { name: /Failing/ })).toHaveAttribute("aria-selected", "true");
    const failingRows = within(table).getAllByRole("row").slice(1);
    await expect(failingRows).toHaveLength(CONTROLS.filter((x) => x.status === "failing").length);

    // Framework facet narrows further.
    await userEvent.click(within(c.getByRole("toolbar", { name: "Filters" })).getByRole("button", { name: /^Framework/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /SOC 2/ }));
    await userEvent.keyboard("{Escape}");
    const soc = within(table).getAllByRole("row").slice(1);
    await expect(soc).toHaveLength(3);
    for (const r of soc) await expect(r).toHaveTextContent("SOC 2");
    await expect(table).toHaveTextContent("CC6.8");
  },
};

export const Controls: Story = {
  ...app("controls"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Tests for A.8.8" })).toHaveTextContent("CVE-2024-6387");
    await userEvent.click(within(c.getByRole("table", { name: "All controls" })).getByText("Change management"));
    const detail = c.getByRole("region", { name: "Control detail" });
    await expect(detail).toHaveTextContent("A.8.32, PCI 6.5.1");
    await userEvent.click(within(detail).getByRole("button", { name: "Re-check now" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("Re-checked CC8.1 just now");
  },
};

export const EvidenceLibrary: Story = {
  name: "Evidence",
  ...app("evidence"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Stale or expired/ }));
    const table = c.getByRole("table", { name: "Evidence library" });
    await expect(within(table).getAllByRole("row")).toHaveLength(EVIDENCE.filter((e) => e.freshness !== "fresh").length + 1);
    await userEvent.click(within(table).getByRole("button", { name: "Collect now: Secret rotation history" }));
    await expect(c.getByText("Collected “Secret rotation history” again")).toBeInTheDocument();
    await expect(within(table).queryByText("Secret rotation history")).not.toBeInTheDocument();
    localStorage.removeItem("oa-table:compliance-evidence");
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Policy detail" });
    await expect(within(detail).getByRole("heading", { name: "Acceptable use policy" })).toBeInTheDocument();
    await userEvent.click(within(detail).getByRole("button", { name: "Send reminder to 41 people" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("Reminder sent to 41 people");
    await userEvent.click(c.getByRole("radio", { name: "Review due" }));
    await expect(within(c.getByRole("table", { name: "Policy documents" })).getAllByRole("row")).toHaveLength(3);
  },
};

export const Audits: Story = {
  ...app("audits"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("3 requests open for ISO 27001 surveillance 2026")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Submit R-101" }));
    await expect(c.getByText("2 requests open for ISO 27001 surveillance 2026")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Show SOC 2 requests" }));
    await expect(c.getByRole("table", { name: "Auditor requests" })).toHaveTextContent("Change tickets sample");
  },
};

export const Reports: Story = {
  ...app("reports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: /PCI DSS/ }));
    await userEvent.click(c.getByRole("button", { name: "Generate report" }));
    await expect(c.getByRole("status")).toHaveTextContent("Generated PCI DSS report on compliance binder");
    const table = c.getByRole("table", { name: "Generated reports" });
    await expect(within(table).getAllByRole("row")).toHaveLength(REPORTS.length + 2);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
