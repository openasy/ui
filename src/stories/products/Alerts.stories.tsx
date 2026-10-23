import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BellOff, BellRing, CalendarClock, History, ListChecks, Mail, MessageSquare, Phone, Plus, Send, Webhook } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import type { Severity, Tone } from "../../tokens/levels";
import { PEOPLE, wave } from "../mocks";

const nav = [
  { id: "rules", label: "Rules", icon: ListChecks, count: 64 },
  { id: "firing", label: "Firing", icon: BellRing, count: 3 },
  { id: "silences", label: "Silences", icon: BellOff, count: 2 },
  { id: "oncall", label: "On-call", icon: CalendarClock },
  { id: "contacts", label: "Contact points", icon: Send, count: 5 },
  { id: "history", label: "History", icon: History },
];

const meta = {
  title: "Products/Alerts",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type RuleState = "firing" | "pending" | "ok" | "silenced";

const STATE: Record<RuleState, { label: string; tone: Tone }> = {
  firing: { label: "Firing", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
  ok: { label: "OK", tone: "success" },
  silenced: { label: "Silenced", tone: "neutral" },
};

interface Rule {
  id: string;
  state: RuleState;
  name: string;
  expr: string;
  source: ProductId;
  severity: Severity;
  route: string;
  since: string;
}

const named: Omit<Rule, "id">[] = [
  {
    state: "firing",
    name: "Host CPU above 85%",
    expr: 'avg by (host) (rate(node_cpu_seconds_total{mode!="idle"}[5m])) > 0.85',
    source: "metrics",
    severity: "high",
    route: "#ops-oncall → PagerDuty",
    since: "12 m",
  },
  {
    state: "firing",
    name: "orders-api p95 above SLO",
    expr: 'histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{service="orders-api"}[5m]))) > 2',
    source: "metrics",
    severity: "critical",
    route: "Payments → PagerDuty",
    since: "11 m",
  },
  {
    state: "firing",
    name: "Crypto miner detected",
    expr: "yara.rule:XMRig_* AND action:detected",
    source: "malware",
    severity: "critical",
    route: "Security → Telegram, PagerDuty",
    since: "9 m",
  },
  {
    state: "pending",
    name: "DB pool waiters",
    expr: "pgbouncer_pools_client_waiting_connections > 20 for 5m",
    source: "metrics",
    severity: "medium",
    route: "Payments → Slack",
    since: "3 m",
  },
  {
    state: "pending",
    name: "Error log rate 5× baseline",
    expr: 'count_over_time({service="orders-api", level="error"}[5m]) > 5 * baseline_7d',
    source: "logs",
    severity: "medium",
    route: "#ops-oncall → Slack",
    since: "2 m",
  },
  {
    state: "silenced",
    name: "edge-fra-02 heartbeat missing",
    expr: 'absent_over_time(up{host="edge-fra-02"}[10m])',
    source: "infrastructure",
    severity: "high",
    route: "#ops-oncall → Slack",
    since: "silenced 2 h",
  },
  {
    state: "silenced",
    name: "Certificate expires < 14 d",
    expr: "x509_cert_not_after - time() < 14 * 86400",
    source: "vpn",
    severity: "low",
    route: "Platform → Email",
    since: "silenced 6 d",
  },
  {
    state: "ok",
    name: "SSH brute force",
    expr: "sigma: proc_creation_lnx_ssh_bruteforce (count > 20 by src_ip in 5m)",
    source: "siem",
    severity: "high",
    route: "Security → Telegram",
    since: "4 d",
  },
  {
    state: "ok",
    name: "Critical CVE on internet-facing host",
    expr: 'cvss >= 9.0 AND asset.exposure = "public" AND epss > 0.2',
    source: "vulnerabilities",
    severity: "critical",
    route: "Security → Email",
    since: "12 d",
  },
  {
    state: "ok",
    name: "Secret pushed to repository",
    expr: 'secret.verified = true AND repo.visibility != "archived"',
    source: "secrets",
    severity: "high",
    route: "Security → Slack",
    since: "21 d",
  },
  {
    state: "ok",
    name: "VPN failed sign-ins",
    expr: "sum by (src_ip) (vpn_auth_failures_total[15m]) >= 5",
    source: "vpn",
    severity: "medium",
    route: "Security → Slack",
    since: "1 d",
  },
  {
    state: "ok",
    name: "Disk will fill in 4 h",
    expr: "predict_linear(node_filesystem_avail_bytes[6h], 4 * 3600) < 0",
    source: "metrics",
    severity: "high",
    route: "#ops-oncall → PagerDuty",
    since: "9 d",
  },
  {
    state: "ok",
    name: "Container restart loop",
    expr: "increase(kube_pod_container_status_restarts_total[15m]) > 5",
    source: "infrastructure",
    severity: "medium",
    route: "#ops-oncall → Slack",
    since: "2 d",
  },
  {
    state: "ok",
    name: "Unexpected outbound to mining pool",
    expr: 'runtime.event = "connect" AND dst.port IN (3333, 4444, 14444)',
    source: "runtime",
    severity: "critical",
    route: "Security → PagerDuty",
    since: "30 d",
  },
];

const fillerSources: ProductId[] = ["metrics", "logs", "infrastructure", "siem", "posture", "dast"];
const rules: Rule[] = [
  ...named,
  ...Array.from({ length: 64 - named.length }, (_, i) => ({
    state: "ok" as const,
    name: [
      `5xx ratio above 1% · ${["billing", "auth", "search", "catalog", "cart"][i % 5]}-svc`,
      `Queue lag > 10k · topic ${["orders", "invoices", "emails", "events"][i % 4]}`,
      `Posture drift · CIS ${["1.1.12", "4.2.1", "5.1.3"][i % 3]}`,
    ][i % 3]!,
    expr: [
      'sum(rate(http_requests_total{code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) > 0.01',
      "kafka_consumergroup_lag > 10000",
      'posture.control.status = "fail"',
    ][i % 3]!,
    source: fillerSources[i % fillerSources.length]!,
    severity: (["medium", "low", "high", "info"] as const)[i % 4]!,
    route: ["#ops-oncall → Slack", "Platform → Email", "Security → Webhook"][i % 3]!,
    since: `${3 + (i % 27)} d`,
  })),
].map((r, i) => ({ ...r, id: `r${i}` }));

const countOf = (s: RuleState) => rules.filter((r) => r.state === s).length;

const columns: Column<Rule>[] = [
  {
    id: "state",
    header: "State",
    width: "104px",
    sortValue: (r) => ["ok", "silenced", "pending", "firing"].indexOf(r.state),
    cell: (r) => <StatusBadge tone={STATE[r.state].tone}>{STATE[r.state].label}</StatusBadge>,
  },
  {
    id: "name",
    header: "Rule",
    width: "42%",
    sortValue: (r) => r.name,
    cell: (r) => (
      <span className="flex min-w-0 flex-col">
        <a href={`#rule/${r.id}`} className="truncate font-medium text-fg no-underline hover:underline">
          {r.name}
        </a>
        <code className="truncate font-mono text-2xs text-fg-muted">{r.expr}</code>
      </span>
    ),
  },
  {
    id: "source",
    header: "Source",
    sortValue: (r) => PRODUCTS[r.source].name,
    cell: (r) => {
      const P = PRODUCTS[r.source];
      return (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <P.icon aria-hidden className="size-3.5 text-fg-muted" />
          {P.name}
        </span>
      );
    },
  },
  {
    id: "severity",
    header: "Severity",
    sortValue: (r) => ["info", "low", "medium", "high", "critical"].indexOf(r.severity),
    cell: (r) => <SeverityBadge severity={r.severity} />,
  },
  { id: "route", header: "Route", cell: (r) => <span className="text-xs text-fg-muted">{r.route}</span> },
  { id: "since", header: "For", align: "right", mono: true, cell: (r) => r.since },
];

const CONTACTS = [
  { id: "slack", name: "Slack", target: "#ops-oncall, #sec-alerts", icon: MessageSquare, tone: "success" as Tone, status: "Delivered", last: "1 m ago" },
  { id: "pd", name: "PagerDuty", target: "Payments · Security", icon: Phone, tone: "success" as Tone, status: "Delivered", last: "9 m ago" },
  { id: "tg", name: "Telegram", target: "SOC bot · 6 members", icon: Send, tone: "success" as Tone, status: "Delivered", last: "9 m ago" },
  { id: "mail", name: "Email", target: "platform@example.com", icon: Mail, tone: "neutral" as Tone, status: "Idle", last: "2 d ago" },
  { id: "hook", name: "Webhook", target: "https://hooks.example.com/oa", icon: Webhook, tone: "danger" as Tone, status: "Failing · 502", last: "3 retries" },
];

/* --------------------------------------------------------------- firing */

interface FiringAlert {
  id: string;
  rule: string;
  severity: Severity;
  source: ProductId;
  labels: Record<string, string>;
  value: string;
  started: string;
  for: string;
  notified: string;
  summary: string;
  assignee?: string;
}

const FIRING: FiringAlert[] = [
  {
    id: "f1",
    rule: "Crypto miner detected",
    severity: "critical",
    source: "malware",
    labels: { host: "api-prod-03", rule: "XMRig_Miner", path: "/tmp/.x/kworkerd" },
    value: "1 match",
    started: "13:51",
    for: "9 m",
    notified: "Telegram, PagerDuty → Ben Ortiz",
    summary: "YARA rule XMRig_Miner matched a running binary on api-prod-03.",
  },
  {
    id: "f2",
    rule: "orders-api p95 above SLO",
    severity: "critical",
    source: "metrics",
    labels: { service: "orders-api", env: "prod" },
    value: "2.41 s",
    started: "13:49",
    for: "11 m",
    notified: "PagerDuty → Sarah Chen",
    summary: "p95 latency above the 2 s SLO; error budget burn 14× over 1 h.",
  },
  {
    id: "f3",
    rule: "Host CPU above 85%",
    severity: "high",
    source: "metrics",
    labels: { host: "api-prod-03", role: "api" },
    value: "97%",
    started: "13:48",
    for: "12 m",
    notified: "Slack #ops-oncall, PagerDuty → Mark Wilson",
    summary: "CPU on api-prod-03 has stayed above 85% for 12 minutes.",
  },
  {
    id: "f4",
    rule: "Host CPU above 85%",
    severity: "high",
    source: "metrics",
    labels: { host: "db-prod-01", role: "db" },
    value: "88%",
    started: "13:53",
    for: "7 m",
    notified: "Slack #ops-oncall",
    summary: "CPU on db-prod-01 has stayed above 85% for 7 minutes.",
  },
];

const TIMELINE: Record<string, Array<{ t: string; text: string }>> = {
  f1: [
    { t: "13:51:04", text: "Pending: first match reported by the malware agent" },
    { t: "13:51:34", text: "Firing: condition held for 30 s" },
    { t: "13:51:35", text: "Paged Ben Ortiz (Security primary) via PagerDuty" },
    { t: "13:51:36", text: "Posted to Telegram SOC bot" },
    { t: "13:52:10", text: "Incident INC-142 linked" },
  ],
  f2: [
    { t: "13:44:20", text: "Pending: p95 2.08 s" },
    { t: "13:49:20", text: "Firing: held for 5 m" },
    { t: "13:49:21", text: "Paged Sarah Chen (Payments primary)" },
  ],
  f3: [
    { t: "13:43:00", text: "Pending: CPU 91%" },
    { t: "13:48:00", text: "Firing: held for 5 m" },
    { t: "13:48:01", text: "Slack #ops-oncall, paged Mark Wilson" },
  ],
  f4: [
    { t: "13:48:30", text: "Pending: CPU 86%" },
    { t: "13:53:30", text: "Firing: held for 5 m" },
    { t: "13:53:31", text: "Slack #ops-oncall" },
  ],
};

function FiringPage() {
  const [active, setActive] = useState("f1");
  const [ack, setAck] = useState<Record<string, string>>({});
  const [silenced, setSilenced] = useState<string[]>([]);
  const [sev, setSev] = useState<string[]>([]);
  const rows = FIRING.filter((f) => !silenced.includes(f.id) && (sev.length === 0 || sev.includes(f.severity)));
  const a = FIRING.find((f) => f.id === active);
  const cols: Column<FiringAlert>[] = [
    {
      id: "severity",
      header: "Severity",
      width: "100px",
      sortValue: (f) => SEVERITY_META_RANK[f.severity],
      cell: (f) => <SeverityBadge severity={f.severity} />,
    },
    {
      id: "rule",
      header: "Alert",
      pinned: "left",
      width: "32%",
      sortValue: (f) => f.rule,
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{f.rule}</span>
          <span className="flex flex-wrap gap-1 pt-0.5">
            {Object.entries(f.labels).map(([k, v]) => (
              <Badge key={k} mono>
                {k}={v}
              </Badge>
            ))}
          </span>
        </span>
      ),
    },
    { id: "value", header: "Value", align: "right", mono: true, cell: (f) => f.value, description: "Value of the expression at the last evaluation." },
    { id: "for", header: "Firing for", align: "right", mono: true, cell: (f) => f.for },
    {
      id: "ack",
      header: "Status",
      cell: (f) => (ack[f.id] ? <StatusBadge tone="info">Acknowledged</StatusBadge> : <StatusBadge tone="danger">Unacknowledged</StatusBadge>),
    },
  ];
  return (
    <>
      <PageHeader
        title="Firing"
        description="Alert instances firing right now, newest first · one rule can fire for many hosts"
        meta={<StatusBadge tone="danger">{rows.length} firing</StatusBadge>}
        actions={<Button icon={<BellOff />}>Silence all</Button>}
      />
      <FilterBar onClear={sev.length ? () => setSev([]) : undefined}>
        <FacetFilter
          label="Severity"
          selected={sev}
          onChange={setSev}
          options={(["critical", "high"] as const).map((s) => ({
            value: s,
            label: <SeverityBadge severity={s} />,
            count: FIRING.filter((f) => f.severity === s).length,
          }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Alert instances" flush>
          <DataTable
            label="Firing alerts"
            columns={cols}
            rows={rows}
            getRowId={(f) => f.id}
            onRowClick={(f) => setActive(f.id)}
            activeRowId={active}
            minWidth={760}
            empty={
              <EmptyState icon={<BellRing />} title="Nothing is firing">
                All rules evaluate OK. Silenced alerts are on the Silences page.
              </EmptyState>
            }
          />
        </Panel>
        {a && !silenced.includes(a.id) && (
          <Panel
            title={a.rule}
            description={`${PRODUCTS[a.source].name} · started ${a.started}`}
            aria-label="Alert detail"
            className="xl:sticky xl:top-3 xl:self-start"
          >
            <div className="flex flex-col gap-3 text-sm">
              <p className="text-fg">{a.summary}</p>
              <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
                <dt className="text-fg-muted">Notified</dt>
                <dd>{a.notified}</dd>
                <dt className="text-fg-muted">Value</dt>
                <dd className="font-mono">{a.value}</dd>
              </dl>
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold">Timeline</h3>
                <ol className="flex flex-col border-l border-line pl-3">
                  {(TIMELINE[a.id] ?? []).map((e) => (
                    <li key={e.t} className="relative py-0.5 text-xs">
                      <span aria-hidden className="absolute top-2 -left-[15px] size-1.5 rounded-full bg-fg-subtle" />
                      <span className="font-mono text-fg-muted">{e.t}</span> {e.text}
                    </li>
                  ))}
                  {ack[a.id] && <li className="py-0.5 text-xs">Acknowledged by {ack[a.id]}</li>}
                </ol>
              </div>
              {ack[a.id] ? (
                <p role="status" className="text-xs text-success">
                  Acknowledged by {ack[a.id]} · escalation stopped
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="primary" disabled={!!ack[a.id]} onClick={() => setAck((x) => ({ ...x, [a.id]: "Emily Clark" }))}>
                  Acknowledge
                </Button>
                <Button size="sm" icon={<BellOff />} onClick={() => setSilenced((s) => [...s, a.id])}>
                  Silence 2 h
                </Button>
                <Button size="sm" variant="ghost">
                  Open runbook
                </Button>
              </div>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

const SEVERITY_META_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

/* ------------------------------------------------------------- silences */

interface Silence {
  id: string;
  matchers: string;
  comment: string;
  createdBy: string;
  starts: string;
  ends: string;
  affected: number;
  state: "active" | "pending" | "expired";
}

const SILENCES: Silence[] = [
  {
    id: "sl1",
    matchers: 'host="edge-fra-02"',
    comment: "Hardware swap in Frankfurt, ticket OPS-2291",
    createdBy: PEOPLE[2],
    starts: "12:00",
    ends: "18:00",
    affected: 3,
    state: "active",
  },
  {
    id: "sl2",
    matchers: 'alertname="Certificate expires < 14 d", source="vpn"',
    comment: "Renewal scheduled for Monday",
    createdBy: PEOPLE[1],
    starts: "Oct 13",
    ends: "Oct 24",
    affected: 1,
    state: "active",
  },
  {
    id: "sl3",
    matchers: 'service="billing-worker", env="staging"',
    comment: "Load test window",
    createdBy: PEOPLE[0],
    starts: "Oct 20 02:00",
    ends: "Oct 20 04:00",
    affected: 0,
    state: "pending",
  },
  {
    id: "sl4",
    matchers: 'host=~"worker-prod-0[4-9]"',
    comment: "Kernel patching",
    createdBy: PEOPLE[6],
    starts: "Oct 16 22:00",
    ends: "Oct 17 01:00",
    affected: 6,
    state: "expired",
  },
  {
    id: "sl5",
    matchers: 'alertname="Disk will fill in 4 h"',
    comment: "Log rotation fix deploying",
    createdBy: PEOPLE[3],
    starts: "Oct 12",
    ends: "Oct 12",
    affected: 2,
    state: "expired",
  },
];

const SIL_TONE = { active: "info", pending: "warning", expired: "neutral" } as const;

function SilencesPage() {
  const [rows, setRows] = useState(SILENCES);
  const [tab, setTab] = useState<"active" | "pending" | "expired">("active");
  const [creating, setCreating] = useState(false);
  const [matchers, setMatchers] = useState("");
  const [notice, setNotice] = useState("");
  const shown = rows.filter((r) => r.state === tab);
  const cols: Column<Silence>[] = [
    {
      id: "matchers",
      header: "Matchers",
      pinned: "left",
      width: "34%",
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <code className="truncate font-mono text-xs">{r.matchers}</code>
          <span className="truncate text-2xs text-fg-muted">{r.comment}</span>
        </span>
      ),
      description: "Alerts whose labels match every matcher are muted. =~ is a regular expression.",
    },
    { id: "state", header: "State", cell: (r) => <StatusBadge tone={SIL_TONE[r.state]}>{r.state[0]!.toUpperCase() + r.state.slice(1)}</StatusBadge> },
    { id: "affected", header: "Muted alerts", align: "right", mono: true, sortValue: (r) => r.affected, cell: (r) => r.affected },
    {
      id: "window",
      header: "Window",
      cell: (r) => (
        <span className="text-xs whitespace-nowrap">
          {r.starts} → {r.ends}
        </span>
      ),
    },
    {
      id: "by",
      header: "Created by",
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={r.createdBy} size="sm" />
          <span className="truncate text-xs">{r.createdBy}</span>
        </span>
      ),
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      hideable: false,
      width: "96px",
      cell: (r) =>
        r.state === "expired" ? (
          <Button size="xs" variant="ghost" onClick={() => setNotice(`Recreated silence for ${r.matchers}`)} aria-label={`Recreate silence ${r.matchers}`}>
            Recreate
          </Button>
        ) : (
          <Button
            size="xs"
            onClick={() => (
              setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, state: "expired", ends: "now" } : x))),
              setNotice(`Expired silence ${r.matchers}`)
            )}
            aria-label={`Expire silence ${r.matchers}`}
          >
            Expire
          </Button>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Silences"
        description="Mute notifications for matching alerts during maintenance. Rules keep evaluating and history is kept."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            New silence
          </Button>
        }
      >
        <Tabs
          label="Silence state"
          value={tab}
          onChange={setTab}
          items={[
            { value: "active", label: "Active", count: rows.filter((r) => r.state === "active").length },
            { value: "pending", label: "Scheduled", count: rows.filter((r) => r.state === "pending").length },
            { value: "expired", label: "Expired", count: rows.filter((r) => r.state === "expired").length },
          ]}
        />
      </PageHeader>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      {creating && (
        <Panel
          title="New silence"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}>
              Cancel
            </Button>
          }
        >
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,2fr)_160px_minmax(0,2fr)_auto] md:items-start"
            onSubmit={(e) => {
              e.preventDefault();
              const m = matchers.trim() || 'host="api-prod-03"';
              setRows((rs) => [
                {
                  id: `sl${rs.length + 1}`,
                  matchers: m,
                  comment: "Created from the Silences page",
                  createdBy: "Emily Clark",
                  starts: "now",
                  ends: "in 2 h",
                  affected: 2,
                  state: "active",
                },
                ...rs,
              ]);
              setNotice(`Silenced ${m} for 2 hours`);
              setCreating(false);
              setTab("active");
              setMatchers("");
            }}
          >
            <TextField
              label="Matchers"
              mono
              value={matchers}
              onChange={(e) => setMatchers(e.target.value)}
              placeholder='host="api-prod-03", alertname="Host CPU above 85%"'
              hint="Preview: matches 2 firing alerts"
            />
            <SelectField
              label="Duration"
              defaultValue="2h"
              options={[
                { value: "1h", label: "1 hour" },
                { value: "2h", label: "2 hours" },
                { value: "8h", label: "8 hours" },
                { value: "1d", label: "1 day" },
              ]}
            />
            <TextField label="Comment" placeholder="Why, and a ticket link" />
            <Button type="submit" variant="primary" className="md:mt-5">
              Create silence
            </Button>
          </form>
        </Panel>
      )}
      <Panel title="Silences" flush>
        <DataTable
          label="Silences"
          columns={cols}
          rows={shown}
          getRowId={(r) => r.id}
          minWidth={860}
          empty={<EmptyState icon={<BellOff />} title="No silences here" />}
        />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- on-call */

const DAYS = ["Mon 20", "Tue 21", "Wed 22", "Thu 23", "Fri 24", "Sat 25", "Sun 26"];
const TEAMS = [
  { id: "platform", name: "Platform", rota: [PEOPLE[2], PEOPLE[2], PEOPLE[6], PEOPLE[6], PEOPLE[6], PEOPLE[0], PEOPLE[0]] as string[] },
  { id: "payments", name: "Payments", rota: [PEOPLE[3], PEOPLE[3], PEOPLE[3], PEOPLE[7], PEOPLE[7], PEOPLE[7], PEOPLE[7]] as string[] },
  { id: "security", name: "Security", rota: [PEOPLE[4], PEOPLE[4], PEOPLE[4], PEOPLE[4], PEOPLE[5], PEOPLE[5], PEOPLE[5]] as string[] },
];

function OnCallPage() {
  const [overrides, setOverrides] = useState<Record<string, string>>({ "payments-4": PEOPLE[1] });
  const [team, setTeam] = useState("platform");
  const [day, setDay] = useState("5");
  const [who, setWho] = useState<string>(PEOPLE[1]);
  const [notice, setNotice] = useState("");
  return (
    <>
      <PageHeader
        title="On-call"
        description="Weekly rotations hand over Monday 09:00 · escalation after 5 minutes to the secondary"
        actions={<Button icon={<CalendarClock />}>Export iCal</Button>}
      />
      <KpiGrid minWidth={200}>
        {TEAMS.map((t) => {
          const now = overrides[`${t.id}-0`] ?? t.rota[0]!;
          return (
            <KpiCard
              key={t.id}
              label={`${t.name} · now`}
              value={<span className="text-lg">{now}</span>}
              footer={
                <span className="flex items-center gap-1.5">
                  <Avatar name={now} size="sm" />
                  <span className="text-xs text-fg-muted">until Mon 09:00</span>
                </span>
              }
            />
          );
        })}
      </KpiGrid>
      <Panel title="This week" description="Overrides are highlighted" flush>
        <div className="relative overflow-x-auto" tabIndex={0} role="region" aria-label="On-call schedule, scrollable">
          <table className="w-full min-w-[820px] table-fixed text-sm">
            <caption className="sr-only">On-call schedule by team and day</caption>
            <thead>
              <tr className="border-b border-line bg-canvas text-left text-2xs tracking-wider text-fg-muted uppercase">
                <th scope="col" className="w-28 px-3 py-1.5 font-medium">
                  Team
                </th>
                {DAYS.map((d) => (
                  <th key={d} scope="col" className="px-2 py-1.5 font-medium">
                    {d}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TEAMS.map((t) => (
                <tr key={t.id} className="border-b border-subtle last:border-0">
                  <th scope="row" className="px-3 py-2 text-left font-medium">
                    {t.name}
                  </th>
                  {t.rota.map((p, i) => {
                    const o = overrides[`${t.id}-${i}`];
                    return (
                      <td key={i} className="p-1" data-testid={`cell-${t.id}-${i}`}>
                        <span
                          className={cn(
                            "flex min-w-0 items-center gap-1.5 rounded-md border px-1.5 py-1",
                            o ? "border-warning bg-warning-soft" : "border-line bg-surface",
                            i === 0 && "ring-1 ring-accent",
                          )}
                        >
                          <Avatar name={o ?? p} size="sm" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-xs font-medium">{o ?? p}</span>
                            {o && <span className="text-2xs text-warning-text">Override</span>}
                          </span>
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Add an override" description="Cover a shift without changing the rotation">
          <form
            className="grid gap-3 md:grid-cols-[repeat(3,minmax(0,1fr))_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              setOverrides((o) => ({ ...o, [`${team}-${day}`]: who }));
              setNotice(`${who} covers ${TEAMS.find((t) => t.id === team)!.name} on ${DAYS[Number(day)]}`);
            }}
          >
            <SelectField label="Team" value={team} onChange={(e) => setTeam(e.target.value)} options={TEAMS.map((t) => ({ value: t.id, label: t.name }))} />
            <SelectField label="Day" value={day} onChange={(e) => setDay(e.target.value)} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} />
            <SelectField label="Person" value={who} onChange={(e) => setWho(e.target.value)} options={PEOPLE.map((p) => ({ value: p, label: p }))} />
            <Button type="submit" variant="primary">
              Add override
            </Button>
          </form>
        </Panel>
        <Panel title="Escalation policy · Platform" flush>
          <ol className="flex flex-col text-sm">
            {[
              { step: "1", text: "Page primary on-call", after: "immediately" },
              { step: "2", text: "Page secondary (Chris Shaw)", after: "after 5 min" },
              { step: "3", text: "Page engineering manager (Emily Clark)", after: "after 15 min" },
            ].map((s) => (
              <li key={s.step} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-subtle font-mono text-2xs">{s.step}</span>
                <span className="grow">{s.text}</span>
                <span className="text-2xs text-fg-muted">{s.after}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------- contact points */

function ContactsPage() {
  const [active, setActive] = useState("slack");
  const [result, setResult] = useState<{ id: string; ok: boolean } | null>(null);
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(CONTACTS.map((c) => [c.id, true])));
  const c = CONTACTS.find((x) => x.id === active)!;
  return (
    <>
      <PageHeader
        title="Contact points"
        description="Where notifications go, and the policy tree that routes alerts to them."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New contact point
          </Button>
        }
      />
      <Callout
        tone="danger"
        title="Webhook is failing"
        action={
          <Button size="sm" onClick={() => setActive("hook")}>
            Inspect
          </Button>
        }
      >
        hooks.example.com returned 502 for the last 3 deliveries; they are retried with backoff for 24 h.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Contact points" flush>
          <ul aria-label="Contact points" className="flex flex-col">
            {CONTACTS.map((x) => (
              <li key={x.id} className="border-b border-subtle last:border-0">
                <button
                  type="button"
                  aria-pressed={active === x.id}
                  onClick={() => (setActive(x.id), setResult(null))}
                  className={cn("flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-canvas", active === x.id && "bg-accent-soft hover:bg-accent-soft")}
                >
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
                    <x.icon aria-hidden className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="text-sm font-medium">{x.name}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{x.target}</span>
                  </span>
                  <StatusBadge tone={x.tone}>{x.status}</StatusBadge>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={c.name} description={c.target} aria-label="Contact point detail">
          <div className="flex flex-col gap-3">
            <Switch
              checked={enabled[c.id] ?? true}
              onCheckedChange={(v) => setEnabled((e) => ({ ...e, [c.id]: v }))}
              label="Send notifications"
              description="Off keeps the contact point but drops its notifications."
            />
            <div className="grid gap-3 md:grid-cols-2">
              <TextField label="Target" mono defaultValue={c.target} key={`t-${c.id}`} />
              <SelectField
                label="Message template"
                defaultValue="default"
                options={[
                  { value: "default", label: "Default · title, labels, runbook" },
                  { value: "short", label: "Short · one line" },
                ]}
                key={`m-${c.id}`}
              />
            </div>
            <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <dt className="text-fg-muted">Last delivery</dt>
              <dd>{c.last}</dd>
              <dt className="text-fg-muted">Sent · 24 h</dt>
              <dd className="font-mono">{{ slack: 28, pd: 7, tg: 4, mail: 0, hook: 3 }[c.id]}</dd>
            </dl>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setResult({ id: c.id, ok: c.id !== "hook" })}>
                Send test notification
              </Button>
              <Button size="sm" variant="ghost">
                Save
              </Button>
            </div>
            {result?.id === c.id &&
              (result.ok ? (
                <Callout tone="success" title={`Test delivered to ${c.name}`} />
              ) : (
                <Callout tone="danger" title={`Test failed: ${c.name} returned 502 Bad Gateway`}>
                  POST https://hooks.example.com/oa · 1.2 s · check the receiver or its TLS certificate.
                </Callout>
              ))}
          </div>
        </Panel>
      </div>
      <Panel title="Notification policy" description="Alerts walk the tree top-down; the first matching branch wins unless it says continue." flush>
        <ul aria-label="Notification policy" className="flex flex-col text-sm">
          {[
            { depth: 0, match: "default", to: "Slack #ops-oncall", group: "alertname, host · wait 30 s · repeat 4 h" },
            { depth: 1, match: 'team="security"', to: "Telegram, PagerDuty Security", group: "repeat 1 h" },
            { depth: 1, match: 'team="payments"', to: "PagerDuty Payments", group: "repeat 2 h" },
            { depth: 2, match: 'severity=~"low|info"', to: "Slack #payments-alerts", group: "business hours only" },
            { depth: 1, match: 'source="vpn"', to: "Email platform@example.com", group: "daily digest" },
          ].map((n) => (
            <li key={n.match} className="flex items-center gap-2 border-b border-subtle py-2 pr-3 last:border-0" style={{ paddingLeft: 12 + n.depth * 20 }}>
              <code className="shrink-0 font-mono text-xs">{n.match}</code>
              <span aria-hidden className="text-fg-muted">
                →
              </span>
              <span className="grow truncate">{n.to}</span>
              <span className="text-2xs text-fg-muted">{n.group}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- history */

interface HistoryEvent {
  id: string;
  time: string;
  rule: string;
  severity: Severity;
  from: RuleState;
  to: RuleState | "resolved";
  duration: string;
  ackBy?: string;
}

const HISTORY: HistoryEvent[] = [
  { id: "h1", time: "Today 13:53", rule: "Host CPU above 85%", severity: "high", from: "pending", to: "firing", duration: "–" },
  { id: "h2", time: "Today 13:51", rule: "Crypto miner detected", severity: "critical", from: "pending", to: "firing", duration: "–", ackBy: PEOPLE[4] },
  { id: "h3", time: "Today 13:49", rule: "orders-api p95 above SLO", severity: "critical", from: "pending", to: "firing", duration: "–" },
  { id: "h4", time: "Today 11:20", rule: "Container restart loop", severity: "medium", from: "firing", to: "resolved", duration: "24 m", ackBy: PEOPLE[2] },
  { id: "h5", time: "Today 09:02", rule: "VPN failed sign-ins", severity: "medium", from: "firing", to: "resolved", duration: "6 m", ackBy: PEOPLE[4] },
  {
    id: "h6",
    time: "Yesterday 22:41",
    rule: "Disk will fill in 4 h",
    severity: "high",
    from: "firing",
    to: "resolved",
    duration: "1 h 12 m",
    ackBy: PEOPLE[6],
  },
  {
    id: "h7",
    time: "Yesterday 18:05",
    rule: "5xx ratio above 1% · billing-svc",
    severity: "medium",
    from: "firing",
    to: "resolved",
    duration: "9 m",
    ackBy: PEOPLE[3],
  },
  { id: "h8", time: "Yesterday 14:30", rule: "edge-fra-02 heartbeat missing", severity: "high", from: "firing", to: "silenced", duration: "–" },
  { id: "h9", time: "Oct 17 03:12", rule: "SSH brute force", severity: "high", from: "firing", to: "resolved", duration: "18 m", ackBy: PEOPLE[4] },
  {
    id: "h10",
    time: "Oct 16 16:44",
    rule: "Queue lag > 10k · topic orders",
    severity: "medium",
    from: "firing",
    to: "resolved",
    duration: "41 m",
    ackBy: PEOPLE[0],
  },
];

const TO_TONE: Record<string, Tone> = { firing: "danger", resolved: "success", silenced: "neutral", pending: "warning", ok: "success" };

function HistoryPage() {
  const [range, setRange] = useState("7d");
  const [to, setTo] = useState<string[]>([]);
  const rows = HISTORY.filter((h) => to.length === 0 || to.includes(h.to));
  const days = ["Oct 13", "Oct 14", "Oct 15", "Oct 16", "Oct 17", "Oct 18", "Oct 19"];
  return (
    <>
      <PageHeader title="History" description="Every state change and notification, kept 400 days" actions={<Button>Export CSV</Button>} />
      <FilterBar onClear={to.length ? () => setTo([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Transition"
          selected={to}
          onChange={setTo}
          options={["firing", "resolved", "silenced"].map((v) => ({ value: v, count: HISTORY.filter((h) => h.to === v).length }))}
        />
      </FilterBar>
      <KpiGrid minWidth={170}>
        <KpiCard label="Alerts · 7 d" value="41" delta={{ label: "-12% vs. last week", direction: "down", intent: "good" }} />
        <KpiCard label="Pages · 7 d" value="7" unit="to a phone" />
        <KpiCard label="MTTA" value="3m 12s" delta={{ label: "target 5 m", intent: "good" }} />
        <KpiCard label="MTTR" value="27m" delta={{ label: "+4 m vs. last week", direction: "up", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Alerts per day" description="By severity">
          <StackedBarChart
            label="Alerts per day by severity"
            categories={days}
            segments={[
              { id: "critical", name: "Critical", color: "var(--oa-critical)" },
              { id: "high", name: "High", color: "var(--oa-danger)" },
              { id: "medium", name: "Medium", color: "var(--oa-warning)" },
            ]}
            values={[
              [0, 1, 3],
              [0, 2, 4],
              [1, 0, 2],
              [0, 1, 5],
              [0, 3, 2],
              [0, 2, 4],
              [2, 2, 3],
            ]}
            height={150}
            xTicks={7}
          />
        </Panel>
        <Panel title="Noisiest rules · 7 d">
          <BarList
            label="Rules that fired most often"
            items={[
              { id: "a", label: "Host CPU above 85%", value: 9 },
              { id: "b", label: "Container restart loop", value: 7 },
              { id: "c", label: "5xx ratio above 1%", value: 5 },
              { id: "d", label: "Queue lag > 10k", value: 4 },
            ]}
          />
        </Panel>
      </div>
      <Panel title="State changes" flush>
        <DataTable
          label="Alert history"
          rows={rows}
          getRowId={(h) => h.id}
          minWidth={820}
          columns={[
            { id: "time", header: "Time", width: "140px", cell: (h) => <span className="text-xs whitespace-nowrap">{h.time}</span> },
            { id: "rule", header: "Rule", pinned: "left", cell: (h) => <span className="font-medium">{h.rule}</span> },
            { id: "severity", header: "Severity", cell: (h) => <SeverityBadge severity={h.severity} /> },
            {
              id: "change",
              header: "Change",
              cell: (h) => (
                <span className="flex items-center gap-1">
                  <StatusBadge tone={TO_TONE[h.from] ?? "neutral"}>{STATE[h.from].label}</StatusBadge>
                  <span aria-hidden>→</span>
                  <StatusBadge tone={TO_TONE[h.to] ?? "neutral"}>{h.to[0]!.toUpperCase() + h.to.slice(1)}</StatusBadge>
                </span>
              ),
            },
            { id: "duration", header: "Duration", align: "right", mono: true, cell: (h) => h.duration, description: "Time from firing to resolved." },
            {
              id: "ack",
              header: "Acknowledged by",
              cell: (h) =>
                h.ackBy ? (
                  <span className="flex items-center gap-1.5">
                    <Avatar name={h.ackBy} size="sm" />
                    <span className="text-xs">{h.ackBy}</span>
                  </span>
                ) : (
                  <span className="text-xs text-fg-muted">–</span>
                ),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/* ----------------------------------------------------------------- rules */

type TabValue = "all" | RuleState;

function RulesPage() {
  const [tab, setTab] = useState<TabValue>("all");
  const [sev, setSev] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const shown = rules.filter(
    (r) => (tab === "all" || r.state === tab) && (sev.length === 0 || sev.includes(r.severity)) && r.name.toLowerCase().includes(q.trim().toLowerCase()),
  );
  return (
    <>
      <PageHeader
        title="Rules"
        description="64 rules from 9 products · evaluated every 30 s"
        actions={
          <>
            <SearchInput label="Search rules" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button variant="primary" icon={<Plus />}>
              New rule
            </Button>
          </>
        }
      />
      <KpiGrid minWidth={160}>
        <KpiCard
          label="Firing"
          value={countOf("firing")}
          tone="danger"
          trend={wave(24, { base: 0.4, amp: 0.4, seed: 61, spike: 3, spikeAt: 20, spikeLen: 2 })}
          trendColor="var(--oa-danger)"
          footer={<StatusBadge tone="danger">2 critical</StatusBadge>}
        />
        <KpiCard label="Pending" value={countOf("pending")} tone="warning" footer={<StatusBadge tone="warning">fires in &lt; 5 m</StatusBadge>} />
        <KpiCard label="OK" value={countOf("ok")} footer={<StatusBadge tone="success">Healthy</StatusBadge>} />
        <KpiCard label="Silenced" value={countOf("silenced")} footer={<StatusBadge tone="neutral">until 18:00</StatusBadge>} />
        <KpiCard label="Notifications · 24 h" value="41" unit="7 pages" delta={{ label: "MTTA 3 m 12 s", intent: "good" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush>
          <div className="flex flex-col gap-2 px-3 pt-2">
            <Tabs<TabValue>
              label="Rule state"
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "All", count: rules.length },
                { value: "firing", label: "Firing", count: countOf("firing") },
                { value: "pending", label: "Pending", count: countOf("pending") },
                { value: "ok", label: "OK", count: countOf("ok") },
                { value: "silenced", label: "Silenced", count: countOf("silenced") },
              ]}
            />
            <FilterBar onClear={sev.length ? () => setSev([]) : undefined} className="pb-2">
              <FacetFilter
                label="Severity"
                selected={sev}
                onChange={setSev}
                options={(["critical", "high", "medium", "low", "info"] as const).map((s) => ({
                  value: s,
                  label: <SeverityBadge severity={s} />,
                  count: rules.filter((r) => r.severity === s).length,
                }))}
              />
              <Badge>{shown.length} rules</Badge>
            </FilterBar>
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Alert rules"
              columns={columns}
              rows={shown}
              getRowId={(r) => r.id}
              defaultSort={{ id: "state", direction: "desc" }}
              pageSize={12}
              minWidth={900}
            />
          </div>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel
            title="On-call now"
            actions={
              <Button size="xs" variant="ghost">
                Schedule
              </Button>
            }
          >
            <ul className="flex flex-col gap-2">
              {[
                { who: PEOPLE[2], team: "Platform · primary", until: "until Mon 09:00" },
                { who: PEOPLE[3], team: "Payments · primary", until: "until 18:00" },
                { who: PEOPLE[4], team: "Security · primary", until: "until Tue 09:00" },
                { who: PEOPLE[6], team: "Platform · secondary", until: "until Mon 09:00" },
              ].map((p) => (
                <li key={p.team} className="flex items-center gap-2">
                  <Avatar name={p.who} size="sm" />
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate text-sm font-medium">{p.who}</span>
                    <span className="truncate text-2xs text-fg-muted">{p.team}</span>
                  </span>
                  <span className="text-2xs whitespace-nowrap text-fg-muted">{p.until}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Contact points" flush>
            <ul aria-label="Contact points" className="flex flex-col">
              {CONTACTS.map((c) => (
                <li key={c.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                  <span className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
                    <c.icon aria-hidden className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="text-sm font-medium">{c.name}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{c.target}</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    <StatusBadge tone={c.tone}>{c.status}</StatusBadge>
                    <span className="text-2xs text-fg-muted">{c.last}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- app */

const PAGES = {
  rules: () => <RulesPage />,
  firing: () => <FiringPage />,
  silences: () => <SilencesPage />,
  oncall: () => <OnCallPage />,
  contacts: () => <ContactsPage />,
  history: () => <HistoryPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="alerts" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

/** Rules: state KPIs, tabs that filter the rule list, on-call and contact points. */
export const Rules: Story = {
  ...app("rules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Alert rules" });
    // Firing rules sort to the top.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Firing");

    await userEvent.click(c.getByRole("tab", { name: /Firing/ }));
    await expect(c.getByRole("tab", { name: /Firing/ })).toHaveAttribute("aria-selected", "true");
    const firing = within(table).getAllByRole("row").slice(1);
    await expect(firing).toHaveLength(3);
    for (const row of firing) await expect(row).toHaveTextContent("Firing");
    await expect(table).toHaveTextContent("Crypto miner detected");

    // Arrow keys move between tabs.
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("tab", { name: /Pending/ })).toHaveAttribute("aria-selected", "true");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);

    await userEvent.click(c.getByRole("tab", { name: /Silenced/ }));
    await expect(table).toHaveTextContent("edge-fra-02 heartbeat missing");

    await expect(c.getByRole("list", { name: "Contact points" })).toHaveTextContent("Failing · 502");
  },
};

export const Firing: Story = {
  ...app("firing"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Alert detail" });
    await expect(detail).toHaveTextContent("Crypto miner detected");
    await userEvent.click(within(detail).getByRole("button", { name: "Acknowledge" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("Acknowledged by Emily Clark");
    await userEvent.click(within(c.getByRole("table", { name: "Firing alerts" })).getByText("88%"));
    await expect(c.getByRole("region", { name: "Alert detail" })).toHaveTextContent("db-prod-01");
    await userEvent.click(c.getByRole("button", { name: "Silence 2 h" }));
    await expect(within(c.getByRole("table", { name: "Firing alerts" })).getAllByRole("row")).toHaveLength(4);
  },
};

export const Silences: Story = {
  ...app("silences"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: 'Expire silence host="edge-fra-02"' }));
    await expect(c.getByText('Expired silence host="edge-fra-02"')).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "New silence" }));
    await userEvent.type(c.getByRole("textbox", { name: "Matchers" }), 'service="orders-api"');
    await userEvent.click(c.getByRole("button", { name: "Create silence" }));
    await expect(c.getByRole("table", { name: "Silences" })).toHaveTextContent('service="orders-api"');
    await userEvent.click(c.getByRole("tab", { name: /Expired/ }));
    await expect(c.getByRole("table", { name: "Silences" })).toHaveTextContent('host="edge-fra-02"');
  },
};

export const OnCall: Story = {
  name: "On-call",
  ...app("oncall"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByTestId("cell-payments-4")).toHaveTextContent("Override");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Team" }), "security");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Day" }), "6");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Person" }), "Zoe Adams");
    await userEvent.click(c.getByRole("button", { name: "Add override" }));
    await expect(c.getByTestId("cell-security-6")).toHaveTextContent("Zoe Adams");
    await expect(c.getByText("Zoe Adams covers Security on Sun 26")).toBeInTheDocument();
  },
};

export const ContactPoints: Story = {
  name: "Contact points",
  ...app("contacts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Contact point detail" });
    await userEvent.click(within(detail).getByRole("button", { name: "Send test notification" }));
    await expect(c.getByText("Test delivered to Slack")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("list", { name: "Contact points" })).getByRole("button", { name: /Webhook/ }));
    await userEvent.click(within(detail).getByRole("button", { name: "Send test notification" }));
    await expect(c.getByText("Test failed: Webhook returned 502 Bad Gateway")).toBeInTheDocument();
  },
};

export const AlertHistory: Story = {
  name: "History",
  ...app("history"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getByRole("button", { name: /^Transition/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /resolved/ }));
    await userEvent.keyboard("{Escape}");
    const rows = within(c.getByRole("table", { name: "Alert history" }))
      .getAllByRole("row")
      .slice(1);
    await expect(rows).toHaveLength(6);
    for (const r of rows) await expect(r).toHaveTextContent("Resolved");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
