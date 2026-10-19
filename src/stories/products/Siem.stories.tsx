import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookOpen, Database, Download, FileBarChart, FlaskConical, Play, Plus, Radar, RefreshCw, Search, ShieldAlert, Workflow, X } from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, FilterChip, QueryBar, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, LevelBadge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { Sparkline } from "../../charts/Sparkline";
import { SEVERITY_META, type LogLevel, type Severity, type Tone } from "../../tokens/levels";
import { HOSTS, PEOPLE, emailOf, timeLabels, wave } from "../mocks";

const nav = [
  { id: "signals", label: "Signals", icon: ShieldAlert, count: 41 },
  { id: "search", label: "Search", icon: Search },
  { id: "rules", label: "Rules", icon: BookOpen, count: "1,240" },
  { id: "intel", label: "Threat intel", icon: Radar },
  { id: "sources", label: "Sources", icon: Database, count: 7 },
  { id: "reports", label: "Reports", icon: FileBarChart },
];

const meta = {
  title: "Products/SIEM",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type SignalStatus = "new" | "investigating" | "closed";

const STATUS: Record<SignalStatus, { label: string; tone: Tone }> = {
  new: { label: "New", tone: "info" },
  investigating: { label: "Investigating", tone: "warning" },
  closed: { label: "Closed", tone: "neutral" },
};

interface Signal {
  id: string;
  severity: Severity;
  title: string;
  rule: string;
  source: string;
  tactic: string;
  host?: string;
  ip?: string;
  user?: string;
  hits: number;
  status: SignalStatus;
  last: string;
}

const signals: Signal[] = [
  { id: "sig-1041", severity: "critical", title: "Outbound beacon to known C2 address", rule: "net_connection_c2_beacon_interval", source: "OpenAsy VPN", tactic: "TA0011 Command and Control", host: HOSTS[3], ip: "203.0.113.24", hits: 312, status: "new", last: "2 min" },
  { id: "sig-1040", severity: "critical", title: "Cryptominer process spawned from /tmp", rule: "proc_creation_lnx_susp_miner_tmp", source: "OpenAsy Malware", tactic: "TA0040 Impact", host: HOSTS[4], hits: 4, status: "investigating", last: "11 min" },
  { id: "sig-1039", severity: "high", title: "Console sign-in without MFA from new country", rule: "aws_console_login_no_mfa", source: "AWS CloudTrail", tactic: "TA0001 Initial Access", ip: "198.51.100.7", user: emailOf(PEOPLE[4]), hits: 1, status: "new", last: "18 min" },
  { id: "sig-1038", severity: "high", title: "Brute force against SSH followed by success", rule: "lnx_auth_ssh_bruteforce_success", source: "OpenAsy Logs", tactic: "TA0006 Credential Access", host: HOSTS[0], ip: "192.0.2.44", user: "deploy", hits: 1_284, status: "investigating", last: "26 min" },
  { id: "sig-1037", severity: "high", title: "IAM access key created for root account", rule: "aws_root_access_key_created", source: "AWS CloudTrail", tactic: "TA0003 Persistence", ip: "203.0.113.181", user: "root", hits: 1, status: "new", last: "41 min" },
  { id: "sig-1036", severity: "high", title: "Port scan blocked at perimeter", rule: "fortigate_ips_portscan", source: "FortiGate", tactic: "TA0043 Reconnaissance", ip: "198.51.100.201", hits: 9_402, status: "closed", last: "1 h" },
  { id: "sig-1035", severity: "medium", title: "Shadow file read by non-root process", rule: "file_access_lnx_shadow_read", source: "OpenAsy Logs", tactic: "TA0006 Credential Access", host: HOSTS[5], user: "postgres", hits: 3, status: "new", last: "1 h" },
  { id: "sig-1034", severity: "medium", title: "Realm admin role granted outside change window", rule: "keycloak_admin_role_grant", source: "Keycloak", tactic: "TA0004 Privilege Escalation", user: emailOf(PEOPLE[2]), hits: 1, status: "investigating", last: "2 h" },
  { id: "sig-1033", severity: "medium", title: "VPN sign-in from two countries within 10 min", rule: "vpn_impossible_travel", source: "OpenAsy VPN", tactic: "TA0001 Initial Access", ip: "203.0.113.9", user: emailOf(PEOPLE[6]), hits: 2, status: "new", last: "3 h" },
  { id: "sig-1032", severity: "low", title: "Cron job added by interactive user", rule: "lnx_crontab_modification", source: "OpenAsy Logs", tactic: "TA0003 Persistence", host: HOSTS[7], user: "ops", hits: 1, status: "closed", last: "5 h" },
  { id: "sig-1031", severity: "low", title: "DNS lookup of newly registered domain", rule: "dns_query_newly_registered_domain", source: "FortiGate", tactic: "TA0011 Command and Control", host: HOSTS[1], hits: 27, status: "new", last: "6 h" },
];

const signalColumns: Column<Signal>[] = [
  { id: "sev", header: "Severity", width: "104px", sortValue: (s) => SEVERITY_META[s.severity].rank, cell: (s) => <SeverityBadge severity={s.severity} /> },
  {
    id: "signal",
    header: "Signal",
    width: "32%",
    sortValue: (s) => s.title,
    cell: (s) => (
      <span className="flex min-w-0 flex-col">
        <a href={`#${s.id}`} className="truncate font-medium text-fg no-underline hover:underline">
          {s.title}
        </a>
        <span className="flex items-center gap-1.5 text-2xs text-fg-muted">
          <span className="truncate font-mono">{s.rule}</span>
          <span aria-hidden>·</span>
          <span className="whitespace-nowrap">{s.source}</span>
        </span>
      </span>
    ),
  },
  {
    id: "tactic",
    header: "MITRE ATT&CK",
    cell: (s) => {
      const [code, ...name] = s.tactic.split(" ");
      return (
        <span className="flex flex-col">
          <span className="font-mono text-2xs text-fg-muted">{code}</span>
          <span className="text-xs">{name.join(" ")}</span>
        </span>
      );
    },
  },
  {
    id: "entities",
    header: "Entities",
    cell: (s) => (
      <span className="flex flex-wrap gap-1">
        {s.host && <EntityChip kind="host" value={s.host} href="#host" />}
        {s.ip && <EntityChip kind="ip" value={s.ip} href="#ip" />}
        {s.user && <EntityChip kind="user" value={s.user} href="#user" />}
      </span>
    ),
  },
  { id: "hits", header: "Hits", align: "right", mono: true, sortValue: (s) => s.hits, cell: (s) => s.hits.toLocaleString("en-US") },
  { id: "last", header: "Last seen", align: "right", cell: (s) => <span className="whitespace-nowrap text-fg-muted">{s.last} ago</span> },
  { id: "status", header: "Status", cell: (s) => <StatusBadge tone={STATUS[s.status].tone}>{STATUS[s.status].label}</StatusBadge> },
];

const HOURS = 24;
const hours = timeLabels(HOURS, 60);
const sevSeries = [
  wave(HOURS, { base: 0.4, amp: 0.4, seed: 3, spike: 3, spikeAt: 21, spikeLen: 2 }),
  wave(HOURS, { base: 3, amp: 2, seed: 4, spike: 6, spikeAt: 20 }),
  wave(HOURS, { base: 14, amp: 7, seed: 5 }),
  wave(HOURS, { base: 38, amp: 16, seed: 6 }),
];
const eventValues = hours.map((_, i) => sevSeries.map((s) => Math.round(s[i]!)));

interface Source {
  id: string;
  name: string;
  via: string;
  eps: string;
  ok: boolean;
  note?: string;
}

const sources: Source[] = [
  { id: "logs", name: "OpenAsy Logs", via: "OCSF · native", eps: "1,840 ev/s", ok: true },
  { id: "vpn", name: "OpenAsy VPN", via: "OCSF · native", eps: "42 ev/s", ok: true },
  { id: "malware", name: "OpenAsy Malware", via: "OCSF · native", eps: "3 ev/s", ok: true },
  { id: "cloudtrail", name: "AWS CloudTrail", via: "S3 + SQS · eu-central-1", eps: "210 ev/s", ok: true },
  { id: "fortigate", name: "FortiGate 200F", via: "Syslog CEF · TLS 6514", eps: "960 ev/s", ok: true },
  { id: "keycloak", name: "Keycloak", via: "Events webhook", eps: "0 ev/s", ok: false, note: "No data for 2 h" },
];

const SEVERITY_COUNTS: Record<Exclude<Severity, "info">, number> = { critical: 2, high: 6, medium: 14, low: 19 };

/** Signals: detections from Sigma rules over every source, triaged by severity and status. */
function SignalsPage() {
    const [range, setRange] = useState("24h");
    const [sev, setSev] = useState<string[]>([]);
    const [status, setStatus] = useState<string[]>([]);
    const [q, setQ] = useState("");
    const rows = useMemo(
      () =>
        signals.filter(
          (s) =>
            (sev.length === 0 || sev.includes(s.severity)) &&
            (status.length === 0 || status.includes(s.status)) &&
            (!q || `${s.title} ${s.rule} ${s.host ?? ""} ${s.ip ?? ""} ${s.user ?? ""}`.toLowerCase().includes(q.toLowerCase())),
        ),
      [sev, status, q],
    );
    const count = (pred: (s: Signal) => boolean) => signals.filter(pred).length;
    return (
      <>
        <PageHeader
          title="Signals"
          description="1,240 Sigma rules over 7 sources · normalised to OCSF 1.3"
          meta={<StatusBadge tone="danger">2 critical open</StatusBadge>}
          actions={
            <>
              <Button size="md" icon={<Workflow />}>
                Correlations
              </Button>
              <Button size="md" variant="primary" icon={<Plus />}>
                New rule
              </Button>
            </>
          }
        />
        <FilterBar
          onClear={
            sev.length || status.length || q
              ? () => {
                  setSev([]);
                  setStatus([]);
                  setQ("");
                }
              : undefined
          }
        >
          <TimeRangePicker value={range} onChange={setRange} />
          <FacetFilter
            label="Severity"
            selected={sev}
            onChange={setSev}
            options={(["critical", "high", "medium", "low"] as const).map((s) => ({ value: s, label: SEVERITY_META[s].label, count: count((x) => x.severity === s) }))}
          />
          <FacetFilter
            label="Status"
            selected={status}
            onChange={setStatus}
            options={(Object.keys(STATUS) as SignalStatus[]).map((s) => ({ value: s, label: STATUS[s].label, count: count((x) => x.status === s) }))}
          />
          <SearchInput label="Search signals, hosts, users" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
        </FilterBar>
        <Callout tone="critical" title="Outbound beacon from worker-prod-04 to 203.0.113.24" action={<Button size="sm">Open incident</Button>}>
          312 connections every 60 s ± 2 s since 13:12. Address is on the abuse.ch Feodo list.
        </Callout>
        <KpiGrid minWidth={160}>
          {(Object.keys(SEVERITY_COUNTS) as Array<keyof typeof SEVERITY_COUNTS>).map((s, i) => (
            <KpiCard
              key={s}
              label={<SeverityBadge severity={s} />}
              value={SEVERITY_COUNTS[s]}
              unit="open"
              trend={wave(12, { base: SEVERITY_COUNTS[s], amp: SEVERITY_COUNTS[s] / 3, seed: 40 + i })}
              trendColor={["var(--oa-critical)", "var(--oa-danger)", "var(--oa-warning)", "var(--oa-seq-3)"][i]}
              delta={
                s === "critical"
                  ? { label: "+2 in the last hour", direction: "up", intent: "bad" }
                  : s === "high"
                    ? { label: "+1 vs. yesterday", direction: "up", intent: "bad" }
                    : { label: s === "medium" ? "−3 vs. yesterday" : "−5 vs. yesterday", direction: "down", intent: "good" }
              }
            />
          ))}
        </KpiGrid>
        <div className="grid gap-2.5 xl:grid-cols-[2fr_1fr]">
          <Panel title="Security events by severity" description="Matched events per hour, last 24 h">
            <StackedBarChart
              label="Security events by severity per hour"
              categories={hours}
              height={180}
              xTicks={7}
              segments={[
                { id: "critical", name: "Critical", color: "var(--oa-critical)" },
                { id: "high", name: "High", color: "var(--oa-danger)" },
                { id: "medium", name: "Medium", color: "var(--oa-warning)" },
                { id: "low", name: "Low", color: "var(--oa-seq-2)" },
              ]}
              values={eventValues}
            />
          </Panel>
          <Panel title="Sources" description="7 connected · 1 silent" actions={<Button size="sm" variant="ghost">Manage</Button>} flush>
            <ul className="flex flex-col" aria-label="Event sources">
              {sources.map((s) => (
                <li key={s.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-3 py-1.5 last:border-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{s.name}</span>
                    <span className="truncate text-2xs text-fg-muted">{s.via}</span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    {s.ok ? <StatusBadge tone="success">Receiving</StatusBadge> : <StatusBadge tone="warning">{s.note}</StatusBadge>}
                    <span className="font-mono text-2xs text-fg-muted">{s.eps}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel
          title="Signals"
          description={`${rows.length} of ${signals.length} shown · grouped by rule and entity`}
          actions={
            <>
              <Badge tone="neutral" mono>
                dedupe 15m
              </Badge>
              <Button size="sm" variant="ghost">
                Export
              </Button>
            </>
          }
          flush
        >
          <DataTable
            label="Signals"
            columns={signalColumns}
            rows={rows}
            getRowId={(s) => s.id}
            selectable
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={1040}
            empty={<p className="py-8">No signals match these filters</p>}
          />
        </Panel>
      </>
    );
}

const SIGNALS_PLAY: Story["play"] = async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Signals" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Signals" });
    const filters = within(c.getByRole("toolbar", { name: "Filters" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(signals.length + 1);

    await userEvent.click(filters.getByRole("button", { name: /^Severity/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /Critical/ }));
    await userEvent.keyboard("{Escape}");
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await expect(within(table).getByText("Outbound beacon to known C2 address")).toBeInTheDocument();

    await userEvent.click(filters.getByRole("button", { name: /^Status/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /Investigating/ }));
    await userEvent.keyboard("{Escape}");
    await expect(within(table).getAllByRole("row")).toHaveLength(2);
    await expect(within(table).getByText("Cryptominer process spawned from /tmp")).toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(signals.length + 1);
    await expect(c.getByText("No data for 2 h")).toBeInTheDocument();
  };

/* ------------------------------------------------------------------ */
/* Search: OCSF event search                                           */
/* ------------------------------------------------------------------ */

interface OcsfEvent {
  id: string;
  time: string;
  cls: "Authentication" | "Network Activity" | "Process Activity" | "File System Activity" | "DNS Activity" | "API Activity";
  classUid: number;
  level: LogLevel;
  status: "Success" | "Failure";
  source: string;
  host?: string;
  ip: string;
  user?: string;
  message: string;
}

const EVENTS: OcsfEvent[] = [
  { id: "ev01", time: "14:01:58.212", cls: "Network Activity", classUid: 4001, level: "error", status: "Success", source: "OpenAsy VPN", host: HOSTS[3], ip: "203.0.113.24", message: "TCP 10.20.4.17:51842 → 203.0.113.24:443 · 1.2 kB out · beacon interval 60 s" },
  { id: "ev02", time: "14:01:41.090", cls: "Authentication", classUid: 3002, level: "warn", status: "Failure", source: "OpenAsy Logs", host: HOSTS[0], ip: "192.0.2.44", user: "deploy", message: "sshd: Failed password for deploy from 192.0.2.44 port 52210 ssh2" },
  { id: "ev03", time: "14:01:40.877", cls: "Authentication", classUid: 3002, level: "warn", status: "Failure", source: "OpenAsy Logs", host: HOSTS[0], ip: "192.0.2.44", user: "deploy", message: "sshd: Failed password for deploy from 192.0.2.44 port 52208 ssh2" },
  { id: "ev04", time: "14:01:12.554", cls: "Authentication", classUid: 3002, level: "error", status: "Success", source: "OpenAsy Logs", host: HOSTS[0], ip: "192.0.2.44", user: "deploy", message: "sshd: Accepted password for deploy from 192.0.2.44 port 52231 ssh2" },
  { id: "ev05", time: "14:00:57.330", cls: "Process Activity", classUid: 1007, level: "fatal", status: "Success", source: "OpenAsy Malware", host: HOSTS[4], ip: "10.20.4.31", user: "www-data", message: "exec /tmp/.x/kworkerd -o pool.example.com:3333 (parent: bash, sha256 9f2c…e1a4)" },
  { id: "ev06", time: "14:00:31.006", cls: "API Activity", classUid: 6003, level: "error", status: "Success", source: "AWS CloudTrail", ip: "203.0.113.181", user: "root", message: "iam:CreateAccessKey on root · eu-central-1 · console session" },
  { id: "ev07", time: "13:59:48.771", cls: "DNS Activity", classUid: 4003, level: "warn", status: "Success", source: "FortiGate", host: HOSTS[1], ip: "10.20.1.12", message: "A query for xk2-update.example.com (registered 2 days ago) → 198.51.100.96" },
  { id: "ev08", time: "13:59:20.118", cls: "Authentication", classUid: 3002, level: "warn", status: "Success", source: "AWS CloudTrail", ip: "198.51.100.7", user: emailOf(PEOPLE[4]), message: "ConsoleLogin without MFA · country IE · user agent Firefox 131" },
  { id: "ev09", time: "13:58:02.640", cls: "File System Activity", classUid: 1001, level: "warn", status: "Success", source: "OpenAsy Logs", host: HOSTS[5], ip: "10.20.6.5", user: "postgres", message: "open(/etc/shadow, O_RDONLY) by postgres (pid 4120)" },
  { id: "ev10", time: "13:57:44.902", cls: "Network Activity", classUid: 4001, level: "info", status: "Failure", source: "FortiGate", ip: "198.51.100.201", message: "IPS: TCP SYN scan 198.51.100.201 → 203.0.113.0/24 · 9,402 ports · dropped" },
  { id: "ev11", time: "13:56:10.415", cls: "Authentication", classUid: 3002, level: "info", status: "Success", source: "Keycloak", ip: "203.0.113.9", user: emailOf(PEOPLE[6]), message: "LOGIN realm=acme client=grafana · WebAuthn" },
  { id: "ev12", time: "13:55:39.287", cls: "API Activity", classUid: 6003, level: "warn", status: "Success", source: "Keycloak", ip: "203.0.113.9", user: emailOf(PEOPLE[2]), message: "Role realm-admin granted to " + emailOf(PEOPLE[2]) + " by " + emailOf(PEOPLE[0]) },
  { id: "ev13", time: "13:54:03.950", cls: "Process Activity", classUid: 1007, level: "info", status: "Success", source: "OpenAsy Logs", host: HOSTS[7], ip: "10.20.9.2", user: "ops", message: "crontab -e by ops (tty pts/1) · added */5 * * * * /opt/backup.sh" },
  { id: "ev14", time: "13:52:47.003", cls: "Authentication", classUid: 3002, level: "warn", status: "Failure", source: "OpenAsy VPN", ip: "198.51.100.201", user: emailOf(PEOPLE[4]), message: "OpenVPN: TOTP verification failed (attempt 3 of 5)" },
];

/** OCSF attribute → event field, for the query bar and the field list. */
const FIELDS: Array<{ key: string; label: string; get: (e: OcsfEvent) => string | undefined }> = [
  { key: "class_name", label: "class_name", get: (e) => e.cls },
  { key: "status", label: "status", get: (e) => e.status },
  { key: "metadata.product.name", label: "metadata.product.name", get: (e) => e.source },
  { key: "src_endpoint.ip", label: "src_endpoint.ip", get: (e) => e.ip },
  { key: "actor.user.name", label: "actor.user.name", get: (e) => e.user },
  { key: "device.hostname", label: "device.hostname", get: (e) => e.host },
];

function matchQuery(e: OcsfEvent, query: string) {
  const tokens = query.split(/\s+/).filter((t) => t && t.toUpperCase() !== "AND");
  return tokens.every((t) => {
    const idx = t.indexOf(":");
    if (idx > 0) {
      const field = FIELDS.find((f) => f.key === t.slice(0, idx));
      const value = t.slice(idx + 1).replace(/^"|"$/g, "").toLowerCase();
      if (field) return (field.get(e) ?? "").toLowerCase().replace(/ /g, "_").includes(value.replace(/ /g, "_"));
    }
    return e.message.toLowerCase().includes(t.toLowerCase());
  });
}

const qv = (v: string) => v.replace(/ /g, "_");

const histogram = timeLabels(24, 60).map((_, i) => [
  Math.round(wave(24, { base: 4200, amp: 1600, seed: 81 })[i]!),
  Math.round(wave(24, { base: 2600, amp: 900, seed: 82 })[i]!),
  Math.round(wave(24, { base: 900, amp: 300, seed: 83, spike: 1400, spikeAt: 21, spikeLen: 2 })[i]!),
  Math.round(wave(24, { base: 700, amp: 250, seed: 84 })[i]!),
]);

const SAVED_SEARCHES = [
  { name: "Failed SSH by source IP", query: "class_name:Authentication status:Failure" },
  { name: "Root API calls", query: "class_name:API_Activity actor.user.name:root" },
  { name: "Beacon host traffic", query: "device.hostname:worker-prod-04" },
];

function SearchPage() {
  const [range, setRange] = useState("1h");
  const [draft, setDraft] = useState("class_name:Authentication");
  const [query, setQuery] = useState("class_name:Authentication");
  const [open, setOpen] = useState<OcsfEvent | null>(null);
  const rows = EVENTS.filter((e) => matchQuery(e, query));
  const run = (q: string) => {
    setDraft(q);
    setQuery(q);
    setOpen(null);
  };
  const addTerm = (term: string) => run(query.includes(term) ? query : `${query} ${term}`.trim());
  const cols: Column<OcsfEvent>[] = [
    { id: "time", header: "Time", width: "120px", mono: true, sortValue: (e) => e.time, cell: (e) => e.time },
    { id: "level", header: "Level", width: "84px", cell: (e) => <LevelBadge level={e.level} /> },
    {
      id: "class",
      header: "Class",
      width: "170px",
      description: "OCSF event class and its class_uid.",
      sortValue: (e) => e.cls,
      cell: (e) => (
        <span className="flex flex-col">
          <span className="text-xs font-medium">{e.cls}</span>
          <span className="font-mono text-2xs text-fg-muted">class_uid {e.classUid}</span>
        </span>
      ),
    },
    {
      id: "msg",
      header: "Message",
      cell: (e) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" className="truncate text-left font-mono text-xs text-fg hover:underline">
            {e.message}
          </button>
          <span className="truncate text-2xs text-fg-muted">
            {e.source}
            {e.host ? ` · ${e.host}` : ""}
            {e.user ? ` · ${e.user}` : ""}
          </span>
        </span>
      ),
    },
    { id: "ip", header: "Source IP", width: "150px", cell: (e) => <EntityChip kind="ip" value={e.ip} hideKind /> },
    { id: "status", header: "Status", width: "96px", cell: (e) => <StatusBadge tone={e.status === "Failure" ? "warning" : "neutral"}>{e.status}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Search"
        description="Query every normalised event · OCSF 1.3 · hot storage 30 days, archive 400 days"
        actions={
          <>
            <Button icon={<Download />}>Export results</Button>
            <Button variant="primary" icon={<Plus />}>
              Save as rule
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <TimeRangePicker value={range} onChange={setRange} />
        <QueryBar label="OCSF query" value={draft} onChange={setDraft} onSubmit={run} placeholder="class_name:Authentication status:Failure" />
      </div>
      <Panel title="Events over time" description={`${rows.length.toLocaleString("en-US")} sample matches · 214,380 events scanned in 0.42 s`}>
        <StackedBarChart
          label="Events per hour by OCSF class"
          categories={timeLabels(24, 60)}
          height={140}
          xTicks={8}
          segments={[
            { id: "net", name: "Network Activity" },
            { id: "auth", name: "Authentication" },
            { id: "proc", name: "Process Activity" },
            { id: "other", name: "Other classes" },
          ]}
          values={histogram}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Fields" description="Top values in the results · click to filter" aria-label="OCSF fields" flush>
            <div className="flex flex-col">
              {FIELDS.map((f) => {
                const counts = new Map<string, number>();
                EVENTS.forEach((e) => {
                  const v = f.get(e);
                  if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
                });
                const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
                return (
                  <div key={f.key} className="border-b border-subtle px-3 py-2 last:border-0">
                    <h3 className="font-mono text-2xs font-medium text-fg-muted">{f.label}</h3>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {top.map(([v, n]) => (
                        <li key={v}>
                          <button
                            type="button"
                            onClick={() => addTerm(`${f.key}:${qv(v)}`)}
                            className="flex w-full items-center justify-between gap-2 rounded px-1 py-0.5 text-left text-xs hover:bg-subtle"
                          >
                            <span className="truncate text-fg">{v}</span>
                            <span className="font-mono text-2xs text-fg-muted">{n}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Saved searches" flush>
            <ul className="flex flex-col p-1">
              {SAVED_SEARCHES.map((s) => (
                <li key={s.name}>
                  <button type="button" onClick={() => run(s.query)} className="flex w-full flex-col rounded-md px-2 py-1.5 text-left hover:bg-subtle">
                    <span className="text-sm font-medium text-fg">{s.name}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{s.query}</span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="flex min-w-0 flex-col gap-2.5">
          {query && (
            <div className="flex flex-wrap items-center gap-1.5" aria-label="Applied query terms" role="group">
              {query
                .split(/\s+/)
                .filter((t) => t.includes(":"))
                .map((t) => {
                  const [field, ...rest] = t.split(":");
                  return <FilterChip key={t} field={field!} value={rest.join(":")} onRemove={() => run(query.split(/\s+/).filter((x) => x !== t).join(" "))} />;
                })}
            </div>
          )}
          <Panel title="Results" description={`${rows.length} of ${EVENTS.length} sampled events`} flush>
            <DataTable
              label="Search results"
              columns={cols}
              rows={rows}
              getRowId={(e) => e.id}
              onRowClick={setOpen}
              activeRowId={open?.id}
              defaultSort={{ id: "time", direction: "desc" }}
              minWidth={900}
              stickyHeader
              maxHeight={420}
              empty={<p className="py-8">No events match this query</p>}
            />
          </Panel>
          {open && (
            <Panel
              aria-label="Event detail"
              title={`${open.cls} · ${open.time}`}
              description={open.source}
              actions={
                <IconButton label="Close event" size="sm" onClick={() => setOpen(null)}>
                  <X />
                </IconButton>
              }
            >
              <pre role="region" aria-label="Raw OCSF event" tabIndex={0} className="m-0 max-h-64 overflow-auto rounded-md border border-line bg-subtle px-2.5 py-2 font-mono text-xs text-fg">
                {JSON.stringify(
                  {
                    class_uid: open.classUid,
                    class_name: open.cls,
                    severity: open.level,
                    status: open.status,
                    time: `2026-10-19T${open.time}Z`,
                    metadata: { product: { name: open.source }, version: "1.3.0" },
                    src_endpoint: { ip: open.ip },
                    ...(open.host ? { device: { hostname: open.host } } : {}),
                    ...(open.user ? { actor: { user: { name: open.user } } } : {}),
                    message: open.message,
                  },
                  null,
                  2,
                )}
              </pre>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rules: Sigma rules with tuning and a dry run                         */
/* ------------------------------------------------------------------ */

interface Rule {
  id: string;
  title: string;
  level: Severity;
  status: "stable" | "test" | "experimental";
  technique: string;
  tactic: string;
  logsource: string;
  hits: number;
  fp: number;
  enabled: boolean;
  author: string;
  modified: string;
  exclusions: Array<{ field: string; value: string }>;
  detection: string;
}

const RULES: Rule[] = [
  { id: "net_connection_c2_beacon_interval", title: "Periodic outbound connection to rare destination", level: "critical", status: "stable", technique: "T1071.001", tactic: "Command and Control", logsource: "network / openasy_vpn", hits: 312, fp: 0.02, enabled: true, author: PEOPLE[3], modified: "Oct 2", exclusions: [{ field: "dst_endpoint.domain", value: "*.update.example.com" }], detection: "selection:\n  class_uid: 4001\n  connection_info.direction: outbound\ntiming:\n  interval_stddev_s: '< 3'\n  min_connections: 20\ncondition: selection and timing" },
  { id: "lnx_auth_ssh_bruteforce_success", title: "SSH brute force followed by successful login", level: "high", status: "stable", technique: "T1110.001", tactic: "Credential Access", logsource: "linux / auth", hits: 1284, fp: 0.04, enabled: true, author: PEOPLE[0], modified: "Sep 28", exclusions: [{ field: "src_endpoint.ip", value: "10.20.0.0/16" }], detection: "failed:\n  class_uid: 3002\n  status: Failure\n  service.name: sshd\nsuccess:\n  class_uid: 3002\n  status: Success\ncondition: failed | count() by src_endpoint.ip > 20 followed by success within 10m" },
  { id: "aws_console_login_no_mfa", title: "AWS console sign-in without MFA", level: "high", status: "stable", technique: "T1078.004", tactic: "Initial Access", logsource: "aws / cloudtrail", hits: 3, fp: 0.0, enabled: true, author: PEOPLE[2], modified: "Aug 30", exclusions: [], detection: "selection:\n  api.operation: ConsoleLogin\n  unmapped.additionalEventData.MFAUsed: 'No'\ncondition: selection" },
  { id: "aws_root_access_key_created", title: "Access key created for the root account", level: "high", status: "stable", technique: "T1098.001", tactic: "Persistence", logsource: "aws / cloudtrail", hits: 1, fp: 0.0, enabled: true, author: PEOPLE[2], modified: "Aug 30", exclusions: [], detection: "selection:\n  api.operation: CreateAccessKey\n  actor.user.type: Root\ncondition: selection" },
  { id: "proc_creation_lnx_susp_miner_tmp", title: "Miner-like process started from /tmp", level: "critical", status: "test", technique: "T1496", tactic: "Impact", logsource: "linux / process_creation", hits: 4, fp: 0.0, enabled: true, author: PEOPLE[5], modified: "Oct 11", exclusions: [], detection: "selection:\n  class_uid: 1007\n  process.file.path|startswith: '/tmp/'\n  process.cmd_line|contains: ['-o pool.', 'stratum+tcp']\ncondition: selection" },
  { id: "file_access_lnx_shadow_read", title: "Shadow file read by non-root process", level: "medium", status: "stable", technique: "T1003.008", tactic: "Credential Access", logsource: "linux / file_access", hits: 3, fp: 0.33, enabled: true, author: PEOPLE[0], modified: "Jul 14", exclusions: [{ field: "process.name", value: "unix_chkpwd" }], detection: "selection:\n  class_uid: 1001\n  file.path: /etc/shadow\nfilter:\n  actor.user.uid: 0\ncondition: selection and not filter" },
  { id: "keycloak_admin_role_grant", title: "Realm admin role granted outside change window", level: "medium", status: "test", technique: "T1098", tactic: "Privilege Escalation", logsource: "keycloak / admin_events", hits: 1, fp: 0.5, enabled: true, author: PEOPLE[3], modified: "Oct 6", exclusions: [], detection: "selection:\n  api.operation: GRANT_ROLE\n  resources.name: realm-admin\nfilter:\n  time|between: change_window\ncondition: selection and not filter" },
  { id: "vpn_impossible_travel", title: "VPN sign-in from two countries within 10 minutes", level: "medium", status: "stable", technique: "T1078", tactic: "Initial Access", logsource: "network / openasy_vpn", hits: 2, fp: 0.5, enabled: true, author: PEOPLE[6], modified: "Sep 3", exclusions: [], detection: "selection:\n  class_uid: 3002\n  status: Success\ncondition: selection | geo_distance(actor.user.name) > 500km within 10m" },
  { id: "lnx_crontab_modification", title: "Cron job added by interactive user", level: "low", status: "stable", technique: "T1053.003", tactic: "Persistence", logsource: "linux / process_creation", hits: 1, fp: 0.8, enabled: true, author: PEOPLE[1], modified: "Jun 20", exclusions: [{ field: "actor.user.name", value: "ansible" }], detection: "selection:\n  process.name: crontab\n  process.cmd_line|contains: ' -e'\ncondition: selection" },
  { id: "dns_query_newly_registered_domain", title: "DNS lookup of newly registered domain", level: "low", status: "experimental", technique: "T1568", tactic: "Command and Control", logsource: "dns / fortigate", hits: 27, fp: 0.62, enabled: true, author: PEOPLE[7], modified: "Oct 15", exclusions: [], detection: "selection:\n  class_uid: 4003\n  query.domain_age_days: '< 7'\ncondition: selection" },
  { id: "win_lsass_memory_dump", title: "LSASS memory dump via comsvcs.dll", level: "critical", status: "stable", technique: "T1003.001", tactic: "Credential Access", logsource: "windows / process_creation", hits: 0, fp: 0.0, enabled: false, author: PEOPLE[4], modified: "May 2", exclusions: [], detection: "selection:\n  process.cmd_line|contains|all: ['comsvcs.dll', 'MiniDump']\ncondition: selection" },
  { id: "net_dns_tunnel_long_labels", title: "DNS tunnelling: unusually long subdomain labels", level: "medium", status: "experimental", technique: "T1071.004", tactic: "Command and Control", logsource: "dns / fortigate", hits: 0, fp: 0.0, enabled: false, author: PEOPLE[7], modified: "Oct 17", exclusions: [], detection: "selection:\n  class_uid: 4003\n  query.hostname|re: '^[a-z0-9]{40,}\\\\.'\ncondition: selection" },
];

const RULE_STATUS_TONE: Record<Rule["status"], Tone> = { stable: "success", test: "info", experimental: "warning" };

function RulesPage() {
  const [rules, setRules] = useState(RULES);
  const [sel, setSel] = useState(RULES[1]!.id);
  const [levels, setLevels] = useState<string[]>([]);
  const [state, setState] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [exField, setExField] = useState("src_endpoint.ip");
  const [exValue, setExValue] = useState("");
  const [tested, setTested] = useState<string | null>(null);
  const rule = rules.find((r) => r.id === sel)!;
  const shown = rules.filter(
    (r) =>
      (levels.length === 0 || levels.includes(r.level)) &&
      (state.length === 0 || state.includes(r.enabled ? "enabled" : "disabled")) &&
      (!q || `${r.title} ${r.id} ${r.technique}`.toLowerCase().includes(q.toLowerCase())),
  );
  const update = (id: string, patch: Partial<Rule>) => setRules((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const enabledCount = rules.filter((r) => r.enabled).length;
  const cols: Column<Rule>[] = [
    {
      id: "on",
      header: <span className="sr-only">Enabled</span>,
      label: "Enabled",
      width: "64px",
      hideable: false,
      cell: (r) => <Switch checked={r.enabled} onCheckedChange={(v) => update(r.id, { enabled: v })} label={<span className="sr-only">Enable {r.title}</span>} />,
    },
    {
      id: "title",
      header: "Rule",
      width: "34%",
      sortValue: (r) => r.title,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" className="truncate text-left font-medium text-fg hover:underline">
            {r.title}
          </button>
          <span className="truncate font-mono text-2xs text-fg-muted">{r.id}</span>
        </span>
      ),
    },
    { id: "level", header: "Level", width: "104px", sortValue: (r) => SEVERITY_META[r.level].rank, cell: (r) => <SeverityBadge severity={r.level} /> },
    {
      id: "attack",
      header: "ATT&CK",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-mono text-2xs text-fg-muted">{r.technique}</span>
          <span className="text-xs">{r.tactic}</span>
        </span>
      ),
    },
    { id: "src", header: "Log source", mono: true, cell: (r) => <span className="text-xs">{r.logsource}</span> },
    { id: "hits", header: "Hits · 24 h", align: "right", mono: true, sortValue: (r) => r.hits, cell: (r) => r.hits.toLocaleString("en-US") },
    {
      id: "fp",
      header: "FP rate",
      align: "right",
      mono: true,
      description: "Share of this rule's signals closed as false positive in the last 30 days.",
      sortValue: (r) => r.fp,
      cell: (r) => <span className={r.fp >= 0.5 ? "text-warning-text" : undefined}>{Math.round(r.fp * 100)}%</span>,
    },
    { id: "status", header: "Maturity", cell: (r) => <Badge tone={RULE_STATUS_TONE[r.status]}>{r.status}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title="Rules"
        description="Sigma rules compiled to OCSF queries · SigmaHQ r2026-10-01 plus 38 custom"
        actions={
          <>
            <Button icon={<RefreshCw />}>Sync SigmaHQ</Button>
            <Button variant="primary" icon={<Plus />}>
              New rule
            </Button>
          </>
        }
      />
      <KpiGrid minWidth={160}>
        <KpiCard label="Enabled" value={(1228 - (RULES.filter((r) => r.enabled).length - enabledCount)).toLocaleString("en-US")} unit="of 1,240" />
        <KpiCard label="Fired · 24 h" value="64" unit="rules" trend={wave(12, { base: 60, amp: 8, seed: 91 })} />
        <KpiCard label="Noisy" value="3" unit="FP ≥ 50%" tone="warning" delta={{ label: "Tune or lower level" }} />
        <KpiCard label="ATT&CK techniques" value="187" unit="covered" delta={{ label: "+6 this month", direction: "up", intent: "good" }} />
      </KpiGrid>
      <FilterBar onClear={levels.length || state.length || q ? () => (setLevels([]), setState([]), setQ("")) : undefined}>
        <SearchInput label="Search rules" className="w-60" value={q} onChange={(e) => setQ(e.target.value)} />
        <FacetFilter label="Level" selected={levels} onChange={setLevels} options={(["critical", "high", "medium", "low"] as const).map((l) => ({ value: l, label: SEVERITY_META[l].label, count: rules.filter((r) => r.level === l).length }))} />
        <FacetFilter label="State" selected={state} onChange={setState} options={[{ value: "enabled", label: "Enabled", count: enabledCount }, { value: "disabled", label: "Disabled", count: rules.length - enabledCount }]} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <Panel title="Rules" description={`${shown.length} shown · ${enabledCount} of ${rules.length} enabled`} flush>
          <DataTable label="Detection rules" columns={cols} rows={shown} getRowId={(r) => r.id} onRowClick={(r) => (setSel(r.id), setTested(null))} activeRowId={sel} defaultSort={{ id: "level", direction: "desc" }} minWidth={980} />
        </Panel>
        <Panel
          aria-label="Rule detail"
          title={rule.title}
          description={<span className="font-mono">{rule.id}</span>}
          actions={<StatusBadge tone={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "Enabled" : "Disabled"}</StatusBadge>}
          footer={
            <span className="flex flex-wrap items-center gap-1.5">
              <Button size="sm" variant="primary" icon={<FlaskConical />} onClick={() => setTested(rule.id)}>
                Test against last 24 h
              </Button>
              <Button size="sm">Edit YAML</Button>
              <Button size="sm" variant="ghost">
                Duplicate
              </Button>
            </span>
          }
        >
          <div className="flex flex-col gap-2.5 text-sm">
            {tested === rule.id && (
              <Callout tone={rule.hits ? "warning" : "success"} title={rule.hits ? `${rule.hits.toLocaleString("en-US")} matches in the last 24 h` : "No matches in the last 24 h"}>
                {rule.hits
                  ? `Across ${Math.min(3, rule.hits)} entities · ${rule.exclusions.length} exclusion${rule.exclusions.length === 1 ? "" : "s"} suppressed ${Math.round(rule.hits * 0.08)} more · query took 1.8 s`
                  : "Ran over 41.2 M events in 2.1 s. The rule compiles and is safe to enable."}
              </Callout>
            )}
            <div className="flex flex-wrap items-center gap-1.5">
              <SeverityBadge severity={rule.level} />
              <Badge tone={RULE_STATUS_TONE[rule.status]}>{rule.status}</Badge>
              <Badge mono>{rule.technique}</Badge>
              <Badge>{rule.tactic}</Badge>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <dt className="text-fg-muted">Log source</dt>
              <dd className="font-mono">{rule.logsource}</dd>
              <dt className="text-fg-muted">Author</dt>
              <dd>{rule.author}</dd>
              <dt className="text-fg-muted">Modified</dt>
              <dd>{rule.modified}, 2026</dd>
            </dl>
            <pre role="region" aria-label="Sigma detection" tabIndex={0} className="m-0 max-h-48 overflow-auto rounded-md border border-line bg-subtle px-2.5 py-2 font-mono text-xs text-fg">
              {`title: ${rule.title}\nlevel: ${rule.level}\ntags: [attack.${rule.technique.toLowerCase()}]\ndetection:\n${rule.detection
                .split("\n")
                .map((l) => `  ${l}`)
                .join("\n")}`}
            </pre>
            <div className="flex flex-col gap-1.5">
              <h3 className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Tuning · exclusions</h3>
              <div className="flex flex-wrap gap-1.5">
                {rule.exclusions.length === 0 && <span className="text-xs text-fg-muted">No exclusions</span>}
                {rule.exclusions.map((x) => (
                  <FilterChip key={x.field + x.value} field={x.field} value={x.value} negate onRemove={() => update(rule.id, { exclusions: rule.exclusions.filter((e) => e !== x) })} />
                ))}
              </div>
              <form
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-1.5"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!exValue) return;
                  update(rule.id, { exclusions: [...rule.exclusions.filter((x) => x.field !== exField), { field: exField, value: exValue }] });
                  setExValue("");
                }}
              >
                <SelectField
                  label="Field"
                  value={exField}
                  onChange={(e) => setExField(e.target.value)}
                  options={["src_endpoint.ip", "device.hostname", "actor.user.name", "process.name"].map((f) => ({ value: f, label: f }))}
                />
                <TextField label="Value" mono placeholder="10.20.0.0/16" value={exValue} onChange={(e) => setExValue(e.target.value)} />
                <Button type="submit" size="md">
                  Add exclusion
                </Button>
              </form>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Threat intel: IOC matches from the Threat Intel product              */
/* ------------------------------------------------------------------ */

type IocType = "ip" | "domain" | "url" | "hash";

interface IocMatch {
  id: string;
  type: IocType;
  value: string;
  feed: string;
  threat: string;
  confidence: number;
  hits: number;
  entity: string;
  first: string;
  signal?: string;
}

const IOC_MATCHES: IocMatch[] = [
  { id: "m1", type: "ip", value: "203.0.113.24", feed: "abuse.ch Feodo Tracker", threat: "QakBot C2", confidence: 95, hits: 312, entity: HOSTS[3], first: "13:12", signal: "sig-1041" },
  { id: "m2", type: "domain", value: "xk2-update.example.com", feed: "OpenAsy Threat Intel", threat: "Newly registered · typosquat", confidence: 70, hits: 27, entity: HOSTS[1], first: "08:40", signal: "sig-1031" },
  { id: "m3", type: "hash", value: "9f2c41d0…e1a4", feed: "MalwareBazaar", threat: "XMRig miner", confidence: 100, hits: 4, entity: HOSTS[4], first: "13:51", signal: "sig-1040" },
  { id: "m4", type: "ip", value: "192.0.2.44", feed: "AbuseIPDB", threat: "SSH brute force · 1,420 reports", confidence: 88, hits: 1284, entity: HOSTS[0], first: "13:30", signal: "sig-1038" },
  { id: "m5", type: "url", value: "http://198.51.100.96/x/kworkerd", feed: "abuse.ch URLhaus", threat: "Malware download", confidence: 92, hits: 2, entity: HOSTS[4], first: "13:50" },
  { id: "m6", type: "ip", value: "198.51.100.201", feed: "MISP · CIRCL OSINT", threat: "Mass scanner", confidence: 60, hits: 9402, entity: "edge firewall", first: "Yesterday" },
];

const FEEDS = [
  { name: "OpenAsy Threat Intel", count: "412,906", sync: "4 min ago", ok: true },
  { name: "abuse.ch Feodo Tracker", count: "1,284", sync: "12 min ago", ok: true },
  { name: "abuse.ch URLhaus", count: "88,410", sync: "12 min ago", ok: true },
  { name: "MalwareBazaar", count: "640,112", sync: "1 h ago", ok: true },
  { name: "AbuseIPDB", count: "10,000", sync: "6 h ago", ok: false },
  { name: "MISP · CIRCL OSINT", count: "212,705", sync: "30 min ago", ok: true },
];

const IOC_KIND = { ip: "ip", domain: "url", url: "url", hash: "process" } as const;

function ThreatIntelPage() {
  const [type, setType] = useState<"all" | IocType>("all");
  const [hunt, setHunt] = useState(false);
  const rows = IOC_MATCHES.filter((m) => type === "all" || m.type === type);
  const cols: Column<IocMatch>[] = [
    {
      id: "ioc",
      header: "Indicator",
      width: "28%",
      cell: (m) => (
        <span className="flex min-w-0 flex-col gap-0.5">
          <EntityChip kind={IOC_KIND[m.type]} value={m.value} hideKind className="self-start" />
          <span className="truncate text-2xs text-fg-muted">{m.threat}</span>
        </span>
      ),
    },
    { id: "type", header: "Type", width: "84px", cell: (m) => <Badge mono>{m.type}</Badge> },
    { id: "feed", header: "Feed", sortValue: (m) => m.feed, cell: (m) => <span className="text-xs">{m.feed}</span> },
    {
      id: "conf",
      header: "Confidence",
      align: "right",
      mono: true,
      description: "Feed confidence after OpenAsy scoring (age, sightings, source reputation).",
      sortValue: (m) => m.confidence,
      cell: (m) => `${m.confidence}%`,
    },
    { id: "hits", header: "Hits", align: "right", mono: true, sortValue: (m) => m.hits, cell: (m) => m.hits.toLocaleString("en-US") },
    { id: "entity", header: "Seen on", cell: (m) => (m.entity.includes("-") ? <EntityChip kind="host" value={m.entity} /> : <span className="text-xs text-fg-muted">{m.entity}</span>) },
    { id: "first", header: "First match", align: "right", cell: (m) => <span className="whitespace-nowrap text-fg-muted">{m.first}</span> },
    { id: "signal", header: "Signal", cell: (m) => (m.signal ? <a href={`#${m.signal}`} className="font-mono text-xs text-accent-text">{m.signal}</a> : <span className="text-fg-muted">—</span>) },
  ];
  return (
    <>
      <PageHeader
        title="Threat intel"
        description="Indicators from Threat Intel matched against every event as it is ingested"
        actions={
          <>
            <Button icon={<Radar />} onClick={() => setHunt(true)}>
              Hunt retroactively
            </Button>
            <a href="#threat-intel" className="inline-flex h-8 items-center rounded-md bg-accent px-3 text-sm font-medium text-accent-contrast no-underline hover:bg-accent-hover">
              Open Threat Intel
            </a>
          </>
        }
      />
      {hunt && (
        <Callout tone="info" title="Retro hunt queued" onDismiss={() => setHunt(false)}>
          1,366,417 indicators over 90 days of archived events · results in about 12 minutes.
        </Callout>
      )}
      <KpiGrid minWidth={160}>
        <KpiCard label="Active indicators" value="1.37M" unit="6 feeds" />
        <KpiCard label="Matches · 24 h" value="11,031" trend={wave(12, { base: 600, amp: 400, seed: 95, spike: 2000, spikeAt: 9 })} trendColor="var(--oa-danger)" />
        <KpiCard label="Unique indicators hit" value={IOC_MATCHES.length} tone="danger" delta={{ label: "+2 in the last hour", direction: "up", intent: "bad" }} />
        <KpiCard label="Blocked at edge" value="9,402" unit="connections" tone="success" delta={{ label: "Pushed to FortiGate and WAF" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel
          title="Indicator matches"
          description="Last 24 h · grouped by indicator"
          actions={
            <SegmentedControl
              label="Indicator type"
              value={type}
              onChange={setType}
              options={[
                { value: "all", label: "All" },
                { value: "ip", label: "IP" },
                { value: "domain", label: "Domain" },
                { value: "url", label: "URL" },
                { value: "hash", label: "Hash" },
              ]}
            />
          }
          flush
        >
          <DataTable label="Indicator matches" columns={cols} rows={rows} getRowId={(m) => m.id} defaultSort={{ id: "conf", direction: "desc" }} minWidth={980} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Feeds" description="Synced from Threat Intel" flush>
            <ul className="flex flex-col" aria-label="Threat intel feeds">
              {FEEDS.map((f) => (
                <li key={f.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-3 py-1.5 last:border-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium">{f.name}</span>
                    <span className="text-2xs text-fg-muted">
                      {f.count} indicators · synced {f.sync}
                    </span>
                  </span>
                  {f.ok ? <StatusBadge tone="success">OK</StatusBadge> : <StatusBadge tone="warning">Rate limited</StatusBadge>}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Top threats · 7 days">
            <BarList
              label="Top matched threats in the last 7 days"
              items={[
                { id: "qak", label: "QakBot C2", value: 1840 },
                { id: "ssh", label: "SSH brute force", value: 1284 },
                { id: "scan", label: "Mass scanner", value: 940 },
                { id: "xmr", label: "XMRig miner", value: 12 },
              ]}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sources: ingest health                                              */
/* ------------------------------------------------------------------ */

interface IngestSource {
  id: string;
  name: string;
  kind: string;
  classes: string[];
  eps: number;
  gbDay: number;
  lag: string;
  errors: number;
  last: string;
  status: "ok" | "lagging" | "silent";
  seed: number;
}

const INGEST: IngestSource[] = [
  { id: "logs", name: "OpenAsy Logs", kind: "Native · OCSF", classes: ["Authentication", "Process Activity", "File System Activity"], eps: 1840, gbDay: 96.4, lag: "1.2 s", errors: 0.01, last: "now", status: "ok", seed: 101 },
  { id: "fortigate", name: "FortiGate 200F", kind: "Syslog CEF · TLS 6514", classes: ["Network Activity", "DNS Activity"], eps: 960, gbDay: 51.8, lag: "2.0 s", errors: 0.12, last: "now", status: "ok", seed: 102 },
  { id: "cloudtrail", name: "AWS CloudTrail", kind: "S3 + SQS · eu-central-1", classes: ["API Activity", "Authentication"], eps: 210, gbDay: 18.2, lag: "4 min", errors: 0.0, last: "1 min ago", status: "lagging", seed: 103 },
  { id: "vpn", name: "OpenAsy VPN", kind: "Native · OCSF", classes: ["Authentication", "Network Activity"], eps: 42, gbDay: 2.9, lag: "0.8 s", errors: 0.0, last: "now", status: "ok", seed: 104 },
  { id: "malware", name: "OpenAsy Malware", kind: "Native · OCSF", classes: ["Detection Finding"], eps: 3, gbDay: 0.2, lag: "0.6 s", errors: 0.0, last: "now", status: "ok", seed: 105 },
  { id: "m365", name: "Microsoft 365 audit", kind: "Management Activity API", classes: ["API Activity", "Authentication"], eps: 64, gbDay: 4.1, lag: "9 min", errors: 1.4, last: "6 min ago", status: "lagging", seed: 106 },
  { id: "keycloak", name: "Keycloak", kind: "Events webhook", classes: ["Authentication", "API Activity"], eps: 0, gbDay: 0, lag: "—", errors: 0.0, last: "12:02", status: "silent", seed: 107 },
];

const INGEST_STATUS = { ok: { label: "Receiving", tone: "success" }, lagging: { label: "Lagging", tone: "warning" }, silent: { label: "Silent", tone: "danger" } } as const;

function SourcesPage() {
  const [sel, setSel] = useState<IngestSource>(INGEST[0]!);
  const [tested, setTested] = useState(false);
  const series = (s: IngestSource) => (s.status === "silent" ? wave(24, { base: 30, amp: 10, seed: s.seed }).map((v, i) => (i >= 22 ? 0 : v)) : wave(24, { base: s.eps, amp: s.eps * 0.35, seed: s.seed }));
  const cols: Column<IngestSource>[] = [
    {
      id: "name",
      header: "Source",
      pinned: "left",
      width: "22%",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" className="truncate text-left font-medium text-fg hover:underline">
            {s.name}
          </button>
          <span className="truncate text-2xs text-fg-muted">{s.kind}</span>
        </span>
      ),
    },
    { id: "classes", header: "OCSF classes", description: "Event classes this source's parser emits.", cell: (s) => <span className="flex flex-wrap gap-1">{s.classes.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}</span> },
    { id: "trend", header: "24 h", width: "110px", cell: (s) => <Sparkline data={series(s)} label={`${s.name} events per second, last 24 h`} height={24} /> },
    { id: "eps", header: "Events/s", align: "right", mono: true, sortValue: (s) => s.eps, cell: (s) => s.eps.toLocaleString("en-US") },
    { id: "gb", header: "GB/day", align: "right", mono: true, sortValue: (s) => s.gbDay, cell: (s) => s.gbDay.toFixed(1) },
    { id: "lag", header: "Lag", align: "right", mono: true, description: "Delay between the event time and indexing.", cell: (s) => s.lag },
    { id: "err", header: "Parse errors", align: "right", mono: true, sortValue: (s) => s.errors, cell: (s) => <span className={s.errors >= 1 ? "text-warning-text" : undefined}>{s.errors.toFixed(2)}%</span> },
    { id: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <StatusBadge tone={INGEST_STATUS[s.status].tone}>{INGEST_STATUS[s.status].label}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Sources"
        description="Everything that sends events, how fast, and how well it parses into OCSF"
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add source
          </Button>
        }
      />
      <Callout tone="warning" title="Keycloak has sent no events since 12:02" action={<Button size="sm" onClick={() => setSel(INGEST[6]!)}>Investigate</Button>}>
        The webhook endpoint answers 401 since the realm signing key was rotated. Authentication rules for SSO are blind.
      </Callout>
      <KpiGrid minWidth={160}>
        <KpiCard label="Ingest rate" value="3,119" unit="events/s" trend={wave(24, { base: 3100, amp: 900, seed: 110 })} />
        <KpiCard label="Volume · 24 h" value="173.6" unit="GB of 250 GB" delta={{ label: "69% of licence" }} />
        <KpiCard label="Parse errors" value="0.06%" tone="success" delta={{ label: "1,640 events to dead-letter" }} />
        <KpiCard label="Unhealthy sources" value="3" unit="of 7" tone="warning" delta={{ label: "1 silent, 2 lagging", direction: "up", intent: "bad" }} />
      </KpiGrid>
      <Panel title="Sources" description="Click a source for throughput and parser samples" flush>
        <DataTable label="Ingest sources" columns={cols} rows={INGEST} getRowId={(s) => s.id} onRowClick={(s) => (setSel(s), setTested(false))} activeRowId={sel.id} minWidth={1060} />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel aria-label="Source detail" title={sel.name} description={`${sel.kind} · last event ${sel.last}`} actions={<StatusBadge tone={INGEST_STATUS[sel.status].tone}>{INGEST_STATUS[sel.status].label}</StatusBadge>}>
          <TimeSeriesChart
            label={`Events per second from ${sel.name}, last 24 h`}
            labels={timeLabels(24, 60)}
            height={160}
            xTicks={6}
            format={(v) => `${Math.round(v)}/s`}
            series={[{ id: sel.id, name: "Events/s", data: series(sel) }]}
          />
        </Panel>
        <Panel
          title="Connection"
          footer={
            <span className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => setTested(true)}>
                Send test event
              </Button>
              {tested && (
                <span role="status" className={sel.status === "silent" ? "text-xs text-danger-text" : "text-xs text-success"}>
                  {sel.status === "silent" ? "Failed: 401 Unauthorized from webhook" : "Test event indexed in 1.4 s"}
                </span>
              )}
            </span>
          }
        >
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
            <dt className="text-fg-muted">Collector</dt>
            <dd>{sel.kind}</dd>
            <dt className="text-fg-muted">Parser</dt>
            <dd className="font-mono">{sel.id}-ocsf v2.3</dd>
            <dt className="text-fg-muted">Retention</dt>
            <dd>30 days hot · 400 days archive</dd>
            <dt className="text-fg-muted">Lag</dt>
            <dd className="font-mono">{sel.lag}</dd>
            <dt className="text-fg-muted">Parse errors</dt>
            <dd className="font-mono">{sel.errors.toFixed(2)}%</dd>
          </dl>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Reports: scheduled reports and ATT&CK coverage                       */
/* ------------------------------------------------------------------ */

interface Report {
  id: string;
  name: string;
  kind: string;
  schedule: string;
  recipients: string;
  format: "PDF" | "CSV";
  last: string;
  next: string;
  enabled: boolean;
}

const REPORTS: Report[] = [
  { id: "r1", name: "Weekly SOC summary", kind: "Signals, MTTA, MTTR, top rules", schedule: "Mondays 08:00", recipients: "soc@example.com", format: "PDF", last: "Oct 13 · 412 KB", next: "Oct 20 08:00", enabled: true },
  { id: "r2", name: "PCI DSS 4.0 Req. 10 log review", kind: "Compliance evidence", schedule: "Daily 06:00", recipients: emailOf(PEOPLE[3]), format: "PDF", last: "Today 06:00 · 1.1 MB", next: "Tomorrow 06:00", enabled: true },
  { id: "r3", name: "Privileged access changes", kind: "IAM and realm admin grants", schedule: "Daily 07:30", recipients: "iam-owners@example.com", format: "CSV", last: "Today 07:30 · 18 KB", next: "Tomorrow 07:30", enabled: true },
  { id: "r4", name: "GDPR Art. 33 breach evidence", kind: "Personal data access timeline", schedule: "On demand", recipients: "dpo@example.com", format: "PDF", last: "Aug 2 · 2.4 MB", next: "—", enabled: true },
  { id: "r5", name: "ISO/IEC 27001 A.8.15 logging", kind: "Source coverage and retention", schedule: "1st of month", recipients: emailOf(PEOPLE[1]), format: "PDF", last: "Oct 1 · 640 KB", next: "Nov 1 08:00", enabled: true },
  { id: "r6", name: "Noisy rules digest", kind: "FP rate and tuning backlog", schedule: "Fridays 16:00", recipients: "detection-eng@example.com", format: "CSV", last: "Oct 17 · 6 KB", next: "Oct 24 16:00", enabled: false },
];

const COVERAGE = [
  { tactic: "Initial Access", pct: 78 },
  { tactic: "Execution", pct: 64 },
  { tactic: "Persistence", pct: 71 },
  { tactic: "Privilege Escalation", pct: 58 },
  { tactic: "Defense Evasion", pct: 41 },
  { tactic: "Credential Access", pct: 82 },
  { tactic: "Discovery", pct: 36 },
  { tactic: "Lateral Movement", pct: 47 },
  { tactic: "Collection", pct: 29 },
  { tactic: "Command and Control", pct: 69 },
  { tactic: "Exfiltration", pct: 44 },
  { tactic: "Impact", pct: 52 },
];

const GAPS = [
  { id: "T1557", name: "Adversary-in-the-Middle", why: "No ARP or DHCP telemetry ingested" },
  { id: "T1027", name: "Obfuscated Files or Information", why: "Needs process command-line from Windows hosts" },
  { id: "T1567.002", name: "Exfiltration to Cloud Storage", why: "Proxy logs not connected" },
  { id: "T1021.001", name: "Remote Desktop Protocol", why: "Windows security log not collected" },
];

function ReportsPage() {
  const [tab, setTab] = useState<"scheduled" | "coverage">("scheduled");
  const [reports, setReports] = useState(REPORTS);
  const [running, setRunning] = useState("");
  const cols: Column<Report>[] = [
    {
      id: "name",
      header: "Report",
      width: "30%",
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{r.name}</span>
          <span className="truncate text-2xs text-fg-muted">{r.kind}</span>
        </span>
      ),
    },
    { id: "schedule", header: "Schedule", cell: (r) => r.schedule },
    { id: "to", header: "Recipients", cell: (r) => <span className="truncate font-mono text-xs">{r.recipients}</span> },
    { id: "format", header: "Format", width: "80px", cell: (r) => <Badge mono>{r.format}</Badge> },
    { id: "last", header: "Last run", cell: (r) => <span className="text-fg-muted">{r.last}</span> },
    { id: "next", header: "Next run", cell: (r) => (r.enabled ? r.next : <span className="text-fg-muted">Paused</span>) },
    {
      id: "on",
      header: "Active",
      width: "72px",
      cell: (r) => <Switch checked={r.enabled} onCheckedChange={(v) => setReports((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))} label={<span className="sr-only">Schedule {r.name}</span>} />,
    },
    {
      id: "run",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "112px",
      align: "right",
      hideable: false,
      cell: (r) => (
        <Button size="xs" icon={<Play />} aria-label={`Run now: ${r.name}`} onClick={() => setRunning(r.name)}>
          Run now
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Reports"
        description="Scheduled reports, compliance evidence and detection coverage"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New report
          </Button>
        }
      >
        <Tabs
          label="Report views"
          value={tab}
          onChange={setTab}
          items={[
            { value: "scheduled", label: "Scheduled", count: reports.length },
            { value: "coverage", label: "ATT&CK coverage" },
          ]}
        />
      </PageHeader>
      {running && (
        <Callout tone="success" title={`Generating ${running}`} onDismiss={() => setRunning("")}>
          It will be emailed and kept under Reports for 400 days.
        </Callout>
      )}
      {tab === "scheduled" ? (
        <>
          <KpiGrid minWidth={160}>
            <KpiCard label="Scheduled" value={reports.filter((r) => r.enabled).length} unit="active" />
            <KpiCard label="Sent · 30 days" value="94" unit="reports" />
            <KpiCard label="Delivery failures" value="0" tone="success" />
            <KpiCard label="Evidence archive" value="2.8" unit="GB · WORM" delta={{ label: "Object Lock, 400 days" }} />
          </KpiGrid>
          <Panel title="Scheduled reports" flush>
            <DataTable label="Scheduled reports" columns={cols} rows={reports} getRowId={(r) => r.id} minWidth={1040} />
          </Panel>
        </>
      ) : (
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Panel title="Coverage by tactic" description="Share of ATT&CK Enterprise v16 techniques with at least one enabled rule">
            <BarList label="ATT&CK technique coverage by tactic" max={100} format={(v) => `${v}%`} items={COVERAGE.map((c) => ({ id: c.tactic, label: c.tactic, value: c.pct, color: c.pct < 40 ? "var(--oa-warning)" : undefined }))} />
          </Panel>
          <Panel title="Largest gaps" description="Techniques seen in recent threat reports with no rule" flush>
            <ul className="flex flex-col" aria-label="Coverage gaps">
              {GAPS.map((g) => (
                <li key={g.id} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 border-b border-subtle px-3 py-2 last:border-0">
                  <span className="font-mono text-xs text-fg-muted">{g.id}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm font-medium">{g.name}</span>
                    <span className="text-2xs text-fg-muted">{g.why}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Pages and stories                                                   */
/* ------------------------------------------------------------------ */

const PAGES: PageMap = {
  signals: () => <SignalsPage />,
  search: () => <SearchPage />,
  rules: () => <RulesPage />,
  intel: () => <ThreatIntelPage />,
  sources: () => <SourcesPage />,
  reports: () => <ReportsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="siem" nav={nav} pages={PAGES} initial={initial} /> });

export const Signals: Story = { ...app("signals"), play: SIGNALS_PLAY };

export const EventSearch: Story = {
  name: "Search",
  ...app("search"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Search results" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(EVENTS.filter((e) => e.cls === "Authentication").length);
    await userEvent.click(within(c.getByRole("region", { name: "OCSF fields" })).getByRole("button", { name: /^Failure/ }));
    await expect(c.getByRole("textbox", { name: "OCSF query" })).toHaveValue("class_name:Authentication status:Failure");
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
    await userEvent.click(within(table).getByRole("button", { name: /Accepted password|TOTP verification failed/ }));
    await expect(within(c.getByRole("region", { name: "Raw OCSF event" })).getByText(/"class_uid": 3002/)).toBeInTheDocument();
  },
};

export const Rules: Story = {
  ...app("rules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = () => within(c.getByRole("region", { name: "Rule detail" }));
    await userEvent.click(within(c.getByRole("table", { name: "Detection rules" })).getByRole("button", { name: "AWS console sign-in without MFA" }));
    await expect(detail().getByRole("heading", { name: "AWS console sign-in without MFA" })).toBeInTheDocument();
    await userEvent.click(detail().getByRole("button", { name: "Test against last 24 h" }));
    await expect(detail().getByText("3 matches in the last 24 h")).toBeInTheDocument();
    await userEvent.type(detail().getByRole("textbox", { name: "Value" }), "198.51.100.0/24");
    await userEvent.click(detail().getByRole("button", { name: "Add exclusion" }));
    await expect(detail().getByText("198.51.100.0/24")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Enable AWS console sign-in without MFA" }));
    await expect(detail().getByText("Disabled")).toBeInTheDocument();
  },
};

export const ThreatIntel: Story = {
  name: "Threat intel",
  ...app("intel"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Indicator matches" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(IOC_MATCHES.length);
    await userEvent.click(c.getByRole("radio", { name: "IP" }));
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(3);
    await userEvent.click(c.getByRole("button", { name: "Hunt retroactively" }));
    await expect(c.getByText("Retro hunt queued")).toBeInTheDocument();
    await expect(c.getByRole("link", { name: "Open Threat Intel" })).toHaveAttribute("href", "#threat-intel");
  },
};

export const Sources: Story = {
  ...app("sources"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = () => within(c.getByRole("region", { name: "Source detail" }));
    await expect(detail().getByRole("heading", { name: "OpenAsy Logs" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Investigate" }));
    await expect(detail().getByRole("heading", { name: "Keycloak" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Send test event" }));
    await expect(c.getByText("Failed: 401 Unauthorized from webhook")).toBeInTheDocument();
  },
};

export const Reports: Story = {
  ...app("reports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Run now: Weekly SOC summary" }));
    await expect(c.getByText("Generating Weekly SOC summary")).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /ATT&CK coverage/ }));
    await expect(c.getByRole("list", { name: "ATT&CK technique coverage by tactic" })).toHaveTextContent("Credential Access");
    await expect(c.getByRole("list", { name: "Coverage gaps" })).toHaveTextContent("T1557");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
