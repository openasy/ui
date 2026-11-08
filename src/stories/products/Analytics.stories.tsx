import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Activity,
  ArrowLeft,
  Copy,
  ExternalLink,
  Flame,
  Gauge as GaugeIcon,
  Globe,
  LayoutDashboard,
  Mail,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  Repeat,
  Route as RouteIcon,
  Search,
  Send,
  Share2,
  ShoppingCart,
  SkipForward,
  StickyNote,
  Target,
  Trash2,
  Users,
  Video,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs, type TabItem } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Dialog } from "../../components/Dialog";
import { BarList } from "../../charts/BarList";
import { DonutChart } from "../../charts/DonutChart";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { formatNumber } from "../../lib/format";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import {
  AI_ASSISTANTS,
  ALERT_HISTORY,
  ALERT_RULES,
  ANNOTATIONS,
  AOV,
  ATTRIBUTION,
  BROWSERS,
  CAMPAIGNS,
  CHANNELS,
  COHORTS,
  COUNTRIES,
  DAYS,
  DEVICES,
  DOWNLOADS,
  EMAIL_REPORTS,
  FLOWS,
  FRUSTRATION,
  GOALS,
  LANGUAGES,
  LCP_DAILY,
  LIFECYCLE,
  METRICS,
  NEW_RETURNING,
  NOT_FOUND,
  ORDERS,
  OUTBOUND,
  PAGES as PAGE_ROWS,
  PRODUCTS,
  REALTIME,
  REVENUE_BY,
  REVENUE_DAILY,
  SCREENS,
  SEARCH,
  SEARCHES,
  SHARE_LINKS,
  SHOP_FUNNEL,
  SOURCES,
  STICKINESS,
  SYSTEMS,
  TEAM,
  TIME_ZONES,
  TOTAL_VIEWS,
  TOTAL_VISITORS,
  TOTAL_VISITS,
  VISITORS_DAILY,
  VISITORS_LAST_YEAR,
  VISITORS_PREVIOUS,
  VITALS,
  VITALS_BY_DEVICE,
  VITALS_PAGES,
  lira,
  num,
  pct,
  secs,
  type Annotation,
  type Campaign,
  type Channel,
  type DeviceKind,
  type EmailReport,
  type Engine,
  type Frustration,
  type Goal,
  type Model,
  type PageRow,
  type Query,
  type ShareLink,
  type Source,
  type Vital,
} from "./analytics/data";
import {
  AnnotationStrip,
  CohortGrid,
  CsvButton,
  Flag,
  PathFlow,
  ReportBar,
  ReportProvider,
  SplitBar,
  useDelta,
  useReport,
  useTab,
  type Compare,
} from "./analytics/parts";

// Analytics as a whole: the reports a site's owner expects from GA4, Matomo or Plausible, grouped as the navigation
// grows (overview and realtime, where visits come from and who they are, what they do, what they convert to, whether
// they come back, how fast the pages are and how the site does in search), and the funnels, forms, heatmaps and
// replays built before. Every report shares one filter bar: site, period, comparison, saved segment and filters.
// Settings that live in analytics.yaml are read-only; the Visits and Sites pages are built in the product as they are.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "realtime", label: "Realtime", icon: Activity, count: REALTIME.now },
  { id: "acquisition", label: "Acquisition", icon: Share2 },
  { id: "visitors", label: "Visitors", icon: Users },
  { id: "behavior", label: "Behavior", icon: MousePointerClick },
  { id: "conversions", label: "Conversions", icon: Target },
  { id: "ecommerce", label: "Ecommerce", icon: ShoppingCart },
  { id: "retention", label: "Retention", icon: Repeat },
  { id: "performance", label: "Performance", icon: GaugeIcon },
  { id: "search", label: "Search", icon: Search },
  { id: "heatmaps", label: "Heatmaps", icon: Flame },
  { id: "replays", label: "Replays", icon: Video, count: 3 },
  { id: "visits", label: "Visits", icon: RouteIcon },
  { id: "sharing", label: "Sharing", icon: Send },
  { id: "sites", label: "Sites", icon: Globe, count: 2 },
];

const meta = {
  title: "Products/Analytics",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

interface Step {
  label: string;
  rule: string;
  visits: number;
  /** Median seconds from the step before. */
  median: number | null;
}

const FUNNELS: Array<{ id: string; name: string; steps: Step[] }> = [
  {
    id: "trial",
    name: "Trial",
    steps: [
      { label: "Pricing", rule: "path /pricing", visits: 2140, median: null },
      { label: "Sign-up form", rule: "path /signup", visits: 912, median: 74 },
      { label: "Signed up", rule: "event signup", visits: 388, median: 51 },
      { label: "First project", rule: "event project-created", visits: 201, median: 412 },
    ],
  },
  {
    id: "checkout",
    name: "Checkout",
    steps: [
      { label: "Cart", rule: "path /cart", visits: 640, median: null },
      { label: "Address", rule: "path /checkout/address", visits: 402, median: 38 },
      { label: "Paid", rule: "path /checkout/done", visits: 266, median: 95 },
    ],
  },
];

const BY_SOURCE = [
  { source: "fall newsletter", entered: 840, done: 121 },
  { source: "google.com", entered: 610, done: 41 },
  { source: "Direct", entered: 402, done: 27 },
  { source: "linkedin.com", entered: 188, done: 9 },
  { source: "github.com", entered: 100, done: 3 },
];

interface Field {
  name: string;
  label: string;
  type: string;
  reached: number;
  /** Visits whose last field before leaving the form was this one. */
  left: number;
  /** Median seconds in the field. */
  time: number;
  /** Share of visits that came back to it after leaving it. */
  refilled: number;
}

const FORMS: Array<{ id: string; name: string; page: string; starts: number; submits: number; median: number; fields: Field[] }> = [
  {
    id: "signup",
    name: "form#signup",
    page: "/signup",
    starts: 912,
    submits: 388,
    median: 48,
    fields: [
      { name: "email", label: "Work email", type: "email", reached: 912, left: 96, time: 7, refilled: 3 },
      { name: "password", label: "Password", type: "password", reached: 801, left: 214, time: 19, refilled: 28 },
      { name: "company", label: "Company", type: "text", reached: 560, left: 41, time: 5, refilled: 1 },
      { name: "size", label: "Team size", type: "select", reached: 512, left: 33, time: 3, refilled: 0 },
      { name: "phone", label: "Phone", type: "tel", reached: 471, left: 140, time: 11, refilled: 9 },
    ],
  },
  {
    id: "contact",
    name: "form.contact-form",
    page: "/contact",
    starts: 214,
    submits: 151,
    median: 63,
    fields: [
      { name: "name", label: "Name", type: "text", reached: 214, left: 12, time: 4, refilled: 1 },
      { name: "email", label: "Email", type: "email", reached: 202, left: 9, time: 6, refilled: 2 },
      { name: "message", label: "Message", type: "textarea", reached: 193, left: 33, time: 41, refilled: 4 },
    ],
  },
];

/** Clicks on the pricing page: where each element is, as a share of the page, for the mock page in the frame. */
const CLICKS = [
  { id: "trial-pro", target: "a.btn.primary", text: "Start trial (Pro)", count: 612, x: 50, y: 31 },
  { id: "trial-team", target: "a.btn", text: "Start trial (Team)", count: 288, x: 78, y: 31 },
  { id: "toggle", target: "button#billing-yearly", text: "Yearly", count: 401, x: 50, y: 12 },
  { id: "compare", target: "a.compare", text: "Compare plans", count: 156, x: 22, y: 31 },
  { id: "faq", target: "summary", text: "Can I cancel any time?", count: 97, x: 30, y: 74 },
  { id: "logo", target: "a.logo", text: "Acme", count: 44, x: 8, y: 3 },
];
const SCROLL = [100, 92, 81, 64, 52, 40, 33, 24, 18, 11];

interface Replay {
  id: string;
  at: string;
  visitor: string;
  user: string | null;
  pages: number;
  duration: number;
  clicks: number;
  /** Several clicks on the same element within a second. */
  rage: number;
  /** Clicks that changed nothing on the page. */
  dead: number;
  device: string;
  source: string;
  entry: string;
}

const REPLAYS: Replay[] = [
  {
    id: "r1",
    at: "Today 11:42",
    visitor: "v-6Qp2",
    user: null,
    pages: 4,
    duration: 214,
    clicks: 11,
    rage: 2,
    dead: 1,
    device: "Desktop · Chrome",
    source: "fall newsletter",
    entry: "/pricing",
  },
  {
    id: "r2",
    at: "Today 11:17",
    visitor: "v-H81c",
    user: "u-1042",
    pages: 7,
    duration: 538,
    clicks: 23,
    rage: 0,
    dead: 3,
    device: "Mobile · Safari",
    source: "google.com",
    entry: "/",
  },
  {
    id: "r3",
    at: "Today 10:58",
    visitor: "v-pT0z",
    user: null,
    pages: 2,
    duration: 61,
    clicks: 3,
    rage: 0,
    dead: 0,
    device: "Desktop · Firefox",
    source: "Direct",
    entry: "/signup",
  },
];

const TIMELINE = [
  { at: 0, kind: "page", text: "Viewed /pricing" },
  { at: 9, kind: "click", text: "Clicked Yearly" },
  { at: 31, kind: "click", text: "Clicked Start trial (Pro)" },
  { at: 33, kind: "page", text: "Viewed /signup" },
  { at: 48, kind: "field", text: "Filled Work email" },
  { at: 71, kind: "field", text: "Filled Password" },
  { at: 102, kind: "rage", text: "Clicked Create account 4 times in a second" },
  { at: 140, kind: "field", text: "Left the form at Phone" },
  { at: 214, kind: "page", text: "Left from /signup" },
];

/* ----------------------------------------------------------------- parts */

/** A page of reports: its title, the shared filter bar and, when it has several, its tabs. */
function Report<T extends string>({
  title,
  description,
  meta,
  actions,
  tabs,
  tab,
  onTab,
  live,
  children,
}: {
  title: string;
  description: ReactNode;
  meta?: ReactNode;
  actions?: ReactNode;
  tabs?: ReadonlyArray<TabItem<T>>;
  tab?: T;
  onTab?: (t: T) => void;
  live?: boolean;
  children: ReactNode;
}) {
  return (
    <>
      <PageHeader title={title} description={description} meta={meta} actions={actions}>
        <ReportBar live={live} />
        {tabs && tab && onTab && <Tabs label={`${title} reports`} value={tab} onChange={onTab} items={tabs} />}
      </PageHeader>
      <div className="flex min-w-0 flex-col gap-2.5">{children}</div>
    </>
  );
}

const rate = (v: number) => `${v.toFixed(1)}%`;
const vitalTone = (k: Vital, v: number): Tone => (v <= VITALS[k].good ? "success" : v <= VITALS[k].poor ? "warning" : "danger");
const vitalWord = (t: Tone) => (t === "success" ? "Good" : t === "warning" ? "Needs improvement" : "Poor");

/* ----------------------------------------------------------- overview */

function OverviewPage() {
  const r = useReport();
  const delta = useDelta();
  const [notes, setNotes] = useState<Annotation[]>(ANNOTATIONS);
  const [active, setActive] = useState<string | undefined>();
  const [adding, setAdding] = useState(false);
  const compare = r.compare === "off" ? null : r.compare === "year" ? VISITORS_LAST_YEAR : VISITORS_PREVIOUS;
  const series = [
    { id: "visitors", name: "Visitors", data: VISITORS_DAILY.map(r.sc) },
    ...(compare
      ? [{ id: "compare", name: r.compare === "year" ? "Same days last year" : "Previous period", data: compare.map(r.sc), color: "var(--oa-fg-subtle)" }]
      : []),
  ];
  const max = Math.max(...series.flatMap((s) => s.data));
  const note = notes.find((n) => n.id === active);
  return (
    <Report title="Overview" description="Visits to shop on www.example.com, with where they came from and what they reached.">
      <Callout tone="info" title="Traffic spike on Nov 3, now ended">
        Visits were 2.3 times the usual for a Tuesday morning, 81% of them from the fall newsletter. The alert rule Traffic spike sent it; the day is marked on
        the chart.
      </Callout>
      <KpiGrid>
        {METRICS.map((m) => (
          <KpiCard
            key={m.id}
            label={m.label}
            value={m.format(m.count ? r.sc(m.value) : m.value)}
            unit={m.unit}
            delta={delta(m.value, m.previous, m.lastYear, { lowerIsBetter: m.lowerIsBetter, points: !m.count && m.id !== "duration" })}
          />
        ))}
      </KpiGrid>
      <Panel
        title="Visitors a day"
        description={
          compare ? `Against the ${r.compare === "year" ? "same days last year" : "30 days before"}, in grey.` : "Numbered marks are the team's annotations."
        }
        actions={
          <Button size="sm" variant="ghost" icon={<StickyNote aria-hidden />} onClick={() => setAdding(true)}>
            Add annotation
          </Button>
        }
      >
        <TimeSeriesChart label="Visitors a day" series={series} labels={DAYS} height={220} xTicks={6} />
        <AnnotationStrip
          days={DAYS}
          notes={notes}
          max={max}
          format={(v) => formatNumber(v)}
          active={active}
          onSelect={(id) => setActive(id === active ? undefined : id)}
        />
        {note && (
          <p className="mt-1 text-xs text-fg" aria-live="polite">
            <span className="font-semibold">{DAYS[note.day]}</span> · {note.text} <span className="text-fg-muted">· {note.by}</span>
          </p>
        )}
      </Panel>
      <div className="grid gap-2.5 lg:grid-cols-3">
        <Panel title="Channels" description="Visits">
          <BarList label="Visits by channel" items={CHANNELS.map((c) => ({ id: c.id, label: c.name, value: r.sc(c.visits) }))} />
        </Panel>
        <Panel title="Top pages" description="Views">
          <BarList label="Top pages" items={PAGE_ROWS.slice(0, 6).map((p) => ({ id: p.path, label: p.path, value: r.sc(p.views) }))} />
        </Panel>
        <Panel title="New and returning" description="Visitors">
          <DonutChart
            label="New and returning visitors"
            caption="visitors"
            slices={[
              { id: "new", name: "New", value: r.sc(NEW_RETURNING.new) },
              { id: "returning", name: "Returning", value: r.sc(NEW_RETURNING.returning) },
            ]}
          />
        </Panel>
        <Panel title="Countries" description="Visitors">
          <BarList
            label="Visitors by country"
            items={COUNTRIES.slice(0, 5).map((c) => ({
              id: c.id,
              label: (
                <>
                  <Flag code={c.code} /> {c.name}
                </>
              ),
              value: r.sc(c.visitors),
            }))}
          />
        </Panel>
        <Panel title="Devices" description="Visitors">
          <DonutChart label="Visitors by device" caption="visitors" slices={DEVICES.map((d) => ({ ...d, value: r.sc(d.value) }))} />
        </Panel>
        <Panel title="Goals" description="Conversion rate of visits">
          <BarList label="Goals" items={GOALS.map((g) => ({ id: g.id, label: g.name, value: pct(g.visits, TOTAL_VISITS) }))} format={(v) => `${v}%`} />
        </Panel>
      </div>
      <AnnotationDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={(day, text) => {
          const id = `a${notes.length + 1}`;
          setNotes([...notes, { id, day, text, by: TEAM.emily.name }].sort((a, b) => a.day - b.day));
          setActive(id);
          setAdding(false);
        }}
      />
    </Report>
  );
}

function AnnotationDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (day: number, text: string) => void }) {
  const [day, setDay] = useState(String(DAYS.length - 1));
  const [text, setText] = useState("");
  const [shared, setShared] = useState(true);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add an annotation"
      description="A note on a date, shown on every chart of the site: a launch, a campaign, a holiday, an outage."
      onSubmit={(e) => {
        e.preventDefault();
        if (text.trim()) onAdd(Number(day), text.trim());
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!text.trim()}>
            Add annotation
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <SelectField label="Date" value={day} onChange={(e) => setDay(e.target.value)} options={DAYS.map((d, i) => ({ value: String(i), label: d }))} />
        <TextField label="Note" value={text} onChange={(e) => setText(e.target.value)} placeholder="Instagram giveaway started" />
        <Switch checked={shared} onCheckedChange={setShared} label="Show to the team" description="Off: only you see it." />
      </div>
    </Dialog>
  );
}

/* ----------------------------------------------------------- realtime */

function RealtimePage() {
  const [paused, setPaused] = useState(false);
  const minutes = REALTIME.perMinute.map((_, i) => {
    const m = 13 + i;
    return `11:${String(m).padStart(2, "0")}`;
  });
  return (
    <Report
      title="Realtime"
      description="The last 30 minutes, as events arrive. A visitor counts as here for 5 minutes after their last event."
      live
      meta={<StatusBadge tone={paused ? "neutral" : "success"}>{paused ? "Paused" : "Live"}</StatusBadge>}
      actions={
        <Button icon={paused ? <Play aria-hidden /> : <Pause aria-hidden />} onClick={() => setPaused((p) => !p)}>
          {paused ? "Resume updates" : "Pause updates"}
        </Button>
      }
    >
      <KpiGrid>
        <KpiCard label="Visitors now" value={REALTIME.now} unit="last 5 min" />
        <KpiCard label="Visits" value={REALTIME.visits30} unit="last 30 min" />
        <KpiCard label="Page views" value={REALTIME.views30} unit="last 30 min" />
        <KpiCard
          label="Goals reached"
          value={6}
          unit="last 30 min"
          footer={<span className="text-xs text-fg-muted">2 Bought, 3 Signed up, 1 Brew guide</span>}
        />
      </KpiGrid>
      <Panel title="Page views a minute">
        <StackedBarChart
          label="Page views a minute"
          categories={minutes}
          segments={[{ id: "views", name: "Page views" }]}
          values={REALTIME.perMinute.map((v) => [v])}
          height={140}
          xTicks={6}
        />
      </Panel>
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.3fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Pages being read">
            <BarList label="Pages being read" items={REALTIME.pages.map((p) => ({ id: p.id, label: p.id, value: p.value }))} />
          </Panel>
          <Panel title="Countries">
            <BarList
              label="Visitors now by country"
              items={REALTIME.countries.map((c) => ({
                id: c.id,
                label: (
                  <>
                    <Flag code={c.id} /> {c.name}
                  </>
                ),
                value: c.value,
              }))}
            />
          </Panel>
        </div>
        <Panel title="Sources">
          <BarList label="Visitors now by source" items={REALTIME.sources.map((s) => ({ id: s.id, label: s.id, value: s.value }))} />
        </Panel>
        <Panel flush title="As it happens" description={paused ? "Paused: new events wait until you resume." : "Newest first."}>
          <ol aria-label="Latest events" className="flex flex-col">
            {REALTIME.feed.map((e) => (
              <li key={e.id} className="flex items-start gap-2 border-b border-subtle px-3 py-1.5 text-xs last:border-0">
                <span className="w-14 shrink-0 font-mono text-fg-muted tabular-nums">{e.at}</span>
                <span className="flex min-w-0 flex-col">
                  <span className={cn("truncate", e.kind === "goal" ? "font-semibold text-success" : "text-fg")}>{e.text}</span>
                  <span className="truncate text-2xs text-fg-muted">
                    {e.visitor} · {e.place}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </Report>
  );
}

/* -------------------------------------------------------- acquisition */

const ACQ_TABS = ["channels", "sources", "campaigns", "assistants"] as const;
type AcqTab = (typeof ACQ_TABS)[number];

function AcquisitionPage() {
  const [tab, setTab] = useTab(ACQ_TABS);
  const desc: Record<AcqTab, string> = {
    channels: "Every visit is put in one channel by its referrer and utm_* parameters, the first rule that matches.",
    sources: "The site that sent each visit, and the full address it came from without its query string.",
    campaigns: "The utm_source, utm_medium, utm_campaign, utm_term and utm_content of tagged links.",
    assistants: "Visits sent by AI assistants: a link in an answer, or utm_source set by the assistant.",
  };
  return (
    <Report
      title="Acquisition"
      description={desc[tab]}
      tabs={[
        { value: "channels", label: "Channels" },
        { value: "sources", label: "Sources" },
        { value: "campaigns", label: "Campaigns" },
        { value: "assistants", label: "AI assistants" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "channels" && <ChannelsTab />}
      {tab === "sources" && <SourcesTab />}
      {tab === "campaigns" && <CampaignsTab />}
      {tab === "assistants" && <AssistantsTab />}
    </Report>
  );
}

function ChannelsTab() {
  const r = useReport();
  const cols: Column<Channel>[] = [
    {
      id: "name",
      header: "Channel",
      width: "30%",
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="text-2xs text-fg-muted">{c.how}</span>
        </span>
      ),
    },
    { id: "visits", header: "Visits", align: "right", mono: true, sortValue: (c) => c.visits, cell: (c) => num(r.sc(c.visits)) },
    { id: "share", header: "Share", align: "right", mono: true, cell: (c) => `${pct(c.visits, TOTAL_VISITS)}%` },
    ...(r.compare !== "off"
      ? [
          {
            id: "change",
            header: "Change",
            align: "right" as const,
            mono: true,
            sortValue: (c: Channel) => c.visits / c.previous,
            cell: (c: Channel) => {
              const d = ((c.visits - c.previous) / c.previous) * 100;
              return <span className={d >= 0 ? "text-success" : "text-danger-text"}>{`${d >= 0 ? "+" : ""}${d.toFixed(0)}%`}</span>;
            },
          },
        ]
      : []),
    { id: "engagement", header: "Engaged", align: "right", mono: true, sortValue: (c) => c.engagement, cell: (c) => rate(c.engagement) },
    { id: "bounce", header: "Bounce", align: "right", mono: true, sortValue: (c) => c.bounce, cell: (c) => rate(c.bounce) },
    { id: "conversions", header: "Goals", align: "right", mono: true, sortValue: (c) => c.conversions, cell: (c) => num(r.sc(c.conversions)) },
    { id: "revenue", header: "Revenue", align: "right", mono: true, sortValue: (c) => c.revenue, cell: (c) => lira(r.sc(c.revenue)) },
  ];
  return (
    <>
      <Panel
        flush
        title="Channels"
        description={`${num(r.sc(TOTAL_VISITS))} visits. Engaged: stayed 10 seconds, saw 2 pages or reached a goal; bounce is the rest.`}
        actions={
          <CsvButton
            name="channels"
            rows={CHANNELS}
            columns={[
              ["Channel", (c) => c.name],
              ["Visits", (c) => r.sc(c.visits)],
              ["Engagement rate", (c) => c.engagement],
              ["Bounce rate", (c) => c.bounce],
              ["Goals", (c) => r.sc(c.conversions)],
              ["Revenue TRY", (c) => r.sc(c.revenue)],
            ]}
          />
        }
      >
        <DataTable label="Channels" columns={cols} rows={CHANNELS} getRowId={(c) => c.id} defaultSort={{ id: "visits", direction: "desc" }} minWidth={820} />
      </Panel>
      <p className="text-xs text-fg-muted">
        The rules are the same for every site; a site can add its own sources to a channel under channels in analytics.yaml, such as a partner&apos;s newsletter
        to Email.
      </p>
    </>
  );
}

function SourcesTab() {
  const r = useReport();
  const [id, setId] = useState("webrazzi");
  const s = SOURCES.find((x) => x.id === id)!;
  const cols: Column<Source>[] = [
    {
      id: "host",
      header: "Source",
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-medium">{x.host}</span>
          <span className="truncate text-2xs text-fg-muted">{x.channel}</span>
        </span>
      ),
    },
    { id: "visits", header: "Visits", align: "right", mono: true, sortValue: (x) => x.visits, cell: (x) => num(r.sc(x.visits)) },
    { id: "bounce", header: "Bounce", align: "right", mono: true, sortValue: (x) => x.bounce, cell: (x) => rate(x.bounce) },
  ];
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        flush
        title="Sources"
        actions={
          <CsvButton
            name="sources"
            rows={SOURCES}
            columns={[
              ["Source", (x) => x.host],
              ["Channel", (x) => x.channel],
              ["Visits", (x) => r.sc(x.visits)],
            ]}
          />
        }
      >
        <DataTable label="Sources" columns={cols} rows={SOURCES} getRowId={(x) => x.id} onRowClick={(x) => setId(x.id)} activeRowId={id} />
      </Panel>
      <Panel
        aria-label="Referring pages"
        title={`From ${s.host}`}
        description="Referring addresses, kept without their query string or fragment."
        className="self-start"
      >
        {s.referrers.length ? (
          <ul aria-label="Referring addresses" className="flex flex-col">
            {s.referrers.map((x) => (
              <li key={x.url} className="flex items-center justify-between gap-2 border-b border-subtle py-1.5 text-xs last:border-0">
                <span className="min-w-0 truncate font-mono text-fg" title={x.url}>
                  {x.url}
                </span>
                <span className="shrink-0 font-mono tabular-nums">{num(r.sc(x.visits))}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-fg-muted">
            {s.host === "Direct"
              ? "These visits had no referrer: a typed address, a bookmark or an app that sends none."
              : "No referrer: utm_source names this source on the links of the newsletter."}
          </p>
        )}
      </Panel>
    </div>
  );
}

const CAMPAIGN_KEYS = {
  campaign: { label: "utm_campaign", get: (c: Campaign) => c.campaign },
  medium: { label: "utm_source / utm_medium", get: (c: Campaign) => `${c.source} / ${c.medium}` },
  term: { label: "utm_term", get: (c: Campaign) => c.term ?? "(not set)" },
  content: { label: "utm_content", get: (c: Campaign) => c.content ?? "(not set)" },
};
type CampaignKey = keyof typeof CAMPAIGN_KEYS;

function CampaignsTab() {
  const r = useReport();
  const [by, setBy] = useState<CampaignKey>("campaign");
  const key = CAMPAIGN_KEYS[by];
  const rows = Object.values(
    CAMPAIGNS.reduce<Record<string, { id: string; visits: number; conversions: number; campaigns: Set<string> }>>((acc, c) => {
      const k = key.get(c);
      const row = (acc[k] ??= { id: k, visits: 0, conversions: 0, campaigns: new Set() });
      row.visits += c.visits;
      row.conversions += c.conversions;
      row.campaigns.add(c.campaign);
      return acc;
    }, {}),
  );
  const cols: Column<(typeof rows)[number]>[] = [
    { id: "key", header: key.label, cell: (x) => <span className="font-mono text-xs font-medium">{x.id}</span> },
    { id: "in", header: "Campaigns", cell: (x) => <span className="text-xs text-fg-muted">{[...x.campaigns].join(", ")}</span> },
    { id: "visits", header: "Visits", align: "right", mono: true, sortValue: (x) => x.visits, cell: (x) => num(r.sc(x.visits)) },
    { id: "conv", header: "Goals", align: "right", mono: true, sortValue: (x) => x.conversions, cell: (x) => num(r.sc(x.conversions)) },
    {
      id: "rate",
      header: "Goal rate",
      align: "right",
      mono: true,
      sortValue: (x) => x.conversions / x.visits,
      cell: (x) => `${pct(x.conversions, x.visits)}%`,
    },
  ];
  return (
    <>
      <SegmentedControl
        label="Group by"
        value={by}
        onChange={setBy}
        options={[
          { value: "campaign", label: "Campaign" },
          { value: "medium", label: "Source / medium" },
          { value: "term", label: "Term" },
          { value: "content", label: "Content" },
        ]}
      />
      <Panel
        flush
        title={`By ${key.label}`}
        actions={
          <CsvButton
            name={`campaigns-by-${by}`}
            rows={rows}
            columns={[
              [key.label, (x) => x.id],
              ["Visits", (x) => r.sc(x.visits)],
              ["Goals", (x) => r.sc(x.conversions)],
            ]}
          />
        }
      >
        <DataTable label="Campaigns" columns={cols} rows={rows} getRowId={(x) => x.id} defaultSort={{ id: "visits", direction: "desc" }} minWidth={640} />
      </Panel>
      <p className="text-xs text-fg-muted">
        utm_* parameters are kept on the visit and dropped from the page address. gclid, msclkid and yclid mark a visit as paid and are not kept.
      </p>
    </>
  );
}

function AssistantsTab() {
  const r = useReport();
  const ai = CHANNELS.find((c) => c.id === "ai")!;
  return (
    <>
      <KpiGrid>
        <KpiCard label="Visits from AI assistants" value={num(r.sc(ai.visits))} delta={useDelta()(ai.visits, ai.previous)} />
        <KpiCard label="Share of visits" value={`${pct(ai.visits, TOTAL_VISITS)}%`} />
        <KpiCard label="Engagement rate" value={rate(ai.engagement)} footer={<span className="text-xs text-fg-muted">Site average 61.6%</span>} />
        <KpiCard label="Goal rate" value={`${pct(ai.conversions, ai.visits)}%`} footer={<span className="text-xs text-fg-muted">Site average 4.4%</span>} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="By assistant" description="Visits">
          <BarList label="Visits by assistant" items={AI_ASSISTANTS.map((a) => ({ id: a.id, label: `${a.name} · ${a.host}`, value: r.sc(a.visits) }))} />
        </Panel>
        <Panel title="Landing pages" description="Where the answers linked to">
          <BarList
            label="Landing pages from AI assistants"
            items={[
              { id: "beans", label: "/products/espresso-beans", value: r.sc(388) },
              { id: "blog", label: "/blog/how-to-brew-filter-coffee", value: r.sc(301) },
              { id: "grinder", label: "/products/burr-grinder", value: r.sc(174) },
              { id: "home", label: "/", value: r.sc(157) },
            ]}
          />
        </Panel>
      </div>
      <Callout tone="info" title="What counts">
        A visit whose referrer is chatgpt.com, perplexity.ai, claude.ai, gemini.google.com or copilot.microsoft.com, or whose utm_source names one, as ChatGPT
        adds to the links it shows. An answer that names the site without a link sends no visit and is not counted.
      </Callout>
    </>
  );
}

/* ----------------------------------------------------------- visitors */

const VISITOR_TABS = ["locations", "devices", "languages"] as const;

function VisitorsPage() {
  const [tab, setTab] = useTab(VISITOR_TABS);
  return (
    <Report
      title="Visitors"
      description={
        tab === "locations"
          ? "Country, region and city, looked up in the install's GeoIP database when a batch arrives."
          : tab === "devices"
            ? "Kind of device, screen size, and browser and system with their major version."
            : "The browser's language and time zone, as the page reports them."
      }
      tabs={[
        { value: "locations", label: "Locations" },
        { value: "devices", label: "Devices" },
        { value: "languages", label: "Languages and time zones" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "locations" && <LocationsTab />}
      {tab === "devices" && <DevicesTab />}
      {tab === "languages" && <LanguagesTab />}
    </Report>
  );
}

function LocationsTab() {
  const r = useReport();
  const [level, setLevel] = useState<"countries" | "regions" | "cities">("countries");
  const [country, setCountry] = useState("tr");
  const c = COUNTRIES.find((x) => x.id === country)!;
  const rows =
    level === "countries"
      ? COUNTRIES.map((x) => ({ id: x.id, code: x.code, name: x.name, visitors: x.visitors }))
      : level === "regions"
        ? (c.regions ?? []).map((x) => ({ id: x.name, code: "", name: x.name, visitors: x.visitors }))
        : (c.regions ?? []).flatMap((x) => x.cities.map((y) => ({ id: y.name, code: "", name: `${y.name}, ${x.name}`, visitors: y.visitors })));
  const of = level === "countries" ? TOTAL_VISITORS : c.visitors;
  type Row = (typeof rows)[number];
  const cols: Column<Row>[] = [
    {
      id: "name",
      header: level === "countries" ? "Country" : level === "regions" ? "Region" : "City",
      cell: (x) => (
        <span className="flex items-center gap-1.5">
          {level === "countries" && <Flag code={x.code} />}
          <span className="font-medium">{x.name}</span>
        </span>
      ),
    },
    { id: "visitors", header: "Visitors", align: "right", mono: true, sortValue: (x) => x.visitors, cell: (x) => num(r.sc(x.visitors)) },
    {
      id: "share",
      header: "Share",
      align: "right",
      width: "30%",
      cell: (x) => (
        <span className="flex items-center justify-end gap-2">
          <span className="h-2 w-24 overflow-hidden rounded bg-subtle">
            <span className="block h-2 rounded" style={{ width: `${pct(x.visitors, of)}%`, background: "var(--oa-accent)" }} />
          </span>
          <span className="w-12 text-right font-mono text-xs tabular-nums">{pct(x.visitors, of)}%</span>
        </span>
      ),
    },
  ];
  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <SegmentedControl
          label="Level"
          value={level}
          onChange={setLevel}
          options={[
            { value: "countries", label: "Countries" },
            { value: "regions", label: "Regions" },
            { value: "cities", label: "Cities" },
          ]}
        />
        {level !== "countries" && (
          <>
            <SelectField
              aria-label="Country"
              className="w-44"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              options={COUNTRIES.filter((x) => x.regions).map((x) => ({ value: x.id, label: x.name }))}
            />
            <Button variant="ghost" icon={<ArrowLeft aria-hidden />} onClick={() => setLevel("countries")}>
              All countries
            </Button>
          </>
        )}
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          flush
          title={level === "countries" ? "Countries" : `${level === "regions" ? "Regions" : "Cities"} of ${c.name}`}
          description={level === "countries" ? "Pick a country for its regions and cities." : `${num(r.sc(c.visitors))} visitors`}
          actions={
            <CsvButton
              name={level}
              rows={rows}
              columns={[
                ["Place", (x) => x.name],
                ["Visitors", (x) => r.sc(x.visitors)],
              ]}
            />
          }
        >
          <DataTable
            label="Locations"
            columns={cols}
            rows={rows}
            getRowId={(x) => x.id}
            defaultSort={{ id: "visitors", direction: "desc" }}
            onRowClick={
              level === "countries"
                ? (x) => {
                    if (COUNTRIES.find((y) => y.id === x.id)?.regions) {
                      setCountry(x.id);
                      setLevel("regions");
                    }
                  }
                : undefined
            }
          />
        </Panel>
        <Callout tone="info" title="The IP address is never stored" className="self-start">
          It is looked up in a GeoIP database kept in the install (DB-IP Lite by default, updated monthly) as the batch arrives, and dropped: only the country,
          region and city are kept. No lookup leaves the server.
        </Callout>
      </div>
    </>
  );
}

function VersionTable({ label, rows }: { label: string; rows: Array<{ name: string; version: string; visitors: number }> }) {
  const r = useReport();
  const cols: Column<(typeof rows)[number]>[] = [
    { id: "name", header: label === "Browsers" ? "Browser" : "System", cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "version", header: "Version", mono: true, cell: (x) => x.version || "–" },
    { id: "visitors", header: "Visitors", align: "right", mono: true, sortValue: (x) => x.visitors, cell: (x) => num(r.sc(x.visitors)) },
    { id: "share", header: "Share", align: "right", mono: true, cell: (x) => `${pct(x.visitors, TOTAL_VISITORS)}%` },
  ];
  return (
    <Panel
      flush
      title={label}
      actions={
        <CsvButton
          name={label.toLowerCase()}
          rows={rows}
          columns={[
            ["Name", (x) => x.name],
            ["Version", (x) => x.version],
            ["Visitors", (x) => r.sc(x.visitors)],
          ]}
        />
      }
    >
      <DataTable label={label} columns={cols} rows={rows} getRowId={(x) => `${x.name}-${x.version}`} />
    </Panel>
  );
}

function DevicesTab() {
  const r = useReport();
  return (
    <>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Kind of device">
          <DonutChart label="Visitors by kind of device" caption="visitors" slices={DEVICES.map((d) => ({ ...d, value: r.sc(d.value) }))} />
        </Panel>
        <Panel title="Screen sizes" description="The screen in CSS pixels, rounded to the nearest common size.">
          <BarList
            label="Screen sizes"
            items={SCREENS.map((s) => ({ id: s.size, label: `${s.size}${s.kind ? ` · ${s.kind}` : ""}`, value: r.sc(s.visitors) }))}
          />
        </Panel>
        <VersionTable label="Browsers" rows={BROWSERS} />
        <VersionTable label="Systems" rows={SYSTEMS} />
      </div>
      <p className="text-xs text-fg-muted">
        Browser and system with their major version are read from the user agent as the batch arrives; the user agent itself is not kept.
      </p>
    </>
  );
}

function LanguagesTab() {
  const r = useReport();
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Languages" description="The browser's first language">
        <BarList
          label="Languages"
          items={LANGUAGES.map((l) => ({ id: l.code, label: l.code === "other" ? l.name : `${l.code} · ${l.name}`, value: r.sc(l.visitors) }))}
        />
      </Panel>
      <Panel title="Time zones" description="Where visitors' clocks are set">
        <BarList label="Time zones" items={TIME_ZONES.map((z) => ({ id: z.zone, label: z.zone, value: r.sc(z.visitors) }))} />
      </Panel>
    </div>
  );
}

/* ----------------------------------------------------------- behavior */

const BEHAVIOR_TABS = ["pages", "paths", "links", "sitesearch", "notfound", "frustration"] as const;
type BehaviorTab = (typeof BEHAVIOR_TABS)[number];

function BehaviorPage() {
  const [tab, setTab] = useTab(BEHAVIOR_TABS);
  const desc: Record<BehaviorTab, string> = {
    pages: "Each page with its views, time on it and how far down it was read.",
    paths: "Where visits went next from a page, two steps on.",
    links: "Clicks on links to other sites and on files the site offers.",
    sitesearch: "What people looked for in the site's own search.",
    notfound: "Pages that answered as not found, and where the links to them are.",
    frustration: "Rage clicks and dead clicks: where people click and nothing happens, or click again and again.",
  };
  return (
    <Report
      title="Behavior"
      description={desc[tab]}
      tabs={[
        { value: "pages", label: "Pages" },
        { value: "paths", label: "Paths" },
        { value: "links", label: "Links and downloads" },
        { value: "sitesearch", label: "Site search" },
        { value: "notfound", label: "Not found", count: NOT_FOUND.length },
        { value: "frustration", label: "Frustration" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "pages" && <PagesTab />}
      {tab === "paths" && <PathsTab />}
      {tab === "links" && <LinksTab />}
      {tab === "sitesearch" && <SiteSearchTab />}
      {tab === "notfound" && <NotFoundTab />}
      {tab === "frustration" && <FrustrationTab />}
    </Report>
  );
}

function PagesTab() {
  const r = useReport();
  const [view, setView] = useState<"all" | "entry" | "exit">("all");
  const page: Column<PageRow> = {
    id: "path",
    header: "Page",
    width: "34%",
    cell: (p) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-xs font-medium">{p.path}</span>
        <span className="truncate text-2xs text-fg-muted">{p.title}</span>
      </span>
    ),
  };
  const cols: Column<PageRow>[] =
    view === "all"
      ? [
          page,
          { id: "views", header: "Views", align: "right", mono: true, sortValue: (p) => p.views, cell: (p) => num(r.sc(p.views)) },
          { id: "visitors", header: "Visitors", align: "right", mono: true, sortValue: (p) => p.visitors, cell: (p) => num(r.sc(p.visitors)) },
          { id: "time", header: "Time on page", align: "right", sortValue: (p) => p.time, cell: (p) => secs(p.time) },
          {
            id: "scroll",
            header: "Read",
            align: "right",
            mono: true,
            sortValue: (p) => p.scroll,
            cell: (p) => `${p.scroll}%`,
            description: "How far down the page was read, on average.",
          },
        ]
      : view === "entry"
        ? [
            page,
            { id: "entries", header: "Entries", align: "right", mono: true, sortValue: (p) => p.entries, cell: (p) => num(r.sc(p.entries)) },
            { id: "bounce", header: "Bounce", align: "right", mono: true, sortValue: (p) => p.bounce, cell: (p) => (p.entries ? rate(p.bounce) : "–") },
          ]
        : [
            page,
            { id: "exits", header: "Exits", align: "right", mono: true, sortValue: (p) => p.exits, cell: (p) => num(r.sc(p.exits)) },
            { id: "exitRate", header: "Exit rate", align: "right", mono: true, sortValue: (p) => p.exits / p.views, cell: (p) => `${pct(p.exits, p.views)}%` },
          ];
  const sort = view === "all" ? "views" : view === "entry" ? "entries" : "exits";
  return (
    <>
      <SegmentedControl
        label="Pages"
        value={view}
        onChange={setView}
        options={[
          { value: "all", label: "All pages" },
          { value: "entry", label: "Entry pages" },
          { value: "exit", label: "Exit pages" },
        ]}
      />
      <Panel
        flush
        title={view === "all" ? "All pages" : view === "entry" ? "Entry pages" : "Exit pages"}
        description={`${num(r.sc(TOTAL_VIEWS))} page views in all`}
        actions={
          <CsvButton
            name="pages"
            rows={PAGE_ROWS}
            columns={[
              ["Page", (p) => p.path],
              ["Views", (p) => r.sc(p.views)],
              ["Visitors", (p) => r.sc(p.visitors)],
              ["Entries", (p) => r.sc(p.entries)],
              ["Exits", (p) => r.sc(p.exits)],
              ["Seconds on page", (p) => p.time],
            ]}
          />
        }
      >
        <DataTable
          key={view}
          label="Pages"
          columns={cols}
          rows={PAGE_ROWS}
          getRowId={(p) => p.path}
          defaultSort={{ id: sort, direction: "desc" }}
          minWidth={640}
        />
      </Panel>
    </>
  );
}

function PathsTab() {
  const [from, setFrom] = useState("/pricing");
  const flow = FLOWS[from]!;
  const next = flow.nodes.filter((n) => n.column === 1);
  return (
    <>
      <SelectField
        label="Starting at"
        className="w-64"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
        options={Object.keys(FLOWS).map((k) => ({ value: k, label: k }))}
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel title={`From ${from}`} description="Each band is the visits that moved from one page to the next; grey ones left the site.">
          <PathFlow label={`Paths from ${from}`} nodes={flow.nodes} links={flow.links} />
        </Panel>
        <Panel title="Next page" description={`After ${from}`} className="self-start">
          <BarList label={`Next page after ${from}`} items={next.map((n) => ({ id: n.id, label: n.label, value: n.value }))} />
        </Panel>
      </div>
    </>
  );
}

function LinksTab() {
  const r = useReport();
  type Out = (typeof OUTBOUND)[number];
  type Dl = (typeof DOWNLOADS)[number];
  const outCols: Column<Out>[] = [
    {
      id: "url",
      header: "Link",
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs">{x.url}</span>
          <span className="truncate text-2xs text-fg-muted">from {x.from}</span>
        </span>
      ),
    },
    { id: "clicks", header: "Clicks", align: "right", mono: true, sortValue: (x) => x.clicks, cell: (x) => num(r.sc(x.clicks)) },
    { id: "visitors", header: "Visitors", align: "right", mono: true, sortValue: (x) => x.visitors, cell: (x) => num(r.sc(x.visitors)) },
  ];
  const dlCols: Column<Dl>[] = [
    {
      id: "file",
      header: "File",
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs">{x.file}</span>
          <span className="truncate text-2xs text-fg-muted">{x.kind}</span>
        </span>
      ),
    },
    { id: "downloads", header: "Downloads", align: "right", mono: true, sortValue: (x) => x.downloads, cell: (x) => num(r.sc(x.downloads)) },
    { id: "visitors", header: "Visitors", align: "right", mono: true, sortValue: (x) => x.visitors, cell: (x) => num(r.sc(x.visitors)) },
  ];
  return (
    <>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          flush
          title="Outbound links"
          actions={
            <CsvButton
              name="outbound-links"
              rows={OUTBOUND}
              columns={[
                ["Link", (x) => x.url],
                ["Clicks", (x) => r.sc(x.clicks)],
              ]}
            />
          }
        >
          <DataTable label="Outbound links" columns={outCols} rows={OUTBOUND} getRowId={(x) => x.url} />
        </Panel>
        <Panel
          flush
          title="File downloads"
          actions={
            <CsvButton
              name="downloads"
              rows={DOWNLOADS}
              columns={[
                ["File", (x) => x.file],
                ["Downloads", (x) => r.sc(x.downloads)],
              ]}
            />
          }
        >
          <DataTable label="File downloads" columns={dlCols} rows={DOWNLOADS} getRowId={(x) => x.file} />
        </Panel>
      </div>
      <p className="text-xs text-fg-muted">
        The script counts a click on a link to another host as outbound, and on a link to a file ending in .pdf, .zip, .xlsx, .docx, .apk or another listed
        under downloads in analytics.yaml as a download. Query strings are dropped from both.
      </p>
    </>
  );
}

function SiteSearchTab() {
  const r = useReport();
  type S = (typeof SEARCHES)[number];
  const total = SEARCHES.reduce((n, s) => n + s.searches, 0);
  const none = SEARCHES.filter((s) => !s.results).reduce((n, s) => n + s.searches, 0);
  const cols: Column<S>[] = [
    { id: "term", header: "Term", cell: (s) => <span className="font-medium">{s.term}</span> },
    { id: "searches", header: "Searches", align: "right", mono: true, sortValue: (s) => s.searches, cell: (s) => num(r.sc(s.searches)) },
    {
      id: "results",
      header: "Results",
      align: "right",
      sortValue: (s) => s.results,
      cell: (s) => (s.results ? <span className="font-mono">{s.results}</span> : <Badge tone="danger">No results</Badge>),
    },
    { id: "clicked", header: "Clicked a result", align: "right", mono: true, sortValue: (s) => s.clicked, cell: (s) => `${s.clicked}%` },
    { id: "left", header: "Left after", align: "right", mono: true, sortValue: (s) => s.left, cell: (s) => `${s.left}%` },
  ];
  return (
    <>
      <KpiGrid>
        <KpiCard label="Searches" value={num(r.sc(total))} />
        <KpiCard label="Visits that searched" value="4.1%" />
        <KpiCard label="No results" value={num(r.sc(none))} unit="searches" tone="warning" />
        <KpiCard label="Left after searching" value="18%" />
      </KpiGrid>
      <Panel
        flush
        title="Search terms"
        description="Terms are lowercased; one that looks like an email address or a phone number is masked."
        actions={
          <CsvButton
            name="site-search"
            rows={SEARCHES}
            columns={[
              ["Term", (s) => s.term],
              ["Searches", (s) => r.sc(s.searches)],
              ["Results", (s) => s.results],
            ]}
          />
        }
      >
        <DataTable label="Search terms" columns={cols} rows={SEARCHES} getRowId={(s) => s.term} minWidth={600} />
      </Panel>
      <p className="text-xs text-fg-muted">
        Read from the q parameter of /search, which shop lists under search in analytics.yaml. Other parameters are dropped.
      </p>
    </>
  );
}

function NotFoundTab() {
  const r = useReport();
  type N = (typeof NOT_FOUND)[number];
  const cols: Column<N>[] = [
    { id: "path", header: "Address", cell: (n) => <span className="font-mono text-xs font-medium">{n.path}</span> },
    { id: "views", header: "Views", align: "right", mono: true, sortValue: (n) => n.views, cell: (n) => num(r.sc(n.views)) },
    { id: "from", header: "Most from", cell: (n) => <span className="font-mono text-xs">{n.from}</span> },
    { id: "last", header: "Last seen", cell: (n) => n.last },
  ];
  return (
    <>
      <Panel
        flush
        title="Not found"
        description="A page counts as not found when its title is the one notFound names in analytics.yaml, here Page not found."
        actions={
          <CsvButton
            name="not-found"
            rows={NOT_FOUND}
            columns={[
              ["Address", (n) => n.path],
              ["Views", (n) => r.sc(n.views)],
              ["Most from", (n) => n.from],
            ]}
          />
        }
      >
        <DataTable label="Not found pages" columns={cols} rows={NOT_FOUND} getRowId={(n) => n.path} />
      </Panel>
      <Callout tone="warning" title="eksisozluk.com links to a page that moved">
        /blog/v60-rehberi had 214 views in 30 days, 81% from one entry. A redirect to /blog/how-to-brew-filter-coffee would keep them.
      </Callout>
    </>
  );
}

function FrustrationTab() {
  const r = useReport();
  const rage = FRUSTRATION.reduce((n, f) => n + f.rage, 0);
  const dead = FRUSTRATION.reduce((n, f) => n + f.dead, 0);
  const visits = FRUSTRATION.reduce((n, f) => n + f.visits, 0);
  const cols: Column<Frustration>[] = [
    {
      id: "el",
      header: "Element",
      width: "36%",
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{f.text}</span>
          <code className="truncate text-2xs text-fg-muted">
            {f.page} · {f.element}
          </code>
        </span>
      ),
    },
    {
      id: "rage",
      header: "Rage clicks",
      align: "right",
      sortValue: (f) => f.rage,
      cell: (f) => (f.rage >= 20 ? <Badge tone="danger">{f.rage}</Badge> : <span className="font-mono">{f.rage}</span>),
      description: "Three clicks or more on the same element within a second.",
    },
    {
      id: "dead",
      header: "Dead clicks",
      align: "right",
      sortValue: (f) => f.dead,
      cell: (f) => (f.dead >= 50 ? <Badge tone="warning">{f.dead}</Badge> : <span className="font-mono">{f.dead}</span>),
      description: "A click after which nothing changed on the page for a second: no new page, no change to the page, no field focused.",
    },
    { id: "visits", header: "Visits", align: "right", mono: true, sortValue: (f) => f.visits, cell: (f) => num(r.sc(f.visits)) },
    {
      id: "replays",
      header: "Replays",
      align: "right",
      cell: (f) => (
        <a href={`/replays?page=${encodeURIComponent(f.page)}`} className="text-xs text-accent-text">
          {f.replays} replays
        </a>
      ),
    },
  ];
  return (
    <>
      <KpiGrid>
        <KpiCard label="Rage clicks" value={num(r.sc(rage))} tone="danger" />
        <KpiCard label="Dead clicks" value={num(r.sc(dead))} tone="warning" />
        <KpiCard label="Visits with either" value={num(r.sc(visits))} unit={`${pct(visits, TOTAL_VISITS)}% of visits`} />
      </KpiGrid>
      <Panel
        flush
        title="Where people click in vain"
        actions={
          <CsvButton
            name="frustration"
            rows={FRUSTRATION}
            columns={[
              ["Page", (f) => f.page],
              ["Element", (f) => f.element],
              ["Rage clicks", (f) => f.rage],
              ["Dead clicks", (f) => f.dead],
            ]}
          />
        }
      >
        <DataTable
          label="Frustration"
          columns={cols}
          rows={FRUSTRATION}
          getRowId={(f) => f.id}
          defaultSort={{ id: "dead", direction: "desc" }}
          minWidth={720}
        />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------- conversions */

const CONVERSION_TABS = ["goals", "funnels", "forms", "attribution"] as const;
type ConversionTab = (typeof CONVERSION_TABS)[number];

function ConversionsPage() {
  const [tab, setTab] = useTab(CONVERSION_TABS);
  const desc: Record<ConversionTab, string> = {
    goals: "The goals of the sites file with what each is worth, and the share of visits that reached it.",
    funnels: "The steps a visit takes, in order, from the sites file. A visit counts at a step once it did every step before.",
    forms: "Where people start a form, how many send it, and the field they leave it at. Never what they typed.",
    attribution: "Which channels get the credit for a goal, across a visitor's visits in the 30 days before it.",
  };
  return (
    <Report
      title="Conversions"
      description={desc[tab]}
      tabs={[
        { value: "goals", label: "Goals", count: GOALS.length },
        { value: "funnels", label: "Funnels", count: FUNNELS.length },
        { value: "forms", label: "Forms", count: FORMS.length },
        { value: "attribution", label: "Attribution" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "goals" && <GoalsTab />}
      {tab === "funnels" && <FunnelsTab />}
      {tab === "forms" && <FormsTab />}
      {tab === "attribution" && <AttributionTab />}
    </Report>
  );
}

function GoalsTab() {
  const r = useReport();
  const delta = useDelta();
  const value = GOALS.reduce((n, g) => n + g.total, 0);
  const cols: Column<Goal>[] = [
    {
      id: "name",
      header: "Goal",
      cell: (g) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{g.name}</span>
          <code className="truncate text-2xs text-fg-muted">{g.rule}</code>
        </span>
      ),
    },
    { id: "visits", header: "Conversions", align: "right", mono: true, sortValue: (g) => g.visits, cell: (g) => num(r.sc(g.visits)) },
    { id: "rate", header: "Rate", align: "right", mono: true, sortValue: (g) => g.visits, cell: (g) => `${pct(g.visits, TOTAL_VISITS)}%` },
    ...(r.compare !== "off"
      ? [
          {
            id: "change",
            header: "Change",
            align: "right" as const,
            mono: true,
            cell: (g: Goal) => {
              const d = ((g.visits - g.previous) / g.previous) * 100;
              return <span className={d >= 0 ? "text-success" : "text-danger-text"}>{`${d >= 0 ? "+" : ""}${d.toFixed(0)}%`}</span>;
            },
          },
        ]
      : []),
    {
      id: "value",
      header: "Value each",
      align: "right",
      cell: (g) =>
        !g.value ? (
          <span className="text-fg-muted">–</span>
        ) : g.value.kind === "fixed" ? (
          <span className="font-mono">{lira(g.value.amount)}</span>
        ) : (
          <span className="text-xs">
            the event&apos;s <code>{g.value.prop}</code>
          </span>
        ),
    },
    { id: "total", header: "Total value", align: "right", mono: true, sortValue: (g) => g.total, cell: (g) => (g.total ? lira(r.sc(g.total)) : "–") },
  ];
  return (
    <>
      <KpiGrid>
        <KpiCard label="Conversions" value={num(r.sc(GOALS.reduce((n, g) => n + g.visits, 0)))} delta={delta(1407, 1241)} />
        <KpiCard label="Visits with a goal" value="4.4%" />
        <KpiCard label="Goal value" value={lira(r.sc(value))} delta={delta(value, 532100)} />
      </KpiGrid>
      <Panel
        flush
        title="Goals"
        actions={
          <CsvButton
            name="goals"
            rows={GOALS}
            columns={[
              ["Goal", (g) => g.name],
              ["Conversions", (g) => r.sc(g.visits)],
              ["Total value TRY", (g) => r.sc(g.total)],
            ]}
          />
        }
      >
        <DataTable label="Goals" columns={cols} rows={GOALS} getRowId={(g) => g.id} minWidth={720} />
      </Panel>
      <p className="text-xs text-fg-muted">
        A goal&apos;s value is set beside it in analytics.yaml: value: 150 for a fixed amount in the site&apos;s currency, or value: total to take it from the
        event.
      </p>
    </>
  );
}

function FunnelsTab() {
  const [id, setId] = useState("trial");
  const f = FUNNELS.find((x) => x.id === id)!;
  const first = f.steps[0]!.visits;
  const last = f.steps.at(-1)!.visits;
  const worst = f.steps.slice(1).reduce((w, s, i) => (f.steps[i]!.visits - s.visits > f.steps[w]!.visits - f.steps[w + 1]!.visits ? i : w), 0);
  return (
    <>
      <SegmentedControl label="Funnel" value={id} onChange={setId} options={FUNNELS.map((x) => ({ value: x.id, label: x.name }))} />
      <KpiGrid>
        <KpiCard label="Entered" value={first.toLocaleString("en")} unit="visits" />
        <KpiCard label="Finished" value={last.toLocaleString("en")} unit="visits" />
        <KpiCard label="Conversion" value={`${pct(last, first)}%`} />
        <KpiCard label="Biggest drop" value={`${f.steps[worst]!.label} → ${f.steps[worst + 1]!.label}`} tone="warning" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title={f.name} description="Each bar is the visits that reached the step; the gap is where they left.">
          <ol aria-label={`${f.name} steps`} className="flex flex-col gap-3">
            {f.steps.map((s, i) => {
              const prev = i ? f.steps[i - 1]!.visits : s.visits;
              return (
                <li key={s.label} className="flex flex-col gap-1">
                  <span className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-baseline gap-2">
                      <span className="text-xs text-fg-muted tabular-nums">{i + 1}</span>
                      <span className="truncate font-medium text-fg">{s.label}</span>
                      <code className="truncate text-2xs text-fg-muted">{s.rule}</code>
                    </span>
                    <span className="shrink-0 font-mono text-xs tabular-nums">
                      {s.visits.toLocaleString("en")} · {pct(s.visits, first)}%
                    </span>
                  </span>
                  <span className="h-6 overflow-hidden rounded bg-subtle">
                    <span className="block h-6 rounded" style={{ width: `${pct(s.visits, first)}%`, background: "var(--oa-accent)" }} />
                  </span>
                  {i > 0 && (
                    <span className={cn("text-xs", i === worst + 1 ? "text-warning-text" : "text-fg-muted")}>
                      {(prev - s.visits).toLocaleString("en")} left here ({pct(prev - s.visits, prev)}%) · median {secs(s.median!)} from {f.steps[i - 1]!.label}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel title="By source" description="Conversion from the first step to the last.">
          <BarList
            label="Conversion by source"
            items={BY_SOURCE.map((b) => ({ id: b.source, label: b.source, value: pct(b.done, b.entered) }))}
            format={(v) => `${v}%`}
          />
          <p className="mt-3 text-xs text-fg-muted">
            Funnels are set in analytics.yaml under the site, with a path or an event for each step, and are worked out from the visits already kept: a new
            funnel shows past visits too.
          </p>
        </Panel>
      </div>
    </>
  );
}

function FormsTab() {
  const [id, setId] = useState("signup");
  const f = FORMS.find((x) => x.id === id)!;
  const cols: Column<Field>[] = [
    {
      id: "field",
      header: "Field",
      width: "30%",
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{x.label}</span>
          <code className="truncate text-2xs text-fg-muted">
            {x.name} · {x.type}
          </code>
        </span>
      ),
    },
    { id: "reached", header: "Reached", align: "right", sortValue: (x) => x.reached, cell: (x) => `${pct(x.reached, f.starts)}%` },
    {
      id: "left",
      header: "Left the form here",
      align: "right",
      sortValue: (x) => x.left,
      cell: (x) => (
        <span className={cn("font-mono tabular-nums", x.left / f.starts > 0.15 && "font-semibold text-danger-text")}>{x.left.toLocaleString("en")}</span>
      ),
    },
    { id: "time", header: "Time in field", align: "right", sortValue: (x) => x.time, cell: (x) => secs(x.time) },
    {
      id: "refilled",
      header: "Filled again",
      align: "right",
      sortValue: (x) => x.refilled,
      cell: (x) => (x.refilled >= 20 ? <Badge tone="warning">{x.refilled}%</Badge> : `${x.refilled}%`),
    },
  ];
  return (
    <div className="grid gap-2.5 xl:grid-cols-[240px_minmax(0,1fr)]">
      <Panel flush aria-label="Forms">
        <ul className="flex flex-col py-1">
          {FORMS.map((x) => (
            <li key={x.id}>
              <button
                type="button"
                onClick={() => setId(x.id)}
                aria-current={x.id === id ? "true" : undefined}
                className={cn("flex w-full flex-col px-3 py-1.5 text-left", x.id === id ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas")}
              >
                <span className="truncate font-mono text-xs font-medium">{x.name}</span>
                <span className="text-2xs text-fg-muted">
                  {x.page} · {pct(x.submits, x.starts)}% sent
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex min-w-0 flex-col gap-2.5">
        <KpiGrid>
          <KpiCard label="Started" value={f.starts.toLocaleString("en")} unit="visits" />
          <KpiCard label="Sent" value={f.submits.toLocaleString("en")} unit="visits" />
          <KpiCard label="Sent of started" value={`${pct(f.submits, f.starts)}%`} />
          <KpiCard label="Time to send" value={secs(f.median)} unit="median" />
        </KpiGrid>
        <Panel flush title={f.name} description={`On ${f.page}. A visit starts the form at its first field and sends it with its submit.`}>
          <DataTable label="Fields" columns={cols} rows={f.fields} getRowId={(x) => x.name} minWidth={560} />
        </Panel>
        <Callout tone="info" title="Values never leave the page">
          The script sends a field&apos;s name and type when it is entered and left, and nothing it holds. Fields named like a card number or a password are
          counted by type only.
        </Callout>
      </div>
    </div>
  );
}

function AttributionTab() {
  const [goal, setGoal] = useState("bought");
  const [model, setModel] = useState<Model>("last");
  const a = ATTRIBUTION[goal]!;
  const total = a.rows.reduce((n, x) => n + x[model], 0);
  type Row = (typeof a.rows)[number];
  const worth = (x: Row) => (goal === "bought" ? x[model] * AOV[x.channel]! : x[model] * 150);
  const cols: Column<Row>[] = [
    { id: "channel", header: "Channel", cell: (x) => <span className="font-medium">{x.channel}</span> },
    {
      id: "credit",
      header: "Credited conversions",
      align: "right",
      mono: true,
      sortValue: (x) => x[model],
      cell: (x) => (model === "linear" ? x[model].toFixed(1) : x[model]),
    },
    { id: "share", header: "Share", align: "right", mono: true, cell: (x) => `${pct(x[model], total)}%` },
    {
      id: "vs",
      header: "Against last touch",
      align: "right",
      mono: true,
      cell: (x) => {
        if (model === "last") return "–";
        const d = x[model] - x.last;
        return <span className={d >= 0 ? "text-success" : "text-danger-text"}>{`${d >= 0 ? "+" : ""}${d.toFixed(model === "linear" ? 1 : 0)}`}</span>;
      },
    },
    { id: "value", header: "Credited value", align: "right", mono: true, sortValue: worth, cell: (x) => lira(worth(x)) },
  ];
  return (
    <>
      <div className="flex flex-wrap items-end gap-2">
        <SelectField
          label="Goal"
          className="w-44"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          options={[
            { value: "bought", label: "Bought" },
            { value: "signup", label: "Signed up" },
          ]}
        />
        <SegmentedControl
          label="Model"
          value={model}
          onChange={setModel}
          options={[
            { value: "first", label: "First touch" },
            { value: "last", label: "Last touch" },
            { value: "linear", label: "Linear" },
          ]}
        />
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          flush
          title={`${goal === "bought" ? "Bought" : "Signed up"}: ${model === "first" ? "first touch" : model === "last" ? "last touch" : "linear"}`}
          description={`${Math.round(total)} conversions; a median of ${a.median} visits before each, looking back ${a.lookback}.`}
        >
          <DataTable
            label="Attribution"
            columns={cols}
            rows={a.rows}
            getRowId={(x) => x.channel}
            defaultSort={{ id: "credit", direction: "desc" }}
            minWidth={640}
          />
        </Panel>
        <Panel title="The models" className="self-start">
          <dl className="flex flex-col gap-2 text-xs">
            <div>
              <dt className="font-semibold text-fg">First touch</dt>
              <dd className="text-fg-muted">All the credit to the channel of the visitor&apos;s first visit.</dd>
            </div>
            <div>
              <dt className="font-semibold text-fg">Last touch</dt>
              <dd className="text-fg-muted">All of it to the visit that converted. The other reports use this one.</dd>
            </div>
            <div>
              <dt className="font-semibold text-fg">Linear</dt>
              <dd className="text-fg-muted">Shared evenly among every visit in the 30 days before.</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-fg-muted">Visits are joined by the visitor id in the browser; on a site with consent, only visits after it count.</p>
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------- ecommerce */

const SHOP_TABS = ["sales", "products", "revenue"] as const;

function EcommercePage() {
  const [tab, setTab] = useTab(SHOP_TABS);
  return (
    <Report
      title="Ecommerce"
      description={
        tab === "sales"
          ? "Orders and revenue from the shop's purchase events, and the steps to them."
          : tab === "products"
            ? "Each product's views, carts and sales, by SKU."
            : "Revenue and average order by where the visit that bought came from."
      }
      tabs={[
        { value: "sales", label: "Sales" },
        { value: "products", label: "Products", count: PRODUCTS.length },
        { value: "revenue", label: "By source" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "sales" && <SalesTab />}
      {tab === "products" && <ProductsTab />}
      {tab === "revenue" && <RevenueTab />}
    </Report>
  );
}

function SalesTab() {
  const r = useReport();
  const delta = useDelta();
  const first = SHOP_FUNNEL[0]!.visits;
  return (
    <>
      <KpiGrid>
        <KpiCard label="Revenue" value={lira(r.sc(ORDERS.revenue))} delta={delta(ORDERS.revenue, ORDERS.previousRevenue, 298400)} />
        <KpiCard label="Orders" value={num(r.sc(ORDERS.orders))} delta={delta(ORDERS.orders, ORDERS.previous, 172)} />
        <KpiCard
          label="Average order"
          value={lira(ORDERS.revenue / ORDERS.orders)}
          delta={delta(ORDERS.revenue / ORDERS.orders, ORDERS.previousRevenue / ORDERS.previous)}
        />
        <KpiCard label="Visits that bought" value={`${(Math.round((ORDERS.orders / TOTAL_VISITS) * 10000) / 100).toFixed(2)}%`} />
        <KpiCard label="Refunds" value={ORDERS.refunds} unit="orders" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Panel title="Revenue a day">
          <TimeSeriesChart
            label="Revenue a day"
            series={[{ id: "revenue", name: "Revenue", data: REVENUE_DAILY.map(r.sc) }]}
            labels={DAYS}
            height={200}
            xTicks={6}
            format={(v) => `₺${formatNumber(v, { compact: true })}`}
          />
        </Panel>
        <Panel title="Purchase funnel" description="Visits at each step, having done the ones before">
          <ol aria-label="Purchase steps" className="flex flex-col gap-2">
            {SHOP_FUNNEL.map((s, i) => (
              <li key={s.event} className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="flex min-w-0 items-baseline gap-2">
                    <span className="font-medium text-fg">{s.label}</span>
                    <code className="truncate text-2xs text-fg-muted">{s.event}</code>
                  </span>
                  <span className="shrink-0 font-mono tabular-nums">
                    {num(r.sc(s.visits))} · {pct(s.visits, first)}%
                  </span>
                </span>
                <span className="h-4 overflow-hidden rounded bg-subtle">
                  <span
                    className="block h-4 rounded"
                    style={{ width: `${pct(s.visits, first)}%`, background: i === SHOP_FUNNEL.length - 1 ? "var(--oa-success)" : "var(--oa-accent)" }}
                  />
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
      <Callout tone="info" title="What the shop sends">
        openasy.track(&quot;purchase&quot;, {"{ order, total, currency, items }"}) from the thank-you page, or the same from the shop&apos;s server with its
        serverKey, so ad blockers miss no order. Items carry a SKU, name, price and quantity; nothing about who bought.
      </Callout>
    </>
  );
}

function ProductsTab() {
  const r = useReport();
  type P = (typeof PRODUCTS)[number];
  const cols: Column<P>[] = [
    {
      id: "name",
      header: "Product",
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{p.name}</span>
          <code className="truncate text-2xs text-fg-muted">{p.sku}</code>
        </span>
      ),
    },
    { id: "views", header: "Views", align: "right", mono: true, sortValue: (p) => p.views, cell: (p) => num(r.sc(p.views)) },
    { id: "carts", header: "Added to cart", align: "right", mono: true, sortValue: (p) => p.carts, cell: (p) => num(r.sc(p.carts)) },
    { id: "cartRate", header: "Cart rate", align: "right", mono: true, sortValue: (p) => p.carts / p.views, cell: (p) => `${pct(p.carts, p.views)}%` },
    { id: "units", header: "Sold", align: "right", mono: true, sortValue: (p) => p.units, cell: (p) => num(r.sc(p.units)) },
    { id: "revenue", header: "Revenue", align: "right", mono: true, sortValue: (p) => p.revenue, cell: (p) => lira(r.sc(p.revenue)) },
  ];
  return (
    <Panel
      flush
      title="Products"
      description={`${lira(r.sc(ORDERS.revenue))} from ${num(r.sc(PRODUCTS.reduce((n, p) => n + p.units, 0)))} items sold`}
      actions={
        <CsvButton
          name="products"
          rows={PRODUCTS}
          columns={[
            ["SKU", (p) => p.sku],
            ["Product", (p) => p.name],
            ["Views", (p) => r.sc(p.views)],
            ["Added to cart", (p) => r.sc(p.carts)],
            ["Sold", (p) => r.sc(p.units)],
            ["Revenue TRY", (p) => r.sc(p.revenue)],
          ]}
        />
      }
    >
      <DataTable label="Products" columns={cols} rows={PRODUCTS} getRowId={(p) => p.sku} defaultSort={{ id: "revenue", direction: "desc" }} minWidth={720} />
    </Panel>
  );
}

function RevenueTab() {
  const r = useReport();
  const [by, setBy] = useState<"source" | "campaign">("source");
  const rows = REVENUE_BY[by];
  type Row = (typeof rows)[number];
  const cols: Column<Row>[] = [
    { id: "name", header: by === "source" ? "Source" : "Campaign", cell: (x) => <span className="font-mono text-xs font-medium">{x.name}</span> },
    { id: "visits", header: "Visits", align: "right", mono: true, sortValue: (x) => x.visits, cell: (x) => num(r.sc(x.visits)) },
    { id: "orders", header: "Orders", align: "right", mono: true, sortValue: (x) => x.orders, cell: (x) => num(r.sc(x.orders)) },
    { id: "rate", header: "Bought", align: "right", mono: true, sortValue: (x) => x.orders / x.visits, cell: (x) => `${pct(x.orders, x.visits)}%` },
    { id: "revenue", header: "Revenue", align: "right", mono: true, sortValue: (x) => x.revenue, cell: (x) => lira(r.sc(x.revenue)) },
    { id: "aov", header: "Average order", align: "right", mono: true, sortValue: (x) => x.revenue / x.orders, cell: (x) => lira(x.revenue / x.orders) },
  ];
  return (
    <>
      <SegmentedControl
        label="Revenue by"
        value={by}
        onChange={setBy}
        options={[
          { value: "source", label: "Source" },
          { value: "campaign", label: "Campaign" },
        ]}
      />
      <Panel
        flush
        title={by === "source" ? "Revenue by source" : "Revenue by campaign"}
        description="Credited to the visit that bought (last touch); Conversions, Attribution compares the models."
        actions={
          <CsvButton
            name={`revenue-by-${by}`}
            rows={rows}
            columns={[
              [by === "source" ? "Source" : "Campaign", (x) => x.name],
              ["Orders", (x) => r.sc(x.orders)],
              ["Revenue TRY", (x) => r.sc(x.revenue)],
            ]}
          />
        }
      >
        <DataTable
          key={by}
          label="Revenue"
          columns={cols}
          rows={rows}
          getRowId={(x) => x.id}
          defaultSort={{ id: "revenue", direction: "desc" }}
          minWidth={720}
        />
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------- retention */

const RETENTION_TABS = ["cohorts", "stickiness", "lifecycle"] as const;

function RetentionPage() {
  const [tab, setTab] = useTab(RETENTION_TABS);
  return (
    <Report
      title="Retention"
      description={
        tab === "cohorts"
          ? "Of the visitors first seen in a week, the share that came back each week after."
          : tab === "stickiness"
            ? "Daily, weekly and monthly active visitors, and how often the month's visitors come on a given day."
            : "Each week's visitors as new, returning, or back after four weeks or more away."
      }
      tabs={[
        { value: "cohorts", label: "Cohorts" },
        { value: "stickiness", label: "Stickiness" },
        { value: "lifecycle", label: "New, returning and resurrected" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      {tab === "cohorts" && <CohortsTab />}
      {tab === "stickiness" && <StickinessTab />}
      {tab === "lifecycle" && <LifecycleTab />}
      <p className="text-xs text-fg-muted">
        A visitor is the random id the script keeps in the site&apos;s localStorage. Another browser or cleared storage is a new visitor, unless the page calls
        openasy.identify with the site&apos;s own user id.
      </p>
    </Report>
  );
}

function CohortsTab() {
  const [show, setShow] = useState<"share" | "visitors">("share");
  const week1 = COHORTS.filter((c) => c.values[1] !== undefined);
  const avg = (i: number) => {
    const rows = COHORTS.filter((c) => c.values[i] !== undefined);
    return rows.reduce((n, c) => n + c.values[i]!, 0) / rows.length;
  };
  return (
    <>
      <KpiGrid>
        <KpiCard label="Back in week 1" value={rate(avg(1))} unit="average" />
        <KpiCard label="Back in week 4" value={rate(avg(4))} unit="average" />
        <KpiCard
          label="Best week 1"
          value={rate(Math.max(...week1.map((c) => c.values[1]!)))}
          footer={<span className="text-xs text-fg-muted">Week of Oct 26, the newsletter</span>}
        />
      </KpiGrid>
      <Panel
        title="Weekly cohorts"
        actions={
          <SegmentedControl
            label="Show"
            value={show}
            onChange={setShow}
            options={[
              { value: "share", label: "Share" },
              { value: "visitors", label: "Visitors" },
            ]}
          />
        }
      >
        <CohortGrid
          label="Return by weekly cohort"
          cohorts={COHORTS}
          unit="Visitors"
          format={show === "share" ? undefined : (v, size) => Math.round((size * v) / 100).toLocaleString("en")}
        />
      </Panel>
    </>
  );
}

function StickinessTab() {
  const ratio = STICKINESS.dau.map((d, i) => Math.round((d / STICKINESS.mau[i]!) * 1000) / 10);
  const last = STICKINESS.dau.length - 1;
  const week = STICKINESS.dau.slice(-7).reduce((n, v) => n + v, 0) / 7;
  return (
    <>
      <KpiGrid>
        <KpiCard label="Daily active" value={num(week)} unit="7-day average" />
        <KpiCard label="Weekly active" value={num(STICKINESS.wau[last]!)} />
        <KpiCard label="Monthly active" value={num(STICKINESS.mau[last]!)} />
        <KpiCard
          label="DAU / MAU"
          value={rate((week / STICKINESS.mau[last]!) * 100)}
          footer={<span className="text-xs text-fg-muted">A content site is usually 2 to 5%</span>}
        />
        <KpiCard label="DAU / WAU" value={rate((week / STICKINESS.wau[last]!) * 100)} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Active visitors" description="Monthly is hidden at first; its scale hides the other two.">
          <TimeSeriesChart
            label="Active visitors"
            series={[
              { id: "dau", name: "Daily", data: STICKINESS.dau },
              { id: "wau", name: "Weekly", data: STICKINESS.wau },
              { id: "mau", name: "Monthly", data: STICKINESS.mau },
            ]}
            defaultHidden={["mau"]}
            labels={DAYS}
            height={200}
            area={false}
            xTicks={5}
          />
        </Panel>
        <Panel title="DAU / MAU a day">
          <TimeSeriesChart
            label="DAU over MAU a day"
            series={[{ id: "ratio", name: "DAU / MAU", data: ratio }]}
            labels={DAYS}
            height={200}
            xTicks={5}
            format={(v) => `${v}%`}
          />
        </Panel>
      </div>
    </>
  );
}

function LifecycleTab() {
  type W = { week: string; dormant: number; resurrected: number };
  const rows: W[] = LIFECYCLE.weeks.map((w, i) => ({ week: w, dormant: LIFECYCLE.dormant[i]!, resurrected: LIFECYCLE.resurrected[i]! }));
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <Panel title="Visitors a week by kind">
        <StackedBarChart
          label="Visitors a week by kind"
          categories={LIFECYCLE.weeks.map((w) => `Week of ${w}`)}
          segments={[
            { id: "new", name: "New" },
            { id: "returning", name: "Returning" },
            { id: "resurrected", name: "Resurrected" },
          ]}
          values={LIFECYCLE.weeks.map((_, i) => [LIFECYCLE.new[i]!, LIFECYCLE.returning[i]!, LIFECYCLE.resurrected[i]!])}
          height={200}
          xTicks={4}
        />
      </Panel>
      <Panel flush title="Gone quiet and back" className="self-start">
        <DataTable
          label="Dormant and resurrected"
          columns={[
            { id: "week", header: "Week of", cell: (x) => x.week },
            {
              id: "dormant",
              header: "Gone quiet",
              align: "right",
              mono: true,
              cell: (x) => num(x.dormant),
              description: "Came the week before, not this week.",
            },
            {
              id: "resurrected",
              header: "Back",
              align: "right",
              mono: true,
              cell: (x) => num(x.resurrected),
              description: "Came this week after four weeks or more away.",
            },
          ]}
          rows={rows}
          getRowId={(x) => x.week}
          resizable={false}
          columnMenu={false}
        />
      </Panel>
    </div>
  );
}

/* -------------------------------------------------------- performance */

function PerformancePage() {
  const delta = useDelta();
  const [device, setDevice] = useState<DeviceKind>("all");
  const v = VITALS_BY_DEVICE[device];
  const keys: Vital[] = ["lcp", "inp", "cls"];
  type P = (typeof VITALS_PAGES)[number];
  const cols: Column<P>[] = [
    { id: "path", header: "Page", cell: (p) => <span className="font-mono text-xs font-medium">{p.path}</span> },
    { id: "views", header: "Views", align: "right", mono: true, sortValue: (p) => p.views, cell: (p) => num(p.views) },
    ...keys.map((k): Column<P> => ({
      id: k,
      header: VITALS[k].name,
      align: "right",
      sortValue: (p) => p[device][k] / VITALS[k].good,
      cell: (p) => {
        const tone = vitalTone(k, p[device][k]);
        return tone === "success" ? (
          <span className="font-mono">{VITALS[k].format(p[device][k])}</span>
        ) : (
          <Badge tone={tone}>{VITALS[k].format(p[device][k])}</Badge>
        );
      },
    })),
  ];
  return (
    <Report
      title="Performance"
      description="Core Web Vitals from real visits: how fast the largest content shows, how fast the page answers, how much it shifts."
    >
      <SegmentedControl
        label="Device"
        value={device}
        onChange={setDevice}
        options={[
          { value: "all", label: "All devices" },
          { value: "desktop", label: "Desktop" },
          { value: "mobile", label: "Mobile" },
        ]}
      />
      <KpiGrid minWidth={240}>
        {keys.map((k) => {
          const tone = vitalTone(k, v[k].p75);
          return (
            <KpiCard
              key={k}
              label={`${VITALS[k].name} · ${VITALS[k].full}`}
              value={VITALS[k].format(v[k].p75)}
              unit="p75"
              tone={tone}
              delta={delta(v[k].p75, v[k].previous, v[k].previous, { lowerIsBetter: true })}
              footer={
                <span className="flex flex-col gap-1">
                  <span className="text-xs text-fg-muted">
                    {vitalWord(tone)}: good up to {VITALS[k].format(VITALS[k].good)}, poor over {VITALS[k].format(VITALS[k].poor)}
                  </span>
                  <SplitBar label={VITALS[k].name} split={v[k].split} />
                </span>
              }
            />
          );
        })}
      </KpiGrid>
      <div className="grid gap-2.5 2xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Panel title="LCP a day" description="75th percentile, all devices">
          <TimeSeriesChart
            label="LCP a day"
            series={[{ id: "lcp", name: "LCP p75", data: LCP_DAILY }]}
            labels={DAYS}
            height={200}
            xTicks={5}
            yMax={4}
            threshold={{ value: 2.5, label: "Good up to 2.5 s" }}
            format={(x) => `${x.toFixed(1)} s`}
          />
        </Panel>
        <Panel
          flush
          title="By page"
          description="p75 of each page; the slowest first"
          actions={
            <CsvButton
              name={`web-vitals-${device}`}
              rows={VITALS_PAGES}
              columns={[
                ["Page", (p) => p.path],
                ["LCP s", (p) => p[device].lcp],
                ["INP ms", (p) => p[device].inp],
                ["CLS", (p) => p[device].cls],
              ]}
            />
          }
        >
          <DataTable
            key={device}
            label="Web Vitals by page"
            columns={cols}
            rows={VITALS_PAGES}
            getRowId={(p) => p.path}
            defaultSort={{ id: "lcp", direction: "desc" }}
            minWidth={560}
          />
        </Panel>
      </div>
      <p className="text-xs text-fg-muted">
        The script measures each page view in the browser and sends the values with the visit&apos;s last event; the 75th percentile is what search engines
        judge a page by. Turned on with vitals: true in analytics.yaml.
      </p>
    </Report>
  );
}

/* -------------------------------------------------------------- search */

function SearchPage() {
  const delta = useDelta();
  const [engine, setEngine] = useState<Engine>("google");
  const [tab, setTab] = useTab(["queries", "pages"] as const);
  const s = SEARCH[engine];
  const ctr = (x: { clicks: number; impressions: number }) => `${pct(x.clicks, x.impressions)}%`;
  const qCols: Column<Query>[] = [
    {
      id: "query",
      header: "Query",
      width: "34%",
      cell: (q) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{q.query}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{q.page}</span>
        </span>
      ),
    },
    { id: "clicks", header: "Clicks", align: "right", mono: true, sortValue: (q) => q.clicks, cell: (q) => num(q.clicks) },
    { id: "impressions", header: "Impressions", align: "right", mono: true, sortValue: (q) => q.impressions, cell: (q) => num(q.impressions) },
    { id: "ctr", header: "CTR", align: "right", mono: true, sortValue: (q) => q.clicks / q.impressions, cell: ctr },
    { id: "position", header: "Position", align: "right", mono: true, sortValue: (q) => q.position, cell: (q) => q.position.toFixed(1) },
  ];
  const pages = Object.values(
    s.queries.reduce<Record<string, { page: string; clicks: number; impressions: number; weighted: number; queries: number }>>((acc, q) => {
      const p = (acc[q.page] ??= { page: q.page, clicks: 0, impressions: 0, weighted: 0, queries: 0 });
      p.clicks += q.clicks;
      p.impressions += q.impressions;
      p.weighted += q.position * q.impressions;
      p.queries += 1;
      return acc;
    }, {}),
  );
  type P = (typeof pages)[number];
  const pCols: Column<P>[] = [
    { id: "page", header: "Page", cell: (p) => <span className="font-mono text-xs font-medium">{p.page}</span> },
    { id: "clicks", header: "Clicks", align: "right", mono: true, sortValue: (p) => p.clicks, cell: (p) => num(p.clicks) },
    { id: "impressions", header: "Impressions", align: "right", mono: true, sortValue: (p) => p.impressions, cell: (p) => num(p.impressions) },
    { id: "ctr", header: "CTR", align: "right", mono: true, cell: ctr },
    { id: "position", header: "Position", align: "right", mono: true, cell: (p) => (p.weighted / p.impressions).toFixed(1) },
    {
      id: "bounce",
      header: "Bounce here",
      align: "right",
      mono: true,
      description: "From Analytics: visits that entered on the page and left without engaging.",
      cell: (p) => {
        const row = PAGE_ROWS.find((x) => x.path === p.page);
        return row ? rate(row.bounce) : "–";
      },
    },
  ];
  return (
    <Report
      title="Search"
      description="What people searched before they came: queries, impressions, clicks, click-through rate and position, from each search engine's own tools."
      tabs={[
        { value: "queries", label: "Queries" },
        { value: "pages", label: "Pages" },
      ]}
      tab={tab}
      onTab={setTab}
    >
      <SegmentedControl
        label="Search engine"
        value={engine}
        onChange={setEngine}
        options={[
          { value: "google", label: "Google" },
          { value: "bing", label: "Bing" },
          { value: "yandex", label: "Yandex" },
        ]}
      />
      <Callout tone="info" title={`${s.name}: ${s.property}`}>
        Linked by {s.path} in analytics.yaml, with its token in the install&apos;s secrets. Updated {s.updated}.
      </Callout>
      <KpiGrid>
        <KpiCard label="Clicks" value={num(s.totals.clicks)} delta={delta(s.totals.clicks, s.totals.previousClicks)} />
        <KpiCard label="Impressions" value={num(s.totals.impressions)} />
        <KpiCard label="CTR" value={ctr(s.totals)} />
        <KpiCard label="Average position" value={s.totals.position.toFixed(1)} />
      </KpiGrid>
      {tab === "queries" ? (
        <Panel
          flush
          title="Queries"
          description={`${num(s.hidden)} clicks came from queries ${engine === "google" ? "Google" : engine === "bing" ? "Bing" : "Yandex"} keeps private, too rare to show.`}
          actions={
            <CsvButton
              name={`search-queries-${engine}`}
              rows={s.queries}
              columns={[
                ["Query", (q) => q.query],
                ["Page", (q) => q.page],
                ["Clicks", (q) => q.clicks],
                ["Impressions", (q) => q.impressions],
                ["Position", (q) => q.position],
              ]}
            />
          }
        >
          <DataTable
            key={engine}
            label="Search queries"
            columns={qCols}
            rows={s.queries}
            getRowId={(q) => q.query}
            defaultSort={{ id: "clicks", direction: "desc" }}
            minWidth={720}
          />
        </Panel>
      ) : (
        <Panel
          flush
          title="Pages"
          description="Search figures beside what the visits did once they arrived."
          actions={
            <CsvButton
              name={`search-pages-${engine}`}
              rows={pages}
              columns={[
                ["Page", (p) => p.page],
                ["Clicks", (p) => p.clicks],
                ["Impressions", (p) => p.impressions],
              ]}
            />
          }
        >
          <DataTable
            key={engine}
            label="Search pages"
            columns={pCols}
            rows={pages}
            getRowId={(p) => p.page}
            defaultSort={{ id: "clicks", direction: "desc" }}
            minWidth={720}
          />
        </Panel>
      )}
    </Report>
  );
}

/* ------------------------------------------------------------ heatmaps */

function HeatmapsPage() {
  const [mode, setMode] = useState<"clicks" | "scroll">("clicks");
  const [device, setDevice] = useState("desktop");
  const total = CLICKS.reduce((n, c) => n + c.count, 0);
  const max = Math.max(...CLICKS.map((c) => c.count));
  return (
    <Report
      title="Heatmaps"
      description="Clicks and how far down people read, drawn on the live page by the site's own script."
      actions={
        <SelectField
          label="Page"
          value="/pricing"
          onChange={() => {}}
          options={[
            { value: "/pricing", label: "/pricing · 2,140 views" },
            { value: "/", label: "/ · 5,812 views" },
            { value: "/signup", label: "/signup · 912 views" },
          ]}
        />
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          label="Show"
          value={mode}
          onChange={setMode}
          options={[
            { value: "clicks", label: "Clicks" },
            { value: "scroll", label: "Scroll depth" },
          ]}
        />
        <SegmentedControl
          label="Device"
          value={device}
          onChange={setDevice}
          options={[
            { value: "desktop", label: "Desktop" },
            { value: "tablet", label: "Tablet" },
            { value: "mobile", label: "Mobile" },
          ]}
        />
        <Button size="sm" variant="ghost" icon={<ExternalLink />}>
          Open the page
        </Button>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush aria-label="The page">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 text-xs text-fg-muted">
            <span className="size-2 rounded-full bg-subtle" />
            <span className="size-2 rounded-full bg-subtle" />
            <span className="size-2 rounded-full bg-subtle" />
            <span className="ml-2 truncate font-mono">https://www.example.com/pricing</span>
          </div>
          <div
            className="relative h-[520px] overflow-hidden bg-canvas"
            role="img"
            aria-label={mode === "clicks" ? "Clicks on the page" : "Scroll depth on the page"}
          >
            {/* The live page as the frame shows it; here, its outline. */}
            <div className="absolute inset-0 flex flex-col gap-4 p-6 opacity-60">
              <div className="h-4 w-16 rounded bg-subtle" />
              <div className="mx-auto h-6 w-40 rounded bg-subtle" />
              <div className="grid grid-cols-3 gap-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex h-44 flex-col gap-2 rounded-lg border border-line bg-surface p-3">
                    <div className="h-3 w-20 rounded bg-subtle" />
                    <div className="h-6 w-16 rounded bg-subtle" />
                    <div className="mt-auto h-7 rounded bg-subtle" />
                  </div>
                ))}
              </div>
              <div className="h-24 rounded-lg bg-subtle" />
              <div className="flex flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="h-5 rounded bg-subtle" />
                ))}
              </div>
            </div>
            {mode === "clicks"
              ? CLICKS.map((c) => {
                  const size = 24 + (c.count / max) * 56;
                  return (
                    <span
                      key={c.id}
                      title={`${c.text}: ${c.count} clicks`}
                      className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{
                        left: `${c.x}%`,
                        top: `${c.y}%`,
                        width: size,
                        height: size,
                        background: `radial-gradient(circle, color-mix(in oklab, var(--oa-danger) ${40 + (c.count / max) * 50}%, transparent) 0%, transparent 70%)`,
                      }}
                    />
                  );
                })
              : SCROLL.map((v, i) => (
                  <span
                    key={i}
                    className="absolute inset-x-0 flex items-start justify-end px-2 text-2xs font-semibold text-fg"
                    style={{ top: `${i * 10}%`, height: "10%", background: `color-mix(in oklab, var(--oa-accent) ${v * 0.5}%, transparent)` }}
                  >
                    {v}% read this far
                  </span>
                ))}
          </div>
        </Panel>
        <Panel flush title="Most clicked" description={`${total.toLocaleString("en")} clicks in 2,140 views`}>
          <ul aria-label="Most clicked" className="flex flex-col">
            {[...CLICKS]
              .sort((a, b) => b.count - a.count)
              .map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-2 border-b border-subtle px-3 py-2 last:border-0">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-fg">{c.text}</span>
                    <code className="truncate text-2xs text-fg-muted">{c.target}</code>
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                    {c.count}
                    <span className="block text-2xs text-fg-muted">{pct(c.count, total)}%</span>
                  </span>
                </li>
              ))}
          </ul>
        </Panel>
      </div>
      <p className="text-xs text-fg-muted">
        The page opens in a frame and the site&apos;s script draws on it, so the heatmap follows the page as it is today. The site lets Analytics frame it with
        frame-ancestors; otherwise the list stays and the page opens in a new tab.
      </p>
    </Report>
  );
}

/* ------------------------------------------------------------- replays */

function Player({ replay }: { replay: Replay }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState("1");
  const at = 102;
  return (
    <Panel flush aria-label="Replay">
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-semibold text-fg">
            {replay.user ?? replay.visitor} · {replay.at}
          </span>
          <span className="truncate text-xs text-fg-muted">
            {replay.device} · from {replay.source} · {replay.pages} pages
          </span>
        </span>
        <Button size="sm" variant="ghost" icon={<RouteIcon />}>
          The visit
        </Button>
      </div>
      <div className="relative h-[380px] overflow-hidden bg-canvas">
        <div className="absolute inset-6 flex flex-col gap-3 rounded-lg border border-line bg-surface p-5">
          <div className="h-5 w-32 rounded bg-subtle" />
          <div className="flex flex-col gap-1">
            <span className="text-2xs text-fg-muted">Work email</span>
            <span className="h-7 rounded border border-line-strong bg-surface px-2 font-mono text-sm leading-7 text-fg-muted">••••••••••••••</span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-2xs text-fg-muted">Password</span>
            <span className="h-7 rounded border border-line-strong bg-surface px-2 font-mono text-sm leading-7 text-fg-muted">••••••••</span>
          </div>
          <div className="relative mt-2 h-8 w-36 rounded bg-accent">
            <span className="absolute -top-2 left-24 size-6 rounded-full border-2 border-danger" aria-hidden />
          </div>
        </div>
      </div>
      <div className="flex flex-col gap-2 border-t border-line px-3 py-2">
        <div className="relative h-2 rounded bg-subtle" aria-label="Where the replay is">
          <span className="absolute inset-y-0 left-0 rounded" style={{ width: `${(at / replay.duration) * 100}%`, background: "var(--oa-accent)" }} />
          {TIMELINE.map((e) => (
            <span
              key={e.at}
              title={e.text}
              className={cn(
                "absolute top-1/2 size-2 -translate-1/2 rounded-full",
                e.kind === "rage" ? "bg-danger" : e.kind === "page" ? "bg-fg" : "bg-fg-muted",
              )}
              style={{ left: `${(e.at / replay.duration) * 100}%` }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2">
          <IconButton label={playing ? "Pause" : "Play"} onClick={() => setPlaying((p) => !p)}>
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </IconButton>
          <IconButton label="Skip quiet parts">
            <SkipForward className="size-4" />
          </IconButton>
          <span className="font-mono text-xs tabular-nums">
            {secs(at)} / {secs(replay.duration)}
          </span>
          <SegmentedControl
            className="ml-auto"
            label="Speed"
            value={speed}
            onChange={setSpeed}
            options={[
              { value: "1", label: "1×" },
              { value: "2", label: "2×" },
              { value: "4", label: "4×" },
            ]}
          />
        </div>
      </div>
    </Panel>
  );
}

function ReplaysPage() {
  const [active, setActive] = useState("r1");
  const r = REPLAYS.find((x) => x.id === active)!;
  const cols: Column<Replay>[] = [
    {
      id: "visit",
      header: "Visit",
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{x.user ?? x.visitor}</span>
          <span className="truncate text-2xs text-fg-muted">
            {x.at} · {x.entry}
          </span>
        </span>
      ),
    },
    { id: "duration", header: "Length", align: "right", sortValue: (x) => x.duration, cell: (x) => secs(x.duration) },
    { id: "pages", header: "Pages", align: "right", sortValue: (x) => x.pages, cell: (x) => x.pages },
    {
      id: "rage",
      header: "Signals",
      cell: (x) =>
        x.rage || x.dead ? (
          <span className="flex flex-wrap gap-1">
            {x.rage > 0 && <Badge tone="danger">{x.rage} rage clicks</Badge>}
            {x.dead > 0 && <Badge tone="warning">{x.dead} dead</Badge>}
          </span>
        ) : (
          <span className="text-xs text-fg-muted">–</span>
        ),
    },
  ];
  return (
    <Report title="Replays" description="Visits as they happened, recorded in the browser with every form value and marked text masked before it is sent.">
      <Callout tone="info" title="Recorded for 10% of visits on shop">
        Set with replays: {"{ sample: 10% }"} in analytics.yaml, kept 30 days. Visits on sites that ask for consent are recorded only after it is given.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[360px_minmax(0,1fr)_260px]">
        <Panel flush aria-label="Recorded visits">
          <DataTable label="Recorded visits" columns={cols} rows={REPLAYS} getRowId={(x) => x.id} onRowClick={(x) => setActive(x.id)} activeRowId={active} />
        </Panel>
        <Player key={r.id} replay={r} />
        <Panel flush title="What happened">
          <ol aria-label="What happened" className="flex flex-col">
            {TIMELINE.map((e) => (
              <li key={e.at} className="flex items-start gap-2 border-b border-subtle px-3 py-1.5 text-xs last:border-0">
                <span className="w-12 shrink-0 font-mono text-fg-muted tabular-nums">{secs(e.at)}</span>
                <span className={cn("min-w-0", e.kind === "rage" ? "font-medium text-danger-text" : "text-fg")}>{e.text}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </Report>
  );
}

/* ------------------------------------------------------------- sharing */

const SHARING_TABS = ["email", "links", "alerts"] as const;
type SharingTab = (typeof SHARING_TABS)[number];

function SharingPage() {
  const [tab, setTab] = useTab(SHARING_TABS);
  const desc: Record<SharingTab, string> = {
    email: "Reports sent by email on a schedule, each with its segment and the sections chosen.",
    links: "Read-only dashboards for people without an account: totals only, public or behind a password.",
    alerts: "Rules that watch traffic and goals for what is unusual, and where they send it.",
  };
  return (
    <>
      <PageHeader title="Sharing" description={desc[tab]}>
        <Tabs
          label="Sharing"
          value={tab}
          onChange={setTab}
          items={[
            { value: "email", label: "Email reports" },
            { value: "links", label: "Shared links" },
            { value: "alerts", label: "Alerts", count: ALERT_RULES.filter((a) => a.on).length },
          ]}
        />
      </PageHeader>
      <div className="flex min-w-0 flex-col gap-2.5">
        {tab === "email" && <EmailReportsTab />}
        {tab === "links" && <SharedLinksTab />}
        {tab === "alerts" && <AlertsTab />}
      </div>
    </>
  );
}

const SECTIONS = ["Overview", "Acquisition", "Conversions", "Ecommerce", "Search", "Performance"];

function EmailReportsTab() {
  const [reports, setReports] = useState(EMAIL_REPORTS);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const cols: Column<EmailReport>[] = [
    {
      id: "name",
      header: "Report",
      cell: (m) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{m.name}</span>
          <span className="truncate text-2xs text-fg-muted">
            {m.sections.join(", ")} · {m.segment}
          </span>
        </span>
      ),
    },
    { id: "to", header: "To", cell: (m) => <span className="text-xs">{m.recipients.join(", ")}</span> },
    { id: "when", header: "When", cell: (m) => m.when },
    { id: "last", header: "Last sent", cell: (m) => m.last },
    {
      id: "send",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      cell: (m) => (
        <Button size="sm" variant="ghost" icon={<Mail aria-hidden />} onClick={() => setStatus(`${m.name} sent to ${m.recipients.length} people.`)}>
          Send now
        </Button>
      ),
    },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {status ? (
          <p role="status" className="text-sm text-success">
            {status}
          </p>
        ) : (
          <span />
        )}
        <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setOpen(true)}>
          New email report
        </Button>
      </div>
      <Panel flush title="Email reports">
        <DataTable label="Email reports" columns={cols} rows={reports} getRowId={(m) => m.id} minWidth={760} />
      </Panel>
      <p className="text-xs text-fg-muted">
        A report is an HTML email with the chosen sections and their totals, and their tables as CSV files. It is sent from the install&apos;s own mail server;
        each recipient can stop it from a link in the email.
      </p>
      <EmailReportDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(m) => {
          setReports([...reports, m]);
          setStatus(`${m.name} created: sent ${m.when} to ${m.recipients.join(", ")}.`);
          setOpen(false);
        }}
      />
    </>
  );
}

function EmailReportDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (m: EmailReport) => void }) {
  const [name, setName] = useState("");
  const [to, setTo] = useState("");
  const [every, setEvery] = useState<EmailReport["every"]>("weekly");
  const [sections, setSections] = useState<string[]>(["Overview"]);
  const [segment, setSegment] = useState("All visits");
  const when = { daily: "Every day 08:00", weekly: "Mondays 09:00", monthly: "1st of the month 09:00" }[every];
  const ok = name.trim() && to.trim() && sections.length;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New email report"
      description="Sent on a schedule in Europe/Istanbul time, for the period since the last one."
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        onCreate({
          id: `m${Date.now()}`,
          name: name.trim(),
          recipients: to
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean),
          every,
          when,
          sections,
          segment,
          last: "Not sent yet",
          owner: TEAM.emily.name,
        });
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!ok}>
            Create report
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly search" />
        <TextField
          label="Recipients"
          hint="Email addresses, separated by commas."
          value={to}
          onChange={(e) => setTo(e.target.value)}
          placeholder={TEAM.mert.email}
        />
        <SegmentedControl
          label="How often"
          value={every}
          onChange={setEvery}
          options={[
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
        />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-xs font-medium text-fg">Sections</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {SECTIONS.map((s) => (
              <Checkbox
                key={s}
                label={s}
                checked={sections.includes(s)}
                onChange={() => setSections(sections.includes(s) ? sections.filter((x) => x !== s) : [...sections, s])}
              />
            ))}
          </div>
        </fieldset>
        <SelectField
          label="Segment"
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          options={["All visits", "Mobile in Türkiye", "Paid search"].map((x) => ({ value: x, label: x }))}
        />
      </div>
    </Dialog>
  );
}

function SharedLinksTab() {
  const [links, setLinks] = useState(SHARE_LINKS);
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const cols: Column<ShareLink>[] = [
    {
      id: "name",
      header: "Link",
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{l.name}</span>
          <span className="truncate text-2xs text-fg-muted">
            {l.pages.join(", ")} · by {l.by}
          </span>
        </span>
      ),
    },
    {
      id: "access",
      header: "Access",
      cell: (l) => (l.access === "public" ? <Badge tone="warning">Public</Badge> : <Badge tone="info">Password</Badge>),
    },
    { id: "expires", header: "Expires", cell: (l) => l.expires },
    { id: "views", header: "Opened", align: "right", mono: true, sortValue: (l) => l.views, cell: (l) => num(l.views) },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      cell: (l) => (
        <span className="flex justify-end gap-1">
          <IconButton size="sm" label={`Copy the link to ${l.name}`} onClick={() => setStatus(`The link to ${l.name} was copied.`)}>
            <Copy aria-hidden />
          </IconButton>
          <IconButton
            size="sm"
            label={`Revoke ${l.name}`}
            onClick={() => {
              setLinks(links.filter((x) => x.id !== l.id));
              setStatus(`${l.name} was revoked; the link no longer opens.`);
            }}
          >
            <Trash2 aria-hidden />
          </IconButton>
        </span>
      ),
    },
  ];
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2">
        {status ? (
          <p role="status" className="text-sm text-success">
            {status}
          </p>
        ) : (
          <span />
        )}
        <Button variant="primary" icon={<Plus aria-hidden />} onClick={() => setOpen(true)}>
          New shared link
        </Button>
      </div>
      <Panel flush title="Shared links">
        <DataTable label="Shared links" columns={cols} rows={links} getRowId={(l) => l.id} minWidth={680} />
      </Panel>
      <Callout tone="info" title="Totals only">
        A shared link shows the chosen reports for the chosen site, with the filter bar. Never a visit, a replay, a heatmap or a visitor id.
      </Callout>
      <ShareLinkDialog
        open={open}
        onOpenChange={setOpen}
        onCreate={(l) => {
          setLinks([...links, l]);
          setStatus(`${l.name} is ready${l.access === "password" ? " and asks for its password" : ""}. Copy it from the list.`);
          setOpen(false);
        }}
      />
    </>
  );
}

function ShareLinkDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (l: ShareLink) => void }) {
  const [name, setName] = useState("");
  const [pages, setPages] = useState<string[]>(["Overview"]);
  const [access, setAccess] = useState<ShareLink["access"]>("password");
  const [password, setPassword] = useState("");
  const [expires, setExpires] = useState("30 days");
  const ok = name.trim() && pages.length && (access === "public" || password.length >= 12);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New shared link"
      description="Anyone with the link opens these reports of shop, read-only."
      onSubmit={(e) => {
        e.preventDefault();
        if (ok) onCreate({ id: `l${Date.now()}`, name: name.trim(), access, pages, expires, views: 0, by: TEAM.emily.name });
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!ok}>
            Create link
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Board meeting" />
        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1 text-xs font-medium text-fg">Reports</legend>
          <div className="grid grid-cols-2 gap-1.5">
            {SECTIONS.map((s) => (
              <Checkbox
                key={s}
                label={s}
                checked={pages.includes(s)}
                onChange={() => setPages(pages.includes(s) ? pages.filter((x) => x !== s) : [...pages, s])}
              />
            ))}
          </div>
        </fieldset>
        <SegmentedControl
          label="Access"
          value={access}
          onChange={setAccess}
          options={[
            { value: "password", label: "With a password" },
            { value: "public", label: "Public" },
          ]}
        />
        {access === "password" && (
          <TextField
            label="Password"
            type="password"
            hint="12 characters or more."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
        )}
        <SelectField
          label="Expires"
          value={expires}
          onChange={(e) => setExpires(e.target.value)}
          options={["7 days", "30 days", "90 days", "Never"].map((x) => ({ value: x, label: x }))}
        />
      </div>
    </Dialog>
  );
}

function AlertsTab() {
  const [rules, setRules] = useState(ALERT_RULES);
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel title="Rules" description="Usual is the median of the same hour of the week over the last 8 weeks." aria-label="Alert rules">
        <ul className="flex flex-col">
          {rules.map((a) => (
            <li key={a.id} className="border-b border-subtle py-2 last:border-0">
              <Switch
                checked={a.on}
                onCheckedChange={(on) => setRules(rules.map((x) => (x.id === a.id ? { ...x, on } : x)))}
                label={a.name}
                description={`${a.rule}. To: ${a.to}.`}
              />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Recent alerts" aria-label="Recent alerts" className="self-start">
        <ol className="flex flex-col">
          {ALERT_HISTORY.map((h) => (
            <li key={h.id} className="flex flex-col gap-0.5 border-b border-subtle py-2 text-xs last:border-0">
              <span className="flex items-center gap-2">
                <span className="font-semibold text-fg">{h.rule}</span>
                <span className="text-fg-muted">{h.at}</span>
                <StatusBadge tone="neutral" className="ml-auto">
                  {h.state}
                </StatusBadge>
              </span>
              <span className="text-fg">{h.text}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-fg-muted">With OpenAsy Alerts connected, alerts go there and follow its on-call rules; otherwise by email.</p>
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------ settings */

const YAML = `sites:
  - name: shop
    domains: [https://www.example.com, https://example.com]
    currency: TRY
    goals:
      - { name: Bought, path: /checkout/done, value: total }
      - { name: Signed up, event: signup, value: 150 }
      - { name: Contact sent, event: contact-sent, value: 400 }
      - { name: Brew guide, download: /files/brew-guide.pdf }
    funnels:
      - name: Trial
        steps: [/pricing, /signup, { event: signup }, { event: project-created }]
      - name: Checkout
        steps: [/cart, /checkout/address, /checkout/done]
    search: { path: /search, param: q }
    notFound: { title: Page not found }
    channels:
      Email: [partner-bulten]
    ecommerce: true
    vitals: true
    forms: true
    replays: { sample: 10%, keep: 30d }
    searchConsole:
      google: sc-domain:example.com
      bing: https://www.example.com/
      yandex: https:www.example.com:443
geoip:
  database: /data/geoip/dbip-city-lite.mmdb
  update: monthly`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="analytics"
      file="analytics.yaml"
      applied="yesterday 17:40"
      yaml={YAML}
      groups={[
        {
          title: "shop",
          description: "www.example.com and example.com",
          items: [
            { label: "Currency", value: "Turkish lira (TRY)", path: "sites.shop.currency" },
            {
              label: "Goals",
              value: GOALS.map((g) => `${g.name}${g.value ? (g.value.kind === "fixed" ? ` (${lira(g.value.amount)})` : " (order total)") : ""}`).join(", "),
              path: "sites.shop.goals",
            },
            { label: "Funnels", value: FUNNELS.map((f) => `${f.name}, ${f.steps.length} steps`).join("; "), path: "sites.shop.funnels" },
            { label: "Site search", value: <span className="font-mono">/search?q=</span>, path: "sites.shop.search" },
            { label: "Not found", value: "Title is Page not found", path: "sites.shop.notFound" },
            { label: "Ecommerce, Web Vitals, forms", value: "On", path: "sites.shop.ecommerce" },
            { label: "Replays", value: "10% of visits, kept 30 days", path: "sites.shop.replays" },
          ],
        },
        {
          title: "Search engines",
          description: "Tokens are in the install's secrets, never in the file.",
          items: [
            { label: "Google Search Console", value: <span className="font-mono">{SEARCH.google.property}</span>, path: "sites.shop.searchConsole.google" },
            { label: "Bing Webmaster Tools", value: <span className="font-mono">{SEARCH.bing.property}</span>, path: "sites.shop.searchConsole.bing" },
            { label: "Yandex Webmaster", value: <span className="font-mono">{SEARCH.yandex.property}</span>, path: "sites.shop.searchConsole.yandex" },
          ],
        },
        {
          title: "Location",
          description: "The IP address is looked up here as a batch arrives and then dropped.",
          items: [
            { label: "GeoIP database", value: <span className="font-mono">dbip-city-lite.mmdb</span>, path: "geoip.database" },
            { label: "Updated", value: "Monthly, from the install", path: "geoip.update" },
          ],
        },
      ]}
    />
  );
}

/* --------------------------------------------------------------- pages */

const PAGES = {
  overview: () => <OverviewPage />,
  realtime: () => <RealtimePage />,
  acquisition: () => <AcquisitionPage />,
  visitors: () => <VisitorsPage />,
  behavior: () => <BehaviorPage />,
  conversions: () => <ConversionsPage />,
  ecommerce: () => <EcommercePage />,
  retention: () => <RetentionPage />,
  performance: () => <PerformancePage />,
  search: () => <SearchPage />,
  heatmaps: () => <HeatmapsPage />,
  replays: () => <ReplaysPage />,
  sharing: () => <SharingPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string, opts: { tab?: string; compare?: Compare } = {}): Story => ({
  render: () => (
    <ReportProvider startTab={opts.tab} compare={opts.compare}>
      <ProductApp product="analytics" nav={nav} pages={PAGES} initial={initial} />
    </ReportProvider>
  ),
});

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();
const body = (el: HTMLElement) => within(el.ownerDocument.body);

/* ------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    await expect(c.getAllByText("18,420").length).toBeGreaterThan(0);
    // Comparing with the previous period adds a change to each number and a grey line to the chart.
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Compare with" }), "previous");
    await expect(c.getByText("+12.9% vs previous period")).toBeInTheDocument();
    await expect(c.getByText("-2.8 pts vs previous period")).toBeInTheDocument();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Compare with" }), "year");
    await expect(c.getByText("+55.6% vs last year")).toBeInTheDocument();
    // The newsletter is marked on the chart.
    await userEvent.click(c.getByRole("button", { name: "3. Nov 3: Fall newsletter sent to 42,000 subscribers" }));
    await expect(c.getByText(/Zeynep Kaya/)).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const AddAnnotation: Story = {
  name: "Add an annotation",
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add annotation" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add an annotation" }));
    await expect(dialog.getByRole("button", { name: "Add annotation" })).toBeDisabled();
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Date" }), "Nov 6");
    await userEvent.type(dialog.getByRole("textbox", { name: "Note" }), "Instagram giveaway started");
    await userEvent.click(dialog.getByRole("button", { name: "Add annotation" }));
    const marks = within(c.getByRole("list", { name: "Annotations on the chart" }));
    await expect(marks.getAllByRole("listitem")).toHaveLength(4);
    await expect(marks.getByRole("button", { name: "4. Nov 6: Instagram giveaway started" })).toHaveAttribute("aria-pressed", "true");
    blur(canvasElement);
  },
};

export const FiltersAndSegments: Story = {
  name: "Filters and segments",
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add filter" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add a filter" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Dimension" }), "device");
    await userEvent.click(dialog.getByRole("radio", { name: "Exclude" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Value" }), "Tablet");
    await userEvent.click(dialog.getByRole("button", { name: "Add filter" }));
    // Excluding tablets keeps 95% of visits, and every count follows.
    await expect(c.getByText("95% of visits")).toBeInTheDocument();
    await expect(c.getByText("17,499")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Save as segment" }));
    const save = within(body(canvasElement).getByRole("dialog", { name: "Save as segment" }));
    await expect(save.getByText("Device is not Tablet")).toBeInTheDocument();
    await userEvent.type(save.getByRole("textbox", { name: "Name" }), "No tablets");
    await userEvent.click(save.getByRole("button", { name: "Save segment" }));
    const segment = c.getByRole("combobox", { name: "Segment" });
    await expect(segment).toHaveDisplayValue("No tablets");
    // The segment stays when moving to another report.
    await userEvent.click(c.getAllByRole("link", { name: /Acquisition/ })[0]!);
    await expect(c.getByRole("heading", { level: 1, name: "Acquisition" })).toBeInTheDocument();
    await expect(c.getByRole("combobox", { name: "Segment" })).toHaveDisplayValue("No tablets");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Segment" }), "paid");
    await expect(c.getByText("6.9% of visits")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    await expect(c.queryByText(/% of visits$/)).not.toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Realtime: Story = {
  ...app("realtime"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.queryByRole("button", { name: /Time range/ })).not.toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "Latest events" })).getAllByRole("listitem")).toHaveLength(6);
    await expect(c.getByRole("list", { name: "Latest events" })).toHaveTextContent("Arrived from chatgpt.com");
    await userEvent.click(c.getByRole("button", { name: "Pause updates" }));
    await expect(c.getByText("Paused")).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Resume updates" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Acquisition: Story = {
  ...app("acquisition"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Channels" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(7);
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Organic search");
    await expect(table).toHaveTextContent("AI assistants");
    await expect(within(table).queryByRole("columnheader", { name: /Change/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Compare with" }), "previous");
    await expect(within(c.getByRole("table", { name: "Channels" })).getByText("+139%")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Export channels as CSV" }));
    await expect(c.getByRole("status")).toHaveTextContent("channels.csv, 7 rows");
    blur(canvasElement);
  },
};

export const Sources: Story = {
  ...app("acquisition", { tab: "sources" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const from = c.getByRole("region", { name: "Referring pages" });
    await expect(from).toHaveTextContent("https://webrazzi.com/2026/11/02/istanbullu-kahve-girisimi-acme/");
    await userEvent.click(within(c.getByRole("table", { name: "Sources" })).getByText("github.com"));
    await expect(within(c.getByRole("list", { name: "Referring addresses" })).getAllByRole("listitem")[0]).toHaveTextContent(
      "https://github.com/acme/brew-timer",
    );
    await userEvent.click(within(c.getByRole("table", { name: "Sources" })).getAllByText("Direct")[0]!);
    await expect(c.getByRole("region", { name: "Referring pages" })).toHaveTextContent("no referrer");
    blur(canvasElement);
  },
};

export const Campaigns: Story = {
  ...app("acquisition", { tab: "campaigns" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "Campaigns" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(3);
    await userEvent.click(c.getByRole("radio", { name: "Term" }));
    const table = c.getByRole("table", { name: "Campaigns" });
    await expect(table).toHaveTextContent("acme kahve");
    await expect(table).toHaveTextContent("(not set)");
    await userEvent.click(c.getByRole("radio", { name: "Content" }));
    await expect(c.getByRole("table", { name: "Campaigns" })).toHaveTextContent("hero-button");
    blur(canvasElement);
  },
};

export const AiAssistants: Story = {
  name: "AI assistants",
  ...app("acquisition", { tab: "assistants" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = within(c.getByRole("list", { name: "Visits by assistant" }));
    await expect(list.getAllByRole("listitem")).toHaveLength(5);
    await expect(list.getAllByRole("listitem")[0]).toHaveTextContent("ChatGPT · chatgpt.com");
    await expect(c.getByText("Claude · claude.ai")).toBeInTheDocument();
  },
};

export const Locations: Story = {
  ...app("visitors"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("table", { name: "Locations" })).getAllByRole("row")[1]).toHaveTextContent("Türkiye");
    await expect(c.getByText("The IP address is never stored")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Locations" })).getByText("Türkiye"));
    await expect(c.getByRole("radio", { name: "Regions" })).toBeChecked();
    await expect(within(c.getByRole("table", { name: "Locations" })).getAllByRole("row")[1]).toHaveTextContent("İstanbul");
    await userEvent.click(c.getByRole("radio", { name: "Cities" }));
    await expect(c.getByRole("table", { name: "Locations" })).toHaveTextContent("Esenyurt, İstanbul");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Country" }), "de");
    await expect(c.getByRole("table", { name: "Locations" })).toHaveTextContent("Cologne");
    await userEvent.click(c.getByRole("button", { name: "All countries" }));
    await expect(c.getByRole("radio", { name: "Countries" })).toBeChecked();
    blur(canvasElement);
  },
};

export const Devices: Story = {
  ...app("visitors", { tab: "devices" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const browsers = c.getByRole("table", { name: "Browsers" });
    await expect(browsers).toHaveTextContent("Yandex Browser");
    await expect(browsers).toHaveTextContent("24.10");
    await expect(c.getByRole("table", { name: "Systems" })).toHaveTextContent("Android");
    await expect(c.getByRole("list", { name: "Screen sizes" })).toHaveTextContent("390 × 844 · Mobile");
  },
};

export const LanguagesAndTimeZones: Story = {
  name: "Languages and time zones",
  ...app("visitors", { tab: "languages" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Languages" })).getAllByRole("listitem")[0]).toHaveTextContent("tr-TR");
    await expect(c.getByRole("list", { name: "Time zones" })).toHaveTextContent("Asia/Baku");
  },
};

export const Pages: Story = {
  ...app("behavior"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("table", { name: "Pages" })).getAllByRole("row")[1]).toHaveTextContent("/");
    await userEvent.click(c.getByRole("radio", { name: "Exit pages" }));
    const table = c.getByRole("table", { name: "Pages" });
    await expect(within(table).getByRole("columnheader", { name: /Exit rate/ })).toBeInTheDocument();
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("/blog/how-to-brew-filter-coffee");
    await userEvent.click(c.getByRole("button", { name: "Export pages as CSV" }));
    await expect(c.getByRole("status")).toHaveTextContent("pages.csv, 9 rows");
    blur(canvasElement);
  },
};

export const Paths: Story = {
  ...app("behavior", { tab: "paths" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("img", { name: "Paths from /pricing" })).toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "Next page after /pricing" })).getAllByRole("listitem")[0]).toHaveTextContent("/signup");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Starting at" }), "/");
    await expect(c.getByRole("img", { name: "Paths from /" })).toBeInTheDocument();
    await expect(c.getByRole("list", { name: "Next page after /" })).toHaveTextContent("/products/espresso-beans");
  },
};

export const LinksAndDownloads: Story = {
  name: "Links and downloads",
  ...app("behavior", { tab: "links" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("table", { name: "Outbound links" })).getAllByRole("row")[1]).toHaveTextContent("https://www.instagram.com/acmekahve/");
    await expect(c.getByRole("table", { name: "File downloads" })).toHaveTextContent("/files/brew-guide.pdf");
  },
};

export const SiteSearch: Story = {
  name: "Site search",
  ...app("behavior", { tab: "sitesearch" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Search terms" });
    await expect(within(table).getAllByText("No results")).toHaveLength(2);
    await expect(within(table).getAllByRole("row")[2]).toHaveTextContent("decaf");
  },
};

export const NotFound: Story = {
  name: "Not found",
  ...app("behavior", { tab: "notfound" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "Not found pages" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(4);
    await expect(c.getByText("eksisozluk.com links to a page that moved")).toBeInTheDocument();
  },
};

export const RageAndDeadClicks: Story = {
  name: "Rage and dead clicks",
  ...app("behavior", { tab: "frustration" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Frustration" });
    // Most dead clicks land on the product photo, which people expect to zoom.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("img.product-photo");
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("310");
    await expect(c.getByRole("link", { name: "6 replays" })).toHaveAttribute("href", "/replays?page=%2Fsignup");
  },
};

export const Goals: Story = {
  ...app("conversions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Goals" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(4);
    await expect(table).toHaveTextContent("₺489,440");
    await expect(table).toHaveTextContent("₺150");
    await expect(c.getByText("₺608,040")).toBeInTheDocument();
  },
};

export const Funnels: Story = {
  ...app("conversions", { tab: "funnels" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const steps = c.getByRole("list", { name: "Trial steps" });
    await expect(within(steps).getAllByRole("listitem")).toHaveLength(4);
    // The biggest drop is between the pricing page and the sign-up form.
    await expect(c.getByText("Pricing → Sign-up form")).toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "Checkout" }));
    await expect(within(c.getByRole("list", { name: "Checkout steps" })).getAllByRole("listitem")).toHaveLength(3);
  },
};

export const Forms: Story = {
  ...app("conversions", { tab: "forms" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Fields" });
    await expect(within(table).getAllByRole("row")).toHaveLength(6);
    // The password field loses the most people and is filled again most often.
    await expect(within(table).getByText("214")).toBeInTheDocument();
    await expect(c.getByText("Values never leave the page")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: /form.contact-form/ }));
    await expect(within(c.getByRole("table", { name: "Fields" })).getAllByRole("row")).toHaveLength(4);
  },
};

export const Attribution: Story = {
  ...app("conversions", { tab: "attribution" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // Last touch credits Direct most; first touch shows organic search starts most of the visits that buy.
    await expect(within(c.getByRole("table", { name: "Attribution" })).getAllByRole("row")[1]).toHaveTextContent("Direct");
    await userEvent.click(c.getByRole("radio", { name: "First touch" }));
    const first = within(c.getByRole("table", { name: "Attribution" })).getAllByRole("row")[1]!;
    await expect(first).toHaveTextContent("Organic search");
    await expect(first).toHaveTextContent("+21");
    await userEvent.click(c.getByRole("radio", { name: "Linear" }));
    await expect(within(c.getByRole("table", { name: "Attribution" })).getAllByRole("row")[1]).toHaveTextContent("71.4");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Goal" }), "signup");
    await expect(c.getByText(/^Signed up: linear/)).toBeInTheDocument();
  },
};

export const Ecommerce: Story = {
  ...app("ecommerce"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("₺489,440")).toBeInTheDocument();
    await expect(c.getByText("₺1,840")).toBeInTheDocument();
    const steps = within(c.getByRole("list", { name: "Purchase steps" })).getAllByRole("listitem");
    await expect(steps).toHaveLength(5);
    await expect(steps[4]).toHaveTextContent("266 · 5.3%");
  },
};

export const Products: Story = {
  ...app("ecommerce", { tab: "products" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Products" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Espresso beans 1 kg");
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("15%");
  },
};

export const RevenueBySource: Story = {
  name: "Revenue by source",
  ...app("ecommerce", { tab: "revenue" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("table", { name: "Revenue" })).getAllByRole("row")[1]).toHaveTextContent("newsletter");
    await userEvent.click(c.getByRole("radio", { name: "Campaign" }));
    const table = c.getByRole("table", { name: "Revenue" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("No campaign");
    await expect(table).toHaveTextContent("fall-2026");
    await userEvent.click(c.getByRole("button", { name: "Export revenue-by-campaign as CSV" }));
    await expect(c.getByRole("status")).toHaveTextContent("revenue-by-campaign.csv, 4 rows");
    blur(canvasElement);
  },
};

export const Cohorts: Story = {
  ...app("retention"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const grid = c.getByRole("table", { name: "Return by weekly cohort" });
    await expect(within(grid).getAllByRole("row")).toHaveLength(9);
    await expect(within(grid).getByRole("row", { name: /Week of Oct 26/ })).toHaveTextContent("31.7%");
    await userEvent.click(c.getByRole("radio", { name: "Visitors" }));
    await expect(within(c.getByRole("table", { name: "Return by weekly cohort" })).getByRole("row", { name: /Week of Oct 26/ })).toHaveTextContent("1,103");
  },
};

export const Stickiness: Story = {
  ...app("retention", { tab: "stickiness" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getAllByText("DAU / MAU").length).toBeGreaterThan(0);
    await expect(c.getByRole("figure", { name: "Active visitors" })).toBeInTheDocument();
  },
};

export const Lifecycle: Story = {
  name: "New, returning and resurrected",
  ...app("retention", { tab: "lifecycle" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("figure", { name: "Visitors a week by kind" })).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Dormant and resurrected" })).getAllByRole("row")[4]).toHaveTextContent("710");
  },
};

export const Performance: Story = {
  ...app("performance"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("2.1 s")).toBeInTheDocument();
    await expect(c.getByRole("img", { name: /^INP: 64% good/ })).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Web Vitals by page" })).getAllByRole("row")[1]).toHaveTextContent("/products/espresso-beans");
    await userEvent.click(c.getByRole("radio", { name: "Mobile" }));
    await expect(c.getAllByText("2.9 s").length).toBeGreaterThan(0);
    await expect(c.getByText("310 ms")).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Web Vitals by page" })).getByText("520 ms")).toBeInTheDocument();
  },
};

export const SearchConsole: Story = {
  name: "Search",
  ...app("search"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Google Search Console: sc-domain:example.com")).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Search queries" })).getAllByRole("row")[1]).toHaveTextContent("acme kahve");
    await userEvent.click(c.getByRole("radio", { name: "Yandex" }));
    await expect(c.getByText("Yandex Webmaster: https:www.example.com:443")).toBeInTheDocument();
    await expect(c.getByRole("table", { name: "Search queries" })).toHaveTextContent("кофе в зернах стамбул");
    await userEvent.click(c.getByRole("tab", { name: "Pages" }));
    await expect(within(c.getByRole("table", { name: "Search pages" })).getAllByRole("row")[1]).toHaveTextContent("/");
    await expect(c.getByRole("table", { name: "Search pages" })).toHaveTextContent("31.2%");
    blur(canvasElement);
  },
};

export const Heatmaps: Story = {
  ...app("heatmaps"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("img", { name: "Clicks on the page" })).toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "Most clicked" })).getAllByRole("listitem")[0]).toHaveTextContent("Start trial (Pro)");
    await userEvent.click(c.getByRole("radio", { name: "Scroll depth" }));
    await expect(c.getByRole("img", { name: "Scroll depth on the page" })).toHaveTextContent("52% read this far");
  },
};

export const Replays: Story = {
  ...app("replays"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Replay" })).toHaveTextContent("Desktop · Chrome");
    await expect(c.getByText("Clicked Create account 4 times in a second")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Recorded visits" })).getByText("u-1042"));
    await expect(c.getByRole("region", { name: "Replay" })).toHaveTextContent("Mobile · Safari");
    await userEvent.click(c.getByRole("button", { name: "Play" }));
    await expect(c.getByRole("button", { name: "Pause" })).toBeInTheDocument();
  },
};

export const EmailReports: Story = {
  name: "Email reports",
  ...app("sharing"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "Email reports" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(2);
    await userEvent.click(c.getByRole("button", { name: "New email report" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "New email report" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Monthly search");
    await userEvent.type(dialog.getByRole("textbox", { name: "Recipients" }), TEAM.mert.email);
    await userEvent.click(dialog.getByRole("radio", { name: "Monthly" }));
    await userEvent.click(dialog.getByRole("checkbox", { name: "Search" }));
    await userEvent.click(dialog.getByRole("button", { name: "Create report" }));
    await expect(c.getByRole("status")).toHaveTextContent("Monthly search created: sent 1st of the month 09:00 to mert.demir@example.com.");
    await expect(
      within(c.getByRole("table", { name: "Email reports" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(3);
    blur(canvasElement);
  },
};

export const SharedLinks: Story = {
  name: "Shared links",
  ...app("sharing", { tab: "links" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New shared link" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "New shared link" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Board meeting");
    await userEvent.click(dialog.getByRole("checkbox", { name: "Ecommerce" }));
    await expect(dialog.getByRole("button", { name: "Create link" })).toBeDisabled();
    await userEvent.type(dialog.getByLabelText("Password"), "kahve-ve-rakamlar");
    await userEvent.click(dialog.getByRole("button", { name: "Create link" }));
    await expect(c.getByText(/^Board meeting is ready and asks for its password\./)).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Shared links" });
    await expect(within(table).getAllByRole("row")[3]).toHaveTextContent("Password");
    await userEvent.click(c.getByRole("button", { name: "Revoke Open numbers" }));
    await expect(
      within(c.getByRole("table", { name: "Shared links" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(2);
    blur(canvasElement);
  },
};

export const Alerts: Story = {
  ...app("sharing", { tab: "alerts" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const notFound = c.getByRole("switch", { name: "Not found pages" });
    await expect(notFound).toHaveAttribute("aria-checked", "false");
    await userEvent.click(notFound);
    await expect(notFound).toHaveAttribute("aria-checked", "true");
    await expect(c.getByRole("region", { name: "Recent alerts" })).toHaveTextContent("the payment page failed after a deploy");
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Read-only: analytics.yaml decides")).toBeInTheDocument();
    await expect(c.getByLabelText("analytics.yaml as applied")).toHaveTextContent("google: sc-domain:example.com");
    await expect(c.getByRole("region", { name: "Search engines" })).toHaveTextContent("Yandex Webmaster");
  },
};
