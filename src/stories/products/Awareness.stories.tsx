import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookOpenCheck, FileBarChart, FileStack, Fish, Mail, Plus, Send, Users } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { Heatmap } from "../../charts/Heatmap";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, emailOf } from "../mocks";

const nav = [
  { id: "campaigns", label: "Campaigns", icon: Fish, count: 6 },
  { id: "training", label: "Training", icon: BookOpenCheck },
  { id: "people", label: "People", icon: Users, count: 214 },
  { id: "templates", label: "Templates", icon: FileStack },
  { id: "reports", label: "Reports", icon: FileBarChart },
];

const meta = {
  title: "Products/Awareness",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type CampaignStatus = "running" | "completed" | "scheduled";
const CAMPAIGN_STATUS: Record<CampaignStatus, { label: string; tone: Tone }> = {
  running: { label: "Running", tone: "info" },
  completed: { label: "Completed", tone: "success" },
  scheduled: { label: "Scheduled", tone: "neutral" },
};

interface Campaign {
  id: string;
  name: string;
  template: string;
  month: string;
  sent: number;
  opened: number;
  clicked: number;
  submitted: number;
  reported: number;
  status: CampaignStatus;
  department: string;
}

const campaigns: Campaign[] = [
  {
    id: "cmp-6",
    name: "Q4 payroll update",
    template: "HR: updated payslip portal",
    month: "Oct",
    sent: 214,
    opened: 162,
    clicked: 19,
    submitted: 6,
    reported: 88,
    status: "running",
    department: "All staff",
  },
  {
    id: "cmp-5",
    name: "Shared invoice",
    template: "Finance: invoice shared via file link",
    month: "Sep",
    sent: 214,
    opened: 171,
    clicked: 26,
    submitted: 9,
    reported: 71,
    status: "completed",
    department: "All staff",
  },
  {
    id: "cmp-4",
    name: "MFA reset required",
    template: "IT: re-enrol your authenticator",
    month: "Aug",
    sent: 208,
    opened: 175,
    clicked: 33,
    submitted: 14,
    reported: 58,
    status: "completed",
    department: "All staff",
  },
  {
    id: "cmp-3",
    name: "Parcel on hold",
    template: "Courier: customs fee due",
    month: "Jul",
    sent: 205,
    opened: 150,
    clicked: 39,
    submitted: 11,
    reported: 44,
    status: "completed",
    department: "All staff",
  },
  {
    id: "cmp-2",
    name: "Benefits enrolment",
    template: "HR: choose your 2026 plan",
    month: "Jun",
    sent: 201,
    opened: 158,
    clicked: 47,
    submitted: 21,
    reported: 33,
    status: "completed",
    department: "All staff",
  },
  {
    id: "cmp-1",
    name: "CEO wire request",
    template: "Exec: urgent payment approval",
    month: "May",
    sent: 38,
    opened: 34,
    clicked: 11,
    submitted: 4,
    reported: 6,
    status: "completed",
    department: "Finance",
  },
];

const pct = (n: number, d: number) => Math.round((n / d) * 1000) / 10;

const campaignColumns: Column<Campaign>[] = [
  {
    id: "name",
    header: "Campaign",
    width: "22%",
    sortValue: (c) => c.name,
    cell: (c) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{c.name}</span>
        <span className="text-2xs text-fg-muted">
          {c.month} 2026 · {c.department}
        </span>
      </span>
    ),
  },
  { id: "template", header: "Template", cell: (c) => <span className="truncate text-fg-muted">{c.template}</span> },
  { id: "sent", header: "Sent", align: "right", mono: true, sortValue: (c) => c.sent, cell: (c) => c.sent },
  { id: "opened", header: "Opened", align: "right", mono: true, sortValue: (c) => c.opened, cell: (c) => c.opened },
  { id: "clicked", header: "Clicked", align: "right", mono: true, sortValue: (c) => c.clicked / c.sent, cell: (c) => `${pct(c.clicked, c.sent)}%` },
  {
    id: "submitted",
    header: "Credentials",
    align: "right",
    mono: true,
    sortValue: (c) => c.submitted,
    cell: (c) => <span className={c.submitted >= 10 ? "text-danger-text" : undefined}>{c.submitted}</span>,
  },
  { id: "reported", header: "Reported", align: "right", mono: true, sortValue: (c) => c.reported / c.sent, cell: (c) => `${pct(c.reported, c.sent)}%` },
  {
    id: "status",
    header: "Status",
    width: "110px",
    cell: (c) => <StatusBadge tone={CAMPAIGN_STATUS[c.status].tone}>{CAMPAIGN_STATUS[c.status].label}</StatusBadge>,
  },
];

type TrainingStatus = "overdue" | "in-progress" | "assigned" | "done";
const TRAINING: Record<TrainingStatus, { label: string; tone: Tone }> = {
  overdue: { label: "Overdue", tone: "danger" },
  "in-progress": { label: "In progress", tone: "warning" },
  assigned: { label: "Assigned", tone: "info" },
  done: { label: "Completed", tone: "success" },
};

interface AtRisk {
  name: string;
  team: string;
  clicks: number;
  submitted: number;
  training: TrainingStatus;
}

const atRisk: AtRisk[] = [
  { name: PEOPLE[4], team: "Finance", clicks: 4, submitted: 2, training: "overdue" },
  { name: PEOPLE[6], team: "Sales", clicks: 3, submitted: 2, training: "in-progress" },
  { name: PEOPLE[2], team: "Support", clicks: 3, submitted: 1, training: "assigned" },
  { name: PEOPLE[7], team: "Marketing", clicks: 2, submitted: 1, training: "done" },
  { name: PEOPLE[5], team: "Operations", clicks: 2, submitted: 0, training: "done" },
];

const atRiskColumns: Column<AtRisk>[] = [
  {
    id: "person",
    header: "Person",
    width: "40%",
    sortValue: (p) => p.name,
    cell: (p) => (
      <span className="flex items-center gap-2">
        <Avatar name={p.name} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{p.name}</span>
          <span className="truncate text-2xs text-fg-muted">
            {p.team} · {emailOf(p.name)}
          </span>
        </span>
      </span>
    ),
  },
  { id: "clicks", header: "Clicks · 6 mo", align: "right", mono: true, sortValue: (p) => p.clicks, cell: (p) => p.clicks },
  { id: "submitted", header: "Creds", align: "right", mono: true, sortValue: (p) => p.submitted, cell: (p) => p.submitted },
  { id: "training", header: "Training", cell: (p) => <StatusBadge tone={TRAINING[p.training].tone}>{TRAINING[p.training].label}</StatusBadge> },
  {
    id: "act",
    header: <span className="sr-only">Actions</span>,
    width: "44px",
    align: "right",
    cell: (p) => (
      <IconButton label={`Send reminder to ${p.name}`} size="xs">
        <Mail />
      </IconButton>
    ),
  },
];

const chronological = [...campaigns].reverse();

function CampaignDetail({ c, onClose }: { c: Campaign; onClose: () => void }) {
  const funnel = [
    { id: "sent", label: "Delivered", value: c.sent },
    { id: "opened", label: "Opened", value: c.opened },
    { id: "clicked", label: "Clicked link", value: c.clicked, color: "var(--oa-warning)" },
    { id: "submitted", label: "Submitted credentials", value: c.submitted, color: "var(--oa-danger)" },
    { id: "reported", label: "Reported to security", value: c.reported, color: "var(--oa-success)" },
  ];
  return (
    <Panel
      title={`Campaign: ${c.name}`}
      description={`${c.template} · sent to ${c.department.toLowerCase()} · ${c.month} 2026`}
      actions={
        <Button size="sm" variant="ghost" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <BarList label={`Funnel for ${c.name}`} items={funnel} />
        <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
          <dt className="text-fg-muted">Click rate</dt>
          <dd className="font-mono">{pct(c.clicked, c.sent)}%</dd>
          <dt className="text-fg-muted">Report rate</dt>
          <dd className="font-mono">{pct(c.reported, c.sent)}%</dd>
          <dt className="text-fg-muted">Median time to report</dt>
          <dd className="font-mono">6 min</dd>
          <dt className="text-fg-muted">Landing page</dt>
          <dd className="truncate font-mono">portal-{c.id}.example.com</dd>
          <dt className="text-fg-muted">Follow-up</dt>
          <dd>{c.submitted} people auto-enrolled in “Spotting credential phishing” (12 min)</dd>
        </dl>
      </div>
    </Panel>
  );
}

/** Campaigns: phishing simulation results over time, the people who need training and compliance evidence. */
function CampaignsPage() {
  const [range, setRange] = useState("180d");
  const [status, setStatus] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | undefined>();
  const rows = campaigns.filter((c) => status.length === 0 || status.includes(c.status));
  const open = campaigns.find((c) => c.id === openId);
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="214 people · monthly phishing simulations · training assigned automatically after a click"
        meta={<StatusBadge tone="info">1 running</StatusBadge>}
        actions={
          <>
            <Button size="md" icon={<Send />}>
              Send test to me
            </Button>
            <Button size="md" variant="primary" icon={<Plus />}>
              New campaign
            </Button>
          </>
        }
      />
      <FilterBar onClear={status.length ? () => setStatus([]) : undefined}>
        <TimeRangePicker
          value={range}
          onChange={setRange}
          ranges={[
            { value: "90d", label: "Last 90 days" },
            { value: "180d", label: "Last 6 months" },
            { value: "365d", label: "Last 12 months" },
          ]}
        />
        <FacetFilter
          label="Status"
          selected={status}
          onChange={setStatus}
          options={(Object.keys(CAMPAIGN_STATUS) as CampaignStatus[]).map((s) => ({
            value: s,
            label: CAMPAIGN_STATUS[s].label,
            count: campaigns.filter((c) => c.status === s).length,
          }))}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Click rate"
          value="8.9%"
          unit="last campaign"
          trend={chronological.map((c) => pct(c.clicked, c.sent))}
          trendColor="var(--oa-warning)"
          delta={{ label: "−20 pts since May", direction: "down", intent: "good" }}
        />
        <KpiCard
          label="Report rate"
          value="41.1%"
          unit="last campaign"
          trend={chronological.map((c) => pct(c.reported, c.sent))}
          trendColor="var(--oa-success)"
          delta={{ label: "+25 pts since May", direction: "up", intent: "good" }}
        />
        <KpiCard label="Training completion" value="87%" unit="186 of 214" delta={{ label: "11 overdue", direction: "up", intent: "bad" }} />
        <KpiCard label="Credentials submitted" value="6" unit="this campaign" tone="warning" delta={{ label: "All 6 passwords force-reset" }} />
      </KpiGrid>
      <Callout tone="info" title="Evidence for ISO 27001 A.6.3 and SOC 2 CC2.2 is sent to Compliance">
        Each completed campaign and training record is attached as evidence automatically. Last sync 08:00 today.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Click vs report rate" description="Per campaign, last 6 months">
          <TimeSeriesChart
            label="Click rate versus report rate over the last 6 campaigns"
            labels={chronological.map((c) => `${c.month} · ${c.name}`)}
            height={200}
            xTicks={6}
            format={(v) => `${v.toFixed(1)}%`}
            series={[
              { id: "click", name: "Click rate", color: "var(--oa-warning)", data: chronological.map((c) => pct(c.clicked, c.sent)) },
              { id: "report", name: "Report rate", color: "var(--oa-success)", data: chronological.map((c) => pct(c.reported, c.sent)) },
            ]}
          />
        </Panel>
        <Panel title="People at risk" description="Repeat clickers, sorted by credentials submitted" flush>
          <DataTable
            label="People at risk"
            columns={atRiskColumns}
            rows={atRisk}
            getRowId={(p) => p.name}
            defaultSort={{ id: "submitted", direction: "desc" }}
            minWidth={520}
          />
        </Panel>
      </div>
      <Panel
        title="Campaigns"
        description={`${rows.length} of ${campaigns.length} shown · select a row for details`}
        actions={<Badge tone="neutral">GoPhish engine</Badge>}
        flush
      >
        <DataTable
          label="Campaigns"
          columns={campaignColumns}
          rows={rows}
          getRowId={(c) => c.id}
          onRowClick={(c) => setOpenId(c.id)}
          activeRowId={openId}
          defaultSort={{ id: "name", direction: "asc" }}
          minWidth={940}
        />
      </Panel>
      {open && <CampaignDetail c={open} onClose={() => setOpenId(undefined)} />}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Training                                                            */
/* ------------------------------------------------------------------ */

interface Module {
  id: string;
  title: string;
  minutes: number;
  audience: string;
  assigned: number;
  completed: number;
  overdue: number;
  avgScore: number;
  required: boolean;
}

const MODULES: Module[] = [
  {
    id: "m1",
    title: "Spotting credential phishing",
    minutes: 12,
    audience: "Clicked a simulation",
    assigned: 31,
    completed: 22,
    overdue: 4,
    avgScore: 88,
    required: true,
  },
  {
    id: "m2",
    title: "Security basics 2026",
    minutes: 25,
    audience: "All staff · yearly",
    assigned: 214,
    completed: 186,
    overdue: 11,
    avgScore: 91,
    required: true,
  },
  { id: "m3", title: "Payment fraud and CEO scams", minutes: 15, audience: "Finance", assigned: 38, completed: 36, overdue: 0, avgScore: 94, required: true },
  {
    id: "m4",
    title: "Handling customer data under GDPR",
    minutes: 20,
    audience: "Support, Sales",
    assigned: 64,
    completed: 51,
    overdue: 3,
    avgScore: 86,
    required: true,
  },
  { id: "m5", title: "Secure coding: injection", minutes: 30, audience: "Engineering", assigned: 42, completed: 30, overdue: 2, avgScore: 79, required: false },
  { id: "m6", title: "Travelling with a laptop", minutes: 8, audience: "Optional", assigned: 0, completed: 17, overdue: 0, avgScore: 97, required: false },
];

function TrainingPage() {
  const [active, setActive] = useState("m1");
  const [reminded, setReminded] = useState<string | null>(null);
  const cur = MODULES.find((m) => m.id === active);
  const cols: Column<Module>[] = [
    {
      id: "title",
      header: "Module",
      width: "30%",
      cell: (m) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{m.title}</span>
          <span className="text-2xs text-fg-muted">
            {m.minutes} min · {m.audience}
          </span>
        </span>
      ),
    },
    { id: "req", header: "Type", cell: (m) => (m.required ? <Badge tone="info">Required</Badge> : <Badge>Optional</Badge>) },
    { id: "assigned", header: "Assigned", align: "right", mono: true, cell: (m) => m.assigned || "–" },
    {
      id: "done",
      header: "Completed",
      align: "right",
      mono: true,
      sortValue: (m) => (m.assigned ? m.completed / m.assigned : 1),
      cell: (m) => (m.assigned ? `${pct(m.completed, m.assigned)}%` : m.completed),
    },
    {
      id: "overdue",
      header: "Overdue",
      align: "right",
      mono: true,
      sortValue: (m) => m.overdue,
      cell: (m) => (m.overdue ? <span className="text-danger-text">{m.overdue}</span> : 0),
    },
    { id: "score", header: "Avg. quiz score", align: "right", mono: true, cell: (m) => `${m.avgScore}%` },
  ];
  return (
    <>
      <PageHeader
        title="Training"
        description="Short modules with a quiz. Required ones are assigned by rule; completion is sent to Compliance as evidence."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New module
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Completion" value="87" unit="% required" tone="success" />
        <KpiCard label="Overdue" value="20" unit="assignments" tone="danger" />
        <KpiCard label="Median time" value="14" unit="min per module" />
        <KpiCard label="Avg. quiz score" value="89" unit="%" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Modules" flush>
          <DataTable
            label="Training modules"
            columns={cols}
            rows={MODULES}
            getRowId={(m) => m.id}
            onRowClick={(m) => (setActive(m.id), setReminded(null))}
            activeRowId={active}
            minWidth={780}
          />
        </Panel>
        <Panel title="Assignment rule" description={cur?.title} aria-label="Assignment rule">
          {cur && (
            <div className="flex flex-col gap-2.5 text-sm">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">Who</dt>
                <dd>{cur.audience}</dd>
                <dt className="text-fg-muted">Due</dt>
                <dd>{cur.required ? "14 days after assignment" : "No due date"}</dd>
                <dt className="text-fg-muted">Reminders</dt>
                <dd>Day 7, day 13, then manager on day 15</dd>
              </dl>
              <BarList
                label={`Progress for ${cur.title}`}
                items={[
                  { id: "done", label: "Completed", value: cur.completed, color: "var(--oa-success)" },
                  { id: "open", label: "Not started or in progress", value: Math.max(0, cur.assigned - cur.completed - cur.overdue) },
                  { id: "overdue", label: "Overdue", value: cur.overdue, color: "var(--oa-danger)" },
                ]}
              />
              <Button
                size="sm"
                className="self-start"
                icon={<Mail />}
                disabled={cur.overdue === 0}
                onClick={() => setReminded(`Reminder sent to ${cur.overdue} people with ${cur.title} overdue`)}
              >
                Remind overdue
              </Button>
              {reminded && (
                <p role="status" className="text-xs text-success">
                  {reminded}
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* People                                                              */
/* ------------------------------------------------------------------ */

interface Employee {
  name: string;
  team: string;
  risk: number;
  campaigns: number;
  clicks: number;
  reports: number;
  training: TrainingStatus;
  lastActivity: string;
}

const EMPLOYEES: Employee[] = [
  { name: PEOPLE[4], team: "Finance", risk: 82, campaigns: 6, clicks: 4, reports: 0, training: "overdue", lastActivity: "Clicked Oct 14" },
  { name: PEOPLE[6], team: "Sales", risk: 71, campaigns: 6, clicks: 3, reports: 1, training: "in-progress", lastActivity: "Clicked Oct 14" },
  { name: PEOPLE[2], team: "Support", risk: 58, campaigns: 6, clicks: 3, reports: 2, training: "assigned", lastActivity: "Clicked Sep 12" },
  { name: PEOPLE[7], team: "Marketing", risk: 40, campaigns: 6, clicks: 2, reports: 3, training: "done", lastActivity: "Reported Oct 14" },
  { name: PEOPLE[5], team: "Operations", risk: 33, campaigns: 6, clicks: 2, reports: 4, training: "done", lastActivity: "Reported Oct 14" },
  { name: PEOPLE[0], team: "Engineering", risk: 9, campaigns: 6, clicks: 0, reports: 6, training: "done", lastActivity: "Reported Oct 14" },
  { name: PEOPLE[1], team: "Security", risk: 4, campaigns: 6, clicks: 0, reports: 6, training: "done", lastActivity: "Reported Oct 14" },
  { name: PEOPLE[3], team: "Engineering", risk: 12, campaigns: 5, clicks: 0, reports: 4, training: "done", lastActivity: "Reported Sep 12" },
];

function PeoplePage() {
  const [teams, setTeams] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [reminded, setReminded] = useState<string[]>([]);
  const rows = EMPLOYEES.filter((e) => (teams.length === 0 || teams.includes(e.team)) && (!query || e.name.toLowerCase().includes(query.toLowerCase())));
  const cols: Column<Employee>[] = [
    {
      id: "person",
      header: "Person",
      width: "26%",
      sortValue: (e) => e.name,
      cell: (e) => (
        <span className="flex items-center gap-2">
          <Avatar name={e.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{e.name}</span>
            <span className="truncate text-2xs text-fg-muted">{e.team}</span>
          </span>
        </span>
      ),
    },
    {
      id: "risk",
      header: "Risk score",
      align: "right",
      description: "0–100 from clicks, credential submissions and reports over 6 months; reporting lowers it.",
      sortValue: (e) => e.risk,
      cell: (e) => <Badge tone={e.risk >= 70 ? "danger" : e.risk >= 40 ? "warning" : "success"}>{e.risk}</Badge>,
    },
    { id: "clicks", header: "Clicks", align: "right", mono: true, cell: (e) => `${e.clicks} / ${e.campaigns}` },
    { id: "reports", header: "Reported", align: "right", mono: true, cell: (e) => `${e.reports} / ${e.campaigns}` },
    { id: "training", header: "Training", cell: (e) => <StatusBadge tone={TRAINING[e.training].tone}>{TRAINING[e.training].label}</StatusBadge> },
    { id: "last", header: "Last activity", cell: (e) => <span className="text-xs text-fg-muted">{e.lastActivity}</span> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      width: "44px",
      hideable: false,
      cell: (e) =>
        e.training === "done" ? null : (
          <IconButton label={`Send reminder to ${e.name}`} size="xs" onClick={() => setReminded((r) => [...r, e.name])}>
            <Mail />
          </IconButton>
        ),
    },
  ];
  const allTeams = [...new Set(EMPLOYEES.map((e) => e.team))];
  return (
    <>
      <PageHeader
        title="People"
        description="214 people synced from Identity. Contractors and service accounts are excluded from campaigns."
        actions={<SearchInput label="Search people" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />}
      />
      <FilterBar onClear={teams.length ? () => setTeams([]) : undefined}>
        <FacetFilter
          label="Team"
          selected={teams}
          onChange={setTeams}
          options={allTeams.map((t) => ({ value: t, count: EMPLOYEES.filter((e) => e.team === t).length }))}
        />
      </FilterBar>
      {reminded.length > 0 && (
        <p role="status" className="text-sm text-success">
          Reminder sent to {reminded.join(", ")}
        </p>
      )}
      <Panel title="People" description={`${rows.length} shown, highest risk first`} flush>
        <DataTable
          label="People"
          columns={cols}
          rows={rows}
          getRowId={(e) => e.name}
          defaultSort={{ id: "risk", direction: "desc" }}
          minWidth={860}
          empty={<p className="py-8">Nobody matches</p>}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

interface Template {
  id: string;
  name: string;
  category: "HR" | "Finance" | "IT" | "Courier" | "Exec";
  difficulty: 1 | 2 | 3;
  from: string;
  subject: string;
  body: string;
  used: number;
  clickRate: number;
}

const TEMPLATES: Template[] = [
  {
    id: "t1",
    name: "HR: updated payslip portal",
    category: "HR",
    difficulty: 2,
    from: "payroll@hr-example.com",
    subject: "Your October payslip is ready",
    body: "Hi {first_name},\n\nWe have moved payslips to a new portal. Sign in with your work account to see October's payslip.\n\n[View payslip]\n\nPeople team",
    used: 1,
    clickRate: 8.9,
  },
  {
    id: "t2",
    name: "Finance: invoice shared via file link",
    category: "Finance",
    difficulty: 2,
    from: "billing@docs-share.example.net",
    subject: "Invoice INV-20931 shared with you",
    body: "{sender} shared a file with you.\n\nINV-20931.pdf · 212 KB\n\n[Open in browser]",
    used: 1,
    clickRate: 12.1,
  },
  {
    id: "t3",
    name: "IT: re-enrol your authenticator",
    category: "IT",
    difficulty: 3,
    from: "it-support@example-helpdesk.com",
    subject: "Action required: MFA re-enrolment by Friday",
    body: "Your authenticator registration expires on Friday. Re-enrol now to keep access to email and VPN.\n\n[Re-enrol now]\n\nIT Service Desk",
    used: 1,
    clickRate: 15.9,
  },
  {
    id: "t4",
    name: "Courier: customs fee due",
    category: "Courier",
    difficulty: 1,
    from: "noreply@parcel-track.example.org",
    subject: "Your parcel is on hold: €1.99 fee",
    body: "Your parcel could not be delivered because a customs fee of €1.99 is unpaid.\n\n[Pay and release]",
    used: 1,
    clickRate: 19.0,
  },
  {
    id: "t5",
    name: "Exec: urgent payment approval",
    category: "Exec",
    difficulty: 3,
    from: "ceo.office@example-mail.com",
    subject: "Quick favour, confidential",
    body: "Are you at your desk? I need a wire sent today before 3 pm for an acquisition. Keep this between us.\n\nSent from my phone",
    used: 1,
    clickRate: 28.9,
  },
];

function TemplatesPage() {
  const [active, setActive] = useState("t1");
  const [cat, setCat] = useState<string[]>([]);
  const [sent, setSent] = useState(false);
  const rows = TEMPLATES.filter((t) => cat.length === 0 || cat.includes(t.category));
  const cur = TEMPLATES.find((t) => t.id === active);
  const cols: Column<Template>[] = [
    { id: "name", header: "Template", width: "40%", cell: (t) => <span className="block truncate font-medium">{t.name}</span> },
    { id: "cat", header: "Category", cell: (t) => <Badge>{t.category}</Badge> },
    {
      id: "diff",
      header: "Difficulty",
      description: "1: obvious tells. 3: convincing sender, timing and branding.",
      sortValue: (t) => t.difficulty,
      cell: (t) => <Badge tone={t.difficulty === 3 ? "danger" : t.difficulty === 2 ? "warning" : "neutral"}>{"●".repeat(t.difficulty)}</Badge>,
    },
    { id: "click", header: "Click rate", align: "right", mono: true, sortValue: (t) => t.clickRate, cell: (t) => `${t.clickRate}%` },
  ];
  return (
    <>
      <PageHeader
        title="Templates"
        description="Simulated phishing emails. Senders use look-alike domains you own, so nothing reaches real third parties."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New template
          </Button>
        }
      />
      <FilterBar onClear={cat.length ? () => setCat([]) : undefined}>
        <FacetFilter
          label="Category"
          selected={cat}
          onChange={setCat}
          options={(["HR", "Finance", "IT", "Courier", "Exec"] as const).map((c) => ({ value: c, count: TEMPLATES.filter((t) => t.category === c).length }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Templates" description={`${rows.length} shown`} flush>
          <DataTable
            label="Templates"
            columns={cols}
            rows={rows}
            getRowId={(t) => t.id}
            onRowClick={(t) => (setActive(t.id), setSent(false))}
            activeRowId={active}
            minWidth={560}
          />
        </Panel>
        <Panel
          title="Preview"
          description={cur?.name}
          aria-label="Email preview"
          actions={
            <Button size="sm" icon={<Send />} onClick={() => setSent(true)}>
              Send test to me
            </Button>
          }
        >
          {cur && (
            <div className="flex flex-col gap-2 text-sm">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-b border-line pb-2">
                <dt className="text-fg-muted">From</dt>
                <dd className="font-mono text-xs">{cur.from}</dd>
                <dt className="text-fg-muted">Subject</dt>
                <dd className="font-medium">{cur.subject}</dd>
              </dl>
              <p className="whitespace-pre-line">{cur.body}</p>
              <p className="text-xs text-fg-muted">Tells to spot: sender domain, urgency, link target differs from the text.</p>
              {sent && (
                <p role="status" className="text-xs text-success">
                  Test sent to {emailOf("Emily Clark")}
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reports                                                             */
/* ------------------------------------------------------------------ */

const TEAMS = ["Finance", "Sales", "Support", "Marketing", "Operations", "Engineering", "Security"];
const MONTHS = ["May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const CLICK_BY_TEAM = [
  [29, 31, 22, 19, 14, 12],
  [24, 27, 21, 18, 15, 13],
  [22, 25, 20, 17, 13, 11],
  [20, 26, 19, 16, 12, 9],
  [18, 21, 17, 14, 11, 8],
  [12, 16, 12, 10, 7, 5],
  [3, 4, 2, 2, 1, 0],
];

function ReportsPage() {
  const [framework, setFramework] = useState("iso");
  const [exported, setExported] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Reports"
        description="Trends by team and evidence packs for auditors."
        actions={
          <>
            <SelectField
              label="Framework"
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              options={[
                { value: "iso", label: "ISO 27001 A.6.3" },
                { value: "soc2", label: "SOC 2 CC2.2" },
                { value: "gdpr", label: "GDPR Art. 39" },
              ]}
            />
            <Button
              icon={<FileBarChart />}
              onClick={() => setExported(framework === "iso" ? "ISO 27001 A.6.3" : framework === "soc2" ? "SOC 2 CC2.2" : "GDPR Art. 39")}
            >
              Export evidence
            </Button>
          </>
        }
      />
      {exported && (
        <p role="status" className="text-sm text-success">
          Evidence pack for {exported} exported · 6 campaigns, 214 training records
        </p>
      )}
      <Panel title="Click rate by team" description="Per month, % of delivered emails clicked">
        <div className="relative overflow-x-auto" tabIndex={0} aria-label="Click rate by team heatmap">
          <div className="min-w-[520px]">
            <Heatmap label="Click rate by team and month" rows={TEAMS} columns={MONTHS} values={CLICK_BY_TEAM} unit="%" cellHeight={24} />
          </div>
        </div>
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Reported within 10 min" description="Share of all reports, by team, last campaign">
          <BarList
            label="Fast reports by team"
            items={TEAMS.map((t, i) => ({ id: t, label: t, value: [21, 34, 40, 38, 45, 62, 90][i] ?? 0 }))}
            format={(v) => `${v}%`}
          />
        </Panel>
        <Panel title="Board summary" description="Q3 2026">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
            <li>Click rate fell from 23.4% in May to 8.9% in October.</li>
            <li>Report rate rose from 15.8% to 41.1%; Engineering and Security report most.</li>
            <li>Finance remains highest risk; payment fraud training is 95% complete.</li>
            <li>6 credentials were submitted in October; all passwords were force-reset within 4 minutes.</li>
          </ul>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  campaigns: () => <CampaignsPage />,
  training: () => <TrainingPage />,
  people: () => <PeoplePage />,
  templates: () => <TemplatesPage />,
  reports: () => <ReportsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="awareness" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Campaigns: Story = {
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Campaigns" })).toBeInTheDocument();
    await expect(c.getByText(/ISO 27001 A\.6\.3 and SOC 2 CC2\.2/)).toBeInTheDocument();
    await expect(c.queryByRole("heading", { name: /^Campaign: / })).not.toBeInTheDocument();

    const table = c.getByRole("table", { name: "Campaigns" });
    await userEvent.click(within(table).getByText("MFA reset required"));
    await expect(c.getByRole("heading", { name: "Campaign: MFA reset required" })).toBeInTheDocument();
    await expect(c.getByText(/14 people auto-enrolled/)).toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: "Close" }));
    await expect(c.queryByRole("heading", { name: /^Campaign: / })).not.toBeInTheDocument();
  },
};

export const Training: Story = {
  ...app("training"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Remind overdue" }));
    await expect(c.getByText("Reminder sent to 4 people with Spotting credential phishing overdue")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Training modules" })).getByText("Payment fraud and CEO scams"));
    await expect(c.getByRole("button", { name: "Remind overdue" })).toBeDisabled();
  },
};

export const People: Story = {
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: `Send reminder to ${PEOPLE[4]}` }));
    await expect(c.getByText(`Reminder sent to ${PEOPLE[4]}`)).toBeInTheDocument();
    await userEvent.type(c.getByRole("searchbox", { name: "Search people" }), "kim");
    await expect(c.getByRole("table", { name: "People" }).querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Templates: Story = {
  ...app("templates"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Templates" })).getByText("Exec: urgent payment approval"));
    await expect(c.getByLabelText("Email preview")).toHaveTextContent("Quick favour, confidential");
    await userEvent.click(c.getByRole("button", { name: "Send test to me" }));
    await expect(c.getByText("Test sent to emily.clark@example.com")).toBeInTheDocument();
  },
};

export const Reports: Story = {
  ...app("reports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Framework" }), "soc2");
    await userEvent.click(c.getByRole("button", { name: "Export evidence" }));
    await expect(c.getByText(/Evidence pack for SOC 2 CC2\.2 exported/)).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
