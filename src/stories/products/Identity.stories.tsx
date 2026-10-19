import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AppWindow, Building2, Fingerprint, KeyRound, LayoutGrid, Mail, Palette, Plus, RefreshCw, ScrollText, ShieldCheck, Smartphone, Users, UsersRound } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, LevelBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import type { LogLevel, Tone } from "../../tokens/levels";
import { DOC_IPS, PEOPLE, emailOf, timeLabels, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "applications", label: "Applications", icon: AppWindow, count: 9 },
  { id: "users", label: "Users", icon: Users, count: 214 },
  { id: "groups", label: "Groups", icon: UsersRound, count: 18 },
  { id: "providers", label: "Providers", icon: Building2, count: 3 },
  { id: "mfa", label: "MFA", icon: Smartphone },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "audit", label: "Audit", icon: ScrollText },
];

const meta = {
  title: "Products/Identity",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type Protocol = "OIDC" | "SAML 2.0";

interface App {
  id: string;
  name: string;
  protocol: Protocol;
  redirect: string;
  users: number;
  lastUsed: string;
  lastUsedMin: number;
}

const apps: App[] = [
  { id: "vpn", name: "OpenAsy VPN", protocol: "OIDC", redirect: "https://vpn.example.com/oauth/callback", users: 214, lastUsed: "1 min ago", lastUsedMin: 1 },
  { id: "logs", name: "OpenAsy Logs", protocol: "OIDC", redirect: "https://logs.example.com/auth/oidc/callback", users: 96, lastUsed: "3 min ago", lastUsedMin: 3 },
  { id: "metrics", name: "OpenAsy Metrics", protocol: "OIDC", redirect: "https://metrics.example.com/auth/oidc/callback", users: 88, lastUsed: "6 min ago", lastUsedMin: 6 },
  { id: "grafana", name: "Grafana", protocol: "OIDC", redirect: "https://grafana.example.com/login/generic_oauth", users: 71, lastUsed: "12 min ago", lastUsedMin: 12 },
  { id: "jira", name: "Jira", protocol: "SAML 2.0", redirect: "https://acme.atlassian.net/plugins/servlet/samlconsumer", users: 187, lastUsed: "2 min ago", lastUsedMin: 2 },
  { id: "gitlab", name: "GitLab", protocol: "SAML 2.0", redirect: "https://gitlab.example.com/users/auth/saml/callback", users: 132, lastUsed: "4 min ago", lastUsedMin: 4 },
  { id: "keycloak", name: "Keycloak federation", protocol: "OIDC", redirect: "https://sso.example.com/realms/ops/broker/openasy/endpoint", users: 39, lastUsed: "38 min ago", lastUsedMin: 38 },
  { id: "aws", name: "AWS IAM Identity Center", protocol: "SAML 2.0", redirect: "https://signin.aws.amazon.com/saml", users: 24, lastUsed: "1 h ago", lastUsedMin: 60 },
  { id: "wiki", name: "Wiki.js", protocol: "OIDC", redirect: "https://wiki.example.com/login/oidc/callback", users: 143, lastUsed: "Yesterday", lastUsedMin: 1440 },
];

const columns: Column<App>[] = [
  {
    id: "name",
    header: "Application",
    width: "22%",
    sortValue: (a) => a.name,
    cell: (a) => (
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md bg-subtle text-2xs font-semibold text-fg">
          {a.name[0]}
        </span>
        <span className="truncate font-medium">{a.name}</span>
      </span>
    ),
  },
  {
    id: "proto",
    header: "Protocol",
    width: "100px",
    sortValue: (a) => a.protocol,
    cell: (a) => (
      <Badge tone={a.protocol === "OIDC" ? "info" : "neutral"} mono>
        {a.protocol}
      </Badge>
    ),
  },
  {
    id: "redirect",
    header: "Redirect URI",
    width: "38%",
    cell: (a) => (
      <span className="block truncate font-mono text-xs" title={a.redirect}>
        {a.redirect}
      </span>
    ),
  },
  { id: "users", header: "Users", align: "right", mono: true, sortValue: (a) => a.users, cell: (a) => a.users },
  { id: "last", header: "Last used", align: "right", sortValue: (a) => -a.lastUsedMin, cell: (a) => <span className="whitespace-nowrap text-fg-muted">{a.lastUsed}</span> },
];

interface Provider {
  id: string;
  name: string;
  detail: string;
  status: { label: string; tone: Tone };
  meta: string;
}

const providers: Provider[] = [
  { id: "kc", name: "Upstream Keycloak", detail: "OIDC · realm ops", status: { label: "Connected", tone: "success" }, meta: "39 users · last login 38 min ago" },
  { id: "ad", name: "Corporate AD", detail: "LDAP · ldaps://dc01.corp.example.com:636", status: { label: "Sync failed", tone: "danger" }, meta: "Bind failed: invalid credentials · 2 h ago" },
  { id: "gw", name: "Google Workspace", detail: "OIDC · example.com", status: { label: "Connected", tone: "success" }, meta: "152 users · synced 9 min ago" },
];

const N = 24;
const hours = timeLabels(N, 60);

type Source = "Google Workspace" | "Corporate AD" | "Keycloak" | "Local";
type UserStatus = "active" | "invited" | "disabled";
const USER_STATUS: Record<UserStatus, Tone> = { active: "success", invited: "info", disabled: "danger" };

interface User {
  id: string;
  name: string;
  source: Source;
  groups: string[];
  mfa: string[];
  last: string;
  status: UserStatus;
  admin?: boolean;
}

const EXTRA = ["Liam Turner", "Nina Patel", "Owen Price", "Grace Lee", "Tom Baker", "Ella Moore"];

const USERS: User[] = [
  { id: "u0", name: PEOPLE[0], source: "Google Workspace", groups: ["Engineering", "Database admins"], mfa: ["Passkey"], last: "2 min ago", status: "active" },
  { id: "u1", name: PEOPLE[1], source: "Google Workspace", groups: ["Security", "Admins"], mfa: ["Passkey", "TOTP"], last: "now", status: "active", admin: true },
  { id: "u2", name: PEOPLE[2], source: "Corporate AD", groups: ["SRE on-call", "Engineering"], mfa: ["TOTP"], last: "18 min ago", status: "active" },
  { id: "u3", name: PEOPLE[3], source: "Google Workspace", groups: ["Data team"], mfa: ["Security key"], last: "1 h ago", status: "active" },
  { id: "u4", name: PEOPLE[4], source: "Corporate AD", groups: ["Support"], mfa: [], last: "3 days ago", status: "active" },
  { id: "u5", name: PEOPLE[5], source: "Keycloak", groups: ["Engineering"], mfa: ["Passkey"], last: "35 min ago", status: "active" },
  { id: "u6", name: PEOPLE[6], source: "Google Workspace", groups: ["Finance"], mfa: ["TOTP"], last: "yesterday", status: "active" },
  { id: "u7", name: PEOPLE[7], source: "Keycloak", groups: ["Security", "SRE on-call"], mfa: ["Passkey", "Security key"], last: "6 min ago", status: "active", admin: true },
  { id: "u8", name: EXTRA[0]!, source: "Local", groups: ["Contractors"], mfa: [], last: "never", status: "invited" },
  { id: "u9", name: EXTRA[1]!, source: "Google Workspace", groups: ["Data team"], mfa: [], last: "never", status: "invited" },
  { id: "u10", name: EXTRA[2]!, source: "Corporate AD", groups: ["Support"], mfa: ["TOTP"], last: "41 days ago", status: "disabled" },
  { id: "u11", name: EXTRA[3]!, source: "Google Workspace", groups: ["Sales"], mfa: ["Passkey"], last: "4 h ago", status: "active" },
  { id: "u12", name: EXTRA[4]!, source: "Corporate AD", groups: ["Sales"], mfa: [], last: "2 days ago", status: "active" },
  { id: "u13", name: EXTRA[5]!, source: "Local", groups: ["Contractors"], mfa: ["TOTP"], last: "1 day ago", status: "active" },
];

interface Group {
  id: string;
  name: string;
  source: Source;
  members: number;
  apps: string[];
  rule: string;
  mfa: "Passkey only" | "Any second factor" | "Optional";
}

const GROUPS: Group[] = [
  { id: "g-eng", name: "Engineering", source: "Google Workspace", members: 92, apps: ["GitLab", "Grafana", "OpenAsy Logs", "OpenAsy Metrics", "Jira", "Wiki.js"], rule: "department = Engineering", mfa: "Any second factor" },
  { id: "g-sre", name: "SRE on-call", source: "Corporate AD", members: 14, apps: ["AWS IAM Identity Center", "OpenAsy VPN", "Grafana"], rule: "memberOf = CN=sre,OU=Groups", mfa: "Passkey only" },
  { id: "g-sec", name: "Security", source: "Google Workspace", members: 8, apps: ["OpenAsy Logs", "AWS IAM Identity Center", "Jira"], rule: "Manual", mfa: "Passkey only" },
  { id: "g-admins", name: "Admins", source: "Local", members: 4, apps: ["All applications"], rule: "Manual", mfa: "Passkey only" },
  { id: "g-dba", name: "Database admins", source: "Keycloak", members: 6, apps: ["OpenAsy VPN", "Grafana"], rule: "realm role dba", mfa: "Passkey only" },
  { id: "g-data", name: "Data team", source: "Google Workspace", members: 11, apps: ["Grafana", "Wiki.js", "Jira"], rule: "department = Data", mfa: "Any second factor" },
  { id: "g-support", name: "Support", source: "Corporate AD", members: 41, apps: ["Jira", "Wiki.js"], rule: "memberOf = CN=support,OU=Groups", mfa: "Any second factor" },
  { id: "g-sales", name: "Sales", source: "Google Workspace", members: 29, apps: ["Wiki.js"], rule: "department = Sales", mfa: "Optional" },
  { id: "g-contractors", name: "Contractors", source: "Local", members: 18, apps: ["OpenAsy VPN", "Jira"], rule: "Manual · expires after 90 days", mfa: "Any second factor" },
  { id: "g-finance", name: "Finance", source: "Google Workspace", members: 7, apps: ["Wiki.js"], rule: "department = Finance", mfa: "Any second factor" },
];

type Result = "success" | "failed" | "mfa-denied" | "blocked";
const RESULT: Record<Result, { label: string; tone: Tone; level: LogLevel }> = {
  success: { label: "Success", tone: "success", level: "info" },
  failed: { label: "Wrong password", tone: "danger", level: "error" },
  "mfa-denied": { label: "MFA denied", tone: "warning", level: "warn" },
  blocked: { label: "Blocked", tone: "danger", level: "error" },
};

interface SignIn {
  id: string;
  time: string;
  user: string;
  app: string;
  result: Result;
  method: string;
  ip: string;
  location: string;
  risk: "low" | "medium" | "high";
  kind: "sign-in" | "admin";
}

const SIGNINS: SignIn[] = [
  { id: "a1", time: "14:02:11", user: PEOPLE[1], app: "OpenAsy Logs", result: "success", method: "Passkey", ip: DOC_IPS[0], location: "London, GB", risk: "low", kind: "sign-in" },
  { id: "a2", time: "13:58:40", user: PEOPLE[4], app: "Jira", result: "failed", method: "Password", ip: DOC_IPS[6], location: "Unknown", risk: "high", kind: "sign-in" },
  { id: "a3", time: "13:58:21", user: PEOPLE[4], app: "Jira", result: "failed", method: "Password", ip: DOC_IPS[6], location: "Unknown", risk: "high", kind: "sign-in" },
  { id: "a4", time: "13:57:02", user: PEOPLE[4], app: "Jira", result: "blocked", method: "Password", ip: DOC_IPS[6], location: "Unknown", risk: "high", kind: "sign-in" },
  { id: "a5", time: "13:44:18", user: PEOPLE[0], app: "GitLab", result: "success", method: "Passkey", ip: DOC_IPS[1], location: "Dublin, IE", risk: "low", kind: "sign-in" },
  { id: "a6", time: "13:31:09", user: PEOPLE[1], app: "Identity admin", result: "success", method: "Passkey", ip: DOC_IPS[0], location: "London, GB", risk: "low", kind: "admin" },
  { id: "a7", time: "13:12:55", user: PEOPLE[3], app: "Grafana", result: "mfa-denied", method: "Push", ip: DOC_IPS[3], location: "Berlin, DE", risk: "medium", kind: "sign-in" },
  { id: "a8", time: "12:50:33", user: PEOPLE[7], app: "AWS IAM Identity Center", result: "success", method: "Security key", ip: DOC_IPS[5], location: "London, GB", risk: "low", kind: "sign-in" },
  { id: "a9", time: "12:40:01", user: PEOPLE[1], app: "Identity admin", result: "success", method: "Passkey", ip: DOC_IPS[0], location: "London, GB", risk: "low", kind: "admin" },
  { id: "a10", time: "12:22:47", user: PEOPLE[2], app: "OpenAsy VPN", result: "success", method: "TOTP", ip: DOC_IPS[2], location: "Manchester, GB", risk: "low", kind: "sign-in" },
  { id: "a11", time: "11:58:13", user: PEOPLE[6], app: "Wiki.js", result: "success", method: "TOTP", ip: DOC_IPS[4], location: "Lisbon, PT", risk: "medium", kind: "sign-in" },
  { id: "a12", time: "11:02:30", user: EXTRA[4]!, app: "Wiki.js", result: "success", method: "Password", ip: DOC_IPS[3], location: "Berlin, DE", risk: "medium", kind: "sign-in" },
];

const ADMIN_TEXT: Record<string, string> = {
  a6: "Changed Contractors group: MFA required",
  a9: "Rotated the SAML signing certificate for Jira",
};

function Person({ name, sub }: { name: string; sub?: string }) {
  return (
    <span className="flex items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-2xs text-fg-muted">{sub ?? emailOf(name)}</span>
      </span>
    </span>
  );
}

function ProviderList() {
  return (
    <ul aria-label="Identity providers" className="flex flex-col">
      {providers.map((p) => (
        <li key={p.id} className="flex items-start gap-2.5 border-b border-subtle px-3 py-2.5 last:border-0">
          <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
            {p.id === "ad" ? <Building2 className="size-4" /> : <KeyRound className="size-4" />}
          </span>
          <span className="flex min-w-0 grow flex-col">
            <span className="flex items-center gap-2">
              <span className="truncate text-sm font-medium">{p.name}</span>
              <StatusBadge tone={p.status.tone}>{p.status.label}</StatusBadge>
            </span>
            <span className="truncate font-mono text-2xs text-fg-muted">{p.detail}</span>
            <span className={p.status.tone === "danger" ? "text-xs text-danger-text" : "text-xs text-fg-muted"}>{p.meta}</span>
          </span>
          {p.status.tone === "danger" && (
            <IconButton label={`Retry sync for ${p.name}`} size="sm">
              <RefreshCw />
            </IconButton>
          )}
        </li>
      ))}
    </ul>
  );
}

/* --------------------------------------------------------------- Overview */

function OverviewPage() {
  const [range, setRange] = useState("24h");
  const risky = SIGNINS.filter((s) => s.risk !== "low");
  return (
    <>
      <PageHeader
        title="Overview"
        description="Issuer https://id.example.com · 214 users · 9 applications · 3 upstream providers"
        meta={<StatusBadge tone="warning">1 provider failing</StatusBadge>}
        actions={<SearchInput label="Search users or applications" shortcut="/" className="w-64" />}
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
      </FilterBar>
      <Callout tone="danger" title="Corporate AD has not synced for 2 hours">
        Bind failed with invalid credentials. 63 users from AD keep their last known groups until the next successful sync; disabled AD accounts are not disabled here yet.
      </Callout>
      <KpiGrid>
        <KpiCard label="Sign-ins · 24 h" value="3,412" unit="successful" trend={wave(24, { base: 140, amp: 90, seed: 61, phase: -1 })} delta={{ label: "+6% vs. yesterday", direction: "up", intent: "good" }} />
        <KpiCard label="Active sessions" value="186" unit="now" trend={wave(24, { base: 150, amp: 40, seed: 64 })} />
        <KpiCard label="MFA adoption" value="92%" unit="197 of 214" tone="success" delta={{ label: "17 without a second factor" }} />
        <KpiCard label="Risky sign-ins · 24 h" value={risky.length} tone="danger" trendColor="var(--oa-danger)" trend={[0, 1, 0, 0, 2, 1, 0, 3, 1, 0, 0, 1]} delta={{ label: "3 blocked from 198.51.100.201", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Sign-ins by result" description="Per hour, all applications">
          <TimeSeriesChart
            label="Sign-ins by result per hour"
            labels={hours}
            height={200}
            stacked
            series={[
              { id: "pk", name: "Passkey", data: wave(N, { base: 60, amp: 40, seed: 65, phase: -1 }) },
              { id: "totp", name: "TOTP", data: wave(N, { base: 50, amp: 30, seed: 66, phase: -1 }) },
              { id: "other", name: "Other", data: wave(N, { base: 20, amp: 10, seed: 67, phase: -1 }) },
            ]}
          />
        </Panel>
        <Panel title="Sign-ins by application" description="Last 24 h">
          <BarList label="Sign-ins by application" items={[...apps].sort((a, b) => b.users - a.users).slice(0, 7).map((a) => ({ id: a.id, label: a.name, value: a.users * 4 }))} />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Risky sign-ins" description="New location, impossible travel or repeated failures" flush>
          <ul aria-label="Risky sign-ins" className="flex flex-col">
            {risky.map((s) => (
              <li key={s.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <Badge tone={s.risk === "high" ? "danger" : "warning"}>{s.risk === "high" ? "High" : "Medium"}</Badge>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">
                    {s.user} · {s.app} · {RESULT[s.result].label}
                  </span>
                  <span className="truncate font-mono text-2xs text-fg-muted">
                    {s.ip} · {s.location} · {s.method}
                  </span>
                </span>
                <span className="font-mono text-2xs text-fg-muted">{s.time}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Providers" description="Upstream identity sources" flush>
          <ProviderList />
        </Panel>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- Applications */

/** Identity applications: sign-in KPIs, success vs. failure, registered apps and upstream providers. */
function ApplicationsPage() {
  const [range, setRange] = useState("24h");
  const [proto, setProto] = useState<"all" | "oidc" | "saml">("all");
  const rows = useMemo(() => apps.filter((a) => proto === "all" || (proto === "oidc" ? a.protocol === "OIDC" : a.protocol === "SAML 2.0")), [proto]);
  return (
    <>
      <PageHeader
        title="Applications"
        description="Issuer https://id.example.com · 9 applications · 3 upstream providers"
        actions={
          <>
            <SearchInput label="Search applications" className="w-60" />
            <Button size="md" variant="primary" icon={<Plus />}>
              Add application
            </Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <SegmentedControl
          label="Protocol"
          value={proto}
          onChange={setProto}
          options={[
            { value: "all", label: "All" },
            { value: "oidc", label: "OIDC" },
            { value: "saml", label: "SAML 2.0" },
          ]}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Sign-ins · 24 h" value="3,412" unit="successful" trend={wave(24, { base: 140, amp: 90, seed: 61, phase: -1 })} delta={{ label: "+6% vs. yesterday", direction: "up", intent: "good" }} />
        <KpiCard label="MFA adoption" value="92%" unit="197 of 214" tone="success" delta={{ label: "17 users without a second factor" }} />
        <KpiCard label="Passkeys" value="41%" unit="88 users" delta={{ label: "+9 this week", direction: "up", intent: "good" }} />
        <KpiCard
          label="Failed sign-ins · 24 h"
          value="37"
          unit="attempts"
          tone="danger"
          trendColor="var(--oa-danger)"
          trend={[1, 0, 2, 1, 0, 3, 1, 2, 9, 7, 4, 2]}
          delta={{ label: "14 from 198.51.100.201", direction: "up", intent: "bad" }}
        />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Sign-ins" description="Per hour, all applications">
          <TimeSeriesChart
            label="Sign-ins per hour, success versus failed"
            labels={hours}
            height={200}
            series={[
              { id: "ok", name: "Success", color: "var(--oa-success)", data: wave(N, { base: 140, amp: 90, seed: 62, phase: -1 }) },
              { id: "fail", name: "Failed", color: "var(--oa-danger)", data: wave(N, { base: 2, amp: 1, seed: 63, spike: 7, spikeAt: 16, spikeLen: 3 }) },
            ]}
          />
        </Panel>
        <Panel title="Providers" description="Upstream identity sources" actions={<Button size="sm" variant="ghost">Manage</Button>} flush>
          <ProviderList />
        </Panel>
      </div>
      <Panel title="Applications" description={`${rows.length} registered`} flush>
        <DataTable label="Applications" columns={columns} rows={rows} getRowId={(a) => a.id} defaultSort={{ id: "users", direction: "desc" }} minWidth={880} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ Users */

function UsersPage() {
  const [rows, setRows] = useState(USERS);
  const [q, setQ] = useState("");
  const [sources, setSources] = useState<string[]>([]);
  const [mfa, setMfa] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const shown = rows.filter(
    (u) =>
      `${u.name} ${emailOf(u.name)}`.toLowerCase().includes(q.toLowerCase()) &&
      (sources.length === 0 || sources.includes(u.source)) &&
      (mfa.length === 0 || (mfa.includes("none") && u.mfa.length === 0) || (mfa.includes("enrolled") && u.mfa.length > 0)),
  );
  const cols: Column<User>[] = [
    { id: "name", header: "User", pinned: "left", width: "24%", sortValue: (u) => u.name, cell: (u) => <Person name={u.name} /> },
    { id: "source", header: "Source", description: "Where the account comes from. Synced accounts are read-only here.", sortValue: (u) => u.source, cell: (u) => <span className="text-xs">{u.source}</span> },
    { id: "groups", header: "Groups", cell: (u) => <span className="flex flex-wrap gap-1">{u.groups.map((g) => <Badge key={g} variant="outline">{g}</Badge>)}</span> },
    {
      id: "mfa",
      header: "MFA",
      sortValue: (u) => u.mfa.length,
      cell: (u) => (u.mfa.length ? <span className="flex flex-wrap gap-1">{u.mfa.map((m) => <Badge key={m} tone={m === "Passkey" ? "success" : "neutral"}>{m}</Badge>)}</span> : <StatusBadge tone="warning">None</StatusBadge>),
    },
    { id: "role", header: "Role", cell: (u) => (u.admin ? <Badge tone="info">Admin</Badge> : <span className="text-xs text-fg-muted">Member</span>) },
    { id: "last", header: "Last sign-in", cell: (u) => <span className="text-xs whitespace-nowrap text-fg-muted">{u.last}</span> },
    { id: "status", header: "Status", sortValue: (u) => u.status, cell: (u) => <StatusBadge tone={USER_STATUS[u.status]}>{u.status[0]!.toUpperCase() + u.status.slice(1)}</StatusBadge> },
  ];
  const bulk = (fn: (u: User) => User, verb: string) => {
    setRows((rs) => rs.map((r) => (selected.includes(r.id) ? fn(r) : r)));
    setNotice(`${verb} ${selected.length} ${selected.length === 1 ? "user" : "users"}`);
    setSelected([]);
  };
  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone who can sign in, where their account comes from and how they prove it is them"
        actions={
          <>
            <Button icon={<Mail />}>Invite users</Button>
            <Button variant="primary" icon={<Plus />}>
              Create user
            </Button>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Users" value="214" delta={{ label: "+6 this month", direction: "up" }} />
        <KpiCard label="Synced" value="196" unit="from 3 providers" />
        <KpiCard label="Without MFA" value="17" tone="warning" delta={{ label: "5 are admins or on-call", intent: "bad" }} />
        <KpiCard label="Inactive 30+ days" value="9" unit="candidates to disable" />
      </KpiGrid>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <FilterBar
        onClear={
          q || sources.length || mfa.length
            ? () => {
                setQ("");
                setSources([]);
                setMfa([]);
              }
            : undefined
        }
      >
        <SearchInput label="Search users" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
        <FacetFilter label="Source" selected={sources} onChange={setSources} options={(["Google Workspace", "Corporate AD", "Keycloak", "Local"] as Source[]).map((s) => ({ value: s, count: rows.filter((u) => u.source === s).length }))} />
        <FacetFilter
          label="MFA"
          selected={mfa}
          onChange={setMfa}
          options={[
            { value: "enrolled", label: "Enrolled", count: rows.filter((u) => u.mfa.length > 0).length },
            { value: "none", label: "Not enrolled", count: rows.filter((u) => u.mfa.length === 0).length },
          ]}
        />
      </FilterBar>
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" onClick={() => bulk((u) => ({ ...u, mfa: [] }), "Reset MFA for")}>
            Reset MFA
          </Button>
          <Button size="sm" onClick={() => bulk((u) => ({ ...u, status: "disabled" }), "Disabled")}>
            Disable
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      <Panel title="Users" description={`${shown.length} of ${rows.length}`} flush>
        <DataTable label="Users" columns={cols} rows={shown} getRowId={(u) => u.id} selectable selectedIds={selected} onSelectionChange={setSelected} pageSize={10} minWidth={1000} />
      </Panel>
    </>
  );
}

/* ----------------------------------------------------------------- Groups */

function GroupsPage() {
  const [active, setActive] = useState("g-sre");
  const [assigned, setAssigned] = useState<Record<string, string[]>>(Object.fromEntries(GROUPS.map((g) => [g.id, g.apps])));
  const [pick, setPick] = useState("jira");
  const g = GROUPS.find((x) => x.id === active)!;
  const members = USERS.filter((u) => u.groups.includes(g.name));
  const cols: Column<Group>[] = [
    { id: "name", header: "Group", sortValue: (x) => x.name, cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "source", header: "Source", sortValue: (x) => x.source, cell: (x) => <span className="text-xs">{x.source}</span> },
    { id: "rule", header: "Membership", description: "Synced groups follow a rule on the provider; local groups are managed here.", cell: (x) => <span className="font-mono text-2xs">{x.rule}</span> },
    { id: "members", header: "Members", align: "right", mono: true, sortValue: (x) => x.members, cell: (x) => x.members },
    { id: "apps", header: "Applications", align: "right", mono: true, sortValue: (x) => (assigned[x.id] ?? []).length, cell: (x) => (assigned[x.id] ?? []).length },
    { id: "mfa", header: "MFA policy", cell: (x) => <Badge tone={x.mfa === "Passkey only" ? "success" : x.mfa === "Optional" ? "warning" : "neutral"}>{x.mfa}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title="Groups"
        description="Groups decide which applications people see and how strongly they must sign in"
        actions={
          <Button variant="primary" icon={<Plus />}>
            New group
          </Button>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Groups" description={`${GROUPS.length} groups · 6 synced, 4 local`} flush>
          <DataTable label="Groups" columns={cols} rows={GROUPS} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} minWidth={760} />
        </Panel>
        <Panel title={g.name} description={`${g.members} members · ${g.source}`} aria-label="Group detail">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold">Assigned applications</h3>
              <ul aria-label={`Applications for ${g.name}`} className="flex flex-wrap gap-1.5">
                {(assigned[g.id] ?? []).map((a) => (
                  <li key={a}>
                    <Badge variant="outline">{a}</Badge>
                  </li>
                ))}
              </ul>
            </div>
            <form
              className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                const name = apps.find((a) => a.id === pick)!.name;
                setAssigned((s) => ({ ...s, [g.id]: Array.from(new Set([...(s[g.id] ?? []), name])) }));
              }}
            >
              <SelectField label="Assign application" value={pick} onChange={(e) => setPick(e.target.value)} options={apps.map((a) => ({ value: a.id, label: a.name }))} />
              <Button type="submit">Assign</Button>
            </form>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold">Members</h3>
              <ul className="flex flex-col">
                {(members.length ? members : USERS.slice(0, 3)).map((u) => (
                  <li key={u.id} className="flex items-center justify-between gap-2 border-b border-subtle py-1.5 last:border-0">
                    <Person name={u.name} />
                    {u.mfa.length ? <Badge tone="success">{u.mfa[0]}</Badge> : <StatusBadge tone="warning">No MFA</StatusBadge>}
                  </li>
                ))}
              </ul>
              <span className="text-2xs text-fg-muted">Showing first members · {g.members} in total</span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- Providers */

function ProvidersPage() {
  const [adState, setAdState] = useState<"failed" | "ok">("failed");
  const [jit, setJit] = useState(true);
  return (
    <>
      <PageHeader
        title="Providers"
        description="Upstream identity sources. Users sign in with them; groups and attributes sync on a schedule."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add provider
          </Button>
        }
      />
      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel title="Upstream Keycloak" description="OIDC · https://sso.example.com/realms/ops" actions={<StatusBadge tone="success">Connected</StatusBadge>}>
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
            <dt className="text-fg-muted">Client ID</dt>
            <dd className="font-mono">openasy-broker</dd>
            <dt className="text-fg-muted">Scopes</dt>
            <dd className="font-mono">openid email profile groups</dd>
            <dt className="text-fg-muted">Users</dt>
            <dd>39 · last login 38 min ago</dd>
            <dt className="text-fg-muted">Group claim</dt>
            <dd className="font-mono">realm_access.roles</dd>
          </dl>
        </Panel>
        <Panel title="Corporate AD" description="LDAP · ldaps://dc01.corp.example.com:636" actions={<StatusBadge tone={adState === "ok" ? "success" : "danger"}>{adState === "ok" ? "Connected" : "Sync failed"}</StatusBadge>} aria-label="Corporate AD">
          <div className="flex flex-col gap-2">
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
              <dt className="text-fg-muted">Bind DN</dt>
              <dd className="truncate font-mono">CN=svc-openasy,OU=Service,DC=corp</dd>
              <dt className="text-fg-muted">Base DN</dt>
              <dd className="truncate font-mono">OU=People,DC=corp,DC=example,DC=com</dd>
              <dt className="text-fg-muted">Schedule</dt>
              <dd>Every 15 min · full sync nightly</dd>
              <dt className="text-fg-muted">Last result</dt>
              <dd className={adState === "ok" ? "text-success" : "text-danger-text"}>{adState === "ok" ? "Synced 63 users, 12 groups just now" : "Bind failed: invalid credentials · 2 h ago"}</dd>
            </dl>
            <div className="flex items-center gap-2">
              <Button size="sm" icon={<RefreshCw />} onClick={() => setAdState("ok")}>
                Retry sync
              </Button>
              <Button size="sm" variant="ghost">
                Update bind password
              </Button>
            </div>
            {adState === "ok" && (
              <span role="status" className="text-xs text-success">
                Sync completed · 63 users, 12 groups
              </span>
            )}
          </div>
        </Panel>
        <Panel title="Google Workspace" description="OIDC · example.com" actions={<StatusBadge tone="success">Connected</StatusBadge>}>
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
            <dt className="text-fg-muted">Hosted domain</dt>
            <dd className="font-mono">example.com</dd>
            <dt className="text-fg-muted">Directory sync</dt>
            <dd>Admin SDK · every 10 min</dd>
            <dt className="text-fg-muted">Users</dt>
            <dd>152 · synced 9 min ago</dd>
            <dt className="text-fg-muted">Groups</dt>
            <dd>department attribute</dd>
          </dl>
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Attribute mapping" description="Provider claim to OpenAsy user field" flush>
          <DataTable
            label="Attribute mapping"
            rows={[
              { id: "m1", field: "email", kc: "email", ad: "mail", google: "email", required: true },
              { id: "m2", field: "name", kc: "name", ad: "displayName", google: "name", required: true },
              { id: "m3", field: "groups", kc: "realm_access.roles", ad: "memberOf", google: "department", required: false },
              { id: "m4", field: "employee_id", kc: "–", ad: "employeeID", google: "externalIds.organization", required: false },
              { id: "m5", field: "manager", kc: "–", ad: "manager", google: "relations.manager", required: false },
              { id: "m6", field: "disabled", kc: "enabled = false", ad: "userAccountControl & 2", google: "suspended", required: true },
            ]}
            getRowId={(r) => r.id}
            minWidth={680}
            columns={[
              { id: "field", header: "OpenAsy field", mono: true, cell: (r) => r.field },
              { id: "kc", header: "Keycloak", mono: true, cell: (r) => r.kc },
              { id: "ad", header: "Corporate AD", mono: true, cell: (r) => r.ad },
              { id: "google", header: "Google", mono: true, cell: (r) => r.google },
              { id: "req", header: "Required", cell: (r) => (r.required ? <Badge tone="info">Required</Badge> : <span className="text-xs text-fg-muted">Optional</span>) },
            ]}
          />
        </Panel>
        <Panel title="Provisioning">
          <div className="flex flex-col gap-3">
            <Switch checked={jit} onCheckedChange={setJit} label="Create users on first sign-in" description="Just-in-time provisioning for people who are not synced yet." />
            <SelectField
              label="When a user is removed upstream"
              defaultValue="disable"
              options={[
                { value: "disable", label: "Disable and end sessions" },
                { value: "keep", label: "Keep until reviewed" },
                { value: "delete", label: "Delete after 30 days" },
              ]}
            />
            <SelectField
              label="If two providers return the same email"
              defaultValue="link"
              options={[
                { value: "link", label: "Link to one user" },
                { value: "reject", label: "Reject the second sign-in" },
              ]}
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------------- MFA */

const DAY30 = Array.from({ length: 30 }, (_, i) => new Date(Date.UTC(2026, 9, 19 - (29 - i))).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }));

const POLICY_GROUPS = ["Admins", "SRE on-call", "Engineering", "Support", "Sales", "Contractors"];

function MfaPage() {
  const [required, setRequired] = useState<Record<string, boolean>>({ Admins: true, "SRE on-call": true, Engineering: true, Support: true, Sales: false, Contractors: false });
  const [reminded, setReminded] = useState<string[]>([]);
  const without = USERS.filter((u) => u.mfa.length === 0 && u.status !== "disabled");
  return (
    <>
      <PageHeader title="MFA" description="Second factors, passkey adoption, recovery and who still signs in with a password alone" />
      <KpiGrid>
        <KpiCard label="Any second factor" value="92%" unit="197 of 214" tone="success" trend={wave(12, { base: 88, amp: 3, seed: 91 })} delta={{ label: "+3 pts this month", direction: "up", intent: "good" }} />
        <KpiCard label="Passkeys" value="41%" unit="88 users" trend={wave(12, { base: 30, amp: 8, seed: 92 })} delta={{ label: "+9 this week", direction: "up", intent: "good" }} />
        <KpiCard label="Recovery codes saved" value="71%" unit="of MFA users" delta={{ label: "57 never downloaded" }} />
        <KpiCard label="Recovery requests · 30 d" value="6" unit="helpdesk resets" delta={{ label: "All verified by manager" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Passkey adoption" description="Users with at least one passkey, 30 days">
          <TimeSeriesChart
            label="Users with a passkey over 30 days"
            labels={DAY30}
            height={180}
            xTicks={6}
            series={[{ id: "pk", name: "Passkey users", data: Array.from({ length: 30 }, (_, i) => 52 + Math.round(i * 1.2)) }]}
          />
        </Panel>
        <Panel title="Methods in use" description="Users per method; one user can have several">
          <BarList
            label="MFA methods in use"
            items={[
              { id: "totp", label: "Authenticator app (TOTP)", value: 131 },
              { id: "pk", label: "Passkey", value: 88 },
              { id: "key", label: "Security key", value: 23 },
              { id: "push", label: "Push approval", value: 19 },
              { id: "sms", label: "SMS (disabled)", value: 0 },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Enforcement" description="Require a second factor per group">
          <div className="flex flex-col gap-2.5">
            {POLICY_GROUPS.map((g) => (
              <Switch key={g} checked={required[g] ?? false} onCheckedChange={(v) => setRequired((r) => ({ ...r, [g]: v }))} label={`Require MFA for ${g}`} description={g === "Admins" || g === "SRE on-call" ? "Passkey or security key only" : "Any second factor"} />
            ))}
            <span role="status" className="text-xs text-fg-muted">
              {POLICY_GROUPS.filter((g) => required[g]).length} of {POLICY_GROUPS.length} groups require MFA
            </span>
          </div>
        </Panel>
        <Panel title="Without a second factor" description={`${without.length} active or invited users`} flush>
          <ul aria-label="Users without MFA" className="flex flex-col">
            {without.map((u) => (
              <li key={u.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <span className="min-w-0 grow">
                  <Person name={u.name} sub={`${u.groups.join(", ")} · ${u.source}`} />
                </span>
                {reminded.includes(u.id) ? (
                  <span className="text-xs text-success">Reminder sent</span>
                ) : (
                  <Button size="xs" icon={<Mail />} aria-label={`Remind ${u.name}`} onClick={() => setReminded((r) => [...r, u.id])}>
                    Remind
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Recovery">
        <div className="grid gap-3 md:grid-cols-3">
          <SelectField
            label="Lost device"
            defaultValue="manager"
            options={[
              { value: "manager", label: "Helpdesk reset after manager approval" },
              { value: "codes", label: "Recovery codes only" },
            ]}
          />
          <SelectField
            label="Recovery codes"
            defaultValue="10"
            options={[
              { value: "10", label: "10 single-use codes" },
              { value: "5", label: "5 single-use codes" },
            ]}
          />
          <SelectField
            label="Remember this device"
            defaultValue="12h"
            options={[
              { value: "0", label: "Never" },
              { value: "12h", label: "12 hours" },
              { value: "7d", label: "7 days" },
            ]}
          />
        </div>
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- Branding */

function BrandingPage() {
  const [name, setName] = useState("Acme sign-in");
  const [accent, setAccent] = useState("#1f4fd8");
  const [saved, setSaved] = useState(false);
  const valid = /^#[0-9a-f]{6}$/i.test(accent);
  return (
    <>
      <PageHeader
        title="Branding"
        description="How the sign-in page looks to your users"
        actions={
          <a href="?path=/story/identity-branding--settings" className="text-sm font-medium text-accent-text">
            Open the full branding editor
          </a>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Basics">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(true);
            }}
          >
            <TextField label="Product name" value={name} onChange={(e) => (setName(e.target.value), setSaved(false))} />
            <TextField label="Accent colour" mono value={accent} onChange={(e) => (setAccent(e.target.value), setSaved(false))} error={valid ? undefined : "Use a 6-digit hex colour like #1f4fd8"} />
            <TextField label="Sign-in domain" mono defaultValue="id.example.com" hint="CNAME to edge.openasy.example.com; certificate is issued automatically." />
            <div className="flex items-center gap-2">
              <Button type="submit" variant="primary" disabled={!valid}>
                Save branding
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  Saved · live on id.example.com
                </span>
              )}
            </div>
          </form>
        </Panel>
        <Panel title="Preview" description="Sign-in card">
          <div className="grid place-items-center rounded-md bg-subtle p-4">
            <div className="flex w-72 max-w-full flex-col gap-2.5 rounded-lg border border-line bg-surface p-4">
              <span className="flex items-center gap-2">
                <span aria-hidden className="grid size-7 place-items-center rounded-md text-white" style={{ background: valid ? accent : "#1f4fd8" }}>
                  <Fingerprint className="size-4" />
                </span>
                <span className="text-sm font-semibold">{name}</span>
              </span>
              <span className="text-xs text-fg-muted">Sign in with your work account</span>
              <span aria-hidden className="h-8 rounded-md border border-line-strong" />
              <span aria-hidden className="grid h-8 place-items-center rounded-md text-xs font-medium text-white" style={{ background: valid ? accent : "#1f4fd8" }}>
                Continue
              </span>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ Audit */

function AuditPage() {
  const [tab, setTab] = useState<"all" | "failed" | "admin">("all");
  const [range, setRange] = useState("24h");
  const [q, setQ] = useState("");
  const rows = SIGNINS.filter(
    (s) => (tab === "all" || (tab === "failed" && s.result !== "success") || (tab === "admin" && s.kind === "admin")) && `${s.user} ${s.app} ${s.ip}`.toLowerCase().includes(q.toLowerCase()),
  );
  const cols: Column<SignIn>[] = [
    { id: "time", header: "Time", width: "90px", mono: true, cell: (s) => s.time },
    { id: "level", header: "Level", width: "80px", cell: (s) => <LevelBadge level={RESULT[s.result].level} /> },
    { id: "user", header: "User", width: "20%", sortValue: (s) => s.user, cell: (s) => <Person name={s.user} /> },
    {
      id: "event",
      header: "Event",
      width: "26%",
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{s.kind === "admin" ? ADMIN_TEXT[s.id] : `Sign-in to ${s.app}`}</span>
          <span className="truncate text-2xs text-fg-muted">{s.kind === "admin" ? "Admin change" : `${RESULT[s.result].label} · ${s.method}`}</span>
        </span>
      ),
    },
    { id: "ip", header: "IP", cell: (s) => <EntityChip kind="ip" value={s.ip} hideKind href="#ip" /> },
    { id: "loc", header: "Location", cell: (s) => <span className="text-xs">{s.location}</span> },
    { id: "risk", header: "Risk", description: "Scored from location, device, time and failure history.", sortValue: (s) => ["low", "medium", "high"].indexOf(s.risk), cell: (s) => <Badge tone={s.risk === "high" ? "danger" : s.risk === "medium" ? "warning" : "neutral"}>{s.risk[0]!.toUpperCase() + s.risk.slice(1)}</Badge> },
  ];
  return (
    <>
      <PageHeader title="Audit" description="Every sign-in and admin change. Retained 400 days and forwarded to SIEM." actions={<Button icon={<ShieldCheck />}>Export CSV</Button>}>
        <Tabs
          label="Audit events"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All events", count: SIGNINS.length },
            { value: "failed", label: "Failed", count: SIGNINS.filter((s) => s.result !== "success").length },
            { value: "admin", label: "Admin changes", count: SIGNINS.filter((s) => s.kind === "admin").length },
          ]}
        />
      </PageHeader>
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <SearchInput label="Search user, application or IP" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterBar>
      <Panel title="Sign-in log" description={`${rows.length} events`} flush>
        <DataTable label="Sign-in log" columns={cols} rows={rows} getRowId={(s) => s.id} minWidth={1000} stickyHeader maxHeight={520} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ app */

const PAGES = {
  overview: () => <OverviewPage />,
  applications: () => <ApplicationsPage />,
  users: () => <UsersPage />,
  groups: () => <GroupsPage />,
  providers: () => <ProvidersPage />,
  mfa: () => <MfaPage />,
  branding: () => <BrandingPage />,
  audit: () => <AuditPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="identity" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "Risky sign-ins" })).getAllByRole("listitem")).toHaveLength(SIGNINS.filter((s) => s.risk !== "low").length);
    await userEvent.click(c.getByRole("link", { name: /Applications/ }));
    await expect(c.getByRole("heading", { level: 1, name: "Applications" })).toBeInTheDocument();
  },
};

/** Identity applications: sign-in KPIs, success vs. failure, registered apps and upstream providers. */
export const Applications: Story = {
  ...app("applications"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Applications" });
    await expect(within(table).getAllByRole("row")).toHaveLength(apps.length + 1);
    await expect(within(c.getByRole("list", { name: "Identity providers" })).getByText("Sync failed")).toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "SAML 2.0" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(4);
    await expect(within(table).getByText("Jira")).toBeInTheDocument();
    await expect(within(table).queryByText("Grafana")).not.toBeInTheDocument();
  },
};

export const UsersList: Story = {
  name: "Users",
  ...app("users"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search users" }), "ortiz");
    const table = c.getByRole("table", { name: "Users" });
    await expect(within(table).getAllByRole("row")).toHaveLength(2);
    await userEvent.click(c.getByRole("checkbox", { name: "Select row u4" }));
    await userEvent.click(within(c.getByRole("toolbar", { name: "Bulk actions" })).getByRole("button", { name: "Disable" }));
    await expect(c.getByText("Disabled 1 user")).toBeInTheDocument();
    await expect(table).toHaveTextContent("Disabled");
  },
};

export const Groups: Story = {
  ...app("groups"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Groups" })).getByText("Sales"));
    const list = c.getByRole("list", { name: "Applications for Sales" });
    await expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    await userEvent.click(within(c.getByRole("region", { name: "Group detail" })).getByRole("button", { name: "Assign" }));
    await expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    await expect(list).toHaveTextContent("Jira");
  },
};

export const Providers: Story = {
  ...app("providers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const ad = c.getByRole("region", { name: "Corporate AD" });
    await expect(within(ad).getByText("Sync failed")).toBeInTheDocument();
    await userEvent.click(within(ad).getByRole("button", { name: "Retry sync" }));
    await expect(within(ad).getByRole("status")).toHaveTextContent("Sync completed · 63 users, 12 groups");
  },
};

export const Mfa: Story = {
  name: "MFA",
  ...app("mfa"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("4 of 6 groups require MFA")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: /Require MFA for Contractors/ }));
    await expect(c.getByText("5 of 6 groups require MFA")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Remind Ben Ortiz" }));
    await expect(within(c.getByRole("list", { name: "Users without MFA" })).getByText("Reminder sent")).toBeInTheDocument();
  },
};

export const Branding: Story = {
  ...app("branding"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const accent = c.getByRole("textbox", { name: "Accent colour" });
    await userEvent.clear(accent);
    await userEvent.type(accent, "teal");
    await expect(c.getByRole("button", { name: "Save branding" })).toBeDisabled();
    await userEvent.clear(accent);
    await userEvent.type(accent, "#0b7366");
    await userEvent.click(c.getByRole("button", { name: "Save branding" }));
    await expect(c.getByRole("status")).toHaveTextContent("Saved");
  },
};

export const AuditLog: Story = {
  name: "Audit",
  ...app("audit"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Failed/ }));
    const table = c.getByRole("table", { name: "Sign-in log" });
    await expect(within(table).getAllByRole("row")).toHaveLength(SIGNINS.filter((s) => s.result !== "success").length + 1);
    await userEvent.click(c.getByRole("tab", { name: /Admin changes/ }));
    await expect(table).toHaveTextContent("Rotated the SAML signing certificate for Jira");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
