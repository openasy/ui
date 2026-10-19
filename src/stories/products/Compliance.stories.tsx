import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ClipboardList, Download, FileCheck2, FileText, Gavel, Library, ScrollText, ShieldCheck } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import type { Tone } from "../../tokens/levels";
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

type Framework = "ISO 27001" | "KVKK" | "SOC 2" | "PCI DSS";
type CtlStatus = "passing" | "failing" | "needs-evidence";

const STATUS: Record<CtlStatus, { label: string; tone: Tone }> = {
  passing: { label: "Passing", tone: "success" },
  failing: { label: "Failing", tone: "danger" },
  "needs-evidence": { label: "Needs evidence", tone: "warning" },
};

const FRAMEWORKS: Array<{ id: Framework; total: number; passing: number; failing: number; audit: string; trend: number }> = [
  { id: "ISO 27001", total: 93, passing: 86, failing: 2, audit: "Surveillance audit Nov 18", trend: 3 },
  { id: "KVKK", total: 41, passing: 38, failing: 1, audit: "VERBİS updated Sep 30", trend: 1 },
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
  { id: "A.8.16", title: "Monitoring activities", framework: "ISO 27001", status: "passing", source: "logs", evidence: "Retention 30 d on 48 hosts", owner: PEOPLE[2], checked: "4 m ago", checkedSort: 4 },
  { id: "A.8.8", title: "Management of technical vulnerabilities", framework: "ISO 27001", status: "failing", source: "vulnerabilities", evidence: "2 critical CVEs older than 14 d", owner: PEOPLE[7], checked: "12 m ago", checkedSort: 12 },
  { id: "A.8.7", title: "Protection against malware", framework: "ISO 27001", status: "failing", source: "malware", evidence: "Active detection on api-prod-03", owner: PEOPLE[4], checked: "9 m ago", checkedSort: 9 },
  { id: "A.5.15", title: "Access control", framework: "ISO 27001", status: "passing", source: "identity", evidence: "SSO enforced, 197/214 with MFA", owner: PEOPLE[1], checked: "1 h ago", checkedSort: 60 },
  { id: "A.8.24", title: "Use of cryptography", framework: "ISO 27001", status: "needs-evidence", source: "posture", evidence: "Key rotation policy not uploaded", owner: PEOPLE[5], checked: "2 d ago", checkedSort: 2880 },
  { id: "A.5.24", title: "Incident management planning", framework: "ISO 27001", status: "passing", source: "incidents", evidence: "8 incidents, 6 postmortems", owner: PEOPLE[4], checked: "3 h ago", checkedSort: 180 },
  { id: "KVKK 12/1", title: "Prevent unlawful processing of personal data", framework: "KVKK", status: "passing", source: "access", evidence: "JIT database access, sessions recorded", owner: PEOPLE[0], checked: "18 m ago", checkedSort: 18 },
  { id: "KVKK 12/3", title: "Audit logs for personal data access", framework: "KVKK", status: "failing", source: "audit", evidence: "db-prod-02 audit log gap 13:20–13:55", owner: PEOPLE[3], checked: "6 m ago", checkedSort: 6 },
  { id: "KVKK 9", title: "Transfer of personal data abroad", framework: "KVKK", status: "needs-evidence", source: "infrastructure", evidence: "fra-01 region needs signed DPA", owner: PEOPLE[6], checked: "5 d ago", checkedSort: 7200 },
  { id: "CC6.1", title: "Logical access security", framework: "SOC 2", status: "passing", source: "vpn", evidence: "214 people, per-group routes", owner: PEOPLE[1], checked: "22 m ago", checkedSort: 22 },
  { id: "CC6.8", title: "Prevent unauthorized software", framework: "SOC 2", status: "failing", source: "runtime", evidence: "Unsigned binary kworkerd executed", owner: PEOPLE[4], checked: "9 m ago", checkedSort: 9 },
  { id: "CC7.2", title: "Monitor system components for anomalies", framework: "SOC 2", status: "passing", source: "siem", evidence: "142 Sigma rules enabled", owner: PEOPLE[2], checked: "31 m ago", checkedSort: 31 },
  { id: "CC8.1", title: "Change management", framework: "SOC 2", status: "failing", source: "sast", evidence: "3 merges without review this week", owner: PEOPLE[0], checked: "2 h ago", checkedSort: 120 },
  { id: "CC7.4", title: "Respond to security incidents", framework: "SOC 2", status: "failing", source: "incidents", evidence: "INC-137 postmortem overdue", owner: PEOPLE[3], checked: "1 h ago", checkedSort: 60 },
  { id: "PCI 6.3.3", title: "Patch critical vulnerabilities within one month", framework: "PCI DSS", status: "failing", source: "vulnerabilities", evidence: "CVE-2024-6387 on 3 in-scope hosts", owner: PEOPLE[7], checked: "12 m ago", checkedSort: 12 },
  { id: "PCI 10.2.1", title: "Audit logs capture user access to cardholder data", framework: "PCI DSS", status: "passing", source: "logs", evidence: "Pipeline pci-audit · 1 y archive", owner: PEOPLE[2], checked: "8 m ago", checkedSort: 8 },
  { id: "PCI 11.3.1", title: "Internal vulnerability scans quarterly", framework: "PCI DSS", status: "passing", source: "vulnerabilities", evidence: "Last full scan Oct 14", owner: PEOPLE[7], checked: "5 d ago", checkedSort: 7200 },
  { id: "PCI 6.4.2", title: "Web application firewall or automated testing", framework: "PCI DSS", status: "needs-evidence", source: "dast", evidence: "checkout.example.com not scanned in 45 d", owner: PEOPLE[6], checked: "45 d ago", checkedSort: 64800 },
  { id: "PCI 8.4.2", title: "MFA for all access into the CDE", framework: "PCI DSS", status: "passing", source: "identity", evidence: "Passkeys or TOTP on CDE group", owner: PEOPLE[1], checked: "1 h ago", checkedSort: 60 },
  { id: "PCI 3.6.1", title: "Protect cryptographic keys", framework: "PCI DSS", status: "failing", source: "secrets", evidence: "Leaked Stripe key, rotated, review pending", owner: PEOPLE[5], checked: "2 d ago", checkedSort: 2880 },
];

const DAYS = 90;
const dayLabels = Array.from({ length: DAYS }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 19 - (DAYS - 1 - i)));
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
});
const score = (base: number, seed: number, drop = 0, dropAt = 70) =>
  wave(DAYS, { base, amp: 1.2, noise: 0.6, seed, spike: drop, spikeAt: dropAt, spikeLen: 3 }).map((v, i) => Math.min(100, v + i * 0.06));

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
  {
    id: "source",
    header: "Evidence from",
    sortValue: (c) => PRODUCTS[c.source].name,
    cell: (c) => {
      const P = PRODUCTS[c.source];
      return (
        <a href={`#${c.source}`} className="inline-flex items-center gap-1.5 text-xs text-fg no-underline hover:underline">
          <P.icon aria-hidden className="size-3.5 text-fg-muted" />
          {P.name}
        </a>
      );
    },
  },
  {
    id: "owner",
    header: "Owner",
    sortValue: (c) => c.owner,
    cell: (c) => (
      <span className="flex items-center gap-1.5">
        <Avatar name={c.owner} size="sm" />
        <span className="truncate text-xs">{c.owner}</span>
      </span>
    ),
  },
  { id: "checked", header: "Last checked", align: "right", sortValue: (c) => -c.checkedSort, cell: (c) => <span className="text-xs whitespace-nowrap text-fg-muted">{c.checked}</span> },
];

/* --------------------------------------------------------------- stories */

type StatusTab = "all" | CtlStatus;

/** Overview: score per framework, 90-day trend and the controls with their evidence source. */
export const Overview: Story = {
  render: () => {
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
      <ProductFrame product="compliance" nav={nav} active="frameworks">
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
                delta={{ label: `${f.trend > 0 ? "+" : "−"}${Math.abs(f.trend)} pts in 30 d`, direction: f.trend > 0 ? "up" : "down", intent: f.trend > 0 ? "good" : "bad" }}
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
                { id: "kvkk", name: "KVKK", data: score(88, 72, -2, 86) },
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
            <DataTable label="Controls" columns={columns} rows={rows} getRowId={(c) => c.id} defaultSort={{ id: "status", direction: "desc" }} pageSize={12} minWidth={960} />
          </div>
        </Panel>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Compliance overview" })).toBeInTheDocument();
    for (const f of ["ISO 27001", "KVKK", "SOC 2", "PCI DSS"]) await expect(c.getAllByText(f).length).toBeGreaterThan(0);

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
