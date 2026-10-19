import { useId, useState, type FormEvent, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BarChart3, Copy, Database, History, MessageSquareText, Plus, Send, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Panel } from "../../components/Panel";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { Avatar } from "../../components/Avatar";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import { PEOPLE, USER, timeLabels, wave } from "../mocks";

const nav = [
  { id: "ask", label: "Ask", icon: MessageSquareText },
  { id: "history", label: "History", icon: History },
  { id: "sources", label: "Sources", icon: Database },
  { id: "usage", label: "Usage", icon: BarChart3 },
];

const meta = {
  title: "Products/Assistant",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Source {
  n: number;
  product: ProductId;
  title: string;
  detail: string;
  href: string;
}

const SOURCES: Source[] = [
  { n: 1, product: "metrics", title: "node_cpu_seconds_total · api-prod-03", detail: "01:30–04:30 · 1 series", href: "#metrics/explore?host=api-prod-03" },
  { n: 2, product: "siem", title: "Signal: crypto miner process (Sigma)", detail: "Critical · 02:07", href: "#siem/signals/sig-88213" },
  { n: 3, product: "logs", title: "sshd and auditd on api-prod-03", detail: "1,284 lines · 01:50–02:30", href: "#logs?host=api-prod-03" },
  { n: 4, product: "malware", title: "YARA match /tmp/.x/kdevtmpfsi", detail: "XMRig family · quarantined 02:19", href: "#malware/detections/md-1172" },
  { n: 5, product: "incidents", title: "INC-214 Crypto miner on api-prod-03", detail: "SEV-1 · mitigated 02:41", href: "#incidents/INC-214" },
];

function Cite({ n }: { n: number }) {
  const s = SOURCES.find((x) => x.n === n)!;
  const P = PRODUCTS[s.product];
  return (
    <a
      href={s.href}
      aria-label={`${P.name} ${n}: ${s.title}`}
      className="mx-0.5 inline-flex h-5 items-center gap-1 rounded border border-line bg-surface px-1.5 align-middle font-mono text-2xs text-fg no-underline hover:border-line-strong hover:bg-subtle"
    >
      <P.icon aria-hidden className="size-3 text-fg-muted" />
      {P.name}{" "}
      <span className="text-fg-muted">{n}</span>
    </a>
  );
}

interface Message {
  id: string;
  role: "user" | "assistant";
  body: ReactNode;
}

const N = 37;
const labels = timeLabels(N, 5, 4 * 60 + 30);

const initial: Message[] = [
  { id: "q1", role: "user", body: "What happened on api-prod-03 last night?" },
  {
    id: "a1",
    role: "assistant",
    body: (
      <div className="flex flex-col gap-2 text-sm leading-6 text-fg">
        <p>
          A crypto miner ran on <EntityChip kind="host" value="api-prod-03" hideKind href="#infrastructure/api-prod-03" /> for about 34 minutes, from 01:57 to 02:31. CPU went from a normal 22% to 97% on all 8 cores.
          <Cite n={1} />
        </p>
        <p>
          The SIEM raised a critical signal at 02:07 for a process named <code className="font-mono text-xs">kdevtmpfsi</code> started by the <code className="font-mono text-xs">www-data</code> user.
          <Cite n={2} />
        </p>
        <p>
          The way in looks like an SSH login with a valid key for the deploy account from <EntityChip kind="ip" value="198.51.100.201" hideKind href="#siem/entity/ip/198.51.100.201" /> at 01:54, followed by a download from the same address.
          <Cite n={3} />
        </p>
        <p>
          Malware matched the binary to the XMRig family and quarantined it at 02:19; the Automation playbook isolated the host and INC-214 was opened. It was mitigated at 02:41.
          <Cite n={4} />
          <Cite n={5} />
        </p>
        <figure className="rounded-md border border-line bg-canvas p-2">
          <figcaption className="mb-1 text-xs font-medium text-fg-muted">CPU on api-prod-03, 01:30–04:30</figcaption>
          <TimeSeriesChart
            label="CPU usage on api-prod-03 overnight"
            labels={labels}
            height={110}
            yMax={100}
            xTicks={4}
            format={(v) => `${Math.round(v)}%`}
            threshold={{ value: 85, label: "alert 85%" }}
            series={[{ id: "cpu", name: "CPU %", data: wave(N, { base: 22, amp: 4, seed: 61, spike: 75, spikeAt: 6, spikeLen: 2 }).map((v, i) => (i > 13 ? Math.max(18, v - 75) : Math.min(98, v))) }]}
          />
        </figure>
        <p className="text-fg-muted">Still open: the deploy key is not rotated yet and the access grant revoke step failed in the playbook run.</p>
      </div>
    ),
  },
];

const FOLLOW_UPS = ["Which other hosts did 198.51.100.201 touch?", "Show the playbook run that isolated the host", "Draft the postmortem summary"];

function MessageRow({ m }: { m: Message }) {
  const isUser = m.role === "user";
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-2.5">
      {isUser ? (
        <Avatar name={USER.name} size="sm" />
      ) : (
        <span aria-hidden className="grid size-6 place-items-center rounded-md bg-accent-soft text-accent-text">
          <PRODUCTS.assistant.icon className="size-3.5" />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className="text-xs font-semibold text-fg">{isUser ? USER.name : "Assistant"}</span>
        {typeof m.body === "string" ? <p className="text-sm text-fg">{m.body}</p> : m.body}
      </div>
    </li>
  );
}

/** Ask: a cited answer across products, a mini chart, follow-ups, a composer and the sources read. */
function AskPage() {
  const [thread, setThread] = useState<Message[]>(initial);
  const [draft, setDraft] = useState("");
  const inputId = useId();
  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const k = thread.length;
    setThread([
      ...thread,
      { id: `q${k}`, role: "user", body: t },
      { id: `a${k}`, role: "assistant", body: <p className="text-sm text-fg-muted">Reading Logs, SIEM and Infrastructure…</p> },
    ]);
    setDraft("");
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    ask(draft);
  };
  return (
    <>
      <PageHeader
        title="Ask"
        description="Answers cite what was read. The assistant only sees products you can access."
        meta={<Badge>Read-only</Badge>}
        actions={<Button icon={<Plus />}>New conversation</Button>}
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Conversation" description="Started today 08:12">
          <ol aria-label="Conversation" className="flex flex-col gap-4 py-1">
            {thread.map((m) => (
              <MessageRow key={m.id} m={m} />
            ))}
          </ol>
          <div className="mt-2 ml-[38px] flex flex-wrap items-center gap-1">
            <IconButton label="Copy answer" size="xs">
              <Copy />
            </IconButton>
            <IconButton label="Good answer" size="xs">
              <ThumbsUp />
            </IconButton>
            <IconButton label="Bad answer" size="xs">
              <ThumbsDown />
            </IconButton>
          </div>
          <div role="group" aria-label="Suggested follow-ups" className="mt-2.5 flex flex-wrap gap-1.5">
            {FOLLOW_UPS.map((f) => (
              <Button key={f} size="sm" onClick={() => ask(f)}>
                {f}
              </Button>
            ))}
          </div>
          <form onSubmit={submit} className="mt-2.5 flex flex-col gap-1.5 rounded-lg border border-line-strong bg-surface p-2">
            <label htmlFor={inputId} className="text-xs font-medium text-fg">
              Ask a follow-up
            </label>
            <textarea
              id={inputId}
              rows={2}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  ask(draft);
                }
              }}
              placeholder="Ask about hosts, users, alerts or incidents"
              className="min-h-14 w-full resize-y rounded-md bg-surface px-1 text-sm text-fg placeholder:text-fg-subtle"
            />
            <div className="flex items-center justify-between gap-2">
              <span className="text-2xs text-fg-muted">Enter to send · Shift+Enter for a new line</span>
              <Button type="submit" size="sm" variant="primary" icon={<Send />} disabled={!draft.trim()}>
                Send
              </Button>
            </div>
          </form>
        </Panel>
        <Panel title="Sources" description={`${SOURCES.length} read for this answer`} flush>
          <ol aria-label="Sources read" className="flex flex-col">
            {SOURCES.map((s) => {
              const P = PRODUCTS[s.product];
              return (
                <li key={s.n} className="border-b border-subtle last:border-0">
                  <a href={s.href} className="grid grid-cols-[20px_minmax(0,1fr)] gap-2 px-3 py-2 text-fg no-underline hover:bg-canvas">
                    <span className="font-mono text-2xs text-fg-muted">{s.n}</span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="flex items-center gap-1.5 text-2xs font-medium tracking-wider text-fg-muted uppercase">
                        <P.icon aria-hidden className="size-3" />
                        {P.name}
                      </span>
                      <span className="truncate text-sm">{s.title}</span>
                      <span className="truncate text-2xs text-fg-muted">{s.detail}</span>
                    </span>
                  </a>
                </li>
              );
            })}
          </ol>
          <div className="flex items-center gap-2 border-t border-line px-3 py-2">
            <StatusBadge tone="success">Fresh</StatusBadge>
            <span className="text-2xs text-fg-muted">Data as of 08:12 · 3.1 s to answer</span>
          </div>
        </Panel>
      </div>
    </>
  );

}

/* ------------------------------------------------------------------ */
/* History                                                             */
/* ------------------------------------------------------------------ */

interface Conversation {
  id: string;
  title: string;
  person: string;
  started: string;
  turns: number;
  products: ProductId[];
  rating?: "up" | "down";
  summary: string;
  questions: string[];
}

const CONVERSATIONS: Conversation[] = [
  { id: "c1", title: "What happened on api-prod-03 last night?", person: USER.name, started: "Today 08:12", turns: 2, products: ["metrics", "siem", "logs", "malware", "incidents"], rating: "up", summary: "Crypto miner from 01:57 to 02:31 via a deploy key used from 198.51.100.201. Quarantined and isolated; key not yet rotated.", questions: ["What happened on api-prod-03 last night?"] },
  { id: "c2", title: "Why did checkout latency spike at 10:00?", person: PEOPLE[0], started: "Today 10:22", turns: 6, products: ["traces", "metrics", "database"], rating: "up", summary: "A missing index on orders.customer_id after migration 0142 made p95 go from 180 ms to 1.4 s. Index added at 10:41.", questions: ["Why did checkout latency spike at 10:00?", "Which query got slower?", "Who ran migration 0142?"] },
  { id: "c3", title: "Which public repos have leaked secrets?", person: PEOPLE[3], started: "Yesterday 16:05", turns: 3, products: ["secrets", "sast"], summary: "One: acme/legacy-portal has a revoked AWS key in history. Push protection is off on that repo.", questions: ["Which public repos have leaked secrets?", "Is the key still valid?"] },
  { id: "c4", title: "Summarise SOC 2 evidence gaps", person: PEOPLE[2], started: "Yesterday 11:40", turns: 4, products: ["compliance", "access", "backups"], rating: "down", summary: "Three controls lack evidence for Q3: CC6.2 access reviews, A1.2 restore tests, CC7.3 incident drill.", questions: ["Summarise SOC 2 evidence gaps", "Which owners are late?"] },
  { id: "c5", title: "Is 203.0.113.181 known bad?", person: PEOPLE[4], started: "Oct 17 · 14:18", turns: 2, products: ["threat-intel", "network-ids", "waf"], rating: "up", summary: "Yes: listed in two feeds as a malware download host since Oct 12. WAF blocked 44 requests from it this week.", questions: ["Is 203.0.113.181 known bad?"] },
  { id: "c6", title: "Hosts without a recent backup", person: PEOPLE[1], started: "Oct 16 · 09:03", turns: 3, products: ["backups", "infrastructure"], summary: "db-prod-02 last backed up 3 days ago; the job fails on a full disk.", questions: ["Hosts without a recent backup", "Why is db-prod-02 failing?"] },
];

function HistoryPage() {
  const [query, setQuery] = useState("");
  const [people, setPeople] = useState<string[]>([]);
  const [items, setItems] = useState(CONVERSATIONS);
  const [active, setActive] = useState("c2");
  const rows = items.filter((c) => (people.length === 0 || people.includes(c.person)) && (!query || `${c.title} ${c.summary}`.toLowerCase().includes(query.toLowerCase())));
  const cur = items.find((c) => c.id === active);
  const cols: Column<Conversation>[] = [
    { id: "title", header: "Conversation", width: "40%", cell: (c) => <span className="block truncate font-medium">{c.title}</span> },
    { id: "person", header: "Asked by", cell: (c) => <span className="flex items-center gap-1.5"><Avatar name={c.person} size="sm" /><span className="truncate text-xs">{c.person}</span></span> },
    { id: "started", header: "Started", mono: true, cell: (c) => c.started },
    { id: "turns", header: "Turns", align: "right", mono: true, sortValue: (c) => c.turns, cell: (c) => c.turns },
    { id: "rating", header: "Rating", cell: (c) => (c.rating === "up" ? <Badge tone="success">Helpful</Badge> : c.rating === "down" ? <Badge tone="danger">Not helpful</Badge> : <span className="text-fg-subtle">–</span>) },
  ];
  return (
    <>
      <PageHeader title="History" description="Conversations in this workspace. Admins see everyone's; members see their own." />
      <FilterBar onClear={query || people.length ? () => (setQuery(""), setPeople([])) : undefined}>
        <SearchInput label="Search conversations" value={query} onChange={(e) => setQuery(e.target.value)} className="w-72" />
        <FacetFilter label="Asked by" selected={people} onChange={setPeople} options={[...new Set(CONVERSATIONS.map((c) => c.person))].map((p) => ({ value: p, count: CONVERSATIONS.filter((c) => c.person === p).length }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Conversations" description={`${rows.length} shown`} flush>
          <DataTable label="Conversations" columns={cols} rows={rows} getRowId={(c) => c.id} onRowClick={(c) => setActive(c.id)} activeRowId={active} minWidth={720} empty={<p className="py-8">No conversations match</p>} />
        </Panel>
        <Panel
          title="Summary"
          description={cur?.title ?? "No conversation selected"}
          aria-label="Conversation summary"
          actions={
            cur && (
              <IconButton label={`Delete ${cur.title}`} size="xs" onClick={() => (setItems((all) => all.filter((x) => x.id !== cur.id)), setActive(""))}>
                <Trash2 />
              </IconButton>
            )
          }
        >
          {cur ? (
            <div className="flex flex-col gap-2.5 text-sm">
              <p>{cur.summary}</p>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-fg-muted">Questions</span>
                <ol className="flex list-decimal flex-col gap-0.5 pl-5">
                  {cur.questions.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ol>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs text-fg-muted">Read from</span>
                <span className="flex flex-wrap gap-1">
                  {cur.products.map((p) => (
                    <Badge key={p}>{PRODUCTS[p].name}</Badge>
                  ))}
                </span>
              </div>
              <Button size="sm" className="self-start">
                Continue conversation
              </Button>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">Select a conversation</p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

interface DataSource {
  product: ProductId;
  reads: string;
  freshness: string;
  queries7d: number;
  enabled: boolean;
  sensitive?: boolean;
}

const DATA_SOURCES: DataSource[] = [
  { product: "logs", reads: "Log search, 30 days", freshness: "live", queries7d: 412, enabled: true },
  { product: "metrics", reads: "PromQL over all series", freshness: "live", queries7d: 388, enabled: true },
  { product: "traces", reads: "Traces and service map", freshness: "live", queries7d: 160, enabled: true },
  { product: "siem", reads: "Signals, cases, entity timelines", freshness: "live", queries7d: 241, enabled: true },
  { product: "incidents", reads: "Incidents, timelines, postmortems", freshness: "live", queries7d: 97, enabled: true },
  { product: "infrastructure", reads: "Hosts, containers, Kubernetes", freshness: "1 min", queries7d: 205, enabled: true },
  { product: "vulnerabilities", reads: "Findings and fix status", freshness: "15 min", queries7d: 58, enabled: true },
  { product: "secrets", reads: "Findings, never secret values", freshness: "15 min", queries7d: 21, enabled: true, sensitive: true },
  { product: "access", reads: "Grants and session metadata, not recordings", freshness: "live", queries7d: 33, enabled: true, sensitive: true },
  { product: "identity", reads: "Users, groups, sign-in events", freshness: "5 min", queries7d: 0, enabled: false, sensitive: true },
  { product: "compliance", reads: "Controls and evidence status", freshness: "1 h", queries7d: 19, enabled: true },
];

function SourcesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(DATA_SOURCES.map((d) => [d.product, d.enabled])));
  const on = Object.values(enabled).filter(Boolean).length;
  const cols: Column<DataSource>[] = [
    {
      id: "product",
      header: "Product",
      width: "22%",
      sortValue: (d) => PRODUCTS[d.product].name,
      cell: (d) => {
        const P = PRODUCTS[d.product];
        return (
          <span className="flex items-center gap-1.5">
            <P.icon aria-hidden className="size-3.5 text-fg-muted" />
            <span className="font-medium">{P.name}</span>
            {d.sensitive && <Badge tone="warning">Sensitive</Badge>}
          </span>
        );
      },
    },
    { id: "reads", header: "What it reads", width: "34%", cell: (d) => <span className="text-xs">{d.reads}</span> },
    { id: "fresh", header: "Freshness", cell: (d) => <span className="text-xs">{d.freshness}</span> },
    { id: "q", header: "Queries · 7 d", align: "right", mono: true, sortValue: (d) => d.queries7d, cell: (d) => d.queries7d },
    {
      id: "on",
      header: "Allowed",
      width: "100px",
      cell: (d) => <Switch checked={enabled[d.product] ?? false} onCheckedChange={(v) => setEnabled((e) => ({ ...e, [d.product]: v }))} label={<span className="sr-only">Allow {PRODUCTS[d.product].name}</span>} />,
    },
  ];
  return (
    <>
      <PageHeader title="Sources" description="Which products the assistant may read. It always runs with the asking person's own permissions on top of this." />
      <KpiGrid>
        <KpiCard label="Products allowed" value={`${on}`} unit={`of ${DATA_SOURCES.length} linked`} />
        <KpiCard label="Reads · 7 d" value="1,634" delta={{ label: "Logs and Metrics most used" }} />
        <KpiCard label="Write actions" value="0" unit="never" tone="success" delta={{ label: "The assistant is read-only", intent: "good" }} />
        <KpiCard label="Data sent outside" value="None" tone="success" delta={{ label: "Model runs in your cluster" }} />
      </KpiGrid>
      <Callout tone="info" title="Secret values and session recordings are never read">
        Secrets shares only finding metadata and Access shares only who connected where and when.
      </Callout>
      <Panel title="Linked products" flush>
        <DataTable label="Data sources" columns={cols} rows={DATA_SOURCES} getRowId={(d) => d.product} defaultSort={{ id: "q", direction: "desc" }} minWidth={820} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Usage                                                               */
/* ------------------------------------------------------------------ */

interface Feedback {
  id: string;
  question: string;
  person: string;
  when: string;
  rating: "up" | "down";
  comment: string;
}

const FEEDBACK: Feedback[] = [
  { id: "f1", question: "Summarise SOC 2 evidence gaps", person: PEOPLE[2], when: "Yesterday", rating: "down", comment: "Missed the vendor review control." },
  { id: "f2", question: "Why did checkout latency spike at 10:00?", person: PEOPLE[0], when: "Today", rating: "up", comment: "Found the migration in one step." },
  { id: "f3", question: "Top noisy alert rules this week", person: PEOPLE[5], when: "Oct 17", rating: "down", comment: "Counted silenced alerts too." },
  { id: "f4", question: "Is 203.0.113.181 known bad?", person: PEOPLE[4], when: "Oct 17", rating: "up", comment: "" },
  { id: "f5", question: "Which certificates expire this month?", person: PEOPLE[6], when: "Oct 16", rating: "up", comment: "Linked straight to the renewals." },
];

function UsagePage() {
  const [range, setRange] = useState("7d");
  const [rating, setRating] = useState("all");
  const days = timeLabels(14, 24 * 60).map((_, i) => `Oct ${6 + i}`);
  const rows = FEEDBACK.filter((f) => rating === "all" || f.rating === rating);
  const cols: Column<Feedback>[] = [
    { id: "q", header: "Question", width: "36%", cell: (f) => <span className="block truncate">{f.question}</span> },
    { id: "person", header: "Person", cell: (f) => <span className="text-xs">{f.person}</span> },
    { id: "when", header: "When", cell: (f) => <span className="text-xs">{f.when}</span> },
    { id: "rating", header: "Rating", cell: (f) => (f.rating === "up" ? <Badge tone="success">Helpful</Badge> : <Badge tone="danger">Not helpful</Badge>) },
    { id: "comment", header: "Comment", width: "28%", cell: (f) => <span className="block truncate text-xs text-fg-muted">{f.comment || "–"}</span> },
  ];
  return (
    <>
      <PageHeader title="Usage" description="How the assistant is used and how good its answers are." />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Questions" value="842" unit="7 d" trend={wave(14, { base: 110, amp: 30, seed: 41 })} delta={{ label: "+18% vs. last week", direction: "up", intent: "good" }} />
        <KpiCard label="People" value="37" unit="asked" />
        <KpiCard label="Helpful" value="86" unit="%" tone="success" delta={{ label: "of 214 rated answers" }} />
        <KpiCard label="Median answer" value="3.4" unit="s" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Questions per day" description="Split by whether the answer was rated">
          <TimeSeriesChart
            label="Assistant questions per day"
            labels={days}
            stacked
            height={160}
            xTicks={7}
            series={[
              { id: "rated", name: "Rated", data: wave(14, { base: 30, amp: 8, seed: 42 }).map(Math.round) },
              { id: "unrated", name: "Not rated", data: wave(14, { base: 85, amp: 20, seed: 43 }).map(Math.round) },
            ]}
          />
        </Panel>
        <Panel title="Asked about" description="Products read, 7 d">
          <BarList
            label="Products read by the assistant"
            items={DATA_SOURCES.filter((d) => d.queries7d > 0)
              .sort((a, b) => b.queries7d - a.queries7d)
              .slice(0, 6)
              .map((d) => ({ id: d.product, label: PRODUCTS[d.product].name, value: d.queries7d }))}
          />
        </Panel>
      </div>
      <Panel
        title="Feedback"
        description="Not-helpful answers are reviewed weekly"
        actions={<SelectField label="Rating" value={rating} onChange={(e) => setRating(e.target.value)} options={[{ value: "all", label: "All" }, { value: "up", label: "Helpful" }, { value: "down", label: "Not helpful" }]} />}
        flush
      >
        <DataTable label="Answer feedback" columns={cols} rows={rows} getRowId={(f) => f.id} minWidth={760} />
      </Panel>
    </>
  );
}

const PAGES = {
  ask: () => <AskPage />,
  history: () => <HistoryPage />,
  sources: () => <SourcesPage />,
  usage: () => <UsagePage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="assistant" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Ask: Story = {
  ...app("ask"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Ask" })).toBeInTheDocument();
    const thread = c.getByRole("list", { name: "Conversation" });
    await expect(within(thread).getByRole("link", { name: /^SIEM 2:/ })).toHaveAttribute("href", "#siem/signals/sig-88213");
    await expect(within(c.getByRole("list", { name: "Sources read" })).getAllByRole("link")).toHaveLength(5);
    const send = c.getByRole("button", { name: "Send" });
    await expect(send).toBeDisabled();
    await userEvent.type(c.getByRole("textbox", { name: "Ask a follow-up" }), "Was any data exfiltrated?");
    await userEvent.click(send);
    await expect(within(thread).getAllByRole("listitem")).toHaveLength(4);
    await expect(within(thread).getByText("Was any data exfiltrated?")).toBeInTheDocument();
    await expect(c.getByRole("textbox", { name: "Ask a follow-up" })).toHaveValue("");
  },
};

export const HistoryList: Story = {
  name: "History",
  ...app("history"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Conversation summary")).toHaveTextContent("migration 0142");
    await userEvent.type(c.getByRole("searchbox", { name: "Search conversations" }), "backup");
    await expect(c.getByRole("table", { name: "Conversations" }).querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Sources: Story = {
  ...app("sources"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("10")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Allow Identity" }));
    await expect(c.getByText("11")).toBeInTheDocument();
  },
};

export const Usage: Story = {
  ...app("usage"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Rating" }), "down");
    await expect(c.getByRole("table", { name: "Answer feedback" }).querySelectorAll("tbody tr")).toHaveLength(2);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
