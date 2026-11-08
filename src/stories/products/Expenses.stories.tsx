import { useState, type ReactNode } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowLeft, Banknote, Camera, Car, ChartPie, CheckCheck, CreditCard, FileDown, Inbox, Plane, Receipt, Send, Undo2, Upload, Wallet } from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { BarList } from "../../charts/BarList";
import { DonutChart } from "../../charts/DonutChart";
import type { Tone } from "../../tokens/levels";
import { cn } from "../../lib/cn";

// Expenses takes receipts photographed on the phone, reads their amount, date and seller, and puts them in claims with a
// category and a project. The policy in expenses.yaml sets limits by category (flag, block or cap), mileage and daily
// allowance rates, and who approves by the claim's total and department. Receipts in other currencies are turned into
// TL at TCMB's rate. Approved claims are paid back in batches, with pay through Payroll or by bank transfer, and the
// accountant gets every item as CSV and the receipts as a ZIP.

const nav = [
  { id: "mine", label: "My claims", icon: Receipt },
  { id: "approve", label: "To approve", icon: Inbox, count: 2 },
  { id: "all", label: "All claims", icon: CheckCheck },
  { id: "cards", label: "Company cards", icon: CreditCard, count: 3 },
  { id: "payback", label: "Pay back", icon: Wallet },
  { id: "spend", label: "Spend", icon: ChartPie },
  { id: "exports", label: "Exports", icon: FileDown },
];

const meta = {
  title: "Products/Expenses",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
const money = (n: number, cur = "TRY") => `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur === "TRY" ? "TL" : cur}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

type CategoryId = "travel" | "taxi" | "meals" | "hotel" | "client-gifts" | "software" | "mileage" | "per-diem";

const CATEGORIES: Record<CategoryId, { name: string; account: string; kdv: number; limit?: string; over?: "flag" | "block" | "cap"; project?: "required" }> = {
  travel: { name: "Travel", account: "770.01", kdv: 20 },
  taxi: { name: "Taxi", account: "770.01", kdv: 20, limit: "1,500 TL an item", over: "flag" },
  meals: { name: "Meals", account: "770.02", kdv: 10, limit: "750 TL a day", over: "flag" },
  hotel: { name: "Hotel", account: "770.03", kdv: 10, limit: "5,000 TL an item", over: "cap" },
  "client-gifts": { name: "Client gifts", account: "760.05", kdv: 20, limit: "1,000 TL an item", over: "block", project: "required" },
  software: { name: "Software", account: "770.05", kdv: 20, limit: "3,000 TL a month", over: "flag" },
  mileage: { name: "Mileage", account: "770.04", kdv: 0 },
  "per-diem": { name: "Daily allowance", account: "770.06", kdv: 0 },
};

const PROJECTS = { acme: "Acme rollout", internal: "Internal" } as const;
type ProjectId = keyof typeof PROJECTS;

const PEOPLE: Record<string, { name: string; dept: string; manager: string }> = {
  "emily@example.com": { name: ME, dept: "Sales", manager: "Murat Aksoy" },
  "ali@example.com": { name: "Ali Demir", dept: "Sales", manager: ME },
  "hakan@example.com": { name: "Hakan Yıldız", dept: "Sales", manager: ME },
  "selin@example.com": { name: "Selin Aydın", dept: "Sales", manager: ME },
  "burak@example.com": { name: "Burak Şahin", dept: "Sales", manager: ME },
  "merve@example.com": { name: "Merve Çelik", dept: "Engineering", manager: "Kerem Öz" },
  "mert@example.com": { name: "Mert Kaya", dept: "Customer Support", manager: "Kerem Öz" },
};

type FlagCode = "over-limit" | "no-receipt" | "duplicate" | "late" | "receipt-differs";
interface Flag {
  code: FlagCode;
  text: string;
  finance: boolean;
}

interface Item {
  id: string;
  kind: "receipt" | "mileage" | "per_diem";
  date: string;
  category: CategoryId;
  project: ProjectId | null;
  seller: string;
  /** In its own currency. */
  amount: number;
  currency: string;
  /** TCMB's rate, for other currencies. */
  rate?: number;
  kdv: number;
  paidBy: "employee" | "company";
  receipt: "read" | "typed" | "none";
  /** Not paid back over a capped limit, in TL. */
  held?: number;
  flags: Flag[];
  note?: string;
}

const inTry = (i: Item) => round2(i.amount * (i.rate ?? 1));
const owedBack = (i: Item) => (i.paidBy === "company" ? 0 : round2(inTry(i) - (i.held ?? 0)));

type StepState = "approved" | "pending" | "waiting" | "rejected" | "returned";
interface Step {
  who: string;
  why: string;
  state: StepState;
  at?: string;
}

type ClaimState = "draft" | "submitted" | "approved" | "rejected" | "paid";
interface Claim {
  id: string;
  number: string;
  owner: string;
  title: string;
  state: ClaimState;
  sent?: string;
  items: Item[];
  steps: Step[];
  batch?: string;
}

const totalOf = (c: Claim) => round2(c.items.reduce((n, i) => n + owedBack(i), 0));
const spentOf = (c: Claim) => round2(c.items.reduce((n, i) => n + inTry(i), 0));
const ownerOf = (c: Claim) => PEOPLE[c.owner] ?? { name: c.owner, dept: "–", manager: "–" };

const CLAIMS: Claim[] = [
  {
    id: "x144",
    number: "X-2026-0144",
    owner: "emily@example.com",
    title: "Ankara, visit to Kaya Eczane",
    state: "draft",
    items: [
      {
        id: "a1",
        kind: "receipt",
        date: "4 Nov",
        category: "travel",
        project: "acme",
        seller: "Pegasus Hava Taşımacılığı",
        amount: 2480,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
      {
        id: "a2",
        kind: "receipt",
        date: "4 Nov",
        category: "hotel",
        project: "acme",
        seller: "Ankara Palas Otel",
        amount: 5600,
        currency: "TRY",
        kdv: 10,
        paidBy: "employee",
        receipt: "read",
        held: 600,
        flags: [{ code: "over-limit", text: "5,600.00 TRY is over Hotel's limit of 5,000.00 TRY an item. 600.00 TRY is not paid back.", finance: false }],
      },
      {
        id: "a3",
        kind: "per_diem",
        date: "4 Nov",
        category: "per-diem",
        project: "acme",
        seller: "Türkiye, 1.5 days",
        amount: 900,
        currency: "TRY",
        kdv: 0,
        paidBy: "employee",
        receipt: "none",
        flags: [],
        note: "4 Nov 07:00 to 5 Nov 14:00",
      },
    ],
    steps: [],
  },
  {
    id: "x142",
    number: "X-2026-0142",
    owner: "ali@example.com",
    title: "Customer visit, Avcı Lojistik",
    state: "submitted",
    sent: "6 Nov",
    items: [
      {
        id: "b1",
        kind: "receipt",
        date: "5 Nov",
        category: "taxi",
        project: "acme",
        seller: "İTÜ Taksi",
        amount: 420,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
      {
        id: "b2",
        kind: "receipt",
        date: "5 Nov",
        category: "meals",
        project: "acme",
        seller: "Hamdi Restoran",
        amount: 220,
        currency: "TRY",
        kdv: 10,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
    ],
    steps: [{ who: ME, why: "Their manager.", state: "pending" }],
  },
  {
    id: "x141",
    number: "X-2026-0141",
    owner: "selin@example.com",
    title: "Taxis, first week of November",
    state: "submitted",
    sent: "6 Nov",
    items: [
      {
        id: "c1",
        kind: "receipt",
        date: "3 Nov",
        category: "taxi",
        project: null,
        seller: "Bitaksi",
        amount: 380,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "read",
        flags: [{ code: "duplicate", text: "A receipt with the same seller, date and amount is on X-2026-0128.", finance: true }],
      },
      {
        id: "c2",
        kind: "receipt",
        date: "4 Nov",
        category: "taxi",
        project: null,
        seller: "Bitaksi",
        amount: 265,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "none",
        flags: [{ code: "no-receipt", text: "No receipt: the driver had no printer", finance: true }],
      },
    ],
    steps: [
      { who: ME, why: "Their manager.", state: "pending" },
      { who: "Finance", why: "The policy asks finance: a duplicate; no receipt.", state: "waiting" },
    ],
  },
  {
    id: "x139",
    number: "X-2026-0139",
    owner: "hakan@example.com",
    title: "Year-end gifts for customers",
    state: "submitted",
    sent: "5 Nov",
    items: [
      {
        id: "d1",
        kind: "receipt",
        date: "2 Nov",
        category: "client-gifts",
        project: "acme",
        seller: "Divan Pastaneleri",
        amount: 960,
        currency: "TRY",
        kdv: 20,
        paidBy: "company",
        receipt: "read",
        flags: [],
      },
      {
        id: "d2",
        kind: "receipt",
        date: "2 Nov",
        category: "travel",
        project: "acme",
        seller: "Turkish Airlines",
        amount: 11800,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
    ],
    steps: [
      { who: ME, why: "Their manager.", state: "approved", at: "5 Nov 16:20" },
      { who: "Finance", why: "Finance (over 10,000.00 TRY).", state: "pending" },
    ],
  },
  {
    id: "x137",
    number: "X-2026-0137",
    owner: "merve@example.com",
    title: "KubeCon Europe, Berlin",
    state: "approved",
    sent: "28 Oct",
    items: [
      {
        id: "e1",
        kind: "receipt",
        date: "21 Oct",
        category: "hotel",
        project: "internal",
        seller: "Hotel Adlon",
        amount: 96,
        currency: "EUR",
        rate: 47.9125,
        kdv: 0,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
      {
        id: "e2",
        kind: "receipt",
        date: "20 Oct",
        category: "software",
        project: "internal",
        seller: "Linux Foundation",
        amount: 899,
        currency: "EUR",
        rate: 47.8806,
        kdv: 0,
        paidBy: "company",
        receipt: "read",
        flags: [],
      },
      {
        id: "e3",
        kind: "per_diem",
        date: "20 Oct",
        category: "per-diem",
        project: "internal",
        seller: "Germany, 3.5 days",
        amount: 210,
        currency: "EUR",
        rate: 47.8806,
        kdv: 0,
        paidBy: "employee",
        receipt: "none",
        flags: [],
      },
    ],
    steps: [
      { who: "Kerem Öz", why: "Their manager.", state: "approved", at: "29 Oct 09:10" },
      { who: "cto@example.com", why: "Left out: Kerem Öz approved already.", state: "approved", at: "29 Oct 09:10" },
      { who: "Elif Koç, finance", why: "Finance (over 20,000.00 TRY).", state: "approved", at: "30 Oct 11:02" },
    ],
  },
  {
    id: "x135",
    number: "X-2026-0135",
    owner: "emily@example.com",
    title: "Client dinners, October",
    state: "approved",
    sent: "31 Oct",
    batch: "November pay",
    items: [
      {
        id: "f1",
        kind: "receipt",
        date: "14 Oct",
        category: "meals",
        project: "acme",
        seller: "Nusr-Et Etiler",
        amount: 1450,
        currency: "TRY",
        kdv: 10,
        paidBy: "employee",
        receipt: "read",
        flags: [{ code: "over-limit", text: "1,450.00 TRY on 14 Oct is over Meals's limit of 750.00 TRY a day.", finance: true }],
      },
      {
        id: "f2",
        kind: "receipt",
        date: "22 Oct",
        category: "meals",
        project: "acme",
        seller: "Kıyı Restoran",
        amount: 700,
        currency: "TRY",
        kdv: 10,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
    ],
    steps: [
      { who: "Murat Aksoy", why: "Their manager.", state: "approved", at: "31 Oct 18:02" },
      { who: "Elif Koç, finance", why: "The policy asks finance: over a limit.", state: "approved", at: "3 Nov 10:15" },
    ],
  },
  {
    id: "x131",
    number: "X-2026-0131",
    owner: "burak@example.com",
    title: "Bursa, by car",
    state: "approved",
    sent: "27 Oct",
    items: [
      {
        id: "g1",
        kind: "mileage",
        date: "23 Oct",
        category: "mileage",
        project: "acme",
        seller: "İstanbul to Bursa and back, 340 km",
        amount: 2890,
        currency: "TRY",
        kdv: 0,
        paidBy: "employee",
        receipt: "none",
        flags: [],
      },
    ],
    steps: [{ who: ME, why: "Their manager.", state: "approved", at: "27 Oct 17:44" }],
  },
  {
    id: "x128",
    number: "X-2026-0128",
    owner: "selin@example.com",
    title: "Taxis, end of October",
    state: "paid",
    sent: "30 Oct",
    batch: "Transfer 2026-11-A",
    items: [
      {
        id: "h1",
        kind: "receipt",
        date: "3 Nov",
        category: "taxi",
        project: null,
        seller: "Bitaksi",
        amount: 380,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
    ],
    steps: [{ who: ME, why: "Their manager.", state: "approved", at: "3 Nov 12:01" }],
  },
  {
    id: "x125",
    number: "X-2026-0125",
    owner: "mert@example.com",
    title: "Headset for support calls",
    state: "rejected",
    sent: "24 Oct",
    items: [
      {
        id: "k1",
        kind: "receipt",
        date: "22 Oct",
        category: "software",
        project: "internal",
        seller: "Teknosa",
        amount: 3400,
        currency: "TRY",
        kdv: 20,
        paidBy: "employee",
        receipt: "read",
        flags: [],
      },
    ],
    steps: [{ who: "Kerem Öz", why: "Their manager.", state: "rejected", at: "24 Oct 15:30" }],
  },
];

const CLAIM_STATE: Record<ClaimState, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  submitted: { label: "Waiting for approval", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  paid: { label: "Paid back", tone: "info" },
};

const KIND_ICON = { receipt: Receipt, mileage: Car, per_diem: Plane } as const;

/** Who approves, from expenses.yaml's chain for the claim's total: the manager, finance over 10,000 TL, the CFO over 50,000 TL. */
function planSteps(total: number, flags: Flag[], manager: string): Step[] {
  const steps: Step[] = [{ who: manager, why: "Their manager.", state: "waiting" }];
  if (total > 10000) steps.push({ who: "Finance", why: "Finance (over 10,000.00 TRY).", state: "waiting" });
  else if (flags.some((f) => f.finance)) steps.push({ who: "Finance", why: "The policy asks finance.", state: "waiting" });
  if (total > 50000) steps.push({ who: "cfo@example.com", why: "The file names cfo@example.com (over 50,000.00 TRY).", state: "waiting" });
  return steps;
}

/* ----------------------------------------------------------------- claim */

function ItemsTable({ items }: { items: Item[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <caption className="sr-only">Items</caption>
        <thead className="bg-canvas text-xs text-fg-muted">
          <tr>
            <th className="px-3 py-1.5 font-semibold">Item</th>
            <th className="px-3 py-1.5 font-semibold">Category</th>
            <th className="px-3 py-1.5 text-right font-semibold">Amount</th>
            <th className="px-3 py-1.5 text-right font-semibold">KDV</th>
            <th className="px-3 py-1.5 text-right font-semibold">Paid back</th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const Icon = KIND_ICON[i.kind];
            return (
              <tr key={i.id} className="border-t border-line align-top">
                <td className="px-3 py-1.5">
                  <span className="flex items-start gap-2">
                    <Icon aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fg-muted" />
                    <span className="flex min-w-0 flex-col">
                      <span>{i.seller}</span>
                      <span className="text-2xs text-fg-muted">
                        {i.date}
                        {i.project ? ` · ${PROJECTS[i.project]}` : ""}
                        {i.kind === "receipt" && (i.receipt === "none" ? " · no receipt" : i.receipt === "read" ? " · receipt read" : " · typed in")}
                        {i.paidBy === "company" ? " · company card" : ""}
                        {i.note ? ` · ${i.note}` : ""}
                      </span>
                      {i.flags.map((f) => (
                        <span key={f.code} className="mt-0.5 flex flex-wrap items-center gap-1 text-2xs">
                          <Badge tone={f.finance ? "warning" : "neutral"}>{f.code}</Badge>
                          {f.text}
                        </span>
                      ))}
                    </span>
                  </span>
                </td>
                <td className="px-3 py-1.5 text-xs">
                  {CATEGORIES[i.category].name}
                  <span className="block text-2xs text-fg-muted">{CATEGORIES[i.category].account}</span>
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">
                  {money(i.amount, i.currency)}
                  {i.rate && <span className="block text-2xs text-fg-muted">× {i.rate.toFixed(4)} TCMB</span>}
                </td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">{i.kdv ? `${i.kdv}%` : "–"}</td>
                <td className="px-3 py-1.5 text-right font-mono text-xs">{i.paidBy === "company" ? "Paid by card" : money(owedBack(i))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol aria-label="Approval steps" className="flex flex-col gap-1.5 text-xs">
      {steps.map((s, i) => (
        <li
          key={`${s.who}-${i}`}
          className={cn(
            "flex flex-col rounded-md border px-2.5 py-1.5",
            s.state === "approved" ? "border-success bg-success-soft" : s.state === "rejected" ? "border-danger bg-danger-soft" : "border-line",
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium text-fg">
              {i + 1}. {s.who}
            </span>
            <span className="text-fg-muted">
              {s.state === "pending" ? "Waiting now" : s.state === "waiting" ? "Next" : s.state}
              {s.at ? `, ${s.at}` : ""}
            </span>
          </span>
          <span className="text-2xs text-fg-muted">{s.why}</span>
        </li>
      ))}
    </ol>
  );
}

const READ = { seller: "Simit Sarayı Kızılay", amount: 186, date: "5 Nov", kdv: 10, confidence: 0.93 };

function ClaimView({
  claim,
  onBack,
  onChange,
  mode,
}: {
  claim: Claim;
  onBack: () => void;
  onChange: (c: Claim) => void;
  mode: "owner" | "approver" | "viewer";
}) {
  const [adding, setAdding] = useState<null | "receipt" | "car" | "days">(null);
  const [category, setCategory] = useState<CategoryId>("meals");
  const [km, setKm] = useState("120");
  const [country, setCountry] = useState("TR");
  const [halfDays, setHalfDays] = useState("3");
  const [returning, setReturning] = useState(false);
  const [why, setWhy] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const who = ownerOf(claim);
  const total = totalOf(claim);
  const flags = claim.items.flatMap((i) => i.flags);
  const draft = claim.state === "draft";
  const steps = draft ? planSteps(total, flags, who.manager) : claim.steps;
  const pending = claim.steps.find((s) => s.state === "pending");
  const add = (item: Item) => onChange({ ...claim, items: [...claim.items, item] });
  const rate = { TR: { amount: 600, cur: "TRY", rate: 1 }, DE: { amount: 60, cur: "EUR", rate: 48.215 }, GB: { amount: 55, cur: "GBP", rate: 55.1033 } }[
    country
  ] ?? {
    amount: 50,
    cur: "EUR",
    rate: 48.215,
  };
  const decide = (state: "approved" | "rejected") => {
    const i = claim.steps.findIndex((s) => s.state === "pending");
    const next = claim.steps.map((s, j) =>
      j === i ? { ...s, state, at: "Just now" } : j === i + 1 && state === "approved" ? { ...s, state: "pending" as const } : s,
    );
    const done = state === "rejected" || !next.some((s) => s.state === "pending");
    onChange({ ...claim, steps: next, state: state === "rejected" ? "rejected" : done ? "approved" : "submitted" });
    setNotice(
      state === "rejected"
        ? `Rejected for good. ${who.name} is told.`
        : done
          ? `Approved. ${money(total)} waits for the next pay-back batch.`
          : `Approved your step. Finance takes the next one; ${who.name} sees where it is.`,
    );
  };
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: mode === "owner" ? "My claims" : mode === "approver" ? "To approve" : "All claims", href: "#claims" }, { label: claim.number }]}
        title={claim.title}
        meta={<StatusBadge tone={CLAIM_STATE[claim.state].tone}>{CLAIM_STATE[claim.state].label}</StatusBadge>}
        description={`${claim.number} · ${who.name}, ${who.dept}${claim.sent ? ` · sent ${claim.sent}` : ""}`}
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onBack}>
              Back
            </Button>
            {draft && mode === "owner" && (
              <>
                <Button icon={<Camera />} onClick={() => setAdding("receipt")}>
                  Add a receipt
                </Button>
                <Button icon={<Car />} onClick={() => setAdding("car")}>
                  Add a trip by car
                </Button>
                <Button icon={<Plane />} onClick={() => setAdding("days")}>
                  Add days away
                </Button>
                <Button
                  variant="primary"
                  icon={<Send />}
                  onClick={() => {
                    onChange({ ...claim, state: "submitted", sent: "Today", steps: steps.map((s, i) => ({ ...s, state: i === 0 ? "pending" : "waiting" })) });
                    setNotice(
                      `Sent. ${steps[0]?.who} is asked first${
                        steps.length > 1
                          ? `, then ${steps
                              .slice(1)
                              .map((s) => s.who)
                              .join(" and ")}`
                          : ""
                      }.`,
                    );
                  }}
                >
                  Send for approval
                </Button>
              </>
            )}
            {mode === "approver" && pending?.who === ME && claim.state === "submitted" && (
              <>
                <Button icon={<Undo2 />} onClick={() => setReturning(true)}>
                  Send back
                </Button>
                <Button variant="danger" onClick={() => decide("rejected")}>
                  Reject
                </Button>
                <Button variant="primary" onClick={() => decide("approved")}>
                  Approve
                </Button>
              </>
            )}
          </>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <KpiGrid minWidth={150}>
            <KpiCard label="Spent" value={money(spentOf(claim))} unit={`${claim.items.length} items`} />
            <KpiCard label="Paid back" value={money(total)} />
            <KpiCard label="Flags" value={String(flags.length)} tone={flags.some((f) => f.finance) ? "warning" : undefined} />
          </KpiGrid>
          <Panel title="Items" aria-label="Items" flush>
            <ItemsTable items={claim.items} />
          </Panel>
        </div>
        <div className="flex flex-col gap-2.5">
          <Panel
            title="Who approves"
            description={draft ? "From expenses.yaml, for this total; nobody approves their own claim" : undefined}
            aria-label="Who approves"
          >
            <Steps steps={steps} />
          </Panel>
          {claim.batch && (
            <Panel title="Pay back">
              <p className="text-xs text-fg">In {claim.batch}.</p>
            </Panel>
          )}
        </div>
      </div>
      <Dialog
        open={adding === "receipt"}
        onOpenChange={(o) => !o && setAdding(null)}
        title="Add a receipt"
        onSubmit={(e) => {
          e.preventDefault();
          add({
            id: `n${Date.now()}`,
            kind: "receipt",
            date: READ.date,
            category,
            project: "acme",
            seller: READ.seller,
            amount: READ.amount,
            currency: "TRY",
            kdv: READ.kdv,
            paidBy: "employee",
            receipt: "read",
            flags: [],
          });
          setAdding(null);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add
            </Button>
          </>
        }
      >
        <div className="flex items-center gap-3 rounded-md border border-line bg-canvas p-2.5">
          <span aria-hidden className="grid h-16 w-12 place-items-center rounded bg-subtle text-fg-muted">
            <Receipt className="size-5" />
          </span>
          <span className="flex min-w-0 flex-col text-sm">
            <span className="font-mono text-xs">IMG_2041.HEIC, 2.1 MB</span>
            <span aria-label="What was read" className="text-fg">
              {READ.seller} · {money(READ.amount)} · {READ.date} · KDV {READ.kdv}%
            </span>
            <span className="text-2xs text-fg-muted">Read with {Math.round(READ.confidence * 100)}% confidence; check it, anything unclear is typed in</span>
          </span>
        </div>
        <SelectField
          label="Category"
          value={category}
          onChange={(e) => setCategory(e.target.value as CategoryId)}
          options={(Object.keys(CATEGORIES) as CategoryId[])
            .filter((k) => k !== "mileage" && k !== "per-diem")
            .map((k) => ({ value: k, label: `${CATEGORIES[k].name}${CATEGORIES[k].limit ? `, up to ${CATEGORIES[k].limit}` : ""}` }))}
        />
        <SelectField label="Project" value="acme" onChange={() => {}} options={Object.entries(PROJECTS).map(([value, label]) => ({ value, label }))} />
      </Dialog>
      <Dialog
        open={adding === "car"}
        onOpenChange={(o) => !o && setAdding(null)}
        title="Add a trip by car"
        description="Your own car, at 8.50 TL a km as expenses.yaml sets it."
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(km) || 0;
          add({
            id: `n${Date.now()}`,
            kind: "mileage",
            date: "5 Nov",
            category: "mileage",
            project: "acme",
            seller: `Ankara, Esenboğa to Kızılay and back, ${n} km`,
            amount: round2(n * 8.5),
            currency: "TRY",
            kdv: 0,
            paidBy: "employee",
            receipt: "none",
            flags: [],
          });
          setAdding(null);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add {money(round2((Number(km) || 0) * 8.5))}
            </Button>
          </>
        }
      >
        <TextField label="Kilometres" value={km} onChange={(e) => setKm(e.target.value)} mono adornment={<span className="text-xs text-fg-muted">km</span>} />
      </Dialog>
      <Dialog
        open={adding === "days"}
        onOpenChange={(o) => !o && setAdding(null)}
        title="Add days away"
        description="A daily allowance by country, counted in half days."
        onSubmit={(e) => {
          e.preventDefault();
          const d = (Number(halfDays) || 0) / 2;
          add({
            id: `n${Date.now()}`,
            kind: "per_diem",
            date: "4 Nov",
            category: "per-diem",
            project: "acme",
            seller: `${country === "TR" ? "Türkiye" : country}, ${d} days`,
            amount: round2(rate.amount * d),
            currency: rate.cur,
            rate: rate.cur === "TRY" ? undefined : rate.rate,
            kdv: 0,
            paidBy: "employee",
            receipt: "none",
            flags: [],
          });
          setAdding(null);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setAdding(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add
            </Button>
          </>
        }
      >
        <SelectField
          label="Country"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          options={[
            { value: "TR", label: "Türkiye, 600 TL a day" },
            { value: "DE", label: "Germany, 60 EUR a day" },
            { value: "GB", label: "United Kingdom, 55 GBP a day" },
            { value: "other", label: "Elsewhere, 50 EUR a day" },
          ]}
        />
        <TextField label="Half days away" value={halfDays} onChange={(e) => setHalfDays(e.target.value)} mono hint={`${(Number(halfDays) || 0) / 2} days`} />
      </Dialog>
      <Dialog
        open={returning}
        onOpenChange={setReturning}
        title={`Send ${claim.number} back to ${who.name}`}
        description="It goes back as a draft; they change it and send it again."
        onSubmit={(e) => {
          e.preventDefault();
          onChange({ ...claim, state: "draft", steps: claim.steps.map((s) => (s.state === "pending" ? { ...s, state: "returned" } : s)) });
          setNotice(`Sent back to ${who.name}: ${why.trim() || "no reason given"}.`);
          setReturning(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setReturning(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Send back
            </Button>
          </>
        }
      >
        <TextField label="What to change" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Add the receipt for 4 Nov" />
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------------------- claims */

function ClaimsList({ claims, label, onOpen, showOwner }: { claims: Claim[]; label: string; onOpen: (id: string) => void; showOwner?: boolean }) {
  const cols: Column<Claim>[] = [
    {
      id: "title",
      header: "Claim",
      width: "32%",
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <button type="button" onClick={() => onOpen(c.id)} className="truncate text-left font-medium text-fg hover:underline">
            {c.title}
          </button>
          <span className="font-mono text-2xs text-fg-muted">{c.number}</span>
        </span>
      ),
    },
    ...(showOwner
      ? [
          {
            id: "owner",
            header: "Person",
            sortValue: (c: Claim) => ownerOf(c).name,
            cell: (c: Claim) => (
              <span className="flex items-center gap-1.5">
                <Avatar name={ownerOf(c).name} size="sm" className="size-5" />
                <span className="flex flex-col">
                  <span className="text-xs">{ownerOf(c).name}</span>
                  <span className="text-2xs text-fg-muted">{ownerOf(c).dept}</span>
                </span>
              </span>
            ),
          },
        ]
      : []),
    { id: "state", header: "State", cell: (c) => <StatusBadge tone={CLAIM_STATE[c.state].tone}>{CLAIM_STATE[c.state].label}</StatusBadge> },
    {
      id: "flags",
      header: "Flags",
      cell: (c) => {
        const f = c.items.flatMap((i) => i.flags);
        return f.length ? (
          <span className="flex flex-wrap gap-1">
            {[...new Set(f.map((x) => x.code))].map((code) => (
              <Badge key={code} tone="warning">
                {code}
              </Badge>
            ))}
          </span>
        ) : (
          <span className="text-xs text-fg-muted">–</span>
        );
      },
    },
    { id: "sent", header: "Sent", cell: (c) => c.sent ?? "–" },
    { id: "total", header: "Paid back", align: "right", mono: true, sortValue: (c) => totalOf(c), cell: (c) => money(totalOf(c)) },
  ];
  return <DataTable label={label} columns={cols} rows={claims} getRowId={(c) => c.id} minWidth={showOwner ? 860 : 700} />;
}

function MinePage({ claims, onOpen }: { claims: Claim[]; onOpen: (id: string) => void }) {
  const mine = claims.filter((c) => c.owner === "emily@example.com");
  return (
    <>
      <PageHeader
        title="My claims"
        description="Photograph a receipt on your phone and it is read into a draft. Send the claim when it is complete; your manager approves it first."
        actions={
          <Button variant="primary" icon={<Camera />} onClick={() => onOpen("x144")}>
            Add a receipt
          </Button>
        }
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard
          label="Draft"
          value={money(totalOf(mine.find((c) => c.state === "draft") ?? mine[0]!))}
          delta={{ label: "Ankara, not sent yet", intent: "neutral" }}
        />
        <KpiCard label="Owed to you" value={money(2150)} delta={{ label: "with November's pay, 30 Nov", intent: "neutral" }} />
        <KpiCard label="Paid back this year" value={money(18640.5)} delta={{ label: "11 claims", intent: "neutral" }} />
      </KpiGrid>
      <Panel flush>
        <ClaimsList claims={mine} label="My claims" onOpen={onOpen} />
      </Panel>
      <p className="mt-2.5 text-xs text-fg-muted">
        Paid back by transfer to TR64 0001 0017 4512 3456 7890 01, or with your pay when finance puts the claim in a payroll batch.
      </p>
    </>
  );
}

function ApprovePage({ claims, onOpen }: { claims: Claim[]; onOpen: (id: string) => void }) {
  const waiting = claims.filter((c) => c.state === "submitted" && c.steps.find((s) => s.state === "pending")?.who === ME);
  const decided = claims.filter((c) => c.owner !== "emily@example.com" && c.steps.some((s) => s.who === ME && s.state !== "pending" && s.state !== "waiting"));
  return (
    <>
      <PageHeader
        title="To approve"
        description={`Claims of the people ${ME} manages, waiting for ${ME}'s step. A step asks one person; finance steps go to any editor.`}
      />
      {waiting.length === 0 && <Callout tone="success" title="Nothing waits for you." className="mb-2.5" />}
      <Panel title="Waiting for you" flush className="mb-2.5">
        <ClaimsList claims={waiting} label="Waiting for you" onOpen={onOpen} showOwner />
      </Panel>
      <Panel title="Decided by you" description="Last 30 days" flush>
        <ClaimsList claims={decided} label="Decided by you" onOpen={onOpen} showOwner />
      </Panel>
    </>
  );
}

function AllPage({ claims, onOpen }: { claims: Claim[]; onOpen: (id: string) => void }) {
  const [state, setState] = useState<"all" | ClaimState>("all");
  const [depts, setDepts] = useState<string[]>([]);
  const rows = claims.filter((c) => c.state !== "draft" && (state === "all" || c.state === state) && (!depts.length || depts.includes(ownerOf(c).dept)));
  const deptNames = [...new Set(Object.values(PEOPLE).map((p) => p.dept))];
  return (
    <>
      <PageHeader title="All claims" description="Every sent claim, for viewers and finance. Drafts stay with their owner." />
      <div className="mb-2.5">
        <FilterBar onClear={depts.length ? () => setDepts([]) : undefined}>
          <SegmentedControl
            label="State"
            value={state}
            onChange={setState}
            options={[
              { value: "all", label: "All" },
              { value: "submitted", label: "Waiting" },
              { value: "approved", label: "Approved" },
              { value: "paid", label: "Paid back" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
          <FacetFilter
            label="Department"
            options={deptNames.map((d) => ({ value: d, count: claims.filter((c) => c.state !== "draft" && ownerOf(c).dept === d).length }))}
            selected={depts}
            onChange={setDepts}
          />
        </FilterBar>
      </div>
      <Panel flush>
        <ClaimsList claims={rows} label="All claims" onOpen={onOpen} showOwner />
      </Panel>
    </>
  );
}

/* ----------------------------------------------------------------- cards */

const CARD_LINES = [
  { id: "t1", date: "5 Nov", holder: "Ali Demir", card: "4417", seller: "SHELL KAVACIK", amount: 1840, state: "receipt" as const },
  { id: "t2", date: "4 Nov", holder: "Hakan Yıldız", card: "2290", seller: "DIVAN PASTANELERI", amount: 960, state: "matched" as const, claim: "X-2026-0139" },
  { id: "t3", date: "3 Nov", holder: "Ali Demir", card: "4417", seller: "AWS EMEA", amount: 2210.4, state: "receipt" as const },
  { id: "t4", date: "1 Nov", holder: "Merve Çelik", card: "8803", seller: "GITHUB.COM", amount: 892.1, state: "receipt" as const },
  {
    id: "t5",
    date: "20 Oct",
    holder: "Merve Çelik",
    card: "8803",
    seller: "LINUX FOUNDATION",
    amount: 43043.1,
    state: "matched" as const,
    claim: "X-2026-0137",
  },
];

function CardsPage() {
  const [lines, setLines] = useState(CARD_LINES);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [show, setShow] = useState<"all" | "receipt">("all");
  const rows = lines.filter((l) => show === "all" || l.state === "receipt");
  return (
    <>
      <PageHeader
        title="Company cards"
        description="Purchases from the bank's card statement, given to their holder by the card's last four digits. A receipt with the same amount within 3 days is matched to it; the rest wait for a receipt."
        actions={
          <Button icon={<Upload />} onClick={() => setImporting(true)}>
            Import a statement
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="mb-2.5">
        <SegmentedControl
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: "all", label: "All purchases" },
            { value: "receipt", label: "Waiting for a receipt" },
          ]}
        />
      </div>
      <Panel flush>
        <DataTable
          label="Card purchases"
          rows={rows}
          getRowId={(l) => l.id}
          minWidth={760}
          columns={[
            { id: "date", header: "Date", cell: (l) => l.date },
            { id: "seller", header: "Seller", cell: (l) => <span className="font-mono text-xs">{l.seller}</span> },
            {
              id: "holder",
              header: "Holder",
              cell: (l) => (
                <span className="flex flex-col">
                  <span className="text-xs">{l.holder}</span>
                  <span className="font-mono text-2xs text-fg-muted">•••• {l.card}</span>
                </span>
              ),
            },
            { id: "amount", header: "Amount", align: "right", mono: true, cell: (l) => money(l.amount) },
            {
              id: "state",
              header: "Receipt",
              cell: (l) =>
                l.state === "matched" ? (
                  <StatusBadge tone="success">On {l.claim}</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">Waiting for a receipt</StatusBadge>
                ),
            },
          ]}
        />
      </Panel>
      <Dialog
        open={importing}
        onOpenChange={setImporting}
        title="Import a card statement"
        description="The bank's CSV. Purchases already imported are left out."
        footer={
          <>
            <Button type="button" onClick={() => setImporting(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setLines((ls) => [
                  { id: "t6", date: "6 Nov", holder: "Ali Demir", card: "4417", seller: "IZMIR HILTON", amount: 4200, state: "receipt" },
                  ...ls,
                ]);
                setNotice("Imported garanti-kart-2026-11-06.csv: 1 new purchase, 5 already imported. Ali Demir is asked for the Izmir Hilton receipt.");
                setImporting(false);
              }}
            >
              Import
            </Button>
          </>
        }
      >
        <p className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-fg">
          <Upload aria-hidden className="size-4 text-fg-muted" />
          garanti-kart-2026-11-06.csv, 6 rows
        </p>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------- pay back */

interface Batch {
  id: string;
  name: string;
  method: "payroll" | "transfer";
  state: "open" | "sent" | "paid";
  payDate: string;
  claims: string[];
}

const BATCHES: Batch[] = [
  { id: "bt3", name: "November pay", method: "payroll", state: "open", payDate: "30 Nov", claims: ["x135"] },
  { id: "bt2", name: "Transfer 2026-11-A", method: "transfer", state: "paid", payDate: "5 Nov", claims: ["x128"] },
];

function PayBackPage({ claims }: { claims: Claim[] }) {
  const [batches, setBatches] = useState(BATCHES);
  const [picked, setPicked] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const inBatch = new Set(batches.flatMap((b) => b.claims));
  const ready = claims.filter((c) => c.state === "approved" && !inBatch.has(c.id));
  const claimOf = (id: string) => claims.find((c) => c.id === id);
  const sumOf = (ids: string[]) => round2(ids.reduce((n, id) => n + totalOf(claimOf(id)!), 0));
  return (
    <>
      <PageHeader
        title="Pay back"
        description="Approved claims are paid back in batches: with pay, which Payroll takes for the month, or by bank transfer from a list you upload to the bank."
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <Panel
        title="Approved, not in a batch"
        aria-label="Approved, not in a batch"
        className="mb-2.5"
        actions={
          <Button
            size="sm"
            variant="primary"
            disabled={!picked.length}
            onClick={() => {
              setBatches((bs) => bs.map((b) => (b.id === "bt3" ? { ...b, claims: [...b.claims, ...picked] } : b)));
              setNotice(`Added ${picked.length} ${picked.length === 1 ? "claim" : "claims"} to November pay.`);
              setPicked([]);
            }}
          >
            Add to November pay
          </Button>
        }
      >
        <ul aria-label="Ready to pay back" className="flex flex-col gap-2">
          {ready.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 border-b border-subtle pb-2 last:border-0">
              <Checkbox
                label={`${ownerOf(c).name}: ${c.title}`}
                description={`${c.number} · ${money(totalOf(c))}`}
                checked={picked.includes(c.id)}
                onChange={(e) => setPicked((p) => (e.target.checked ? [...p, c.id] : p.filter((x) => x !== c.id)))}
              />
            </li>
          ))}
          {!ready.length && <li className="text-xs text-fg-muted">Every approved claim is in a batch.</li>}
        </ul>
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-2">
        {batches.map((b) => (
          <Panel
            key={b.id}
            aria-label={b.name}
            title={b.name}
            description={`${b.method === "payroll" ? "With pay, through Payroll" : "By bank transfer"} · ${b.payDate}`}
            actions={
              <StatusBadge tone={b.state === "paid" ? "success" : b.state === "sent" ? "info" : "neutral"}>
                {b.state === "open" ? "Open" : b.state === "sent" ? "Sent" : "Paid"}
              </StatusBadge>
            }
            footer={
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {b.claims.length} {b.claims.length === 1 ? "claim" : "claims"} · {money(sumOf(b.claims))}
                </span>
                {b.state === "open" && (
                  <Button
                    size="xs"
                    variant="primary"
                    icon={<Send />}
                    onClick={() => {
                      setBatches((bs) => bs.map((x) => (x.id === b.id ? { ...x, state: "sent" } : x)));
                      setNotice(`${b.name} is locked. Payroll adds ${money(sumOf(b.claims))} to November's pay, on each person's payslip.`);
                    }}
                  >
                    Send to Payroll
                  </Button>
                )}
                {b.state === "sent" && (
                  <Button size="xs" icon={<Banknote />}>
                    Mark paid
                  </Button>
                )}
                {b.state === "paid" && b.method === "transfer" && (
                  <IconButton label={`Download the transfer list of ${b.name}`} size="xs">
                    <FileDown className="size-3.5" />
                  </IconButton>
                )}
              </span>
            }
          >
            <ul aria-label={`Claims in ${b.name}`} className="flex flex-col gap-1 text-xs">
              {b.claims.map((id) => {
                const c = claimOf(id)!;
                return (
                  <li key={id} className="flex justify-between gap-2">
                    <span>
                      {ownerOf(c).name} · {c.number}
                    </span>
                    <span className="font-mono">{money(totalOf(c))}</span>
                  </li>
                );
              })}
            </ul>
          </Panel>
        ))}
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- spend */

type By = "category" | "department" | "project" | "person";

const SPEND: Record<By, { id: string; label: string; value: number }[]> = {
  category: [
    { id: "travel", label: "Travel", value: 48210 },
    { id: "hotel", label: "Hotel", value: 31480 },
    { id: "software", label: "Software", value: 22740 },
    { id: "meals", label: "Meals", value: 12960 },
    { id: "mileage", label: "Mileage", value: 9860 },
    { id: "per-diem", label: "Daily allowance", value: 9120 },
    { id: "taxi", label: "Taxi", value: 6315 },
    { id: "client-gifts", label: "Client gifts", value: 3880 },
  ],
  department: [
    { id: "sales", label: "Sales", value: 86410 },
    { id: "engineering", label: "Engineering", value: 51320 },
    { id: "support", label: "Customer Support", value: 6835 },
  ],
  project: [
    { id: "acme", label: "Acme rollout", value: 79240 },
    { id: "internal", label: "Internal", value: 65325 },
  ],
  person: [
    { id: "merve", label: "Merve Çelik", value: 49800 },
    { id: "hakan", label: "Hakan Yıldız", value: 31200 },
    { id: "emily", label: ME, value: 22640 },
    { id: "ali", label: "Ali Demir", value: 18130 },
    { id: "burak", label: "Burak Şahin", value: 12890 },
    { id: "selin", label: "Selin Aydın", value: 6990 },
  ],
};

const KDV_ROWS = [
  { id: "k20", rate: "20%", base: 41250.0, kdv: 8250.0, documents: 38 },
  { id: "k10", rate: "10%", base: 40400.0, kdv: 4040.0, documents: 21 },
  { id: "k1", rate: "1%", base: 0, kdv: 0, documents: 0 },
  { id: "k0", rate: "0% or none", base: 62915.0, kdv: 0, documents: 19 },
];

function SpendPage() {
  const [by, setBy] = useState<By>("category");
  const items = SPEND[by];
  return (
    <>
      <PageHeader title="Spend" description="Approved and paid-back spending in TL, this year. Card purchases count once their receipt is on a claim." />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="Spent this year" value={money(144565)} delta={{ label: "+12% vs. last year", direction: "up", intent: "neutral" }} />
        <KpiCard label="Waiting for approval" value={money(13945)} delta={{ label: "4 claims", intent: "neutral" }} />
        <KpiCard label="Flagged by the policy" value="6" tone="warning" delta={{ label: "items in sent claims", intent: "neutral" }} />
        <KpiCard label="Days to pay back" value="9" delta={{ label: "from sent to paid, median", intent: "neutral" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          title={`By ${by}`}
          actions={
            <SegmentedControl
              label="Group by"
              value={by}
              onChange={setBy}
              options={[
                { value: "category", label: "Category" },
                { value: "department", label: "Department" },
                { value: "project", label: "Project" },
                { value: "person", label: "Person" },
              ]}
            />
          }
        >
          <BarList label={`Spend by ${by}`} items={items} format={(v) => money(v)} />
        </Panel>
        <Panel title="Paid by">
          <DonutChart
            label="Paid by"
            slices={[
              { id: "employee", name: "Employees, paid back", value: 98240 },
              { id: "card", name: "Company cards", value: 46325 },
            ]}
            format={(v) => money(v)}
          />
        </Panel>
      </div>
      <Panel title="KDV" description="By rate, from receipts and invoices; for the accountant to deduct" flush>
        <DataTable
          label="KDV by rate"
          rows={KDV_ROWS}
          getRowId={(r) => r.id}
          minWidth={560}
          columns={[
            { id: "rate", header: "Rate", cell: (r) => r.rate },
            { id: "base", header: "Without KDV", align: "right", mono: true, cell: (r) => money(r.base) },
            { id: "kdv", header: "KDV", align: "right", mono: true, cell: (r) => money(r.kdv) },
            { id: "documents", header: "Documents", align: "right", mono: true, cell: (r) => r.documents },
          ]}
        />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- exports */

function ExportsPage() {
  const [month, setMonth] = useState("2026-10");
  const [done, setDone] = useState<string | null>(null);
  const files = [
    {
      id: "items",
      name: `expenses-${month}.csv`,
      text: "Every approved item: date, person, category and its account code, project, seller, tax number, KDV rate and amount, TL and the original currency",
    },
    { id: "receipts", name: `receipts-${month}.zip`, text: "The month's receipt photos and PDFs, a folder per claim, named by item" },
  ];
  return (
    <>
      <PageHeader title="Exports" description="For your accountant: separated by ; with a decimal comma, as Excel in Turkish reads it." />
      <div className="mb-2.5 w-56">
        <SelectField
          label="Month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          options={[
            { value: "2026-09", label: "September 2026" },
            { value: "2026-10", label: "October 2026" },
          ]}
        />
      </div>
      {done && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          Downloaded {done}.
        </div>
      )}
      <div className="grid gap-2.5 md:grid-cols-2">
        {files.map((f) => (
          <Panel
            key={f.id}
            title={f.name}
            aria-label={f.name}
            actions={
              <IconButton label={`Download ${f.name}`} size="xs" onClick={() => setDone(f.name)}>
                <FileDown className="size-3.5" />
              </IconButton>
            }
          >
            <p className="text-sm text-fg">{f.text}</p>
          </Panel>
        ))}
      </div>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `time_zone: Europe/Istanbul
currencies: [EUR, USD, GBP]
rates:
  use: forex_buying
  day: previous
receipts:
  max_size: 10MB
  types: [jpeg, png, webp, heic, pdf]
  max_age: 90d
  reader:
    url: http://receipt-reader:8080
    token: EXPENSES_READER_TOKEN
    min_confidence: 0.8
kdv_rates: [0%, 1%, 10%, 20%]
categories:
  travel: { name: Travel, account: "770.01", kdv: 20% }
  taxi: { name: Taxi, account: "770.01", kdv: 20%, limit: { per_item: 1500 } }
  meals: { name: Meals, account: "770.02", kdv: 10%, limit: { per_day: 750 } }
  hotel:
    { name: Hotel, account: "770.03", kdv: 10%, limit: { per_item: 5000 }, over_limit: cap }
  client-gifts:
    name: Client gifts
    account: "760.05"
    kdv: 20%
    limit: { per_item: 1000 }
    over_limit: block
    project: required
  software: { name: Software, account: "770.05", kdv: 20%, limit: { per_month: 3000 } }
  mileage: { name: Mileage, kind: mileage, rate: 8.50, account: "770.04" }
  per-diem:
    name: Daily allowance
    kind: per_diem
    account: "770.06"
    rates: { TR: 600, DE: 60 EUR, GB: 55 GBP, default: 50 EUR }
approvals:
  chain:
    - manager
    - { approver: finance, over: 10000 }
    - { approver: cfo@example.com, over: 50000 }
  departments:
    engineering:
      - manager
      - { approver: cto@example.com, over: 20000 }
      - { approver: finance, over: 20000 }
cards:
  holders:
    "4417": ali@example.com
    "2290": hakan@example.com
    "8803": merve@example.com
  match_days: 3
exports: { separator: ";", decimal: "," }
hr: { url: http://hr:8080, token: EXPENSES_HR_TOKEN, every: 15m }`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="expenses"
      file="expenses.yaml"
      applied="yesterday"
      yaml={YAML}
      groups={[
        {
          title: "Limits",
          description: "Per person, in TL. Flag brings finance in, block stops the claim, cap pays back up to the limit.",
          items: [
            { label: "Taxi", value: "1,500 TL an item, flag", path: "categories.taxi.limit" },
            { label: "Meals", value: "750 TL a day, flag", path: "categories.meals.limit" },
            { label: "Hotel", value: "5,000 TL an item, cap", path: "categories.hotel.over_limit" },
            { label: "Client gifts", value: "1,000 TL an item, block; needs a project", path: "categories.client-gifts" },
            { label: "Software", value: "3,000 TL a month, flag", path: "categories.software.limit" },
          ],
        },
        {
          title: "Rates",
          items: [
            { label: "Mileage", value: "8.50 TL a km in your own car", path: "categories.mileage.rate" },
            {
              label: "Daily allowance",
              value: "Türkiye 600 TL, Germany 60 EUR, United Kingdom 55 GBP, elsewhere 50 EUR; half days",
              path: "categories.per-diem.rates",
            },
            { label: "Currencies", value: "TCMB forex buying rate of the business day before the receipt", path: "rates" },
          ],
        },
        {
          title: "Approvals",
          description: "Nobody approves their own claim, and the same person approves once.",
          items: [
            { label: "Everyone", value: "Manager; finance over 10,000 TL; cfo@example.com over 50,000 TL", path: "approvals.chain" },
            { label: "Engineering", value: "Manager; cto@example.com and finance over 20,000 TL", path: "approvals.departments.engineering" },
            { label: "Receipts", value: "Older than 90 days, missing or looking like a duplicate bring finance in", path: "receipts.max_age" },
          ],
        },
        {
          title: "People and cards",
          items: [
            { label: "People", value: "Departments and managers from HR, every 15 minutes", path: "hr" },
            { label: "Cards", value: "3 cards by their last four digits; receipts match within 3 days", path: "cards" },
          ],
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------- app */

type ClaimPage = "mine" | "approve" | "all";

function ExpensesApp({ initial, open: initialOpen }: { initial: string; open?: string }) {
  const [claims, setClaims] = useState(CLAIMS);
  // The claim open on each of the three claim pages, so moving between them shows each page's own list or claim.
  const [open, setOpen] = useState<Partial<Record<ClaimPage, string>>>(initialOpen ? { [initial]: initialOpen } : {});
  const change = (c: Claim) => setClaims((cs) => cs.map((x) => (x.id === c.id ? c : x)));
  const claimPage = (page: ClaimPage, list: () => ReactNode) => () => {
    const claim = claims.find((c) => c.id === open[page]);
    if (!claim) return list();
    return (
      <ClaimView
        claim={claim}
        onBack={() => setOpen((o) => ({ ...o, [page]: undefined }))}
        onChange={change}
        mode={page === "mine" ? "owner" : page === "approve" ? "approver" : "viewer"}
      />
    );
  };
  const openOn = (page: ClaimPage) => (id: string) => setOpen((o) => ({ ...o, [page]: id }));
  const pages: PageMap = {
    mine: claimPage("mine", () => <MinePage claims={claims} onOpen={openOn("mine")} />),
    approve: claimPage("approve", () => <ApprovePage claims={claims} onOpen={openOn("approve")} />),
    all: claimPage("all", () => <AllPage claims={claims} onOpen={openOn("all")} />),
    cards: () => <CardsPage />,
    payback: () => <PayBackPage claims={claims} />,
    spend: () => <SpendPage />,
    exports: () => <ExportsPage />,
    settings: () => <SettingsPage />,
  };
  return <ProductApp product="expenses" nav={nav} pages={pages} initial={initial} />;
}

const app = (initial: string, open?: string): Story => ({ render: () => <ExpensesApp initial={initial} open={open} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();
const body = (el: HTMLElement) => within(el.ownerDocument.body);
const rowsOf = (t: HTMLElement) => within(t).getAllByRole("row").slice(1);

/* ----------------------------------------------------------------- stories */

export const MyClaims: Story = {
  name: "My claims",
  ...app("mine"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "My claims" });
    await expect(rowsOf(table)).toHaveLength(2);
    await userEvent.click(within(table).getByRole("button", { name: "Ankara, visit to Kaya Eczane" }));
    await expect(c.getByRole("heading", { level: 1, name: "Ankara, visit to Kaya Eczane" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const DraftClaim: Story = {
  name: "Draft claim",
  ...app("mine", "x144"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const items = c.getByRole("table", { name: "Items" });
    await expect(items).toHaveTextContent("600.00 TRY is not paid back.");
    await expect(within(c.getByRole("region", { name: "Who approves" })).getAllByRole("listitem")).toHaveLength(1);
    await userEvent.click(c.getByRole("button", { name: "Add a receipt" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add a receipt" }));
    await expect(dialog.getByLabelText("What was read")).toHaveTextContent("Simit Sarayı Kızılay · 186.00 TL · 5 Nov · KDV 10%");
    await userEvent.click(dialog.getByRole("button", { name: "Add" }));
    await expect(rowsOf(items)).toHaveLength(4);
    blur(canvasElement);
  },
};

export const AddMileage: Story = {
  name: "Add a trip by car",
  ...app("mine", "x144"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add a trip by car" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add a trip by car" }));
    const km = dialog.getByRole("textbox", { name: "Kilometres" });
    await userEvent.clear(km);
    await userEvent.type(km, "200");
    await userEvent.click(dialog.getByRole("button", { name: "Add 1,700.00 TL" }));
    await expect(c.getByRole("table", { name: "Items" })).toHaveTextContent("200 km");
    const approvers = c.getByRole("region", { name: "Who approves" });
    await expect(within(approvers).getAllByRole("listitem")).toHaveLength(2);
    await expect(approvers).toHaveTextContent("Finance (over 10,000.00 TRY).");
  },
};

export const AddDaysAway: Story = {
  name: "Add days away",
  ...app("mine", "x144"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add days away" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add days away" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Country" }), "DE");
    await expect(dialog.getByText("1.5 days")).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Add" }));
    await expect(c.getByRole("table", { name: "Items" })).toHaveTextContent("90.00 EUR× 48.2150 TCMB");
  },
};

export const SendClaim: Story = {
  name: "Send a claim",
  ...app("mine", "x144"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Send for approval" }));
    await expect(c.getByRole("status")).toHaveTextContent("Sent. Murat Aksoy is asked first.");
    await expect(c.getByRole("region", { name: "Who approves" })).toHaveTextContent("Waiting now");
  },
};

export const ToApprove: Story = {
  name: "To approve",
  ...app("approve"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Waiting for you" });
    await expect(rowsOf(table)).toHaveLength(2);
    await expect(within(table).getByText("Taxis, first week of November").closest("tr")).toHaveTextContent("duplicate");
    await expect(rowsOf(c.getByRole("table", { name: "Decided by you" }))).toHaveLength(3);
  },
};

export const ApproveClaim: Story = {
  name: "Approve a claim",
  ...app("approve", "x142"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Items" })).toHaveTextContent("İTÜ Taksi");
    await userEvent.click(c.getByRole("button", { name: "Approve" }));
    await expect(c.getByRole("status")).toHaveTextContent("Approved. 640.00 TL waits for the next pay-back batch.");
    await userEvent.click(c.getByRole("button", { name: "Back" }));
    await expect(rowsOf(c.getByRole("table", { name: "Waiting for you" }))).toHaveLength(1);
    blur(canvasElement);
  },
};

export const ApproveWithFinance: Story = {
  name: "Approve, finance next",
  ...app("approve", "x141"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Items" })).toHaveTextContent("A receipt with the same seller, date and amount is on X-2026-0128.");
    await userEvent.click(c.getByRole("button", { name: "Approve" }));
    await expect(c.getByRole("status")).toHaveTextContent("Finance takes the next one");
    await expect(c.getByRole("region", { name: "Who approves" })).toHaveTextContent("2. FinanceWaiting now");
  },
};

export const SendBack: Story = {
  name: "Send a claim back",
  ...app("approve", "x141"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Send back" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Send X-2026-0141 back to Selin Aydın" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "What to change" }), "Take out the taxi already on X-2026-0128");
    await userEvent.click(dialog.getByRole("button", { name: "Send back" }));
    await expect(c.getByRole("status")).toHaveTextContent("Sent back to Selin Aydın: Take out the taxi already on X-2026-0128.");
    await expect(c.getByRole("heading", { level: 1 }).parentElement).toHaveTextContent("Draft");
  },
};

export const ForeignClaim: Story = {
  name: "Claim in euros",
  ...app("all", "x137"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Items" })).toHaveTextContent("899.00 EUR× 47.8806 TCMB");
    await expect(c.getByRole("table", { name: "Items" })).toHaveTextContent("Paid by card");
    await expect(c.getByRole("region", { name: "Who approves" })).toHaveTextContent("Left out: Kerem Öz approved already.");
  },
};

export const AllClaims: Story = {
  name: "All claims",
  ...app("all"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "All claims" });
    await expect(rowsOf(table)).toHaveLength(CLAIMS.length - 1);
    await userEvent.click(c.getByRole("radio", { name: "Waiting" }));
    await expect(rowsOf(table)).toHaveLength(3);
    await userEvent.click(c.getByRole("radio", { name: "All" }));
    await userEvent.click(c.getAllByRole("button", { name: "Department" })[0]!);
    await userEvent.click(body(canvasElement).getByRole("checkbox", { name: /Engineering/ }));
    await userEvent.keyboard("{Escape}");
    await expect(rowsOf(table)).toHaveLength(1);
    blur(canvasElement);
  },
};

export const CompanyCards: Story = {
  name: "Company cards",
  ...app("cards"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Card purchases" });
    await userEvent.click(c.getByRole("radio", { name: "Waiting for a receipt" }));
    await expect(rowsOf(table)).toHaveLength(3);
    await userEvent.click(c.getByRole("button", { name: "Import a statement" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Import a card statement" }));
    await userEvent.click(dialog.getByRole("button", { name: "Import" }));
    await expect(c.getByRole("status")).toHaveTextContent("1 new purchase, 5 already imported");
    await expect(rowsOf(table)).toHaveLength(4);
    blur(canvasElement);
  },
};

export const PayBack: Story = {
  name: "Pay back",
  ...app("payback"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const ready = c.getByRole("list", { name: "Ready to pay back" });
    await expect(within(ready).getAllByRole("listitem")).toHaveLength(2);
    await userEvent.click(within(ready).getByRole("checkbox", { name: /Burak Şahin/ }));
    await userEvent.click(c.getByRole("button", { name: "Add to November pay" }));
    await expect(c.getByRole("list", { name: "Claims in November pay" })).toHaveTextContent("Burak Şahin · X-2026-0131");
    await userEvent.click(c.getByRole("button", { name: "Send to Payroll" }));
    await expect(c.getByRole("status")).toHaveTextContent("Payroll adds 5,040.00 TL to November's pay");
    blur(canvasElement);
  },
};

export const Spend: Story = {
  ...app("spend"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Spend by category" })).toHaveTextContent("Travel");
    await userEvent.click(c.getByRole("radio", { name: "Project" }));
    await expect(c.getByRole("list", { name: "Spend by project" })).toHaveTextContent("Acme rollout");
    await expect(c.getByRole("table", { name: "KDV by rate" })).toHaveTextContent("8,250.00 TL");
    blur(canvasElement);
  },
};

export const Exports: Story = {
  ...app("exports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Download expenses-2026-10.csv" }));
    await expect(c.getByRole("status")).toHaveTextContent("Downloaded expenses-2026-10.csv.");
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("expenses.yaml as applied")).toHaveTextContent("over_limit: cap");
  },
};
