import { useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookOpen, FileText, Globe, List, MessageSquarePlus, Plus, Siren, Users } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, TextField } from "../../components/Controls";
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
  { id: "t1", time: "13:41:07", source: "vpn", text: "Sign-in for burak.oz from 198.51.100.201 after 3 failed TOTP attempts", detail: "New country for this user · client openvpn 2.6.12" },
  { id: "t2", time: "13:44:52", source: "siem", text: "Signal: SSH login from VPN address to api-prod-03 followed by curl | sh", detail: "Sigma: lnx_susp_curl_pipe_shell · score 87" },
  { id: "t3", time: "13:48:10", source: "infrastructure", text: "api-prod-03 CPU jumped from 38% to 97%", detail: "Container kworkerd (alpine:3.20) started outside the deploy pipeline" },
  { id: "t4", time: "13:49:30", source: "alerts", text: "Firing: Host CPU above 85% and orders-api p95 above SLO", detail: "Paged Payments and #ops-oncall" },
  { id: "t5", time: "13:51:02", source: "malware", text: "YARA XMRig_Miner matched /tmp/.x/kworkerd", detail: "SHA-256 9f1c…e04a · quarantined copy kept for analysis" },
  { id: "t6", time: "13:52:18", source: "note", text: "Declared incident, Burak Öz is commander. Isolating api-prod-03 from the load balancer.", author: COMMANDER },
  { id: "t7", time: "13:56:40", source: "runtime", text: "Blocked outbound to 203.0.113.181:3333 (stratum mining pool)", detail: "eBPF policy deny-mining-pools applied to role=api" },
];

const EVIDENCE: Array<{ kind: EntityKind; value: string; href: string; note: string }> = [
  { kind: "host", value: "api-prod-03", href: "#infrastructure/hosts/api-prod-03", note: "isolated" },
  { kind: "container", value: "kworkerd · 9c3e1d1f07a2", href: "#infrastructure/containers/9c3e1d1f07a2", note: "stopped" },
  { kind: "ip", value: "198.51.100.201", href: "#siem/entity/ip/198.51.100.201", note: "VPN source" },
  { kind: "ip", value: "203.0.113.181", href: "#siem/entity/ip/203.0.113.181", note: "mining pool" },
  { kind: "user", value: "burak.oz", href: "#identity/users/burak.oz", note: "sessions revoked" },
  { kind: "process", value: "/tmp/.x/kworkerd --donate-level=1", href: "#runtime/process/48211", note: "pid 48211" },
];

const TASKS = [
  { id: "k1", label: "Remove api-prod-03 from the load balancer", who: COMMANDER, done: true },
  { id: "k2", label: "Revoke VPN and SSH sessions for burak.oz", who: PEOPLE[1], done: true },
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
export const Detail: Story = {
  render: () => {
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
      <ProductFrame product="incidents" nav={nav} active="open">
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
      </ProductFrame>
    );
  },
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
export const ListView: Story = {
  name: "List",
  render: () => {
    const [tab, setTab] = useState<"open" | "resolved" | "all">("open");
    const rows = INCIDENTS.filter((i) => (tab === "all" ? true : tab === "open" ? i.status !== "resolved" : i.status === "resolved"));
    return (
      <ProductFrame product="incidents" nav={nav} active="all">
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
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Incidents" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(3);
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("INC-142");
    await userEvent.click(c.getByRole("tab", { name: /All/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(INCIDENTS.length);
    await userEvent.click(within(table).getByRole("button", { name: /Duration/ }));
    await userEvent.click(within(table).getByRole("button", { name: /Duration/ }));
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("INC-136");
  },
};
