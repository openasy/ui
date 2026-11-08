import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ArrowLeft,
  Building2,
  CalendarCheck,
  CalendarDays,
  CheckSquare,
  Copy,
  FileDown,
  Kanban,
  LayoutDashboard,
  LifeBuoy,
  Mail,
  Phone,
  Plus,
  StickyNote,
  Trophy,
  Users,
} from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";

// CRM keeps companies, contacts and deals in the install, with pipeline stages and their probability set in crm.yaml,
// tasks and activities on every deal, quotes as PDF and a meeting link people book from. Linked to Audience, a lead's
// profile shows what they did on the site before the first call.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pipeline", label: "Pipeline", icon: Kanban },
  { id: "companies", label: "Companies", icon: Building2 },
  { id: "tasks", label: "Tasks", icon: CheckSquare, count: 4 },
  { id: "meetings", label: "Meeting link", icon: CalendarDays },
];

const meta = {
  title: "Products/Crm",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
const tl = (n: number) => `${n.toLocaleString("en")} TL`;

const STAGES = [
  { id: "lead", name: "Lead", p: 10, staleDays: 14 },
  { id: "demo", name: "Demo", p: 25, staleDays: 10 },
  { id: "proposal", name: "Proposal", p: 50, staleDays: 10 },
  { id: "negotiation", name: "Negotiation", p: 75, staleDays: 7 },
] as const;
type StageId = (typeof STAGES)[number]["id"] | "won" | "lost";

interface Deal {
  id: string;
  name: string;
  company: string;
  contact: string;
  value: number;
  stage: StageId;
  owner: string;
  close: string;
  /** Days since the last activity. */
  quiet: number;
  source: string;
  lostReason?: string;
}

const DEALS: Deal[] = [
  {
    id: "d1",
    name: "5 users",
    company: "Er Turizm",
    contact: "Nihan Er",
    value: 45000,
    stage: "lead",
    owner: "Burak Şahin",
    close: "Dec",
    quiet: 2,
    source: "Live Chat",
  },
  {
    id: "d2",
    name: "Pharmacy chain, 8 branches",
    company: "Kaya Eczane",
    contact: "Elif Kaya",
    value: 96000,
    stage: "lead",
    owner: ME,
    close: "Jan",
    quiet: 1,
    source: "Forms",
  },
  {
    id: "d3",
    name: "12 users",
    company: "Tekin Yapı",
    contact: "Okan Tekin",
    value: 108000,
    stage: "demo",
    owner: ME,
    close: "Nov",
    quiet: 0,
    source: "Meeting link",
  },
  {
    id: "d4",
    name: "Business upgrade",
    company: "Polat Gıda",
    contact: "Seda Polat",
    value: 84000,
    stage: "demo",
    owner: "Selin Aydın",
    close: "Nov",
    quiet: 16,
    source: "Messages",
  },
  {
    id: "d5",
    name: "Renewal and 20 more users",
    company: "Avcı Lojistik",
    contact: "Gizem Avcı",
    value: 300000,
    stage: "proposal",
    owner: "Hakan Yıldız",
    close: "Nov",
    quiet: 1,
    source: "Existing customer",
  },
  {
    id: "d6",
    name: "e-Arşiv for 3 shops",
    company: "Kılıç Ticaret",
    contact: "Murat Kılıç",
    value: 36000,
    stage: "proposal",
    owner: ME,
    close: "Dec",
    quiet: 12,
    source: "Forms",
  },
  {
    id: "d7",
    name: "3-year agreement",
    company: "Yıldız Mimarlık",
    contact: "Hakan Yıldız",
    value: 210000,
    stage: "negotiation",
    owner: "Selin Aydın",
    close: "Nov",
    quiet: 3,
    source: "Referral",
  },
  {
    id: "d8",
    name: "Pro, 6 users",
    company: "Aksoy Danışmanlık",
    contact: "Kerem Aksoy",
    value: 54000,
    stage: "won",
    owner: "Burak Şahin",
    close: "4 Nov",
    quiet: 4,
    source: "Analytics",
  },
  {
    id: "d9",
    name: "40 users",
    company: "Demir İnşaat",
    contact: "Mehmet Demir",
    value: 120000,
    stage: "lost",
    owner: "Hakan Yıldız",
    close: "2 Nov",
    quiet: 6,
    source: "Forms",
    lostReason: "Chose a cheaper tool",
  },
];

const stageOf = (id: StageId) => STAGES.find((s) => s.id === id);
const isStale = (d: Deal) => {
  const s = stageOf(d.stage);
  return s ? d.quiet > s.staleDays : false;
};
const weighted = (d: Deal) => Math.round((d.value * (stageOf(d.stage)?.p ?? (d.stage === "won" ? 100 : 0))) / 100);

/* -------------------------------------------------------------- overview */

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const WON_LOST = [
  [410000, 160000],
  [380000, 220000],
  [295000, 140000],
  [520000, 180000],
  [610000, 250000],
  [54000, 120000],
];

function OverviewPage() {
  const open = DEALS.filter((d) => stageOf(d.stage));
  const forecast = DEALS.filter((d) => d.close === "Nov" || d.stage === "won").reduce((n, d) => n + weighted(d), 0);
  return (
    <>
      <PageHeader
        title="Overview"
        description="The pipeline today and the forecast for November. A deal counts at its value times its stage's probability, in the month it is expected to close."
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="Open pipeline" value={tl(open.reduce((n, d) => n + d.value, 0))} delta={{ label: `${open.length} deals`, intent: "neutral" }} />
        <KpiCard label="Forecast, November" value={tl(forecast)} delta={{ label: "won and weighted open deals", intent: "neutral" }} />
        <KpiCard label="Won in November" value={tl(54000)} icon={Trophy} delta={{ label: "1 deal", intent: "neutral" }} />
        <KpiCard label="Win rate, 90 days" value="38%" delta={{ label: "+4 points", direction: "up", intent: "good" }} />
        <KpiCard
          label="Stale deals"
          value={String(DEALS.filter(isStale).length)}
          tone="warning"
          delta={{ label: "no activity longer than the stage allows", intent: "bad" }}
        />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Won and lost" description="Value by month">
          <StackedBarChart
            label="Value won and lost by month"
            categories={MONTHS}
            segments={[
              { id: "won", name: "Won", color: "var(--oa-success)" },
              { id: "lost", name: "Lost", color: "var(--oa-danger)" },
            ]}
            values={WON_LOST}
            height={200}
            xTicks={6}
            format={(v) => tl(v)}
          />
        </Panel>
        <Panel title="Why deals were lost" description="90 days">
          <BarList
            label="Reasons deals were lost"
            items={[
              { id: "price", label: "Chose a cheaper tool", value: 7 },
              { id: "timing", label: "Not this year", value: 5 },
              { id: "feature", label: "Needed payroll too", value: 4 },
              { id: "silent", label: "Stopped answering", value: 3 },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Pipeline by owner" flush>
        <DataTable
          label="Pipeline by owner"
          rows={[ME, "Hakan Yıldız", "Selin Aydın", "Burak Şahin"].map((o) => {
            const mine = open.filter((d) => d.owner === o);
            return {
              owner: o,
              deals: mine.length,
              value: mine.reduce((n, d) => n + d.value, 0),
              weighted: mine.reduce((n, d) => n + weighted(d), 0),
              stale: mine.filter(isStale).length,
            };
          })}
          getRowId={(r) => r.owner}
          minWidth={640}
          columns={[
            {
              id: "owner",
              header: "Owner",
              cell: (r) => (
                <span className="flex items-center gap-2">
                  <Avatar name={r.owner} size="sm" />
                  {r.owner}
                </span>
              ),
            },
            { id: "deals", header: "Open deals", align: "right", mono: true, cell: (r) => r.deals },
            { id: "value", header: "Value", align: "right", mono: true, sortValue: (r) => r.value, cell: (r) => tl(r.value) },
            { id: "weighted", header: "Weighted", align: "right", mono: true, sortValue: (r) => r.weighted, cell: (r) => tl(r.weighted) },
            {
              id: "stale",
              header: "Stale",
              align: "right",
              cell: (r) => (r.stale ? <Badge tone="warning">{r.stale}</Badge> : <span className="text-xs text-fg-muted">0</span>),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ deal */

interface Activity {
  id: string;
  kind: "call" | "email" | "meeting" | "note" | "ticket";
  at: string;
  who: string;
  text: string;
}

const ACTIVITIES: Activity[] = [
  { id: "a1", kind: "ticket", at: "Today 08:36", who: "Helpdesk", text: "Ticket #4821 opened: Invoices fail to send since this morning" },
  { id: "a2", kind: "email", at: "Yesterday 16:10", who: "Hakan Yıldız", text: "Sent quote Q-2026-118 as PDF" },
  { id: "a3", kind: "meeting", at: "4 Nov 11:00", who: "Hakan Yıldız", text: "Renewal call with Gizem Avcı and their finance lead, in Meet" },
  { id: "a4", kind: "note", at: "4 Nov 11:45", who: "Hakan Yıldız", text: "Wants 20 more users for the new Mersin depot; asks for a 3-year price." },
];

const KIND_ICON = { call: Phone, email: Mail, meeting: CalendarCheck, note: StickyNote, ticket: LifeBuoy } as const;

const LINES = [
  { id: "q1", item: "Acme Books Business, 48 users, 12 months", qty: 48, price: 3750 },
  { id: "q2", item: "Acme Books Business, 20 more users, 12 months", qty: 20, price: 3750 },
  { id: "q3", item: "Onboarding for the Mersin depot", qty: 1, price: 45000 },
];

function DealView({ deal, onBack }: { deal: Deal; onBack: () => void }) {
  const [stage, setStage] = useState<StageId>(deal.stage);
  const [activities, setActivities] = useState(ACTIVITIES);
  const [logging, setLogging] = useState(false);
  const [note, setNote] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const subtotal = LINES.reduce((n, l) => n + l.qty * l.price, 0);
  const s = stageOf(stage);
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Pipeline", href: "#pipeline" }, { label: deal.company }]}
        title={`${deal.company}: ${deal.name}`}
        meta={
          <StatusBadge tone={stage === "won" ? "success" : stage === "lost" ? "danger" : "info"}>{s?.name ?? (stage === "won" ? "Won" : "Lost")}</StatusBadge>
        }
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onBack}>
              Back to the pipeline
            </Button>
            {stage !== "won" && (
              <Button
                variant="primary"
                icon={<Trophy />}
                onClick={() => {
                  setStage("won");
                  setNotice(`Won: ${tl(deal.value)}. November's forecast now counts it in full, and the campaign that brought it gets the credit.`);
                }}
              >
                Mark won
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
      <ol aria-label="Stages" className="mb-2.5 flex overflow-hidden rounded-md border border-line">
        {STAGES.map((x, i) => {
          const reached = stage === "won" || STAGES.findIndex((y) => y.id === stage) >= i;
          return (
            <li
              key={x.id}
              aria-current={x.id === stage ? "step" : undefined}
              className={cn(
                "flex grow flex-col border-r border-line px-3 py-1.5 text-xs last:border-r-0",
                reached ? "bg-accent-soft text-accent-text" : "bg-surface text-fg-muted",
              )}
            >
              <span className="font-medium">{x.name}</span>
              <span className="text-2xs">{x.p}%</span>
            </li>
          );
        })}
        <li
          aria-current={stage === "won" ? "step" : undefined}
          className={cn("flex grow flex-col px-3 py-1.5 text-xs", stage === "won" ? "bg-success-soft text-fg" : "bg-surface text-fg-muted")}
        >
          <span className="font-medium">Won</span>
          <span className="text-2xs">100%</span>
        </li>
      </ol>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <KpiGrid minWidth={150}>
            <KpiCard label="Value" value={tl(deal.value)} />
            <KpiCard label="Weighted" value={tl(Math.round((deal.value * (s?.p ?? (stage === "won" ? 100 : 0))) / 100))} unit={s ? `at ${s.p}%` : undefined} />
            <KpiCard label="Expected close" value="28 Nov" />
          </KpiGrid>
          <Panel
            aria-label="Quote"
            title="Quote Q-2026-118"
            description="Sent yesterday as PDF; prices without KDV"
            actions={
              <Button size="sm" icon={<FileDown />}>
                Download PDF
              </Button>
            }
            flush
          >
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Quote lines</caption>
              <thead className="bg-canvas text-xs text-fg-muted">
                <tr>
                  <th className="px-3 py-1.5 font-semibold">Item</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Qty</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Price</th>
                  <th className="px-3 py-1.5 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {LINES.map((l) => (
                  <tr key={l.id} className="border-t border-line">
                    <td className="px-3 py-1.5">{l.item}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{l.qty}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{tl(l.price)}</td>
                    <td className="px-3 py-1.5 text-right font-mono text-xs">{tl(l.qty * l.price)}</td>
                  </tr>
                ))}
                <tr className="border-t border-line font-semibold">
                  <td className="px-3 py-1.5" colSpan={3}>
                    Total, without KDV
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-xs">{tl(subtotal)}</td>
                </tr>
              </tbody>
            </table>
          </Panel>
          <Panel
            aria-label="Activities"
            title="Activities"
            actions={
              <Button size="sm" icon={<Plus />} onClick={() => setLogging(true)}>
                Log an activity
              </Button>
            }
          >
            <ol aria-label="Activity" className="flex flex-col gap-2">
              {activities.map((a) => {
                const Icon = KIND_ICON[a.kind];
                return (
                  <li key={a.id} className="flex gap-2 text-sm">
                    <span className="grid size-6 shrink-0 place-items-center rounded-full bg-subtle text-fg-muted">
                      <Icon aria-hidden className="size-3.5" />
                    </span>
                    <span className="flex min-w-0 flex-col">
                      <span className="text-fg">{a.text}</span>
                      <span className="text-2xs text-fg-muted">
                        {a.who} · {a.at}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </div>
        <div className="flex flex-col gap-2.5">
          <Panel title="Contact" aria-label="Contact">
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-2">
                <Avatar name={deal.contact} size="sm" />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-fg">{deal.contact}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">gizem@avcilojistik.example.com</span>
                </span>
              </span>
              <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1">
                <dt className="text-fg-muted">Company</dt>
                <dd className="text-fg">{deal.company}, logistics, İstanbul</dd>
                <dt className="text-fg-muted">Owner</dt>
                <dd className="text-fg">{deal.owner}</dd>
                <dt className="text-fg-muted">Consent</dt>
                <dd className="text-fg">Email yes, from Consent</dd>
              </dl>
            </div>
          </Panel>
          <Panel title="On the site" description="From Audience">
            <ul aria-label="On the site" className="flex flex-col gap-1 text-xs">
              <li className="text-fg">Read /pricing 3 times this month</li>
              <li className="text-fg">Opened Year-end closing checklist</li>
              <li className="text-fg">1 open ticket in Helpdesk: #4821</li>
            </ul>
          </Panel>
          <Panel title="Next task">
            <Checkbox label="Call Gizem about the 3-year price" description={`Due tomorrow · ${deal.owner}`} />
          </Panel>
        </div>
      </div>
      <Dialog
        open={logging}
        onOpenChange={setLogging}
        title="Log an activity"
        onSubmit={(e) => {
          e.preventDefault();
          if (!note.trim()) return;
          setActivities((a) => [{ id: `a${a.length + 1}`, kind: "call", at: "Today 14:05", who: ME, text: note.trim() }, ...a]);
          setNote("");
          setLogging(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setLogging(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!note.trim()}>
              Log call
            </Button>
          </>
        }
      >
        <TextField label="What was said" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Agreed on the 3-year price" />
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------- pipeline */

function DealCard({ d, onOpen }: { d: Deal; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-col gap-1 rounded-md border border-line bg-surface p-2.5 text-left hover:border-line-strong"
      >
        <span className="truncate text-sm font-medium text-fg">{d.company}</span>
        <span className="truncate text-xs text-fg-muted">{d.name}</span>
        <span className="flex items-center justify-between gap-2">
          <span className="font-mono text-xs font-semibold tabular-nums">{tl(d.value)}</span>
          <Avatar name={d.owner} size="sm" className="size-5" />
        </span>
        <span className="flex flex-wrap items-center gap-1 text-2xs text-fg-muted">
          Close {d.close}
          {isStale(d) && <Badge tone="warning">Stale, {d.quiet} d quiet</Badge>}
        </span>
      </button>
    </li>
  );
}

function PipelinePage({ initialDeal }: { initialDeal?: string }) {
  const [open, setOpen] = useState<string | null>(initialDeal ?? null);
  const [who, setWho] = useState<"all" | "mine">("all");
  const [query, setQuery] = useState("");
  const deal = DEALS.find((d) => d.id === open);
  if (deal) return <DealView deal={deal} onBack={() => setOpen(null)} />;
  const deals = DEALS.filter(
    (d) => (who === "all" || d.owner === ME) && `${d.company} ${d.name} ${d.contact}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  return (
    <>
      <PageHeader
        title="Pipeline"
        description="Deals by stage, with their value and owner. Stages and their probability are set in crm.yaml."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New deal
          </Button>
        }
      />
      <div className="mb-2.5 flex flex-wrap items-end gap-2">
        <SegmentedControl
          label="Deals"
          value={who}
          onChange={setWho}
          options={[
            { value: "all", label: "Everyone's" },
            { value: "mine", label: "Mine" },
          ]}
        />
        <SearchInput label="Search deals" placeholder="Company, deal or contact" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
      </div>
      <div className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-4">
        {STAGES.map((s) => {
          const inStage = deals.filter((d) => d.stage === s.id);
          return (
            <section key={s.id} aria-label={s.name} className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-line bg-canvas p-2">
              <header className="flex items-baseline justify-between gap-2 px-1">
                <h2 className="text-sm font-semibold text-fg">
                  {s.name} <span className="text-2xs font-normal text-fg-muted">{s.p}%</span>
                </h2>
                <span className="font-mono text-2xs text-fg-muted tabular-nums">{tl(inStage.reduce((n, d) => n + d.value, 0))}</span>
              </header>
              <ul className="flex flex-col gap-1.5">
                {inStage.map((d) => (
                  <DealCard key={d.id} d={d} onOpen={() => setOpen(d.id)} />
                ))}
                {!inStage.length && <li className="px-1 py-2 text-xs text-fg-muted">No deals</li>}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-2.5 text-xs text-fg-muted">
        This month: won {tl(54000)} (Aksoy Danışmanlık), lost {tl(120000)} (Demir İnşaat, chose a cheaper tool).
      </p>
    </>
  );
}

/* ------------------------------------------------------------- companies */

const COMPANIES = [
  { id: "c1", name: "Avcı Lojistik", sector: "Logistics", city: "İstanbul", contacts: 3, open: 300000, customer: "Business", owner: "Hakan Yıldız" },
  { id: "c2", name: "Yıldız Mimarlık", sector: "Architecture", city: "İzmir", contacts: 2, open: 210000, customer: "Pro", owner: "Selin Aydın" },
  { id: "c3", name: "Tekin Yapı", sector: "Construction", city: "İzmir", contacts: 1, open: 108000, customer: "Free", owner: ME },
  { id: "c4", name: "Kaya Eczane", sector: "Pharmacy", city: "Ankara", contacts: 1, open: 96000, customer: "–", owner: ME },
  { id: "c5", name: "Polat Gıda", sector: "Food", city: "Bursa", contacts: 2, open: 84000, customer: "Pro", owner: "Selin Aydın" },
  { id: "c6", name: "Aksoy Danışmanlık", sector: "Consulting", city: "İstanbul", contacts: 1, open: 0, customer: "Pro", owner: "Burak Şahin" },
];

function CompaniesPage() {
  const [query, setQuery] = useState("");
  const rows = COMPANIES.filter((c) => `${c.name} ${c.city} ${c.sector}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  const cols: Column<(typeof COMPANIES)[number]>[] = [
    {
      id: "name",
      header: "Company",
      width: "28%",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="text-2xs text-fg-muted">
            {c.sector} · {c.city}
          </span>
        </span>
      ),
    },
    {
      id: "customer",
      header: "Plan",
      cell: (c) => (c.customer === "–" ? <span className="text-xs text-fg-muted">Not a customer</span> : <Badge>{c.customer}</Badge>),
    },
    { id: "contacts", header: "Contacts", align: "right", mono: true, cell: (c) => c.contacts },
    { id: "open", header: "Open deals", align: "right", mono: true, sortValue: (c) => c.open, cell: (c) => (c.open ? tl(c.open) : "–") },
    {
      id: "owner",
      header: "Owner",
      cell: (c) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={c.owner} size="sm" className="size-5" />
          <span className="truncate text-xs">{c.owner}</span>
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Companies"
        description="Companies and their contacts. Each has one owner; contacts are kept in step with Audience."
        actions={
          <>
            <Button icon={<Users />}>Import CSV</Button>
            <Button variant="primary" icon={<Plus />}>
              New company
            </Button>
          </>
        }
      />
      <Panel flush>
        <div className="px-3 py-2">
          <SearchInput label="Search companies" placeholder="Name, city or sector" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
        </div>
        <div className="border-t border-line">
          <DataTable label="Companies" columns={cols} rows={rows} getRowId={(c) => c.id} defaultSort={{ id: "open", direction: "desc" }} minWidth={720} />
        </div>
      </Panel>
    </>
  );
}

/* ----------------------------------------------------------------- tasks */

const TASKS = [
  { id: "t1", text: "Send Tekin Yapı the demo recording and a quote", deal: "Tekin Yapı: 12 users", due: "Today", overdue: false },
  { id: "t2", text: "Follow up with Murat Kılıç on e-Arşiv", deal: "Kılıç Ticaret: e-Arşiv for 3 shops", due: "2 days ago", overdue: true },
  { id: "t3", text: "Ask Kaya Eczane for the branch list", deal: "Kaya Eczane: Pharmacy chain", due: "Tomorrow", overdue: false },
  { id: "t4", text: "Prepare the 2027 price list for renewals", deal: "No deal", due: "Fri", overdue: false },
];

function TasksPage() {
  const [done, setDone] = useState<string[]>([]);
  return (
    <>
      <PageHeader title="Tasks" description={`${ME}'s tasks, with reminders by email the morning they are due.`} />
      <Panel title="Open tasks" aria-label="Open tasks">
        <ul aria-label="Tasks" className="flex flex-col gap-2">
          {TASKS.map((t) => (
            <li key={t.id} className="flex items-start justify-between gap-3 border-b border-subtle pb-2 last:border-0">
              <Checkbox
                label={t.text}
                description={t.deal}
                checked={done.includes(t.id)}
                onChange={(e) => setDone((d) => (e.target.checked ? [...d, t.id] : d.filter((x) => x !== t.id)))}
              />
              <StatusBadge tone={done.includes(t.id) ? "success" : t.overdue ? "danger" : "neutral"}>{done.includes(t.id) ? "Done" : t.due}</StatusBadge>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- meetings */

const SLOTS = ["Mon 10 Nov 10:00", "Mon 10 Nov 14:30", "Tue 11 Nov 11:00", "Wed 12 Nov 09:30", "Wed 12 Nov 16:00"];
const BOOKINGS = [
  { id: "b1", who: "Okan Tekin", company: "Tekin Yapı", at: "Today 16:00", made: "Contact and a deal in Demo created" },
  { id: "b2", who: "Elif Kaya", company: "Kaya Eczane", at: "Mon 10 Nov 14:30", made: "Added to the deal in Lead" },
];

function MeetingsPage() {
  const [copied, setCopied] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  return (
    <>
      <PageHeader
        title="Meeting link"
        description="A page where people book a demo in your free time. Each booking creates or finds the contact and a deal, and a Meet link in the invitation."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          aria-label="Booking page"
          title="meet.example.com/emily-clark/demo"
          actions={
            <IconButton label="Copy link" size="xs" onClick={() => setCopied(true)}>
              <Copy className="size-3.5" />
            </IconButton>
          }
        >
          <div className="flex flex-col gap-2">
            {copied && (
              <p role="status" className="text-xs text-success">
                Link copied.
              </p>
            )}
            <span className="text-sm font-semibold text-fg">Acme Books demo, 30 minutes with {ME}</span>
            <span className="text-xs text-fg-muted">Free times from Calendar, Europe/Istanbul</span>
            <ul aria-label="Free times" className="grid gap-1.5 sm:grid-cols-2">
              {SLOTS.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    aria-pressed={slot === s}
                    onClick={() => setSlot(s)}
                    className={cn(
                      "w-full rounded-md border px-2.5 py-1.5 text-left text-sm",
                      slot === s ? "border-accent bg-accent-soft text-accent-text" : "border-line text-fg hover:bg-canvas",
                    )}
                  >
                    {s}
                  </button>
                </li>
              ))}
            </ul>
            {slot && <Callout tone="info" title={`A visitor picking ${slot} is asked for name, email and company, then gets the invitation.`} />}
          </div>
        </Panel>
        <Panel title="Booked" flush>
          <ul aria-label="Bookings" className="flex flex-col">
            {BOOKINGS.map((b) => (
              <li key={b.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <Avatar name={b.who} size="sm" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-sm text-fg">
                    {b.who}, {b.company}
                  </span>
                  <span className="text-2xs text-fg-muted">{b.made}</span>
                </span>
                <span className="shrink-0 text-xs text-fg-muted">{b.at}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `pipelines:
  sales:
    stages:
      - { id: lead, name: Lead, probability: 10%, stale_after: 14d }
      - { id: demo, name: Demo, probability: 25%, stale_after: 10d }
      - { id: proposal, name: Proposal, probability: 50%, stale_after: 10d }
      - { id: negotiation, name: Negotiation, probability: 75%, stale_after: 7d }
    lost_reasons: [Chose a cheaper tool, Not this year, Needed payroll too, Stopped answering]
currency: TRY
quotes:
  vat: 20%
  template: quotes/acme.html
meeting_link:
  calendar: calendar     # OpenAsy Calendar
  length: 30m
  creates_deal_in: demo
roles:
  admins: [group:sales-leads]
  editors: [group:sales]
  viewers: [group:everyone]`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="crm"
      file="crm.yaml"
      applied="2 weeks ago"
      yaml={YAML}
      groups={[
        {
          title: "Pipeline",
          description: "A deal counts toward the forecast at its value times its stage's probability.",
          items: STAGES.map((s) => ({
            label: s.name,
            value: `${s.p}%, stale after ${s.staleDays} days without activity`,
            path: `pipelines.sales.stages.${s.id}`,
          })),
        },
        {
          title: "Quotes and meetings",
          items: [
            { label: "Currency and KDV", value: "TRY, KDV 20% added on the PDF", path: "quotes.vat" },
            { label: "Meeting link", value: "30 minutes from Calendar; new deals start in Demo", path: "meeting_link" },
          ],
        },
        {
          title: "Who may change what",
          items: [{ label: "Roles", value: "Sales leads are admins; sales edit what they own; everyone may view", path: "roles" }],
        },
      ]}
    />
  );
}

const PAGES: PageMap = {
  overview: () => <OverviewPage />,
  pipeline: () => <PipelinePage />,
  companies: () => <CompaniesPage />,
  tasks: () => <TasksPage />,
  meetings: () => <MeetingsPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string, pages: PageMap = PAGES): Story => ({ render: () => <ProductApp product="crm" nav={nav} pages={pages} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Reasons deals were lost" })).toHaveTextContent("Chose a cheaper tool");
    await expect(
      within(c.getByRole("table", { name: "Pipeline by owner" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(4);
  },
};

export const Pipeline: Story = {
  ...app("pipeline"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const demo = c.getByRole("region", { name: "Demo" });
    await expect(within(demo).getAllByRole("listitem")).toHaveLength(2);
    await expect(demo).toHaveTextContent("Stale, 16 d quiet");
    await userEvent.click(c.getByRole("radio", { name: "Mine" }));
    await expect(within(c.getByRole("region", { name: "Proposal" })).getAllByRole("listitem")).toHaveLength(1);
    await userEvent.click(c.getByRole("radio", { name: "Everyone's" }));
    await userEvent.click(within(c.getByRole("region", { name: "Proposal" })).getByRole("button", { name: /Avcı Lojistik/ }));
    await expect(c.getByRole("heading", { level: 1, name: "Avcı Lojistik: Renewal and 20 more users" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

const DEAL_PAGES: PageMap = { ...PAGES, pipeline: () => <PipelinePage initialDeal="d5" /> };

export const DealPage: Story = {
  name: "Deal",
  ...app("pipeline", DEAL_PAGES),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Quote lines" })).toHaveTextContent("Total, without KDV300,000 TL");
    await expect(c.getByRole("list", { name: "On the site" })).toHaveTextContent("Read /pricing 3 times this month");
    await expect(c.getByRole("list", { name: "Activity" })).toHaveTextContent("Ticket #4821");
  },
};

export const MarkWon: Story = {
  name: "Mark a deal won",
  ...app("pipeline", DEAL_PAGES),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Mark won" }));
    await expect(c.getByRole("status")).toHaveTextContent("Won: 300,000 TL.");
    await expect(
      within(c.getByRole("list", { name: "Stages" }))
        .getByText("Won")
        .closest("li"),
    ).toHaveAttribute("aria-current", "step");
  },
};

export const LogActivity: Story = {
  name: "Log an activity",
  ...app("pipeline", DEAL_PAGES),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Log an activity" }));
    const dialog = within(within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Log an activity" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "What was said" }), "Agreed on the 3-year price");
    await userEvent.click(dialog.getByRole("button", { name: "Log call" }));
    await expect(within(c.getByRole("list", { name: "Activity" })).getAllByRole("listitem")[0]).toHaveTextContent("Agreed on the 3-year price");
  },
};

export const Companies: Story = {
  ...app("companies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Companies" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Avcı Lojistik");
    await userEvent.type(c.getByRole("searchbox", { name: "Search companies" }), "izmir");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    blur(canvasElement);
  },
};

export const Tasks: Story = {
  ...app("tasks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("checkbox", { name: /Follow up with Murat Kılıç/ }));
    await expect(c.getByRole("checkbox", { name: /Follow up with Murat Kılıç/ })).toBeChecked();
    await expect(c.getByRole("list", { name: "Tasks" })).toHaveTextContent("Done");
    blur(canvasElement);
  },
};

export const MeetingLink: Story = {
  name: "Meeting link",
  ...app("meetings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Tue 11 Nov 11:00" }));
    await expect(c.getByRole("button", { name: "Tue 11 Nov 11:00" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(c.getByRole("button", { name: "Copy link" }));
    await expect(c.getByText("Link copied.")).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("crm.yaml as applied")).toHaveTextContent("probability: 75%");
  },
};
