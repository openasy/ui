import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Check, Database, Download, FileClock, Inbox, MonitorPlay, Plus, ScrollText, ShieldCheck, Square, TerminalSquare, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { Tabs } from "../../components/Tabs";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, emailOf, timeLabels, wave } from "../mocks";

const nav = [
  { id: "requests", label: "Requests", icon: Inbox, count: 3 },
  { id: "sessions", label: "Sessions", icon: TerminalSquare, count: 5 },
  { id: "resources", label: "Resources", icon: Database, count: 48 },
  { id: "recordings", label: "Recordings", icon: MonitorPlay },
  { id: "policies", label: "Policies", icon: ShieldCheck },
  { id: "audit", label: "Audit", icon: ScrollText },
];

const meta = {
  title: "Products/Access",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type RequestStatus = "pending" | "approved" | "denied";
const REQ_STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  denied: { label: "Denied", tone: "danger" },
};

interface AccessRequest {
  id: string;
  person: string;
  resource: string;
  kind: string;
  role: string;
  duration: string;
  reason: string;
  ticket: string;
  requested: string;
}

const requests: AccessRequest[] = [
  {
    id: "r1",
    person: "Mark Wilson",
    resource: "db-prod-01",
    kind: "Postgres",
    role: "read-only",
    duration: "1 h",
    reason: "Investigate duplicate orders reported in INC-2291; need to query orders and payments tables.",
    ticket: "INC-2291",
    requested: "4 min ago",
  },
  {
    id: "r2",
    person: "Sarah Chen",
    resource: "api-prod-05",
    kind: "SSH",
    role: "sudo",
    duration: "30 min",
    reason: "Rotate TLS certificate on the nginx sidecar before Friday's expiry.",
    ticket: "OPS-1874",
    requested: "11 min ago",
  },
  {
    id: "r3",
    person: "Chris Shaw",
    resource: "win-bastion-02",
    kind: "RDP",
    role: "operator",
    duration: "2 h",
    reason: "Vendor support session for the legacy accounting client upgrade.",
    ticket: "CHG-0412",
    requested: "26 min ago",
  },
];

interface Session {
  id: string;
  protocol: "SSH" | "RDP" | "Postgres";
  person: string;
  resource: string;
  role: string;
  started: string;
  remaining: string;
}

const sessionsData: Session[] = [
  { id: "s1", protocol: "SSH", person: "Dana Kim", resource: "api-prod-03", role: "sudo", started: "13:12", remaining: "18 min" },
  { id: "s2", protocol: "Postgres", person: "Emily Clark", resource: "db-prod-02", role: "read-only", started: "13:31", remaining: "42 min" },
  { id: "s3", protocol: "RDP", person: "Amy Davis", resource: "win-bastion-01", role: "operator", started: "12:58", remaining: "1 h 04 min" },
  { id: "s4", protocol: "SSH", person: "Ben Ortiz", resource: "worker-prod-09", role: "read-only", started: "13:47", remaining: "13 min" },
  { id: "s5", protocol: "Postgres", person: "Zoe Adams", resource: "db-analytics-01", role: "analyst", started: "13:05", remaining: "25 min" },
];

function Person({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-2xs text-fg-muted">{emailOf(name)}</span>
      </span>
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Requests                                                            */
/* ------------------------------------------------------------------ */

/** JIT access: approve or deny pending requests and watch or terminate live sessions. */
function RequestsPage() {
  const [status, setStatus] = useState<Record<string, RequestStatus>>({});
  const [sessions, setSessions] = useState(sessionsData);
  const pending = requests.filter((r) => (status[r.id] ?? "pending") === "pending").length;
  const decide = (id: string, s: RequestStatus) => setStatus((prev) => ({ ...prev, [id]: s }));

  const sessionColumns: Column<Session>[] = [
    { id: "proto", header: "Protocol", width: "96px", sortValue: (s) => s.protocol, cell: (s) => <Badge mono>{s.protocol}</Badge> },
    { id: "person", header: "Person", width: "24%", sortValue: (s) => s.person, cell: (s) => <Person name={s.person} /> },
    { id: "res", header: "Resource", cell: (s) => <EntityChip kind="host" value={s.resource} hideKind /> },
    { id: "role", header: "Role", mono: true, cell: (s) => s.role },
    { id: "started", header: "Started", mono: true, sortValue: (s) => s.started, cell: (s) => s.started },
    { id: "left", header: "Remaining", align: "right", cell: (s) => <span className="whitespace-nowrap">{s.remaining}</span> },
    { id: "rec", header: "Recording", cell: () => <StatusBadge tone="danger">Recording</StatusBadge> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      width: "44px",
      align: "right",
      cell: (s) => (
        <IconButton label={`Terminate session for ${s.person} on ${s.resource}`} size="xs" onClick={() => setSessions((all) => all.filter((x) => x.id !== s.id))}>
          <Square />
        </IconButton>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Requests"
        description="Just-in-time access to 48 resources · every session is recorded"
        meta={<StatusBadge tone={pending ? "warning" : "success"}>{pending ? `${pending} pending` : "All reviewed"}</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search people or resources" className="w-60" />
            <Button size="md" variant="primary" icon={<Plus />}>
              Request access
            </Button>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Pending requests" value={pending} unit="awaiting you" tone={pending ? "warning" : undefined} />
        <KpiCard label="Active sessions" value={sessions.length} unit="now" delta={{ label: "2 SSH · 2 Postgres · 1 RDP" }} />
        <KpiCard label="Median approval" value="3.2" unit="min" delta={{ label: "-40 s vs. last week", direction: "down", intent: "good" }} />
        <KpiCard label="Standing admin" value="0" unit="accounts" tone="success" delta={{ label: "All privileged access is JIT", intent: "good" }} />
      </KpiGrid>
      <Panel title="Pending requests" description="Approver: Platform on-call" flush>
        <ul aria-label="Access requests" className="flex flex-col">
          {requests.map((r) => {
            const s = status[r.id] ?? "pending";
            return (
              <li key={r.id} className="grid grid-cols-1 gap-2 border-b border-subtle px-3 py-2.5 last:border-0 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <Person name={r.person} />
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="flex flex-wrap items-center gap-1.5 text-sm">
                    <EntityChip kind="host" value={r.resource} hideKind />
                    <Badge mono>{r.kind}</Badge>
                    <span className="text-fg-muted">as</span>
                    <Badge mono>{r.role}</Badge>
                    <span className="text-fg-muted">for</span>
                    <span className="font-medium">{r.duration}</span>
                    <span className="text-2xs text-fg-muted">· {r.requested}</span>
                  </span>
                  <span className="text-sm text-fg-muted">
                    <span className="font-mono text-xs text-fg">{r.ticket}</span> {r.reason}
                  </span>
                </div>
                <div className="flex items-center justify-end gap-1.5">
                  {s === "pending" ? (
                    <>
                      <Button size="sm" variant="primary" icon={<Check />} aria-label={`Approve ${r.person}`} onClick={() => decide(r.id, "approved")}>
                        Approve
                      </Button>
                      <Button size="sm" icon={<X />} aria-label={`Deny ${r.person}`} onClick={() => decide(r.id, "denied")}>
                        Deny
                      </Button>
                    </>
                  ) : (
                    <StatusBadge tone={REQ_STATUS[s].tone} data-testid={`status-${r.id}`}>
                      {REQ_STATUS[s].label}
                    </StatusBadge>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
      <Callout tone="info" title="Sessions end automatically when the grant expires">
        Recordings are kept for 365 days and are searchable by command in Recordings.
      </Callout>
      <Panel title="Active sessions" actions={<Button size="sm" variant="ghost" icon={<FileClock />}>History</Button>} flush>
        <DataTable
          label="Active sessions"
          columns={sessionColumns}
          rows={sessions}
          getRowId={(s) => s.id}
          defaultSort={{ id: "started", direction: "desc" }}
          minWidth={900}
          empty={<p className="py-8">No active sessions</p>}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sessions                                                            */
/* ------------------------------------------------------------------ */

const LIVE: Record<string, string[]> = {
  s1: ["$ sudo systemctl status nginx", "● nginx.service - A high performance web server", "     Active: active (running) since Mon 2026-10-19 08:02:11 UTC", "$ sudo tail -n 3 /var/log/nginx/error.log", "2026/10/19 13:10:44 [warn] 812#812: *4411 upstream response is buffered", "$ sudo nginx -t", "nginx: configuration file /etc/nginx/nginx.conf test is successful"],
  s2: ["orders=> SELECT count(*) FROM orders WHERE created_at > now() - interval '1 day';", " count ", "-------", " 18422", "orders=> SELECT id, total FROM orders WHERE customer_id = 88213 ORDER BY id DESC LIMIT 3;", "   id    | total ", " 1928412 | 49.90", " 1928407 | 49.90"],
  s3: ["[RDP] Window focus: Accounting Client 9.4 — Setup", "[RDP] Clipboard: blocked by policy (outbound)", "[RDP] Window focus: Services (Local)", "[RDP] Process started: msiexec.exe /i AcctClient-9.5.msi"],
  s4: ["$ ls /var/log/reports/", "run-2026-10-19.log  run-2026-10-18.log", "$ grep -c ERROR /var/log/reports/run-2026-10-19.log", "3"],
  s5: ["analytics=> \\dt mart.*", " mart | daily_revenue | table", " mart | churn_cohorts | table", "analytics=> SELECT * FROM mart.daily_revenue ORDER BY day DESC LIMIT 2;"],
};

function SessionsPage() {
  const [sessions, setSessions] = useState(sessionsData);
  const [active, setActive] = useState("s1");
  const [ended, setEnded] = useState<string | null>(null);
  const cur = sessions.find((s) => s.id === active);
  const cols: Column<Session>[] = [
    { id: "person", header: "Person", width: "30%", cell: (s) => <Person name={s.person} /> },
    { id: "proto", header: "Protocol", cell: (s) => <Badge mono>{s.protocol}</Badge> },
    { id: "res", header: "Resource", cell: (s) => <EntityChip kind="host" value={s.resource} hideKind /> },
    { id: "left", header: "Remaining", align: "right", cell: (s) => s.remaining },
  ];
  const labels = timeLabels(24, 60);
  return (
    <>
      <PageHeader title="Sessions" description="Live sessions through the access proxy. Watch any session as it happens, or end it." />
      <KpiGrid>
        <KpiCard label="Live now" value={`${sessions.length}`} unit="sessions" />
        <KpiCard label="Sessions · 24 h" value="62" delta={{ label: "Peak 9 at 10:00" }} />
        <KpiCard label="Median length" value="24" unit="min" />
        <KpiCard label="Ended by admin · 7 d" value="2" tone="warning" />
      </KpiGrid>
      <Panel title="Concurrent sessions" description="By protocol, last 24 h">
        <TimeSeriesChart
          label="Concurrent sessions by protocol"
          labels={labels}
          stacked
          area
          height={140}
          xTicks={7}
          series={[
            { id: "ssh", name: "SSH", data: wave(24, { base: 3, amp: 2, seed: 21 }).map(Math.round) },
            { id: "pg", name: "Postgres", data: wave(24, { base: 2, amp: 1.5, seed: 22 }).map(Math.round) },
            { id: "rdp", name: "RDP", data: wave(24, { base: 1, amp: 1, seed: 23 }).map(Math.round) },
          ]}
        />
      </Panel>
      {ended && (
        <p role="status" className="text-sm text-success">
          {ended}
        </p>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Live sessions" flush>
          <DataTable label="Live sessions" columns={cols} rows={sessions} getRowId={(s) => s.id} onRowClick={(s) => setActive(s.id)} activeRowId={active} minWidth={560} empty={<p className="py-8">No live sessions</p>} />
        </Panel>
        <Panel
          title="Watching"
          description={cur ? `${cur.person} · ${cur.resource} as ${cur.role}` : "No session selected"}
          aria-label="Session viewer"
          actions={
            cur && (
              <Button
                size="sm"
                variant="danger"
                onClick={() => {
                  setSessions((all) => all.filter((x) => x.id !== cur.id));
                  setEnded(`Ended ${cur.person}'s session on ${cur.resource}; the grant was revoked`);
                  setActive(sessions.find((x) => x.id !== cur.id)?.id ?? "");
                }}
              >
                End session
              </Button>
            )
          }
        >
          {cur ? (
            <pre tabIndex={0} aria-label={`Live output for ${cur.person}`} className="max-h-72 overflow-auto rounded border border-line bg-subtle p-2 font-mono text-xs whitespace-pre-wrap">
              {(LIVE[cur.id] ?? []).join("\n")}
            </pre>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">Select a session</p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Resources                                                           */
/* ------------------------------------------------------------------ */

interface Resource {
  id: string;
  name: string;
  kind: "SSH" | "RDP" | "Postgres" | "MySQL" | "Kubernetes" | "Web";
  env: "production" | "staging" | "corp";
  roles: string[];
  approval: "Auto" | "1 approver" | "2 approvers";
  maxGrant: string;
  owner: string;
  sessions7d: number;
  health: "reachable" | "unreachable";
}

const RESOURCES: Resource[] = [
  { id: "x1", name: "db-prod-01", kind: "Postgres", env: "production", roles: ["read-only", "writer"], approval: "1 approver", maxGrant: "4 h", owner: PEOPLE[2], sessions7d: 31, health: "reachable" },
  { id: "x2", name: "db-prod-02", kind: "Postgres", env: "production", roles: ["read-only"], approval: "1 approver", maxGrant: "4 h", owner: PEOPLE[2], sessions7d: 18, health: "reachable" },
  { id: "x3", name: "db-analytics-01", kind: "Postgres", env: "production", roles: ["analyst"], approval: "Auto", maxGrant: "8 h", owner: PEOPLE[7], sessions7d: 44, health: "reachable" },
  { id: "x4", name: "api-prod-03", kind: "SSH", env: "production", roles: ["read-only", "sudo"], approval: "1 approver", maxGrant: "2 h", owner: PEOPLE[0], sessions7d: 12, health: "reachable" },
  { id: "x5", name: "api-prod-05", kind: "SSH", env: "production", roles: ["read-only", "sudo"], approval: "2 approvers", maxGrant: "1 h", owner: PEOPLE[0], sessions7d: 6, health: "reachable" },
  { id: "x6", name: "worker-prod-09", kind: "SSH", env: "production", roles: ["read-only"], approval: "Auto", maxGrant: "2 h", owner: PEOPLE[4], sessions7d: 9, health: "reachable" },
  { id: "x7", name: "win-bastion-01", kind: "RDP", env: "corp", roles: ["operator"], approval: "1 approver", maxGrant: "4 h", owner: PEOPLE[6], sessions7d: 5, health: "reachable" },
  { id: "x8", name: "win-bastion-02", kind: "RDP", env: "corp", roles: ["operator"], approval: "1 approver", maxGrant: "4 h", owner: PEOPLE[6], sessions7d: 2, health: "unreachable" },
  { id: "x9", name: "k8s-prod-eu", kind: "Kubernetes", env: "production", roles: ["view", "edit", "cluster-admin"], approval: "2 approvers", maxGrant: "1 h", owner: PEOPLE[1], sessions7d: 27, health: "reachable" },
  { id: "x10", name: "k8s-staging", kind: "Kubernetes", env: "staging", roles: ["view", "edit"], approval: "Auto", maxGrant: "8 h", owner: PEOPLE[1], sessions7d: 71, health: "reachable" },
  { id: "x11", name: "grafana.example.com", kind: "Web", env: "corp", roles: ["viewer", "editor"], approval: "Auto", maxGrant: "12 h", owner: PEOPLE[3], sessions7d: 120, health: "reachable" },
  { id: "x12", name: "mysql-legacy-01", kind: "MySQL", env: "production", roles: ["read-only"], approval: "2 approvers", maxGrant: "1 h", owner: PEOPLE[5], sessions7d: 1, health: "reachable" },
];

function ResourcesPage() {
  const [kind, setKind] = useState<string[]>([]);
  const [env, setEnv] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const rows = RESOURCES.filter((r) => (kind.length === 0 || kind.includes(r.kind)) && (env.length === 0 || env.includes(r.env)) && r.name.includes(query.toLowerCase()));
  const cols: Column<Resource>[] = [
    { id: "name", header: "Resource", pinned: "left", width: "22%", sortValue: (r) => r.name, cell: (r) => <EntityChip kind={r.kind === "Web" ? "url" : "host"} value={r.name} hideKind /> },
    { id: "kind", header: "Type", sortValue: (r) => r.kind, cell: (r) => <Badge mono>{r.kind}</Badge> },
    { id: "env", header: "Environment", cell: (r) => <Badge tone={r.env === "production" ? "danger" : r.env === "staging" ? "info" : "neutral"}>{r.env}</Badge> },
    { id: "roles", header: "Roles", cell: (r) => <span className="font-mono text-xs">{r.roles.join(", ")}</span> },
    { id: "approval", header: "Approval", description: "Who must approve a request before the grant starts.", cell: (r) => <span className="text-xs">{r.approval}</span> },
    { id: "max", header: "Max grant", mono: true, cell: (r) => r.maxGrant },
    { id: "owner", header: "Owner", cell: (r) => <span className="text-xs">{r.owner}</span> },
    { id: "sessions", header: "Sessions · 7 d", align: "right", mono: true, sortValue: (r) => r.sessions7d, cell: (r) => r.sessions7d },
    { id: "health", header: "Proxy", cell: (r) => <StatusBadge tone={r.health === "reachable" ? "success" : "danger"}>{r.health}</StatusBadge> },
  ];
  const kinds = ["SSH", "RDP", "Postgres", "MySQL", "Kubernetes", "Web"];
  return (
    <>
      <PageHeader title="Resources" description="48 resources reachable through the access proxy. Nobody holds standing credentials to any of them." actions={<Button variant="primary" icon={<Plus />}>Add resource</Button>} />
      <KpiGrid>
        <KpiCard label="Resources" value="48" unit="12 shown" />
        <KpiCard label="Production" value="29" delta={{ label: "All need an approver" }} />
        <KpiCard label="Unreachable" value="1" tone="danger" delta={{ label: "win-bastion-02", intent: "bad" }} />
        <KpiCard label="Unused · 30 d" value="7" tone="warning" delta={{ label: "Candidates for removal" }} />
      </KpiGrid>
      <FilterBar onClear={kind.length || env.length || query ? () => (setKind([]), setEnv([]), setQuery("")) : undefined}>
        <SearchInput label="Search resources" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <FacetFilter label="Type" selected={kind} onChange={setKind} options={kinds.map((k) => ({ value: k, count: RESOURCES.filter((r) => r.kind === k).length }))} />
        <FacetFilter label="Environment" selected={env} onChange={setEnv} options={["production", "staging", "corp"].map((e) => ({ value: e, count: RESOURCES.filter((r) => r.env === e).length }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Resources" description={`${rows.length} shown`} flush>
          <DataTable label="Resources" columns={cols} rows={rows} getRowId={(r) => r.id} defaultSort={{ id: "sessions", direction: "desc" }} minWidth={1080} empty={<p className="py-8">No resources match</p>} />
        </Panel>
        <Panel title="Most used" description="Sessions, 7 days">
          <BarList label="Most used resources" items={[...RESOURCES].sort((a, b) => b.sessions7d - a.sessions7d).slice(0, 6).map((r) => ({ id: r.id, label: r.name, value: r.sessions7d }))} />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Recordings                                                          */
/* ------------------------------------------------------------------ */

interface Recording {
  id: string;
  person: string;
  resource: string;
  protocol: Session["protocol"];
  date: string;
  length: string;
  ticket: string;
  flagged?: string;
  lines: Array<{ t: string; text: string; risky?: boolean }>;
}

const RECORDINGS: Recording[] = [
  {
    id: "rec1",
    person: "Dana Kim",
    resource: "api-prod-03",
    protocol: "SSH",
    date: "Oct 18 · 22:14",
    length: "21 min",
    ticket: "INC-2287",
    flagged: "Ran a command matching a risky pattern",
    lines: [
      { t: "00:00", text: "$ sudo -i" },
      { t: "00:12", text: "# journalctl -u payments --since -1h | tail -n 50" },
      { t: "04:31", text: "# systemctl restart payments" },
      { t: "09:02", text: "# rm -rf /var/cache/payments/*", risky: true },
      { t: "14:47", text: "# curl -s localhost:8080/healthz" },
      { t: "20:58", text: "# exit" },
    ],
  },
  {
    id: "rec2",
    person: "Mark Wilson",
    resource: "db-prod-01",
    protocol: "Postgres",
    date: "Oct 18 · 15:40",
    length: "48 min",
    ticket: "INC-2281",
    lines: [
      { t: "00:00", text: "orders=> BEGIN;" },
      { t: "02:15", text: "orders=> UPDATE orders SET status = 'refunded' WHERE id = 1927731;" },
      { t: "02:16", text: "UPDATE 1" },
      { t: "02:40", text: "orders=> COMMIT;" },
      { t: "47:59", text: "orders=> \\q" },
    ],
  },
  {
    id: "rec3",
    person: "Chris Shaw",
    resource: "win-bastion-01",
    protocol: "RDP",
    date: "Oct 17 · 10:05",
    length: "1 h 52 min",
    ticket: "CHG-0409",
    lines: [
      { t: "00:00", text: "Window focus: Server Manager" },
      { t: "12:40", text: "Process started: powershell.exe" },
      { t: "13:02", text: "Clipboard paste blocked (outbound)", risky: true },
      { t: "1:51:30", text: "Signed out" },
    ],
  },
  {
    id: "rec4",
    person: "Ben Ortiz",
    resource: "k8s-prod-eu",
    protocol: "SSH",
    date: "Oct 16 · 09:12",
    length: "9 min",
    ticket: "OPS-1861",
    lines: [
      { t: "00:00", text: "$ kubectl -n orders get pods" },
      { t: "01:20", text: "$ kubectl -n orders rollout restart deploy/orders-api" },
      { t: "08:55", text: "$ kubectl -n orders rollout status deploy/orders-api" },
    ],
  },
];

function RecordingsPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("rec1");
  const rows = RECORDINGS.filter((r) => !query || r.lines.some((l) => l.text.toLowerCase().includes(query.toLowerCase())));
  const cur = RECORDINGS.find((r) => r.id === active);
  const cols: Column<Recording>[] = [
    { id: "person", header: "Person", width: "26%", cell: (r) => <Person name={r.person} /> },
    { id: "res", header: "Resource", cell: (r) => <EntityChip kind="host" value={r.resource} hideKind /> },
    { id: "date", header: "Started", mono: true, cell: (r) => r.date },
    { id: "len", header: "Length", align: "right", cell: (r) => r.length },
    { id: "flag", header: "Review", cell: (r) => (r.flagged ? <Badge tone="warning">Flagged</Badge> : <Badge>OK</Badge>) },
  ];
  return (
    <>
      <PageHeader title="Recordings" description="Every SSH, database and RDP session, kept for 365 days. Search finds the exact moment a command ran." />
      <FilterBar onClear={query ? () => setQuery("") : undefined}>
        <SearchInput label="Search commands in recordings" value={query} onChange={(e) => setQuery(e.target.value)} className="w-80" />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Recordings" description={`${rows.length} recordings`} flush>
          <DataTable label="Recordings" columns={cols} rows={rows} getRowId={(r) => r.id} onRowClick={(r) => setActive(r.id)} activeRowId={active} minWidth={620} empty={<p className="py-8">No recording contains that command</p>} />
        </Panel>
        <Panel
          title="Transcript"
          description={cur ? `${cur.person} · ${cur.resource} · ${cur.ticket}` : "No recording selected"}
          aria-label="Transcript"
          actions={cur && <Button size="sm" variant="ghost" icon={<Download />}>Export</Button>}
        >
          {cur && (
            <div className="flex flex-col gap-2">
              {cur.flagged && <Callout tone="warning" title={cur.flagged} />}
              <ol aria-label={`Transcript of ${cur.person} on ${cur.resource}`} className="flex flex-col font-mono text-xs">
                {cur.lines.map((l) => (
                  <li key={l.t + l.text} className={l.risky ? "flex gap-2 rounded bg-warning-soft px-1.5 py-1 text-warning-text" : "flex gap-2 px-1.5 py-1"}>
                    <span className="w-14 shrink-0 text-fg-muted">{l.t}</span>
                    <span className="min-w-0 break-all">{l.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

interface AccessPolicy {
  id: string;
  name: string;
  who: string;
  what: string;
  approvers: string;
  maxGrant: string;
  mfa: boolean;
  ticket: boolean;
}

const ACCESS_POLICIES: AccessPolicy[] = [
  { id: "ap1", name: "Production databases", who: "Group: engineering", what: "Postgres, MySQL · production", approvers: "1 from Platform on-call", maxGrant: "4 h", mfa: true, ticket: true },
  { id: "ap2", name: "Production SSH with sudo", who: "Group: sre", what: "SSH sudo · production", approvers: "2 from Platform on-call", maxGrant: "1 h", mfa: true, ticket: true },
  { id: "ap3", name: "Analytics warehouse", who: "Group: data", what: "db-analytics-01 · analyst", approvers: "Auto-approve", maxGrant: "8 h", mfa: true, ticket: false },
  { id: "ap4", name: "Staging cluster", who: "Group: engineering", what: "k8s-staging · view, edit", approvers: "Auto-approve", maxGrant: "8 h", mfa: false, ticket: false },
  { id: "ap5", name: "Cluster admin", who: "Group: sre", what: "k8s-prod-eu · cluster-admin", approvers: "2 from Security", maxGrant: "1 h", mfa: true, ticket: true },
  { id: "ap6", name: "Vendor RDP", who: "Group: vendors", what: "win-bastion-* · operator", approvers: "1 from IT", maxGrant: "4 h", mfa: true, ticket: true },
];

function PoliciesPage() {
  const [active, setActive] = useState("ap1");
  const [draft, setDraft] = useState<Record<string, AccessPolicy>>(Object.fromEntries(ACCESS_POLICIES.map((p) => [p.id, p])));
  const [saved, setSaved] = useState<string | null>(null);
  const cur = draft[active] ?? ACCESS_POLICIES[0]!;
  const set = (patch: Partial<AccessPolicy>) => (setDraft((d) => ({ ...d, [active]: { ...cur, ...patch } })), setSaved(null));
  const cols: Column<AccessPolicy>[] = [
    { id: "name", header: "Policy", width: "24%", cell: (p) => <span className="font-medium">{(draft[p.id] ?? p).name}</span> },
    { id: "who", header: "Who", cell: (p) => <span className="text-xs">{(draft[p.id] ?? p).who}</span> },
    { id: "what", header: "Can request", cell: (p) => <span className="text-xs">{(draft[p.id] ?? p).what}</span> },
    { id: "approvers", header: "Approval", cell: (p) => <span className="text-xs">{(draft[p.id] ?? p).approvers}</span> },
    { id: "max", header: "Max", mono: true, cell: (p) => (draft[p.id] ?? p).maxGrant },
    { id: "mfa", header: "MFA", cell: (p) => ((draft[p.id] ?? p).mfa ? <Badge tone="success">Required</Badge> : <Badge tone="warning">Off</Badge>) },
  ];
  return (
    <>
      <PageHeader title="Policies" description="Who may request what, who approves it and for how long. The most specific policy wins." actions={<Button variant="primary" icon={<Plus />}>New policy</Button>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Policies" flush>
          <DataTable label="Access policies" columns={cols} rows={ACCESS_POLICIES} getRowId={(p) => p.id} onRowClick={(p) => (setActive(p.id), setSaved(null))} activeRowId={active} minWidth={820} />
        </Panel>
        <Panel title="Edit policy" description={cur.name} aria-label="Edit policy">
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(`Saved ${cur.name}: max grant ${cur.maxGrant}, ${cur.approvers.toLowerCase()}`);
            }}
          >
            <TextField label="Name" value={cur.name} onChange={(e) => set({ name: e.target.value })} />
            <SelectField
              label="Approval"
              value={cur.approvers}
              onChange={(e) => set({ approvers: e.target.value })}
              options={["Auto-approve", "1 from Platform on-call", "2 from Platform on-call", "1 from IT", "2 from Security"].map((v) => ({ value: v, label: v }))}
            />
            <SelectField label="Max grant" value={cur.maxGrant} onChange={(e) => set({ maxGrant: e.target.value })} options={["30 min", "1 h", "2 h", "4 h", "8 h", "12 h"].map((v) => ({ value: v, label: v }))} />
            <Switch checked={cur.mfa} onCheckedChange={(v) => set({ mfa: v })} label="Require MFA at session start" />
            <Switch checked={cur.ticket} onCheckedChange={(v) => set({ ticket: v })} label="Require a ticket reference" description="INC-, CHG- or OPS- keys are checked against the incident and change trackers." />
            <div className="flex items-center gap-2 border-t border-line pt-2">
              <Button type="submit" variant="primary">
                Save policy
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  {saved}
                </span>
              )}
            </div>
          </form>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

type AuditKind = "request" | "approval" | "session" | "policy";

interface AuditEvent {
  id: string;
  time: string;
  kind: AuditKind;
  actor: string;
  action: string;
  target: string;
  result: "success" | "denied" | "error";
}

const AUDIT: AuditEvent[] = [
  { id: "a1", time: "13:47:02", kind: "session", actor: "Ben Ortiz", action: "session.start", target: "worker-prod-09 · read-only", result: "success" },
  { id: "a2", time: "13:46:40", kind: "approval", actor: "auto", action: "request.approve", target: "worker-prod-09 · read-only · 30 min", result: "success" },
  { id: "a3", time: "13:44:11", kind: "request", actor: "Mark Wilson", action: "request.create", target: "db-prod-01 · read-only · 1 h", result: "success" },
  { id: "a4", time: "13:37:29", kind: "request", actor: "Sarah Chen", action: "request.create", target: "api-prod-05 · sudo · 30 min", result: "success" },
  { id: "a5", time: "13:31:08", kind: "session", actor: "Emily Clark", action: "session.start", target: "db-prod-02 · read-only", result: "success" },
  { id: "a6", time: "13:12:55", kind: "session", actor: "Dana Kim", action: "session.mfa", target: "api-prod-03", result: "success" },
  { id: "a7", time: "12:40:19", kind: "approval", actor: "Mark Wilson", action: "request.deny", target: "k8s-prod-eu · cluster-admin · 1 h", result: "denied" },
  { id: "a8", time: "12:05:44", kind: "policy", actor: "Emily Clark", action: "policy.update", target: "Production databases · max 4 h", result: "success" },
  { id: "a9", time: "11:22:30", kind: "session", actor: "Chris Shaw", action: "session.start", target: "win-bastion-02", result: "error" },
  { id: "a10", time: "10:02:13", kind: "session", actor: "Sarah Chen", action: "session.terminate", target: "api-prod-03 · ended by admin", result: "success" },
];

const AUDIT_RESULT_TONE = { success: "success", denied: "warning", error: "danger" } as const;

function AuditPage() {
  const [range, setRange] = useState("24h");
  const [kind, setKind] = useState<"all" | AuditKind>("all");
  const [result, setResult] = useState<string[]>([]);
  const [exported, setExported] = useState(false);
  const rows = AUDIT.filter((a) => (kind === "all" || a.kind === kind) && (result.length === 0 || result.includes(a.result)));
  const cols: Column<AuditEvent>[] = [
    { id: "time", header: "Time", mono: true, width: "100px", sortValue: (a) => a.time, cell: (a) => a.time },
    { id: "actor", header: "Actor", cell: (a) => (a.actor === "auto" ? <span className="text-fg-muted">Policy (auto)</span> : <Person name={a.actor} />) },
    { id: "action", header: "Action", mono: true, cell: (a) => a.action },
    { id: "target", header: "Target", width: "32%", cell: (a) => <span className="text-xs">{a.target}</span> },
    { id: "result", header: "Result", cell: (a) => <StatusBadge tone={AUDIT_RESULT_TONE[a.result]}>{a.result}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Audit"
        description="Append-only log of every request, approval, session and policy change. Streamed to SIEM."
        actions={
          <Button icon={<Download />} onClick={() => setExported(true)}>
            Export CSV
          </Button>
        }
      />
      {exported && (
        <p role="status" className="text-sm text-success">
          access-audit-2026-10-19.csv exported · {rows.length} events
        </p>
      )}
      <FilterBar onClear={result.length ? () => setResult([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter label="Result" selected={result} onChange={setResult} options={(["success", "denied", "error"] as const).map((r) => ({ value: r, count: AUDIT.filter((a) => a.result === r).length }))} />
      </FilterBar>
      <Tabs
        label="Event type"
        value={kind}
        onChange={setKind}
        items={[
          { value: "all", label: "All", count: AUDIT.length },
          { value: "request", label: "Requests", count: AUDIT.filter((a) => a.kind === "request").length },
          { value: "approval", label: "Approvals", count: AUDIT.filter((a) => a.kind === "approval").length },
          { value: "session", label: "Sessions", count: AUDIT.filter((a) => a.kind === "session").length },
          { value: "policy", label: "Policy changes", count: AUDIT.filter((a) => a.kind === "policy").length },
        ]}
      />
      <Panel title="Events" description={`${rows.length} events`} flush>
        <DataTable label="Audit events" columns={cols} rows={rows} getRowId={(a) => a.id} defaultSort={{ id: "time", direction: "desc" }} minWidth={860} empty={<p className="py-8">No events match</p>} />
      </Panel>
    </>
  );
}

const PAGES = {
  requests: () => <RequestsPage />,
  sessions: () => <SessionsPage />,
  resources: () => <ResourcesPage />,
  recordings: () => <RecordingsPage />,
  policies: () => <PoliciesPage />,
  audit: () => <AuditPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="access" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Requests: Story = {
  ...app("requests"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("3 pending")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Approve Mark Wilson" }));
    await expect(c.getByTestId("status-r1")).toHaveTextContent("Approved");
    await userEvent.click(c.getByRole("button", { name: "Deny Sarah Chen" }));
    await expect(c.getByTestId("status-r2")).toHaveTextContent("Denied");
    await expect(c.getByText("1 pending")).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Active sessions" });
    await userEvent.click(within(table).getByRole("button", { name: "Terminate session for Ben Ortiz on worker-prod-09" }));
    await expect(within(table).queryByText("Ben Ortiz")).not.toBeInTheDocument();
  },
};

export const Sessions: Story = {
  ...app("sessions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Live output for Dana Kim")).toHaveTextContent("nginx -t");
    await userEvent.click(within(c.getByRole("table", { name: "Live sessions" })).getByText("Emily Clark"));
    await expect(c.getByLabelText("Live output for Emily Clark")).toHaveTextContent("SELECT count(*)");
    await userEvent.click(c.getByRole("button", { name: "End session" }));
    await expect(c.getByText(/Ended Emily Clark's session on db-prod-02/)).toBeInTheDocument();
  },
};

export const Resources: Story = {
  ...app("resources"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search resources" }), "k8s");
    await expect(c.getByRole("table", { name: "Resources" }).querySelectorAll("tbody tr")).toHaveLength(2);
  },
};

export const Recordings: Story = {
  ...app("recordings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Transcript of Dana Kim on api-prod-03" })).toHaveTextContent("rm -rf /var/cache/payments");
    await userEvent.type(c.getByRole("searchbox", { name: "Search commands in recordings" }), "kubectl");
    await expect(c.getByRole("table", { name: "Recordings" }).querySelectorAll("tbody tr")).toHaveLength(1);
    await userEvent.click(within(c.getByRole("table", { name: "Recordings" })).getByText("Ben Ortiz"));
    await expect(c.getByRole("list", { name: "Transcript of Ben Ortiz on k8s-prod-eu" })).toHaveTextContent("rollout restart");
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Max grant" }), "2 h");
    await userEvent.click(c.getByRole("button", { name: "Save policy" }));
    await expect(c.getByText(/Saved Production databases: max grant 2 h/)).toBeInTheDocument();
  },
};

export const Audit: Story = {
  ...app("audit"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Sessions/ }));
    await expect(c.getByRole("table", { name: "Audit events" }).querySelectorAll("tbody tr")).toHaveLength(5);
    await userEvent.click(c.getByRole("button", { name: "Export CSV" }));
    await expect(c.getByText(/access-audit-2026-10-19\.csv exported · 5 events/)).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
