import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Ban,
  Clock,
  FileText,
  GitBranch,
  LayoutDashboard,
  Mail,
  MailX,
  MessageCircle,
  MessageSquare,
  Pause,
  Play,
  Plus,
  Send,
  ShieldCheck,
  Workflow,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Dialog } from "../../components/Dialog";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";

// Messages sends email, SMS and WhatsApp campaigns and journeys through the company's own providers (Amazon SES,
// Netgsm, the WhatsApp Business API), only to people whose consent holds at the moment of sending. Providers live in
// messages.yaml with their keys in environment variables.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "campaigns", label: "Campaigns", icon: Send, count: 1 },
  { id: "journeys", label: "Journeys", icon: Workflow },
  { id: "templates", label: "Templates", icon: FileText },
  { id: "bounces", label: "Bounces", icon: MailX, count: 3 },
];

const meta = {
  title: "Products/Messages",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const fmt = (n: number) => n.toLocaleString("en");
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 1000) / 10}%` : "–");

type Channel = "email" | "sms" | "whatsapp";
const CHANNEL: Record<Channel, { label: string; icon: typeof Mail; provider: string }> = {
  email: { label: "Email", icon: Mail, provider: "Amazon SES" },
  sms: { label: "SMS", icon: MessageSquare, provider: "Netgsm" },
  whatsapp: { label: "WhatsApp", icon: MessageCircle, provider: "WhatsApp Business API" },
};

type CampaignState = "draft" | "scheduled" | "sending" | "sent";
const STATE: Record<CampaignState, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  scheduled: { label: "Scheduled", tone: "info" },
  sending: { label: "Sending", tone: "warning" },
  sent: { label: "Sent", tone: "success" },
};

interface Campaign {
  id: string;
  name: string;
  channel: Channel;
  audience: string;
  state: CampaignState;
  when: string;
  /** People in the audience, and those whose consent held. */
  inAudience: number;
  allowed: number;
  delivered: number;
  opened: number;
  clicked: number;
  unsubscribed: number;
  bounced: number;
  ab?: { a: string; b: string; aOpen: number; bOpen: number; winner: "a" | "b" };
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    name: "Fall offers",
    channel: "sms",
    audience: "Free users back on pricing",
    state: "scheduled",
    when: "Today 20:00",
    inAudience: 412,
    allowed: 371,
    delivered: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    bounced: 0,
  },
  {
    id: "c2",
    name: "October newsletter",
    channel: "email",
    audience: "Everyone with email consent",
    state: "sent",
    when: "3 Nov 10:00",
    inAudience: 19102,
    allowed: 18240,
    delivered: 17996,
    opened: 7310,
    clicked: 1288,
    unsubscribed: 41,
    bounced: 244,
    ab: { a: "What's new in Acme Books: bank feeds for 6 more banks", b: "6 more banks, no more typing in payments", aOpen: 36.1, bOpen: 41.8, winner: "b" },
  },
  {
    id: "c3",
    name: "Year-end closing checklist",
    channel: "email",
    audience: "Business customers",
    state: "sending",
    when: "Today 14:00",
    inAudience: 1840,
    allowed: 1802,
    delivered: 1210,
    opened: 402,
    clicked: 96,
    unsubscribed: 2,
    bounced: 6,
  },
  {
    id: "c4",
    name: "e-Arşiv webinar reminder",
    channel: "whatsapp",
    audience: "Webinar: e-Arşiv",
    state: "sent",
    when: "6 Nov 09:00",
    inAudience: 640,
    allowed: 418,
    delivered: 409,
    opened: 377,
    clicked: 212,
    unsubscribed: 3,
    bounced: 9,
  },
  {
    id: "c5",
    name: "Renewal reminder, 60 days",
    channel: "email",
    audience: "Renewal in 60 days",
    state: "draft",
    when: "Not scheduled",
    inAudience: 318,
    allowed: 290,
    delivered: 0,
    opened: 0,
    clicked: 0,
    unsubscribed: 0,
    bounced: 0,
  },
];

/* -------------------------------------------------------------- overview */

const DAYS14 = Array.from({ length: 14 }, (_, i) =>
  new Date(Date.UTC(2026, 9, 25 + i)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
);
const SENDS = DAYS14.map((_, i) => [i === 9 ? 18240 : 900 + (i % 3) * 120, 300 + (i % 4) * 60, i === 12 ? 418 : 20]);

function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Everything sent through your providers in the last 30 days. Each message went only to people whose consent held when it was sent."
      />
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="Sent" value="41,820" icon={Send} delta={{ label: "email 34,110, SMS 6,880, WhatsApp 830", intent: "neutral" }} />
        <KpiCard label="Delivered" value="98.1%" />
        <KpiCard label="Opened" value="39.6%" unit="email" delta={{ label: "+3.2 points", direction: "up", intent: "good" }} />
        <KpiCard label="Clicked" value="7.4%" />
        <KpiCard label="Held back by consent" value="2,316" icon={ShieldCheck} delta={{ label: "no yes for that channel at sending", intent: "neutral" }} />
        <KpiCard label="Unsubscribed" value="0.2%" delta={{ label: "88 people", intent: "neutral" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Sent per day" description="By channel, the last 14 days">
          <StackedBarChart
            label="Messages sent per day by channel"
            categories={DAYS14}
            segments={[
              { id: "email", name: "Email" },
              { id: "sms", name: "SMS" },
              { id: "whatsapp", name: "WhatsApp" },
            ]}
            values={SENDS}
            height={200}
            xTicks={7}
          />
        </Panel>
        <Panel title="Providers" description="From messages.yaml" flush>
          <ul aria-label="Providers" className="flex flex-col">
            {[
              { name: "Amazon SES, eu-central-1", detail: "Email · 14 per second · domain example.com verified", ok: true },
              { name: "Netgsm", detail: "SMS · sender ACME · balance 48,200 SMS", ok: true },
              { name: "WhatsApp Business API", detail: "+90 850 *** ** 00 · 4 approved templates", ok: true },
              { name: "smtp.example.com", detail: "Email fallback · not used this month", ok: false },
            ].map((p) => (
              <li key={p.name} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-sm text-fg">{p.name}</span>
                  <span className="truncate text-2xs text-fg-muted">{p.detail}</span>
                </span>
                <StatusBadge tone={p.ok ? "success" : "neutral"}>{p.ok ? "Working" : "Standby"}</StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Best clicked links" description="Clicks arrive in Analytics with the campaign, so visits and goals count them.">
        <BarList
          label="Best clicked links"
          items={[
            { id: "l1", label: "/pricing?utm_campaign=october-newsletter", value: 610 },
            { id: "l2", label: "/banks?utm_campaign=october-newsletter", value: 402 },
            { id: "l3", label: "/webinar/e-arsiv?utm_campaign=webinar-reminder", value: 212 },
            { id: "l4", label: "/help/year-end?utm_campaign=year-end", value: 96 },
          ]}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------- campaigns */

function NewCampaignDialog({ open, onOpenChange, onSchedule }: { open: boolean; onOpenChange: (o: boolean) => void; onSchedule: (c: Campaign) => void }) {
  const [name, setName] = useState("");
  const [channel, setChannel] = useState<Channel>("email");
  const [audience, setAudience] = useState("Pro, never used bank feeds");
  const SIZES: Record<string, { size: number; email: number; sms: number; whatsapp: number }> = {
    "Pro, never used bank feeds": { size: 2210, email: 1904, sms: 1210, whatsapp: 302 },
    "Business customers": { size: 1840, email: 1802, sms: 1302, whatsapp: 410 },
    İzmir: { size: 3904, email: 2511, sms: 2050, whatsapp: 388 },
  };
  const s = SIZES[audience]!;
  const allowed = s[channel];
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New campaign"
      description="One send to a segment from Audience. Consent is checked again for each person when it sends."
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSchedule({
          id: `new-${name.trim()}`,
          name: name.trim(),
          channel,
          audience,
          state: "scheduled",
          when: "Tomorrow 10:00",
          inAudience: s.size,
          allowed,
          delivered: 0,
          opened: 0,
          clicked: 0,
          unsubscribed: 0,
          bounced: 0,
        });
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!name.trim()}>
            Schedule for tomorrow 10:00
          </Button>
        </>
      }
    >
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Bank feeds: connect in two minutes" />
      <SegmentedControl
        label="Channel"
        value={channel}
        onChange={setChannel}
        options={(Object.keys(CHANNEL) as Channel[]).map((c) => ({ value: c, label: CHANNEL[c].label }))}
      />
      <SelectField
        label="Audience"
        value={audience}
        onChange={(e) => setAudience(e.target.value)}
        options={Object.keys(SIZES).map((a) => ({ value: a, label: `${a} · ${fmt(SIZES[a]!.size)}` }))}
      />
      <p role="status" className="rounded-md bg-canvas px-2.5 py-2 text-sm text-fg">
        <span className="font-semibold">{fmt(allowed)}</span> of {fmt(s.size)} people may get{" "}
        {channel === "email" ? "an email" : channel === "sms" ? "an SMS" : "a WhatsApp message"} today. The others have no yes for {CHANNEL[channel].label} in
        Consent.
      </p>
    </Dialog>
  );
}

function CampaignPanel({ c, onPause }: { c: Campaign; onPause: () => void }) {
  const steps = [
    { id: "allowed", label: "Consent held", value: c.allowed },
    { id: "delivered", label: "Delivered", value: c.delivered },
    { id: "opened", label: c.channel === "sms" ? "Read (not measured for SMS)" : c.channel === "whatsapp" ? "Read" : "Opened", value: c.opened },
    { id: "clicked", label: "Clicked", value: c.clicked },
  ];
  return (
    <Panel
      aria-label="Campaign"
      title={c.name}
      description={`${CHANNEL[c.channel].label} through ${CHANNEL[c.channel].provider} · ${c.audience} · ${c.when}`}
      actions={<StatusBadge tone={STATE[c.state].tone}>{STATE[c.state].label}</StatusBadge>}
    >
      <div className="flex flex-col gap-3">
        <p className="text-xs text-fg-muted">
          {fmt(c.inAudience)} in the audience; {fmt(c.inAudience - c.allowed)} held back because their latest {CHANNEL[c.channel].label} answer in Consent is
          not yes.
        </p>
        {c.state === "draft" || c.state === "scheduled" ? (
          <Callout tone="info" title={c.state === "scheduled" ? `Sends ${c.when}` : "Not scheduled yet"}>
            {c.state === "scheduled"
              ? `Consent is asked again right before it sends, so ${fmt(c.allowed)} can still change. Ayşe Yılmaz replied STOP this morning and is already left out.`
              : "Choose a time to schedule it. Nothing is sent before."}
          </Callout>
        ) : (
          <BarList
            label="Results"
            items={steps.map((s) => ({ id: s.id, label: s.label, value: s.value }))}
            max={c.allowed}
            format={(v) => `${fmt(v)} · ${pct(v, c.allowed)}`}
          />
        )}
        {c.ab && (
          <section aria-label="A/B test" className="flex flex-col gap-1.5 border-t border-line pt-2.5">
            <h3 className="text-xs font-semibold text-fg-muted">Subject test on 20%, then the winner to the rest</h3>
            {(["a", "b"] as const).map((k) => (
              <div
                key={k}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-sm",
                  c.ab!.winner === k ? "border-success/40 bg-success-soft" : "border-line",
                )}
              >
                <Badge mono>{k.toUpperCase()}</Badge>
                <span className="min-w-0 grow truncate text-fg">{c.ab![k]}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums">{k === "a" ? c.ab!.aOpen : c.ab!.bOpen}% opened</span>
                {c.ab!.winner === k && <StatusBadge tone="success">Winner</StatusBadge>}
              </div>
            ))}
          </section>
        )}
        {c.state !== "draft" && c.state !== "scheduled" && (
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1 border-t border-line pt-2.5 text-xs">
            <dt className="text-fg-muted">Unsubscribed</dt>
            <dd className="text-fg">{fmt(c.unsubscribed)}, recorded in Consent at once</dd>
            <dt className="text-fg-muted">Bounced</dt>
            <dd className="text-fg">{fmt(c.bounced)}; hard bounces are not sent to again</dd>
          </dl>
        )}
        {(c.state === "scheduled" || c.state === "sending") && (
          <div>
            <Button size="sm" icon={<Pause />} onClick={onPause}>
              Pause
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

function CampaignsPage() {
  const [rows, setRows] = useState(CAMPAIGNS);
  const [active, setActive] = useState("c1");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cur = rows.find((c) => c.id === active) ?? rows[0]!;
  const cols: Column<Campaign>[] = [
    {
      id: "name",
      header: "Campaign",
      width: "32%",
      cell: (c) => {
        const C = CHANNEL[c.channel];
        return (
          <span className="flex min-w-0 items-center gap-2">
            <C.icon aria-label={C.label} className="size-3.5 shrink-0 text-fg-muted" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{c.name}</span>
              <span className="truncate text-2xs text-fg-muted">{c.audience}</span>
            </span>
          </span>
        );
      },
    },
    { id: "state", header: "State", cell: (c) => <StatusBadge tone={STATE[c.state].tone}>{STATE[c.state].label}</StatusBadge> },
    { id: "when", header: "When", cell: (c) => <span className="text-xs whitespace-nowrap">{c.when}</span> },
    { id: "allowed", header: "Recipients", align: "right", mono: true, sortValue: (c) => c.allowed, cell: (c) => fmt(c.allowed) },
    {
      id: "opened",
      header: "Opened",
      align: "right",
      cell: (c) => <span className="font-mono text-xs">{c.delivered && c.channel !== "sms" ? pct(c.opened, c.delivered) : "–"}</span>,
    },
    {
      id: "clicked",
      header: "Clicked",
      align: "right",
      cell: (c) => <span className="font-mono text-xs">{c.delivered ? pct(c.clicked, c.delivered) : "–"}</span>,
    },
  ];
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Every campaign with its audience, channel and results."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            New campaign
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_400px]">
        <Panel flush aria-label="All campaigns">
          <DataTable
            label="Campaigns"
            columns={cols}
            rows={rows}
            getRowId={(c) => c.id}
            onRowClick={(c) => setActive(c.id)}
            activeRowId={cur.id}
            minWidth={680}
          />
        </Panel>
        <CampaignPanel
          key={cur.id}
          c={cur}
          onPause={() => {
            setRows((rs) => rs.map((r) => (r.id === cur.id ? { ...r, state: "draft", when: "Paused" } : r)));
            setNotice(`${cur.name} is paused. Nothing more is sent until it is scheduled again.`);
          }}
        />
      </div>
      <NewCampaignDialog
        open={creating}
        onOpenChange={setCreating}
        onSchedule={(c) => {
          setRows((rs) => [c, ...rs]);
          setActive(c.id);
          setCreating(false);
          setNotice(`${c.name} is scheduled for tomorrow 10:00 to ${fmt(c.allowed)} people.`);
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------- journeys */

interface Step {
  id: string;
  kind: "trigger" | "send" | "wait" | "branch" | "exit";
  title: string;
  detail: string;
  channel?: Channel;
  /** People at this step now, and who passed it in 30 days. */
  now: number;
  passed: number;
}

const JOURNEYS = [
  {
    id: "welcome",
    name: "Welcome",
    live: true,
    entered: 1184,
    converted: 312,
    steps: [
      { id: "s1", kind: "trigger", title: "Signed up", detail: "Event signup from the app, via Audience", now: 0, passed: 1184 },
      { id: "s2", kind: "send", channel: "email", title: "Welcome email", detail: "Template welcome-tr, at once", now: 0, passed: 1180 },
      { id: "s3", kind: "wait", title: "Wait 1 day", detail: "", now: 41, passed: 1139 },
      { id: "s4", kind: "send", channel: "email", title: "Tips email", detail: "Template first-invoice-tips", now: 0, passed: 1096 },
      { id: "s5", kind: "wait", title: "Wait 2 days", detail: "", now: 88, passed: 1008 },
      { id: "s6", kind: "branch", title: "Opened neither email?", detail: "Yes: 402 · No: 606, who leave here", now: 0, passed: 1008 },
      { id: "s7", kind: "send", channel: "sms", title: "SMS on day three", detail: "Only with SMS consent: 251 of 402", now: 0, passed: 251 },
      { id: "s8", kind: "exit", title: "Leaves the journey", detail: "On the first invoice sent, or on opting out", now: 0, passed: 312 },
    ] as Step[],
  },
  {
    id: "trial-end",
    name: "Trial ends",
    live: true,
    entered: 402,
    converted: 96,
    steps: [
      { id: "t1", kind: "trigger", title: "Trial has 3 days left", detail: "Trait trial_ends_at", now: 0, passed: 402 },
      { id: "t2", kind: "send", channel: "email", title: "Your trial ends soon", detail: "A/B test of the subject", now: 0, passed: 398 },
      { id: "t3", kind: "wait", title: "Wait 2 days", detail: "", now: 54, passed: 344 },
      { id: "t4", kind: "send", channel: "whatsapp", title: "WhatsApp reminder", detail: "Approved template trial_last_day", now: 0, passed: 120 },
      { id: "t5", kind: "exit", title: "Leaves the journey", detail: "On a paid plan, or on opting out", now: 0, passed: 96 },
    ] as Step[],
  },
  {
    id: "winback",
    name: "Win back",
    live: false,
    entered: 0,
    converted: 0,
    steps: [
      { id: "w1", kind: "trigger", title: "No sign-in for 60 days", detail: "Trait last_seen_at", now: 0, passed: 0 },
      { id: "w2", kind: "send", channel: "email", title: "We miss you", detail: "Draft", now: 0, passed: 0 },
      { id: "w3", kind: "exit", title: "Leaves the journey", detail: "On sign-in", now: 0, passed: 0 },
    ] as Step[],
  },
];

const STEP_ICON = { trigger: Play, send: Send, wait: Clock, branch: GitBranch, exit: Ban } as const;

function JourneysPage() {
  const [id, setId] = useState("welcome");
  const [paused, setPaused] = useState<string[]>([]);
  const j = JOURNEYS.find((x) => x.id === id)!;
  const live = j.live && !paused.includes(j.id);
  return (
    <>
      <PageHeader
        title="Journeys"
        description="Messages started by an event, with waits, conditions and channel changes. A person leaves when they convert or opt out."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New journey
          </Button>
        }
      />
      <div className="mb-2.5">
        <Tabs
          label="Journey"
          value={id}
          onChange={setId}
          items={JOURNEYS.map((x) => ({ value: x.id, label: x.name, count: x.live && !paused.includes(x.id) ? "Live" : x.live ? "Paused" : "Draft" }))}
        />
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel aria-label="Steps" title={`${j.name}: steps`} description="People now at each step, and who passed it in 30 days.">
          <ol aria-label="Journey steps" className="flex flex-col">
            {j.steps.map((s, i) => {
              const Icon = s.kind === "send" && s.channel ? CHANNEL[s.channel].icon : STEP_ICON[s.kind];
              return (
                <li key={s.id} className="relative flex gap-3 pb-3 last:pb-0">
                  {i < j.steps.length - 1 && <span aria-hidden className="absolute top-7 bottom-0 left-[13px] w-px bg-line" />}
                  <span
                    className={cn(
                      "z-[1] grid size-7 shrink-0 place-items-center rounded-full border",
                      s.kind === "send" ? "border-accent/30 bg-accent-soft text-accent" : "border-line bg-surface text-fg-muted",
                    )}
                  >
                    <Icon aria-hidden className="size-3.5" />
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="text-sm font-medium text-fg">{s.title}</span>
                    {s.detail && <span className="text-xs text-fg-muted">{s.detail}</span>}
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                    {fmt(s.passed)}
                    {s.now > 0 && <span className="block text-2xs text-accent-text">{s.now} here now</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <KpiGrid minWidth={130}>
            <KpiCard label="Entered" value={fmt(j.entered)} unit="30 d" />
            <KpiCard label="Converted" value={j.entered ? pct(j.converted, j.entered) : "–"} />
          </KpiGrid>
          <Panel title="State">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-2">
                <StatusBadge tone={live ? "success" : "neutral"}>{live ? "Live" : j.live ? "Paused" : "Draft"}</StatusBadge>
                {j.live && (
                  <Button size="xs" icon={live ? <Pause /> : <Play />} onClick={() => setPaused((p) => (live ? [...p, j.id] : p.filter((x) => x !== j.id)))}>
                    {live ? "Pause journey" : "Resume journey"}
                  </Button>
                )}
              </span>
              {j.live && !live && (
                <p role="status" className="text-xs text-fg-muted">
                  Paused: nobody new enters, and people inside wait at their step until it resumes.
                </p>
              )}
              <p className="text-2xs text-fg-muted">Clicks arrive in Analytics under the campaign journey-{j.id}.</p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- templates */

const TEMPLATES = [
  { id: "welcome-tr", name: "welcome-tr", channel: "email" as Channel, lang: "TR", used: "Welcome", approval: null },
  { id: "first-invoice-tips", name: "first-invoice-tips", channel: "email" as Channel, lang: "TR", used: "Welcome", approval: null },
  { id: "day3-sms", name: "day3-sms", channel: "sms" as Channel, lang: "TR", used: "Welcome", approval: null },
  { id: "trial_last_day", name: "trial_last_day", channel: "whatsapp" as Channel, lang: "TR", used: "Trial ends", approval: "Approved" },
  { id: "webinar_reminder", name: "webinar_reminder", channel: "whatsapp" as Channel, lang: "TR", used: "e-Arşiv webinar reminder", approval: "Approved" },
  { id: "invoice_overdue", name: "invoice_overdue", channel: "whatsapp" as Channel, lang: "TR", used: "Not used", approval: "In review at Meta" },
];

const PREVIEW_PEOPLE: Record<string, { first: string; company: string }> = {
  okan: { first: "Okan", company: "Tekin Yapı" },
  gizem: { first: "Gizem", company: "Avcı Lojistik" },
};

function TemplatesPage() {
  const [active, setActive] = useState("welcome-tr");
  const [who, setWho] = useState("okan");
  const p = PREVIEW_PEOPLE[who]!;
  const t = TEMPLATES.find((x) => x.id === active)!;
  const cols: Column<(typeof TEMPLATES)[number]>[] = [
    { id: "name", header: "Template", cell: (x) => <span className="font-mono text-xs font-medium">{x.name}</span> },
    { id: "channel", header: "Channel", cell: (x) => <Badge>{CHANNEL[x.channel].label}</Badge> },
    { id: "used", header: "Used by", cell: (x) => <span className="text-xs">{x.used}</span> },
    {
      id: "approval",
      header: "WhatsApp approval",
      cell: (x) =>
        x.approval ? (
          <StatusBadge tone={x.approval === "Approved" ? "success" : "warning"}>{x.approval}</StatusBadge>
        ) : (
          <span className="text-xs text-fg-muted">–</span>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Templates"
        description="Messages with personal fields such as {{first_name}}. WhatsApp templates are approved by Meta before they can be sent."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel flush aria-label="All templates">
          <DataTable
            label="Templates"
            columns={cols}
            rows={TEMPLATES}
            getRowId={(x) => x.id}
            onRowClick={(x) => setActive(x.id)}
            activeRowId={active}
            minWidth={520}
          />
        </Panel>
        <Panel
          aria-label="Preview"
          title={`Preview: ${t.name}`}
          actions={
            <SelectField
              aria-label="Preview as"
              value={who}
              onChange={(e) => setWho(e.target.value)}
              options={[
                { value: "okan", label: "As Okan Tekin" },
                { value: "gizem", label: "As Gizem Avcı" },
              ]}
              className="w-40"
            />
          }
        >
          <div className="flex flex-col gap-2 rounded-md border border-line bg-canvas p-3 text-sm text-fg">
            {t.channel === "email" && (
              <span className="text-xs text-fg-muted">From Acme Books &lt;hello@example.com&gt; · Subject: Hoş geldiniz, {p.first}</span>
            )}
            <p>
              Merhaba {p.first}, {p.company} için Acme Books hesabınız hazır. İlk faturanızı iki dakikada gönderin.
            </p>
            <span className="text-2xs text-fg-muted">
              {t.channel === "email"
                ? "Every email carries an unsubscribe link, recorded in Consent at once."
                : t.channel === "sms"
                  ? "Ends with how to stop: İptal için RET yazıp gönderin."
                  : "WhatsApp: the person can reply STOP at any time."}
            </span>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- bounces */

const BOUNCES = [
  {
    id: "b1",
    address: "info@kilicticaret.example.com",
    kind: "Hard",
    reason: "550 5.1.1 mailbox does not exist",
    at: "3 Nov 10:02",
    campaign: "October newsletter",
  },
  { id: "b2", address: "muhasebe@erturizm.example.com", kind: "Hard", reason: "550 5.1.1 user unknown", at: "3 Nov 10:03", campaign: "October newsletter" },
  { id: "b3", address: "+90 505 *** ** 41", kind: "Hard", reason: "Netgsm: number not in service", at: "6 Nov 09:00", campaign: "e-Arşiv webinar reminder" },
  {
    id: "b4",
    address: "seda@polatgida.example.com",
    kind: "Soft",
    reason: "452 mailbox full; tried 3 times",
    at: "Today 14:02",
    campaign: "Year-end closing checklist",
  },
];

function BouncesPage() {
  const [rows, setRows] = useState(BOUNCES);
  const [notice, setNotice] = useState<string | null>(null);
  const cols: Column<(typeof BOUNCES)[number]>[] = [
    { id: "address", header: "Address", cell: (b) => <span className="font-mono text-xs">{b.address}</span> },
    { id: "kind", header: "Bounce", cell: (b) => <Badge tone={b.kind === "Hard" ? "danger" : "warning"}>{b.kind}</Badge> },
    { id: "reason", header: "Reason", cell: (b) => <span className="text-xs">{b.reason}</span> },
    { id: "campaign", header: "From", cell: (b) => <span className="text-xs">{b.campaign}</span> },
    { id: "at", header: "When", cell: (b) => <span className="text-xs whitespace-nowrap">{b.at}</span> },
    {
      id: "act",
      header: <span className="sr-only">Action</span>,
      align: "right",
      cell: (b) =>
        b.kind === "Hard" ? (
          <Button
            size="xs"
            onClick={() => {
              setRows((rs) => rs.filter((r) => r.id !== b.id));
              setNotice(`${b.address} may be sent to again.`);
            }}
          >
            Fixed, send again
          </Button>
        ) : null,
    },
  ];
  return (
    <>
      <PageHeader title="Bounces" description="An address that bounces hard is not sent to again until someone fixes it. Soft bounces are tried three times." />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <Panel flush title="Addresses not sent to">
        <DataTable label="Bounces" columns={cols} rows={rows} getRowId={(b) => b.id} minWidth={860} />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `providers:
  email:
    primary: { kind: ses, region: eu-central-1, from: hello@example.com }
    fallback: { kind: smtp, host: smtp.example.com }
    key: $SES_ACCESS_KEY
  sms:
    kind: netgsm
    sender: ACME
    key: $NETGSM_API_KEY
  whatsapp:
    kind: whatsapp-business
    phone_id: $WA_PHONE_ID
consent:
  check: consent        # ask Consent before every message
limits:
  email_per_second: 14
  quiet_hours: 21:00-09:00   # SMS and WhatsApp wait
links:
  utm_source: messages`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="messages"
      file="messages.yaml"
      applied="a week ago"
      yaml={YAML}
      groups={[
        {
          title: "Providers",
          description: "Keys are environment variables, never in the file.",
          items: [
            { label: "Email", value: "Amazon SES in eu-central-1; smtp.example.com if SES fails", path: "providers.email" },
            { label: "SMS", value: "Netgsm, sender name ACME", path: "providers.sms" },
            { label: "WhatsApp", value: "WhatsApp Business API", path: "providers.whatsapp" },
          ],
        },
        {
          title: "Sending",
          items: [
            { label: "Consent", value: "Asked of Consent before every message", path: "consent.check" },
            { label: "Quiet hours", value: "SMS and WhatsApp wait from 21:00 to 09:00", path: "limits.quiet_hours" },
            { label: "Links", value: "Tagged utm_source=messages and the campaign", path: "links" },
          ],
        },
      ]}
    />
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  campaigns: () => <CampaignsPage />,
  journeys: () => <JourneysPage />,
  templates: () => <TemplatesPage />,
  bounces: () => <BouncesPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="messages" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Providers" })).getAllByRole("listitem")).toHaveLength(4);
    await expect(c.getByText("Held back by consent")).toBeInTheDocument();
  },
};

export const Campaigns: Story = {
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Campaign" })).toHaveTextContent("Ayşe Yılmaz replied STOP this morning");
    await userEvent.click(within(c.getByRole("table", { name: "Campaigns" })).getByText("October newsletter"));
    const campaign = c.getByRole("region", { name: "Campaign" });
    await expect(within(campaign).getByRole("region", { name: "A/B test" })).toHaveTextContent("Winner");
    await expect(within(campaign).getByRole("list", { name: "Results" })).toHaveTextContent("Clicked");
  },
};

export const NewCampaign: Story = {
  name: "New campaign",
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New campaign" }));
    const dialog = within(within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "New campaign" }));
    await expect(dialog.getByRole("status")).toHaveTextContent("1,904 of 2,210 people may get an email today.");
    await userEvent.click(dialog.getByRole("radio", { name: "SMS" }));
    await expect(dialog.getByRole("status")).toHaveTextContent("1,210 of 2,210 people may get an SMS today.");
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Bank feeds in two minutes");
    await userEvent.click(dialog.getByRole("button", { name: "Schedule for tomorrow 10:00" }));
    await expect(c.getByText("Bank feeds in two minutes is scheduled for tomorrow 10:00 to 1,210 people.")).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Campaigns" })).getAllByRole("row")).toHaveLength(CAMPAIGNS.length + 2);
  },
};

export const PauseCampaign: Story = {
  name: "Pause a campaign",
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("region", { name: "Campaign" })).getByRole("button", { name: "Pause" }));
    await expect(c.getByText("Fall offers is paused. Nothing more is sent until it is scheduled again.")).toBeInTheDocument();
    await expect(c.getByRole("region", { name: "Campaign" })).toHaveTextContent("Not scheduled yet");
  },
};

export const Journeys: Story = {
  ...app("journeys"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const steps = c.getByRole("list", { name: "Journey steps" });
    await expect(within(steps).getAllByRole("listitem")).toHaveLength(8);
    await expect(steps).toHaveTextContent("Only with SMS consent: 251 of 402");
    await userEvent.click(c.getByRole("button", { name: "Pause journey" }));
    await expect(c.getByRole("status")).toHaveTextContent("nobody new enters");
    await userEvent.click(c.getByRole("tab", { name: /Trial ends/ }));
    await expect(within(c.getByRole("list", { name: "Journey steps" })).getAllByRole("listitem")).toHaveLength(5);
    blur(canvasElement);
  },
};

export const Templates: Story = {
  ...app("templates"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const preview = c.getByRole("region", { name: "Preview" });
    await expect(preview).toHaveTextContent("Merhaba Okan");
    await userEvent.selectOptions(within(preview).getByRole("combobox", { name: "Preview as" }), "gizem");
    await expect(c.getByRole("region", { name: "Preview" })).toHaveTextContent("Avcı Lojistik");
    blur(canvasElement);
  },
};

export const Bounces: Story = {
  ...app("bounces"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Bounces" });
    await userEvent.click(within(within(table).getAllByRole("row")[1]!).getByRole("button", { name: "Fixed, send again" }));
    await expect(c.getByRole("status")).toHaveTextContent("info@kilicticaret.example.com may be sent to again.");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(BOUNCES.length - 1);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("messages.yaml as applied")).toHaveTextContent("check: consent");
  },
};
