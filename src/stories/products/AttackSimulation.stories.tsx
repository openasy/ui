import { useEffect, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { CalendarClock, LoaderCircle, CircleSlash, Crosshair, FlaskConical, LayoutGrid, ListChecks, Play, Plus, Swords, WandSparkles, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { cn } from "../../lib/cn";
import { TONE_CLASSES, type Tone } from "../../tokens/levels";
import { HOSTS, PEOPLE, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "campaigns", label: "Campaigns", icon: Swords, count: 8 },
  { id: "techniques", label: "Techniques", icon: Crosshair, count: 212 },
  { id: "results", label: "Results", icon: ListChecks },
  { id: "gaps", label: "Gaps", icon: CircleSlash, count: 5 },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
];

const meta = {
  title: "Products/Attack Simulation",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Outcome = "detected" | "prevented" | "missed";
const OUTCOME: Record<Outcome, { label: string; tone: Tone }> = {
  detected: { label: "Detected", tone: "success" },
  prevented: { label: "Prevented", tone: "info" },
  missed: { label: "Missed", tone: "danger" },
};

interface Tactic {
  id: string;
  name: string;
  /** Counts: prevented, detected (only), missed. */
  prevented: number;
  detected: number;
  missed: number;
}

const tactics: Tactic[] = [
  { id: "TA0043", name: "Reconnaissance", prevented: 2, detected: 8, missed: 2 },
  { id: "TA0042", name: "Resource Development", prevented: 0, detected: 4, missed: 2 },
  { id: "TA0001", name: "Initial Access", prevented: 9, detected: 7, missed: 1 },
  { id: "TA0002", name: "Execution", prevented: 10, detected: 12, missed: 1 },
  { id: "TA0003", name: "Persistence", prevented: 6, detected: 14, missed: 2 },
  { id: "TA0004", name: "Privilege Escalation", prevented: 7, detected: 11, missed: 2 },
  { id: "TA0005", name: "Defense Evasion", prevented: 4, detected: 16, missed: 4 },
  { id: "TA0006", name: "Credential Access", prevented: 8, detected: 9, missed: 1 },
  { id: "TA0007", name: "Discovery", prevented: 1, detected: 13, missed: 3 },
  { id: "TA0008", name: "Lateral Movement", prevented: 6, detected: 6, missed: 1 },
  { id: "TA0009", name: "Collection", prevented: 2, detected: 6, missed: 2 },
  { id: "TA0011", name: "Command and Control", prevented: 7, detected: 5, missed: 1 },
  { id: "TA0010", name: "Exfiltration", prevented: 4, detected: 3, missed: 1 },
  { id: "TA0040", name: "Impact", prevented: 5, detected: 4, missed: 0 },
];

const MAX_TACTIC = Math.max(...tactics.map((t) => t.prevented + t.detected + t.missed));

/** One column per ATT&CK tactic: a stacked bar of detected / prevented / missed with readable counts. */
function TacticStrip() {
  const order: Outcome[] = ["missed", "detected", "prevented"];
  return (
    <div className="relative overflow-x-auto">
      <ol className="grid min-w-[880px] grid-cols-[repeat(14,minmax(0,1fr))] gap-1.5" aria-label="ATT&CK tactic coverage">
        {tactics.map((t) => {
          const total = t.prevented + t.detected + t.missed;
          return (
            <li key={t.id} className="flex min-w-0 flex-col gap-1">
              <div
                role="img"
                aria-label={`${t.id} ${t.name}: ${total} tested, ${t.detected} detected, ${t.prevented} prevented, ${t.missed} missed`}
                className="flex h-24 flex-col justify-end rounded bg-subtle p-0.5"
              >
                <div className="flex flex-col overflow-hidden rounded-sm" style={{ height: `${(total / MAX_TACTIC) * 100}%` }}>
                  {order.map((o) => (t[o] > 0 ? <div key={o} className={TONE_CLASSES[OUTCOME[o].tone].dot} style={{ flexGrow: t[o] }} /> : null))}
                </div>
              </div>
              <span className="font-mono text-2xs text-fg-muted">{t.id}</span>
              <span className="min-h-7 text-2xs leading-tight font-medium break-words text-fg">{t.name}</span>
              <span className="flex flex-wrap gap-x-1 font-mono text-2xs tabular-nums" aria-hidden>
                <span className="text-success">{t.detected}</span>
                <span className="text-accent-text">{t.prevented}</span>
                <span className={t.missed ? "text-danger-text" : "text-fg-muted"}>{t.missed}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

interface Step {
  step: number;
  technique: string;
  name: string;
  test: string;
  host: string;
  expected: string;
  result: Outcome;
  ttd?: string;
  signal?: string;
}

const steps: Step[] = [
  { step: 1, technique: "T1078", name: "Valid Accounts", test: "Sign in to VPN with a leaked test user", host: "edge-fra-02", expected: "VPN + SIEM", result: "detected", ttd: "42 s", signal: "sig-1052" },
  { step: 2, technique: "T1059.004", name: "Unix shell", test: "Reverse shell via bash -i to 192.0.2.10", host: HOSTS[0], expected: "Runtime", result: "detected", ttd: "3 s", signal: "sig-1053" },
  { step: 3, technique: "T1046", name: "Network Service Discovery", test: "nmap -sT against 192.0.2.0/24", host: HOSTS[0], expected: "Network IDS", result: "missed" },
  { step: 4, technique: "T1003", name: "OS Credential Dumping", test: "Read /etc/shadow and copy to /tmp", host: HOSTS[0], expected: "Runtime", result: "prevented", ttd: "0.4 s", signal: "sig-1054" },
  { step: 5, technique: "T1562.001", name: "Disable or Modify Tools", test: "systemctl stop auditd", host: HOSTS[0], expected: "Runtime", result: "missed" },
  { step: 6, technique: "T1021.004", name: "SSH", test: "SSH with harvested key to db-prod-01", host: HOSTS[5], expected: "SIEM + Access", result: "detected", ttd: "1 m 10 s", signal: "sig-1055" },
  { step: 7, technique: "T1048", name: "Exfiltration Over Alternative Protocol", test: "DNS TXT exfil of 5 MB test file", host: HOSTS[5], expected: "Network IDS", result: "missed" },
  { step: 8, technique: "T1490", name: "Inhibit System Recovery", test: "Delete restic snapshots with test repo key", host: HOSTS[5], expected: "Backups + SIEM", result: "detected", ttd: "2 m 03 s", signal: "sig-1056" },
  { step: 9, technique: "T1486", name: "Data Encrypted for Impact", test: "Encrypt 500 canary files with openssl", host: HOSTS[5], expected: "Runtime + Malware", result: "prevented", ttd: "1.8 s", signal: "sig-1057" },
];

const stepColumns: Column<Step>[] = [
  { id: "step", header: "#", align: "right", mono: true, width: "40px", sortValue: (s) => s.step, cell: (s) => s.step },
  {
    id: "technique",
    header: "Technique",
    width: "28%",
    sortValue: (s) => s.technique,
    cell: (s) => (
      <span className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5">
          <span className="font-mono text-xs text-fg-muted">{s.technique}</span>
          <span className="truncate font-medium">{s.name}</span>
        </span>
        <span className="truncate text-2xs text-fg-muted">{s.test}</span>
      </span>
    ),
  },
  { id: "host", header: "Target", width: "140px", cell: (s) => <EntityChip kind="host" value={s.host} hideKind href="#host" /> },
  { id: "expected", header: "Expected detector", width: "150px", cell: (s) => s.expected },
  {
    id: "result",
    header: "Result",
    width: "110px",
    sortValue: (s) => ["missed", "detected", "prevented"].indexOf(s.result),
    cell: (s) => <StatusBadge tone={OUTCOME[s.result].tone}>{OUTCOME[s.result].label}</StatusBadge>,
  },
  { id: "ttd", header: "Time to detect", align: "right", mono: true, width: "110px", cell: (s) => s.ttd ?? "–" },
  {
    id: "signal",
    header: "Signal",
    width: "96px",
    cell: (s) =>
      s.signal ? (
        <a href={`#${s.signal}`} className="font-mono text-xs text-accent-text">
          {s.signal}
        </a>
      ) : (
        <span className="text-fg-muted">none</span>
      ),
  },
];

interface Gap {
  technique: string;
  name: string;
  product: string;
  why: string;
}

const gaps: Gap[] = [
  { technique: "T1046", name: "Network Service Discovery", product: "Network IDS", why: "Suricata scan rules disabled on the internal span port" },
  { technique: "T1562.001", name: "Disable or Modify Tools", product: "Runtime", why: "No rule for auditd or agent service stop" },
  { technique: "T1048", name: "Exfiltration Over Alternative Protocol", product: "Network IDS", why: "Zeek DNS logs not shipped to SIEM" },
  { technique: "T1070.003", name: "Clear Command History", product: "Runtime", why: "File-integrity watch excludes ~/.bash_history" },
  { technique: "T1567.002", name: "Exfiltration to Cloud Storage", product: "SIEM", why: "No baseline for large uploads to storage APIs" },
];

const TOTAL_STEPS = steps.length;

function CampaignProgress({ done }: { done: number }) {
  const value = Math.round((done / TOTAL_STEPS) * 100);
  const current = steps[Math.min(done, TOTAL_STEPS - 1)]!;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span id="campaign-progress-label" className="font-medium text-fg">
          Campaign progress
        </span>
        <span className="font-mono text-fg-muted">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="campaign-progress-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% · step ${Math.min(done + 1, TOTAL_STEPS)} of ${TOTAL_STEPS}`}
        className="h-2 overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-accent transition-[width]" style={{ width: `${Math.max(value, 3)}%` }} />
      </div>
      <span className="text-2xs text-fg-muted">
        Step {Math.min(done + 1, TOTAL_STEPS)} of {TOTAL_STEPS}: <span className="font-mono">{current.technique}</span> {current.name} on {current.host} · waiting up to 5 min for a signal
      </span>
    </div>
  );
}

/** Coverage: proves every other product would catch a breach, tactic by tactic, with the gaps to fix. */
function CoveragePage() {
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(0);
  const [results, setResults] = useState<string[]>([]);
  const [drafted, setDrafted] = useState<string[]>([]);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setDone((d) => {
        if (d + 1 >= TOTAL_STEPS) {
          setRunning(false);
          return 0;
        }
        return d + 1;
      });
    }, 2000);
    return () => clearInterval(t);
  }, [running]);
  const rows = steps.filter((s) => results.length === 0 || results.includes(s.result));
  return (
    <>
      <PageHeader
        title="Coverage"
        description="Safe Atomic Red Team style tests on isolated targets · reversible, no real malware · every result checked against SIEM, Runtime, Network IDS and Backups"
        meta={running ? <StatusBadge tone="info">Running</StatusBadge> : <StatusBadge tone="success">Last run 2 h ago</StatusBadge>}
        actions={
          <>
            <Button size="md" icon={<FlaskConical />}>
              Test library
            </Button>
            <Button
              size="md"
              variant="primary"
              icon={running ? <LoaderCircle className="animate-spin" /> : <Play />}
              aria-busy={running || undefined}
              onClick={() => {
                if (running) return;
                setDone(0);
                setRunning(true);
              }}
            >
              {running ? "Running campaign" : "Run campaign"}
            </Button>
          </>
        }
      />
      {running && (
        <Panel>
          <div className="pt-2.5">
            <CampaignProgress done={done} />
          </div>
        </Panel>
      )}
      <KpiGrid minWidth={160}>
        <KpiCard label="Techniques tested" value="212" unit="of 14 tactics" delta={{ label: "+18 since last month", direction: "up", intent: "good" }} />
        <KpiCard label="Detected" value="189" unit="89%" tone="success" delta={{ label: "+3 pts vs. last run", direction: "up", intent: "good" }} />
        <KpiCard label="Prevented" value="71" unit="blocked before impact" delta={{ label: "Runtime, WAF and Access" }} />
        <KpiCard label="Gaps" value="5" unit="open" tone="danger" delta={{ label: "18 more missed but accepted", intent: "bad" }} />
        <KpiCard label="Last run" value="2 h" unit="ago" delta={{ label: "Nightly at 02:00 + on rule change" }} />
      </KpiGrid>
      <Panel
        title="ATT&CK coverage by tactic"
        description="All 212 tested techniques, enterprise matrix v15"
        actions={
          <span className="flex items-center gap-2 text-2xs text-fg-muted">
            {(["detected", "prevented", "missed"] as const).map((o) => (
              <span key={o} className="flex items-center gap-1">
                <span aria-hidden className={cn("size-2 rounded-sm", TONE_CLASSES[OUTCOME[o].tone].dot)} />
                {OUTCOME[o].label}
              </span>
            ))}
          </span>
        }
      >
        <TacticStrip />
      </Panel>
      <Callout tone="danger" title="5 gaps: these techniques ran and nothing noticed">
        <ul className="mt-1 flex flex-col gap-1" aria-label="Detection gaps">
          {gaps.map((g) => (
            <li key={g.technique} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
              <span className="min-w-0">
                <span className="font-mono text-xs text-fg">{g.technique}</span> <span className="font-medium text-fg">{g.name}</span>
                <span> · should be caught by </span>
                <Badge tone="neutral">{g.product}</Badge>
                <span className="block truncate text-2xs">{g.why}</span>
              </span>
              {drafted.includes(g.technique) ? (
                <StatusBadge tone="success">Draft rule in {g.product}</StatusBadge>
              ) : (
                <Button size="xs" icon={<WandSparkles />} aria-label={`Create detection for ${g.technique} ${g.name}`} onClick={() => setDrafted((d) => [...d, g.technique])}>
                  Create detection
                </Button>
              )}
            </li>
          ))}
        </ul>
      </Callout>
      <Panel
        title="Ransomware precursor chain"
        description="Latest campaign · 9 steps · 6 caught, 3 missed · targets api-prod-01 and db-prod-01 test namespaces"
        actions={<Badge tone="neutral" mono>campaign-08</Badge>}
        footer="Each step is an Atomic Red Team style test with a cleanup command. Nothing leaves the test hosts; encrypted files are canaries, not data."
        flush
      >
        <div className="border-b border-line px-3 py-2">
          <FilterBar onClear={results.length ? () => setResults([]) : undefined}>
            <FacetFilter
              label="Result"
              selected={results}
              onChange={setResults}
              options={(Object.keys(OUTCOME) as Outcome[]).map((o) => ({ value: o, label: OUTCOME[o].label, count: steps.filter((s) => s.result === o).length }))}
            />
          </FilterBar>
        </div>
        <DataTable label="Campaign results" columns={stepColumns} rows={rows} getRowId={(s) => String(s.step)} defaultSort={{ id: "step", direction: "asc" }} minWidth={980} />
      </Panel>
    </>
  );
  
}

/* ------------------------------------------------------------------ */
/* Campaigns                                                           */
/* ------------------------------------------------------------------ */

interface Technique {
  id: string;
  name: string;
  tactic: string;
  platform: "Linux" | "Windows" | "Network" | "Cloud";
  detector: string;
  last: Outcome | "untested";
  lastRun: string;
  ttd?: string;
}

const TECHNIQUES: Technique[] = [
  { id: "T1595", name: "Active Scanning", tactic: "Reconnaissance", platform: "Network", detector: "Attack Surface, WAF", last: "detected", lastRun: "2 h ago", ttd: "4 m" },
  { id: "T1566.002", name: "Spearphishing Link", tactic: "Initial Access", platform: "Cloud", detector: "Awareness, Identity", last: "detected", lastRun: "1 d ago", ttd: "6 m" },
  { id: "T1078", name: "Valid Accounts", tactic: "Initial Access", platform: "Cloud", detector: "VPN, SIEM", last: "detected", lastRun: "2 h ago", ttd: "42 s" },
  { id: "T1059.004", name: "Unix Shell", tactic: "Execution", platform: "Linux", detector: "Runtime", last: "detected", lastRun: "2 h ago", ttd: "3 s" },
  { id: "T1053.003", name: "Cron", tactic: "Persistence", platform: "Linux", detector: "Runtime", last: "detected", lastRun: "2 h ago", ttd: "8 s" },
  { id: "T1098.004", name: "SSH Authorized Keys", tactic: "Persistence", platform: "Linux", detector: "Runtime FIM", last: "detected", lastRun: "1 d ago", ttd: "12 s" },
  { id: "T1548.003", name: "Sudo and Sudo Caching", tactic: "Privilege Escalation", platform: "Linux", detector: "Runtime", last: "prevented", lastRun: "2 h ago", ttd: "0.3 s" },
  { id: "T1562.001", name: "Disable or Modify Tools", tactic: "Defense Evasion", platform: "Linux", detector: "Runtime", last: "missed", lastRun: "2 h ago" },
  { id: "T1070.003", name: "Clear Command History", tactic: "Defense Evasion", platform: "Linux", detector: "Runtime FIM", last: "missed", lastRun: "1 d ago" },
  { id: "T1003.008", name: "/etc/passwd and /etc/shadow", tactic: "Credential Access", platform: "Linux", detector: "Runtime", last: "prevented", lastRun: "2 h ago", ttd: "0.4 s" },
  { id: "T1552.001", name: "Credentials In Files", tactic: "Credential Access", platform: "Linux", detector: "Secrets, Deception", last: "detected", lastRun: "1 d ago", ttd: "1 m" },
  { id: "T1046", name: "Network Service Discovery", tactic: "Discovery", platform: "Network", detector: "Network IDS, Deception", last: "missed", lastRun: "2 h ago" },
  { id: "T1021.004", name: "SSH", tactic: "Lateral Movement", platform: "Linux", detector: "SIEM, Access", last: "detected", lastRun: "2 h ago", ttd: "1 m 10 s" },
  { id: "T1071.001", name: "Web Protocols", tactic: "Command and Control", platform: "Network", detector: "Network IDS, Threat Intel", last: "detected", lastRun: "1 d ago", ttd: "22 s" },
  { id: "T1048", name: "Exfiltration Over Alternative Protocol", tactic: "Exfiltration", platform: "Network", detector: "Network IDS", last: "missed", lastRun: "2 h ago" },
  { id: "T1567.002", name: "Exfiltration to Cloud Storage", tactic: "Exfiltration", platform: "Cloud", detector: "SIEM", last: "missed", lastRun: "3 d ago" },
  { id: "T1490", name: "Inhibit System Recovery", tactic: "Impact", platform: "Linux", detector: "Backups, SIEM", last: "detected", lastRun: "2 h ago", ttd: "2 m 03 s" },
  { id: "T1486", name: "Data Encrypted for Impact", tactic: "Impact", platform: "Linux", detector: "Runtime, Malware", last: "prevented", lastRun: "2 h ago", ttd: "1.8 s" },
  { id: "T1496", name: "Resource Hijacking", tactic: "Impact", platform: "Linux", detector: "Malware, Runtime, Metrics", last: "detected", lastRun: "1 d ago", ttd: "9 s" },
  { id: "T1110.003", name: "Password Spraying", tactic: "Credential Access", platform: "Cloud", detector: "Identity", last: "untested", lastRun: "never" },
];

const LAST_TONE: Record<Technique["last"], Tone> = { detected: "success", prevented: "info", missed: "danger", untested: "neutral" };

interface Campaign {
  id: string;
  name: string;
  techniques: number;
  targets: string;
  lastRun: string;
  result: { caught: number; missed: number };
  status: "idle" | "running" | "scheduled";
}

const CAMPAIGNS: Campaign[] = [
  { id: "campaign-08", name: "Ransomware precursor chain", techniques: 9, targets: "api-prod-01, db-prod-01 test namespaces", lastRun: "2 h ago", result: { caught: 6, missed: 3 }, status: "idle" },
  { id: "campaign-07", name: "Cloud account takeover", techniques: 7, targets: "sandbox AWS account", lastRun: "1 d ago", result: { caught: 6, missed: 1 }, status: "scheduled" },
  { id: "campaign-06", name: "Insider data theft", techniques: 6, targets: "db-analytics-01 test schema", lastRun: "3 d ago", result: { caught: 4, missed: 2 }, status: "idle" },
  { id: "campaign-05", name: "Container breakout", techniques: 8, targets: "k8s-staging · sim namespace", lastRun: "4 d ago", result: { caught: 8, missed: 0 }, status: "idle" },
  { id: "campaign-04", name: "Phishing to VPN", techniques: 5, targets: "test user sim.user@example.com", lastRun: "1 w ago", result: { caught: 5, missed: 0 }, status: "idle" },
  { id: "campaign-03", name: "Web app exploitation", techniques: 6, targets: "staging.example.com", lastRun: "1 w ago", result: { caught: 5, missed: 1 }, status: "scheduled" },
];

function CampaignsPage() {
  const [items, setItems] = useState(CAMPAIGNS);
  const [name, setName] = useState("New campaign");
  const [target, setTarget] = useState("k8s-staging · sim namespace");
  const [chain, setChain] = useState<string[]>(["T1078", "T1059.004"]);
  const [pick, setPick] = useState("T1046");
  const [created, setCreated] = useState<string | null>(null);
  const cols: Column<Campaign>[] = [
    {
      id: "name",
      header: "Campaign",
      width: "30%",
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="font-mono text-2xs text-fg-muted">{c.id}</span>
        </span>
      ),
    },
    { id: "tech", header: "Techniques", align: "right", mono: true, cell: (c) => c.techniques },
    { id: "targets", header: "Targets", width: "26%", cell: (c) => <span className="block truncate text-xs">{c.targets}</span> },
    {
      id: "result",
      header: "Last result",
      sortValue: (c) => c.result.missed,
      cell: (c) =>
        c.result.caught + c.result.missed === 0 ? (
          <span className="text-fg-subtle">Not run</span>
        ) : (
          <span className="flex gap-1">
            <Badge tone="success">{c.result.caught} caught</Badge>
            {c.result.missed > 0 && <Badge tone="danger">{c.result.missed} missed</Badge>}
          </span>
        ),
    },
    { id: "last", header: "Last run", cell: (c) => <span className="text-xs">{c.lastRun}</span> },
    { id: "status", header: "Status", cell: (c) => <StatusBadge tone={c.status === "running" ? "info" : c.status === "scheduled" ? "neutral" : "success"}>{c.status}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader title="Campaigns" description="Chains of techniques run in order, the way a real intrusion unfolds. Every step has a cleanup command." />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Campaigns" description={`${items.length} campaigns`} flush>
          <DataTable label="Campaigns" columns={cols} rows={items} getRowId={(c) => c.id} minWidth={860} />
        </Panel>
        <Panel title="Build a campaign" aria-label="Campaign builder">
          <form
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              const id = `campaign-${String(items.length + 3).padStart(2, "0")}`;
              setItems((all) => [{ id, name, techniques: chain.length, targets: target, lastRun: "never", result: { caught: 0, missed: 0 }, status: "scheduled" }, ...all]);
              setCreated(`${name} created with ${chain.length} steps · first run tonight at 02:00`);
            }}
          >
            <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} />
            <SelectField label="Target" value={target} onChange={(e) => setTarget(e.target.value)} options={["k8s-staging · sim namespace", "api-prod-01, db-prod-01 test namespaces", "sandbox AWS account", "staging.example.com"].map((v) => ({ value: v, label: v }))} />
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium">Steps, in order</span>
              <ol aria-label="Campaign steps" className="flex flex-col gap-1">
                {chain.map((t, i) => {
                  const tech = TECHNIQUES.find((x) => x.id === t);
                  return (
                    <li key={t} className="flex items-center gap-2 rounded border border-line px-2 py-1 text-sm">
                      <span className="w-4 font-mono text-2xs text-fg-muted">{i + 1}</span>
                      <span className="font-mono text-xs text-fg-muted">{t}</span>
                      <span className="min-w-0 grow truncate">{tech?.name}</span>
                      <IconButton label={`Remove ${t}`} size="xs" onClick={() => setChain((c) => c.filter((x) => x !== t))}>
                        <X />
                      </IconButton>
                    </li>
                  );
                })}
              </ol>
              <div className="flex items-end gap-1.5">
                <SelectField
                  label="Add technique"
                  value={pick}
                  onChange={(e) => setPick(e.target.value)}
                  options={TECHNIQUES.filter((t) => !chain.includes(t.id)).map((t) => ({ value: t.id, label: `${t.id} ${t.name}` }))}
                />
                <Button type="button" icon={<Plus />} onClick={() => pick && !chain.includes(pick) && setChain((c) => [...c, pick])}>
                  Add step
                </Button>
              </div>
            </div>
            <Callout tone="info" title="Safe by design">
              Atomic Red Team style emulations only. No real malware, nothing leaves the targets, and every step is undone after the run.
            </Callout>
            <div className="flex items-center gap-2 border-t border-line pt-2">
              <Button type="submit" variant="primary" disabled={chain.length === 0}>
                Create campaign
              </Button>
            </div>
            {created && (
              <p role="status" className="text-xs text-success">
                {created}
              </p>
            )}
          </form>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Techniques                                                          */
/* ------------------------------------------------------------------ */

function TechniquesPage() {
  const [tactic, setTactic] = useState<string[]>([]);
  const [last, setLast] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [queued, setQueued] = useState<string | null>(null);
  const rows = TECHNIQUES.filter(
    (t) => (tactic.length === 0 || tactic.includes(t.tactic)) && (last.length === 0 || last.includes(t.last)) && (!query || `${t.id} ${t.name}`.toLowerCase().includes(query.toLowerCase())),
  );
  const cols: Column<Technique>[] = [
    {
      id: "id",
      header: "Technique",
      width: "30%",
      sortValue: (t) => t.id,
      cell: (t) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="font-mono text-xs text-fg-muted">{t.id}</span>
          <span className="truncate font-medium">{t.name}</span>
        </span>
      ),
    },
    { id: "tactic", header: "Tactic", sortValue: (t) => t.tactic, cell: (t) => <span className="text-xs">{t.tactic}</span> },
    { id: "platform", header: "Platform", cell: (t) => <Badge>{t.platform}</Badge> },
    { id: "detector", header: "Should be caught by", description: "The products expected to detect or prevent this technique, from Platform → Breach coverage.", cell: (t) => <span className="text-xs">{t.detector}</span> },
    { id: "last", header: "Last result", sortValue: (t) => t.last, cell: (t) => <StatusBadge tone={LAST_TONE[t.last]}>{t.last}</StatusBadge> },
    { id: "ttd", header: "Time to detect", align: "right", mono: true, cell: (t) => t.ttd ?? "–" },
    {
      id: "run",
      header: "",
      width: "70px",
      hideable: false,
      cell: (t) => (
        <Button size="xs" variant="ghost" icon={<Play />} aria-label={`Run ${t.id}`} onClick={() => setQueued(`${t.id} ${t.name} queued on the sim namespace`)}>
          Run
        </Button>
      ),
    },
  ];
  const tactics = [...new Set(TECHNIQUES.map((t) => t.tactic))];
  return (
    <>
      <PageHeader title="Techniques" description="212 tests mapped to MITRE ATT&CK enterprise v15. 20 shown: the ones in active campaigns." actions={<SearchInput label="Search techniques" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />} />
      <FilterBar onClear={tactic.length || last.length ? () => (setTactic([]), setLast([])) : undefined}>
        <FacetFilter label="Tactic" selected={tactic} onChange={setTactic} searchable options={tactics.map((t) => ({ value: t, count: TECHNIQUES.filter((x) => x.tactic === t).length }))} />
        <FacetFilter label="Last result" selected={last} onChange={setLast} options={(["detected", "prevented", "missed", "untested"] as const).map((o) => ({ value: o, count: TECHNIQUES.filter((x) => x.last === o).length }))} />
      </FilterBar>
      {queued && (
        <p role="status" className="text-sm text-success">
          {queued}
        </p>
      )}
      <Panel title="Technique library" description={`${rows.length} shown`} flush>
        <DataTable label="Techniques" columns={cols} rows={rows} getRowId={(t) => t.id} defaultSort={{ id: "id", direction: "asc" }} minWidth={1040} empty={<p className="py-8">No techniques match</p>} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Results                                                             */
/* ------------------------------------------------------------------ */

interface Run {
  id: string;
  campaign: string;
  started: string;
  duration: string;
  detected: number;
  prevented: number;
  missed: number;
  medianTtd: string;
}

const RUNS: Run[] = [
  { id: "run-412", campaign: "Ransomware precursor chain", started: "Oct 19 · 02:00", duration: "18 m", detected: 4, prevented: 2, missed: 3, medianTtd: "42 s" },
  { id: "run-411", campaign: "Cloud account takeover", started: "Oct 18 · 02:00", duration: "11 m", detected: 5, prevented: 1, missed: 1, medianTtd: "1 m 05 s" },
  { id: "run-410", campaign: "Ransomware precursor chain", started: "Oct 18 · 02:00", duration: "17 m", detected: 4, prevented: 2, missed: 3, medianTtd: "48 s" },
  { id: "run-409", campaign: "Insider data theft", started: "Oct 16 · 02:00", duration: "14 m", detected: 3, prevented: 1, missed: 2, medianTtd: "2 m 10 s" },
  { id: "run-408", campaign: "Container breakout", started: "Oct 15 · 02:00", duration: "9 m", detected: 5, prevented: 3, missed: 0, medianTtd: "6 s" },
  { id: "run-407", campaign: "Ransomware precursor chain", started: "Oct 14 · 14:22", duration: "19 m", detected: 3, prevented: 2, missed: 4, medianTtd: "55 s" },
  { id: "run-406", campaign: "Phishing to VPN", started: "Oct 12 · 02:00", duration: "22 m", detected: 4, prevented: 1, missed: 0, medianTtd: "3 m 40 s" },
];

function ResultsPage() {
  const [campaign, setCampaign] = useState<string[]>([]);
  const [active, setActive] = useState("run-412");
  const rows = RUNS.filter((r) => campaign.length === 0 || campaign.includes(r.campaign));
  const cur = RUNS.find((r) => r.id === active);
  const days = Array.from({ length: 14 }, (_, i) => `Oct ${6 + i}`);
  const cols: Column<Run>[] = [
    { id: "id", header: "Run", mono: true, cell: (r) => r.id },
    { id: "campaign", header: "Campaign", width: "28%", cell: (r) => <span className="block truncate">{r.campaign}</span> },
    { id: "started", header: "Started", mono: true, sortValue: (r) => r.id, cell: (r) => r.started },
    { id: "dur", header: "Duration", align: "right", cell: (r) => r.duration },
    {
      id: "outcome",
      header: "Outcome",
      sortValue: (r) => r.missed,
      cell: (r) => (
        <span className="flex gap-1">
          <Badge tone="success">{r.detected}</Badge>
          <Badge tone="info">{r.prevented}</Badge>
          <Badge tone={r.missed ? "danger" : "neutral"}>{r.missed}</Badge>
        </span>
      ),
      description: "Detected · prevented · missed steps.",
    },
    { id: "ttd", header: "Median time to detect", align: "right", mono: true, cell: (r) => r.medianTtd },
  ];
  return (
    <>
      <PageHeader title="Results" description="Every run, step by step. A step counts as detected only when the expected product raised a signal within 5 minutes." />
      <KpiGrid>
        <KpiCard label="Runs · 30 d" value="31" />
        <KpiCard label="Detection rate" value="89" unit="%" tone="success" trend={wave(14, { base: 84, amp: 3, seed: 51 })} delta={{ label: "+3 pts vs. last month", direction: "up", intent: "good" }} />
        <KpiCard label="Median time to detect" value="48" unit="s" delta={{ label: "-12 s vs. last month", direction: "down", intent: "good" }} />
        <KpiCard label="Regressions" value="1" tone="warning" delta={{ label: "T1562.001 was caught last week", intent: "bad" }} />
      </KpiGrid>
      <Panel title="Time to detect" description="Median per night, by product">
        <TimeSeriesChart
          label="Median time to detect by product"
          labels={days}
          height={160}
          xTicks={7}
          format={(v) => `${Math.round(v)} s`}
          series={[
            { id: "runtime", name: "Runtime", data: wave(14, { base: 6, amp: 2, seed: 52 }) },
            { id: "siem", name: "SIEM", data: wave(14, { base: 70, amp: 15, seed: 53 }) },
            { id: "nids", name: "Network IDS", data: wave(14, { base: 30, amp: 10, seed: 54 }) },
            { id: "backups", name: "Backups", data: wave(14, { base: 120, amp: 20, seed: 55 }) },
          ]}
        />
      </Panel>
      <FilterBar onClear={campaign.length ? () => setCampaign([]) : undefined}>
        <FacetFilter label="Campaign" selected={campaign} onChange={setCampaign} options={[...new Set(RUNS.map((r) => r.campaign))].map((c) => ({ value: c, count: RUNS.filter((r) => r.campaign === c).length }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Runs" description={`${rows.length} runs`} flush>
          <DataTable label="Runs" columns={cols} rows={rows} getRowId={(r) => r.id} onRowClick={(r) => setActive(r.id)} activeRowId={active} defaultSort={{ id: "started", direction: "desc" }} minWidth={820} />
        </Panel>
        <Panel title="Steps" description={cur ? `${cur.id} · ${cur.campaign}` : "No run selected"} aria-label="Run steps">
          {cur && cur.campaign === "Ransomware precursor chain" ? (
            <ol aria-label={`Steps of ${cur.id}`} className="flex flex-col">
              {steps.map((s) => (
                <li key={s.step} className="grid grid-cols-[20px_minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle py-1.5 text-sm last:border-0">
                  <span className="font-mono text-2xs text-fg-muted">{s.step}</span>
                  <span className="min-w-0 truncate">
                    <span className="font-mono text-xs text-fg-muted">{s.technique}</span> {s.name}
                  </span>
                  <StatusBadge tone={OUTCOME[s.result].tone}>{OUTCOME[s.result].label}</StatusBadge>
                </li>
              ))}
            </ol>
          ) : (
            cur && (
              <p className="text-sm text-fg-muted">
                {cur.detected + cur.prevented} of {cur.detected + cur.prevented + cur.missed} steps caught. Open the run for the full step log.
              </p>
            )
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Gaps                                                                */
/* ------------------------------------------------------------------ */

type GapStatus = "open" | "in progress" | "fixed" | "accepted";

interface GapItem extends Gap {
  owner: string;
  work?: string;
  status: GapStatus;
  since: string;
}

const GAP_ITEMS: GapItem[] = [
  { ...gaps[0]!, owner: PEOPLE[4], work: "NIDS-118 enable ET SCAN on span-int", status: "in progress", since: "Oct 12" },
  { ...gaps[1]!, owner: PEOPLE[0], status: "open", since: "Oct 14" },
  { ...gaps[2]!, owner: PEOPLE[4], work: "SIEM-341 ship Zeek dns.log", status: "in progress", since: "Oct 9" },
  { ...gaps[3]!, owner: PEOPLE[0], status: "open", since: "Oct 17" },
  { ...gaps[4]!, owner: PEOPLE[3], status: "open", since: "Oct 16" },
  { technique: "T1201", name: "Password Policy Discovery", product: "SIEM", why: "Low value; accepted until Q1", owner: PEOPLE[3], status: "accepted", since: "Sep 30" },
  { technique: "T1053.003", name: "Cron", product: "Runtime", why: "New rule proc.cron_write", owner: PEOPLE[0], work: "RT-77", status: "fixed", since: "Oct 2" },
];

const GAP_TONE: Record<GapStatus, Tone> = { open: "danger", "in progress": "warning", fixed: "success", accepted: "neutral" };

function GapsPage() {
  const [status, setStatus] = useState<Record<string, GapStatus>>(Object.fromEntries(GAP_ITEMS.map((g) => [g.technique, g.status])));
  const [show, setShow] = useState<string[]>(["open", "in progress"]);
  const rows = GAP_ITEMS.filter((g) => show.length === 0 || show.includes(status[g.technique] ?? g.status));
  const cols: Column<GapItem>[] = [
    {
      id: "tech",
      header: "Technique",
      width: "26%",
      cell: (g) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            <span className="font-mono text-xs text-fg-muted">{g.technique}</span> {g.name}
          </span>
          <span className="truncate text-2xs text-fg-muted">{g.why}</span>
        </span>
      ),
    },
    { id: "product", header: "Owner product", cell: (g) => <Badge>{g.product}</Badge> },
    { id: "owner", header: "Owner", cell: (g) => <span className="text-xs">{g.owner}</span> },
    { id: "work", header: "Linked work", mono: true, cell: (g) => g.work ?? <span className="text-fg-subtle">none</span> },
    { id: "since", header: "Missed since", cell: (g) => <span className="text-xs">{g.since}</span> },
    { id: "status", header: "Status", sortValue: (g) => status[g.technique] ?? g.status, cell: (g) => <StatusBadge tone={GAP_TONE[status[g.technique] ?? g.status]}>{status[g.technique]}</StatusBadge> },
    {
      id: "act",
      header: "",
      width: "120px",
      hideable: false,
      cell: (g) =>
        (status[g.technique] ?? g.status) === "open" ? (
          <Button size="xs" onClick={() => setStatus((s) => ({ ...s, [g.technique]: "accepted" }))} aria-label={`Accept risk for ${g.technique}`}>
            Accept risk
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Gaps" description="Techniques that ran and were not caught. A gap closes when the next run detects it." />
      <KpiGrid>
        <KpiCard label="Open" value={`${Object.values(status).filter((s) => s === "open").length}`} tone="danger" />
        <KpiCard label="In progress" value={`${Object.values(status).filter((s) => s === "in progress").length}`} tone="warning" />
        <KpiCard label="Fixed · 30 d" value="9" tone="success" />
        <KpiCard label="Accepted" value={`${Object.values(status).filter((s) => s === "accepted").length + 17}`} delta={{ label: "Reviewed quarterly" }} />
      </KpiGrid>
      <FilterBar onClear={show.length ? () => setShow([]) : undefined}>
        <FacetFilter label="Status" selected={show} onChange={setShow} options={(["open", "in progress", "fixed", "accepted"] as const).map((s) => ({ value: s, count: Object.values(status).filter((x) => x === s).length }))} />
      </FilterBar>
      <Panel title="Gaps" description={`${rows.length} shown`} flush>
        <DataTable label="Detection gaps" columns={cols} rows={rows} getRowId={(g) => g.technique} minWidth={1000} empty={<p className="py-8">No gaps with this status</p>} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Schedules                                                           */
/* ------------------------------------------------------------------ */

interface Schedule {
  id: string;
  campaign: string;
  when: string;
  onRuleChange: boolean;
  next: string;
  enabled: boolean;
}

const SCHEDULES: Schedule[] = [
  { id: "sc1", campaign: "Ransomware precursor chain", when: "Nightly 02:00", onRuleChange: true, next: "Tonight 02:00", enabled: true },
  { id: "sc2", campaign: "Cloud account takeover", when: "Nightly 02:30", onRuleChange: true, next: "Tonight 02:30", enabled: true },
  { id: "sc3", campaign: "Insider data theft", when: "Mon, Thu 03:00", onRuleChange: false, next: "Thu 03:00", enabled: true },
  { id: "sc4", campaign: "Container breakout", when: "Weekly Sun 04:00", onRuleChange: true, next: "Sun 04:00", enabled: true },
  { id: "sc5", campaign: "Phishing to VPN", when: "Monthly 1st 09:00", onRuleChange: false, next: "Nov 1 09:00", enabled: false },
  { id: "sc6", campaign: "Web app exploitation", when: "Weekly Wed 01:00", onRuleChange: true, next: "Wed 01:00", enabled: true },
];

function SchedulesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(SCHEDULES.map((s) => [s.id, s.enabled])));
  const [ruleChange, setRuleChange] = useState<Record<string, boolean>>(Object.fromEntries(SCHEDULES.map((s) => [s.id, s.onRuleChange])));
  const [quiet, setQuiet] = useState(true);
  const cols: Column<Schedule>[] = [
    { id: "campaign", header: "Campaign", width: "28%", cell: (s) => <span className="font-medium">{s.campaign}</span> },
    { id: "when", header: "Runs", cell: (s) => <span className="text-xs">{s.when}</span> },
    { id: "next", header: "Next run", cell: (s) => <span className="text-xs">{enabled[s.id] ? s.next : "Paused"}</span> },
    {
      id: "rule",
      header: "On rule change",
      description: "Also run within 10 minutes when a detection rule in SIEM, Runtime or Network IDS is changed.",
      cell: (s) => <Switch checked={ruleChange[s.id] ?? false} onCheckedChange={(v) => setRuleChange((r) => ({ ...r, [s.id]: v }))} label={<span className="sr-only">Run {s.campaign} on rule change</span>} />,
    },
    { id: "enabled", header: "Enabled", cell: (s) => <Switch checked={enabled[s.id] ?? false} onCheckedChange={(v) => setEnabled((r) => ({ ...r, [s.id]: v }))} label={<span className="sr-only">Enable {s.campaign}</span>} /> },
  ];
  return (
    <>
      <PageHeader title="Schedules" description="When each campaign runs. Runs never overlap; a queued run waits for the previous one to clean up." actions={<Button variant="primary" icon={<Plus />}>New schedule</Button>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Schedules" flush>
          <DataTable label="Schedules" columns={cols} rows={SCHEDULES} getRowId={(s) => s.id} minWidth={760} />
        </Panel>
        <Panel title="Guard rails">
          <div className="flex flex-col gap-2.5">
            <Switch checked={quiet} onCheckedChange={setQuiet} label="Skip during change freezes" description="Reads the freeze calendar from Incidents." />
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
              <dt className="text-fg-muted">Runs this week</dt>
              <dd>{Object.values(enabled).filter(Boolean).length * 3}</dd>
              <dt className="text-fg-muted">Max parallel</dt>
              <dd>1 campaign</dd>
              <dt className="text-fg-muted">Abort if</dt>
              <dd>CPU on a target &gt; 80% for 2 min</dd>
            </dl>
          </div>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  overview: () => <CoveragePage />,
  campaigns: () => <CampaignsPage />,
  techniques: () => <TechniquesPage />,
  results: () => <ResultsPage />,
  gaps: () => <GapsPage />,
  schedules: () => <SchedulesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="attack-simulation" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Coverage: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Coverage" })).toBeInTheDocument();
    await expect(c.queryByRole("progressbar")).not.toBeInTheDocument();
    await expect(c.getByRole("img", { name: /^TA0005 Defense Evasion: 24 tested, 16 detected, 4 prevented, 4 missed$/ })).toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "ATT&CK tactic coverage" })).getAllByRole("listitem")).toHaveLength(14);

    await userEvent.click(c.getByRole("button", { name: "Run campaign" }));
    const bar = await c.findByRole("progressbar", { name: "Campaign progress" });
    await expect(bar).toHaveAttribute("aria-valuemin", "0");
    await expect(c.getByText("Running", { selector: "span" })).toBeInTheDocument();

    const gapList = within(c.getByRole("list", { name: "Detection gaps" }));
    await expect(gapList.getAllByRole("listitem")).toHaveLength(5);
    await expect(gapList.getByText("Exfiltration Over Alternative Protocol")).toBeInTheDocument();
    await userEvent.click(gapList.getByRole("button", { name: "Create detection for T1048 Exfiltration Over Alternative Protocol" }));
    await expect(gapList.getAllByRole("button", { name: /^Create detection/ })).toHaveLength(4);

    const table = c.getByRole("table", { name: "Campaign results" });
    await expect(within(table).getAllByRole("row")).toHaveLength(steps.length + 1);
    await expect(within(table).getAllByText("Missed")).toHaveLength(3);
  },
};

export const Campaigns: Story = {
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add step" }));
    await expect(within(c.getByRole("list", { name: "Campaign steps" })).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(c.getByRole("button", { name: "Remove T1078" }));
    await userEvent.click(c.getByRole("button", { name: "Create campaign" }));
    await expect(c.getByText(/New campaign created with 2 steps/)).toBeInTheDocument();
    await expect(c.getByRole("table", { name: "Campaigns" }).querySelectorAll("tbody tr")).toHaveLength(7);
  },
};

export const Techniques: Story = {
  ...app("techniques"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search techniques" }), "exfiltration");
    await expect(c.getByRole("table", { name: "Techniques" }).querySelectorAll("tbody tr")).toHaveLength(2);
    await userEvent.click(c.getByRole("button", { name: "Run T1048" }));
    await expect(c.getByText(/T1048 Exfiltration Over Alternative Protocol queued/)).toBeInTheDocument();
  },
};

export const Results: Story = {
  ...app("results"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Steps of run-412" })).getAllByRole("listitem")).toHaveLength(9);
    await userEvent.click(within(c.getByRole("table", { name: "Runs" })).getByText("run-408"));
    await expect(c.getByLabelText("Run steps")).toHaveTextContent("8 of 8 steps caught");
  },
};

export const Gaps: Story = {
  ...app("gaps"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = () => c.getByRole("table", { name: "Detection gaps" });
    await expect(table().querySelectorAll("tbody tr")).toHaveLength(5);
    await userEvent.click(c.getByRole("button", { name: "Accept risk for T1070.003" }));
    await expect(table().querySelectorAll("tbody tr")).toHaveLength(4);
  },
};

export const Schedules: Story = {
  ...app("schedules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Enable Insider data theft" }));
    await expect(within(c.getByRole("table", { name: "Schedules" })).getAllByText("Paused")).toHaveLength(2);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
