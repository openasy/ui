import { useState, type FormEvent, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  AtSign,
  Bell,
  FileDown,
  FileText,
  Hash,
  Info,
  Lock,
  MessageSquare,
  MessagesSquare,
  Paperclip,
  Pin,
  Plus,
  Rocket,
  Search as SearchIcon,
  SendHorizontal,
  Siren,
  Smile,
  Users,
  Video,
  X,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Dialog } from "../../components/Dialog";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EmptyState } from "../../components/EmptyState";
import { cn } from "../../lib/cn";
import type { Severity, Tone } from "../../tokens/levels";
import { PEOPLE, emailOf } from "../mocks";

const nav = [
  { id: "channel", label: "Messages", icon: MessagesSquare },
  { id: "search", label: "Search", icon: SearchIcon },
  { id: "people", label: "People", icon: Users },
  { id: "channels", label: "Channels", icon: Hash },
];

const meta = {
  title: "Products/Chat",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = PEOPLE[1];
const GUESTS = ["Dana Brooks", "Leo Park"];

/** Other products and your own tools post through webhooks; they show as apps, not people. */
type AppName = "Alerts" | "Incidents" | "Deploys";
const APP_ICON: Record<AppName, typeof Bell> = { Alerts: Bell, Incidents: Siren, Deploys: Rocket };

interface Reaction {
  emoji: string;
  by: string[];
}

interface Card {
  title: string;
  severity?: Severity;
  status?: { label: string; tone: Tone };
  fields: Array<[string, string]>;
  link: string;
}

interface Msg {
  id: string;
  author: string;
  app?: AppName;
  time: string;
  text: string;
  card?: Card;
  file?: { name: string; size: string };
  reactions?: Reaction[];
  thread?: Msg[];
}

type Item = Msg | { day: string };
const isDay = (i: Item): i is { day: string } => "day" in i;

type Kind = "public" | "private" | "guests" | "incident" | "dm";

interface Chan {
  id: string;
  name: string;
  kind: Kind;
  topic: string;
  members: number;
  from: string;
  retention: string;
  unread?: number;
  mention?: boolean;
  /** Direct messages: the other people in it. */
  with?: string[];
}

const CHANNELS: Chan[] = [
  { id: "general", name: "general", kind: "public", topic: "Company-wide news and questions", members: 128, from: "Everyone", retention: "2 years", unread: 2 },
  {
    id: "ops-oncall",
    name: "ops-oncall",
    kind: "public",
    topic: "Paging, alerts and deploys for production. On call this week: Ben Ortiz.",
    members: 14,
    from: "Platform and Operations groups",
    retention: "1 year",
  },
  {
    id: "inc-2041-api-latency",
    name: "inc-2041-api-latency",
    kind: "incident",
    topic: "INC-2041: API latency after the 02:00 deploy",
    members: 6,
    from: "Opened by Incidents",
    retention: "1 year",
    unread: 1,
    mention: true,
  },
  {
    id: "deploys",
    name: "deploys",
    kind: "public",
    topic: "Every production deploy and rollback",
    members: 41,
    from: "Engineering group",
    retention: "90 days",
    unread: 12,
  },
  { id: "sales", name: "sales", kind: "public", topic: "Pipeline, demos and deals", members: 18, from: "Sales group", retention: "2 years", unread: 5 },
  { id: "leadership", name: "leadership", kind: "private", topic: "Leadership team only", members: 5, from: "Leadership group", retention: "2 years" },
  {
    id: "northwind-shared",
    name: "northwind-shared",
    kind: "guests",
    topic: "Working with Northwind on the support portal trial",
    members: 6,
    from: "Added by Chris Shaw",
    retention: "1 year",
  },
  { id: "dm-ben", name: PEOPLE[4], kind: "dm", topic: "", members: 2, from: "", retention: "1 year", unread: 1, with: [PEOPLE[4]] },
  { id: "dm-dana", name: PEOPLE[0], kind: "dm", topic: "", members: 2, from: "", retention: "1 year", with: [PEOPLE[0]] },
  { id: "dm-sales", name: `${PEOPLE[3]}, ${PEOPLE[6]}`, kind: "dm", topic: "", members: 3, from: "", retention: "1 year", with: [PEOPLE[3], PEOPLE[6]] },
  { id: "dm-zoe", name: PEOPLE[7], kind: "dm", topic: "", members: 2, from: "", retention: "1 year", with: [PEOPLE[7]] },
  { id: "dm-amy", name: PEOPLE[5], kind: "dm", topic: "", members: 2, from: "", retention: "1 year", with: [PEOPLE[5]] },
  { id: "dm-brooks", name: "Dana Brooks", kind: "dm", topic: "", members: 2, from: "", retention: "1 year", with: ["Dana Brooks"] },
];

const MESSAGES: Record<string, Item[]> = {
  "ops-oncall": [
    { day: "Yesterday" },
    {
      id: "m1",
      author: PEOPLE[6],
      time: "17:40",
      text: "Deploy window tonight is 02:00 as usual. `2026.11.4-1` has the new cache for search.",
      reactions: [{ emoji: "👍", by: [PEOPLE[4], PEOPLE[0]] }],
    },
    { day: "Today, Wednesday 4 November" },
    {
      id: "alert",
      author: "Alerts",
      app: "Alerts",
      time: "02:04",
      text: "@here p95 latency on api-prod-03 above 2 s for 10 minutes.",
      card: {
        title: "API latency high",
        severity: "high",
        fields: [
          ["Host", "api-prod-03"],
          ["p95", "2.4 s"],
          ["Since", "01:54"],
        ],
        link: "Open in Alerts",
      },
      thread: [
        { id: "t1", author: PEOPLE[4], time: "02:15", text: "Acknowledged. Looking at api-prod-03 now." },
        { id: "t2", author: PEOPLE[4], time: "02:21", text: "Error rate went up right after deploy `2026.11.4-1`. Starting the rollback to `2026.11.3-5`." },
        {
          id: "t3",
          author: "Incidents",
          app: "Incidents",
          time: "02:22",
          text: "Opened INC-2041, severity high, with #inc-2041-api-latency for the work. Commander: @Ben Ortiz.",
        },
        { id: "t4", author: PEOPLE[4], time: "02:31", text: "Rollback done. p95 is back under 400 ms." },
        { id: "t5", author: "Alerts", app: "Alerts", time: "02:33", text: "Resolved: p95 latency on api-prod-03 back to normal after 19 minutes." },
        {
          id: "t6",
          author: PEOPLE[0],
          time: "08:50",
          text: "Thanks Ben. Keeping the incident open until the postmortem on Friday.",
          reactions: [{ emoji: "🙏", by: [PEOPLE[4]] }],
        },
      ],
    },
    {
      id: "m4",
      author: PEOPLE[0],
      time: "08:52",
      text: "@Emily Clark can we move the deploy window from 02:00 to 10:00 on weekdays, so someone is awake when it goes wrong?",
      reactions: [
        { emoji: "➕", by: [PEOPLE[4], PEOPLE[6], PEOPLE[3], PEOPLE[2]] },
        { emoji: "💯", by: [PEOPLE[4]] },
      ],
      thread: [
        { id: "m4-1", author: ME, time: "09:02", text: "Yes. I will put it on Thursday's ops review." },
        { id: "m4-2", author: PEOPLE[4], time: "09:04", text: "Works for me." },
      ],
    },
    {
      id: "m5",
      author: PEOPLE[3],
      time: "09:20",
      text: "Updated the rollback checklist with the database step we missed last night.",
      file: { name: "rollback-checklist.pdf", size: "184 KB" },
      reactions: [{ emoji: "🙏", by: [PEOPLE[4], PEOPLE[0], ME] }],
    },
    {
      id: "m6",
      author: "Incidents",
      app: "Incidents",
      time: "10:41",
      text: "INC-2041 is mitigated after 27 minutes. Postmortem due Friday, owner @Ben Ortiz.",
    },
    {
      id: "m7",
      author: PEOPLE[4],
      time: "13:58",
      text: "Postmortem draft is up in #inc-2041-api-latency. Comments before Friday, please.",
      thread: [{ id: "m7-1", author: PEOPLE[6], time: "14:06", text: "Read it. Warming the cache before traffic moves makes sense." }],
    },
  ],
  general: [
    { day: "Today, Wednesday 4 November" },
    {
      id: "g1",
      author: PEOPLE[7],
      time: "09:12",
      text: "All hands moves to Thursday 16:00 in Atlas. The Meet link is in the invitation.",
      reactions: [{ emoji: "👍", by: [ME, PEOPLE[3], PEOPLE[5]] }],
    },
    {
      id: "g2",
      author: PEOPLE[5],
      time: "11:02",
      text: "Reminder: health plan enrolment closes Friday. Questions to me or the People team.",
      file: { name: "health-plan-2027.pdf", size: "1.2 MB" },
    },
  ],
  "inc-2041-api-latency": [
    { day: "Today, Wednesday 4 November" },
    {
      id: "i1",
      author: "Incidents",
      app: "Incidents",
      time: "02:22",
      text: "Channel opened for INC-2041 from an alert in #ops-oncall. Commander: @Ben Ortiz.",
      card: {
        title: "INC-2041: API latency after deploy",
        status: { label: "Mitigated", tone: "warning" },
        fields: [
          ["Duration", "27 min"],
          ["Failed requests", "about 1,900"],
          ["Commander", PEOPLE[4]],
        ],
        link: "Open in Incidents",
      },
    },
    { id: "i2", author: PEOPLE[4], time: "02:40", text: "Timeline so far: 02:04 alert, 02:15 acknowledged, 02:24 rollback started, 02:31 recovered." },
    { id: "i3", author: PEOPLE[4], time: "13:55", text: "@Emily Clark postmortem draft is ready for your review." },
  ],
  deploys: [
    { day: "Today, Wednesday 4 November" },
    { id: "d1", author: "Deploys", app: "Deploys", time: "02:01", text: "api `2026.11.4-1` deployed to production by Chris Shaw." },
    { id: "d2", author: "Deploys", app: "Deploys", time: "02:24", text: "Rollback of api to `2026.11.3-5` started by Ben Ortiz." },
    { id: "d3", author: "Deploys", app: "Deploys", time: "11:30", text: "web `2026.11.4-2` deployed to production by Dana Kim." },
  ],
  sales: [
    { day: "Today, Wednesday 4 November" },
    { id: "s1", author: PEOPLE[3], time: "10:15", text: "Northwind demo is Thursday 14:00. @Chris Shaw owns the script, I take the pricing questions." },
    { id: "s2", author: PEOPLE[6], time: "10:18", text: "Script is in the shared folder. Leo joins from Seoul, so we keep it to 45 minutes." },
  ],
  leadership: [
    { day: "Monday 2 November" },
    { id: "l1", author: PEOPLE[7], time: "18:05", text: "Board prep notes are in the drive. Please read them before Friday." },
  ],
  "northwind-shared": [
    { day: "Yesterday" },
    {
      id: "n1",
      author: "Dana Brooks",
      time: "16:20",
      text: "Thanks for the trial access. Leo will join the demo from Seoul on Thursday.",
      reactions: [{ emoji: "👍", by: [PEOPLE[6]] }],
    },
    {
      id: "n2",
      author: PEOPLE[6],
      time: "16:34",
      text: "Great, the Meet link works from a browser. @Dana Brooks the single sign-on guide is attached.",
      file: { name: "northwind-sso-setup.pdf", size: "420 KB" },
    },
    { day: "Today, Wednesday 4 November" },
    { id: "n3", author: "Leo Park", time: "09:47", text: "Read the guide. We use Entra ID, is SAML or OpenID Connect better for you?" },
  ],
  "dm-ben": [
    { day: "Today, Wednesday 4 November" },
    { id: "b1", author: PEOPLE[4], time: "14:02", text: "Could you approve the change window for Saturday? Database upgrade, 2 hours." },
  ],
  "dm-dana": [
    { day: "Monday 2 November" },
    { id: "k1", author: PEOPLE[0], time: "15:10", text: "Pentest report is in. Nothing critical, two highs on the old admin panel." },
  ],
  "dm-sales": [
    { day: "Yesterday" },
    { id: "q1", author: PEOPLE[3], time: "12:30", text: "Can you join the Northwind demo for the security part?" },
    { id: "q2", author: ME, time: "12:41", text: "Yes, I will cover hosting and data location." },
  ],
  "dm-zoe": [
    { day: "Monday 2 November" },
    { id: "z1", author: PEOPLE[7], time: "19:30", text: "Can you send me the uptime numbers for October before the board call?" },
    { id: "z2", author: ME, time: "19:41", text: "99.97% for the API, 99.99% for the website. The full report is in Uptime." },
  ],
  "dm-amy": [
    { day: "Yesterday" },
    { id: "a1", author: PEOPLE[5], time: "11:15", text: "Mark's last day is 30 November. Could you plan the hand-over of the Northwind account?" },
  ],
  "dm-brooks": [
    { day: "Yesterday" },
    { id: "r1", author: "Dana Brooks", time: "17:02", text: "Do you have a summary of where the data is kept? Our legal team asks." },
  ],
};

type Presence = "online" | "away" | "busy" | "offline";
const PRESENCE: Record<Presence, { label: string; dot: string }> = {
  online: { label: "Online", dot: "bg-success" },
  away: { label: "Away", dot: "bg-warning" },
  busy: { label: "Do not disturb", dot: "bg-danger" },
  offline: { label: "Offline", dot: "border-2 border-fg-subtle bg-surface" },
};

const PRESENCE_OF: Record<string, Presence> = {
  [PEOPLE[0]]: "online",
  [PEOPLE[1]]: "online",
  [PEOPLE[2]]: "away",
  [PEOPLE[3]]: "busy",
  [PEOPLE[4]]: "online",
  [PEOPLE[5]]: "offline",
  [PEOPLE[6]]: "online",
  [PEOPLE[7]]: "away",
  "Dana Brooks": "online",
  "Leo Park": "offline",
};

const chanOf = (id: string) => CHANNELS.find((c) => c.id === id) ?? CHANNELS[1]!;
const label = (c: Chan) => (c.kind === "dm" ? c.name : `#${c.name}`);

/* ------------------------------------------------------------ rich text */

const MENTION = new RegExp(`(@(?:${[...PEOPLE, ...GUESTS, "here"].join("|")})|#[a-z0-9-]+|\`[^\`]+\`)`, "g");

/** Mentions, channel links and inline code in a message. A mention of you stands out. */
function Rich({ text, query }: { text: string; query?: string }) {
  return (
    <>
      {text.split(MENTION).map((part, i) => {
        if (i % 2 === 0) return <Highlight key={i} text={part} query={query} />;
        if (part.startsWith("`")) {
          return (
            <code key={i} className="rounded bg-subtle px-1 font-mono text-xs text-fg">
              {part.slice(1, -1)}
            </code>
          );
        }
        if (part.startsWith("#")) {
          return (
            <a key={i} href={`#chat/${part.slice(1)}`} className="font-medium text-accent-text no-underline">
              {part}
            </a>
          );
        }
        const mine = part === `@${ME}` || part === "@here";
        return (
          <span key={i} className={cn("rounded px-0.5 font-medium", mine ? "bg-warning-soft text-warning-text" : "bg-accent-soft text-accent-text")}>
            {part}
          </span>
        );
      })}
    </>
  );
}

function Highlight({ text, query }: { text: string; query?: string }) {
  const q = query?.trim();
  if (!q) return <>{text}</>;
  const parts = text.split(new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"));
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded bg-warning-soft px-0.5 text-fg">
            {p}
          </mark>
        ) : (
          p
        ),
      )}
    </>
  );
}

/* ------------------------------------------------------------- pieces */

function PresenceDot({ who, className }: { who: string; className?: string }) {
  const p = PRESENCE_OF[who] ?? "offline";
  return <span aria-hidden className={cn("absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-surface", PRESENCE[p].dot, className)} />;
}

function Who({ name, app, size = "md" }: { name: string; app?: AppName; size?: "sm" | "md" }) {
  if (app) {
    const Icon = APP_ICON[app];
    return (
      <span
        role="img"
        aria-label={app}
        className={cn("grid shrink-0 place-items-center rounded-md bg-subtle text-fg-muted", size === "sm" ? "size-6" : "size-8")}
      >
        <Icon className="size-4" />
      </span>
    );
  }
  return (
    <span className="relative shrink-0">
      <Avatar name={name} size={size} className={size === "md" ? "size-8" : undefined} />
    </span>
  );
}

function MessageCard({ card }: { card: Card }) {
  return (
    <div
      className="mt-1.5 flex max-w-md flex-col gap-1.5 rounded-md border border-line border-l-[3px] bg-canvas px-3 py-2"
      style={{ borderLeftColor: "var(--oa-chart-4)" }}
    >
      <span className="flex flex-wrap items-center gap-1.5">
        <span className="text-sm font-semibold text-fg">{card.title}</span>
        {card.severity && <SeverityBadge severity={card.severity} />}
        {card.status && <StatusBadge tone={card.status.tone}>{card.status.label}</StatusBadge>}
      </span>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        {card.fields.map(([k, v]) => (
          <div key={k} className="flex min-w-0 flex-col">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="truncate font-medium text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      <a href={`#${card.link.toLowerCase().replace(/\s+/g, "-")}`} className="self-start text-xs font-medium text-accent-text">
        {card.link}
      </a>
    </div>
  );
}

function Reactions({ list, onToggle }: { list: Reaction[]; onToggle: (emoji: string) => void }) {
  return (
    <span className="mt-1 flex flex-wrap gap-1">
      {list.map((r) => {
        const mine = r.by.includes(ME);
        return (
          <button
            key={r.emoji}
            type="button"
            aria-pressed={mine}
            title={r.by.map((b) => (b === ME ? "You" : b)).join(", ")}
            onClick={() => onToggle(r.emoji)}
            className={cn(
              "flex h-6 items-center gap-1 rounded-full border px-2 text-xs tabular-nums",
              mine ? "border-accent bg-accent-soft text-accent-text" : "border-line bg-surface text-fg-muted hover:bg-subtle",
            )}
          >
            <span>{r.emoji}</span>
            {r.by.length}
          </button>
        );
      })}
    </span>
  );
}

function MessageRow({
  m,
  compact,
  active,
  onThread,
  onReact,
}: {
  m: Msg;
  compact?: boolean;
  active?: boolean;
  onThread?: () => void;
  onReact?: (emoji: string) => void;
}) {
  const guest = GUESTS.includes(m.author);
  const mentionsMe = m.text.includes(`@${ME}`);
  const replies = m.thread ?? [];
  const last = replies[replies.length - 1];
  return (
    <li
      className={cn(
        "flex gap-2.5 px-3 py-2",
        mentionsMe && "border-l-2 border-warning bg-warning-soft/40 pl-2.5",
        active && "bg-accent-soft/40",
        !mentionsMe && !active && "hover:bg-canvas",
      )}
    >
      <Who name={m.author} app={m.app} size={compact ? "sm" : "md"} />
      <div className="flex min-w-0 grow flex-col">
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span className="text-sm font-semibold text-fg">{m.author === ME ? `${ME} (you)` : m.author}</span>
          {m.app && <Badge className="self-center">App</Badge>}
          {guest && (
            <Badge tone="warning" className="self-center">
              Guest, Northwind
            </Badge>
          )}
          <time className="text-2xs text-fg-subtle tabular-nums">{m.time}</time>
        </span>
        <p className="text-sm leading-snug text-fg">
          <Rich text={m.text} />
        </p>
        {m.card && <MessageCard card={m.card} />}
        {m.file && (
          <a
            href={`#file/${m.file.name}`}
            className="mt-1.5 flex max-w-xs items-center gap-2 rounded-md border border-line bg-surface px-2.5 py-2 no-underline hover:bg-canvas"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded bg-danger-soft text-danger-text">
              <FileText aria-hidden className="size-4" />
            </span>
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-medium text-fg">{m.file.name}</span>
              <span className="text-2xs text-fg-muted">PDF · {m.file.size} · kept in your install</span>
            </span>
          </a>
        )}
        {m.reactions && m.reactions.length > 0 && <Reactions list={m.reactions} onToggle={(e) => onReact?.(e)} />}
        {onThread && replies.length > 0 && last && (
          <span className="mt-1 flex items-center gap-2">
            <span aria-hidden className="flex -space-x-1">
              {[...new Set(replies.map((r) => r.author))].slice(0, 3).map((a) => (
                <Who key={a} name={a} app={replies.find((r) => r.author === a)?.app} size="sm" />
              ))}
            </span>
            <button type="button" aria-pressed={active} onClick={onThread} className="text-xs font-semibold text-accent-text hover:underline">
              {replies.length} {replies.length === 1 ? "reply" : "replies"}
            </button>
            <span className="text-2xs text-fg-subtle">Last reply {last.time}</span>
          </span>
        )}
      </div>
    </li>
  );
}

function Composer({
  placeholder,
  name,
  button,
  onSend,
  extra,
}: {
  placeholder: string;
  name: string;
  button: string;
  onSend: (text: string) => void;
  extra?: ReactNode;
}) {
  const [text, setText] = useState("");
  const id = `composer-${name.replace(/\W+/g, "-")}`;
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  };
  return (
    <form onSubmit={submit} className="flex flex-col gap-1.5 border-t border-line p-2.5">
      <div className="flex flex-col rounded-md border border-line bg-surface focus-within:border-accent">
        <label htmlFor={id} className="sr-only">
          {name}
        </label>
        <textarea
          id={id}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent px-2.5 pt-2 text-sm text-fg outline-none placeholder:text-fg-subtle"
        />
        <span className="flex items-center gap-0.5 px-1.5 pb-1.5">
          <IconButton label="Attach a file" size="xs">
            <Paperclip className="size-3.5" />
          </IconButton>
          <IconButton label="Mention someone" size="xs">
            <AtSign className="size-3.5" />
          </IconButton>
          <IconButton label="Add an emoji" size="xs">
            <Smile className="size-3.5" />
          </IconButton>
          <span className="grow" />
          <Button type="submit" size="xs" variant="primary" icon={<SendHorizontal />}>
            {button}
          </Button>
        </span>
      </div>
      {extra}
    </form>
  );
}

/* ------------------------------------------------------------- channel */

function KindIcon({ kind, className }: { kind: Kind; className?: string }) {
  const Icon = kind === "private" ? Lock : kind === "incident" ? Siren : Hash;
  return <Icon aria-hidden className={cn("size-3.5 shrink-0", className)} />;
}

function Sidebar({ active, unread, onOpen }: { active: string; unread: Record<string, number>; onOpen: (id: string) => void }) {
  const row = (c: Chan) => {
    const n = unread[c.id] ?? 0;
    const on = c.id === active;
    return (
      <li key={c.id}>
        <button
          type="button"
          aria-current={on ? "page" : undefined}
          onClick={() => onOpen(c.id)}
          className={cn(
            "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-sm",
            on ? "bg-accent-soft font-medium text-accent-text" : n ? "font-semibold text-fg hover:bg-subtle" : "text-fg-muted hover:bg-subtle",
          )}
        >
          {c.kind === "dm" ? (
            <span className="relative grid size-5 shrink-0 place-items-center">
              <Avatar name={c.with?.[0] ?? c.name} size="sm" className="size-5 text-[8px]" />
              {c.with?.length === 1 && <PresenceDot who={c.with[0] ?? ""} className="size-2" />}
            </span>
          ) : (
            <KindIcon kind={c.kind} />
          )}
          <span className="min-w-0 grow truncate">{c.name}</span>
          {c.kind === "guests" && (
            <Badge tone="warning" className="px-1">
              Guests
            </Badge>
          )}
          {GUESTS.includes(c.name) && (
            <Badge tone="warning" className="px-1">
              Guest
            </Badge>
          )}
          {n > 0 && (
            <span className={cn("rounded-full px-1.5 text-2xs font-semibold tabular-nums", c.mention ? "bg-danger text-accent-contrast" : "bg-subtle text-fg")}>
              {n}
              <span className="sr-only"> {c.mention ? "unread, mentions you" : "unread"}</span>
            </span>
          )}
        </button>
      </li>
    );
  };
  return (
    <nav aria-label="Conversations" className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-2">
      <section className="flex flex-col gap-0.5">
        <h2 className="flex items-center justify-between px-2 pb-0.5 text-2xs font-semibold tracking-wide text-fg-muted uppercase">
          Channels
          <IconButton label="Browse channels" size="xs">
            <Plus className="size-3.5" />
          </IconButton>
        </h2>
        <ul aria-label="Channels" className="flex flex-col gap-0.5">
          {CHANNELS.filter((c) => c.kind !== "dm").map(row)}
        </ul>
      </section>
      <section className="flex flex-col gap-0.5">
        <h2 className="flex items-center justify-between px-2 pb-0.5 text-2xs font-semibold tracking-wide text-fg-muted uppercase">
          Direct messages
          <IconButton label="New message" size="xs">
            <Plus className="size-3.5" />
          </IconButton>
        </h2>
        <ul aria-label="Direct messages" className="flex flex-col gap-0.5">
          {CHANNELS.filter((c) => c.kind === "dm").map(row)}
        </ul>
      </section>
    </nav>
  );
}

function ChannelInfo({ c }: { c: Chan }) {
  const items: Array<[string, string]> =
    c.kind === "dm"
      ? [
          ["With", c.with?.join(", ") ?? ""],
          ["Messages kept", c.retention],
        ]
      : [
          ["Members", `${c.members}, ${c.from}`],
          ["Messages kept", c.retention],
          ["Guests", c.kind === "guests" ? "Dana Brooks and Leo Park, Northwind" : "Not allowed"],
        ];
  return (
    <section aria-label="About this channel" className="flex min-h-0 flex-col gap-3 overflow-y-auto rounded-lg border border-line bg-surface p-3">
      <h2 className="text-sm font-semibold text-fg">{c.kind === "dm" ? "About this conversation" : "About this channel"}</h2>
      {c.topic && <p className="text-sm text-fg">{c.topic}</p>}
      <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
        {items.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-fg-muted">{k}</dt>
            <dd className="text-fg">{v}</dd>
          </div>
        ))}
      </dl>
      {c.kind === "guests" && (
        <p className="rounded-md bg-warning-soft px-2.5 py-2 text-xs text-fg">
          Guests see only this channel. Their access ends on 31 December 2026 unless Chris Shaw extends it.
        </p>
      )}
      <section className="flex flex-col gap-1.5 border-t border-line pt-3">
        <h3 className="text-xs font-semibold text-fg-muted">Pinned</h3>
        <ul aria-label="Pinned" className="flex flex-col gap-1 text-xs text-fg">
          <li>On-call rota for November</li>
          <li>Runbook: rolling back the API</li>
        </ul>
      </section>
    </section>
  );
}

function ThreadPanel({
  root,
  channel,
  onClose,
  onReply,
}: {
  root: Msg;
  channel: Chan;
  onClose: () => void;
  onReply: (text: string, alsoChannel: boolean) => void;
}) {
  const [also, setAlso] = useState(false);
  const replies = root.thread ?? [];
  return (
    <section aria-label="Thread" className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface">
      <header className="flex items-center gap-2 border-b border-line px-3 py-2">
        <span className="flex min-w-0 grow flex-col">
          <h2 className="text-sm font-semibold text-fg">Thread</h2>
          <span className="truncate text-xs text-fg-muted">{label(channel)}</span>
        </span>
        <IconButton label="Close thread" size="sm" onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </header>
      <div tabIndex={0} role="log" aria-label="Replies" className="flex min-h-0 grow flex-col overflow-y-auto">
        <ol className="flex flex-col py-1">
          <MessageRow m={{ ...root, thread: undefined, reactions: undefined }} compact />
          <li className="flex items-center gap-2 px-3 py-1 text-2xs font-medium text-fg-muted">
            {replies.length} {replies.length === 1 ? "reply" : "replies"}
            <span aria-hidden className="h-px grow bg-line" />
          </li>
          {replies.map((r) => (
            <MessageRow key={r.id} m={r} compact />
          ))}
        </ol>
      </div>
      <Composer
        name="Reply in thread"
        placeholder="Reply"
        button="Reply"
        onSend={(t) => onReply(t, also)}
        extra={<Checkbox label={`Also send to ${label(channel)}`} checked={also} onChange={(e) => setAlso(e.target.checked)} className="text-xs" />}
      />
    </section>
  );
}

/** A channel's messages, with the conversations list on the left and an open thread on the right. */
function ChannelPage() {
  const [active, setActive] = useState("ops-oncall");
  const [items, setItems] = useState(MESSAGES);
  const [thread, setThread] = useState<string | null>("alert");
  const [unread, setUnread] = useState<Record<string, number>>(Object.fromEntries(CHANNELS.map((c) => [c.id, c.unread ?? 0])));
  const c = chanOf(active);
  const list = items[active] ?? [];
  const root = list.find((i): i is Msg => !isDay(i) && i.id === thread);
  const guests = c.kind === "guests";

  const update = (fn: (m: Msg) => Msg) => setItems((all) => ({ ...all, [active]: (all[active] ?? []).map((i) => (isDay(i) ? i : fn(i))) }));
  const react = (id: string, emoji: string) =>
    update((m) =>
      m.id !== id
        ? m
        : {
            ...m,
            reactions: (m.reactions ?? [])
              .map((r) => (r.emoji !== emoji ? r : { ...r, by: r.by.includes(ME) ? r.by.filter((b) => b !== ME) : [...r.by, ME] }))
              .filter((r) => r.by.length > 0),
          },
    );
  const send = (text: string) =>
    setItems((all) => ({ ...all, [active]: [...(all[active] ?? []), { id: `new-${Date.now()}`, author: ME, time: "14:21", text }] }));
  const reply = (text: string, also: boolean) => {
    if (!thread) return;
    const r: Msg = { id: `reply-${Date.now()}`, author: ME, time: "14:21", text };
    update((m) => (m.id === thread ? { ...m, thread: [...(m.thread ?? []), r] } : m));
    if (also) send(text);
  };
  const open = (id: string) => {
    setActive(id);
    setThread(null);
    setUnread((u) => ({ ...u, [id]: 0 }));
  };

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-1.5">
            {c.kind === "dm" ? <MessageSquare aria-hidden className="size-5 text-fg-muted" /> : <KindIcon kind={c.kind} className="size-5 text-fg-muted" />}
            {c.name}
          </span>
        }
        description={c.kind === "dm" ? "Direct message" : c.topic}
        meta={
          <>
            {c.kind === "incident" && <Badge tone="danger">INC-2041</Badge>}
            {guests && <Badge tone="warning">2 guests from Northwind</Badge>}
            {c.kind === "private" && <Badge>Private</Badge>}
          </>
        }
        actions={
          <>
            <Button variant="ghost">
              <span aria-hidden className="flex -space-x-1.5">
                {[PEOPLE[4], PEOPLE[0], PEOPLE[3]].map((p) => (
                  <Avatar key={p} name={p} size="sm" className="ring-2 ring-surface" />
                ))}
              </span>
              {c.members}
              <span className="sr-only"> members</span>
            </Button>
            <Button icon={<Pin />}>Pinned</Button>
            <Button icon={<Video />}>Start a call</Button>
            <IconButton label="Channel details" onClick={() => setThread(null)}>
              <Info className="size-4" />
            </IconButton>
          </>
        }
      />
      <div className="grid gap-2.5 xl:h-[calc(100dvh-11rem)] xl:min-h-[560px] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <Sidebar active={active} unread={unread} onOpen={open} />
        <section aria-label="Conversation" className="flex h-[620px] min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-surface xl:h-auto">
          <div tabIndex={0} role="log" aria-label={`Messages in ${label(c)}`} className="flex min-h-0 grow flex-col-reverse overflow-y-auto">
            <ol className="flex flex-col py-1">
              {list.map((i) =>
                isDay(i) ? (
                  <li key={i.day} className="flex items-center gap-2 px-3 pt-3 pb-1 text-2xs font-semibold text-fg-muted">
                    <span aria-hidden className="h-px grow bg-line" />
                    {i.day}
                    <span aria-hidden className="h-px grow bg-line" />
                  </li>
                ) : (
                  <MessageRow key={i.id} m={i} active={thread === i.id} onThread={() => setThread(i.id)} onReact={(e) => react(i.id, e)} />
                ),
              )}
            </ol>
          </div>
          <Composer
            key={active}
            name={`Message ${label(c)}`}
            placeholder={`Message ${label(c)}`}
            button="Send"
            onSend={send}
            extra={
              guests ? (
                <p className="text-xs text-fg-muted">This channel has guests from Northwind. Everything you send here, files too, they can see.</p>
              ) : (
                <p className="text-xs text-fg-subtle">Files stay in your install. Shift and Enter for a new line.</p>
              )
            }
          />
        </section>
        {root ? <ThreadPanel key={root.id} root={root} channel={c} onClose={() => setThread(null)} onReply={reply} /> : <ChannelInfo c={c} />}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- search */

interface Hit {
  id: string;
  channel: string;
  author: string;
  app?: AppName;
  when: string;
  /** Days ago, for the date filter. */
  age: number;
  text: string;
  inThread?: boolean;
}

const HITS: Hit[] = [
  {
    id: "h1",
    channel: "ops-oncall",
    author: PEOPLE[4],
    when: "Today 02:21",
    age: 0,
    text: "Error rate went up right after deploy `2026.11.4-1`. Starting the rollback to `2026.11.3-5`.",
    inThread: true,
  },
  {
    id: "h2",
    channel: "ops-oncall",
    author: PEOPLE[3],
    when: "Today 09:20",
    age: 0,
    text: "Updated the rollback checklist with the database step we missed last night.",
  },
  {
    id: "h3",
    channel: "inc-2041-api-latency",
    author: PEOPLE[4],
    when: "Today 02:40",
    age: 0,
    text: "Timeline so far: 02:04 alert, 02:15 acknowledged, 02:24 rollback started, 02:31 recovered.",
  },
  {
    id: "h4",
    channel: "deploys",
    author: "Deploys",
    app: "Deploys",
    when: "Today 02:24",
    age: 0,
    text: "Rollback of api to `2026.11.3-5` started by Ben Ortiz.",
  },
  {
    id: "h5",
    channel: "ops-oncall",
    author: PEOPLE[2],
    when: "21 October",
    age: 14,
    text: "Can we make the rollback a single command in the runbook? Last time it took four.",
  },
  { id: "h6", channel: "dm-ben", author: PEOPLE[4], when: "14 October", age: 21, text: "The rollback drill is on Thursday, you are on the list as observer." },
  {
    id: "h7",
    channel: "leadership",
    author: PEOPLE[7],
    when: "2 October",
    age: 32,
    text: "Customer impact from last month's rollback was under 5 minutes. Good work by the platform team.",
  },
  { id: "h8", channel: "general", author: PEOPLE[5], when: "Today 11:02", age: 0, text: "Reminder: health plan enrolment closes Friday." },
];

interface SharedFile {
  id: string;
  name: string;
  size: string;
  channel: string;
  by: string;
  when: string;
}

const FILES: SharedFile[] = [
  { id: "f1", name: "rollback-checklist.pdf", size: "184 KB", channel: "ops-oncall", by: PEOPLE[3], when: "Today" },
  { id: "f2", name: "rollback-drill-notes.docx", size: "42 KB", channel: "ops-oncall", by: PEOPLE[4], when: "15 October" },
  { id: "f3", name: "api-latency-0204.png", size: "312 KB", channel: "inc-2041-api-latency", by: PEOPLE[4], when: "Today" },
  { id: "f4", name: "health-plan-2027.pdf", size: "1.2 MB", channel: "general", by: PEOPLE[5], when: "Today" },
  { id: "f5", name: "northwind-sso-setup.pdf", size: "420 KB", channel: "northwind-shared", by: PEOPLE[6], when: "Yesterday" },
];

/** Every message and file the person can see, with the channel, sender and date to narrow it. */
function SearchPage() {
  const [query, setQuery] = useState("rollback");
  const [where, setWhere] = useState("");
  const [from, setFrom] = useState("");
  const [when, setWhen] = useState("any");
  const [tab, setTab] = useState<"messages" | "files">("messages");
  const q = query.trim().toLowerCase();
  const maxAge = when === "today" ? 0 : when === "7" ? 7 : when === "30" ? 30 : Infinity;
  const hits = HITS.filter(
    (h) => (!q || h.text.toLowerCase().includes(q)) && (!where || h.channel === where) && (!from || h.author === from) && h.age <= maxAge,
  );
  const files = FILES.filter((f) => (!q || f.name.toLowerCase().includes(q)) && (!where || f.channel === where) && (!from || f.by === from));
  const fileCols: Column<SharedFile>[] = [
    {
      id: "name",
      header: "File",
      width: "38%",
      sortValue: (f) => f.name,
      cell: (f) => (
        <span className="flex min-w-0 items-center gap-2">
          <FileText aria-hidden className="size-4 shrink-0 text-fg-muted" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">
              <Highlight text={f.name} query={query} />
            </span>
            <span className="text-2xs text-fg-muted">{f.size}</span>
          </span>
        </span>
      ),
    },
    { id: "channel", header: "Shared in", cell: (f) => <span className="truncate text-xs">{label(chanOf(f.channel))}</span> },
    { id: "by", header: "By", cell: (f) => <span className="truncate text-xs">{f.by}</span> },
    { id: "when", header: "When", cell: (f) => <span className="text-xs text-fg-muted">{f.when}</span> },
  ];
  return (
    <>
      <PageHeader title="Search" description="Messages and files from public channels and from the private channels and direct messages you are in." />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush>
          <div className="flex flex-col gap-2 px-3 pt-3">
            <SearchInput label="Search messages and files" value={query} onChange={(e) => setQuery(e.target.value)} shortcut="/" />
            <div className="grid grid-cols-3 gap-2">
              <SelectField
                label="In"
                value={where}
                onChange={(e) => setWhere(e.target.value)}
                options={[{ value: "", label: "Anywhere" }, ...CHANNELS.map((c) => ({ value: c.id, label: label(c) }))]}
              />
              <SelectField
                label="From"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                options={[{ value: "", label: "Anyone" }, ...[...PEOPLE, "Deploys"].map((p) => ({ value: p, label: p }))]}
              />
              <SelectField
                label="When"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
                options={[
                  { value: "any", label: "Any time" },
                  { value: "today", label: "Today" },
                  { value: "7", label: "Last 7 days" },
                  { value: "30", label: "Last 30 days" },
                ]}
              />
            </div>
            <Tabs
              label="Results"
              value={tab}
              onChange={setTab}
              items={[
                { value: "messages", label: "Messages", count: hits.length },
                { value: "files", label: "Files", count: files.length },
              ]}
              className="border-b-0"
            />
          </div>
          <div className="border-t border-line">
            {tab === "messages" ? (
              hits.length ? (
                <ol aria-label="Search results" className="flex flex-col">
                  {hits.map((h) => {
                    const c = chanOf(h.channel);
                    return (
                      <li key={h.id} className="flex gap-2.5 border-b border-subtle px-3 py-2.5 last:border-0 hover:bg-canvas">
                        <Who name={h.author} app={h.app} />
                        <div className="flex min-w-0 grow flex-col gap-0.5">
                          <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs">
                            <span className="text-sm font-semibold text-fg">{h.author}</span>
                            <span className="text-fg-subtle">in</span>
                            <a href={`#chat/${c.id}`} className="flex items-center gap-1 font-medium text-accent-text no-underline">
                              {c.kind === "dm" ? <MessageSquare aria-hidden className="size-3" /> : <KindIcon kind={c.kind} className="size-3" />}
                              {c.kind === "dm" ? `Direct message with ${c.name}` : c.name}
                            </a>
                            {h.inThread && <Badge>In a thread</Badge>}
                            <span className="ml-auto text-2xs text-fg-subtle">{h.when}</span>
                          </span>
                          <p className="text-sm text-fg">
                            <Rich text={h.text} query={query} />
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              ) : (
                <EmptyState icon={<SearchIcon />} title="No messages found">
                  Try fewer words or a wider date. Messages past a channel's retention are deleted and cannot be found.
                </EmptyState>
              )
            ) : (
              <DataTable label="Files" columns={fileCols} rows={files} getRowId={(f) => f.id} minWidth={560} />
            )}
          </div>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Narrow it down" description="Type these in the search box, or use the fields.">
            <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
              {[
                ["from:ben", "Sent by Ben Ortiz"],
                ["in:#deploys", "In one channel"],
                ["has:file", "With a file attached"],
                ["before:2026-11-01", "Sent before a date"],
                ['"cache warm-up"', "These words in this order"],
              ].map(([k, v]) => (
                <div key={k} className="contents">
                  <dt>
                    <code className="rounded bg-subtle px-1 font-mono text-fg">{k}</code>
                  </dt>
                  <dd className="text-fg-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <Panel title="What search covers">
            <ul className="flex list-disc flex-col gap-1 pl-4 text-xs text-fg">
              <li>Public channels, even ones you have not joined</li>
              <li>Private channels and direct messages you are in</li>
              <li>File names and the text inside PDFs and documents</li>
              <li>Nothing past a channel's retention: it is deleted</li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- people */

interface Person {
  name: string;
  title: string;
  company: string;
  status?: string;
  tz: string;
  time: string;
  groups: string[];
  channels: number;
  guest?: { invitedBy: string; ends: string; sees: string[] };
}

const PEOPLE_ROWS: Person[] = [
  {
    name: PEOPLE[0],
    title: "Security engineer",
    company: "Acme Corp",
    status: "Reviewing pentest findings",
    tz: "Istanbul",
    time: "14:20",
    groups: ["Security", "Engineering"],
    channels: 18,
  },
  { name: PEOPLE[1], title: "Head of operations", company: "Acme Corp", tz: "Istanbul", time: "14:20", groups: ["Operations", "Managers"], channels: 22 },
  {
    name: PEOPLE[2],
    title: "Account manager",
    company: "Acme Corp",
    status: "Out from 30 November",
    tz: "Istanbul",
    time: "14:20",
    groups: ["Sales"],
    channels: 11,
  },
  {
    name: PEOPLE[3],
    title: "Sales lead",
    company: "Acme Corp",
    status: "Demo prep until 15:00",
    tz: "London",
    time: "11:20",
    groups: ["Sales", "Managers"],
    channels: 15,
  },
  {
    name: PEOPLE[4],
    title: "Platform engineer",
    company: "Acme Corp",
    status: "On call this week",
    tz: "Berlin",
    time: "12:20",
    groups: ["Platform", "Engineering"],
    channels: 24,
  },
  { name: PEOPLE[5], title: "People partner", company: "Acme Corp", tz: "Istanbul", time: "14:20", groups: ["People"], channels: 9 },
  { name: PEOPLE[6], title: "Account executive", company: "Acme Corp", tz: "Istanbul", time: "14:20", groups: ["Sales"], channels: 12 },
  {
    name: PEOPLE[7],
    title: "CEO",
    company: "Acme Corp",
    status: "In Atlas until 16:30",
    tz: "Istanbul",
    time: "14:20",
    groups: ["Leadership", "Managers"],
    channels: 14,
  },
  {
    name: "Dana Brooks",
    title: "Head of support",
    company: "Northwind",
    tz: "London",
    time: "11:20",
    groups: [],
    channels: 1,
    guest: { invitedBy: PEOPLE[6], ends: "31 December 2026", sees: ["#northwind-shared", "Direct messages with members of it"] },
  },
  {
    name: "Leo Park",
    title: "IT director",
    company: "Northwind",
    tz: "Seoul",
    time: "20:20",
    groups: [],
    channels: 1,
    guest: { invitedBy: PEOPLE[6], ends: "31 December 2026", sees: ["#northwind-shared", "Direct messages with members of it"] },
  },
];

/** Who is in the company and who is a guest, their presence and local time, and what a guest can see. */
function PeoplePage() {
  const [tab, setTab] = useState<"all" | "members" | "guests">("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("Dana Brooks");
  const rows = PEOPLE_ROWS.filter(
    (p) =>
      (tab === "all" || (tab === "guests" ? !!p.guest : !p.guest)) &&
      `${p.name} ${p.title} ${p.company} ${p.groups.join(" ")}`.toLowerCase().includes(query.toLowerCase()),
  );
  const cur = PEOPLE_ROWS.find((p) => p.name === active);
  const cols: Column<Person>[] = [
    {
      id: "name",
      header: "Name",
      width: "26%",
      sortValue: (p) => p.name,
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-2">
          <span className="relative shrink-0">
            <Avatar name={p.name} size="sm" />
            <PresenceDot who={p.name} />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{p.name === ME ? `${p.name} (you)` : p.name}</span>
            <span className="truncate text-2xs text-fg-muted">
              {p.title}
              {p.guest && ` · ${p.company}`}
            </span>
          </span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      width: "26%",
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="text-xs text-fg">{PRESENCE[PRESENCE_OF[p.name] ?? "offline"].label}</span>
          {p.status && <span className="truncate text-2xs text-fg-muted">{p.status}</span>}
        </span>
      ),
    },
    {
      id: "time",
      header: "Local time",
      cell: (p) => (
        <span className="text-xs">
          <span className="font-mono tabular-nums">{p.time}</span> <span className="text-fg-muted">{p.tz}</span>
        </span>
      ),
    },
    {
      id: "groups",
      header: "Groups",
      cell: (p) =>
        p.guest ? (
          <Badge tone="warning">Guest</Badge>
        ) : (
          <span className="flex flex-wrap gap-1">
            {p.groups.map((g) => (
              <Badge key={g}>{g}</Badge>
            ))}
          </span>
        ),
    },
    { id: "channels", header: "Channels", align: "right", sortValue: (p) => p.channels, cell: (p) => <span className="tabular-nums">{p.channels}</span> },
  ];
  return (
    <>
      <PageHeader
        title="People"
        description="Members and groups come from Identity. Guests are invited to single channels and leave when their access ends."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Invite a guest
          </Button>
        }
      />
      <Callout tone="warning" title={`${PEOPLE[2]} leaves on 30 November`}>
        When Identity turns the account off, Mark is taken out of all 11 channels and signed out on every device. What Mark wrote stays, under each channel's
        retention.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush>
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2">
            <Tabs
              label="People"
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "Everyone", count: PEOPLE_ROWS.length },
                { value: "members", label: "Members", count: PEOPLE_ROWS.filter((p) => !p.guest).length },
                { value: "guests", label: "Guests", count: PEOPLE_ROWS.filter((p) => p.guest).length },
              ]}
              className="border-b-0"
            />
            <SearchInput
              label="Search people"
              placeholder="Name, title or group"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-1.5 w-56"
            />
          </div>
          <div className="border-t border-line">
            <DataTable
              label="People"
              columns={cols}
              rows={rows}
              getRowId={(p) => p.name}
              onRowClick={(p) => setActive(p.name)}
              activeRowId={active}
              minWidth={680}
            />
          </div>
        </Panel>
        {cur && (
          <Panel aria-label="Person">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <span className="relative">
                  <Avatar name={cur.name} />
                  <PresenceDot who={cur.name} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-semibold text-fg">{cur.name}</span>
                  <span className="truncate text-xs text-fg-muted">
                    {cur.title} · {cur.company}
                  </span>
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" icon={<MessageSquare />}>
                  Message
                </Button>
                <Button size="sm" icon={<Video />}>
                  Call
                </Button>
              </div>
              <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
                <dt className="text-fg-muted">Status</dt>
                <dd className="text-fg">
                  {PRESENCE[PRESENCE_OF[cur.name] ?? "offline"].label}
                  {cur.status && `, ${cur.status}`}
                </dd>
                <dt className="text-fg-muted">Local time</dt>
                <dd className="text-fg">
                  {cur.time} in {cur.tz}
                </dd>
                <dt className="text-fg-muted">Email</dt>
                <dd className="truncate font-mono text-fg">{cur.guest ? `${cur.name.split(" ")[0]?.toLowerCase()}@northwind.example` : emailOf(cur.name)}</dd>
                {!cur.guest && (
                  <>
                    <dt className="text-fg-muted">Groups</dt>
                    <dd className="text-fg">{cur.groups.join(", ")}, from Identity</dd>
                  </>
                )}
              </dl>
              {cur.guest && (
                <section className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <h2 className="text-xs font-semibold text-fg-muted">Guest access</h2>
                  <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
                    <dt className="text-fg-muted">Can see</dt>
                    <dd className="text-fg">{cur.guest.sees.join("; ")}</dd>
                    <dt className="text-fg-muted">Invited by</dt>
                    <dd className="text-fg">{cur.guest.invitedBy}</dd>
                    <dt className="text-fg-muted">Access ends</dt>
                    <dd className="text-fg">{cur.guest.ends}</dd>
                    <dt className="text-fg-muted">Signs in</dt>
                    <dd className="text-fg">Email link and a passkey, no company account</dd>
                  </dl>
                  <Button size="sm" variant="danger" className="self-start">
                    End guest access
                  </Button>
                </section>
              )}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------- channels */

type Retention = "forever" | "2y" | "1y" | "90d" | "30d";
const RETENTION: Record<Retention, string> = { forever: "Forever", "2y": "2 years", "1y": "1 year", "90d": "90 days", "30d": "30 days" };
const RANK: Record<Retention, number> = { forever: 5, "2y": 4, "1y": 3, "90d": 2, "30d": 1 };

interface AdminChan {
  id: string;
  kind: Exclude<Kind, "dm">;
  topic: string;
  members: number;
  from: string;
  group: string;
  retention: Retention;
  guests: boolean;
  posts: "everyone" | "admins";
  managed: "file" | "people" | "incidents";
  hold?: string;
  /** Messages older than the shorter choices, to say what a change deletes. */
  older?: Partial<Record<Retention, number>>;
}

const ADMIN: AdminChan[] = [
  {
    id: "general",
    kind: "public",
    topic: "Company-wide news and questions",
    members: 128,
    from: "Everyone",
    group: "everyone",
    retention: "2y",
    guests: false,
    posts: "everyone",
    managed: "file",
  },
  {
    id: "announcements",
    kind: "public",
    topic: "News from leadership",
    members: 128,
    from: "Everyone",
    group: "everyone",
    retention: "forever",
    guests: false,
    posts: "admins",
    managed: "file",
  },
  {
    id: "ops-oncall",
    kind: "public",
    topic: "Paging, alerts and deploys",
    members: 14,
    from: "Platform, Operations",
    group: "platform, group:operations",
    retention: "1y",
    guests: false,
    posts: "everyone",
    managed: "file",
    older: { "90d": 4812, "30d": 6390 },
  },
  {
    id: "deploys",
    kind: "public",
    topic: "Every production deploy and rollback",
    members: 41,
    from: "Engineering",
    group: "engineering",
    retention: "90d",
    guests: false,
    posts: "everyone",
    managed: "file",
    older: { "30d": 1904 },
  },
  {
    id: "inc-2041-api-latency",
    kind: "incident",
    topic: "INC-2041: API latency after the 02:00 deploy",
    members: 6,
    from: "Incident responders",
    group: "",
    retention: "1y",
    guests: false,
    posts: "everyone",
    managed: "incidents",
  },
  {
    id: "sales",
    kind: "public",
    topic: "Pipeline, demos and deals",
    members: 18,
    from: "Sales",
    group: "sales",
    retention: "2y",
    guests: false,
    posts: "everyone",
    managed: "file",
    hold: "LR-2026-07",
  },
  {
    id: "leadership",
    kind: "private",
    topic: "Leadership team only",
    members: 5,
    from: "Leadership",
    group: "leadership",
    retention: "2y",
    guests: false,
    posts: "everyone",
    managed: "file",
  },
  {
    id: "northwind-shared",
    kind: "guests",
    topic: "Working with Northwind on the support portal trial",
    members: 6,
    from: "Added by hand, 2 guests",
    group: "",
    retention: "1y",
    guests: true,
    posts: "everyone",
    managed: "people",
  },
  {
    id: "random",
    kind: "public",
    topic: "Lunch, pets and the office plants",
    members: 96,
    from: "Joined by choice",
    group: "",
    retention: "90d",
    guests: false,
    posts: "everyone",
    managed: "people",
    older: { "30d": 2130 },
  },
  {
    id: "hiring-ae",
    kind: "private",
    topic: "Account executive hiring panel",
    members: 4,
    from: "Added by hand",
    group: "",
    retention: "1y",
    guests: false,
    posts: "everyone",
    managed: "people",
  },
];

const KIND_LABEL: Record<AdminChan["kind"], string> = { public: "Public", private: "Private", guests: "With guests", incident: "Incident" };
const MANAGED: Record<AdminChan["managed"], string> = { file: "channels.yaml", people: "By its members", incidents: "Incidents" };

function yaml(c: AdminChan) {
  return [
    `- name: ${c.id}`,
    `  topic: ${c.topic}`,
    `  private: ${c.kind === "private"}`,
    `  members: ${c.group ? `[group:${c.group}]` : "by-hand"}`,
    `  retention: ${c.retention}`,
    `  guests: ${c.guests}`,
    `  posts: ${c.posts}`,
  ].join("\n");
}

function LegalExportDialog({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStart: (r: { ref: string; channel: string; hold: boolean }) => void;
}) {
  const [ref, setRef] = useState("");
  const [channel, setChannel] = useState("ops-oncall");
  const [hold, setHold] = useState(true);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!ref.trim()) return;
    onStart({ ref: ref.trim(), channel, hold });
    setRef("");
    onOpenChange(false);
  };
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Export for a legal request"
      description="Exports every message, edit and file in the range as a signed archive. Starting one is recorded in Audit with your name."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary" icon={<FileDown />}>
            Start export
          </Button>
        </>
      }
    >
      <TextField label="Request reference" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="LR-2026-08" />
      <SelectField
        label="Channel"
        value={channel}
        onChange={(e) => setChannel(e.target.value)}
        options={ADMIN.map((c) => ({ value: c.id, label: `#${c.id}` }))}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="From" type="date" defaultValue="2026-09-01" />
        <TextField label="To" type="date" defaultValue="2026-10-31" />
      </div>
      <TextField label="Only messages from" placeholder="Anyone, or names from the directory" />
      <Checkbox
        label="Hold these messages"
        description="Nothing in the range is deleted, whatever the retention, until the hold is released."
        checked={hold}
        onChange={(e) => setHold(e.target.checked)}
      />
    </Dialog>
  );
}

/** Every channel with its members' source, retention and guests; the ones from the file show their entry. */
function ChannelsPage() {
  const [rows, setRows] = useState(ADMIN);
  const [active, setActive] = useState("ops-oncall");
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const cur = rows.find((r) => r.id === active);
  const base = ADMIN.find((r) => r.id === active);
  const set = (patch: Partial<AdminChan>) => setRows((xs) => xs.map((x) => (x.id === active ? { ...x, ...patch } : x)));
  const deleting = cur && base && RANK[cur.retention] < RANK[base.retention] ? (cur.older?.[cur.retention] ?? 0) : null;
  const cols: Column<AdminChan>[] = [
    {
      id: "name",
      header: "Channel",
      width: "30%",
      sortValue: (c) => c.id,
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-1.5">
          <KindIcon kind={c.kind} className="text-fg-muted" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{c.id}</span>
            <span className="truncate text-2xs text-fg-muted">{c.topic}</span>
          </span>
        </span>
      ),
    },
    {
      id: "kind",
      header: "Type",
      cell: (c) => <Badge tone={c.kind === "guests" ? "warning" : c.kind === "incident" ? "danger" : "neutral"}>{KIND_LABEL[c.kind]}</Badge>,
    },
    {
      id: "members",
      header: "Members",
      sortValue: (c) => c.members,
      cell: (c) => (
        <span className="flex min-w-0 flex-col text-xs">
          <span className="tabular-nums">{c.members}</span>
          <span className="truncate text-2xs text-fg-muted">{c.from}</span>
        </span>
      ),
    },
    {
      id: "retention",
      header: "Kept for",
      cell: (c) => (
        <span className="flex flex-wrap items-center gap-1 text-xs">
          {RETENTION[c.retention]}
          {c.hold && <Badge tone="info">Legal hold</Badge>}
        </span>
      ),
    },
    { id: "managed", header: "Set in", cell: (c) => <span className={cn("text-xs", c.managed === "file" && "font-mono")}>{MANAGED[c.managed]}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Channels"
        description="Company and team channels are set in channels.yaml with the rest of the install. People make their own channels too; retention and guests follow the rules here."
        actions={
          <>
            <Button icon={<FileDown />} onClick={() => setExporting(true)}>
              Export for a legal request
            </Button>
            <Button variant="primary" icon={<Plus />}>
              New channel
            </Button>
          </>
        }
      />
      {notice && (
        <div role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <KpiGrid minWidth={170}>
        <KpiCard label="Channels" value="31" icon={Hash} delta={{ label: "12 from channels.yaml", intent: "neutral" }} />
        <KpiCard label="Private" value="7" icon={Lock} />
        <KpiCard label="With guests" value="1" icon={Users} delta={{ label: "2 guests from Northwind", intent: "neutral" }} />
        <KpiCard label="Stored" value="41" unit="GB" delta={{ label: "files 33 GB, messages 8 GB", intent: "neutral" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="All channels" flush>
          <DataTable
            label="Channels"
            columns={cols}
            rows={rows}
            getRowId={(c) => c.id}
            onRowClick={(c) => setActive(c.id)}
            activeRowId={active}
            minWidth={680}
          />
        </Panel>
        {cur && (
          <Panel aria-label="Channel settings" title={`#${cur.id}`} description={`${KIND_LABEL[cur.kind]} · ${cur.members} members from ${cur.from}`}>
            <div className="flex flex-col gap-3">
              <SelectField
                label="Keep messages for"
                value={cur.retention}
                disabled={cur.managed === "file"}
                onChange={(e) => set({ retention: e.target.value as Retention })}
                options={(Object.keys(RETENTION) as Retention[]).map((r) => ({ value: r, label: RETENTION[r] }))}
              />
              {deleting !== null && (
                <p role="status" className="rounded-md bg-warning-soft px-2.5 py-2 text-xs text-fg">
                  {deleting.toLocaleString("en-GB")} messages older than {RETENTION[cur.retention]} are deleted at 03:00 tonight.
                </p>
              )}
              {cur.hold && (
                <p className="rounded-md bg-accent-soft px-2.5 py-2 text-xs text-fg">
                  Legal hold {cur.hold}: nothing here is deleted until the hold is released.
                </p>
              )}
              <SelectField
                label="Who can post"
                value={cur.posts}
                disabled={cur.managed === "file"}
                onChange={(e) => set({ posts: e.target.value as AdminChan["posts"] })}
                options={[
                  { value: "everyone", label: "Every member" },
                  { value: "admins", label: "Channel admins only" },
                ]}
              />
              <Switch
                checked={cur.guests}
                disabled={cur.managed === "file"}
                onCheckedChange={(g) => set({ guests: g })}
                label="Guests can be invited"
                description="People outside the company see only the channels they are invited to."
              />
              {cur.managed === "file" ? (
                <section className="flex flex-col gap-1.5 border-t border-line pt-3">
                  <h3 className="text-xs font-semibold text-fg-muted">In channels.yaml</h3>
                  <pre aria-label="channels.yaml entry" className="overflow-x-auto rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs leading-relaxed text-fg">
                    {yaml(cur)}
                  </pre>
                  <p className="text-2xs text-fg-muted">Changed in the file, reviewed like code; Chat reads it again within a minute.</p>
                </section>
              ) : (
                <p className="border-t border-line pt-3 text-xs text-fg-muted">
                  {cur.managed === "incidents"
                    ? "Opened by Incidents. It is archived 30 days after the incident closes."
                    : "Made by its members, not in channels.yaml."}
                </p>
              )}
            </div>
          </Panel>
        )}
      </div>
      <LegalExportDialog
        open={exporting}
        onOpenChange={setExporting}
        onStart={(r) => {
          if (r.hold) setRows((xs) => xs.map((x) => (x.id === r.channel ? { ...x, hold: r.ref } : x)));
          setActive(r.channel);
          setNotice(
            `Export ${r.ref} started for #${r.channel}, 1 September to 31 October 2026.${r.hold ? " Messages in the range are on hold." : ""} The archive appears in Audit when it is ready.`,
          );
        }}
      />
    </>
  );
}

const PAGES = {
  channel: () => <ChannelPage />,
  search: () => <SearchPage />,
  people: () => <PeoplePage />,
  channels: () => <ChannelsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="chat" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Channel: Story = {
  ...app("channel"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "ops-oncall" })).toBeInTheDocument();

    // The alert's thread is open: the rollback and the incident it opened.
    const thread = c.getByRole("region", { name: "Thread" });
    await expect(thread).toHaveTextContent("Opened INC-2041");
    await expect(c.getByRole("button", { name: "6 replies" })).toHaveAttribute("aria-pressed", "true");
    await expect(c.getByRole("log", { name: "Messages in #ops-oncall" })).toHaveTextContent("@Emily Clark can we move the deploy window");

    // The channel shared with Northwind says who else reads it.
    await userEvent.click(c.getByRole("button", { name: /northwind-shared/ }));
    await expect(c.getByRole("heading", { level: 1, name: "northwind-shared" })).toBeInTheDocument();
    await expect(c.getByText("2 guests from Northwind")).toBeInTheDocument();
    await expect(c.getByRole("region", { name: "About this channel" })).toHaveTextContent("Guests see only this channel");

    // Opening a channel clears its unread count.
    await userEvent.click(c.getByRole("button", { name: /^sales/ }));
    await expect(c.getByRole("button", { name: /^sales/ })).toHaveAccessibleName("sales");

    // Back to the on-call channel with the alert's thread, as the product page shows it.
    await userEvent.click(c.getByRole("button", { name: /^ops-oncall/ }));
    await userEvent.click(c.getByRole("button", { name: "6 replies" }));
    await expect(c.getByRole("region", { name: "Thread" })).toBeInTheDocument();
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const ReplyInThread: Story = {
  name: "Reply in a thread",
  ...app("channel"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const thread = c.getByRole("region", { name: "Thread" });
    await userEvent.type(within(thread).getByRole("textbox", { name: "Reply in thread" }), "Postmortem review moves to Thursday so Dana can join.");
    await userEvent.click(within(thread).getByRole("checkbox", { name: "Also send to #ops-oncall" }));
    await userEvent.click(within(thread).getByRole("button", { name: "Reply" }));
    await expect(within(thread).getByRole("log", { name: "Replies" })).toHaveTextContent("Postmortem review moves to Thursday");
    await expect(c.getByRole("button", { name: "7 replies" })).toBeInTheDocument();
    await expect(c.getByRole("log", { name: "Messages in #ops-oncall" })).toHaveTextContent("Postmortem review moves to Thursday");
  },
};

export const ReactToMessage: Story = {
  name: "React to a message",
  ...app("channel"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const log = c.getByRole("log", { name: "Messages in #ops-oncall" });
    const plus = within(log).getByRole("button", { name: "➕ 4" });
    await userEvent.click(plus);
    await expect(plus).toHaveAttribute("aria-pressed", "true");
    await expect(plus).toHaveTextContent("5");
  },
};

export const Search: Story = {
  ...app("search"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const results = () => within(c.getByRole("list", { name: "Search results" })).getAllByRole("listitem");
    await expect(results()).toHaveLength(7);
    // A private channel shows up only because Emily is in it.
    await expect(c.getByRole("list", { name: "Search results" })).toHaveTextContent("leadership");

    await userEvent.selectOptions(c.getByRole("combobox", { name: "In" }), "deploys");
    await expect(results()).toHaveLength(1);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "In" }), "");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "When" }), "today");
    await expect(results()).toHaveLength(4);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "When" }), "any");

    await userEvent.click(c.getByRole("tab", { name: /Files/ }));
    await expect(
      within(c.getByRole("table", { name: "Files" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(2);
    await userEvent.click(c.getByRole("tab", { name: /Messages/ }));
    await expect(results()).toHaveLength(7);
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const People: Story = {
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "People" });
    await expect(c.getByRole("region", { name: "Person" })).toHaveTextContent("#northwind-shared");
    await userEvent.click(c.getByRole("tab", { name: /Guests/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await userEvent.click(c.getByRole("tab", { name: /Everyone/ }));
    await userEvent.click(within(table).getByText(PEOPLE[4]));
    await expect(c.getByRole("region", { name: "Person" })).toHaveTextContent("On call this week");
    await expect(c.getByRole("region", { name: "Person" })).not.toHaveTextContent("Guest access");
    await userEvent.click(within(table).getByText("Dana Brooks"));
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const Channels: Story = {
  ...app("channels"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const settings = c.getByRole("region", { name: "Channel settings" });
    await expect(within(settings).getByLabelText("channels.yaml entry")).toHaveTextContent("retention: 1y");
    // A channel from the file is changed in the file, not here.
    await expect(within(settings).getByRole("combobox", { name: "Keep messages for" })).toBeDisabled();
    // A channel its members made: a shorter retention says what it deletes.
    const table = c.getByRole("table", { name: /channels/i });
    await userEvent.click(within(table).getByText("random"));
    const random = c.getByRole("region", { name: "Channel settings" });
    await userEvent.selectOptions(within(random).getByRole("combobox", { name: "Keep messages for" }), "30d");
    await expect(within(random).getByRole("status")).toHaveTextContent("2,130 messages older than 30 days are deleted at 03:00 tonight.");
    await userEvent.selectOptions(within(random).getByRole("combobox", { name: "Keep messages for" }), "90d");
    await expect(within(random).queryByRole("status")).not.toBeInTheDocument();
    await userEvent.click(within(table).getByText("ops-oncall"));
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const LegalExport: Story = {
  name: "Export for a legal request",
  ...app("channels"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Export for a legal request" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Export for a legal request" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Request reference" }), "LR-2026-08");
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Channel" }), "ops-oncall");
    await userEvent.click(within(dialog).getByRole("button", { name: "Start export" }));
    await expect(c.getAllByRole("status")[0]).toHaveTextContent("Export LR-2026-08 started for #ops-oncall");
    await expect(c.getByRole("region", { name: "Channel settings" })).toHaveTextContent("Legal hold LR-2026-08");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
