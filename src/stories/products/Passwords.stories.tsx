import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Copy, CreditCard, Eye, EyeOff, FileText, FolderLock, HeartPulse, History, KeyRound, Lock, Plus, ShieldCheck, UserMinus, Users } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "vaults", label: "Vaults", icon: FolderLock },
  { id: "health", label: "Health", icon: HeartPulse, count: 10 },
  { id: "leavers", label: "Leavers", icon: UserMinus, count: 1 },
  { id: "activity", label: "Activity", icon: History },
];

const meta = {
  title: "Products/Passwords",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = PEOPLE[1];
const LEAVER = PEOPLE[2];

interface Vault {
  id: string;
  name: string;
  /** The Identity group whose members see it; none for a person's own vault. */
  group?: string;
  items: number;
  people: number;
  canEdit: boolean;
}

const VAULTS: Vault[] = [
  { id: "personal", name: "My vault", items: 48, people: 1, canEdit: true },
  { id: "finance", name: "Finance", group: "finance", items: 23, people: 4, canEdit: true },
  { id: "it", name: "IT", group: "it-admins", items: 61, people: 3, canEdit: false },
  { id: "sales", name: "Sales", group: "sales", items: 15, people: 6, canEdit: true },
  { id: "marketing", name: "Marketing", group: "marketing", items: 18, people: 5, canEdit: false },
  { id: "office", name: "Office", group: "everyone", items: 9, people: 38, canEdit: false },
];

type Kind = "login" | "card" | "note";
type Strength = "strong" | "fair" | "weak";

interface Item {
  id: string;
  name: string;
  kind: Kind;
  vault: string;
  username: string;
  url?: string;
  changed: string;
  changedBy: string;
  strength: Strength;
  reused?: number;
  leaked?: boolean;
  totp?: boolean;
  opened: string;
  secret: string;
  history: number;
  note?: string;
}

const ITEMS: Item[] = [
  {
    id: "bank",
    name: "Corporate banking",
    kind: "login",
    vault: "finance",
    username: "acme-treasury",
    url: "https://business.bank.example",
    changed: "14 Mar 2026",
    changedBy: PEOPLE[3],
    strength: "strong",
    totp: true,
    opened: `${PEOPLE[3]}, today 09:12`,
    secret: "hT9#vQ2m!xR4-Lp7w",
    history: 3,
    note: "Payments above 50,000 TRY need a second approval in the bank's app.",
  },
  {
    id: "tax",
    name: "Tax office portal",
    kind: "login",
    vault: "finance",
    username: "1234567890",
    url: "https://ivd.tax.example",
    changed: "2 Feb 2026",
    changedBy: PEOPLE[3],
    strength: "fair",
    opened: `${ME}, yesterday 16:40`,
    secret: "Acme2026!tax",
    history: 5,
  },
  {
    id: "payroll",
    name: "Payroll provider",
    kind: "login",
    vault: "finance",
    username: "finance@example.com",
    url: "https://app.payroll.example",
    changed: "9 Sep 2025",
    changedBy: PEOPLE[5],
    strength: "weak",
    reused: 3,
    opened: `${PEOPLE[5]}, 28 Oct`,
    secret: "Summer2025",
    history: 1,
  },
  {
    id: "stripe",
    name: "Stripe dashboard",
    kind: "login",
    vault: "finance",
    username: "finance@example.com",
    url: "https://dashboard.stripe.com",
    changed: "20 Oct 2026",
    changedBy: ME,
    strength: "strong",
    totp: true,
    opened: `${ME}, today 08:55`,
    secret: "q8$Fz!2nWc@e7Uy",
    history: 2,
  },
  {
    id: "card",
    name: "Company card, travel",
    kind: "card",
    vault: "finance",
    username: "•••• 4421",
    changed: "1 Jul 2026",
    changedBy: PEOPLE[3],
    strength: "strong",
    opened: `${PEOPLE[6]}, 30 Oct`,
    secret: "4111 1111 1111 4421",
    history: 0,
  },
  {
    id: "insurance",
    name: "Insurance broker",
    kind: "login",
    vault: "finance",
    username: "acme.corp",
    url: "https://portal.broker.example",
    changed: "12 Jan 2024",
    changedBy: PEOPLE[2],
    strength: "fair",
    leaked: true,
    opened: `${PEOPLE[2]}, 3 Oct`,
    secret: "Broker!2024",
    history: 0,
  },
  {
    id: "accountant",
    name: "Accountant's file share",
    kind: "login",
    vault: "finance",
    username: "acme",
    url: "https://files.demir-mm.example",
    changed: "5 May 2026",
    changedBy: PEOPLE[3],
    strength: "strong",
    opened: `${PEOPLE[3]}, 27 Oct`,
    secret: "Lw!93kd@Pq7#Rz",
    history: 1,
  },
  {
    id: "vat",
    name: "VAT numbers and addresses",
    kind: "note",
    vault: "finance",
    username: "Note",
    changed: "18 Aug 2026",
    changedBy: ME,
    strength: "strong",
    opened: `${PEOPLE[6]}, 22 Oct`,
    secret: "",
    history: 0,
  },
];

const KIND_ICON = { login: KeyRound, card: CreditCard, note: FileText } as const;
const STRENGTH: Record<Strength, { label: string; tone: Tone }> = {
  strong: { label: "Strong", tone: "success" },
  fair: { label: "Fair", tone: "warning" },
  weak: { label: "Weak", tone: "danger" },
};

interface Member {
  name: string;
  role: "Can manage" | "Can edit" | "Can view";
  from: string;
}

const MEMBERS: Member[] = [
  { name: PEOPLE[3], role: "Can manage", from: "Group finance-leads" },
  { name: ME, role: "Can edit", from: "Group finance" },
  { name: PEOPLE[5], role: "Can edit", from: "Group finance" },
  { name: PEOPLE[6], role: "Can view", from: "Group finance" },
];

interface Event {
  id: string;
  when: string;
  who: string;
  what: "opened" | "copied" | "changed" | "added" | "moved" | "removed";
  item: string;
  vault: string;
  from: string;
}

const EVENTS: Event[] = [
  { id: "e1", when: "Today 09:12", who: PEOPLE[3], what: "copied", item: "Corporate banking", vault: "Finance", from: "Firefox extension, Istanbul" },
  { id: "e2", when: "Today 08:55", who: ME, what: "opened", item: "Stripe dashboard", vault: "Finance", from: "Web vault, Istanbul" },
  { id: "e3", when: "Today 08:31", who: PEOPLE[4], what: "changed", item: "Core switch admin", vault: "IT", from: "Desktop app, Istanbul" },
  { id: "e4", when: "Yesterday 18:02", who: LEAVER, what: "copied", item: "Office Wi-Fi", vault: "Office", from: "iPhone app, Ankara" },
  { id: "e5", when: "Yesterday 16:40", who: ME, what: "opened", item: "Tax office portal", vault: "Finance", from: "Web vault, Istanbul" },
  { id: "e6", when: "Yesterday 11:15", who: PEOPLE[6], what: "added", item: "LinkedIn company page", vault: "Marketing", from: "Chrome extension, Istanbul" },
  { id: "e7", when: "29 Oct 14:20", who: PEOPLE[0], what: "moved", item: "Firewall API key", vault: "IT", from: "Web vault, Istanbul" },
  { id: "e8", when: "28 Oct 10:05", who: PEOPLE[5], what: "opened", item: "Payroll provider", vault: "Finance", from: "Web vault, Istanbul" },
  { id: "e9", when: "27 Oct 17:48", who: LEAVER, what: "opened", item: "CRM admin", vault: "Sales", from: "Chrome extension, Ankara" },
  { id: "e10", when: "27 Oct 09:30", who: PEOPLE[7], what: "removed", item: "Old ad account", vault: "Marketing", from: "Web vault, Istanbul" },
];

/* ---------------------------------------------------------------- vaults */

function ItemDetail({ item }: { item: Item }) {
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const Icon = KIND_ICON[item.kind];
  const field = (label: string, value: string, opts: { secret?: boolean; mono?: boolean } = {}) => (
    <div className="flex flex-col gap-0.5">
      <span className="text-2xs text-fg-muted">{label}</span>
      <span className="flex items-center gap-1 rounded-md bg-canvas px-2 py-1">
        <span className={cn("min-w-0 grow truncate text-sm text-fg", (opts.mono || opts.secret) && "font-mono")}>
          {opts.secret && !shown ? "•".repeat(14) : value}
        </span>
        {opts.secret && (
          <IconButton label={shown ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} size="xs" onClick={() => setShown((s) => !s)}>
            {shown ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </IconButton>
        )}
        <IconButton label={`Copy ${label.toLowerCase()}`} size="xs" onClick={() => setCopied(label)}>
          <Copy className="size-3.5" />
        </IconButton>
      </span>
    </div>
  );
  return (
    <Panel aria-label="Item">
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
            <Icon aria-hidden className="size-4" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-base font-semibold text-fg">{item.name}</span>
            {item.url && <span className="truncate text-xs text-fg-muted">{item.url.replace("https://", "")}</span>}
          </span>
        </div>
        {item.kind === "note" ? (
          <p className="rounded-md bg-canvas px-2.5 py-2 text-sm text-fg">
            Acme Corp, tax number 1234567890, Kadıköy tax office. Invoice address: Moda Cad. 12, 34710 Istanbul.
          </p>
        ) : (
          <>
            {field(item.kind === "card" ? "Card holder" : "User name", item.kind === "card" ? "Acme Corp" : item.username, { mono: item.kind !== "card" })}
            {field(item.kind === "card" ? "Number" : "Password", item.secret, { secret: true })}
            {item.totp && (
              <div className="flex flex-col gap-0.5">
                <span className="text-2xs text-fg-muted">Two-step code</span>
                <span className="flex items-center gap-2 rounded-md bg-canvas px-2 py-1">
                  <span className="grow font-mono text-sm tracking-widest text-fg">482 913</span>
                  <span className="text-2xs text-fg-muted tabular-nums">18 s</span>
                  <IconButton label="Copy two-step code" size="xs" onClick={() => setCopied("Two-step code")}>
                    <Copy className="size-3.5" />
                  </IconButton>
                </span>
              </div>
            )}
          </>
        )}
        {copied && (
          <p role="status" className="text-xs text-success">
            {copied} copied. The clipboard is cleared in 30 seconds.
          </p>
        )}
        {item.note && <p className="text-xs text-fg-muted">{item.note}</p>}
        <dl className="grid grid-cols-[84px_minmax(0,1fr)] gap-x-2 gap-y-1 border-t border-line pt-2.5 text-xs">
          <dt className="text-fg-muted">Changed</dt>
          <dd className="text-fg">
            {item.changed} by {item.changedBy}
          </dd>
          <dt className="text-fg-muted">Last opened</dt>
          <dd className="text-fg">{item.opened}</dd>
          <dt className="text-fg-muted">History</dt>
          <dd className="text-fg">{item.history ? `${item.history} earlier ${item.kind === "card" ? "numbers" : "passwords"}` : "None"}</dd>
        </dl>
        <div className="flex gap-1.5">
          <Button size="sm">Edit</Button>
          <Button size="sm" variant="ghost">
            Move to vault
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/** A person's vaults: their own and the shared ones their groups give them, one vault open with its items. */
function VaultsPage() {
  const [vault, setVault] = useState("finance");
  const [tab, setTab] = useState<"items" | "members" | "activity">("items");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("bank");
  const v = VAULTS.find((x) => x.id === vault) ?? VAULTS[0]!;
  const rows = ITEMS.filter((i) => i.vault === "finance" && `${i.name} ${i.username} ${i.url ?? ""}`.toLowerCase().includes(query.toLowerCase()));
  const cur = ITEMS.find((i) => i.id === active);
  const cols: Column<Item>[] = [
    {
      id: "name",
      header: "Name",
      width: "38%",
      sortValue: (i) => i.name,
      cell: (i) => {
        const Icon = KIND_ICON[i.kind];
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{i.name}</span>
              <span className="truncate text-2xs text-fg-muted">{i.kind === "note" ? "Secure note" : i.username}</span>
            </span>
          </span>
        );
      },
    },
    {
      id: "health",
      header: "Health",
      sortValue: (i) => (i.leaked ? 0 : i.strength === "weak" ? 1 : i.reused ? 2 : i.strength === "fair" ? 3 : 4),
      cell: (i) =>
        i.kind === "note" ? (
          <span className="text-xs text-fg-muted">–</span>
        ) : (
          <span className="flex flex-wrap gap-1">
            {i.leaked ? <Badge tone="danger">Leaked</Badge> : <Badge tone={STRENGTH[i.strength].tone}>{STRENGTH[i.strength].label}</Badge>}
            {i.reused && <Badge tone="warning">Reused {i.reused}×</Badge>}
          </span>
        ),
    },
    { id: "changed", header: "Changed", cell: (i) => <span className="text-xs whitespace-nowrap">{i.changed}</span> },
    {
      id: "totp",
      header: "Two-step",
      align: "center",
      cell: (i) => (i.totp ? <ShieldCheck aria-label="Has a two-step code" className="mx-auto size-3.5 text-success" /> : null),
    },
  ];
  return (
    <>
      <PageHeader
        title="Vaults"
        description="Decrypted in this browser. The server keeps only what it cannot read."
        actions={
          <>
            <Button>Import</Button>
            <Button variant="primary" icon={<Plus />}>
              New item
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[200px_minmax(0,1fr)_320px]">
        <Panel flush aria-label="Your vaults">
          <ul className="flex flex-col py-1">
            {VAULTS.map((x) => (
              <li key={x.id}>
                <button
                  type="button"
                  onClick={() => setVault(x.id)}
                  aria-current={x.id === vault ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-1.5 text-left",
                    x.id === vault ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas",
                  )}
                >
                  {x.group ? <Users aria-hidden className="size-3.5 shrink-0" /> : <Lock aria-hidden className="size-3.5 shrink-0" />}
                  <span className="min-w-0 grow truncate text-sm font-medium">{x.name}</span>
                  <span className="text-2xs text-fg-muted tabular-nums">{x.items}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-3 py-2 text-2xs text-fg-muted">Shared vaults come from your groups in Identity.</p>
        </Panel>

        <Panel flush aria-label={`${v.name} vault`}>
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5">
            <span className="flex min-w-0 flex-col">
              <span className="text-base font-semibold text-fg">{v.name}</span>
              <span className="text-xs text-fg-muted">
                {v.group ? `Group ${v.group} in Identity · ${v.people} people` : "Only you"} · {v.canEdit ? "you can edit" : "you can view"}
              </span>
            </span>
            <SearchInput
              label="Search the vault"
              placeholder="Name, user name or address"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-60"
            />
          </div>
          <div className="px-3">
            <Tabs
              label="Vault"
              value={tab}
              onChange={setTab}
              items={[
                { value: "items", label: "Items", count: ITEMS.filter((i) => i.vault === "finance").length },
                { value: "members", label: "Members", count: MEMBERS.length },
                { value: "activity", label: "Activity" },
              ]}
              className="border-b-0"
            />
          </div>
          <div className="border-t border-line">
            {tab === "items" && (
              <DataTable
                label="Items"
                columns={cols}
                rows={rows}
                getRowId={(i) => i.id}
                onRowClick={(i) => setActive(i.id)}
                activeRowId={active}
                defaultSort={{ id: "name", direction: "asc" }}
                minWidth={560}
              />
            )}
            {tab === "members" && (
              <ul aria-label="Members" className="flex flex-col">
                {MEMBERS.map((m) => (
                  <li key={m.name} className="flex items-center justify-between gap-2 border-b border-subtle px-3 py-2 last:border-0">
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar name={m.name} size="sm" />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium text-fg">{m.name === ME ? `${m.name} (you)` : m.name}</span>
                        <span className="truncate text-2xs text-fg-muted">{m.from}</span>
                      </span>
                    </span>
                    <Badge tone={m.role === "Can manage" ? "info" : "neutral"}>{m.role}</Badge>
                  </li>
                ))}
                <li className="px-3 py-2 text-xs text-fg-muted">
                  Members change in <span className="font-mono">vaults.yaml</span> or in Identity&apos;s groups, never here.
                </li>
              </ul>
            )}
            {tab === "activity" && (
              <ul aria-label="Vault activity" className="flex flex-col">
                {EVENTS.filter((e) => e.vault === "Finance").map((e) => (
                  <li key={e.id} className="flex items-center gap-2 border-b border-subtle px-3 py-2 text-sm last:border-0">
                    <Avatar name={e.who} size="sm" />
                    <span className="min-w-0 grow truncate">
                      {e.who} {e.what} <span className="font-medium">{e.item}</span>
                    </span>
                    <span className="shrink-0 text-xs text-fg-muted">{e.when}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Panel>

        {cur && <ItemDetail key={cur.id} item={cur} />}
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- health */

interface Finding {
  id: string;
  item: string;
  vault: string;
  issue: "leaked" | "reused" | "weak" | "old" | "no-2fa";
  detail: string;
  owner: string;
}

const ISSUE: Record<Finding["issue"], { label: string; tone: Tone }> = {
  leaked: { label: "Leaked", tone: "danger" },
  weak: { label: "Weak", tone: "danger" },
  reused: { label: "Reused", tone: "warning" },
  old: { label: "Not changed in 2 years", tone: "warning" },
  "no-2fa": { label: "Two-step available, not set", tone: "info" },
};

const FINDINGS: Finding[] = [
  { id: "f1", item: "Insurance broker", vault: "Finance", issue: "leaked", detail: "Found in 3 known breaches", owner: PEOPLE[3] },
  { id: "f2", item: "Old ad account", vault: "Marketing", issue: "leaked", detail: "Found in 1 known breach", owner: PEOPLE[7] },
  { id: "f3", item: "Printer admin, 2nd floor", vault: "Office", issue: "leaked", detail: "A default password, in every list", owner: PEOPLE[4] },
  { id: "f4", item: "Payroll provider", vault: "Finance", issue: "weak", detail: "10 characters, a word and a year", owner: PEOPLE[3] },
  { id: "f5", item: "Payroll provider", vault: "Finance", issue: "reused", detail: "Same as 2 other items", owner: PEOPLE[3] },
  { id: "f6", item: "Webinar platform", vault: "Marketing", issue: "reused", detail: "Same as Payroll provider", owner: PEOPLE[7] },
  { id: "f7", item: "Core switch admin", vault: "IT", issue: "old", detail: "Changed 14 Feb 2024", owner: PEOPLE[4] },
  { id: "f8", item: "Domain registrar", vault: "IT", issue: "no-2fa", detail: "The registrar offers two-step codes", owner: PEOPLE[0] },
  { id: "f9", item: "CRM admin", vault: "Sales", issue: "no-2fa", detail: "The CRM offers two-step codes", owner: PEOPLE[3] },
  { id: "f10", item: "Office Wi-Fi", vault: "Office", issue: "weak", detail: "8 characters, shared with 38 people", owner: PEOPLE[4] },
];

const TEAMS = [
  { vault: "Finance", score: 78, items: 23 },
  { vault: "IT", score: 86, items: 61 },
  { vault: "Sales", score: 71, items: 15 },
  { vault: "Marketing", score: 64, items: 18 },
  { vault: "Office", score: 52, items: 9 },
];

/** Leaked, weak, reused and old passwords in the shared vaults, by team; personal vaults are checked on the person's device only. */
function HealthPage() {
  const [issue, setIssue] = useState<"all" | Finding["issue"]>("all");
  const rows = FINDINGS.filter((f) => issue === "all" || f.issue === issue);
  const count = (i: Finding["issue"]) => FINDINGS.filter((f) => f.issue === i).length;
  const cols: Column<Finding>[] = [
    { id: "item", header: "Item", width: "26%", sortValue: (f) => f.item, cell: (f) => <span className="truncate font-medium">{f.item}</span> },
    { id: "vault", header: "Vault", sortValue: (f) => f.vault, cell: (f) => <span className="text-xs">{f.vault}</span> },
    {
      id: "issue",
      header: "Problem",
      sortValue: (f) => Object.keys(ISSUE).indexOf(f.issue),
      cell: (f) => <StatusBadge tone={ISSUE[f.issue].tone}>{ISSUE[f.issue].label}</StatusBadge>,
    },
    { id: "detail", header: "Why", width: "28%", cell: (f) => <span className="block truncate text-xs text-fg-muted">{f.detail}</span> },
    {
      id: "owner",
      header: "Vault manager",
      cell: (f) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={f.owner} size="sm" />
          <span className="truncate text-xs">{f.owner}</span>
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Health"
        description="Shared vaults, checked in your browser. Leaks are looked up by the first five characters of a hash, so no password leaves the install."
      />
      <KpiGrid minWidth={170}>
        <KpiCard label="Leaked" value={String(count("leaked"))} tone="danger" delta={{ label: "1 new this week", intent: "bad" }} />
        <KpiCard label="Weak" value={String(count("weak"))} delta={{ label: "−3 since October", direction: "down", intent: "good" }} />
        <KpiCard label="Reused" value={String(count("reused"))} delta={{ label: "across 3 vaults", intent: "neutral" }} />
        <KpiCard label="Without two-step" value={String(count("no-2fa"))} unit="where offered" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Panel flush>
          <div className="px-3 pt-2">
            <Tabs
              label="Problem"
              value={issue}
              onChange={setIssue}
              items={[
                { value: "all", label: "All", count: FINDINGS.length },
                { value: "leaked", label: "Leaked", count: count("leaked") },
                { value: "weak", label: "Weak", count: count("weak") },
                { value: "reused", label: "Reused", count: count("reused") },
                { value: "old", label: "Old", count: count("old") },
                { value: "no-2fa", label: "No two-step", count: count("no-2fa") },
              ]}
              className="border-b-0"
            />
          </div>
          <div className="border-t border-line">
            <DataTable label="Problems" columns={cols} rows={rows} getRowId={(f) => f.id} defaultSort={{ id: "issue", direction: "asc" }} minWidth={720} />
          </div>
        </Panel>
        <Panel title="By team" description="Share of items with no problem" className="self-start">
          <ul aria-label="Health by team" className="flex flex-col gap-2.5">
            {TEAMS.map((t) => (
              <li key={t.vault} className="flex flex-col gap-1">
                <span className="flex items-baseline justify-between text-sm">
                  <span className="font-medium text-fg">{t.vault}</span>
                  <span className="font-mono text-xs text-fg-muted tabular-nums">
                    {t.score}% of {t.items}
                  </span>
                </span>
                <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-subtle">
                  <span
                    className={cn("block h-full rounded-full", t.score >= 80 ? "bg-success" : t.score >= 65 ? "bg-warning" : "bg-danger")}
                    style={{ width: `${t.score}%` }}
                  />
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* --------------------------------------------------------------- leavers */

interface Exposure {
  id: string;
  item: string;
  vault: string;
  opened: string;
  /** Opened in the last 90 days, so it is changed first. */
  recent: boolean;
  changed: boolean;
}

const EXPOSED: Exposure[] = [
  { id: "x1", item: "CRM admin", vault: "Sales", opened: "27 Oct", recent: true, changed: false },
  { id: "x2", item: "Office Wi-Fi", vault: "Office", opened: "Yesterday", recent: true, changed: false },
  { id: "x3", item: "Insurance broker", vault: "Finance", opened: "3 Oct", recent: true, changed: false },
  { id: "x4", item: "LinkedIn company page", vault: "Sales", opened: "12 Sep", recent: true, changed: true },
  { id: "x5", item: "Alarm code, front door", vault: "Office", opened: "2 Sep", recent: true, changed: false },
  { id: "x6", item: "Trade fair portal", vault: "Sales", opened: "Never", recent: false, changed: true },
  { id: "x7", item: "Quote tool", vault: "Sales", opened: "14 Jun", recent: false, changed: true },
  { id: "x8", item: "Printer admin, 2nd floor", vault: "Office", opened: "Never", recent: false, changed: false },
  { id: "x9", item: "Courier account", vault: "Office", opened: "5 May", recent: false, changed: true },
  { id: "x10", item: "Meeting room tablets", vault: "Office", opened: "Never", recent: false, changed: false },
  { id: "x11", item: "Payroll provider", vault: "Finance", opened: "11 Mar", recent: false, changed: false },
  { id: "x12", item: "Tax office portal", vault: "Finance", opened: "Never", recent: false, changed: false },
];

const PAST = [
  { name: "Jonas Berg", left: "14 Oct", items: 9, done: 9 },
  { name: "Priya Shah", left: "2 Sep", items: 17, done: 17 },
];

/** What someone who leaves could see, so it is changed before or right after they go. */
function LeaversPage() {
  const [items, setItems] = useState(EXPOSED);
  const done = items.filter((x) => x.changed).length;
  const cols: Column<Exposure>[] = [
    {
      id: "changed",
      header: "Changed",
      width: "92px",
      cell: (x) => (
        <Checkbox
          label={<span className="sr-only">Changed {x.item}</span>}
          checked={x.changed}
          onChange={() => setItems((xs) => xs.map((y) => (y.id === x.id ? { ...y, changed: !y.changed } : y)))}
        />
      ),
    },
    {
      id: "item",
      header: "Item",
      width: "34%",
      sortValue: (x) => x.item,
      cell: (x) => <span className={cn("font-medium", x.changed && "text-fg-muted line-through")}>{x.item}</span>,
    },
    { id: "vault", header: "Vault", sortValue: (x) => x.vault, cell: (x) => <span className="text-xs">{x.vault}</span> },
    {
      id: "opened",
      header: `Last opened by ${LEAVER.split(" ")[0]}`,
      sortValue: (x) => (x.recent ? 0 : 1),
      cell: (x) => (
        <span className="flex items-center gap-1.5 text-xs">
          {x.opened}
          {x.recent && !x.changed && <Badge tone="warning">Change first</Badge>}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Leavers"
        description="When HR ends a contract, Identity disables the account on the last day and the shared vaults close to that person at once."
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-2.5">
          <Callout tone="warning" title={`${LEAVER} leaves on 30 November`}>
            {LEAVER.split(" ")[0]} could see {items.length} shared passwords in Sales, Office and Finance. Change the ones opened in the last 90 days first; the
            vault managers get this list by email too.
          </Callout>
          <Panel
            title={`What ${LEAVER} could see`}
            actions={
              <Badge tone={done === items.length ? "success" : "neutral"} mono>
                {done} of {items.length} changed
              </Badge>
            }
            flush
          >
            <DataTable
              label="Passwords to change"
              columns={cols}
              rows={items}
              getRowId={(x) => x.id}
              defaultSort={{ id: "opened", direction: "asc" }}
              minWidth={620}
            />
          </Panel>
        </div>
        <Panel title="Earlier leavers" flush className="self-start">
          <ul aria-label="Earlier leavers" className="flex flex-col">
            {PAST.map((p) => (
              <li key={p.name} className="flex items-center justify-between gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <span className="flex min-w-0 items-center gap-2">
                  <Avatar name={p.name} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm font-medium text-fg">{p.name}</span>
                    <span className="text-2xs text-fg-muted">Left {p.left}</span>
                  </span>
                </span>
                <StatusBadge tone="success">
                  {p.done} of {p.items} changed
                </StatusBadge>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* -------------------------------------------------------------- activity */

const WHAT_TONE: Record<Event["what"], Tone> = { opened: "neutral", copied: "neutral", changed: "info", added: "success", moved: "info", removed: "danger" };

/** Who opened, copied or changed which shared item, from where; the same events go to Audit. */
function ActivityPage() {
  const [vault, setVault] = useState("all");
  const rows = EVENTS.filter((e) => vault === "all" || e.vault === vault);
  const cols: Column<Event>[] = [
    { id: "when", header: "When", width: "130px", cell: (e) => <span className="text-xs whitespace-nowrap">{e.when}</span> },
    {
      id: "who",
      header: "Who",
      sortValue: (e) => e.who,
      cell: (e) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={e.who} size="sm" />
          <span className="truncate">{e.who}</span>
          {e.who === LEAVER && <Badge tone="warning">Leaving</Badge>}
        </span>
      ),
    },
    { id: "what", header: "Did", cell: (e) => <StatusBadge tone={WHAT_TONE[e.what]}>{e.what}</StatusBadge> },
    { id: "item", header: "Item", width: "24%", cell: (e) => <span className="truncate font-medium">{e.item}</span> },
    { id: "vault", header: "Vault", cell: (e) => <span className="text-xs">{e.vault}</span> },
    { id: "from", header: "From", width: "22%", cell: (e) => <span className="block truncate text-xs text-fg-muted">{e.from}</span> },
  ];
  return (
    <>
      <PageHeader title="Activity" description="Shared vaults only; what people do in their own vault is theirs. Kept 1 year and sent to Audit." />
      <Panel flush>
        <div className="px-3 pt-2">
          <Tabs
            label="Vault"
            value={vault}
            onChange={setVault}
            items={[
              { value: "all", label: "All vaults", count: EVENTS.length },
              ...["Finance", "IT", "Sales", "Marketing", "Office"].map((v) => ({ value: v, label: v, count: EVENTS.filter((e) => e.vault === v).length })),
            ]}
            className="border-b-0"
          />
        </div>
        <div className="border-t border-line">
          <DataTable label="Activity" columns={cols} rows={rows} getRowId={(e) => e.id} minWidth={860} />
        </div>
      </Panel>
    </>
  );
}

const PAGES = {
  vaults: () => <VaultsPage />,
  health: () => <HealthPage />,
  leavers: () => <LeaversPage />,
  activity: () => <ActivityPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="passwords" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Vaults: Story = {
  ...app("vaults"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const item = c.getByRole("region", { name: "Item" });
    await expect(item).toHaveTextContent("Corporate banking");
    // The password stays hidden until asked for, and copying says when the clipboard is cleared.
    await expect(item).not.toHaveTextContent("hT9#vQ2m!xR4-Lp7w");
    await userEvent.click(within(item).getByRole("button", { name: "Show password" }));
    await expect(item).toHaveTextContent("hT9#vQ2m!xR4-Lp7w");
    await userEvent.click(within(item).getByRole("button", { name: "Hide password" }));
    await userEvent.click(within(item).getByRole("button", { name: "Copy password" }));
    await expect(within(item).getByRole("status")).toHaveTextContent("Password copied. The clipboard is cleared in 30 seconds.");

    // Search, then the members, who come from Identity groups.
    const table = c.getByRole("table", { name: "Items" });
    await userEvent.type(c.getByRole("searchbox", { name: "Search the vault" }), "payroll");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await userEvent.clear(c.getByRole("searchbox", { name: "Search the vault" }));
    await userEvent.click(c.getByRole("tab", { name: /Members/ }));
    await expect(c.getByRole("list", { name: "Members" })).toHaveTextContent("Group finance-leads");
    await userEvent.click(c.getByRole("tab", { name: /Items/ }));
    await userEvent.click(within(c.getByRole("table", { name: "Items" })).getByText("Corporate banking"));
    blur(canvasElement);
  },
};

export const Health: Story = {
  ...app("health"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Problems" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Leaked");
    await userEvent.click(c.getByRole("tab", { name: /Reused/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await userEvent.click(c.getByRole("tab", { name: /All/ }));
    blur(canvasElement);
  },
};

export const Leavers: Story = {
  ...app("leavers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("4 of 12 changed")).toBeInTheDocument();
    // What was opened lately comes first.
    await expect(within(c.getByRole("table", { name: "Passwords to change" })).getAllByRole("row")[1]).toHaveTextContent("Change first");
    await userEvent.click(c.getByRole("checkbox", { name: "Changed CRM admin" }));
    await expect(c.getByText("5 of 12 changed")).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Activity: Story = {
  ...app("activity"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Activity" });
    await userEvent.click(c.getByRole("tab", { name: /Office/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Leaving");
    await userEvent.click(c.getByRole("tab", { name: /All vaults/ }));
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
