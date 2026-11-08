import { useId, useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  AppWindow,
  Copy,
  FileSearch,
  Globe,
  Handshake,
  LayoutDashboard,
  LifeBuoy,
  MessageCircle,
  MessagesSquare,
  Monitor,
  MoonStar,
  Paperclip,
  SendHorizontal,
  Smartphone,
  X,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SelectField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { timeLabels, wave } from "../mocks";

// Live Chat: a chat window on the website from one script tag, answered by the team in the browser, with the
// visitor's pages from Analytics beside the conversation. Outside working hours the window offers a form, and the
// question becomes a ticket in Helpdesk. Hours, teams and colours are set in live-chat.yaml.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "chats", label: "Chats", icon: MessagesSquare, count: 4 },
  { id: "after-hours", label: "After hours", icon: MoonStar, count: 3 },
  { id: "window", label: "Window", icon: AppWindow },
];

const meta = {
  title: "Products/LiveChat",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";

interface Line {
  id: string;
  from: "visitor" | "agent" | "system";
  who: string;
  at: string;
  text: string;
}

interface Visit {
  at: string;
  path: string;
  time: string;
}

interface ChatRow {
  id: string;
  visitor: string;
  email?: string;
  page: string;
  team: "Sales" | "Support";
  waiting: string;
  /** Not yet answered by anyone. */
  unanswered: boolean;
  agent: string | null;
  device: "Desktop" | "Phone";
  city: string;
  source: string;
  lines: Line[];
  visits: Visit[];
}

const CHATS: ChatRow[] = [
  {
    id: "ch1",
    visitor: "Visitor from İstanbul",
    page: "/pricing",
    team: "Sales",
    waiting: "1 min",
    unanswered: true,
    agent: null,
    device: "Desktop",
    city: "İstanbul",
    source: "google.com, search: e-fatura programı",
    lines: [
      { id: "l1", from: "system", who: "Live Chat", at: "15:20", text: "Started on /pricing. Routed to Sales by the page rule /pricing." },
      {
        id: "l2",
        from: "visitor",
        who: "Visitor",
        at: "15:20",
        text: "Hello, can the invoices be in Turkish? Our buyers are in Türkiye but our team writes in English.",
      },
    ],
    visits: [
      { at: "15:12", path: "/", time: "40 s" },
      { at: "15:13", path: "/features/e-fatura", time: "3 min 10 s" },
      { at: "15:16", path: "/pricing", time: "4 min, here now" },
    ],
  },
  {
    id: "ch2",
    visitor: "Seda Polat",
    email: "seda@polatgida.example.com",
    page: "/app/bank/connect",
    team: "Support",
    waiting: "4 min",
    unanswered: false,
    agent: "Can Öztürk",
    device: "Desktop",
    city: "Bursa",
    source: "In the app",
    lines: [
      { id: "l1", from: "visitor", who: "Seda Polat", at: "15:14", text: "The Garanti connection asks for a code that never arrives." },
      { id: "l2", from: "agent", who: "Can Öztürk", at: "15:15", text: "Hello Seda, which phone number does Garanti have for you? The code goes there." },
    ],
    visits: [{ at: "15:10", path: "/app/bank/connect", time: "10 min, here now" }],
  },
  {
    id: "ch3",
    visitor: "Visitor from Ankara",
    page: "/features/e-arsiv",
    team: "Sales",
    waiting: "6 min",
    unanswered: false,
    agent: "Elif Kaya",
    device: "Phone",
    city: "Ankara",
    source: "linkedin.com",
    lines: [{ id: "l1", from: "visitor", who: "Visitor", at: "15:12", text: "Does the Pro plan include e-Arşiv?" }],
    visits: [{ at: "15:11", path: "/features/e-arsiv", time: "9 min, here now" }],
  },
  {
    id: "ch4",
    visitor: "Kerem Aksoy",
    email: "kerem.aksoy@example.com",
    page: "/help/change-your-plan",
    team: "Support",
    waiting: "12 min",
    unanswered: false,
    agent: "Elif Kaya",
    device: "Phone",
    city: "İstanbul",
    source: "Knowledge Base",
    lines: [{ id: "l1", from: "visitor", who: "Kerem Aksoy", at: "15:08", text: "I still see two charges for October." }],
    visits: [{ at: "15:05", path: "/help/change-your-plan", time: "15 min, here now" }],
  },
];

/* -------------------------------------------------------------- overview */

function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="Chats on www.example.com and in the app, today. Working hours are weekdays 09:00 to 18:00." />
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="Chats today" value="64" icon={MessageCircle} delta={{ label: "+9 vs. last Thursday", direction: "up", intent: "neutral" }} />
        <KpiCard label="First answer" value="48" unit="s median" trend={wave(14, { base: 55, amp: 10, seed: 8 })} />
        <KpiCard label="Not answered in 2 min" value="3" tone="warning" />
        <KpiCard label="Became tickets" value="7" icon={LifeBuoy} delta={{ label: "3 after hours", intent: "neutral" }} />
        <KpiCard label="Became leads" value="5" icon={Handshake} delta={{ label: "in CRM", intent: "good" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Chats per hour" description="Today, and the same day last week">
          <TimeSeriesChart
            label="Chats per hour today and last week"
            labels={timeLabels(12, 60, 18 * 60)}
            height={190}
            area={false}
            series={[
              { id: "today", name: "Today", data: wave(12, { base: 6, amp: 3, seed: 30, min: 0 }), color: "var(--oa-chart-1)" },
              { id: "last", name: "Last week", data: wave(12, { base: 5, amp: 2.5, seed: 31, min: 0 }), color: "var(--oa-chart-2)" },
            ]}
          />
        </Panel>
        <Panel title="Started on" description="Today">
          <BarList
            label="Chats by page"
            items={[
              { id: "pricing", label: "/pricing", value: 21 },
              { id: "app", label: "/app/*", value: 18 },
              { id: "efatura", label: "/features/e-fatura", value: 11 },
              { id: "help", label: "/help/*", value: 9 },
              { id: "home", label: "/", value: 5 },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Team now" flush>
        <ul aria-label="Team now" className="grid sm:grid-cols-2 xl:grid-cols-4">
          {[
            { name: ME, team: "Sales", chats: 0, state: "Available" },
            { name: "Elif Kaya", team: "Sales, Support", chats: 2, state: "Available" },
            { name: "Can Öztürk", team: "Support", chats: 1, state: "Available" },
            { name: "Mehmet Demir", team: "Support", chats: 0, state: "Away" },
          ].map((a) => (
            <li key={a.name} className="flex items-center gap-2 border-b border-subtle px-3 py-2 sm:border-r">
              <Avatar name={a.name} size="sm" />
              <span className="flex min-w-0 grow flex-col">
                <span className="truncate text-sm text-fg">{a.name}</span>
                <span className="text-2xs text-fg-muted">
                  {a.team} · {a.chats} chats
                </span>
              </span>
              <StatusBadge tone={a.state === "Available" ? "success" : "neutral"}>{a.state}</StatusBadge>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* ----------------------------------------------------------------- chats */

function Composer({ onSend, disabled }: { onSend: (t: string) => void; disabled?: boolean }) {
  const id = useId();
  const [text, setText] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <form onSubmit={submit} className="border-t border-line p-2.5">
      <div className="flex flex-col rounded-md border border-line bg-surface focus-within:border-accent">
        <label htmlFor={id} className="sr-only">
          Message
        </label>
        <textarea
          id={id}
          rows={2}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          placeholder={disabled ? "The chat is closed" : "Write to the visitor"}
          className="w-full resize-none bg-transparent px-2.5 pt-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <span className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <IconButton label="Attach a file" size="xs" disabled={disabled}>
            <Paperclip className="size-3.5" />
          </IconButton>
          <span className="grow" />
          <Button type="submit" size="xs" variant="primary" icon={<SendHorizontal />} disabled={disabled}>
            Send
          </Button>
        </span>
      </div>
    </form>
  );
}

function ChatsPage() {
  const [chats, setChats] = useState(CHATS);
  const [active, setActive] = useState("ch1");
  const [notice, setNotice] = useState<string | null>(null);
  const [closed, setClosed] = useState<string[]>([]);
  const cur = chats.find((c) => c.id === active)!;
  const isClosed = closed.includes(cur.id);
  const update = (patch: Partial<ChatRow>) => setChats((cs) => cs.map((c) => (c.id === cur.id ? { ...c, ...patch } : c)));
  return (
    <>
      <PageHeader title="Chats" description="Open chats with the page each visitor is on. Several at once; the oldest unanswered first." />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[220px_minmax(0,1fr)_280px]">
        <Panel flush aria-label="Open chats">
          <ul className="flex flex-col py-1">
            {chats.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => setActive(c.id)}
                  aria-current={c.id === active ? "true" : undefined}
                  className={cn("flex w-full flex-col gap-0.5 px-3 py-2 text-left", c.id === active ? "bg-accent-soft" : "hover:bg-canvas")}
                >
                  <span className="flex items-center gap-2">
                    <span className={cn("truncate text-sm font-medium", c.id === active ? "text-accent-text" : "text-fg")}>{c.visitor}</span>
                    {closed.includes(c.id) ? (
                      <Badge className="ml-auto">Closed</Badge>
                    ) : c.unanswered ? (
                      <Badge tone="warning" className="ml-auto">
                        Waiting {c.waiting}
                      </Badge>
                    ) : (
                      <span className="ml-auto text-2xs text-fg-muted">{c.waiting}</span>
                    )}
                  </span>
                  <span className="truncate font-mono text-2xs text-fg-muted">{c.page}</span>
                  <span className="text-2xs text-fg-muted">
                    {c.team} · {c.agent ?? "Not answered"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          flush
          aria-label="Chat"
          title={cur.visitor}
          description={`On ${cur.page} · ${cur.team}${cur.agent ? ` · ${cur.agent}` : ""}`}
          actions={
            !isClosed && (
              <>
                <SelectField
                  aria-label="Hand to"
                  value=""
                  onChange={(e) => {
                    if (!e.target.value) return;
                    update({ agent: e.target.value });
                    setNotice(`Chat handed to ${e.target.value}, with everything said so far.`);
                  }}
                  options={[{ value: "", label: "Hand to a colleague" }, ...["Elif Kaya", "Can Öztürk", "Mehmet Demir"].map((n) => ({ value: n, label: n }))]}
                  className="w-48"
                />
                <IconButton
                  label="Close the chat"
                  onClick={() => {
                    setClosed((c) => [...c, cur.id]);
                    setNotice(`Chat with ${cur.visitor} closed. The visitor can get a copy by email.`);
                  }}
                >
                  <X className="size-4" />
                </IconButton>
              </>
            )
          }
        >
          <ol aria-label="Conversation" className="flex min-h-[320px] flex-col gap-2 p-3">
            {cur.lines.map((l) =>
              l.from === "system" ? (
                <li key={l.id} className="text-center text-2xs text-fg-muted">
                  {l.at} · {l.text}
                </li>
              ) : (
                <li key={l.id} className={cn("flex max-w-[80%] flex-col gap-0.5", l.from === "agent" && "self-end items-end")}>
                  <span className="text-2xs text-fg-muted">
                    {l.who} · {l.at}
                  </span>
                  <span className={cn("rounded-lg px-3 py-2 text-sm", l.from === "agent" ? "bg-accent text-accent-contrast" : "bg-subtle text-fg")}>
                    {l.text}
                  </span>
                </li>
              ),
            )}
          </ol>
          <Composer
            disabled={isClosed}
            onSend={(text) => {
              update({
                unanswered: false,
                agent: cur.agent ?? ME,
                lines: [...cur.lines, { id: `l${cur.lines.length + 1}`, from: "agent", who: ME, at: "15:21", text }],
              });
            }}
          />
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Visitor" aria-label="Visitor">
            <div className="flex flex-col gap-2">
              <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
                <dt className="text-fg-muted">From</dt>
                <dd className="text-fg">{cur.source}</dd>
                <dt className="text-fg-muted">Where</dt>
                <dd className="flex items-center gap-1 text-fg">
                  {cur.device === "Desktop" ? <Monitor aria-hidden className="size-3" /> : <Smartphone aria-hidden className="size-3" />}
                  {cur.device} · {cur.city}
                </dd>
                <dt className="text-fg-muted">Email</dt>
                <dd className="truncate font-mono text-fg">{cur.email ?? "Not given"}</dd>
              </dl>
              <section className="flex flex-col gap-1 border-t border-line pt-2">
                <h3 className="text-xs font-semibold text-fg-muted">Pages, from Analytics</h3>
                <ol aria-label="Pages visited" className="flex flex-col gap-1">
                  {cur.visits.map((v) => (
                    <li key={v.at + v.path} className="flex items-baseline gap-2 text-xs">
                      <span className="w-10 shrink-0 font-mono text-fg-muted">{v.at}</span>
                      <span className="min-w-0 grow truncate font-mono text-fg">{v.path}</span>
                      <span className="shrink-0 text-2xs text-fg-muted">{v.time}</span>
                    </li>
                  ))}
                </ol>
              </section>
              <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
                <Button
                  size="sm"
                  icon={<Handshake />}
                  onClick={() => setNotice(`Lead opened in CRM for ${cur.visitor}, with this chat and the pages read. Owner: ${cur.agent ?? ME}.`)}
                >
                  Open a lead in CRM
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  icon={<LifeBuoy />}
                  onClick={() => setNotice(`Ticket #4823 opened in Helpdesk, Sales questions, with the whole chat.`)}
                >
                  Make a ticket
                </Button>
              </div>
            </div>
          </Panel>
          <Panel title="Suggested articles" description="Shown to the visitor too">
            <ul aria-label="Suggested articles" className="flex flex-col gap-1">
              {["Send your first e-Fatura", "Invoices in English for foreign buyers"].map((a) => (
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

/* ----------------------------------------------------------- after hours */

const AFTER = [
  {
    id: "a1",
    at: "Yesterday 22:41",
    name: "Murat Kılıç",
    email: "murat.kilic@example.com",
    page: "/pricing",
    question: "Is there a discount for accountants with many clients?",
    ticket: "4815",
  },
  {
    id: "a2",
    at: "Yesterday 19:05",
    name: "Nihan Er",
    email: "nihan.er@example.com",
    page: "/app/invoices",
    question: "Cancel button for e-Arşiv is grey, urgent",
    ticket: "4817",
  },
  {
    id: "a3",
    at: "Today 07:58",
    name: "Okan Tekin",
    email: "okan@tekinyapi.example.com",
    page: "/features/e-fatura",
    question: "Can we try the Business plan for a week?",
    ticket: "4819",
  },
];

function AfterHoursPage() {
  const cols: Column<(typeof AFTER)[number]>[] = [
    { id: "at", header: "Asked", cell: (a) => <span className="text-xs whitespace-nowrap">{a.at}</span> },
    {
      id: "who",
      header: "Visitor",
      cell: (a) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{a.name}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{a.email}</span>
        </span>
      ),
    },
    { id: "page", header: "On", cell: (a) => <span className="font-mono text-xs">{a.page}</span> },
    { id: "q", header: "Question", width: "34%", cell: (a) => <span className="text-xs">{a.question}</span> },
    { id: "ticket", header: "Ticket", cell: (a) => <Badge mono>#{a.ticket}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title="After hours"
        description="Outside working hours the window offers a form instead of a chat. Each question became a ticket in Helpdesk, answered by email."
      />
      <Panel flush title="Questions outside working hours">
        <DataTable label="Questions outside working hours" columns={cols} rows={AFTER} getRowId={(a) => a.id} minWidth={820} />
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- window */

function WindowPage() {
  const [state, setState] = useState<"open" | "closed">("open");
  const [copied, setCopied] = useState(false);
  return (
    <>
      <PageHeader
        title="Window"
        description="The chat window as visitors see it. Colours, hours and teams come from live-chat.yaml; the texts follow the visitor's language."
      />
      <div className="mb-2.5">
        <SegmentedControl
          label="Show"
          value={state}
          onChange={setState}
          options={[
            { value: "open", label: "In working hours" },
            { value: "closed", label: "Outside working hours" },
          ]}
        />
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush aria-label="Window preview">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 text-xs text-fg-muted">
            <Globe aria-hidden className="size-3.5" />
            <span className="truncate font-mono">https://www.example.com/pricing</span>
          </div>
          <div className="relative h-[420px] overflow-hidden bg-canvas">
            <div aria-hidden className="absolute inset-0 flex flex-col gap-3 p-6 opacity-50">
              <div className="h-5 w-24 rounded bg-subtle" />
              <div className="grid grid-cols-3 gap-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-40 rounded-lg bg-subtle" />
                ))}
              </div>
            </div>
            <div
              role="dialog"
              aria-label="Chat window"
              className="absolute right-5 bottom-5 flex w-72 flex-col overflow-hidden rounded-xl border border-line bg-surface shadow-modal"
            >
              <div className="flex flex-col bg-accent px-3 py-2.5 text-accent-contrast">
                <span className="text-sm font-semibold">Acme Books</span>
                <span className="text-xs opacity-90">{state === "open" ? "We usually answer within a minute" : "We are back at 09:00"}</span>
              </div>
              <div className="flex flex-col gap-2 p-3 text-sm">
                {state === "open" ? (
                  <>
                    <span className="rounded-lg bg-subtle px-3 py-2 text-fg">Hello! Ask us anything about Acme Books.</span>
                    <span className="text-2xs font-semibold text-fg-muted">These may answer it</span>
                    <span className="flex items-center gap-1.5 text-xs text-fg">
                      <FileSearch aria-hidden className="size-3 text-accent" />
                      Change your plan
                    </span>
                    <span className="rounded-md border border-line px-2.5 py-1.5 text-xs text-fg-muted">Write a message</span>
                  </>
                ) : (
                  <>
                    <span className="text-xs text-fg">Leave your question and email; we answer by email.</span>
                    <span className="rounded-md border border-line px-2.5 py-1.5 text-xs text-fg-muted">Your email</span>
                    <span className="h-14 rounded-md border border-line px-2.5 py-1.5 text-xs text-fg-muted">Your question</span>
                    <span className="self-end rounded-md bg-accent px-2.5 py-1 text-xs text-accent-contrast">Send</span>
                  </>
                )}
                <span className="text-2xs text-fg-muted">Nothing is kept about you until you write. Privacy</span>
              </div>
            </div>
          </div>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Install" description="One tag on every page of the site.">
            <div className="flex flex-col gap-2">
              <span className="flex items-start gap-1 rounded-md bg-canvas px-2 py-1.5">
                <code className="min-w-0 grow font-mono text-2xs break-all text-fg">{'<script src="https://chat.example.com/w.js" defer></script>'}</code>
                <IconButton label="Copy script tag" size="xs" onClick={() => setCopied(true)}>
                  <Copy className="size-3.5" />
                </IconButton>
              </span>
              {copied && (
                <p role="status" className="text-xs text-success">
                  Script tag copied.
                </p>
              )}
            </div>
          </Panel>
          <Panel title="Pages and teams" description="The first rule that matches the page wins.">
            <ul aria-label="Page rules" className="flex flex-col gap-1.5 text-xs">
              {[
                ["/pricing, /features/*", "Sales"],
                ["/app/*, /help/*", "Support"],
                ["Everything else", "Sales"],
              ].map(([p, t]) => (
                <li key={p} className="flex items-center justify-between gap-2">
                  <span className="font-mono text-fg">{p}</span>
                  <Badge>{t}</Badge>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-2xs text-fg-muted">On sites that ask first, the window loads after a yes on Consent's banner.</p>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `sites:
  www: { host: www.example.com }
  app: { host: app.example.com, ask_email: false }
hours:
  timezone: Europe/Istanbul
  weekdays: "09:00-18:00"
  outside: form          # becomes a Helpdesk ticket
teams:
  sales: { group: sales, queue: sales }
  support: { group: support, queue: technical }
routes:
  - { pages: ["/pricing", "/features/*"], team: sales }
  - { pages: ["/app/*", "/help/*"], team: support }
  - { pages: ["*"], team: sales }
window:
  colour: "#1d4ed8"
  title: Acme Books
  suggest_articles: true
keep_chats: 2y`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="live-chat"
      file="live-chat.yaml"
      applied="yesterday"
      yaml={YAML}
      groups={[
        {
          title: "Hours",
          items: [
            { label: "Working hours", value: "Weekdays 09:00 to 18:00, Europe/Istanbul", path: "hours" },
            { label: "Outside them", value: "A form; the question becomes a Helpdesk ticket", path: "hours.outside" },
          ],
        },
        {
          title: "Teams and routing",
          items: [
            { label: "Sales", value: "Group sales in Identity; tickets to Sales questions", path: "teams.sales" },
            { label: "Support", value: "Group support; tickets to Technical", path: "teams.support" },
            { label: "Routes", value: "Pricing and features to Sales; app and help to Support", path: "routes" },
          ],
        },
        {
          title: "Window",
          items: [
            { label: "Title", value: "Acme Books", path: "window.title" },
            { label: "Articles", value: "Suggested from Knowledge Base", path: "window.suggest_articles" },
            { label: "Chats kept", value: "2 years", path: "keep_chats" },
          ],
        },
      ]}
    />
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  chats: () => <ChatsPage />,
  "after-hours": () => <AfterHoursPage />,
  window: () => <WindowPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="live-chat" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Chats by page" })).getAllByRole("listitem")[0]).toHaveTextContent("/pricing");
    await expect(within(c.getByRole("list", { name: "Team now" })).getAllByRole("listitem")).toHaveLength(4);
  },
};

export const Chats: Story = {
  ...app("chats"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Visitor" })).toHaveTextContent("search: e-fatura programı");
    await expect(within(c.getByRole("list", { name: "Pages visited" })).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(within(c.getByRole("region", { name: "Open chats" })).getByRole("button", { name: /Seda Polat/ }));
    await expect(c.getByRole("list", { name: "Conversation" })).toHaveTextContent("Garanti connection");
    blur(canvasElement);
  },
};

export const Chat: Story = {
  name: "Answer a chat",
  ...app("chats"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("textbox", { name: "Message" }), "Yes: invoices can be in Turkish, English or both, per buyer.");
    await userEvent.click(c.getByRole("button", { name: "Send" }));
    const lines = within(c.getByRole("list", { name: "Conversation" })).getAllByRole("listitem");
    await expect(lines.at(-1)).toHaveTextContent("Emily Clark");
    await expect(within(c.getByRole("region", { name: "Open chats" })).getAllByRole("button")[0]).not.toHaveTextContent("Waiting");
    blur(canvasElement);
  },
};

export const OpenLead: Story = {
  name: "Open a lead in CRM",
  ...app("chats"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Open a lead in CRM" }));
    await expect(c.getByRole("status")).toHaveTextContent("Lead opened in CRM for Visitor from İstanbul");
  },
};

export const HandOver: Story = {
  name: "Hand to a colleague",
  ...app("chats"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Hand to" }), "Elif Kaya");
    await expect(c.getByRole("status")).toHaveTextContent("Chat handed to Elif Kaya");
    await userEvent.click(c.getByRole("button", { name: "Close the chat" }));
    await expect(c.getByRole("textbox", { name: "Message" })).toBeDisabled();
    blur(canvasElement);
  },
};

export const AfterHours: Story = {
  name: "After hours",
  ...app("after-hours"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "Questions outside working hours" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(3);
  },
};

export const ChatWindow: Story = {
  name: "Window",
  ...app("window"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("dialog", { name: "Chat window" })).toHaveTextContent("We usually answer within a minute");
    await userEvent.click(c.getByRole("radio", { name: "Outside working hours" }));
    await expect(c.getByRole("dialog", { name: "Chat window" })).toHaveTextContent("We are back at 09:00");
    await userEvent.click(c.getByRole("button", { name: "Copy script tag" }));
    await expect(c.getByRole("status")).toHaveTextContent("Script tag copied.");
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("live-chat.yaml as applied")).toHaveTextContent("outside: form");
  },
};
