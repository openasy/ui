import { useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Bird, FileStack, KeyRound, Plus, Server, Siren, Zap } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { HOSTS } from "../mocks";

const nav = [
  { id: "canaries", label: "Canaries", icon: Bird, count: 36 },
  { id: "triggers", label: "Triggers", icon: Zap, count: 2 },
  { id: "credentials", label: "Decoy credentials", icon: KeyRound },
  { id: "hosts", label: "Decoy hosts", icon: Server },
  { id: "templates", label: "Templates", icon: FileStack },
];

const meta = {
  title: "Products/Deception",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const TYPES = [
  { value: "aws-key", label: "AWS key" },
  { value: "dns-token", label: "DNS token" },
  { value: "pdf-doc", label: "PDF doc" },
  { value: "db-user", label: "Decoy DB user" },
  { value: "ssh-host", label: "Fake SSH host" },
] as const;
type CanaryType = (typeof TYPES)[number]["value"];
const typeLabel = (t: CanaryType) => TYPES.find((x) => x.value === t)!.label;

interface Canary {
  id: string;
  name: string;
  type: CanaryType;
  where: string;
  host?: string;
  status: "armed" | "triggered";
  checked: string;
}

const initialCanaries: Canary[] = [
  { id: "c-01", name: "backup-svc AWS key", type: "aws-key", where: "~deploy/.aws/credentials", host: HOSTS[0], status: "triggered", checked: "1 min ago" },
  { id: "c-02", name: "Payroll export", type: "pdf-doc", where: "//fs01/finance/Payroll-2026-Q3.pdf", status: "armed", checked: "4 min ago" },
  { id: "c-03", name: "Internal wiki token", type: "dns-token", where: "c7f2.canary.example.com", status: "armed", checked: "4 min ago" },
  { id: "c-04", name: "svc_reporting", type: "db-user", where: "postgres://db-prod-02/orders", host: HOSTS[6], status: "triggered", checked: "2 min ago" },
  { id: "c-05", name: "bastion-legacy", type: "ssh-host", where: "192.0.2.120:22", status: "armed", checked: "5 min ago" },
  { id: "c-06", name: "CI deploy key", type: "aws-key", where: "repo: infra/terraform/.env.example", status: "armed", checked: "6 min ago" },
  {
    id: "c-07",
    name: "Kubeconfig admin",
    type: "dns-token",
    where: "worker-prod-04:/root/.kube/config",
    host: HOSTS[3],
    status: "armed",
    checked: "7 min ago",
  },
  { id: "c-08", name: "Board minutes draft", type: "pdf-doc", where: "s3://example-docs/board/minutes-draft.pdf", status: "armed", checked: "9 min ago" },
];

const canaryColumns: Column<Canary>[] = [
  {
    id: "name",
    header: "Canary",
    width: "24%",
    sortValue: (c) => c.name,
    cell: (c) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{c.name}</span>
        <span className="font-mono text-2xs text-fg-muted">{c.id}</span>
      </span>
    ),
  },
  { id: "type", header: "Type", width: "130px", sortValue: (c) => c.type, cell: (c) => <Badge>{typeLabel(c.type)}</Badge> },
  {
    id: "where",
    header: "Where planted",
    cell: (c) => (
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-mono text-xs">{c.where}</span>
        {c.host && (
          <span>
            <EntityChip kind="host" value={c.host} href="#host" />
          </span>
        )}
      </span>
    ),
  },
  {
    id: "status",
    header: "Status",
    width: "110px",
    sortValue: (c) => (c.status === "triggered" ? 1 : 0),
    cell: (c) => (c.status === "triggered" ? <StatusBadge tone="critical">Triggered</StatusBadge> : <StatusBadge tone="success">Armed</StatusBadge>),
  },
  { id: "checked", header: "Last checked", width: "110px", align: "right", cell: (c) => <span className="whitespace-nowrap text-fg-muted">{c.checked}</span> },
];

interface Trigger {
  id: string;
  canary: string;
  time: string;
  ip: string;
  ua: string;
  detail: string;
}

const triggers: Trigger[] = [
  {
    id: "t-2",
    canary: "backup-svc AWS key",
    time: "13:58:12",
    ip: "198.51.100.201",
    ua: "aws-cli/2.17.4 Python/3.11 Linux/6.1",
    detail: "sts:GetCallerIdentity, then s3:ListBuckets in eu-central-1",
  },
  {
    id: "t-1",
    canary: "svc_reporting",
    time: "13:41:05",
    ip: "203.0.113.24",
    ua: "psql 16.3",
    detail: "Login to orders, SELECT on customers (blocked by decoy role)",
  },
];

/** Canaries: tripwires that only an attacker would touch, with triggers and a quick deploy form. */
function CanariesPage() {
  const [canaries, setCanaries] = useState(initialCanaries);
  const [type, setType] = useState<CanaryType>("aws-key");
  const [where, setWhere] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [opened, setOpened] = useState<string[]>([]);
  const rows = canaries.filter((c) => types.length === 0 || types.includes(c.type));
  const deploy = (e: FormEvent) => {
    e.preventDefault();
    if (!where.trim()) return;
    const n = canaries.length + 1;
    setCanaries((cs) => [
      { id: `c-${String(n).padStart(2, "0")}`, name: `New ${typeLabel(type)}`, type, where: where.trim(), status: "armed", checked: "just now" },
      ...cs,
    ]);
    setWhere("");
  };
  return (
    <>
      <PageHeader
        title="Canaries"
        description="36 deployed across 14 hosts, 3 buckets and 2 repositories · alerts go to SIEM and Incidents"
        meta={<StatusBadge tone="critical">2 triggered</StatusBadge>}
        actions={
          <Button size="md" variant="primary" icon={<Plus />}>
            New canary
          </Button>
        }
      />
      <Callout
        tone="critical"
        title="Canary AWS key used from 198.51.100.201. This only happens in a breach."
        action={
          <Button size="sm" variant="danger">
            Open incident
          </Button>
        }
      >
        The key planted in ~deploy/.aws/credentials on api-prod-01 has no permissions and appears nowhere else. Someone read that file.
      </Callout>
      <KpiGrid>
        <KpiCard label="Canaries deployed" value="36" unit="5 types" delta={{ label: "+4 this week", direction: "up", intent: "good" }} />
        <KpiCard
          label="Triggered · 30 d"
          value="2"
          unit="both today"
          tone="critical"
          delta={{ label: "First triggers since May", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Mean time to trigger" value="17" unit="min after access" delta={{ label: "From file read to first API call" }} />
        <KpiCard label="Health checks" value="100%" unit="36 of 36 reachable" delta={{ label: "Checked every 5 min" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Canaries" description={`${rows.length} of ${canaries.length} shown`} flush>
          <div className="border-b border-line px-3 py-2">
            <FilterBar onClear={types.length ? () => setTypes([]) : undefined}>
              <FacetFilter
                label="Type"
                selected={types}
                onChange={setTypes}
                options={TYPES.map((t) => ({ value: t.value, label: t.label, count: canaries.filter((c) => c.type === t.value).length }))}
              />
              <SearchInput label="Search canaries" className="w-56" />
            </FilterBar>
          </div>
          <DataTable label="Canaries" columns={canaryColumns} rows={rows} getRowId={(c) => c.id} minWidth={820} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Triggers" description="Every touch, with where it came from" flush>
            <ol className="flex flex-col" aria-label="Trigger timeline">
              {triggers.map((t) => (
                <li key={t.id} className="grid grid-cols-[12px_minmax(0,1fr)] gap-2 border-b border-subtle px-3 py-2.5 last:border-0">
                  <span aria-hidden className="mt-1.5 size-2 rounded-full bg-critical" />
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{t.canary}</span>
                      <span className="font-mono text-2xs text-fg-muted">{t.time}</span>
                    </div>
                    <span className="flex flex-wrap items-center gap-1">
                      <EntityChip kind="ip" value={t.ip} href="#ip" />
                    </span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{t.ua}</span>
                    <span className="text-xs text-fg-muted">{t.detail}</span>
                    <div>
                      {opened.includes(t.id) ? (
                        <StatusBadge tone="info">Incident INC-{t.id === "t-2" ? "212" : "211"} open</StatusBadge>
                      ) : (
                        <Button size="xs" icon={<Siren />} aria-label={`Open incident for ${t.canary}`} onClick={() => setOpened((o) => [...o, t.id])}>
                          Open incident
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Deploy a canary" description="Plant it where only an intruder would look">
            <form className="flex flex-col gap-2.5" onSubmit={deploy} aria-label="Deploy a canary">
              <SelectField
                label="Type"
                value={type}
                onChange={(e) => setType(e.target.value as CanaryType)}
                options={TYPES.map((t) => ({ value: t.value, label: t.label }))}
              />
              <TextField
                label="Location"
                mono
                placeholder="worker-prod-09:/home/ops/.aws/credentials"
                hint="Host path, bucket key, repository file or DNS name"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
              />
              <div>
                <Button type="submit" size="sm" variant="primary" icon={<Plus />}>
                  Deploy
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

interface TriggerEvent extends Trigger {
  type: CanaryType;
  geo: string;
  verdict: "open" | "incident" | "test";
  steps: Array<{ t: string; text: string }>;
}

const TRIGGER_EVENTS: TriggerEvent[] = [
  {
    ...triggers[0]!,
    type: "aws-key",
    geo: "AS64500 · VPS provider",
    verdict: "open",
    steps: [
      { t: "13:41:02", text: "SSH login as deploy on api-prod-01 from 198.51.100.201" },
      { t: "13:43:47", text: "cat ~deploy/.aws/credentials (Runtime: file read)" },
      { t: "13:58:12", text: "sts:GetCallerIdentity with the canary key" },
      { t: "13:58:14", text: "s3:ListBuckets in eu-central-1 · AccessDenied" },
    ],
  },
  {
    ...triggers[1]!,
    type: "db-user",
    geo: "AS64501 · residential",
    verdict: "open",
    steps: [
      { t: "13:40:51", text: "Connection to db-prod-02:5432 from 203.0.113.24" },
      { t: "13:41:05", text: "Login as svc_reporting succeeded (decoy role)" },
      { t: "13:41:06", text: "SELECT * FROM customers LIMIT 100 · returned 100 fake rows" },
    ],
  },
  {
    id: "t-0",
    canary: "Internal wiki token",
    time: "Oct 12 · 10:14",
    ip: "192.0.2.44",
    ua: "Mozilla/5.0 (Macintosh) Chrome/129",
    detail: "DNS lookup of c7f2.canary.example.com from the office resolver",
    type: "dns-token",
    geo: "Office network",
    verdict: "test",
    steps: [{ t: "10:14:03", text: "Resolved by 192.0.2.44 (Emily Clark's laptop during quarterly test)" }],
  },
];

function TriggersPage() {
  const [verdict, setVerdict] = useState<Record<string, TriggerEvent["verdict"]>>(Object.fromEntries(TRIGGER_EVENTS.map((t) => [t.id, t.verdict])));
  const [active, setActive] = useState("t-2");
  const cur = TRIGGER_EVENTS.find((t) => t.id === active);
  const cols: Column<TriggerEvent>[] = [
    { id: "time", header: "Time", mono: true, width: "110px", cell: (t) => t.time },
    {
      id: "canary",
      header: "Canary",
      cell: (t) => (
        <span className="flex flex-col">
          <span className="font-medium">{t.canary}</span>
          <span className="text-2xs text-fg-muted">{typeLabel(t.type)}</span>
        </span>
      ),
    },
    {
      id: "ip",
      header: "Source",
      cell: (t) => (
        <span className="flex flex-col items-start gap-0.5">
          <EntityChip kind="ip" value={t.ip} hideKind />
          <span className="text-2xs text-fg-muted">{t.geo}</span>
        </span>
      ),
    },
    {
      id: "verdict",
      header: "Verdict",
      cell: (t) => {
        const v = verdict[t.id] ?? t.verdict;
        return (
          <StatusBadge tone={v === "open" ? "critical" : v === "incident" ? "info" : "neutral"}>
            {v === "open" ? "Needs triage" : v === "incident" ? "Incident" : "Test"}
          </StatusBadge>
        );
      },
    },
  ];
  return (
    <>
      <PageHeader title="Triggers" description="Every time a canary was touched. Canaries have no legitimate use, so each trigger is high-signal." />
      <KpiGrid>
        <KpiCard label="Triggers · 30 d" value="3" />
        <KpiCard label="Needs triage" value={`${Object.values(verdict).filter((v) => v === "open").length}`} tone="critical" />
        <KpiCard label="False positives · 12 mo" value="0" tone="success" delta={{ label: "Tests are marked, not counted" }} />
        <KpiCard label="Median alert delay" value="4" unit="s" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Triggers" flush>
          <DataTable
            label="Canary triggers"
            columns={cols}
            rows={TRIGGER_EVENTS}
            getRowId={(t) => t.id}
            onRowClick={(t) => setActive(t.id)}
            activeRowId={active}
            minWidth={620}
          />
        </Panel>
        <Panel title="What happened" description={cur ? `${cur.canary} · ${cur.ip}` : undefined} aria-label="Trigger detail">
          {cur && (
            <div className="flex flex-col gap-2.5 text-sm">
              <ol aria-label={`Timeline for ${cur.canary}`} className="flex flex-col gap-1">
                {cur.steps.map((s) => (
                  <li key={s.t} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2">
                    <span className="font-mono text-2xs text-fg-muted">{s.t}</span>
                    <span>{s.text}</span>
                  </li>
                ))}
              </ol>
              <span className="truncate font-mono text-2xs text-fg-muted">{cur.ua}</span>
              {(verdict[cur.id] ?? cur.verdict) === "open" && (
                <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                  <Button size="sm" variant="danger" icon={<Siren />} onClick={() => setVerdict((v) => ({ ...v, [cur.id]: "incident" }))}>
                    Open incident
                  </Button>
                  <Button size="sm" onClick={() => setVerdict((v) => ({ ...v, [cur.id]: "test" }))}>
                    Mark as test
                  </Button>
                </div>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Decoy credentials                                                   */
/* ------------------------------------------------------------------ */

interface DecoyCred {
  id: string;
  kind: "AWS access key" | "Database user" | "AD account" | "API token" | "SSH key";
  identity: string;
  seeded: string;
  places: number;
  lastRotated: string;
  status: "armed" | "triggered";
}

const CREDS: DecoyCred[] = [
  {
    id: "k1",
    kind: "AWS access key",
    identity: "AKIA…7QZD · backup-svc",
    seeded: "api-prod-01 ~deploy/.aws",
    places: 1,
    lastRotated: "Aug 2",
    status: "triggered",
  },
  {
    id: "k2",
    kind: "AWS access key",
    identity: "AKIA…L2WM · ci-deploy",
    seeded: "infra/terraform/.env.example",
    places: 1,
    lastRotated: "Sep 18",
    status: "armed",
  },
  {
    id: "k3",
    kind: "Database user",
    identity: "svc_reporting @ db-prod-02",
    seeded: "/etc/reports/db.conf on 3 hosts",
    places: 3,
    lastRotated: "Jul 30",
    status: "triggered",
  },
  {
    id: "k4",
    kind: "AD account",
    identity: "EXAMPLE\\svc_backup_admin",
    seeded: "LSASS on 12 Windows hosts",
    places: 12,
    lastRotated: "Oct 1",
    status: "armed",
  },
  {
    id: "k5",
    kind: "API token",
    identity: "Stripe-like sk_live_…canary",
    seeded: "payments-api .env (staging)",
    places: 1,
    lastRotated: "Sep 4",
    status: "armed",
  },
  {
    id: "k6",
    kind: "SSH key",
    identity: "id_ed25519 · root@bastion-legacy",
    seeded: "worker-prod-* /root/.ssh",
    places: 6,
    lastRotated: "Aug 21",
    status: "armed",
  },
];

function CredentialsPage() {
  const [rotated, setRotated] = useState<string[]>([]);
  const cols: Column<DecoyCred>[] = [
    { id: "kind", header: "Type", cell: (k) => <Badge>{k.kind}</Badge> },
    { id: "identity", header: "Identity", width: "26%", cell: (k) => <span className="block truncate font-mono text-xs">{k.identity}</span> },
    { id: "seeded", header: "Seeded in", width: "26%", cell: (k) => <span className="block truncate text-xs">{k.seeded}</span> },
    { id: "places", header: "Places", align: "right", mono: true, cell: (k) => k.places },
    { id: "rotated", header: "Last rotated", cell: (k) => <span className="text-xs">{rotated.includes(k.id) ? "Just now" : k.lastRotated}</span> },
    {
      id: "status",
      header: "Status",
      cell: (k) =>
        k.status === "triggered" && !rotated.includes(k.id) ? (
          <StatusBadge tone="critical">Triggered</StatusBadge>
        ) : (
          <StatusBadge tone="success">Armed</StatusBadge>
        ),
    },
    {
      id: "act",
      header: "",
      width: "84px",
      hideable: false,
      cell: (k) => (
        <Button size="xs" variant="ghost" onClick={() => setRotated((r) => [...r, k.id])} aria-label={`Rotate ${k.identity}`} disabled={rotated.includes(k.id)}>
          Rotate
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Decoy credentials"
        description="Credentials with no real permissions, planted where attackers harvest secrets. Any use is reported with the source."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New decoy credential
          </Button>
        }
      />
      <Callout tone="info" title="Decoys never grant access">
        AWS keys belong to a user with an explicit deny-all policy. The decoy DB role can only read a schema of generated fake customers.
      </Callout>
      <Panel title="Decoy credentials" description={`${CREDS.length} identities in ${CREDS.reduce((s, k) => s + k.places, 0)} places`} flush>
        <DataTable label="Decoy credentials" columns={cols} rows={CREDS} getRowId={(k) => k.id} minWidth={980} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Decoy hosts                                                         */
/* ------------------------------------------------------------------ */

interface DecoyHost {
  id: string;
  name: string;
  ip: string;
  persona: string;
  services: string[];
  segment: string;
  touches7d: number;
  lastTouch: string;
  enabled: boolean;
}

const DECOY_HOSTS: DecoyHost[] = [
  {
    id: "h1",
    name: "db-backup-02",
    ip: "192.0.2.121",
    persona: "PostgreSQL 14 on Ubuntu 22.04",
    services: ["22/ssh", "5432/postgres"],
    segment: "prod-db",
    touches7d: 1,
    lastTouch: "Oct 18 · 23:12",
    enabled: true,
  },
  {
    id: "h2",
    name: "bastion-legacy",
    ip: "192.0.2.120",
    persona: "OpenSSH 7.4 on CentOS 7",
    services: ["22/ssh"],
    segment: "dmz",
    touches7d: 0,
    lastTouch: "never",
    enabled: true,
  },
  {
    id: "h3",
    name: "fs02",
    ip: "192.0.2.140",
    persona: "Windows Server 2016 file share",
    services: ["445/smb", "3389/rdp"],
    segment: "corp",
    touches7d: 0,
    lastTouch: "Sep 2",
    enabled: true,
  },
  {
    id: "h4",
    name: "jenkins-old",
    ip: "192.0.2.150",
    persona: "Jenkins 2.346 login page",
    services: ["8080/http"],
    segment: "build",
    touches7d: 2,
    lastTouch: "Oct 17 · 04:40",
    enabled: true,
  },
  {
    id: "h5",
    name: "redis-cache-03",
    ip: "192.0.2.160",
    persona: "Redis 5.0 without auth",
    services: ["6379/redis"],
    segment: "prod-app",
    touches7d: 0,
    lastTouch: "never",
    enabled: false,
  },
];

function HostsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(DECOY_HOSTS.map((h) => [h.id, h.enabled])));
  const cols: Column<DecoyHost>[] = [
    {
      id: "name",
      header: "Decoy",
      cell: (h) => (
        <span className="flex flex-col items-start gap-0.5">
          <EntityChip kind="host" value={h.name} hideKind />
          <span className="font-mono text-2xs text-fg-muted">{h.ip}</span>
        </span>
      ),
    },
    { id: "persona", header: "Looks like", cell: (h) => <span className="text-xs">{h.persona}</span> },
    {
      id: "services",
      header: "Services",
      cell: (h) => (
        <span className="flex flex-wrap gap-1">
          {h.services.map((s) => (
            <Badge key={s} mono>
              {s}
            </Badge>
          ))}
        </span>
      ),
    },
    { id: "segment", header: "Segment", mono: true, cell: (h) => h.segment },
    {
      id: "touches",
      header: "Touches · 7 d",
      align: "right",
      mono: true,
      sortValue: (h) => h.touches7d,
      cell: (h) => (h.touches7d ? <Badge tone="danger">{h.touches7d}</Badge> : 0),
    },
    { id: "last", header: "Last touch", cell: (h) => <span className="text-xs">{h.lastTouch}</span> },
    {
      id: "on",
      header: "Enabled",
      cell: (h) => (
        <Switch
          checked={enabled[h.id] ?? false}
          onCheckedChange={(v) => setEnabled((e) => ({ ...e, [h.id]: v }))}
          label={<span className="sr-only">Enable {h.name}</span>}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Decoy hosts"
        description="Lightweight fake services in each network segment. Nothing should ever connect to them."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New decoy host
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Decoy hosts" value={`${Object.values(enabled).filter(Boolean).length}`} unit="running" />
        <KpiCard label="Segments covered" value="5" unit="of 6" tone="warning" delta={{ label: "guest Wi-Fi has none" }} />
        <KpiCard label="Touches · 7 d" value="3" tone="danger" />
        <KpiCard label="Resource use" value="0.2" unit="vCPU total" />
      </KpiGrid>
      <Panel title="Decoy hosts" flush>
        <DataTable label="Decoy hosts" columns={cols} rows={DECOY_HOSTS} getRowId={(h) => h.id} minWidth={940} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Templates                                                           */
/* ------------------------------------------------------------------ */

interface CanaryTemplate {
  id: string;
  name: string;
  type: CanaryType;
  file: string;
  preview: string;
  used: number;
}

const CANARY_TEMPLATES: CanaryTemplate[] = [
  {
    id: "ct1",
    name: "AWS credentials file",
    type: "aws-key",
    file: "~/.aws/credentials",
    preview: "[default]\naws_access_key_id = AKIA{{random}}\naws_secret_access_key = {{random}}\nregion = eu-central-1",
    used: 9,
  },
  {
    id: "ct2",
    name: "Kubeconfig with admin context",
    type: "dns-token",
    file: "~/.kube/config",
    preview: "apiVersion: v1\nclusters:\n- cluster:\n    server: https://{{token}}.canary.example.com\n  name: prod-admin\ncurrent-context: prod-admin",
    used: 6,
  },
  {
    id: "ct3",
    name: ".env with database URL",
    type: "db-user",
    file: ".env",
    preview: "DATABASE_URL=postgres://svc_reporting:{{password}}@db-prod-02:5432/orders\nREDIS_URL=redis://redis-cache-03:6379",
    used: 7,
  },
  {
    id: "ct4",
    name: "Payroll spreadsheet (PDF)",
    type: "pdf-doc",
    file: "Payroll-{{quarter}}.pdf",
    preview: "PDF with a remote image beacon. Opening it in any viewer that loads images calls home with the reader's IP.",
    used: 4,
  },
  {
    id: "ct5",
    name: "SSH known host",
    type: "ssh-host",
    file: "~/.ssh/config",
    preview: "Host bastion-legacy\n  HostName 192.0.2.120\n  User root\n  IdentityFile ~/.ssh/id_legacy",
    used: 5,
  },
];

function TemplatesPage() {
  const [active, setActive] = useState("ct1");
  const [copied, setCopied] = useState(false);
  const cur = CANARY_TEMPLATES.find((t) => t.id === active);
  const cols: Column<CanaryTemplate>[] = [
    { id: "name", header: "Template", width: "40%", cell: (t) => <span className="font-medium">{t.name}</span> },
    { id: "type", header: "Type", cell: (t) => <Badge>{typeLabel(t.type)}</Badge> },
    { id: "file", header: "File", mono: true, cell: (t) => t.file },
    { id: "used", header: "Deployed", align: "right", mono: true, cell: (t) => t.used },
  ];
  return (
    <>
      <PageHeader
        title="Templates"
        description="Realistic bait files. Each deploy generates unique values, so a trigger tells you exactly which copy was read."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Templates" flush>
          <DataTable
            label="Canary templates"
            columns={cols}
            rows={CANARY_TEMPLATES}
            getRowId={(t) => t.id}
            onRowClick={(t) => (setActive(t.id), setCopied(false))}
            activeRowId={active}
            minWidth={560}
          />
        </Panel>
        <Panel
          title="Preview"
          description={cur?.file}
          aria-label="Template preview"
          actions={
            <Button size="sm" onClick={() => setCopied(true)}>
              Copy deploy command
            </Button>
          }
        >
          {cur && (
            <div className="flex flex-col gap-2">
              <pre
                tabIndex={0}
                aria-label={`Contents of ${cur.name}`}
                className="overflow-x-auto rounded border border-line bg-subtle p-2 font-mono text-xs whitespace-pre-wrap"
              >
                {cur.preview}
              </pre>
              {copied && (
                <p role="status" className="text-xs text-success">
                  Copied: openasy deception deploy --template {cur.id} --host &lt;host&gt;
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  canaries: () => <CanariesPage />,
  triggers: () => <TriggersPage />,
  credentials: () => <CredentialsPage />,
  hosts: () => <HostsPage />,
  templates: () => <TemplatesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="deception" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Canaries: Story = {
  ...app("canaries"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Canaries" })).toBeInTheDocument();
    await expect(c.getByRole("alert")).toHaveTextContent("198.51.100.201");
    const table = c.getByRole("table", { name: "Canaries" });
    await expect(within(table).getAllByRole("row")).toHaveLength(initialCanaries.length + 1);

    const form = within(c.getByRole("form", { name: "Deploy a canary" }));
    await userEvent.selectOptions(form.getByLabelText("Type"), "ssh-host");
    await userEvent.type(form.getByLabelText("Location"), "192.0.2.130:22");
    await userEvent.click(form.getByRole("button", { name: "Deploy" }));

    await expect(within(table).getAllByRole("row")).toHaveLength(initialCanaries.length + 2);
    await expect(within(table).getByText("192.0.2.130:22")).toBeInTheDocument();
    await expect(within(table).getByText("New Fake SSH host")).toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: "Open incident for backup-svc AWS key" }));
    await expect(c.getByText("Incident INC-212 open")).toBeInTheDocument();
  },
};

export const Triggers: Story = {
  ...app("triggers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Timeline for backup-svc AWS key" })).toHaveTextContent("sts:GetCallerIdentity");
    await userEvent.click(c.getByRole("button", { name: "Mark as test" }));
    await expect(c.queryByRole("button", { name: "Mark as test" })).not.toBeInTheDocument();
  },
};

export const Credentials: Story = {
  name: "Decoy credentials",
  ...app("credentials"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = within(c.getByRole("table", { name: "Decoy credentials" }));
    await expect(table.getAllByText("Triggered")).toHaveLength(2);
    await userEvent.click(c.getByRole("button", { name: "Rotate AKIA…7QZD · backup-svc" }));
    await expect(table.getAllByText("Triggered")).toHaveLength(1);
  },
};

export const Hosts: Story = {
  name: "Decoy hosts",
  ...app("hosts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Enable redis-cache-03" }));
    await expect(c.getByRole("switch", { name: "Enable redis-cache-03" })).toBeChecked();
  },
};

export const Templates: Story = {
  ...app("templates"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Canary templates" })).getByText(".env with database URL"));
    await expect(c.getByLabelText("Contents of .env with database URL")).toHaveTextContent("svc_reporting");
    await userEvent.click(c.getByRole("button", { name: "Copy deploy command" }));
    await expect(c.getByText(/--template ct3/)).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
