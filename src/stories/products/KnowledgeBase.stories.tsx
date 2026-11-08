import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Check, ExternalLink, FileSearch, FileText, LayoutDashboard, Lightbulb, Library, PenLine, Plus, SearchX, ThumbsDown, ThumbsUp } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Dialog } from "../../components/Dialog";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { wave } from "../mocks";

// Knowledge Base: a public help center of articles by topic and language, suggested in the ticket form and the chat
// window before a ticket is opened. Gaps lists searches that found nothing; articles that often do not help go to
// their owner. Acme sells Acme Books, an online accounting app with e-Fatura.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "articles", label: "Articles", icon: Library },
  { id: "review", label: "To review", icon: PenLine, count: 3 },
  { id: "gaps", label: "Gaps", icon: SearchX, count: 6 },
  { id: "suggestions", label: "Suggestions", icon: Lightbulb },
];

const meta = {
  title: "Products/Knowledge Base",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const fmt = (n: number) => n.toLocaleString("en");

type Lang = "tr" | "en";
type State = "published" | "review" | "draft";

interface Article {
  id: string;
  title: string;
  titleTr: string;
  topic: string;
  langs: Lang[];
  state: State;
  views: number;
  /** Share of "Did this help?" answers that were yes. */
  helpful: number;
  votes: number;
  /** Ticket forms and chats closed after reading it, 30 days. */
  answered: number;
  owner: string;
  updated: string;
  plans?: string;
}

const TOPICS = ["Getting started", "Account and sign-in", "Invoices and e-Fatura", "Banking", "Billing and plans"] as const;

const ARTICLES: Article[] = [
  {
    id: "a1",
    title: "Reset your password",
    titleTr: "Şifrenizi sıfırlayın",
    topic: "Account and sign-in",
    langs: ["tr", "en"],
    state: "published",
    views: 4120,
    helpful: 91,
    votes: 612,
    answered: 140,
    owner: "Elif Kaya",
    updated: "12 Oct",
  },
  {
    id: "a2",
    title: "Send your first e-Fatura",
    titleTr: "İlk e-Faturanızı gönderin",
    topic: "Invoices and e-Fatura",
    langs: ["tr", "en"],
    state: "published",
    views: 3870,
    helpful: 84,
    votes: 401,
    answered: 96,
    owner: "Mehmet Demir",
    updated: "2 Nov",
  },
  {
    id: "a3",
    title: "Cancel an e-Arşiv invoice",
    titleTr: "e-Arşiv faturasını iptal edin",
    topic: "Invoices and e-Fatura",
    langs: ["tr"],
    state: "published",
    views: 2210,
    helpful: 48,
    votes: 233,
    answered: 21,
    owner: "Mehmet Demir",
    updated: "4 Jul",
  },
  {
    id: "a4",
    title: "Connect your bank account",
    titleTr: "Banka hesabınızı bağlayın",
    topic: "Banking",
    langs: ["tr", "en"],
    state: "published",
    views: 1980,
    helpful: 77,
    votes: 188,
    answered: 52,
    owner: "Can Öztürk",
    updated: "21 Sep",
  },
  {
    id: "a5",
    title: "Add a user and choose what they see",
    titleTr: "Kullanıcı ekleyin ve yetkilerini seçin",
    topic: "Getting started",
    langs: ["tr", "en"],
    state: "published",
    views: 1430,
    helpful: 88,
    votes: 97,
    answered: 33,
    owner: "Elif Kaya",
    updated: "30 Aug",
  },
  {
    id: "a6",
    title: "Change your plan",
    titleTr: "Paketinizi değiştirin",
    topic: "Billing and plans",
    langs: ["tr", "en"],
    state: "published",
    views: 1210,
    helpful: 69,
    votes: 84,
    answered: 18,
    owner: "Selin Aydın",
    updated: "15 Oct",
  },
  {
    id: "a7",
    title: "Export the ledger for your accountant",
    titleTr: "Defteri muhasebecinize aktarın",
    topic: "Invoices and e-Fatura",
    langs: ["tr"],
    state: "published",
    views: 980,
    helpful: 41,
    votes: 66,
    answered: 6,
    owner: "Mehmet Demir",
    updated: "3 Mar",
    plans: "Business plan only",
  },
  {
    id: "a8",
    title: "Turn on two-step sign-in",
    titleTr: "İki adımlı girişi açın",
    topic: "Account and sign-in",
    langs: ["tr", "en"],
    state: "review",
    views: 0,
    helpful: 0,
    votes: 0,
    answered: 0,
    owner: "Elif Kaya",
    updated: "Today",
  },
  {
    id: "a9",
    title: "Match bank payments to invoices",
    titleTr: "Banka ödemelerini faturalarla eşleştirin",
    topic: "Banking",
    langs: ["tr"],
    state: "review",
    views: 0,
    helpful: 0,
    votes: 0,
    answered: 0,
    owner: "Can Öztürk",
    updated: "Yesterday",
  },
  {
    id: "a10",
    title: "e-Fatura for exports (İhracat)",
    titleTr: "İhracat faturası",
    topic: "Invoices and e-Fatura",
    langs: ["tr"],
    state: "draft",
    views: 0,
    helpful: 0,
    votes: 0,
    answered: 0,
    owner: "Mehmet Demir",
    updated: "3 Nov",
  },
];

const STATE: Record<State, { label: string; tone: "success" | "warning" | "neutral" }> = {
  published: { label: "Published", tone: "success" },
  review: { label: "In review", tone: "warning" },
  draft: { label: "Draft", tone: "neutral" },
};

const BODY: Record<string, Record<Lang, { intro: string; steps: string[] }>> = {
  a1: {
    tr: {
      intro: "Şifrenizi unuttuysanız giriş sayfasından yeni bir şifre belirleyebilirsiniz.",
      steps: ["Giriş sayfasında Şifremi unuttum'a tıklayın.", "E-posta adresinizi yazın.", "Gelen bağlantıyla 30 dakika içinde yeni şifrenizi belirleyin."],
    },
    en: {
      intro: "If you forgot your password, you can set a new one from the sign-in page.",
      steps: ["On the sign-in page, click Forgot password.", "Enter your email address.", "Use the link in the email within 30 minutes to set a new password."],
    },
  },
  a2: {
    tr: {
      intro: "Alıcı e-Fatura mükellefiyse fatura GİB üzerinden e-Fatura olarak, değilse e-Arşiv olarak gider.",
      steps: [
        "Faturalar'da Yeni fatura'ya tıklayın.",
        "Alıcının VKN veya TCKN'sini yazın; mükellefiyet kendiliğinden bulunur.",
        "Kalemleri ekleyip Gönder'e tıklayın.",
      ],
    },
    en: {
      intro: "If the buyer is registered for e-Fatura the invoice goes through GİB as an e-Fatura, otherwise as an e-Arşiv invoice.",
      steps: [
        "In Invoices, click New invoice.",
        "Enter the buyer's tax or ID number; whether they are registered is found for you.",
        "Add the lines and click Send.",
      ],
    },
  },
};

/* -------------------------------------------------------------- overview */

const DAYS = Array.from({ length: 30 }, (_, i) =>
  new Date(Date.UTC(2026, 9, 9 + i)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
);

function OverviewPage() {
  const low = ARTICLES.filter((a) => a.state === "published" && a.helpful < 60);
  return (
    <>
      <PageHeader
        title="Overview"
        description="help.example.com in Turkish and English, the last 30 days."
        actions={<Button icon={<ExternalLink />}>Open the help center</Button>}
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard
          label="Article views"
          value="18,240"
          delta={{ label: "+12% vs. September", direction: "up", intent: "good" }}
          trend={wave(14, { base: 600, amp: 120, seed: 5 })}
        />
        <KpiCard label="Searches" value="6,912" delta={{ label: "9.8% found nothing", intent: "neutral" }} />
        <KpiCard label="Questions answered" value="412" delta={{ label: "forms and chats closed after an article", intent: "good" }} />
        <KpiCard label="Helpful" value="81%" delta={{ label: "of 1,681 answers", intent: "neutral" }} />
        <KpiCard label="Published" value="7" unit="of 10 articles" delta={{ label: "3 waiting", intent: "neutral" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Article views" description="Per day, by the reader's language">
          <TimeSeriesChart
            label="Article views per day by language"
            labels={DAYS}
            height={200}
            format={(v) => fmt(Math.round(v))}
            series={[
              { id: "tr", name: "Turkish", data: wave(30, { base: 470, amp: 110, seed: 11 }), color: "var(--oa-chart-1)" },
              { id: "en", name: "English", data: wave(30, { base: 140, amp: 40, seed: 12 }), color: "var(--oa-chart-2)" },
            ]}
          />
        </Panel>
        <Panel title="Where readers come from">
          <BarList
            label="Readers by source"
            items={[
              { id: "search", label: "Help center search", value: 7410 },
              { id: "google", label: "google.com", value: 5120 },
              { id: "form", label: "Form suggestions", value: 2980 },
              { id: "chat", label: "Chat suggestions", value: 1610 },
              { id: "app", label: "In-app help", value: 1120 },
            ]}
          />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title="Most read" flush>
          <ol aria-label="Most read" className="flex flex-col">
            {ARTICLES.filter((a) => a.state === "published")
              .slice(0, 5)
              .map((a, i) => (
                <li key={a.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                  <span className="w-4 text-xs text-fg-muted tabular-nums">{i + 1}</span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate text-sm text-fg">{a.title}</span>
                    <span className="text-2xs text-fg-muted">{a.topic}</span>
                  </span>
                  <span className="shrink-0 text-right font-mono text-xs tabular-nums">
                    {fmt(a.views)}
                    <span className="block text-2xs text-fg-muted">{a.answered} answered</span>
                  </span>
                </li>
              ))}
          </ol>
        </Panel>
        <Panel title="Often did not help" description="Under 60% helpful; listed for their owner" flush>
          <ul aria-label="Often did not help" className="flex flex-col">
            {low.map((a) => (
              <li key={a.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <ThumbsDown aria-hidden className="size-3.5 shrink-0 text-danger-text" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-sm text-fg">{a.title}</span>
                  <span className="text-2xs text-fg-muted">
                    {a.owner} · updated {a.updated}
                  </span>
                </span>
                <Badge tone="danger">{a.helpful}% helpful</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- articles */

function ArticlePanel({ a }: { a: Article }) {
  const [lang, setLang] = useState<Lang>(a.langs.includes("en") ? "en" : "tr");
  const tr = lang === "tr";
  const body = BODY[a.id]?.[lang] ?? {
    intro: tr ? `${a.titleTr}: adım adım, ekran görüntüleriyle.` : `${a.title}: step by step, with screenshots.`,
    steps: tr ? ["Ayarlar'ı açın.", "İlgili bölümü seçin.", "Kaydet'e tıklayın."] : ["Open Settings.", "Choose the section it is in.", "Click Save."],
  };
  return (
    <Panel
      className="xl:col-span-2 2xl:col-span-1"
      aria-label="Article"
      title={tr ? a.titleTr : a.title}
      description={`${a.topic} · ${a.owner} · updated ${a.updated}`}
      actions={<StatusBadge tone={STATE[a.state].tone}>{STATE[a.state].label}</StatusBadge>}
    >
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Language"
            value={lang}
            onChange={setLang}
            options={[
              { value: "tr", label: "Türkçe" },
              { value: "en", label: a.langs.includes("en") ? "English" : "English (missing)" },
            ]}
          />
          {a.plans && <Badge tone="info">{a.plans}</Badge>}
        </div>
        {lang === "en" && !a.langs.includes("en") ? (
          <Callout tone="warning" title="No English version">
            English readers see the Turkish article, the default language, until one is written.
          </Callout>
        ) : (
          <article className="flex flex-col gap-2 text-sm leading-relaxed text-fg">
            <p className="text-fg-muted">{body.intro}</p>
            <ol className="flex list-decimal flex-col gap-1 pl-5">
              {body.steps.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ol>
          </article>
        )}
        {a.state === "published" && (
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2 gap-y-1.5 border-t border-line pt-2.5 text-xs">
            <dt className="text-fg-muted">Views, 30 d</dt>
            <dd className="font-mono text-fg tabular-nums">{fmt(a.views)}</dd>
            <dt className="text-fg-muted">Did it help</dt>
            <dd className="flex items-center gap-2 text-fg">
              <span className="flex items-center gap-1">
                <ThumbsUp aria-hidden className="size-3 text-success" />
                {a.helpful}%
              </span>
              <span className="text-fg-muted">of {a.votes} answers</span>
            </dd>
            <dt className="text-fg-muted">Questions answered</dt>
            <dd className="text-fg">{a.answered} forms and chats closed after it this month</dd>
            <dt className="text-fg-muted">Readers</dt>
            <dd className="text-fg">{a.plans ?? "Everyone"}</dd>
          </dl>
        )}
        <div className="flex flex-wrap gap-1.5">
          <Button size="sm" icon={<PenLine />}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" icon={<ExternalLink />}>
            View on the help center
          </Button>
        </div>
      </div>
    </Panel>
  );
}

function ArticlesPage() {
  const [topic, setTopic] = useState<string>("all");
  const [state, setState] = useState<"all" | State>("all");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("a1");
  const rows = ARTICLES.filter(
    (a) =>
      (topic === "all" || a.topic === topic) &&
      (state === "all" || a.state === state) &&
      `${a.title} ${a.titleTr}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  const cur = ARTICLES.find((a) => a.id === active)!;
  const cols: Column<Article>[] = [
    {
      id: "title",
      header: "Article",
      width: "36%",
      sortValue: (a) => a.title,
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-2">
          <FileText aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{a.title}</span>
            <span className="truncate text-2xs text-fg-muted">{a.topic}</span>
          </span>
        </span>
      ),
    },
    {
      id: "langs",
      header: "Languages",
      cell: (a) => (
        <span className="flex gap-1">
          {(["tr", "en"] as Lang[]).map((l) => (
            <Badge key={l} mono tone={a.langs.includes(l) ? "neutral" : "warning"}>
              {l.toUpperCase()}
              {a.langs.includes(l) ? "" : " missing"}
            </Badge>
          ))}
        </span>
      ),
    },
    { id: "state", header: "State", cell: (a) => <StatusBadge tone={STATE[a.state].tone}>{STATE[a.state].label}</StatusBadge> },
    { id: "views", header: "Views", align: "right", mono: true, sortValue: (a) => a.views, cell: (a) => (a.views ? fmt(a.views) : "–") },
    {
      id: "helpful",
      header: "Helpful",
      align: "right",
      sortValue: (a) => a.helpful,
      cell: (a) => (a.votes ? <span className={cn("font-mono text-xs", a.helpful < 60 && "font-semibold text-danger-text")}>{a.helpful}%</span> : "–"),
    },
    { id: "updated", header: "Updated", cell: (a) => <span className="text-xs whitespace-nowrap">{a.updated}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Articles"
        description="By topic, in Turkish and English. A reader sees their language, and Turkish where no translation exists."
        actions={
          <>
            <Button>Import</Button>
            <Button variant="primary" icon={<Plus />}>
              New article
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[180px_minmax(0,1fr)] 2xl:grid-cols-[180px_minmax(0,1fr)_360px]">
        <Panel flush aria-label="Topics">
          <ul className="flex flex-col py-1">
            {["all", ...TOPICS].map((t) => (
              <li key={t}>
                <button
                  type="button"
                  onClick={() => setTopic(t)}
                  aria-current={t === topic ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm",
                    t === topic ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas",
                  )}
                >
                  <span className="truncate">{t === "all" ? "All topics" : t}</span>
                  <span className="text-2xs text-fg-muted tabular-nums">{t === "all" ? ARTICLES.length : ARTICLES.filter((a) => a.topic === t).length}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel flush aria-label="Article list">
          <div className="flex flex-wrap items-end justify-between gap-2 px-3 pt-2">
            <Tabs
              label="State"
              value={state}
              onChange={setState}
              items={[
                { value: "all", label: "All" },
                { value: "published", label: "Published" },
                { value: "review", label: "In review" },
                { value: "draft", label: "Drafts" },
              ]}
              className="border-b-0"
            />
            <SearchInput
              label="Search articles"
              placeholder="Title in any language"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-56 pb-1.5"
            />
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Articles"
              columns={cols}
              rows={rows}
              getRowId={(a) => a.id}
              onRowClick={(a) => setActive(a.id)}
              activeRowId={active}
              minWidth={720}
              empty="No article matches."
            />
          </div>
        </Panel>
        <ArticlePanel key={cur.id} a={cur} />
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- review */

function ReviewPage() {
  const [items, setItems] = useState(ARTICLES.filter((a) => a.state === "review"));
  const [active, setActive] = useState(items[0]?.id ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const cur = items.find((a) => a.id === active);
  return (
    <>
      <PageHeader
        title="To review"
        description="An article is public once a second person reviews it. Drafts and articles in review are seen only by the team."
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[300px_minmax(0,1fr)]">
        <Panel flush title="Waiting for review" aria-label="Waiting for review">
          {items.length ? (
            <ul className="flex flex-col py-1">
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => setActive(a.id)}
                    aria-current={a.id === active ? "true" : undefined}
                    className={cn(
                      "flex w-full flex-col px-3 py-1.5 text-left",
                      a.id === active ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas",
                    )}
                  >
                    <span className="truncate text-sm font-medium">{a.title}</span>
                    <span className="text-2xs text-fg-muted">
                      {a.owner} · {a.updated}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3 py-3 text-sm text-fg-muted">Nothing waits for review.</p>
          )}
        </Panel>
        {cur && (
          <Panel
            aria-label="Review"
            title={cur.title}
            description={`${cur.topic} · written by ${cur.owner} · ${cur.langs.map((l) => l.toUpperCase()).join(", ")}`}
            actions={
              <>
                <Button size="sm">Send back</Button>
                <Button
                  size="sm"
                  variant="primary"
                  icon={<Check />}
                  onClick={() => {
                    setItems((xs) => xs.filter((x) => x.id !== cur.id));
                    setActive(items.find((x) => x.id !== cur.id)?.id ?? "");
                    setNotice(`${cur.title} is published on help.example.com. ${cur.owner} is told.`);
                  }}
                >
                  Approve and publish
                </Button>
              </>
            }
          >
            <article className="flex max-w-[68ch] flex-col gap-2 text-sm leading-relaxed text-fg">
              <p className="text-fg-muted">Two-step sign-in asks for a code from your phone each time you sign in from a new device.</p>
              <ol className="flex list-decimal flex-col gap-1 pl-5">
                <li>Open Settings, then Security.</li>
                <li>Choose Two-step sign-in and scan the code with an authenticator app.</li>
                <li>
                  Type the six-digit code to finish. <ins className="bg-success-soft text-fg no-underline">Keep the backup codes somewhere safe.</ins>
                </li>
              </ol>
              <p className="text-xs text-fg-muted">
                Changes since the last review are marked. The article asks readers whether it helped once it is published.
              </p>
            </article>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ gaps */

interface Gap {
  id: string;
  query: string;
  lang: Lang;
  count: number;
  where: string;
  last: string;
  /** Opened a ticket after searching. */
  tickets: number;
}

const GAPS: Gap[] = [
  { id: "g1", query: "ihracat faturası", lang: "tr", count: 88, where: "Help center, ticket form", last: "Today 13:41", tickets: 19 },
  { id: "g2", query: "e-irsaliye", lang: "tr", count: 71, where: "Help center", last: "Today 11:02", tickets: 12 },
  { id: "g3", query: "delete my account", lang: "en", count: 42, where: "Help center, chat", last: "Yesterday", tickets: 9 },
  { id: "g4", query: "kur farkı faturası", lang: "tr", count: 37, where: "Ticket form", last: "Today 09:15", tickets: 14 },
  { id: "g5", query: "api key", lang: "en", count: 23, where: "Help center", last: "5 Nov", tickets: 2 },
  { id: "g6", query: "mali mühür", lang: "tr", count: 19, where: "Chat", last: "4 Nov", tickets: 6 },
];

function WriteDialog({
  gap,
  onOpenChange,
  onCreate,
}: {
  gap: Gap | null;
  onOpenChange: (o: boolean) => void;
  onCreate: (title: string, owner: string) => void;
}) {
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState("Mehmet Demir");
  return (
    <Dialog
      open={gap !== null}
      onOpenChange={onOpenChange}
      title="Write an article for this search"
      description={gap ? `"${gap.query}" found nothing ${gap.count} times in 30 days.` : undefined}
      onSubmit={(e) => {
        e.preventDefault();
        if (title.trim()) onCreate(title.trim(), owner);
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!title.trim()}>
            Create draft
          </Button>
        </>
      }
    >
      <TextField label="Title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="İhracat faturası kesin" />
      <SelectField
        label="Owner"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
        options={["Mehmet Demir", "Elif Kaya", "Can Öztürk", "Selin Aydın"].map((n) => ({ value: n, label: n }))}
      />
      <p className="text-xs text-fg-muted">The search is linked to the draft, so the gap closes once the article is published.</p>
    </Dialog>
  );
}

function GapsPage() {
  const [rows, setRows] = useState(GAPS);
  const [writing, setWriting] = useState<Gap | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const cols: Column<Gap>[] = [
    {
      id: "query",
      header: "Search",
      width: "28%",
      cell: (g) => (
        <span className="flex items-center gap-2">
          <Badge mono>{g.lang.toUpperCase()}</Badge>
          <span className="truncate font-mono text-sm">{g.query}</span>
        </span>
      ),
    },
    { id: "count", header: "Found nothing", align: "right", mono: true, sortValue: (g) => g.count, cell: (g) => g.count },
    {
      id: "tickets",
      header: "Then opened a ticket",
      align: "right",
      sortValue: (g) => g.tickets,
      cell: (g) => <span className={cn("font-mono text-xs", g.tickets >= 10 && "font-semibold text-danger-text")}>{g.tickets}</span>,
    },
    { id: "where", header: "Searched in", cell: (g) => <span className="text-xs">{g.where}</span> },
    { id: "last", header: "Last", cell: (g) => <span className="text-xs whitespace-nowrap">{g.last}</span> },
    {
      id: "act",
      header: <span className="sr-only">Action</span>,
      align: "right",
      cell: (g) => (
        <Button size="xs" onClick={() => setWriting(g)}>
          Write an article
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Gaps" description="Searches that found nothing, in the help center, the ticket form and the chat window, the last 30 days." />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="Searches with no result" value="676" unit="9.8%" delta={{ label: "-2.1 points since September", direction: "down", intent: "good" }} />
        <KpiCard label="Then opened a ticket" value="62" tone="warning" />
        <KpiCard label="Different searches" value={String(rows.length)} unit="seen 10 times or more" />
      </KpiGrid>
      <Panel flush title="Searches that found nothing">
        <DataTable
          label="Searches that found nothing"
          columns={cols}
          rows={rows}
          getRowId={(g) => g.id}
          defaultSort={{ id: "count", direction: "desc" }}
          minWidth={820}
        />
      </Panel>
      <WriteDialog
        key={writing?.id ?? "none"}
        gap={writing}
        onOpenChange={(o) => !o && setWriting(null)}
        onCreate={(title, owner) => {
          setRows((rs) => rs.filter((r) => r.id !== writing?.id));
          setNotice(`Draft "${title}" created for ${owner}, linked to the search "${writing?.query}".`);
          setWriting(null);
        }}
      />
    </>
  );
}

/* ----------------------------------------------------------- suggestions */

function SuggestionsPage() {
  const [subject, setSubject] = useState("reset password");
  const words = subject.toLocaleLowerCase("tr").split(/\s+/).filter(Boolean);
  const KEYS: Record<string, string[]> = {
    a1: ["password", "şifre", "reset", "sign in", "giriş"],
    a2: ["e-fatura", "invoice", "fatura", "send"],
    a3: ["cancel", "iptal", "e-arşiv"],
    a4: ["bank", "banka"],
    a6: ["plan", "paket", "price"],
  };
  const suggested = ARTICLES.filter((a) => KEYS[a.id]?.some((k) => words.some((w) => k.includes(w) || w.includes(k)))).slice(0, 3);
  return (
    <>
      <PageHeader
        title="Suggestions"
        description="The ticket form and the chat window suggest articles as people type. A question counts as answered when the form or chat is closed after reading."
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="Suggestions shown" value="9,840" />
        <KpiCard label="Opened" value="2,980" unit="30.3%" />
        <KpiCard label="Answered the question" value="412" unit="13.8% of opened" delta={{ label: "+31 vs. September", direction: "up", intent: "good" }} />
        <KpiCard label="Still opened a ticket" value="1,206" delta={{ label: "after reading", intent: "neutral" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Try it" description="The ticket form on help.example.com/contact, as a customer sees it.">
          <div className="flex flex-col gap-3 rounded-md border border-line bg-canvas p-3">
            <TextField label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
            <section aria-label="Suggested articles" className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold text-fg-muted">These may answer it</h3>
              {suggested.length ? (
                <ul className="flex flex-col gap-1">
                  {suggested.map((a) => (
                    <li key={a.id} className="flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-sm">
                      <FileSearch aria-hidden className="size-3.5 shrink-0 text-accent" />
                      <span className="truncate text-fg">{a.title}</span>
                      <span className="ml-auto shrink-0 text-2xs text-fg-muted">{a.helpful}% found it helpful</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-fg-muted">No article matches yet; the search is kept for Gaps.</p>
              )}
            </section>
          </div>
        </Panel>
        <Panel title="Answered questions by place" description="30 days">
          <BarList
            label="Answered questions by place"
            items={[
              { id: "form", label: "Ticket form", value: 288 },
              { id: "chat", label: "Chat window", value: 97 },
              { id: "helpdesk", label: "Agents, sent in a reply", value: 27 },
            ]}
          />
          <p className="mt-3 text-xs text-fg-muted">
            Agents in Helpdesk see the same suggestions beside a ticket and can send an article in a reply. Live Chat shows them in the window before a chat
            starts.
          </p>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `site:
  address: help.example.com
  languages: [tr, en]
  default_language: tr
topics:
  - Getting started
  - Account and sign-in
  - Invoices and e-Fatura
  - Banking
  - Billing and plans
review:
  required: true          # a second person publishes
helpful:
  list_below: 60%         # owners see articles under this
plans:
  business: { from: crm, field: plan, equals: Business }
suggest:
  in: [helpdesk-form, live-chat]`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="knowledge-base"
      file="knowledge-base.yaml"
      applied="yesterday"
      yaml={YAML}
      groups={[
        {
          title: "Help center",
          items: [
            { label: "Address", value: <span className="font-mono">help.example.com</span>, path: "site.address" },
            { label: "Languages", value: "Turkish (default), English", path: "site.languages" },
            { label: "Topics", value: TOPICS.join(", "), path: "topics" },
          ],
        },
        {
          title: "Publishing",
          items: [
            { label: "Review", value: "A second person approves before an article is public", path: "review.required" },
            { label: "Helpful", value: "Articles under 60% helpful are listed for their owner", path: "helpful.list_below" },
            { label: "Plan-only articles", value: "Readers on the Business plan, from CRM", path: "plans.business" },
            { label: "Suggested in", value: "Helpdesk's ticket form and Live Chat", path: "suggest.in" },
          ],
        },
      ]}
    />
  );
}

const PAGES = {
  overview: () => <OverviewPage />,
  articles: () => <ArticlesPage />,
  review: () => <ReviewPage />,
  gaps: () => <GapsPage />,
  suggestions: () => <SuggestionsPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="knowledge-base" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Most read" })).getAllByRole("listitem")[0]).toHaveTextContent("Reset your password");
    await expect(c.getByRole("list", { name: "Often did not help" })).toHaveTextContent("Cancel an e-Arşiv invoice");
  },
};

export const Articles: Story = {
  ...app("articles"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const article = c.getByRole("region", { name: "Article" });
    await expect(article).toHaveTextContent("140 forms and chats closed after it");
    await userEvent.click(within(article).getByRole("radio", { name: "Türkçe" }));
    await expect(c.getByRole("region", { name: "Article" })).toHaveTextContent("Şifrenizi sıfırlayın");
    await userEvent.click(within(c.getByRole("region", { name: "Topics" })).getByRole("button", { name: /Invoices and e-Fatura/ }));
    const table = c.getByRole("table", { name: "Articles" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(4);
    await userEvent.click(within(table).getByText("Export the ledger for your accountant"));
    const ledger = c.getByRole("region", { name: "Article" });
    await expect(ledger).toHaveTextContent("Business plan only");
    await userEvent.click(within(ledger).getByRole("radio", { name: "English (missing)" }));
    await expect(c.getByText("No English version")).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const SearchArticles: Story = {
  name: "Search articles",
  ...app("articles"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("searchbox", { name: "Search articles" }), "şifre");
    await expect(
      within(c.getByRole("table", { name: "Articles" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(1);
    blur(canvasElement);
  },
};

export const ToReview: Story = {
  name: "To review",
  ...app("review"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Review" })).toHaveTextContent("Turn on two-step sign-in");
    await userEvent.click(c.getByRole("button", { name: "Approve and publish" }));
    await expect(c.getByRole("status")).toHaveTextContent("Turn on two-step sign-in is published on help.example.com. Elif Kaya is told.");
    await expect(c.getByRole("region", { name: "Review" })).toHaveTextContent("Match bank payments to invoices");
  },
};

export const Gaps: Story = {
  ...app("gaps"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Searches that found nothing" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("ihracat faturası");
    await userEvent.click(within(within(table).getAllByRole("row")[1]!).getByRole("button", { name: "Write an article" }));
    const dialog = within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Write an article for this search" });
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Title" }), "İhracat faturası kesin");
    await userEvent.click(within(dialog).getByRole("button", { name: "Create draft" }));
    await expect(c.getByRole("status")).toHaveTextContent('Draft "İhracat faturası kesin" created for Mehmet Demir, linked to the search "ihracat faturası".');
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(GAPS.length - 1);
  },
};

export const Suggestions: Story = {
  ...app("suggestions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const suggested = c.getByRole("region", { name: "Suggested articles" });
    await expect(suggested).toHaveTextContent("Reset your password");
    const subject = c.getByRole("textbox", { name: "Subject" });
    await userEvent.clear(subject);
    await userEvent.type(subject, "e-arşiv iptal");
    await expect(c.getByRole("region", { name: "Suggested articles" })).toHaveTextContent("Cancel an e-Arşiv invoice");
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("knowledge-base.yaml as applied")).toHaveTextContent("default_language: tr");
  },
};
