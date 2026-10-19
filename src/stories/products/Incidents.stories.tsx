import { useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookOpen, FileText, Globe, List, MessageSquarePlus, Plus, Siren, Users } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip, type EntityKind } from "../../components/EntityChip";
import { cn } from "../../lib/cn";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import type { Severity, Tone } from "../../tokens/levels";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "open", label: "Open", icon: Siren, count: 3 },
  { id: "all", label: "All incidents", icon: List },
  { id: "postmortems", label: "Postmortems", icon: FileText },
  { id: "playbooks", label: "Playbooks", icon: BookOpen },
  { id: "status", label: "Status page", icon: Globe },
];

const meta = {
  title: "Products/Incidents",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type IncStatus = "investigating" | "identified" | "monitoring" | "resolved";

const STATUS: Record<IncStatus, { label: string; tone: Tone }> = {
  investigating: { label: "Investigating", tone: "danger" },
  identified: { label: "Identified", tone: "warning" },
  monitoring: { label: "Monitoring", tone: "info" },
  resolved: { label: "Resolved", tone: "success" },
};

interface TimelineEntry {
  id: string;
  time: string;
  source: ProductId | "note";
  text: string;
  detail?: string;
  author?: string;
}

const COMMANDER = PEOPLE[4];

const TIMELINE: TimelineEntry[] = [
  { id: "t1", time: "13:41:07", source: "vpn", text: "Sign-in for ben.ortiz from 198.51.100.201 after 3 failed TOTP attempts", detail: "New country for this user · client openvpn 2.6.12" },
  { id: "t2", time: "13:44:52", source: "siem", text: "Signal: SSH login from VPN address to api-prod-03 followed by curl | sh", detail: "Sigma: lnx_susp_curl_pipe_shell · score 87" },
  { id: "t3", time: "13:48:10", source: "infrastructure", text: "api-prod-03 CPU jumped from 38% to 97%", detail: "Container kworkerd (alpine:3.20) started outside the deploy pipeline" },
  { id: "t4", time: "13:49:30", source: "alerts", text: "Firing: Host CPU above 85% and orders-api p95 above SLO", detail: "Paged Payments and #ops-oncall" },
  { id: "t5", time: "13:51:02", source: "malware", text: "YARA XMRig_Miner matched /tmp/.x/kworkerd", detail: "SHA-256 9f1c…e04a · quarantined copy kept for analysis" },
  { id: "t6", time: "13:52:18", source: "note", text: "Declared incident, Ben Ortiz is commander. Isolating api-prod-03 from the load balancer.", author: COMMANDER },
  { id: "t7", time: "13:56:40", source: "runtime", text: "Blocked outbound to 203.0.113.181:3333 (stratum mining pool)", detail: "eBPF policy deny-mining-pools applied to role=api" },
];

const EVIDENCE: Array<{ kind: EntityKind; value: string; href: string; note: string }> = [
  { kind: "host", value: "api-prod-03", href: "#infrastructure/hosts/api-prod-03", note: "isolated" },
  { kind: "container", value: "kworkerd · 9c3e1d1f07a2", href: "#infrastructure/containers/9c3e1d1f07a2", note: "stopped" },
  { kind: "ip", value: "198.51.100.201", href: "#siem/entity/ip/198.51.100.201", note: "VPN source" },
  { kind: "ip", value: "203.0.113.181", href: "#siem/entity/ip/203.0.113.181", note: "mining pool" },
  { kind: "user", value: "ben.ortiz", href: "#identity/users/ben.ortiz", note: "sessions revoked" },
  { kind: "process", value: "/tmp/.x/kworkerd --donate-level=1", href: "#runtime/process/48211", note: "pid 48211" },
];

const TASKS = [
  { id: "k1", label: "Remove api-prod-03 from the load balancer", who: COMMANDER, done: true },
  { id: "k2", label: "Revoke VPN and SSH sessions for ben.ortiz", who: PEOPLE[1], done: true },
  { id: "k3", label: "Snapshot disk and memory for forensics", who: PEOPLE[2], done: false },
  { id: "k4", label: "Rotate secrets readable on api-prod-03", who: PEOPLE[5], done: false },
  { id: "k5", label: "Rebuild host from golden image", who: PEOPLE[2], done: false },
  { id: "k6", label: "Check other api-* hosts for the same IoCs", who: PEOPLE[7], done: false },
];

const RELATED: Array<{ id: ProductId; text: string }> = [
  { id: "alerts", text: "2 rules firing, 1 pending" },
  { id: "siem", text: "Signal #8841 · 14 correlated events" },
  { id: "malware", text: "1 detection, 1 file quarantined" },
  { id: "vpn", text: "Session from 198.51.100.201 ended" },
  { id: "infrastructure", text: "api-prod-03 isolated, 11 containers" },
  { id: "vulnerabilities", text: "CVE-2024-6387 open on this host" },
];

function SourceTag({ source }: { source: TimelineEntry["source"] }) {
  if (source === "note") {
    return (
      <Badge icon={<MessageSquarePlus aria-hidden className="size-3" />}>Note</Badge>
    );
  }
  const P = PRODUCTS[source];
  return <Badge icon={<P.icon aria-hidden className="size-3" />}>{P.name}</Badge>;
}

/* --------------------------------------------------------------- stories */

/** Detail of INC-142: timeline across products, evidence, tasks and related products. */
function DetailPage() {
  const [status, setStatus] = useState<IncStatus>("investigating");
  const [tasks, setTasks] = useState(TASKS);
  const [timeline, setTimeline] = useState(TIMELINE);
  const [note, setNote] = useState("");
  const done = tasks.filter((t) => t.done).length;
  const addNote = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    setTimeline((t) => [...t, { id: `n${t.length}`, time: "14:00:12", source: "note", text: note.trim(), author: PEOPLE[1] }]);
    setNote("");
  };
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Incidents", href: "#incidents" }, { label: "INC-142" }]}
        title="Crypto miner on api-prod-03"
        meta={
          <>
            <SeverityBadge severity="critical" />
            <StatusBadge tone={STATUS[status].tone}>{STATUS[status].label}</StatusBadge>
          </>
        }
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={COMMANDER} size="sm" />
              Commander {COMMANDER}
            </span>
            <span>
              Opened 13:52 · running <span className="font-mono text-fg">1 h 08 m</span>
            </span>
            <span>Customer impact: orders-api p95 above SLO</span>
          </span>
        }
        actions={
          <>
            <SegmentedControl<IncStatus>
              label="Incident status"
              value={status}
              onChange={setStatus}
              options={(Object.keys(STATUS) as IncStatus[]).map((s) => ({ value: s, label: STATUS[s].label }))}
            />
            <Button icon={<Users />}>Add responder</Button>
          </>
        }
      />
      {status === "resolved" && (
        <Callout tone="success" title="Resolved" action={<Button size="sm">Start postmortem</Button>}>
          Open tasks stay on the postmortem.
        </Callout>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="Timeline" description="Every product writes here; times in UTC+3">
          <ol aria-label="Incident timeline" className="relative flex flex-col">
            {timeline.map((e, i) => (
              <li key={e.id} className="relative grid grid-cols-[68px_16px_minmax(0,1fr)] gap-2 pb-3 last:pb-0">
                <span className="pt-0.5 text-right font-mono text-2xs text-fg-muted tabular-nums">{e.time}</span>
                <span aria-hidden className="relative flex justify-center">
                  <span className={cn("z-10 mt-1 size-2.5 rounded-full border-2 border-surface", e.source === "note" ? "bg-accent" : e.source === "malware" || e.source === "alerts" ? "bg-danger" : "bg-fg-subtle")} />
                  {i < timeline.length - 1 && <span className="absolute top-2 -bottom-3 w-px bg-line" />}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SourceTag source={e.source} />
                    {e.author && (
                      <span className="inline-flex items-center gap-1 text-xs text-fg-muted">
                        <Avatar name={e.author} size="sm" className="size-5" />
                        {e.author}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-fg">{e.text}</p>
                  {e.detail && <p className="text-xs text-fg-muted">{e.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
          <form onSubmit={addNote} className="mt-3 flex items-end gap-1.5 border-t border-line pt-3">
            <TextField label="Add a note to the timeline" value={note} onChange={(e) => setNote(e.target.value)} placeholder="What did you just learn or do?" className="grow" />
            <Button type="submit" variant="primary">
              Post
            </Button>
          </form>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Evidence" description="Follow any entity into its product">
            <ul aria-label="Evidence" className="flex flex-col gap-1.5">
              {EVIDENCE.map((ev) => (
                <li key={ev.value} className="flex items-center justify-between gap-2">
                  <EntityChip kind={ev.kind} value={ev.value} href={ev.href} className="min-w-0" />
                  <span className="shrink-0 text-2xs text-fg-muted">{ev.note}</span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel
            title="Tasks"
            actions={
              <Badge tone={done === tasks.length ? "success" : "neutral"} mono>
                {done} of {tasks.length} done
              </Badge>
            }
          >
            <ul aria-label="Tasks" className="flex flex-col gap-1.5">
              {tasks.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-2">
                  <Checkbox
                    label={<span className={cn(t.done && "text-fg-muted line-through")}>{t.label}</span>}
                    checked={t.done}
                    onChange={() => setTasks((xs) => xs.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)))}
                  />
                  <Avatar name={t.who} size="sm" className="size-5" />
                </li>
              ))}
            </ul>
            <Button size="sm" variant="ghost" icon={<Plus />} className="mt-1.5">
              Add task
            </Button>
          </Panel>
          <Panel title="Related products" flush>
            <ul className="flex flex-col">
              {RELATED.map((r) => {
                const P = PRODUCTS[r.id];
                return (
                  <li key={r.id} className="border-b border-subtle last:border-0">
                    <a href={`#${r.id}?incident=INC-142`} className="flex items-center gap-2 px-3 py-1.5 text-fg no-underline hover:bg-canvas">
                      <P.icon aria-hidden className="size-4 shrink-0 text-fg-muted" />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium">{P.name}</span>
                        <span className="truncate text-2xs text-fg-muted">{r.text}</span>
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
  
}

interface Incident {
  id: string;
  title: string;
  severity: Severity;
  status: IncStatus;
  commander: string;
  opened: string;
  openedSort: number;
  minutes: number;
  products: ProductId[];
}

const INCIDENTS: Incident[] = [
  { id: "INC-142", title: "Crypto miner on api-prod-03", severity: "critical", status: "investigating", commander: PEOPLE[4], opened: "Today 13:52", openedSort: 142, minutes: 68, products: ["malware", "siem", "vpn"] },
  { id: "INC-141", title: "orders-api p95 above SLO", severity: "high", status: "identified", commander: PEOPLE[3], opened: "Today 13:49", openedSort: 141, minutes: 71, products: ["metrics", "alerts"] },
  { id: "INC-140", title: "edge-fra-02 unreachable", severity: "medium", status: "monitoring", commander: PEOPLE[2], opened: "Today 11:20", openedSort: 140, minutes: 220, products: ["infrastructure"] },
  { id: "INC-139", title: "Leaked Stripe key in public gist", severity: "high", status: "resolved", commander: PEOPLE[1], opened: "Oct 17 16:04", openedSort: 139, minutes: 46, products: ["secrets"] },
  { id: "INC-138", title: "Billing worker queue lag 40k", severity: "medium", status: "resolved", commander: PEOPLE[6], opened: "Oct 15 09:31", openedSort: 138, minutes: 132, products: ["metrics", "logs"] },
  { id: "INC-137", title: "SQL injection on /search reported by DAST", severity: "critical", status: "resolved", commander: PEOPLE[0], opened: "Oct 12 22:10", openedSort: 137, minutes: 305, products: ["dast", "sast"] },
  { id: "INC-136", title: "VPN brute force from 203.0.113.0/24", severity: "low", status: "resolved", commander: PEOPLE[5], opened: "Oct 9 03:44", openedSort: 136, minutes: 28, products: ["vpn", "siem"] },
  { id: "INC-135", title: "Expired TLS certificate on status page", severity: "medium", status: "resolved", commander: PEOPLE[7], opened: "Oct 4 07:02", openedSort: 135, minutes: 54, products: ["infrastructure"] },
];

const dur = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} m` : `${m} m`);

const incidentColumns: Column<Incident>[] = [
  { id: "id", header: "ID", width: "84px", mono: true, sortValue: (i) => i.openedSort, cell: (i) => i.id },
  {
    id: "title",
    header: "Incident",
    width: "34%",
    sortValue: (i) => i.title,
    cell: (i) => (
      <span className="flex min-w-0 flex-col">
        <a href={`#incident/${i.id}`} className="truncate font-medium text-fg no-underline hover:underline">
          {i.title}
        </a>
        <span className="truncate text-2xs text-fg-muted">{i.products.map((p) => PRODUCTS[p].name).join(" · ")}</span>
      </span>
    ),
  },
  { id: "severity", header: "Severity", sortValue: (i) => ["info", "low", "medium", "high", "critical"].indexOf(i.severity), cell: (i) => <SeverityBadge severity={i.severity} /> },
  { id: "status", header: "Status", sortValue: (i) => Object.keys(STATUS).indexOf(i.status), cell: (i) => <StatusBadge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</StatusBadge> },
  {
    id: "commander",
    header: "Commander",
    sortValue: (i) => i.commander,
    cell: (i) => (
      <span className="flex items-center gap-1.5">
        <Avatar name={i.commander} size="sm" />
        <span className="truncate">{i.commander}</span>
      </span>
    ),
  },
  { id: "opened", header: "Opened", sortValue: (i) => i.openedSort, cell: (i) => <span className="text-xs whitespace-nowrap text-fg-muted">{i.opened}</span> },
  { id: "duration", header: "Duration", align: "right", mono: true, sortValue: (i) => i.minutes, cell: (i) => dur(i.minutes) },
];

/** List: open and past incidents with severity, status, commander and duration. */
function ListPage() {
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");
  const rows = INCIDENTS.filter((i) => (tab === "all" ? true : tab === "open" ? i.status !== "resolved" : i.status === "resolved"));
  return (
    <>
      <PageHeader
        title="Incidents"
        description="142 incidents since January · MTTR 1 h 52 m over 30 days"
        actions={
          <Button variant="primary" icon={<Siren />}>
            Declare incident
          </Button>
        }
      />
      <KpiGrid minWidth={170}>
        <KpiCard label="Open" value="3" tone="danger" delta={{ label: "1 critical", intent: "bad" }} />
        <KpiCard label="MTTA · 30 d" value="4 m" unit="12 s" delta={{ label: "−38 s", direction: "down", intent: "good" }} />
        <KpiCard label="MTTR · 30 d" value="1 h 52 m" delta={{ label: "+14 m", direction: "up", intent: "bad" }} />
        <KpiCard label="Postmortems due" value="2" unit="of 5" delta={{ label: "INC-137 overdue 2 d", intent: "bad" }} />
      </KpiGrid>
      <Panel flush>
        <div className="px-3 pt-2">
          <Tabs
            label="Incident filter"
            value={tab}
            onChange={setTab}
            items={[
              { value: "open", label: "Open", count: INCIDENTS.filter((i) => i.status !== "resolved").length },
              { value: "resolved", label: "Resolved", count: INCIDENTS.filter((i) => i.status === "resolved").length },
              { value: "all", label: "All", count: INCIDENTS.length },
            ]}
            className="border-b-0"
          />
        </div>
        <div className="border-t border-line">
          <DataTable label="Incidents" columns={incidentColumns} rows={rows} getRowId={(i) => i.id} defaultSort={{ id: "id", direction: "desc" }} minWidth={860} />
        </div>
      </Panel>
    </>
  );
  
}

/* ------------------------------------------------------------- postmortems */

interface Postmortem {
  id: string;
  incident: string;
  title: string;
  author: string;
  status: "draft" | "in review" | "published" | "overdue";
  due: string;
  summary: string;
  rootCause: string;
  actions: Array<{ id: string; text: string; owner: string; done: boolean }>;
}

const POSTMORTEMS: Postmortem[] = [
  {
    id: "pm-137",
    incident: "INC-137",
    title: "SQL injection on /search reported by DAST",
    author: PEOPLE[0],
    status: "overdue",
    due: "Oct 17",
    summary: "DAST found a time-based SQL injection in the search endpoint. No evidence of exploitation in 90 days of WAF and database logs.",
    rootCause: "A raw string concatenation in SearchRepository.byTerm bypassed the query builder. SAST rule was disabled for that module in 2024.",
    actions: [
      { id: "a1", text: "Parameterise SearchRepository.byTerm", owner: PEOPLE[0], done: true },
      { id: "a2", text: "Re-enable SAST rule sql-injection for search module", owner: PEOPLE[3], done: false },
      { id: "a3", text: "Add WAF virtual patch for /search?q= time-based payloads", owner: PEOPLE[4], done: true },
    ],
  },
  {
    id: "pm-139",
    incident: "INC-139",
    title: "Leaked Stripe key in public gist",
    author: PEOPLE[1],
    status: "in review",
    due: "Oct 24",
    summary: "A restricted Stripe key was pasted into a public gist while debugging. Secrets detected it within 6 minutes; the key was rolled after 46 minutes.",
    rootCause: "Local debugging script printed the full environment. No push protection for gists.",
    actions: [
      { id: "a1", text: "Roll the key and audit Stripe logs", owner: PEOPLE[1], done: true },
      { id: "a2", text: "Mask secrets in debug script output", owner: PEOPLE[6], done: false },
    ],
  },
  {
    id: "pm-138",
    incident: "INC-138",
    title: "Billing worker queue lag 40k",
    author: PEOPLE[6],
    status: "published",
    due: "Oct 22",
    summary: "A slow downstream tax API caused billing jobs to back up to 40k for 2 hours. No invoices were lost.",
    rootCause: "Retries without jitter amplified the downstream slowdown.",
    actions: [
      { id: "a1", text: "Add jittered backoff to tax client", owner: PEOPLE[6], done: true },
      { id: "a2", text: "Alert on queue depth > 5k for 5 min", owner: PEOPLE[2], done: true },
    ],
  },
  { id: "pm-136", incident: "INC-136", title: "VPN brute force from 203.0.113.0/24", author: PEOPLE[5], status: "draft", due: "Oct 30", summary: "Password spraying against the VPN; no successful logins.", rootCause: "Rate limiting was per IP, not per range.", actions: [{ id: "a1", text: "Rate limit per /24", owner: PEOPLE[5], done: false }] },
];

const PM_TONE = { draft: "neutral", "in review": "info", published: "success", overdue: "danger" } as const;

function PostmortemsPage() {
  const [active, setActive] = useState("pm-137");
  const [done, setDone] = useState<Record<string, boolean>>(Object.fromEntries(POSTMORTEMS.flatMap((p) => p.actions.map((a) => [`${p.id}:${a.id}`, a.done]))));
  const cur = POSTMORTEMS.find((p) => p.id === active);
  const cols: Column<Postmortem>[] = [
    { id: "incident", header: "Incident", mono: true, width: "84px", cell: (p) => p.incident },
    { id: "title", header: "Postmortem", width: "40%", cell: (p) => <span className="block truncate font-medium">{p.title}</span> },
    { id: "author", header: "Author", cell: (p) => <span className="text-xs">{p.author}</span> },
    { id: "status", header: "Status", cell: (p) => <StatusBadge tone={PM_TONE[p.status]}>{p.status}</StatusBadge> },
    { id: "due", header: "Due", cell: (p) => <span className="text-xs">{p.due}</span> },
  ];
  return (
    <>
      <PageHeader title="Postmortems" description="Blameless write-ups, due 5 working days after an incident is resolved. Timelines are prefilled from the incident." />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Postmortems" flush>
          <DataTable label="Postmortems" columns={cols} rows={POSTMORTEMS} getRowId={(p) => p.id} onRowClick={(p) => setActive(p.id)} activeRowId={active} minWidth={620} />
        </Panel>
        {cur && (
          <Panel title={cur.title} description={`${cur.incident} · by ${cur.author}`} aria-label="Postmortem" actions={<Badge tone={PM_TONE[cur.status]}>{cur.status}</Badge>}>
            <div className="flex flex-col gap-3 text-sm">
              <section className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold text-fg-muted uppercase">Summary</h3>
                <p>{cur.summary}</p>
              </section>
              <section className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold text-fg-muted uppercase">Root cause</h3>
                <p>{cur.rootCause}</p>
              </section>
              <section className="flex flex-col gap-1">
                <h3 className="text-xs font-semibold text-fg-muted uppercase">Action items</h3>
                <ul className="flex flex-col gap-1" aria-label="Action items">
                  {cur.actions.map((a) => (
                    <li key={a.id}>
                      <Checkbox
                        label={a.text}
                        description={a.owner}
                        checked={done[`${cur.id}:${a.id}`] ?? false}
                        onChange={(e) => setDone((d) => ({ ...d, [`${cur.id}:${a.id}`]: e.target.checked }))}
                      />
                    </li>
                  ))}
                </ul>
                <span className="text-xs text-fg-muted">
                  {cur.actions.filter((a) => done[`${cur.id}:${a.id}`]).length} of {cur.actions.length} done
                </span>
              </section>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- playbooks */

interface Playbook {
  id: string;
  name: string;
  trigger: string;
  steps: string[];
  runs: number;
  lastRun: string;
  owner: string;
}

const PLAYBOOKS: Playbook[] = [
  { id: "pb1", name: "Compromised host", trigger: "SIEM critical signal on a host", steps: ["Isolate host via Infrastructure", "Snapshot disk to Backups", "Revoke Access grants for the host", "Collect process tree from Runtime", "Page security on-call"], runs: 4, lastRun: "Today 13:53", owner: PEOPLE[4] },
  { id: "pb2", name: "Leaked secret", trigger: "Secrets verified finding", steps: ["Revoke or roll the secret", "Search logs for use of the secret", "Notify the repository owner", "Open postmortem"], runs: 7, lastRun: "Oct 17", owner: PEOPLE[1] },
  { id: "pb3", name: "SLO burn", trigger: "Alerts: fast burn on any SLO", steps: ["Post in #incidents", "Attach the last deploy diff", "Page service owner", "Update status page if customer-facing"], runs: 12, lastRun: "Today 13:49", owner: PEOPLE[3] },
  { id: "pb4", name: "Data exfiltration suspected", trigger: "Network IDS DNS tunnel or Cost egress anomaly", steps: ["Block destination at egress", "Identify data source via Network IDS flows", "Engage legal for GDPR Art. 33 assessment (72 h)", "Preserve evidence"], runs: 1, lastRun: "Sep 3", owner: PEOPLE[4] },
];

function PlaybooksPage() {
  const [active, setActive] = useState("pb1");
  const [ran, setRan] = useState<string | null>(null);
  const cur = PLAYBOOKS.find((p) => p.id === active);
  const cols: Column<Playbook>[] = [
    { id: "name", header: "Playbook", width: "28%", cell: (p) => <span className="font-medium">{p.name}</span> },
    { id: "trigger", header: "Starts when", width: "36%", cell: (p) => <span className="block truncate text-xs">{p.trigger}</span> },
    { id: "runs", header: "Runs · 90 d", align: "right", mono: true, cell: (p) => p.runs },
    { id: "last", header: "Last run", cell: (p) => <span className="text-xs">{p.lastRun}</span> },
  ];
  return (
    <>
      <PageHeader title="Playbooks" description="Checklists that start automatically when an incident matches. Automated steps run through Automation." actions={<Button variant="primary" icon={<Plus />}>New playbook</Button>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Playbooks" flush>
          <DataTable label="Playbooks" columns={cols} rows={PLAYBOOKS} getRowId={(p) => p.id} onRowClick={(p) => (setActive(p.id), setRan(null))} activeRowId={active} minWidth={720} />
        </Panel>
        {cur && (
          <Panel
            title={cur.name}
            description={`Owner ${cur.owner}`}
            aria-label="Playbook steps"
            actions={
              <Button size="sm" onClick={() => setRan(`${cur.name} started on INC-142`)}>
                Run on INC-142
              </Button>
            }
          >
            <ol aria-label={`Steps of ${cur.name}`} className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {cur.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
            {ran && (
              <p role="status" className="mt-2 text-xs text-success">
                {ran}
              </p>
            )}
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- status page */

type ComponentState = "operational" | "degraded" | "partial outage" | "major outage";

const COMPONENT_TONE: Record<ComponentState, Tone> = { operational: "success", degraded: "warning", "partial outage": "danger", "major outage": "critical" };

const COMPONENTS: Array<{ id: string; name: string; state: ComponentState; uptime: string }> = [
  { id: "web", name: "Website", state: "operational", uptime: "99.99%" },
  { id: "checkout", name: "Checkout", state: "degraded", uptime: "99.82%" },
  { id: "api", name: "Public API", state: "degraded", uptime: "99.85%" },
  { id: "dash", name: "Dashboard", state: "operational", uptime: "99.98%" },
  { id: "email", name: "Email delivery", state: "operational", uptime: "100%" },
];

function StatusPage() {
  const [states, setStates] = useState<Record<string, ComponentState>>(Object.fromEntries(COMPONENTS.map((c) => [c.id, c.state])));
  const [update, setUpdate] = useState("");
  const [updates, setUpdates] = useState([{ time: "13:58", status: "Identified", text: "Checkout is slower than usual. We have found the cause and are deploying a fix." }]);
  const post = (e: FormEvent) => {
    e.preventDefault();
    if (!update.trim()) return;
    setUpdates((u) => [{ time: "14:06", status: "Monitoring", text: update.trim() }, ...u]);
    setUpdate("");
  };
  return (
    <>
      <PageHeader title="Status page" description="status.example.com · 1,284 subscribers by email and RSS" meta={<StatusBadge tone="warning">Degraded performance</StatusBadge>} />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Components" description="What customers see" flush>
          <ul aria-label="Status components" className="flex flex-col">
            {COMPONENTS.map((c) => (
              <li key={c.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-2.5 border-b border-subtle px-3 py-2 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{c.name}</span>
                  <span className="text-2xs text-fg-muted">{c.uptime} · 90 d</span>
                </span>
                <StatusBadge tone={COMPONENT_TONE[states[c.id] ?? c.state]}>{states[c.id]}</StatusBadge>
                <SelectField
                  label={<span className="sr-only">State of {c.name}</span>}
                  value={states[c.id] ?? c.state}
                  onChange={(e) => setStates((s) => ({ ...s, [c.id]: e.target.value as ComponentState }))}
                  options={(Object.keys(COMPONENT_TONE) as ComponentState[]).map((v) => ({ value: v, label: v }))}
                />
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Updates" description="INC-141 · orders-api p95 above SLO">
          <form onSubmit={post} className="flex flex-col gap-2" aria-label="Post an update">
            <TextField label="New update" value={update} onChange={(e) => setUpdate(e.target.value)} placeholder="A fix has been deployed and we are monitoring." />
            <Button type="submit" size="sm" variant="primary" icon={<MessageSquarePlus />} className="self-start" disabled={!update.trim()}>
              Post update
            </Button>
          </form>
          <ol aria-label="Status updates" className="mt-2.5 flex flex-col gap-2 border-t border-line pt-2.5">
            {updates.map((u) => (
              <li key={u.time + u.text} className="flex flex-col gap-0.5 text-sm">
                <span className="text-xs text-fg-muted">
                  <span className="font-semibold text-fg">{u.status}</span> · {u.time}
                </span>
                <span>{u.text}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  open: () => <DetailPage />,
  all: () => <ListPage />,
  postmortems: () => <PostmortemsPage />,
  playbooks: () => <PlaybooksPage />,
  status: () => <StatusPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="incidents" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Detail: Story = {
  ...app("open"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Crypto miner on api-prod-03" })).toBeInTheDocument();

    // The timeline names the product behind each entry.
    const tl = c.getByRole("list", { name: "Incident timeline" });
    for (const name of ["VPN", "SIEM", "Infrastructure", "Alerts", "Malware"]) await expect(tl).toHaveTextContent(name);

    // Evidence chips link out.
    await expect(within(c.getByRole("list", { name: "Evidence" })).getByRole("link", { name: /198\.51\.100\.201/ })).toHaveAttribute("href", "#siem/entity/ip/198.51.100.201");

    // Tick a task.
    const task = c.getByRole("checkbox", { name: "Snapshot disk and memory for forensics" });
    await userEvent.click(task);
    await expect(task).toBeChecked();
    await expect(c.getByText("3 of 6 done")).toBeInTheDocument();

    // Post a note.
    await userEvent.type(c.getByRole("textbox", { name: "Add a note to the timeline" }), "Disk snapshot stored in forensics bucket");
    await userEvent.click(c.getByRole("button", { name: "Post" }));
    await expect(within(tl).getAllByRole("listitem")).toHaveLength(TIMELINE.length + 1);

    // Change status.
    await userEvent.click(c.getByRole("radio", { name: "Resolved" }));
    await expect(c.getByRole("status")).toHaveTextContent("Resolved");
  },
};

export const ListView: Story = {
  name: "List",
  ...app("all"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Incidents" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(3);
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("INC-142");
    await userEvent.click(c.getByRole("tab", { name: /All/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(INCIDENTS.length);
    await userEvent.click(within(table).getByRole("button", { name: /^Duration$/ }));
    await userEvent.click(within(table).getByRole("button", { name: /^Duration$/ }));
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("INC-136");
  },
};

export const Postmortems: Story = {
  ...app("postmortems"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("2 of 3 done")).toBeInTheDocument();
    await userEvent.click(c.getByRole("checkbox", { name: /Re-enable SAST rule/ }));
    await expect(c.getByText("3 of 3 done")).toBeInTheDocument();
  },
};

export const Playbooks: Story = {
  ...app("playbooks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Playbooks" })).getByText("Leaked secret"));
    await expect(within(c.getByRole("list", { name: "Steps of Leaked secret" })).getAllByRole("listitem")).toHaveLength(4);
    await userEvent.click(c.getByRole("button", { name: "Run on INC-142" }));
    await expect(c.getByText("Leaked secret started on INC-142")).toBeInTheDocument();
  },
};

export const StatusPageStory: Story = {
  name: "Status page",
  ...app("status"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "State of Checkout" }), "operational");
    await userEvent.type(c.getByRole("textbox", { name: "New update" }), "Fix deployed, latency back to normal.");
    await userEvent.click(c.getByRole("button", { name: "Post update" }));
    await expect(within(c.getByRole("list", { name: "Status updates" })).getAllByRole("listitem")).toHaveLength(2);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
