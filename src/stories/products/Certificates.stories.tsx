import { Fragment, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { BadgeCheck, CalendarClock, FileKey, Landmark, Plus, RefreshCw, RotateCcw, ShieldCheck, Upload } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, LevelBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Tabs } from "../../components/Tabs";
import { BarList } from "../../charts/BarList";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { cn } from "../../lib/cn";
import { TONE_COLORS, type LogLevel, type Tone } from "../../tokens/levels";
import { PRODUCTS } from "../../tokens/products";
import { PEOPLE, emailOf } from "../mocks";

const nav = [
  { id: "inventory", label: "Inventory", icon: BadgeCheck, count: 214 },
  { id: "expiring", label: "Expiring", icon: CalendarClock, count: 9 },
  { id: "issuers", label: "Issuers", icon: Landmark },
  { id: "acme", label: "ACME", icon: RefreshCw },
  { id: "policies", label: "Policies", icon: ShieldCheck },
];

const meta = {
  title: "Products/Certificates",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

type Issuer = "Let's Encrypt" | "DigiCert" | "OpenAsy CA";
type Source = "uptime" | "infrastructure" | "vpn";

interface Cert {
  id: string;
  cn: string;
  sans: number;
  issuer: Issuer;
  key: "RSA 2048" | "RSA 1024" | "ECDSA P-256";
  daysLeft: number;
  endpoints: number;
  autoRenew: boolean;
  source: Source;
}

const certs: Cert[] = [
  { id: "c1", cn: "api.example.com", sans: 4, issuer: "Let's Encrypt", key: "ECDSA P-256", daysLeft: 6, endpoints: 3, autoRenew: true, source: "uptime" },
  { id: "c2", cn: "vpn.example.com", sans: 1, issuer: "OpenAsy CA", key: "RSA 2048", daysLeft: 11, endpoints: 2, autoRenew: false, source: "vpn" },
  { id: "c3", cn: "www.example.com", sans: 3, issuer: "DigiCert", key: "RSA 2048", daysLeft: 13, endpoints: 4, autoRenew: false, source: "uptime" },
  {
    id: "c4",
    cn: "grafana.internal.example.com",
    sans: 1,
    issuer: "OpenAsy CA",
    key: "RSA 1024",
    daysLeft: 19,
    endpoints: 1,
    autoRenew: false,
    source: "infrastructure",
  },
  { id: "c5", cn: "status.example.com", sans: 2, issuer: "Let's Encrypt", key: "ECDSA P-256", daysLeft: 24, endpoints: 1, autoRenew: true, source: "uptime" },
  {
    id: "c6",
    cn: "*.apps.example.com",
    sans: 12,
    issuer: "DigiCert",
    key: "RSA 2048",
    daysLeft: 28,
    endpoints: 17,
    autoRenew: false,
    source: "infrastructure",
  },
  {
    id: "c7",
    cn: "kafka-broker-1.internal.example.com",
    sans: 2,
    issuer: "OpenAsy CA",
    key: "ECDSA P-256",
    daysLeft: 41,
    endpoints: 1,
    autoRenew: true,
    source: "infrastructure",
  },
  { id: "c8", cn: "auth.example.com", sans: 2, issuer: "Let's Encrypt", key: "ECDSA P-256", daysLeft: 57, endpoints: 2, autoRenew: true, source: "uptime" },
  { id: "c9", cn: "mail.example.com", sans: 3, issuer: "DigiCert", key: "RSA 2048", daysLeft: 74, endpoints: 2, autoRenew: false, source: "infrastructure" },
  { id: "c10", cn: "lon-01.vpn.example.com", sans: 1, issuer: "OpenAsy CA", key: "RSA 2048", daysLeft: 88, endpoints: 1, autoRenew: true, source: "vpn" },
  {
    id: "c11",
    cn: "registry.example.com",
    sans: 2,
    issuer: "Let's Encrypt",
    key: "ECDSA P-256",
    daysLeft: 63,
    endpoints: 1,
    autoRenew: true,
    source: "infrastructure",
  },
  { id: "c12", cn: "fra-01.vpn.example.com", sans: 1, issuer: "OpenAsy CA", key: "RSA 1024", daysLeft: 212, endpoints: 1, autoRenew: true, source: "vpn" },
];

/** Certificate validity in days as issued; used by policy checks. */
const VALIDITY: Record<Issuer, number> = { "Let's Encrypt": 90, DigiCert: 397, "OpenAsy CA": 365 };
const OWNER: Record<string, string> = {
  c1: PEOPLE[0],
  c2: PEOPLE[1],
  c3: PEOPLE[3],
  c4: PEOPLE[2],
  c5: PEOPLE[0],
  c6: PEOPLE[6],
  c7: PEOPLE[7],
  c8: PEOPLE[5],
  c9: PEOPLE[3],
  c10: PEOPLE[1],
  c11: PEOPLE[2],
  c12: PEOPLE[1],
};

function daysTone(d: number): Tone {
  if (d <= 7) return "danger";
  if (d <= 30) return "warning";
  return "success";
}

const cnCell = (c: Cert) => (
  <span className="flex min-w-0 items-center gap-2">
    <span className="truncate font-mono text-xs font-medium">{c.cn}</span>
    <Badge mono>{c.sans} SANs</Badge>
  </span>
);

const columns: Column<Cert>[] = [
  { id: "cn", header: "Common name", width: "30%", pinned: "left", sortValue: (c) => c.cn, cell: cnCell },
  { id: "issuer", header: "Issuer", sortValue: (c) => c.issuer, cell: (c) => c.issuer },
  {
    id: "key",
    header: "Key",
    sortValue: (c) => c.key,
    cell: (c) =>
      c.key === "RSA 1024" ? (
        <Badge tone="danger" mono>
          RSA 1024 · weak
        </Badge>
      ) : (
        <span className="font-mono text-xs">{c.key}</span>
      ),
  },
  { id: "days", header: "Days left", sortValue: (c) => c.daysLeft, cell: (c) => <StatusBadge tone={daysTone(c.daysLeft)}>{c.daysLeft} d</StatusBadge> },
  {
    id: "endpoints",
    header: "Endpoints",
    align: "right",
    mono: true,
    description: "Distinct host:port pairs serving this certificate.",
    sortValue: (c) => c.endpoints,
    cell: (c) => c.endpoints,
  },
  {
    id: "renew",
    header: "Auto-renew",
    sortValue: (c) => (c.autoRenew ? 1 : 0),
    cell: (c) =>
      c.autoRenew ? (
        <Badge tone="success" icon={<RefreshCw aria-hidden className="size-3" />}>
          On · ACME
        </Badge>
      ) : (
        <Badge>Off · manual</Badge>
      ),
  },
  {
    id: "source",
    header: "Discovered by",
    sortValue: (c) => c.source,
    cell: (c) => {
      const P = PRODUCTS[c.source];
      return (
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
          <P.icon aria-hidden className="size-3.5" />
          {P.name}
        </span>
      );
    },
  },
];

const ISSUERS: Issuer[] = ["Let's Encrypt", "DigiCert", "OpenAsy CA"];

/* ------------------------------------------------------------------ */
/* Inventory                                                           */
/* ------------------------------------------------------------------ */

function InventoryPage() {
  const [issuers, setIssuers] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const rows = useMemo(() => certs.filter((c) => (issuers.length === 0 || issuers.includes(c.issuer)) && c.cn.includes(q.trim().toLowerCase())), [issuers, q]);
  return (
    <>
      <PageHeader
        title="Inventory"
        description="214 certificates on 388 endpoints · discovered by Uptime, Infrastructure and VPN"
        actions={
          <>
            <SearchInput label="Search common names" className="w-60" value={q} onChange={(e) => setQ(e.target.value)} />
            <Button icon={<Upload />}>Import PEM</Button>
            <Button variant="primary" icon={<FileKey />}>
              Request certificate
            </Button>
          </>
        }
      />
      <FilterBar onClear={issuers.length ? () => setIssuers([]) : undefined}>
        <FacetFilter
          label="Issuer"
          selected={issuers}
          onChange={setIssuers}
          options={ISSUERS.map((i) => ({ value: i, count: certs.filter((c) => c.issuer === i).length }))}
        />
      </FilterBar>
      <Callout tone="warning" title="3 certificates expire within 14 days without auto-renew" action={<Button size="sm">Open Expiring</Button>}>
        vpn.example.com and www.example.com need a manual renewal; owners were emailed on Oct 12.
      </Callout>
      <KpiGrid>
        <KpiCard label="Expiring ≤ 14 days" value="3" unit="certificates" tone="danger" delta={{ label: "2 without auto-renew", intent: "bad" }} />
        <KpiCard
          label="Expiring ≤ 30 days"
          value="9"
          unit="certificates"
          tone="warning"
          delta={{ label: "+4 vs. last week", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Auto-renewing" value="71%" unit="152 of 214" delta={{ label: "+6 pts this month", direction: "up", intent: "good" }} />
        <KpiCard label="Weak keys" value="5" unit="RSA 1024 · SHA-1" tone="danger" delta={{ label: "all internal OpenAsy CA" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="Expiries by week" description="Next 8 weeks">
          <BarList
            label="Certificate expiries by week"
            items={[
              { id: "w43", label: "Oct 20 – 26", value: 2, color: TONE_COLORS.danger },
              { id: "w44", label: "Oct 27 – Nov 2", value: 1, color: TONE_COLORS.danger },
              { id: "w45", label: "Nov 3 – 9", value: 3, color: TONE_COLORS.warning },
              { id: "w46", label: "Nov 10 – 16", value: 3, color: TONE_COLORS.warning },
              { id: "w47", label: "Nov 17 – 23", value: 6 },
              { id: "w48", label: "Nov 24 – 30", value: 4 },
              { id: "w49", label: "Dec 1 – 7", value: 11 },
              { id: "w50", label: "Dec 8 – 14", value: 2 },
            ]}
          />
        </Panel>
        <Panel title="Certificates" description={`${rows.length} shown`} flush>
          <DataTable label="Certificates" columns={columns} rows={rows} getRowId={(c) => c.id} defaultSort={{ id: "days", direction: "asc" }} minWidth={880} />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Expiring                                                            */
/* ------------------------------------------------------------------ */

type RenewState = "idle" | "queued" | "csr";

function ExpiringPage() {
  const [win, setWin] = useState<"7" | "14" | "30">("30");
  const [state, setState] = useState<Record<string, RenewState>>({});
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const rows = certs.filter((c) => c.daysLeft <= Number(win));
  const renew = (c: Cert) => setState((s) => ({ ...s, [c.id]: c.autoRenew || c.issuer === "OpenAsy CA" ? "queued" : "csr" }));
  const cols: Column<Cert>[] = [
    { id: "cn", header: "Common name", pinned: "left", width: "28%", sortValue: (c) => c.cn, cell: cnCell },
    { id: "days", header: "Expires in", sortValue: (c) => c.daysLeft, cell: (c) => <StatusBadge tone={daysTone(c.daysLeft)}>{c.daysLeft} d</StatusBadge> },
    { id: "issuer", header: "Issuer", cell: (c) => c.issuer },
    {
      id: "owner",
      header: "Owner",
      sortValue: (c) => OWNER[c.id]!,
      cell: (c) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={OWNER[c.id]!} size="sm" />
          <span className="truncate">{OWNER[c.id]}</span>
        </span>
      ),
    },
    {
      id: "path",
      header: "Renewal path",
      description: "How this certificate gets renewed: ACME automatically, internal CA on request, or a manual CSR to a commercial CA.",
      cell: (c) =>
        c.autoRenew ? (
          <Badge tone="success">ACME · automatic</Badge>
        ) : c.issuer === "OpenAsy CA" ? (
          <Badge tone="info">Internal CA</Badge>
        ) : (
          <Badge tone="warning">Manual CSR</Badge>
        ),
    },
    {
      id: "state",
      header: "Status",
      cell: (c) => {
        const s = state[c.id] ?? "idle";
        if (s === "queued") return <StatusBadge tone="info">Renewal queued</StatusBadge>;
        if (s === "csr") return <StatusBadge tone="warning">CSR generated</StatusBadge>;
        return c.autoRenew ? (
          <span className="text-xs text-fg-muted">Next attempt 02:00</span>
        ) : (
          <span className="text-xs text-warning-text">Waiting on owner</span>
        );
      },
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "100px",
      align: "right",
      hideable: false,
      cell: (c) => (
        <Button size="xs" icon={<RotateCcw />} aria-label={`Renew ${c.cn}`} disabled={(state[c.id] ?? "idle") !== "idle"} onClick={() => renew(c)}>
          Renew
        </Button>
      ),
    },
  ];
  const csr = rows.find((c) => state[c.id] === "csr");
  return (
    <>
      <PageHeader
        title="Expiring"
        description="Certificates that expire soon, who owns them and how each one gets renewed."
        actions={
          <Tabs
            label="Expiry window"
            value={win}
            onChange={setWin}
            items={[
              { value: "7", label: "7 days", count: certs.filter((c) => c.daysLeft <= 7).length },
              { value: "14", label: "14 days", count: certs.filter((c) => c.daysLeft <= 14).length },
              { value: "30", label: "30 days", count: certs.filter((c) => c.daysLeft <= 30).length },
            ]}
          />
        }
      />
      <KpiGrid>
        <KpiCard label="Expire this week" value="1" unit="api.example.com" tone="danger" delta={{ label: "ACME retries failing", intent: "bad" }} />
        <KpiCard label="Need a human" value="4" unit="manual or internal" tone="warning" />
        <KpiCard label="Endpoints affected" value="28" unit="host:port" />
        <KpiCard label="Owners notified" value="6" unit="of 6" tone="success" delta={{ label: "14 and 3 days before" }} />
      </KpiGrid>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button
            size="sm"
            onClick={() => {
              setNotice(`Reminded ${selected.length} owner${selected.length > 1 ? "s" : ""} by email`);
              setSelected([]);
            }}
          >
            Remind owners
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      <div className={cn("grid gap-2.5", csr && "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
        <Panel title={`Expiring within ${win} days`} description={`${rows.length} certificates`} flush>
          <DataTable
            label="Expiring certificates"
            columns={cols}
            rows={rows}
            getRowId={(c) => c.id}
            selectable
            selectedIds={selected}
            onSelectionChange={setSelected}
            defaultSort={{ id: "days", direction: "asc" }}
            minWidth={980}
          />
        </Panel>
        {csr && (
          <Panel aria-label="CSR" title={`CSR for ${csr.cn}`} description={`Send to ${csr.issuer} · key stays in Secrets`}>
            <pre tabIndex={0} aria-label="CSR in PEM format" className="overflow-x-auto rounded-md bg-canvas p-2 font-mono text-2xs text-fg">
              {
                "-----BEGIN CERTIFICATE REQUEST-----\nMIIC2jCCAcICAQAwgZQxCzAJBgNVBAYTAklFMQ8wDQYDVQQIDAZEdWJs\naW4xFzAVBgNVBAoMDkFjbWUgQ29ycCBMdGQuMRcwFQYDVQQDDA53d3cu\nZXhhbXBsZS5jb20xQjBABgkqhkiG9w0BCQEWM3NhcmFoLmNoZW5AZXhh\n…\n-----END CERTIFICATE REQUEST-----"
              }
            </pre>
            <ol className="mt-2 flex list-decimal flex-col gap-1 pl-5 text-xs text-fg-muted">
              <li>Paste the CSR into the {csr.issuer} portal and pick a 397-day term.</li>
              <li>Validate by DNS TXT on _dnsauth.{csr.cn.replace(/^\*\./, "")}.</li>
              <li>Upload the issued chain here; endpoints update on the next agent sync.</li>
            </ol>
            <Button size="sm" icon={<Upload />} className="mt-2">
              Upload issued certificate
            </Button>
          </Panel>
        )}
      </div>
      <Panel title="Notification schedule" description="Who hears about an expiry and when">
        <ul className="grid gap-2 text-sm md:grid-cols-4">
          {[
            ["30 days", "Owner by email"],
            ["14 days", "Owner + team channel #platform"],
            ["3 days", "Alerts rule cert-expiry-critical pages on-call"],
            ["Expired", "Incident opened if endpoints still serve it"],
          ].map(([k, v]) => (
            <li key={k} className="flex flex-col rounded-md border border-line bg-canvas px-2.5 py-1.5">
              <span className="font-mono text-xs font-medium">{k}</span>
              <span className="text-xs text-fg-muted">{v}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Issuers                                                             */
/* ------------------------------------------------------------------ */

interface IssuerRow {
  id: string;
  name: Issuer;
  kind: "Public ACME" | "Commercial" | "Internal";
  chain: Array<{ name: string; expires: string; key: string }>;
  certs: number;
  method: string;
  ocsp: string;
  crl: string;
  trust: string;
  status: "Healthy" | "Attention";
}

const ISSUER_ROWS: IssuerRow[] = [
  {
    id: "le",
    name: "Let's Encrypt",
    kind: "Public ACME",
    chain: [
      { name: "ISRG Root X1", expires: "Jun 4, 2035", key: "RSA 4096" },
      { name: "E6 (intermediate)", expires: "Mar 12, 2027", key: "ECDSA P-384" },
    ],
    certs: 128,
    method: "ACME v2 · HTTP-01 and DNS-01",
    ocsp: "Short-lived certs · OCSP sunset, CRL only",
    crl: "Published by issuer",
    trust: "All browsers and OS stores",
    status: "Attention",
  },
  {
    id: "dc",
    name: "DigiCert",
    kind: "Commercial",
    chain: [
      { name: "DigiCert Global Root G2", expires: "Jan 15, 2038", key: "RSA 2048" },
      { name: "DigiCert Global G2 TLS RSA SHA256 2020 CA1", expires: "Mar 29, 2031", key: "RSA 2048" },
    ],
    certs: 31,
    method: "Manual CSR · CertCentral API token expires Dec 2",
    ocsp: "ocsp.digicert.example.com · 120 ms",
    crl: "Published by issuer",
    trust: "All browsers and OS stores",
    status: "Healthy",
  },
  {
    id: "oa",
    name: "OpenAsy CA",
    kind: "Internal",
    chain: [
      { name: "OpenAsy Internal Root CA R1", expires: "Oct 2, 2041", key: "ECDSA P-384 · offline HSM" },
      { name: "OpenAsy Issuing CA 2026", expires: "Feb 1, 2028", key: "ECDSA P-256" },
    ],
    certs: 55,
    method: "API, ACME (internal) and VPN enrollment",
    ocsp: "ocsp.ca.internal.example.com · 8 ms",
    crl: "Every 6 h · last Today 12:00 · 37 revoked",
    trust: "Pushed to 412 hosts by Infrastructure; not trusted publicly",
    status: "Attention",
  },
];

function IssuersPage() {
  const [active, setActive] = useState("oa");
  const [published, setPublished] = useState(false);
  const i = ISSUER_ROWS.find((x) => x.id === active)!;
  const cols: Column<IssuerRow>[] = [
    { id: "name", header: "Issuer", pinned: "left", sortValue: (x) => x.name, cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "kind", header: "Type", cell: (x) => <Badge tone={x.kind === "Internal" ? "info" : "neutral"}>{x.kind}</Badge> },
    { id: "certs", header: "Certificates", align: "right", mono: true, sortValue: (x) => x.certs, cell: (x) => x.certs },
    { id: "method", header: "Issuance", cell: (x) => <span className="text-xs">{x.method}</span> },
    { id: "status", header: "Status", cell: (x) => <StatusBadge tone={x.status === "Healthy" ? "success" : "warning"}>{x.status}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Issuers"
        description="Certificate authorities in use, their chains and how certificates are requested from each."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add issuer
          </Button>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Issuers" flush>
            <DataTable
              label="Issuers"
              columns={cols}
              rows={ISSUER_ROWS}
              getRowId={(x) => x.id}
              onRowClick={(x) => (setActive(x.id), setPublished(false))}
              activeRowId={active}
              minWidth={720}
            />
          </Panel>
          <Panel title="Certificates by issuer and key type">
            <StackedBarChart
              label="Certificates per issuer by key type"
              categories={["Let's Encrypt", "DigiCert", "OpenAsy CA"]}
              segments={[
                { id: "ec", name: "ECDSA" },
                { id: "rsa", name: "RSA 2048+" },
                { id: "weak", name: "RSA 1024", color: TONE_COLORS.danger },
              ]}
              values={[
                [121, 7, 0],
                [0, 31, 0],
                [30, 20, 5],
              ]}
              height={170}
              xTicks={3}
            />
          </Panel>
        </div>
        <Panel
          aria-label="Issuer detail"
          title={i.name}
          description={i.kind}
          actions={<StatusBadge tone={i.status === "Healthy" ? "success" : "warning"}>{i.status}</StatusBadge>}
          footer={
            i.kind === "Internal" ? (
              <span className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" icon={<FileKey />}>
                  Issue certificate
                </Button>
                <Button size="sm" onClick={() => setPublished(true)}>
                  Publish CRL now
                </Button>
                {published && (
                  <span role="status" className="text-xs text-success">
                    CRL 4128 published · 37 entries
                  </span>
                )}
              </span>
            ) : undefined
          }
        >
          {i.id === "oa" && (
            <Callout tone="warning" title="5 certificates use RSA 1024" className="mb-2.5">
              Issued before the 2026 policy. Reissue them with ECDSA P-256 from the Policies page.
            </Callout>
          )}
          {i.id === "le" && (
            <Callout tone="warning" title="Rate limit: 41 of 50 new orders this week" className="mb-2.5">
              On example.com. Batch SAN changes or wait until Monday.
            </Callout>
          )}
          <h3 className="mb-1 text-xs font-semibold text-fg">Chain</h3>
          <ol aria-label="Certificate chain" className="mb-3 flex flex-col gap-1">
            {i.chain.map((c, n) => (
              <li key={c.name} className="flex items-start gap-2" style={{ paddingLeft: n * 16 }}>
                <Landmark aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fg-muted" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-2xs text-fg-muted">
                    {c.key} · expires {c.expires}
                  </span>
                </span>
              </li>
            ))}
          </ol>
          <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-sm">
            <dt className="text-fg-muted">Issuance</dt>
            <dd>{i.method}</dd>
            <dt className="text-fg-muted">Revocation</dt>
            <dd>{i.ocsp}</dd>
            <dt className="text-fg-muted">CRL</dt>
            <dd>{i.crl}</dd>
            <dt className="text-fg-muted">Trusted by</dt>
            <dd>{i.trust}</dd>
          </dl>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* ACME                                                                */
/* ------------------------------------------------------------------ */

interface Challenge {
  id: string;
  domain: string;
  type: "HTTP-01" | "DNS-01" | "TLS-ALPN-01";
  solver: string;
  state: "Pending" | "Valid" | "Invalid";
  error?: string;
  attempts: number;
}

const CHALLENGES: Challenge[] = [
  {
    id: "ch1",
    domain: "api.example.com",
    type: "HTTP-01",
    solver: "ingress-nginx · api-prod",
    state: "Invalid",
    error: "Fetching http://api.example.com/.well-known/acme-challenge/…: 403 from WAF rule 942100",
    attempts: 4,
  },
  { id: "ch2", domain: "*.apps.example.com", type: "DNS-01", solver: "Route 53 · zone Z0EXAMPLE", state: "Pending", attempts: 1 },
  { id: "ch3", domain: "status.example.com", type: "HTTP-01", solver: "edge-fra-02 webroot", state: "Valid", attempts: 1 },
  { id: "ch4", domain: "registry.example.com", type: "TLS-ALPN-01", solver: "Caddy on registry", state: "Valid", attempts: 1 },
];

const RENEW_LOG: Array<{ id: string; time: string; level: LogLevel; domain: string; text: string; account: string }> = [
  {
    id: "l1",
    time: "Today 02:00",
    level: "error",
    domain: "api.example.com",
    text: "Order failed: challenge invalid (403). Retry in 6 h, attempt 4 of 10.",
    account: "le-prod",
  },
  {
    id: "l2",
    time: "Today 02:00",
    level: "info",
    domain: "status.example.com",
    text: "Renewed · E6 · valid until Jan 17, 2027 · deployed to 1 endpoint",
    account: "le-prod",
  },
  { id: "l3", time: "Today 01:58", level: "info", domain: "registry.example.com", text: "Renewed · E6 · deployed via Caddy reload", account: "le-prod" },
  {
    id: "l4",
    time: "Yesterday 02:00",
    level: "warn",
    domain: "api.example.com",
    text: "Challenge invalid (403). WAF blocked the validation request.",
    account: "le-prod",
  },
  {
    id: "l5",
    time: "Yesterday 02:00",
    level: "info",
    domain: "kafka-broker-1.internal.example.com",
    text: "Renewed by internal ACME · OpenAsy Issuing CA 2026",
    account: "openasy-internal",
  },
  { id: "l6", time: "Oct 17 02:00", level: "info", domain: "auth.example.com", text: "Renewed · E6 · deployed to 2 endpoints", account: "le-prod" },
  {
    id: "l7",
    time: "Oct 16 02:00",
    level: "warn",
    domain: "*.apps.example.com",
    text: "DNS propagation slow (94 s); passed on second check",
    account: "le-prod",
  },
];

function AcmePage() {
  const [challenges, setChallenges] = useState(CHALLENGES);
  const [tab, setTab] = useState<"all" | "error">("all");
  const log = RENEW_LOG.filter((l) => tab === "all" || l.level !== "info");
  const STATE_TONE = { Pending: "info", Valid: "success", Invalid: "danger" } as const;
  return (
    <>
      <PageHeader
        title="ACME"
        description="Accounts, live challenges and every automatic renewal attempt. Renewal runs nightly at 02:00 for certificates with ≤ 30 days left."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add account
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Renewed · 30 d" value="64" unit="certificates" tone="success" delta={{ label: "100% deployed" }} />
        <KpiCard label="Failing" value="1" unit="api.example.com" tone="danger" delta={{ label: "expires in 6 d", intent: "bad" }} />
        <KpiCard label="Median renewal" value="38" unit="s" />
        <KpiCard label="Rate limit headroom" value="9" unit="orders this week" tone="warning" />
      </KpiGrid>
      <Panel title="Accounts" flush>
        <DataTable
          label="ACME accounts"
          rows={[
            { id: "le-prod", dir: "acme-v02.api.letsencrypt.org", email: "pki@example.com", eab: "No", certs: 128, status: "Registered" },
            { id: "le-staging", dir: "acme-staging-v02.api.letsencrypt.org", email: "pki@example.com", eab: "No", certs: 0, status: "Registered" },
            { id: "openasy-internal", dir: "acme.ca.internal.example.com", email: "pki@example.com", eab: "Yes · key 7f2c", certs: 22, status: "Registered" },
          ]}
          getRowId={(a) => a.id}
          minWidth={760}
          columns={[
            { id: "id", header: "Account", mono: true, cell: (a) => a.id },
            { id: "dir", header: "Directory", cell: (a) => <span className="font-mono text-xs">{a.dir}</span> },
            { id: "email", header: "Contact", cell: (a) => a.email },
            {
              id: "eab",
              header: "EAB",
              description: "External account binding, required by some CAs to link the ACME account to a customer.",
              cell: (a) => a.eab,
            },
            { id: "certs", header: "Certificates", align: "right", mono: true, cell: (a) => a.certs },
            { id: "status", header: "Status", cell: (a) => <StatusBadge tone="success">{a.status}</StatusBadge> },
          ]}
        />
      </Panel>
      <Panel title="Challenges in flight" description="Validation attempts for orders opened in the last 24 h" flush>
        <ul aria-label="Challenges" className="flex flex-col">
          {challenges.map((ch) => (
            <li
              key={ch.id}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 border-b border-subtle px-3 py-2 last:border-0 md:grid-cols-[minmax(0,2fr)_110px_minmax(0,2fr)_auto]"
            >
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-mono text-xs font-medium">{ch.domain}</span>
                <span className="text-2xs text-fg-muted">
                  {ch.solver} · attempt {ch.attempts}
                </span>
              </span>
              <Badge mono className="hidden w-fit md:inline-flex">
                {ch.type}
              </Badge>
              <span className={cn("hidden text-xs md:block", ch.error ? "text-danger-text" : "text-fg-muted")}>
                {ch.error ?? (ch.state === "Pending" ? "Waiting for TXT record to propagate" : "Validated")}
              </span>
              <span className="flex items-center gap-1.5">
                <StatusBadge tone={STATE_TONE[ch.state]}>{ch.state}</StatusBadge>
                {ch.state === "Invalid" && (
                  <Button
                    size="xs"
                    aria-label={`Retry ${ch.domain}`}
                    onClick={() =>
                      setChallenges((cs) => cs.map((x) => (x.id === ch.id ? { ...x, state: "Pending", error: undefined, attempts: x.attempts + 1 } : x)))
                    }
                  >
                    Retry
                  </Button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel flush>
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2">
          <h2 className="text-sm font-semibold">Renewal log</h2>
          <Tabs
            label="Renewal log filter"
            value={tab}
            onChange={setTab}
            className="border-b-0"
            items={[
              { value: "all", label: "All", count: RENEW_LOG.length },
              { value: "error", label: "Problems", count: RENEW_LOG.filter((l) => l.level !== "info").length },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable
            label="Renewal log"
            rows={log}
            getRowId={(l) => l.id}
            minWidth={820}
            columns={[
              { id: "time", header: "Time", width: "130px", cell: (l) => <span className="text-xs whitespace-nowrap">{l.time}</span> },
              { id: "level", header: "Level", width: "80px", cell: (l) => <LevelBadge level={l.level} /> },
              { id: "domain", header: "Domain", cell: (l) => <span className="font-mono text-xs">{l.domain}</span> },
              { id: "text", header: "Result", cell: (l) => <span className="text-xs">{l.text}</span> },
              { id: "account", header: "Account", mono: true, width: "150px", cell: (l) => l.account },
            ]}
          />
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

interface CertPolicy {
  minRsa: "2048" | "3072";
  allowEcdsa: boolean;
  maxDays: "90" | "200" | "398";
  issuers: Issuer[];
  wildcards: boolean;
  ct: boolean;
  renewAt: string;
}

const KEY_BITS: Record<Cert["key"], number> = { "RSA 1024": 1024, "RSA 2048": 2048, "ECDSA P-256": 0 };

function violations(p: CertPolicy) {
  const out: Array<{ cert: Cert; rule: string }> = [];
  for (const c of certs) {
    const bits = KEY_BITS[c.key];
    if (bits && bits < Number(p.minRsa)) out.push({ cert: c, rule: `RSA key below ${p.minRsa} bits` });
    if (!bits && !p.allowEcdsa) out.push({ cert: c, rule: "ECDSA not allowed" });
    if (VALIDITY[c.issuer] > Number(p.maxDays)) out.push({ cert: c, rule: `Validity ${VALIDITY[c.issuer]} d over ${p.maxDays} d` });
    if (!p.issuers.includes(c.issuer)) out.push({ cert: c, rule: `Issuer ${c.issuer} not allowed` });
    if (!p.wildcards && c.cn.startsWith("*.")) out.push({ cert: c, rule: "Wildcard not allowed" });
  }
  return out;
}

function PoliciesPage() {
  const [p, setP] = useState<CertPolicy>({ minRsa: "2048", allowEcdsa: true, maxDays: "398", issuers: [...ISSUERS], wildcards: true, ct: true, renewAt: "30" });
  const [saved, setSaved] = useState(false);
  const set = (patch: Partial<CertPolicy>) => (setP((x) => ({ ...x, ...patch })), setSaved(false));
  const v = useMemo(() => violations(p), [p]);
  return (
    <>
      <PageHeader
        title="Policies"
        description="Rules every certificate must meet. Requests that break them are refused; existing certificates that break them are listed below."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Certificate policy" description="Applies to all issuers · last changed by Emily Clark on Oct 2">
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSaved(true);
            }}
          >
            <div className="grid gap-2.5 md:grid-cols-2">
              <SelectField
                label="Minimum RSA key size"
                value={p.minRsa}
                onChange={(e) => set({ minRsa: e.target.value as CertPolicy["minRsa"] })}
                options={[
                  { value: "2048", label: "2048 bits" },
                  { value: "3072", label: "3072 bits" },
                ]}
              />
              <SelectField
                label="Maximum validity"
                value={p.maxDays}
                onChange={(e) => set({ maxDays: e.target.value as CertPolicy["maxDays"] })}
                options={[
                  { value: "398", label: "398 days (CA/B today)" },
                  { value: "200", label: "200 days (CA/B from Mar 2026)" },
                  { value: "90", label: "90 days" },
                ]}
              />
              <TextField
                label="Renew when days left"
                type="number"
                mono
                value={p.renewAt}
                onChange={(e) => set({ renewAt: e.target.value })}
                hint="ACME renews at this point; manual owners get reminders."
              />
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="mb-1 text-xs font-semibold text-fg">Allowed issuers</legend>
              {ISSUERS.map((i) => (
                <Checkbox
                  key={i}
                  label={i}
                  checked={p.issuers.includes(i)}
                  onChange={() => set({ issuers: p.issuers.includes(i) ? p.issuers.filter((x) => x !== i) : [...p.issuers, i] })}
                />
              ))}
            </fieldset>
            <Switch checked={p.allowEcdsa} onCheckedChange={(x) => set({ allowEcdsa: x })} label="Allow ECDSA keys" description="P-256 and P-384." />
            <Switch
              checked={p.wildcards}
              onCheckedChange={(x) => set({ wildcards: x })}
              label="Allow wildcard certificates"
              description="Only for *.apps.example.com today."
            />
            <Switch
              checked={p.ct}
              onCheckedChange={(x) => set({ ct: x })}
              label="Require Certificate Transparency"
              description="Public certificates must carry 2+ SCTs."
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary">
                Save policy
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  Policy saved · {v.length} violations to fix
                </span>
              )}
            </div>
          </form>
        </Panel>
        <Panel title="Violations" description={`${v.length} findings on ${new Set(v.map((x) => x.cert.id)).size} certificates`} flush>
          <DataTable
            label="Policy violations"
            rows={v.map((x, n) => ({ ...x, id: `${x.cert.id}-${n}` }))}
            getRowId={(x) => x.id}
            minWidth={640}
            empty={<span className="text-sm text-fg-muted">Every certificate meets the policy.</span>}
            columns={[
              { id: "cn", header: "Certificate", cell: (x) => <span className="font-mono text-xs">{x.cert.cn}</span> },
              { id: "rule", header: "Rule broken", cell: (x) => <Badge tone="danger">{x.rule}</Badge> },
              { id: "issuer", header: "Issuer", cell: (x) => x.cert.issuer },
              {
                id: "owner",
                header: "Owner",
                cell: (x) => (
                  <span className="truncate text-xs" title={emailOf(OWNER[x.cert.id]!)}>
                    {OWNER[x.cert.id]}
                  </span>
                ),
              },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Policy history">
        <ol className="flex flex-col gap-1 text-sm">
          {[
            ["Oct 2", PEOPLE[1], "Minimum RSA 2048, internal CA no longer issues RSA 1024"],
            ["Aug 14", PEOPLE[3], "Allowed issuer DigiCert added for www and mail"],
            ["Jun 1", PEOPLE[1], "Require Certificate Transparency for public names"],
          ].map(([d, who, what]) => (
            <Fragment key={d}>
              <li className="grid grid-cols-[64px_140px_minmax(0,1fr)] gap-2">
                <span className="font-mono text-xs text-fg-muted">{d}</span>
                <span className="truncate text-xs">{who}</span>
                <span className="text-xs">{what}</span>
              </li>
            </Fragment>
          ))}
        </ol>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App and stories                                                     */
/* ------------------------------------------------------------------ */

const PAGES = {
  inventory: () => <InventoryPage />,
  expiring: () => <ExpiringPage />,
  issuers: () => <IssuersPage />,
  acme: () => <AcmePage />,
  policies: () => <PoliciesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="certificates" nav={nav} pages={PAGES} initial={initial} /> });

/** Inventory: expiry KPIs, expiries by week and the certificate list filterable by issuer. */
export const Inventory: Story = {
  ...app("inventory"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Inventory" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Certificates" });
    await expect(within(table).getAllByRole("row")).toHaveLength(certs.length + 1);
    await userEvent.click(within(c.getByRole("toolbar", { name: "Filters" })).getByRole("button", { name: /Issuer/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /DigiCert/ }));
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(within(table).getAllByRole("row")).toHaveLength(4));
    await expect(within(table).getByText("*.apps.example.com")).toBeInTheDocument();
    await expect(within(table).queryByText("api.example.com")).not.toBeInTheDocument();
  },
};

export const Expiring: Story = {
  ...app("expiring"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Expiring certificates" });
    await expect(within(table).getAllByRole("row")).toHaveLength(7);
    await userEvent.click(within(table).getByRole("button", { name: "Renew www.example.com" }));
    await expect(c.getByRole("region", { name: "CSR" })).toHaveTextContent("DigiCert");
    await userEvent.click(within(table).getByRole("button", { name: "Renew vpn.example.com" }));
    await expect(within(table).getByText("Renewal queued")).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /7 days/ }));
    await expect(within(c.getByRole("table", { name: "Expiring certificates" })).getAllByRole("row")).toHaveLength(2);
  },
};

export const Issuers: Story = {
  ...app("issuers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Issuer detail" });
    await expect(within(detail).getByRole("list", { name: "Certificate chain" })).toHaveTextContent("OpenAsy Internal Root CA R1");
    await userEvent.click(within(detail).getByRole("button", { name: "Publish CRL now" }));
    await expect(within(detail).getByText(/CRL 4128 published/)).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Issuers" })).getByText("DigiCert"));
    await expect(detail).toHaveTextContent("DigiCert Global Root G2");
  },
};

export const Acme: Story = {
  name: "ACME",
  ...app("acme"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = c.getByRole("list", { name: "Challenges" });
    await userEvent.click(within(list).getByRole("button", { name: "Retry api.example.com" }));
    await expect(within(list).queryByText("Invalid")).not.toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /Problems/ }));
    await expect(within(c.getByRole("table", { name: "Renewal log" })).getAllByRole("row")).toHaveLength(4);
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Policy violations" });
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Maximum validity" }), "90");
    await expect(within(table).getByText("www.example.com")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Save policy" }));
    await expect(c.getByRole("status")).toHaveTextContent("Policy saved · 10 violations to fix");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: "Data & GDPR" }));
    await expect(c.getByText(/Data subject access and erasure/)).toBeInTheDocument();
  },
};
