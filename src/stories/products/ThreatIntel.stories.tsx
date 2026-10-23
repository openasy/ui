import { useState, type FormEvent } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Crosshair, Eye, Fingerprint, Plus, RefreshCw, Rss, Settings2, Skull, Timer } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { Heatmap } from "../../charts/Heatmap";
import { Sparkline } from "../../charts/Sparkline";
import type { Tone } from "../../tokens/levels";
import { HOSTS, timeLabels, wave } from "../mocks";

const nav = [
  { id: "indicators", label: "Indicators", icon: Fingerprint, count: "48k" },
  { id: "feeds", label: "Feeds", icon: Rss, count: 9 },
  { id: "matches", label: "Matches", icon: Crosshair, count: 23 },
  { id: "actors", label: "Actors", icon: Skull },
  { id: "sightings", label: "Sightings", icon: Eye },
];

const meta = {
  title: "Products/Threat Intel",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

type IocType = "ip" | "domain" | "hash" | "url";
type Tlp = "CLEAR" | "GREEN" | "AMBER" | "RED";

const TLP_TONE: Record<Tlp, Tone> = { CLEAR: "neutral", GREEN: "success", AMBER: "warning", RED: "danger" };
const TlpBadge = ({ tlp }: { tlp: Tlp }) => (
  <Badge tone={TLP_TONE[tlp]} mono>
    TLP:{tlp}
  </Badge>
);

interface Match {
  id: string;
  type: IocType;
  value: string;
  product: string;
  confidence: number;
  tlp: Tlp;
  actor: string;
  feed: string;
  firstSeen: string;
}

const matches: Match[] = [
  {
    id: "m1",
    type: "ip",
    value: "203.0.113.24",
    product: "Network IDS",
    confidence: 95,
    tlp: "CLEAR",
    actor: "Emotet · epoch 5",
    feed: "abuse.ch Feodo",
    firstSeen: "13:12",
  },
  {
    id: "m2",
    type: "ip",
    value: "198.51.100.201",
    product: "VPN sign-in",
    confidence: 80,
    tlp: "GREEN",
    actor: "Credential stuffing botnet",
    feed: "AlienVault OTX",
    firstSeen: "12:47",
  },
  {
    id: "m3",
    type: "domain",
    value: "acme-login.example.com",
    product: "SIEM",
    confidence: 88,
    tlp: "AMBER",
    actor: "Phishing kit · EvilProxy",
    feed: "MISP community",
    firstSeen: "11:30",
  },
  {
    id: "m4",
    type: "url",
    value: "http://cdn.example.com/wp-content/x.php",
    product: "WAF",
    confidence: 72,
    tlp: "CLEAR",
    actor: "Webshell campaign",
    feed: "abuse.ch URLhaus",
    firstSeen: "10:58",
  },
  {
    id: "m5",
    type: "hash",
    value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    product: "SIEM",
    confidence: 99,
    tlp: "CLEAR",
    actor: "AsyncRAT",
    feed: "abuse.ch MalwareBazaar",
    firstSeen: "09:41",
  },
  { id: "m6", type: "ip", value: "192.0.2.44", product: "WAF", confidence: 64, tlp: "GREEN", actor: "Mass scanner", feed: "internal", firstSeen: "09:02" },
  {
    id: "m7",
    type: "domain",
    value: "update-check.example.com",
    product: "Network IDS",
    confidence: 91,
    tlp: "RED",
    actor: "Campaign ACME-2026-07",
    feed: "internal",
    firstSeen: "08:15",
  },
  {
    id: "m8",
    type: "url",
    value: "https://files.example.com/invoice_0921.zip",
    product: "SIEM",
    confidence: 77,
    tlp: "AMBER",
    actor: "Qakbot distribution",
    feed: "MISP community",
    firstSeen: "07:33",
  },
  {
    id: "m9",
    type: "ip",
    value: "198.51.100.96",
    product: "VPN sign-in",
    confidence: 58,
    tlp: "CLEAR",
    actor: "Tor exit node",
    feed: "AlienVault OTX",
    firstSeen: "06:50",
  },
  {
    id: "m10",
    type: "hash",
    value: "5d41402abc4b2a76b9719d911017c592",
    product: "Network IDS",
    confidence: 83,
    tlp: "GREEN",
    actor: "Cobalt Strike beacon",
    feed: "abuse.ch ThreatFox",
    firstSeen: "05:12",
  },
];

const columns: Column<Match>[] = [
  { id: "type", header: "Type", width: "84px", sortValue: (m) => m.type, cell: (m) => <Badge mono>{m.type}</Badge> },
  {
    id: "value",
    header: "Indicator",
    width: "30%",
    sortValue: (m) => m.value,
    cell: (m) => (
      <span className="flex min-w-0 flex-col">
        <a href={`#ioc-${m.id}`} className="truncate font-mono text-xs text-fg no-underline hover:underline" title={m.value}>
          {m.value}
        </a>
        <span className="truncate text-2xs text-fg-muted">{m.feed}</span>
      </span>
    ),
  },
  { id: "product", header: "Matched in", sortValue: (m) => m.product, cell: (m) => <span className="whitespace-nowrap">{m.product}</span> },
  { id: "conf", header: "Confidence", align: "right", mono: true, sortValue: (m) => m.confidence, cell: (m) => `${m.confidence}%` },
  { id: "tlp", header: "TLP", cell: (m) => <TlpBadge tlp={m.tlp} /> },
  { id: "actor", header: "Actor / campaign", cell: (m) => <span className="text-xs">{m.actor}</span> },
  { id: "first", header: "First seen", align: "right", mono: true, sortValue: (m) => m.firstSeen, cell: (m) => m.firstSeen },
];

const feeds = [
  { id: "abusech", name: "abuse.ch", detail: "Feodo, URLhaus, ThreatFox, MalwareBazaar", sync: "4 min ago", count: "21,480", ok: true },
  { id: "otx", name: "AlienVault OTX", detail: "Subscribed pulses · TAXII 2.1", sync: "11 min ago", count: "14,902", ok: true },
  { id: "misp", name: "MISP community", detail: "CIRCL OSINT feed · STIX 2.1", sync: "2 h ago", count: "9,117", ok: false, note: "Sync slow" },
  { id: "kev", name: "CISA KEV", detail: "Known exploited vulnerabilities", sync: "1 h ago", count: "1,262", ok: true },
  { id: "internal", name: "Internal", detail: "From incidents and Deception", sync: "Live", count: "1,388", ok: true },
];

const HOURS = 24;
const labels = timeLabels(HOURS, 60);

const TYPES = [
  { value: "all", label: "All" },
  { value: "ip", label: "IP" },
  { value: "domain", label: "Domain" },
  { value: "hash", label: "Hash" },
  { value: "url", label: "URL" },
] as const;

interface Indicator {
  id: string;
  type: IocType;
  value: string;
  source: string;
  confidence: number;
  tlp: Tlp;
  tags: string[];
  added: string;
  expires: string;
  hits: number;
}

const INDICATORS: Indicator[] = [
  {
    id: "i-48149",
    type: "ip",
    value: "203.0.113.24",
    source: "abuse.ch Feodo",
    confidence: 95,
    tlp: "CLEAR",
    tags: ["botnet-c2", "emotet"],
    added: "Oct 18",
    expires: "in 29 d",
    hits: 14,
  },
  {
    id: "i-48148",
    type: "domain",
    value: "update-check.example.com",
    source: "Internal",
    confidence: 91,
    tlp: "RED",
    tags: ["c2", "acme-2026-07"],
    added: "Oct 18",
    expires: "in 89 d",
    hits: 6,
  },
  {
    id: "i-48147",
    type: "url",
    value: "https://files.example.com/invoice_0921.zip",
    source: "MISP community",
    confidence: 77,
    tlp: "AMBER",
    tags: ["qakbot", "dropper"],
    added: "Oct 17",
    expires: "in 6 d",
    hits: 2,
  },
  {
    id: "i-48146",
    type: "hash",
    value: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    source: "abuse.ch MalwareBazaar",
    confidence: 99,
    tlp: "CLEAR",
    tags: ["asyncrat"],
    added: "Oct 17",
    expires: "never",
    hits: 1,
  },
  {
    id: "i-48145",
    type: "ip",
    value: "198.51.100.201",
    source: "AlienVault OTX",
    confidence: 80,
    tlp: "GREEN",
    tags: ["credential-stuffing"],
    added: "Oct 16",
    expires: "in 27 d",
    hits: 31,
  },
  {
    id: "i-48144",
    type: "domain",
    value: "acme-login.example.com",
    source: "MISP community",
    confidence: 88,
    tlp: "AMBER",
    tags: ["phishing", "evilproxy"],
    added: "Oct 16",
    expires: "in 74 d",
    hits: 4,
  },
  {
    id: "i-48143",
    type: "ip",
    value: "192.0.2.44",
    source: "Internal",
    confidence: 64,
    tlp: "GREEN",
    tags: ["scanner"],
    added: "Oct 15",
    expires: "in 2 d",
    hits: 212,
  },
  {
    id: "i-48142",
    type: "url",
    value: "http://cdn.example.com/wp-content/x.php",
    source: "abuse.ch URLhaus",
    confidence: 72,
    tlp: "CLEAR",
    tags: ["webshell"],
    added: "Oct 15",
    expires: "in 13 d",
    hits: 3,
  },
  {
    id: "i-48141",
    type: "hash",
    value: "5d41402abc4b2a76b9719d911017c592",
    source: "abuse.ch ThreatFox",
    confidence: 83,
    tlp: "GREEN",
    tags: ["cobalt-strike"],
    added: "Oct 14",
    expires: "never",
    hits: 1,
  },
  {
    id: "i-48140",
    type: "ip",
    value: "198.51.100.96",
    source: "AlienVault OTX",
    confidence: 58,
    tlp: "CLEAR",
    tags: ["tor-exit"],
    added: "Oct 14",
    expires: "in 1 d",
    hits: 9,
  },
  {
    id: "i-48139",
    type: "domain",
    value: "pay-portal.example.com",
    source: "CISA KEV",
    confidence: 70,
    tlp: "CLEAR",
    tags: ["phishing"],
    added: "Oct 13",
    expires: "in 60 d",
    hits: 0,
  },
  {
    id: "i-48138",
    type: "ip",
    value: "203.0.113.181",
    source: "Deception",
    confidence: 100,
    tlp: "AMBER",
    tags: ["canary-trigger"],
    added: "Oct 12",
    expires: "in 88 d",
    hits: 2,
  },
];

type FeedStatus = "synced" | "slow" | "failing" | "paused";
const FEED_STATUS: Record<FeedStatus, { label: string; tone: Tone }> = {
  synced: { label: "Synced", tone: "success" },
  slow: { label: "Sync slow", tone: "warning" },
  failing: { label: "Failing", tone: "danger" },
  paused: { label: "Paused", tone: "neutral" },
};

interface Feed {
  id: string;
  name: string;
  format: string;
  url: string;
  interval: string;
  indicators: number;
  added24h: number;
  lastSync: string;
  status: FeedStatus;
  enabled: boolean;
  minConfidence: number;
  defaultTlp: Tlp;
  error?: string;
  history: number[];
}

const FEEDS: Feed[] = [
  {
    id: "feodo",
    name: "abuse.ch Feodo",
    format: "CSV",
    url: "https://feodotracker.abuse.ch/downloads/ipblocklist.csv",
    interval: "15 min",
    indicators: 4_210,
    added24h: 38,
    lastSync: "4 min ago",
    status: "synced",
    enabled: true,
    minConfidence: 75,
    defaultTlp: "CLEAR",
    history: wave(24, { base: 40, amp: 15, seed: 81 }),
  },
  {
    id: "urlhaus",
    name: "abuse.ch URLhaus",
    format: "CSV",
    url: "https://urlhaus.abuse.ch/downloads/csv_recent/",
    interval: "15 min",
    indicators: 9_812,
    added24h: 412,
    lastSync: "4 min ago",
    status: "synced",
    enabled: true,
    minConfidence: 60,
    defaultTlp: "CLEAR",
    history: wave(24, { base: 400, amp: 120, seed: 82 }),
  },
  {
    id: "threatfox",
    name: "abuse.ch ThreatFox",
    format: "JSON",
    url: "https://threatfox-api.abuse.ch/api/v1/",
    interval: "30 min",
    indicators: 5_120,
    added24h: 201,
    lastSync: "9 min ago",
    status: "synced",
    enabled: true,
    minConfidence: 50,
    defaultTlp: "CLEAR",
    history: wave(24, { base: 200, amp: 60, seed: 83 }),
  },
  {
    id: "bazaar",
    name: "abuse.ch MalwareBazaar",
    format: "JSON",
    url: "https://mb-api.abuse.ch/api/v1/",
    interval: "1 h",
    indicators: 2_338,
    added24h: 96,
    lastSync: "22 min ago",
    status: "synced",
    enabled: true,
    minConfidence: 80,
    defaultTlp: "CLEAR",
    history: wave(24, { base: 90, amp: 30, seed: 84 }),
  },
  {
    id: "otx",
    name: "AlienVault OTX",
    format: "TAXII 2.1",
    url: "https://otx.example.com/taxii/root/collections/",
    interval: "30 min",
    indicators: 14_902,
    added24h: 288,
    lastSync: "11 min ago",
    status: "synced",
    enabled: true,
    minConfidence: 60,
    defaultTlp: "GREEN",
    history: wave(24, { base: 280, amp: 90, seed: 85 }),
  },
  {
    id: "misp",
    name: "MISP community",
    format: "STIX 2.1",
    url: "https://misp.example.com/events/restSearch",
    interval: "1 h",
    indicators: 9_117,
    added24h: 12,
    lastSync: "2 h ago",
    status: "slow",
    enabled: true,
    minConfidence: 50,
    defaultTlp: "AMBER",
    error: "Last 3 pulls took over 14 min; the server returned HTTP 429 twice.",
    history: wave(24, { base: 60, amp: 30, seed: 86, spike: -55, spikeAt: 18 }),
  },
  {
    id: "kev",
    name: "CISA KEV",
    format: "JSON",
    url: "https://www.example.com/kev/known_exploited_vulnerabilities.json",
    interval: "6 h",
    indicators: 1_262,
    added24h: 3,
    lastSync: "1 h ago",
    status: "synced",
    enabled: true,
    minConfidence: 100,
    defaultTlp: "CLEAR",
    history: wave(24, { base: 2, amp: 2, seed: 87 }),
  },
  {
    id: "partner",
    name: "Partner ISAC",
    format: "TAXII 2.1",
    url: "https://isac.example.com/taxii2/",
    interval: "1 h",
    indicators: 0,
    added24h: 0,
    lastSync: "3 d ago",
    status: "failing",
    enabled: true,
    minConfidence: 70,
    defaultTlp: "AMBER",
    error: "401 Unauthorized: API key expired on Oct 16.",
    history: Array(24).fill(0),
  },
  {
    id: "internal",
    name: "Internal",
    format: "Native",
    url: "Incidents, Deception and analyst submissions",
    interval: "Live",
    indicators: 1_388,
    added24h: 17,
    lastSync: "Live",
    status: "synced",
    enabled: true,
    minConfidence: 0,
    defaultTlp: "AMBER",
    history: wave(24, { base: 1, amp: 1, seed: 88, spike: 6, spikeAt: 13, spikeLen: 2 }),
  },
];

interface Actor {
  id: string;
  name: string;
  aliases: string[];
  kind: "Group" | "Malware" | "Campaign";
  motivation: string;
  origin: string;
  sectors: string[];
  indicators: number;
  matches30d: number;
  lastSeen: string;
  summary: string;
  ttps: Array<{ id: string; name: string; tactic: string; seen: boolean }>;
}

const ACTORS: Actor[] = [
  {
    id: "fin7",
    name: "FIN7",
    aliases: ["Carbanak", "Sangria Tempest"],
    kind: "Group",
    motivation: "Financial",
    origin: "Unattributed",
    sectors: ["Retail", "Hospitality", "Finance"],
    indicators: 1_204,
    matches30d: 3,
    lastSeen: "2 days ago",
    summary: "Financially motivated group running spear-phishing with weaponised documents, then Cobalt Strike and custom backdoors for lateral movement.",
    ttps: [
      { id: "T1566.001", name: "Spearphishing attachment", tactic: "Initial access", seen: true },
      { id: "T1059.001", name: "PowerShell", tactic: "Execution", seen: true },
      { id: "T1053.005", name: "Scheduled task", tactic: "Persistence", seen: false },
      { id: "T1021.001", name: "Remote desktop protocol", tactic: "Lateral movement", seen: false },
      { id: "T1071.001", name: "Web protocols C2", tactic: "Command and control", seen: true },
      { id: "T1041", name: "Exfiltration over C2 channel", tactic: "Exfiltration", seen: false },
    ],
  },
  {
    id: "emotet",
    name: "Emotet",
    aliases: ["Geodo", "Mealybug"],
    kind: "Malware",
    motivation: "Financial · loader for hire",
    origin: "Unattributed",
    sectors: ["All sectors"],
    indicators: 4_210,
    matches30d: 14,
    lastSeen: "today 13:12",
    summary: "Modular loader spread by thread-hijacked email. Epoch 5 botnet active again since September, dropping Cobalt Strike and IcedID.",
    ttps: [
      { id: "T1566.002", name: "Spearphishing link", tactic: "Initial access", seen: true },
      { id: "T1204.002", name: "User execution: malicious file", tactic: "Execution", seen: true },
      { id: "T1547.001", name: "Registry run keys", tactic: "Persistence", seen: false },
      { id: "T1071.001", name: "Web protocols C2", tactic: "Command and control", seen: true },
    ],
  },
  {
    id: "acme-2026-07",
    name: "Campaign ACME-2026-07",
    aliases: ["Internal tracking"],
    kind: "Campaign",
    motivation: "Data theft",
    origin: "Unknown",
    sectors: ["Our organisation"],
    indicators: 37,
    matches30d: 6,
    lastSeen: "today 08:15",
    summary: "Targeted activity against our build infrastructure: DNS tunnelling from a CI runner and a decoy credential used from 198.51.100.201.",
    ttps: [
      { id: "T1552.001", name: "Credentials in files", tactic: "Credential access", seen: true },
      { id: "T1071.004", name: "DNS C2", tactic: "Command and control", seen: true },
      { id: "T1048.003", name: "Exfiltration over unencrypted protocol", tactic: "Exfiltration", seen: true },
    ],
  },
  {
    id: "asyncrat",
    name: "AsyncRAT",
    aliases: ["AsyncRAT-C#"],
    kind: "Malware",
    motivation: "Remote access",
    origin: "Open source",
    sectors: ["All sectors"],
    indicators: 2_880,
    matches30d: 1,
    lastSeen: "today 09:41",
    summary: "Open-source remote access trojan delivered by script loaders. Keylogging, screen capture and credential theft.",
    ttps: [
      { id: "T1059.005", name: "Visual Basic", tactic: "Execution", seen: false },
      { id: "T1056.001", name: "Keylogging", tactic: "Collection", seen: false },
      { id: "T1571", name: "Non-standard port", tactic: "Command and control", seen: true },
    ],
  },
  {
    id: "evilproxy",
    name: "EvilProxy",
    aliases: ["Moloch"],
    kind: "Malware",
    motivation: "Account takeover",
    origin: "Phishing-as-a-service",
    sectors: ["SaaS", "Finance"],
    indicators: 640,
    matches30d: 4,
    lastSeen: "today 11:30",
    summary: "Reverse-proxy phishing kit that steals session cookies to bypass MFA. Lures pose as single sign-on portals.",
    ttps: [
      { id: "T1566.002", name: "Spearphishing link", tactic: "Initial access", seen: true },
      { id: "T1557", name: "Adversary-in-the-middle", tactic: "Credential access", seen: true },
      { id: "T1539", name: "Steal web session cookie", tactic: "Credential access", seen: false },
    ],
  },
];

const TACTICS = ["Initial access", "Execution", "Persistence", "Credential access", "Lateral movement", "Collection", "Command and control", "Exfiltration"];

interface Sighting {
  id: string;
  time: string;
  product: string;
  asset: string;
  assetKind: "host" | "user" | "url";
  context: string;
  action: "Blocked" | "Alerted" | "Logged";
}

const SIGHTINGS: Record<string, Sighting[]> = {
  "203.0.113.24": [
    {
      id: "s1",
      time: "Oct 19 13:58",
      product: "Deception",
      asset: HOSTS[0],
      assetKind: "host",
      context: "Canary database login with svc_reporting",
      action: "Alerted",
    },
    {
      id: "s2",
      time: "Oct 19 13:12",
      product: "Network IDS",
      asset: HOSTS[3],
      assetKind: "host",
      context: "ET MALWARE Feodo Tracker C2 · tcp/443 outbound",
      action: "Alerted",
    },
    {
      id: "s3",
      time: "Oct 19 12:40",
      product: "WAF",
      asset: "api.example.com",
      assetKind: "url",
      context: "942100 SQLi via libinjection on /v1/orders",
      action: "Blocked",
    },
    {
      id: "s4",
      time: "Oct 19 11:02",
      product: "WAF",
      asset: "api.example.com",
      assetKind: "url",
      context: "942160 Blind SQLi sleep() on /v1/orders",
      action: "Blocked",
    },
    {
      id: "s5",
      time: "Oct 18 22:15",
      product: "VPN sign-in",
      asset: "dana.kim",
      assetKind: "user",
      context: "Real IP of a VPN session · lon-01",
      action: "Logged",
    },
    {
      id: "s6",
      time: "Oct 18 09:30",
      product: "SIEM",
      asset: HOSTS[7],
      assetKind: "host",
      context: "nginx access log · 403 · 1,204 requests",
      action: "Logged",
    },
  ],
  "update-check.example.com": [
    {
      id: "s7",
      time: "Oct 19 08:15",
      product: "Network IDS",
      asset: HOSTS[4],
      assetKind: "host",
      context: "DNS TXT queries · 2,413 in 41 min",
      action: "Alerted",
    },
    { id: "s8", time: "Oct 19 08:02", product: "SIEM", asset: HOSTS[4], assetKind: "host", context: "Process curl resolved the domain", action: "Logged" },
    { id: "s9", time: "Oct 18 23:44", product: "Network IDS", asset: HOSTS[2], assetKind: "host", context: "TLS SNI match · JA3 72a589da…", action: "Alerted" },
  ],
  "198.51.100.201": [
    {
      id: "s10",
      time: "Oct 19 13:58",
      product: "Deception",
      asset: "backup-svc AWS key",
      assetKind: "url",
      context: "Canary AWS key used: sts:GetCallerIdentity",
      action: "Alerted",
    },
    {
      id: "s11",
      time: "Oct 19 13:53",
      product: "VPN sign-in",
      asset: "ben.ortiz",
      assetKind: "user",
      context: "Failed sign-in: wrong TOTP code (3 of 5)",
      action: "Blocked",
    },
    {
      id: "s12",
      time: "Oct 19 12:47",
      product: "VPN sign-in",
      asset: "sarah.chen",
      assetKind: "user",
      context: "Password spray · 41 accounts in 10 min",
      action: "Blocked",
    },
    {
      id: "s13",
      time: "Oct 19 14:02",
      product: "WAF",
      asset: "app.example.com",
      assetKind: "url",
      context: "941100 XSS via libinjection on /login",
      action: "Blocked",
    },
  ],
};

const ACTION_TONE: Record<Sighting["action"], Tone> = { Blocked: "success", Alerted: "danger", Logged: "neutral" };

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function IndicatorsPage() {
  const [rows, setRows] = useState(INDICATORS);
  const [q, setQ] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [tlps, setTlps] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");
  const [draft, setDraft] = useState({ type: "ip" as IocType, value: "", tlp: "AMBER" as Tlp, confidence: "80", expiry: "30", tags: "" });
  const shown = rows.filter(
    (i) =>
      (types.length === 0 || types.includes(i.type)) &&
      (tlps.length === 0 || tlps.includes(i.tlp)) &&
      (!q || `${i.value} ${i.tags.join(" ")} ${i.source}`.toLowerCase().includes(q.toLowerCase())),
  );
  const cols: Column<Indicator>[] = [
    { id: "type", header: "Type", width: "72px", sortValue: (i) => i.type, cell: (i) => <Badge mono>{i.type}</Badge> },
    {
      id: "value",
      header: "Value",
      pinned: "left",
      width: "28%",
      sortValue: (i) => i.value,
      cell: (i) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs" title={i.value}>
            {i.value}
          </span>
          <span className="flex flex-wrap gap-1">
            {i.tags.map((t) => (
              <span key={t} className="font-mono text-2xs text-fg-muted">
                #{t}
              </span>
            ))}
          </span>
        </span>
      ),
    },
    { id: "source", header: "Source", sortValue: (i) => i.source, cell: (i) => <span className="whitespace-nowrap">{i.source}</span> },
    {
      id: "conf",
      header: "Confidence",
      align: "right",
      description: "0–100. Matches below 50 are logged but never alert.",
      sortValue: (i) => i.confidence,
      cell: (i) => (
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden className="h-1.5 w-10 overflow-hidden rounded-full bg-subtle">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${i.confidence}%` }} />
          </span>
          <span className="font-mono text-xs">{i.confidence}</span>
        </span>
      ),
    },
    {
      id: "tlp",
      header: "TLP",
      description: "Traffic Light Protocol: who this indicator may be shared with.",
      sortValue: (i) => i.tlp,
      cell: (i) => <TlpBadge tlp={i.tlp} />,
    },
    { id: "hits", header: "Hits · 30 d", align: "right", mono: true, sortValue: (i) => i.hits, cell: (i) => i.hits },
    { id: "added", header: "Added", mono: true, cell: (i) => i.added },
    {
      id: "expires",
      header: "Expires",
      description: "Indicators age out so stale IPs stop alerting. IPs default to 30 days, hashes never.",
      cell: (i) => (
        <span className={i.expires === "in 1 d" || i.expires === "in 2 d" ? "whitespace-nowrap text-warning-text" : "whitespace-nowrap text-fg-muted"}>
          {i.expires}
        </span>
      ),
    },
  ];
  const add = (e: FormEvent) => {
    e.preventDefault();
    if (!draft.value.trim()) return;
    const id = `i-${48150 + rows.length - INDICATORS.length}`;
    setRows((rs) => [
      {
        id,
        type: draft.type,
        value: draft.value.trim(),
        source: "Analyst · Emily Clark",
        confidence: Number(draft.confidence),
        tlp: draft.tlp,
        tags: draft.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        added: "Oct 19",
        expires: draft.expiry === "0" ? "never" : `in ${draft.expiry} d`,
        hits: 0,
      },
      ...rs,
    ]);
    setNotice(`Added ${draft.value.trim()} · pushed to SIEM, WAF and Network IDS`);
    setDraft((d) => ({ ...d, value: "", tags: "" }));
    setAdding(false);
  };
  const bulkExpire = () => {
    setRows((rs) => rs.map((r) => (selected.includes(r.id) ? { ...r, expires: "expired" } : r)));
    setNotice(`Expired ${selected.length} ${selected.length === 1 ? "indicator" : "indicators"}`);
    setSelected([]);
  };
  return (
    <>
      <PageHeader
        title="Indicators"
        description="48,149 active indicators from 9 feeds and analysts · deduplicated by value"
        actions={
          <>
            <Button>Import STIX bundle</Button>
            <Button variant="primary" icon={<Plus />} onClick={() => setAdding(true)}>
              Add indicator
            </Button>
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Active" value="48,149" trend={wave(14, { base: 47000, amp: 900, seed: 61 })} delta={{ label: "+1,204 today", direction: "up" }} />
        <KpiCard
          label="By type"
          value="61%"
          unit="IPs"
          footer={<span className="font-mono text-2xs text-fg-muted">IP 29.4k · domain 9.8k · URL 6.1k · hash 2.8k</span>}
        />
        <KpiCard label="Expiring · 7 d" value="3,812" unit="indicators" tone="warning" delta={{ label: "Mostly scanner IPs from OTX" }} />
        <KpiCard label="Analyst added" value="212" unit="this quarter" delta={{ label: "TLP:AMBER by default" }} />
      </KpiGrid>
      {adding && (
        <Panel
          title="Add indicator"
          description="Pushed to every connected product within a minute"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setAdding(false)}>
              Cancel
            </Button>
          }
        >
          <form
            aria-label="Add indicator"
            className="grid gap-2.5 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_minmax(0,3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]"
            onSubmit={add}
          >
            <SelectField
              label="Type"
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as IocType })}
              options={[
                { value: "ip", label: "IP address" },
                { value: "domain", label: "Domain" },
                { value: "url", label: "URL" },
                { value: "hash", label: "File hash" },
              ]}
            />
            <TextField
              label="Value"
              mono
              placeholder="198.51.100.23 or bad.example.com"
              value={draft.value}
              onChange={(e) => setDraft({ ...draft, value: e.target.value })}
            />
            <SelectField
              label="TLP"
              value={draft.tlp}
              onChange={(e) => setDraft({ ...draft, tlp: e.target.value as Tlp })}
              options={(["CLEAR", "GREEN", "AMBER", "RED"] as Tlp[]).map((t) => ({ value: t, label: `TLP:${t}` }))}
            />
            <SelectField
              label="Confidence"
              value={draft.confidence}
              onChange={(e) => setDraft({ ...draft, confidence: e.target.value })}
              options={[
                { value: "100", label: "100 · confirmed" },
                { value: "80", label: "80 · high" },
                { value: "60", label: "60 · medium" },
                { value: "40", label: "40 · low" },
              ]}
            />
            <SelectField
              label="Expires"
              value={draft.expiry}
              onChange={(e) => setDraft({ ...draft, expiry: e.target.value })}
              options={[
                { value: "7", label: "7 days" },
                { value: "30", label: "30 days" },
                { value: "90", label: "90 days" },
                { value: "0", label: "Never" },
              ]}
            />
            <div className="md:col-span-2 lg:col-span-4">
              <TextField
                label="Tags"
                placeholder="phishing, acme-2026-07"
                hint="Comma separated. Tags link indicators to actors and campaigns."
                value={draft.tags}
                onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" variant="primary">
                Save indicator
              </Button>
            </div>
          </form>
        </Panel>
      )}
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <FilterBar onClear={types.length || tlps.length || q ? () => (setTypes([]), setTlps([]), setQ("")) : undefined}>
        <SearchInput label="Search value, tag or source" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
        <FacetFilter
          label="Type"
          selected={types}
          onChange={setTypes}
          options={(["ip", "domain", "url", "hash"] as IocType[]).map((t) => ({ value: t, count: rows.filter((r) => r.type === t).length }))}
        />
        <FacetFilter
          label="TLP"
          selected={tlps}
          onChange={setTlps}
          options={(["CLEAR", "GREEN", "AMBER", "RED"] as Tlp[]).map((t) => ({ value: t, label: `TLP:${t}`, count: rows.filter((r) => r.tlp === t).length }))}
        />
      </FilterBar>
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" icon={<Timer />} onClick={bulkExpire}>
            Expire now
          </Button>
          <Button size="sm" onClick={() => (setNotice(`Exported ${selected.length} as STIX 2.1`), setSelected([]))}>
            Export STIX
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      <Panel title="Indicator store" description={`${shown.length} of ${rows.length} shown · newest first`} flush>
        <DataTable
          label="Indicators"
          columns={cols}
          rows={shown}
          getRowId={(i) => i.id}
          selectable
          selectedIds={selected}
          onSelectionChange={setSelected}
          pageSize={10}
          minWidth={1080}
          empty={<p className="py-8">No indicators match</p>}
        />
      </Panel>
    </>
  );
}

function FeedsPage() {
  const [rows, setRows] = useState(FEEDS);
  const [active, setActive] = useState("misp");
  const [synced, setSynced] = useState("");
  const f = rows.find((x) => x.id === active)!;
  const update = (patch: Partial<Feed>) => setRows((rs) => rs.map((r) => (r.id === active ? { ...r, ...patch } : r)));
  const cols: Column<Feed>[] = [
    {
      id: "name",
      header: "Feed",
      width: "24%",
      sortValue: (x) => x.name,
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{x.name}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{x.format}</span>
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      sortValue: (x) => x.status,
      cell: (x) =>
        x.enabled ? (
          <StatusBadge tone={FEED_STATUS[x.status].tone}>{FEED_STATUS[x.status].label}</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">Paused</StatusBadge>
        ),
    },
    { id: "ind", header: "Indicators", align: "right", mono: true, sortValue: (x) => x.indicators, cell: (x) => x.indicators.toLocaleString("en-US") },
    { id: "added", header: "New · 24 h", align: "right", mono: true, sortValue: (x) => x.added24h, cell: (x) => x.added24h },
    {
      id: "trend",
      header: "Ingested · 24 h",
      width: "120px",
      cell: (x) => <Sparkline data={x.history} label={`Indicators ingested per hour from ${x.name}`} height={20} />,
    },
    { id: "interval", header: "Every", mono: true, cell: (x) => x.interval },
    { id: "sync", header: "Last sync", align: "right", cell: (x) => <span className="whitespace-nowrap text-fg-muted">{x.lastSync}</span> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      width: "110px",
      hideable: false,
      cell: (x) => (
        <Button size="xs" icon={<Settings2 />} aria-label={`Configure ${x.name}`} onClick={() => setActive(x.id)}>
          Configure
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Feeds"
        description="Where indicators come from. Feeds are pulled on a schedule, normalised to STIX 2.1 and scored."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add feed
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Feeds" value="9" unit="7 healthy" tone="warning" delta={{ label: "1 slow · 1 failing", intent: "bad" }} />
        <KpiCard label="Ingested · 24 h" value="1,067" unit="new indicators" trend={wave(24, { base: 45, amp: 18, seed: 89 })} />
        <KpiCard label="Duplicates merged" value="38%" unit="across feeds" delta={{ label: "Same value from 2+ feeds raises confidence" }} />
        <KpiCard label="False positive reports" value="4" unit="this month" delta={{ label: "All from OTX scanner pulses" }} />
      </KpiGrid>
      {rows.some((r) => r.status === "failing") && (
        <Callout
          tone="danger"
          title="Partner ISAC has not synced for 3 days"
          action={
            <Button size="sm" onClick={() => setActive("partner")}>
              Fix credentials
            </Button>
          }
        >
          The TAXII server answers 401 Unauthorized. The API key expired on Oct 16.
        </Callout>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Configured feeds" flush>
          <DataTable label="Feeds" columns={cols} rows={rows} getRowId={(x) => x.id} activeRowId={active} minWidth={900} />
        </Panel>
        <Panel
          title={f.name}
          description={f.format}
          actions={
            f.enabled ? (
              <StatusBadge tone={FEED_STATUS[f.status].tone}>{FEED_STATUS[f.status].label}</StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Paused</StatusBadge>
            )
          }
          aria-label="Feed configuration"
        >
          <div className="flex flex-col gap-2.5">
            {f.error && <Callout tone={f.status === "failing" ? "danger" : "warning"} title={f.error} />}
            <TextField key={`${f.id}-url`} label="Endpoint" mono defaultValue={f.url} />
            <div className="grid grid-cols-2 gap-2.5">
              <SelectField
                key={`${f.id}-int`}
                label="Pull every"
                defaultValue={f.interval}
                options={["Live", "15 min", "30 min", "1 h", "6 h", "24 h"].map((v) => ({ value: v, label: v }))}
              />
              <SelectField
                key={`${f.id}-tlp`}
                label="Default TLP"
                defaultValue={f.defaultTlp}
                options={(["CLEAR", "GREEN", "AMBER", "RED"] as Tlp[]).map((t) => ({ value: t, label: `TLP:${t}` }))}
              />
            </div>
            <TextField
              key={`${f.id}-conf`}
              label="Minimum confidence"
              type="number"
              defaultValue={f.minConfidence}
              hint="Indicators below this score are stored but never alert."
            />
            <Switch
              checked={f.enabled}
              onCheckedChange={(v) => update({ enabled: v })}
              label="Pull this feed"
              description="Paused feeds keep their indicators until they expire."
            />
            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-2.5">
              <Button
                size="sm"
                variant="primary"
                icon={<RefreshCw />}
                onClick={() => {
                  update({ status: "synced", lastSync: "just now", error: undefined });
                  setSynced(`${f.name} synced · ${f.added24h + 4} new indicators`);
                }}
              >
                Sync now
              </Button>
              <Button size="sm" variant="ghost">
                Test connection
              </Button>
              {synced && (
                <span role="status" className="text-xs text-success">
                  {synced}
                </span>
              )}
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Indicators ingested per hour" description="All feeds, stacked">
        <TimeSeriesChart
          label="Indicators ingested per hour by feed"
          labels={labels}
          stacked
          height={170}
          series={[
            { id: "urlhaus", name: "URLhaus", data: FEEDS[1]!.history },
            { id: "otx", name: "OTX", data: FEEDS[4]!.history },
            { id: "threatfox", name: "ThreatFox", data: FEEDS[2]!.history },
            { id: "other", name: "Other feeds", data: wave(HOURS, { base: 120, amp: 40, seed: 90 }) },
          ]}
        />
      </Panel>
    </>
  );
}

function MatchesPage() {
  const [range, setRange] = useState("24h");
  const [type, setType] = useState<"all" | IocType>("all");
  const [q, setQ] = useState("");
  const rows = matches.filter((m) => (type === "all" || m.type === type) && (!q || `${m.value} ${m.actor}`.toLowerCase().includes(q.toLowerCase())));
  return (
    <>
      <PageHeader
        title="Matches"
        description="9 feeds over STIX/TAXII · enriching SIEM, VPN, WAF, Network IDS and DAST"
        meta={<StatusBadge tone="danger">1 TLP:RED match</StatusBadge>}
        actions={
          <Button size="md" variant="primary" icon={<Plus aria-hidden />}>
            Add indicator
          </Button>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <SegmentedControl label="Indicator type" value={type} onChange={setType} options={TYPES} />
        <SearchInput label="Search indicators or actors" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Indicators"
          value="48,149"
          unit="active"
          trend={wave(14, { base: 47000, amp: 900, seed: 61 })}
          delta={{ label: "+1,204 today", direction: "up" }}
        />
        <KpiCard label="Feeds healthy" value="8" unit="of 9" tone="warning" delta={{ label: "MISP community syncing slowly", intent: "bad" }} />
        <KpiCard
          label="Matches · 24 h"
          value="23"
          unit="in 4 products"
          tone="danger"
          trendColor="var(--oa-danger)"
          trend={wave(12, { base: 2, amp: 1.5, seed: 62, spike: 3, spikeAt: 8 })}
          delta={{ label: "+9 vs. yesterday", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Expired today" value="612" unit="indicators" delta={{ label: "TTL 30 days for IPs" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Matches per hour" description="By product that saw the indicator">
          <TimeSeriesChart
            label="Threat intel matches per hour by product"
            labels={labels}
            stacked
            height={190}
            series={[
              { id: "nids", name: "Network IDS", data: wave(HOURS, { base: 0.5, amp: 0.4, seed: 63, spike: 2, spikeAt: 13, spikeLen: 2 }) },
              { id: "vpn", name: "VPN sign-in", data: wave(HOURS, { base: 0.3, amp: 0.3, seed: 64 }) },
              { id: "waf", name: "WAF", data: wave(HOURS, { base: 0.4, amp: 0.3, seed: 65 }) },
              { id: "siem", name: "SIEM", data: wave(HOURS, { base: 0.3, amp: 0.2, seed: 66 }) },
            ]}
          />
        </Panel>
        <Panel
          title="Feeds"
          description="9 configured · 5 shown"
          actions={
            <Button size="sm" variant="ghost">
              Manage
            </Button>
          }
          flush
        >
          <ul aria-label="Threat intel feeds" className="flex flex-col">
            {feeds.map((f) => (
              <li key={f.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-3 py-1.5 last:border-0">
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-medium">{f.name}</span>
                  <span className="truncate text-2xs text-fg-muted">{f.detail}</span>
                </span>
                <span className="flex flex-col items-end gap-0.5">
                  {f.ok ? <StatusBadge tone="success">Synced</StatusBadge> : <StatusBadge tone="warning">{f.note}</StatusBadge>}
                  <span className="font-mono text-2xs text-fg-muted">
                    {f.count} · {f.sync}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Matches" description={`${rows.length} of ${matches.length} shown`} flush>
        <DataTable
          label="Matches"
          columns={columns}
          rows={rows}
          getRowId={(m) => m.id}
          defaultSort={{ id: "first", direction: "desc" }}
          minWidth={1000}
          empty={<p className="py-8">No matches of this type</p>}
        />
      </Panel>
    </>
  );
}

function ActorsPage() {
  const [active, setActive] = useState("emotet");
  const [kinds, setKinds] = useState<string[]>([]);
  const a = ACTORS.find((x) => x.id === active)!;
  const rows = ACTORS.filter((x) => kinds.length === 0 || kinds.includes(x.kind));
  const cols: Column<Actor>[] = [
    {
      id: "name",
      header: "Actor or campaign",
      sortValue: (x) => x.name,
      cell: (x) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{x.name}</span>
          <span className="truncate text-2xs text-fg-muted">{x.aliases.join(", ")}</span>
        </span>
      ),
    },
    { id: "kind", header: "Kind", sortValue: (x) => x.kind, cell: (x) => <Badge variant="outline">{x.kind}</Badge> },
    { id: "ind", header: "Indicators", align: "right", mono: true, sortValue: (x) => x.indicators, cell: (x) => x.indicators.toLocaleString("en-US") },
    {
      id: "m30",
      header: "Matches · 30 d",
      align: "right",
      mono: true,
      sortValue: (x) => x.matches30d,
      cell: (x) => <span className={x.matches30d >= 5 ? "text-danger-text" : undefined}>{x.matches30d}</span>,
    },
    { id: "last", header: "Last seen", cell: (x) => <span className="whitespace-nowrap text-fg-muted">{x.lastSeen}</span> },
  ];
  return (
    <>
      <PageHeader
        title="Actors"
        description="Groups, malware families and campaigns, with the ATT&CK techniques we have seen in our own telemetry."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New campaign
          </Button>
        }
      />
      <FilterBar onClear={kinds.length ? () => setKinds([]) : undefined}>
        <SearchInput label="Search actors or aliases" className="w-60" />
        <FacetFilter
          label="Kind"
          selected={kinds}
          onChange={setKinds}
          options={["Group", "Malware", "Campaign"].map((k) => ({ value: k, count: ACTORS.filter((x) => x.kind === k).length }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Tracked actors" description="Select one to see its profile" flush>
          <DataTable
            label="Actors"
            columns={cols}
            rows={rows}
            getRowId={(x) => x.id}
            onRowClick={(x) => setActive(x.id)}
            activeRowId={active}
            defaultSort={{ id: "m30", direction: "desc" }}
            minWidth={620}
          />
        </Panel>
        <Panel title={a.name} description={`${a.kind} · ${a.motivation} · ${a.origin}`} aria-label="Actor profile">
          <div className="flex flex-col gap-2.5">
            <p className="text-sm">{a.summary}</p>
            <dl className="grid grid-cols-3 gap-2 text-sm">
              <div>
                <dt className="text-2xs text-fg-muted">Indicators</dt>
                <dd className="font-mono font-semibold">{a.indicators.toLocaleString("en-US")}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Matches · 30 d</dt>
                <dd className="font-mono font-semibold">{a.matches30d}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Last seen</dt>
                <dd className="text-xs">{a.lastSeen}</dd>
              </div>
            </dl>
            <div className="flex flex-wrap gap-1">
              {a.sectors.map((s) => (
                <Badge key={s} variant="outline">
                  {s}
                </Badge>
              ))}
            </div>
            <table className="w-full text-sm">
              <caption className="pb-1 text-left text-2xs font-medium tracking-wider text-fg-muted uppercase">Techniques (MITRE ATT&CK)</caption>
              <thead>
                <tr className="text-left text-2xs text-fg-muted">
                  <th className="py-1 font-medium">ID</th>
                  <th className="py-1 font-medium">Technique</th>
                  <th className="py-1 text-right font-medium">In our data</th>
                </tr>
              </thead>
              <tbody>
                {a.ttps.map((t) => (
                  <tr key={t.id} className="border-t border-subtle">
                    <td className="py-1.5 font-mono text-xs">{t.id}</td>
                    <td className="py-1.5">
                      <span className="flex flex-col">
                        <span className="text-xs">{t.name}</span>
                        <span className="text-2xs text-fg-muted">{t.tactic}</span>
                      </span>
                    </td>
                    <td className="py-1.5 text-right">
                      {t.seen ? <StatusBadge tone="danger">Seen</StatusBadge> : <span className="text-xs text-fg-muted">Not seen</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex flex-wrap gap-2 border-t border-line pt-2.5">
              <Button size="sm">Hunt in SIEM</Button>
              <Button size="sm" variant="ghost">
                Export indicators
              </Button>
            </div>
          </div>
        </Panel>
      </div>
      <Panel title="Techniques by tactic" description="Count of ATT&CK techniques each actor uses, per tactic">
        <Heatmap
          label="ATT&CK techniques per tactic for each tracked actor"
          rows={ACTORS.map((x) => x.name)}
          columns={TACTICS}
          values={ACTORS.map((x) => TACTICS.map((t) => x.ttps.filter((p) => p.tactic === t).length))}
          unit="techniques"
          cellHeight={22}
        />
      </Panel>
    </>
  );
}

function SightingsPage() {
  const [ioc, setIoc] = useState("203.0.113.24");
  const [products, setProducts] = useState<string[]>([]);
  const all = SIGHTINGS[ioc] ?? [];
  const rows = all.filter((s) => products.length === 0 || products.includes(s.product));
  const ind = INDICATORS.find((i) => i.value === ioc);
  const byProduct = Array.from(new Set(all.map((s) => s.product))).map((p) => ({ id: p, label: p, value: all.filter((s) => s.product === p).length }));
  const cols: Column<Sighting>[] = [
    { id: "time", header: "Time", mono: true, width: "120px", sortValue: (s) => s.time, cell: (s) => s.time },
    { id: "product", header: "Product", sortValue: (s) => s.product, cell: (s) => <Badge variant="outline">{s.product}</Badge> },
    { id: "asset", header: "Asset", cell: (s) => <EntityChip kind={s.assetKind} value={s.asset} /> },
    { id: "context", header: "What happened", cell: (s) => <span className="text-xs">{s.context}</span> },
    {
      id: "action",
      header: "Outcome",
      description: "What the product did when it saw the indicator.",
      sortValue: (s) => s.action,
      cell: (s) => <StatusBadge tone={ACTION_TONE[s.action]}>{s.action}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader title="Sightings" description="Every place an indicator was seen across OpenAsy products, in one timeline." />
      <FilterBar onClear={products.length ? () => setProducts([]) : undefined}>
        <SelectField
          label="Indicator"
          value={ioc}
          onChange={(e) => (setIoc(e.target.value), setProducts([]))}
          options={Object.keys(SIGHTINGS).map((v) => ({ value: v, label: v }))}
        />
        <FacetFilter label="Product" selected={products} onChange={setProducts} options={byProduct.map((p) => ({ value: p.id, count: p.value }))} />
      </FilterBar>
      <div className="grid gap-2.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <Panel
          title={<span className="font-mono">{ioc}</span>}
          description={ind ? `${ind.source} · ${ind.tags.map((t) => `#${t}`).join(" ")}` : "Analyst indicator"}
          aria-label="Indicator summary"
        >
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-2xs text-fg-muted">Sightings</dt>
              <dd className="font-mono font-semibold">{all.length}</dd>
            </div>
            <div>
              <dt className="text-2xs text-fg-muted">Products</dt>
              <dd className="font-mono font-semibold">{byProduct.length}</dd>
            </div>
            <div>
              <dt className="text-2xs text-fg-muted">Confidence</dt>
              <dd className="font-mono font-semibold">{ind?.confidence ?? 80}</dd>
            </div>
            <div>
              <dt className="text-2xs text-fg-muted">TLP</dt>
              <dd>
                <TlpBadge tlp={ind?.tlp ?? "AMBER"} />
              </dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Sightings by product">
          <BarList label={`Sightings of ${ioc} by product`} items={byProduct} />
        </Panel>
        <Panel title="First and last seen">
          <ol className="flex flex-col gap-1.5 text-sm" aria-label="Sighting range">
            <li className="flex justify-between gap-2">
              <span className="text-fg-muted">First</span>
              <span className="font-mono text-xs">{all[all.length - 1]?.time}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-fg-muted">Last</span>
              <span className="font-mono text-xs">{all[0]?.time}</span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-fg-muted">Blocked</span>
              <span className="font-mono text-xs">{all.filter((s) => s.action === "Blocked").length}</span>
            </li>
          </ol>
        </Panel>
      </div>
      <Panel title="Timeline" description={`${rows.length} sightings`} actions={<Button size="sm">Open incident</Button>} flush>
        <DataTable label="Sightings" columns={cols} rows={rows} getRowId={(s) => s.id} defaultSort={{ id: "time", direction: "desc" }} minWidth={860} />
      </Panel>
    </>
  );
}

const PAGES = {
  indicators: () => <IndicatorsPage />,
  feeds: () => <FeedsPage />,
  matches: () => <MatchesPage />,
  actors: () => <ActorsPage />,
  sightings: () => <SightingsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="threat-intel" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories                                                             */
/* ------------------------------------------------------------------ */

export const Indicators: Story = {
  ...app("indicators"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add indicator" }));
    const form = within(c.getByRole("form", { name: "Add indicator" }));
    await userEvent.type(form.getByLabelText("Value"), "bad-cdn.example.com");
    await userEvent.selectOptions(form.getByLabelText("Type"), "domain");
    await userEvent.click(form.getByRole("button", { name: "Save indicator" }));
    await expect(within(c.getByRole("table", { name: "Indicators" })).getByText("bad-cdn.example.com")).toBeInTheDocument();
    await userEvent.click(c.getByRole("checkbox", { name: "Select row i-48143" }));
    await userEvent.click(within(c.getByRole("toolbar", { name: "Bulk actions" })).getByRole("button", { name: "Expire now" }));
    await expect(c.getByText("Expired 1 indicator")).toBeInTheDocument();
  },
};

export const Feeds: Story = {
  ...app("feeds"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Configure Partner ISAC" }));
    const detail = within(c.getByRole("region", { name: "Feed configuration" }));
    await expect(detail.getByText(/API key expired/)).toBeInTheDocument();
    await userEvent.click(detail.getByRole("button", { name: "Sync now" }));
    await expect(detail.getByRole("status")).toHaveTextContent("Partner ISAC synced");
  },
};

/** Matches: indicators from every feed that showed up in another product's traffic. */
export const Matches: Story = {
  ...app("matches"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Matches" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Matches" });
    await expect(within(table).getAllByRole("row")).toHaveLength(matches.length + 1);
    await userEvent.click(c.getByRole("radio", { name: "Domain" }));
    await expect(c.getByRole("radio", { name: "Domain" })).toHaveAttribute("aria-checked", "true");
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await expect(within(table).getByText("update-check.example.com")).toBeInTheDocument();
    await expect(within(table).queryByText("203.0.113.24")).not.toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "Hash" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await expect(within(table).getByText("AsyncRAT")).toBeInTheDocument();
    await expect(c.getByRole("list", { name: "Threat intel feeds" })).toHaveTextContent("CISA KEV");
  },
};

export const Actors: Story = {
  ...app("actors"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Actors" })).getByText("FIN7"));
    const profile = within(c.getByRole("region", { name: "Actor profile" }));
    await expect(profile.getByRole("heading", { name: "FIN7" })).toBeInTheDocument();
    await expect(profile.getByText("T1566.001")).toBeInTheDocument();
  },
};

export const Sightings: Story = {
  ...app("sightings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Sightings" });
    await expect(within(table).getAllByRole("row")).toHaveLength(7);
    await userEvent.selectOptions(c.getByLabelText("Indicator"), "update-check.example.com");
    await expect(within(table).getAllByRole("row")).toHaveLength(4);
    await expect(within(table).getByText(/DNS TXT queries/)).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: "Data & GDPR" }));
    await expect(c.getByText(/Data subject access and erasure/)).toBeInTheDocument();
  },
};
