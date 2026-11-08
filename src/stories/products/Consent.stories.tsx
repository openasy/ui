import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowDownLeft, ArrowUpRight, Cookie, Copy, FileDown, Globe, LayoutDashboard, ListChecks, Plus, RefreshCw, ShieldCheck, Users } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { DonutChart } from "../../charts/DonutChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { wave } from "../mocks";

// Consent keeps one record per person of what they agreed to, for which purpose and channel, when, and to which
// version of the text. It syncs commercial-message consent with İYS both ways, gives sites a banner and a preference
// page, and answers "may we?" for Messages, Analytics and Forms. Purposes and their texts live in consent.yaml.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "people", label: "People", icon: Users },
  { id: "purposes", label: "Purposes", icon: ListChecks, count: 5 },
  { id: "iys", label: "İYS", icon: RefreshCw, count: 2 },
  { id: "sites", label: "Banner and page", icon: Cookie },
  { id: "checks", label: "Checks", icon: ShieldCheck },
];

const meta = {
  title: "Products/Consent",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

type Channel = "email" | "sms" | "call" | "site";
const CHANNEL: Record<Channel, { label: string; iys?: string }> = {
  email: { label: "Email", iys: "EPOSTA" },
  sms: { label: "SMS", iys: "MESAJ" },
  call: { label: "Call", iys: "ARAMA" },
  site: { label: "Website" },
};

interface Version {
  v: string;
  from: string;
  /** People whose latest yes was given to this version. */
  agreed: number;
  text: string;
}

interface Purpose {
  id: string;
  name: string;
  basis: string;
  channels: Channel[];
  iys: boolean;
  /** Agreed now, per channel. */
  agreed: Partial<Record<Channel, number>>;
  refused: number;
  owner: string;
  versions: Version[];
}

const PURPOSES: Purpose[] = [
  {
    id: "commercial",
    name: "Commercial messages",
    basis: "Explicit consent, recorded in İYS",
    channels: ["email", "sms", "call"],
    iys: true,
    agreed: { email: 18240, sms: 14902, call: 6115 },
    refused: 9877,
    owner: "Selin Aydın",
    versions: [
      {
        v: "v3",
        from: "1 Sep 2026",
        agreed: 9812,
        text: "I agree that Acme and its group company Acme Sigorta may send me offers, campaigns and news about their products by the channels I choose. I can withdraw at any time from the link in each message, by replying STOP, or on the preference page.",
      },
      {
        v: "v2",
        from: "6 Jan 2025",
        agreed: 7903,
        text: "I agree that Acme may send me offers, campaigns and news about its products by the channels I choose. I can withdraw at any time from the link in each message, by replying STOP, or on the preference page.",
      },
      {
        v: "v1",
        from: "4 Mar 2024",
        agreed: 525,
        text: "I would like to receive Acme's campaigns by email and SMS.",
      },
    ],
  },
  {
    id: "measurement",
    name: "Measurement cookies",
    basis: "Explicit consent, asked by the banner",
    channels: ["site"],
    iys: false,
    agreed: { site: 33410 },
    refused: 19802,
    owner: "Emre Koç",
    versions: [
      {
        v: "v2",
        from: "12 May 2026",
        agreed: 30188,
        text: "We count visits and how pages are used, without advertising, so we can make the site better. The data stays on our own servers.",
      },
      { v: "v1", from: "4 Mar 2024", agreed: 3222, text: "We use cookies to measure how the site is used." },
    ],
  },
  {
    id: "advertising",
    name: "Advertising cookies",
    basis: "Explicit consent, asked by the banner",
    channels: ["site"],
    iys: false,
    agreed: { site: 21960 },
    refused: 31252,
    owner: "Emre Koç",
    versions: [
      {
        v: "v1",
        from: "4 Mar 2024",
        agreed: 21960,
        text: "Our advertising partners may set cookies to show you Acme's ads on other sites and measure them.",
      },
    ],
  },
  {
    id: "personalised",
    name: "Personalised offers",
    basis: "Explicit consent for profiling",
    channels: ["email", "sms"],
    iys: false,
    agreed: { email: 11024, sms: 8730 },
    refused: 4410,
    owner: "Selin Aydın",
    versions: [
      {
        v: "v1",
        from: "6 Jan 2025",
        agreed: 11024,
        text: "Acme may use what I bought and the pages I viewed to choose the offers it sends me.",
      },
    ],
  },
  {
    id: "surveys",
    name: "Satisfaction surveys",
    basis: "Explicit consent; not a commercial message",
    channels: ["sms", "call"],
    iys: false,
    agreed: { sms: 6402, call: 2118 },
    refused: 1290,
    owner: "Hakan Yıldız",
    versions: [{ v: "v1", from: "2 Jun 2025", agreed: 6402, text: "Acme may ask me by SMS or phone how satisfied I am after an order or a support request." }],
  },
];

type Value = "yes" | "no";
interface Answer {
  value: Value;
  version: string;
  source: string;
  at: string;
}

interface HistoryEntry {
  id: string;
  at: string;
  purpose: string;
  channel: Channel;
  value: Value;
  version: string;
  source: string;
  how: string;
}

interface Person {
  id: string;
  name: string;
  email: string;
  phone: string;
  /** purpose id → channel → latest answer */
  answers: Record<string, Partial<Record<Channel, Answer>>>;
  history: HistoryEntry[];
  changed: string;
  today?: boolean;
  conflict?: boolean;
  iys: "in-step" | "waiting" | "error";
}

const yes = (version: string, source: string, at: string): Answer => ({ value: "yes", version, source, at });
const no = (version: string, source: string, at: string): Answer => ({ value: "no", version, source, at });

const AYSE: Person = {
  id: "p1",
  name: "Ayşe Yılmaz",
  email: "ayse.yilmaz@example.com",
  phone: "+90 532 *** ** 41",
  changed: "Today 09:12",
  today: true,
  iys: "in-step",
  answers: {
    commercial: {
      email: yes("v2", "Form: Newsletter sign-up", "14 Nov 2025 19:40"),
      sms: no("v2", "İYS: replied STOP", "Today 09:12"),
    },
    measurement: { site: yes("v2", "Cookie banner on shop", "3 Jun 2026 12:05") },
    advertising: { site: no("v1", "Cookie banner on shop", "3 Jun 2026 12:05") },
    personalised: { email: yes("v1", "Form: Newsletter sign-up", "14 Nov 2025 19:40") },
  },
  history: [
    {
      id: "h4",
      at: "Today 09:12",
      purpose: "commercial",
      channel: "sms",
      value: "no",
      version: "v2",
      source: "İYS",
      how: "Replied STOP to an SMS from Fall offers; reported by the SMS provider to İYS, picked up at 09:12",
    },
    {
      id: "h3",
      at: "3 Jun 2026 12:05",
      purpose: "measurement",
      channel: "site",
      value: "yes",
      version: "v2",
      source: "Cookie banner",
      how: "Chose on shop.example.com: measurement yes, advertising no",
    },
    {
      id: "h2",
      at: "14 Nov 2025 19:41",
      purpose: "commercial",
      channel: "email",
      value: "yes",
      version: "v2",
      source: "İYS",
      how: "Sent to İYS as ONAY, accepted",
    },
    {
      id: "h1",
      at: "14 Nov 2025 19:40",
      purpose: "commercial",
      channel: "sms",
      value: "yes",
      version: "v2",
      source: "Forms",
      how: "Ticked the box on Newsletter sign-up, with email and SMS chosen",
    },
  ],
};

const PEOPLE_ROWS: Person[] = [
  AYSE,
  {
    id: "p2",
    name: "Mehmet Demir",
    email: "mehmet.demir@example.com",
    phone: "+90 533 *** ** 07",
    changed: "Today 08:47",
    today: true,
    iys: "waiting",
    answers: {
      commercial: {
        email: yes("v3", "Preference page", "Today 08:47"),
        sms: yes("v3", "Preference page", "Today 08:47"),
        call: yes("v3", "Preference page", "Today 08:47"),
      },
      measurement: { site: yes("v2", "Cookie banner on shop", "Today 08:45") },
    },
    history: [
      {
        id: "h1",
        at: "Today 08:47",
        purpose: "commercial",
        channel: "email",
        value: "yes",
        version: "v3",
        source: "Preference page",
        how: "Turned on email, SMS and calls; waiting to be sent to İYS",
      },
    ],
  },
  {
    id: "p3",
    name: "Elif Kaya",
    email: "elif.kaya@example.com",
    phone: "+90 505 *** ** 93",
    changed: "Yesterday 21:16",
    iys: "in-step",
    answers: {
      commercial: { email: no("v2", "Messages: unsubscribe link", "Yesterday 21:16"), sms: yes("v2", "API: mobile app", "8 Feb 2026 10:02") },
      measurement: { site: no("v2", "Cookie banner on shop", "8 Feb 2026 09:58") },
    },
    history: [
      {
        id: "h1",
        at: "Yesterday 21:16",
        purpose: "commercial",
        channel: "email",
        value: "no",
        version: "v2",
        source: "Messages",
        how: "Clicked unsubscribe in the October newsletter",
      },
    ],
  },
  {
    id: "p4",
    name: "Zeynep Arslan",
    email: "zeynep.arslan@example.com",
    phone: "+90 542 *** ** 18",
    changed: "Today 10:02",
    today: true,
    conflict: true,
    iys: "in-step",
    answers: {
      commercial: { email: yes("v3", "İYS", "Today 10:02"), sms: yes("v3", "İYS", "Today 10:02") },
    },
    history: [
      {
        id: "h2",
        at: "Today 10:02",
        purpose: "commercial",
        channel: "email",
        value: "yes",
        version: "v3",
        source: "İYS",
        how: "ONAY given on the İYS site; later than the local refusal, so it wins and both are kept",
      },
      {
        id: "h1",
        at: "Today 09:40",
        purpose: "commercial",
        channel: "email",
        value: "no",
        version: "v3",
        source: "Preference page",
        how: "Turned off email",
      },
    ],
  },
  {
    id: "p5",
    name: "Can Öztürk",
    email: "can.ozturk@example.com",
    phone: "",
    changed: "4 Nov 15:30",
    iys: "in-step",
    answers: {
      measurement: { site: yes("v2", "Cookie banner on docs", "4 Nov 15:30") },
      advertising: { site: yes("v1", "Cookie banner on docs", "4 Nov 15:30") },
    },
    history: [],
  },
  {
    id: "p6",
    name: "Burak Şahin",
    email: "burak.sahin@example.com",
    phone: "+90 532 *** ** 66",
    changed: "2 Nov 11:20",
    iys: "error",
    answers: {
      commercial: { sms: yes("v3", "API: store till", "2 Nov 11:20"), call: no("v3", "API: store till", "2 Nov 11:20") },
      surveys: { sms: yes("v1", "API: store till", "2 Nov 11:20") },
    },
    history: [],
  },
  {
    id: "p7",
    name: "Deniz Çelik",
    email: "deniz.celik@example.com",
    phone: "+90 554 *** ** 30",
    changed: "28 Oct 17:05",
    iys: "in-step",
    answers: {
      commercial: {
        email: no("v3", "Preference page", "28 Oct 17:05"),
        sms: no("v3", "Preference page", "28 Oct 17:05"),
        call: no("v3", "Preference page", "28 Oct 17:05"),
      },
      measurement: { site: no("v2", "Preference page", "28 Oct 17:05") },
      advertising: { site: no("v1", "Preference page", "28 Oct 17:05") },
    },
    history: [],
  },
  {
    id: "p8",
    name: "Hakan Yıldız",
    email: "hakan.yildiz@example.com",
    phone: "+90 530 *** ** 52",
    changed: "19 Oct 13:44",
    iys: "in-step",
    answers: {
      commercial: { email: yes("v3", "Form: Contact sales", "19 Oct 13:44") },
      personalised: { email: yes("v1", "Form: Contact sales", "19 Oct 13:44") },
    },
    history: [],
  },
];

const purposeName = (id: string) => PURPOSES.find((p) => p.id === id)?.name ?? id;
const fmt = (n: number) => n.toLocaleString("en");

/* ----------------------------------------------------------------- parts */

function AnswerBadge({ a }: { a?: Answer }) {
  if (!a) return <span className="text-xs text-fg-muted">Not asked</span>;
  return (
    <StatusBadge tone={a.value === "yes" ? "success" : "danger"}>
      {a.value === "yes" ? "Yes" : "No"} · {a.version}
    </StatusBadge>
  );
}

function IysBadge({ s }: { s: Person["iys"] }) {
  return s === "in-step" ? (
    <StatusBadge tone="success">In step</StatusBadge>
  ) : s === "waiting" ? (
    <StatusBadge tone="neutral">Waiting</StatusBadge>
  ) : (
    <StatusBadge tone="danger">Rejected</StatusBadge>
  );
}

/* -------------------------------------------------------------- overview */

const DAYS = Array.from({ length: 30 }, (_, i) => {
  const d = new Date(Date.UTC(2026, 9, 9 + i));
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
});
const YES_PER_DAY = wave(30, { base: 610, amp: 140, seed: 4 });
const NO_PER_DAY = wave(30, { base: 190, amp: 40, seed: 9, spike: 120, spikeAt: 26, spikeLen: 2 });

const RECENT = [
  {
    id: "r1",
    at: "10:02",
    name: "Zeynep Arslan",
    text: "Commercial messages by email: yes, from İYS, later than Zeynep's refusal at 09:40",
    tone: "success" as const,
  },
  { id: "r2", at: "09:12", name: "Ayşe Yılmaz", text: "Commercial messages by SMS: no, replied STOP, from İYS", tone: "danger" as const },
  { id: "r3", at: "08:47", name: "Mehmet Demir", text: "Commercial messages by email, SMS and call: yes, on the preference page", tone: "success" as const },
  { id: "r4", at: "08:31", name: "Selin Aydın", text: "Measurement cookies: yes, advertising: no, on the banner of shop", tone: "neutral" as const },
  { id: "r5", at: "Yesterday", name: "Elif Kaya", text: "Commercial messages by email: no, unsubscribe link in Messages", tone: "danger" as const },
];

function OverviewPage() {
  return (
    <>
      <PageHeader
        title="Overview"
        description="Who may be reached, on which channel, for what, as of now. Every answer counts with the text version it was given for."
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="People with a record" value="48,210" icon={Users} delta={{ label: "+1,184 in 30 days", direction: "up", intent: "neutral" }} />
        <KpiCard
          label="May be emailed"
          value="18,240"
          unit="37.8%"
          delta={{ label: "commercial messages", intent: "neutral" }}
          trend={wave(14, { base: 18000, amp: 200, seed: 2 })}
        />
        <KpiCard
          label="May get SMS"
          value="14,902"
          unit="30.9%"
          delta={{ label: "-96 this week", direction: "down", intent: "bad" }}
          trend={wave(14, { base: 15000, amp: 90, seed: 3 })}
        />
        <KpiCard label="Refusals this week" value="1,312" tone="warning" delta={{ label: "+41% after Fall offers", direction: "up", intent: "bad" }} />
        <KpiCard label="İYS" value="In step" tone="success" delta={{ label: "last sync 3 min ago, 2 to look at", intent: "neutral" }} />
      </KpiGrid>
      <Callout tone="info" title="Tonight's campaign Fall offers in Messages: 41 people left it since 09:00" className="mb-2.5">
        Their latest answer for commercial messages by SMS is no. Messages asks Consent again right before it sends, so a refusal up to the last minute counts.
      </Callout>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Answers per day" description="Every channel and purpose, the last 30 days">
          <TimeSeriesChart
            label="Yes and no answers per day in the last 30 days"
            labels={DAYS}
            height={200}
            area
            format={(v) => fmt(Math.round(v))}
            series={[
              { id: "yes", name: "Yes", data: YES_PER_DAY, color: "var(--oa-success)" },
              { id: "no", name: "No", data: NO_PER_DAY, color: "var(--oa-danger)" },
            ]}
          />
        </Panel>
        <Panel title="Cookie banner" description="63,900 answers on 2 sites, 30 days">
          <DonutChart
            label="Cookie banner answers"
            caption="answers"
            size={132}
            slices={[
              { id: "all", name: "Accepted all", value: 33410, color: "var(--oa-success)" },
              { id: "none", name: "Rejected all", value: 19802, color: "var(--oa-danger)" },
              { id: "chose", name: "Chose some", value: 5790 },
              { id: "left", name: "Left without answering", value: 4898, color: "var(--oa-fg-muted)" },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Where answers came from" description="The last 30 days">
          <BarList
            label="Answers by source"
            items={[
              { id: "banner", label: "Cookie banner", value: 63900 },
              { id: "forms", label: "Forms", value: 4210 },
              { id: "iys", label: "İYS", value: 2988 },
              { id: "page", label: "Preference page", value: 1544 },
              { id: "api", label: "API", value: 1302 },
              { id: "messages", label: "Unsubscribe links", value: 611 },
            ]}
          />
        </Panel>
        <Panel title="Latest changes" flush>
          <ol aria-label="Latest changes" className="flex flex-col">
            {RECENT.map((r) => (
              <li key={r.id} className="flex items-start gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <Avatar name={r.name} size="sm" className="size-5" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-sm text-fg">{r.name}</span>
                  <span className={cn("text-xs", r.tone === "danger" ? "text-danger-text" : "text-fg-muted")}>{r.text}</span>
                </span>
                <span className="shrink-0 font-mono text-2xs text-fg-muted">{r.at}</span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- people */

function RecordDialog({
  open,
  person,
  onOpenChange,
  onRecord,
}: {
  open: boolean;
  person: Person;
  onOpenChange: (o: boolean) => void;
  onRecord: (e: { purpose: string; channel: Channel; value: Value; how: string }) => void;
}) {
  const [purpose, setPurpose] = useState("commercial");
  const [channel, setChannel] = useState<Channel>("call");
  const [value, setValue] = useState<Value>("no");
  const [how, setHow] = useState("");
  const p = PURPOSES.find((x) => x.id === purpose)!;
  const ch = p.channels.includes(channel) ? channel : p.channels[0]!;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Record an answer from ${person.name}`}
      description="For an answer given by phone, in a store or by letter. It is added to the history with your name; nothing earlier is changed."
      onSubmit={(e) => {
        e.preventDefault();
        if (!how.trim()) return;
        onRecord({ purpose, channel: ch, value, how: how.trim() });
        setHow("");
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!how.trim()}>
            Record answer
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <SelectField
          label="Purpose"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          options={PURPOSES.map((x) => ({ value: x.id, label: x.name }))}
        />
        <SelectField
          label="Channel"
          value={ch}
          onChange={(e) => setChannel(e.target.value as Channel)}
          options={p.channels.map((c) => ({ value: c, label: CHANNEL[c].label }))}
        />
      </div>
      <SegmentedControl
        label="Answer"
        value={value}
        onChange={setValue}
        options={[
          { value: "yes", label: "Agreed" },
          { value: "no", label: "Refused or withdrew" },
        ]}
      />
      <TextField label="How it was given" value={how} onChange={(e) => setHow(e.target.value)} placeholder="Asked not to be called, on a support call" />
      <p className="text-xs text-fg-muted">
        Recorded for text {p.versions[0]!.v} of {p.name}.{p.iys && ch !== "site" ? " It is sent to İYS within minutes." : ""}
      </p>
    </Dialog>
  );
}

function PersonPanel({ person, onRecord, onExport }: { person: Person; onRecord: () => void; onExport: () => void }) {
  const purposes = PURPOSES.filter((p) => person.answers[p.id]);
  return (
    <Panel
      aria-label="Consent record"
      title={person.name}
      description={[person.email, person.phone].filter(Boolean).join(" · ")}
      actions={<IysBadge s={person.iys} />}
    >
      <div className="flex flex-col gap-3">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <caption className="sr-only">Latest answer by purpose and channel</caption>
            <thead className="text-fg-muted">
              <tr>
                <th className="py-1 pr-2 font-semibold">Purpose</th>
                <th className="py-1 pr-2 font-semibold">Channel</th>
                <th className="py-1 font-semibold">Latest answer</th>
              </tr>
            </thead>
            <tbody>
              {purposes.flatMap((p) =>
                p.channels.map((c, i) => {
                  const a = person.answers[p.id]?.[c];
                  return (
                    <tr key={`${p.id}-${c}`} className={cn(i === 0 && "border-t border-line")}>
                      <td className="py-1 pr-2 align-top">{i === 0 ? p.name : ""}</td>
                      <td className="py-1 pr-2 align-top">{CHANNEL[c].label}</td>
                      <td className="py-1 align-top">
                        <span className="flex flex-col items-start gap-0.5">
                          <AnswerBadge a={a} />
                          {a && (
                            <span className="text-2xs text-fg-muted">
                              {a.source} · {a.at}
                            </span>
                          )}
                        </span>
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
        <section className="flex flex-col gap-1.5 border-t border-line pt-2.5">
          <h3 className="text-xs font-semibold text-fg-muted">History</h3>
          {person.history.length ? (
            <ol aria-label="History" className="flex flex-col gap-2">
              {person.history.map((h) => (
                <li key={h.id} className="flex gap-2 text-xs">
                  <span className={cn("mt-1 size-2 shrink-0 rounded-full", h.value === "yes" ? "bg-success" : "bg-danger")} aria-hidden />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-fg">
                      {purposeName(h.purpose)} by {CHANNEL[h.channel].label}: {h.value === "yes" ? "yes" : "no"} ({h.version})
                    </span>
                    <span className="text-2xs text-fg-muted">
                      {h.at} · {h.source} · {h.how}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-fg-muted">Only the answers above, each from its source.</p>
          )}
          <p className="text-2xs text-fg-muted">The history is kept as given. Nobody can edit or remove an entry; a new answer is added on top.</p>
        </section>
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" icon={<Plus />} onClick={onRecord}>
            Record an answer
          </Button>
          <Button size="sm" variant="ghost" icon={<FileDown />} onClick={onExport}>
            Export for a KVKK request
          </Button>
        </div>
      </div>
    </Panel>
  );
}

const ME = "Emily Clark";

function PeoplePage() {
  const [rows, setRows] = useState(PEOPLE_ROWS);
  const [tab, setTab] = useState<"all" | "today" | "conflicts">("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("p1");
  const [recording, setRecording] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const shown = rows.filter(
    (p) =>
      (tab === "all" || (tab === "today" && p.today) || (tab === "conflicts" && p.conflict)) &&
      `${p.name} ${p.email} ${p.phone}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  const cur = rows.find((p) => p.id === active) ?? rows[0]!;
  const c = (ch: Channel) => (p: Person) => <AnswerBadge a={p.answers.commercial?.[ch]} />;
  const cols: Column<Person>[] = [
    {
      id: "name",
      header: "Person",
      width: "28%",
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
    { id: "email", header: "Email", description: "Commercial messages by email", cell: c("email") },
    { id: "sms", header: "SMS", description: "Commercial messages by SMS", cell: c("sms") },
    { id: "call", header: "Call", description: "Commercial messages by phone call", cell: c("call") },
    { id: "cookies", header: "Measurement", description: "Measurement cookies", cell: (p) => <AnswerBadge a={p.answers.measurement?.site} /> },
    { id: "changed", header: "Last change", cell: (p) => <span className="text-xs whitespace-nowrap">{p.changed}</span> },
    { id: "iys", header: "İYS", cell: (p) => (p.answers.commercial ? <IysBadge s={p.iys} /> : <span className="text-xs text-fg-muted">–</span>) },
  ];
  return (
    <>
      <PageHeader
        title="People"
        description="Each person's latest answer for every purpose and channel, and how they got there. A person may be reached only while that answer is yes."
        actions={<Button icon={<FileDown />}>Export CSV</Button>}
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Panel flush aria-label="All people">
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2">
            <Tabs
              label="Show"
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "Everyone", count: "48,210" },
                { value: "today", label: "Changed today", count: rows.filter((p) => p.today).length },
                { value: "conflicts", label: "İYS disagreed", count: rows.filter((p) => p.conflict).length },
              ]}
              className="border-b-0"
            />
            <SearchInput
              label="Search people"
              placeholder="Name, email or phone"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64 pb-1.5"
            />
          </div>
          <div className="border-t border-line">
            <DataTable
              label="People"
              columns={cols}
              rows={shown}
              getRowId={(p) => p.id}
              onRowClick={(p) => setActive(p.id)}
              activeRowId={active}
              minWidth={860}
              empty="Nobody matches."
            />
          </div>
        </Panel>
        <PersonPanel
          person={cur}
          onRecord={() => setRecording(true)}
          onExport={() => setNotice(`The record of ${cur.name} was exported as PDF and JSON, with every answer, its text and its source.`)}
        />
      </div>
      <RecordDialog
        key={cur.id}
        open={recording}
        person={cur}
        onOpenChange={setRecording}
        onRecord={(e) => {
          const purpose = PURPOSES.find((p) => p.id === e.purpose)!;
          const version = purpose.versions[0]!.v;
          const entry: HistoryEntry = {
            id: `h${cur.history.length + 1}`,
            at: "Today 14:05",
            purpose: e.purpose,
            channel: e.channel,
            value: e.value,
            version,
            source: `Recorded by ${ME}`,
            how: e.how,
          };
          setRows((rs) =>
            rs.map((p) =>
              p.id === cur.id
                ? {
                    ...p,
                    changed: "Today 14:05",
                    today: true,
                    iys: purpose.iys ? "waiting" : p.iys,
                    answers: {
                      ...p.answers,
                      [e.purpose]: { ...p.answers[e.purpose], [e.channel]: { value: e.value, version, source: `Recorded by ${ME}`, at: "Today 14:05" } },
                    },
                    history: [entry, ...p.history],
                  }
                : p,
            ),
          );
          setRecording(false);
          setNotice(
            `${purpose.name} by ${CHANNEL[e.channel].label} for ${cur.name}: ${e.value === "yes" ? "yes" : "no"}, recorded.${purpose.iys ? " Sent to İYS within minutes." : ""}`,
          );
        }}
      />
    </>
  );
}

/* -------------------------------------------------------------- purposes */

function PurposesPage() {
  const [id, setId] = useState("commercial");
  const p = PURPOSES.find((x) => x.id === id)!;
  const [version, setVersion] = useState(p.versions[0]!.v);
  const v = p.versions.find((x) => x.v === version) ?? p.versions[0]!;
  const totalAgreed = p.versions.reduce((n, x) => n + x.agreed, 0);
  const cols: Column<Version>[] = [
    { id: "v", header: "Version", cell: (x) => <Badge mono>{x.v}</Badge> },
    { id: "from", header: "In use from", cell: (x) => <span className="text-xs whitespace-nowrap">{x.from}</span> },
    {
      id: "agreed",
      header: "Latest yes given to it",
      align: "right",
      sortValue: (x) => x.agreed,
      cell: (x) => (
        <span className="font-mono text-xs tabular-nums">
          {fmt(x.agreed)} · {Math.round((x.agreed / totalAgreed) * 100)}%
        </span>
      ),
    },
    {
      id: "state",
      header: "State",
      cell: (x) => (x === p.versions[0] ? <StatusBadge tone="success">Shown now</StatusBadge> : <StatusBadge tone="neutral">Earlier</StatusBadge>),
    },
  ];
  return (
    <>
      <PageHeader
        title="Purposes"
        description="What people are asked to agree to, and every version of its text. Purposes and their texts are set in consent.yaml; a change of wording is a new version."
      />
      <div className="grid gap-2.5 xl:grid-cols-[240px_minmax(0,1fr)]">
        <Panel flush aria-label="Purposes">
          <ul className="flex flex-col py-1">
            {PURPOSES.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => (setId(x.id), setVersion(x.versions[0]!.v))}
                  aria-current={x.id === id ? "true" : undefined}
                  className={cn("flex w-full flex-col px-3 py-1.5 text-left", x.id === id ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas")}
                >
                  <span className="truncate text-sm font-medium">{x.name}</span>
                  <span className="text-2xs text-fg-muted">
                    {x.versions[0]!.v} · {x.channels.map((c) => CHANNEL[c].label).join(", ")}
                    {x.iys && " · İYS"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <KpiGrid minWidth={150}>
            {p.channels.map((c) => (
              <KpiCard key={c} label={`Agreed by ${CHANNEL[c].label}`} value={fmt(p.agreed[c] ?? 0)} unit="people" />
            ))}
            <KpiCard label="Refused" value={fmt(p.refused)} unit="people" />
          </KpiGrid>
          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
            <Panel aria-label="Text" title={`${p.name}: the text`} description="As people saw it on the banner, in forms and on the preference page.">
              <div className="flex flex-col gap-3">
                <SegmentedControl label="Version" value={v.v} onChange={setVersion} options={p.versions.map((x) => ({ value: x.v, label: x.v }))} />
                <blockquote className="max-w-[68ch] border-l-2 border-accent pl-3 text-sm leading-relaxed text-fg">{v.text}</blockquote>
                <p className="text-xs text-fg-muted">
                  {v.v} in use from {v.from}. {fmt(v.agreed)} people&apos;s latest yes was given to this text, and stays tied to it.
                </p>
              </div>
            </Panel>
            <Panel title="About this purpose">
              <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
                <dt className="text-fg-muted">Key</dt>
                <dd className="font-mono text-fg">{p.id}</dd>
                <dt className="text-fg-muted">Basis</dt>
                <dd className="text-fg">{p.basis}</dd>
                <dt className="text-fg-muted">Channels</dt>
                <dd className="text-fg">{p.channels.map((c) => CHANNEL[c].label).join(", ")}</dd>
                <dt className="text-fg-muted">İYS</dt>
                <dd className="text-fg">{p.iys ? `Synced as ${p.channels.map((c) => CHANNEL[c].iys).join(", ")}` : "Not a commercial message, not sent"}</dd>
                <dt className="text-fg-muted">Owner</dt>
                <dd className="flex items-center gap-1.5 text-fg">
                  <Avatar name={p.owner} size="sm" className="size-5" />
                  {p.owner}
                </dd>
              </dl>
            </Panel>
          </div>
          <Panel flush title="Versions">
            <DataTable
              label="Versions"
              columns={cols}
              rows={p.versions}
              getRowId={(x) => x.v}
              onRowClick={(x) => setVersion(x.v)}
              activeRowId={v.v}
              minWidth={560}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------- İYS */

interface SyncRow {
  id: string;
  at: string;
  dir: "out" | "in";
  person: string;
  channel: Channel;
  value: "ONAY" | "RET";
  result: "accepted" | "rejected" | "waiting";
  note?: string;
}

const SYNC: SyncRow[] = [
  { id: "s1", at: "14:02", dir: "out", person: "mehmet.demir@example.com", channel: "email", value: "ONAY", result: "waiting", note: "Batch of 18 at 14:05" },
  { id: "s2", at: "10:02", dir: "in", person: "zeynep.arslan@example.com", channel: "email", value: "ONAY", result: "accepted", note: "Given on the İYS site" },
  { id: "s3", at: "09:12", dir: "in", person: "+90 532 *** ** 41", channel: "sms", value: "RET", result: "accepted", note: "STOP reply via the SMS provider" },
  { id: "s4", at: "08:58", dir: "out", person: "+90 505 *** ** 93", channel: "sms", value: "ONAY", result: "accepted" },
  { id: "s5", at: "Yesterday 21:17", dir: "out", person: "elif.kaya@example.com", channel: "email", value: "RET", result: "accepted" },
  { id: "s6", at: "2 Nov 11:21", dir: "out", person: "+90 532 *** ** 66", channel: "call", value: "RET", result: "rejected", note: "H174: recipient format" },
];

const CONFLICTS = [
  {
    id: "c1",
    name: "Zeynep Arslan",
    channel: "Email",
    local: "No · Preference page · Today 09:40",
    iys: "Yes · İYS site · Today 10:02",
    kept: "İYS, later",
  },
  {
    id: "c2",
    name: "Okan Tekin",
    channel: "SMS",
    local: "Yes · Form: Contact sales · 6 Nov 16:20",
    iys: "No · İYS site · 1 Nov 08:15",
    kept: "Local, later",
  },
];

function IysPage() {
  const [tab, setTab] = useState<"log" | "conflicts" | "errors">("log");
  const [retried, setRetried] = useState(false);
  const cols: Column<SyncRow>[] = [
    { id: "at", header: "When", cell: (r) => <span className="text-xs whitespace-nowrap">{r.at}</span> },
    {
      id: "dir",
      header: "Direction",
      cell: (r) =>
        r.dir === "out" ? (
          <span className="flex items-center gap-1 text-xs">
            <ArrowUpRight aria-hidden className="size-3.5 text-fg-muted" />
            To İYS
          </span>
        ) : (
          <span className="flex items-center gap-1 text-xs">
            <ArrowDownLeft aria-hidden className="size-3.5 text-fg-muted" />
            From İYS
          </span>
        ),
    },
    { id: "person", header: "Recipient", mono: true, cell: (r) => <span className="text-xs">{r.person}</span> },
    { id: "type", header: "İYS type", cell: (r) => <Badge mono>{CHANNEL[r.channel].iys}</Badge> },
    { id: "value", header: "Status", cell: (r) => <StatusBadge tone={r.value === "ONAY" ? "success" : "danger"}>{r.value}</StatusBadge> },
    {
      id: "result",
      header: "Result",
      cell: (r) => (
        <span className="flex flex-col">
          <StatusBadge tone={r.result === "accepted" ? "success" : r.result === "rejected" ? "danger" : "neutral"}>
            {r.result === "accepted" ? "Accepted" : r.result === "rejected" ? "Rejected" : "Waiting"}
          </StatusBadge>
          {r.note && <span className="text-2xs text-fg-muted">{r.note}</span>}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="İYS"
        description="Consents and refusals for commercial messages by email, SMS and call go to İYS and come back from it. When the two disagree, the later answer wins and both are kept."
        meta={<StatusBadge tone="success">Connected</StatusBadge>}
      />
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="Sent to İYS today" value="214" icon={ArrowUpRight} delta={{ label: "18 waiting for 14:05", intent: "neutral" }} />
        <KpiCard label="From İYS today" value="96" icon={ArrowDownLeft} delta={{ label: "71 refusals", intent: "neutral" }} />
        <KpiCard label="Disagreed" value={String(CONFLICTS.length)} delta={{ label: "settled by the later answer", intent: "neutral" }} />
        <KpiCard
          label="Rejected by İYS"
          value={retried ? "0" : "1"}
          tone={retried ? undefined : "danger"}
          delta={retried ? { label: "none waiting", intent: "neutral" } : { label: "fix within 3 business days", intent: "bad" }}
        />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush aria-label="Sync">
          <div className="px-3 pt-2">
            <Tabs
              label="Sync"
              value={tab}
              onChange={setTab}
              items={[
                { value: "log", label: "Sync log" },
                { value: "conflicts", label: "Disagreed", count: CONFLICTS.length },
                { value: "errors", label: "Rejected", count: retried ? 0 : 1 },
              ]}
              className="border-b-0"
            />
          </div>
          <div className="border-t border-line">
            {tab === "log" && <DataTable label="Sync log" columns={cols} rows={SYNC} getRowId={(r) => r.id} minWidth={760} />}
            {tab === "conflicts" && (
              <DataTable
                label="Disagreements"
                rows={CONFLICTS}
                getRowId={(r) => r.id}
                minWidth={760}
                columns={[
                  { id: "name", header: "Person", cell: (r) => <span className="font-medium">{r.name}</span> },
                  { id: "channel", header: "Channel", cell: (r) => r.channel },
                  { id: "local", header: "Here", cell: (r) => <span className="text-xs">{r.local}</span> },
                  { id: "iys", header: "In İYS", cell: (r) => <span className="text-xs">{r.iys}</span> },
                  { id: "kept", header: "Counts now", cell: (r) => <Badge tone="info">{r.kept}</Badge> },
                ]}
              />
            )}
            {tab === "errors" &&
              (retried ? (
                <p role="status" className="px-3 py-3 text-sm text-fg">
                  Sent again with the number in +90 form. İYS accepted it at 14:06.
                </p>
              ) : (
                <div className="flex flex-col gap-2 px-3 py-3">
                  <Callout tone="danger" title="H174: İYS did not accept the recipient's format">
                    Burak Şahin's refusal of calls, from the store till on 2 Nov, has the phone number without the country code. Consent sends it again as +90
                    once the till's record is fixed, or now with the number corrected here.
                  </Callout>
                  <div>
                    <Button size="sm" icon={<RefreshCw />} onClick={() => setRetried(true)}>
                      Send again as +90
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </Panel>
        <Panel title="Account" description="From consent.yaml">
          <dl className="grid grid-cols-[90px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
            <dt className="text-fg-muted">Brand code</dt>
            <dd className="font-mono text-fg">649201</dd>
            <dt className="text-fg-muted">Recipients</dt>
            <dd className="text-fg">Individual (BIREYSEL)</dd>
            <dt className="text-fg-muted">Sends</dt>
            <dd className="text-fg">Every 5 minutes, in batches</dd>
            <dt className="text-fg-muted">Reads</dt>
            <dd className="text-fg">Changes from İYS every 5 minutes</dd>
            <dt className="text-fg-muted">Last sync</dt>
            <dd className="text-fg">14:00, both ways</dd>
          </dl>
          <p className="mt-3 border-t border-line pt-2.5 text-2xs text-fg-muted">
            A consent given on a form or the preference page must reach İYS within 3 business days; Consent sends it within minutes. Refusals from İYS stop
            messages as soon as they arrive.
          </p>
        </Panel>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- sites */

const SITES = [
  { id: "shop", host: "shop.example.com", askFirst: true, shown: 52110, accepted: 54, rejected: 33 },
  { id: "docs", host: "docs.example.com", askFirst: true, shown: 11790, accepted: 61, rejected: 24 },
];

const SCRIPT = '<script src="https://consent.example.com/c.js" data-site="shop" defer></script>';

function SitesPage() {
  const [site, setSite] = useState("shop");
  const [view, setView] = useState<"banner" | "page">("banner");
  const [copied, setCopied] = useState(false);
  const [prefs, setPrefs] = useState({ measurement: true, advertising: false, email: true, sms: false });
  const [saved, setSaved] = useState<string | null>(null);
  const s = SITES.find((x) => x.id === site)!;
  return (
    <>
      <PageHeader
        title="Banner and page"
        description="A cookie banner and a preference page, from one script tag. The texts are the current versions of the purposes in consent.yaml."
      />
      <div className="mb-2.5 flex flex-wrap items-end gap-2">
        <SegmentedControl
          label="Site"
          value={site}
          onChange={(v) => (setSite(v), setCopied(false))}
          options={SITES.map((x) => ({ value: x.id, label: x.host }))}
        />
        <SegmentedControl
          label="Preview"
          value={view}
          onChange={setView}
          options={[
            { value: "banner", label: "Banner" },
            { value: "page", label: "Preference page" },
          ]}
        />
      </div>
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="Banner shown" value={fmt(s.shown)} unit="30 days" />
        <KpiCard label="Accepted all" value={`${s.accepted}%`} />
        <KpiCard label="Rejected all" value={`${s.rejected}%`} />
        <KpiCard label="Analytics" value={s.askFirst ? "Waits for yes" : "Always on"} delta={{ label: "measurement cookies", intent: "neutral" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush aria-label="Preview">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-1.5 text-xs text-fg-muted">
            <Globe aria-hidden className="size-3.5" />
            <span className="truncate font-mono">
              https://{s.host}/{view === "page" ? "privacy/choices" : ""}
            </span>
          </div>
          {view === "banner" ? (
            <div className="relative h-[360px] overflow-hidden bg-canvas">
              <div aria-hidden className="absolute inset-0 flex flex-col gap-3 p-6 opacity-50">
                <div className="h-5 w-24 rounded bg-subtle" />
                <div className="grid grid-cols-3 gap-3">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="h-32 rounded-lg bg-subtle" />
                  ))}
                </div>
              </div>
              <div
                role="dialog"
                aria-label="Cookie banner"
                className="absolute inset-x-6 bottom-6 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4 shadow-modal"
              >
                <span className="text-sm font-semibold text-fg">Your choice about cookies</span>
                <p className="text-xs text-fg-muted">
                  {PURPOSES[1]!.versions[0]!.text} {PURPOSES[2]!.versions[0]!.text}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" variant="primary">
                    Accept all
                  </Button>
                  <Button size="sm">Reject all</Button>
                  <Button size="sm" variant="ghost">
                    Choose
                  </Button>
                </div>
                <span className="text-2xs text-fg-muted">Reject all is as easy to reach as Accept all. Nothing is measured before an answer.</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 p-4">
              <span className="text-base font-semibold text-fg">Your privacy choices</span>
              <p className="text-xs text-fg-muted">Signed in as ayse.yilmaz@example.com. A change counts from now and is kept in your record.</p>
              <div className="flex max-w-xl flex-col gap-3">
                <Switch
                  label="Measurement cookies"
                  description={PURPOSES[1]!.versions[0]!.text}
                  checked={prefs.measurement}
                  onCheckedChange={(v) => setPrefs({ ...prefs, measurement: v })}
                />
                <Switch
                  label="Advertising cookies"
                  description={PURPOSES[2]!.versions[0]!.text}
                  checked={prefs.advertising}
                  onCheckedChange={(v) => setPrefs({ ...prefs, advertising: v })}
                />
                <Switch
                  label="Offers by email"
                  description="Commercial messages, text v3"
                  checked={prefs.email}
                  onCheckedChange={(v) => setPrefs({ ...prefs, email: v })}
                />
                <Switch
                  label="Offers by SMS"
                  description="Commercial messages, text v3"
                  checked={prefs.sms}
                  onCheckedChange={(v) => setPrefs({ ...prefs, sms: v })}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() =>
                    setSaved(
                      `Saved. Offers by SMS ${prefs.sms ? "on" : "off"}, recorded for text v3 with the preference page as its source${prefs.sms ? " and sent to İYS" : ""}.`,
                    )
                  }
                >
                  Save my choices
                </Button>
                {saved && (
                  <p role="status" className="text-xs text-success">
                    {saved}
                  </p>
                )}
              </div>
            </div>
          )}
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Install" description="One tag in the page's head; the banner and the page come with it.">
            <div className="flex flex-col gap-2">
              <span className="flex items-start gap-1 rounded-md bg-canvas px-2 py-1.5">
                <code className="min-w-0 grow font-mono text-2xs break-all text-fg">{SCRIPT.replace('"shop"', `"${s.id}"`)}</code>
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
          <Panel title="On this site">
            <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
              <dt className="text-fg-muted">Asks first</dt>
              <dd className="text-fg">{s.askFirst ? "Yes: Analytics starts after a yes" : "No"}</dd>
              <dt className="text-fg-muted">Purposes</dt>
              <dd className="text-fg">Measurement cookies, advertising cookies</dd>
              <dt className="text-fg-muted">Asks again</dt>
              <dd className="text-fg">After 12 months, or when a text changes</dd>
              <dt className="text-fg-muted">Languages</dt>
              <dd className="text-fg">Turkish, English</dd>
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- checks */

interface Check {
  id: string;
  at: string;
  product: "Messages" | "Analytics" | "Forms";
  person: string;
  asked: string;
  answer: Value;
  why: string;
}

const CHECKS: Check[] = [
  {
    id: "k1",
    at: "14:03:51",
    product: "Messages",
    person: "Ayşe Yılmaz",
    asked: "Commercial messages by SMS",
    answer: "no",
    why: "Refused today 09:12 via İYS",
  },
  { id: "k2", at: "14:03:51", product: "Messages", person: "Mehmet Demir", asked: "Commercial messages by SMS", answer: "yes", why: "Yes to v3, today 08:47" },
  {
    id: "k3",
    at: "14:03:50",
    product: "Messages",
    person: "Elif Kaya",
    asked: "Commercial messages by email",
    answer: "no",
    why: "Unsubscribed yesterday 21:16",
  },
  { id: "k4", at: "14:03:12", product: "Analytics", person: "Visitor on shop", asked: "Measurement cookies", answer: "no", why: "No answer on the banner yet" },
  {
    id: "k5",
    at: "14:02:40",
    product: "Forms",
    person: "Okan Tekin",
    asked: "Commercial messages by SMS",
    answer: "yes",
    why: "Ticked on Contact sales, recorded",
  },
  { id: "k6", at: "14:01:05", product: "Messages", person: "Deniz Çelik", asked: "Personalised offers by email", answer: "no", why: "Never asked" },
  { id: "k7", at: "14:00:22", product: "Analytics", person: "Can Öztürk", asked: "Measurement cookies", answer: "yes", why: "Yes to v2, 4 Nov" },
];

function ChecksPage() {
  const [product, setProduct] = useState<"all" | Check["product"]>("all");
  const rows = CHECKS.filter((c) => product === "all" || c.product === product);
  const cols: Column<Check>[] = [
    { id: "at", header: "When", mono: true, cell: (c) => <span className="text-xs">{c.at}</span> },
    { id: "product", header: "Asked by", cell: (c) => <Badge>{c.product}</Badge> },
    { id: "person", header: "About", cell: (c) => <span className="font-medium">{c.person}</span> },
    { id: "asked", header: "May we", cell: (c) => <span className="text-xs">{c.asked}</span> },
    {
      id: "answer",
      header: "Answer",
      cell: (c) => <StatusBadge tone={c.answer === "yes" ? "success" : "danger"}>{c.answer === "yes" ? "Yes" : "No"}</StatusBadge>,
    },
    { id: "why", header: "Because", cell: (c) => <span className="text-xs text-fg-muted">{c.why}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Checks"
        description="Messages, Analytics and Forms ask before they act. The answer is yes only while the person's latest answer for that purpose and channel is yes."
      />
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="Checks today" value="128,400" />
        <KpiCard label="Answered no" value="9,214" unit="7.2%" />
        <KpiCard label="Slowest answer" value="11" unit="ms p99" />
        <KpiCard label="Messages held back" value="4,980" delta={{ label: "from Fall offers tonight", intent: "neutral" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel flush aria-label="Latest checks">
          <div className="px-3 py-2">
            <SegmentedControl
              label="Asked by"
              value={product}
              onChange={setProduct}
              options={[
                { value: "all", label: "Every product" },
                { value: "Messages", label: "Messages" },
                { value: "Analytics", label: "Analytics" },
                { value: "Forms", label: "Forms" },
              ]}
            />
          </div>
          <div className="border-t border-line">
            <DataTable label="Latest checks" columns={cols} rows={rows} getRowId={(c) => c.id} minWidth={820} />
          </div>
        </Panel>
        <Panel title="Checks by product" description="Today">
          <BarList
            label="Checks by product"
            items={[
              { id: "m", label: "Messages", value: 96200 },
              { id: "a", label: "Analytics", value: 30410 },
              { id: "f", label: "Forms", value: 1790 },
            ]}
          />
          <p className="mt-3 text-xs text-fg-muted">
            Only the answer and its reason leave Consent. A product that cannot reach Consent does not send; it waits and asks again.
          </p>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `iys:
  brand_code: "649201"
  recipient_type: BIREYSEL
  sync_every: 5m
purposes:
  commercial:
    name: Commercial messages
    channels: [email, sms, call]
    iys: true
    owner: selin.aydin
    text: texts/commercial-v3.md   # v3, from 1 Sep 2026
  measurement:
    name: Measurement cookies
    channels: [site]
    text: texts/measurement-v2.md
  advertising:
    name: Advertising cookies
    channels: [site]
    text: texts/advertising-v1.md
  personalised:
    name: Personalised offers
    channels: [email, sms]
    text: texts/personalised-v1.md
  surveys:
    name: Satisfaction surveys
    channels: [sms, call]
    text: texts/surveys-v1.md
sites:
  shop: { host: shop.example.com, ask_first: true }
  docs: { host: docs.example.com, ask_first: true }
banner:
  ask_again_after: 12mo
  languages: [tr, en]
records:
  keep: 10y   # after the last answer`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="consent"
      file="consent.yaml"
      applied="2 days ago"
      yaml={YAML}
      groups={[
        {
          title: "İYS",
          description: "Your İYS account; the API key is in the install's secrets, not in the file.",
          items: [
            { label: "Brand code", value: <span className="font-mono">649201</span>, path: "iys.brand_code" },
            { label: "Recipients", value: "Individual (BIREYSEL)", path: "iys.recipient_type" },
            { label: "Sync", value: "Every 5 minutes, both ways", path: "iys.sync_every" },
          ],
        },
        {
          title: "Purposes",
          description: "A new text file for a purpose is a new version; earlier answers keep theirs.",
          items: PURPOSES.map((p) => ({
            label: p.name,
            value: `${p.versions[0]!.v} · ${p.channels.map((c) => CHANNEL[c].label).join(", ")}${p.iys ? " · İYS" : ""}`,
            path: `purposes.${p.id}`,
          })),
        },
        {
          title: "Banner and records",
          items: [
            { label: "Sites", value: "shop.example.com, docs.example.com; both ask first", path: "sites" },
            { label: "Ask again", value: "After 12 months", path: "banner.ask_again_after" },
            { label: "Keep records", value: "10 years after the last answer", path: "records.keep" },
          ],
        },
      ]}
    />
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  people: () => <PeoplePage />,
  purposes: () => <PurposesPage />,
  iys: () => <IysPage />,
  sites: () => <SitesPage />,
  checks: () => <ChecksPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="consent" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    await expect(c.getByRole("list", { name: "Latest changes" })).toHaveTextContent("replied STOP");
    await expect(c.getByRole("list", { name: "Answers by source" })).toHaveTextContent("İYS");
  },
};

export const People: Story = {
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const record = c.getByRole("region", { name: "Consent record" });
    // Ayşe replied STOP to an SMS: İYS reported it, and Ayşe's latest SMS answer is no.
    await expect(within(record).getByRole("list", { name: "History" })).toHaveTextContent("Replied STOP");
    await expect(within(record).getByRole("table", { name: "Latest answer by purpose and channel" })).toHaveTextContent("İYS: replied STOP");
    await userEvent.type(c.getByRole("searchbox", { name: "Search people" }), "zeynep");
    const table = c.getByRole("table", { name: "People" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await userEvent.click(within(table).getByText("Zeynep Arslan"));
    await expect(c.getByRole("region", { name: "Consent record" })).toHaveTextContent("later than the local refusal");
    await userEvent.clear(c.getByRole("searchbox", { name: "Search people" }));
    await userEvent.click(c.getByRole("tab", { name: /Changed today/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(3);
    await userEvent.click(c.getByRole("tab", { name: /Everyone/ }));
    blur(canvasElement);
  },
};

export const RecordAnAnswer: Story = {
  name: "Record an answer",
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const before = within(c.getByRole("list", { name: "History" })).getAllByRole("listitem").length;
    await userEvent.click(c.getByRole("button", { name: "Record an answer" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Record an answer from Ayşe Yılmaz" });
    await expect(within(dialog).getByRole("button", { name: "Record answer" })).toBeDisabled();
    await userEvent.type(within(dialog).getByRole("textbox", { name: "How it was given" }), "Asked not to be called, on a support call");
    await userEvent.click(within(dialog).getByRole("button", { name: "Record answer" }));
    await expect(c.getByRole("status")).toHaveTextContent("Commercial messages by Call for Ayşe Yılmaz: no, recorded. Sent to İYS within minutes.");
    await expect(within(c.getByRole("list", { name: "History" })).getAllByRole("listitem")).toHaveLength(before + 1);
    await expect(c.getByRole("region", { name: "Consent record" })).toHaveTextContent("Recorded by Emily Clark");
  },
};

export const ExportRecord: Story = {
  name: "Export for a KVKK request",
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Export for a KVKK request" }));
    await expect(c.getByRole("status")).toHaveTextContent("The record of Ayşe Yılmaz was exported as PDF and JSON");
  },
};

export const Purposes: Story = {
  ...app("purposes"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const text = c.getByRole("region", { name: "Text" });
    await expect(text).toHaveTextContent("Acme Sigorta");
    // An earlier version keeps its own text and the people who agreed to it.
    await userEvent.click(within(text).getByRole("radio", { name: "v2" }));
    await expect(text).not.toHaveTextContent("Acme Sigorta");
    await expect(text).toHaveTextContent("7,903 people's latest yes");
    await userEvent.click(within(c.getByRole("region", { name: "Purposes" })).getByRole("button", { name: /Measurement cookies/ }));
    await expect(
      within(c.getByRole("table", { name: "Versions" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(2);
    blur(canvasElement);
  },
};

export const Iys: Story = {
  name: "İYS",
  ...app("iys"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("table", { name: "Sync log" })).getByText("STOP reply via the SMS provider")).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /Disagreed/ }));
    await expect(within(c.getByRole("table", { name: "Disagreements" })).getAllByRole("row")[1]).toHaveTextContent("İYS, later");
    await userEvent.click(c.getByRole("tab", { name: /Rejected/ }));
    await userEvent.click(c.getByRole("button", { name: "Send again as +90" }));
    await expect(c.getByRole("status")).toHaveTextContent("İYS accepted it");
    blur(canvasElement);
  },
};

export const BannerAndPage: Story = {
  name: "Banner and page",
  ...app("sites"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("dialog", { name: "Cookie banner" })).toHaveTextContent("Reject all");
    await userEvent.click(c.getByRole("radio", { name: "Preference page" }));
    const sms = c.getByRole("switch", { name: "Offers by SMS" });
    await expect(sms).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sms);
    await expect(sms).toHaveAttribute("aria-checked", "true");
    await userEvent.click(c.getByRole("button", { name: "Save my choices" }));
    await expect(c.getByText(/Offers by SMS on, recorded for text v3/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Copy script tag" }));
    await expect(c.getByText("Script tag copied.")).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Checks: Story = {
  ...app("checks"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Latest checks" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Refused today 09:12 via İYS");
    await userEvent.click(c.getByRole("radio", { name: "Analytics" }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Read-only: consent.yaml decides")).toBeInTheDocument();
    await expect(c.getByLabelText("consent.yaml as applied")).toHaveTextContent('brand_code: "649201"');
  },
};
