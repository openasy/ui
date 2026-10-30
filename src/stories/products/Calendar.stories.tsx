import { useState, type CSSProperties, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BookUser, CalendarDays, ChevronLeft, ChevronRight, Copy, DoorOpen, Mail, MapPin, Plus, Repeat, Share2, Smartphone, Users, Video } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Dialog } from "../../components/Dialog";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import { PEOPLE, emailOf } from "../mocks";

const nav = [
  { id: "week", label: "Calendar", icon: CalendarDays },
  { id: "rooms", label: "Rooms", icon: DoorOpen },
  { id: "contacts", label: "Contacts", icon: BookUser },
  { id: "calendars", label: "Sharing", icon: Share2 },
];

const meta = {
  title: "Products/Calendar",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = PEOPLE[1];

/** A calendar's colour, from the chart palette so it holds in both themes. */
type Hue = "chart-1" | "chart-2" | "chart-3" | "chart-4";

interface CalendarDef {
  id: string;
  name: string;
  hue: Hue;
  /** Whose it is; someone else's calendars may show only free and busy. */
  owner: string;
  access: "owner" | "edit" | "read" | "busy";
}

const CALENDARS: CalendarDef[] = [
  { id: "me", name: ME, hue: "chart-1", owner: ME, access: "owner" },
  { id: "sales", name: "Sales team", hue: "chart-2", owner: "Sales team", access: "edit" },
  { id: "company", name: "Company", hue: "chart-3", owner: "People team", access: "read" },
  { id: "dana", name: PEOPLE[0], hue: "chart-4", owner: PEOPLE[0], access: "busy" },
];

type Answer = "yes" | "maybe" | "no" | "pending";

const ANSWER: Record<Answer, { label: string; tone: Tone }> = {
  yes: { label: "Going", tone: "success" },
  maybe: { label: "Maybe", tone: "warning" },
  no: { label: "Not going", tone: "danger" },
  pending: { label: "No answer yet", tone: "neutral" },
};

interface Guest {
  name: string;
  email: string;
  answer: Answer;
}

interface CalEvent {
  id: string;
  title: string;
  calendar: string;
  /** 0 is Monday 2 November. */
  day: number;
  /** Hours from midnight, 9.5 is 09:30. */
  start: number;
  end: number;
  room?: string;
  meet?: boolean;
  repeats?: string;
  organizer: string;
  guests: Guest[];
  /** My own answer to it. */
  answer: Answer;
  note?: string;
}

const g = (name: string, answer: Answer = "yes"): Guest => ({ name, email: emailOf(name), answer });
const outside = (name: string, email: string, answer: Answer = "yes"): Guest => ({ name, email, answer });

const STANDUP = (day: number): CalEvent => ({
  id: `standup-${day}`,
  title: "Sales stand-up",
  calendar: "sales",
  day,
  start: 9.5,
  end: 9.75,
  meet: true,
  repeats: "Every weekday",
  organizer: PEOPLE[3],
  guests: [g(PEOPLE[3]), g(ME), g(PEOPLE[6]), g(PEOPLE[7], "maybe")],
  answer: "yes",
});

const EVENTS: CalEvent[] = [
  ...[0, 1, 2, 3, 4].map(STANDUP),
  {
    id: "pipeline",
    title: "Pipeline review",
    calendar: "sales",
    day: 0,
    start: 11,
    end: 12,
    room: "Kyoto",
    organizer: PEOPLE[3],
    guests: [g(PEOPLE[3]), g(ME), g(PEOPLE[6])],
    answer: "yes",
  },
  {
    id: "interview",
    title: "Interview: account executive",
    calendar: "me",
    day: 0,
    start: 14,
    end: 15,
    room: "Lisbon",
    organizer: PEOPLE[5],
    guests: [g(PEOPLE[5]), g(ME), outside("Nora Hill", "nora.hill@mail.example")],
    answer: "yes",
    note: "Second round. Scorecard in Recruiting.",
  },
  {
    id: "northwind-contract",
    title: "Northwind contract call",
    calendar: "me",
    day: 1,
    start: 10.5,
    end: 11.5,
    meet: true,
    organizer: ME,
    guests: [g(ME), outside("Dana Brooks", "dana@northwind.example"), g(PEOPLE[6])],
    answer: "yes",
  },
  {
    id: "lunch-ben",
    title: "Lunch with Ben",
    calendar: "me",
    day: 1,
    start: 12.5,
    end: 13.5,
    organizer: ME,
    guests: [g(ME), g(PEOPLE[4])],
    answer: "yes",
  },
  {
    id: "one-on-one",
    title: "1:1 Mark",
    calendar: "me",
    day: 1,
    start: 15.5,
    end: 16,
    repeats: "Every second Tuesday",
    organizer: ME,
    guests: [g(ME), g(PEOPLE[2])],
    answer: "yes",
  },
  {
    id: "planning",
    title: "Quarterly planning",
    calendar: "company",
    day: 2,
    start: 11,
    end: 12.5,
    room: "Atlas",
    meet: true,
    organizer: PEOPLE[7],
    guests: [g(PEOPLE[7]), g(ME), g(PEOPLE[3]), g(PEOPLE[4]), g(PEOPLE[5]), g(PEOPLE[6], "maybe"), g(PEOPLE[0], "no"), g(PEOPLE[2], "no")],
    answer: "yes",
  },
  {
    id: "rehearsal",
    title: "Demo rehearsal",
    calendar: "me",
    day: 2,
    start: 13.5,
    end: 14.5,
    room: "Lisbon",
    organizer: ME,
    guests: [g(ME), g(PEOPLE[6])],
    answer: "yes",
  },
  {
    id: "security-review",
    title: "Security review",
    calendar: "me",
    day: 2,
    start: 16,
    end: 17,
    meet: true,
    organizer: PEOPLE[4],
    guests: [g(PEOPLE[4]), g(ME, "maybe"), g(PEOPLE[0])],
    answer: "maybe",
  },
  {
    id: "hiring",
    title: "Hiring sync",
    calendar: "sales",
    day: 3,
    start: 10,
    end: 10.75,
    organizer: PEOPLE[5],
    guests: [g(PEOPLE[5]), g(ME), g(PEOPLE[3])],
    answer: "yes",
  },
  {
    id: "demo",
    title: "Demo: Northwind",
    calendar: "me",
    day: 3,
    start: 14,
    end: 15,
    room: "Lisbon",
    meet: true,
    organizer: ME,
    guests: [g(ME), g(PEOPLE[6]), outside("Dana Brooks", "dana@northwind.example"), outside("Leo Park", "leo@northwind.example", "pending")],
    answer: "yes",
    note: "Show the support portal and the reporting. Leo joins from Seoul over Meet.",
  },
  {
    id: "budget",
    title: "Budget check-in",
    calendar: "me",
    day: 3,
    start: 16.5,
    end: 17,
    organizer: PEOPLE[5],
    guests: [g(PEOPLE[5]), g(ME, "pending")],
    answer: "pending",
  },
  {
    id: "team-lunch",
    title: "Team lunch",
    calendar: "sales",
    day: 4,
    start: 12,
    end: 13,
    organizer: PEOPLE[3],
    guests: [g(PEOPLE[3]), g(ME), g(PEOPLE[6]), g(PEOPLE[7])],
    answer: "yes",
  },
  {
    id: "board-prep",
    title: "Board prep",
    calendar: "company",
    day: 4,
    start: 15,
    end: 16.5,
    room: "Atlas",
    organizer: PEOPLE[7],
    guests: [g(PEOPLE[7]), g(ME, "maybe"), g(PEOPLE[5])],
    answer: "maybe",
  },
];

/** Dana's calendar is shared as free and busy only: the times show, not what they are. */
const BUSY: Array<{ day: number; start: number; end: number }> = [
  { day: 0, start: 9, end: 12 },
  { day: 1, start: 13, end: 15.5 },
  { day: 2, start: 11, end: 12.5 },
  { day: 3, start: 9, end: 10 },
  { day: 3, start: 13.5, end: 16 },
  { day: 4, start: 10, end: 11 },
];

const ALL_DAY: Array<{ id: string; title: string; calendar: string; from: number; to: number; note: string }> = [
  { id: "leave", title: `${PEOPLE[2]} on leave`, calendar: "company", from: 0, to: 2, note: "From HR" },
  { id: "cutoff", title: "Payroll cut-off", calendar: "company", from: 3, to: 3, note: "Company" },
];

const DAYS = [
  { short: "Mon", date: 2 },
  { short: "Tue", date: 3 },
  { short: "Wed", date: 4 },
  { short: "Thu", date: 5 },
  { short: "Fri", date: 6 },
];
const TODAY = 2;
const NOW = 14 + 20 / 60;
const FIRST_HOUR = 8;
const LAST_HOUR = 18;
const HOUR_PX = 46;

const hhmm = (h: number) => `${String(Math.floor(h)).padStart(2, "0")}:${String(Math.round((h % 1) * 60)).padStart(2, "0")}`;
const span = (e: { start: number; end: number }) => `${hhmm(e.start)} to ${hhmm(e.end)}`;
const calOf = (id: string) => CALENDARS.find((c) => c.id === id) ?? CALENDARS[0]!;

/** The soft fill and strong edge a calendar's events are drawn with. */
const tint = (hue: Hue, strength = 16): CSSProperties => ({
  backgroundColor: `color-mix(in oklab, var(--oa-${hue}) ${strength}%, var(--oa-surface))`,
  borderColor: `var(--oa-${hue})`,
});

/* ----------------------------------------------------------- mini month */

/** November 2026, weeks starting on Monday; the shown week and today are marked. */
function MiniMonth() {
  // 1 November 2026 is a Sunday, so the first row starts on 26 October.
  const cells = Array.from({ length: 35 }, (_, i) => i - 5);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-fg">November 2026</span>
        <span className="flex">
          <IconButton label="Previous month" size="xs">
            <ChevronLeft className="size-3.5" />
          </IconButton>
          <IconButton label="Next month" size="xs">
            <ChevronRight className="size-3.5" />
          </IconButton>
        </span>
      </div>
      <div aria-hidden className="grid grid-cols-7 text-center text-2xs text-fg-subtle">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <span key={i}>{d}</span>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-y-0.5 text-center text-xs tabular-nums">
        {cells.map((n) => {
          const inMonth = n >= 1 && n <= 30;
          const shown = n >= 2 && n <= 6;
          const today = n === 4;
          return (
            <span
              key={n}
              aria-current={today ? "date" : undefined}
              className={cn(
                "mx-auto grid size-6 place-items-center rounded-full",
                !inMonth && "text-fg-subtle",
                shown && !today && "bg-accent-soft text-accent-text",
                today && "bg-accent font-semibold text-accent-contrast",
              )}
            >
              {inMonth ? n : n < 1 ? 31 + n : n - 30}
            </span>
          );
        })}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- week */

function EventBlock({ e, active, onOpen }: { e: CalEvent; active: boolean; onOpen: () => void }) {
  const cal = calOf(e.calendar);
  const top = (e.start - FIRST_HOUR) * HOUR_PX;
  const height = Math.max((e.end - e.start) * HOUR_PX - 2, 18);
  const short = e.end - e.start <= 0.5;
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-pressed={active}
      className={cn(
        "absolute inset-x-0.5 flex flex-col overflow-hidden rounded border-l-[3px] px-1.5 text-left text-2xs leading-tight text-fg",
        short ? "justify-center py-0" : "py-1",
        e.answer === "pending" && "border border-l-[3px] border-dashed",
        e.answer === "maybe" && "opacity-80",
        active && "ring-2 ring-accent ring-offset-1 ring-offset-surface",
      )}
      style={{ top, height, ...(e.answer === "pending" ? { ...tint(cal.hue, 4) } : tint(cal.hue)) }}
    >
      <span className="truncate font-semibold">{e.title}</span>
      {!short && (
        <span aria-hidden className="truncate text-fg-muted">
          {hhmm(e.start)}
          {e.room && ` · ${e.room}`}
        </span>
      )}
      <span className="sr-only">
        , {DAYS[e.day]?.short} {span(e)}
        {e.room && `, ${e.room}`}
        {e.answer === "pending" && ", not answered"}
      </span>
    </button>
  );
}

function EventDetail({ e, onAnswer }: { e: CalEvent; onAnswer: (a: Exclude<Answer, "pending">) => void }) {
  const cal = calOf(e.calendar);
  const day = DAYS[e.day]!;
  const going = e.guests.filter((x) => x.answer === "yes").length;
  return (
    <Panel
      aria-label="Event"
      title={e.title}
      description={`${day.short} ${day.date} November · ${span(e)}`}
      actions={<span aria-hidden className="size-2.5 rounded-full" style={{ backgroundColor: `var(--oa-${cal.hue})` }} />}
    >
      <div className="flex flex-col gap-3 text-sm">
        <dl className="grid grid-cols-[18px_minmax(0,1fr)] items-start gap-x-2 gap-y-1.5 text-xs">
          {e.room && (
            <>
              <dt>
                <MapPin aria-label="Room" className="size-3.5 text-fg-muted" />
              </dt>
              <dd className="text-fg">{e.room}, booked</dd>
            </>
          )}
          {e.meet && (
            <>
              <dt>
                <Video aria-label="Video call" className="size-3.5 text-fg-muted" />
              </dt>
              <dd>
                <a href={`#meet/${e.id}`} className="text-accent-text">
                  meet.example.com/{e.id}
                </a>
              </dd>
            </>
          )}
          {e.repeats && (
            <>
              <dt>
                <Repeat aria-label="Repeats" className="size-3.5 text-fg-muted" />
              </dt>
              <dd className="text-fg">{e.repeats}</dd>
            </>
          )}
          <dt>
            <CalendarDays aria-label="Calendar" className="size-3.5 text-fg-muted" />
          </dt>
          <dd className="text-fg">
            {cal.name} · organised by {e.organizer === ME ? "you" : e.organizer}
          </dd>
        </dl>
        {e.note && <p className="rounded-md bg-canvas px-2.5 py-2 text-xs text-fg">{e.note}</p>}
        <section className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold text-fg-muted">
            Guests · {going} of {e.guests.length} going
          </h3>
          <ul aria-label="Guests" className="flex flex-col gap-1">
            {e.guests.map((x) => (
              <li key={x.email} className="flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-1.5">
                  <Avatar name={x.name} size="sm" className="size-5" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-xs text-fg">{x.name === ME ? `${x.name} (you)` : x.name}</span>
                    {!x.email.endsWith("@example.com") && <span className="truncate text-2xs text-fg-muted">{x.email}</span>}
                  </span>
                </span>
                <StatusBadge tone={ANSWER[x.answer].tone}>{ANSWER[x.answer].label}</StatusBadge>
              </li>
            ))}
          </ul>
        </section>
        {e.organizer !== ME && (
          <section className="flex flex-col gap-1.5 border-t border-line pt-3">
            <span className="text-xs font-semibold text-fg-muted">Your answer</span>
            <SegmentedControl<Answer>
              label="Your answer"
              value={e.answer}
              onChange={(a) => a !== "pending" && onAnswer(a)}
              options={[
                { value: "yes", label: "Going" },
                { value: "maybe", label: "Maybe" },
                { value: "no", label: "Not going" },
              ]}
            />
          </section>
        )}
        {e.meet && (
          <Button variant="primary" icon={<Video />} className="self-start">
            Join with Meet
          </Button>
        )}
      </div>
    </Panel>
  );
}

const ROOM_NAMES = ["Atlas", "Lisbon", "Kyoto", "Focus booth"];

function NewEventDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (e: CalEvent) => void }) {
  const [title, setTitle] = useState("");
  const [day, setDay] = useState("4");
  const [start, setStart] = useState("10");
  const [room, setRoom] = useState("");
  const [meetLink, setMeetLink] = useState(true);
  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    if (!title.trim()) return;
    const s = Number(start);
    onAdd({
      id: `new-${title}`,
      title: title.trim(),
      calendar: "me",
      day: Number(day),
      start: s,
      end: s + 1,
      room: room || undefined,
      meet: meetLink,
      organizer: ME,
      guests: [g(ME)],
      answer: "yes",
    });
    setTitle("");
    onOpenChange(false);
  };
  // Rooms booked at the chosen time are listed but cannot be picked.
  const taken = (r: string) => EVENTS.some((e) => e.room === r && e.day === Number(day) && e.start < Number(start) + 1 && e.end > Number(start));
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New event"
      description="Guests get an invitation by email, so any calendar app can answer it."
      onSubmit={submit}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save and invite
          </Button>
        </>
      }
    >
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Call with Contoso" />
      <div className="grid grid-cols-2 gap-2">
        <SelectField
          label="Day"
          value={day}
          onChange={(e) => setDay(e.target.value)}
          options={DAYS.map((d, i) => ({ value: String(i), label: `${d.short} ${d.date} November` }))}
        />
        <SelectField
          label="Time"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          options={Array.from({ length: 9 }, (_, i) => ({ value: String(9 + i), label: `${hhmm(9 + i)} to ${hhmm(10 + i)}` }))}
        />
      </div>
      <TextField label="Guests" placeholder="Names or email addresses, from the directory or outside" />
      <SelectField
        label="Room"
        value={room}
        onChange={(e) => setRoom(e.target.value)}
        options={[{ value: "", label: "No room" }, ...ROOM_NAMES.map((r) => ({ value: r, label: taken(r) ? `${r} (booked then)` : r }))]}
      />
      <Checkbox
        label="Add a Meet link"
        description="Guests outside the company can join from a browser."
        checked={meetLink}
        onChange={(e) => setMeetLink(e.target.checked)}
      />
    </Dialog>
  );
}

/** A person's week: their own and shared calendars side by side, invitations to answer, and the open event. */
function WeekPage() {
  const [events, setEvents] = useState(EVENTS);
  const [shown, setShown] = useState<Record<string, boolean>>({ me: true, sales: true, company: true, dana: false });
  const [open, setOpen] = useState("demo");
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const visible = events.filter((e) => shown[e.calendar] && e.answer !== "no");
  const pending = events.filter((e) => e.answer === "pending");
  const current = events.find((e) => e.id === open);
  const answer = (id: string, a: Exclude<Answer, "pending">) => {
    const e = events.find((x) => x.id === id);
    setEvents((xs) => xs.map((x) => (x.id === id ? { ...x, answer: a, guests: x.guests.map((y) => (y.name === ME ? { ...y, answer: a } : y)) } : x)));
    if (e) setNotice(`${ANSWER[a].label}: ${e.title}. ${e.organizer} gets your answer by email.`);
  };
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  return (
    <>
      <PageHeader
        title="2 to 6 November 2026"
        description="Week 45 · Europe/Istanbul"
        actions={
          <>
            <SegmentedControl
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: "day", label: "Day" },
                { value: "week", label: "Week" },
                { value: "month", label: "Month" },
              ]}
            />
            <span className="flex items-center">
              <IconButton label="Previous week">
                <ChevronLeft className="size-4" />
              </IconButton>
              <Button variant="ghost">Today</Button>
              <IconButton label="Next week">
                <ChevronRight className="size-4" />
              </IconButton>
            </span>
            <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
              New event
            </Button>
          </>
        }
      />
      {notice && (
        <div role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[208px_minmax(0,1fr)_288px]">
        <div className="flex flex-col gap-2.5">
          <Panel>
            <MiniMonth />
          </Panel>
          <Panel title="Calendars">
            <ul aria-label="Calendars" className="flex flex-col gap-1.5">
              {CALENDARS.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span aria-hidden className="mt-1 size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: `var(--oa-${c.hue})` }} />
                  <Checkbox
                    label={c.name}
                    description={
                      c.access === "busy"
                        ? "Free and busy only"
                        : c.access === "owner"
                          ? undefined
                          : c.access === "edit"
                            ? "Shared, can edit"
                            : "Shared, read only"
                    }
                    checked={shown[c.id] ?? false}
                    onChange={(e) => setShown((s) => ({ ...s, [c.id]: e.target.checked }))}
                    className="min-w-0"
                  />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        <Panel flush aria-label="Week">
          <div className="grid grid-cols-[44px_repeat(5,minmax(0,1fr))] border-b border-line">
            <span />
            {DAYS.map((d, i) => (
              <span
                key={d.date}
                className={cn("flex items-baseline gap-1 border-l border-subtle px-2 py-1.5 text-xs", i === TODAY ? "text-accent-text" : "text-fg-muted")}
              >
                {d.short}
                <span className={cn("text-base font-semibold tabular-nums", i === TODAY ? "text-accent-text" : "text-fg")}>{d.date}</span>
              </span>
            ))}
          </div>
          <div className="relative grid grid-cols-[44px_repeat(5,minmax(0,1fr))] border-b border-line py-1" aria-label="All day" role="group">
            <span className="self-center pr-1.5 text-right text-2xs text-fg-subtle">All day</span>
            {ALL_DAY.filter((a) => shown[a.calendar]).map((a) => (
              <span
                key={a.id}
                className="mx-0.5 truncate rounded border-l-[3px] px-1.5 py-0.5 text-2xs font-medium text-fg"
                style={{ gridColumn: `${a.from + 2} / ${a.to + 3}`, gridRow: 1, ...tint(calOf(a.calendar).hue) }}
                title={a.note}
              >
                {a.title}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-[44px_repeat(5,minmax(0,1fr))]">
            <div className="relative" style={{ height: (LAST_HOUR - FIRST_HOUR) * HOUR_PX }}>
              {hours.map((h) => (
                <span key={h} className="absolute right-1.5 -translate-y-1/2 text-2xs text-fg-subtle tabular-nums" style={{ top: (h - FIRST_HOUR) * HOUR_PX }}>
                  {h === FIRST_HOUR ? "" : hhmm(h)}
                </span>
              ))}
            </div>
            {DAYS.map((d, i) => (
              <div
                key={d.date}
                role="list"
                aria-label={`${d.short} ${d.date} November`}
                className={cn("relative border-l border-subtle", i === TODAY && "bg-accent-soft/30")}
                style={{
                  height: (LAST_HOUR - FIRST_HOUR) * HOUR_PX,
                  backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, var(--oa-subtle) ${HOUR_PX - 1}px, var(--oa-subtle) ${HOUR_PX}px)`,
                }}
              >
                {shown.dana &&
                  BUSY.filter((b) => b.day === i).map((b) => (
                    <span
                      key={`${b.day}-${b.start}`}
                      aria-hidden
                      title={`${PEOPLE[0]}: busy ${span(b)}`}
                      className="absolute right-0.5 w-2 rounded-sm"
                      style={{
                        top: (b.start - FIRST_HOUR) * HOUR_PX,
                        height: (b.end - b.start) * HOUR_PX - 2,
                        backgroundImage: `repeating-linear-gradient(135deg, var(--oa-chart-4) 0 2px, transparent 2px 5px)`,
                      }}
                    />
                  ))}
                {visible
                  .filter((e) => e.day === i)
                  .map((e) => (
                    <div key={e.id} role="listitem">
                      <EventBlock e={e} active={open === e.id} onOpen={() => setOpen(e.id)} />
                    </div>
                  ))}
                {i === TODAY && (
                  <span aria-hidden className="absolute inset-x-0 z-10 h-0.5 bg-danger" style={{ top: (NOW - FIRST_HOUR) * HOUR_PX }}>
                    <span className="absolute -top-1 -left-1 size-2.5 rounded-full bg-danger" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </Panel>

        <div className="flex flex-col gap-2.5">
          {pending.length > 0 && (
            <Panel title="To answer" actions={<Badge tone="warning">{pending.length}</Badge>}>
              <ul aria-label="Invitations to answer" className="flex flex-col gap-2">
                {pending.map((e) => (
                  <li key={e.id} className="flex flex-col gap-1.5">
                    <span className="flex flex-col">
                      <span className="text-sm font-medium text-fg">{e.title}</span>
                      <span className="text-xs text-fg-muted">
                        {DAYS[e.day]?.short} {span(e)} · from {e.organizer}
                      </span>
                    </span>
                    <span className="flex gap-1">
                      <Button size="xs" onClick={() => answer(e.id, "yes")}>
                        Going
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => answer(e.id, "maybe")}>
                        Maybe
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => answer(e.id, "no")}>
                        Not going
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {current && <EventDetail key={current.id} e={current} onAnswer={(a) => answer(current.id, a)} />}
        </div>
      </div>
      <NewEventDialog
        open={creating}
        onOpenChange={setCreating}
        onAdd={(e) => {
          setEvents((xs) => [...xs, e]);
          setOpen(e.id);
          setNotice(`${e.title} saved${e.room ? `, ${e.room} booked` : ""}.`);
        }}
      />
    </>
  );
}

/* ---------------------------------------------------------------- rooms */

interface Room {
  name: string;
  seats: number;
  floor: string;
  has: string[];
  bookings: Array<{ start: number; end: number; title: string; by: string; private?: boolean }>;
  /** Who may book it; everyone when empty. */
  bookers?: string;
}

const ROOMS: Room[] = [
  {
    name: "Atlas",
    seats: 14,
    floor: "3rd floor",
    has: ["Screen", "Video bar", "Whiteboard"],
    bookings: [
      { start: 9, end: 10, title: "Leadership weekly", by: PEOPLE[7] },
      { start: 11, end: 12.5, title: "Quarterly planning", by: PEOPLE[7] },
      { start: 15, end: 16.5, title: "Product review", by: PEOPLE[7] },
    ],
    bookers: "Managers",
  },
  {
    name: "Lisbon",
    seats: 6,
    floor: "3rd floor",
    has: ["Screen", "Video bar"],
    bookings: [
      { start: 10, end: 11, title: "Vendor call", by: PEOPLE[2] },
      { start: 13.5, end: 14.5, title: "Demo rehearsal", by: ME },
      { start: 16, end: 17.5, title: "Busy", by: PEOPLE[0], private: true },
    ],
  },
  {
    name: "Kyoto",
    seats: 4,
    floor: "2nd floor",
    has: ["Screen"],
    bookings: [
      { start: 8.5, end: 9.5, title: "Interview prep", by: PEOPLE[5] },
      { start: 13, end: 14, title: "Design crit", by: PEOPLE[6] },
    ],
  },
  { name: "Focus booth", seats: 1, floor: "2nd floor", has: ["Phone stand"], bookings: [{ start: 9.5, end: 11, title: "Busy", by: PEOPLE[4], private: true }] },
  {
    name: "Projector",
    seats: 0,
    floor: "Reception",
    has: ["Equipment, lent out"],
    bookings: [{ start: 13, end: 17, title: "Offsite workshop", by: PEOPLE[3] }],
  },
];

/** Every room's bookings on one day, and what a room accepts on its own. */
function RoomsPage() {
  const [active, setActive] = useState("Lisbon");
  const room = ROOMS.find((r) => r.name === active) ?? ROOMS[0]!;
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR + 1 }, (_, i) => FIRST_HOUR + i);
  const pct = (h: number) => `${((h - FIRST_HOUR) / (LAST_HOUR - FIRST_HOUR)) * 100}%`;
  return (
    <>
      <PageHeader
        title="Rooms"
        description="Rooms and equipment are booked by inviting them to an event. A room accepts when it is free and declines when it is not."
        actions={
          <>
            <span className="flex items-center">
              <IconButton label="Previous day">
                <ChevronLeft className="size-4" />
              </IconButton>
              <span className="px-1.5 text-sm font-medium text-fg">Today, Wednesday 4 November</span>
              <IconButton label="Next day">
                <ChevronRight className="size-4" />
              </IconButton>
            </span>
          </>
        }
      />
      <KpiGrid minWidth={170}>
        <KpiCard label="Rooms and equipment" value="5" icon={DoorOpen} />
        <KpiCard label="Booked today" value="58" unit="%" delta={{ label: "Atlas 4 h of 10", intent: "neutral" }} />
        <KpiCard label="Declined, already booked" value="2" delta={{ label: "this week", intent: "neutral" }} />
        <KpiCard label="Released, nobody came" value="1" delta={{ label: "Kyoto, Tuesday 15:00", intent: "neutral" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush aria-label="Bookings">
          <div className="grid grid-cols-[150px_minmax(0,1fr)] border-b border-line">
            <span className="px-3 py-1.5 text-2xs font-semibold tracking-wide text-fg-muted uppercase">Room</span>
            <span className="relative h-7">
              {hours.map((h) => (
                <span
                  key={h}
                  className="absolute top-1.5 -translate-x-1/2 text-2xs text-fg-subtle tabular-nums first:translate-x-0 last:-translate-x-full"
                  style={{ left: pct(h) }}
                >
                  {hhmm(h)}
                </span>
              ))}
            </span>
          </div>
          <ul aria-label="Rooms" className="flex flex-col">
            {ROOMS.map((r) => (
              <li key={r.name} className={cn("grid grid-cols-[150px_minmax(0,1fr)] border-b border-subtle last:border-0", r.name === active && "bg-canvas")}>
                <button type="button" onClick={() => setActive(r.name)} aria-pressed={r.name === active} className="flex flex-col px-3 py-2 text-left">
                  <span className="text-sm font-medium text-fg">{r.name}</span>
                  <span className="text-2xs text-fg-muted">{r.seats ? `${r.seats} ${r.seats === 1 ? "seat" : "seats"} · ${r.floor}` : r.floor}</span>
                </button>
                <span
                  className="relative my-1.5 mr-3"
                  style={{
                    backgroundImage: `repeating-linear-gradient(to right, var(--oa-subtle) 0 1px, transparent 1px calc(100% / ${LAST_HOUR - FIRST_HOUR}))`,
                  }}
                >
                  {r.bookings.map((b) => (
                    <span
                      key={b.start}
                      title={`${b.title}, ${span(b)}, by ${b.by}`}
                      className={cn(
                        "absolute inset-y-0 flex flex-col justify-center overflow-hidden rounded border-l-[3px] px-1.5 text-2xs leading-tight text-fg",
                      )}
                      style={{
                        left: pct(b.start),
                        width: `calc(${pct(b.end)} - ${pct(b.start)} - 2px)`,
                        ...tint(b.by === ME ? "chart-1" : b.private ? "chart-4" : "chart-2"),
                      }}
                    >
                      <span className="truncate font-semibold">{b.title}</span>
                      <span className="truncate text-fg-muted">{b.by === ME ? "You" : b.by}</span>
                    </span>
                  ))}
                  <span aria-label={`Now, ${hhmm(NOW)}`} role="img" className="absolute inset-y-[-6px] w-0.5 bg-danger" style={{ left: pct(NOW) }} />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel
          aria-label="Room"
          title={room.name}
          description={room.seats ? `${room.seats} ${room.seats === 1 ? "seat" : "seats"} · ${room.floor}` : room.floor}
          actions={
            <Button size="sm" icon={<Plus />}>
              Book
            </Button>
          }
        >
          <div className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap gap-1">
              {room.has.map((h) => (
                <Badge key={h}>{h}</Badge>
              ))}
            </div>
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
              <dt className="text-fg-muted">Address</dt>
              <dd className="font-mono break-all text-fg">{room.name.toLowerCase().replace(/\s+/g, "-")}@rooms.example.com</dd>
              <dt className="text-fg-muted">Accepts</dt>
              <dd className="text-fg">When free, up to 3 months ahead</dd>
              <dt className="text-fg-muted">Who can book</dt>
              <dd className="text-fg">{room.bookers ?? "Everyone"}</dd>
              <dt className="text-fg-muted">Nobody came</dt>
              <dd className="text-fg">Released after 15 minutes if no one checks in</dd>
            </dl>
            <section className="flex flex-col gap-1.5 border-t border-line pt-3">
              <h3 className="text-xs font-semibold text-fg-muted">Today</h3>
              <ul aria-label={`${room.name} today`} className="flex flex-col gap-1">
                {room.bookings.map((b) => (
                  <li key={b.start} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate text-fg">{b.private ? "Private event" : b.title}</span>
                    <span className="shrink-0 font-mono text-fg-muted tabular-nums">{span(b)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- contacts */

interface Contact {
  id: string;
  name: string;
  title: string;
  company: string;
  email: string;
  phone: string;
  book: "directory" | "mine" | "sales";
  next?: string;
}

const CONTACTS: Contact[] = [
  ...PEOPLE.map((name, i): Contact => ({
    id: `d${i}`,
    name,
    title: ["Security engineer", "Head of operations", "Account manager", "Sales lead", "Platform engineer", "People partner", "Account executive", "CEO"][i]!,
    company: "Acme Corp",
    email: emailOf(name),
    phone: `+90 212 555 01${String(10 + i)}`,
    book: "directory",
    next: [
      "Wed 16:00 Security review",
      undefined,
      "Tue 15:30 1:1 Mark",
      "Mon 11:00 Pipeline review",
      "Tue 12:30 Lunch with Ben",
      "Thu 10:00 Hiring sync",
      "Thu 14:00 Demo: Northwind",
      "Wed 11:00 Quarterly planning",
    ][i],
  })),
  {
    id: "c1",
    name: "Dana Brooks",
    title: "Head of support",
    company: "Northwind",
    email: "dana@northwind.example",
    phone: "+44 20 7946 0321",
    book: "sales",
    next: "Thu 14:00 Demo: Northwind",
  },
  {
    id: "c2",
    name: "Leo Park",
    title: "IT director",
    company: "Northwind",
    email: "leo@northwind.example",
    phone: "+82 2 555 0187",
    book: "sales",
    next: "Thu 14:00 Demo: Northwind",
  },
  { id: "c3", name: "Tom Becker", title: "Partner", company: "Contoso", email: "tom@contoso.example", phone: "+49 30 555 0144", book: "sales" },
  {
    id: "c4",
    name: "Nora Hill",
    title: "Candidate",
    company: "",
    email: "nora.hill@mail.example",
    phone: "+90 532 555 0190",
    book: "mine",
    next: "Mon 14:00 Interview",
  },
  {
    id: "c5",
    name: "Ayşe Demir",
    title: "Accountant",
    company: "Demir Mali Müşavirlik",
    email: "ayse@demir-mm.example",
    phone: "+90 216 555 0102",
    book: "mine",
  },
];

const BOOK = { directory: "Company directory", mine: "My contacts", sales: "Sales team" } as const;

/** The company directory from Identity, a person's own address book and the books a team shares. */
function ContactsPage() {
  const [book, setBook] = useState<"all" | Contact["book"]>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("c1");
  const rows = CONTACTS.filter((c) => (book === "all" || c.book === book) && `${c.name} ${c.company} ${c.email}`.toLowerCase().includes(query.toLowerCase()));
  const cur = CONTACTS.find((c) => c.id === active);
  const cols: Column<Contact>[] = [
    {
      id: "name",
      header: "Name",
      width: "30%",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={c.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{c.name}</span>
            <span className="truncate text-2xs text-fg-muted">{c.title}</span>
          </span>
        </span>
      ),
    },
    { id: "company", header: "Company", sortValue: (c) => c.company, cell: (c) => <span className="truncate text-xs">{c.company || "–"}</span> },
    { id: "email", header: "Email", width: "28%", cell: (c) => <span className="block truncate font-mono text-xs">{c.email}</span> },
    { id: "book", header: "Address book", cell: (c) => <Badge tone={c.book === "directory" ? "info" : "neutral"}>{BOOK[c.book]}</Badge> },
  ];
  return (
    <>
      <PageHeader
        title="Contacts"
        description="The company directory comes from Identity and cannot be edited here. Phones and mail apps get all three books over CardDAV."
        actions={
          <>
            <Button>Import vCard</Button>
            <Button variant="primary" icon={<Plus />}>
              New contact
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush>
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2">
            <Tabs
              label="Address book"
              value={book}
              onChange={setBook}
              items={[
                { value: "all", label: "All", count: CONTACTS.length },
                { value: "directory", label: "Company directory", count: CONTACTS.filter((c) => c.book === "directory").length },
                { value: "mine", label: "My contacts", count: CONTACTS.filter((c) => c.book === "mine").length },
                { value: "sales", label: "Sales team", count: CONTACTS.filter((c) => c.book === "sales").length },
              ]}
              className="border-b-0"
            />
            <SearchInput
              label="Search contacts"
              placeholder="Name, company or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mb-1.5 w-56"
            />
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Contacts"
              columns={cols}
              rows={rows}
              getRowId={(c) => c.id}
              onRowClick={(c) => setActive(c.id)}
              activeRowId={active}
              defaultSort={{ id: "name", direction: "asc" }}
              minWidth={640}
            />
          </div>
        </Panel>
        {cur && (
          <Panel aria-label="Contact">
            <div className="flex flex-col gap-3 text-sm">
              <div className="flex items-center gap-2.5">
                <Avatar name={cur.name} />
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-base font-semibold text-fg">{cur.name}</span>
                  <span className="truncate text-xs text-fg-muted">
                    {cur.title}
                    {cur.company && ` · ${cur.company}`}
                  </span>
                </span>
              </div>
              <div className="flex gap-1.5">
                <Button size="sm" icon={<Mail />}>
                  Write
                </Button>
                <Button size="sm" icon={<CalendarDays />}>
                  Invite
                </Button>
              </div>
              <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
                <dt className="text-fg-muted">Email</dt>
                <dd className="truncate font-mono text-fg">{cur.email}</dd>
                <dt className="text-fg-muted">Phone</dt>
                <dd className="font-mono text-fg">{cur.phone}</dd>
                <dt className="text-fg-muted">Book</dt>
                <dd className="text-fg">{BOOK[cur.book]}</dd>
              </dl>
              <section className="flex flex-col gap-1 border-t border-line pt-3">
                <h2 className="text-xs font-semibold text-fg-muted">Next meeting together</h2>
                <p className="text-xs text-fg">{cur.next ?? "None planned"}</p>
              </section>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- sharing */

type Access = "busy" | "read" | "edit";
const ACCESS_LABEL: Record<Access, string> = { busy: "Free and busy", read: "See details", edit: "Edit" };

interface Share {
  id: string;
  calendar: string;
  with: string;
  access: Access;
}

/** Who sees which calendar, the addresses for calendar apps, and meetings to hand over when someone leaves. */
function SharingPage() {
  const [shares, setShares] = useState<Share[]>([
    { id: "s0", calendar: ME, with: "Everyone at Acme Corp", access: "busy" },
    { id: "s1", calendar: ME, with: PEOPLE[3], access: "read" },
    { id: "s2", calendar: ME, with: `${PEOPLE[5]} (assistant)`, access: "edit" },
    { id: "s3", calendar: "Sales team", with: "Sales group in Identity", access: "edit" },
    { id: "s4", calendar: "Company", with: "Everyone at Acme Corp", access: "read" },
  ]);
  const [copied, setCopied] = useState<string | null>(null);
  const cols: Column<Share>[] = [
    {
      id: "calendar",
      header: "Calendar",
      cell: (s) => (
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="size-2.5 rounded-sm"
            style={{ backgroundColor: `var(--oa-${CALENDARS.find((c) => c.name === s.calendar)?.hue ?? "chart-1"})` }}
          />
          <span className="font-medium">{s.calendar}</span>
        </span>
      ),
    },
    { id: "with", header: "Shared with", width: "36%", cell: (s) => <span className="truncate">{s.with}</span> },
    {
      id: "access",
      header: "They can",
      cell: (s) =>
        s.calendar === ME ? (
          <SelectField
            label={<span className="sr-only">Access for {s.with}</span>}
            value={s.access}
            onChange={(e) => setShares((xs) => xs.map((x) => (x.id === s.id ? { ...x, access: e.target.value as Access } : x)))}
            options={(Object.keys(ACCESS_LABEL) as Access[]).map((a) => ({ value: a, label: ACCESS_LABEL[a] }))}
          />
        ) : (
          <span className="text-xs text-fg-muted">{ACCESS_LABEL[s.access]}, set by the owner</span>
        ),
    },
  ];
  const urls = [
    { label: "Calendars (CalDAV)", value: "https://mail.example.com/dav/cal/emily.clark@example.com/" },
    { label: "Contacts (CardDAV)", value: "https://mail.example.com/dav/card/emily.clark@example.com/" },
  ];
  return (
    <>
      <PageHeader
        title="Sharing"
        description="Colleagues see only when you are busy, unless you share more. Team calendars are set in the domains file."
        actions={
          <Button variant="primary" icon={<Users />}>
            Share a calendar
          </Button>
        }
      />
      <Callout tone="warning" title={`${PEOPLE[2]} leaves on 30 November`} action={<Button size="sm">Hand over</Button>}>
        7 meetings organised by Mark are still in the calendar after that day. Hand them to Mark's manager, {ME}, or cancel them with a note to the guests.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel title="Who sees what" flush>
          <DataTable label="Shares" columns={cols} rows={shares} getRowId={(s) => s.id} minWidth={600} />
        </Panel>
        <Panel title="On your phone and computer" description="Add an account of type CalDAV and CardDAV, with a device password from Mail.">
          <div className="flex flex-col gap-2.5">
            {urls.map((u) => (
              <div key={u.label} className="flex flex-col gap-1">
                <span className="text-xs font-medium text-fg">{u.label}</span>
                <span className="flex items-center gap-1 rounded-md bg-canvas px-2 py-1.5">
                  <code className="min-w-0 grow truncate font-mono text-2xs text-fg">{u.value}</code>
                  <IconButton label={`Copy ${u.label}`} size="xs" onClick={() => setCopied(u.label)}>
                    <Copy className="size-3.5" />
                  </IconButton>
                </span>
              </div>
            ))}
            {copied && (
              <p role="status" className="text-xs text-success">
                {copied} address copied.
              </p>
            )}
            <Button size="sm" icon={<Smartphone />} className="self-start">
              Make a device password
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  week: () => <WeekPage />,
  rooms: () => <RoomsPage />,
  contacts: () => <ContactsPage />,
  calendars: () => <SharingPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="calendar" nav={nav} pages={PAGES} initial={initial} /> });

/* ----------------------------------------------------------------- stories */

export const Week: Story = {
  ...app("week"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "2 to 6 November 2026" })).toBeInTheDocument();

    // The demo is open: its room, its Meet link and a guest from outside who has not answered.
    const detail = c.getByRole("region", { name: "Event" });
    await expect(detail).toHaveTextContent("Demo: Northwind");
    await expect(detail).toHaveTextContent("Lisbon, booked");
    await expect(within(detail).getByRole("link", { name: "meet.example.com/demo" })).toBeInTheDocument();
    await expect(detail).toHaveTextContent("leo@northwind.example");

    // Dana's calendar shows only when she is busy.
    await expect(c.queryByTitle(`${PEOPLE[0]}: busy 09:00 to 12:00`)).not.toBeInTheDocument();
    await userEvent.click(c.getByRole("checkbox", { name: /Dana Kim/ }));
    await expect(c.getByTitle(`${PEOPLE[0]}: busy 09:00 to 12:00`)).toBeInTheDocument();

    // Hiding the sales calendar takes its stand-ups off the week.
    const monday = c.getByRole("list", { name: "Mon 2 November" });
    await expect(within(monday).getByRole("button", { name: /Sales stand-up/ })).toBeInTheDocument();
    await userEvent.click(c.getByRole("checkbox", { name: /^Sales team/ }));
    await expect(within(monday).queryByRole("button", { name: /Sales stand-up/ })).not.toBeInTheDocument();

    // Back to the usual view, as the screenshot on the product page shows it.
    await userEvent.click(c.getByRole("checkbox", { name: /^Sales team/ }));
    await userEvent.click(c.getByRole("checkbox", { name: /Dana Kim/ }));
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const AnswerInvitation: Story = {
  name: "Answer an invitation",
  ...app("week"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const invites = c.getByRole("list", { name: "Invitations to answer" });
    await userEvent.click(within(invites).getByRole("button", { name: "Going" }));
    await expect(c.getByRole("status")).toHaveTextContent(`Going: Budget check-in. ${PEOPLE[5]} gets your answer by email.`);
    await expect(c.queryByRole("list", { name: "Invitations to answer" })).not.toBeInTheDocument();
    // The event is no longer drawn as unanswered.
    await expect(within(c.getByRole("list", { name: "Thu 5 November" })).getByRole("button", { name: /Budget check-in/ })).not.toHaveAccessibleName(
      /not answered/,
    );
  },
};

export const NewEvent: Story = {
  name: "New event",
  ...app("week"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New event" }));
    const body = within(canvasElement.ownerDocument.body);
    const dialog = body.getByRole("dialog", { name: "New event" });
    // Atlas is booked on Wednesday at 11:00.
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Day" }), "2");
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Time" }), "11");
    await expect(within(dialog).getByRole("option", { name: "Atlas (booked then)" })).toBeInTheDocument();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Title" }), "Call with Contoso");
    await userEvent.selectOptions(within(dialog).getByRole("combobox", { name: "Room" }), "Kyoto");
    await userEvent.click(within(dialog).getByRole("button", { name: "Save and invite" }));
    await expect(c.getByRole("status")).toHaveTextContent("Call with Contoso saved, Kyoto booked.");
    await expect(within(c.getByRole("list", { name: "Wed 4 November" })).getByRole("button", { name: /Call with Contoso/ })).toBeInTheDocument();
  },
};

export const Rooms: Story = {
  ...app("rooms"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Room" })).toHaveTextContent("lisbon@rooms.example.com");
    // Someone else's private booking shows as busy, not by its title.
    await expect(within(c.getByRole("list", { name: "Lisbon today" })).getByText("Private event")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: /Atlas/ }));
    await expect(c.getByRole("region", { name: "Room" })).toHaveTextContent("Managers");
    await userEvent.click(c.getByRole("button", { name: /Lisbon/ }));
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const Contacts: Story = {
  ...app("contacts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Contacts" });
    await userEvent.click(c.getByRole("tab", { name: /Sales team/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(3);
    await userEvent.type(c.getByRole("searchbox", { name: "Search contacts" }), "leo");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await userEvent.click(within(table).getByText("Leo Park"));
    await expect(c.getByRole("region", { name: "Contact" })).toHaveTextContent("Thu 14:00 Demo: Northwind");
    await userEvent.clear(c.getByRole("searchbox", { name: "Search contacts" }));
    await userEvent.click(c.getByRole("tab", { name: /All/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(CONTACTS.length);
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const Sharing: Story = {
  ...app("calendars"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const select = c.getByRole("combobox", { name: `Access for ${PEOPLE[3]}` });
    await userEvent.selectOptions(select, "busy");
    await expect(select).toHaveValue("busy");
    await userEvent.click(c.getByRole("button", { name: "Copy Calendars (CalDAV)" }));
    await expect(c.getByText("Calendars (CalDAV) address copied.")).toBeInTheDocument();
    (canvasElement.ownerDocument.activeElement as HTMLElement | null)?.blur();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
