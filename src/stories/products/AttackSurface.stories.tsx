import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BadgeCheck, Boxes, GitCompare, Globe, Play, Plus, Radar, Send, TriangleAlert } from "lucide-react";
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
import { EntityChip } from "../../components/EntityChip";
import { BarList } from "../../charts/BarList";
import { SEVERITY_META, TONE_COLORS, type Severity } from "../../tokens/levels";
import { wave } from "../mocks";

const nav = [
  { id: "assets", label: "Assets", icon: Boxes, count: 312 },
  { id: "exposures", label: "Exposures", icon: TriangleAlert, count: 27 },
  { id: "domains", label: "Domains", icon: Globe, count: 14 },
  { id: "certificates", label: "Certificates", icon: BadgeCheck },
  { id: "scans", label: "Scans", icon: Radar },
  { id: "changes", label: "Changes", icon: GitCompare },
];

const meta = {
  title: "Products/Attack Surface",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Exposure {
  id: string;
  severity: Severity;
  finding: string;
  detail: string;
  host: string;
  ip: string;
  port: number;
  service: string;
  technology: string;
  firstSeen: string;
  isNew?: boolean;
}

const exposures: Exposure[] = [
  {
    id: "ex-27",
    severity: "critical",
    finding: "Elasticsearch without auth",
    detail: "GET /_cat/indices returns 41 indices",
    host: "staging-admin.example.com",
    ip: "203.0.113.57",
    port: 9200,
    service: "http",
    technology: "Elasticsearch 7.10.2",
    firstSeen: "Today 06:00",
    isNew: true,
  },
  {
    id: "ex-26",
    severity: "critical",
    finding: "RDP open to internet",
    detail: "NLA enabled · no IP allow list",
    host: "win-build-02.example.com",
    ip: "198.51.100.34",
    port: 3389,
    service: "ms-wbt-server",
    technology: "Windows Server 2019",
    firstSeen: "3 days ago",
  },
  {
    id: "ex-25",
    severity: "high",
    finding: "Subdomain takeover candidate",
    detail: "CNAME to unclaimed acme-docs.s3-website bucket",
    host: "docs-old.example.com",
    ip: "203.0.113.200",
    port: 443,
    service: "https",
    technology: "Amazon S3 website",
    firstSeen: "Today 06:00",
    isNew: true,
  },
  {
    id: "ex-24",
    severity: "high",
    finding: "Expired TLS on mail.example.com",
    detail: "Let's Encrypt R11 · expired 2 days ago",
    host: "mail.example.com",
    ip: "198.51.100.12",
    port: 465,
    service: "smtps",
    technology: "Postfix 3.7",
    firstSeen: "2 days ago",
  },
  {
    id: "ex-23",
    severity: "high",
    finding: "Redis exposed without password",
    detail: "INFO returns redis_version:6.2.6",
    host: "cache-eu.example.com",
    ip: "203.0.113.88",
    port: 6379,
    service: "redis",
    technology: "Redis 6.2.6",
    firstSeen: "6 days ago",
  },
  {
    id: "ex-22",
    severity: "medium",
    finding: "Grafana login page exposed",
    detail: "Anonymous access disabled · version banner visible",
    host: "grafana.example.com",
    ip: "198.51.100.71",
    port: 3000,
    service: "http",
    technology: "Grafana 10.2.3",
    firstSeen: "12 days ago",
  },
  {
    id: "ex-21",
    severity: "medium",
    finding: "SSH allows password authentication",
    detail: "PasswordAuthentication yes",
    host: "bastion-02.example.com",
    ip: "192.0.2.15",
    port: 22,
    service: "ssh",
    technology: "OpenSSH 8.9p1",
    firstSeen: "20 days ago",
  },
  {
    id: "ex-20",
    severity: "medium",
    finding: "TLS 1.0 still accepted",
    detail: "TLS_RSA_WITH_AES_128_CBC_SHA negotiated",
    host: "legacy-api.example.com",
    ip: "203.0.113.140",
    port: 443,
    service: "https",
    technology: "nginx 1.18.0",
    firstSeen: "1 month ago",
  },
  {
    id: "ex-19",
    severity: "low",
    finding: "Server version disclosed in headers",
    detail: "Server: Apache/2.4.52 (Ubuntu)",
    host: "www.example.com",
    ip: "198.51.100.10",
    port: 443,
    service: "https",
    technology: "Apache 2.4.52",
    firstSeen: "2 months ago",
  },
  {
    id: "ex-18",
    severity: "low",
    finding: "Missing DMARC policy",
    detail: "_dmarc TXT record not found",
    host: "marketing.example.com",
    ip: "192.0.2.80",
    port: 53,
    service: "dns",
    technology: "DNS",
    firstSeen: "2 months ago",
  },
];

const portStats = [
  { id: "443", label: "443 https", value: 142 },
  { id: "80", label: "80 http", value: 96 },
  { id: "22", label: "22 ssh", value: 31 },
  { id: "25", label: "25 smtp", value: 9 },
  { id: "3389", label: "3389 rdp", value: 2, color: TONE_COLORS.danger },
  { id: "9200", label: "9200 elasticsearch", value: 1, color: TONE_COLORS.critical },
  { id: "6379", label: "6379 redis", value: 1, color: TONE_COLORS.danger },
];

/** Exposures: what the internet can reach, found by the scheduled CI scan, ranked by severity. */
function ExposuresPage() {
  const [range, setRange] = useState("7d");
  const [sev, setSev] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const [sent, setSent] = useState<Exposure | null>(null);
  const rows = useMemo(
    () =>
      exposures.filter(
        (e) =>
          (sev.length === 0 || sev.includes(e.severity)) &&
          (!q || `${e.finding} ${e.host} ${e.ip} ${e.port} ${e.technology}`.toLowerCase().includes(q.toLowerCase())),
      ),
    [sev, q],
  );

  const columns: Column<Exposure>[] = [
    { id: "sev", header: "Severity", width: "100px", sortValue: (e) => SEVERITY_META[e.severity].rank, cell: (e) => <SeverityBadge severity={e.severity} /> },
    {
      id: "finding",
      header: "Finding",
      width: "28%",
      sortValue: (e) => e.finding,
      cell: (e) => (
        <span className="flex min-w-0 flex-col">
          <span className="flex items-center gap-1.5">
            <a href={`#${e.id}`} className="truncate font-medium text-fg no-underline hover:underline">
              {e.finding}
            </a>
            {e.isNew && (
              <Badge tone="info" className="h-4 px-1 text-2xs">
                New
              </Badge>
            )}
          </span>
          <span className="truncate text-2xs text-fg-muted">{e.detail}</span>
        </span>
      ),
    },
    {
      id: "asset",
      header: "Asset",
      cell: (e) => (
        <span className="flex flex-col items-start gap-0.5">
          <EntityChip kind="host" value={e.host} hideKind href="#asset" />
          <EntityChip kind="ip" value={e.ip} hideKind href="#ip" />
        </span>
      ),
    },
    { id: "port", header: "Port / service", mono: true, sortValue: (e) => e.port, cell: (e) => `${e.port}/${e.service}` },
    { id: "tech", header: "Technology", cell: (e) => <span className="text-xs">{e.technology}</span> },
    { id: "first", header: "First seen", align: "right", cell: (e) => <span className="whitespace-nowrap text-fg-muted">{e.firstSeen}</span> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      align: "right",
      width: "128px",
      cell: (e) => (
        <Button size="xs" icon={<Send aria-hidden />} aria-label={`Send to DAST: ${e.host}`} onClick={() => setSent(e)}>
          Send to DAST
        </Button>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Exposures"
        description="Runs from CI on a schedule (daily 06:00 UTC) · no server to operate · 14 root domains"
        meta={<StatusBadge tone="success">Last scan 06:00 · 8 m 12 s</StatusBadge>}
        actions={
          <>
            <Button size="md" variant="ghost">
              View workflow
            </Button>
            <Button size="md" variant="primary" icon={<Play aria-hidden />}>
              Run scan now
            </Button>
          </>
        }
      />
      <FilterBar
        onClear={
          sev.length || q
            ? () => {
                setSev([]);
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
          options={(["critical", "high", "medium", "low"] as const).map((s) => ({
            value: s,
            label: SEVERITY_META[s].label,
            count: exposures.filter((e) => e.severity === s).length,
          }))}
        />
        <SearchInput label="Search hosts, IPs, ports" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterBar>
      <Callout tone="warning" title="New since last scan: staging-admin.example.com appeared" action={<Button size="sm">Review changes</Button>}>
        Resolves to 203.0.113.57 with port 9200 open: Elasticsearch 7.10.2 answers without authentication. Also new: docs-old.example.com points at an unclaimed
        bucket.
      </Callout>
      <KpiGrid>
        <KpiCard
          label="Internet-facing assets"
          value="312"
          unit="hosts and services"
          trend={wave(14, { base: 300, amp: 8, seed: 11 })}
          delta={{ label: "+4 vs. last week", direction: "up" }}
        />
        <KpiCard label="New this week" value="9" unit="assets" delta={{ label: "2 with open findings", intent: "bad" }} />
        <KpiCard
          label="Critical exposures"
          value="2"
          unit="open"
          tone="critical"
          trendColor="var(--oa-critical)"
          trend={[0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2]}
          delta={{ label: "+1 since last scan", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Expiring certificates" value="3" unit="within 14 days" tone="warning" delta={{ label: "1 already expired" }} />
      </KpiGrid>
      {sent && (
        <Callout tone="success" title={`Sent ${sent.host} to DAST`} onDismiss={() => setSent(null)}>
          Unauthenticated baseline scan queued for {sent.ip}:{sent.port} · results appear under Findings in DAST.
        </Callout>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Exposures" description={`${rows.length} of ${exposures.length} shown · 27 open in total`} flush>
          <DataTable
            label="Exposures"
            columns={columns}
            rows={rows}
            getRowId={(e) => e.id}
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={1000}
            empty={<p className="py-8">No exposures match these filters</p>}
          />
        </Panel>
        <Panel title="Exposed services by port" description="Open ports across 312 assets">
          <BarList label="Exposed services by port" items={portStats} />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Assets                                                              */
/* ------------------------------------------------------------------ */

interface Asset {
  id: string;
  host: string;
  ip: string;
  kind: "web" | "api" | "mail" | "dns" | "remote access" | "database" | "storage";
  ports: number[];
  tech: string;
  cloud: string;
  owner?: string;
  findings: number;
  firstSeen: string;
  known: boolean;
}

const ASSETS: Asset[] = [
  {
    id: "as1",
    host: "www.example.com",
    ip: "198.51.100.10",
    kind: "web",
    ports: [80, 443],
    tech: "Apache 2.4.52",
    cloud: "Hetzner",
    owner: "Web team",
    findings: 1,
    firstSeen: "2 y ago",
    known: true,
  },
  {
    id: "as2",
    host: "api.example.com",
    ip: "198.51.100.11",
    kind: "api",
    ports: [443],
    tech: "nginx 1.25 · Node 22",
    cloud: "AWS eu-central-1",
    owner: "Platform",
    findings: 0,
    firstSeen: "2 y ago",
    known: true,
  },
  {
    id: "as3",
    host: "staging-admin.example.com",
    ip: "203.0.113.57",
    kind: "database",
    ports: [443, 9200],
    tech: "Elasticsearch 7.10.2",
    cloud: "AWS eu-west-1",
    findings: 1,
    firstSeen: "Today",
    known: false,
  },
  {
    id: "as4",
    host: "mail.example.com",
    ip: "198.51.100.12",
    kind: "mail",
    ports: [25, 465, 587, 993],
    tech: "Postfix 3.7 · Dovecot",
    cloud: "Hetzner",
    owner: "IT",
    findings: 1,
    firstSeen: "2 y ago",
    known: true,
  },
  {
    id: "as5",
    host: "win-build-02.example.com",
    ip: "198.51.100.34",
    kind: "remote access",
    ports: [3389],
    tech: "Windows Server 2019",
    cloud: "Azure westeurope",
    owner: "Build",
    findings: 1,
    firstSeen: "3 d ago",
    known: false,
  },
  {
    id: "as6",
    host: "docs-old.example.com",
    ip: "203.0.113.200",
    kind: "storage",
    ports: [80, 443],
    tech: "Amazon S3 website",
    cloud: "AWS us-east-1",
    findings: 1,
    firstSeen: "Today",
    known: false,
  },
  {
    id: "as7",
    host: "cache-eu.example.com",
    ip: "203.0.113.88",
    kind: "database",
    ports: [6379],
    tech: "Redis 6.2.6",
    cloud: "AWS eu-central-1",
    owner: "Platform",
    findings: 1,
    firstSeen: "6 d ago",
    known: true,
  },
  {
    id: "as8",
    host: "grafana.example.com",
    ip: "198.51.100.71",
    kind: "web",
    ports: [443, 3000],
    tech: "Grafana 10.2.3",
    cloud: "AWS eu-central-1",
    owner: "SRE",
    findings: 1,
    firstSeen: "1 y ago",
    known: true,
  },
  {
    id: "as9",
    host: "bastion-02.example.com",
    ip: "192.0.2.15",
    kind: "remote access",
    ports: [22],
    tech: "OpenSSH 8.9p1",
    cloud: "Hetzner",
    owner: "SRE",
    findings: 1,
    firstSeen: "1 y ago",
    known: true,
  },
  {
    id: "as10",
    host: "vpn.example.com",
    ip: "192.0.2.20",
    kind: "remote access",
    ports: [443, 1194],
    tech: "OpenVPN 2.6",
    cloud: "Hetzner",
    owner: "IT",
    findings: 0,
    firstSeen: "2 y ago",
    known: true,
  },
  {
    id: "as11",
    host: "ns1.example.com",
    ip: "192.0.2.53",
    kind: "dns",
    ports: [53],
    tech: "PowerDNS 4.8",
    cloud: "Hetzner",
    owner: "IT",
    findings: 0,
    firstSeen: "2 y ago",
    known: true,
  },
  {
    id: "as12",
    host: "legacy-api.example.com",
    ip: "203.0.113.140",
    kind: "api",
    ports: [443],
    tech: "nginx 1.18.0",
    cloud: "OVH",
    owner: "Payments",
    findings: 1,
    firstSeen: "3 y ago",
    known: true,
  },
];

function AssetsPage() {
  const [kind, setKind] = useState<string[]>([]);
  const [unknown, setUnknown] = useState(false);
  const [query, setQuery] = useState("");
  const [claimed, setClaimed] = useState<Record<string, string>>({});
  const rows = ASSETS.filter(
    (a) =>
      (kind.length === 0 || kind.includes(a.kind)) &&
      (!unknown || !(a.owner || claimed[a.id])) &&
      (!query || `${a.host} ${a.ip} ${a.tech}`.toLowerCase().includes(query.toLowerCase())),
  );
  const cols: Column<Asset>[] = [
    {
      id: "host",
      header: "Asset",
      pinned: "left",
      width: "24%",
      sortValue: (a) => a.host,
      cell: (a) => (
        <span className="flex flex-col items-start gap-0.5">
          <EntityChip kind="host" value={a.host} hideKind />
          <EntityChip kind="ip" value={a.ip} hideKind />
        </span>
      ),
    },
    { id: "kind", header: "Type", cell: (a) => <Badge>{a.kind}</Badge> },
    { id: "ports", header: "Open ports", mono: true, cell: (a) => a.ports.join(", ") },
    { id: "tech", header: "Technology", cell: (a) => <span className="text-xs">{a.tech}</span> },
    { id: "cloud", header: "Hosted at", cell: (a) => <span className="text-xs">{a.cloud}</span> },
    {
      id: "owner",
      header: "Owner",
      description: "Assets without an owner are usually shadow IT: something nobody remembers deploying.",
      cell: (a) =>
        a.owner || claimed[a.id] ? (
          <span className="text-xs">{a.owner ?? claimed[a.id]}</span>
        ) : (
          <Button size="xs" onClick={() => setClaimed((c) => ({ ...c, [a.id]: "Security" }))} aria-label={`Assign owner for ${a.host}`}>
            Assign
          </Button>
        ),
    },
    {
      id: "findings",
      header: "Findings",
      align: "right",
      mono: true,
      sortValue: (a) => a.findings,
      cell: (a) => (a.findings ? <Badge tone="danger">{a.findings}</Badge> : <span className="text-fg-subtle">0</span>),
    },
    { id: "first", header: "First seen", cell: (a) => (a.known ? <span className="text-xs">{a.firstSeen}</span> : <Badge tone="info">{a.firstSeen}</Badge>) },
  ];
  const kinds = [...new Set(ASSETS.map((a) => a.kind))];
  return (
    <>
      <PageHeader
        title="Assets"
        description="Everything reachable from the internet under 14 root domains and 6 IP ranges, found from DNS, CT logs and port scans."
      />
      <KpiGrid>
        <KpiCard label="Assets" value="312" unit="hosts and services" />
        <KpiCard label="No owner" value={`${ASSETS.filter((a) => !a.owner && !claimed[a.id]).length}`} tone="warning" delta={{ label: "Likely shadow IT" }} />
        <KpiCard label="With findings" value="27" tone="danger" />
        <KpiCard label="Cloud providers" value="5" delta={{ label: "AWS, Azure, Hetzner, OVH, S3" }} />
      </KpiGrid>
      <FilterBar onClear={kind.length || unknown || query ? () => (setKind([]), setUnknown(false), setQuery("")) : undefined}>
        <SearchInput label="Search assets" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />
        <FacetFilter
          label="Type"
          selected={kind}
          onChange={setKind}
          options={kinds.map((k) => ({ value: k, count: ASSETS.filter((a) => a.kind === k).length }))}
        />
        <Switch checked={unknown} onCheckedChange={setUnknown} label="Only without owner" />
      </FilterBar>
      <Panel title="Assets" description={`${rows.length} shown`} flush>
        <DataTable
          label="Assets"
          columns={cols}
          rows={rows}
          getRowId={(a) => a.id}
          defaultSort={{ id: "findings", direction: "desc" }}
          minWidth={1100}
          empty={<p className="py-8">No assets match</p>}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Domains                                                             */
/* ------------------------------------------------------------------ */

interface Domain {
  name: string;
  registrar: string;
  expires: string;
  expiresDays: number;
  subdomains: number;
  dnssec: boolean;
  spf: boolean;
  dmarc: "reject" | "quarantine" | "none" | "missing";
  lookalikes: number;
}

const DOMAINS: Domain[] = [
  { name: "example.com", registrar: "Gandi", expires: "Mar 2028", expiresDays: 520, subdomains: 184, dnssec: true, spf: true, dmarc: "reject", lookalikes: 3 },
  { name: "example.net", registrar: "Gandi", expires: "Mar 2028", expiresDays: 520, subdomains: 12, dnssec: true, spf: true, dmarc: "reject", lookalikes: 0 },
  {
    name: "shop.example.com",
    registrar: "Gandi",
    expires: "Mar 2028",
    expiresDays: 520,
    subdomains: 38,
    dnssec: true,
    spf: true,
    dmarc: "quarantine",
    lookalikes: 1,
  },
  {
    name: "marketing.example.com",
    registrar: "Gandi",
    expires: "Mar 2028",
    expiresDays: 520,
    subdomains: 21,
    dnssec: false,
    spf: true,
    dmarc: "missing",
    lookalikes: 0,
  },
  { name: "example.org", registrar: "Namecheap", expires: "Nov 2026", expiresDays: 24, subdomains: 4, dnssec: false, spf: false, dmarc: "none", lookalikes: 0 },
  { name: "example.io", registrar: "Namecheap", expires: "Jan 2027", expiresDays: 88, subdomains: 9, dnssec: false, spf: true, dmarc: "none", lookalikes: 2 },
];

const DMARC_TONE = { reject: "success", quarantine: "info", none: "warning", missing: "danger" } as const;

function DomainsPage() {
  const [active, setActive] = useState("example.com");
  const cur = DOMAINS.find((d) => d.name === active);
  const cols: Column<Domain>[] = [
    { id: "name", header: "Domain", width: "22%", cell: (d) => <EntityChip kind="url" value={d.name} hideKind /> },
    { id: "sub", header: "Subdomains", align: "right", mono: true, sortValue: (d) => d.subdomains, cell: (d) => d.subdomains },
    {
      id: "exp",
      header: "Registration",
      sortValue: (d) => d.expiresDays,
      cell: (d) =>
        d.expiresDays < 30 ? (
          <Badge tone="danger">
            {d.expires} · {d.expiresDays} d
          </Badge>
        ) : (
          <span className="text-xs">{d.expires}</span>
        ),
    },
    { id: "dnssec", header: "DNSSEC", cell: (d) => (d.dnssec ? <StatusBadge tone="success">On</StatusBadge> : <StatusBadge tone="warning">Off</StatusBadge>) },
    { id: "spf", header: "SPF", cell: (d) => (d.spf ? <StatusBadge tone="success">Valid</StatusBadge> : <StatusBadge tone="danger">Missing</StatusBadge>) },
    {
      id: "dmarc",
      header: "DMARC",
      description: "reject is the goal; none only reports; missing lets anyone send as this domain.",
      cell: (d) => <Badge tone={DMARC_TONE[d.dmarc]}>p={d.dmarc}</Badge>,
    },
    {
      id: "look",
      header: "Look-alikes",
      align: "right",
      mono: true,
      sortValue: (d) => d.lookalikes,
      cell: (d) => (d.lookalikes ? <Badge tone="warning">{d.lookalikes}</Badge> : 0),
    },
  ];
  return (
    <>
      <PageHeader
        title="Domains"
        description="Root domains you own, their mail security records and registered look-alikes."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add domain
          </Button>
        }
      />
      <Callout tone="danger" title="example.org registration expires in 24 days">
        Auto-renew is off at Namecheap. If it lapses, anyone can register it and receive mail sent to it.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Root domains" flush>
          <DataTable
            label="Domains"
            columns={cols}
            rows={DOMAINS}
            getRowId={(d) => d.name}
            onRowClick={(d) => setActive(d.name)}
            activeRowId={active}
            minWidth={820}
          />
        </Panel>
        <Panel title="Look-alike domains" description={cur ? `Registered by others, similar to ${cur.name}` : undefined} aria-label="Look-alike domains">
          {cur && cur.lookalikes > 0 ? (
            <ul className="flex flex-col gap-1.5 text-sm" aria-label={`Look-alikes of ${cur.name}`}>
              {["sso-" + cur.name.replace(".com", ".co"), cur.name.replace("e", "3"), cur.name.replace(".", "-") + ".net"].slice(0, cur.lookalikes).map((l) => (
                <li key={l} className="flex items-center justify-between gap-2 rounded border border-line px-2 py-1">
                  <span className="truncate font-mono text-xs">{l}</span>
                  <Badge tone="warning">MX record</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">No look-alikes registered</p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Certificates                                                        */
/* ------------------------------------------------------------------ */

interface ExtCert {
  id: string;
  cn: string;
  sans: number;
  issuer: string;
  expiresDays: number;
  grade: "A+" | "A" | "B" | "F";
  ct: "known" | "unexpected";
  seen: string;
}

const EXT_CERTS: ExtCert[] = [
  { id: "c1", cn: "mail.example.com", sans: 2, issuer: "Let's Encrypt R11", expiresDays: -2, grade: "F", ct: "known", seen: "2 days ago" },
  { id: "c2", cn: "legacy-api.example.com", sans: 1, issuer: "Sectigo RSA DV", expiresDays: 9, grade: "B", ct: "known", seen: "1 y ago" },
  { id: "c3", cn: "grafana.example.com", sans: 1, issuer: "Let's Encrypt R10", expiresDays: 12, grade: "A", ct: "known", seen: "60 days ago" },
  { id: "c4", cn: "*.example.com", sans: 2, issuer: "DigiCert TLS RSA SHA256 2020 CA1", expiresDays: 201, grade: "A+", ct: "known", seen: "5 months ago" },
  { id: "c5", cn: "staging-admin.example.com", sans: 1, issuer: "Let's Encrypt E6", expiresDays: 89, grade: "A", ct: "unexpected", seen: "Today" },
  { id: "c6", cn: "pay.example.com", sans: 3, issuer: "Google Trust Services WR3", expiresDays: 64, grade: "A+", ct: "unexpected", seen: "Yesterday" },
  { id: "c7", cn: "api.example.com", sans: 2, issuer: "Amazon RSA 2048 M02", expiresDays: 310, grade: "A+", ct: "known", seen: "3 months ago" },
];

function CertificatesPage() {
  const [expiring, setExpiring] = useState(false);
  const rows = EXT_CERTS.filter((c) => !expiring || c.expiresDays <= 14);
  const cols: Column<ExtCert>[] = [
    { id: "cn", header: "Common name", width: "26%", cell: (c) => <span className="font-mono text-xs">{c.cn}</span> },
    { id: "issuer", header: "Issuer", cell: (c) => <span className="text-xs">{c.issuer}</span> },
    { id: "sans", header: "SANs", align: "right", mono: true, cell: (c) => c.sans },
    {
      id: "exp",
      header: "Expires",
      sortValue: (c) => c.expiresDays,
      cell: (c) =>
        c.expiresDays < 0 ? (
          <Badge tone="critical">Expired {-c.expiresDays} d ago</Badge>
        ) : c.expiresDays <= 14 ? (
          <Badge tone="warning">{c.expiresDays} days</Badge>
        ) : (
          <span className="text-xs">{c.expiresDays} days</span>
        ),
    },
    { id: "grade", header: "TLS grade", cell: (c) => <Badge tone={c.grade === "F" ? "danger" : c.grade === "B" ? "warning" : "success"}>{c.grade}</Badge> },
    {
      id: "ct",
      header: "CT log",
      description: "Unexpected: issued by a CA you have not used before, or for a name not in the asset list. Could be shadow IT or a mis-issued certificate.",
      cell: (c) => (c.ct === "unexpected" ? <Badge tone="warning">Unexpected</Badge> : <Badge>Known</Badge>),
    },
    { id: "seen", header: "First seen", cell: (c) => <span className="text-xs">{c.seen}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Certificates"
        description="Certificates on internet-facing hosts plus every certificate issued for your domains in Certificate Transparency logs."
      />
      <KpiGrid>
        <KpiCard label="Certificates" value="58" unit="in use" />
        <KpiCard label="Expired" value="1" tone="critical" delta={{ label: "mail.example.com", intent: "bad" }} />
        <KpiCard label="Expiring · 14 d" value="2" tone="warning" />
        <KpiCard label="Unexpected in CT" value="2" tone="warning" delta={{ label: "Last 7 days" }} />
      </KpiGrid>
      <FilterBar>
        <Switch checked={expiring} onCheckedChange={setExpiring} label="Expired or expiring in 14 days" />
      </FilterBar>
      <Panel title="Certificates" description={`${rows.length} shown`} flush>
        <DataTable
          label="External certificates"
          columns={cols}
          rows={rows}
          getRowId={(c) => c.id}
          defaultSort={{ id: "exp", direction: "asc" }}
          minWidth={900}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Scans                                                               */
/* ------------------------------------------------------------------ */

interface ScanRun {
  id: string;
  started: string;
  trigger: "schedule" | "manual" | "CT alert";
  duration: string;
  assets: number;
  newAssets: number;
  findings: number;
  status: "success" | "partial" | "failed";
}

const SCAN_RUNS: ScanRun[] = [
  { id: "scan-301", started: "Today 06:00", trigger: "schedule", duration: "8 m 12 s", assets: 312, newAssets: 2, findings: 27, status: "success" },
  { id: "scan-300", started: "Yesterday 14:31", trigger: "CT alert", duration: "1 m 04 s", assets: 1, newAssets: 1, findings: 0, status: "success" },
  { id: "scan-299", started: "Yesterday 06:00", trigger: "schedule", duration: "8 m 40 s", assets: 310, newAssets: 0, findings: 25, status: "success" },
  { id: "scan-298", started: "Oct 17 · 06:00", trigger: "schedule", duration: "12 m 55 s", assets: 296, newAssets: 1, findings: 25, status: "partial" },
  { id: "scan-297", started: "Oct 16 · 11:20", trigger: "manual", duration: "7 m 58 s", assets: 309, newAssets: 3, findings: 24, status: "success" },
  { id: "scan-296", started: "Oct 16 · 06:00", trigger: "schedule", duration: "–", assets: 0, newAssets: 0, findings: 0, status: "failed" },
];

function ScansPage() {
  const [rate, setRate] = useState("1000");
  const [ports, setPorts] = useState("top-1000");
  const [saved, setSaved] = useState(false);
  const cols: Column<ScanRun>[] = [
    { id: "id", header: "Scan", mono: true, cell: (r) => r.id },
    { id: "started", header: "Started", mono: true, sortValue: (r) => r.id, cell: (r) => r.started },
    { id: "trigger", header: "Trigger", cell: (r) => <Badge>{r.trigger}</Badge> },
    { id: "dur", header: "Duration", align: "right", mono: true, cell: (r) => r.duration },
    { id: "assets", header: "Assets", align: "right", mono: true, cell: (r) => r.assets },
    { id: "new", header: "New", align: "right", mono: true, cell: (r) => (r.newAssets ? <Badge tone="info">+{r.newAssets}</Badge> : 0) },
    { id: "findings", header: "Findings", align: "right", mono: true, cell: (r) => r.findings },
    {
      id: "status",
      header: "Status",
      cell: (r) => <StatusBadge tone={r.status === "success" ? "success" : r.status === "partial" ? "warning" : "danger"}>{r.status}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader
        title="Scans"
        description="Scans run as a scheduled CI job from GitHub Actions. Nothing to host; results are pushed here."
        actions={
          <Button variant="primary" icon={<Play />}>
            Run scan now
          </Button>
        }
      />
      <Callout tone="warning" title="scan-296 failed: runner lost network after 2 min">
        The next scheduled scan succeeded. scan-298 was partial because 14 hosts rate-limited the scanner.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Scan history" flush>
          <DataTable
            label="Scan history"
            columns={cols}
            rows={SCAN_RUNS}
            getRowId={(r) => r.id}
            defaultSort={{ id: "started", direction: "desc" }}
            minWidth={820}
          />
        </Panel>
        <Panel title="Scan settings" aria-label="Scan settings">
          <form className="flex flex-col gap-2.5" onSubmit={(e) => (e.preventDefault(), setSaved(true))}>
            <SelectField
              label="Schedule"
              defaultValue="daily"
              options={[
                { value: "daily", label: "Daily at 06:00 UTC" },
                { value: "twice", label: "Twice daily" },
                { value: "weekly", label: "Weekly" },
              ]}
            />
            <SelectField
              label="Ports"
              value={ports}
              onChange={(e) => (setPorts(e.target.value), setSaved(false))}
              options={[
                { value: "top-100", label: "Top 100" },
                { value: "top-1000", label: "Top 1000" },
                { value: "all", label: "All 65,535" },
              ]}
            />
            <TextField
              label="Packets per second"
              value={rate}
              onChange={(e) => (setRate(e.target.value), setSaved(false))}
              mono
              hint="Lower this if hosts rate-limit the scanner"
            />
            <Switch checked onCheckedChange={() => {}} label="Rescan within 10 min of a new CT log entry" />
            <div className="flex items-center gap-2 border-t border-line pt-2">
              <Button type="submit" variant="primary">
                Save
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  Saved · workflow updated ({ports}, {rate} pps)
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
/* Changes                                                             */
/* ------------------------------------------------------------------ */

type ChangeKind = "added" | "removed" | "changed";

interface SurfaceChange {
  id: string;
  kind: ChangeKind;
  asset: string;
  what: string;
  before?: string;
  after?: string;
  scan: string;
}

const CHANGES: SurfaceChange[] = [
  { id: "ch1", kind: "added", asset: "staging-admin.example.com", what: "New host", after: "203.0.113.57 · 443, 9200", scan: "scan-301" },
  {
    id: "ch2",
    kind: "changed",
    asset: "docs-old.example.com",
    what: "CNAME target unclaimed",
    before: "acme-docs.s3-website (owned)",
    after: "acme-docs.s3-website (no bucket)",
    scan: "scan-301",
  },
  { id: "ch3", kind: "added", asset: "pay.example.com", what: "New certificate in CT log", after: "Google Trust Services WR3", scan: "scan-300" },
  { id: "ch4", kind: "changed", asset: "grafana.example.com", what: "Version changed", before: "Grafana 10.1.5", after: "Grafana 10.2.3", scan: "scan-299" },
  { id: "ch5", kind: "removed", asset: "beta.example.com", what: "Host no longer resolves", before: "198.51.100.90", scan: "scan-299" },
  { id: "ch6", kind: "changed", asset: "win-build-02.example.com", what: "Port opened", before: "443", after: "443, 3389", scan: "scan-298" },
  { id: "ch7", kind: "added", asset: "cache-eu.example.com", what: "Port opened", after: "6379", scan: "scan-297" },
];

const CHANGE_TONE: Record<ChangeKind, "success" | "neutral" | "warning"> = { added: "success", removed: "neutral", changed: "warning" };

function ChangesPage() {
  const [kind, setKind] = useState<"all" | ChangeKind>("all");
  const [acked, setAcked] = useState<string[]>([]);
  const rows = CHANGES.filter((c) => kind === "all" || c.kind === kind);
  const cols: Column<SurfaceChange>[] = [
    { id: "kind", header: "Change", width: "90px", cell: (c) => <Badge tone={CHANGE_TONE[c.kind]}>{c.kind}</Badge> },
    { id: "asset", header: "Asset", cell: (c) => <EntityChip kind="host" value={c.asset} hideKind /> },
    { id: "what", header: "What", cell: (c) => <span className="text-sm">{c.what}</span> },
    { id: "before", header: "Before", cell: (c) => <span className="font-mono text-xs text-fg-muted">{c.before ?? "–"}</span> },
    { id: "after", header: "After", cell: (c) => <span className="font-mono text-xs">{c.after ?? "–"}</span> },
    { id: "scan", header: "Scan", mono: true, cell: (c) => c.scan },
    {
      id: "ack",
      header: "",
      width: "110px",
      hideable: false,
      cell: (c) =>
        acked.includes(c.id) ? (
          <span className="text-xs text-fg-muted">Expected</span>
        ) : (
          <Button size="xs" variant="ghost" onClick={() => setAcked((a) => [...a, c.id])} aria-label={`Mark expected: ${c.asset}`}>
            Mark expected
          </Button>
        ),
    },
  ];
  return (
    <>
      <PageHeader title="Changes" description="What changed on your internet-facing surface between scans. Unexpected changes are where breaches start." />
      <Tabs
        label="Change type"
        value={kind}
        onChange={setKind}
        items={[
          { value: "all", label: "All", count: CHANGES.length },
          { value: "added", label: "Added", count: CHANGES.filter((c) => c.kind === "added").length },
          { value: "changed", label: "Changed", count: CHANGES.filter((c) => c.kind === "changed").length },
          { value: "removed", label: "Removed", count: CHANGES.filter((c) => c.kind === "removed").length },
        ]}
      />
      <Panel title="Changes · 7 days" description={`${rows.length - rows.filter((r) => acked.includes(r.id)).length} need review`} flush>
        <DataTable label="Surface changes" columns={cols} rows={rows} getRowId={(c) => c.id} minWidth={1000} />
      </Panel>
    </>
  );
}

const PAGES = {
  assets: () => <AssetsPage />,
  exposures: () => <ExposuresPage />,
  domains: () => <DomainsPage />,
  certificates: () => <CertificatesPage />,
  scans: () => <ScansPage />,
  changes: () => <ChangesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="attack-surface" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Assets: Story = {
  ...app("assets"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Only without owner" }));
    await expect(c.getByRole("table", { name: "Assets" }).querySelectorAll("tbody tr")).toHaveLength(2);
    await userEvent.click(c.getByRole("button", { name: "Assign owner for staging-admin.example.com" }));
    await expect(c.getByRole("table", { name: "Assets" }).querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Exposures: Story = {
  ...app("exposures"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Exposures" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Exposures" });
    await expect(within(table).getAllByRole("row")).toHaveLength(exposures.length + 1);
    await expect(c.getByText(/New since last scan/)).toBeInTheDocument();
    await userEvent.click(within(table).getByRole("button", { name: "Send to DAST: staging-admin.example.com" }));
    const status = await c.findByText("Sent staging-admin.example.com to DAST");
    await expect(status.closest('[role="status"]')).toHaveTextContent("203.0.113.57:9200");
  },
};

export const Domains: Story = {
  ...app("domains"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Look-alikes of example.com" })).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(within(c.getByRole("table", { name: "Domains" })).getByText("example.org"));
    await expect(c.getByText("No look-alikes registered")).toBeInTheDocument();
  },
};

export const Certificates: Story = {
  ...app("certificates"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Expired or expiring in 14 days" }));
    await expect(c.getByRole("table", { name: "External certificates" }).querySelectorAll("tbody tr")).toHaveLength(3);
  },
};

export const Scans: Story = {
  ...app("scans"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Ports" }), "top-100");
    await userEvent.click(c.getByRole("button", { name: "Save" }));
    await expect(c.getByText(/Saved · workflow updated \(top-100, 1000 pps\)/)).toBeInTheDocument();
  },
};

export const Changes: Story = {
  ...app("changes"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Added/ }));
    await expect(c.getByRole("table", { name: "Surface changes" }).querySelectorAll("tbody tr")).toHaveLength(3);
    await userEvent.click(c.getByRole("button", { name: "Mark expected: staging-admin.example.com" }));
    await expect(c.getByText("2 need review")).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
