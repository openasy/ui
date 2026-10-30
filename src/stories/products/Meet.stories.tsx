import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  AudioLines,
  CalendarDays,
  CircleDot,
  Copy,
  Download,
  Hand,
  Hash,
  Link2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Plus,
  Send,
  Server as ServerIcon,
  ShieldCheck,
  TriangleAlert,
  Trash2,
  Users,
  Video,
  VideoOff,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Dialog } from "../../components/Dialog";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput, TextField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar, initials } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, timeLabels } from "../mocks";

const nav = [
  { id: "meetings", label: "Meetings", icon: CalendarDays },
  { id: "meeting", label: "Current call", icon: Video, count: "Live" },
  { id: "recordings", label: "Recordings", icon: CircleDot },
  { id: "server", label: "Server", icon: ServerIcon },
];

const meta = {
  title: "Products/Meet",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = PEOPLE[1];

/** A person's tile colour, from the chart palette so it holds in both themes. */
type Hue = "chart-1" | "chart-2" | "chart-3" | "chart-4";

/** A tinted fill on the dark call stage. */
const onStage = (hue: Hue, strength: number): CSSProperties => ({
  backgroundColor: `color-mix(in oklab, var(--oa-${hue}) ${strength}%, var(--oa-topbar))`,
});

type Source = "calendar" | "chat" | "hand";

const SOURCE: Record<Source, { label: string; icon: typeof CalendarDays }> = {
  calendar: { label: "Calendar", icon: CalendarDays },
  chat: { label: "Chat", icon: Hash },
  hand: { label: "By hand", icon: Link2 },
};

type MeetingStatus = "live" | "upcoming" | "ended";

const STATUS: Record<MeetingStatus, { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "success" },
  upcoming: { label: "Upcoming", tone: "info" },
  ended: { label: "Ended", tone: "neutral" },
};

interface Meeting {
  id: string;
  /** "HH:MM" on Thursday 5 November. */
  time: string;
  title: string;
  source: Source;
  /** The channel a call was started from. */
  channel?: string;
  organizer: string;
  /** People who joined; for upcoming meetings, 0. */
  joined: number;
  /** People invited; ad hoc calls from a channel have no invitation. */
  invited?: number;
  /** Of those who joined (or are invited), how many came from outside through the lobby. */
  guests: number;
  /** Minutes, so far for a live meeting. */
  minutes?: number;
  status: MeetingStatus;
  lobby?: number;
  recorded?: boolean;
}

/** Thursday 5 November 2026, 14:06. */
const MEETINGS: Meeting[] = [
  {
    id: "support-handover",
    time: "08:45",
    title: "Support handover",
    source: "chat",
    channel: "#support",
    organizer: PEOPLE[2],
    joined: 5,
    guests: 0,
    minutes: 18,
    status: "ended",
  },
  {
    id: "standup",
    time: "09:30",
    title: "Sales stand-up",
    source: "calendar",
    organizer: PEOPLE[3],
    joined: 4,
    invited: 4,
    guests: 0,
    minutes: 14,
    status: "ended",
  },
  {
    id: "interview",
    time: "10:30",
    title: "Interview: support engineer",
    source: "calendar",
    organizer: PEOPLE[5],
    joined: 3,
    invited: 3,
    guests: 1,
    minutes: 52,
    status: "ended",
  },
  {
    id: "incident",
    time: "11:12",
    title: "Incident call: api-prod-03",
    source: "chat",
    channel: "#platform",
    organizer: PEOPLE[4],
    joined: 6,
    guests: 0,
    minutes: 34,
    status: "ended",
  },
  {
    id: "board",
    time: "12:00",
    title: "Board call",
    source: "calendar",
    organizer: PEOPLE[7],
    joined: 7,
    invited: 8,
    guests: 2,
    minutes: 55,
    status: "ended",
    recorded: true,
  },
  {
    id: "contoso-vendor",
    time: "13:00",
    title: "Vendor call: Contoso",
    source: "calendar",
    organizer: PEOPLE[2],
    joined: 3,
    invited: 3,
    guests: 1,
    minutes: 26,
    status: "ended",
  },
  { id: "k7f-3qd-wx2", time: "13:40", title: "Northwind quote", source: "hand", organizer: PEOPLE[6], joined: 2, guests: 0, minutes: 9, status: "ended" },
  {
    id: "security-follow-up",
    time: "13:55",
    title: "Security review follow-up",
    source: "chat",
    channel: "#security",
    organizer: PEOPLE[0],
    joined: 3,
    guests: 0,
    minutes: 11,
    status: "live",
  },
  {
    id: "demo",
    time: "14:00",
    title: "Demo: Northwind",
    source: "calendar",
    organizer: ME,
    joined: 4,
    invited: 4,
    guests: 2,
    minutes: 6,
    status: "live",
    lobby: 1,
  },
  {
    id: "product-review",
    time: "15:00",
    title: "Product review",
    source: "calendar",
    organizer: PEOPLE[7],
    joined: 0,
    invited: 9,
    guests: 0,
    status: "upcoming",
  },
  {
    id: "contoso-partner",
    time: "16:30",
    title: "Partner sync: Contoso",
    source: "calendar",
    organizer: PEOPLE[2],
    joined: 0,
    invited: 4,
    guests: 2,
    status: "upcoming",
  },
  {
    id: "onboarding",
    time: "17:00",
    title: "Onboarding: new account executives",
    source: "calendar",
    organizer: PEOPLE[3],
    joined: 0,
    invited: 6,
    guests: 0,
    status: "upcoming",
  },
];

const linkOf = (id: string) => `meet.example.com/${id}`;

/* ------------------------------------------------------------- meetings */

function StartDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const [record, setRecord] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        setCopied(false);
      }}
      title="Your meeting is ready"
      description="Anyone with the link can ask to join. People from Acme Corp come straight in; everyone else waits in the lobby until you let them in."
      icon={<Video className="size-4" />}
      iconTone="success"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
          <Button variant="primary" icon={<Video />}>
            Open meeting
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-1">
        <span className="text-xs font-medium text-fg">Link</span>
        <span className="flex items-center gap-1 rounded-md bg-canvas px-2 py-1.5">
          <code className="min-w-0 grow truncate font-mono text-sm text-fg">https://meet.example.com/r4m-82n-tqe</code>
          <IconButton label="Copy link" size="xs" onClick={() => setCopied(true)}>
            <Copy className="size-3.5" />
          </IconButton>
        </span>
        {copied && (
          <p role="status" className="text-xs text-success">
            Link copied.
          </p>
        )}
      </div>
      <Checkbox
        label="Allow recording"
        description="Allowed for the Sales group in meet.yaml. Everyone in the call sees when a recording runs."
        checked={record}
        onChange={(e) => setRecord(e.target.checked)}
      />
    </Dialog>
  );
}

/** Where a meeting's link came from: an icon, named for screen readers. */
function SourceIcon({ m }: { m: Meeting }) {
  const S = SOURCE[m.source];
  const name = m.channel ? `Chat ${m.channel}` : S.label;
  return (
    <span title={name} className="flex shrink-0 items-center gap-0.5">
      <S.icon aria-hidden className="size-3" />
      {m.channel ? <span className="font-medium">{m.channel}</span> : <span className="sr-only">{S.label}</span>}
    </span>
  );
}

/** Today's meetings across the company, how many joined, and a way into the next call. */
function MeetingsPage() {
  const [filter, setFilter] = useState<"all" | MeetingStatus>("all");
  const [starting, setStarting] = useState(false);
  const [copied, setCopied] = useState(false);
  const rows = MEETINGS.filter((m) => filter === "all" || m.status === filter);
  const done = MEETINGS.filter((m) => m.status !== "upcoming");
  const joined = done.reduce((n, m) => n + m.joined, 0);
  const guests = done.reduce((n, m) => n + m.guests, 0);
  const ended = MEETINGS.filter((m) => m.status === "ended");
  const avg = Math.round(ended.reduce((n, m) => n + (m.minutes ?? 0), 0) / ended.length);
  const count = (s: MeetingStatus) => MEETINGS.filter((m) => m.status === s).length;
  const mine = MEETINGS.filter((m) => ["demo", "product-review", "onboarding"].includes(m.id));

  const cols: Column<Meeting>[] = [
    { id: "time", header: "Start", width: "64px", mono: true, sortValue: (m) => m.time, cell: (m) => m.time },
    {
      id: "title",
      header: "Meeting",
      width: "29%",
      sortValue: (m) => m.title,
      cell: (m) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{m.title}</span>
          <span className="flex min-w-0 items-center gap-1.5 text-2xs text-fg-muted">
            <SourceIcon m={m} />
            <span className="truncate font-mono">{linkOf(m.id)}</span>
            {m.recorded && (
              <span className="flex shrink-0 items-center gap-0.5 font-medium text-danger-text">
                <CircleDot aria-hidden className="size-3" />
                Recorded
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      id: "organizer",
      header: "Organiser",
      sortValue: (m) => m.organizer,
      cell: (m) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar name={m.organizer} size="sm" className="size-5" />
          <span className="truncate text-xs">{m.organizer === ME ? "You" : m.organizer}</span>
        </span>
      ),
    },
    {
      id: "people",
      header: "Joined",
      description: "People who joined, of those invited. Guests came in through the lobby.",
      sortValue: (m) => m.joined,
      cell: (m) => (
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap">
          <span className="tabular-nums">{m.status === "upcoming" ? `${m.invited} invited` : m.invited ? `${m.joined} of ${m.invited}` : `${m.joined}`}</span>
          {m.guests > 0 && <Badge>{m.guests === 1 ? "1 guest" : `${m.guests} guests`}</Badge>}
          {m.lobby ? <Badge tone="warning">{m.lobby} in lobby</Badge> : null}
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (m) => m.minutes ?? 0,
      cell: (m) => (
        <span className="flex items-center gap-1.5 text-xs whitespace-nowrap">
          <StatusBadge tone={STATUS[m.status].tone}>{STATUS[m.status].label}</StatusBadge>
          {m.minutes !== undefined && <span className="text-fg-muted tabular-nums">{m.minutes} min</span>}
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Thursday 5 November · every meeting on meet.example.com today, from Calendar, Chat or a link made by hand."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setStarting(true)}>
            Start a meeting now
          </Button>
        }
      />
      <KpiGrid minWidth={170}>
        <KpiCard
          label="Meetings today"
          value={String(MEETINGS.length)}
          icon={Video}
          delta={{ label: `${count("live")} live now, ${count("upcoming")} still to come` }}
        />
        <KpiCard label="People joined" value={String(joined)} icon={Users} delta={{ label: `${guests} guests through the lobby` }} />
        <KpiCard label="Average length" value={String(avg)} unit="min" delta={{ label: `over ${ended.length} ended meetings` }} />
        <KpiCard label="Recorded" value="1" icon={CircleDot} delta={{ label: "Board call, allowed for Leadership" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_272px]">
        <Panel flush>
          <div className="px-3 pt-2">
            <Tabs
              label="Meetings by status"
              value={filter}
              onChange={setFilter}
              items={[
                { value: "all", label: "Today", count: MEETINGS.length },
                { value: "live", label: "Live", count: count("live") },
                { value: "upcoming", label: "Upcoming", count: count("upcoming") },
                { value: "ended", label: "Ended", count: count("ended") },
              ]}
              className="border-b-0"
            />
          </div>
          <div className="border-t border-line">
            <DataTable label="Meetings today" columns={cols} rows={rows} getRowId={(m) => m.id} minWidth={760} />
          </div>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Next for you">
            <ul aria-label="Your next meetings" className="flex flex-col gap-2.5">
              {mine.map((m) => (
                <li key={m.id} className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-fg">{m.title}</span>
                    <span className="text-xs text-fg-muted">
                      {m.status === "live" ? `Started ${m.time} · ${m.joined} in the call` : `${m.time} · ${m.invited} invited`}
                    </span>
                  </span>
                  {m.status === "live" ? (
                    <Button size="sm" variant="primary" icon={<Video />}>
                      Join
                    </Button>
                  ) : (
                    <Badge>{m.time}</Badge>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Your room" description="A link that stays yours, for calls that are not in the calendar.">
            <div className="flex flex-col gap-2">
              <span className="flex items-center gap-1 rounded-md bg-canvas px-2 py-1.5">
                <code className="min-w-0 grow truncate font-mono text-xs text-fg">{linkOf("emily-clark")}</code>
                <IconButton label="Copy room link" size="xs" onClick={() => setCopied(true)}>
                  <Copy className="size-3.5" />
                </IconButton>
              </span>
              {copied && (
                <p role="status" className="text-xs text-success">
                  Room link copied.
                </p>
              )}
              <p className="text-xs text-fg-muted">Guests wait in the lobby and get in only while you or someone from Acme Corp is in the room.</p>
            </div>
          </Panel>
          <Panel title="Join with a link">
            <form className="flex items-end gap-1.5" onSubmit={(e) => e.preventDefault()}>
              <TextField label="Link or code" placeholder="meet.example.com/abc-123-xyz" className="min-w-0 grow" />
              <Button type="submit">Join</Button>
            </form>
          </Panel>
        </div>
      </div>
      <StartDialog open={starting} onOpenChange={setStarting} />
    </>
  );
}

/* --------------------------------------------------------------- the call */

interface Participant {
  name: string;
  /** Outside the company, came in through the lobby. */
  guest?: string;
  hue: Hue;
  muted?: boolean;
  camera: boolean;
  speaking?: boolean;
  sharing?: boolean;
  hand?: boolean;
  weak?: string;
}

const IN_CALL: Participant[] = [
  { name: ME, hue: "chart-1", camera: true },
  { name: PEOPLE[6], hue: "chart-3", camera: true, speaking: true, sharing: true },
  { name: "Dana Brooks", guest: "Northwind", hue: "chart-2", camera: true, hand: true },
  { name: "Leo Park", guest: "Northwind, Seoul", hue: "chart-4", muted: true, camera: false, weak: "Weak connection, relayed through TURN" },
];

const LOBBY = [{ name: "Mina Seo", email: "mina.seo@northwind.example", waiting: "0:42" }];

interface ChatLine {
  at: string;
  from: string;
  text: string;
}

const CHAT: ChatLine[] = [
  { at: "14:02", from: "Dana Brooks", text: "Leo is on hotel wifi in Seoul, so video might drop." },
  { at: "14:04", from: PEOPLE[6], text: "I will start with the ticket queue, then the reports." },
  { at: "14:05", from: "Leo Park", text: "Audio is fine here. I will keep my camera off." },
];

function Tile({ p }: { p: Participant }) {
  const you = p.name === ME;
  return (
    <li
      className="relative grid min-h-0 place-items-center overflow-hidden rounded-lg"
      style={{ ...onStage(p.hue, p.camera ? 34 : 14), boxShadow: p.speaking ? "inset 0 0 0 3px var(--oa-chart-3)" : undefined }}
    >
      <span
        aria-hidden
        className={cn("grid place-items-center rounded-full font-semibold", p.camera ? "size-16 text-2xl" : "size-12 text-xl")}
        style={onStage(p.hue, p.camera ? 62 : 40)}
      >
        {initials(p.name)}
      </span>
      <span className="absolute top-1.5 right-1.5 flex gap-1">
        {p.hand && (
          <span title="Hand raised" className="grid size-6 place-items-center rounded-full bg-warning-soft text-warning-text">
            <Hand aria-hidden className="size-3.5" />
          </span>
        )}
        {p.weak && (
          <span title={p.weak} className="grid size-6 place-items-center rounded-full bg-warning-soft text-warning-text">
            <TriangleAlert aria-hidden className="size-3.5" />
          </span>
        )}
      </span>
      <span
        className="absolute bottom-1.5 left-1.5 flex max-w-[calc(100%-12px)] items-center gap-1 rounded px-1.5 py-0.5 text-xs"
        style={{ backgroundColor: "color-mix(in oklab, var(--oa-topbar) 82%, transparent)" }}
      >
        {p.muted ? (
          <MicOff aria-hidden className="size-3 shrink-0 text-danger-text" />
        ) : p.speaking ? (
          <AudioLines aria-hidden className="size-3 shrink-0" />
        ) : null}
        {!p.camera && <VideoOff aria-hidden className="oa-topbar-muted size-3 shrink-0" />}
        <span className="truncate">{you ? `${p.name} (you)` : p.name}</span>
        {p.guest && <span className="oa-topbar-muted shrink-0 text-2xs">Guest</span>}
        <span className="sr-only">
          {p.speaking && ", speaking"}
          {p.muted && ", muted"}
          {!p.camera && ", camera off"}
          {p.hand && ", hand raised"}
          {p.weak && `, ${p.weak.toLowerCase()}`}
        </span>
      </span>
    </li>
  );
}

/** What Chris shares: the support portal, drawn as boxes and text so no image is needed. */
function SharedScreen() {
  const tickets = [
    { id: "#4812", title: "Printer queue stuck in the Leeds office", pri: "High", age: "2 h", tone: "danger" as Tone },
    { id: "#4809", title: "New starter needs a laptop by Monday", pri: "Normal", age: "5 h", tone: "neutral" as Tone },
    { id: "#4807", title: "VPN drops every 20 minutes for the Paris team", pri: "High", age: "6 h", tone: "danger" as Tone },
    { id: "#4801", title: "Invoice PDF shows the old address", pri: "Low", age: "1 d", tone: "neutral" as Tone },
    { id: "#4796", title: "Shared mailbox for returns", pri: "Normal", age: "1 d", tone: "neutral" as Tone },
    { id: "#4790", title: "Reset two-factor for a warehouse tablet", pri: "Normal", age: "2 d", tone: "neutral" as Tone },
    { id: "#4785", title: "Monthly report misses the Dublin team", pri: "Low", age: "3 d", tone: "neutral" as Tone },
    { id: "#4779", title: "Laptop returned with a cracked screen", pri: "Low", age: "4 d", tone: "neutral" as Tone },
  ];
  return (
    <div
      role="img"
      aria-label={`${PEOPLE[6]}'s screen: the support portal's ticket queue`}
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-line bg-canvas"
    >
      <div aria-hidden className="flex h-full min-h-0 flex-col">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-1.5">
          <span className="flex gap-1">
            <span className="size-2 rounded-full bg-subtle" />
            <span className="size-2 rounded-full bg-subtle" />
            <span className="size-2 rounded-full bg-subtle" />
          </span>
          <span className="rounded bg-subtle px-2 py-0.5 font-mono text-2xs text-fg-muted">support.example.com/queue</span>
        </div>
        <div className="grid min-h-0 grow grid-cols-[150px_minmax(0,1fr)]">
          <div className="flex flex-col gap-1 border-r border-line bg-surface p-2 text-xs">
            <span className="mb-1 text-sm font-semibold text-fg">Support portal</span>
            {["Queue", "My tickets", "Customers", "Reports", "Knowledge base"].map((x, i) => (
              <span key={x} className={cn("rounded px-1.5 py-1", i === 0 ? "bg-accent-soft text-accent-text" : "text-fg-muted")}>
                {x}
              </span>
            ))}
          </div>
          <div className="flex min-h-0 flex-col gap-2 p-3">
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Open", "42"],
                ["Waiting on customer", "9"],
                ["Past the SLA", "2"],
              ].map(([k, v]) => (
                <span key={k} className="flex flex-col rounded-md border border-line bg-surface px-2.5 py-1.5">
                  <span className="text-2xs text-fg-muted">{k}</span>
                  <span className="text-lg font-semibold text-fg tabular-nums">{v}</span>
                </span>
              ))}
            </div>
            <div className="flex min-h-0 flex-col overflow-hidden rounded-md border border-line bg-surface text-xs">
              {tickets.map((t) => (
                <span key={t.id} className="flex items-center gap-2 border-b border-subtle px-2.5 py-1.5 last:border-0">
                  <span className="w-12 font-mono text-fg-muted">{t.id}</span>
                  <span className="min-w-0 grow truncate text-fg">{t.title}</span>
                  <Badge tone={t.tone}>{t.pri}</Badge>
                  <span className="w-8 text-right text-fg-muted">{t.age}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StageButton({ icon, label, onClick, active, warn }: { icon: ReactNode; label: string; onClick?: () => void; active?: boolean; warn?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="oa-topbar-button flex w-[76px] flex-col items-center gap-1 rounded-md py-1 text-2xs">
      <span
        className={cn("grid size-9 place-items-center rounded-full [&_svg]:size-4", warn && "bg-danger text-white", active && "bg-accent text-accent-contrast")}
        style={warn || active ? undefined : { backgroundColor: "var(--oa-topbar-hover)" }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}

/** The call itself: the shared screen, everyone's tile, the controls, and the people, lobby and chat beside it. */
function MeetingPage() {
  const [people, setPeople] = useState(IN_CALL);
  const [lobby, setLobby] = useState(LOBBY);
  const [muted, setMuted] = useState(false);
  const [camera, setCamera] = useState(true);
  const [hand, setHand] = useState(false);
  const [recording, setRecording] = useState(false);
  const [side, setSide] = useState<"people" | "chat">("people");
  const [chat, setChat] = useState(CHAT);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [left, setLeft] = useState(false);

  const me = people.find((p) => p.name === ME);
  const shown = people.map((p) => (p.name === ME ? { ...p, muted, camera, hand } : p));
  const admit = (name: string) => {
    setLobby((l) => l.filter((x) => x.name !== name));
    setPeople((ps) => [...ps, { name, guest: "Northwind", hue: "chart-1", camera: true }]);
    setNotice(`${name} joined from the lobby.`);
  };
  const deny = (name: string) => {
    setLobby((l) => l.filter((x) => x.name !== name));
    setNotice(`${name} was not let in.`);
  };
  const send = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    setChat((c) => [...c, { at: "14:06", from: ME, text: draft.trim() }]);
    setDraft("");
  };

  if (left) {
    return (
      <>
        <PageHeader title="Demo: Northwind" description="Thursday 5 November · 14:00 to 15:00" />
        <Panel>
          <EmptyState
            icon={<PhoneOff />}
            title="You left the meeting"
            action={
              <span className="flex gap-1.5">
                <Button variant="primary" icon={<Video />} onClick={() => setLeft(false)}>
                  Rejoin
                </Button>
                <Button>Back to meetings</Button>
              </span>
            }
          >
            {`${PEOPLE[6]}, Dana Brooks and Leo Park are still in the call. When the last person leaves, the chat is deleted and nothing of the call is kept: it was not recorded.`}
          </EmptyState>
        </Panel>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Demo: Northwind"
        description={`Thursday 5 November · 14:00 to 15:00 · ${linkOf("demo")}`}
        meta={
          <>
            <StatusBadge tone="success">Live</StatusBadge>
            {recording ? (
              <Badge tone="danger" icon={<CircleDot aria-hidden className="size-3" />}>
                Recording
              </Badge>
            ) : (
              <Badge>Not recorded</Badge>
            )}
          </>
        }
        actions={
          <Button icon={<Copy />} size="sm">
            Copy link
          </Button>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_312px]">
        <section aria-label="Call" className="oa-topbar flex h-[calc(100vh-12rem)] min-h-[580px] flex-col gap-2 rounded-lg p-2.5">
          <div className="flex items-center justify-between gap-2 px-1 text-xs">
            <span className="flex items-center gap-2">
              <MonitorUp aria-hidden className="size-3.5" />
              {PEOPLE[6]} is sharing a screen
            </span>
            <span className="oa-topbar-muted flex items-center gap-3">
              {recording && (
                <span className="flex items-center gap-1 rounded-full bg-danger px-2 py-0.5 font-medium text-white">
                  <CircleDot aria-hidden className="size-3" /> Recording, everyone sees this
                </span>
              )}
              <span className="flex items-center gap-1">
                <ShieldCheck aria-hidden className="size-3.5" /> Media through meet.example.com only
              </span>
              <span className="font-mono tabular-nums">06:12</span>
            </span>
          </div>
          <div className="min-h-0 grow">
            <SharedScreen />
          </div>
          <ul aria-label="Participants" className="grid h-[136px] shrink-0 gap-2" style={{ gridTemplateColumns: `repeat(${shown.length}, minmax(0, 1fr))` }}>
            {shown.map((p) => (
              <Tile key={p.name} p={p} />
            ))}
          </ul>
          <div role="toolbar" aria-label="Call controls" className="flex items-center justify-between gap-2 px-1">
            <span className="oa-topbar-muted w-40 text-xs">{people.length} in the call</span>
            <span className="flex items-center gap-1">
              <StageButton icon={muted ? <MicOff /> : <Mic />} label={muted ? "Unmute" : "Mute"} warn={muted} onClick={() => setMuted((m) => !m)} />
              <StageButton
                icon={camera ? <Video /> : <VideoOff />}
                label={camera ? "Stop video" : "Start video"}
                warn={!camera}
                onClick={() => setCamera((c) => !c)}
              />
              <StageButton icon={<MonitorUp />} label="Share screen" />
              <StageButton icon={<Hand />} label={hand ? "Lower hand" : "Raise hand"} active={hand} onClick={() => setHand((h) => !h)} />
              <StageButton icon={<CircleDot />} label={recording ? "Stop recording" : "Record"} active={recording} onClick={() => setRecording((r) => !r)} />
            </span>
            <span className="flex w-40 justify-end">
              <Button variant="danger" icon={<PhoneOff />} onClick={() => setLeft(true)}>
                Leave
              </Button>
            </span>
          </div>
        </section>

        <Panel flush className="xl:h-[calc(100vh-12rem)] xl:min-h-[580px]">
          <div className="flex h-full min-h-0 flex-col">
            <div className="px-3 pt-1">
              <Tabs
                label="Beside the call"
                value={side}
                onChange={setSide}
                items={[
                  { value: "people", label: "People", count: people.length + lobby.length },
                  { value: "chat", label: "Chat", count: chat.length },
                ]}
              />
            </div>
            {notice && (
              <div role="status" className="mx-3 mt-2.5 rounded-md bg-success-soft px-2.5 py-1.5 text-xs text-fg">
                {notice}
              </div>
            )}
            {side === "people" ? (
              <div className="flex min-h-0 grow flex-col gap-3 overflow-y-auto p-3">
                {lobby.length > 0 && (
                  <section className="flex flex-col gap-2 rounded-md border border-line bg-warning-soft p-2.5">
                    <h2 className="text-xs font-semibold text-fg">Waiting in the lobby</h2>
                    <ul aria-label="Lobby" className="flex flex-col gap-2">
                      {lobby.map((x) => (
                        <li key={x.name} className="flex flex-col gap-1.5">
                          <span className="flex items-center gap-2">
                            <Avatar name={x.name} size="sm" />
                            <span className="flex min-w-0 flex-col">
                              <span className="truncate text-sm font-medium text-fg">{x.name}</span>
                              <span className="truncate text-2xs text-fg-muted">
                                {x.email} · waiting {x.waiting}
                              </span>
                            </span>
                          </span>
                          <span className="flex gap-1">
                            <Button size="xs" variant="primary" onClick={() => admit(x.name)}>
                              Let in
                            </Button>
                            <Button size="xs" onClick={() => deny(x.name)}>
                              Deny
                            </Button>
                          </span>
                        </li>
                      ))}
                    </ul>
                    <p className="text-2xs text-fg-muted">Not on the invitation. Guests get in only while someone from Acme Corp is in the call.</p>
                  </section>
                )}
                <section className="flex flex-col gap-1.5">
                  <h2 className="text-xs font-semibold text-fg-muted">In the call</h2>
                  <ul aria-label="In the call" className="flex flex-col gap-1.5">
                    {shown.map((p) => (
                      <li key={p.name} className="flex items-center justify-between gap-2">
                        <span className="flex min-w-0 items-center gap-2">
                          <Avatar name={p.name} size="sm" />
                          <span className="flex min-w-0 flex-col">
                            <span className="truncate text-sm text-fg">{p.name === ME ? `${p.name} (you, organiser)` : p.name}</span>
                            <span className="truncate text-2xs text-fg-muted">
                              {p.guest ? `Guest · ${p.guest}` : "Signed in · Acme Corp"}
                              {p.sharing && " · sharing"}
                            </span>
                          </span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-fg-muted">
                          {p.hand && <Hand aria-label="Hand raised" className="size-3.5 text-warning-text" />}
                          {p.muted ? (
                            <MicOff aria-label="Muted" className="size-3.5 text-danger-text" />
                          ) : (
                            <Mic aria-label="Microphone on" className="size-3.5" />
                          )}
                          {p.camera ? <Video aria-label="Camera on" className="size-3.5" /> : <VideoOff aria-label="Camera off" className="size-3.5" />}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <h2 className="text-xs font-semibold text-fg-muted">This meeting</h2>
                  <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
                    <dt className="text-fg-muted">Link from</dt>
                    <dd className="text-fg">Calendar invitation, sent Monday</dd>
                    <dt className="text-fg-muted">Invited</dt>
                    <dd className="text-fg">4, all here</dd>
                    <dt className="text-fg-muted">Guests</dt>
                    <dd className="text-fg">Let in by you at 14:01</dd>
                    <dt className="text-fg-muted">Media</dt>
                    <dd className="text-fg">3 direct, 1 through TURN</dd>
                  </dl>
                </section>
                {me && (
                  <p className="mt-auto rounded-md bg-canvas px-2.5 py-2 text-2xs text-fg-muted">
                    Recording is allowed for this meeting because you are in Sales. It starts only when you press Record, and everyone sees a red mark while it
                    runs.
                  </p>
                )}
              </div>
            ) : (
              <div className="flex min-h-0 grow flex-col">
                <ul aria-label="Messages" className="flex min-h-0 grow flex-col gap-2.5 overflow-y-auto p-3">
                  {chat.map((m, i) => (
                    <li key={i} className="flex gap-2">
                      <Avatar name={m.from} size="sm" />
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-fg">{m.from === ME ? "You" : m.from}</span>
                          <span className="font-mono text-2xs text-fg-muted">{m.at}</span>
                        </span>
                        <span className="text-sm text-fg">{m.text}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="px-3 text-2xs text-fg-muted">Messages are deleted when the meeting ends.</p>
                <form onSubmit={send} className="flex items-end gap-1.5 p-3">
                  <TextField
                    label={<span className="sr-only">Message</span>}
                    placeholder="Message everyone"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="min-w-0 grow"
                  />
                  <IconButton label="Send" type="submit" variant="primary">
                    <Send className="size-4" />
                  </IconButton>
                </form>
              </div>
            )}
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ----------------------------------------------------------- recordings */

interface Recording {
  id: string;
  title: string;
  date: string;
  minutes: number;
  gb: number;
  by: string;
  group: "Leadership" | "Sales";
  people: string[];
  guests: number;
  keptUntil: string;
}

const RECORDINGS: Recording[] = [
  {
    id: "r1",
    title: "Board call",
    date: "Thu 5 Nov, 12:00",
    minutes: 55,
    gb: 1.4,
    by: PEOPLE[7],
    group: "Leadership",
    people: [PEOPLE[7], PEOPLE[5], PEOPLE[3], PEOPLE[2], PEOPLE[4]],
    guests: 2,
    keptUntil: "3 Feb 2027",
  },
  {
    id: "r2",
    title: "Quarterly planning",
    date: "Wed 4 Nov, 11:00",
    minutes: 89,
    gb: 2.3,
    by: PEOPLE[7],
    group: "Leadership",
    people: [PEOPLE[7], ME, PEOPLE[3], PEOPLE[4], PEOPLE[5], PEOPLE[6]],
    guests: 0,
    keptUntil: "2 Feb 2027",
  },
  {
    id: "r3",
    title: "Sales onboarding: pricing",
    date: "Tue 3 Nov, 15:00",
    minutes: 37,
    gb: 0.8,
    by: PEOPLE[3],
    group: "Sales",
    people: [PEOPLE[3], PEOPLE[6]],
    guests: 0,
    keptUntil: "3 Dec 2026",
  },
  {
    id: "r4",
    title: "Leadership weekly",
    date: "Mon 2 Nov, 09:00",
    minutes: 48,
    gb: 1.1,
    by: PEOPLE[7],
    group: "Leadership",
    people: [PEOPLE[7], PEOPLE[5], PEOPLE[3], PEOPLE[4]],
    guests: 0,
    keptUntil: "31 Jan 2027",
  },
  {
    id: "r5",
    title: "Board call",
    date: "Thu 29 Oct, 12:00",
    minutes: 72,
    gb: 1.9,
    by: PEOPLE[7],
    group: "Leadership",
    people: [PEOPLE[7], PEOPLE[5], PEOPLE[3], PEOPLE[2], PEOPLE[4]],
    guests: 2,
    keptUntil: "27 Jan 2027",
  },
  {
    id: "r6",
    title: "Sales onboarding: product tour",
    date: "Tue 27 Oct, 15:00",
    minutes: 54,
    gb: 1.3,
    by: PEOPLE[3],
    group: "Sales",
    people: [PEOPLE[3], PEOPLE[6], ME],
    guests: 0,
    keptUntil: "26 Nov 2026",
  },
  {
    id: "r7",
    title: "Northwind kickoff",
    date: "Mon 12 Oct, 10:30",
    minutes: 41,
    gb: 0.9,
    by: ME,
    group: "Sales",
    people: [ME, PEOPLE[6]],
    guests: 2,
    keptUntil: "11 Nov 2026",
  },
];

const POLICY = `recording:
  allowed_for:
    - group: leadership
      keep_days: 90
    - group: sales
      keep_days: 30
  # Everyone else cannot start one.
  never_for: [people-team]
  storage: /var/lib/openasy/meet/recordings
  announce: true`;

const hm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`);

/** The few meetings that were recorded, who saw that they were, and when each file goes. */
function RecordingsPage() {
  const [items, setItems] = useState(RECORDINGS);
  const [active, setActive] = useState("r7");
  const [query, setQuery] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = items.filter((r) => `${r.title} ${r.by}`.toLowerCase().includes(query.toLowerCase()));
  const cur = items.find((r) => r.id === active);
  const total = items.reduce((n, r) => n + r.gb, 0);
  const cols: Column<Recording>[] = [
    {
      id: "title",
      header: "Meeting",
      width: "30%",
      sortValue: (r) => r.title,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{r.title}</span>
          <span className="truncate text-2xs text-fg-muted">{r.date}</span>
        </span>
      ),
    },
    {
      id: "by",
      header: "Started by",
      sortValue: (r) => r.by,
      cell: (r) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar name={r.by} size="sm" className="size-5" />
          <span className="truncate text-xs">{r.by === ME ? "You" : r.by}</span>
        </span>
      ),
    },
    { id: "group", header: "Allowed for", cell: (r) => <Badge tone="info">{r.group}</Badge> },
    { id: "length", header: "Length", align: "right", mono: true, sortValue: (r) => r.minutes, cell: (r) => hm(r.minutes) },
    { id: "size", header: "Size", align: "right", mono: true, sortValue: (r) => r.gb, cell: (r) => `${r.gb.toFixed(1)} GB` },
    {
      id: "kept",
      header: "Deleted on",
      sortValue: (r) => r.keptUntil,
      cell: (r) => (r.keptUntil === "11 Nov 2026" ? <Badge tone="warning">{r.keptUntil}</Badge> : <span className="text-xs">{r.keptUntil}</span>),
    },
  ];
  return (
    <>
      <PageHeader
        title="Recordings"
        description="A meeting is recorded only where meet.yaml allows it and its organiser presses Record. Everyone in the call sees it, and people joining later are told before they come in."
      />
      {notice && (
        <div role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <KpiGrid minWidth={170}>
        <KpiCard label="Recordings kept" value={String(items.length)} icon={CircleDot} delta={{ label: "of 214 meetings in October" }} />
        <KpiCard label="Storage" value={total.toFixed(1)} unit="GB" delta={{ label: "of 200 GB on meet-media-01" }} />
        <KpiCard label="Next deletion" value="11 Nov" delta={{ label: "Northwind kickoff, after 30 days" }} />
        <KpiCard label="Who may record" value="2" unit="groups" delta={{ label: "Leadership and Sales" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel
          title="Recorded meetings"
          flush
          actions={
            <SearchInput label="Search recordings" placeholder="Meeting or person" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
          }
        >
          <DataTable
            label="Recordings"
            columns={cols}
            rows={rows}
            getRowId={(r) => r.id}
            onRowClick={(r) => setActive(r.id)}
            activeRowId={active}
            minWidth={720}
          />
        </Panel>
        <div className="flex flex-col gap-2.5">
          {cur && (
            <Panel
              aria-label="Recording"
              title={cur.title}
              description={`${cur.date} · ${hm(cur.minutes)} · ${cur.gb.toFixed(1)} GB`}
              actions={
                <>
                  <IconButton label="Download" size="sm">
                    <Download className="size-3.5" />
                  </IconButton>
                  <IconButton label="Delete" size="sm" onClick={() => setConfirm(true)}>
                    <Trash2 className="size-3.5" />
                  </IconButton>
                </>
              }
            >
              <div className="flex flex-col gap-3 text-sm">
                <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
                  <dt className="text-fg-muted">Started by</dt>
                  <dd className="text-fg">{cur.by}, the organiser, at minute 0</dd>
                  <dt className="text-fg-muted">Allowed by</dt>
                  <dd className="text-fg">
                    {cur.group} group, kept {cur.group === "Leadership" ? 90 : 30} days
                  </dd>
                  <dt className="text-fg-muted">Deleted on</dt>
                  <dd className="text-fg">{cur.keptUntil}</dd>
                  <dt className="text-fg-muted">File</dt>
                  <dd className="font-mono break-all text-fg">recordings/2026/{cur.id}.webm</dd>
                </dl>
                <section className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <h3 className="text-xs font-semibold text-fg-muted">
                    Saw the Recording mark · {cur.people.length + cur.guests} of {cur.people.length + cur.guests}
                  </h3>
                  <ul aria-label="People in the recording" className="flex flex-wrap gap-1">
                    {cur.people.map((p) => (
                      <li key={p}>
                        <Badge icon={<Avatar name={p} size="sm" className="size-4 text-[9px]" />}>{p}</Badge>
                      </li>
                    ))}
                    {cur.guests > 0 && (
                      <li>
                        <Badge>
                          {cur.guests} {cur.guests === 1 ? "guest" : "guests"}, told in the lobby
                        </Badge>
                      </li>
                    )}
                  </ul>
                </section>
              </div>
            </Panel>
          )}
          <Panel title="Who may record" description="From meet.yaml; changed by IT, not here.">
            <pre className="overflow-x-auto rounded-md bg-canvas p-2.5 font-mono text-2xs leading-relaxed text-fg">{POLICY}</pre>
          </Panel>
        </div>
      </div>
      <Dialog
        open={confirm}
        onOpenChange={setConfirm}
        title={`Delete ${cur?.title ?? "recording"}?`}
        description="The file is removed from the server now, before its deletion date. It cannot be brought back."
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!cur) return;
                setItems((xs) => xs.filter((x) => x.id !== cur.id));
                setNotice(`${cur.title} (${cur.date}) deleted.`);
                setActive(items.find((x) => x.id !== cur.id)?.id ?? "");
                setConfirm(false);
              }}
            >
              Delete recording
            </Button>
          </>
        }
      />
    </>
  );
}

/* --------------------------------------------------------------- server */

type Path = "udp" | "turn-udp" | "turn-tls";

const PATH: Record<Path, { label: string; tone: Tone }> = {
  udp: { label: "Direct, UDP", tone: "success" },
  "turn-udp": { label: "TURN, UDP 3478", tone: "info" },
  "turn-tls": { label: "TURN, TLS 443", tone: "warning" },
};

interface Connection {
  id: string;
  name: string;
  meeting: string;
  from: string;
  browser: string;
  path: Path;
  rtt: number;
  loss: number;
  video: string;
}

const CONNECTIONS: Connection[] = [
  { id: "c1", name: ME, meeting: "Demo: Northwind", from: "Istanbul office", browser: "Firefox 132", path: "udp", rtt: 4, loss: 0, video: "720p" },
  {
    id: "c2",
    name: PEOPLE[6],
    meeting: "Demo: Northwind",
    from: "Istanbul office",
    browser: "Chrome 130",
    path: "udp",
    rtt: 5,
    loss: 0.1,
    video: "Screen 1080p",
  },
  { id: "c3", name: "Dana Brooks", meeting: "Demo: Northwind", from: "London", browser: "Edge 130", path: "udp", rtt: 61, loss: 0.4, video: "720p" },
  {
    id: "c4",
    name: "Leo Park",
    meeting: "Demo: Northwind",
    from: "Seoul, hotel network",
    browser: "Safari on iPhone",
    path: "turn-tls",
    rtt: 284,
    loss: 3.8,
    video: "Audio only",
  },
  {
    id: "c5",
    name: PEOPLE[0],
    meeting: "Security review follow-up",
    from: "Home, Istanbul",
    browser: "Chrome 130",
    path: "udp",
    rtt: 18,
    loss: 0.2,
    video: "720p",
  },
  {
    id: "c6",
    name: PEOPLE[4],
    meeting: "Security review follow-up",
    from: "Istanbul office",
    browser: "Firefox 132",
    path: "udp",
    rtt: 4,
    loss: 0,
    video: "720p",
  },
  {
    id: "c7",
    name: PEOPLE[2],
    meeting: "Security review follow-up",
    from: "Train, mobile data",
    browser: "Chrome on Android",
    path: "turn-udp",
    rtt: 96,
    loss: 1.2,
    video: "360p",
  },
];

/** Mbit/s through the media server, every 15 minutes from 07:00 to 14:00. */
const BANDWIDTH = [
  0, 0, 0, 1.2, 4.8, 6.1, 6.4, 2.2, 7.9, 8.4, 8.1, 3.6, 3.9, 12.6, 14.1, 13.8, 11.2, 21.4, 23.9, 24.6, 22.8, 8.8, 9.4, 9.1, 6.6, 7.2, 4.1, 16.8, 18.3,
];
const RELAYED = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1.1, 1.3, 1.2, 0, 2.6, 2.9, 3.1, 2.8, 0, 0, 0, 0.8, 0.9, 0.9, 1.6, 1.7];

/** For IT: what the media server carries, whether TURN is reachable from outside, and how each person connects. */
function ServerHealthPage() {
  const relayed = CONNECTIONS.filter((c) => c.path !== "udp");
  const cols: Column<Connection>[] = [
    {
      id: "name",
      header: "Person",
      width: "20%",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <Avatar name={c.name} size="sm" className="size-5" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-xs font-medium">{c.name}</span>
            <span className="truncate text-2xs text-fg-muted">{c.from}</span>
          </span>
        </span>
      ),
    },
    { id: "meeting", header: "Meeting", sortValue: (c) => c.meeting, cell: (c) => <span className="truncate text-xs">{c.meeting}</span> },
    { id: "path", header: "Media path", sortValue: (c) => c.path, cell: (c) => <StatusBadge tone={PATH[c.path].tone}>{PATH[c.path].label}</StatusBadge> },
    { id: "browser", header: "Browser", cell: (c) => <span className="truncate text-xs">{c.browser}</span> },
    { id: "rtt", header: "Round trip", align: "right", mono: true, sortValue: (c) => c.rtt, cell: (c) => `${c.rtt} ms` },
    {
      id: "loss",
      header: "Loss",
      align: "right",
      mono: true,
      sortValue: (c) => c.loss,
      cell: (c) => <span className={cn(c.loss >= 2 && "font-semibold text-warning-text")}>{c.loss.toFixed(1)}%</span>,
    },
    { id: "video", header: "Sending", cell: (c) => <span className="text-xs">{c.video}</span> },
  ];
  const turn = [
    { listener: "turn.example.com, UDP 3478", note: "For networks that block direct media" },
    { listener: "turn.example.com, TCP 3478", note: "When UDP is blocked" },
    { listener: "turn.example.com, TLS 443", note: "Looks like web traffic; gets through hotel and guest networks" },
  ];
  return (
    <>
      <PageHeader
        title="Server"
        description="The media server and TURN in your install. Calls never leave meet.example.com and turn.example.com."
        meta={<StatusBadge tone="success">Healthy</StatusBadge>}
      />
      <KpiGrid minWidth={170}>
        <KpiCard label="Live meetings" value="2" icon={Video} delta={{ label: "up to 20 at once in meet.yaml" }} />
        <KpiCard label="People in calls" value={String(CONNECTIONS.length)} icon={Users} delta={{ label: "1 more waiting in a lobby" }} />
        <KpiCard label="Bandwidth now" value="18.3" unit="Mbit/s" delta={{ label: "of 400 Mbit/s set in meet.yaml" }} />
        <KpiCard label="Relayed through TURN" value={`${relayed.length} of ${CONNECTIONS.length}`} delta={{ label: "Leo Park over TLS on 443" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px_300px]">
        <Panel title="Media through the server today" description="Mbit/s, both directions, every 15 minutes">
          <TimeSeriesChart
            label="Bandwidth through the media server and through TURN today"
            labels={timeLabels(BANDWIDTH.length, 15, 14 * 60)}
            height={190}
            area
            format={(v) => `${Math.round(v * 10) / 10} Mbit/s`}
            series={[
              { id: "all", name: "All media", data: BANDWIDTH, color: "var(--oa-chart-1)" },
              { id: "turn", name: "Of which through TURN", data: RELAYED, color: "var(--oa-chart-2)" },
            ]}
          />
        </Panel>
        <Panel title="Media server" description="meet-media-01 · 203.0.113.24">
          <dl className="grid grid-cols-[88px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
            <dt className="text-fg-muted">Signalling</dt>
            <dd className="font-mono text-fg">wss://meet.example.com</dd>
            <dt className="text-fg-muted">Media ports</dt>
            <dd className="text-fg">UDP 50000 to 60000, open from outside</dd>
            <dt className="text-fg-muted">CPU</dt>
            <dd className="text-fg">14% of 8 cores</dd>
            <dt className="text-fg-muted">Memory</dt>
            <dd className="text-fg">1.2 of 16 GB</dd>
            <dt className="text-fg-muted">Per meeting</dt>
            <dd className="text-fg">Up to 50 people, video up to 720p</dd>
            <dt className="text-fg-muted">Running for</dt>
            <dd className="text-fg">23 days, since the 1.4.2 update</dd>
          </dl>
        </Panel>
        <Panel title="TURN" description="Checked from outside the network at 14:05" actions={<StatusBadge tone="success">Reachable</StatusBadge>}>
          <ul aria-label="TURN listeners" className="flex flex-col gap-2">
            {turn.map((t) => (
              <li key={t.listener} className="flex items-start gap-2">
                <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0 text-success" />
                <span className="flex min-w-0 flex-col">
                  <span className="font-mono text-xs text-fg">{t.listener}</span>
                  <span className="text-2xs text-fg-muted">{t.note}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-line pt-2.5 text-2xs text-fg-muted">
            Short-lived credentials, renewed every 24 hours. Only people in a meeting get them.
          </p>
        </Panel>
      </div>
      <Panel title="Live connections" flush>
        <DataTable
          label="Live connections"
          columns={cols}
          rows={CONNECTIONS}
          getRowId={(c) => c.id}
          defaultSort={{ id: "meeting", direction: "asc" }}
          minWidth={900}
        />
      </Panel>
    </>
  );
}

const PAGES = {
  meetings: () => <MeetingsPage />,
  meeting: () => <MeetingPage />,
  recordings: () => <RecordingsPage />,
  server: () => <ServerHealthPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="meet" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Meetings: Story = {
  ...app("meetings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Meetings" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Meetings today" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(MEETINGS.length);
    // A call started from a Chat channel shows where its link came from.
    await expect(within(table).getByTitle("Chat #security")).toBeInTheDocument();

    // Only the live ones: the demo with a guest waiting, and the security call.
    await userEvent.click(c.getByRole("tab", { name: /Live/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await expect(within(table).getByText("1 in lobby")).toBeInTheDocument();

    await userEvent.click(c.getByRole("tab", { name: /Today/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(MEETINGS.length);
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const StartMeeting: Story = {
  name: "Start a meeting",
  ...app("meetings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Start a meeting now" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Your meeting is ready" });
    await expect(dialog).toHaveTextContent("meet.example.com/r4m-82n-tqe");
    await userEvent.click(within(dialog).getByRole("button", { name: "Copy link" }));
    await expect(within(dialog).getByRole("status")).toHaveTextContent("Link copied.");
  },
};

export const Meeting: Story = {
  ...app("meeting"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Demo: Northwind" })).toBeInTheDocument();
    const stage = c.getByRole("region", { name: "Call" });
    await expect(within(stage).getByRole("img", { name: /Chris Shaw's screen/ })).toBeInTheDocument();
    const tiles = within(stage).getByRole("list", { name: "Participants" });
    await expect(within(tiles).getAllByRole("listitem")).toHaveLength(4);
    await expect(
      within(tiles)
        .getByText(/Leo Park/)
        .closest("li"),
    ).toHaveTextContent(/muted, camera off/);

    // A guest waits in the lobby until someone from the company lets them in.
    await expect(within(c.getByRole("list", { name: "Lobby" })).getByText("Mina Seo")).toBeInTheDocument();

    // Mute and unmute.
    await userEvent.click(within(stage).getByRole("button", { name: "Mute" }));
    await expect(
      within(tiles)
        .getByText(/Emily Clark \(you\)/)
        .closest("li"),
    ).toHaveTextContent(/muted/);
    await userEvent.click(within(stage).getByRole("button", { name: "Unmute" }));

    // Chat during the call.
    await userEvent.click(c.getByRole("tab", { name: /Chat/ }));
    await userEvent.type(c.getByRole("textbox", { name: "Message" }), "Mina from Northwind is joining too.");
    await userEvent.click(c.getByRole("button", { name: "Send" }));
    await expect(within(c.getByRole("list", { name: "Messages" })).getAllByRole("listitem")).toHaveLength(CHAT.length + 1);

    await userEvent.click(c.getByRole("tab", { name: /People/ }));
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const AdmitFromLobby: Story = {
  name: "Let in from the lobby",
  ...app("meeting"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("list", { name: "Lobby" })).getByRole("button", { name: "Let in" }));
    await expect(c.getByRole("status")).toHaveTextContent("Mina Seo joined from the lobby.");
    await expect(c.queryByRole("list", { name: "Lobby" })).not.toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "Participants" })).getAllByRole("listitem")).toHaveLength(5);
  },
};

export const LeaveMeeting: Story = {
  name: "Leave the meeting",
  ...app("meeting"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Leave" }));
    await expect(c.getByText("You left the meeting")).toBeInTheDocument();
    await expect(c.getByText(/nothing of the call is kept/)).toBeInTheDocument();
  },
};

export const Recordings: Story = {
  ...app("recordings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Recording" });
    await expect(detail).toHaveTextContent("Northwind kickoff");
    await expect(detail).toHaveTextContent("2 guests, told in the lobby");
    const table = c.getByRole("table", { name: "Recordings" });
    await userEvent.type(c.getByRole("searchbox", { name: "Search recordings" }), "board call");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await userEvent.clear(c.getByRole("searchbox", { name: "Search recordings" }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(RECORDINGS.length);
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const DeleteRecording: Story = {
  name: "Delete a recording",
  ...app("recordings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("region", { name: "Recording" })).getByRole("button", { name: "Delete" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Delete Northwind kickoff?" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete recording" }));
    await expect(c.getByRole("status")).toHaveTextContent("Northwind kickoff (Mon 12 Oct, 10:30) deleted.");
    await expect(
      within(c.getByRole("table", { name: "Recordings" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(RECORDINGS.length - 1);
  },
};

export const Server: Story = {
  ...app("server"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Server" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Live connections" });
    await expect(within(table).getByText("TURN, TLS 443")).toBeInTheDocument();
    await expect(within(c.getByRole("list", { name: "TURN listeners" })).getAllByRole("listitem")).toHaveLength(3);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
