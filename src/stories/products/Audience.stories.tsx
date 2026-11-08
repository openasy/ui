import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FileDown, FileUp, Filter, LayoutDashboard, Plus, Send, Trash2, UserX, Users } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput, SelectField, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { wave } from "../mocks";

// Audience keeps one profile per person, fed by Analytics, Forms, CRM, Messages and imports, matched only by email,
// phone or your own user id. Segments are rules on traits and events that stay up to date as people act.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "people", label: "People", icon: Users },
  { id: "segments", label: "Segments", icon: Filter, count: 6 },
  { id: "imports", label: "Imports", icon: FileUp },
  { id: "requests", label: "Deletion requests", icon: UserX, count: 1 },
];

const meta = {
  title: "Products/Audience",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const fmt = (n: number) => n.toLocaleString("en");

type Source = "Analytics" | "Forms" | "CRM" | "Messages" | "Import" | "API";

interface Event {
  at: string;
  source: Source;
  text: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  userId?: string;
  plan: "Free" | "Pro" | "Business" | "–";
  city: string;
  sector: string;
  sources: Source[];
  last: string;
  segments: string[];
  consent: string;
  events: Event[];
}

const PROFILES: Profile[] = [
  {
    id: "u1",
    name: "Okan Tekin",
    email: "okan@tekinyapi.example.com",
    phone: "+90 532 *** ** 12",
    userId: "u-1042",
    plan: "Free",
    city: "İzmir",
    sector: "Construction",
    sources: ["Analytics", "Forms", "Messages"],
    last: "Today 11:17",
    segments: ["Free users back on pricing", "İzmir"],
    consent: "Email yes, SMS yes · v3",
    events: [
      { at: "Today 11:17", source: "Analytics", text: "Viewed /pricing for the second time this month" },
      { at: "Today 11:15", source: "Analytics", text: "Came from google.com, searched for e-fatura programı" },
      { at: "6 Nov 16:20", source: "Forms", text: "Sent Contact sales: 12 people, e-Fatura and bank feeds" },
      { at: "3 Nov 10:02", source: "Messages", text: "Opened the October newsletter, clicked Pricing" },
      { at: "12 Sep 09:40", source: "Analytics", text: "Signed up as u-1042 on the Free plan" },
    ],
  },
  {
    id: "u2",
    name: "Gizem Avcı",
    email: "gizem@avcilojistik.example.com",
    userId: "u-0877",
    plan: "Business",
    city: "İstanbul",
    sector: "Logistics",
    sources: ["Analytics", "CRM", "Messages"],
    last: "Today 10:48",
    segments: ["Business customers", "Renewal in 60 days"],
    consent: "Email yes · v3",
    events: [
      { at: "Today 10:48", source: "CRM", text: "Deal Avcı Lojistik renewal moved to Proposal" },
      { at: "5 Nov 14:12", source: "Messages", text: "Opened Year-end closing checklist" },
    ],
  },
  {
    id: "u3",
    name: "Murat Kılıç",
    email: "murat.kilic@example.com",
    phone: "+90 505 *** ** 88",
    plan: "–",
    city: "Ankara",
    sector: "Retail",
    sources: ["Forms", "Import"],
    last: "Yesterday",
    segments: ["Webinar: e-Arşiv"],
    consent: "Email yes · v2",
    events: [{ at: "Yesterday 18:30", source: "Forms", text: "Registered for the e-Arşiv webinar" }],
  },
  {
    id: "u4",
    name: "Seda Polat",
    email: "seda@polatgida.example.com",
    userId: "u-1188",
    plan: "Pro",
    city: "Bursa",
    sector: "Food",
    sources: ["Analytics", "CRM"],
    last: "5 Nov",
    segments: ["Pro, never used bank feeds"],
    consent: "No consent for commercial messages",
    events: [{ at: "5 Nov 09:20", source: "Analytics", text: "Viewed /help/connect-your-bank" }],
  },
  {
    id: "u5",
    name: "Kerem Aksoy",
    email: "kerem.aksoy@example.com",
    userId: "u-1201",
    plan: "Free",
    city: "İstanbul",
    sector: "Consulting",
    sources: ["Analytics", "API"],
    last: "4 Nov",
    segments: ["Free users back on pricing"],
    consent: "Email yes · v3",
    events: [{ at: "4 Nov 20:11", source: "Analytics", text: "Viewed /pricing" }],
  },
  {
    id: "u6",
    name: "Nihan Er",
    email: "nihan.er@example.com",
    phone: "+90 542 *** ** 03",
    plan: "–",
    city: "Antalya",
    sector: "Tourism",
    sources: ["Import"],
    last: "28 Oct",
    segments: [],
    consent: "Not asked",
    events: [{ at: "28 Oct 12:00", source: "Import", text: "Imported from fair-visitors-2026.csv" }],
  },
];

const SOURCE_TONE: Record<Source, "neutral" | "info" | "success" | "warning"> = {
  Analytics: "info",
  Forms: "success",
  CRM: "warning",
  Messages: "neutral",
  Import: "neutral",
  API: "neutral",
};

/* -------------------------------------------------------------- overview */

const DAYS14 = Array.from({ length: 14 }, (_, i) =>
  new Date(Date.UTC(2026, 9, 25 + i)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
);
const EVENT_SOURCES = ["Analytics", "Forms", "CRM", "Messages"];
const EVENTS = DAYS14.map((_, i) => [
  Math.round(21000 + Math.sin(i / 2) * 4000 + (i % 7 === 5 || i % 7 === 6 ? -6000 : 0)),
  Math.round(310 + (i % 3) * 40),
  Math.round(520 + Math.cos(i) * 80),
  Math.round(i === 9 ? 14200 : 2400 + (i % 4) * 300),
]);

function OverviewPage() {
  return (
    <>
      <PageHeader title="Overview" description="One profile per person, from every linked product. People are matched only by email, phone or your user id." />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard
          label="Profiles"
          value="52,416"
          icon={Users}
          delta={{ label: "+1,920 in 30 days", direction: "up", intent: "good" }}
          trend={wave(14, { base: 51000, amp: 600, seed: 3 })}
        />
        <KpiCard label="Known by email" value="88%" delta={{ label: "the rest by phone or user id", intent: "neutral" }} />
        <KpiCard label="Merged this month" value="1,284" delta={{ label: "same email or phone from 2 sources", intent: "neutral" }} />
        <KpiCard label="Events today" value="18,902" />
        <KpiCard label="Segments" value="6" delta={{ label: "2 used by Messages", intent: "neutral" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Events by source" description="The last 14 days">
          <StackedBarChart
            label="Events per day by source"
            categories={DAYS14}
            segments={EVENT_SOURCES.map((s) => ({ id: s, name: s }))}
            values={EVENTS}
            height={200}
            xTicks={7}
          />
        </Panel>
        <Panel title="Where profiles came from" description="First seen">
          <BarList
            label="Profiles by first source"
            items={[
              { id: "a", label: "Analytics", value: 24810 },
              { id: "i", label: "Imports", value: 12440 },
              { id: "f", label: "Forms", value: 8102 },
              { id: "c", label: "CRM", value: 5260 },
              { id: "p", label: "API", value: 1804 },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Segments" description="Size now and over 30 days" flush>
        <ul aria-label="Segment sizes" className="grid gap-px bg-line sm:grid-cols-2 xl:grid-cols-3">
          {SEGMENTS.map((s) => (
            <li key={s.id} className="flex flex-col gap-0.5 bg-surface px-3 py-2">
              <span className="truncate text-sm font-medium text-fg">{s.name}</span>
              <span className="flex items-baseline gap-2">
                <span className="font-mono text-lg font-semibold tabular-nums">{fmt(s.size)}</span>
                <span className={cn("text-xs", s.change >= 0 ? "text-success" : "text-danger-text")}>
                  {s.change >= 0 ? "+" : ""}
                  {fmt(s.change)} in 30 d
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- people */

function DeleteDialog({ person, open, onOpenChange, onDelete }: { person: Profile; open: boolean; onOpenChange: (o: boolean) => void; onDelete: () => void }) {
  const [ref, setRef] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Delete ${person.name}?`}
      description="The profile and its events are deleted here and in every linked product. The request is logged without the person's data."
      onSubmit={(e) => {
        e.preventDefault();
        if (ref.trim()) onDelete();
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" disabled={!ref.trim()}>
            Delete everywhere
          </Button>
        </>
      }
    >
      <ul className="flex flex-col gap-1 text-xs">
        {["Audience: profile and 5 events", "Analytics: visits of u-1042", "Forms: 1 answer", "Messages: sends and opens", "CRM: no contact"].map((x) => (
          <li key={x} className="flex items-center gap-2">
            <Trash2 aria-hidden className="size-3 text-fg-muted" />
            {x}
          </li>
        ))}
      </ul>
      <TextField label="Request reference" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="KVKK-2026-031" />
    </Dialog>
  );
}

function ProfilePanel({ p, onDelete }: { p: Profile; onDelete: () => void }) {
  return (
    <Panel aria-label="Profile" title={p.name} description={`${p.city} · ${p.sector}`} actions={p.plan !== "–" && <Badge tone="info">{p.plan}</Badge>}>
      <div className="flex flex-col gap-3">
        <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
          <dt className="text-fg-muted">Email</dt>
          <dd className="truncate font-mono text-fg">{p.email}</dd>
          <dt className="text-fg-muted">Phone</dt>
          <dd className="font-mono text-fg">{p.phone ?? "–"}</dd>
          <dt className="text-fg-muted">User id</dt>
          <dd className="font-mono text-fg">{p.userId ?? "–"}</dd>
          <dt className="text-fg-muted">Sources</dt>
          <dd className="flex flex-wrap gap-1">
            {p.sources.map((s) => (
              <Badge key={s} tone={SOURCE_TONE[s]}>
                {s}
              </Badge>
            ))}
          </dd>
          <dt className="text-fg-muted">Consent</dt>
          <dd className="text-fg">{p.consent}</dd>
          <dt className="text-fg-muted">Segments</dt>
          <dd className="text-fg">{p.segments.length ? p.segments.join(", ") : "None"}</dd>
        </dl>
        <section className="flex flex-col gap-1.5 border-t border-line pt-2.5">
          <h3 className="text-xs font-semibold text-fg-muted">Timeline</h3>
          <ol aria-label="Timeline" className="flex flex-col gap-2">
            {p.events.map((e) => (
              <li key={e.at + e.text} className="flex gap-2 text-xs">
                <Badge tone={SOURCE_TONE[e.source]} className="w-[72px] shrink-0 justify-center">
                  {e.source}
                </Badge>
                <span className="flex min-w-0 flex-col">
                  <span className="text-fg">{e.text}</span>
                  <span className="text-2xs text-fg-muted">{e.at}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" icon={<FileDown />}>
            Export profile
          </Button>
          <Button size="sm" variant="ghost" icon={<Trash2 />} onClick={onDelete}>
            Delete on request
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function PeoplePage() {
  const [rows, setRows] = useState(PROFILES);
  const [query, setQuery] = useState("");
  const [plan, setPlan] = useState("all");
  const [active, setActive] = useState("u1");
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const shown = rows.filter(
    (p) => (plan === "all" || p.plan === plan) && `${p.name} ${p.email} ${p.userId ?? ""}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  const cur = rows.find((p) => p.id === active);
  const cols: Column<Profile>[] = [
    {
      id: "name",
      header: "Person",
      width: "30%",
      sortValue: (p) => p.name,
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={p.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{p.name}</span>
            <span className="truncate text-2xs text-fg-muted">{p.email}</span>
          </span>
        </span>
      ),
    },
    { id: "plan", header: "Plan", cell: (p) => (p.plan === "–" ? <span className="text-xs text-fg-muted">–</span> : <Badge>{p.plan}</Badge>) },
    { id: "city", header: "City", cell: (p) => <span className="text-xs">{p.city}</span> },
    { id: "sources", header: "Sources", align: "right", mono: true, sortValue: (p) => p.sources.length, cell: (p) => p.sources.length },
    { id: "last", header: "Latest activity", cell: (p) => <span className="text-xs whitespace-nowrap">{p.last}</span> },
  ];
  return (
    <>
      <PageHeader
        title="People"
        description="Every profile with its traits and latest activity. Two records are one person only when they share an email, a phone number or your user id."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add a person
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel flush aria-label="All profiles">
          <div className="flex flex-wrap items-end gap-2 px-3 py-2">
            <SearchInput label="Search people" placeholder="Name, email or user id" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
            <SelectField
              aria-label="Plan"
              value={plan}
              onChange={(e) => setPlan(e.target.value)}
              options={[
                { value: "all", label: "Every plan" },
                { value: "Free", label: "Free" },
                { value: "Pro", label: "Pro" },
                { value: "Business", label: "Business" },
              ]}
              className="w-36"
            />
            <span className="ml-auto self-center text-xs text-fg-muted">52,416 profiles</span>
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Profiles"
              columns={cols}
              rows={shown}
              getRowId={(p) => p.id}
              onRowClick={(p) => setActive(p.id)}
              activeRowId={active}
              minWidth={640}
              empty="Nobody matches."
            />
          </div>
        </Panel>
        {cur ? (
          <ProfilePanel key={cur.id} p={cur} onDelete={() => setDeleting(true)} />
        ) : (
          <Panel aria-label="Profile">
            <p className="text-sm text-fg-muted">Choose a person to see their profile.</p>
          </Panel>
        )}
      </div>
      {cur && (
        <DeleteDialog
          key={cur.id}
          person={cur}
          open={deleting}
          onOpenChange={setDeleting}
          onDelete={() => {
            setRows((rs) => rs.filter((r) => r.id !== cur.id));
            setActive("");
            setDeleting(false);
            setNotice(`${cur.name} is deleted here and in Analytics, Forms and Messages. The request is logged.`);
          }}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------- segments */

interface Rule {
  field: string;
  op: string;
  value: string;
}

interface Segment {
  id: string;
  name: string;
  size: number;
  change: number;
  rules: Rule[];
  usedBy: string[];
  owner: string;
}

const SEGMENTS: Segment[] = [
  {
    id: "s1",
    name: "Free users back on pricing",
    size: 412,
    change: 96,
    owner: "Selin Aydın",
    usedBy: ["Messages: Upgrade nudge journey"],
    rules: [
      { field: "Trait plan", op: "is", value: "Free" },
      { field: "Event viewed page /pricing", op: "at least once in", value: "30" },
      { field: "CRM deal", op: "none", value: "open" },
    ],
  },
  {
    id: "s2",
    name: "Business customers",
    size: 1840,
    change: 38,
    owner: "Hakan Yıldız",
    usedBy: ["Messages: Year-end closing checklist"],
    rules: [{ field: "Trait plan", op: "is", value: "Business" }],
  },
  {
    id: "s3",
    name: "Pro, never used bank feeds",
    size: 2210,
    change: -140,
    owner: "Can Öztürk",
    usedBy: [],
    rules: [
      { field: "Trait plan", op: "is", value: "Pro" },
      { field: "Event bank-connected", op: "never", value: "" },
    ],
  },
  {
    id: "s4",
    name: "Renewal in 60 days",
    size: 318,
    change: 12,
    owner: "Hakan Yıldız",
    usedBy: [],
    rules: [{ field: "Trait renewal_date", op: "within", value: "60 days" }],
  },
  {
    id: "s5",
    name: "Webinar: e-Arşiv",
    size: 640,
    change: 640,
    owner: "Selin Aydın",
    usedBy: [],
    rules: [{ field: "Event form Webinar e-Arşiv sent", op: "at least once in", value: "90" }],
  },
  {
    id: "s6",
    name: "İzmir",
    size: 3904,
    change: 51,
    owner: "Emre Koç",
    usedBy: [],
    rules: [{ field: "Trait city", op: "is", value: "İzmir" }],
  },
];

const SIZE_BY_DAYS: Record<string, number> = { "7": 168, "30": 412, "90": 1033 };

function SegmentsPage() {
  const [id, setId] = useState("s1");
  const [days, setDays] = useState("30");
  const [notice, setNotice] = useState<string | null>(null);
  const s = SEGMENTS.find((x) => x.id === id)!;
  const size = s.id === "s1" ? SIZE_BY_DAYS[days]! : s.size;
  const history = wave(30, { base: s.size - s.change / 2, amp: Math.max(4, Math.abs(s.change) / 4), seed: s.id.length + s.size, min: 0 }).map((v, i, a) =>
    i === a.length - 1 ? s.size : Math.round(v + (s.change * i) / 30 - s.change / 2),
  );
  return (
    <>
      <PageHeader
        title="Segments"
        description="Rules on traits and on events in a period. A person is in a segment while its rules hold, and leaves it as soon as they do not."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New segment
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[260px_minmax(0,1fr)]">
        <Panel flush aria-label="Segments">
          <ul className="flex flex-col py-1">
            {SEGMENTS.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => (setId(x.id), setNotice(null))}
                  aria-current={x.id === id ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left",
                    x.id === id ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas",
                  )}
                >
                  <span className="truncate text-sm font-medium">{x.name}</span>
                  <span className="shrink-0 font-mono text-2xs text-fg-muted tabular-nums">{fmt(x.size)}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel
            aria-label="Rules"
            title={s.name}
            description={`Owner ${s.owner} · ${s.usedBy.length ? `used by ${s.usedBy.join(", ")}` : "not used yet"}`}
            actions={
              <>
                <Button size="sm" icon={<FileDown />}>
                  Export CSV
                </Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Send />}
                  onClick={() => setNotice(`${s.name} is ready in Messages as an audience. Each person's consent is checked when it sends.`)}
                >
                  Use in Messages
                </Button>
              </>
            }
          >
            <div className="flex flex-col gap-2">
              <ol aria-label="Rules of the segment" className="flex flex-col gap-1.5">
                {s.rules.map((r, i) => (
                  <li key={r.field} className="flex flex-wrap items-center gap-2 rounded-md border border-line bg-canvas px-2.5 py-1.5 text-sm">
                    <span className="w-12 text-2xs font-semibold text-fg-muted uppercase">{i === 0 ? "Where" : "And"}</span>
                    <span className="font-medium text-fg">{r.field}</span>
                    <span className="text-fg-muted">{r.op}</span>
                    {r.op === "at least once in" && s.id === "s1" ? (
                      <SelectField
                        aria-label="Period"
                        value={days}
                        onChange={(e) => setDays(e.target.value)}
                        options={[
                          { value: "7", label: "the last 7 days" },
                          { value: "30", label: "the last 30 days" },
                          { value: "90", label: "the last 90 days" },
                        ]}
                        className="w-40"
                      />
                    ) : r.op === "at least once in" ? (
                      <span className="text-fg">the last {r.value} days</span>
                    ) : (
                      r.value && <Badge mono>{r.value}</Badge>
                    )}
                  </li>
                ))}
              </ol>
              <p aria-live="polite" className="text-sm text-fg">
                <span className="font-mono text-lg font-semibold tabular-nums">{fmt(size)}</span> people match now
              </p>
            </div>
          </Panel>
          <Panel title="Size over 30 days" description="Counted every night; people join and leave as they act.">
            <TimeSeriesChart
              label={`Size of ${s.name} over 30 days`}
              labels={Array.from({ length: 30 }, (_, i) =>
                new Date(Date.UTC(2026, 9, 9 + i)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
              )}
              series={[{ id: "size", name: "People", data: history, color: "var(--oa-chart-1)" }]}
              height={160}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- imports */

const COLUMNS = [
  { name: "E-posta", sample: "murat.kilic@example.com", to: "email" },
  { name: "Telefon", sample: "0505 *** ** 88", to: "phone" },
  { name: "Ad Soyad", sample: "Murat Kılıç", to: "name" },
  { name: "Şehir", sample: "Ankara", to: "trait:city" },
  { name: "Firma", sample: "Kılıç Ticaret", to: "trait:company" },
  { name: "Not", sample: "Stand B12", to: "skip" },
];

const TARGETS = [
  { value: "email", label: "Email (matches)" },
  { value: "phone", label: "Phone (matches)" },
  { value: "user_id", label: "User id (matches)" },
  { value: "name", label: "Name" },
  { value: "trait:city", label: "Trait: city" },
  { value: "trait:company", label: "Trait: company" },
  { value: "trait:sector", label: "Trait: sector" },
  { value: "skip", label: "Do not import" },
];

const PAST = [
  { id: "i1", file: "fair-visitors-2026.csv", at: "28 Oct", by: "Emre Koç", rows: 1204, created: 1050, matched: 154 },
  { id: "i2", file: "webinar-e-arsiv.csv", at: "7 Oct", by: "Selin Aydın", rows: 640, created: 212, matched: 428 },
];

function ImportsPage() {
  const [map, setMap] = useState(Object.fromEntries(COLUMNS.map((c) => [c.name, c.to])));
  const [done, setDone] = useState(false);
  const keys = Object.values(map).filter((v) => v === "email" || v === "phone" || v === "user_id").length;
  return (
    <>
      <PageHeader
        title="Imports"
        description="People from a CSV: each column goes to an email, phone, user id or a trait. Rows are matched to existing profiles, never guessed."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel aria-label="Map columns" title="izmir-expo-2026.csv" description="812 rows, 6 columns, uploaded by Emre Koç">
          <div className="flex flex-col gap-3">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">Columns of the file</caption>
              <thead className="text-xs text-fg-muted">
                <tr>
                  <th className="py-1 pr-2 font-semibold">Column</th>
                  <th className="py-1 pr-2 font-semibold">First row</th>
                  <th className="py-1 font-semibold">Goes to</th>
                </tr>
              </thead>
              <tbody>
                {COLUMNS.map((c) => (
                  <tr key={c.name} className="border-t border-line">
                    <td className="py-1.5 pr-2 font-mono text-xs">{c.name}</td>
                    <td className="py-1.5 pr-2 text-xs text-fg-muted">{c.sample}</td>
                    <td className="py-1.5">
                      <SelectField
                        aria-label={`${c.name} goes to`}
                        value={map[c.name]}
                        onChange={(e) => setMap({ ...map, [c.name]: e.target.value })}
                        options={TARGETS}
                        className="w-48"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {keys === 0 ? (
              <Callout tone="danger" title="Choose at least one column to match by">
                Without an email, phone or user id a row cannot be matched to a person, so nothing would be imported.
              </Callout>
            ) : (
              <p className="text-xs text-fg-muted">
                Expected: 644 new profiles, 168 matched by email or phone to people already here. Turkish phone numbers are written as +90.
              </p>
            )}
            <div className="flex items-center gap-2">
              <Button variant="primary" icon={<FileUp />} disabled={keys === 0 || done} onClick={() => setDone(true)}>
                Import 812 rows
              </Button>
              {done && (
                <span role="status" className="text-xs text-success">
                  Imported: 644 new, 168 matched. Their consent is not assumed; Consent records only what people agreed to.
                </span>
              )}
            </div>
          </div>
        </Panel>
        <Panel title="Earlier imports" flush>
          <ul aria-label="Earlier imports" className="flex flex-col">
            {PAST.map((p) => (
              <li key={p.id} className="flex flex-col border-b border-subtle px-3 py-2 last:border-0">
                <span className="truncate font-mono text-xs font-medium text-fg">{p.file}</span>
                <span className="text-2xs text-fg-muted">
                  {p.at} · {p.by} · {fmt(p.rows)} rows: {fmt(p.created)} new, {fmt(p.matched)} matched
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- requests */

const REQUESTS = [
  {
    id: "r1",
    ref: "KVKK-2026-031",
    at: "Today 09:30",
    by: "Hakan Yıldız",
    products: { Audience: "done", Analytics: "done", Forms: "done", Messages: "done", CRM: "waiting" },
  },
  {
    id: "r2",
    ref: "KVKK-2026-030",
    at: "29 Oct",
    by: "Hakan Yıldız",
    products: { Audience: "done", Analytics: "done", Forms: "done", Messages: "done", CRM: "done" },
  },
  {
    id: "r3",
    ref: "KVKK-2026-027",
    at: "14 Oct",
    by: "Selin Aydın",
    products: { Audience: "done", Analytics: "done", Forms: "done", Messages: "done", CRM: "done" },
  },
];

function RequestsPage() {
  const cols: Column<(typeof REQUESTS)[number]>[] = [
    { id: "ref", header: "Request", cell: (r) => <span className="font-mono text-xs font-medium">{r.ref}</span> },
    { id: "at", header: "Asked", cell: (r) => <span className="text-xs whitespace-nowrap">{r.at}</span> },
    { id: "by", header: "Recorded by", cell: (r) => <span className="text-xs">{r.by}</span> },
    {
      id: "products",
      header: "Deleted in",
      cell: (r) => (
        <span className="flex flex-wrap gap-1">
          {Object.entries(r.products).map(([p, s]) => (
            <StatusBadge key={p} tone={s === "done" ? "success" : "warning"}>
              {p}
              {s === "done" ? "" : ": waiting"}
            </StatusBadge>
          ))}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Deletion requests"
        description="A person deleted on request is deleted in every linked product too. The log keeps the reference and the time, never the person's data."
      />
      <Callout tone="warning" title="KVKK-2026-031 waits for CRM" className="mb-2.5">
        CRM keeps the contact while an open deal has an invoice not yet paid; it is deleted when the invoice is closed or by hand in CRM.
      </Callout>
      <Panel flush title="Requests">
        <DataTable label="Deletion requests" columns={cols} rows={REQUESTS} getRowId={(r) => r.id} minWidth={720} />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `match_by: [email, phone, user_id]   # never device fingerprints
phone_country: TR
traits:
  plan: { from: api, values: [Free, Pro, Business] }
  city: { from: [forms, import] }
  sector: { from: [crm, forms] }
  renewal_date: { from: crm, type: date }
sources:
  analytics: { identify: true }
  forms: true
  crm: { sync: both_ways }
  messages: true
events:
  keep: 25mo
segments:
  recount: nightly`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="audience"
      file="audience.yaml"
      applied="5 days ago"
      yaml={YAML}
      groups={[
        {
          title: "Matching",
          description: "How two records become one person.",
          items: [
            { label: "Match by", value: "Email, phone or user id; nothing else", path: "match_by" },
            { label: "Phone numbers", value: "Written as +90 when no country is given", path: "phone_country" },
          ],
        },
        {
          title: "Data",
          items: [
            { label: "Traits", value: "plan, city, sector, renewal_date", path: "traits" },
            { label: "Sources", value: "Analytics, Forms, CRM (both ways), Messages", path: "sources" },
            { label: "Events kept", value: "25 months", path: "events.keep" },
          ],
        },
      ]}
    />
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  people: () => <PeoplePage />,
  segments: () => <SegmentsPage />,
  imports: () => <ImportsPage />,
  requests: () => <RequestsPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="audience" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Segment sizes" })).getAllByRole("listitem")).toHaveLength(SEGMENTS.length);
    await expect(c.getByRole("list", { name: "Profiles by first source" })).toHaveTextContent("Analytics");
  },
};

export const People: Story = {
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const profile = c.getByRole("region", { name: "Profile" });
    await expect(within(profile).getByRole("list", { name: "Timeline" })).toHaveTextContent("Viewed /pricing for the second time this month");
    await expect(profile).toHaveTextContent("Free users back on pricing");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Plan" }), "Business");
    const table = c.getByRole("table", { name: "Profiles" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await userEvent.click(within(table).getByText("Gizem Avcı"));
    await expect(c.getByRole("region", { name: "Profile" })).toHaveTextContent("Renewal in 60 days");
    blur(canvasElement);
  },
};

export const DeleteOnRequest: Story = {
  name: "Delete on request",
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Delete on request" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Delete Okan Tekin?" });
    await expect(within(dialog).getByRole("button", { name: "Delete everywhere" })).toBeDisabled();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Request reference" }), "KVKK-2026-032");
    await userEvent.click(within(dialog).getByRole("button", { name: "Delete everywhere" }));
    await expect(c.getByRole("status")).toHaveTextContent("Okan Tekin is deleted here and in Analytics, Forms and Messages.");
    await expect(
      within(c.getByRole("table", { name: "Profiles" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(PROFILES.length - 1);
  },
};

export const Segments: Story = {
  ...app("segments"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const rules = c.getByRole("region", { name: "Rules" });
    await expect(within(rules).getAllByRole("listitem")).toHaveLength(3);
    await expect(rules).toHaveTextContent("412 people match now");
    await userEvent.selectOptions(within(rules).getByRole("combobox", { name: "Period" }), "90");
    await expect(rules).toHaveTextContent("1,033 people match now");
    await userEvent.click(within(rules).getByRole("button", { name: "Use in Messages" }));
    await expect(c.getByRole("status")).toHaveTextContent("Each person's consent is checked when it sends.");
    await userEvent.click(within(c.getByRole("region", { name: "Segments" })).getByRole("button", { name: /Pro, never used bank feeds/ }));
    await expect(c.getByRole("region", { name: "Rules" })).toHaveTextContent("Event bank-connected");
    blur(canvasElement);
  },
};

export const Imports: Story = {
  ...app("imports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "E-posta goes to" }), "skip");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Telefon goes to" }), "skip");
    await expect(c.getByText("Choose at least one column to match by")).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Import 812 rows" })).toBeDisabled();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "E-posta goes to" }), "email");
    await userEvent.click(c.getByRole("button", { name: "Import 812 rows" }));
    await expect(c.getByRole("status")).toHaveTextContent("Imported: 644 new, 168 matched.");
  },
};

export const DeletionRequests: Story = {
  name: "Deletion requests",
  ...app("requests"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("table", { name: "Deletion requests" })).getAllByRole("row")[1]).toHaveTextContent("CRM: waiting");
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("audience.yaml as applied")).toHaveTextContent("never device fingerprints");
  },
};
