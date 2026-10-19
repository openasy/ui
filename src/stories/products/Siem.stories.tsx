import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookOpen, Database, FileBarChart, Plus, Radar, Search, ShieldAlert, Workflow } from "lucide-react";
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
import { EntityChip } from "../../components/EntityChip";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
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
export const Signals: Story = {
  render: () => {
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
      <ProductFrame product="siem" nav={nav} active="signals">
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
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
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
  },
};
