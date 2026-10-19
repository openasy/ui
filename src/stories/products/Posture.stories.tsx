import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookCheck, ClipboardList, Cloud, LayoutGrid, ListChecks, ShieldOff, TriangleAlert } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
import { wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "accounts", label: "Accounts", icon: Cloud, count: 6 },
  { id: "checks", label: "Checks", icon: ListChecks, count: "1,420" },
  { id: "misconfigurations", label: "Misconfigurations", icon: TriangleAlert, count: 87 },
  { id: "benchmarks", label: "Benchmarks", icon: BookCheck },
  { id: "exceptions", label: "Exceptions", icon: ShieldOff },
];

const meta = {
  title: "Products/Posture",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type CloudKind = "AWS" | "Azure" | "GCP" | "Kubernetes";

interface Account {
  id: string;
  name: string;
  cloud: CloudKind;
  score: number;
  failing: number;
  seed: number;
}

const accounts: Account[] = [
  { id: "aws-prod", name: "AWS prod", cloud: "AWS", score: 78, failing: 31, seed: 41 },
  { id: "aws-staging", name: "AWS staging", cloud: "AWS", score: 71, failing: 22, seed: 42 },
  { id: "azure", name: "Azure", cloud: "Azure", score: 84, failing: 9, seed: 43 },
  { id: "gcp", name: "GCP", cloud: "GCP", score: 89, failing: 6, seed: 44 },
  { id: "k8s-prod", name: "k8s prod-eu", cloud: "Kubernetes", score: 66, failing: 13, seed: 45 },
  { id: "k8s-ops", name: "k8s ops", cloud: "Kubernetes", score: 81, failing: 6, seed: 46 },
];

const scoreTone = (s: number): Tone => (s >= 85 ? "success" : s >= 75 ? "warning" : "danger");

type FindingStatus = "open" | "in-progress" | "excepted";
const STATUS: Record<FindingStatus, { label: string; tone: Tone }> = {
  open: { label: "Open", tone: "danger" },
  "in-progress": { label: "In progress", tone: "warning" },
  excepted: { label: "Excepted", tone: "neutral" },
};

interface Misconfig {
  id: string;
  severity: Severity;
  title: string;
  resource: string;
  account: string;
  cloud: CloudKind;
  benchmark: string;
  status: FindingStatus;
  fix: string;
}

const misconfigs: Misconfig[] = [
  {
    id: "m1",
    severity: "critical",
    title: "S3 bucket publicly readable",
    resource: "arn:aws:s3:::acme-invoices-export",
    account: "AWS prod",
    cloud: "AWS",
    benchmark: "CIS AWS 2.1.5",
    status: "open",
    fix: "Enable Block Public Access on the bucket and account",
  },
  {
    id: "m2",
    severity: "high",
    title: "Security group allows 0.0.0.0/0 on 22",
    resource: "sg-0a91f3c2e7d1b4410",
    account: "AWS staging",
    cloud: "AWS",
    benchmark: "CIS AWS 5.2",
    status: "in-progress",
    fix: "Restrict SSH to the VPN range or use Access JIT",
  },
  {
    id: "m3",
    severity: "critical",
    title: "Root account without MFA",
    resource: "arn:aws:iam::210987654321:root",
    account: "AWS prod",
    cloud: "AWS",
    benchmark: "CIS AWS 1.5",
    status: "open",
    fix: "Register a hardware MFA device for the root user",
  },
  {
    id: "m4",
    severity: "high",
    title: "Kubernetes pod running privileged",
    resource: "payments/payments-api-7c9d5f-x2k8q",
    account: "k8s prod-eu",
    cloud: "Kubernetes",
    benchmark: "CIS K8s 5.2.1",
    status: "open",
    fix: "Set securityContext.privileged: false and enforce Pod Security restricted",
  },
  {
    id: "m5",
    severity: "high",
    title: "RDS snapshot public",
    resource: "rds:orders-db-2024-09-30",
    account: "AWS prod",
    cloud: "AWS",
    benchmark: "CIS AWS 2.3.3",
    status: "open",
    fix: "Remove the 'all' restore attribute from the snapshot",
  },
  {
    id: "m6",
    severity: "medium",
    title: "IAM key older than 90 days",
    resource: "iam/user/ci-deployer · AKIA…7H2M",
    account: "AWS staging",
    cloud: "AWS",
    benchmark: "CIS AWS 1.14",
    status: "excepted",
    fix: "Rotate the key and move CI to OIDC federation",
  },
  {
    id: "m7",
    severity: "medium",
    title: "Storage account allows shared key access",
    resource: "/subscriptions/…/storageAccounts/acmelogs",
    account: "Azure",
    cloud: "Azure",
    benchmark: "CIS Azure 3.3",
    status: "open",
    fix: "Disable shared key authorisation and use Entra ID",
  },
  {
    id: "m8",
    severity: "low",
    title: "VPC flow logs disabled",
    resource: "projects/acme-data/networks/default",
    account: "GCP",
    cloud: "GCP",
    benchmark: "CIS GCP 3.8",
    status: "in-progress",
    fix: "Enable flow logs on every subnet",
  },
];

const columns: Column<Misconfig>[] = [
  {
    id: "sev",
    header: "Severity",
    width: "96px",
    sortValue: (m) => SEVERITY_META[m.severity].rank,
    cell: (m) => <SeverityBadge severity={m.severity} />,
  },
  {
    id: "title",
    header: "Misconfiguration",
    width: "30%",
    sortValue: (m) => m.title,
    cell: (m) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{m.title}</span>
        <span className="truncate font-mono text-2xs text-fg-muted" title={m.resource}>
          {m.resource}
        </span>
      </span>
    ),
  },
  { id: "account", header: "Account", sortValue: (m) => m.account, cell: (m) => m.account },
  { id: "bench", header: "Benchmark", mono: true, cell: (m) => m.benchmark },
  {
    id: "status",
    header: "Status",
    cell: (m) => <StatusBadge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</StatusBadge>,
  },
  {
    id: "fix",
    header: "Fix",
    width: "28%",
    cell: (m) => <span className="line-clamp-2 text-xs text-fg-muted">{m.fix}</span>,
  },
];

const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 20 + i));
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
});

/** Posture overview: per-account score, trend, failing CIS sections and the misconfigurations to fix. */
export const Overview: Story = {
  render: () => {
    const [range, setRange] = useState("30d");
    const [clouds, setClouds] = useState<string[]>([]);
    const [query, setQuery] = useState("");
    const rows = useMemo(
      () =>
        misconfigs.filter(
          (m) =>
            (clouds.length === 0 || clouds.includes(m.cloud)) &&
            (!query || `${m.title} ${m.resource} ${m.benchmark}`.toLowerCase().includes(query.toLowerCase())),
        ),
      [clouds, query],
    );
    const countBy = (c: CloudKind) => misconfigs.filter((m) => m.cloud === c).length;
    return (
      <ProductFrame product="posture" nav={nav} active="overview">
        <PageHeader
          title="Overview"
          description="6 accounts · 1,420 checks · CIS AWS 3.0, CIS Azure 2.1, CIS GCP 3.0, CIS Kubernetes 1.9"
          meta={<StatusBadge tone="warning">Score 77%</StatusBadge>}
          actions={
            <>
              <SearchInput label="Search misconfigurations" className="w-60" value={query} onChange={(e) => setQuery(e.target.value)} />
              <Button size="md" variant="primary" icon={<ClipboardList />}>
                Export report
              </Button>
            </>
          }
        />
        <FilterBar onClear={clouds.length ? () => setClouds([]) : undefined}>
          <TimeRangePicker value={range} onChange={setRange} />
          <FacetFilter
            label="Cloud"
            selected={clouds}
            onChange={setClouds}
            options={(["AWS", "Azure", "GCP", "Kubernetes"] as CloudKind[]).map((c) => ({ value: c, count: countBy(c) }))}
          />
        </FilterBar>
        <Callout tone="critical" title="2 critical findings in AWS prod" action={<Button size="sm">Open findings</Button>}>
          Root account without MFA and a publicly readable S3 bucket. Both were introduced in the last 24 hours.
        </Callout>
        <KpiGrid minWidth={160}>
          {accounts.map((a) => (
            <KpiCard
              key={a.id}
              label={a.name}
              value={`${a.score}%`}
              unit={a.cloud}
              tone={scoreTone(a.score)}
              trend={wave(14, { base: a.score, amp: 4, seed: a.seed })}
              delta={{ label: `${a.failing} failing checks`, intent: a.failing > 15 ? "bad" : "neutral" }}
            />
          ))}
        </KpiGrid>
        <div className="grid gap-2.5 xl:grid-cols-[2fr_1fr]">
          <Panel title="Posture score" description="Passing checks, % · last 30 days">
            <TimeSeriesChart
              label="Posture score by cloud over 30 days"
              labels={days}
              height={200}
              area={false}
              yMax={100}
              format={(v) => `${Math.round(v)}%`}
              series={[
                { id: "aws", name: "AWS", data: wave(30, { base: 72, amp: 4, seed: 51, spike: 5, spikeAt: 20 }) },
                { id: "azure", name: "Azure", data: wave(30, { base: 82, amp: 2, seed: 52 }) },
                { id: "gcp", name: "GCP", data: wave(30, { base: 87, amp: 2, seed: 53 }) },
                { id: "k8s", name: "Kubernetes", data: wave(30, { base: 70, amp: 5, seed: 54, spike: 4, spikeAt: 12 }) },
              ]}
            />
          </Panel>
          <Panel title="Failing checks by CIS section">
            <BarList
              label="Failing checks by CIS section"
              items={[
                { id: "iam", label: "1 · Identity and access", value: 29 },
                { id: "storage", label: "2 · Storage", value: 21 },
                { id: "net", label: "5 · Networking", value: 14 },
                { id: "k8s-pod", label: "K8s 5 · Policies", value: 12 },
                { id: "log", label: "3 · Logging", value: 7 },
                { id: "mon", label: "4 · Monitoring", value: 4 },
              ]}
            />
          </Panel>
        </div>
        <Panel
          title="Misconfigurations"
          description={`${rows.length} of ${misconfigs.length} shown · sorted by severity`}
          actions={<Button size="sm" variant="ghost">Open all 87</Button>}
          flush
        >
          <DataTable
            label="Misconfigurations"
            columns={columns}
            rows={rows}
            getRowId={(m) => m.id}
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={1000}
            empty={<p className="py-8">No misconfigurations match these filters</p>}
          />
        </Panel>
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          <span>Benchmarks:</span>
          {["CIS AWS 3.0", "CIS Azure 2.1", "CIS GCP 3.0", "CIS Kubernetes 1.9"].map((b) => (
            <Badge key={b} mono>
              {b}
            </Badge>
          ))}
        </div>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Misconfigurations" });
    await expect(within(table).getByText("S3 bucket publicly readable")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: /^Cloud/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /Kubernetes/ }));
    await userEvent.keyboard("{Escape}");
    await expect(within(table).getByText("Kubernetes pod running privileged")).toBeInTheDocument();
    await expect(within(table).queryByText("S3 bucket publicly readable")).not.toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    await expect(within(table).getByText("S3 bucket publicly readable")).toBeInTheDocument();
  },
};
