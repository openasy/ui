import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BellOff, BellRing, CalendarClock, History, ListChecks, Mail, MessageSquare, Phone, Plus, Send, Webhook } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import type { Severity, Tone } from "../../tokens/levels";
import { PEOPLE, wave } from "../mocks";

const nav = [
  { id: "rules", label: "Rules", icon: ListChecks, count: 64 },
  { id: "firing", label: "Firing", icon: BellRing, count: 3 },
  { id: "silences", label: "Silences", icon: BellOff, count: 2 },
  { id: "oncall", label: "On-call", icon: CalendarClock },
  { id: "contacts", label: "Contact points", icon: Send, count: 5 },
  { id: "history", label: "History", icon: History },
];

const meta = {
  title: "Products/Alerts",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type RuleState = "firing" | "pending" | "ok" | "silenced";

const STATE: Record<RuleState, { label: string; tone: Tone }> = {
  firing: { label: "Firing", tone: "danger" },
  pending: { label: "Pending", tone: "warning" },
  ok: { label: "OK", tone: "success" },
  silenced: { label: "Silenced", tone: "neutral" },
};

interface Rule {
  id: string;
  state: RuleState;
  name: string;
  expr: string;
  source: ProductId;
  severity: Severity;
  route: string;
  since: string;
}

const named: Omit<Rule, "id">[] = [
  { state: "firing", name: "Host CPU above 85%", expr: "avg by (host) (rate(node_cpu_seconds_total{mode!=\"idle\"}[5m])) > 0.85", source: "metrics", severity: "high", route: "#ops-oncall → PagerDuty", since: "12 m" },
  { state: "firing", name: "orders-api p95 above SLO", expr: "histogram_quantile(0.95, sum by (le) (rate(http_request_duration_seconds_bucket{service=\"orders-api\"}[5m]))) > 2", source: "metrics", severity: "critical", route: "Payments → PagerDuty", since: "11 m" },
  { state: "firing", name: "Crypto miner detected", expr: "yara.rule:XMRig_* AND action:detected", source: "malware", severity: "critical", route: "Security → Telegram, PagerDuty", since: "9 m" },
  { state: "pending", name: "DB pool waiters", expr: "pgbouncer_pools_client_waiting_connections > 20 for 5m", source: "metrics", severity: "medium", route: "Payments → Slack", since: "3 m" },
  { state: "pending", name: "Error log rate 5× baseline", expr: "count_over_time({service=\"orders-api\", level=\"error\"}[5m]) > 5 * baseline_7d", source: "logs", severity: "medium", route: "#ops-oncall → Slack", since: "2 m" },
  { state: "silenced", name: "edge-fra-02 heartbeat missing", expr: "absent_over_time(up{host=\"edge-fra-02\"}[10m])", source: "infrastructure", severity: "high", route: "#ops-oncall → Slack", since: "silenced 2 h" },
  { state: "silenced", name: "Certificate expires < 14 d", expr: "x509_cert_not_after - time() < 14 * 86400", source: "vpn", severity: "low", route: "Platform → Email", since: "silenced 6 d" },
  { state: "ok", name: "SSH brute force", expr: "sigma: proc_creation_lnx_ssh_bruteforce (count > 20 by src_ip in 5m)", source: "siem", severity: "high", route: "Security → Telegram", since: "4 d" },
  { state: "ok", name: "Critical CVE on internet-facing host", expr: "cvss >= 9.0 AND asset.exposure = \"public\" AND epss > 0.2", source: "vulnerabilities", severity: "critical", route: "Security → Email", since: "12 d" },
  { state: "ok", name: "Secret pushed to repository", expr: "secret.verified = true AND repo.visibility != \"archived\"", source: "secrets", severity: "high", route: "Security → Slack", since: "21 d" },
  { state: "ok", name: "VPN failed sign-ins", expr: "sum by (src_ip) (vpn_auth_failures_total[15m]) >= 5", source: "vpn", severity: "medium", route: "Security → Slack", since: "1 d" },
  { state: "ok", name: "Disk will fill in 4 h", expr: "predict_linear(node_filesystem_avail_bytes[6h], 4 * 3600) < 0", source: "metrics", severity: "high", route: "#ops-oncall → PagerDuty", since: "9 d" },
  { state: "ok", name: "Container restart loop", expr: "increase(kube_pod_container_status_restarts_total[15m]) > 5", source: "infrastructure", severity: "medium", route: "#ops-oncall → Slack", since: "2 d" },
  { state: "ok", name: "Unexpected outbound to mining pool", expr: "runtime.event = \"connect\" AND dst.port IN (3333, 4444, 14444)", source: "runtime", severity: "critical", route: "Security → PagerDuty", since: "30 d" },
];

const fillerSources: ProductId[] = ["metrics", "logs", "infrastructure", "siem", "posture", "dast"];
const rules: Rule[] = [
  ...named,
  ...Array.from({ length: 64 - named.length }, (_, i) => ({
    state: "ok" as const,
    name: [`5xx ratio above 1% · ${["billing", "auth", "search", "catalog", "cart"][i % 5]}-svc`, `Queue lag > 10k · topic ${["orders", "invoices", "emails", "events"][i % 4]}`, `Posture drift · CIS ${["1.1.12", "4.2.1", "5.1.3"][i % 3]}`][i % 3]!,
    expr: ["sum(rate(http_requests_total{code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m])) > 0.01", "kafka_consumergroup_lag > 10000", "posture.control.status = \"fail\""][i % 3]!,
    source: fillerSources[i % fillerSources.length]!,
    severity: (["medium", "low", "high", "info"] as const)[i % 4]!,
    route: ["#ops-oncall → Slack", "Platform → Email", "Security → Webhook"][i % 3]!,
    since: `${3 + (i % 27)} d`,
  })),
].map((r, i) => ({ ...r, id: `r${i}` }));

const countOf = (s: RuleState) => rules.filter((r) => r.state === s).length;

const columns: Column<Rule>[] = [
  {
    id: "state",
    header: "State",
    width: "104px",
    sortValue: (r) => ["ok", "silenced", "pending", "firing"].indexOf(r.state),
    cell: (r) => <StatusBadge tone={STATE[r.state].tone}>{STATE[r.state].label}</StatusBadge>,
  },
  {
    id: "name",
    header: "Rule",
    width: "42%",
    sortValue: (r) => r.name,
    cell: (r) => (
      <span className="flex min-w-0 flex-col">
        <a href={`#rule/${r.id}`} className="truncate font-medium text-fg no-underline hover:underline">
          {r.name}
        </a>
        <code className="truncate font-mono text-2xs text-fg-muted">{r.expr}</code>
      </span>
    ),
  },
  {
    id: "source",
    header: "Source",
    sortValue: (r) => PRODUCTS[r.source].name,
    cell: (r) => {
      const P = PRODUCTS[r.source];
      return (
        <span className="inline-flex items-center gap-1.5 text-xs">
          <P.icon aria-hidden className="size-3.5 text-fg-muted" />
          {P.name}
        </span>
      );
    },
  },
  { id: "severity", header: "Severity", sortValue: (r) => ["info", "low", "medium", "high", "critical"].indexOf(r.severity), cell: (r) => <SeverityBadge severity={r.severity} /> },
  { id: "route", header: "Route", cell: (r) => <span className="text-xs text-fg-muted">{r.route}</span> },
  { id: "since", header: "For", align: "right", mono: true, cell: (r) => r.since },
];

const CONTACTS = [
  { id: "slack", name: "Slack", target: "#ops-oncall, #sec-alerts", icon: MessageSquare, tone: "success" as Tone, status: "Delivered", last: "1 m ago" },
  { id: "pd", name: "PagerDuty", target: "Payments · Security", icon: Phone, tone: "success" as Tone, status: "Delivered", last: "9 m ago" },
  { id: "tg", name: "Telegram", target: "SOC bot · 6 members", icon: Send, tone: "success" as Tone, status: "Delivered", last: "9 m ago" },
  { id: "mail", name: "Email", target: "platform@example.com", icon: Mail, tone: "neutral" as Tone, status: "Idle", last: "2 d ago" },
  { id: "hook", name: "Webhook", target: "https://hooks.example.com/oa", icon: Webhook, tone: "danger" as Tone, status: "Failing · 502", last: "3 retries" },
];

/* --------------------------------------------------------------- stories */

type TabValue = "all" | RuleState;

/** Rules: state KPIs, tabs that filter the rule list, on-call and contact points. */
export const Rules: Story = {
  render: () => {
    const [tab, setTab] = useState<TabValue>("all");
    const [sev, setSev] = useState<string[]>([]);
    const [q, setQ] = useState("");
    const shown = rules.filter(
      (r) => (tab === "all" || r.state === tab) && (sev.length === 0 || sev.includes(r.severity)) && r.name.toLowerCase().includes(q.trim().toLowerCase()),
    );
    return (
      <ProductFrame product="alerts" nav={nav} active="rules">
        <PageHeader
          title="Rules"
          description="64 rules from 9 products · evaluated every 30 s"
          actions={
            <>
              <SearchInput label="Search rules" className="w-56" value={q} onChange={(e) => setQ(e.target.value)} />
              <Button variant="primary" icon={<Plus />}>
                New rule
              </Button>
            </>
          }
        />
        <KpiGrid minWidth={160}>
          <KpiCard
            label="Firing"
            value={countOf("firing")}
            tone="danger"
            trend={wave(24, { base: 0.4, amp: 0.4, seed: 61, spike: 3, spikeAt: 20, spikeLen: 2 })}
            trendColor="var(--oa-danger)"
            footer={<StatusBadge tone="danger">2 critical</StatusBadge>}
          />
          <KpiCard label="Pending" value={countOf("pending")} tone="warning" footer={<StatusBadge tone="warning">fires in &lt; 5 m</StatusBadge>} />
          <KpiCard label="OK" value={countOf("ok")} footer={<StatusBadge tone="success">Healthy</StatusBadge>} />
          <KpiCard label="Silenced" value={countOf("silenced")} footer={<StatusBadge tone="neutral">until 18:00</StatusBadge>} />
          <KpiCard label="Notifications · 24 h" value="41" unit="7 pages" delta={{ label: "MTTA 3 m 12 s", intent: "good" }} />
        </KpiGrid>
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
          <Panel flush>
            <div className="flex flex-col gap-2 px-3 pt-2">
              <Tabs<TabValue>
                label="Rule state"
                value={tab}
                onChange={setTab}
                items={[
                  { value: "all", label: "All", count: rules.length },
                  { value: "firing", label: "Firing", count: countOf("firing") },
                  { value: "pending", label: "Pending", count: countOf("pending") },
                  { value: "ok", label: "OK", count: countOf("ok") },
                  { value: "silenced", label: "Silenced", count: countOf("silenced") },
                ]}
              />
              <FilterBar onClear={sev.length ? () => setSev([]) : undefined} className="pb-2">
                <FacetFilter
                  label="Severity"
                  selected={sev}
                  onChange={setSev}
                  options={(["critical", "high", "medium", "low", "info"] as const).map((s) => ({ value: s, label: <SeverityBadge severity={s} />, count: rules.filter((r) => r.severity === s).length }))}
                />
                <Badge>{shown.length} rules</Badge>
              </FilterBar>
            </div>
            <div className="border-t border-line">
              <DataTable
                label="Alert rules"
                columns={columns}
                rows={shown}
                getRowId={(r) => r.id}
                defaultSort={{ id: "state", direction: "desc" }}
                pageSize={12}
                minWidth={900}
              />
            </div>
          </Panel>
          <div className="flex flex-col gap-2.5">
            <Panel title="On-call now" actions={<Button size="xs" variant="ghost">Schedule</Button>}>
              <ul className="flex flex-col gap-2">
                {[
                  { who: PEOPLE[2], team: "Platform · primary", until: "until Mon 09:00" },
                  { who: PEOPLE[3], team: "Payments · primary", until: "until 18:00" },
                  { who: PEOPLE[4], team: "Security · primary", until: "until Tue 09:00" },
                  { who: PEOPLE[6], team: "Platform · secondary", until: "until Mon 09:00" },
                ].map((p) => (
                  <li key={p.team} className="flex items-center gap-2">
                    <Avatar name={p.who} size="sm" />
                    <span className="flex min-w-0 grow flex-col">
                      <span className="truncate text-sm font-medium">{p.who}</span>
                      <span className="truncate text-2xs text-fg-muted">{p.team}</span>
                    </span>
                    <span className="text-2xs whitespace-nowrap text-fg-muted">{p.until}</span>
                  </li>
                ))}
              </ul>
            </Panel>
            <Panel title="Contact points" flush>
              <ul aria-label="Contact points" className="flex flex-col">
                {CONTACTS.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                    <span className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
                      <c.icon aria-hidden className="size-3.5" />
                    </span>
                    <span className="flex min-w-0 grow flex-col">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="truncate font-mono text-2xs text-fg-muted">{c.target}</span>
                    </span>
                    <span className="flex flex-col items-end gap-0.5">
                      <StatusBadge tone={c.tone}>{c.status}</StatusBadge>
                      <span className="text-2xs text-fg-muted">{c.last}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Alert rules" });
    // Firing rules sort to the top.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Firing");

    await userEvent.click(c.getByRole("tab", { name: /Firing/ }));
    await expect(c.getByRole("tab", { name: /Firing/ })).toHaveAttribute("aria-selected", "true");
    const firing = within(table).getAllByRole("row").slice(1);
    await expect(firing).toHaveLength(3);
    for (const row of firing) await expect(row).toHaveTextContent("Firing");
    await expect(table).toHaveTextContent("Crypto miner detected");

    // Arrow keys move between tabs.
    await userEvent.keyboard("{ArrowRight}");
    await expect(c.getByRole("tab", { name: /Pending/ })).toHaveAttribute("aria-selected", "true");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);

    await userEvent.click(c.getByRole("tab", { name: /Silenced/ }));
    await expect(table).toHaveTextContent("edge-fra-02 heartbeat missing");

    await expect(c.getByRole("list", { name: "Contact points" })).toHaveTextContent("Failing · 502");
  },
};
