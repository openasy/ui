import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowLeft, Bug, CalendarClock, CircleCheck, CircleX, Crosshair, KeyRound, Pause, Play, Plus, Radar, ShieldCheck, Square, Trash2 } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { Avatar } from "../../components/Avatar";
import { Tabs } from "../../components/Tabs";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "scans", label: "Scans", icon: Radar, count: 12 },
  { id: "targets", label: "Targets", icon: Crosshair, count: 5 },
  { id: "findings", label: "Findings", icon: Bug, count: 27 },
  { id: "auth", label: "Auth profiles", icon: KeyRound, count: 3 },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
];

const meta = {
  title: "Products/DAST",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

interface Finding {
  id: string;
  severity: Severity;
  title: string;
  url: string;
  param?: string;
  engine: "ZAP" | "Nuclei";
  rule: string;
  confirmed: boolean;
  request: string;
  response: string;
}

const findings: Finding[] = [
  {
    id: "d1",
    severity: "critical",
    title: "SQL injection",
    url: "/v1/orders?q=",
    param: "q",
    engine: "ZAP",
    rule: "40018 SQL Injection (boolean based)",
    confirmed: true,
    request: "GET /v1/orders?q=x%27%20AND%20%271%27%3D%271 HTTP/1.1\nHost: staging.example.com\nAuthorization: Bearer eyJhbGciOi…redacted\nUser-Agent: OpenAsy-DAST/1.4 (ZAP 2.15)",
    response: "HTTP/1.1 200 OK\nContent-Type: application/json\nContent-Length: 48211\n\n{\"items\":[{\"id\":\"ord_9f2c\",\"total\":129.90}, … 412 rows]}\n\n# q=x' AND '1'='2 returned 0 rows: boolean condition controls result",
  },
  {
    id: "d2",
    severity: "high",
    title: "Reflected cross-site scripting",
    url: "/search",
    param: "term",
    engine: "ZAP",
    rule: "40012 Cross Site Scripting (Reflected)",
    confirmed: true,
    request: "GET /search?term=%3Cscript%3Ealert(1)%3C%2Fscript%3E HTTP/1.1\nHost: staging.example.com",
    response: "HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\n\n<h2>Results for <script>alert(1)</script></h2>",
  },
  {
    id: "d3",
    severity: "medium",
    title: "Open redirect",
    url: "/login?next=",
    param: "next",
    engine: "Nuclei",
    rule: "generic-open-redirect",
    confirmed: true,
    request: "GET /login?next=https://example.net/ HTTP/1.1\nHost: staging.example.com",
    response: "HTTP/1.1 302 Found\nLocation: https://example.net/",
  },
  {
    id: "d4",
    severity: "medium",
    title: "TLS 1.0 enabled",
    url: "staging.example.com:443",
    engine: "Nuclei",
    rule: "deprecated-tls",
    confirmed: false,
    request: "ClientHello version=TLS1.0 cipher=TLS_RSA_WITH_AES_128_CBC_SHA",
    response: "ServerHello version=TLS1.0 cipher=TLS_RSA_WITH_AES_128_CBC_SHA",
  },
  {
    id: "d5",
    severity: "low",
    title: "Missing Content-Security-Policy header",
    url: "/",
    engine: "ZAP",
    rule: "10038 Content Security Policy (CSP) Header Not Set",
    confirmed: false,
    request: "GET / HTTP/1.1\nHost: staging.example.com",
    response: "HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nX-Frame-Options: DENY\nStrict-Transport-Security: max-age=31536000",
  },
];

type ScanStatus = "running" | "completed" | "failed";
type SevCounts = Record<"critical" | "high" | "medium" | "low", number>;

interface ScanRow {
  id: string;
  target: string;
  env: string;
  profile: "Full" | "Baseline" | "API" | "Quick";
  trigger: string;
  status: ScanStatus;
  duration: string;
  minutes: number;
  counts: SevCounts;
  started: string;
}

const SCANS: ScanRow[] = [
  { id: "312", target: "staging.example.com", env: "staging", profile: "Full", trigger: "Schedule · nightly-staging", status: "running", duration: "21 min", minutes: 21, counts: { critical: 1, high: 1, medium: 2, low: 1 }, started: "Today 14:02" },
  { id: "311", target: "api.example.com", env: "prod", profile: "API", trigger: "Schedule · api-weekly", status: "completed", duration: "48 min", minutes: 48, counts: { critical: 0, high: 2, medium: 3, low: 5 }, started: "Today 03:00" },
  { id: "310", target: "app.example.com", env: "prod", profile: "Baseline", trigger: "Deploy · release 2026.10.3", status: "completed", duration: "12 min", minutes: 12, counts: { critical: 0, high: 0, medium: 1, low: 4 }, started: "Yesterday 17:41" },
  { id: "309", target: "staging.example.com", env: "staging", profile: "Full", trigger: "Schedule · nightly-staging", status: "completed", duration: "1 h 06 min", minutes: 66, counts: { critical: 1, high: 2, medium: 2, low: 3 }, started: "Yesterday 02:00" },
  { id: "308", target: "graphql.staging.example.com", env: "staging", profile: "API", trigger: "Manual · Sarah Chen", status: "failed", duration: "3 min", minutes: 3, counts: { critical: 0, high: 0, medium: 0, low: 0 }, started: "Oct 17 16:22" },
  { id: "307", target: "admin.staging.example.com", env: "staging", profile: "Quick", trigger: "Pull request · #482", status: "completed", duration: "7 min", minutes: 7, counts: { critical: 0, high: 1, medium: 0, low: 2 }, started: "Oct 17 11:09" },
  { id: "306", target: "staging.example.com", env: "staging", profile: "Full", trigger: "Schedule · nightly-staging", status: "completed", duration: "58 min", minutes: 58, counts: { critical: 0, high: 2, medium: 3, low: 3 }, started: "Oct 17 02:00" },
  { id: "305", target: "app.example.com", env: "prod", profile: "Baseline", trigger: "Manual · Dana Kim", status: "completed", duration: "14 min", minutes: 14, counts: { critical: 0, high: 0, medium: 1, low: 4 }, started: "Oct 16 10:30" },
  { id: "304", target: "api.example.com", env: "prod", profile: "API", trigger: "Schedule · api-weekly", status: "failed", duration: "1 min", minutes: 1, counts: { critical: 0, high: 0, medium: 0, low: 0 }, started: "Oct 12 03:00" },
];

const SCAN_TONE: Record<ScanStatus, Tone> = { running: "info", completed: "success", failed: "danger" };
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

function SevCountsCell({ counts }: { counts: SevCounts }) {
  const keys = (["critical", "high", "medium", "low"] as const).filter((k) => counts[k] > 0);
  if (keys.length === 0) return <span className="text-fg-muted">–</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {keys.map((k) => (
        <Badge key={k} tone={SEVERITY_META[k].tone} mono>
          {counts[k]} {SEVERITY_META[k].label[0]}
          <span className="sr-only"> ({SEVERITY_META[k].label})</span>
        </Badge>
      ))}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Scans: list + running scan detail                                   */
/* ------------------------------------------------------------------ */

const findingColumns: Column<Finding>[] = [
  { id: "sev", header: "Severity", width: "100px", sortValue: (f) => SEVERITY_META[f.severity].rank, cell: (f) => <SeverityBadge severity={f.severity} /> },
  {
    id: "title",
    header: "Finding",
    width: "34%",
    cell: (f) => (
      <span className="flex min-w-0 flex-col">
        {/* Click bubbles to the row handler; the button makes it keyboard reachable. */}
        <button type="button" className="self-start truncate text-left font-medium text-fg hover:underline">
          {f.title}
        </button>
        <span className="truncate font-mono text-2xs text-fg-muted">{f.rule}</span>
      </span>
    ),
  },
  { id: "url", header: "Location", cell: (f) => <EntityChip kind="url" value={f.url} hideKind /> },
  { id: "param", header: "Param", mono: true, cell: (f) => f.param ?? "–" },
  { id: "engine", header: "Engine", cell: (f) => <Badge>{f.engine}</Badge> },
  { id: "state", header: "Status", cell: (f) => (f.confirmed ? <StatusBadge tone="danger">Confirmed</StatusBadge> : <StatusBadge tone="neutral">Detected</StatusBadge>) },
];

const N = 30;
const minutes = timeLabels(N, 1, 14 * 60 + 2);

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span id="scan-progress-label" className="font-medium text-fg">
          {label}
        </span>
        <span className="font-mono text-fg-muted">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="scan-progress-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% · active scan, 14 of 22 rules`}
        className="h-2 overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
      <span className="text-2xs text-fg-muted">Passive scan done · active scan rule 14 of 22 (SQL injection) · about 9 min left</span>
    </div>
  );
}

function ScanDetail({ scan, onBack }: { scan: ScanRow; onBack: () => void }) {
  const [open, setOpen] = useState<Finding>(findings[0]!);
  const [paused, setPaused] = useState(false);
  const running = scan.status === "running";
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Scans" }, { label: `#${scan.id}` }]}
        title={`Scan #${scan.id} · ${scan.env}`}
        description={
          <span className="flex flex-wrap items-center gap-1.5">
            <EntityChip kind="url" value={`https://${scan.target}`} href="#target" />
            <span>
              {scan.profile} scan · auth profile “staging-user” · started {scan.started} by {scan.trigger.toLowerCase()}
            </span>
          </span>
        }
        meta={running ? paused ? <StatusBadge tone="warning">Paused</StatusBadge> : <StatusBadge tone="info">Running</StatusBadge> : <StatusBadge tone={SCAN_TONE[scan.status]}>{cap(scan.status)}</StatusBadge>}
        actions={
          <>
            <Button size="md" variant="ghost" icon={<ArrowLeft />} onClick={onBack}>
              Back to scans
            </Button>
            {running ? (
              <>
                <Button size="md" icon={<Pause />} onClick={() => setPaused((p) => !p)}>
                  {paused ? "Resume" : "Pause"}
                </Button>
                <Button size="md" variant="danger" icon={<Square />}>
                  Stop scan
                </Button>
              </>
            ) : (
              <Button size="md" variant="primary" icon={<Play />}>
                Rescan
              </Button>
            )}
          </>
        }
      />
      {scan.status === "failed" && (
        <Callout tone="danger" title="Scan failed: login did not succeed">
          The auth profile could not reach the logged-in state. Check the recording under Auth profiles and test the login.
        </Callout>
      )}
      <Panel>
        <div className="flex flex-col gap-2 pt-2.5">
          <Progress value={running ? 64 : 100} label="Scan progress" />
          <p className="text-xs text-fg-muted">
            Engines: <span className="font-medium text-fg">OWASP ZAP 2.15</span> (spider, AJAX spider, active scan) +{" "}
            <span className="font-medium text-fg">Nuclei 3.3</span> (1,912 templates: cves, misconfig, exposures). Rate limit 60 req/s.
          </p>
        </div>
      </Panel>
      <KpiGrid minWidth={150}>
        <KpiCard label="URLs crawled" value="1,482" unit="unique" trend={wave(12, { base: 900, amp: 500, seed: 70 })} />
        <KpiCard label="Requests" value="38k" unit="sent" delta={{ label: "0.4% errors (5xx)" }} />
        <KpiCard label="Critical" value="1" tone="critical" footer={<SeverityBadge severity="critical" />} />
        <KpiCard label="High" value="1" tone="danger" footer={<SeverityBadge severity="high" />} />
        <KpiCard
          label="Medium · low"
          value="3"
          footer={
            <span className="flex gap-1">
              <SeverityBadge severity="medium" />
              <SeverityBadge severity="low" />
            </span>
          }
        />
      </KpiGrid>
      <Panel title="Requests per second" description="During this scan, by engine">
        <TimeSeriesChart
          label="DAST requests per second during the scan"
          labels={minutes}
          stacked
          height={150}
          xTicks={6}
          format={(v) => `${Math.round(v)}/s`}
          threshold={{ value: 60, label: "Rate limit" }}
          series={[
            { id: "zap", name: "ZAP", data: wave(N, { base: 30, amp: 12, seed: 71 }) },
            { id: "nuclei", name: "Nuclei", data: wave(N, { base: 12, amp: 8, seed: 72, phase: 2 }) },
          ]}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
        <Panel title="Findings" description="5 so far · 3 confirmed with a working payload" flush>
          <DataTable
            label="DAST findings"
            columns={findingColumns}
            rows={findings}
            getRowId={(f) => f.id}
            onRowClick={setOpen}
            activeRowId={open.id}
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={760}
          />
        </Panel>
        <Panel
          aria-label="Evidence"
          title={
            <span className="flex items-center gap-1.5">
              <SeverityBadge severity={open.severity} compact role="img" />
              Evidence · {open.title}
            </span>
          }
          description={
            <span className="font-mono">
              {open.engine} · {open.url}
            </span>
          }
          footer={
            <span className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="primary">
                Create issue
              </Button>
              <Button size="sm">Retest</Button>
              <Button size="sm" variant="ghost">
                Copy as curl
              </Button>
            </span>
          }
        >
          <div className="flex flex-col gap-2">
            {open.id === "d1" && (
              <Callout tone="info" title="Also found by SAST">
                CWE-89 in internal/orders/search.go:42 on PR #482.
              </Callout>
            )}
            {(["Request", "Response"] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1">
                <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{k}</span>
                <pre
                  role="region"
                  aria-label={`${k} for ${open.title}`}
                  tabIndex={0}
                  className="m-0 max-h-48 overflow-auto rounded-md border border-line bg-subtle px-2.5 py-2 font-mono text-xs whitespace-pre-wrap text-fg"
                >
                  {k === "Request" ? open.request : open.response}
                </pre>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </>
  );
}

const DAYS = ["Oct 6", "Oct 7", "Oct 8", "Oct 9", "Oct 10", "Oct 11", "Oct 12", "Oct 13", "Oct 14", "Oct 15", "Oct 16", "Oct 17", "Oct 18", "Oct 19"];

function ScansPage({ initialOpen }: { initialOpen?: string }) {
  const [openId, setOpenId] = useState<string | null>(initialOpen ?? null);
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<string[]>([]);
  const scan = SCANS.find((s) => s.id === openId);
  if (scan) return <ScanDetail scan={scan} onBack={() => setOpenId(null)} />;

  const shown = SCANS.filter(
    (s) =>
      (s.target.includes(query.toLowerCase()) || `#${s.id}`.includes(query)) &&
      (statuses.length === 0 || statuses.includes(s.status)) &&
      (profiles.length === 0 || profiles.includes(s.profile)),
  );
  const cols: Column<ScanRow>[] = [
    {
      id: "id",
      header: "Scan",
      width: "80px",
      pinned: "left",
      sortValue: (s) => Number(s.id),
      cell: (s) => (
        <button type="button" className="font-mono font-medium text-fg hover:underline">
          #{s.id}
        </button>
      ),
    },
    {
      id: "target",
      header: "Target",
      width: "24%",
      sortValue: (s) => s.target,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{s.target}</span>
          <span className="text-2xs text-fg-muted">{s.env}</span>
        </span>
      ),
    },
    { id: "profile", header: "Profile", description: "Full: spider + active scan. Baseline: passive only. API: driven by the spec. Quick: changed routes only.", cell: (s) => <Badge variant="outline">{s.profile}</Badge> },
    { id: "trigger", header: "Trigger", cell: (s) => <span className="text-fg-muted">{s.trigger}</span> },
    { id: "status", header: "Status", sortValue: (s) => s.status, cell: (s) => <StatusBadge tone={SCAN_TONE[s.status]}>{cap(s.status)}</StatusBadge> },
    { id: "duration", header: "Duration", align: "right", mono: true, sortValue: (s) => s.minutes, cell: (s) => s.duration },
    { id: "findings", header: "Findings", description: "New and open findings by severity: C critical, H high, M medium, L low.", sortValue: (s) => s.counts.critical * 1000 + s.counts.high * 100 + s.counts.medium * 10 + s.counts.low, cell: (s) => <SevCountsCell counts={s.counts} /> },
    { id: "started", header: "Started", cell: (s) => s.started },
  ];
  return (
    <>
      <PageHeader
        title="Scans"
        description="Dynamic scans of running apps and APIs with OWASP ZAP and Nuclei."
        actions={
          <Button variant="primary" icon={<Play />}>
            New scan
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Scans · 14 days" value="38" delta={{ label: "+6 vs. previous", direction: "up" }} trend={wave(14, { base: 3, amp: 2, seed: 81 })} />
        <KpiCard label="Running" value="1" unit="#312" tone="info" />
        <KpiCard label="Failed · 14 days" value="2" tone="danger" delta={{ label: "both login failures" }} />
        <KpiCard label="Median duration" value="34" unit="min" delta={{ label: "-8 min with Quick scans", direction: "down", intent: "good" }} />
      </KpiGrid>
      <Panel title="Findings per scan day" description="New findings by severity">
        <StackedBarChart
          label="New DAST findings per day by severity"
          categories={DAYS}
          height={130}
          xTicks={7}
          segments={(["critical", "high", "medium", "low"] as const).map((k) => ({ id: k, name: SEVERITY_META[k].label, color: `var(--oa-${k === "critical" ? "critical" : k === "high" ? "danger" : k === "medium" ? "warning" : "accent"})` }))}
          values={DAYS.map((_, i) => [i % 5 === 0 ? 1 : 0, (i * 3) % 4 === 0 ? 2 : i % 2, 1 + (i % 3), 2 + (i % 4)])}
        />
      </Panel>
      <FilterBar onClear={query || statuses.length || profiles.length ? () => (setQuery(""), setStatuses([]), setProfiles([])) : undefined}>
        <SearchInput label="Search scans" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <FacetFilter label="Status" selected={statuses} onChange={setStatuses} options={(["running", "completed", "failed"] as const).map((v) => ({ value: v, label: cap(v), count: SCANS.filter((s) => s.status === v).length }))} />
        <FacetFilter label="Profile" selected={profiles} onChange={setProfiles} options={["Full", "Baseline", "API", "Quick"].map((v) => ({ value: v }))} />
      </FilterBar>
      <Panel title="Recent scans" description={`${shown.length} of ${SCANS.length}`} flush>
        <DataTable label="Scans" columns={cols} rows={shown} getRowId={(s) => s.id} onRowClick={(s) => setOpenId(s.id)} defaultSort={{ id: "id", direction: "desc" }} minWidth={980} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Targets                                                             */
/* ------------------------------------------------------------------ */

type Verify = "verified" | "pending" | "failed";
interface Target {
  id: string;
  name: string;
  url: string;
  env: "staging" | "prod";
  kind: "Web app" | "OpenAPI" | "GraphQL";
  spec?: string;
  verify: Verify;
  method: string;
  lastScan: string;
  risk: Severity;
  include: string[];
  exclude: string[];
  auth: string;
}

const TARGETS: Target[] = [
  { id: "t1", name: "Storefront staging", url: "https://staging.example.com", env: "staging", kind: "Web app", verify: "verified", method: "DNS TXT record", lastScan: "#312 · running", risk: "critical", include: ["https://staging.example.com/*"], exclude: ["/logout", "/account/delete", "/static/*"], auth: "staging-user" },
  { id: "t2", name: "Storefront", url: "https://app.example.com", env: "prod", kind: "Web app", verify: "verified", method: "DNS TXT record", lastScan: "#310 · yesterday", risk: "medium", include: ["https://app.example.com/*"], exclude: ["/logout", "/checkout/pay", "/admin/*"], auth: "prod-readonly" },
  { id: "t3", name: "Public API", url: "https://api.example.com", env: "prod", kind: "OpenAPI", spec: "openapi.yaml · v3.1 · 142 operations", verify: "verified", method: "File at /.well-known/openasy.txt", lastScan: "#311 · today", risk: "high", include: ["https://api.example.com/v1/*"], exclude: ["DELETE *", "/v1/payments/*"], auth: "api-token" },
  { id: "t4", name: "GraphQL gateway", url: "https://graphql.staging.example.com", env: "staging", kind: "GraphQL", spec: "Introspection · 38 queries · 21 mutations", verify: "failed", method: "DNS TXT record", lastScan: "#308 · failed", risk: "low", include: ["https://graphql.staging.example.com/graphql"], exclude: ["mutation deleteAccount"], auth: "staging-user" },
  { id: "t5", name: "Admin console staging", url: "https://admin.staging.example.com", env: "staging", kind: "Web app", verify: "pending", method: "HTTP header", lastScan: "#307 · Oct 17", risk: "high", include: ["https://admin.staging.example.com/*"], exclude: ["/users/*/impersonate"], auth: "staging-admin" },
];

const VERIFY_TONE: Record<Verify, Tone> = { verified: "success", pending: "warning", failed: "danger" };

function TargetsPage() {
  const [rows, setRows] = useState(TARGETS);
  const [activeId, setActiveId] = useState("t1");
  const [rule, setRule] = useState("");
  const [ruleKind, setRuleKind] = useState<"include" | "exclude">("exclude");
  const t = rows.find((r) => r.id === activeId)!;
  const update = (patch: Partial<Target>) => setRows((rs) => rs.map((r) => (r.id === t.id ? { ...r, ...patch } : r)));
  const cols: Column<Target>[] = [
    {
      id: "name",
      header: "Target",
      width: "30%",
      pinned: "left",
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" className="self-start truncate text-left font-medium text-fg hover:underline">
            {r.name}
          </button>
          <span className="truncate font-mono text-2xs text-fg-muted">{r.url}</span>
        </span>
      ),
    },
    { id: "env", header: "Env", cell: (r) => <Badge tone={r.env === "prod" ? "danger" : "neutral"}>{r.env}</Badge> },
    { id: "kind", header: "Type", cell: (r) => r.kind },
    { id: "verify", header: "Ownership", description: "Scans only run against targets whose ownership is verified.", sortValue: (r) => r.verify, cell: (r) => <StatusBadge tone={VERIFY_TONE[r.verify]}>{cap(r.verify)}</StatusBadge> },
    { id: "last", header: "Last scan", cell: (r) => <span className="text-fg-muted">{r.lastScan}</span> },
    { id: "risk", header: "Risk", sortValue: (r) => SEVERITY_META[r.risk].rank, cell: (r) => <SeverityBadge severity={r.risk} /> },
  ];
  const addRule = () => {
    if (!rule.trim()) return;
    update(ruleKind === "include" ? { include: [...t.include, rule.trim()] } : { exclude: [...t.exclude, rule.trim()] });
    setRule("");
  };
  return (
    <>
      <PageHeader title="Targets" description="Apps and APIs under example.com that DAST may scan, with their scope." actions={<Button variant="primary" icon={<Plus />}>Add target</Button>} />
      <KpiGrid>
        <KpiCard label="Targets" value="5" unit="3 staging · 2 prod" />
        <KpiCard label="Verified" value="3" tone="success" delta={{ label: "1 pending, 1 failed" }} />
        <KpiCard label="API operations" value="201" unit="from specs" />
        <KpiCard label="High risk or worse" value="3" tone="danger" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <Panel title="All targets" flush>
          <DataTable label="Targets" columns={cols} rows={rows} getRowId={(r) => r.id} onRowClick={(r) => setActiveId(r.id)} activeRowId={activeId} minWidth={780} />
        </Panel>
        <Panel
          aria-label="Target detail"
          title={t.name}
          description={<span className="font-mono">{t.url}</span>}
          actions={<StatusBadge tone={VERIFY_TONE[t.verify]}>{cap(t.verify)}</StatusBadge>}
        >
          <div className="flex flex-col gap-3 pt-1">
            {t.verify !== "verified" && (
              <Callout
                tone={t.verify === "failed" ? "danger" : "warning"}
                title={t.verify === "failed" ? "Ownership check failed" : "Ownership not verified yet"}
                action={
                  <Button size="sm" onClick={() => update({ verify: "verified" })}>
                    Verify now
                  </Button>
                }
              >
                Method: {t.method}. Expected value <span className="font-mono">openasy-verify=7f3c9a</span>.
              </Callout>
            )}
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
              <dt className="text-fg-muted">Type</dt>
              <dd>{t.kind}</dd>
              {t.spec && (
                <>
                  <dt className="text-fg-muted">API spec</dt>
                  <dd className="font-mono text-xs">{t.spec}</dd>
                </>
              )}
              <dt className="text-fg-muted">Verification</dt>
              <dd>{t.method}</dd>
              <dt className="text-fg-muted">Auth profile</dt>
              <dd className="font-mono text-xs">{t.auth}</dd>
              <dt className="text-fg-muted">Last scan</dt>
              <dd>{t.lastScan}</dd>
            </dl>
            {(["include", "exclude"] as const).map((k) => (
              <div key={k} className="flex flex-col gap-1">
                <h3 className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{k === "include" ? "In scope" : "Excluded"}</h3>
                <ul aria-label={k === "include" ? "Include rules" : "Exclude rules"} className="flex flex-col gap-1">
                  {t[k].map((r) => (
                    <li key={r} className="flex items-center justify-between gap-2 rounded-md border border-line bg-subtle px-2 py-1 font-mono text-xs">
                      <span className="min-w-0 truncate">{r}</span>
                      <IconButton size="xs" label={`Remove rule ${r}`} onClick={() => update({ [k]: t[k].filter((x) => x !== r) } as Partial<Target>)}>
                        <Trash2 />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <form
              className="grid grid-cols-[110px_minmax(0,1fr)_auto] items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                addRule();
              }}
            >
              <SelectField label="Rule" value={ruleKind} onChange={(e) => setRuleKind(e.target.value as "include" | "exclude")} options={[{ value: "exclude", label: "Exclude" }, { value: "include", label: "Include" }]} />
              <TextField label="Path or pattern" mono placeholder="/admin/*" value={rule} onChange={(e) => setRule(e.target.value)} />
              <Button type="submit">Add rule</Button>
            </form>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Findings (all targets)                                              */
/* ------------------------------------------------------------------ */

type FindingStatus = "confirmed" | "detected" | "fixed" | "false-positive";
interface AllFinding {
  id: string;
  severity: Severity;
  title: string;
  target: string;
  path: string;
  cwe: string;
  status: FindingStatus;
  firstSeen: string;
  scans: number;
  owner?: string;
  fix: string;
}

const ALL_FINDINGS: AllFinding[] = [
  { id: "f1", severity: "critical", title: "SQL injection", target: "staging.example.com", path: "/v1/orders?q=", cwe: "CWE-89", status: "confirmed", firstSeen: "Oct 17", scans: 3, owner: "Ben Ortiz", fix: "Use parameterised queries in the order search handler." },
  { id: "f2", severity: "high", title: "Reflected cross-site scripting", target: "staging.example.com", path: "/search", cwe: "CWE-79", status: "confirmed", firstSeen: "Oct 14", scans: 6, owner: "Sarah Chen", fix: "Encode the search term with the template engine's HTML escaping." },
  { id: "f3", severity: "high", title: "Broken object level authorization", target: "api.example.com", path: "/v1/invoices/{id}", cwe: "CWE-639", status: "confirmed", firstSeen: "Oct 12", scans: 2, owner: "Dana Kim", fix: "Check that the invoice belongs to the caller's account." },
  { id: "f4", severity: "high", title: "GraphQL introspection enabled", target: "graphql.staging.example.com", path: "/graphql", cwe: "CWE-200", status: "detected", firstSeen: "Oct 9", scans: 4, fix: "Disable introspection outside development." },
  { id: "f5", severity: "high", title: "Missing authorization on user export", target: "admin.staging.example.com", path: "/users/export.csv", cwe: "CWE-862", status: "detected", firstSeen: "Oct 17", scans: 1, fix: "Require the admin role on the export route." },
  { id: "f6", severity: "medium", title: "Open redirect", target: "staging.example.com", path: "/login?next=", cwe: "CWE-601", status: "confirmed", firstSeen: "Oct 3", scans: 12, owner: "Chris Shaw", fix: "Allow only relative paths in the next parameter." },
  { id: "f7", severity: "medium", title: "TLS 1.0 enabled", target: "staging.example.com", path: ":443", cwe: "CWE-327", status: "detected", firstSeen: "Sep 28", scans: 15, fix: "Set the minimum TLS version to 1.2 on the load balancer." },
  { id: "f8", severity: "medium", title: "Rate limiting missing on login", target: "api.example.com", path: "/v1/auth/token", cwe: "CWE-307", status: "fixed", firstSeen: "Sep 20", scans: 9, owner: "Mark Wilson", fix: "Fixed in release 2026.10.1." },
  { id: "f9", severity: "medium", title: "Cookie without SameSite attribute", target: "app.example.com", path: "/", cwe: "CWE-1275", status: "detected", firstSeen: "Oct 1", scans: 7, fix: "Set SameSite=Lax on the session cookie." },
  { id: "f10", severity: "low", title: "Missing Content-Security-Policy header", target: "staging.example.com", path: "/", cwe: "CWE-693", status: "detected", firstSeen: "Sep 15", scans: 20, fix: "Add a Content-Security-Policy header." },
  { id: "f11", severity: "low", title: "Server version disclosed", target: "app.example.com", path: "/", cwe: "CWE-200", status: "false-positive", firstSeen: "Sep 10", scans: 18, owner: "Amy Davis", fix: "Header comes from the CDN and shows no version." },
  { id: "f12", severity: "low", title: "Verbose error messages", target: "api.example.com", path: "/v1/orders", cwe: "CWE-209", status: "fixed", firstSeen: "Aug 30", scans: 11, owner: "Ben Ortiz", fix: "Fixed in release 2026.09.4." },
  { id: "f13", severity: "info", title: "Robots.txt lists admin paths", target: "app.example.com", path: "/robots.txt", cwe: "CWE-200", status: "detected", firstSeen: "Aug 22", scans: 22, fix: "Remove internal paths from robots.txt." },
];

const FSTATUS_META: Record<FindingStatus, { label: string; tone: Tone }> = {
  confirmed: { label: "Confirmed", tone: "danger" },
  detected: { label: "Detected", tone: "warning" },
  fixed: { label: "Fixed", tone: "success" },
  "false-positive": { label: "False positive", tone: "neutral" },
};

function FindingsPage() {
  const [rows, setRows] = useState(ALL_FINDINGS);
  const [query, setQuery] = useState("");
  const [sevs, setSevs] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [targets, setTargets] = useState<string[]>([]);
  const [activeId, setActiveId] = useState("f1");
  const active = rows.find((r) => r.id === activeId)!;
  const shown = rows.filter(
    (f) =>
      f.title.toLowerCase().includes(query.toLowerCase()) &&
      (sevs.length === 0 || sevs.includes(f.severity)) &&
      (statuses.length === 0 || statuses.includes(f.status)) &&
      (targets.length === 0 || targets.includes(f.target)),
  );
  const setStatus = (status: FindingStatus) => setRows((rs) => rs.map((r) => (r.id === active.id ? { ...r, status } : r)));
  const cols: Column<AllFinding>[] = [
    { id: "sev", header: "Severity", width: "100px", sortValue: (f) => SEVERITY_META[f.severity].rank, cell: (f) => <SeverityBadge severity={f.severity} /> },
    {
      id: "title",
      header: "Finding",
      width: "30%",
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" className="self-start truncate text-left font-medium text-fg hover:underline">
            {f.title}
          </button>
          <span className="truncate font-mono text-2xs text-fg-muted">
            {f.cwe} · {f.path}
          </span>
        </span>
      ),
    },
    { id: "target", header: "Target", sortValue: (f) => f.target, cell: (f) => <span className="truncate">{f.target}</span> },
    { id: "status", header: "Status", sortValue: (f) => f.status, cell: (f) => <StatusBadge tone={FSTATUS_META[f.status].tone}>{FSTATUS_META[f.status].label}</StatusBadge> },
    { id: "seen", header: "First seen", cell: (f) => f.firstSeen },
    { id: "scans", header: "Scans", align: "right", mono: true, description: "How many scans reported this finding.", sortValue: (f) => f.scans, cell: (f) => f.scans },
  ];
  const facet = <K extends keyof AllFinding>(k: K, v: string) => rows.filter((r) => r[k] === v).length;
  return (
    <>
      <PageHeader title="Findings" description="Every DAST finding across all targets, deduplicated by rule and location." actions={<Button>Export CSV</Button>} />
      <KpiGrid>
        <KpiCard label="Open" value="10" delta={{ label: "+3 this week", direction: "up", intent: "bad" }} trend={[6, 7, 7, 8, 8, 9, 7, 8, 9, 10]} />
        <KpiCard label="Confirmed" value="4" tone="danger" unit="working payload" />
        <KpiCard label="Fixed · 30 days" value="2" tone="success" />
        <KpiCard label="Mean time to fix" value="9" unit="days" />
      </KpiGrid>
      <div className="grid gap-2.5 lg:grid-cols-2">
        <Panel title="Open by target">
          <BarList
            label="Open findings by target"
            items={Array.from(new Set(ALL_FINDINGS.map((f) => f.target))).map((t) => ({ id: t, label: t, value: ALL_FINDINGS.filter((f) => f.target === t && f.status !== "fixed" && f.status !== "false-positive").length }))}
          />
        </Panel>
        <Panel title="Open findings over time" description="Last 14 days">
          <TimeSeriesChart label="Open DAST findings over 14 days" labels={DAYS} height={120} xTicks={5} series={[{ id: "open", name: "Open", data: [6, 6, 7, 7, 8, 8, 7, 8, 8, 9, 9, 8, 9, 10] }]} />
        </Panel>
      </div>
      <FilterBar onClear={query || sevs.length || statuses.length || targets.length ? () => (setQuery(""), setSevs([]), setStatuses([]), setTargets([])) : undefined}>
        <SearchInput label="Search findings" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <FacetFilter label="Severity" selected={sevs} onChange={setSevs} options={(["critical", "high", "medium", "low", "info"] as const).map((s) => ({ value: s, label: SEVERITY_META[s].label, count: facet("severity", s) }))} />
        <FacetFilter label="Status" selected={statuses} onChange={setStatuses} options={(Object.keys(FSTATUS_META) as FindingStatus[]).map((s) => ({ value: s, label: FSTATUS_META[s].label, count: facet("status", s) }))} />
        <FacetFilter label="Target" selected={targets} onChange={setTargets} searchable options={Array.from(new Set(rows.map((r) => r.target))).map((t) => ({ value: t, count: facet("target", t) }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(320px,2fr)]">
        <Panel title="All findings" description={`${shown.length} of ${rows.length}`} flush>
          <DataTable label="All findings" columns={cols} rows={shown} getRowId={(f) => f.id} onRowClick={(f) => setActiveId(f.id)} activeRowId={activeId} defaultSort={{ id: "sev", direction: "desc" }} pageSize={10} minWidth={820} />
        </Panel>
        <Panel
          aria-label="Finding detail"
          title={
            <span className="flex items-center gap-1.5">
              <SeverityBadge severity={active.severity} compact />
              {active.title}
            </span>
          }
          description={
            <span className="font-mono">
              {active.cwe} · {active.target}
              {active.path}
            </span>
          }
          footer={
            <span className="flex flex-wrap gap-1.5">
              <Button size="sm" variant="primary" onClick={() => setStatus("confirmed")}>
                Confirm
              </Button>
              <Button size="sm" onClick={() => setStatus("fixed")}>
                Mark fixed
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setStatus("false-positive")}>
                Mark false positive
              </Button>
            </span>
          }
        >
          <dl className="grid grid-cols-[100px_minmax(0,1fr)] gap-x-3 gap-y-1.5 pt-1 text-sm">
            <dt className="text-fg-muted">Status</dt>
            <dd>
              <StatusBadge tone={FSTATUS_META[active.status].tone}>{FSTATUS_META[active.status].label}</StatusBadge>
            </dd>
            <dt className="text-fg-muted">First seen</dt>
            <dd>
              {active.firstSeen} · in {active.scans} scans
            </dd>
            <dt className="text-fg-muted">Owner</dt>
            <dd>
              {active.owner ? (
                <span className="flex items-center gap-1.5">
                  <Avatar name={active.owner} size="sm" />
                  {active.owner}
                </span>
              ) : (
                <span className="text-fg-muted">Unassigned</span>
              )}
            </dd>
            <dt className="text-fg-muted">Remediation</dt>
            <dd>{active.fix}</dd>
          </dl>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Auth profiles                                                       */
/* ------------------------------------------------------------------ */

interface AuthProfile {
  id: string;
  name: string;
  kind: "Recorded browser login" | "Bearer token" | "Form login";
  loginUrl: string;
  user: string;
  vault: string;
  checkUrl: string;
  loggedOut: string;
  steps: string[];
  targets: string[];
  lastTest: { ok: boolean; when: string };
}

const AUTH: AuthProfile[] = [
  {
    id: "a1",
    name: "staging-user",
    kind: "Recorded browser login",
    loginUrl: "https://staging.example.com/login",
    user: "dast-bot@example.com",
    vault: "vault://dast/staging-user",
    checkUrl: "https://staging.example.com/account",
    loggedOut: "Sign in to continue|/login",
    steps: ["Open https://staging.example.com/login", "Type username into #email", "Type password into #password", "Click button “Sign in”", "Enter TOTP from vault into #otp", "Wait for /account to load"],
    targets: ["staging.example.com", "graphql.staging.example.com"],
    lastTest: { ok: true, when: "Today 13:58" },
  },
  {
    id: "a2",
    name: "staging-admin",
    kind: "Form login",
    loginUrl: "https://admin.staging.example.com/sign-in",
    user: "dast-admin@example.com",
    vault: "vault://dast/staging-admin",
    checkUrl: "https://admin.staging.example.com/dashboard",
    loggedOut: "HTTP 302 → /sign-in",
    steps: ["POST /sign-in with username and password fields", "Store session cookie admin_sid", "Check /dashboard returns 200"],
    targets: ["admin.staging.example.com"],
    lastTest: { ok: false, when: "Oct 17 16:20" },
  },
  {
    id: "a3",
    name: "api-token",
    kind: "Bearer token",
    loginUrl: "https://api.example.com/v1/auth/token",
    user: "client_id dast-scanner",
    vault: "vault://dast/api-client",
    checkUrl: "https://api.example.com/v1/me",
    loggedOut: "HTTP 401",
    steps: ["POST /v1/auth/token with client credentials", "Read access_token from JSON response", "Send Authorization: Bearer header", "Refresh 60 s before expiry"],
    targets: ["api.example.com"],
    lastTest: { ok: true, when: "Today 03:00" },
  },
];

function AuthPage() {
  const [activeId, setActiveId] = useState("a1");
  const [test, setTest] = useState<Record<string, "ok" | "fail" | undefined>>({});
  const p = AUTH.find((a) => a.id === activeId)!;
  const result = test[p.id];
  return (
    <>
      <PageHeader title="Auth profiles" description="How scans sign in: recorded logins, form logins and API tokens. Secrets stay in the vault." actions={<Button variant="primary" icon={<Plus />}>Record login</Button>} />
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="Profiles" flush>
          <ul aria-label="Auth profiles" className="flex flex-col">
            {AUTH.map((a) => (
              <li key={a.id} className="border-b border-subtle last:border-0">
                <button
                  type="button"
                  aria-current={a.id === activeId ? "true" : undefined}
                  onClick={() => setActiveId(a.id)}
                  className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left hover:bg-subtle ${a.id === activeId ? "bg-accent-soft" : ""}`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="font-mono text-sm font-medium text-fg">{a.name}</span>
                    {a.lastTest.ok ? <StatusBadge tone="success">Working</StatusBadge> : <StatusBadge tone="danger">Failing</StatusBadge>}
                  </span>
                  <span className="text-xs text-fg-muted">
                    {a.kind} · {a.targets.length} {a.targets.length === 1 ? "target" : "targets"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel
            aria-label="Profile detail"
            title={<span className="font-mono">{p.name}</span>}
            description={p.kind}
            actions={
              <Button size="sm" variant="primary" icon={<ShieldCheck />} onClick={() => setTest((t) => ({ ...t, [p.id]: p.id === "a2" ? "fail" : "ok" }))}>
                Test login
              </Button>
            }
          >
            <div className="flex flex-col gap-3 pt-1">
              {result === "ok" && (
                <Callout tone="success" title="Login succeeded">
                  Reached {p.checkUrl} in 2.4 s. Logged-out indicator not present.
                </Callout>
              )}
              {result === "fail" && (
                <Callout tone="danger" title="Login failed at step 3">
                  The check URL redirected to /sign-in. The password in the vault may have been rotated.
                </Callout>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                <TextField label="Login URL" mono readOnly value={p.loginUrl} />
                <TextField label="Username" mono readOnly value={p.user} />
                <TextField label="Password" mono readOnly type="password" value="stored-in-vault" hint={<span className="font-mono">{p.vault}</span>} />
                <TextField label="Session check URL" mono readOnly value={p.checkUrl} hint="Requested every 50 requests to confirm the session." />
                <TextField label="Logged-out indicator" mono readOnly value={p.loggedOut} hint="Regex or status that means the scanner lost its session." />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-fg">Used by</span>
                  <span className="flex flex-wrap gap-1">
                    {p.targets.map((t) => (
                      <EntityChip key={t} kind="url" value={t} hideKind />
                    ))}
                  </span>
                </div>
              </div>
            </div>
          </Panel>
          <Panel title="Login steps" description={`${p.steps.length} steps · last test ${p.lastTest.when}`}>
            <ol aria-label="Login steps" className="flex flex-col gap-1 pt-1">
              {p.steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2 rounded-md border border-line px-2 py-1.5 text-sm">
                  <span className="grid size-5 shrink-0 place-items-center rounded-full bg-subtle font-mono text-2xs text-fg-muted">{i + 1}</span>
                  <span className="min-w-0 grow">{s}</span>
                  {result &&
                    (result === "fail" && i >= 2 ? (
                      <CircleX aria-label="Step failed" role="img" className="size-4 text-danger-text" />
                    ) : (
                      <CircleCheck aria-label="Step passed" role="img" className="size-4 text-success" />
                    ))}
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Schedules                                                           */
/* ------------------------------------------------------------------ */

interface Schedule {
  id: string;
  name: string;
  target: string;
  cron: string;
  human: string;
  profile: string;
  next: string;
  enabled: boolean;
}

const SCHEDULES: Schedule[] = [
  { id: "s1", name: "nightly-staging", target: "staging.example.com", cron: "0 2 * * *", human: "Every day at 02:00", profile: "Full", next: "Tomorrow 02:00", enabled: true },
  { id: "s2", name: "api-weekly", target: "api.example.com", cron: "0 3 * * 1", human: "Mondays at 03:00", profile: "API", next: "Oct 26 03:00", enabled: true },
  { id: "s3", name: "prod-baseline", target: "app.example.com", cron: "30 4 * * 1-5", human: "Weekdays at 04:30", profile: "Baseline", next: "Tomorrow 04:30", enabled: true },
  { id: "s4", name: "graphql-nightly", target: "graphql.staging.example.com", cron: "0 1 * * *", human: "Every day at 01:00", profile: "API", next: "Paused", enabled: false },
  { id: "s5", name: "admin-weekly", target: "admin.staging.example.com", cron: "0 22 * * 5", human: "Fridays at 22:00", profile: "Full", next: "Oct 24 22:00", enabled: true },
];

const BLACKOUTS = [
  { id: "b1", name: "Release freeze", when: "Oct 30 18:00 – Nov 2 08:00", targets: "All prod targets" },
  { id: "b2", name: "Peak trading hours", when: "Daily 09:00 – 18:00", targets: "app.example.com, api.example.com" },
  { id: "b3", name: "Database maintenance", when: "Sundays 00:00 – 04:00", targets: "staging.example.com" },
];

function SchedulesPage() {
  const [rows, setRows] = useState(SCHEDULES);
  const [tab, setTab] = useState<"schedules" | "blackouts">("schedules");
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [cron, setCron] = useState("0 2 * * *");
  const [target, setTarget] = useState(TARGETS[0]!.url.replace("https://", ""));
  const [profile, setProfile] = useState("Full");
  const toggle = (id: string, on: boolean) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, enabled: on, next: on ? "Tomorrow 01:00" : "Paused" } : r)));
  const cols: Column<Schedule>[] = [
    { id: "name", header: "Schedule", width: "20%", pinned: "left", sortValue: (s) => s.name, cell: (s) => <span className="font-mono font-medium">{s.name}</span> },
    { id: "target", header: "Target", sortValue: (s) => s.target, cell: (s) => s.target },
    {
      id: "cron",
      header: "When",
      description: "Cron expression in UTC.",
      cell: (s) => (
        <span className="flex flex-col">
          <span>{s.human}</span>
          <span className="font-mono text-2xs text-fg-muted">{s.cron}</span>
        </span>
      ),
    },
    { id: "profile", header: "Profile", cell: (s) => <Badge variant="outline">{s.profile}</Badge> },
    { id: "next", header: "Next run", cell: (s) => <span className={s.enabled ? "" : "text-fg-muted"}>{s.next}</span> },
    {
      id: "enabled",
      header: "Enabled",
      width: "90px",
      hideable: false,
      cell: (s) => <Switch checked={s.enabled} onCheckedChange={(on) => toggle(s.id, on)} label={<span className="sr-only">Enable {s.name}</span>} />,
    },
  ];
  return (
    <>
      <PageHeader
        title="Schedules"
        description="Recurring scans per target. Blackout windows pause any scan that would overlap."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            New schedule
          </Button>
        }
      >
        <Tabs
          label="Schedule views"
          value={tab}
          onChange={setTab}
          items={[
            { value: "schedules", label: "Schedules", count: rows.length },
            { value: "blackouts", label: "Blackout windows", count: BLACKOUTS.length },
          ]}
        />
      </PageHeader>
      {creating && (
        <Panel title="New schedule" actions={<Button size="sm" variant="ghost" onClick={() => setCreating(false)}>Cancel</Button>}>
          <form
            className="grid gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              setRows((rs) => [...rs, { id: `s${rs.length + 1}`, name: name.trim(), target, cron, human: "Custom", profile, next: "Tomorrow 02:00", enabled: true }]);
              setName("");
              setCreating(false);
              setTab("schedules");
            }}
          >
            <TextField label="Name" mono placeholder="nightly-api" value={name} onChange={(e) => setName(e.target.value)} />
            <SelectField label="Target" value={target} onChange={(e) => setTarget(e.target.value)} options={TARGETS.map((t) => ({ value: t.url.replace("https://", ""), label: t.url.replace("https://", "") }))} />
            <TextField label="Cron (UTC)" mono value={cron} onChange={(e) => setCron(e.target.value)} />
            <SelectField label="Scan profile" value={profile} onChange={(e) => setProfile(e.target.value)} options={["Full", "Baseline", "API", "Quick"].map((v) => ({ value: v, label: v }))} />
            <Button type="submit" variant="primary">
              Create schedule
            </Button>
          </form>
        </Panel>
      )}
      {tab === "schedules" ? (
        <>
          <KpiGrid>
            <KpiCard label="Schedules" value={String(rows.length)} unit={`${rows.filter((r) => r.enabled).length} enabled`} />
            <KpiCard label="Scans this week" value="11" unit="planned" />
            <KpiCard label="Skipped by blackout" value="2" unit="last 30 days" tone="warning" />
            <KpiCard label="Next run" value="01:00" unit="graphql-nightly paused, so 02:00" />
          </KpiGrid>
          <Panel title="Scan schedules" flush>
            <DataTable label="Scan schedules" columns={cols} rows={rows} getRowId={(s) => s.id} minWidth={860} />
          </Panel>
        </>
      ) : (
        <Panel title="Blackout windows" description="No scan starts or keeps running inside these windows." flush>
          <ul aria-label="Blackout windows" className="flex flex-col">
            {BLACKOUTS.map((b) => (
              <li key={b.id} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-3 py-2 text-sm last:border-0">
                <span className="font-medium">{b.name}</span>
                <span className="flex min-w-0 flex-col">
                  <span>{b.when}</span>
                  <span className="truncate text-2xs text-fg-muted">{b.targets}</span>
                </span>
                <IconButton size="xs" label={`Delete ${b.name}`}>
                  <Trash2 />
                </IconButton>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

const PAGES = {
  scans: () => <ScansPage />,
  targets: () => <TargetsPage />,
  findings: () => <FindingsPage />,
  auth: () => <AuthPage />,
  schedules: () => <SchedulesPage />,
};

const app = (initial: string, pages: Record<string, () => ReactNode> = PAGES): Story => ({
  render: () => <ProductApp product="dast" nav={nav} pages={pages} initial={initial} />,
});

/* ------------------------------------------------------------------ */
/* Stories                                                             */
/* ------------------------------------------------------------------ */

/** List of recent scans; opening #312 shows the running scan. */
export const Scans: Story = {
  ...app("scans"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Scans" })).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Scans" })).getByRole("button", { name: "#312" }));
    await expect(c.getByRole("heading", { level: 1, name: "Scan #312 · staging" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Back to scans" }));
    await expect(c.getByRole("heading", { level: 1, name: "Scans" })).toBeInTheDocument();
  },
};

/** A running scan of staging: progress, throughput, findings and evidence for the selected one. */
export const Scan: Story = {
  ...app("scans", { ...PAGES, scans: () => <ScansPage initialOpen="312" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Scan #312 · staging" })).toBeInTheDocument();
    const bar = c.getByRole("progressbar", { name: "Scan progress" });
    await expect(bar).toHaveAttribute("aria-valuenow", "64");

    const evidence = () => within(c.getByRole("region", { name: "Evidence" }));
    await expect(evidence().getByText(/x%27%20AND/)).toBeInTheDocument();

    const table = within(c.getByRole("table", { name: "DAST findings" }));
    await userEvent.click(table.getByRole("button", { name: "Open redirect" }));
    await expect(evidence().getByRole("heading", { name: /Open redirect/ })).toBeInTheDocument();
    await expect(evidence().getByText(/Location: https:\/\/example.net\//)).toBeInTheDocument();
    await expect(evidence().queryByText("Also found by SAST")).not.toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: "Pause" }));
    await expect(c.getByText("Paused")).toBeInTheDocument();
  },
};

export const Targets: Story = {
  ...app("targets"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Targets" })).getByRole("button", { name: "GraphQL gateway" }));
    const detail = within(c.getByRole("region", { name: "Target detail" }));
    await expect(detail.getByText("Ownership check failed")).toBeInTheDocument();
    await userEvent.type(detail.getByRole("textbox", { name: "Path or pattern" }), "/graphql/debug");
    await userEvent.click(detail.getByRole("button", { name: "Add rule" }));
    await expect(within(detail.getByRole("list", { name: "Exclude rules" })).getByText("/graphql/debug")).toBeInTheDocument();
    await userEvent.click(detail.getByRole("button", { name: "Verify now" }));
    await expect(detail.queryByText("Ownership check failed")).not.toBeInTheDocument();
  },
};

export const Findings: Story = {
  ...app("findings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(within(c.getByRole("toolbar", { name: "Filters" })).getByRole("button", { name: "Severity" }));
    await userEvent.click(body.getByRole("checkbox", { name: /^High/ }));
    await userEvent.keyboard("{Escape}");
    const table = c.getByRole("table", { name: "All findings" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(4);
    await userEvent.click(within(table).getByRole("button", { name: "GraphQL introspection enabled" }));
    const detail = within(c.getByRole("region", { name: "Finding detail" }));
    await userEvent.click(detail.getByRole("button", { name: "Mark false positive" }));
    await expect(detail.getByText("False positive")).toBeInTheDocument();
  },
};

export const AuthProfiles: Story = {
  name: "Auth profiles",
  ...app("auth"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = within(c.getByRole("region", { name: "Profile detail" }));
    await expect(detail.getByLabelText("Password")).toHaveAttribute("type", "password");
    await userEvent.click(detail.getByRole("button", { name: "Test login" }));
    await expect(detail.getByText("Login succeeded")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("list", { name: "Auth profiles" })).getByRole("button", { name: /staging-admin/ }));
    await userEvent.click(detail.getByRole("button", { name: "Test login" }));
    await expect(detail.getByText("Login failed at step 3")).toBeInTheDocument();
  },
};

export const Schedules: Story = {
  ...app("schedules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Enable graphql-nightly" }));
    await expect(c.getByRole("switch", { name: "Enable graphql-nightly" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(c.getByRole("button", { name: "New schedule" }));
    await userEvent.type(c.getByRole("textbox", { name: "Name" }), "api-nightly");
    await userEvent.click(c.getByRole("button", { name: "Create schedule" }));
    await expect(within(c.getByRole("table", { name: "Scan schedules" })).getByText("api-nightly")).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /Blackout windows/ }));
    await expect(c.getByText("Release freeze")).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
