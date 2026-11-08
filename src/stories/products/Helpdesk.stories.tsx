import { useId, useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  ExternalLink,
  FileSearch,
  Inbox,
  LayoutDashboard,
  Lock,
  Mail,
  MessageCircle,
  Paperclip,
  SendHorizontal,
  UserCheck,
} from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput, SelectField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { Heatmap } from "../../charts/Heatmap";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import { wave } from "../mocks";

// Helpdesk turns emails, forms and chats into tickets in queues, with owners, SLAs and replies from the support
// address, and shows the customer's profile and deals from CRM beside each ticket. Queues, routing rules and SLAs are
// set in helpdesk.yaml. Acme sells Acme Books, an online accounting app with e-Fatura.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "queue", label: "Queues", icon: Inbox, count: 6 },
  { id: "reports", label: "Reports", icon: BarChart3 },
];

const meta = {
  title: "Products/Helpdesk",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
type Channel = "email" | "form" | "chat";
type Status = "open" | "waiting" | "solved";
type Priority = "urgent" | "high" | "normal" | "low";

const CHANNEL: Record<Channel, { label: string; icon: typeof Mail }> = {
  email: { label: "Email", icon: Mail },
  form: { label: "Form", icon: ClipboardList },
  chat: { label: "Chat", icon: MessageCircle },
};

const PRIORITY: Record<Priority, { label: string; tone: Tone }> = {
  urgent: { label: "Urgent", tone: "danger" },
  high: { label: "High", tone: "warning" },
  normal: { label: "Normal", tone: "neutral" },
  low: { label: "Low", tone: "neutral" },
};

interface TicketRow {
  id: string;
  subject: string;
  customer: string;
  company: string;
  queue: string;
  channel: Channel;
  status: Status;
  priority: Priority;
  owner: string | null;
  /** Minutes until the SLA clock runs out; negative once missed, null while paused. */
  due: number | null;
  sla: "First reply" | "Solution";
  updated: string;
}

const TICKETS: TicketRow[] = [
  {
    id: "4821",
    subject: "Invoices fail to send since this morning",
    customer: "Gizem Avcı",
    company: "Avcı Lojistik",
    queue: "Billing",
    channel: "email",
    status: "open",
    priority: "high",
    owner: null,
    due: 132,
    sla: "First reply",
    updated: "10:48",
  },
  {
    id: "4814",
    subject: "Wrong VAT rate on an export invoice",
    customer: "Murat Kılıç",
    company: "Kılıç Ticaret",
    queue: "Billing",
    channel: "form",
    status: "open",
    priority: "normal",
    owner: "Mehmet Demir",
    due: -12,
    sla: "Solution",
    updated: "Yesterday",
  },
  {
    id: "4820",
    subject: "Cannot connect our Garanti BBVA account",
    customer: "Seda Polat",
    company: "Polat Gıda",
    queue: "Technical",
    channel: "email",
    status: "open",
    priority: "normal",
    owner: "Can Öztürk",
    due: 48,
    sla: "Solution",
    updated: "10:31",
  },
  {
    id: "4819",
    subject: "Can invoices be in English for a foreign buyer?",
    customer: "Okan Tekin",
    company: "Tekin Yapı",
    queue: "Sales questions",
    channel: "chat",
    status: "open",
    priority: "normal",
    owner: null,
    due: 205,
    sla: "First reply",
    updated: "09:58",
  },
  {
    id: "4818",
    subject: "Charged twice for October",
    customer: "Kerem Aksoy",
    company: "Aksoy Danışmanlık",
    queue: "Billing",
    channel: "email",
    status: "waiting",
    priority: "high",
    owner: "Elif Kaya",
    due: null,
    sla: "Solution",
    updated: "Yesterday",
  },
  {
    id: "4817",
    subject: "e-Arşiv cancel button is greyed out",
    customer: "Nihan Er",
    company: "Er Turizm",
    queue: "Technical",
    channel: "form",
    status: "open",
    priority: "urgent",
    owner: "Can Öztürk",
    due: 22,
    sla: "Solution",
    updated: "09:12",
  },
  {
    id: "4816",
    subject: "Laptop and accounts for a new hire on Monday",
    customer: "Burak Şahin",
    company: "Acme (internal)",
    queue: "IT",
    channel: "form",
    status: "open",
    priority: "normal",
    owner: "Deniz Çelik",
    due: 1320,
    sla: "Solution",
    updated: "6 Nov",
  },
  {
    id: "4812",
    subject: "Change our plan to Business",
    customer: "Hakan Yıldız",
    company: "Yıldız Mimarlık",
    queue: "Sales questions",
    channel: "form",
    status: "solved",
    priority: "low",
    owner: "Elif Kaya",
    due: null,
    sla: "Solution",
    updated: "5 Nov",
  },
];

const QUEUES = ["All queues", "Billing", "Technical", "Sales questions", "IT"];

function dueText(t: TicketRow) {
  if (t.status === "solved") return { text: "Solved", tone: "success" as Tone };
  if (t.due === null) return { text: "Paused, waiting on customer", tone: "neutral" as Tone };
  if (t.due < 0) return { text: `${t.sla} missed ${-t.due} min ago`, tone: "danger" as Tone };
  const h = Math.floor(t.due / 60);
  const m = t.due % 60;
  const left = h ? `${h} h ${m} min` : `${m} min`;
  return { text: `${t.sla} in ${left}`, tone: (t.due < 60 ? "warning" : "neutral") as Tone };
}

/* -------------------------------------------------------------- overview */

const DAYS = Array.from({ length: 30 }, (_, i) =>
  new Date(Date.UTC(2026, 9, 9 + i)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
);

function OverviewPage() {
  const atRisk = TICKETS.filter((t) => t.status === "open" && t.due !== null && t.due < 60).sort((a, b) => a.due! - b.due!);
  return (
    <>
      <PageHeader
        title="Overview"
        description="Every queue, today and the last 30 days. SLA clocks run in each queue's working hours and pause while waiting on the customer."
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="Open tickets" value="6" icon={Inbox} delta={{ label: "2 not assigned", intent: "neutral" }} />
        <KpiCard
          label="First reply"
          value="38"
          unit="min median"
          delta={{ label: "-9 min vs. last week", direction: "down", intent: "good" }}
          trend={wave(14, { base: 44, amp: 8, seed: 6 })}
        />
        <KpiCard label="SLAs met" value="94.2%" delta={{ label: "11 missed in 30 days", intent: "neutral" }} />
        <KpiCard label="Missed now" value="1" tone="danger" delta={{ label: "#4814, Billing", intent: "bad" }} />
        <KpiCard label="Satisfaction" value="4.6" unit="of 5" delta={{ label: "from 212 answers", intent: "neutral" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Tickets per day" description="Opened and solved, the last 30 days">
          <TimeSeriesChart
            label="Tickets opened and solved per day"
            labels={DAYS}
            height={200}
            area={false}
            series={[
              { id: "opened", name: "Opened", data: wave(30, { base: 62, amp: 18, seed: 21 }), color: "var(--oa-chart-1)" },
              { id: "solved", name: "Solved", data: wave(30, { base: 58, amp: 16, seed: 22, phase: 0.4 }), color: "var(--oa-success)" },
            ]}
          />
        </Panel>
        <Panel title="Open by queue">
          <BarList
            label="Open tickets by queue"
            items={[
              { id: "billing", label: "Billing", value: 2 },
              { id: "technical", label: "Technical", value: 2 },
              { id: "sales", label: "Sales questions", value: 1 },
              { id: "it", label: "IT", value: 1 },
            ]}
          />
        </Panel>
      </div>
      <Panel title="SLAs about to run out" description="Under an hour left, or missed" flush>
        <ul aria-label="SLAs about to run out" className="flex flex-col">
          {atRisk.map((t) => {
            const d = dueText(t);
            return (
              <li key={t.id} className="flex items-center gap-3 border-b border-subtle px-3 py-2 last:border-0">
                <span className="w-12 font-mono text-xs text-fg-muted">#{t.id}</span>
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-sm text-fg">{t.subject}</span>
                  <span className="text-2xs text-fg-muted">
                    {t.queue} · {t.owner ?? "Not assigned"}
                  </span>
                </span>
                <StatusBadge tone={d.tone}>{d.text}</StatusBadge>
              </li>
            );
          })}
        </ul>
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- ticket */

interface Message {
  id: string;
  from: string;
  role: "customer" | "agent" | "note" | "system";
  at: string;
  text: string;
}

const THREAD: Message[] = [
  {
    id: "m1",
    from: "Helpdesk",
    role: "system",
    at: "08:36",
    text: "Opened from an email to support@example.com. Routed to Billing by the rule plan: Business; SLA first reply 4 h, solution 1 day.",
  },
  {
    id: "m2",
    from: "Gizem Avcı",
    role: "customer",
    at: "08:36",
    text: "Since this morning none of our invoices go out. Each one says Rejected by GİB, code 1150. We have 40 invoices to send today, our customers are waiting.",
  },
  {
    id: "m3",
    from: "Can Öztürk",
    role: "note",
    at: "08:52",
    text: "Three more Business customers report code 1150 since 08:00. Looks like the integrator's certificate change last night; I asked them.",
  },
];

const SAVED = [
  { value: "", label: "Saved answers" },
  { value: "gib-1150", label: "GİB rejection 1150: certificate renewed" },
  { value: "thanks", label: "Thanks, closing the ticket" },
];

function Composer({ onSend }: { onSend: (text: string, note: boolean) => void }) {
  const id = useId();
  const [mode, setMode] = useState<"reply" | "note">("reply");
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim(), mode === "note");
    setText("");
  };
  return (
    <form onSubmit={submit} aria-label="Answer" className="flex flex-col gap-1.5 border-t border-line p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs
          label="Answer as"
          value={mode}
          onChange={setMode}
          items={[
            { value: "reply", label: "Reply to Gizem Avcı" },
            { value: "note", label: "Internal note" },
          ]}
          className="border-b-0"
        />
        <SelectField
          aria-label="Saved answers"
          value=""
          onChange={(e) =>
            e.target.value === "gib-1150" &&
            setText(
              "Hello Gizem, the e-Fatura integrator renewed its certificate last night and GİB rejected invoices signed with the old one. It is fixed since 10:40; please send the invoices again from Invoices, Rejected, Send again.",
            )
          }
          options={SAVED}
          className="w-64"
        />
      </div>
      <div
        className={cn(
          "flex flex-col rounded-md border bg-surface focus-within:border-accent",
          mode === "note" ? "border-warning bg-warning-soft" : "border-line",
        )}
      >
        <label htmlFor={id} className="sr-only">
          {mode === "note" ? "Note" : "Reply"}
        </label>
        <textarea
          id={id}
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={mode === "note" ? "Only the team sees this" : "Sent from support@example.com"}
          className="w-full resize-none bg-transparent px-2.5 pt-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <span className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <IconButton label="Attach a file" size="xs">
            <Paperclip className="size-3.5" />
          </IconButton>
          <span className="grow" />
          <Button type="submit" size="xs" variant="primary" icon={mode === "note" ? <Lock /> : <SendHorizontal />}>
            {mode === "note" ? "Add note" : "Send"}
          </Button>
        </span>
      </div>
    </form>
  );
}

function TicketView({ ticket, onBack }: { ticket: TicketRow; onBack: () => void }) {
  const [thread, setThread] = useState(THREAD);
  const [owner, setOwner] = useState(ticket.owner ?? "");
  const [status, setStatus] = useState<Status>(ticket.status);
  const [priority, setPriority] = useState<Priority>(ticket.priority);
  const [notice, setNotice] = useState<string | null>(null);
  const replied = thread.some((m) => m.role === "agent");
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Queues", href: "#queue" }, { label: ticket.queue }, { label: `#${ticket.id}` }]}
        title={ticket.subject}
        meta={
          <StatusBadge tone={status === "solved" ? "success" : status === "waiting" ? "neutral" : "info"}>
            {status === "open" ? "Open" : status === "waiting" ? "Waiting on customer" : "Solved"}
          </StatusBadge>
        }
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onBack}>
              Back to the queue
            </Button>
            {status !== "solved" && (
              <Button variant="primary" onClick={() => (setStatus("solved"), setNotice(`#${ticket.id} solved. Gizem Avcı is asked how it went.`))}>
                Mark solved
              </Button>
            )}
          </>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush aria-label="Conversation">
          <ol aria-label="Thread" className="flex flex-col gap-2 p-3">
            {thread.map((m) =>
              m.role === "system" ? (
                <li key={m.id} className="text-center text-2xs text-fg-muted">
                  {m.at} · {m.text}
                </li>
              ) : (
                <li
                  key={m.id}
                  className={cn(
                    "flex gap-2 rounded-md border p-2.5",
                    m.role === "note" ? "border-warning/40 bg-warning-soft" : m.role === "agent" ? "border-accent/25 bg-accent-soft" : "border-line bg-surface",
                  )}
                >
                  <Avatar name={m.from} size="sm" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="flex flex-wrap items-baseline gap-x-2 text-xs">
                      <span className="font-semibold text-fg">{m.from}</span>
                      <span className="text-fg-muted">
                        {m.role === "note" ? "Internal note" : m.role === "agent" ? "Reply from support@example.com" : "Customer"}
                      </span>
                      <span className="text-fg-muted">{m.at}</span>
                    </span>
                    <span className="text-sm text-fg">{m.text}</span>
                  </span>
                </li>
              ),
            )}
          </ol>
          <Composer
            onSend={(text, note) => {
              setThread((t) => [...t, { id: `m${t.length + 1}`, from: ME, role: note ? "note" : "agent", at: "14:05", text }]);
              if (!owner) setOwner(ME);
              if (!note) {
                setStatus("waiting");
                setNotice(`Reply sent to gizem@avcilojistik.example.com from support@example.com. The SLA clock pauses until Gizem Avcı answers.`);
              }
            }}
          />
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Customer" description="From CRM, matched by email" aria-label="Customer">
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-2">
                <Avatar name={ticket.customer} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-fg">{ticket.customer}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">gizem@avcilojistik.example.com</span>
                </span>
              </span>
              <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1">
                <dt className="text-fg-muted">Company</dt>
                <dd className="text-fg">{ticket.company}, 48 users</dd>
                <dt className="text-fg-muted">Plan</dt>
                <dd className="text-fg">Business, renews 31 Dec</dd>
                <dt className="text-fg-muted">Open deal</dt>
                <dd className="font-medium text-fg">Renewal and 20 more users · 300,000 TL · Proposal</dd>
                <dt className="text-fg-muted">Account owner</dt>
                <dd className="text-fg">Hakan Yıldız</dd>
                <dt className="text-fg-muted">Tickets</dt>
                <dd className="text-fg">7 this year, 1 open</dd>
              </dl>
              <Button size="xs" variant="ghost" icon={<ExternalLink />} className="self-start">
                Open in CRM
              </Button>
            </div>
          </Panel>
          <Panel title="SLA" aria-label="SLA">
            <ul className="flex flex-col gap-1.5 text-xs">
              <li className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">First reply, 4 h</span>
                {replied ? <StatusBadge tone="success">Met at 14:05</StatusBadge> : <StatusBadge tone="neutral">2 h 12 min left</StatusBadge>}
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-fg-muted">Solution, 1 day</span>
                <StatusBadge tone="neutral">{status === "waiting" ? "Paused" : status === "solved" ? "Met" : "Due tomorrow 08:36"}</StatusBadge>
              </li>
            </ul>
            <p className="mt-2 text-2xs text-fg-muted">Billing works 09:00 to 18:00 on weekdays; the clock stops outside them.</p>
          </Panel>
          <Panel title="Ticket" aria-label="Ticket properties">
            <div className="flex flex-col gap-2">
              <SelectField
                label="Owner"
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                options={[{ value: "", label: "Not assigned" }, ...[ME, "Elif Kaya", "Mehmet Demir", "Can Öztürk"].map((n) => ({ value: n, label: n }))]}
              />
              <SelectField
                label="Priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                options={(Object.keys(PRIORITY) as Priority[]).map((p) => ({ value: p, label: PRIORITY[p].label }))}
              />
              <p className="text-2xs text-fg-muted">Queue Billing, set by the rule in helpdesk.yaml. Moving it to another queue starts that queue's SLA.</p>
            </div>
          </Panel>
          <Panel title="Suggested articles" description="From Knowledge Base">
            <ul aria-label="Suggested articles" className="flex flex-col gap-1">
              {["Send your first e-Fatura", "Why GİB rejects an invoice"].map((a) => (
                <li key={a} className="flex items-center gap-2 text-sm">
                  <FileSearch aria-hidden className="size-3.5 shrink-0 text-accent" />
                  <span className="truncate text-fg">{a}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- queue */

function QueuePage({ initialTicket }: { initialTicket?: string }) {
  const [open, setOpen] = useState<string | null>(initialTicket ?? null);
  const [rows, setRows] = useState(TICKETS);
  const [queue, setQueue] = useState("All queues");
  const [status, setStatus] = useState<Status>("open");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const ticket = rows.find((t) => t.id === open);
  if (ticket) return <TicketView ticket={ticket} onBack={() => setOpen(null)} />;
  const inQueue = rows.filter((t) => queue === "All queues" || t.queue === queue);
  const shown = inQueue.filter(
    (t) => t.status === status && `#${t.id} ${t.subject} ${t.customer} ${t.company}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  const cols: Column<TicketRow>[] = [
    { id: "id", header: "#", mono: true, width: "64px", cell: (t) => <span className="text-xs">{t.id}</span> },
    {
      id: "subject",
      header: "Subject",
      width: "34%",
      cell: (t) => {
        const C = CHANNEL[t.channel];
        return (
          <span className="flex min-w-0 items-center gap-2">
            <C.icon aria-label={C.label} className="size-3.5 shrink-0 text-fg-muted" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{t.subject}</span>
              <span className="truncate text-2xs text-fg-muted">
                {t.customer} · {t.company}
              </span>
            </span>
          </span>
        );
      },
    },
    { id: "queue", header: "Queue", cell: (t) => <span className="text-xs">{t.queue}</span> },
    {
      id: "priority",
      header: "Priority",
      sortValue: (t) => ["urgent", "high", "normal", "low"].indexOf(t.priority),
      cell: (t) => <Badge tone={PRIORITY[t.priority].tone}>{PRIORITY[t.priority].label}</Badge>,
    },
    {
      id: "sla",
      header: "SLA",
      sortValue: (t) => t.due ?? 99999,
      cell: (t) => {
        const d = dueText(t);
        return <StatusBadge tone={d.tone}>{d.text}</StatusBadge>;
      },
    },
    {
      id: "owner",
      header: "Owner",
      cell: (t) =>
        t.owner ? (
          <span className="flex items-center gap-1.5">
            <Avatar name={t.owner} size="sm" className="size-5" />
            <span className="truncate text-xs">{t.owner}</span>
          </span>
        ) : (
          <span className="text-xs text-fg-muted">Not assigned</span>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Queues"
        description="Open tickets with their SLAs. A ticket goes to the first queue whose rule in helpdesk.yaml matches its address, form or customer."
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[200px_minmax(0,1fr)]">
        <Panel flush aria-label="Queues">
          <ul className="flex flex-col py-1">
            {QUEUES.map((q) => {
              const n = rows.filter((t) => t.status === "open" && (q === "All queues" || t.queue === q)).length;
              return (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => (setQueue(q), setSelected([]))}
                    aria-current={q === queue ? "true" : undefined}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
                      q === queue ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas",
                    )}
                  >
                    <span className="truncate">{q}</span>
                    <span className="text-2xs text-fg-muted tabular-nums">{n}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel flush aria-label="Tickets">
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2">
            <Tabs
              label="Status"
              value={status}
              onChange={(s) => (setStatus(s), setSelected([]))}
              items={[
                { value: "open", label: "Open", count: inQueue.filter((t) => t.status === "open").length },
                { value: "waiting", label: "Waiting on customer", count: inQueue.filter((t) => t.status === "waiting").length },
                { value: "solved", label: "Solved", count: inQueue.filter((t) => t.status === "solved").length },
              ]}
              className="border-b-0"
            />
            <span className="flex items-center gap-2 pb-1.5">
              {selected.length > 0 && (
                <Button
                  size="sm"
                  icon={<UserCheck />}
                  onClick={() => {
                    setRows((rs) => rs.map((t) => (selected.includes(t.id) ? { ...t, owner: ME } : t)));
                    setNotice(`${selected.length} ${selected.length === 1 ? "ticket" : "tickets"} assigned to ${ME}.`);
                    setSelected([]);
                  }}
                >
                  Assign {selected.length} to me
                </Button>
              )}
              <SearchInput
                label="Search tickets"
                placeholder="Number, subject or customer"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-56"
              />
            </span>
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Tickets"
              columns={cols}
              rows={shown}
              getRowId={(t) => t.id}
              selectable
              selectedIds={selected}
              onSelectionChange={setSelected}
              onRowClick={(t) => setOpen(t.id)}
              defaultSort={{ id: "sla", direction: "asc" }}
              minWidth={860}
              empty="No tickets here."
            />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- reports */

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOURS = ["08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19"];
const LOAD = WEEKDAYS.map((_, d) =>
  HOURS.map((_, h) => Math.max(0, Math.round((d < 5 ? 9 : 2) + Math.sin((h / 11) * Math.PI) * (d < 5 ? 8 : 2) + (d === 0 && h < 4 ? 6 : 0)))),
);

const BY_QUEUE = [
  { id: "billing", queue: "Billing", tickets: 612, firstReply: "31 min", solve: "5 h 20 min", met: 92.1, csat: 4.5 },
  { id: "technical", queue: "Technical", tickets: 548, firstReply: "44 min", solve: "9 h 05 min", met: 95.3, csat: 4.6 },
  { id: "sales", queue: "Sales questions", tickets: 301, firstReply: "18 min", solve: "1 h 40 min", met: 98.7, csat: 4.8 },
  { id: "it", queue: "IT", tickets: 96, firstReply: "1 h 10 min", solve: "1 day 2 h", met: 90.6, csat: 4.4 },
];

function ReportsPage() {
  const cols: Column<(typeof BY_QUEUE)[number]>[] = [
    { id: "queue", header: "Queue", cell: (q) => <span className="font-medium">{q.queue}</span> },
    { id: "tickets", header: "Tickets", align: "right", mono: true, sortValue: (q) => q.tickets, cell: (q) => q.tickets },
    { id: "first", header: "First reply, median", align: "right", cell: (q) => <span className="text-xs">{q.firstReply}</span> },
    { id: "solve", header: "Solved in, median", align: "right", cell: (q) => <span className="text-xs">{q.solve}</span> },
    {
      id: "met",
      header: "SLAs met",
      align: "right",
      sortValue: (q) => q.met,
      cell: (q) => <span className={cn("font-mono text-xs", q.met < 92 && "font-semibold text-warning-text")}>{q.met}%</span>,
    },
    { id: "csat", header: "Satisfaction", align: "right", mono: true, sortValue: (q) => q.csat, cell: (q) => `${q.csat} / 5` },
  ];
  return (
    <>
      <PageHeader title="Reports" description="The last 90 days, by queue. Times count in each queue's working hours." />
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="When tickets arrive" description="Average per hour, by weekday">
          <Heatmap label="Tickets per hour by weekday" rows={WEEKDAYS} columns={HOURS} values={LOAD} unit=" tickets" />
        </Panel>
        <Panel title="Where tickets come from" description="90 days">
          <BarList
            label="Tickets by channel"
            items={[
              { id: "email", label: "Email to support@", value: 1004 },
              { id: "form", label: "Forms", value: 338 },
              { id: "chat", label: "Live Chat", value: 215 },
            ]}
          />
          <Callout tone="info" title="Monday mornings carry the week" className="mt-3">
            Billing gets a third of its tickets between 08:00 and 12:00 on Mondays, when invoices from the weekend go out.
          </Callout>
        </Panel>
      </div>
      <Panel flush title="By queue">
        <DataTable label="By queue" columns={cols} rows={BY_QUEUE} getRowId={(q) => q.id} minWidth={720} />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `addresses:
  - support@example.com      # on Mail
  - it@example.com
queues:
  billing:
    match: { subject_has: [fatura, invoice, charge, refund] }
    hours: weekdays 09:00-18:00
    sla: { first_reply: 4h, solution: 1d }
    sla_by_plan: { Business: { first_reply: 2h } }
  technical:
    match: { form: bug-report }
    hours: weekdays 09:00-18:00
    sla: { first_reply: 4h, solution: 2d }
  sales:
    name: Sales questions
    match: { channel: chat }
    sla: { first_reply: 4h, solution: 1d }
  it:
    name: IT
    match: { address: it@example.com }
    group: it-team
    sla: { solution: 3d }
satisfaction:
  ask_after_solved: 1h`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="helpdesk"
      file="helpdesk.yaml"
      applied="3 days ago"
      yaml={YAML}
      groups={[
        {
          title: "Addresses",
          items: [
            { label: "Support", value: <span className="font-mono">support@example.com</span>, path: "addresses[0]" },
            { label: "Internal IT", value: <span className="font-mono">it@example.com</span>, path: "addresses[1]" },
          ],
        },
        {
          title: "Queues and SLAs",
          description: "A ticket goes to the first queue whose rule matches.",
          items: [
            { label: "Billing", value: "First reply 4 h (Business 2 h), solution 1 day; weekdays 09:00 to 18:00", path: "queues.billing" },
            { label: "Technical", value: "First reply 4 h, solution 2 days", path: "queues.technical" },
            { label: "Sales questions", value: "Chats; first reply 4 h, solution 1 day", path: "queues.sales" },
            { label: "IT", value: "it@example.com, group it-team; solution 3 days", path: "queues.it" },
          ],
        },
        {
          title: "Satisfaction",
          items: [{ label: "Ask", value: "One hour after a ticket is solved", path: "satisfaction.ask_after_solved" }],
        },
      ]}
    />
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  queue: () => <QueuePage />,
  reports: () => <ReportsPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string, pages: PageMap = PAGES): Story => ({
  render: () => <ProductApp product="helpdesk" nav={nav} pages={pages} initial={initial} />,
});

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const risk = c.getByRole("list", { name: "SLAs about to run out" });
    await expect(within(risk).getAllByRole("listitem")[0]).toHaveTextContent("Solution missed 12 min ago");
  },
};

export const Queue: Story = {
  ...app("queue"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Tickets" });
    // Sorted by the SLA that runs out first: the missed one on top.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("missed 12 min ago");
    await userEvent.click(within(c.getByRole("region", { name: "Queues" })).getByRole("button", { name: /^Billing/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await userEvent.click(c.getByRole("tab", { name: /Waiting on customer/ }));
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Paused, waiting on customer");
    await userEvent.click(c.getByRole("tab", { name: /^Open/ }));
    blur(canvasElement);
  },
};

export const AssignToMe: Story = {
  name: "Assign to me",
  ...app("queue"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Tickets" });
    const row = within(table).getByText("Invoices fail to send since this morning").closest("tr")!;
    await userEvent.click(within(row).getByRole("checkbox"));
    await userEvent.click(c.getByRole("button", { name: "Assign 1 to me" }));
    await expect(c.getByRole("status")).toHaveTextContent("1 ticket assigned to Emily Clark.");
    await expect(within(table).getByText("Invoices fail to send since this morning").closest("tr")).toHaveTextContent("Emily Clark");
  },
};

const TICKET_PAGES = { ...PAGES, queue: () => <QueuePage initialTicket="4821" /> };

export const Ticket: Story = {
  name: "Ticket",
  ...app("queue", TICKET_PAGES),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Invoices fail to send since this morning" })).toBeInTheDocument();
    await expect(c.getByRole("region", { name: "Customer" })).toHaveTextContent("300,000 TL");
    await expect(within(c.getByRole("list", { name: "Thread" })).getAllByRole("listitem")).toHaveLength(3);
  },
};

export const Reply: Story = {
  name: "Reply to the customer",
  ...app("queue", TICKET_PAGES),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Saved answers" }), "gib-1150");
    await expect((c.getByRole("textbox", { name: "Reply" }) as HTMLTextAreaElement).value).toContain("renewed its certificate");
    await userEvent.click(c.getByRole("button", { name: "Send" }));
    await expect(c.getByRole("status")).toHaveTextContent("Reply sent to gizem@avcilojistik.example.com from support@example.com.");
    await expect(within(c.getByRole("list", { name: "Thread" })).getAllByRole("listitem")).toHaveLength(4);
    await expect(c.getByRole("region", { name: "SLA" })).toHaveTextContent("Met at 14:05");
    await expect(c.getByRole("combobox", { name: "Owner" })).toHaveValue("Emily Clark");
  },
};

export const InternalNote: Story = {
  name: "Add an internal note",
  ...app("queue", TICKET_PAGES),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: "Internal note" }));
    await userEvent.type(c.getByRole("textbox", { name: "Note" }), "Integrator confirmed the fix at 10:40.");
    await userEvent.click(c.getByRole("button", { name: "Add note" }));
    const thread = within(c.getByRole("list", { name: "Thread" })).getAllByRole("listitem");
    await expect(thread.at(-1)).toHaveTextContent("Internal note");
    await expect(c.getByRole("region", { name: "SLA" })).toHaveTextContent("2 h 12 min left");
    blur(canvasElement);
  },
};

export const Reports: Story = {
  ...app("reports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "By queue" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(4);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("helpdesk.yaml as applied")).toHaveTextContent("sla_by_plan");
  },
};
