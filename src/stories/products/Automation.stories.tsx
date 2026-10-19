import { Fragment, useMemo, useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowLeft, BookOpen, CheckCheck, Clock, Filter, Globe, Hand, History, MessageSquare, Pencil, Play, Plus, UserCheck, Webhook, Zap, type LucideIcon } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { SearchInput, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { Avatar } from "../../components/Avatar";
import { Tabs } from "../../components/Tabs";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { cn } from "../../lib/cn";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, USER, timeLabels, wave } from "../mocks";

const nav = [
  { id: "playbooks", label: "Playbooks", icon: BookOpen, count: 14 },
  { id: "runs", label: "Runs", icon: History },
  { id: "triggers", label: "Triggers", icon: Zap },
  { id: "actions", label: "Actions", icon: Play },
  { id: "approvals", label: "Approvals", icon: CheckCheck, count: 2 },
];

const meta = {
  title: "Products/Automation",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Steps and flow of the main playbook                                 */
/* ------------------------------------------------------------------ */

type StepState = "success" | "waiting" | "failed" | "skipped";
const STATE: Record<StepState, { tone: Tone; label: string }> = {
  success: { tone: "success", label: "Success" },
  waiting: { tone: "warning", label: "Waiting" },
  failed: { tone: "danger", label: "Failed" },
  skipped: { tone: "neutral", label: "Skipped" },
};

interface Step {
  id: string;
  kind: "Trigger" | "Condition" | "Approval" | "Action" | "Notify";
  title: string;
  product?: ProductId;
  icon?: LucideIcon;
  state: StepState;
  duration: string;
  config: Array<[string, string]>;
}

const STEPS: Record<string, Step> = {
  trigger: {
    id: "trigger",
    kind: "Trigger",
    title: "SIEM signal, severity ≥ critical",
    product: "siem",
    state: "success",
    duration: "0.2 s",
    config: [
      ["Event", "siem.signal.created"],
      ["Filter", "severity >= critical"],
      ["Rule set", "Sigma · linux, kubernetes"],
      ["Debounce", "per host, 10 min"],
    ],
  },
  condition: {
    id: "condition",
    kind: "Condition",
    title: "Host tag env = prod",
    icon: Filter,
    state: "success",
    duration: "0.1 s",
    config: [
      ["Expression", 'signal.host.tags.env == "prod"'],
      ["Else", "Notify #sec-alerts and stop"],
    ],
  },
  approval: {
    id: "approval",
    kind: "Approval",
    title: "On-call approves containment",
    icon: UserCheck,
    state: "success",
    duration: "3 m 41 s",
    config: [
      ["Approvers", "Schedule: security-primary"],
      ["Timeout", "15 min, then auto-approve"],
      ["Channel", "Slack DM + mobile push"],
      ["Approved by", "Sarah Chen"],
    ],
  },
  isolate: {
    id: "isolate",
    kind: "Action",
    title: "Isolate host",
    product: "infrastructure",
    state: "success",
    duration: "8.4 s",
    config: [
      ["Action", "infrastructure.host.isolate"],
      ["Host", "{{ signal.host.name }}"],
      ["Allow", "Agent control channel, 10.0.0.0/8 → :22 from bastion"],
      ["Snapshot first", "yes"],
    ],
  },
  vpn: {
    id: "vpn",
    kind: "Action",
    title: "End VPN sessions for user",
    product: "vpn",
    state: "success",
    duration: "1.2 s",
    config: [
      ["Action", "vpn.sessions.terminate"],
      ["User", "{{ signal.user.email }}"],
      ["Block reconnect", "60 min"],
    ],
  },
  access: {
    id: "access",
    kind: "Action",
    title: "Revoke access grants",
    product: "access",
    state: "failed",
    duration: "30 s",
    config: [
      ["Action", "access.grants.revoke"],
      ["Scope", "all active grants for {{ signal.user.email }}"],
      ["Last error", "timeout after 30 s (access-api 504)"],
      ["Retry", "3 × exponential"],
    ],
  },
  incident: {
    id: "incident",
    kind: "Action",
    title: "Open incident",
    product: "incidents",
    state: "success",
    duration: "0.6 s",
    config: [
      ["Action", "incidents.create"],
      ["Severity", "SEV-1"],
      ["Commander", "on-call: security-primary"],
      ["Attach", "signal, isolation snapshot, run log"],
    ],
  },
  slack: {
    id: "slack",
    kind: "Notify",
    title: "Notify #sec-incidents",
    icon: MessageSquare,
    state: "waiting",
    duration: "–",
    config: [
      ["Integration", "Slack · acme.slack.com"],
      ["Channel", "#sec-incidents"],
      ["Message", "{{ incident.title }} · {{ incident.url }}"],
    ],
  },
};

const FLOW: string[][] = [["trigger"], ["condition"], ["approval"], ["isolate", "vpn", "access"], ["incident"], ["slack"]];

/* ------------------------------------------------------------------ */
/* Playbooks                                                           */
/* ------------------------------------------------------------------ */

interface PlaybookRow {
  id: string;
  name: string;
  trigger: string;
  triggerProduct: ProductId;
  actions: Array<{ product: ProductId; title: string; action: string }>;
  approval: boolean;
  enabled: boolean;
  runs: number;
  success: number;
  last: string;
  owner: string;
  version: number;
}

const PLAYBOOKS: PlaybookRow[] = [
  { id: "contain", name: "Contain compromised host", trigger: "SIEM signal ≥ critical", triggerProduct: "siem", actions: [], approval: true, enabled: true, runs: 41, success: 88, last: "Today 02:14", owner: PEOPLE[3], version: 7 },
  { id: "leaked-secret", name: "Rotate leaked secret", trigger: "Secret found in public repo", triggerProduct: "secrets", actions: [{ product: "secrets", title: "Revoke and rotate key", action: "secrets.rotate" }, { product: "incidents", title: "Open incident", action: "incidents.create" }], approval: false, enabled: true, runs: 6, success: 100, last: "Oct 17 16:04", owner: PEOPLE[1], version: 3 },
  { id: "vpn-brute", name: "Block VPN brute force", trigger: "5 failed VPN sign-ins in 5 min", triggerProduct: "vpn", actions: [{ product: "waf", title: "Block source IP for 24 h", action: "waf.ip.block" }, { product: "vpn", title: "Lock account", action: "vpn.user.suspend" }], approval: false, enabled: true, runs: 128, success: 99, last: "Today 11:02", owner: PEOPLE[1], version: 5 },
  { id: "malware-quarantine", name: "Quarantine malware and scan fleet", trigger: "Malware detection", triggerProduct: "malware", actions: [{ product: "malware", title: "Quarantine file", action: "malware.quarantine" }, { product: "endpoints", title: "Scan same-role hosts", action: "endpoints.scan" }], approval: false, enabled: true, runs: 9, success: 100, last: "Oct 14 09:12", owner: PEOPLE[7], version: 2 },
  { id: "cert-renew", name: "Renew certificate on failure", trigger: "ACME renewal failed twice", triggerProduct: "certificates", actions: [{ product: "certificates", title: "Retry with DNS-01", action: "certificates.renew" }, { product: "alerts", title: "Page platform on-call", action: "alerts.page" }], approval: false, enabled: true, runs: 3, success: 67, last: "Today 02:06", owner: PEOPLE[2], version: 1 },
  { id: "offboard", name: "Offboard leaver", trigger: "Identity: user disabled", triggerProduct: "identity", actions: [{ product: "vpn", title: "Revoke VPN profiles", action: "vpn.devices.revoke" }, { product: "access", title: "Remove all grants", action: "access.grants.revoke" }, { product: "secrets", title: "Rotate shared secrets they read", action: "secrets.rotate" }], approval: true, enabled: true, runs: 14, success: 93, last: "Oct 16 17:30", owner: PEOPLE[5], version: 4 },
  { id: "backup-fail", name: "Escalate failed backup", trigger: "Backup job failed twice", triggerProduct: "backups", actions: [{ product: "alerts", title: "Page storage on-call", action: "alerts.page" }], approval: false, enabled: true, runs: 2, success: 100, last: "Today 12:04", owner: PEOPLE[2], version: 1 },
  { id: "waf-tune", name: "Auto-tune WAF false positives", trigger: "Daily 03:00", triggerProduct: "waf", actions: [{ product: "waf", title: "Propose rule exclusions", action: "waf.rules.propose" }], approval: true, enabled: false, runs: 0, success: 0, last: "Never", owner: PEOPLE[6], version: 1 },
];

function stepsFor(p: PlaybookRow): { steps: Record<string, Step>; flow: string[][] } {
  if (p.id === "contain") return { steps: STEPS, flow: FLOW };
  const steps: Record<string, Step> = {
    trigger: { id: "trigger", kind: "Trigger", title: p.trigger, product: p.triggerProduct, state: "success", duration: "0.1 s", config: [["Event", `${p.triggerProduct}.event`], ["Filter", p.trigger]] },
  };
  const flow: string[][] = [["trigger"]];
  if (p.approval) {
    steps.approval = { id: "approval", kind: "Approval", title: "Owner approves", icon: UserCheck, state: "success", duration: "2 m 10 s", config: [["Approvers", p.owner], ["Timeout", "30 min, then deny"]] };
    flow.push(["approval"]);
  }
  p.actions.forEach((a, i) => {
    steps[`a${i}`] = { id: `a${i}`, kind: "Action", title: a.title, product: a.product, state: "success", duration: `${(1.2 + i).toFixed(1)} s`, config: [["Action", a.action]] };
    flow.push([`a${i}`]);
  });
  return { steps, flow };
}

function StepCard({ step, selected, onSelect }: { step: Step; selected: boolean; onSelect: () => void }) {
  const Icon = step.product ? PRODUCTS[step.product].icon : (step.icon ?? Zap);
  const source = step.product ? PRODUCTS[step.product].name : step.kind;
  const s = STATE[step.state];
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={cn("flex w-full min-w-0 flex-col gap-1.5 rounded-lg border bg-surface px-3 py-2 text-left hover:border-line-strong", selected ? "border-accent ring-2 ring-accent/30" : "border-line")}
    >
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
          <Icon className="size-3.5" />
        </span>
        <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">
          {step.kind} · {source}
        </span>
      </span>
      <span className="truncate text-sm font-medium text-fg">{step.title}</span>
      <span className="flex items-center justify-between gap-2">
        <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
        <span className="font-mono text-2xs text-fg-muted">{step.duration}</span>
      </span>
    </button>
  );
}

function Connector({ fork }: { fork?: "out" | "in" }) {
  return (
    <div aria-hidden className="relative flex h-5 justify-center">
      <span className="w-px bg-line-strong" />
      {fork && <span className={cn("absolute right-[16.66%] left-[16.66%] h-px bg-line-strong", fork === "out" ? "bottom-0" : "top-0")} />}
    </div>
  );
}

interface Run {
  id: string;
  playbook: string;
  started: string;
  host: string;
  user: string;
  state: StepState;
  steps: string;
  duration: string;
}

const RUNS: Run[] = [
  { id: "run-4812", playbook: "contain", started: "Today 02:14", host: "api-prod-03", user: PEOPLE[4], state: "failed", steps: "6 of 8", duration: "4 m 22 s" },
  { id: "run-4809", playbook: "backup-fail", started: "Today 12:04", host: "db-prod-01", user: PEOPLE[2], state: "success", steps: "2 of 2", duration: "1.4 s" },
  { id: "run-4806", playbook: "vpn-brute", started: "Today 11:02", host: "edge-fra-02", user: PEOPLE[4], state: "success", steps: "3 of 3", duration: "2.1 s" },
  { id: "run-4801", playbook: "cert-renew", started: "Today 02:06", host: "api-prod-01", user: PEOPLE[2], state: "waiting", steps: "2 of 3", duration: "–" },
  { id: "run-4790", playbook: "contain", started: "Oct 17 21:03", host: "worker-prod-09", user: PEOPLE[6], state: "success", steps: "8 of 8", duration: "2 m 05 s" },
  { id: "run-4788", playbook: "leaked-secret", started: "Oct 17 16:04", host: "api-prod-05", user: PEOPLE[1], state: "success", steps: "3 of 3", duration: "12.8 s" },
  { id: "run-4781", playbook: "offboard", started: "Oct 16 17:30", host: "db-prod-02", user: PEOPLE[5], state: "success", steps: "5 of 5", duration: "4 m 51 s" },
  { id: "run-4771", playbook: "contain", started: "Oct 15 11:47", host: "db-prod-02", user: PEOPLE[2], state: "success", steps: "8 of 8", duration: "6 m 50 s" },
  { id: "run-4766", playbook: "contain", started: "Oct 15 09:30", host: "edge-fra-02", user: PEOPLE[7], state: "skipped", steps: "2 of 8", duration: "0.3 s" },
  { id: "run-4753", playbook: "malware-quarantine", started: "Oct 14 09:12", host: "worker-prod-04", user: PEOPLE[0], state: "success", steps: "3 of 3", duration: "1 m 12 s" },
  { id: "run-4702", playbook: "contain", started: "Oct 11 16:22", host: "api-prod-05", user: PEOPLE[0], state: "success", steps: "8 of 8", duration: "1 m 48 s" },
];

const pbName = (id: string) => PLAYBOOKS.find((p) => p.id === id)?.name ?? id;

const runColumns: Column<Run>[] = [
  { id: "id", header: "Run", mono: true, cell: (r) => r.id },
  { id: "started", header: "Started", sortValue: (r) => r.started, cell: (r) => <span className="whitespace-nowrap">{r.started}</span> },
  { id: "host", header: "Host", cell: (r) => <EntityChip kind="host" value={r.host} hideKind href={`#infrastructure/${r.host}`} /> },
  {
    id: "user",
    header: "User",
    cell: (r) => (
      <span className="flex items-center gap-2">
        <Avatar name={r.user} size="sm" />
        <span className="truncate">{r.user}</span>
      </span>
    ),
  },
  { id: "state", header: "Result", cell: (r) => <StatusBadge tone={STATE[r.state].tone}>{STATE[r.state].label}</StatusBadge> },
  { id: "steps", header: "Steps", align: "right", mono: true, cell: (r) => r.steps },
  { id: "duration", header: "Duration", align: "right", mono: true, cell: (r) => r.duration },
];

function PlaybookEditor({ playbook, onBack }: { playbook: PlaybookRow; onBack: () => void }) {
  const { steps, flow } = stepsFor(playbook);
  const [selected, setSelected] = useState(playbook.id === "contain" ? "access" : "trigger");
  const [tested, setTested] = useState(false);
  const step = steps[selected]!;
  const pbRuns = RUNS.filter((r) => r.playbook === playbook.id);
  return (
    <>
      <PageHeader
        title={playbook.name}
        breadcrumbs={[{ label: "Playbooks", href: "#playbooks" }, { label: playbook.name }]}
        description={`Last run ${playbook.last} · ${playbook.runs} runs in 90 days · owner ${playbook.owner}`}
        meta={
          <>
            <StatusBadge tone={playbook.enabled ? "success" : "neutral"}>{playbook.enabled ? "Enabled" : "Disabled"}</StatusBadge>
            <Badge mono>v{playbook.version}</Badge>
          </>
        }
        actions={
          <>
            <Button variant="ghost" icon={<ArrowLeft />} onClick={onBack}>
              All playbooks
            </Button>
            <Button icon={<Pencil />}>Edit</Button>
            <Button variant="primary" icon={<Play />} onClick={() => setTested(true)}>
              Test run
            </Button>
          </>
        }
      />
      {tested && <Callout tone="info" title="Test run started in dry-run mode" onDismiss={() => setTested(false)}>Actions are simulated; nothing is changed on hosts or accounts.</Callout>}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Flow" description={playbook.id === "contain" ? "Last run · run-4812 · 1 step failed, 1 waiting" : "Last run · all steps succeeded"}>
          <ol aria-label="Playbook steps" className="mx-auto flex max-w-3xl flex-col py-2">
            {flow.map((row, i) => {
              const parallel = row.length > 1;
              return (
                <li key={i}>
                  {i > 0 && <Connector fork={parallel ? "out" : flow[i - 1]!.length > 1 ? "in" : undefined} />}
                  {parallel && <span className="sr-only">In parallel:</span>}
                  <div className={cn("grid gap-2.5", parallel ? "grid-cols-3" : "mx-auto w-full max-w-xs grid-cols-1")}>
                    {row.map((id) => (
                      <StepCard key={id} step={steps[id]!} selected={selected === id} onSelect={() => setSelected(id)} />
                    ))}
                  </div>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel
          aria-label={`Step config: ${step.title}`}
          title={`Step config: ${step.title}`}
          description={`${step.kind}${step.product ? ` · ${PRODUCTS[step.product].name}` : ""}`}
          actions={<StatusBadge tone={STATE[step.state].tone}>{STATE[step.state].label}</StatusBadge>}
          footer={`Last run took ${step.duration}`}
        >
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-sm">
            {step.config.map(([k, v]) => (
              <Fragment key={k}>
                <dt className="text-fg-muted">{k}</dt>
                <dd className="font-mono text-xs break-words">{v}</dd>
              </Fragment>
            ))}
          </dl>
        </Panel>
      </div>
      <Panel title="Runs" description="Last 90 days" flush>
        <DataTable label="Playbook runs" columns={runColumns} rows={pbRuns} getRowId={(r) => r.id} minWidth={820} />
      </Panel>
    </>
  );
}

function PlaybooksPage({ initialOpen }: { initialOpen?: string }) {
  const [openId, setOpenId] = useState(initialOpen);
  const [rows, setRows] = useState(PLAYBOOKS);
  const [q, setQ] = useState("");
  const open = rows.find((p) => p.id === openId);
  if (open) return <PlaybookEditor key={open.id} playbook={open} onBack={() => setOpenId(undefined)} />;
  const shown = rows.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const cols: Column<PlaybookRow>[] = [
    {
      id: "name",
      header: "Playbook",
      pinned: "left",
      width: "28%",
      sortValue: (p) => p.name,
      cell: (p) => (
        <button type="button" onClick={() => setOpenId(p.id)} className="truncate text-left font-medium text-fg hover:underline">
          {p.name}
        </button>
      ),
    },
    {
      id: "trigger",
      header: "Trigger",
      cell: (p) => {
        const P = PRODUCTS[p.triggerProduct];
        return (
          <span className="flex min-w-0 items-center gap-1.5 text-xs">
            <P.icon aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
            <span className="truncate">{p.trigger}</span>
          </span>
        );
      },
    },
    { id: "approval", header: "Approval", description: "Whether a human must approve before actions run.", cell: (p) => (p.approval ? <Badge tone="info">Required</Badge> : <span className="text-xs text-fg-muted">No</span>) },
    { id: "runs", header: "Runs · 90 d", align: "right", mono: true, sortValue: (p) => p.runs, cell: (p) => p.runs },
    { id: "success", header: "Success", align: "right", sortValue: (p) => p.success, cell: (p) => (p.runs ? <span className={cn("font-mono text-xs", p.success < 90 && "text-warning-text")}>{p.success}%</span> : <span className="text-xs text-fg-muted">–</span>) },
    { id: "last", header: "Last run", cell: (p) => <span className="text-xs whitespace-nowrap text-fg-muted">{p.last}</span> },
    {
      id: "owner",
      header: "Owner",
      cell: (p) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={p.owner} size="sm" />
          <span className="truncate text-xs">{p.owner}</span>
        </span>
      ),
    },
    {
      id: "enabled",
      header: "Enabled",
      width: "90px",
      hideable: false,
      cell: (p) => (
        <Switch checked={p.enabled} onCheckedChange={(v) => setRows((rs) => rs.map((r) => (r.id === p.id ? { ...r, enabled: v } : r)))} label={<span className="sr-only">Enable {p.name}</span>} />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Playbooks"
        description="Visual flows that connect products: when something happens in one, act in the others."
        actions={
          <>
            <SearchInput label="Search playbooks" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
            <Button variant="primary" icon={<Plus />}>
              New playbook
            </Button>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Runs · 24 h" value="37" trend={wave(24, { base: 2, amp: 1.5, seed: 81 })} />
        <KpiCard label="Success · 30 d" value="96%" tone="success" delta={{ label: "+2 pts", direction: "up", intent: "good" }} />
        <KpiCard label="Time saved · 30 d" value="31" unit="h" delta={{ label: "vs. manual runbooks" }} />
        <KpiCard label="Failing step" value="1" unit="access.grants.revoke" tone="danger" delta={{ label: "access-api 504", intent: "bad" }} />
      </KpiGrid>
      <Panel title="Playbooks" description={`${shown.length} of 14 · click a name to open the flow`} flush>
        <DataTable label="Playbooks" columns={cols} rows={shown} getRowId={(p) => p.id} minWidth={1000} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Runs                                                                */
/* ------------------------------------------------------------------ */

function runSteps(r: Run): Array<{ id: string; title: string; product?: ProductId; state: StepState; duration: string; output: string }> {
  if (r.id === "run-4812")
    return [
      { id: "1", title: STEPS.trigger!.title, product: "siem", state: "success", duration: "0.2 s", output: "signal sig-88213 · host api-prod-03" },
      { id: "2", title: STEPS.condition!.title, state: "success", duration: "0.1 s", output: "env=prod → true" },
      { id: "3", title: STEPS.approval!.title, state: "success", duration: "3 m 41 s", output: "Approved by Sarah Chen via Slack" },
      { id: "4", title: "Isolate host", product: "infrastructure", state: "success", duration: "8.4 s", output: "nftables policy oa-isolate applied · snapshot snap-71c2" },
      { id: "5", title: "End VPN sessions for user", product: "vpn", state: "success", duration: "1.2 s", output: "2 sessions ended for ben.ortiz@example.com" },
      { id: "6", title: "Revoke access grants", product: "access", state: "failed", duration: "30 s", output: "POST /v1/grants/revoke → 504 Gateway Timeout after 3 retries" },
      { id: "7", title: "Open incident", product: "incidents", state: "success", duration: "0.6 s", output: "INC-214 created · SEV-1" },
      { id: "8", title: "Notify #sec-incidents", state: "waiting", duration: "–", output: "Waiting for step 6 to finish or be skipped" },
    ];
  const pb = PLAYBOOKS.find((p) => p.id === r.playbook)!;
  const { steps, flow } = stepsFor(pb);
  return flow.flat().map((id, i) => {
    const s = steps[id]!;
    const state: StepState = r.state === "skipped" && i > 1 ? "skipped" : r.state === "waiting" && i === flow.flat().length - 1 ? "waiting" : "success";
    return { id: String(i + 1), title: s.title, product: s.product, state, duration: state === "success" ? s.duration : "–", output: state === "success" ? "ok" : state === "skipped" ? "Condition false, not run" : "Waiting for approval" };
  });
}

function RunsPage() {
  const [results, setResults] = useState<string[]>([]);
  const [books, setBooks] = useState<string[]>([]);
  const [active, setActive] = useState("run-4812");
  const [retried, setRetried] = useState(false);
  const rows = RUNS.filter((r) => (results.length === 0 || results.includes(STATE[r.state].label)) && (books.length === 0 || books.includes(pbName(r.playbook))));
  const run = RUNS.find((r) => r.id === active)!;
  const cols: Column<Run>[] = [
    { id: "id", header: "Run", mono: true, width: "96px", cell: (r) => r.id },
    { id: "playbook", header: "Playbook", sortValue: (r) => pbName(r.playbook), cell: (r) => <span className="font-medium">{pbName(r.playbook)}</span> },
    ...runColumns.filter((c) => c.id !== "id" && c.id !== "user"),
  ];
  return (
    <>
      <PageHeader title="Runs" description="Every playbook execution with the result of each step. Runs are kept for 400 days for audit." />
      <FilterBar onClear={results.length || books.length ? () => (setResults([]), setBooks([])) : undefined}>
        <FacetFilter label="Result" selected={results} onChange={setResults} options={["Success", "Failed", "Waiting", "Skipped"].map((v) => ({ value: v, count: RUNS.filter((r) => STATE[r.state].label === v).length }))} />
        <FacetFilter label="Playbook" selected={books} onChange={setBooks} options={Array.from(new Set(RUNS.map((r) => pbName(r.playbook)))).map((v) => ({ value: v }))} />
      </FilterBar>
      <Panel title="Runs per hour" description="Last 24 hours, by result">
        <TimeSeriesChart
          label="Playbook runs per hour by result"
          labels={timeLabels(24, 60)}
          height={140}
          stacked
          series={[
            { id: "ok", name: "Success", data: wave(24, { base: 1.4, amp: 1, seed: 91 }).map(Math.round), color: "var(--oa-success)" },
            { id: "fail", name: "Failed", data: Array.from({ length: 24 }, (_, i) => (i === 12 ? 1 : 0)), color: "var(--oa-danger)" },
          ]}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Runs" description={`${rows.length} shown`} flush>
          <DataTable label="All runs" columns={cols} rows={rows} getRowId={(r) => r.id} onRowClick={(r) => (setActive(r.id), setRetried(false))} activeRowId={active} minWidth={860} />
        </Panel>
        <Panel
          aria-label="Run detail"
          title={<span className="font-mono">{run.id}</span>}
          description={`${pbName(run.playbook)} · ${run.started} · ${run.duration}`}
          actions={<StatusBadge tone={STATE[run.state].tone}>{STATE[run.state].label}</StatusBadge>}
          footer={
            run.state === "failed" ? (
              <span className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="primary" onClick={() => setRetried(true)}>
                  Retry failed step
                </Button>
                <Button size="sm">Skip and continue</Button>
                {retried && (
                  <span role="status" className="text-xs text-success">
                    Retrying step 6
                  </span>
                )}
              </span>
            ) : undefined
          }
        >
          <ol aria-label="Step results" className="flex flex-col">
            {runSteps(run).map((s) => (
              <li key={s.id} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-start gap-2 border-b border-subtle py-1.5 last:border-0">
                <span className="font-mono text-2xs text-fg-muted">{s.id}</span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm">
                    {s.product && <span className="text-fg-muted">{PRODUCTS[s.product].name} · </span>}
                    {s.title}
                  </span>
                  <span className={cn("font-mono text-2xs break-words", s.state === "failed" ? "text-danger-text" : "text-fg-muted")}>{s.output}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  <StatusBadge tone={STATE[s.state].tone}>{STATE[s.state].label}</StatusBadge>
                  <span className="font-mono text-2xs text-fg-muted">{s.duration}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Triggers                                                            */
/* ------------------------------------------------------------------ */

interface Trigger {
  id: string;
  kind: "Event" | "Schedule" | "Webhook" | "Manual";
  source?: ProductId;
  expr: string;
  playbooks: string[];
  fired: number;
  last: string;
  enabled: boolean;
}

const TRIGGERS: Trigger[] = [
  { id: "tr1", kind: "Event", source: "siem", expr: "siem.signal.created where severity >= critical", playbooks: ["contain"], fired: 41, last: "Today 02:14", enabled: true },
  { id: "tr2", kind: "Event", source: "vpn", expr: "vpn.auth.failed count >= 5 within 5m by source.ip", playbooks: ["vpn-brute"], fired: 128, last: "Today 11:02", enabled: true },
  { id: "tr3", kind: "Event", source: "secrets", expr: "secrets.finding.created where location.public == true", playbooks: ["leaked-secret"], fired: 6, last: "Oct 17 16:04", enabled: true },
  { id: "tr4", kind: "Event", source: "malware", expr: "malware.detection.created", playbooks: ["malware-quarantine"], fired: 9, last: "Oct 14 09:12", enabled: true },
  { id: "tr5", kind: "Event", source: "identity", expr: "identity.user.disabled", playbooks: ["offboard"], fired: 14, last: "Oct 16 17:30", enabled: true },
  { id: "tr6", kind: "Event", source: "backups", expr: "backups.job.failed count >= 2 by job.id", playbooks: ["backup-fail"], fired: 2, last: "Today 12:04", enabled: true },
  { id: "tr7", kind: "Schedule", expr: "0 3 * * * (Europe/Dublin)", playbooks: ["waf-tune"], fired: 0, last: "Never", enabled: false },
  { id: "tr8", kind: "Webhook", expr: "POST https://automation.example.com/hooks/7f2c…", playbooks: ["cert-renew"], fired: 3, last: "Today 02:06", enabled: true },
  { id: "tr9", kind: "Manual", expr: "Run from an incident or the Assistant", playbooks: ["contain", "offboard"], fired: 4, last: "Oct 12 22:15", enabled: true },
];

const KIND_ICON: Record<Trigger["kind"], LucideIcon> = { Event: Zap, Schedule: Clock, Webhook: Webhook, Manual: Hand };

function TriggersPage() {
  const [rows, setRows] = useState(TRIGGERS);
  const [kind, setKind] = useState<"all" | Trigger["kind"]>("all");
  const [active, setActive] = useState("tr2");
  const [sample, setSample] = useState('{ "source.ip": "203.0.113.9", "user": "ben.ortiz", "failures": 6 }');
  const [tested, setTested] = useState<boolean | null>(null);
  const t = rows.find((x) => x.id === active)!;
  const shown = rows.filter((x) => kind === "all" || x.kind === kind);
  const cols: Column<Trigger>[] = [
    {
      id: "kind",
      header: "Type",
      width: "120px",
      sortValue: (x) => x.kind,
      cell: (x) => {
        const I = x.source ? PRODUCTS[x.source].icon : KIND_ICON[x.kind];
        return (
          <span className="flex items-center gap-1.5 text-xs">
            <I aria-hidden className="size-3.5 text-fg-muted" />
            {x.source ? PRODUCTS[x.source].name : x.kind}
          </span>
        );
      },
    },
    { id: "expr", header: "Condition", cell: (x) => <span className="font-mono text-xs break-words">{x.expr}</span> },
    { id: "pb", header: "Starts", cell: (x) => <span className="text-xs">{x.playbooks.map(pbName).join(", ")}</span> },
    { id: "fired", header: "Fired · 90 d", align: "right", mono: true, sortValue: (x) => x.fired, cell: (x) => x.fired },
    { id: "last", header: "Last fired", cell: (x) => <span className="text-xs whitespace-nowrap text-fg-muted">{x.last}</span> },
    {
      id: "on",
      header: "On",
      width: "70px",
      hideable: false,
      cell: (x) => <Switch checked={x.enabled} onCheckedChange={(v) => setRows((rs) => rs.map((r) => (r.id === x.id ? { ...r, enabled: v } : r)))} label={<span className="sr-only">Enable trigger {x.id}</span>} />,
    },
  ];
  return (
    <>
      <PageHeader
        title="Triggers"
        description="What starts a playbook: product events, schedules, signed webhooks or a person."
        actions={<Button variant="primary" icon={<Plus />}>New trigger</Button>}
      >
        <Tabs
          label="Trigger type"
          value={kind}
          onChange={setKind}
          items={[
            { value: "all", label: "All", count: rows.length },
            { value: "Event", label: "Events", count: rows.filter((x) => x.kind === "Event").length },
            { value: "Schedule", label: "Schedules", count: rows.filter((x) => x.kind === "Schedule").length },
            { value: "Webhook", label: "Webhooks", count: rows.filter((x) => x.kind === "Webhook").length },
            { value: "Manual", label: "Manual", count: rows.filter((x) => x.kind === "Manual").length },
          ]}
        />
      </PageHeader>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Triggers" flush>
          <DataTable label="Triggers" columns={cols} rows={shown} getRowId={(x) => x.id} onRowClick={(x) => (setActive(x.id), setTested(null))} activeRowId={active} minWidth={860} />
        </Panel>
        <Panel aria-label="Test trigger" title="Test with a sample event" description={t.expr}>
          <form
            className="flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setTested(/failures"\s*:\s*([5-9]|\d{2,})/.test(sample) || t.id !== "tr2");
            }}
          >
            <TextField label="Sample event (JSON)" mono value={sample} onChange={(e) => (setSample(e.target.value), setTested(null))} />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" size="sm" variant="primary">
                Evaluate
              </Button>
              {tested !== null && (
                <span role="status" className={cn("text-xs", tested ? "text-success" : "text-fg-muted")}>
                  {tested ? `Matches · would start ${t.playbooks.map(pbName).join(", ")}` : "No match · nothing would run"}
                </span>
              )}
            </div>
          </form>
          <dl className="mt-3 grid grid-cols-[96px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 border-t border-line pt-2.5 text-sm">
            <dt className="text-fg-muted">Debounce</dt>
            <dd>10 min per key</dd>
            <dt className="text-fg-muted">Concurrency</dt>
            <dd>1 run per host at a time</dd>
            <dt className="text-fg-muted">Webhook auth</dt>
            <dd>HMAC-SHA256 header X-OpenAsy-Signature</dd>
          </dl>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

interface ActionDef {
  id: string;
  product: ProductId;
  title: string;
  desc: string;
  risk: "Low" | "Medium" | "High";
  inputs: string[];
  used: number;
}

const ACTIONS: ActionDef[] = [
  { id: "infrastructure.host.isolate", product: "infrastructure", title: "Isolate host", desc: "Drop all traffic except the agent channel and bastion SSH.", risk: "High", inputs: ["host", "allow_cidrs", "snapshot_first"], used: 3 },
  { id: "infrastructure.container.stop", product: "infrastructure", title: "Stop container", desc: "Stop and keep the container for forensics.", risk: "Medium", inputs: ["host", "container_id"], used: 1 },
  { id: "vpn.sessions.terminate", product: "vpn", title: "End VPN sessions", desc: "Disconnect every session of a user and block reconnects.", risk: "Medium", inputs: ["user", "block_minutes"], used: 2 },
  { id: "vpn.user.suspend", product: "vpn", title: "Suspend VPN user", desc: "Suspend until an admin reactivates.", risk: "Medium", inputs: ["user"], used: 1 },
  { id: "access.grants.revoke", product: "access", title: "Revoke access grants", desc: "Remove all just-in-time grants for a user.", risk: "High", inputs: ["user", "scope"], used: 2 },
  { id: "secrets.rotate", product: "secrets", title: "Rotate secret", desc: "Issue a new value, update consumers and revoke the old one.", risk: "High", inputs: ["secret_path", "consumers"], used: 2 },
  { id: "waf.ip.block", product: "waf", title: "Block IP", desc: "Add an address or CIDR to the WAF deny list for a time.", risk: "Low", inputs: ["cidr", "ttl"], used: 1 },
  { id: "malware.quarantine", product: "malware", title: "Quarantine file", desc: "Move a file to the vault and keep a hash.", risk: "Low", inputs: ["host", "path"], used: 1 },
  { id: "endpoints.scan", product: "endpoints", title: "Scan endpoints", desc: "Run an on-demand scan on a group of hosts.", risk: "Low", inputs: ["selector"], used: 1 },
  { id: "incidents.create", product: "incidents", title: "Open incident", desc: "Create an incident with severity, commander and evidence.", risk: "Low", inputs: ["title", "severity", "commander", "attach"], used: 2 },
  { id: "alerts.page", product: "alerts", title: "Page on-call", desc: "Page a schedule through the configured channel.", risk: "Low", inputs: ["schedule", "message"], used: 2 },
  { id: "certificates.renew", product: "certificates", title: "Renew certificate", desc: "Start an ACME order now with a chosen challenge type.", risk: "Low", inputs: ["certificate", "challenge"], used: 1 },
  { id: "backups.run", product: "backups", title: "Run backup job", desc: "Start a job outside its schedule.", risk: "Low", inputs: ["job"], used: 0 },
];

const RISK_TONE = { Low: "neutral", Medium: "warning", High: "danger" } as const;

function ActionsPage() {
  const [products, setProducts] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const shown = useMemo(() => ACTIONS.filter((a) => (products.length === 0 || products.includes(PRODUCTS[a.product].name)) && (a.title + a.id).toLowerCase().includes(q.toLowerCase())), [products, q]);
  const groups = Array.from(new Set(shown.map((a) => a.product)));
  return (
    <>
      <PageHeader title="Actions" description="Everything a playbook can do, grouped by product. High-risk actions always need an approval step." />
      <FilterBar onClear={products.length || q ? () => (setProducts([]), setQ("")) : undefined}>
        <SearchInput label="Search actions" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <FacetFilter label="Product" selected={products} onChange={setProducts} options={Array.from(new Set(ACTIONS.map((a) => PRODUCTS[a.product].name))).map((v) => ({ value: v, count: ACTIONS.filter((a) => PRODUCTS[a.product].name === v).length }))} />
      </FilterBar>
      <p className="text-xs text-fg-muted" aria-live="polite">
        {shown.length} actions from {groups.length} products
      </p>
      <div className="flex flex-col gap-2.5">
        {groups.map((g) => {
          const P = PRODUCTS[g];
          return (
            <Panel key={g} aria-label={`${P.name} actions`} title={<span className="inline-flex items-center gap-1.5"><P.icon aria-hidden className="size-4 text-fg-muted" />{P.name}</span>} description={P.summary}>
              <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {shown
                  .filter((a) => a.product === g)
                  .map((a) => (
                    <li key={a.id} className="flex min-w-0 flex-col gap-1 rounded-md border border-line bg-canvas p-2.5">
                      <span className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{a.title}</span>
                        <Badge tone={RISK_TONE[a.risk]}>{a.risk} risk</Badge>
                      </span>
                      <span className="truncate font-mono text-2xs text-fg-muted">{a.id}</span>
                      <span className="text-xs text-fg-muted">{a.desc}</span>
                      <span className="mt-1 flex flex-wrap gap-1">
                        {a.inputs.map((i) => (
                          <Badge key={i} variant="outline" mono>
                            {i}
                          </Badge>
                        ))}
                      </span>
                      <span className="text-2xs text-fg-muted">Used in {a.used} playbook{a.used === 1 ? "" : "s"}</span>
                    </li>
                  ))}
              </ul>
            </Panel>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Approvals                                                           */
/* ------------------------------------------------------------------ */

interface Approval {
  id: string;
  playbook: string;
  run: string;
  action: string;
  product: ProductId;
  target: string;
  reason: string;
  requested: string;
  expires: string;
  decision?: "Approved" | "Denied";
  by?: string;
}

const APPROVALS: Approval[] = [
  { id: "ap1", playbook: "contain", run: "run-4820", action: "Isolate host", product: "infrastructure", target: "api-prod-05", reason: "SIEM signal: reverse shell to 198.51.100.7:4444 (score 92)", requested: "14:02", expires: "in 11 min" },
  { id: "ap2", playbook: "offboard", run: "run-4819", action: "Remove all grants and rotate 4 shared secrets", product: "access", target: "chris.shaw@example.com", reason: "Identity: user disabled by HR sync", requested: "13:40", expires: "in 19 min" },
];

const HISTORY: Approval[] = [
  { id: "h1", playbook: "contain", run: "run-4812", action: "Isolate host", product: "infrastructure", target: "api-prod-03", reason: "Crypto miner signal", requested: "02:10", expires: "", decision: "Approved", by: PEOPLE[3] },
  { id: "h2", playbook: "waf-tune", run: "run-4794", action: "Apply 3 WAF rule exclusions", product: "waf", target: "shop.example.com", reason: "Scheduled tuning", requested: "Oct 18 03:00", expires: "", decision: "Denied", by: PEOPLE[6] },
  { id: "h3", playbook: "offboard", run: "run-4781", action: "Remove all grants", product: "access", target: "liam.turner@example.com", reason: "Contract ended", requested: "Oct 16 17:30", expires: "", decision: "Approved", by: PEOPLE[5] },
];

function ApprovalsPage() {
  const [pending, setPending] = useState(APPROVALS);
  const [history, setHistory] = useState(HISTORY);
  const decide = (a: Approval, d: "Approved" | "Denied") => {
    setPending((p) => p.filter((x) => x.id !== a.id));
    setHistory((h) => [{ ...a, decision: d, by: USER.name, requested: a.requested }, ...h]);
  };
  return (
    <>
      <PageHeader title="Approvals" description="Steps waiting for a person. Each approval is logged with who decided and why." meta={<Badge tone={pending.length ? "warning" : "success"}>{pending.length} pending</Badge>} />
      {pending.length === 0 && <Callout tone="success" title="Nothing waiting for you" />}
      <ul aria-label="Pending approvals" className="grid gap-2.5 xl:grid-cols-2">
        {pending.map((a) => {
          const P = PRODUCTS[a.product];
          return (
            <li key={a.id} className="flex min-w-0 flex-col gap-2 rounded-lg border border-warning bg-surface p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">
                    {pbName(a.playbook)} · {a.run}
                  </span>
                  <span className="text-sm font-semibold">{a.action}</span>
                </span>
                <Badge tone="warning">Expires {a.expires}</Badge>
              </div>
              <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2.5 gap-y-1 text-sm">
                <dt className="text-fg-muted">Product</dt>
                <dd className="flex items-center gap-1.5">
                  <P.icon aria-hidden className="size-3.5 text-fg-muted" />
                  {P.name}
                </dd>
                <dt className="text-fg-muted">Target</dt>
                <dd className="font-mono text-xs">{a.target}</dd>
                <dt className="text-fg-muted">Why</dt>
                <dd>{a.reason}</dd>
                <dt className="text-fg-muted">Requested</dt>
                <dd>{a.requested} · approvers: security-primary</dd>
              </dl>
              <div className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="primary" aria-label={`Approve ${a.action} on ${a.target}`} onClick={() => decide(a, "Approved")}>
                  Approve
                </Button>
                <Button size="sm" variant="danger" aria-label={`Deny ${a.action} on ${a.target}`} onClick={() => decide(a, "Denied")}>
                  Deny
                </Button>
                <Button size="sm" variant="ghost">
                  Open run
                </Button>
              </div>
            </li>
          );
        })}
      </ul>
      <Panel title="Decisions" description="Last 30 days" flush>
        <DataTable
          label="Approval decisions"
          rows={history}
          getRowId={(a) => a.id}
          minWidth={820}
          columns={[
            { id: "when", header: "Requested", cell: (a) => <span className="text-xs whitespace-nowrap">{a.requested}</span> },
            { id: "action", header: "Action", cell: (a) => <span className="font-medium">{a.action}</span> },
            { id: "target", header: "Target", cell: (a) => <span className="font-mono text-xs">{a.target}</span> },
            { id: "pb", header: "Playbook", cell: (a) => <span className="text-xs">{pbName(a.playbook)}</span> },
            { id: "decision", header: "Decision", cell: (a) => <StatusBadge tone={a.decision === "Approved" ? "success" : "danger"}>{a.decision}</StatusBadge> },
            {
              id: "by",
              header: "By",
              cell: (a) => (
                <span className="flex items-center gap-1.5">
                  <Avatar name={a.by!} size="sm" />
                  <span className="truncate text-xs">{a.by}</span>
                </span>
              ),
            },
          ]}
        />
      </Panel>
      <Panel title="Approval rules">
        <ul className="grid gap-2 text-sm md:grid-cols-3">
          {[
            { k: "High-risk actions", v: "Always need one approver from security-primary" },
            { k: "Timeout", v: "Deny after 30 min unless the playbook sets auto-approve" },
            { k: "Four eyes", v: "The person who triggered a run cannot approve it" },
          ].map((r) => (
            <li key={r.k} className="flex flex-col rounded-md border border-line bg-canvas px-2.5 py-1.5">
              <span className="text-xs font-medium">{r.k}</span>
              <span className="text-xs text-fg-muted">{r.v}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2 text-xs text-fg-muted">
          <Globe aria-hidden className="mr-1 inline size-3" />
          Approvers can also decide from Slack and the mobile app.
        </p>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App and stories                                                     */
/* ------------------------------------------------------------------ */

const PAGES = {
  playbooks: () => <PlaybooksPage />,
  runs: () => <RunsPage />,
  triggers: () => <TriggersPage />,
  actions: () => <ActionsPage />,
  approvals: () => <ApprovalsPage />,
};

const app = (initial: string, pages: Record<string, () => ReactNode> = PAGES): Story => ({ render: () => <ProductApp product="automation" nav={nav} pages={pages} initial={initial} /> });

export const Playbooks: Story = {
  ...app("playbooks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Playbooks" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Rotate leaked secret" }));
    await expect(c.getByRole("heading", { level: 1, name: "Rotate leaked secret" })).toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "Playbook steps" })).getAllByRole("button")).toHaveLength(3);
    await userEvent.click(c.getByRole("button", { name: "All playbooks" }));
    await expect(c.getByRole("table", { name: "Playbooks" })).toBeInTheDocument();
  },
};

/** Playbook: a visual flow of steps with last-run state; selecting a step shows its config. */
export const Playbook: Story = {
  ...app("playbooks", { ...PAGES, playbooks: () => <PlaybooksPage initialOpen="contain" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Contain compromised host" })).toBeInTheDocument();
    const flow = c.getByRole("list", { name: "Playbook steps" });
    await expect(within(flow).getAllByRole("button")).toHaveLength(8);
    const isolate = within(flow).getByRole("button", { name: /Isolate host/ });
    await userEvent.click(isolate);
    await expect(isolate).toHaveAttribute("aria-pressed", "true");
    const side = c.getByRole("region", { name: "Step config: Isolate host" });
    await expect(within(side).getByText("infrastructure.host.isolate")).toBeInTheDocument();
    await userEvent.click(within(flow).getByRole("button", { name: /Approval/ }));
    await expect(c.getByRole("region", { name: /Step config: On-call/ })).toHaveTextContent("Sarah Chen");
  },
};

export const Runs: Story = {
  ...app("runs"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Run detail" });
    await expect(within(detail).getByText(/504 Gateway Timeout/)).toBeInTheDocument();
    await userEvent.click(within(detail).getByRole("button", { name: "Retry failed step" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("Retrying step 6");
    await userEvent.click(within(c.getByRole("table", { name: "All runs" })).getByText("run-4766"));
    await expect(within(c.getByRole("list", { name: "Step results" })).getAllByText("Skipped")).toHaveLength(6);
  },
};

export const Triggers: Story = {
  ...app("triggers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const test = c.getByRole("region", { name: "Test trigger" });
    await userEvent.click(within(test).getByRole("button", { name: "Evaluate" }));
    await expect(within(test).getByRole("status")).toHaveTextContent("Matches · would start Block VPN brute force");
    await userEvent.click(c.getByRole("tab", { name: /Webhooks/ }));
    await expect(within(c.getByRole("table", { name: "Triggers" })).getAllByRole("row")).toHaveLength(2);
  },
};

export const Actions: Story = {
  ...app("actions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "VPN actions" })).toHaveTextContent("vpn.sessions.terminate");
    await userEvent.type(c.getByRole("searchbox", { name: "Search actions" }), "rotate");
    await expect(c.getByText("1 actions from 1 products")).toBeInTheDocument();
    await expect(c.queryByRole("region", { name: "VPN actions" })).not.toBeInTheDocument();
  },
};

export const Approvals: Story = {
  ...app("approvals"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const pending = c.getByRole("list", { name: "Pending approvals" });
    await expect(within(pending).getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(within(pending).getByRole("button", { name: "Approve Isolate host on api-prod-05" }));
    await expect(within(pending).getAllByRole("listitem")).toHaveLength(1);
    await expect(within(c.getByRole("table", { name: "Approval decisions" })).getAllByRole("row")[1]).toHaveTextContent("api-prod-05");
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
