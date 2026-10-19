import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Building2, ClipboardList, FileBarChart, FileDown, ListChecks, Mail, Plus, Send, ShieldHalf } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FilterChip, FacetFilter } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { Heatmap } from "../../charts/Heatmap";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { cn } from "../../lib/cn";
import { TONE_CLASSES, TONE_COLORS, type Tone } from "../../tokens/levels";
import { PEOPLE, emailOf } from "../mocks";

const nav = [
  { id: "register", label: "Register", icon: ClipboardList, count: 48 },
  { id: "vendors", label: "Vendors", icon: Building2, count: 31 },
  { id: "assessments", label: "Assessments", icon: ListChecks, count: 6 },
  { id: "treatments", label: "Treatments", icon: ShieldHalf, count: 24 },
  { id: "reports", label: "Reports", icon: FileBarChart },
];

const meta = {
  title: "Products/Risk",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Score bands on a 1–25 scale (likelihood × impact). */
function band(score: number): { label: string; tone: Tone } {
  if (score >= 20) return { label: "Critical", tone: "critical" };
  if (score >= 10) return { label: "High", tone: "danger" };
  if (score >= 5) return { label: "Medium", tone: "warning" };
  return { label: "Low", tone: "info" };
}

function ScoreBadge({ score }: { score: number }) {
  const b = band(score);
  return (
    <Badge tone={b.tone} mono>
      {score} {b.label}
    </Badge>
  );
}

type Treatment = "Mitigate" | "Accept" | "Transfer" | "Avoid";

interface Link {
  product: "Compliance" | "Vulnerabilities" | "Posture";
  ref: string;
}

interface Risk {
  id: string;
  title: string;
  owner: string;
  inherent: [number, number];
  residual: [number, number];
  treatment: Treatment;
  links: Link[];
  review: string;
  overdue?: boolean;
}

const risks: Risk[] = [
  { id: "R-014", title: "Ransomware encrypts production databases", owner: PEOPLE[0], inherent: [4, 5], residual: [3, 5], treatment: "Mitigate", links: [{ product: "Compliance", ref: "A.8.13 Backup" }, { product: "Posture", ref: "CIS 5.1.3" }], review: "2026-11-02" },
  { id: "R-009", title: "Customer data exposed via public S3 bucket", owner: PEOPLE[3], inherent: [4, 5], residual: [2, 5], treatment: "Mitigate", links: [{ product: "Posture", ref: "S3 block public access" }, { product: "Compliance", ref: "GDPR Art. 32" }], review: "2026-10-28" },
  { id: "R-021", title: "Unpatched edge VPN appliance exploited", owner: PEOPLE[2], inherent: [5, 4], residual: [4, 4], treatment: "Mitigate", links: [{ product: "Vulnerabilities", ref: "CVE-2024-3400" }], review: "2026-10-12", overdue: true },
  { id: "R-003", title: "Payroll vendor breach leaks employee data", owner: PEOPLE[4], inherent: [3, 4], residual: [3, 3], treatment: "Transfer", links: [{ product: "Compliance", ref: "A.5.19 Supplier relationships" }], review: "2026-12-15" },
  { id: "R-017", title: "Phishing leads to finance account takeover", owner: PEOPLE[1], inherent: [5, 3], residual: [3, 3], treatment: "Mitigate", links: [{ product: "Compliance", ref: "SOC 2 CC2.2" }, { product: "Compliance", ref: "A.6.3 Awareness" }], review: "2026-11-20" },
  { id: "R-030", title: "Single region outage stops checkout", owner: PEOPLE[5], inherent: [2, 4], residual: [2, 4], treatment: "Accept", links: [{ product: "Posture", ref: "Multi-AZ RDS" }], review: "2027-01-10" },
  { id: "R-011", title: "Leaked CI token pushes malicious build", owner: PEOPLE[6], inherent: [3, 5], residual: [2, 4], treatment: "Mitigate", links: [{ product: "Vulnerabilities", ref: "GHSA-mw99-9chc-xw7r" }, { product: "Compliance", ref: "A.8.28 Secure coding" }], review: "2026-11-05" },
  { id: "R-025", title: "Laptop theft with unencrypted disk", owner: PEOPLE[7], inherent: [3, 3], residual: [1, 3], treatment: "Mitigate", links: [{ product: "Posture", ref: "FileVault enforced" }], review: "2027-02-01" },
  { id: "R-006", title: "Legacy FTP service kept for one partner", owner: PEOPLE[2], inherent: [3, 3], residual: [1, 1], treatment: "Avoid", links: [{ product: "Posture", ref: "Port 21 closed" }], review: "2027-03-01" },
  { id: "R-019", title: "Insider exports CRM contacts", owner: PEOPLE[4], inherent: [2, 3], residual: [2, 2], treatment: "Accept", links: [{ product: "Compliance", ref: "A.8.12 DLP" }], review: "2026-12-01" },
  { id: "R-033", title: "Log retention below SOC 2 commitment", owner: PEOPLE[0], inherent: [4, 2], residual: [2, 2], treatment: "Mitigate", links: [{ product: "Compliance", ref: "SOC 2 CC7.2" }], review: "2026-11-15" },
  { id: "R-041", title: "Expired TLS certificate on API", owner: PEOPLE[3], inherent: [3, 3], residual: [1, 3], treatment: "Mitigate", links: [{ product: "Posture", ref: "ACME auto-renew" }], review: "2027-01-20" },
];

const score = ([l, i]: [number, number]) => l * i;

const riskColumns: Column<Risk>[] = [
  { id: "id", header: "ID", mono: true, width: "72px", sortValue: (r) => r.id, cell: (r) => r.id },
  { id: "title", header: "Risk", width: "26%", sortValue: (r) => r.title, cell: (r) => <span className="font-medium">{r.title}</span> },
  {
    id: "owner",
    header: "Owner",
    width: "150px",
    sortValue: (r) => r.owner,
    cell: (r) => (
      <span className="flex items-center gap-1.5">
        <Avatar name={r.owner} size="sm" />
        <span className="truncate">{r.owner}</span>
      </span>
    ),
  },
  { id: "inherent", header: "Inherent", width: "110px", sortValue: (r) => score(r.inherent), cell: (r) => <ScoreBadge score={score(r.inherent)} /> },
  { id: "residual", header: "Residual", width: "110px", sortValue: (r) => score(r.residual), cell: (r) => <ScoreBadge score={score(r.residual)} /> },
  { id: "treatment", header: "Treatment", width: "96px", sortValue: (r) => r.treatment, cell: (r) => r.treatment },
  {
    id: "links",
    header: "Linked controls and findings",
    cell: (r) => (
      <span className="flex flex-wrap gap-1">
        {r.links.map((l) =>
          l.ref.startsWith("CVE-") ? (
            <EntityChip key={l.ref} kind="cve" value={l.ref} href="#cve" />
          ) : (
            <a key={l.ref} href={`#${l.product.toLowerCase()}`} className="inline-flex h-5 items-center gap-1 rounded border border-line px-1.5 text-xs text-fg no-underline hover:bg-subtle">
              <span className="text-fg-muted">{l.product}</span>
              <span className="font-mono">{l.ref}</span>
            </a>
          ),
        )}
      </span>
    ),
  },
  {
    id: "review",
    header: "Review",
    width: "110px",
    mono: true,
    sortValue: (r) => r.review,
    cell: (r) => (r.overdue ? <span className="text-danger-text">{r.review}</span> : r.review),
  },
];

const LEVELS = [1, 2, 3, 4, 5] as const;
const IMPACT_NAMES = ["Negligible", "Minor", "Moderate", "Major", "Severe"];
const LIKELIHOOD_NAMES = ["Rare", "Unlikely", "Possible", "Likely", "Almost certain"];

/** 5×5 likelihood × impact matrix; each cell is a filter button. */
function RiskMatrix({
  counts,
  selected,
  onSelect,
}: {
  counts: Map<string, number>;
  selected?: [number, number];
  onSelect: (cell: [number, number] | undefined) => void;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="grid grid-cols-[72px_repeat(5,minmax(0,1fr))] gap-1" role="group" aria-label="Likelihood by impact matrix">
        {[...LEVELS].reverse().map((impact) => (
          <div key={impact} className="contents">
            <span className="flex items-center justify-end pr-1 text-right text-2xs leading-tight text-fg-muted">
              {impact} · {IMPACT_NAMES[impact - 1]}
            </span>
            {LEVELS.map((likelihood) => {
              const n = counts.get(`${likelihood}:${impact}`) ?? 0;
              const s = likelihood * impact;
              const b = band(s);
              const on = selected?.[0] === likelihood && selected?.[1] === impact;
              return (
                <button
                  key={likelihood}
                  type="button"
                  aria-pressed={on}
                  aria-label={`Likelihood ${likelihood}, impact ${impact}, score ${s} ${b.label}: ${n} ${n === 1 ? "risk" : "risks"}`}
                  onClick={() => onSelect(on ? undefined : [likelihood, impact])}
                  className={cn(
                    "flex h-11 flex-col items-center justify-center rounded text-sm font-semibold tabular-nums",
                    TONE_CLASSES[b.tone].soft,
                    on ? "ring-2 ring-fg ring-offset-1 ring-offset-surface" : "hover:ring-1 hover:ring-line-strong",
                  )}
                >
                  {n > 0 ? n : <span aria-hidden className="font-normal">·</span>}
                </button>
              );
            })}
          </div>
        ))}
        <span />
        {LEVELS.map((l) => (
          <span key={l} className="text-center text-2xs leading-tight text-fg-muted">
            {l} · {LIKELIHOOD_NAMES[l - 1]}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 pl-[76px] text-2xs text-fg-muted">
        <span>Likelihood →  ·  Impact ↑</span>
        <span className="flex gap-1">
          <Badge tone="info">1–4 Low</Badge>
          <Badge tone="warning">5–9 Medium</Badge>
          <Badge tone="danger">10–16 High</Badge>
          <Badge tone="critical">20–25 Critical</Badge>
        </span>
      </div>
    </div>
  );
}

interface Vendor {
  name: string;
  service: string;
  data: string;
  tier: string;
  status: { label: string; tone: Tone };
  next: string;
}

const vendors: Vendor[] = [
  { name: "Northwind Payroll", service: "Payroll and HR", data: "Employee PII, bank details", tier: "Tier 1", status: { label: "Review overdue", tone: "danger" }, next: "Due 2026-10-01" },
  { name: "Contoso Cloud Mail", service: "Email and calendar", data: "All internal mail", tier: "Tier 1", status: { label: "In review", tone: "warning" }, next: "SOC 2 Type II report received" },
  { name: "Fabrikam Analytics", service: "Product analytics", data: "Pseudonymised events", tier: "Tier 2", status: { label: "Approved", tone: "success" }, next: "Next review 2027-04" },
];


/** Thin labelled progress bar used for questionnaires and treatment plans. */
function Meter({ label, value, max, tone = "info" }: { label: string; value: number; max: number; tone?: Tone }) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${value} of ${max}`}
      className="h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-subtle"
    >
      <div className={cn("h-full rounded-full", TONE_CLASSES[tone].dot)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Register                                                            */
/* ------------------------------------------------------------------ */

/** Register: the risk matrix filters the register, every risk links to the controls and findings that move its score. */
function RegisterPage() {
  const [view, setView] = useState<"residual" | "inherent">("residual");
  const [cell, setCell] = useState<[number, number] | undefined>();
  const [treatments, setTreatments] = useState<string[]>([]);
  const pos = (r: Risk) => (view === "residual" ? r.residual : r.inherent);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of risks) {
      const [l, i] = view === "residual" ? r.residual : r.inherent;
      m.set(`${l}:${i}`, (m.get(`${l}:${i}`) ?? 0) + 1);
    }
    return m;
  }, [view]);
  const rows = risks.filter((r) => {
    const [l, i] = pos(r);
    return (!cell || (cell[0] === l && cell[1] === i)) && (treatments.length === 0 || treatments.includes(r.treatment));
  });
  return (
    <>
      <PageHeader
        title="Register"
        description="48 risks · ISO 27001 clause 6.1 methodology · scores update from Compliance, Vulnerabilities and Posture"
        meta={<StatusBadge tone="danger">1 review overdue</StatusBadge>}
        actions={
          <Button size="md" variant="primary" icon={<Plus />}>
            New risk
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Open risks" value="48" unit="12 shown here" delta={{ label: "+3 this quarter", direction: "up" }} />
        <KpiCard label="Above appetite" value="4" unit="residual ≥ 15" tone="danger" delta={{ label: "−2 since last review", direction: "down", intent: "good" }} />
        <KpiCard label="Treatments on track" value="83%" unit="20 of 24" delta={{ label: "4 behind plan", intent: "bad" }} />
        <KpiCard label="Reviews due · 30 d" value="9" unit="1 overdue" tone="warning" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Likelihood × impact"
          description="Select a cell to filter the register"
          actions={
            <SegmentedControl
              label="Score shown"
              value={view}
              onChange={(v) => {
                setView(v);
                setCell(undefined);
              }}
              options={[
                { value: "inherent", label: "Inherent" },
                { value: "residual", label: "Residual" },
              ]}
            />
          }
        >
          <RiskMatrix counts={counts} selected={cell} onSelect={setCell} />
        </Panel>
        <Panel title="Vendors" description="31 vendors · 3 need attention" flush>
          <ul className="flex flex-col" aria-label="Vendors needing attention">
            {vendors.map((v) => (
              <li key={v.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="flex items-center gap-1.5">
                    <span className="truncate text-sm font-medium">{v.name}</span>
                    <Badge>{v.tier}</Badge>
                  </span>
                  <span className="truncate text-2xs text-fg-muted">
                    {v.service} · {v.data}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <StatusBadge tone={v.status.tone}>{v.status.label}</StatusBadge>
                  <span className="text-2xs text-fg-muted">{v.next}</span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Risks" description={`${rows.length} of ${risks.length} shown · ${view} position`} flush>
        <div className="border-b border-line px-3 py-2">
          <FilterBar
            onClear={
              cell || treatments.length
                ? () => {
                    setCell(undefined);
                    setTreatments([]);
                  }
                : undefined
            }
          >
            <FacetFilter
              label="Treatment"
              selected={treatments}
              onChange={setTreatments}
              options={(["Mitigate", "Accept", "Transfer", "Avoid"] as const).map((t) => ({ value: t, count: risks.filter((r) => r.treatment === t).length }))}
            />
            <SearchInput label="Search risks" className="w-56" />
            {cell && <FilterChip field="cell" value={`L${cell[0]} × I${cell[1]}`} onRemove={() => setCell(undefined)} />}
          </FilterBar>
        </div>
        <DataTable
          label="Risks"
          columns={riskColumns}
          rows={rows}
          getRowId={(r) => r.id}
          defaultSort={{ id: "residual", direction: "desc" }}
          minWidth={1100}
          empty={<p className="py-8">No risks in this cell</p>}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Vendors                                                             */
/* ------------------------------------------------------------------ */

type DpaStatus = "Signed" | "In negotiation" | "Missing" | "Not required";
type VendorStatus = "Approved" | "In review" | "Review overdue" | "Onboarding" | "Offboarding";

interface VendorRow {
  id: string;
  name: string;
  service: string;
  tier: 1 | 2 | 3;
  data: string[];
  dpa: DpaStatus;
  transfer: string;
  certs: string[];
  answered: number;
  questions: number;
  next: string;
  status: VendorStatus;
  owner: string;
  residual: number;
}

const VENDOR_STATUS: Record<VendorStatus, Tone> = { Approved: "success", "In review": "info", "Review overdue": "danger", Onboarding: "warning", Offboarding: "neutral" };
const DPA_TONE: Record<DpaStatus, Tone> = { Signed: "success", "In negotiation": "warning", Missing: "danger", "Not required": "neutral" };

const VENDORS: VendorRow[] = [
  { id: "v1", name: "Northwind Payroll", service: "Payroll and HR", tier: 1, data: ["Employee PII", "Bank details"], dpa: "Signed", transfer: "EU only", certs: ["ISO 27001"], answered: 64, questions: 64, next: "2026-10-01", status: "Review overdue", owner: PEOPLE[4], residual: 9 },
  { id: "v2", name: "Contoso Cloud Mail", service: "Email and calendar", tier: 1, data: ["Internal mail", "Customer correspondence"], dpa: "Signed", transfer: "SCCs", certs: ["SOC 2 Type II", "ISO 27001"], answered: 58, questions: 64, next: "2026-10-30", status: "In review", owner: PEOPLE[3], residual: 8 },
  { id: "v3", name: "Fabrikam Analytics", service: "Product analytics", tier: 2, data: ["Pseudonymised events"], dpa: "Signed", transfer: "EU–US DPF", certs: ["SOC 2 Type II"], answered: 40, questions: 40, next: "2027-04-12", status: "Approved", owner: PEOPLE[0], residual: 4 },
  { id: "v4", name: "Litware Payments", service: "Card processing", tier: 1, data: ["Cardholder data", "Billing addresses"], dpa: "Signed", transfer: "EU only", certs: ["PCI DSS", "SOC 2 Type II"], answered: 22, questions: 64, next: "2026-11-08", status: "In review", owner: PEOPLE[2], residual: 12 },
  { id: "v5", name: "Tailspin Support Desk", service: "Customer support tickets", tier: 2, data: ["Customer names", "Emails", "Ticket bodies"], dpa: "In negotiation", transfer: "SCCs", certs: ["ISO 27001"], answered: 31, questions: 40, next: "2026-11-20", status: "In review", owner: PEOPLE[5], residual: 10 },
  { id: "v6", name: "Adatum Identity", service: "Workforce directory", tier: 1, data: ["Employee accounts", "MFA factors"], dpa: "Signed", transfer: "EU only", certs: ["SOC 2 Type II", "ISO 27001"], answered: 64, questions: 64, next: "2027-02-15", status: "Approved", owner: PEOPLE[6], residual: 6 },
  { id: "v7", name: "Proseware CI", service: "Hosted build runners", tier: 2, data: ["Source code", "Build secrets"], dpa: "Missing", transfer: "SCCs", certs: ["SOC 2 Type I"], answered: 12, questions: 40, next: "2026-10-25", status: "Onboarding", owner: PEOPLE[7], residual: 15 },
  { id: "v8", name: "Wingtip Hosting", service: "Managed Kubernetes", tier: 1, data: ["Production data", "Backups"], dpa: "Signed", transfer: "EU only", certs: ["ISO 27001", "SOC 2 Type II"], answered: 60, questions: 64, next: "2027-01-30", status: "Approved", owner: PEOPLE[1], residual: 8 },
  { id: "v9", name: "Lucerne Legal", service: "External counsel", tier: 3, data: ["Contracts", "Board minutes"], dpa: "Signed", transfer: "EU only", certs: [], answered: 18, questions: 18, next: "2027-06-01", status: "Approved", owner: PEOPLE[4], residual: 3 },
  { id: "v10", name: "Coho Translations", service: "Website translation", tier: 3, data: ["Marketing copy"], dpa: "Not required", transfer: "Not applicable", certs: [], answered: 10, questions: 18, next: "2027-05-10", status: "Approved", owner: PEOPLE[5], residual: 2 },
  { id: "v11", name: "Trey Research Surveys", service: "Customer surveys", tier: 2, data: ["Customer emails", "Survey answers"], dpa: "Missing", transfer: "SCCs", certs: [], answered: 0, questions: 40, next: "2026-10-28", status: "Onboarding", owner: PEOPLE[0], residual: 12 },
  { id: "v12", name: "Margie's Travel", service: "Business travel booking", tier: 3, data: ["Employee names", "Passport numbers"], dpa: "Signed", transfer: "SCCs", certs: ["ISO 27001"], answered: 18, questions: 18, next: "2026-11-01", status: "Offboarding", owner: PEOPLE[3], residual: 6 },
];

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const needsAttention = (v: VendorRow) => v.status === "Review overdue" || v.dpa === "Missing" || v.dpa === "In negotiation";
const SECTIONS = ["Security governance", "Access control", "Encryption", "Incident response", "Business continuity", "Sub-processors"];

/** Splits a questionnaire into its six sections and fills answers in order. */
function sectionsOf(v: VendorRow) {
  const base = Math.floor(v.questions / SECTIONS.length);
  let extra = v.questions - base * SECTIONS.length;
  let left = v.answered;
  return SECTIONS.map((name) => {
    const total = base + (extra-- > 0 ? 1 : 0);
    const done = Math.min(total, left);
    left -= done;
    return { name, total, done };
  });
}

const vendorColumns: Column<VendorRow>[] = [
  {
    id: "name",
    header: "Vendor",
    pinned: "left",
    width: "210px",
    sortValue: (v) => v.name,
    cell: (v) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{v.name}</span>
        <span className="truncate text-2xs text-fg-muted">{v.service}</span>
      </span>
    ),
  },
  { id: "tier", header: "Tier", width: "70px", sortValue: (v) => v.tier, description: "Tier 1 vendors hold production or personal data at scale and are reviewed yearly; tier 3 every two years.", cell: (v) => <Badge tone={v.tier === 1 ? "warning" : "neutral"}>Tier {v.tier}</Badge> },
  { id: "data", header: "Data processed", width: "200px", cell: (v) => <span className="flex flex-wrap gap-1">{v.data.map((d) => <Badge key={d} variant="outline">{d}</Badge>)}</span> },
  { id: "dpa", header: "DPA", width: "120px", sortValue: (v) => v.dpa, description: "Data processing agreement under GDPR Art. 28.", cell: (v) => <StatusBadge tone={DPA_TONE[v.dpa]}>{v.dpa}</StatusBadge> },
  { id: "transfer", header: "GDPR transfer", width: "120px", description: "Legal basis for personal data leaving the EU: standard contractual clauses (SCCs) or the EU–US Data Privacy Framework (DPF).", cell: (v) => v.transfer },
  { id: "certs", header: "Assurance", width: "170px", cell: (v) => (v.certs.length ? v.certs.join(", ") : <span className="text-fg-muted">None provided</span>) },
  {
    id: "questionnaire",
    header: "Questionnaire",
    width: "150px",
    sortValue: (v) => v.answered / v.questions,
    cell: (v) => (
      <span className="flex flex-col gap-1">
        <span className="font-mono text-2xs text-fg-muted">
          {v.answered}/{v.questions} answered
        </span>
        <Meter label={`${v.name} questionnaire progress`} value={v.answered} max={v.questions} tone={v.answered === v.questions ? "success" : "info"} />
      </span>
    ),
  },
  { id: "residual", header: "Residual", width: "110px", sortValue: (v) => v.residual, cell: (v) => <ScoreBadge score={v.residual} /> },
  { id: "next", header: "Next review", width: "110px", mono: true, sortValue: (v) => v.next, cell: (v) => (v.status === "Review overdue" ? <span className="text-danger-text">{v.next}</span> : v.next) },
  { id: "status", header: "Status", width: "130px", sortValue: (v) => v.status, cell: (v) => <StatusBadge tone={VENDOR_STATUS[v.status]}>{v.status}</StatusBadge> },
];

function VendorsPage() {
  const [tab, setTab] = useState<"all" | "tier1" | "attention">("all");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("v4");
  const [sent, setSent] = useState("");
  const rows = VENDORS.filter(
    (v) =>
      (tab === "all" || (tab === "tier1" ? v.tier === 1 : needsAttention(v))) &&
      (statuses.length === 0 || statuses.includes(v.status)) &&
      v.name.toLowerCase().includes(query.toLowerCase()),
  );
  const v = VENDORS.find((x) => x.id === active)!;
  const email = `security@${slug(v.name)}.example.com`;
  return (
    <>
      <PageHeader
        title="Vendors"
        description="Third parties that process our data · GDPR Art. 28 processors · ISO 27001 A.5.19–A.5.22 supplier controls"
        meta={<StatusBadge tone="danger">1 review overdue</StatusBadge>}
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add vendor
          </Button>
        }
      >
        <Tabs
          label="Vendor view"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All vendors", count: VENDORS.length },
            { value: "tier1", label: "Tier 1", count: VENDORS.filter((x) => x.tier === 1).length },
            { value: "attention", label: "Needs attention", count: VENDORS.filter(needsAttention).length },
          ]}
        />
      </PageHeader>
      <KpiGrid>
        <KpiCard label="Vendors" value="31" unit="12 shown" delta={{ label: "+2 onboarding", direction: "up" }} />
        <KpiCard label="Tier 1" value="9" unit="critical suppliers" />
        <KpiCard label="DPAs missing" value="2" tone="danger" delta={{ label: "Proseware CI, Trey Research", intent: "bad" }} />
        <KpiCard label="Questionnaires complete" value="71%" unit="22 of 31" tone="warning" delta={{ label: "+9 pts this quarter", direction: "up", intent: "good" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Vendors" description={`${rows.length} of ${VENDORS.length} · select a vendor for its review`} flush>
          <div className="border-b border-line px-3 py-2">
            <FilterBar onClear={statuses.length || query ? () => (setStatuses([]), setQuery("")) : undefined}>
              <SearchInput label="Search vendors" value={query} onChange={(e) => setQuery(e.target.value)} className="w-52" />
              <FacetFilter
                label="Status"
                selected={statuses}
                onChange={setStatuses}
                options={(Object.keys(VENDOR_STATUS) as VendorStatus[]).map((s) => ({ value: s, count: VENDORS.filter((x) => x.status === s).length }))}
              />
            </FilterBar>
          </div>
          <DataTable
            label="Vendors"
            columns={vendorColumns}
            rows={rows}
            getRowId={(x) => x.id}
            onRowClick={(x) => {
              setActive(x.id);
              setSent("");
            }}
            activeRowId={active}
            defaultSort={{ id: "residual", direction: "desc" }}
            minWidth={1380}
            persistKey="risk-vendors"
            empty={<p className="py-8">No vendors match</p>}
          />
        </Panel>
        <Panel title={v.name} description={`${v.service} · Tier ${v.tier} · owner ${v.owner}`} actions={<StatusBadge tone={VENDOR_STATUS[v.status]}>{v.status}</StatusBadge>} aria-label="Vendor detail">
          <div className="flex flex-col gap-3">
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-2xs text-fg-muted">DPA</dt>
                <dd>
                  <StatusBadge tone={DPA_TONE[v.dpa]}>{v.dpa}</StatusBadge>
                </dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">GDPR transfer</dt>
                <dd>{v.transfer}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Residual risk</dt>
                <dd>
                  <ScoreBadge score={v.residual} />
                </dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Next review</dt>
                <dd className="font-mono text-xs">{v.next}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold">
                Security questionnaire · {v.answered} of {v.questions}
              </h3>
              <ul className="flex flex-col gap-1.5" aria-label="Questionnaire sections">
                {sectionsOf(v).map((s) => (
                  <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_80px_44px] items-center gap-2 text-xs">
                    <span className="truncate">{s.name}</span>
                    <Meter label={`${s.name} answered`} value={s.done} max={s.total} tone={s.done === s.total ? "success" : "info"} />
                    <span className="text-right font-mono text-2xs text-fg-muted">
                      {s.done}/{s.total}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold">Evidence</h3>
              <ul className="flex flex-col gap-1 text-xs">
                {v.dpa === "Signed" && <li>Data processing agreement · signed, GDPR Art. 28(3) clauses</li>}
                {v.certs.map((c) => (
                  <li key={c}>{c} {c.startsWith("SOC 2") ? "report · period ending 2026-06-30" : "certificate · valid to 2027-09"}</li>
                ))}
                <li>Sub-processor list · {v.tier === 1 ? "14" : "5"} entries</li>
                {v.dpa === "Missing" && <li className="text-danger-text">No DPA on file: personal data must not flow until it is signed</li>}
              </ul>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={<Mail />} onClick={() => setSent(`Reminder sent to ${email}`)}>
                Send questionnaire reminder
              </Button>
              <Button size="sm" variant="ghost">
                Start review
              </Button>
            </div>
            {sent && (
              <p role="status" className="text-xs text-success">
                {sent}
              </p>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Assessments                                                         */
/* ------------------------------------------------------------------ */

type Answer = "yes" | "partial" | "no" | "na";
const ANSWER_VALUE: Record<Answer, number | null> = { yes: 1, partial: 0.5, no: 0, na: null };

interface Question {
  id: string;
  domain: string;
  text: string;
  weight: number;
  evidence: string;
}

const QUESTIONS: Question[] = [
  { id: "q1", domain: "Governance", text: "Named security owner and a policy reviewed every year", weight: 2, evidence: "Policy v4.2, 2026-02" },
  { id: "q2", domain: "Governance", text: "ISO 27001 certificate or SOC 2 Type II report from the last 12 months", weight: 3, evidence: "SOC 2 Type II, period to 2026-06-30" },
  { id: "q3", domain: "Access", text: "SSO with MFA enforced for all staff who can reach our data", weight: 3, evidence: "SOC 2 CC6.1, p. 41" },
  { id: "q4", domain: "Access", text: "Access reviewed quarterly; leavers removed within 24 hours", weight: 2, evidence: "Reviews are half-yearly" },
  { id: "q5", domain: "Encryption", text: "Encryption at rest with AES-256 and keys in a managed KMS", weight: 3, evidence: "Architecture whitepaper §3" },
  { id: "q6", domain: "Encryption", text: "TLS 1.2 or newer everywhere, HSTS on public endpoints", weight: 2, evidence: "TLS scan 2026-10-02: A+" },
  { id: "q7", domain: "Incidents", text: "Breach notification to us within 24 hours of discovery", weight: 3, evidence: "Contract says 72 hours" },
  { id: "q8", domain: "Continuity", text: "Backups restore-tested quarterly; recovery point within 24 hours", weight: 2, evidence: "No restore test evidence" },
  { id: "q9", domain: "Sub-processors", text: "Sub-processor list published with 30 days' notice of changes", weight: 1, evidence: "Public list, RSS feed" },
  { id: "q10", domain: "Data", text: "Data deleted or returned within 30 days of contract end", weight: 2, evidence: "DPA clause 11" },
];

const PATTERNS: Answer[][] = [
  ["yes", "yes", "yes", "partial", "yes", "yes", "partial", "no", "yes", "yes"],
  ["yes", "yes", "partial", "yes", "yes", "yes", "yes", "partial", "yes", "yes"],
  ["partial", "no", "yes", "no", "partial", "yes", "no", "no", "na", "yes"],
];

function scoreOf(answers: Answer[]) {
  let got = 0;
  let max = 0;
  QUESTIONS.forEach((q, i) => {
    const v = ANSWER_VALUE[answers[i] ?? "na"];
    if (v === null) return;
    got += v * q.weight;
    max += q.weight;
  });
  return max ? Math.round((got / max) * 100) : 0;
}

function scoreBand(score: number): { label: string; tone: Tone } {
  if (score >= 80) return { label: "Low risk", tone: "success" };
  if (score >= 60) return { label: "Medium risk", tone: "warning" };
  return { label: "High risk", tone: "danger" };
}

interface Assessment {
  id: string;
  name: string;
  kind: "Vendor" | "Risk";
  owner: string;
  due: string;
  stage: number;
  pattern: number;
}

const STAGES = ["Scope", "Questionnaire", "Scoring", "Approval"];

const ASSESSMENTS: Assessment[] = [
  { id: "A-112", name: "Litware Payments annual review", kind: "Vendor", owner: PEOPLE[2], due: "2026-11-08", stage: 1, pattern: 0 },
  { id: "A-111", name: "Q4 ISO 27001 risk assessment", kind: "Risk", owner: PEOPLE[1], due: "2026-12-15", stage: 1, pattern: 1 },
  { id: "A-110", name: "Proseware CI onboarding", kind: "Vendor", owner: PEOPLE[7], due: "2026-10-25", stage: 0, pattern: 2 },
  { id: "A-108", name: "Tailspin Support Desk review", kind: "Vendor", owner: PEOPLE[5], due: "2026-11-20", stage: 2, pattern: 1 },
  { id: "A-105", name: "SOC 2 CC3.2 annual risk assessment", kind: "Risk", owner: PEOPLE[0], due: "2026-09-30", stage: 4, pattern: 1 },
  { id: "A-101", name: "Contoso Cloud Mail renewal", kind: "Vendor", owner: PEOPLE[3], due: "2026-10-30", stage: 3, pattern: 0 },
];

function stageLabel(stage: number): { label: string; tone: Tone } {
  if (stage >= STAGES.length) return { label: "Approved", tone: "success" };
  if (stage === 3) return { label: "Awaiting approval", tone: "warning" };
  return { label: STAGES[stage]!, tone: "info" };
}

function AssessmentsPage() {
  const [items, setItems] = useState(ASSESSMENTS);
  const [active, setActive] = useState("A-112");
  const [answers, setAnswers] = useState<Record<string, Answer[]>>(() => Object.fromEntries(ASSESSMENTS.map((a) => [a.id, [...PATTERNS[a.pattern]!]])));
  const [notice, setNotice] = useState("");
  const a = items.find((x) => x.id === active)!;
  const mine = answers[a.id]!;
  const score = scoreOf(mine);
  const b = scoreBand(score);
  const domains = Array.from(new Set(QUESTIONS.map((q) => q.domain)));
  const findings = QUESTIONS.map((q, i) => ({ q, a: mine[i]! })).filter((x) => x.a === "no" || x.a === "partial");
  const cols: Column<Assessment>[] = [
    { id: "id", header: "ID", width: "70px", mono: true, cell: (x) => x.id },
    { id: "name", header: "Assessment", sortValue: (x) => x.name, cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "kind", header: "Type", width: "80px", cell: (x) => <Badge variant="outline">{x.kind}</Badge> },
    { id: "owner", header: "Owner", width: "140px", cell: (x) => <span className="flex items-center gap-1.5"><Avatar name={x.owner} size="sm" /><span className="truncate">{x.owner}</span></span> },
    { id: "due", header: "Due", width: "100px", mono: true, sortValue: (x) => x.due, cell: (x) => x.due },
    { id: "score", header: "Score", width: "70px", align: "right", mono: true, sortValue: (x) => scoreOf(answers[x.id]!), description: "Weighted share of controls met: yes counts fully, partial half, N/A is left out.", cell: (x) => scoreOf(answers[x.id]!) },
    { id: "stage", header: "Stage", width: "150px", cell: (x) => <StatusBadge tone={stageLabel(x.stage).tone}>{stageLabel(x.stage).label}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Assessments"
        description="Vendor questionnaires and periodic risk assessments · weighted scoring · approval by the risk owner"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New assessment
          </Button>
        }
      />
      <Panel title="Assessments" description="6 open or recently closed" flush>
        <DataTable label="Assessments" columns={cols} rows={items} getRowId={(x) => x.id} onRowClick={(x) => (setActive(x.id), setNotice(""))} activeRowId={active} minWidth={820} columnMenu={false} />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`${a.id} · ${a.name}`} description={`Owner ${a.owner} · due ${a.due} · ${QUESTIONS.length} weighted questions`} aria-label="Assessment workflow">
          <div className="flex flex-col gap-3">
            <ol className="grid grid-cols-4 gap-1.5" aria-label="Assessment stages">
              {STAGES.map((s, i) => {
                const state = i < a.stage ? "done" : i === a.stage ? "current" : "todo";
                return (
                  <li
                    key={s}
                    aria-current={state === "current" ? "step" : undefined}
                    className={cn(
                      "flex flex-col gap-0.5 rounded-md border px-2 py-1.5 text-xs",
                      state === "current" ? "border-accent bg-accent-soft text-accent-text" : state === "done" ? "border-line bg-surface text-fg" : "border-dashed border-line text-fg-muted",
                    )}
                  >
                    <span className="font-mono text-2xs">{state === "done" ? "Done" : `Step ${i + 1}`}</span>
                    <span className="font-semibold">{s}</span>
                  </li>
                );
              })}
            </ol>
            <ul className="flex flex-col" aria-label="Questions">
              {QUESTIONS.map((q, i) => (
                <li key={q.id} className="grid gap-2 border-b border-subtle py-2 last:border-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="outline">{q.domain}</Badge>
                      <span className="font-mono text-2xs text-fg-muted">weight {q.weight}</span>
                    </span>
                    <span className="text-sm">{q.text}</span>
                    <span className="text-2xs text-fg-muted">Evidence: {q.evidence}</span>
                  </span>
                  <SegmentedControl
                    label={q.text}
                    value={mine[i]!}
                    onChange={(val) => setAnswers((all) => ({ ...all, [a.id]: all[a.id]!.map((x, j) => (j === i ? val : x)) }))}
                    options={[
                      { value: "yes", label: "Yes" },
                      { value: "partial", label: "Partial" },
                      { value: "no", label: "No" },
                      { value: "na", label: "N/A" },
                    ]}
                  />
                </li>
              ))}
            </ul>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="primary"
                icon={<Send />}
                disabled={a.stage >= 3}
                onClick={() => {
                  setItems((xs) => xs.map((x) => (x.id === a.id ? { ...x, stage: 3 } : x)));
                  setNotice(`Submitted ${a.id} to ${PEOPLE[1]} for approval with a score of ${score}`);
                }}
              >
                Submit for approval
              </Button>
              <Button>Save draft</Button>
            </div>
            {notice && (
              <p role="status" className="text-xs text-success">
                {notice}
              </p>
            )}
          </div>
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Score" description="Updates as you answer">
            <div className="flex flex-col gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-semibold tabular-nums" data-testid="assessment-score">
                  {score}
                </span>
                <span className="text-sm text-fg-muted">/ 100</span>
                <StatusBadge tone={b.tone}>{b.label}</StatusBadge>
              </div>
              <ul className="flex flex-col gap-1.5" aria-label="Score by domain">
                {domains.map((d) => {
                  const idx = QUESTIONS.map((q, i) => (q.domain === d ? i : -1)).filter((i) => i >= 0);
                  const s = scoreOf(QUESTIONS.map((_, i) => (idx.includes(i) ? mine[i]! : "na")));
                  return (
                    <li key={d} className="grid grid-cols-[96px_minmax(0,1fr)_32px] items-center gap-2 text-xs">
                      <span className="truncate">{d}</span>
                      <Meter label={`${d} score`} value={s} max={100} tone={scoreBand(s).tone} />
                      <span className="text-right font-mono text-2xs text-fg-muted">{s}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Panel>
          <Panel title="Findings" description="No and partial answers become register entries on approval" flush>
            <ul className="flex flex-col" aria-label="Assessment findings">
              {findings.map((f) => (
                <li key={f.q.id} className="flex items-start gap-2 border-b border-subtle px-3 py-2 text-xs last:border-0">
                  <StatusBadge tone={f.a === "no" ? "danger" : "warning"}>{f.a === "no" ? "Not met" : "Partial"}</StatusBadge>
                  <span className="min-w-0">{f.q.text}</span>
                </li>
              ))}
              {findings.length === 0 && <li className="px-3 py-3 text-xs text-fg-muted">Every control met</li>}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Treatments                                                          */
/* ------------------------------------------------------------------ */

interface Task {
  id: string;
  text: string;
  owner: string;
  due: string;
  done: boolean;
}

type PlanStatus = "On track" | "Behind" | "Not started" | "Done";
const PLAN_TONE: Record<PlanStatus, Tone> = { "On track": "success", Behind: "danger", "Not started": "neutral", Done: "info" };

interface Plan {
  id: string;
  risk: string;
  title: string;
  strategy: Treatment;
  owner: string;
  due: string;
  from: number;
  target: number;
  status: PlanStatus;
  tasks: Task[];
}

const task = (id: string, text: string, owner: string, due: string, done = false): Task => ({ id, text, owner, due, done });

const PLANS: Plan[] = [
  {
    id: "T-31", risk: "R-021", title: "Replace the edge VPN appliance with OpenAsy VPN", strategy: "Mitigate", owner: PEOPLE[2], due: "2026-11-15", from: 16, target: 4, status: "Behind",
    tasks: [
      task("t1", "Stand up lon-01 and fra-01 VPN nodes", PEOPLE[2], "2026-09-20", true),
      task("t2", "Migrate Backend engineers and SRE groups", PEOPLE[3], "2026-10-05", true),
      task("t3", "Migrate contractors", PEOPLE[5], "2026-10-15"),
      task("t4", "Decommission the appliance and close tcp/443 at the edge", PEOPLE[2], "2026-11-01"),
      task("t5", "Remove the appliance from the asset register", PEOPLE[1], "2026-11-15"),
    ],
  },
  {
    id: "T-28", risk: "R-014", title: "Immutable backups with weekly restore tests", strategy: "Mitigate", owner: PEOPLE[0], due: "2026-12-01", from: 15, target: 8, status: "On track",
    tasks: [
      task("t1", "Enable S3 Object Lock on the backup bucket", PEOPLE[0], "2026-09-15", true),
      task("t2", "Separate backup account with its own break-glass role", PEOPLE[6], "2026-10-01", true),
      task("t3", "Weekly automated restore test for orders-db", PEOPLE[0], "2026-10-20", true),
      task("t4", "Restore drill for the full production cluster", PEOPLE[6], "2026-11-20"),
      task("t5", "Evidence to Compliance for ISO 27001 A.8.13", PEOPLE[1], "2026-12-01"),
    ],
  },
  {
    id: "T-27", risk: "R-009", title: "S3 Block Public Access at the account level", strategy: "Mitigate", owner: PEOPLE[3], due: "2026-10-30", from: 10, target: 5, status: "On track",
    tasks: [
      task("t1", "Inventory public buckets with Posture", PEOPLE[3], "2026-10-01", true),
      task("t2", "Move public assets to cdn.example.com", PEOPLE[4], "2026-10-12", true),
      task("t3", "Enable account-wide Block Public Access", PEOPLE[3], "2026-10-20", true),
      task("t4", "SCP that denies disabling it", PEOPLE[6], "2026-10-30"),
    ],
  },
  {
    id: "T-25", risk: "R-017", title: "Phishing-resistant MFA for finance", strategy: "Mitigate", owner: PEOPLE[1], due: "2026-11-30", from: 9, target: 4, status: "On track",
    tasks: [
      task("t1", "Issue passkeys to the finance team", PEOPLE[1], "2026-10-25", true),
      task("t2", "Disable SMS and TOTP for finance accounts", PEOPLE[1], "2026-11-10"),
      task("t3", "Run a phishing simulation with Awareness", PEOPLE[5], "2026-11-30"),
    ],
  },
  {
    id: "T-22", risk: "R-011", title: "Short-lived CI tokens via OIDC federation", strategy: "Mitigate", owner: PEOPLE[6], due: "2026-10-20", from: 8, target: 4, status: "Behind",
    tasks: [
      task("t1", "OIDC trust between CI and the cloud account", PEOPLE[6], "2026-10-01", true),
      task("t2", "Move 14 pipelines off static keys", PEOPLE[4], "2026-10-15"),
      task("t3", "Revoke the remaining long-lived tokens", PEOPLE[6], "2026-10-20"),
    ],
  },
  {
    id: "T-19", risk: "R-003", title: "Cyber insurance rider for payroll vendor breach", strategy: "Transfer", owner: PEOPLE[4], due: "2026-12-15", from: 9, target: 6, status: "Not started",
    tasks: [task("t1", "Quote from the broker", PEOPLE[4], "2026-11-15"), task("t2", "Board approval for the premium", PEOPLE[1], "2026-12-15")],
  },
  {
    id: "T-16", risk: "R-030", title: "Accept single-region checkout risk until 2027", strategy: "Accept", owner: PEOPLE[5], due: "2026-09-30", from: 8, target: 8, status: "Done",
    tasks: [task("t1", "Document the acceptance rationale", PEOPLE[5], "2026-09-15", true), task("t2", "Sign-off by the CFO", PEOPLE[1], "2026-09-30", true)],
  },
  {
    id: "T-12", risk: "R-006", title: "Retire the legacy FTP partner feed", strategy: "Avoid", owner: PEOPLE[2], due: "2026-08-31", from: 9, target: 1, status: "Done",
    tasks: [task("t1", "Move the partner to SFTP", PEOPLE[2], "2026-08-15", true), task("t2", "Close port 21 and delete the service", PEOPLE[2], "2026-08-31", true)],
  },
];

function TreatmentsPage() {
  const [plans, setPlans] = useState(PLANS);
  const [active, setActive] = useState("T-31");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [owner, setOwner] = useState<string>(PEOPLE[0]);
  const p = plans.find((x) => x.id === active)!;
  const done = p.tasks.filter((t) => t.done).length;
  const rows = plans.filter((x) => statuses.length === 0 || statuses.includes(x.status));
  const update = (fn: (pl: Plan) => Plan) => setPlans((ps) => ps.map((x) => (x.id === active ? fn(x) : x)));
  const cols: Column<Plan>[] = [
    { id: "id", header: "Plan", width: "64px", mono: true, cell: (x) => x.id },
    {
      id: "title",
      header: "Treatment",
      sortValue: (x) => x.title,
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{x.title}</span>
          <span className="font-mono text-2xs text-fg-muted">{x.risk}</span>
        </span>
      ),
    },
    { id: "strategy", header: "Strategy", width: "90px", sortValue: (x) => x.strategy, cell: (x) => x.strategy },
    { id: "owner", header: "Owner", width: "140px", sortValue: (x) => x.owner, cell: (x) => <span className="flex items-center gap-1.5"><Avatar name={x.owner} size="sm" /><span className="truncate">{x.owner}</span></span> },
    { id: "due", header: "Due", width: "100px", mono: true, sortValue: (x) => x.due, cell: (x) => (x.status === "Behind" ? <span className="text-danger-text">{x.due}</span> : x.due) },
    {
      id: "progress",
      header: "Tasks",
      width: "130px",
      sortValue: (x) => x.tasks.filter((t) => t.done).length / x.tasks.length,
      cell: (x) => {
        const n = x.tasks.filter((t) => t.done).length;
        return (
          <span className="flex items-center gap-2">
            <Meter label={`${x.id} tasks done`} value={n} max={x.tasks.length} tone={n === x.tasks.length ? "success" : "info"} />
            <span className="font-mono text-2xs text-fg-muted">
              {n}/{x.tasks.length}
            </span>
          </span>
        );
      },
    },
    {
      id: "score",
      header: "Score",
      width: "130px",
      description: "Residual score now, and the target once the plan is complete.",
      cell: (x) => (
        <span className="flex items-center gap-1">
          <ScoreBadge score={x.from} />
          <span aria-hidden className="text-fg-muted">→</span>
          <span className="sr-only">target</span>
          <ScoreBadge score={x.target} />
        </span>
      ),
    },
    { id: "status", header: "Status", width: "110px", sortValue: (x) => x.status, cell: (x) => <StatusBadge tone={PLAN_TONE[x.status]}>{x.status}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Treatments"
        description="Plans that move a risk to its target score · ISO 27001 clause 6.1.3 risk treatment plan"
        meta={<StatusBadge tone="danger">2 behind plan</StatusBadge>}
        actions={
          <Button variant="primary" icon={<Plus />}>
            New plan
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Active plans" value="24" unit="8 shown" />
        <KpiCard label="On track" value="83%" unit="20 of 24" tone="success" />
        <KpiCard label="Behind" value="2" tone="danger" delta={{ label: "T-31 and T-22", intent: "bad" }} />
        <KpiCard label="Score reduction planned" value="−58" unit="points" delta={{ label: "when every plan completes", direction: "down", intent: "good" }} />
      </KpiGrid>
      <Panel title="Treatment plans" description={`${rows.length} plans`} flush>
        <div className="border-b border-line px-3 py-2">
          <FilterBar onClear={statuses.length ? () => setStatuses([]) : undefined}>
            <FacetFilter label="Status" selected={statuses} onChange={setStatuses} options={(Object.keys(PLAN_TONE) as PlanStatus[]).map((s) => ({ value: s, count: plans.filter((x) => x.status === s).length }))} />
          </FilterBar>
        </div>
        <DataTable label="Treatment plans" columns={cols} rows={rows} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} minWidth={1000} />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`${p.id} · ${p.title}`} description={`${p.strategy} ${p.risk} · owner ${p.owner} · due ${p.due}`} aria-label="Plan tasks">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Meter label="Plan progress" value={done} max={p.tasks.length} tone={done === p.tasks.length ? "success" : "info"} />
              <span className="shrink-0 text-xs text-fg-muted">
                {done} of {p.tasks.length} tasks done
              </span>
            </div>
            <fieldset className="flex flex-col gap-2">
              <legend className="sr-only">Tasks</legend>
              {p.tasks.map((t) => (
                <Checkbox
                  key={t.id}
                  label={t.text}
                  description={`${t.owner} · due ${t.due}`}
                  checked={t.done}
                  onChange={() => update((pl) => ({ ...pl, tasks: pl.tasks.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) }))}
                />
              ))}
            </fieldset>
            <form
              className="grid gap-2 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (!draft.trim()) return;
                update((pl) => ({ ...pl, tasks: [...pl.tasks, task(`t${pl.tasks.length + 1}`, draft.trim(), owner, pl.due)] }));
                setDraft("");
              }}
            >
              <TextField label="New task" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Describe the next step" />
              <SelectField label="Task owner" value={owner} onChange={(e) => setOwner(e.target.value)} options={PEOPLE.map((x) => ({ value: x, label: x }))} />
              <Button type="submit" icon={<Plus />}>
                Add task
              </Button>
            </form>
          </div>
        </Panel>
        <Panel title="Linked evidence" description="Where progress is proven">
          <ul className="flex flex-col gap-2 text-sm">
            <li className="flex flex-col gap-0.5">
              <span className="font-medium">Compliance controls</span>
              <span className="text-xs text-fg-muted">ISO 27001 A.8.13 Backup, SOC 2 CC7.2 Monitoring</span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium">Findings closed by this plan</span>
              <span className="flex flex-wrap gap-1">
                <EntityChip kind="cve" value="CVE-2024-3400" href="#cve" />
                <EntityChip kind="host" value="edge-fra-02" href="#host" />
              </span>
            </li>
            <li className="flex flex-col gap-0.5">
              <span className="font-medium">Notify</span>
              <span className="text-xs text-fg-muted">{emailOf(p.owner)} on each overdue task, weekly digest to the risk committee</span>
            </li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const BANDS = ["Critical", "High", "Medium", "Low"];
const BAND_COUNTS = [
  [3, 3, 3, 2, 2, 2, 2, 1, 1, 1, 1, 0],
  [11, 12, 12, 11, 10, 10, 9, 9, 8, 8, 7, 7],
  [17, 17, 18, 19, 19, 20, 20, 21, 21, 22, 22, 23],
  [10, 10, 11, 11, 12, 12, 13, 13, 14, 15, 16, 18],
];
const RESIDUAL_EXPOSURE = [262, 268, 266, 255, 247, 244, 236, 231, 226, 221, 218, 214];
const INHERENT_EXPOSURE = [402, 410, 411, 415, 418, 420, 422, 426, 428, 431, 433, 436];

const CATEGORIES = ["Cyber", "Third party", "Operational", "Compliance", "People"];
const CATEGORY_BANDS = [
  [1, 3, 6, 4],
  [0, 2, 5, 4],
  [0, 1, 6, 5],
  [0, 1, 3, 3],
  [0, 0, 3, 2],
];

const PACK = [
  { id: "summary", label: "Executive summary", pages: 2 },
  { id: "heatmap", label: "Heatmap and 12-month trend", pages: 2 },
  { id: "top", label: "Top 10 risks", pages: 3 },
  { id: "treatments", label: "Treatment progress", pages: 2 },
  { id: "vendors", label: "Vendor risk", pages: 3 },
  { id: "appetite", label: "Appetite statement and exceptions", pages: 1 },
  { id: "appendix", label: "Appendix: full register", pages: 6 },
];

function ReportsPage() {
  const [quarter, setQuarter] = useState<"q3" | "q4">("q4");
  const [sections, setSections] = useState<string[]>(PACK.map((s) => s.id));
  const [generated, setGenerated] = useState("");
  const pages = PACK.filter((s) => sections.includes(s.id)).reduce((n, s) => n + s.pages, 0);
  const q4 = quarter === "q4";
  const top = [...risks].sort((a, b) => score(b.residual) - score(a.residual)).slice(0, 5);
  const previous: Record<string, number> = { "R-014": 15, "R-021": 12, "R-009": 12, "R-003": 9, "R-017": 12 };
  return (
    <>
      <PageHeader
        title="Reports"
        description="Board risk report for the audit committee · ISO 27001 clause 9.3 management review · SOC 2 CC3.1"
        actions={
          <SegmentedControl
            label="Quarter"
            size="md"
            value={quarter}
            onChange={(v) => (setQuarter(v), setGenerated(""))}
            options={[
              { value: "q3", label: "Q3 2026" },
              { value: "q4", label: "Q4 2026" },
            ]}
          />
        }
      />
      <KpiGrid>
        <KpiCard label="Residual exposure" value={q4 ? "214" : "226"} unit="sum of scores" trend={RESIDUAL_EXPOSURE} delta={{ label: q4 ? "−12 vs. Q3" : "−18 vs. Q2", direction: "down", intent: "good" }} />
        <KpiCard label="Above appetite" value={q4 ? "4" : "6"} unit="residual ≥ 15" tone="danger" delta={{ label: q4 ? "−2 vs. Q3" : "−1 vs. Q2", direction: "down", intent: "good" }} />
        <KpiCard label="Critical risks" value={q4 ? "0" : "1"} tone={q4 ? "success" : "critical"} delta={{ label: q4 ? "R-021 down to High" : "R-021 VPN appliance" }} />
        <KpiCard label="Treatments on track" value={q4 ? "83%" : "76%"} unit={q4 ? "20 of 24" : "16 of 21"} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Risks by band" description="Count of open risks per month, residual position">
          <Heatmap label="Open risks by band and month" rows={BANDS} columns={MONTHS} values={BAND_COUNTS} unit="risks" cellHeight={24} />
        </Panel>
        <Panel title="Exposure against appetite" description="Sum of scores across the register; appetite set by the board at 220">
          <TimeSeriesChart
            label="Inherent and residual risk exposure by month"
            labels={MONTHS}
            height={180}
            threshold={{ value: 220, label: "Appetite" }}
            series={[
              { id: "inherent", name: "Inherent", data: INHERENT_EXPOSURE, color: TONE_COLORS.neutral },
              { id: "residual", name: "Residual", data: RESIDUAL_EXPOSURE, color: TONE_COLORS.info },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Top risks" description="Highest residual scores and change since last quarter" flush>
          <DataTable
            label="Top risks"
            rows={top}
            getRowId={(r) => r.id}
            minWidth={640}
            columnMenu={false}
            columns={[
              { id: "id", header: "ID", width: "64px", mono: true, cell: (r) => r.id },
              { id: "title", header: "Risk", cell: (r) => <span className="font-medium">{r.title}</span> },
              { id: "owner", header: "Owner", width: "130px", cell: (r) => r.owner },
              { id: "now", header: "Now", width: "110px", cell: (r) => <ScoreBadge score={score(r.residual)} /> },
              {
                id: "change",
                header: "Change",
                width: "90px",
                align: "right",
                mono: true,
                description: "Residual score change since the Q3 2026 report.",
                cell: (r) => {
                  const d = score(r.residual) - (previous[r.id] ?? score(r.residual));
                  return d === 0 ? <span className="text-fg-muted">0</span> : <span className={d > 0 ? "text-danger-text" : "text-success"}>{d > 0 ? `+${d}` : d}</span>;
                },
              },
            ]}
          />
        </Panel>
        <Panel title="Risks by category" description="Residual band per category">
          <StackedBarChart
            label="Open risks by category and band"
            categories={CATEGORIES}
            height={180}
            segments={[
              { id: "critical", name: "Critical", color: TONE_COLORS.critical },
              { id: "high", name: "High", color: TONE_COLORS.danger },
              { id: "medium", name: "Medium", color: TONE_COLORS.warning },
              { id: "low", name: "Low", color: TONE_COLORS.info },
            ]}
            values={CATEGORY_BANDS}
          />
        </Panel>
      </div>
      <Panel aria-label="Board pack" title="Board pack" description="Choose the sections, then export a signed PDF for the audit committee">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <fieldset className="flex flex-col gap-1.5">
            <legend className="mb-1 text-xs font-semibold">Sections</legend>
            {PACK.map((s) => (
              <Checkbox
                key={s.id}
                label={s.label}
                description={`${s.pages} ${s.pages === 1 ? "page" : "pages"}`}
                checked={sections.includes(s.id)}
                onChange={() => (setSections((xs) => (xs.includes(s.id) ? xs.filter((x) => x !== s.id) : [...xs, s.id])), setGenerated(""))}
              />
            ))}
          </fieldset>
          <div className="flex flex-col gap-2">
            <Callout tone="info" title="What the board sees">
              Scores, trends and named owners only. Vendor contracts and evidence stay in OpenAsy and are linked, not attached.
            </Callout>
            <p className="text-sm">
              {sections.length} sections · <span className="font-semibold">{pages} pages</span>
            </p>
            <div>
              <Button
                variant="primary"
                icon={<FileDown />}
                disabled={sections.length === 0}
                onClick={() => setGenerated(`board-pack-${quarter}-2026.pdf ready · ${pages} pages · signed by ${PEOPLE[1]}`)}
              >
                Generate board pack
              </Button>
            </div>
            {generated && (
              <p role="status" className="text-xs text-success">
                {generated}
              </p>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App and stories                                                     */
/* ------------------------------------------------------------------ */

const PAGES = {
  register: () => <RegisterPage />,
  vendors: () => <VendorsPage />,
  assessments: () => <AssessmentsPage />,
  treatments: () => <TreatmentsPage />,
  reports: () => <ReportsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="risk" nav={nav} pages={PAGES} initial={initial} /> });

export const Register: Story = {
  ...app("register"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Register" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Risks" });
    await expect(within(table).getAllByRole("row")).toHaveLength(risks.length + 1);

    const matrix = within(c.getByRole("group", { name: "Likelihood by impact matrix" }));
    await expect(matrix.getAllByRole("button")).toHaveLength(25);
    const cell = matrix.getByRole("button", { name: /^Likelihood 3, impact 3,.*: 2 risks$/ });
    await userEvent.click(cell);
    await expect(cell).toHaveAttribute("aria-pressed", "true");
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await expect(within(table).getByText("Payroll vendor breach leaks employee data")).toBeInTheDocument();
    await expect(within(table).getByText("Phishing leads to finance account takeover")).toBeInTheDocument();

    await userEvent.click(matrix.getByRole("button", { name: /^Likelihood 3, impact 5,/ }));
    await expect(within(table).getAllByRole("row")).toHaveLength(2);
    await expect(within(table).getByText("R-014")).toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(risks.length + 1);
  },
};

export const Vendors: Story = {
  ...app("vendors"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Vendors" });
    await expect(within(table).getAllByRole("row")).toHaveLength(VENDORS.length + 1);
    await userEvent.click(c.getByRole("tab", { name: /Needs attention/ }));
    await expect(within(table).getAllByRole("row")).toHaveLength(5);
    await userEvent.click(within(table).getByText("Proseware CI"));
    const detail = c.getByRole("region", { name: "Vendor detail" });
    await expect(detail).toHaveTextContent("No DPA on file");
    await userEvent.click(within(detail).getByRole("button", { name: "Send questionnaire reminder" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("security@proseware-ci.example.com");
    localStorage.removeItem("oa-table:risk-vendors");
  },
};

export const Assessments: Story = {
  ...app("assessments"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByTestId("assessment-score")).toHaveTextContent("80");
    const q = within(c.getByRole("radiogroup", { name: "Encryption at rest with AES-256 and keys in a managed KMS" }));
    await userEvent.click(q.getByRole("radio", { name: "No" }));
    await expect(c.getByTestId("assessment-score")).toHaveTextContent("67");
    await expect(c.getByText("Medium risk")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Submit for approval" }));
    await expect(c.getByRole("status")).toHaveTextContent("Submitted A-112 to Emily Clark for approval with a score of 67");
  },
};

export const Treatments: Story = {
  ...app("treatments"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const plan = within(c.getByRole("region", { name: "Plan tasks" }));
    await expect(plan.getByText("2 of 5 tasks done")).toBeInTheDocument();
    await userEvent.click(plan.getByRole("checkbox", { name: /Migrate contractors/ }));
    await expect(plan.getByText("3 of 5 tasks done")).toBeInTheDocument();
    await userEvent.type(plan.getByRole("textbox", { name: "New task" }), "Notify partners of the new VPN endpoint");
    await userEvent.click(plan.getByRole("button", { name: "Add task" }));
    await expect(plan.getByText("3 of 6 tasks done")).toBeInTheDocument();
  },
};

export const Reports: Story = {
  ...app("reports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("19 pages")).toBeInTheDocument();
    await userEvent.click(c.getByRole("checkbox", { name: /Appendix: full register/ }));
    await expect(c.getByText("13 pages")).toBeInTheDocument();
    const pack = within(c.getByRole("region", { name: "Board pack" }));
    await userEvent.click(pack.getByRole("button", { name: "Generate board pack" }));
    await expect(pack.getByText(/^board-pack-q4-2026\.pdf ready/)).toHaveTextContent("board-pack-q4-2026.pdf ready · 13 pages");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
