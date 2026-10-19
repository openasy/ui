import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookCheck, CircleCheck, ClipboardList, Cloud, LayoutGrid, ListChecks, Plus, RefreshCw, ShieldOff, TriangleAlert, UserPlus, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
import { PEOPLE, wave } from "../mocks";

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

/* ------------------------------------------------------------------ */
/* Local pieces                                                        */
/* ------------------------------------------------------------------ */

/** Thin progress bar (the library has no Meter/Progress component yet). */
function Meter({ value, label, tone = "info" }: { value: number; label: string; tone?: Tone }) {
  const fill = { neutral: "bg-fg-subtle", info: "bg-accent", success: "bg-success", warning: "bg-warning", danger: "bg-danger", critical: "bg-critical" }[tone];
  return (
    <div role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(value)} className="h-1.5 w-full min-w-12 overflow-hidden rounded-full bg-subtle">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

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
  { id: "m1", severity: "critical", title: "S3 bucket publicly readable", resource: "arn:aws:s3:::acme-invoices-export", account: "AWS prod", cloud: "AWS", benchmark: "CIS AWS 2.1.5", status: "open", fix: "Enable Block Public Access on the bucket and account" },
  { id: "m2", severity: "high", title: "Security group allows 0.0.0.0/0 on 22", resource: "sg-0a91f3c2e7d1b4410", account: "AWS staging", cloud: "AWS", benchmark: "CIS AWS 5.2", status: "in-progress", fix: "Restrict SSH to the VPN range or use Access JIT" },
  { id: "m3", severity: "critical", title: "Root account without MFA", resource: "arn:aws:iam::210987654321:root", account: "AWS prod", cloud: "AWS", benchmark: "CIS AWS 1.5", status: "open", fix: "Register a hardware MFA device for the root user" },
  { id: "m4", severity: "high", title: "Kubernetes pod running privileged", resource: "payments/payments-api-7c9d5f-x2k8q", account: "k8s prod-eu", cloud: "Kubernetes", benchmark: "CIS K8s 5.2.1", status: "open", fix: "Set securityContext.privileged: false and enforce Pod Security restricted" },
  { id: "m5", severity: "high", title: "RDS snapshot public", resource: "rds:orders-db-2024-09-30", account: "AWS prod", cloud: "AWS", benchmark: "CIS AWS 2.3.3", status: "open", fix: "Remove the 'all' restore attribute from the snapshot" },
  { id: "m6", severity: "medium", title: "IAM key older than 90 days", resource: "iam/user/ci-deployer · AKIA…7H2M", account: "AWS staging", cloud: "AWS", benchmark: "CIS AWS 1.14", status: "excepted", fix: "Rotate the key and move CI to OIDC federation" },
  { id: "m7", severity: "medium", title: "Storage account allows shared key access", resource: "/subscriptions/…/storageAccounts/acmelogs", account: "Azure", cloud: "Azure", benchmark: "CIS Azure 3.3", status: "open", fix: "Disable shared key authorisation and use Entra ID" },
  { id: "m8", severity: "low", title: "VPC flow logs disabled", resource: "projects/acme-data/networks/default", account: "GCP", cloud: "GCP", benchmark: "CIS GCP 3.8", status: "in-progress", fix: "Enable flow logs on every subnet" },
];

/** Longer list for the Misconfigurations page. */
const allMisconfigs: Misconfig[] = [
  ...misconfigs,
  { id: "m9", severity: "high", title: "CloudTrail not enabled in all regions", resource: "arn:aws:cloudtrail:eu-west-1:210987654321:trail/main", account: "AWS prod", cloud: "AWS", benchmark: "CIS AWS 3.1", status: "open", fix: "Turn on multi-region logging for the organisation trail" },
  { id: "m10", severity: "medium", title: "EBS default encryption off", resource: "ec2:eu-central-1 account settings", account: "AWS staging", cloud: "AWS", benchmark: "CIS AWS 2.2.1", status: "open", fix: "Enable EBS encryption by default in every region" },
  { id: "m11", severity: "high", title: "Kubelet anonymous auth enabled", resource: "node/ip-172-16-3-41", account: "k8s ops", cloud: "Kubernetes", benchmark: "CIS K8s 4.2.1", status: "open", fix: "Set --anonymous-auth=false in the kubelet config" },
  { id: "m12", severity: "medium", title: "Default service account token auto-mounted", resource: "namespace/reports", account: "k8s prod-eu", cloud: "Kubernetes", benchmark: "CIS K8s 5.1.5", status: "open", fix: "Set automountServiceAccountToken: false on the default service account" },
  { id: "m13", severity: "medium", title: "Key Vault without purge protection", resource: "/subscriptions/…/vaults/acme-kv-prod", account: "Azure", cloud: "Azure", benchmark: "CIS Azure 8.5", status: "in-progress", fix: "Enable soft delete and purge protection" },
  { id: "m14", severity: "low", title: "Cloud SQL instance without automated backups", resource: "projects/acme-data/instances/analytics-pg", account: "GCP", cloud: "GCP", benchmark: "CIS GCP 6.7", status: "open", fix: "Enable automated backups and point-in-time recovery" },
  { id: "m15", severity: "low", title: "Password policy allows reuse", resource: "iam account password policy", account: "AWS staging", cloud: "AWS", benchmark: "CIS AWS 1.9", status: "excepted", fix: "Prevent reuse of the last 24 passwords" },
];

const REMEDIATION: Record<string, string> = {
  m1: "aws s3api put-public-access-block --bucket acme-invoices-export \\\n  --public-access-block-configuration BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true",
  m3: "# Console only: sign in as root → Security credentials → Assign MFA device\n# Then verify:\naws iam get-account-summary --query 'SummaryMap.AccountMFAEnabled'",
  m4: "kubectl label ns payments pod-security.kubernetes.io/enforce=restricted\nkubectl -n payments patch deploy payments-api --type json \\\n  -p '[{\"op\":\"replace\",\"path\":\"/spec/template/spec/containers/0/securityContext/privileged\",\"value\":false}]'",
};

const columns: Column<Misconfig>[] = [
  { id: "sev", header: "Severity", width: "96px", sortValue: (m) => SEVERITY_META[m.severity].rank, cell: (m) => <SeverityBadge severity={m.severity} /> },
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
  { id: "status", header: "Status", cell: (m) => <StatusBadge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</StatusBadge> },
  { id: "fix", header: "Fix", width: "28%", cell: (m) => <span className="line-clamp-2 text-xs text-fg-muted">{m.fix}</span> },
];

const days = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 8, 20 + i));
  return `${d.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${d.getUTCDate()}`;
});

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

function OverviewPage() {
  const [range, setRange] = useState("30d");
  const [clouds, setClouds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const rows = useMemo(
    () =>
      misconfigs.filter(
        (m) => (clouds.length === 0 || clouds.includes(m.cloud)) && (!query || `${m.title} ${m.resource} ${m.benchmark}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [clouds, query],
  );
  const countBy = (c: CloudKind) => misconfigs.filter((m) => m.cloud === c).length;
  return (
    <>
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
        <FacetFilter label="Cloud" selected={clouds} onChange={setClouds} options={(["AWS", "Azure", "GCP", "Kubernetes"] as CloudKind[]).map((c) => ({ value: c, count: countBy(c) }))} />
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
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
      <Panel title="Misconfigurations" description={`${rows.length} of ${misconfigs.length} shown · sorted by severity`} actions={<Button size="sm" variant="ghost">Open all 87</Button>} flush>
        <DataTable label="Misconfigurations" columns={columns} rows={rows} getRowId={(m) => m.id} defaultSort={{ id: "sev", direction: "desc" }} minWidth={1000} empty={<p className="py-8">No misconfigurations match these filters</p>} />
      </Panel>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
        <span>Benchmarks:</span>
        {["CIS AWS 3.0", "CIS Azure 2.1", "CIS GCP 3.0", "CIS Kubernetes 1.9"].map((b) => (
          <Badge key={b} mono>
            {b}
          </Badge>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Accounts                                                            */
/* ------------------------------------------------------------------ */

type Conn = "connected" | "degraded" | "error";
const CONN: Record<Conn, { label: string; tone: Tone }> = {
  connected: { label: "Connected", tone: "success" },
  degraded: { label: "Partial access", tone: "warning" },
  error: { label: "Error", tone: "danger" },
};

interface AccountRow extends Account {
  externalId: string;
  method: string;
  regions: string;
  resources: number;
  lastScan: string;
  conn: Conn;
  note?: string;
}

const ACCOUNT_ROWS: AccountRow[] = [
  { ...accounts[0]!, externalId: "210987654321", method: "IAM role · SecurityAudit", regions: "eu-west-1, eu-central-1", resources: 4_812, lastScan: "12 min ago", conn: "connected" },
  { ...accounts[1]!, externalId: "109876543210", method: "IAM role · SecurityAudit", regions: "eu-west-1", resources: 1_930, lastScan: "12 min ago", conn: "connected" },
  { ...accounts[2]!, externalId: "sub 4f1c…9a20", method: "Service principal · Reader", regions: "westeurope, northeurope", resources: 1_204, lastScan: "18 min ago", conn: "degraded", note: "Missing Key Vault Reader on 2 vaults" },
  { ...accounts[3]!, externalId: "acme-data", method: "Workload identity federation", regions: "europe-west1", resources: 611, lastScan: "9 min ago", conn: "connected" },
  { ...accounts[4]!, externalId: "prod-eu · v1.30", method: "In-cluster agent", regions: "3 nodes pools", resources: 2_455, lastScan: "4 min ago", conn: "connected" },
  { ...accounts[5]!, externalId: "ops · v1.29", method: "In-cluster agent", regions: "1 node pool", resources: 388, lastScan: "3 h ago", conn: "error", note: "Agent heartbeat missing since 11:02" },
];

const CONNECT_STEPS: Record<CloudKind, string[]> = {
  AWS: ["Deploy the CloudFormation stack OpenAsyPostureRole in the management account.", "It creates a read-only role with SecurityAudit and ViewOnlyAccess and an external ID.", "Paste the role ARN below; member accounts are discovered from AWS Organizations."],
  Azure: ["Create an app registration in Entra ID.", "Grant it Reader and Key Vault Reader on the tenant root management group.", "Paste the tenant ID and client ID below and upload a certificate."],
  GCP: ["Create a Workload Identity Federation pool trusting OpenAsy.", "Grant roles/cloudasset.viewer and roles/iam.securityReviewer at organisation level.", "Paste the pool provider resource name below. No service account keys needed."],
  Kubernetes: ["helm repo add openasy https://charts.example.com", "helm install posture openasy/posture-agent -n openasy --create-namespace --set token=…", "The cluster appears here within a minute and runs CIS checks every 30 minutes."],
};

function AccountsPage() {
  const [connecting, setConnecting] = useState(false);
  const [provider, setProvider] = useState<CloudKind>("AWS");
  const [tested, setTested] = useState(false);
  const [rescanned, setRescanned] = useState<string[]>([]);
  const cols: Column<AccountRow>[] = [
    {
      id: "name",
      header: "Account",
      pinned: "left",
      width: "20%",
      sortValue: (a) => a.name,
      cell: (a) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{a.name}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{a.externalId}</span>
        </span>
      ),
    },
    { id: "cloud", header: "Provider", sortValue: (a) => a.cloud, cell: (a) => <Badge variant="outline">{a.cloud}</Badge> },
    { id: "method", header: "Connection", description: "How OpenAsy reads configuration. Always read-only.", cell: (a) => <span className="text-xs">{a.method}</span> },
    { id: "regions", header: "Regions", cell: (a) => <span className="block truncate text-xs text-fg-muted">{a.regions}</span> },
    { id: "resources", header: "Resources", align: "right", mono: true, sortValue: (a) => a.resources, cell: (a) => a.resources.toLocaleString("en-US") },
    {
      id: "score",
      header: "Score",
      width: "130px",
      sortValue: (a) => a.score,
      cell: (a) => (
        <span className="flex items-center gap-2">
          <Meter value={a.score} label={`Score of ${a.name}`} tone={scoreTone(a.score)} />
          <span className="w-9 text-right font-mono text-2xs text-fg-muted">{a.score}%</span>
        </span>
      ),
    },
    { id: "last", header: "Last scan", cell: (a) => <span className="whitespace-nowrap text-fg-muted">{rescanned.includes(a.id) ? "Scanning…" : a.lastScan}</span> },
    {
      id: "conn",
      header: "Status",
      sortValue: (a) => a.conn,
      cell: (a) => (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <StatusBadge tone={CONN[a.conn].tone}>{CONN[a.conn].label}</StatusBadge>
          {a.note && <span className="text-2xs text-fg-muted">{a.note}</span>}
        </span>
      ),
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "44px",
      align: "right",
      hideable: false,
      cell: (a) => (
        <IconButton label={`Rescan ${a.name}`} size="xs" onClick={() => setRescanned((r) => [...r, a.id])}>
          <RefreshCw />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Accounts" description="Cloud accounts, subscriptions, projects and clusters. Read-only access; checks run every 30 minutes." actions={<Button variant="primary" icon={<Plus />} onClick={() => setConnecting(true)}>Connect account</Button>} />
      <KpiGrid minWidth={160}>
        <KpiCard label="Connected" value="6" unit="accounts" delta={{ label: "4 clouds" }} />
        <KpiCard label="Resources" value="11,400" delta={{ label: "+212 this week", direction: "up" }} />
        <KpiCard label="Partial access" value="1" tone="warning" delta={{ label: "Azure: 2 vaults unreadable" }} />
        <KpiCard label="Errors" value="1" tone="danger" delta={{ label: "k8s ops agent offline", intent: "bad" }} />
      </KpiGrid>
      {connecting && (
        <Panel title="Connect an account" actions={<IconButton label="Close connect form" size="sm" onClick={() => setConnecting(false)}><X /></IconButton>}>
          <div className="flex flex-col gap-2.5">
            <SegmentedControl
              label="Provider"
              value={provider}
              onChange={(v) => {
                setProvider(v);
                setTested(false);
              }}
              options={(["AWS", "Azure", "GCP", "Kubernetes"] as CloudKind[]).map((c) => ({ value: c, label: c }))}
            />
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {CONNECT_STEPS[provider].map((s) => (
                <li key={s}>{s.startsWith("helm") ? <code className="font-mono text-xs">{s}</code> : s}</li>
              ))}
            </ol>
            {provider !== "Kubernetes" && (
              <div className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <TextField
                  label={provider === "AWS" ? "Role ARN" : provider === "Azure" ? "Tenant ID" : "Pool provider"}
                  mono
                  placeholder={provider === "AWS" ? "arn:aws:iam::123456789012:role/OpenAsyPostureRole" : provider === "Azure" ? "00000000-0000-0000-0000-000000000000" : "projects/123/locations/global/workloadIdentityPools/openasy/providers/oa"}
                />
                <TextField label="Display name" placeholder="AWS shared services" />
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => setTested(true)}>
                Test connection
              </Button>
              {tested && (
                <span role="status" className="text-xs text-success">
                  Connection OK · {provider === "Kubernetes" ? "agent registered" : "read-only permissions verified"}
                </span>
              )}
            </div>
          </div>
        </Panel>
      )}
      <Panel title="Accounts and clusters" flush>
        <DataTable label="Cloud accounts" columns={cols} rows={ACCOUNT_ROWS} getRowId={(a) => a.id} minWidth={1120} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Checks                                                              */
/* ------------------------------------------------------------------ */

type Bench = "aws" | "azure" | "gcp" | "k8s" | "linux";
const BENCH_LABEL: Record<Bench, string> = { aws: "CIS AWS 3.0", azure: "CIS Azure 2.1", gcp: "CIS GCP 3.0", k8s: "CIS Kubernetes 1.9", linux: "CIS Ubuntu 24.04" };

interface Check {
  id: string;
  bench: Bench;
  ref: string;
  title: string;
  severity: Severity;
  evaluated: number;
  failing: number;
  automated: boolean;
}

const CHECKS: Check[] = [
  { id: "c1", bench: "aws", ref: "1.5", title: "Ensure MFA is enabled for the root user", severity: "critical", evaluated: 2, failing: 1, automated: true },
  { id: "c2", bench: "aws", ref: "1.14", title: "Ensure access keys are rotated every 90 days or less", severity: "medium", evaluated: 61, failing: 7, automated: true },
  { id: "c3", bench: "aws", ref: "2.1.5", title: "Ensure S3 buckets are configured with Block Public Access", severity: "critical", evaluated: 148, failing: 1, automated: true },
  { id: "c4", bench: "aws", ref: "3.1", title: "Ensure CloudTrail is enabled in all regions", severity: "high", evaluated: 2, failing: 1, automated: true },
  { id: "c5", bench: "aws", ref: "5.2", title: "Ensure no security groups allow ingress from 0.0.0.0/0 to remote admin ports", severity: "high", evaluated: 312, failing: 4, automated: true },
  { id: "c6", bench: "azure", ref: "3.3", title: "Ensure storage accounts disallow shared key access", severity: "medium", evaluated: 22, failing: 3, automated: true },
  { id: "c7", bench: "azure", ref: "8.5", title: "Ensure Key Vault is recoverable", severity: "medium", evaluated: 6, failing: 1, automated: true },
  { id: "c8", bench: "azure", ref: "1.1.1", title: "Ensure Security Defaults or Conditional Access require MFA", severity: "high", evaluated: 1, failing: 0, automated: false },
  { id: "c9", bench: "gcp", ref: "3.8", title: "Ensure VPC flow logs are enabled for every subnet", severity: "low", evaluated: 14, failing: 3, automated: true },
  { id: "c10", bench: "gcp", ref: "6.7", title: "Ensure Cloud SQL instances have automated backups", severity: "low", evaluated: 5, failing: 1, automated: true },
  { id: "c11", bench: "k8s", ref: "4.2.1", title: "Ensure kubelet --anonymous-auth is false", severity: "high", evaluated: 9, failing: 2, automated: true },
  { id: "c12", bench: "k8s", ref: "5.1.5", title: "Ensure default service accounts are not used", severity: "medium", evaluated: 41, failing: 6, automated: true },
  { id: "c13", bench: "k8s", ref: "5.2.1", title: "Minimise the admission of privileged containers", severity: "high", evaluated: 312, failing: 3, automated: true },
  { id: "c14", bench: "linux", ref: "5.2.7", title: "Ensure SSH root login is disabled", severity: "high", evaluated: 46, failing: 0, automated: true },
  { id: "c15", bench: "linux", ref: "1.1.2.3", title: "Ensure nosuid option set on /tmp", severity: "low", evaluated: 46, failing: 5, automated: true },
];

function ChecksPage() {
  const [tab, setTab] = useState<"all" | Bench>("all");
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<string[]>([]);
  const rows = CHECKS.filter((c) => (tab === "all" || c.bench === tab) && (!query || c.title.toLowerCase().includes(query.toLowerCase())) && (result.length === 0 || result.includes(c.failing ? "failing" : "passing")));
  const cols: Column<Check>[] = [
    { id: "ref", header: "Control", width: "150px", sortValue: (c) => `${c.bench}${c.ref}`, cell: (c) => <span className="flex flex-col"><span className="font-mono text-xs">{c.ref}</span><span className="text-2xs text-fg-muted">{BENCH_LABEL[c.bench]}</span></span> },
    { id: "title", header: "Check", width: "40%", sortValue: (c) => c.title, cell: (c) => <span className="line-clamp-2">{c.title}</span> },
    { id: "sev", header: "Severity", sortValue: (c) => SEVERITY_META[c.severity].rank, cell: (c) => <SeverityBadge severity={c.severity} /> },
    { id: "eval", header: "Resources", align: "right", mono: true, sortValue: (c) => c.evaluated, cell: (c) => c.evaluated },
    { id: "fail", header: "Failing", align: "right", mono: true, sortValue: (c) => c.failing, cell: (c) => (c.failing ? <span className="font-semibold text-danger-text">{c.failing}</span> : "0") },
    {
      id: "pass",
      header: "Pass rate",
      width: "140px",
      sortValue: (c) => 1 - c.failing / c.evaluated,
      cell: (c) => {
        const pct = Math.round((1 - c.failing / c.evaluated) * 100);
        return (
          <span className="flex items-center gap-2">
            <Meter value={pct} label={`Pass rate of ${c.ref}`} tone={pct === 100 ? "success" : pct >= 90 ? "warning" : "danger"} />
            <span className="w-9 text-right font-mono text-2xs text-fg-muted">{pct}%</span>
          </span>
        );
      },
    },
    { id: "auto", header: "Mode", description: "Manual checks need evidence uploaded by a person every review period.", cell: (c) => (c.automated ? <Badge>Automated</Badge> : <Badge tone="warning">Manual</Badge>) },
  ];
  const count = (b: Bench) => CHECKS.filter((c) => c.bench === b).length;
  return (
    <>
      <PageHeader title="Checks" description="Every control in every enabled benchmark, with how many resources pass it.">
        <Tabs
          label="Benchmark"
          value={tab}
          onChange={setTab}
          items={[{ value: "all" as const, label: "All", count: CHECKS.length }, ...(Object.keys(BENCH_LABEL) as Bench[]).map((b) => ({ value: b, label: BENCH_LABEL[b], count: count(b) }))]}
        />
      </PageHeader>
      <FilterBar onClear={query || result.length ? () => (setQuery(""), setResult([])) : undefined}>
        <SearchInput label="Search checks" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />
        <FacetFilter label="Result" selected={result} onChange={setResult} options={[{ value: "failing", label: "Failing" }, { value: "passing", label: "Passing" }]} />
      </FilterBar>
      <Panel title="Checks" description={`${rows.length} shown`} flush>
        <DataTable label="Checks" columns={cols} rows={rows} getRowId={(c) => c.id} defaultSort={{ id: "fail", direction: "desc" }} minWidth={980} stickyHeader maxHeight={560} empty={<p className="py-8">No checks match</p>} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Misconfigurations                                                   */
/* ------------------------------------------------------------------ */

function MisconfigurationsPage() {
  const [rows, setRows] = useState(allMisconfigs);
  const [selected, setSelected] = useState<string[]>([]);
  const [sev, setSev] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [acct, setAcct] = useState<string[]>([]);
  const [active, setActive] = useState<string | undefined>();
  const [note, setNote] = useState("");
  const shown = rows.filter((m) => (sev.length === 0 || sev.includes(m.severity)) && (statuses.length === 0 || statuses.includes(m.status)) && (acct.length === 0 || acct.includes(m.account)));
  const current = rows.find((m) => m.id === active);
  const bulk = (status: FindingStatus) => {
    setRows((rs) => rs.map((r) => (selected.includes(r.id) ? { ...r, status } : r)));
    setNote(`${selected.length} ${selected.length === 1 ? "finding" : "findings"} marked ${STATUS[status].label.toLowerCase()}`);
    setSelected([]);
  };
  return (
    <>
      <PageHeader title="Misconfigurations" description="Failing resources across all accounts. A finding closes by itself when the next scan passes." actions={<Button icon={<ClipboardList />}>Export CSV</Button>} />
      <FilterBar onClear={sev.length || statuses.length || acct.length ? () => (setSev([]), setStatuses([]), setAcct([])) : undefined}>
        <SearchInput label="Search title, resource or control" className="w-64" />
        <FacetFilter label="Severity" selected={sev} onChange={setSev} options={(["critical", "high", "medium", "low"] as Severity[]).map((s) => ({ value: s, label: SEVERITY_META[s].label, count: rows.filter((r) => r.severity === s).length }))} />
        <FacetFilter label="Finding status" selected={statuses} onChange={setStatuses} options={(Object.keys(STATUS) as FindingStatus[]).map((s) => ({ value: s, label: STATUS[s].label, count: rows.filter((r) => r.status === s).length }))} />
        <FacetFilter label="Account" selected={acct} onChange={setAcct} options={accounts.map((a) => ({ value: a.name, count: rows.filter((r) => r.account === a.name).length }))} />
      </FilterBar>
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-1.5 rounded-lg border border-accent bg-accent-soft px-2.5 py-1.5">
          <span className="text-sm font-medium text-fg">{selected.length} selected</span>
          <Button size="sm" variant="primary" onClick={() => bulk("in-progress")}>
            Mark in progress
          </Button>
          <Button size="sm" icon={<UserPlus />}>
            Assign
          </Button>
          <Button size="sm" onClick={() => bulk("excepted")}>
            Add exception
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])} className="ml-auto">
            Clear selection
          </Button>
        </div>
      )}
      {note && <Callout tone="success" title={note} onDismiss={() => setNote("")} />}
      <div className={current ? "grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]" : "grid gap-2.5"}>
        <Panel title="Findings" description={`${shown.length} of 87 · click a row for remediation`} flush>
          <DataTable label="All misconfigurations" columns={columns} rows={shown} getRowId={(m) => m.id} selectable selectedIds={selected} onSelectionChange={setSelected} onRowClick={(m) => setActive(m.id)} activeRowId={active} defaultSort={{ id: "sev", direction: "desc" }} minWidth={1040} pageSize={10} />
        </Panel>
        {current && (
          <Panel title={current.title} description={`${current.account} · ${current.benchmark}`} aria-label="Misconfiguration detail" actions={<IconButton label="Close detail" size="sm" onClick={() => setActive(undefined)}><X /></IconButton>}>
            <div className="flex flex-col gap-2.5 text-sm">
              <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1.5">
                <dt className="text-fg-muted">Severity</dt>
                <dd><SeverityBadge severity={current.severity} /></dd>
                <dt className="text-fg-muted">Resource</dt>
                <dd className="font-mono text-xs break-all">{current.resource}</dd>
                <dt className="text-fg-muted">Status</dt>
                <dd><StatusBadge tone={STATUS[current.status].tone}>{STATUS[current.status].label}</StatusBadge></dd>
                <dt className="text-fg-muted">First seen</dt>
                <dd>Oct 18, 09:12 · scan #4471</dd>
              </dl>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-medium">How to fix</span>
                <p className="text-fg-muted">{current.fix}</p>
                {REMEDIATION[current.id] && (
                  <pre tabIndex={0} aria-label="Remediation commands" className="overflow-x-auto rounded-md border border-line bg-subtle p-2 font-mono text-2xs text-fg">
                    {REMEDIATION[current.id]}
                  </pre>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="primary" icon={<CircleCheck />}>
                  Create Jira ticket
                </Button>
                <Button size="sm">Add exception</Button>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Benchmarks                                                          */
/* ------------------------------------------------------------------ */

interface Benchmark {
  id: Bench;
  version: string;
  scope: string;
  passed: number;
  total: number;
  manual: number;
  sections: Array<{ id: string; name: string; passed: number; total: number }>;
}

const BENCHMARKS: Benchmark[] = [
  { id: "aws", version: "v3.0.0 · Level 1 + 2", scope: "2 AWS accounts", passed: 214, total: 268, manual: 9, sections: [{ id: "1", name: "1 Identity and Access Management", passed: 38, total: 52 }, { id: "2", name: "2 Storage", passed: 41, total: 54 }, { id: "3", name: "3 Logging", passed: 44, total: 48 }, { id: "4", name: "4 Monitoring", passed: 58, total: 62 }, { id: "5", name: "5 Networking", passed: 33, total: 52 }] },
  { id: "azure", version: "v2.1.0 · Level 1", scope: "1 subscription", passed: 131, total: 151, manual: 14, sections: [{ id: "1", name: "1 Identity", passed: 30, total: 34 }, { id: "3", name: "3 Storage Accounts", passed: 22, total: 27 }, { id: "5", name: "5 Logging and Monitoring", passed: 41, total: 44 }, { id: "8", name: "8 Key Vault", passed: 9, total: 12 }, { id: "9", name: "9 App Service", passed: 29, total: 34 }] },
  { id: "gcp", version: "v3.0.0 · Level 1", scope: "1 project", passed: 98, total: 104, manual: 4, sections: [{ id: "1", name: "1 IAM", passed: 24, total: 24 }, { id: "3", name: "3 Networking", passed: 18, total: 22 }, { id: "6", name: "6 Cloud SQL", passed: 20, total: 22 }, { id: "7", name: "7 BigQuery", passed: 36, total: 36 }] },
  { id: "k8s", version: "v1.9.0", scope: "2 clusters", passed: 161, total: 211, manual: 22, sections: [{ id: "1", name: "1 Control Plane Components", passed: 51, total: 58 }, { id: "4", name: "4 Worker Nodes", passed: 33, total: 40 }, { id: "5.1", name: "5.1 RBAC and Service Accounts", passed: 21, total: 34 }, { id: "5.2", name: "5.2 Pod Security Standards", passed: 34, total: 52 }, { id: "5.3", name: "5.3 Network Policies and CNI", passed: 22, total: 27 }] },
  { id: "linux", version: "v1.0.0 · Server Level 1", scope: "46 hosts", passed: 3_910, total: 4_186, manual: 0, sections: [{ id: "1", name: "1 Initial Setup", passed: 1_250, total: 1_380 }, { id: "4", name: "4 Logging and Auditing", passed: 820, total: 874 }, { id: "5", name: "5 Access, Authentication and Authorization", passed: 1_102, total: 1_150 }, { id: "6", name: "6 System Maintenance", passed: 738, total: 782 }] },
];

function BenchmarksPage() {
  const [open, setOpen] = useState<Bench>("aws");
  const b = BENCHMARKS.find((x) => x.id === open)!;
  return (
    <>
      <PageHeader title="Benchmarks" description="Progress against each CIS benchmark. Results map to ISO 27001 Annex A, SOC 2 and GDPR Art. 32 in Compliance." actions={<Button icon={<Plus />}>Enable benchmark</Button>} />
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {BENCHMARKS.map((x) => {
          const pct = Math.round((x.passed / x.total) * 100);
          return (
            <Panel key={x.id} title={BENCH_LABEL[x.id]} description={`${x.version} · ${x.scope}`} actions={<StatusBadge tone={scoreTone(pct)}>{pct}%</StatusBadge>} aria-label={`${BENCH_LABEL[x.id]} summary`}>
              <div className="flex flex-col gap-2">
                <Meter value={pct} label={`${BENCH_LABEL[x.id]} progress`} tone={scoreTone(pct)} />
                <dl className="grid grid-cols-3 gap-2 text-sm">
                  <div><dt className="text-2xs text-fg-muted">Passed</dt><dd className="font-semibold">{x.passed.toLocaleString("en-US")}</dd></div>
                  <div><dt className="text-2xs text-fg-muted">Failed</dt><dd className="font-semibold">{(x.total - x.passed).toLocaleString("en-US")}</dd></div>
                  <div><dt className="text-2xs text-fg-muted">Manual</dt><dd className="font-semibold">{x.manual}</dd></div>
                </dl>
                <Button size="sm" variant={open === x.id ? "primary" : "secondary"} aria-pressed={open === x.id} onClick={() => setOpen(x.id)}>
                  View sections of {BENCH_LABEL[x.id]}
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={`${BENCH_LABEL[b.id]} · sections`} description="Pass rate per section" aria-label="Benchmark sections">
          <ul className="flex flex-col gap-2">
            {b.sections.map((s) => {
              const pct = Math.round((s.passed / s.total) * 100);
              return (
                <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_140px_64px] items-center gap-2.5 text-sm">
                  <span className="truncate">{s.name}</span>
                  <Meter value={pct} label={`${s.name} pass rate`} tone={scoreTone(pct)} />
                  <span className="text-right font-mono text-xs text-fg-muted">{s.passed}/{s.total}</span>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Score over 30 days">
          <TimeSeriesChart label={`${BENCH_LABEL[b.id]} score over 30 days`} labels={days} height={180} yMax={100} format={(v) => `${Math.round(v)}%`} series={[{ id: b.id, name: BENCH_LABEL[b.id], data: wave(30, { base: (b.passed / b.total) * 100 - 3, amp: 2, seed: b.id.length * 7 }) }]} legend={false} />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                          */
/* ------------------------------------------------------------------ */

type ExStatus = "active" | "pending" | "expired" | "revoked";
const EX_STATUS: Record<ExStatus, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  pending: { label: "Awaiting approval", tone: "warning" },
  expired: { label: "Expired", tone: "neutral" },
  revoked: { label: "Revoked", tone: "danger" },
};

interface PostureException {
  id: string;
  control: string;
  title: string;
  scope: string;
  reason: string;
  requester: string;
  approver: string;
  expires: string;
  status: ExStatus;
}

const EXCEPTIONS: PostureException[] = [
  { id: "e1", control: "CIS AWS 1.14", title: "IAM key older than 90 days", scope: "iam/user/ci-deployer", reason: "Legacy Jenkins cannot use OIDC; migration planned in OPS-1902.", requester: PEOPLE[4], approver: PEOPLE[1], expires: "Dec 31", status: "active" },
  { id: "e2", control: "CIS AWS 1.9", title: "Password policy allows reuse", scope: "AWS staging", reason: "Staging uses SSO only; console passwords are disabled.", requester: PEOPLE[2], approver: PEOPLE[1], expires: "Mar 31", status: "active" },
  { id: "e3", control: "CIS K8s 5.2.1", title: "Privileged container", scope: "kube-system/cilium-*", reason: "CNI needs privileged mode to manage eBPF programs.", requester: PEOPLE[0], approver: PEOPLE[3], expires: "Never (vendor requirement)", status: "active" },
  { id: "e4", control: "CIS GCP 3.8", title: "VPC flow logs disabled", scope: "acme-data/default", reason: "Default network is being deleted this sprint.", requester: PEOPLE[6], approver: "–", expires: "Nov 1", status: "pending" },
  { id: "e5", control: "CIS Azure 3.3", title: "Shared key access", scope: "storageAccounts/acmebuild", reason: "Build cache used by an old agent.", requester: PEOPLE[5], approver: PEOPLE[1], expires: "Oct 1", status: "expired" },
];

function ExceptionsPage() {
  const [rows, setRows] = useState(EXCEPTIONS);
  const [tab, setTab] = useState<"all" | ExStatus>("all");
  const shown = rows.filter((r) => tab === "all" || r.status === tab);
  const set = (id: string, status: ExStatus) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status, approver: status === "active" && r.approver === "–" ? "Emily Clark" : r.approver } : r)));
  const cols: Column<PostureException>[] = [
    {
      id: "control",
      header: "Control",
      width: "24%",
      sortValue: (e) => e.control,
      cell: (e) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{e.title}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{e.control} · {e.scope}</span>
        </span>
      ),
    },
    { id: "reason", header: "Reason", width: "30%", cell: (e) => <span className="line-clamp-2 text-xs text-fg-muted">{e.reason}</span> },
    { id: "req", header: "Requested by", cell: (e) => <span className="flex items-center gap-1.5 whitespace-nowrap"><Avatar name={e.requester} size="sm" />{e.requester}</span> },
    { id: "appr", header: "Approver", cell: (e) => <span className="whitespace-nowrap">{e.approver}</span> },
    { id: "exp", header: "Expires", cell: (e) => <span className="whitespace-nowrap">{e.expires}</span> },
    { id: "status", header: "Status", sortValue: (e) => e.status, cell: (e) => <StatusBadge tone={EX_STATUS[e.status].tone}>{EX_STATUS[e.status].label}</StatusBadge> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "170px",
      align: "right",
      hideable: false,
      cell: (e) =>
        e.status === "pending" ? (
          <span className="inline-flex gap-1">
            <Button size="xs" variant="primary" aria-label={`Approve exception ${e.title}`} onClick={() => set(e.id, "active")}>Approve</Button>
            <Button size="xs" aria-label={`Reject exception ${e.title}`} onClick={() => set(e.id, "revoked")}>Reject</Button>
          </span>
        ) : e.status === "active" ? (
          <Button size="xs" aria-label={`Revoke exception ${e.title}`} onClick={() => set(e.id, "revoked")}>Revoke</Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Exceptions" description="Accepted risks. Excepted resources do not lower the score until the exception expires." actions={<Button variant="primary" icon={<Plus />}>Request exception</Button>}>
        <Tabs
          label="Exception status"
          value={tab}
          onChange={setTab}
          items={[{ value: "all" as const, label: "All", count: rows.length }, ...(Object.keys(EX_STATUS) as ExStatus[]).map((s) => ({ value: s, label: EX_STATUS[s].label, count: rows.filter((r) => r.status === s).length }))]}
        />
      </PageHeader>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Exceptions" flush>
          <DataTable label="Posture exceptions" columns={cols} rows={shown} getRowId={(e) => e.id} minWidth={1040} empty={<p className="py-8">No exceptions in this state</p>} />
        </Panel>
        <Panel title="Policy">
          <div className="flex flex-col gap-2.5 text-sm">
            <SelectField label="Maximum duration" defaultValue="180" options={[{ value: "90", label: "90 days" }, { value: "180", label: "180 days" }, { value: "365", label: "1 year" }]} />
            <SelectField label="Approvers" defaultValue="sec" options={[{ value: "sec", label: "Security team (any 1)" }, { value: "two", label: "Security team (any 2)" }]} />
            <p className="text-xs text-fg-muted">Critical controls always need two approvers. Owners are reminded 14 days before expiry.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  accounts: () => <AccountsPage />,
  checks: () => <ChecksPage />,
  misconfigurations: () => <MisconfigurationsPage />,
  benchmarks: () => <BenchmarksPage />,
  exceptions: () => <ExceptionsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="posture" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page                                               */
/* ------------------------------------------------------------------ */

/** Posture overview: per-account score, trend, failing CIS sections and the misconfigurations to fix. */
export const Overview: Story = {
  ...app("overview"),
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

export const Accounts: Story = {
  ...app("accounts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Connect account" }));
    await userEvent.click(c.getByRole("radio", { name: "GCP" }));
    await expect(c.getByText(/Workload Identity Federation pool/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Test connection" }));
    await expect(c.getByRole("status")).toHaveTextContent("Connection OK");
    await userEvent.click(c.getByRole("button", { name: "Rescan k8s ops" }));
    await expect(c.getByText("Scanning…")).toBeInTheDocument();
  },
};

export const Checks: Story = {
  ...app("checks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Checks" });
    await userEvent.click(c.getByRole("tab", { name: /CIS Kubernetes 1\.9/ }));
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
    await userEvent.type(c.getByRole("searchbox", { name: "Search checks" }), "kubelet");
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Misconfigurations: Story = {
  ...app("misconfigurations"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("checkbox", { name: "Select row m1" }));
    await userEvent.click(c.getByRole("checkbox", { name: "Select row m3" }));
    await userEvent.click(within(c.getByRole("toolbar", { name: "Bulk actions" })).getByRole("button", { name: "Mark in progress" }));
    await expect(c.getByText("2 findings marked in progress")).toBeInTheDocument();
    await userEvent.click(c.getByText("Kubernetes pod running privileged"));
    await expect(c.getByLabelText("Misconfiguration detail")).toHaveTextContent("pod-security.kubernetes.io/enforce=restricted");
  },
};

export const Benchmarks: Story = {
  ...app("benchmarks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Benchmark sections")).toHaveTextContent("5 Networking");
    await userEvent.click(c.getByRole("button", { name: "View sections of CIS Kubernetes 1.9" }));
    await expect(c.getByLabelText("Benchmark sections")).toHaveTextContent("5.2 Pod Security Standards");
  },
};

export const Exceptions: Story = {
  ...app("exceptions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Approve exception VPC flow logs disabled" }));
    await userEvent.click(c.getByRole("tab", { name: /Awaiting approval/ }));
    await expect(c.getByText("No exceptions in this state")).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /^Active/ }));
    await expect(within(c.getByRole("table", { name: "Posture exceptions" })).getByText("VPC flow logs disabled")).toBeInTheDocument();
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
