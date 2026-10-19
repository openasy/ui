import { useState } from "react";
import { Copy, KeyRound, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { Tabs } from "../../components/Tabs";
import { Badge, StatusBadge } from "../../components/Badge";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Avatar } from "../../components/Avatar";
import { useBrand } from "../../components/BrandProvider";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import { CONNECTED, PEOPLE, emailOf } from "../mocks";

/* ------------------------------------------------------------------ */
/* Integrations: the same page in every product                       */
/* ------------------------------------------------------------------ */

interface Integration {
  id: string;
  name: string;
  abbr: string;
  desc: string;
  proto: string;
  kind: "source" | "destination";
  status: "connected" | "available" | "error";
}

const INTEGRATIONS: Integration[] = [
  { id: "otel", name: "OpenTelemetry", abbr: "OT", desc: "Logs, metrics and traces from any OTel SDK or Collector.", proto: "OTLP gRPC · HTTP", kind: "source", status: "connected" },
  { id: "prom", name: "Prometheus", abbr: "PR", desc: "Scrape targets or receive remote write.", proto: "remote_write", kind: "source", status: "connected" },
  { id: "syslog", name: "Syslog", abbr: "SY", desc: "Network devices and legacy apps.", proto: "RFC 5424 · UDP/TCP/TLS", kind: "source", status: "connected" },
  { id: "fluent", name: "Fluent Bit · Vector", abbr: "FB", desc: "Ship from an existing pipeline without a new agent.", proto: "HTTP · OTLP", kind: "source", status: "available" },
  { id: "k8s", name: "Kubernetes", abbr: "K8", desc: "Pods, nodes, events and workload inventory.", proto: "K8s API · Helm", kind: "source", status: "available" },
  { id: "cloudtrail", name: "AWS CloudTrail", abbr: "AW", desc: "Cloud audit events.", proto: "S3 · SQS", kind: "source", status: "available" },
  { id: "github", name: "GitHub", abbr: "GH", desc: "Repositories, pull requests and SARIF upload.", proto: "GitHub App", kind: "source", status: "error" },
  { id: "ocsf", name: "Any OCSF source", abbr: "OC", desc: "Findings from any scanner or EDR.", proto: "POST /v1/ingest/ocsf", kind: "source", status: "available" },
  { id: "slack", name: "Slack", abbr: "SL", desc: "Alerts and incident updates in channels.", proto: "Slack app", kind: "destination", status: "connected" },
  { id: "pagerduty", name: "PagerDuty", abbr: "PD", desc: "Page the on-call engineer.", proto: "Events API v2", kind: "destination", status: "connected" },
  { id: "jira", name: "Jira", abbr: "JI", desc: "Turn findings into tickets with two-way status.", proto: "REST", kind: "destination", status: "available" },
  { id: "siem", name: "External SIEM", abbr: "SE", desc: "Splunk, Elastic or QRadar via CEF, LEEF or HEC.", proto: "Syslog CEF · HEC", kind: "destination", status: "available" },
  { id: "webhook", name: "Webhook", abbr: "{}", desc: "Signed JSON to any URL.", proto: "HTTPS + HMAC", kind: "destination", status: "error" },
  { id: "s3", name: "S3 archive", abbr: "S3", desc: "Long-term, immutable storage.", proto: "S3 Object Lock", kind: "destination", status: "connected" },
];

const STATUS_TONE = { connected: "success", available: "neutral", error: "danger" } as const;
const STATUS_LABEL = { connected: "Connected", available: "Available", error: "Error" } as const;

interface Token {
  id: string;
  name: string;
  scopes: string;
  created: string;
  lastUsed: string;
  owner: string;
}

const TOKENS: Token[] = [
  { id: "t1", name: "terraform-ci", scopes: "read, write", created: "Aug 12", lastUsed: "4 min ago", owner: PEOPLE[2] },
  { id: "t2", name: "grafana-datasource", scopes: "read", created: "Jun 3", lastUsed: "12 s ago", owner: PEOPLE[1] },
  { id: "t3", name: "backup-export", scopes: "read, export", created: "Mar 30", lastUsed: "91 days ago", owner: PEOPLE[4] },
];

export function IntegrationsPage({ product }: { product: ProductId }) {
  const [tab, setTab] = useState<"source" | "destination" | "products" | "api">("source");
  const [query, setQuery] = useState("");
  const [tokens, setTokens] = useState(TOKENS);
  const shown = INTEGRATIONS.filter((i) => i.kind === tab && i.name.toLowerCase().includes(query.toLowerCase()));
  const name = PRODUCTS[product].name;
  const tokenCols: Column<Token>[] = [
    { id: "name", header: "Name", cell: (t) => <span className="font-mono text-xs">{t.name}</span>, sortValue: (t) => t.name },
    { id: "scopes", header: "Scopes", cell: (t) => t.scopes },
    { id: "owner", header: "Owner", cell: (t) => t.owner },
    { id: "created", header: "Created", cell: (t) => t.created },
    { id: "used", header: "Last used", cell: (t) => t.lastUsed, description: "Tokens unused for 90 days are revoked automatically." },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      width: "48px",
      cell: (t) => (
        <IconButton label={`Revoke ${t.name}`} size="xs" onClick={() => setTokens((ts) => ts.filter((x) => x.id !== t.id))}>
          <Trash2 />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Integrations" description={`Connect ${name} to the tools you already run. Everything speaks open standards both ways.`} actions={<SearchInput label="Search integrations" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />}>
        <Tabs
          label="Integration type"
          value={tab}
          onChange={setTab}
          items={[
            { value: "source", label: "Sources", count: INTEGRATIONS.filter((i) => i.kind === "source").length },
            { value: "destination", label: "Destinations", count: INTEGRATIONS.filter((i) => i.kind === "destination").length },
            { value: "products", label: "OpenAsy products", count: CONNECTED.length },
            { value: "api", label: "API & tokens", count: tokens.length },
          ]}
        />
      </PageHeader>
      {(tab === "source" || tab === "destination") && (
        <div className="grid gap-2.5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {shown.map((i) => (
            <section key={i.id} aria-label={i.name} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-3">
              <div className="flex items-center justify-between gap-2">
                <span aria-hidden className="grid size-8 place-items-center rounded-md bg-subtle font-mono text-xs font-medium">
                  {i.abbr}
                </span>
                <StatusBadge tone={STATUS_TONE[i.status]}>{STATUS_LABEL[i.status]}</StatusBadge>
              </div>
              <h2 className="text-sm font-semibold">{i.name}</h2>
              <p className="text-xs text-fg-muted">{i.desc}</p>
              <code className="font-mono text-2xs text-fg-muted">{i.proto}</code>
              <div className="mt-auto pt-1">
                <Button size="sm" variant={i.status === "available" ? "primary" : "secondary"}>
                  {i.status === "available" ? `Connect ${i.name}` : i.status === "error" ? `Fix ${i.name}` : `Configure ${i.name}`}
                </Button>
              </div>
            </section>
          ))}
          {shown.length === 0 && <p className="text-sm text-fg-muted">No integrations match “{query}”.</p>}
        </div>
      )}
      {tab === "products" && (
        <Panel title="Linked OpenAsy products" description="Linked once with a token; shared entities such as hosts, users and IPs become clickable across them." flush>
          <ul className="flex flex-col">
            {(CONNECTED as readonly ProductId[]).filter((p) => p !== product).map((p) => {
              const P = PRODUCTS[p];
              return (
                <li key={p} className="flex items-center gap-3 border-b border-subtle px-3 py-2 last:border-0">
                  <P.icon aria-hidden className="size-4 text-fg-muted" />
                  <span className="flex min-w-0 grow flex-col">
                    <span className="text-sm font-medium">{P.name}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{P.image.split("/").pop()}.ops.example.com</span>
                  </span>
                  <StatusBadge tone="success">Linked</StatusBadge>
                  <Button size="xs">Unlink {P.name}</Button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}
      {tab === "api" && (
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel title="API tokens" actions={<Button size="sm" icon={<Plus />}>New token</Button>} flush>
            <DataTable label="API tokens" columns={tokenCols} rows={tokens} getRowId={(t) => t.id} minWidth={560} columnMenu={false} />
          </Panel>
          <Panel title="REST API" description="Every screen is backed by a public API.">
            <div className="flex flex-col gap-2 text-sm">
              <code className="rounded-md bg-subtle px-2 py-1.5 font-mono text-xs">https://{PRODUCTS[product].image.split("/").pop()}.example.com/api/v1</code>
              <Button size="sm" icon={<Copy />}>Copy base URL</Button>
              <a href="#openapi" className="text-xs text-accent-text">
                OpenAPI 3.1 specification
              </a>
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Settings: the same page in every product                           */
/* ------------------------------------------------------------------ */

type Role = "Owner" | "Admin" | "Analyst" | "Viewer" | "Auditor";
interface Member {
  id: string;
  name: string;
  role: Role;
  mfa: boolean;
  lastSeen: string;
}

const MEMBERS: Member[] = PEOPLE.map((p, i) => ({
  id: `m${i}`,
  name: p,
  role: (["Owner", "Admin", "Analyst", "Analyst", "Viewer", "Auditor", "Analyst", "Viewer"] as Role[])[i]!,
  mfa: i !== 4,
  lastSeen: ["now", "3 min ago", "1 h ago", "yesterday", "12 days ago", "2 h ago", "5 min ago", "3 days ago"][i]!,
}));

const AUDIT = [
  { id: "a1", at: "14:02", who: PEOPLE[1], action: "Updated retention for logs from 30 to 90 days", ip: "203.0.113.24" },
  { id: "a2", at: "13:48", who: PEOPLE[0], action: "Invited zoe.adams@example.com as Viewer", ip: "198.51.100.7" },
  { id: "a3", at: "11:15", who: PEOPLE[2], action: "Created API token terraform-ci", ip: "203.0.113.181" },
  { id: "a4", at: "Yesterday", who: PEOPLE[1], action: "Enforced single sign-on for all members", ip: "203.0.113.24" },
  { id: "a5", at: "Oct 17", who: PEOPLE[5], action: "Exported audit log for SOC 2 evidence", ip: "192.0.2.44" },
];

export function SettingsPage({ product }: { product: ProductId }) {
  const { brand } = useBrand();
  const [tab, setTab] = useState<"general" | "members" | "sso" | "data" | "audit">("general");
  const [members, setMembers] = useState(MEMBERS);
  const [enforceSso, setEnforceSso] = useState(true);
  const [saved, setSaved] = useState(false);
  const name = PRODUCTS[product].name;
  const memberCols: Column<Member>[] = [
    {
      id: "name",
      header: "Member",
      sortValue: (m) => m.name,
      width: "34%",
      cell: (m) => (
        <span className="flex items-center gap-2">
          <Avatar name={m.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{m.name}</span>
            <span className="truncate text-2xs text-fg-muted">{emailOf(m.name)}</span>
          </span>
        </span>
      ),
    },
    {
      id: "role",
      header: "Role",
      description: "Owner and Admin manage settings. Analysts act on data. Viewers and Auditors only read; Auditors also see the audit log.",
      cell: (m) => (
        <SelectField
          aria-label={`Role for ${m.name}`}
          value={m.role}
          onChange={(e) => setMembers((ms) => ms.map((x) => (x.id === m.id ? { ...x, role: e.target.value as Role } : x)))}
          options={["Owner", "Admin", "Analyst", "Viewer", "Auditor"].map((r) => ({ value: r, label: r }))}
          className="w-32"
        />
      ),
    },
    { id: "mfa", header: "MFA", cell: (m) => (m.mfa ? <StatusBadge tone="success">On</StatusBadge> : <StatusBadge tone="warning">Off</StatusBadge>) },
    { id: "seen", header: "Last seen", cell: (m) => m.lastSeen },
  ];
  return (
    <>
      <PageHeader title="Settings" description={`${name} for ${brand.organization ?? brand.name}`}>
        <Tabs
          label="Settings section"
          value={tab}
          onChange={setTab}
          items={[
            { value: "general", label: "General" },
            { value: "members", label: "Members", count: members.length },
            { value: "sso", label: "Single sign-on" },
            { value: "data", label: "Data & GDPR" },
            { value: "audit", label: "Audit log" },
          ]}
        />
      </PageHeader>
      {tab === "general" && (
        <Panel title="General">
          <form
            className="grid max-w-3xl gap-3 md:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(true);
            }}
          >
            <TextField label="Workspace name" defaultValue={`${brand.organization ?? "Acme Corp"} · ${name}`} />
            <TextField label="Public URL" mono defaultValue={`https://${PRODUCTS[product].image.split("/").pop()}.example.com`} />
            <SelectField
              label="Time zone"
              defaultValue="UTC"
              options={[
                { value: "UTC", label: "UTC" },
                { value: "Europe/London", label: "Europe/London" },
                { value: "America/New_York", label: "America/New_York" },
              ]}
            />
            <SelectField
              label="Default time range"
              defaultValue="24h"
              options={[
                { value: "1h", label: "Last 1 hour" },
                { value: "24h", label: "Last 24 hours" },
                { value: "7d", label: "Last 7 days" },
              ]}
            />
            <div className="flex items-center gap-2 md:col-span-2">
              <Button type="submit" variant="primary">
                Save changes
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  Saved
                </span>
              )}
            </div>
          </form>
        </Panel>
      )}
      {tab === "members" && (
        <Panel title="Members" description="Roles apply to this product only." actions={<Button size="sm" variant="primary" icon={<Plus />}>Invite member</Button>} flush>
          <DataTable label="Members" columns={memberCols} rows={members} getRowId={(m) => m.id} minWidth={640} />
        </Panel>
      )}
      {tab === "sso" && (
        <div className="grid gap-2.5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel title="Identity providers" flush>
            <ul className="flex flex-col">
              {[
                { name: "OpenAsy Identity", detail: "https://id.example.com", proto: "OIDC", ok: true },
                { name: "Keycloak · realm ops", detail: "https://sso.example.com/realms/ops", proto: "OIDC", ok: true },
                { name: "Corporate Active Directory", detail: "ldaps://dc01.corp.example.com:636", proto: "LDAP", ok: false },
              ].map((p) => (
                <li key={p.name} className="flex items-center gap-3 border-b border-subtle px-3 py-2 last:border-0">
                  <KeyRound aria-hidden className="size-4 text-fg-muted" />
                  <span className="flex min-w-0 grow flex-col">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{p.detail}</span>
                  </span>
                  <Badge mono>{p.proto}</Badge>
                  <StatusBadge tone={p.ok ? "success" : "danger"}>{p.ok ? "Active" : "Sync failed"}</StatusBadge>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Policy">
            <div className="flex flex-col gap-3">
              <Switch checked={enforceSso} onCheckedChange={setEnforceSso} label="Enforce single sign-on" description="Local passwords stop working, except for one break-glass owner." />
              <Checkbox label="Require MFA at the identity provider" defaultChecked />
              <Checkbox label="Provision members with SCIM" />
            </div>
          </Panel>
        </div>
      )}
      {tab === "data" && (
        <div className="grid gap-2.5 lg:grid-cols-2">
          <Panel title="Retention" description="How long this product keeps data. Older data is deleted, or archived if an S3 archive is connected.">
            <div className="grid gap-3 sm:grid-cols-2">
              <SelectField label="Events and logs" defaultValue="90" options={["30", "90", "400"].map((d) => ({ value: d, label: `${d} days` }))} />
              <SelectField label="Audit log" defaultValue="400" options={["400", "730", "2555"].map((d) => ({ value: d, label: `${d} days` }))} />
              <SelectField
                label="Data region"
                defaultValue="eu-central"
                options={[
                  { value: "eu-central", label: "EU (Frankfurt)" },
                  { value: "eu-west", label: "EU (Ireland)" },
                  { value: "us-east", label: "US (Virginia)" },
                ]}
              />
              <Checkbox label="Mask personal data (emails, IPs) for Viewers" defaultChecked />
            </div>
          </Panel>
          <Panel title="GDPR requests" description="Data subject access and erasure requests (Art. 15 and 17).">
            <div className="flex flex-col gap-2">
              <TextField label="Data subject email" type="email" placeholder="name@example.com" />
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm">Export their data</Button>
                <Button size="sm" variant="danger">
                  Erase their data
                </Button>
              </div>
              <Callout tone="info" title="Erasure keeps the audit trail">
                Personal fields are removed; the record that a request was handled is kept as required by Art. 30.
              </Callout>
            </div>
          </Panel>
        </div>
      )}
      {tab === "audit" && (
        <Panel title="Audit log" description="Every change made by people and API tokens. Exportable as evidence for ISO 27001, SOC 2 and GDPR." actions={<Button size="sm">Export CSV</Button>} flush>
          <DataTable
            label="Audit log"
            rows={AUDIT}
            getRowId={(a) => a.id}
            minWidth={640}
            columns={[
              { id: "at", header: "Time", width: "96px", cell: (a) => a.at },
              { id: "who", header: "Who", width: "22%", cell: (a) => a.who },
              { id: "action", header: "Action", cell: (a) => a.action },
              { id: "ip", header: "IP", mono: true, width: "130px", cell: (a) => a.ip },
            ]}
          />
        </Panel>
      )}
    </>
  );
}
