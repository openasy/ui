// Sample data for the Analytics design: one site, shop on www.example.com, a coffee roaster in Istanbul that sells
// beans and brewing gear and a coffee subscription with a free trial. The last 30 days end on Sunday, Nov 8 2026.
// Totals agree across pages: 18,420 visitors, 26,870 visits, 266 orders and ₺489,440 of revenue.

export const pct = (n: number, of: number) => (of ? Math.round((n / of) * 1000) / 10 : 0);
export const num = (n: number) => Math.round(n).toLocaleString("en");
export const lira = (n: number) => `₺${Math.round(n).toLocaleString("en")}`;
export const secs = (s: number) => (s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60 ? `${s % 60} s` : ""}`.trim());

/* ------------------------------------------------------------- people */

export const TEAM = {
  zeynep: { name: "Zeynep Kaya", email: "zeynep.kaya@example.com", role: "Marketing" },
  mert: { name: "Mert Demir", email: "mert.demir@example.com", role: "Developer" },
  elif: { name: "Elif Şahin", email: "elif.sahin@example.com", role: "Ecommerce" },
  emily: { name: "Emily Clark", email: "emily.clark@example.com", role: "Owner" },
} as const;

/* -------------------------------------------------------------- days */

/** Oct 10 to Nov 8: Oct 10 is a Saturday. */
export const DAYS = Array.from({ length: 30 }, (_, i) =>
  new Date(Date.UTC(2026, 9, 10 + i)).toLocaleDateString("en", { month: "short", day: "numeric", timeZone: "UTC" }),
);
const WEEKDAY = [0.82, 0.78, 1.05, 1.1, 1.08, 1.04, 0.96]; // Sat, Sun, Mon …
const daily = (base: number, growth: number, spikes: Record<number, number> = {}) =>
  DAYS.map((_, i) => Math.round(base * WEEKDAY[i % 7]! * (1 + i * growth) + (spikes[i] ?? 0)));

/** Visitors a day; Nov 3 is the fall newsletter. */
export const VISITORS_DAILY = daily(560, 0.004, { 11: 70, 24: 820, 25: 340 });
export const VISITORS_PREVIOUS = daily(505, 0.002, { 9: 120 });
export const VISITORS_LAST_YEAR = daily(372, 0.001);
export const REVENUE_DAILY = daily(14200, 0.006, { 24: 21800, 25: 9600 });

export interface Annotation {
  id: string;
  day: number;
  text: string;
  by: string;
}

export const ANNOTATIONS: Annotation[] = [
  { id: "a1", day: 11, text: "New pricing page live", by: TEAM.mert.name },
  { id: "a2", day: 19, text: "Republic Day, a public holiday", by: TEAM.zeynep.name },
  { id: "a3", day: 24, text: "Fall newsletter sent to 42,000 subscribers", by: TEAM.zeynep.name },
];

/* ---------------------------------------------------------- overview */

export interface Metric {
  id: string;
  label: string;
  value: number;
  previous: number;
  lastYear: number;
  format: (v: number) => string;
  unit?: string;
  /** A rise is bad news, as for bounce rate. */
  lowerIsBetter?: boolean;
  /** Counts that a filter narrows; rates stay as they are. */
  count?: boolean;
}

export const METRICS: Metric[] = [
  { id: "visitors", label: "Visitors", value: 18420, previous: 16310, lastYear: 11840, format: num, count: true },
  { id: "visits", label: "Visits", value: 26870, previous: 24020, lastYear: 17210, format: num, count: true },
  { id: "views", label: "Page views", value: 81240, previous: 74480, lastYear: 52930, format: num, count: true },
  { id: "bounce", label: "Bounce rate", value: 38.4, previous: 41.2, lastYear: 44.9, format: (v) => `${v.toFixed(1)}%`, lowerIsBetter: true },
  { id: "engagement", label: "Engagement rate", value: 61.6, previous: 58.8, lastYear: 55.1, format: (v) => `${v.toFixed(1)}%` },
  { id: "duration", label: "Visit length", value: 161, previous: 149, lastYear: 132, format: secs, unit: "median" },
];

export const NEW_RETURNING = { new: 11630, returning: 6790 };

/* ------------------------------------------------------- acquisition */

export interface Channel {
  id: string;
  name: string;
  visits: number;
  previous: number;
  bounce: number;
  engagement: number;
  conversions: number;
  revenue: number;
  how: string;
}

export const CHANNELS: Channel[] = [
  {
    id: "organic",
    name: "Organic search",
    visits: 9500,
    previous: 8820,
    bounce: 34.1,
    engagement: 65.9,
    conversions: 412,
    revenue: 109400,
    how: "A search engine refers the visit and no utm_medium is set",
  },
  {
    id: "direct",
    name: "Direct",
    visits: 5980,
    previous: 5710,
    bounce: 41.8,
    engagement: 58.2,
    conversions: 301,
    revenue: 104300,
    how: "No referrer and no utm_* parameters",
  },
  {
    id: "email",
    name: "Email",
    visits: 3920,
    previous: 1640,
    bounce: 29.4,
    engagement: 70.6,
    conversions: 296,
    revenue: 141600,
    how: "utm_medium is email or newsletter",
  },
  {
    id: "referral",
    name: "Referral",
    visits: 2410,
    previous: 2580,
    bounce: 44.7,
    engagement: 55.3,
    conversions: 88,
    revenue: 21640,
    how: "Any other site links to the page",
  },
  {
    id: "social",
    name: "Social",
    visits: 2180,
    previous: 2490,
    bounce: 52.3,
    engagement: 47.7,
    conversions: 61,
    revenue: 27900,
    how: "A social network refers the visit, or utm_medium is social",
  },
  {
    id: "paid",
    name: "Paid search",
    visits: 1860,
    previous: 2210,
    bounce: 39.9,
    engagement: 60.1,
    conversions: 92,
    revenue: 55800,
    how: "utm_medium is cpc, ppc or paid, or the address has gclid, msclkid or yclid",
  },
  {
    id: "ai",
    name: "AI assistants",
    visits: 1020,
    previous: 570,
    bounce: 27.6,
    engagement: 72.4,
    conversions: 63,
    revenue: 28800,
    how: "ChatGPT, Perplexity, Claude, Gemini or Copilot refers the visit, or utm_source names one",
  },
];
export const TOTAL_VISITS = CHANNELS.reduce((n, c) => n + c.visits, 0);

export const AI_ASSISTANTS = [
  { id: "chatgpt", name: "ChatGPT", host: "chatgpt.com", visits: 540, conversions: 34 },
  { id: "perplexity", name: "Perplexity", host: "perplexity.ai", visits: 214, conversions: 14 },
  { id: "claude", name: "Claude", host: "claude.ai", visits: 131, conversions: 9 },
  { id: "gemini", name: "Gemini", host: "gemini.google.com", visits: 88, conversions: 4 },
  { id: "copilot", name: "Copilot", host: "copilot.microsoft.com", visits: 47, conversions: 2 },
];

export interface Source {
  id: string;
  host: string;
  channel: string;
  visits: number;
  bounce: number;
  /** Full referring addresses, without their query strings. */
  referrers: Array<{ url: string; visits: number }>;
}

export const SOURCES: Source[] = [
  {
    id: "google",
    host: "google.com",
    channel: "Organic search",
    visits: 8610,
    bounce: 33.8,
    referrers: [{ url: "https://www.google.com/", visits: 8610 }],
  },
  { id: "direct", host: "Direct", channel: "Direct", visits: 5980, bounce: 41.8, referrers: [] },
  {
    id: "newsletter",
    host: "newsletter",
    channel: "Email",
    visits: 3920,
    bounce: 29.4,
    referrers: [],
  },
  {
    id: "linkedin",
    host: "linkedin.com",
    channel: "Social",
    visits: 1240,
    bounce: 48.9,
    referrers: [
      { url: "https://www.linkedin.com/feed/", visits: 702 },
      { url: "https://www.linkedin.com/company/acme-kahve/", visits: 538 },
    ],
  },
  {
    id: "github",
    host: "github.com",
    channel: "Referral",
    visits: 980,
    bounce: 37.2,
    referrers: [
      { url: "https://github.com/acme/brew-timer", visits: 811 },
      { url: "https://github.com/acme/brew-timer/blob/main/README.md", visits: 169 },
    ],
  },
  {
    id: "webrazzi",
    host: "webrazzi.com",
    channel: "Referral",
    visits: 760,
    bounce: 46.1,
    referrers: [
      { url: "https://webrazzi.com/2026/11/02/istanbullu-kahve-girisimi-acme/", visits: 512 },
      { url: "https://webrazzi.com/kategori/e-ticaret/", visits: 248 },
    ],
  },
  {
    id: "instagram",
    host: "instagram.com",
    channel: "Social",
    visits: 610,
    bounce: 58.4,
    referrers: [{ url: "https://l.instagram.com/", visits: 610 }],
  },
  {
    id: "chatgpt",
    host: "chatgpt.com",
    channel: "AI assistants",
    visits: 540,
    bounce: 25.9,
    referrers: [{ url: "https://chatgpt.com/", visits: 540 }],
  },
  { id: "bing", host: "bing.com", channel: "Organic search", visits: 520, bounce: 36.0, referrers: [{ url: "https://www.bing.com/", visits: 520 }] },
  {
    id: "eksi",
    host: "eksisozluk.com",
    channel: "Referral",
    visits: 410,
    bounce: 51.7,
    referrers: [
      { url: "https://eksisozluk.com/filtre-kahve--31842", visits: 288 },
      { url: "https://eksisozluk.com/kahve-ogutucu--90214", visits: 122 },
    ],
  },
  {
    id: "yandex",
    host: "yandex.com.tr",
    channel: "Organic search",
    visits: 370,
    bounce: 35.1,
    referrers: [{ url: "https://yandex.com.tr/", visits: 370 }],
  },
];

export interface Campaign {
  id: string;
  source: string;
  medium: string;
  campaign: string;
  term: string | null;
  content: string | null;
  visits: number;
  conversions: number;
}

export const CAMPAIGNS: Campaign[] = [
  { id: "c1", source: "newsletter", medium: "email", campaign: "fall-2026", term: null, content: "hero-button", visits: 2410, conversions: 196 },
  { id: "c2", source: "newsletter", medium: "email", campaign: "fall-2026", term: null, content: "footer-link", visits: 1510, conversions: 100 },
  { id: "c3", source: "google", medium: "cpc", campaign: "brand-tr", term: "acme kahve", content: "ad-a", visits: 1020, conversions: 61 },
  { id: "c4", source: "google", medium: "cpc", campaign: "brand-tr", term: "filtre kahve", content: "ad-b", visits: 840, conversions: 31 },
  { id: "c5", source: "linkedin", medium: "social", campaign: "launch-week", term: null, content: "carousel", visits: 640, conversions: 22 },
  { id: "c6", source: "instagram", medium: "social", campaign: "launch-week", term: null, content: "story-1", visits: 410, conversions: 11 },
];

/* ---------------------------------------------------------- visitors */

export interface Place {
  id: string;
  code: string;
  name: string;
  visitors: number;
  regions?: Array<{ name: string; visitors: number; cities: Array<{ name: string; visitors: number }> }>;
}

export const COUNTRIES: Place[] = [
  {
    id: "tr",
    code: "TR",
    name: "Türkiye",
    visitors: 13260,
    regions: [
      {
        name: "İstanbul",
        visitors: 6120,
        cities: [
          { name: "Istanbul", visitors: 5480 },
          { name: "Esenyurt", visitors: 360 },
          { name: "Pendik", visitors: 280 },
        ],
      },
      {
        name: "Ankara",
        visitors: 2240,
        cities: [
          { name: "Ankara", visitors: 2050 },
          { name: "Çankaya", visitors: 190 },
        ],
      },
      { name: "İzmir", visitors: 1580, cities: [{ name: "Izmir", visitors: 1580 }] },
      { name: "Bursa", visitors: 790, cities: [{ name: "Bursa", visitors: 790 }] },
      { name: "Antalya", visitors: 610, cities: [{ name: "Antalya", visitors: 610 }] },
      { name: "Kocaeli", visitors: 480, cities: [{ name: "İzmit", visitors: 480 }] },
      { name: "Other provinces", visitors: 1440, cities: [] },
    ],
  },
  {
    id: "de",
    code: "DE",
    name: "Germany",
    visitors: 1640,
    regions: [
      { name: "Berlin", visitors: 410, cities: [{ name: "Berlin", visitors: 410 }] },
      { name: "North Rhine-Westphalia", visitors: 520, cities: [{ name: "Cologne", visitors: 260 }] },
      { name: "Other states", visitors: 710, cities: [] },
    ],
  },
  { id: "nl", code: "NL", name: "Netherlands", visitors: 720 },
  { id: "gb", code: "GB", name: "United Kingdom", visitors: 610 },
  { id: "us", code: "US", name: "United States", visitors: 540 },
  { id: "az", code: "AZ", name: "Azerbaijan", visitors: 390 },
  { id: "fr", code: "FR", name: "France", visitors: 310 },
  { id: "other", code: "", name: "Other countries", visitors: 950 },
];
export const TOTAL_VISITORS = COUNTRIES.reduce((n, c) => n + c.visitors, 0);

export const DEVICES = [
  { id: "desktop", name: "Desktop", value: 9210 },
  { id: "mobile", name: "Mobile", value: 8290 },
  { id: "tablet", name: "Tablet", value: 920 },
];

export const BROWSERS = [
  { name: "Chrome", version: "131", visitors: 6820 },
  { name: "Safari", version: "18.1", visitors: 3920 },
  { name: "Chrome", version: "130", visitors: 1540 },
  { name: "Edge", version: "131", visitors: 1310 },
  { name: "Yandex Browser", version: "24.10", visitors: 1240 },
  { name: "Firefox", version: "132", visitors: 970 },
  { name: "Safari", version: "17.6", visitors: 880 },
  { name: "Samsung Internet", version: "26", visitors: 760 },
  { name: "Other", version: "", visitors: 980 },
];

export const SYSTEMS = [
  { name: "Windows", version: "11", visitors: 4980 },
  { name: "Android", version: "15", visitors: 3140 },
  { name: "iOS", version: "18.1", visitors: 3020 },
  { name: "Windows", version: "10", visitors: 2710 },
  { name: "Android", version: "14", visitors: 2080 },
  { name: "macOS", version: "15", visitors: 1730 },
  { name: "Linux", version: "", visitors: 410 },
  { name: "Other", version: "", visitors: 350 },
];

export const SCREENS = [
  { size: "1920 × 1080", kind: "Desktop", visitors: 3880 },
  { size: "390 × 844", kind: "Mobile", visitors: 2920 },
  { size: "1536 × 864", kind: "Desktop", visitors: 2410 },
  { size: "360 × 800", kind: "Mobile", visitors: 2240 },
  { size: "414 × 896", kind: "Mobile", visitors: 1610 },
  { size: "1440 × 900", kind: "Desktop", visitors: 1330 },
  { size: "768 × 1024", kind: "Tablet", visitors: 620 },
  { size: "Other sizes", kind: "", visitors: 3410 },
];

export const LANGUAGES = [
  { code: "tr-TR", name: "Turkish (Türkiye)", visitors: 12880 },
  { code: "en-US", name: "English (United States)", visitors: 2110 },
  { code: "de-DE", name: "German (Germany)", visitors: 1390 },
  { code: "en-GB", name: "English (United Kingdom)", visitors: 720 },
  { code: "ru-RU", name: "Russian (Russia)", visitors: 410 },
  { code: "az-AZ", name: "Azerbaijani (Azerbaijan)", visitors: 380 },
  { code: "other", name: "Other languages", visitors: 530 },
];

export const TIME_ZONES = [
  { zone: "Europe/Istanbul", visitors: 13410 },
  { zone: "Europe/Berlin", visitors: 1580 },
  { zone: "Europe/Amsterdam", visitors: 690 },
  { zone: "Europe/London", visitors: 600 },
  { zone: "America/New_York", visitors: 410 },
  { zone: "Asia/Baku", visitors: 390 },
  { zone: "Other zones", visitors: 1340 },
];

/* ---------------------------------------------------------- behavior */

export interface PageRow {
  path: string;
  title: string;
  views: number;
  visitors: number;
  entries: number;
  exits: number;
  time: number;
  scroll: number;
  bounce: number;
}

export const PAGES: PageRow[] = [
  { path: "/", title: "Acme Kahve: fresh roasted coffee", views: 5812, visitors: 4630, entries: 4210, exits: 1142, time: 38, scroll: 61, bounce: 31.2 },
  {
    path: "/blog/how-to-brew-filter-coffee",
    title: "How to brew filter coffee",
    views: 4120,
    visitors: 3880,
    entries: 3610,
    exits: 2470,
    time: 192,
    scroll: 74,
    bounce: 58.3,
  },
  {
    path: "/products/espresso-beans",
    title: "Espresso beans 1 kg",
    views: 3460,
    visitors: 2710,
    entries: 1320,
    exits: 980,
    time: 71,
    scroll: 66,
    bounce: 36.8,
  },
  { path: "/pricing", title: "Subscription plans", views: 2140, visitors: 1890, entries: 640, exits: 520, time: 64, scroll: 52, bounce: 40.1 },
  { path: "/signup", title: "Start your trial", views: 912, visitors: 880, entries: 120, exits: 410, time: 48, scroll: 88, bounce: 22.5 },
  { path: "/cart", title: "Cart", views: 880, visitors: 640, entries: 40, exits: 238, time: 42, scroll: 70, bounce: 12.0 },
  { path: "/checkout/address", title: "Checkout: address", views: 460, visitors: 402, entries: 0, exits: 136, time: 58, scroll: 81, bounce: 0 },
  { path: "/contact", title: "Contact", views: 320, visitors: 290, entries: 85, exits: 120, time: 63, scroll: 77, bounce: 34.0 },
  { path: "/checkout/done", title: "Thank you", views: 266, visitors: 266, entries: 0, exits: 214, time: 21, scroll: 64, bounce: 0 },
];
export const TOTAL_VIEWS = 81240;

export interface FlowNode {
  id: string;
  label: string;
  column: number;
  value: number;
  /** The visit ended here. */
  exit?: boolean;
}
export interface FlowLink {
  from: string;
  to: string;
  value: number;
}

export const FLOWS: Record<string, { nodes: FlowNode[]; links: FlowLink[] }> = {
  "/pricing": {
    nodes: [
      { id: "p0", label: "/pricing", column: 0, value: 2140 },
      { id: "p1-signup", label: "/signup", column: 1, value: 912 },
      { id: "p1-compare", label: "/compare", column: 1, value: 310 },
      { id: "p1-contact", label: "/contact", column: 1, value: 140 },
      { id: "p1-other", label: "Other pages", column: 1, value: 258 },
      { id: "p1-left", label: "Left", column: 1, value: 520, exit: true },
      { id: "p2-welcome", label: "/welcome", column: 2, value: 388 },
      { id: "p2-signup", label: "/signup", column: 2, value: 120 },
      { id: "p2-pricing", label: "/pricing", column: 2, value: 174 },
      { id: "p2-sent", label: "/contact/sent", column: 2, value: 96 },
      { id: "p2-other", label: "Other pages", column: 2, value: 180 },
      { id: "p2-left", label: "Left", column: 2, value: 662, exit: true },
    ],
    links: [
      { from: "p0", to: "p1-signup", value: 912 },
      { from: "p0", to: "p1-compare", value: 310 },
      { from: "p0", to: "p1-contact", value: 140 },
      { from: "p0", to: "p1-other", value: 258 },
      { from: "p0", to: "p1-left", value: 520 },
      { from: "p1-signup", to: "p2-welcome", value: 388 },
      { from: "p1-signup", to: "p2-pricing", value: 114 },
      { from: "p1-signup", to: "p2-left", value: 410 },
      { from: "p1-compare", to: "p2-signup", value: 120 },
      { from: "p1-compare", to: "p2-pricing", value: 60 },
      { from: "p1-compare", to: "p2-left", value: 130 },
      { from: "p1-contact", to: "p2-sent", value: 96 },
      { from: "p1-contact", to: "p2-left", value: 44 },
      { from: "p1-other", to: "p2-other", value: 180 },
      { from: "p1-other", to: "p2-left", value: 78 },
    ],
  },
  "/": {
    nodes: [
      { id: "h0", label: "/", column: 0, value: 5812 },
      { id: "h1-pricing", label: "/pricing", column: 1, value: 1620 },
      { id: "h1-beans", label: "/products/espresso-beans", column: 1, value: 1240 },
      { id: "h1-blog", label: "/blog/how-to-brew-filter-coffee", column: 1, value: 760 },
      { id: "h1-other", label: "Other pages", column: 1, value: 1050 },
      { id: "h1-left", label: "Left", column: 1, value: 1142, exit: true },
      { id: "h2-signup", label: "/signup", column: 2, value: 540 },
      { id: "h2-cart", label: "/cart", column: 2, value: 420 },
      { id: "h2-beans", label: "/products/espresso-beans", column: 2, value: 180 },
      { id: "h2-other", label: "Other pages", column: 2, value: 1580 },
      { id: "h2-left", label: "Left", column: 2, value: 1950, exit: true },
    ],
    links: [
      { from: "h0", to: "h1-pricing", value: 1620 },
      { from: "h0", to: "h1-beans", value: 1240 },
      { from: "h0", to: "h1-blog", value: 760 },
      { from: "h0", to: "h1-other", value: 1050 },
      { from: "h0", to: "h1-left", value: 1142 },
      { from: "h1-pricing", to: "h2-signup", value: 540 },
      { from: "h1-pricing", to: "h2-other", value: 470 },
      { from: "h1-pricing", to: "h2-left", value: 610 },
      { from: "h1-beans", to: "h2-cart", value: 420 },
      { from: "h1-beans", to: "h2-other", value: 320 },
      { from: "h1-beans", to: "h2-left", value: 500 },
      { from: "h1-blog", to: "h2-beans", value: 180 },
      { from: "h1-blog", to: "h2-other", value: 150 },
      { from: "h1-blog", to: "h2-left", value: 430 },
      { from: "h1-other", to: "h2-other", value: 640 },
      { from: "h1-other", to: "h2-left", value: 410 },
    ],
  },
};

export const OUTBOUND = [
  { url: "https://www.instagram.com/acmekahve/", clicks: 420, visitors: 388, from: "/" },
  { url: "https://github.com/acme/brew-timer", clicks: 310, visitors: 296, from: "/blog/how-to-brew-filter-coffee" },
  { url: "https://maps.google.com/", clicks: 220, visitors: 214, from: "/contact" },
  { url: "https://api.whatsapp.com/send", clicks: 190, visitors: 181, from: "/contact" },
  { url: "https://www.trendyol.com/acme-kahve", clicks: 96, visitors: 90, from: "/products/espresso-beans" },
];

export const DOWNLOADS = [
  { file: "/files/brew-guide.pdf", kind: "PDF", downloads: 640, visitors: 602 },
  { file: "/files/price-list-2026.xlsx", kind: "Spreadsheet", downloads: 210, visitors: 171 },
  { file: "/apps/acme-brew-timer.apk", kind: "App", downloads: 140, visitors: 138 },
  { file: "/files/kvkk-aydinlatma-metni.pdf", kind: "PDF", downloads: 88, visitors: 86 },
];

export const SEARCHES = [
  { term: "espresso", searches: 412, visits: 360, clicked: 71, left: 9, results: 14 },
  { term: "decaf", searches: 236, visits: 221, clicked: 0, left: 64, results: 0 },
  { term: "grinder", searches: 198, visits: 180, clicked: 68, left: 12, results: 3 },
  { term: "moka", searches: 151, visits: 140, clicked: 77, left: 8, results: 2 },
  { term: "gift card", searches: 102, visits: 97, clicked: 0, left: 58, results: 0 },
  { term: "türk kahvesi", searches: 88, visits: 84, clicked: 42, left: 21, results: 1 },
];

export const NOT_FOUND = [
  { path: "/blog/v60-rehberi", views: 214, from: "eksisozluk.com", last: "Today 10:12" },
  { path: "/products/turkish-coffee-200g", views: 160, from: "google.com", last: "Today 11:03" },
  { path: "/kampanya", views: 96, from: "instagram.com", last: "Yesterday" },
  { path: "/wp-login.php", views: 41, from: "Direct", last: "Today 09:40" },
];

export interface Frustration {
  id: string;
  page: string;
  element: string;
  text: string;
  rage: number;
  dead: number;
  visits: number;
  replays: number;
}

export const FRUSTRATION: Frustration[] = [
  { id: "f1", page: "/products/espresso-beans", element: "img.product-photo", text: "(product photo)", rage: 22, dead: 310, visits: 268, replays: 27 },
  { id: "f2", page: "/signup", element: "button[type=submit]", text: "Create account", rage: 64, dead: 12, visits: 58, replays: 6 },
  { id: "f3", page: "/cart", element: "button.coupon", text: "Apply coupon", rage: 41, dead: 3, visits: 37, replays: 4 },
  { id: "f4", page: "/pricing", element: "span.badge", text: "Most popular", rage: 0, dead: 96, visits: 91, replays: 9 },
  { id: "f5", page: "/", element: "div.hero-card", text: "Fresh every Monday", rage: 3, dead: 72, visits: 66, replays: 7 },
];

/* ------------------------------------------------------- conversions */

export interface Goal {
  id: string;
  name: string;
  rule: string;
  visits: number;
  previous: number;
  /** Fixed value per conversion, or the value the event sends. */
  value: { kind: "fixed"; amount: number } | { kind: "event"; prop: string } | null;
  total: number;
}

export const GOALS: Goal[] = [
  { id: "bought", name: "Bought", rule: "path /checkout/done", visits: 266, previous: 231, value: { kind: "event", prop: "total" }, total: 489440 },
  { id: "signup", name: "Signed up", rule: "event signup", visits: 388, previous: 352, value: { kind: "fixed", amount: 150 }, total: 58200 },
  { id: "contact", name: "Contact sent", rule: "event contact-sent", visits: 151, previous: 160, value: { kind: "fixed", amount: 400 }, total: 60400 },
  { id: "guide", name: "Brew guide", rule: "download /files/brew-guide.pdf", visits: 602, previous: 498, value: null, total: 0 },
];

export type Model = "first" | "last" | "linear";

export const ATTRIBUTION: Record<string, { lookback: string; median: number; rows: Array<{ channel: string } & Record<Model, number>> }> = {
  bought: {
    lookback: "30 days",
    median: 2,
    rows: [
      { channel: "Organic search", first: 82, last: 61, linear: 71.4 },
      { channel: "Email", first: 41, last: 66, linear: 55.1 },
      { channel: "Direct", first: 38, last: 72, linear: 54.2 },
      { channel: "Paid search", first: 28, last: 26, linear: 27.0 },
      { channel: "Referral", first: 34, last: 18, linear: 25.6 },
      { channel: "Social", first: 30, last: 14, linear: 21.3 },
      { channel: "AI assistants", first: 13, last: 9, linear: 11.4 },
    ],
  },
  signup: {
    lookback: "30 days",
    median: 3,
    rows: [
      { channel: "Organic search", first: 131, last: 92, linear: 110.6 },
      { channel: "Email", first: 52, last: 88, linear: 71.0 },
      { channel: "Direct", first: 47, last: 101, linear: 74.8 },
      { channel: "Paid search", first: 44, last: 39, linear: 41.2 },
      { channel: "Referral", first: 51, last: 30, linear: 38.9 },
      { channel: "Social", first: 34, last: 21, linear: 27.1 },
      { channel: "AI assistants", first: 29, last: 17, linear: 24.4 },
    ],
  },
};

/** Average order by channel, to give credited orders their revenue. */
export const AOV: Record<string, number> = {
  "Organic search": 1764,
  Email: 1914,
  Direct: 1798,
  "Paid search": 1800,
  Referral: 1640,
  Social: 1641,
  "AI assistants": 2027,
};

/* --------------------------------------------------------- ecommerce */

export const SHOP_FUNNEL = [
  { label: "Viewed a product", event: "view_item", visits: 4980 },
  { label: "Added to cart", event: "add_to_cart", visits: 1120 },
  { label: "Viewed the cart", event: "path /cart", visits: 640 },
  { label: "Started checkout", event: "begin_checkout", visits: 402 },
  { label: "Bought", event: "purchase", visits: 266 },
];

export const ORDERS = { orders: 266, previous: 231, revenue: 489440, previousRevenue: 421300, refunds: 6 };

export const PRODUCTS = [
  { sku: "ESP-1000", name: "Espresso beans 1 kg", views: 3460, carts: 520, units: 212, revenue: 190800 },
  { sku: "GRN-01", name: "Burr grinder", views: 1240, carts: 120, units: 41, revenue: 143500 },
  { sku: "FLT-250", name: "Filter coffee 250 g", views: 2120, carts: 310, units: 268, revenue: 72360 },
  { sku: "MOK-6", name: "Moka pot, 6 cups", views: 980, carts: 96, units: 52, revenue: 49400 },
  { sku: "GFT-01", name: "Gift box", views: 640, carts: 74, units: 39, revenue: 33380 },
];

export const REVENUE_BY = {
  source: [
    { id: "newsletter", name: "newsletter", visits: 3920, orders: 74, revenue: 141600 },
    { id: "google", name: "google.com", visits: 8610, orders: 62, revenue: 109400 },
    { id: "direct", name: "Direct", visits: 5980, orders: 58, revenue: 104300 },
    { id: "google-cpc", name: "google (cpc)", visits: 1860, orders: 31, revenue: 55800 },
    { id: "instagram", name: "instagram.com", visits: 610, orders: 17, revenue: 27900 },
    { id: "chatgpt", name: "chatgpt.com", visits: 540, orders: 9, revenue: 18240 },
    { id: "other", name: "Other sources", visits: 5350, orders: 15, revenue: 32200 },
  ],
  campaign: [
    { id: "fall-2026", name: "fall-2026", visits: 3920, orders: 74, revenue: 141600 },
    { id: "brand-tr", name: "brand-tr", visits: 1860, orders: 31, revenue: 55800 },
    { id: "launch-week", name: "launch-week", visits: 1050, orders: 21, revenue: 35700 },
    { id: "none", name: "No campaign", visits: 20040, orders: 140, revenue: 256340 },
  ],
};

/* --------------------------------------------------------- retention */

export const COHORTS = [
  { id: "w1", label: "Sep 14", size: 3120, values: [100, 21.4, 14.8, 12.1, 10.9, 10.2, 9.6, 9.1] },
  { id: "w2", label: "Sep 21", size: 2980, values: [100, 22.0, 15.1, 12.4, 11.0, 10.1, 9.4] },
  { id: "w3", label: "Sep 28", size: 3240, values: [100, 20.8, 14.2, 11.9, 10.6, 9.8] },
  { id: "w4", label: "Oct 5", size: 3410, values: [100, 23.1, 15.6, 12.8, 11.2] },
  { id: "w5", label: "Oct 12", size: 3360, values: [100, 22.6, 15.9, 13.0] },
  { id: "w6", label: "Oct 19", size: 3590, values: [100, 24.2, 16.4] },
  { id: "w7", label: "Oct 26", size: 3480, values: [100, 31.7] },
  { id: "w8", label: "Nov 2", size: 4820, values: [100] },
];

export const STICKINESS = {
  dau: daily(612, 0.004, { 24: 820, 25: 340 }),
  wau: DAYS.map((_, i) => Math.round(3900 + i * 18 + (i >= 24 ? 900 : 0))),
  mau: DAYS.map((_, i) => Math.round(17200 + i * 41 + (i >= 24 ? 600 : 0))),
};

export const LIFECYCLE = {
  weeks: ["Oct 12", "Oct 19", "Oct 26", "Nov 2"],
  new: [3360, 3590, 3480, 4820],
  returning: [1910, 2010, 2060, 2340],
  resurrected: [240, 260, 280, 710],
  dormant: [1420, 1380, 1510, 1290],
};

/* ------------------------------------------------------- performance */

export type Vital = "lcp" | "inp" | "cls";
export const VITALS: Record<Vital, { name: string; full: string; good: number; poor: number; format: (v: number) => string }> = {
  lcp: { name: "LCP", full: "Largest Contentful Paint", good: 2.5, poor: 4, format: (v) => `${v.toFixed(1)} s` },
  inp: { name: "INP", full: "Interaction to Next Paint", good: 200, poor: 500, format: (v) => `${Math.round(v)} ms` },
  cls: { name: "CLS", full: "Cumulative Layout Shift", good: 0.1, poor: 0.25, format: (v) => v.toFixed(2) },
};

export type DeviceKind = "all" | "desktop" | "mobile";
export const VITALS_BY_DEVICE: Record<DeviceKind, Record<Vital, { p75: number; previous: number; split: [number, number, number] }>> = {
  all: {
    lcp: { p75: 2.1, previous: 2.4, split: [78, 15, 7] },
    inp: { p75: 240, previous: 210, split: [64, 28, 8] },
    cls: { p75: 0.04, previous: 0.05, split: [91, 6, 3] },
  },
  desktop: {
    lcp: { p75: 1.6, previous: 1.8, split: [89, 8, 3] },
    inp: { p75: 120, previous: 115, split: [86, 12, 2] },
    cls: { p75: 0.03, previous: 0.03, split: [94, 4, 2] },
  },
  mobile: {
    lcp: { p75: 2.9, previous: 3.3, split: [64, 24, 12] },
    inp: { p75: 310, previous: 280, split: [41, 45, 14] },
    cls: { p75: 0.07, previous: 0.08, split: [86, 9, 5] },
  },
};

export const VITALS_PAGES: Array<{ path: string; views: number } & Record<DeviceKind, Record<Vital, number>>> = [
  {
    path: "/",
    views: 5812,
    all: { lcp: 1.9, inp: 180, cls: 0.03 },
    desktop: { lcp: 1.4, inp: 100, cls: 0.02 },
    mobile: { lcp: 2.6, inp: 240, cls: 0.05 },
  },
  {
    path: "/products/espresso-beans",
    views: 3460,
    all: { lcp: 3.1, inp: 210, cls: 0.05 },
    desktop: { lcp: 2.2, inp: 120, cls: 0.03 },
    mobile: { lcp: 4.3, inp: 290, cls: 0.07 },
  },
  {
    path: "/cart",
    views: 880,
    all: { lcp: 1.7, inp: 380, cls: 0.02 },
    desktop: { lcp: 1.3, inp: 190, cls: 0.01 },
    mobile: { lcp: 2.2, inp: 520, cls: 0.03 },
  },
  {
    path: "/pricing",
    views: 2140,
    all: { lcp: 1.8, inp: 160, cls: 0.14 },
    desktop: { lcp: 1.4, inp: 90, cls: 0.12 },
    mobile: { lcp: 2.4, inp: 230, cls: 0.17 },
  },
  {
    path: "/blog/how-to-brew-filter-coffee",
    views: 4120,
    all: { lcp: 2.3, inp: 140, cls: 0.02 },
    desktop: { lcp: 1.7, inp: 80, cls: 0.01 },
    mobile: { lcp: 2.9, inp: 190, cls: 0.03 },
  },
];

export const LCP_DAILY = DAYS.map((_, i) => Math.round((2.5 - i * 0.012 + (i % 7 === 2 ? 0.15 : 0) + (i === 24 ? 0.6 : 0)) * 100) / 100);

/* ------------------------------------------------------------ search */

export type Engine = "google" | "bing" | "yandex";
export interface Query {
  query: string;
  page: string;
  clicks: number;
  impressions: number;
  position: number;
}

export const SEARCH: Record<
  Engine,
  {
    name: string;
    property: string;
    path: string;
    updated: string;
    totals: { clicks: number; impressions: number; position: number; previousClicks: number };
    queries: Query[];
    hidden: number;
  }
> = {
  google: {
    name: "Google Search Console",
    property: "sc-domain:example.com",
    path: "searchConsole.google",
    updated: "Nov 6, data is 2 days behind",
    totals: { clicks: 8610, impressions: 312400, position: 11.4, previousClicks: 7980 },
    queries: [
      { query: "acme kahve", page: "/", clicks: 2140, impressions: 6320, position: 1.2 },
      { query: "filtre kahve nasıl yapılır", page: "/blog/how-to-brew-filter-coffee", clicks: 1380, impressions: 48200, position: 4.1 },
      { query: "espresso çekirdek kahve", page: "/products/espresso-beans", clicks: 890, impressions: 31400, position: 6.3 },
      { query: "kahve öğütücü", page: "/products/burr-grinder", clicks: 410, impressions: 22800, position: 9.7 },
      { query: "moka pot kullanımı", page: "/blog/moka-pot", clicks: 380, impressions: 14100, position: 5.2 },
      { query: "türk kahvesi 200 g", page: "/products/turkish-coffee-200g", clicks: 120, impressions: 9800, position: 14.6 },
    ],
    hidden: 3290,
  },
  bing: {
    name: "Bing Webmaster Tools",
    property: "https://www.example.com/",
    path: "searchConsole.bing",
    updated: "Nov 7",
    totals: { clicks: 520, impressions: 21300, position: 9.8, previousClicks: 470 },
    queries: [
      { query: "acme coffee istanbul", page: "/", clicks: 188, impressions: 1210, position: 1.6 },
      { query: "how to brew filter coffee", page: "/blog/how-to-brew-filter-coffee", clicks: 141, impressions: 7400, position: 5.8 },
      { query: "espresso beans 1kg", page: "/products/espresso-beans", clicks: 77, impressions: 3900, position: 7.9 },
      { query: "burr grinder", page: "/products/burr-grinder", clicks: 31, impressions: 2600, position: 12.3 },
    ],
    hidden: 83,
  },
  yandex: {
    name: "Yandex Webmaster",
    property: "https:www.example.com:443",
    path: "searchConsole.yandex",
    updated: "Nov 7",
    totals: { clicks: 370, impressions: 18900, position: 8.6, previousClicks: 402 },
    queries: [
      { query: "acme kahve", page: "/", clicks: 152, impressions: 690, position: 1.1 },
      { query: "filtre kahve", page: "/blog/how-to-brew-filter-coffee", clicks: 96, impressions: 5100, position: 6.4 },
      { query: "кофе в зернах стамбул", page: "/products/espresso-beans", clicks: 41, impressions: 2800, position: 8.8 },
      { query: "moka pot", page: "/blog/moka-pot", clicks: 22, impressions: 1700, position: 10.2 },
    ],
    hidden: 59,
  },
};

/* ---------------------------------------------------------- realtime */

export const REALTIME = {
  now: 37,
  visits30: 142,
  views30: 418,
  perMinute: [9, 11, 14, 12, 10, 13, 15, 16, 12, 11, 14, 18, 17, 13, 12, 15, 16, 19, 14, 12, 11, 13, 15, 17, 16, 14, 12, 15, 18, 14],
  pages: [
    { id: "/products/espresso-beans", value: 9 },
    { id: "/", value: 8 },
    { id: "/blog/how-to-brew-filter-coffee", value: 6 },
    { id: "/cart", value: 4 },
    { id: "/pricing", value: 3 },
    { id: "/checkout/address", value: 2 },
  ],
  sources: [
    { id: "newsletter", value: 11 },
    { id: "google.com", value: 9 },
    { id: "Direct", value: 8 },
    { id: "chatgpt.com", value: 3 },
    { id: "instagram.com", value: 3 },
  ],
  countries: [
    { id: "TR", name: "Türkiye", value: 29 },
    { id: "DE", name: "Germany", value: 4 },
    { id: "NL", name: "Netherlands", value: 2 },
    { id: "AZ", name: "Azerbaijan", value: 2 },
  ],
  feed: [
    { id: "e1", at: "11:42:18", visitor: "v-6Qp2", place: "İstanbul, Türkiye", text: "Bought, ₺1,840", kind: "goal" },
    { id: "e2", at: "11:42:05", visitor: "v-H81c", place: "Ankara, Türkiye", text: "Viewed /cart", kind: "page" },
    { id: "e3", at: "11:41:52", visitor: "v-pT0z", place: "Berlin, Germany", text: "Arrived from chatgpt.com on /products/espresso-beans", kind: "visit" },
    { id: "e4", at: "11:41:40", visitor: "v-9Lm4", place: "İzmir, Türkiye", text: "Searched the site", kind: "event" },
    { id: "e5", at: "11:41:31", visitor: "v-Q2xa", place: "İstanbul, Türkiye", text: "Downloaded /files/brew-guide.pdf", kind: "event" },
    { id: "e6", at: "11:41:12", visitor: "v-Kc7e", place: "Baku, Azerbaijan", text: "Arrived from newsletter on /", kind: "visit" },
  ],
};

/* ----------------------------------------------------------- sharing */

export interface EmailReport {
  id: string;
  name: string;
  recipients: string[];
  every: "daily" | "weekly" | "monthly";
  when: string;
  sections: string[];
  segment: string;
  last: string;
  owner: string;
}

export const EMAIL_REPORTS: EmailReport[] = [
  {
    id: "m1",
    name: "Weekly traffic",
    recipients: [TEAM.zeynep.email, TEAM.emily.email],
    every: "weekly",
    when: "Mondays 09:00",
    sections: ["Overview", "Acquisition", "Conversions"],
    segment: "All visits",
    last: "Nov 2, 09:00",
    owner: TEAM.zeynep.name,
  },
  {
    id: "m2",
    name: "Shop revenue",
    recipients: [TEAM.elif.email],
    every: "daily",
    when: "Every day 08:00",
    sections: ["Ecommerce"],
    segment: "All visits",
    last: "Today 08:00",
    owner: TEAM.elif.name,
  },
];

export interface ShareLink {
  id: string;
  name: string;
  access: "public" | "password";
  pages: string[];
  expires: string;
  views: number;
  by: string;
}

export const SHARE_LINKS: ShareLink[] = [
  { id: "l1", name: "Agency dashboard", access: "password", pages: ["Overview", "Acquisition"], expires: "Dec 31", views: 64, by: TEAM.zeynep.name },
  { id: "l2", name: "Open numbers", access: "public", pages: ["Overview"], expires: "Never", views: 1204, by: TEAM.emily.name },
];

export interface AlertRule {
  id: string;
  name: string;
  rule: string;
  to: string;
  on: boolean;
}

export const ALERT_RULES: AlertRule[] = [
  { id: "r1", name: "Traffic drop", rule: "Visits an hour fall below half the usual for that hour of the week", to: "Alerts, then email", on: true },
  { id: "r2", name: "Traffic spike", rule: "Visits an hour pass 2 times the usual for that hour of the week", to: "Email to Zeynep Kaya", on: true },
  { id: "r3", name: "No orders", rule: "No Bought conversion for 4 hours between 09:00 and 23:00", to: "Alerts, then email", on: true },
  { id: "r4", name: "Not found pages", rule: "Not found views an hour pass 3 times the usual", to: "Email to Mert Demir", on: false },
];

export const ALERT_HISTORY = [
  {
    id: "h1",
    at: "Nov 3, 10:20",
    rule: "Traffic spike",
    text: "Visits 2.3 times the usual for a Tuesday morning, 81% from the fall newsletter.",
    state: "Ended 14:05",
  },
  { id: "h2", at: "Oct 29, 13:00", rule: "Traffic drop", text: "Visits 44% of the usual: Republic Day, marked on the chart.", state: "Ended 20:00" },
  { id: "h3", at: "Oct 22, 02:10", rule: "No orders", text: "No orders for 4 hours: the payment page failed after a deploy.", state: "Ended 03:30" },
];
