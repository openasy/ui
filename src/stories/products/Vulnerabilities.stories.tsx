import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Boxes, FileCode2, ListChecks, Play, Server, ShieldCheck, ShieldOff, TriangleAlert, X } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Tabs } from "../../components/Tabs";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
import { HOSTS, wave } from "../mocks";

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

const columns: Column<Finding>[] = [
  { id: "sev", header: "Severity", width: "100px", sortValue: (f) => SEVERITY_META[f.severity].rank, cell: (f) => <SeverityBadge severity={f.severity} /> },
  {
    id: "cve",
    header: "Vulnerability",
    width: "32%",
    sortValue: (f) => f.id,
    cell: (f) => (
      <span className="flex min-w-0 flex-col">
        {/* Click bubbles to the row handler; the button makes it keyboard reachable. */}
        <button type="button" className="self-start font-mono text-xs font-medium text-fg hover:underline">
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
  { id: "affected", header: "Affected", align: "right", sortValue: (f) => f.hosts + f.images, cell: (f) => <span className="whitespace-nowrap">{f.hosts} hosts · {f.images} images</span> },
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
export const Findings: Story = {
  render: () => {
    const [range, setRange] = useState("30d");
    const [tab, setTab] = useState<TabId>("fix");
    const [sev, setSev] = useState<string[]>([]);
    const [open, setOpen] = useState<Finding | null>(null);
    const rows = findings.filter((f) => sev.length === 0 || sev.includes(f.severity));
    return (
      <ProductFrame product="vulnerabilities" nav={nav} active="findings">
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
          <KpiCard label="Critical" value="7" footer={<SeverityBadge severity="critical" />} delta={{ label: "−2 vs. last week", direction: "down", intent: "good" }} />
          <KpiCard label="High" value="38" footer={<SeverityBadge severity="high" />} delta={{ label: "+4 vs. last week", direction: "up", intent: "bad" }} />
          <KpiCard label="Medium" value="121" footer={<SeverityBadge severity="medium" />} delta={{ label: "−9 vs. last week", direction: "down", intent: "good" }} />
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
              columns={columns}
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
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
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
  },
};
