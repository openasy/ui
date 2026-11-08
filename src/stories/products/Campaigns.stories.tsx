import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowLeft, CalendarRange, ChartColumn, Check, Copy, Link2, Megaphone, Plus, QrCode, Rocket, Upload } from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { rng } from "../mocks";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { BarList } from "../../charts/BarList";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import type { Tone } from "../../tokens/levels";
import { cn } from "../../lib/cn";

// Campaigns plans every campaign in one calendar with its brief, budget, tasks and approvals, makes links and QR codes
// tagged by the naming rules in campaigns.yaml, and shows one page of results: visits and goals from Analytics, sends
// and opens from Messages, won deals from CRM counted for the first and the last campaign that touched them, against
// the money spent. It does not buy or manage ads; spend from ad platforms is imported.

const nav = [
  { id: "calendar", label: "Calendar", icon: CalendarRange },
  { id: "campaigns", label: "Campaigns", icon: Megaphone, count: 1 },
  { id: "links", label: "Links", icon: Link2 },
  { id: "results", label: "Results", icon: ChartColumn },
];

const meta = {
  title: "Products/Campaigns",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
const LINK_HOST = "acme.example.com";
const tl = (n: number) => `${n.toLocaleString("en")} TL`;
const fmt = (n: number) => n.toLocaleString("en");
const roi = (revenue: number, spent: number) => (spent ? `${Math.round(((revenue - spent) / spent) * 100)}%` : "–");

type Channel = "email" | "sms" | "search" | "social" | "webinar" | "partner";
const CHANNEL: Record<Channel, { label: string; from: string }> = {
  email: { label: "Email", from: "Messages" },
  sms: { label: "SMS", from: "Messages" },
  search: { label: "Search ads", from: "Imported spend" },
  social: { label: "Social ads", from: "Imported spend" },
  webinar: { label: "Webinar", from: "Forms and Meet" },
  partner: { label: "Partners", from: "Tagged links" },
};

type State = "planned" | "approval" | "live" | "ended";
const STATE: Record<State, { label: string; tone: Tone }> = {
  planned: { label: "Planned", tone: "info" },
  approval: { label: "Waiting for approval", tone: "warning" },
  live: { label: "Live", tone: "success" },
  ended: { label: "Ended", tone: "neutral" },
};

interface Approver {
  name: string;
  role: string;
  at?: string;
}

interface Campaign {
  id: string;
  name: string;
  utm: string;
  start: string;
  end: string;
  state: State;
  owner: string;
  channels: Channel[];
  budget: number;
  spent: number;
  goal: string;
  /** The goal Analytics counts for it. */
  goalLabel: string;
  /** Email open rate from Messages. */
  opens?: string;
  audience: string;
  message: string;
  approvers: Approver[];
  visits: number;
  goals: number;
  firstDeals: number;
  lastDeals: number;
  firstRevenue: number;
  lastRevenue: number;
}

const CAMPAIGNS: Campaign[] = [
  {
    id: "autumn-2026",
    name: "Autumn 2026",
    utm: "autumn-2026",
    start: "2026-10-01",
    end: "2026-10-31",
    state: "ended",
    owner: ME,
    channels: ["email", "sms", "search", "social"],
    budget: 120000,
    spent: 112400,
    goal: "250 demo requests and 30 won deals",
    goalLabel: "Demo requests",
    opens: "18%",
    audience: "Small businesses doing their own books, and accountants with clients on paper invoices",
    message: "e-Fatura, e-Arşiv and bank feeds in one program, 30% off the first year",
    approvers: [
      { name: "Selin Aydın", role: "Brand", at: "22 Sep" },
      { name: ME, role: "Budget", at: "23 Sep" },
    ],
    visits: 6400,
    goals: 224,
    firstDeals: 24,
    lastDeals: 31,
    firstRevenue: 336000,
    lastRevenue: 412000,
  },
  {
    id: "webinar-e-arsiv",
    name: "e-Arşiv webinar",
    utm: "webinar-e-arsiv-2026",
    start: "2026-10-20",
    end: "2026-11-20",
    state: "live",
    owner: "Selin Aydın",
    channels: ["webinar", "email", "social"],
    budget: 25000,
    spent: 14200,
    goal: "200 registrations and 8 won deals",
    goalLabel: "Registrations",
    opens: "41%",
    audience: "Shops that must move to e-Arşiv in January",
    message: "What changes on 1 January, and how to be ready in an afternoon",
    approvers: [{ name: ME, role: "Budget", at: "14 Oct" }],
    visits: 1480,
    goals: 203,
    firstDeals: 9,
    lastDeals: 6,
    firstRevenue: 96000,
    lastRevenue: 71000,
  },
  {
    id: "year-end-2026",
    name: "Year-end closing 2026",
    utm: "year-end-2026",
    start: "2026-11-15",
    end: "2026-12-31",
    state: "approval",
    owner: "Burak Şahin",
    channels: ["email", "search", "social", "partner"],
    budget: 90000,
    spent: 0,
    goal: "1,500 checklist downloads and 20 won deals",
    goalLabel: "Checklist downloads",
    audience: "Free users and accountants closing the year by hand",
    message: "Close the year in two days: a free checklist, and Acme Books does the rest",
    approvers: [
      { name: "Selin Aydın", role: "Brand", at: "5 Nov" },
      { name: ME, role: "Budget" },
    ],
    visits: 0,
    goals: 0,
    firstDeals: 0,
    lastDeals: 0,
    firstRevenue: 0,
    lastRevenue: 0,
  },
  {
    id: "brand-search-2026",
    name: "Brand search 2026",
    utm: "brand-search-2026",
    start: "2026-01-01",
    end: "2026-12-31",
    state: "live",
    owner: "Burak Şahin",
    channels: ["search"],
    budget: 60000,
    spent: 52300,
    goal: "Keep the cost of a brand visit under 4 TL",
    goalLabel: "Sign-ups",
    audience: "People searching for Acme Books by name",
    message: "Acme Books: e-Fatura and accounting for small businesses",
    approvers: [{ name: ME, role: "Budget", at: "28 Dec 2025" }],
    visits: 14900,
    goals: 610,
    firstDeals: 58,
    lastDeals: 22,
    firstRevenue: 690000,
    lastRevenue: 268000,
  },
  {
    id: "payroll-launch-2027",
    name: "Payroll export launch",
    utm: "payroll-launch-2027",
    start: "2027-01-12",
    end: "2027-02-28",
    state: "planned",
    owner: ME,
    channels: ["email", "sms", "search", "partner"],
    budget: 150000,
    spent: 0,
    goal: "400 Business upgrades",
    goalLabel: "Upgrades",
    audience: "Pro customers with 5 or more employees",
    message: "Payroll to your accountant's program in one click",
    approvers: [
      { name: "Selin Aydın", role: "Brand" },
      { name: "Hakan Yıldız", role: "Sales" },
    ],
    visits: 0,
    goals: 0,
    firstDeals: 0,
    lastDeals: 0,
    firstRevenue: 0,
    lastRevenue: 0,
  },
];

const DAY = 86400000;
const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / DAY;
const short = (iso: string) => new Date(Date.parse(`${iso}T00:00:00Z`)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
const span = (c: Pick<Campaign, "start" | "end">) => `${short(c.start)} to ${short(c.end)}`;
const isApproved = (c: Campaign) => c.approvers.every((a) => a.at);

/* ---------------------------------------------------------- naming rules */

const SOURCES: Array<{ source: string; medium: string; channel: Channel }> = [
  { source: "google", medium: "cpc", channel: "search" },
  { source: "meta", medium: "paid-social", channel: "social" },
  { source: "linkedin", medium: "paid-social", channel: "social" },
  { source: "newsletter", medium: "email", channel: "email" },
  { source: "sms", medium: "sms", channel: "sms" },
  { source: "partner", medium: "referral", channel: "partner" },
  { source: "print", medium: "qr", channel: "partner" },
];
const MEDIUMS = [...new Set(SOURCES.map((s) => s.medium))];

/** Lowercase, Turkish letters to ASCII, anything else to dashes: what campaigns.yaml asks of every UTM value. */
function slug(s: string) {
  return s
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

const CAMPAIGN_RULE = /^[a-z0-9]+(-[a-z0-9]+)*-20\d\d$/;

function nameError(utm: string, campaigns: Campaign[]) {
  if (!utm) return undefined;
  if (!CAMPAIGN_RULE.test(utm)) return "Lowercase words and dashes, ending with the year, like winter-2026";
  const used = campaigns.find((c) => c.utm === utm);
  return used ? `Already used by ${used.name}; one name per campaign` : undefined;
}

/* -------------------------------------------------------------- calendar */

const RANGE = { start: "2026-09-01", end: "2027-02-28" };
const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan 2027", "Feb"];
const TODAY = "2026-11-08";

function Timeline({ campaigns, onOpen }: { campaigns: Campaign[]; onOpen: (id: string) => void }) {
  const from = day(RANGE.start);
  const total = day(RANGE.end) - from + 1;
  const at = (iso: string) => Math.min(100, Math.max(0, ((day(iso) - from) / total) * 100));
  return (
    <div className="flex flex-col gap-1">
      <div aria-hidden className="grid grid-cols-[180px_minmax(0,1fr)] text-2xs text-fg-muted">
        <span />
        <span className="grid grid-cols-6 border-b border-line">
          {MONTHS.map((m) => (
            <span key={m} className="border-l border-line px-1 py-1 first:border-l-0">
              {m}
            </span>
          ))}
        </span>
      </div>
      <ul aria-label="Campaigns in the calendar" className="flex flex-col gap-1">
        {campaigns.map((c) => {
          const left = at(c.start);
          const right = Math.min(100, at(c.end) + 100 / total);
          return (
            <li key={c.id} className="grid grid-cols-[180px_minmax(0,1fr)] items-center">
              <span className="flex min-w-0 flex-col pr-2">
                <span className="truncate text-sm text-fg">{c.name}</span>
                <span className="truncate text-2xs text-fg-muted">{c.channels.map((ch) => CHANNEL[ch].label).join(", ")}</span>
              </span>
              <span className="relative h-8 rounded-md bg-canvas">
                <span aria-hidden className="absolute inset-y-0 w-px bg-danger" style={{ left: `${at(TODAY)}%` }} />
                <button
                  type="button"
                  aria-label={`${c.name}, ${span(c)}, ${STATE[c.state].label}`}
                  onClick={() => onOpen(c.id)}
                  className={cn(
                    "absolute inset-y-1 truncate rounded px-1.5 text-left text-2xs font-medium",
                    c.state === "live" && "bg-success-soft text-fg",
                    c.state === "ended" && "bg-subtle text-fg",
                    c.state === "approval" && "bg-warning-soft text-fg",
                    c.state === "planned" && "bg-accent-soft text-accent-text",
                  )}
                  style={{ left: `${left}%`, width: `${Math.max(2, right - left)}%` }}
                >
                  {c.name}
                </button>
              </span>
            </li>
          );
        })}
      </ul>
      <p className="text-2xs text-fg-muted">The red line is today, 8 November.</p>
    </div>
  );
}

const COMING = [
  { id: "k1", at: "Sun 15 Nov 10:00", what: "Year-end closing checklist email to 18,240 people", from: "Messages", campaign: "Year-end closing 2026" },
  { id: "k2", at: "Tue 17 Nov 14:00", what: "e-Arşiv webinar, live in Meet", from: "Meet", campaign: "e-Arşiv webinar" },
  { id: "k3", at: "Wed 18 Nov 20:00", what: "Webinar recording SMS to registrants", from: "Messages", campaign: "e-Arşiv webinar" },
  {
    id: "k4",
    at: "Tue 1 Dec 09:00",
    what: "Partner newsletter: Yılmaz Muhasebe sends the checklist to 60 clients",
    from: "Tagged link",
    campaign: "Year-end closing 2026",
  },
];

function CalendarPage({ campaigns, onOpen }: { campaigns: Campaign[]; onOpen: (id: string) => void }) {
  const [channels, setChannels] = useState<string[]>([]);
  const shown = campaigns.filter((c) => !channels.length || c.channels.some((ch) => channels.includes(ch)));
  const year = campaigns.filter((c) => c.start.startsWith("2026"));
  return (
    <>
      <PageHeader title="Calendar" description="Every campaign over the months, by channel, with what goes out next." />
      <KpiGrid minWidth={170} className="my-2.5">
        <KpiCard label="Budget, 2026" value={tl(year.reduce((n, c) => n + c.budget, 0))} delta={{ label: `${year.length} campaigns`, intent: "neutral" }} />
        <KpiCard label="Spent so far" value={tl(year.reduce((n, c) => n + c.spent, 0))} />
        <KpiCard label="Live now" value={String(campaigns.filter((c) => c.state === "live").length)} />
        <KpiCard
          label="Waiting for approval"
          value={String(campaigns.filter((c) => c.state === "approval").length)}
          tone="warning"
          delta={{ label: "Year-end closing 2026 starts 15 Nov", intent: "bad" }}
        />
      </KpiGrid>
      <Panel
        aria-label="Calendar"
        title="September 2026 to February 2027"
        actions={
          <FilterBar onClear={channels.length ? () => setChannels([]) : undefined}>
            <FacetFilter
              label="Channel"
              options={(Object.keys(CHANNEL) as Channel[]).map((ch) => ({
                value: ch,
                label: CHANNEL[ch].label,
                count: campaigns.filter((c) => c.channels.includes(ch)).length,
              }))}
              selected={channels}
              onChange={setChannels}
            />
          </FilterBar>
        }
      >
        <Timeline campaigns={shown} onOpen={onOpen} />
      </Panel>
      <Panel title="Going out next" className="mt-2.5" flush>
        <ul aria-label="Going out next" className="flex flex-col">
          {COMING.map((k) => (
            <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-subtle px-3 py-2 text-sm last:border-0">
              <span className="flex min-w-0 flex-col">
                <span className="text-fg">{k.what}</span>
                <span className="text-2xs text-fg-muted">
                  {k.campaign} · {k.from}
                </span>
              </span>
              <span className="text-xs whitespace-nowrap text-fg-muted">{k.at}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------ link maker */

interface TaggedLink {
  id: string;
  campaign: string;
  url: string;
  source: string;
  medium: string;
  content: string;
  clicks: number;
  by: string;
}

const LINKS: TaggedLink[] = [
  { id: "l1", campaign: "autumn-2026", url: "/pricing", source: "newsletter", medium: "email", content: "hero-button", clicks: 2410, by: "Selin Aydın" },
  { id: "l2", campaign: "autumn-2026", url: "/pricing", source: "google", medium: "cpc", content: "ad-a", clicks: 1980, by: "Burak Şahin" },
  { id: "l3", campaign: "autumn-2026", url: "/banks", source: "meta", medium: "paid-social", content: "story-1", clicks: 940, by: "Burak Şahin" },
  { id: "l4", campaign: "autumn-2026", url: "/demo", source: "linkedin", medium: "paid-social", content: "carousel", clicks: 550, by: "Burak Şahin" },
  { id: "l5", campaign: "autumn-2026", url: "/demo", source: "sms", medium: "sms", content: "offer", clicks: 520, by: "Selin Aydın" },
  { id: "l6", campaign: "webinar-e-arsiv-2026", url: "/webinar/e-arsiv", source: "print", medium: "qr", content: "fair-stand", clicks: 212, by: ME },
  {
    id: "l7",
    campaign: "webinar-e-arsiv-2026",
    url: "/webinar/e-arsiv",
    source: "newsletter",
    medium: "email",
    content: "invite",
    clicks: 1012,
    by: "Selin Aydın",
  },
];

const tagged = (l: Pick<TaggedLink, "url" | "source" | "medium" | "content" | "campaign">) =>
  `https://${LINK_HOST}${l.url}?utm_source=${l.source}&utm_medium=${l.medium}&utm_campaign=${l.campaign}${l.content ? `&utm_content=${l.content}` : ""}`;

/** A QR code drawn for the story: the three finder squares and a fixed pattern seeded by the link. */
function QrImage({ value }: { value: string }) {
  const n = 25;
  const r = rng([...value].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7));
  const finder = (x: number, y: number) =>
    [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ].some(([fx, fy]) => x >= fx! && x < fx! + 7 && y >= fy! && y < fy! + 7);
  const on = (x: number, y: number) => {
    for (const [fx, fy] of [
      [0, 0],
      [n - 7, 0],
      [0, n - 7],
    ] as const) {
      const dx = x - fx;
      const dy = y - fy;
      if (dx >= 0 && dx < 7 && dy >= 0 && dy < 7) return dx === 0 || dy === 0 || dx === 6 || dy === 6 || (dx >= 2 && dx <= 4 && dy >= 2 && dy <= 4);
    }
    return false;
  };
  const cells: Array<[number, number]> = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (finder(x, y) ? on(x, y) : r() > 0.52) cells.push([x, y]);
  return (
    <svg role="img" aria-label={`QR code for ${value}`} viewBox={`-2 -2 ${n + 4} ${n + 4}`} className="size-40 rounded-md bg-white">
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="#000" />
      ))}
    </svg>
  );
}

function LinkBuilder({ campaigns, fixed, onMake }: { campaigns: Campaign[]; fixed?: string; onMake: (l: TaggedLink) => void }) {
  const [campaign, setCampaign] = useState(fixed ?? campaigns.find((c) => c.state !== "ended")?.utm ?? "");
  const [url, setUrl] = useState("/pricing");
  const [source, setSource] = useState("google");
  const [medium, setMedium] = useState("cpc");
  const [content, setContent] = useState("");
  const [qr, setQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const clean = slug(content);
  const link = tagged({ url, source, medium, content: clean, campaign });
  const badUrl = !url.startsWith("/");
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-2 sm:grid-cols-2">
        {!fixed && (
          <SelectField
            label="Campaign"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            options={campaigns.filter((c) => c.state !== "ended").map((c) => ({ value: c.utm, label: `${c.name} (${c.utm})` }))}
          />
        )}
        <TextField
          label="Page"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          mono
          error={badUrl ? `A page on ${LINK_HOST}, starting with /` : undefined}
          hint={`On ${LINK_HOST}`}
        />
        <SelectField
          label="Source"
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setMedium(SOURCES.find((s) => s.source === e.target.value)?.medium ?? medium);
          }}
          options={SOURCES.map((s) => ({ value: s.source, label: s.source }))}
        />
        <SelectField label="Medium" value={medium} onChange={(e) => setMedium(e.target.value)} options={MEDIUMS.map((m) => ({ value: m, label: m }))} />
        <TextField
          label="Content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="hero-button"
          hint={content && clean !== content ? `Saved as ${clean} by the naming rules` : "Which ad, button or post"}
        />
      </div>
      <code aria-label="Tagged link" className="block rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs break-all text-fg">
        {link}
      </code>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant="primary"
          icon={<Check />}
          disabled={badUrl || !campaign}
          onClick={() => {
            onMake({ id: `l${Date.now()}`, campaign, url, source, medium, content: clean, clicks: 0, by: ME });
            setCopied(true);
          }}
        >
          Save and copy
        </Button>
        <Button size="sm" icon={<QrCode />} disabled={badUrl || !campaign} onClick={() => setQr(true)}>
          QR code
        </Button>
        {copied && (
          <span role="status" className="text-xs text-success">
            Saved and copied. Clicks will show under {campaign}.
          </span>
        )}
      </div>
      {qr && (
        <div className="flex flex-wrap items-end gap-3">
          <QrImage value={link} />
          <span className="flex flex-col gap-1 text-xs text-fg-muted">
            For print: scans arrive in Analytics as utm_medium={medium}.
            <span className="flex gap-1.5">
              <Button size="xs">Download SVG</Button>
              <Button size="xs">Download PNG</Button>
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

function LinksTable({ links, label }: { links: TaggedLink[]; label: string }) {
  const [copied, setCopied] = useState<string | null>(null);
  const cols: Column<TaggedLink>[] = [
    {
      id: "url",
      header: "Link",
      width: "44%",
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs">{l.url}</span>
          <span className="truncate text-2xs text-fg-muted">
            {l.source} / {l.medium}
            {l.content ? ` / ${l.content}` : ""}
          </span>
        </span>
      ),
    },
    { id: "campaign", header: "Campaign", cell: (l) => <span className="font-mono text-xs">{l.campaign}</span> },
    {
      id: "clicks",
      header: "Visits",
      description: "Visits Analytics counted from this link",
      align: "right",
      mono: true,
      sortValue: (l) => l.clicks,
      cell: (l) => fmt(l.clicks),
    },
    { id: "by", header: "Made by", cell: (l) => <span className="text-xs">{l.by}</span> },
    {
      id: "copy",
      header: <span className="sr-only">Copy</span>,
      label: "Copy",
      align: "right",
      cell: (l) => (
        <IconButton label={`Copy the ${l.source} link to ${l.url}`} size="xs" onClick={() => setCopied(l.id)}>
          {copied === l.id ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        </IconButton>
      ),
    },
  ];
  return <DataTable label={label} columns={cols} rows={links} getRowId={(l) => l.id} defaultSort={{ id: "clicks", direction: "desc" }} minWidth={680} />;
}

function LinksPage({ campaigns }: { campaigns: Campaign[] }) {
  const [links, setLinks] = useState(LINKS);
  return (
    <>
      <PageHeader
        title="Links"
        description="Links and QR codes tagged by the naming rules in campaigns.yaml, so every channel reports under one campaign name."
      />
      <div className="mt-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel aria-label="Make a link" title="Make a link" description="Sources and mediums come from a fixed list; values are lowercased with dashes.">
          <LinkBuilder campaigns={campaigns} onMake={(l) => setLinks((ls) => [l, ...ls])} />
        </Panel>
        <Panel title="All links" flush>
          <LinksTable links={links} label="All links" />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------- campaign */

interface BudgetLine {
  id: string;
  what: string;
  channel: Channel;
  planned: number;
  spent: number;
  from: string;
}

const AUTUMN_BUDGET: BudgetLine[] = [
  { id: "b1", what: "Email sends", channel: "email", planned: 8000, spent: 6200, from: "Messages, Amazon SES cost" },
  { id: "b2", what: "SMS sends", channel: "sms", planned: 6000, spent: 4100, from: "Messages, Netgsm cost" },
  { id: "b3", what: "Google Ads", channel: "search", planned: 50000, spent: 48900, from: "Imported CSV, 1 Nov" },
  { id: "b4", what: "Meta Ads", channel: "social", planned: 34000, spent: 32600, from: "Imported CSV, 1 Nov" },
  { id: "b5", what: "LinkedIn Ads", channel: "social", planned: 22000, spent: 20600, from: "Imported CSV, 1 Nov" },
];

const YEAR_END_BUDGET: BudgetLine[] = [
  { id: "y1", what: "Email sends", channel: "email", planned: 6000, spent: 0, from: "Messages" },
  { id: "y2", what: "Google Ads", channel: "search", planned: 40000, spent: 0, from: "Import when live" },
  { id: "y3", what: "Meta Ads", channel: "social", planned: 30000, spent: 0, from: "Import when live" },
  { id: "y4", what: "Partner newsletters", channel: "partner", planned: 14000, spent: 0, from: "By hand" },
];

interface ChannelResult {
  id: string;
  name: string;
  spend: number;
  visits: number;
  goals: number;
  sent?: number;
  opened?: string;
  firstDeals: number;
  lastDeals: number;
  firstRevenue: number;
  lastRevenue: number;
}

const CHANNEL_RESULTS: Record<string, ChannelResult[]> = {
  "autumn-2026": [
    {
      id: "email",
      name: "Email, Messages",
      spend: 6200,
      visits: 2410,
      goals: 96,
      sent: 18240,
      opened: "18%",
      firstDeals: 6,
      lastDeals: 11,
      firstRevenue: 96000,
      lastRevenue: 138000,
    },
    { id: "sms", name: "SMS, Messages", spend: 4100, visits: 520, goals: 18, sent: 9800, firstDeals: 1, lastDeals: 3, firstRevenue: 12000, lastRevenue: 31000 },
    { id: "google", name: "Google Ads", spend: 48900, visits: 1980, goals: 74, firstDeals: 9, lastDeals: 9, firstRevenue: 118000, lastRevenue: 118000 },
    { id: "meta", name: "Meta Ads", spend: 32600, visits: 940, goals: 21, firstDeals: 3, lastDeals: 3, firstRevenue: 38000, lastRevenue: 38000 },
    { id: "linkedin", name: "LinkedIn Ads", spend: 20600, visits: 550, goals: 15, firstDeals: 5, lastDeals: 5, firstRevenue: 72000, lastRevenue: 87000 },
  ],
  "webinar-e-arsiv": [
    {
      id: "email",
      name: "Email, Messages",
      spend: 1200,
      visits: 1012,
      goals: 150,
      sent: 4800,
      opened: "41%",
      firstDeals: 4,
      lastDeals: 3,
      firstRevenue: 41000,
      lastRevenue: 30000,
    },
    { id: "meta", name: "Meta Ads", spend: 8000, visits: 256, goals: 31, firstDeals: 3, lastDeals: 2, firstRevenue: 33000, lastRevenue: 26000 },
    { id: "print", name: "Fair stand QR code", spend: 5000, visits: 212, goals: 22, firstDeals: 2, lastDeals: 1, firstRevenue: 22000, lastRevenue: 15000 },
  ],
  "brand-search-2026": [
    { id: "google", name: "Google Ads", spend: 52300, visits: 14900, goals: 610, firstDeals: 58, lastDeals: 22, firstRevenue: 690000, lastRevenue: 268000 },
  ],
};

interface WonDeal {
  id: string;
  deal: string;
  value: number;
  first: string;
  last: string;
  won: string;
}

const WON: WonDeal[] = [
  { id: "w1", deal: "Aksoy Danışmanlık: Pro, 6 users", value: 54000, first: "brand-search-2026", last: "autumn-2026", won: "4 Nov" },
  { id: "w2", deal: "Yılmaz Muhasebe: Business, 10 users", value: 37500, first: "autumn-2026", last: "autumn-2026", won: "30 Oct" },
  { id: "w3", deal: "Şen Gıda: Business, 8 users", value: 30000, first: "autumn-2026", last: "webinar-e-arsiv-2026", won: "6 Nov" },
  { id: "w4", deal: "Koç Elektrik: Pro, 3 users", value: 13500, first: "autumn-2026", last: "autumn-2026", won: "27 Oct" },
  { id: "w5", deal: "Aydemir Otomotiv: Pro, 4 users", value: 18000, first: "partner-summer-2026", last: "autumn-2026", won: "2 Nov" },
  { id: "w6", deal: "Bulut Market: Pro, 2 users", value: 9000, first: "webinar-e-arsiv-2026", last: "webinar-e-arsiv-2026", won: "5 Nov" },
  { id: "w7", deal: "Polat Gıda: Pro, 5 users", value: 22500, first: "brand-search-2026", last: "brand-search-2026", won: "3 Nov" },
];

interface Task {
  id: string;
  text: string;
  who: string;
  due: string;
  done: boolean;
}

const TASKS: Record<string, Task[]> = {
  "year-end-2026": [
    { id: "t1", text: "Write the checklist email", who: "Selin Aydın", due: "Done 4 Nov", done: true },
    { id: "t2", text: "Design the PDF checklist", who: "Emre Koç", due: "12 Nov", done: false },
    { id: "t3", text: "Set up the Google Ads ad group with the tagged links", who: "Burak Şahin", due: "14 Nov", done: false },
    { id: "t4", text: "Ask Yılmaz Muhasebe and 4 other partners for a newsletter slot", who: ME, due: "Overdue, 6 Nov", done: false },
  ],
  "webinar-e-arsiv": [
    { id: "t1", text: "Send the invitation email", who: "Selin Aydın", due: "Done 21 Oct", done: true },
    { id: "t2", text: "Print the QR code for the fair stand", who: ME, due: "Done 24 Oct", done: true },
    { id: "t3", text: "Prepare the slides with the 1 January changes", who: "Emre Koç", due: "16 Nov", done: false },
    { id: "t4", text: "Send the recording by SMS to everyone registered", who: "Selin Aydın", due: "18 Nov", done: false },
  ],
  "autumn-2026": [
    { id: "t1", text: "Write the Autumn offers email and SMS", who: "Selin Aydın", due: "Done 28 Sep", done: true },
    { id: "t2", text: "Set up Google, Meta and LinkedIn ads with the tagged links", who: "Burak Şahin", due: "Done 30 Sep", done: true },
    { id: "t3", text: "Import October's ad spend", who: "Burak Şahin", due: "Done 1 Nov", done: true },
  ],
};

const LAUNCH: Record<string, string[]> = {
  "year-end-2026": [
    "Turn on the form Year-end checklist download in Forms",
    "Schedule the Messages campaign Year-end closing checklist for 15 Nov 10:00",
    "Post the brief and links in Chat, channel #marketing",
  ],
  "webinar-e-arsiv": [
    "Turned on the form e-Arşiv webinar registration in Forms",
    "Scheduled the invitation email in Messages",
    "Made the Meet room for 17 Nov 14:00",
  ],
  "autumn-2026": ["Scheduled the Autumn offers email and SMS in Messages", "Posted the brief and links in Chat, channel #marketing"],
};

type CampaignTab = "brief" | "budget" | "links" | "results";

function BriefTab({ c, onApprove }: { c: Campaign; onApprove: () => void }) {
  const tasks = TASKS[c.id] ?? [];
  const steps = LAUNCH[c.id] ?? [];
  const ran = c.state === "live" || c.state === "ended";
  const [done, setDone] = useState(tasks.filter((t) => t.done).map((t) => t.id));
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex min-w-0 flex-col gap-2.5">
        <Panel aria-label="Brief" title="Brief">
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-sm">
            <dt className="text-xs text-fg-muted">Goal</dt>
            <dd className="text-fg">{c.goal}</dd>
            <dt className="text-xs text-fg-muted">Audience</dt>
            <dd className="text-fg">{c.audience}</dd>
            <dt className="text-xs text-fg-muted">Message</dt>
            <dd className="text-fg">{c.message}</dd>
            <dt className="text-xs text-fg-muted">Dates</dt>
            <dd className="text-fg">{span(c)}</dd>
            <dt className="text-xs text-fg-muted">Channels</dt>
            <dd className="flex flex-wrap gap-1">
              {c.channels.map((ch) => (
                <Badge key={ch}>{CHANNEL[ch].label}</Badge>
              ))}
            </dd>
            <dt className="text-xs text-fg-muted">Name in links</dt>
            <dd className="font-mono text-xs text-fg">utm_campaign={c.utm}</dd>
          </dl>
        </Panel>
        <Panel aria-label="Tasks" title="Tasks" description="Reminders by email the morning they are due">
          <ul aria-label="Tasks" className="flex flex-col gap-2">
            {!tasks.length && <li className="text-xs text-fg-muted">No tasks yet.</li>}
            {tasks.map((t) => (
              <li key={t.id} className="flex items-start justify-between gap-3 border-b border-subtle pb-2 last:border-0">
                <Checkbox
                  label={t.text}
                  description={t.who}
                  checked={done.includes(t.id)}
                  onChange={(e) => setDone((d) => (e.target.checked ? [...d, t.id] : d.filter((x) => x !== t.id)))}
                />
                <StatusBadge tone={done.includes(t.id) ? "success" : t.due.startsWith("Overdue") ? "danger" : "neutral"}>
                  {done.includes(t.id) ? "Done" : t.due}
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="flex flex-col gap-2.5">
        <Panel aria-label="Approvals" title="Approvals" description="It cannot go live until each of them has approved.">
          <ul aria-label="Approvers" className="flex flex-col gap-2">
            {c.approvers.map((a) => (
              <li key={a.name} className="flex items-center gap-2 text-sm">
                <Avatar name={a.name} size="sm" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-fg">{a.name}</span>
                  <span className="text-2xs text-fg-muted">{a.role}</span>
                </span>
                {a.at ? (
                  <StatusBadge tone="success">Approved {a.at}</StatusBadge>
                ) : a.name === ME ? (
                  <Button size="xs" variant="primary" onClick={onApprove}>
                    Approve
                  </Button>
                ) : (
                  <StatusBadge tone="warning">Waiting</StatusBadge>
                )}
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title={ran ? "Ran when it went live" : "When it goes live"} description="Steps Automation runs in other products">
          {steps.length ? (
            <ol aria-label="Launch steps" className="flex list-decimal flex-col gap-1 pl-4 text-xs text-fg">
              {steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          ) : (
            <p className="text-xs text-fg-muted">None. Add a launch step in Automation.</p>
          )}
        </Panel>
      </div>
    </div>
  );
}

function BudgetTab({ c }: { c: Campaign }) {
  const [lines, setLines] = useState(c.id === "autumn-2026" ? AUTUMN_BUDGET : c.id === "year-end-2026" ? YEAR_END_BUDGET : []);
  const [importing, setImporting] = useState(false);
  const [from, setFrom] = useState("google");
  const [line, setLine] = useState(lines[0]?.id ?? "");
  const [amount, setAmount] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const planned = lines.reduce((n, l) => n + l.planned, 0);
  const spent = lines.reduce((n, l) => n + l.spent, 0);
  const hand = from === "hand";
  const value = Number(amount.replace(/[.,\s]/g, ""));
  return (
    <>
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="Budget" value={tl(c.budget)} />
        <KpiCard label="Planned" value={tl(planned)} delta={{ label: `${tl(c.budget - planned)} not planned yet`, intent: "neutral" }} />
        <KpiCard
          label="Spent"
          value={tl(spent)}
          delta={{ label: c.budget ? `${Math.round((spent / c.budget) * 100)}% of the budget` : "no budget set", intent: spent > c.budget ? "bad" : "neutral" }}
        />
      </KpiGrid>
      <Panel
        title="By channel"
        description="Messages sends its own cost; ad platforms' spend is imported, since Campaigns does not buy ads."
        actions={
          <Button size="sm" icon={<Upload />} onClick={() => setImporting(true)}>
            Add spend
          </Button>
        }
        flush
      >
        <DataTable
          label="Budget by channel"
          rows={lines}
          getRowId={(l) => l.id}
          minWidth={640}
          columns={[
            {
              id: "what",
              header: "Line",
              cell: (l) => (
                <span className="flex flex-col">
                  <span className="font-medium">{l.what}</span>
                  <span className="text-2xs text-fg-muted">{CHANNEL[l.channel].label}</span>
                </span>
              ),
            },
            { id: "planned", header: "Planned", align: "right", mono: true, cell: (l) => tl(l.planned) },
            { id: "spent", header: "Spent", align: "right", mono: true, cell: (l) => tl(l.spent) },
            {
              id: "left",
              header: "Left",
              align: "right",
              cell: (l) => <span className={cn("font-mono text-xs", l.spent > l.planned && "text-danger-text")}>{tl(l.planned - l.spent)}</span>,
            },
            { id: "from", header: "From", cell: (l) => <span className="text-xs text-fg-muted">{l.from}</span> },
          ]}
        />
      </Panel>
      <Dialog
        open={importing}
        onOpenChange={setImporting}
        title="Add spend"
        description={`Rows are matched to the campaign by utm_campaign=${c.utm} or the ad campaign named the same.`}
        onSubmit={(e) => {
          e.preventDefault();
          if (hand) {
            if (!value) return;
            const l = lines.find((x) => x.id === line);
            setLines((ls) => ls.map((x) => (x.id === line ? { ...x, spent: x.spent + value, from: "By hand, today" } : x)));
            setNotice(`Added ${tl(value)} to ${l?.what ?? "the line"} by hand.`);
          } else {
            const name = from === "google" ? "Google Ads" : from === "meta" ? "Meta Ads" : "LinkedIn Ads";
            setLines((ls) => ls.map((x) => (x.what === name ? { ...x, from: "Imported CSV, today" } : x)));
            setNotice(`Imported ${name} spend: 31 days matched ${c.utm}, 2 rows of other campaigns skipped.`);
          }
          setImporting(false);
          setAmount("");
        }}
        footer={
          <>
            <Button type="button" onClick={() => setImporting(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={hand && !value}>
              {hand ? "Add" : "Import"}
            </Button>
          </>
        }
      >
        <SelectField
          label="From"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          options={[
            { value: "google", label: "Google Ads, CSV export" },
            { value: "meta", label: "Meta Ads, CSV export" },
            { value: "linkedin", label: "LinkedIn Ads, CSV export" },
            { value: "hand", label: "By hand" },
          ]}
        />
        {hand ? (
          <>
            <SelectField label="Line" value={line} onChange={(e) => setLine(e.target.value)} options={lines.map((l) => ({ value: l.id, label: l.what }))} />
            <TextField
              label="Amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="2,500"
              adornment={<span className="text-xs text-fg-muted">TL, without KDV</span>}
            />
          </>
        ) : (
          <label className="flex flex-col gap-1 text-xs font-medium text-fg">
            CSV file
            <input type="file" accept=".csv" className="text-xs font-normal text-fg-muted" />
            <span className="font-normal text-fg-muted">Day, campaign and cost columns are enough.</span>
          </label>
        )}
      </Dialog>
    </>
  );
}

/** A believable 31 days of visits that add up to what the campaign had in its first month. */
function visitsByDay(total: number) {
  const base = Array.from({ length: 31 }, (_, i) => 150 + 90 * Math.sin(i / 3) + (i === 7 || i === 14 ? 260 : 0) + (i % 7 === 5 ? -60 : 0));
  const sum = base.reduce((n, v) => n + v, 0);
  return base.map((v) => Math.round((v / sum) * Math.min(total, 6400)));
}

function ResultsTab({ c }: { c: Campaign }) {
  const [touch, setTouch] = useState<"both" | "first" | "last">("both");
  const rows = CHANNEL_RESULTS[c.id] ?? [];
  const deals = WON.filter((w) => (touch === "both" ? w.first === c.utm || w.last === c.utm : touch === "first" ? w.first === c.utm : w.last === c.utm));
  if (!c.visits)
    return (
      <Callout tone="info" title="No results yet">
        Results arrive once the campaign is live and its links are clicked.
      </Callout>
    );
  return (
    <>
      <KpiGrid minWidth={150} className="mb-2.5">
        <KpiCard label="Spent" value={tl(c.spent)} delta={{ label: `of ${tl(c.budget)}`, intent: "neutral" }} />
        <KpiCard label="Visits" value={fmt(c.visits)} delta={{ label: "from Analytics", intent: "neutral" }} />
        <KpiCard label={c.goalLabel} value={fmt(c.goals)} delta={{ label: "goal in Analytics", intent: "neutral" }} />
        {c.opens && <KpiCard label="Email opens" value={c.opens} delta={{ label: "from Messages", intent: "neutral" }} />}
        <KpiCard label="Won deals, first touch" value={String(c.firstDeals)} delta={{ label: tl(c.firstRevenue), intent: "neutral" }} />
        <KpiCard label="Won deals, last touch" value={String(c.lastDeals)} delta={{ label: tl(c.lastRevenue), intent: "neutral" }} />
        <KpiCard
          label="Return on spend"
          value={roi(c.lastRevenue, c.spent)}
          unit="last touch"
          delta={{ label: `${roi(c.firstRevenue, c.spent)} first touch`, intent: "neutral" }}
        />
      </KpiGrid>
      <Callout tone="info" title="A deal counts for the first and the last campaign that touched it" className="mb-2.5">
        Both are shown side by side and never blended. Deals won within 90 days of a touch count.
      </Callout>
      <Panel title="By channel" flush className="mb-2.5">
        <DataTable
          label="Results by channel"
          rows={rows}
          getRowId={(r) => r.id}
          minWidth={920}
          columns={[
            { id: "name", header: "Channel", cell: (r) => <span className="font-medium">{r.name}</span> },
            { id: "spend", header: "Spent", align: "right", mono: true, sortValue: (r) => r.spend, cell: (r) => tl(r.spend) },
            { id: "visits", header: "Visits", align: "right", mono: true, sortValue: (r) => r.visits, cell: (r) => fmt(r.visits) },
            { id: "goals", header: c.goalLabel, align: "right", mono: true, cell: (r) => fmt(r.goals) },
            {
              id: "sent",
              header: "Sent, opened",
              align: "right",
              cell: (r) => <span className="font-mono text-xs">{r.sent ? `${fmt(r.sent)}${r.opened ? `, ${r.opened}` : ""}` : "–"}</span>,
            },
            { id: "first", header: "Won, first", align: "right", mono: true, cell: (r) => `${r.firstDeals}, ${tl(r.firstRevenue)}` },
            { id: "last", header: "Won, last", align: "right", mono: true, cell: (r) => `${r.lastDeals}, ${tl(r.lastRevenue)}` },
            {
              id: "cost",
              header: "Cost per won deal",
              description: "Spent divided by won deals, last touch",
              align: "right",
              mono: true,
              cell: (r) => (r.lastDeals ? tl(Math.round(r.spend / r.lastDeals)) : "–"),
            },
          ]}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Visits by day" description={`From Analytics, utm_campaign=${c.utm}, the first 31 days`}>
          <TimeSeriesChart
            label={`Visits by day, ${c.name}`}
            labels={Array.from({ length: 31 }, (_, i) => short(new Date((day(c.start) + i) * DAY).toISOString().slice(0, 10)))}
            series={[
              {
                id: "v",
                name: "Visits",
                data: visitsByDay(c.visits),
              },
            ]}
            xTicks={6}
            height={190}
          />
        </Panel>
        <Panel
          aria-label="Won deals"
          title="Won deals"
          description="From CRM, with the campaigns that touched them first and last"
          actions={
            <SegmentedControl
              label="Counted as"
              value={touch}
              onChange={setTouch}
              options={[
                { value: "both", label: "Either" },
                { value: "first", label: "First touch" },
                { value: "last", label: "Last touch" },
              ]}
            />
          }
        >
          <ul aria-label="Won deals" className="flex flex-col gap-1.5">
            {deals.map((w) => (
              <li key={w.id} className="flex items-start justify-between gap-2 border-b border-subtle pb-1.5 text-sm last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-fg">{w.deal}</span>
                  <span className="font-mono text-2xs text-fg-muted">
                    first {w.first} · last {w.last}
                  </span>
                </span>
                <span className="font-mono text-xs whitespace-nowrap">{tl(w.value)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-2xs text-fg-muted">The latest 5 are shown; every won deal it touched is in CRM under the campaign.</p>
        </Panel>
      </div>
    </>
  );
}

function CampaignView({
  c,
  campaigns,
  onBack,
  onChange,
  initialTab = "brief",
}: {
  c: Campaign;
  campaigns: Campaign[];
  onBack: () => void;
  onChange: (c: Campaign) => void;
  initialTab?: CampaignTab;
}) {
  const [tab, setTab] = useState<CampaignTab>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);
  const [making, setMaking] = useState(false);
  const [links, setLinks] = useState(LINKS.filter((l) => l.campaign === c.utm));
  const waiting = c.approvers.filter((a) => !a.at);
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Campaigns", href: "#campaigns" }, { label: c.name }]}
        title={c.name}
        description={`${span(c)} · owned by ${c.owner}`}
        meta={<StatusBadge tone={STATE[c.state].tone}>{STATE[c.state].label}</StatusBadge>}
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onBack}>
              Back to campaigns
            </Button>
            {(c.state === "approval" || c.state === "planned") && (
              <Button
                variant="primary"
                icon={<Rocket />}
                disabled={!isApproved(c)}
                onClick={() => {
                  onChange({ ...c, state: "live" });
                  const n = (LAUNCH[c.id] ?? []).length;
                  setNotice(`${c.name} is live.${n ? ` Automation ran ${n} launch steps.` : ""} Its links count from now.`);
                }}
              >
                Mark live
              </Button>
            )}
          </>
        }
      >
        <Tabs
          label="Campaign"
          value={tab}
          onChange={setTab}
          items={[
            { value: "brief", label: "Brief and tasks" },
            { value: "budget", label: "Budget" },
            { value: "links", label: "Links", count: links.length },
            { value: "results", label: "Results" },
          ]}
        />
      </PageHeader>
      <div className="mt-2.5">
        {notice && (
          <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
            {notice}
          </div>
        )}
        {waiting.length > 0 && c.state !== "live" && (
          <p className="mb-2.5 text-xs text-fg-muted">Cannot go live yet: waiting for {waiting.map((a) => a.name).join(" and ")} to approve.</p>
        )}
        {tab === "brief" && (
          <BriefTab
            c={c}
            onApprove={() => {
              onChange({
                ...c,
                state: c.state === "planned" ? "planned" : "approval",
                approvers: c.approvers.map((a) => (a.name === ME ? { ...a, at: "Today" } : a)),
              });
              setNotice(`${ME} approved the budget of ${tl(c.budget)}.`);
            }}
          />
        )}
        {tab === "budget" && <BudgetTab c={c} />}
        {tab === "links" && (
          <Panel
            title="Links"
            description={`Every link carries utm_campaign=${c.utm}`}
            actions={
              <Button size="sm" icon={<Plus />} onClick={() => setMaking(true)}>
                Make a link
              </Button>
            }
            flush
          >
            <LinksTable links={links} label="Campaign links" />
          </Panel>
        )}
        {tab === "results" && <ResultsTab c={c} />}
      </div>
      <Dialog open={making} onOpenChange={setMaking} title={`Make a link for ${c.name}`} size="lg">
        <LinkBuilder campaigns={campaigns} fixed={c.utm} onMake={(l) => setLinks((ls) => [l, ...ls])} />
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------ campaigns */

function NewCampaignDialog({
  open,
  onOpenChange,
  campaigns,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  campaigns: Campaign[];
  onCreate: (c: Campaign) => void;
}) {
  const [name, setName] = useState("");
  const [utm, setUtm] = useState<string | null>(null);
  const [start, setStart] = useState("2026-12-01");
  const [end, setEnd] = useState("2026-12-31");
  const [budget, setBudget] = useState("");
  const [approvers, setApprovers] = useState(["Selin Aydın"]);
  const value = utm ?? (name ? `${slug(name)}-${start.slice(0, 4)}` : "");
  const error = nameError(value, campaigns);
  const ok = name.trim() && value && !error && end >= start;
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New campaign"
      description="It starts as planned. With approvers named, it cannot go live until each has approved."
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        onCreate({
          id: value,
          name: name.trim(),
          utm: value,
          start,
          end,
          state: approvers.length ? "approval" : "planned",
          owner: ME,
          channels: ["email"],
          budget: Number(budget.replace(/[.,\s]/g, "")) || 0,
          spent: 0,
          goal: "Not set yet",
          goalLabel: "Goals",
          audience: "Not set yet",
          message: "Not set yet",
          approvers: approvers.map((a) => ({ name: a, role: a === ME ? "Budget" : "Brand" })),
          visits: 0,
          goals: 0,
          firstDeals: 0,
          lastDeals: 0,
          firstRevenue: 0,
          lastRevenue: 0,
        });
        setName("");
        setUtm(null);
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!ok}>
            Create campaign
          </Button>
        </>
      }
    >
      <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Winter offers" />
      <TextField
        label="utm_campaign"
        mono
        value={value}
        onChange={(e) => setUtm(e.target.value)}
        error={error}
        hint="Made from the name and the start year; every link of the campaign carries it."
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Starts" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
        <TextField label="Ends" type="date" value={end} onChange={(e) => setEnd(e.target.value)} error={end < start ? "Ends before it starts" : undefined} />
      </div>
      <TextField
        label="Budget"
        inputMode="numeric"
        value={budget}
        onChange={(e) => setBudget(e.target.value)}
        placeholder="60,000"
        adornment={<span className="text-xs text-fg-muted">TL</span>}
      />
      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-xs font-medium text-fg">Approvers</legend>
        {["Selin Aydın", ME, "Hakan Yıldız"].map((a) => (
          <Checkbox
            key={a}
            label={a}
            checked={approvers.includes(a)}
            onChange={(e) => setApprovers((x) => (e.target.checked ? [...x, a] : x.filter((y) => y !== a)))}
          />
        ))}
      </fieldset>
    </Dialog>
  );
}

function CampaignsPage({
  campaigns,
  open,
  setOpen,
  onChange,
  onCreate,
  initialTab,
}: {
  campaigns: Campaign[];
  open: string | null;
  setOpen: (id: string | null) => void;
  onChange: (c: Campaign) => void;
  onCreate: (c: Campaign) => void;
  initialTab?: CampaignTab;
}) {
  const [creating, setCreating] = useState(false);
  const [state, setState] = useState<"all" | State>("all");
  const cur = campaigns.find((c) => c.id === open);
  if (cur) return <CampaignView key={cur.id} c={cur} campaigns={campaigns} initialTab={initialTab} onBack={() => setOpen(null)} onChange={onChange} />;
  const rows = campaigns.filter((c) => state === "all" || c.state === state);
  const cols: Column<Campaign>[] = [
    {
      id: "name",
      header: "Campaign",
      width: "26%",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{c.utm}</span>
        </span>
      ),
    },
    { id: "state", header: "State", cell: (c) => <StatusBadge tone={STATE[c.state].tone}>{STATE[c.state].label}</StatusBadge> },
    { id: "dates", header: "Dates", sortValue: (c) => c.start, cell: (c) => <span className="text-xs whitespace-nowrap">{span(c)}</span> },
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
    { id: "budget", header: "Budget", align: "right", mono: true, sortValue: (c) => c.budget, cell: (c) => tl(c.budget) },
    { id: "spent", header: "Spent", align: "right", mono: true, sortValue: (c) => c.spent, cell: (c) => (c.spent ? tl(c.spent) : "–") },
    { id: "won", header: "Won, first / last", align: "right", mono: true, cell: (c) => (c.visits ? `${c.firstDeals} / ${c.lastDeals}` : "–") },
    {
      id: "roi",
      header: "Return, last touch",
      description: "Revenue of won deals, last touch, less what was spent, over what was spent",
      align: "right",
      mono: true,
      cell: (c) => (c.visits ? roi(c.lastRevenue, c.spent) : "–"),
    },
  ];
  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Every campaign with its dates, budget and what it brought."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            New campaign
          </Button>
        }
      />
      <Panel flush className="mt-2.5">
        <div className="px-3 py-2">
          <SegmentedControl
            label="State"
            value={state}
            onChange={setState}
            options={[
              { value: "all", label: "All" },
              { value: "planned", label: "Planned" },
              { value: "approval", label: "Waiting" },
              { value: "live", label: "Live" },
              { value: "ended", label: "Ended" },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable label="Campaigns" columns={cols} rows={rows} getRowId={(c) => c.id} onRowClick={(c) => setOpen(c.id)} minWidth={960} />
        </div>
      </Panel>
      <NewCampaignDialog
        open={creating}
        onOpenChange={setCreating}
        campaigns={campaigns}
        onCreate={(c) => {
          onCreate(c);
          setCreating(false);
          setOpen(c.id);
        }}
      />
    </>
  );
}

/* --------------------------------------------------------------- results */

function ResultsPage({ campaigns }: { campaigns: Campaign[] }) {
  const [touch, setTouch] = useState<"last" | "first">("last");
  const measured = campaigns.filter((c) => c.visits);
  const spent = measured.reduce((n, c) => n + c.spent, 0);
  const first = measured.reduce((n, c) => n + c.firstRevenue, 0);
  const last = measured.reduce((n, c) => n + c.lastRevenue, 0);
  return (
    <>
      <PageHeader
        title="Results"
        description="What each campaign cost and brought, 2026. Visits and goals from Analytics, sends from Messages, deals from CRM."
        actions={
          <SegmentedControl
            label="Attribution"
            value={touch}
            onChange={setTouch}
            options={[
              { value: "last", label: "Last touch" },
              { value: "first", label: "First touch" },
            ]}
          />
        }
      />
      <KpiGrid minWidth={170} className="my-2.5">
        <KpiCard label="Spent" value={tl(spent)} />
        <KpiCard
          label={`Revenue, ${touch} touch`}
          value={tl(touch === "last" ? last : first)}
          delta={{ label: `${tl(touch === "last" ? first : last)} ${touch === "last" ? "first" : "last"} touch`, intent: "neutral" }}
        />
        <KpiCard label={`Return, ${touch} touch`} value={roi(touch === "last" ? last : first, spent)} />
        <KpiCard label="Visits" value={fmt(measured.reduce((n, c) => n + c.visits, 0))} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel title="By campaign" flush>
          <DataTable
            label="Results by campaign"
            rows={measured}
            getRowId={(c) => c.id}
            minWidth={760}
            defaultSort={{ id: "spent", direction: "desc" }}
            columns={[
              { id: "name", header: "Campaign", cell: (c) => <span className="font-medium">{c.name}</span> },
              { id: "spent", header: "Spent", align: "right", mono: true, sortValue: (c) => c.spent, cell: (c) => tl(c.spent) },
              { id: "first", header: "Won, first touch", align: "right", mono: true, cell: (c) => `${c.firstDeals}, ${tl(c.firstRevenue)}` },
              { id: "last", header: "Won, last touch", align: "right", mono: true, cell: (c) => `${c.lastDeals}, ${tl(c.lastRevenue)}` },
              { id: "roiFirst", header: "Return, first", align: "right", mono: true, cell: (c) => roi(c.firstRevenue, c.spent) },
              { id: "roiLast", header: "Return, last", align: "right", mono: true, cell: (c) => roi(c.lastRevenue, c.spent) },
            ]}
          />
        </Panel>
        <Panel title={`Revenue, ${touch} touch`} description="Won deals from CRM">
          <BarList
            label={`Revenue by campaign, ${touch} touch`}
            format={tl}
            items={measured.map((c) => ({ id: c.id, label: c.name, value: touch === "last" ? c.lastRevenue : c.firstRevenue }))}
          />
        </Panel>
      </div>
      <Callout tone="info" title="Brand search starts deals that other campaigns finish">
        Brand search 2026 is the first touch of 58 won deals and the last of 22: people find Acme Books by name, then come back from an email or an ad.
      </Callout>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `naming:
  campaign: "^[a-z0-9]+(-[a-z0-9]+)*-20\\\\d\\\\d$"   # winter-2026
  content: lowercase-dashes
  sources:
    google: cpc
    meta: paid-social
    linkedin: paid-social
    newsletter: email
    sms: sms
    partner: referral
    print: qr
approvals:
  required_over: 20000 TL
  default: [selin.aydin, emily.clark]
spend:
  currency: TRY
  import: [google-ads-csv, meta-ads-csv, linkedin-ads-csv]
attribution:
  models: [first_touch, last_touch]   # both shown, never blended
  window: 90d
results_from:
  analytics: analytics     # OpenAsy Analytics
  messages: messages       # OpenAsy Messages
  crm: crm                 # OpenAsy CRM
launch:
  automation: automation   # OpenAsy Automation
roles:
  admins: [group:marketing-leads]
  editors: [group:marketing]
  viewers: [group:sales, group:finance]`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="campaigns"
      file="campaigns.yaml"
      applied="1 week ago"
      yaml={YAML}
      groups={[
        {
          title: "Naming",
          description: "So one campaign never reports under two names.",
          items: [
            { label: "Campaign names", value: "Lowercase words and dashes, ending with the year", path: "naming.campaign" },
            { label: "Sources and mediums", value: `${SOURCES.length} sources, each with its medium`, path: "naming.sources" },
          ],
        },
        {
          title: "Approvals and spend",
          items: [
            { label: "Approvals", value: "Needed for budgets over 20,000 TL; Selin Aydın and Emily Clark by default", path: "approvals" },
            { label: "Spend", value: "TRY; imported from Google Ads, Meta Ads and LinkedIn Ads CSV, or entered by hand", path: "spend" },
          ],
        },
        {
          title: "Attribution",
          items: [{ label: "Models", value: "First and last touch, both shown; deals won within 90 days count", path: "attribution" }],
        },
        {
          title: "Who may change what",
          items: [{ label: "Roles", value: "Marketing leads are admins; marketing edits; sales and finance may view", path: "roles" }],
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------- app */

function CampaignsApp({ initial, open: initialOpen = null, tab }: { initial: string; open?: string | null; tab?: CampaignTab }) {
  const [campaigns, setCampaigns] = useState(CAMPAIGNS);
  const [open, setOpen] = useState<string | null>(initialOpen);
  const [jump, setJump] = useState({ page: initial, n: 0 });
  const change = (c: Campaign) => setCampaigns((cs) => cs.map((x) => (x.id === c.id ? c : x)));
  const pages: PageMap = {
    calendar: () => (
      <CalendarPage
        campaigns={campaigns}
        onOpen={(id) => {
          setOpen(id);
          setJump((j) => ({ page: "campaigns", n: j.n + 1 }));
        }}
      />
    ),
    campaigns: () => (
      <CampaignsPage
        campaigns={campaigns}
        open={open}
        setOpen={setOpen}
        onChange={change}
        onCreate={(c) => setCampaigns((cs) => [...cs, c])}
        initialTab={tab}
      />
    ),
    links: () => <LinksPage campaigns={campaigns} />,
    results: () => <ResultsPage campaigns={campaigns} />,
    settings: () => <SettingsPage />,
  };
  // ProductApp keeps its own page state; a new key moves it to Campaigns when the calendar opens one.
  return <ProductApp key={jump.n} product="campaigns" nav={nav} pages={pages} initial={jump.page} />;
}

const app = (initial: string, open?: string, tab?: CampaignTab): Story => ({ render: () => <CampaignsApp initial={initial} open={open} tab={tab} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();
const body = (el: HTMLElement) => within(el.ownerDocument.body);

/* ----------------------------------------------------------------- stories */

export const Calendar: Story = {
  ...app("calendar"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const list = c.getByRole("list", { name: "Campaigns in the calendar" });
    await expect(within(list).getAllByRole("listitem")).toHaveLength(5);
    await expect(c.getByRole("list", { name: "Going out next" })).toHaveTextContent("Year-end closing checklist email");
    await userEvent.click(c.getByRole("button", { name: "Channel" }));
    await userEvent.click(body(canvasElement).getByRole("checkbox", { name: /Webinar/ }));
    await userEvent.keyboard("{Escape}");
    await expect(within(c.getByRole("list", { name: "Campaigns in the calendar" })).getAllByRole("listitem")).toHaveLength(1);
    await userEvent.click(c.getByRole("button", { name: "e-Arşiv webinar, 20 Oct to 20 Nov, Live" }));
    await expect(c.getByRole("heading", { level: 1, name: "e-Arşiv webinar" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Campaigns: Story = {
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Campaigns" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(5);
    await expect(within(table).getByText("Autumn 2026").closest("tr")).toHaveTextContent("267%");
    await userEvent.click(c.getByRole("radio", { name: "Waiting" }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await userEvent.click(within(table).getByText("Year-end closing 2026"));
    await expect(c.getByRole("heading", { level: 1, name: "Year-end closing 2026" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const NewCampaign: Story = {
  name: "New campaign",
  ...app("campaigns"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New campaign" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "New campaign" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Kış Fırsatları");
    const utm = dialog.getByRole("textbox", { name: "utm_campaign" });
    await expect(utm).toHaveValue("kis-firsatlari-2026");
    await userEvent.clear(utm);
    await userEvent.type(utm, "Autumn-2026");
    await expect(dialog.getByText(/ending with the year/)).toBeInTheDocument();
    await userEvent.clear(utm);
    await userEvent.type(utm, "autumn-2026");
    await expect(dialog.getByText("Already used by Autumn 2026; one name per campaign")).toBeInTheDocument();
    await expect(dialog.getByRole("button", { name: "Create campaign" })).toBeDisabled();
    await userEvent.clear(utm);
    await userEvent.type(utm, "winter-offers-2026");
    await userEvent.type(dialog.getByRole("textbox", { name: "Budget" }), "60000");
    await userEvent.click(dialog.getByRole("button", { name: "Create campaign" }));
    await expect(c.getByRole("heading", { level: 1, name: "Kış Fırsatları" })).toBeInTheDocument();
    await expect(c.getByText("Cannot go live yet: waiting for Selin Aydın to approve.")).toBeInTheDocument();
  },
};

export const CampaignPage: Story = {
  name: "Campaign",
  ...app("campaigns", "year-end-2026"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Brief" })).toHaveTextContent("utm_campaign=year-end-2026");
    await expect(c.getByRole("list", { name: "Launch steps" })).toHaveTextContent("Turn on the form Year-end checklist download in Forms");
    await userEvent.click(c.getByRole("checkbox", { name: /Design the PDF checklist/ }));
    await expect(c.getByRole("checkbox", { name: /Design the PDF checklist/ })).toBeChecked();
    blur(canvasElement);
  },
};

export const ApproveAndLaunch: Story = {
  name: "Approve and mark live",
  ...app("campaigns", "year-end-2026"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "Mark live" })).toBeDisabled();
    await expect(c.getByText("Cannot go live yet: waiting for Emily Clark to approve.")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("region", { name: "Approvals" })).getByRole("button", { name: "Approve" }));
    await expect(c.getByRole("status")).toHaveTextContent("Emily Clark approved the budget of 90,000 TL.");
    await userEvent.click(c.getByRole("button", { name: "Mark live" }));
    await expect(c.getByRole("status")).toHaveTextContent("Year-end closing 2026 is live. Automation ran 3 launch steps");
    await expect(c.queryByText("Waiting for approval")).not.toBeInTheDocument();
    await expect(c.getByText("Live")).toBeInTheDocument();
  },
};

export const Budget: Story = {
  ...app("campaigns", "autumn-2026", "budget"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Budget by channel" });
    await expect(table).toHaveTextContent("Imported CSV, 1 Nov");
    await userEvent.click(c.getByRole("button", { name: "Add spend" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add spend" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "From" }), "hand");
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Line" }), "SMS sends");
    await userEvent.type(dialog.getByRole("textbox", { name: "Amount" }), "1500");
    await userEvent.click(dialog.getByRole("button", { name: "Add" }));
    await expect(c.getByRole("status")).toHaveTextContent("Added 1,500 TL to SMS sends by hand.");
    await expect(within(table).getByText("SMS sends").closest("tr")).toHaveTextContent("5,600 TL");
  },
};

export const ImportSpend: Story = {
  name: "Import ad spend",
  ...app("campaigns", "autumn-2026", "budget"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add spend" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add spend" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "From" }), "meta");
    await userEvent.click(dialog.getByRole("button", { name: "Import" }));
    await expect(c.getByRole("status")).toHaveTextContent("Imported Meta Ads spend: 31 days matched autumn-2026");
    await expect(
      within(c.getByRole("table", { name: "Budget by channel" }))
        .getByText("Meta Ads")
        .closest("tr"),
    ).toHaveTextContent("Imported CSV, today");
  },
};

export const CampaignLinks: Story = {
  name: "Campaign links",
  ...app("campaigns", "autumn-2026", "links"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Campaign links" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(5);
    await userEvent.click(c.getByRole("button", { name: "Make a link" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Make a link for Autumn 2026" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Source" }), "partner");
    await userEvent.click(dialog.getByRole("button", { name: "Save and copy" }));
    await userEvent.keyboard("{Escape}");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(6);
  },
};

export const CampaignResults: Story = {
  name: "Campaign results",
  ...app("campaigns", "autumn-2026", "results"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Results by channel" });
    await expect(within(table).getByText("Email, Messages").closest("tr")).toHaveTextContent("18,240, 18%");
    await expect(c.getByText("A deal counts for the first and the last campaign that touched it")).toBeInTheDocument();
    const deals = c.getByRole("list", { name: "Won deals" });
    await expect(within(deals).getAllByRole("listitem")).toHaveLength(5);
    await userEvent.click(c.getByRole("radio", { name: "First touch" }));
    await expect(within(c.getByRole("list", { name: "Won deals" })).getAllByRole("listitem")).toHaveLength(3);
    await userEvent.click(c.getByRole("radio", { name: "Last touch" }));
    await expect(within(c.getByRole("list", { name: "Won deals" })).getAllByRole("listitem")).toHaveLength(4);
    blur(canvasElement);
  },
};

export const Links: Story = {
  ...app("links"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const maker = within(c.getByRole("region", { name: "Make a link" }));
    await userEvent.selectOptions(maker.getByRole("combobox", { name: "Source" }), "meta");
    await expect(maker.getByRole("combobox", { name: "Medium" })).toHaveValue("paid-social");
    await userEvent.type(maker.getByRole("textbox", { name: "Content" }), "Story Kış");
    await expect(maker.getByText("Saved as story-kis by the naming rules")).toBeInTheDocument();
    await expect(maker.getByLabelText("Tagged link")).toHaveTextContent(
      `https://${LINK_HOST}/pricing?utm_source=meta&utm_medium=paid-social&utm_campaign=webinar-e-arsiv-2026&utm_content=story-kis`,
    );
    await userEvent.click(maker.getByRole("button", { name: "QR code" }));
    await expect(maker.getByRole("img", { name: /^QR code for https:/ })).toBeInTheDocument();
    await userEvent.click(maker.getByRole("button", { name: "Save and copy" }));
    await expect(maker.getByRole("status")).toHaveTextContent("Clicks will show under webinar-e-arsiv-2026.");
    await expect(
      within(c.getByRole("table", { name: "All links" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(8);
    blur(canvasElement);
  },
};

export const Results: Story = {
  ...app("results"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "Results by campaign" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(3);
    await expect(c.getByRole("list", { name: "Revenue by campaign, last touch" })).toHaveTextContent("412,000 TL");
    await userEvent.click(c.getByRole("radio", { name: "First touch" }));
    await expect(c.getByRole("list", { name: "Revenue by campaign, first touch" })).toHaveTextContent("690,000 TL");
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("campaigns.yaml as applied")).toHaveTextContent("models: [first_touch, last_touch]");
  },
};
