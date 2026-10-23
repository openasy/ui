import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ChartPie, Download, Lightbulb, LayoutGrid, Search, TriangleAlert, Wallet } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SegmentedControl } from "../../components/SegmentedControl";
import { SelectField, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { Sparkline } from "../../charts/Sparkline";
import type { Severity } from "../../tokens/levels";
import { PEOPLE, USER, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "explorer", label: "Explorer", icon: Search },
  { id: "budgets", label: "Budgets", icon: Wallet, count: 6 },
  { id: "anomalies", label: "Anomalies", icon: TriangleAlert, count: 2 },
  { id: "recommendations", label: "Recommendations", icon: Lightbulb },
];

const meta = {
  title: "Products/Cost",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const usd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`;

const DAYS = Array.from({ length: 19 }, (_, i) => `Oct ${i + 1}`);

type Grouping = "service" | "team" | "account";

const GROUPS: Record<Grouping, Array<{ id: string; label: string; value: number }>> = {
  service: [
    { id: "compute", label: "Compute", value: 21480 },
    { id: "database", label: "Database", value: 9320 },
    { id: "network", label: "Network", value: 6110 },
    { id: "storage", label: "Storage", value: 4870 },
  ],
  team: [
    { id: "platform", label: "team:platform", value: 14210 },
    { id: "payments", label: "team:payments", value: 9840 },
    { id: "data", label: "team:data", value: 8730 },
    { id: "growth", label: "team:growth", value: 4410 },
    { id: "security", label: "team:security", value: 2860 },
    { id: "untagged", label: "untagged", value: 1730 },
  ],
  account: [
    { id: "prod", label: "acme-prod", value: 29960 },
    { id: "staging", label: "acme-staging", value: 6420 },
    { id: "data", label: "acme-data-lake", value: 4310 },
    { id: "sandbox", label: "acme-sandbox", value: 1090 },
  ],
};

interface Anomaly {
  id: string;
  what: string;
  scope: string;
  date: string;
  change: string;
  impact: number;
  severity: Severity;
  state: "Open" | "Acknowledged";
}

const anomalies: Anomaly[] = [
  {
    id: "a1",
    what: "NAT gateway egress",
    scope: "acme-prod · eu-west-1 · team:platform",
    date: "Oct 17",
    change: "+312%",
    impact: 1840,
    severity: "high",
    state: "Open",
  },
  {
    id: "a2",
    what: "Object storage PUT requests",
    scope: "acme-data-lake · team:data",
    date: "Oct 15",
    change: "+88%",
    impact: 310,
    severity: "medium",
    state: "Acknowledged",
  },
];

const anomalyColumns: Column<Anomaly>[] = [
  { id: "sev", header: "Severity", width: "96px", sortValue: (a) => a.severity, cell: (a) => <SeverityBadge severity={a.severity} /> },
  {
    id: "what",
    header: "Anomaly",
    cell: (a) => (
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{a.what}</span>
        <span className="truncate font-mono text-2xs text-fg-muted">{a.scope}</span>
      </span>
    ),
  },
  { id: "date", header: "Started", mono: true, cell: (a) => a.date },
  { id: "change", header: "Change", align: "right", mono: true, cell: (a) => <span className="text-danger-text">{a.change}</span> },
  { id: "impact", header: "Extra / month", align: "right", mono: true, sortValue: (a) => a.impact, cell: (a) => usd(a.impact) },
  { id: "state", header: "State", cell: (a) => <StatusBadge tone={a.state === "Open" ? "danger" : "neutral"}>{a.state}</StatusBadge> },
];

interface Rec {
  id: string;
  kind: "Rightsize" | "Delete idle" | "Commit";
  title: string;
  detail: string;
  saving: number;
}

const recs: Rec[] = [
  { id: "r1", kind: "Rightsize", title: "Rightsize 6 worker-prod instances", detail: "8 vCPU → 4 vCPU · p95 CPU 18% over 30 days", saving: 1260 },
  { id: "r2", kind: "Delete idle", title: "Delete 14 unattached volumes", detail: "2.8 TB gp3 · unattached > 21 days · acme-staging", saving: 224 },
  { id: "r3", kind: "Rightsize", title: "Downsize db-prod-02 replica", detail: "db.r6g.2xlarge → xlarge · 9% CPU, 31% memory", saving: 540 },
  { id: "r4", kind: "Delete idle", title: "Release 5 idle elastic IPs", detail: "Not associated for 30+ days", saving: 18 },
  { id: "r5", kind: "Commit", title: "1-year compute savings plan", detail: "Covers 62% of steady compute baseline", saving: 2310 },
];

/** Overview: spend vs forecast and budget, daily spend by service, grouping, anomalies and recommendations. */
function OverviewPage() {
  const [range, setRange] = useState("30d");
  const [accounts, setAccounts] = useState<string[]>([]);
  const [group, setGroup] = useState<Grouping>("service");
  const total = GROUPS[group].reduce((s, g) => s + g.value, 0);
  return (
    <>
      <PageHeader
        title="Overview"
        description="October 2026 · 4 accounts · prices in USD, amortised"
        meta={<StatusBadge tone="warning">Forecast over budget</StatusBadge>}
        actions={
          <>
            <Button icon={<Download />}>Export CSV</Button>
            <Button variant="primary" icon={<Wallet />}>
              New budget
            </Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker
          value={range}
          onChange={setRange}
          ranges={[
            { value: "mtd", label: "Month to date" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
          ]}
        />
        <FacetFilter
          label="Account"
          selected={accounts}
          onChange={setAccounts}
          options={GROUPS.account.map((a) => ({ value: a.label, count: Math.round(a.value) }))}
        />
      </FilterBar>
      <Callout
        tone="danger"
        title="NAT gateway egress is up 312% since Oct 17"
        action={
          <Button size="sm" icon={<ChartPie />}>
            Open in Explorer
          </Button>
        }
      >
        acme-prod · eu-west-1 · about {usd(1840)} extra per month if it continues. Most traffic goes to an object storage endpoint outside the VPC.
      </Callout>
      <KpiGrid>
        <KpiCard
          label="Month to date"
          value={usd(41780)}
          unit="19 of 31 days"
          trend={wave(19, { base: 2100, amp: 300, seed: 41 })}
          delta={{ label: "+9% vs. Sep, same day", direction: "up", intent: "bad" }}
        />
        <KpiCard
          label="Forecast · October"
          value={usd(69400)}
          unit="end of month"
          tone="warning"
          delta={{ label: `${usd(4400)} over budget`, direction: "up", intent: "bad" }}
        />
        <KpiCard label="Budget · October" value={usd(65000)} unit="6 budgets" delta={{ label: "64% used · 61% of month elapsed" }} />
        <KpiCard label="Potential savings" value={usd(4352)} unit="per month" tone="success" delta={{ label: "5 recommendations", intent: "good" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Daily spend" description="Stacked by service · USD">
          <TimeSeriesChart
            label="Daily spend by service in USD"
            labels={DAYS}
            stacked
            height={220}
            format={usd}
            series={[
              { id: "compute", name: "Compute", data: wave(19, { base: 1130, amp: 90, seed: 51 }) },
              { id: "storage", name: "Storage", data: wave(19, { base: 256, amp: 12, seed: 52 }) },
              { id: "network", name: "Network", data: wave(19, { base: 250, amp: 20, seed: 53, spike: 360, spikeAt: 16, spikeLen: 2 }) },
              { id: "database", name: "Database", data: wave(19, { base: 490, amp: 30, seed: 54 }) },
            ]}
          />
        </Panel>
        <Panel
          title="Spend by"
          description={`Month to date · ${usd(total)}`}
          actions={
            <SegmentedControl
              label="Group spend by"
              value={group}
              onChange={setGroup}
              options={[
                { value: "service", label: "Service" },
                { value: "team", label: "Team" },
                { value: "account", label: "Account" },
              ]}
            />
          }
        >
          <BarList label={`Spend by ${group}`} format={usd} items={GROUPS[group].map((g) => ({ ...g, href: `#explorer/${group}/${g.id}` }))} />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Anomalies" description="Detected against a 28-day baseline" flush>
          <DataTable label="Cost anomalies" columns={anomalyColumns} rows={anomalies} getRowId={(a) => a.id} minWidth={720} />
        </Panel>
        <Panel title="Recommendations" description={`${usd(4352)} per month in total`} flush>
          <ul aria-label="Recommendations" className="flex flex-col">
            {recs.map((r) => (
              <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5 border-b border-subtle px-3 py-2 last:border-0">
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="flex items-center gap-2">
                    <Badge tone={r.kind === "Delete idle" ? "warning" : "info"}>{r.kind}</Badge>
                    <span className="truncate text-sm font-medium">{r.title}</span>
                  </span>
                  <span className="truncate text-xs text-fg-muted">{r.detail}</span>
                </span>
                <span className="text-right font-mono text-xs font-semibold text-success">−{usd(r.saving)}/mo</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Explorer                                                            */
/* ------------------------------------------------------------------ */

interface LineItem {
  id: string;
  resource: string;
  service: string;
  account: string;
  team: string;
  region: string;
  mtd: number;
  daily: number[];
  change: number;
}

const LINE_ITEMS: LineItem[] = [
  {
    id: "l1",
    resource: "nat-0a91f3 (NAT gateway)",
    service: "Network",
    account: "acme-prod",
    team: "team:platform",
    region: "eu-west-1",
    mtd: 2410,
    daily: wave(19, { base: 80, amp: 6, seed: 61, spike: 250, spikeAt: 16, spikeLen: 2 }),
    change: 312,
  },
  {
    id: "l2",
    resource: "eks-prod-eu node group",
    service: "Compute",
    account: "acme-prod",
    team: "team:platform",
    region: "eu-west-1",
    mtd: 9820,
    daily: wave(19, { base: 515, amp: 30, seed: 62 }),
    change: 4,
  },
  {
    id: "l3",
    resource: "db-prod-01 (Postgres)",
    service: "Database",
    account: "acme-prod",
    team: "team:payments",
    region: "eu-west-1",
    mtd: 4110,
    daily: wave(19, { base: 216, amp: 4, seed: 63 }),
    change: 0,
  },
  {
    id: "l4",
    resource: "db-prod-02 replica",
    service: "Database",
    account: "acme-prod",
    team: "team:payments",
    region: "eu-west-1",
    mtd: 2050,
    daily: wave(19, { base: 108, amp: 2, seed: 64 }),
    change: 0,
  },
  {
    id: "l5",
    resource: "worker-prod-* (6 instances)",
    service: "Compute",
    account: "acme-prod",
    team: "team:payments",
    region: "eu-west-1",
    mtd: 3680,
    daily: wave(19, { base: 194, amp: 10, seed: 65 }),
    change: 2,
  },
  {
    id: "l6",
    resource: "s3://acme-data-lake",
    service: "Storage",
    account: "acme-data-lake",
    team: "team:data",
    region: "eu-central-1",
    mtd: 2930,
    daily: wave(19, { base: 150, amp: 8, seed: 66, spike: 40, spikeAt: 14 }),
    change: 88,
  },
  {
    id: "l7",
    resource: "spark-batch cluster",
    service: "Compute",
    account: "acme-data-lake",
    team: "team:data",
    region: "eu-central-1",
    mtd: 4600,
    daily: wave(19, { base: 240, amp: 90, seed: 67 }),
    change: -6,
  },
  {
    id: "l8",
    resource: "staging EKS",
    service: "Compute",
    account: "acme-staging",
    team: "team:growth",
    region: "eu-west-1",
    mtd: 3180,
    daily: wave(19, { base: 167, amp: 20, seed: 68 }),
    change: 11,
  },
  {
    id: "l9",
    resource: "14 unattached volumes",
    service: "Storage",
    account: "acme-staging",
    team: "untagged",
    region: "eu-west-1",
    mtd: 140,
    daily: wave(19, { base: 7.4, amp: 0.2, seed: 69 }),
    change: 0,
  },
  {
    id: "l10",
    resource: "CloudFront distribution",
    service: "Network",
    account: "acme-prod",
    team: "team:growth",
    region: "global",
    mtd: 1290,
    daily: wave(19, { base: 68, amp: 12, seed: 70 }),
    change: 7,
  },
  {
    id: "l11",
    resource: "openasy SIEM storage",
    service: "Storage",
    account: "acme-prod",
    team: "team:security",
    region: "eu-west-1",
    mtd: 1460,
    daily: wave(19, { base: 77, amp: 3, seed: 71 }),
    change: 3,
  },
];

function ExplorerPage() {
  const [range, setRange] = useState("mtd");
  const [service, setService] = useState<string[]>([]);
  const [team, setTeam] = useState<string[]>([]);
  const [group, setGroup] = useState<"service" | "team" | "account">("team");
  const rows = LINE_ITEMS.filter((l) => (service.length === 0 || service.includes(l.service)) && (team.length === 0 || team.includes(l.team)));
  const total = rows.reduce((s, l) => s + l.mtd, 0);
  const keys = [...new Set(rows.map((l) => l[group]))];
  const cols: Column<LineItem>[] = [
    {
      id: "res",
      header: "Resource",
      pinned: "left",
      width: "24%",
      cell: (l) => (
        <span className="block truncate font-mono text-xs" title={l.resource}>
          {l.resource}
        </span>
      ),
    },
    { id: "service", header: "Service", cell: (l) => <Badge>{l.service}</Badge> },
    { id: "account", header: "Account", mono: true, cell: (l) => l.account },
    { id: "team", header: "Team tag", mono: true, cell: (l) => (l.team === "untagged" ? <Badge tone="warning">untagged</Badge> : l.team) },
    { id: "region", header: "Region", mono: true, cell: (l) => l.region },
    {
      id: "trend",
      header: "Daily",
      width: "130px",
      cell: (l) => <Sparkline data={l.daily} label={`Daily spend for ${l.resource}`} height={22} format={(v) => usd(v)} />,
    },
    {
      id: "change",
      header: "vs. Sep",
      align: "right",
      mono: true,
      sortValue: (l) => l.change,
      cell: (l) => (
        <span className={l.change > 20 ? "text-danger-text" : undefined}>
          {l.change > 0 ? "+" : ""}
          {l.change}%
        </span>
      ),
    },
    { id: "mtd", header: "Month to date", align: "right", mono: true, sortValue: (l) => l.mtd, cell: (l) => usd(l.mtd) },
  ];
  return (
    <>
      <PageHeader
        title="Explorer"
        description="Slice spend by any tag. Untagged spend is shown so it can be chased down."
        actions={<Button icon={<Download />}>Export CSV</Button>}
      />
      <FilterBar onClear={service.length || team.length ? () => (setService([]), setTeam([])) : undefined}>
        <TimeRangePicker
          value={range}
          onChange={setRange}
          ranges={[
            { value: "mtd", label: "Month to date" },
            { value: "30d", label: "Last 30 days" },
            { value: "90d", label: "Last 90 days" },
          ]}
        />
        <FacetFilter
          label="Service"
          selected={service}
          onChange={setService}
          options={[...new Set(LINE_ITEMS.map((l) => l.service))].map((s) => ({ value: s, count: LINE_ITEMS.filter((l) => l.service === s).length }))}
        />
        <FacetFilter
          label="Team"
          selected={team}
          onChange={setTeam}
          options={[...new Set(LINE_ITEMS.map((l) => l.team))].map((t) => ({ value: t, count: LINE_ITEMS.filter((l) => l.team === t).length }))}
        />
        <SegmentedControl
          label="Group chart by"
          value={group}
          onChange={setGroup}
          options={[
            { value: "service", label: "Service" },
            { value: "team", label: "Team" },
            { value: "account", label: "Account" },
          ]}
        />
      </FilterBar>
      <Panel title="Daily spend" description={`Grouped by ${group} · ${usd(total)} month to date`}>
        <TimeSeriesChart
          label={`Daily spend grouped by ${group}`}
          labels={DAYS}
          stacked
          area
          height={180}
          format={usd}
          series={keys.map((k) => ({
            id: k,
            name: k,
            data: DAYS.map((_, i) => rows.filter((l) => l[group] === k).reduce((s, l) => s + (l.daily[i] ?? 0), 0)),
          }))}
        />
      </Panel>
      <Panel title="Line items" description={`${rows.length} resources`} flush>
        <DataTable label="Cost line items" columns={cols} rows={rows} getRowId={(l) => l.id} defaultSort={{ id: "mtd", direction: "desc" }} minWidth={1080} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Budgets                                                             */
/* ------------------------------------------------------------------ */

interface Budget {
  id: string;
  name: string;
  scope: string;
  amount: number;
  spent: number;
  forecast: number;
  alertAt: number;
  owner: string;
}

const BUDGETS: Budget[] = [
  { id: "b1", name: "Total cloud", scope: "All accounts", amount: 65000, spent: 41780, forecast: 69400, alertAt: 90, owner: PEOPLE[1] },
  { id: "b2", name: "Platform", scope: "team:platform", amount: 22000, spent: 14210, forecast: 24900, alertAt: 90, owner: PEOPLE[0] },
  { id: "b3", name: "Payments", scope: "team:payments", amount: 17000, spent: 9840, forecast: 15900, alertAt: 85, owner: PEOPLE[2] },
  { id: "b4", name: "Data", scope: "team:data", amount: 15000, spent: 8730, forecast: 14300, alertAt: 90, owner: PEOPLE[7] },
  { id: "b5", name: "Staging", scope: "acme-staging", amount: 9000, spent: 6420, forecast: 10500, alertAt: 80, owner: PEOPLE[4] },
  { id: "b6", name: "Security", scope: "team:security", amount: 5000, spent: 2860, forecast: 4650, alertAt: 90, owner: PEOPLE[3] },
];

function BudgetsPage() {
  const [items, setItems] = useState(BUDGETS);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("5000");
  const [scope, setScope] = useState("team:growth");
  const cols: Column<Budget>[] = [
    {
      id: "name",
      header: "Budget",
      width: "20%",
      cell: (b) => (
        <span className="flex flex-col">
          <span className="font-medium">{b.name}</span>
          <span className="font-mono text-2xs text-fg-muted">{b.scope}</span>
        </span>
      ),
    },
    { id: "amount", header: "Monthly", align: "right", mono: true, sortValue: (b) => b.amount, cell: (b) => usd(b.amount) },
    {
      id: "used",
      header: "Used",
      width: "22%",
      sortValue: (b) => b.spent / b.amount,
      cell: (b) => {
        const v = Math.round((b.spent / b.amount) * 100);
        return (
          <span className="flex items-center gap-2">
            <span
              role="progressbar"
              aria-label={`${b.name} budget used`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={v}
              className="h-1.5 w-24 overflow-hidden rounded-full bg-subtle"
            >
              <span className={`block h-full rounded-full ${v >= b.alertAt ? "bg-danger" : "bg-accent"}`} style={{ width: `${Math.min(v, 100)}%` }} />
            </span>
            <span className="font-mono text-xs">{v}%</span>
          </span>
        );
      },
    },
    {
      id: "forecast",
      header: "Forecast",
      align: "right",
      mono: true,
      sortValue: (b) => b.forecast / b.amount,
      cell: (b) => <span className={b.forecast > b.amount ? "text-danger-text" : undefined}>{usd(b.forecast)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: (b) =>
        b.forecast > b.amount ? (
          <StatusBadge tone="danger">Over by {usd(b.forecast - b.amount)}</StatusBadge>
        ) : (
          <StatusBadge tone="success">On track</StatusBadge>
        ),
    },
    { id: "alert", header: "Alert at", align: "right", mono: true, cell: (b) => `${b.alertAt}%` },
    { id: "owner", header: "Owner", cell: (b) => <span className="text-xs">{b.owner}</span> },
  ];
  const over = items.filter((b) => b.forecast > b.amount).length;
  return (
    <>
      <PageHeader title="Budgets" description="Monthly budgets per team or account. Owners get an alert when actual or forecast spend crosses the threshold." />
      <KpiGrid>
        <KpiCard label="Budgets" value={`${items.length}`} />
        <KpiCard label="Forecast over" value={`${over}`} tone={over ? "danger" : "success"} />
        <KpiCard label="Month elapsed" value="61" unit="%" />
        <KpiCard label="Untagged spend" value={usd(1730)} tone="warning" delta={{ label: "Not in any team budget" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Budgets · October" flush>
          <DataTable label="Budgets" columns={cols} rows={items} getRowId={(b) => b.id} minWidth={940} />
        </Panel>
        <Panel title="New budget" aria-label="New budget">
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setItems((all) => [
                ...all,
                { id: `b${all.length + 1}`, name: name.trim(), scope, amount: Number(amount) || 0, spent: 0, forecast: 0, alertAt: 90, owner: USER.name },
              ]);
              setName("");
            }}
          >
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Growth" />
            <SelectField
              label="Scope"
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              options={["team:growth", "team:platform", "acme-sandbox", "acme-data-lake"].map((v) => ({ value: v, label: v }))}
            />
            <TextField label="Monthly amount (USD)" value={amount} onChange={(e) => setAmount(e.target.value)} mono inputMode="numeric" />
            <Button type="submit" variant="primary" disabled={!name.trim()}>
              Create budget
            </Button>
          </form>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Anomalies                                                           */
/* ------------------------------------------------------------------ */

interface AnomalyDetail extends Anomaly {
  cause: string;
  drivers: Array<{ id: string; label: string; value: number }>;
}

const ANOMALIES: AnomalyDetail[] = [
  {
    ...anomalies[0]!,
    cause: "Egress to object storage via the NAT gateway instead of the VPC endpoint. Started after the reports-cron image change on Oct 17.",
    drivers: [
      { id: "d1", label: "reports-cron → s3 eu-west-1", value: 1420 },
      { id: "d2", label: "worker-prod-09 → 198.51.100.201", value: 260 },
      { id: "d3", label: "Other", value: 160 },
    ],
  },
  {
    ...anomalies[1]!,
    cause: "A new Spark job writes many small files. Compacting to 128 MB objects would cut PUT requests by about 90%.",
    drivers: [
      { id: "d1", label: "spark-batch daily_events job", value: 280 },
      { id: "d2", label: "Other", value: 30 },
    ],
  },
  {
    id: "a3",
    what: "GPU instances in sandbox",
    scope: "acme-sandbox · us-east-1 · untagged",
    date: "Oct 9",
    change: "+640%",
    impact: 920,
    severity: "high",
    state: "Acknowledged",
    cause: "Two g5.2xlarge instances left running after a demo. Stopped on Oct 11.",
    drivers: [{ id: "d1", label: "i-0c41… g5.2xlarge", value: 920 }],
  },
];

function AnomaliesPage() {
  const [state, setState] = useState<Record<string, Anomaly["state"]>>(Object.fromEntries(ANOMALIES.map((a) => [a.id, a.state])));
  const [active, setActive] = useState("a1");
  const cur = ANOMALIES.find((a) => a.id === active);
  const cols: Column<AnomalyDetail>[] = anomalyColumns.map((c) =>
    c.id === "state"
      ? { ...c, cell: (a: AnomalyDetail) => <StatusBadge tone={state[a.id] === "Open" ? "danger" : "neutral"}>{state[a.id]}</StatusBadge> }
      : (c as Column<AnomalyDetail>),
  );
  return (
    <>
      <PageHeader title="Anomalies" description="Spend that moved away from its 28-day baseline by more than 3 standard deviations, per service and tag." />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Anomalies · 30 days" flush>
          <DataTable
            label="Cost anomalies"
            columns={cols}
            rows={ANOMALIES}
            getRowId={(a) => a.id}
            onRowClick={(a) => setActive(a.id)}
            activeRowId={active}
            minWidth={720}
          />
        </Panel>
        <Panel
          title="Root cause"
          description={cur?.what}
          aria-label="Root cause"
          actions={
            cur &&
            state[cur.id] === "Open" && (
              <Button size="sm" onClick={() => setState((s) => ({ ...s, [cur.id]: "Acknowledged" }))}>
                Acknowledge
              </Button>
            )
          }
        >
          {cur && (
            <div className="flex flex-col gap-2.5 text-sm">
              <p>{cur.cause}</p>
              <BarList label={`Cost drivers for ${cur.what}`} items={cur.drivers} format={usd} />
              <span className="text-xs text-fg-muted">Extra spend per month if it continues: {usd(cur.impact)}</span>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Recommendations                                                     */
/* ------------------------------------------------------------------ */

function RecommendationsPage() {
  const [state, setState] = useState<Record<string, "open" | "applied" | "dismissed">>({});
  const [kind, setKind] = useState<string[]>([]);
  const rows = recs.filter((r) => kind.length === 0 || kind.includes(r.kind));
  const open = recs.filter((r) => (state[r.id] ?? "open") === "open");
  const applied = recs.filter((r) => state[r.id] === "applied").reduce((s, r) => s + r.saving, 0);
  const cols: Column<Rec>[] = [
    { id: "kind", header: "Type", width: "110px", cell: (r) => <Badge tone={r.kind === "Delete idle" ? "warning" : "info"}>{r.kind}</Badge> },
    {
      id: "title",
      header: "Recommendation",
      width: "40%",
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{r.title}</span>
          <span className="truncate text-xs text-fg-muted">{r.detail}</span>
        </span>
      ),
    },
    {
      id: "saving",
      header: "Saving / month",
      align: "right",
      mono: true,
      sortValue: (r) => r.saving,
      cell: (r) => <span className="text-success">{usd(r.saving)}</span>,
    },
    {
      id: "act",
      header: "",
      width: "170px",
      hideable: false,
      cell: (r) =>
        (state[r.id] ?? "open") === "open" ? (
          <span className="flex justify-end gap-1">
            <Button size="xs" variant="primary" onClick={() => setState((s) => ({ ...s, [r.id]: "applied" }))} aria-label={`Apply: ${r.title}`}>
              Apply
            </Button>
            <Button size="xs" variant="ghost" onClick={() => setState((s) => ({ ...s, [r.id]: "dismissed" }))} aria-label={`Dismiss: ${r.title}`}>
              Dismiss
            </Button>
          </span>
        ) : (
          <StatusBadge tone={state[r.id] === "applied" ? "success" : "neutral"}>{state[r.id]}</StatusBadge>
        ),
    },
  ];
  return (
    <>
      <PageHeader title="Recommendations" description="Rightsizing, idle resources and commitments, from 30 days of utilisation metrics." />
      <KpiGrid>
        <KpiCard label="Open" value={`${open.length}`} unit="recommendations" />
        <KpiCard label="Potential savings" value={usd(open.reduce((s, r) => s + r.saving, 0))} unit="per month" tone="success" />
        <KpiCard label="Applied this month" value={usd(applied)} unit="per month" />
        <KpiCard label="Commitment coverage" value="38" unit="%" delta={{ label: "Target 70%" }} />
      </KpiGrid>
      <FilterBar onClear={kind.length ? () => setKind([]) : undefined}>
        <FacetFilter
          label="Type"
          selected={kind}
          onChange={setKind}
          options={(["Rightsize", "Delete idle", "Commit"] as const).map((k) => ({ value: k, count: recs.filter((r) => r.kind === k).length }))}
        />
      </FilterBar>
      <Panel title="Recommendations" flush>
        <DataTable
          label="Saving recommendations"
          columns={cols}
          rows={rows}
          getRowId={(r) => r.id}
          defaultSort={{ id: "saving", direction: "desc" }}
          minWidth={820}
        />
      </Panel>
    </>
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  explorer: () => <ExplorerPage />,
  budgets: () => <BudgetsPage />,
  anomalies: () => <AnomaliesPage />,
  recommendations: () => <RecommendationsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="cost" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    await expect(c.getByRole("alert")).toHaveTextContent("312%");
    const byService = c.getByRole("list", { name: "Spend by service" });
    await expect(within(byService).getByText("Compute")).toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "Team" }));
    await expect(c.getByRole("radio", { name: "Team" })).toHaveAttribute("aria-checked", "true");
    const byTeam = c.getByRole("list", { name: "Spend by team" });
    await expect(within(byTeam).getAllByRole("listitem")).toHaveLength(6);
    await expect(within(byTeam).getByText("team:payments")).toBeInTheDocument();
    await expect(c.queryByRole("list", { name: "Spend by service" })).not.toBeInTheDocument();
  },
};

export const Explorer: Story = {
  ...app("explorer"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Cost line items" }).querySelectorAll("tbody tr")).toHaveLength(11);
    await userEvent.click(c.getByRole("radio", { name: "Service" }));
    await expect(c.getByText(/Grouped by service/)).toBeInTheDocument();
  },
};

export const Budgets: Story = {
  ...app("budgets"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("progressbar", { name: "Staging budget used" })).toHaveAttribute("aria-valuenow", "71");
    await userEvent.type(c.getByRole("textbox", { name: "Name" }), "Growth");
    await userEvent.click(c.getByRole("button", { name: "Create budget" }));
    await expect(c.getByRole("table", { name: "Budgets" }).querySelectorAll("tbody tr")).toHaveLength(7);
  },
};

export const Anomalies: Story = {
  ...app("anomalies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Root cause")).toHaveTextContent("VPC endpoint");
    await userEvent.click(c.getByRole("button", { name: "Acknowledge" }));
    await expect(c.queryByRole("button", { name: "Acknowledge" })).not.toBeInTheDocument();
  },
};

export const Recommendations: Story = {
  ...app("recommendations"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Apply: 1-year compute savings plan" }));
    await expect(within(c.getByRole("table", { name: "Saving recommendations" })).getByText("applied")).toBeInTheDocument();
    await expect(c.getAllByRole("button", { name: /^Apply:/ })).toHaveLength(4);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
