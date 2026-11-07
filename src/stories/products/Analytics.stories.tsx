import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ClipboardList,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  Globe,
  LayoutDashboard,
  MousePointerClick,
  Pause,
  Play,
  Route as RouteIcon,
  Share2,
  SkipForward,
  Video,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SelectField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge } from "../../components/Badge";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";

// Analytics' newer pages: funnels and forms from the visits it already keeps, heatmaps drawn on the live page, and
// session replays recorded with rrweb with every form value masked in the browser. Overview, Pages, Sources, Behavior,
// Visits and Sites are built in the product as they are.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "pages", label: "Pages", icon: FileText },
  { id: "sources", label: "Sources", icon: Share2 },
  { id: "behavior", label: "Behavior", icon: MousePointerClick },
  { id: "funnels", label: "Funnels", icon: Filter },
  { id: "forms", label: "Forms", icon: ClipboardList },
  { id: "heatmaps", label: "Heatmaps", icon: Flame },
  { id: "replays", label: "Replays", icon: Video, count: 3 },
  { id: "visits", label: "Visits", icon: RouteIcon },
  { id: "sites", label: "Sites", icon: Globe, count: 2 },
];

const meta = {
  title: "Products/Analytics",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const pct = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : 0);
const secs = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ""}`.trim());

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

function SiteBar({ children }: { children?: React.ReactNode }) {
  const [days, setDays] = useState("30");
  return (
    <div className="flex flex-wrap items-end gap-2">
      <SelectField
        label="Site"
        value="shop"
        onChange={() => {}}
        options={[
          { value: "shop", label: "shop" },
          { value: "docs", label: "docs" },
        ]}
      />
      <SegmentedControl
        label="Period"
        value={days}
        onChange={setDays}
        options={[
          { value: "1", label: "Today" },
          { value: "7", label: "7 days" },
          { value: "30", label: "30 days" },
          { value: "90", label: "90 days" },
        ]}
      />
      {children}
    </div>
  );
}

/* ----------------------------------------------------------------- pages */

function FunnelsPage() {
  const [id, setId] = useState("trial");
  const f = FUNNELS.find((x) => x.id === id)!;
  const first = f.steps[0]!.visits;
  const last = f.steps.at(-1)!.visits;
  const worst = f.steps.slice(1).reduce((w, s, i) => (f.steps[i]!.visits - s.visits > f.steps[w]!.visits - f.steps[w + 1]!.visits ? i : w), 0);
  return (
    <>
      <PageHeader
        title="Funnels"
        description="The steps a visit takes, in order, from the sites file. A visit counts at a step once it did every step before."
        actions={<SiteBar />}
      />
      <div className="mb-2.5">
        <SegmentedControl label="Funnel" value={id} onChange={setId} options={FUNNELS.map((x) => ({ value: x.id, label: x.name }))} />
      </div>
      <KpiGrid className="mb-2.5">
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

function FormsPage() {
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
    <>
      <PageHeader
        title="Forms"
        description="Where people start a form, how many send it, and the field they leave it at. Never what they typed."
        actions={<SiteBar />}
      />
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
            The script sends a field's name and type when it is entered and left, and nothing it holds. Fields named like a card number or a password are
            counted by type only.
          </Callout>
        </div>
      </div>
    </>
  );
}

function HeatmapsPage() {
  const [mode, setMode] = useState<"clicks" | "scroll">("clicks");
  const [device, setDevice] = useState("desktop");
  const total = CLICKS.reduce((n, c) => n + c.count, 0);
  const max = Math.max(...CLICKS.map((c) => c.count));
  return (
    <>
      <PageHeader
        title="Heatmaps"
        description="Clicks and how far down people read, drawn on the live page by the site's own script."
        actions={
          <SiteBar>
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
          </SiteBar>
        }
      />
      <div className="mb-2.5 flex flex-wrap items-center gap-2">
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
      <p className="mt-2.5 text-xs text-fg-muted">
        The page opens in a frame and the site's script draws on it, so the heatmap follows the page as it is today. The site lets Analytics frame it with
        frame-ancestors; otherwise the list stays and the page opens in a new tab.
      </p>
    </>
  );
}

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
      cell: (x) => (x.rage ? <Badge tone="danger">{x.rage} rage clicks</Badge> : <span className="text-xs text-fg-muted">–</span>),
    },
  ];
  return (
    <>
      <PageHeader
        title="Replays"
        description="Visits as they happened, recorded in the browser with every form value and marked text masked before it is sent."
        actions={<SiteBar />}
      />
      <Callout tone="info" title="Recorded for 10% of visits on shop" className="mb-2.5">
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
    </>
  );
}

const PAGES = {
  funnels: () => <FunnelsPage />,
  forms: () => <FormsPage />,
  heatmaps: () => <HeatmapsPage />,
  replays: () => <ReplaysPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="analytics" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Funnels: Story = {
  ...app("funnels"),
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
  ...app("forms"),
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

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
