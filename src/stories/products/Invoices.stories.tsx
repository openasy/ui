import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ArrowLeft,
  Banknote,
  Building2,
  FileCode,
  FileDown,
  FileMinus,
  FileText,
  Landmark,
  LayoutDashboard,
  Mail,
  Package,
  Plus,
  Repeat,
  Send,
  Trash2,
  Upload,
} from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Dialog } from "../../components/Dialog";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import type { Tone } from "../../tokens/levels";
import { cn } from "../../lib/cn";

// Invoices keeps customers, products and invoices and credit notes in the install. Issuing gives the next number of the
// channel's series (GİB's 16 characters, ACM2026000000418), writes the UBL-TR XML and hands it to the GİB integrator
// set in invoices.yaml; Invoices is not an integrator itself. A sent invoice is never changed: a credit note corrects
// it. Payments are recorded by hand or matched from bank statements, reminders go out on the file's days, and the
// accountant gets CSV and the XML files.

const nav = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "invoices", label: "Invoices", icon: FileText, count: 3 },
  { id: "customers", label: "Customers", icon: Building2 },
  { id: "products", label: "Products", icon: Package },
  { id: "recurring", label: "Recurring", icon: Repeat },
  { id: "bank", label: "Bank", icon: Landmark, count: 2 },
  { id: "exports", label: "Exports", icon: FileDown },
];

const meta = {
  title: "Products/Invoices",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
const money = (n: number, cur = "TRY") => `${n.toLocaleString("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${cur === "TRY" ? "TL" : cur}`;
const round2 = (n: number) => Math.round(n * 100) / 100;

interface Customer {
  id: string;
  name: string;
  taxId: string;
  taxOffice: string;
  city: string;
  /** Whether the integrator says they are an e-Fatura user; null until checked. */
  eFatura: boolean | null;
  alias?: string;
  terms: number;
  currency: string;
  email: string;
}

const CUSTOMERS: Customer[] = [
  {
    id: "c1",
    name: "Avcı Lojistik A.Ş.",
    taxId: "1050327718",
    taxOffice: "Kozyatağı",
    city: "İstanbul",
    eFatura: true,
    alias: "urn:mail:defaultpk@avcilojistik.example.com",
    terms: 30,
    currency: "TRY",
    email: "muhasebe@avcilojistik.example.com",
  },
  {
    id: "c2",
    name: "Yıldız Mimarlık Ltd. Şti.",
    taxId: "9870412235",
    taxOffice: "Karşıyaka",
    city: "İzmir",
    eFatura: true,
    alias: "urn:mail:defaultpk@yildizmimarlik.example.com",
    terms: 30,
    currency: "TRY",
    email: "hakan@yildizmimarlik.example.com",
  },
  {
    id: "c3",
    name: "Polat Gıda San. A.Ş.",
    taxId: "7310098821",
    taxOffice: "Nilüfer",
    city: "Bursa",
    eFatura: true,
    alias: "urn:mail:defaultpk@polatgida.example.com",
    terms: 15,
    currency: "TRY",
    email: "seda@polatgida.example.com",
  },
  {
    id: "c4",
    name: "Kaya Eczane",
    taxId: "10442861950",
    taxOffice: "Çankaya",
    city: "Ankara",
    eFatura: false,
    terms: 30,
    currency: "TRY",
    email: "elif@kayaeczane.example.com",
  },
  {
    id: "c5",
    name: "Aksoy Danışmanlık Ltd. Şti.",
    taxId: "0160553907",
    taxOffice: "Beşiktaş",
    city: "İstanbul",
    eFatura: true,
    alias: "urn:mail:defaultpk@aksoy.example.com",
    terms: 30,
    currency: "TRY",
    email: "kerem@aksoy.example.com",
  },
  {
    id: "c6",
    name: "Tekin Yapı A.Ş.",
    taxId: "8340016652",
    taxOffice: "",
    city: "İzmir",
    eFatura: true,
    alias: "urn:mail:defaultpk@tekinyapi.example.com",
    terms: 45,
    currency: "TRY",
    email: "okan@tekinyapi.example.com",
  },
  {
    id: "c7",
    name: "Müller Logistik GmbH",
    taxId: "DE811907980",
    taxOffice: "Abroad",
    city: "Hamburg",
    eFatura: false,
    terms: 30,
    currency: "EUR",
    email: "buchhaltung@mueller-logistik.example.com",
  },
  {
    id: "c8",
    name: "Er Turizm Ltd. Şti.",
    taxId: "3320781146",
    taxOffice: "Muratpaşa",
    city: "Antalya",
    eFatura: null,
    terms: 30,
    currency: "TRY",
    email: "nihan@erturizm.example.com",
  },
];

const customerOf = (id: string) => CUSTOMERS.find((c) => c.id === id)!;

interface Product {
  id: string;
  code: string;
  name: string;
  unit: "C62" | "HUR" | "DAY" | "ANN";
  price: number;
  currency: string;
  kdv: number;
  withholding?: string;
}

const UNITS = { C62: "Piece", HUR: "Hour", DAY: "Day", ANN: "Year" } as const;

const PRODUCTS: Product[] = [
  { id: "p1", code: "BOOKS-BUS", name: "Acme Books Business, per user a year", unit: "ANN", price: 3750, currency: "TRY", kdv: 20 },
  { id: "p2", code: "BOOKS-PRO", name: "Acme Books Pro, per user a year", unit: "ANN", price: 2500, currency: "TRY", kdv: 20 },
  { id: "p3", code: "ONBOARD", name: "Onboarding and training", unit: "C62", price: 45000, currency: "TRY", kdv: 20 },
  { id: "p4", code: "CONSULT", name: "Consulting", unit: "HUR", price: 2400, currency: "TRY", kdv: 20, withholding: "602" },
  { id: "p5", code: "EARSIV-SET", name: "e-Arşiv setup for one shop", unit: "C62", price: 6000, currency: "TRY", kdv: 20 },
  { id: "p6", code: "BOOKS-PRO-EU", name: "Acme Books Pro, per user a year, abroad", unit: "ANN", price: 90, currency: "EUR", kdv: 0 },
];

/** GİB's partial withholding codes, as Invoices has them built in; their shares are in tenths of the KDV. */
const WITHHOLDING = [
  { code: "602", name: "Etüt, plan-proje, danışmanlık, denetim", tenths: 9 },
  { code: "612", name: "Temizlik, çevre ve bahçe bakım", tenths: 9 },
  { code: "624", name: "Yük taşımacılığı", tenths: 2 },
  { code: "625", name: "Ticari reklam", tenths: 3 },
];

type Status = "draft" | "queued" | "waiting" | "delivered" | "accepted" | "rejected" | "refused" | "failed" | "cancelled";

const STATUS: Record<Status, { label: string; tone: Tone; means: string }> = {
  draft: { label: "Draft", tone: "neutral", means: "Not issued; no number yet" },
  queued: { label: "Queued", tone: "info", means: "Numbered and on its way to the integrator" },
  waiting: { label: "At GİB", tone: "info", means: "The integrator sent it; GİB has not answered yet" },
  delivered: { label: "Delivered", tone: "success", means: "GİB delivered it to the buyer" },
  accepted: { label: "Accepted", tone: "success", means: "The buyer accepted the commercial invoice" },
  rejected: { label: "Rejected by buyer", tone: "danger", means: "The buyer refused it within eight days" },
  refused: { label: "Refused by integrator", tone: "danger", means: "Stopped before GİB; fix it and send it again under its number" },
  failed: { label: "Failed", tone: "danger", means: "Could not reach the integrator; tried again" },
  cancelled: { label: "Cancelled", tone: "neutral", means: "An e-Arşiv invoice cancelled through the integrator" },
};

const OWED: Status[] = ["queued", "waiting", "delivered", "accepted"];

interface Line {
  id: string;
  product?: string;
  name: string;
  qty: number;
  unit: Product["unit"];
  price: number;
  kdv: number;
  withholding?: string;
  exemption?: string;
}

interface Payment {
  id: string;
  date: string;
  amount: number;
  method: "bank" | "cash" | "card" | "other";
  note: string;
}

interface Invoice {
  id: string;
  kind: "invoice" | "credit_note";
  number: string | null;
  customer: string;
  channel: "e-fatura" | "e-arsiv";
  profile: "TEMELFATURA" | "TICARIFATURA" | "EARSIVFATURA";
  type: "SATIS" | "TEVKIFAT" | "ISTISNA" | "IADE";
  status: Status;
  issued: string | null;
  due: string | null;
  /** Days past the due day; negative before it. */
  late: number;
  currency: string;
  rate?: { value: number; date: string };
  lines: Line[];
  payments: Payment[];
  source: string;
  detail?: string;
  of?: string;
}

function totals(lines: Line[]) {
  const net = round2(lines.reduce((n, l) => n + l.qty * l.price, 0));
  const kdv = round2(lines.reduce((n, l) => n + round2((l.qty * l.price * l.kdv) / 100), 0));
  const withheld = round2(
    lines.reduce((n, l) => {
      const w = WITHHOLDING.find((x) => x.code === l.withholding);
      return n + (w ? round2((((l.qty * l.price * l.kdv) / 100) * w.tenths) / 10) : 0);
    }, 0),
  );
  return { net, kdv, withheld, total: round2(net + kdv), payable: round2(net + kdv - withheld) };
}

const paid = (i: Invoice) => round2(i.payments.reduce((n, p) => n + p.amount, 0));
const balance = (i: Invoice) => (i.kind === "invoice" && OWED.includes(i.status) ? round2(totals(i.lines).payable - paid(i)) : 0);

const INVOICES: Invoice[] = [
  {
    id: "i409",
    kind: "invoice",
    number: "ACM2026000000409",
    customer: "c1",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "SATIS",
    status: "delivered",
    issued: "29 Oct 2026",
    due: "28 Nov 2026",
    late: -20,
    currency: "TRY",
    lines: [
      { id: "l1", product: "p1", name: "Acme Books Business, 48 users, 12 months", qty: 48, unit: "ANN", price: 3750, kdv: 20 },
      { id: "l2", product: "p1", name: "Acme Books Business, 20 more users, 12 months", qty: 20, unit: "ANN", price: 3750, kdv: 20 },
      { id: "l3", product: "p3", name: "Onboarding for the Mersin depot", qty: 1, unit: "C62", price: 45000, kdv: 20 },
    ],
    payments: [{ id: "pay1", date: "6 Nov 2026", amount: 200000, method: "bank", note: "Garanti statement, matched by number" }],
    source: "CRM deal: Renewal and 20 more users",
  },
  {
    id: "i411",
    kind: "invoice",
    number: "ACM2026000000411",
    customer: "c2",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "TEVKIFAT",
    status: "delivered",
    issued: "2 Nov 2026",
    due: "2 Dec 2026",
    late: -24,
    currency: "TRY",
    lines: [{ id: "l1", product: "p4", name: "Consulting, October: 40 hours from Time", qty: 40, unit: "HUR", price: 2400, kdv: 20, withholding: "602" }],
    payments: [],
    source: "Time: approved hours",
  },
  {
    id: "i371",
    kind: "invoice",
    number: "ACM2026000000371",
    customer: "c3",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "SATIS",
    status: "delivered",
    issued: "30 Sep 2026",
    due: "15 Oct 2026",
    late: 24,
    currency: "TRY",
    lines: [{ id: "l1", product: "p1", name: "Acme Books Business, 14 users, 12 months", qty: 14, unit: "ANN", price: 3750, kdv: 20 }],
    payments: [],
    source: "By hand",
  },
  {
    id: "a181",
    kind: "invoice",
    number: "ACA2026000000181",
    customer: "c4",
    channel: "e-arsiv",
    profile: "EARSIVFATURA",
    type: "SATIS",
    status: "delivered",
    issued: "6 Oct 2026",
    due: "5 Nov 2026",
    late: 3,
    currency: "TRY",
    lines: [
      { id: "l1", product: "p2", name: "Acme Books Pro, 8 users, 12 months", qty: 8, unit: "ANN", price: 2500, kdv: 20 },
      { id: "l2", product: "p5", name: "e-Arşiv setup, 8 branches", qty: 8, unit: "C62", price: 6000, kdv: 20 },
    ],
    payments: [{ id: "pay2", date: "20 Oct 2026", amount: 40000, method: "bank", note: "By hand" }],
    source: "CRM deal: Pharmacy chain, 8 branches",
  },
  {
    id: "a186",
    kind: "invoice",
    number: "ACA2026000000186",
    customer: "c7",
    channel: "e-arsiv",
    profile: "EARSIVFATURA",
    type: "ISTISNA",
    status: "delivered",
    issued: "6 Nov 2026",
    due: "6 Dec 2026",
    late: -28,
    currency: "EUR",
    rate: { value: 48.215, date: "5 Nov 2026" },
    lines: [{ id: "l1", product: "p6", name: "Acme Books Pro, 12 users, 12 months, abroad", qty: 12, unit: "ANN", price: 90, kdv: 0, exemption: "302" }],
    payments: [],
    source: "By hand",
  },
  {
    id: "i405",
    kind: "invoice",
    number: "ACM2026000000405",
    customer: "c5",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "SATIS",
    status: "delivered",
    issued: "1 Oct 2026",
    due: "31 Oct 2026",
    late: 8,
    currency: "TRY",
    lines: [{ id: "l1", product: "p2", name: "Acme Books Pro, 6 users, October", qty: 6, unit: "ANN", price: 208.33, kdv: 20 }],
    payments: [],
    source: "Recurring: every month",
  },
  {
    id: "i412",
    kind: "invoice",
    number: "ACM2026000000412",
    customer: "c6",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "SATIS",
    status: "refused",
    issued: "6 Nov 2026",
    due: "21 Dec 2026",
    late: -43,
    currency: "TRY",
    lines: [{ id: "l1", product: "p1", name: "Acme Books Business, 12 users, 12 months", qty: 12, unit: "ANN", price: 3750, kdv: 20 }],
    payments: [],
    source: "CRM deal: 12 users",
    detail: "Nilvera: the buyer's tax office is missing (TaxScheme/Name).",
  },
  {
    id: "c014",
    kind: "credit_note",
    number: "ACM2026000000398",
    customer: "c5",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "IADE",
    status: "delivered",
    issued: "20 Sep 2026",
    due: null,
    late: 0,
    currency: "TRY",
    lines: [{ id: "l1", name: "Acme Books Pro, 1 user returned", qty: 1, unit: "ANN", price: 2500, kdv: 20 }],
    payments: [],
    source: "Credit note",
    of: "ACM2026000000377",
  },
  {
    id: "a179",
    kind: "invoice",
    number: "ACA2026000000179",
    customer: "c4",
    channel: "e-arsiv",
    profile: "EARSIVFATURA",
    type: "SATIS",
    status: "cancelled",
    issued: "2 Oct 2026",
    due: "1 Nov 2026",
    late: 0,
    currency: "TRY",
    lines: [{ id: "l1", product: "p2", name: "Acme Books Pro, 8 users, 12 months", qty: 8, unit: "ANN", price: 2500, kdv: 20 }],
    payments: [],
    source: "By hand",
    detail: "Cancelled the same day: issued without the setup lines.",
  },
  {
    id: "d1",
    kind: "invoice",
    number: null,
    customer: "c8",
    channel: "e-fatura",
    profile: "TEMELFATURA",
    type: "SATIS",
    status: "draft",
    issued: null,
    due: null,
    late: 0,
    currency: "TRY",
    lines: [{ id: "l1", product: "p2", name: "Acme Books Pro, 5 users, 12 months", qty: 5, unit: "ANN", price: 2500, kdv: 20 }],
    payments: [],
    source: "Recurring: every 3 months, kept as a draft",
  },
];

const inTry = (i: Invoice, n: number) => (i.rate ? round2(n * i.rate.value) : n);

/* -------------------------------------------------------------- overview */

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];
const BY_MONTH = [
  [612000, 0],
  [548000, 0],
  [489000, 12000],
  [701000, 63000],
  [826000, 235400],
  [93000, 330000],
];

function OverviewPage({ invoices, onOpen }: { invoices: Invoice[]; onOpen: (id: string) => void }) {
  const owed = invoices.filter((i) => balance(i) > 0);
  const overdue = owed.filter((i) => i.late > 0);
  const sum = (xs: Invoice[]) => xs.reduce((n, i) => n + inTry(i, balance(i)), 0);
  const byCustomer = CUSTOMERS.map((c) => {
    const mine = owed.filter((i) => i.customer === c.id);
    return {
      id: c.id,
      name: c.name,
      owed: sum(mine),
      overdue: sum(mine.filter((i) => i.late > 0)),
      invoices: mine.length,
      oldest: Math.max(0, ...mine.map((i) => i.late)),
    };
  }).filter((r) => r.invoices);
  return (
    <>
      <PageHeader
        title="Overview"
        description="What customers owe and what is late, in TL; invoices in other currencies count at the TCMB rate they were issued at."
      />
      <KpiGrid minWidth={170} className="mb-2.5">
        <KpiCard label="Owed" value={money(sum(owed))} delta={{ label: `${owed.length} invoices`, intent: "neutral" }} />
        <KpiCard label="Overdue" value={money(sum(overdue))} tone="danger" delta={{ label: `${overdue.length} invoices, oldest 24 days`, intent: "bad" }} />
        <KpiCard label="Collected in November" value={money(200000)} delta={{ label: "1 payment, matched from the bank", intent: "neutral" }} />
        <KpiCard label="Average days to pay" value="27" delta={{ label: "-3 vs. last quarter", direction: "down", intent: "good" }} />
        <KpiCard label="Waiting on you" value="2" tone="warning" delta={{ label: "1 refused, 1 draft", intent: "neutral" }} />
      </KpiGrid>
      <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Invoiced by month" description="By issue month, without KDV: paid and still owed">
          <StackedBarChart
            label="Invoiced by month, paid and owed"
            categories={MONTHS}
            segments={[
              { id: "paid", name: "Paid", color: "var(--oa-success)" },
              { id: "owed", name: "Still owed", color: "var(--oa-warning)" },
            ]}
            values={BY_MONTH}
            height={200}
            xTicks={6}
            format={(v) => money(v)}
          />
        </Panel>
        <Panel title="Owed by age" description="Days past the due day">
          <BarList
            label="Owed by age"
            format={(v) => money(v)}
            items={[
              { id: "current", label: "Not due yet", value: sum(owed.filter((i) => i.late <= 0)) },
              { id: "1-30", label: "1 to 30 days", value: sum(overdue.filter((i) => i.late <= 30)) },
              { id: "31-60", label: "31 to 60 days", value: 0 },
              { id: "60+", label: "Over 60 days", value: 0 },
            ]}
          />
        </Panel>
      </div>
      <Panel title="Owed by customer" flush>
        <DataTable
          label="Owed by customer"
          rows={byCustomer}
          getRowId={(r) => r.id}
          defaultSort={{ id: "owed", direction: "desc" }}
          minWidth={640}
          columns={[
            { id: "name", header: "Customer", sortValue: (r) => r.name, cell: (r) => <span className="font-medium">{r.name}</span> },
            { id: "invoices", header: "Invoices", align: "right", mono: true, cell: (r) => r.invoices },
            { id: "owed", header: "Owed", align: "right", mono: true, sortValue: (r) => r.owed, cell: (r) => money(r.owed) },
            {
              id: "overdue",
              header: "Overdue",
              align: "right",
              mono: true,
              sortValue: (r) => r.overdue,
              cell: (r) => (r.overdue ? <span className="text-danger-text">{money(r.overdue)}</span> : <span className="text-fg-muted">–</span>),
            },
            {
              id: "oldest",
              header: "Oldest",
              cell: (r) => {
                const late = owed.filter((i) => i.customer === r.id && i.late > 0)[0];
                return late ? (
                  <button type="button" onClick={() => onOpen(late.id)} className="text-left text-xs hover:underline">
                    {late.number}, {r.oldest} days late
                  </button>
                ) : (
                  <span className="text-xs text-fg-muted">Not due yet</span>
                );
              },
            },
          ]}
        />
      </Panel>
    </>
  );
}

/* --------------------------------------------------------------- invoice */

function Totals({ lines, currency, rate }: { lines: Line[]; currency: string; rate?: Invoice["rate"] }) {
  const t = totals(lines);
  const w = lines.find((l) => l.withholding);
  const wMeta = WITHHOLDING.find((x) => x.code === w?.withholding);
  const kdvRates = [...new Set(lines.map((l) => l.kdv))];
  return (
    <section aria-label="Totals" className="ml-auto w-full max-w-sm px-3 py-2">
      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 text-sm">
        <dt className="text-fg-muted">Total without KDV</dt>
        <dd className="text-right font-mono">{money(t.net, currency)}</dd>
        <dt className="text-fg-muted">KDV {kdvRates.map((r) => `${r}%`).join(", ")}</dt>
        <dd className="text-right font-mono">{money(t.kdv, currency)}</dd>
        {t.withheld > 0 && wMeta && (
          <>
            <dt className="text-fg-muted">
              KDV withheld ({wMeta.code}, {wMeta.tenths}/10)
            </dt>
            <dd className="text-right font-mono">−{money(t.withheld, currency)}</dd>
          </>
        )}
        <dt className="font-semibold">To pay</dt>
        <dd className="text-right font-mono font-semibold">{money(t.payable, currency)}</dd>
        {rate && (
          <>
            <dt className="text-fg-muted">In TL at TCMB {rate.value.toFixed(4)}</dt>
            <dd className="text-right font-mono">{money(round2(t.payable * rate.value))}</dd>
          </>
        )}
      </dl>
    </section>
  );
}

function LinesTable({ lines, currency }: { lines: Line[]; currency: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <caption className="sr-only">Invoice lines</caption>
        <thead className="bg-canvas text-xs text-fg-muted">
          <tr>
            <th className="px-3 py-1.5 font-semibold">Item</th>
            <th className="px-3 py-1.5 text-right font-semibold">Qty</th>
            <th className="px-3 py-1.5 text-right font-semibold">Price</th>
            <th className="px-3 py-1.5 text-right font-semibold">KDV</th>
            <th className="px-3 py-1.5 text-right font-semibold">Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((l) => (
            <tr key={l.id} className="border-t border-line">
              <td className="px-3 py-1.5">
                {l.name}
                {l.withholding && <span className="block text-2xs text-fg-muted">Tevkifat {l.withholding}</span>}
                {l.exemption && <span className="block text-2xs text-fg-muted">Exempt: 302, 11/1-a hizmet ihracatı</span>}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-xs">
                {l.qty} {UNITS[l.unit].toLowerCase()}
              </td>
              <td className="px-3 py-1.5 text-right font-mono text-xs">{money(l.price, currency)}</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs">{l.kdv}%</td>
              <td className="px-3 py-1.5 text-right font-mono text-xs">{money(round2(l.qty * l.price), currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const REMINDERS = [
  { id: "r1", when: "25 Nov, 09:00", kind: "3 days before the due day", state: "Planned" },
  { id: "r2", when: "29 Nov, 09:00", kind: "1 day after, while unpaid", state: "Planned" },
  { id: "r3", when: "5 Dec, 09:00", kind: "7 days after, while unpaid", state: "Planned" },
  { id: "r4", when: "28 Dec, 09:00", kind: "30 days after, while unpaid", state: "Planned" },
];

function InvoiceView({
  invoice,
  onBack,
  onChange,
  onCreditNote,
}: {
  invoice: Invoice;
  onBack: () => void;
  onChange: (i: Invoice) => void;
  onCreditNote: (i: Invoice) => void;
}) {
  const [paying, setPaying] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<Payment["method"]>("bank");
  const [crediting, setCrediting] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const c = customerOf(invoice.customer);
  const t = totals(invoice.lines);
  const left = balance(invoice);
  const s = STATUS[invoice.status];
  const credit = invoice.kind === "credit_note";
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Invoices", href: "#invoices" }, { label: invoice.number ?? "Draft" }]}
        title={`${credit ? "Credit note" : "Invoice"} ${invoice.number ?? "draft"}`}
        meta={
          <>
            <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
            {left > 0 && invoice.late > 0 && <StatusBadge tone="danger">{invoice.late} days late</StatusBadge>}
          </>
        }
        description={`${c.name} · ${invoice.channel === "e-fatura" ? "e-Fatura" : "e-Arşiv"}, ${invoice.profile}, ${invoice.type} · ${invoice.source}`}
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onBack}>
              Back to invoices
            </Button>
            {invoice.status === "refused" && (
              <Button
                variant="primary"
                icon={<Send />}
                onClick={() => {
                  onChange({ ...invoice, status: "queued", detail: undefined });
                  setNotice(`Sent again under ${invoice.number} with the tax office filled in.`);
                }}
              >
                Fix and send again
              </Button>
            )}
            {!credit && OWED.includes(invoice.status) && (
              <>
                <Button icon={<FileMinus />} onClick={() => setCrediting(true)}>
                  Credit note
                </Button>
                <Button icon={<Mail />} onClick={() => setNotice(`Reminder emailed to ${c.email} with the PDF and the XML.`)}>
                  Send a reminder
                </Button>
                {left > 0 && (
                  <Button
                    variant="primary"
                    icon={<Banknote />}
                    onClick={() => {
                      setAmount(String(left));
                      setPaying(true);
                    }}
                  >
                    Record a payment
                  </Button>
                )}
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
      {invoice.detail && (
        <Callout
          tone={invoice.status === "refused" ? "danger" : "info"}
          title={invoice.status === "refused" ? "The integrator refused it" : "Note"}
          className="mb-2.5"
        >
          {invoice.detail} {invoice.status === "refused" && "Nothing reached GİB, so the invoice can be fixed and sent again under the same number."}
        </Callout>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <KpiGrid minWidth={150}>
            <KpiCard label="To pay" value={money(t.payable, invoice.currency)} />
            <KpiCard label="Paid" value={money(paid(invoice), invoice.currency)} />
            <KpiCard label="Left" value={money(left, invoice.currency)} tone={left > 0 && invoice.late > 0 ? "danger" : undefined} />
            <KpiCard label="Due" value={invoice.due ?? "–"} unit={invoice.due ? `${c.terms} days` : undefined} />
          </KpiGrid>
          <Panel
            title="Lines"
            aria-label="Lines"
            actions={
              <>
                <Button size="sm" icon={<FileDown />}>
                  PDF
                </Button>
                <Button size="sm" icon={<FileCode />}>
                  UBL-TR XML
                </Button>
              </>
            }
            flush
          >
            <LinesTable lines={invoice.lines} currency={invoice.currency} />
            <div className="border-t border-line">
              <Totals lines={invoice.lines} currency={invoice.currency} rate={invoice.rate} />
            </div>
          </Panel>
          {!credit && (
            <Panel title="Payments" aria-label="Payments" flush>
              <DataTable
                label="Payments"
                rows={invoice.payments}
                getRowId={(p) => p.id}
                minWidth={520}
                empty={<p className="px-3 py-3 text-sm text-fg-muted">No payments yet.</p>}
                columns={[
                  { id: "date", header: "Date", cell: (p) => p.date },
                  { id: "amount", header: "Amount", align: "right", mono: true, cell: (p) => money(p.amount, invoice.currency) },
                  { id: "method", header: "How", cell: (p) => <Badge>{p.method}</Badge> },
                  { id: "note", header: "Note", cell: (p) => <span className="text-fg-muted">{p.note}</span> },
                ]}
              />
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          <Panel title="At GİB" description="Through Nilvera, the integrator in invoices.yaml">
            <ol aria-label="Sending" className="flex flex-col gap-1.5 text-xs">
              {[
                { label: "Drafted", by: `${ME}, from ${invoice.source}`, done: true },
                { label: `Numbered ${invoice.number ?? ""}`, by: invoice.issued ?? "On issue", done: !!invoice.number },
                { label: "Sent to the integrator", by: "UBL-TR XML checked first", done: invoice.status !== "draft" && invoice.status !== "refused" },
                {
                  label: invoice.channel === "e-fatura" ? "Delivered to the buyer" : "Reported to GİB",
                  by: s.means,
                  done: OWED.slice(2).includes(invoice.status),
                },
              ].map((x) => (
                <li key={x.label} className="flex items-start gap-2">
                  <span aria-hidden className={cn("mt-1 size-2 shrink-0 rounded-full", x.done ? "bg-success" : "bg-line-strong")} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-fg">
                      {x.label}
                      <span className="sr-only">{x.done ? ", done" : ", not yet"}</span>
                    </span>
                    <span className="text-2xs text-fg-muted">{x.by}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
          <Panel title="Buyer">
            <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
              <dt className="text-fg-muted">Name</dt>
              <dd className="text-fg">{c.name}</dd>
              <dt className="text-fg-muted">{c.taxId.length === 11 ? "TCKN" : "VKN"}</dt>
              <dd className="font-mono text-fg">{c.taxId}</dd>
              <dt className="text-fg-muted">Tax office</dt>
              <dd className="text-fg">{c.taxOffice || "Missing"}</dd>
              <dt className="text-fg-muted">Mailbox</dt>
              <dd className="truncate font-mono text-2xs text-fg">{c.alias ?? "Not an e-Fatura user"}</dd>
            </dl>
          </Panel>
          {!credit && OWED.includes(invoice.status) && left > 0 && (
            <Panel title="Reminders" description="Days in invoices.yaml, sent while it is unpaid">
              <ul aria-label="Reminders" className="flex flex-col gap-1 text-xs">
                {(invoice.late > 0
                  ? [
                      { id: "s1", when: "16 Oct", kind: "1 day after", state: "Sent" },
                      { id: "s2", when: "22 Oct", kind: "7 days after", state: "Sent" },
                      { id: "s3", when: "14 Nov, 09:00", kind: "30 days after", state: "Planned" },
                    ]
                  : REMINDERS
                ).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span>
                      {r.when} · <span className="text-fg-muted">{r.kind}</span>
                    </span>
                    <Badge tone={r.state === "Sent" ? "success" : "neutral"}>{r.state}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>
      </div>
      <Dialog
        open={paying}
        onOpenChange={setPaying}
        title={`Record a payment for ${invoice.number}`}
        description={`Left to pay: ${money(left, invoice.currency)}. A part payment leaves the rest owed.`}
        onSubmit={(e) => {
          e.preventDefault();
          const n = Number(amount.replace(/,/g, ""));
          if (!(n > 0) || n > left) return;
          onChange({ ...invoice, payments: [...invoice.payments, { id: `pay${Date.now()}`, date: "8 Nov 2026", amount: n, method, note: `By ${ME}` }] });
          setNotice(
            n === left
              ? `Paid in full. Reminders for ${invoice.number} are stopped.`
              : `Recorded ${money(n, invoice.currency)}. ${money(round2(left - n), invoice.currency)} is still owed.`,
          );
          setPaying(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setPaying(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Record
            </Button>
          </>
        }
      >
        <TextField
          label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          mono
          adornment={<span className="text-xs text-fg-muted">{invoice.currency}</span>}
        />
        <SelectField
          label="How"
          value={method}
          onChange={(e) => setMethod(e.target.value as Payment["method"])}
          options={[
            { value: "bank", label: "Bank transfer" },
            { value: "cash", label: "Cash" },
            { value: "card", label: "Card" },
            { value: "other", label: "Other" },
          ]}
        />
      </Dialog>
      <Dialog
        open={crediting}
        onOpenChange={setCrediting}
        title={`Credit note for ${invoice.number}`}
        description="A sent invoice is never changed. The credit note is an IADE invoice that names this one; it is drafted, then issued like any invoice."
        footer={
          <>
            <Button type="button" onClick={() => setCrediting(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setCrediting(false);
                onCreditNote(invoice);
              }}
            >
              Draft the credit note
            </Button>
          </>
        }
      >
        <p className="text-sm">The draft starts with every line of {invoice.number}. Take out what stays, or lower the quantities, before you issue it.</p>
      </Dialog>
    </>
  );
}

/* ----------------------------------------------------------- new invoice */

const NEXT = { "e-fatura": "ACM2026000000413", "e-arsiv": "ACA2026000000187" } as const;

function NewInvoice({ onCancel, onIssued, draft }: { onCancel: () => void; onIssued: (i: Invoice) => void; draft?: Invoice }) {
  const [customer, setCustomer] = useState(draft?.customer ?? "c2");
  const [lines, setLines] = useState<Line[]>(
    draft?.lines.map((l) => ({ ...l, qty: l.qty })) ?? [{ id: "n1", product: "p4", name: "Consulting", qty: 10, unit: "HUR", price: 2400, kdv: 20 }],
  );
  const [confirming, setConfirming] = useState(false);
  const c = customerOf(customer);
  const channel = c.eFatura ? "e-fatura" : "e-arsiv";
  const credit = draft?.kind === "credit_note";
  const set = (id: string, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  const t = totals(lines);
  const number = NEXT[channel];
  const invoice: Invoice = {
    id: draft?.id ?? "new",
    kind: credit ? "credit_note" : "invoice",
    number,
    customer,
    channel,
    profile: channel === "e-fatura" ? "TEMELFATURA" : "EARSIVFATURA",
    type: credit ? "IADE" : lines.some((l) => l.withholding) ? "TEVKIFAT" : "SATIS",
    status: "queued",
    issued: "8 Nov 2026",
    due: credit ? null : "8 Dec 2026",
    late: -30,
    currency: "TRY",
    lines,
    payments: [],
    source: credit ? "Credit note" : "By hand",
    of: draft?.of,
  };
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Invoices", href: "#invoices" }, { label: credit ? "New credit note" : "New invoice" }]}
        title={credit ? `Credit note for ${draft?.of}` : "New invoice"}
        meta={<StatusBadge tone="neutral">Draft</StatusBadge>}
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onCancel}>
              Back to invoices
            </Button>
            <Button variant="primary" icon={<Send />} disabled={!lines.length || t.payable <= 0} onClick={() => setConfirming(true)}>
              Issue
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel
          title="Lines"
          aria-label="Lines"
          actions={
            !credit && (
              <Button
                size="sm"
                icon={<Plus />}
                onClick={() =>
                  setLines((ls) => [
                    ...ls,
                    { id: `n${ls.length + 1}`, product: "p3", name: "Onboarding and training", qty: 1, unit: "C62", price: 45000, kdv: 20 },
                  ])
                }
              >
                Add line
              </Button>
            )
          }
          flush
        >
          <ul aria-label="Draft lines" className="flex flex-col">
            {lines.map((l, i) => (
              <li
                key={l.id}
                className="grid gap-2 border-b border-subtle px-3 py-2.5 md:grid-cols-[minmax(0,2fr)_80px_120px_90px_minmax(0,1.4fr)_auto] md:items-end"
              >
                <SelectField
                  label={`Line ${i + 1}`}
                  value={l.product ?? ""}
                  disabled={credit}
                  onChange={(e) => {
                    const p = PRODUCTS.find((x) => x.id === e.target.value);
                    if (p) set(l.id, { product: p.id, name: p.name, unit: p.unit, price: p.price, kdv: p.kdv, withholding: undefined });
                  }}
                  options={[
                    ...(l.product ? [] : [{ value: "", label: l.name }]),
                    ...PRODUCTS.filter((p) => p.currency === "TRY").map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
                <TextField label="Qty" mono value={String(l.qty)} onChange={(e) => set(l.id, { qty: Number(e.target.value) || 0 })} />
                <TextField label="Price" mono value={String(l.price)} disabled={credit} onChange={(e) => set(l.id, { price: Number(e.target.value) || 0 })} />
                <SelectField
                  label="KDV"
                  value={String(l.kdv)}
                  disabled={credit}
                  onChange={(e) => set(l.id, { kdv: Number(e.target.value) })}
                  options={[0, 1, 10, 20].map((r) => ({ value: String(r), label: `${r}%` }))}
                />
                <SelectField
                  label="Tevkifat"
                  value={l.withholding ?? ""}
                  disabled={credit}
                  onChange={(e) => set(l.id, { withholding: e.target.value || undefined })}
                  options={[{ value: "", label: "None" }, ...WITHHOLDING.map((w) => ({ value: w.code, label: `${w.code}, ${w.tenths}/10: ${w.name}` }))]}
                />
                <IconButton label={`Remove line ${i + 1}`} size="sm" onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}>
                  <Trash2 className="size-3.5" />
                </IconButton>
              </li>
            ))}
          </ul>
          <Totals lines={lines} currency="TRY" />
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Customer" aria-label="Customer">
            <div className="flex flex-col gap-2">
              <SelectField
                label="Customer"
                value={customer}
                disabled={credit}
                onChange={(e) => setCustomer(e.target.value)}
                options={CUSTOMERS.filter((x) => x.currency === "TRY").map((x) => ({ value: x.id, label: x.name }))}
              />
              <p className="flex flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
                <Badge tone="info">{channel === "e-fatura" ? "e-Fatura" : "e-Arşiv"}</Badge>
                {c.eFatura
                  ? `An e-Fatura user: goes to ${c.alias?.replace("urn:mail:", "")}`
                  : c.eFatura === false
                    ? "Not an e-Fatura user: goes as e-Arşiv, with the PDF by email"
                    : "Not checked yet: goes as e-Arşiv unless the integrator says otherwise"}
              </p>
              <p className="text-xs text-fg-muted">
                Next number: <span className="font-mono">{number}</span>, given only when it is issued.
              </p>
            </div>
          </Panel>
          <Callout tone="info" title="Before you issue">
            The UBL-TR XML is checked first. Once issued, the invoice is never changed; a credit note corrects it.
          </Callout>
        </div>
      </div>
      <Dialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Issue ${number}?`}
        description={`${channel === "e-fatura" ? "e-Fatura" : "e-Arşiv"} to ${c.name}, ${money(t.payable)} to pay. It goes to Nilvera now and is emailed with its PDF.`}
        footer={
          <>
            <Button type="button" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={() => onIssued(invoice)}>
              Issue {number}
            </Button>
          </>
        }
      />
    </>
  );
}

/* -------------------------------------------------------------- invoices */

type Filter = "all" | "owed" | "overdue" | "drafts" | "credit";

function InvoicesPage({
  invoices,
  setInvoices,
  open,
  setOpen,
  initialNew,
}: {
  invoices: Invoice[];
  setInvoices: (fn: (is: Invoice[]) => Invoice[]) => void;
  open: string | null;
  setOpen: (id: string | null) => void;
  initialNew?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [making, setMaking] = useState<boolean | Invoice>(initialNew ?? false);
  const invoice = invoices.find((i) => i.id === open);
  if (making)
    return (
      <NewInvoice
        draft={typeof making === "object" ? making : undefined}
        onCancel={() => setMaking(false)}
        onIssued={(i) => {
          const id = i.id === "new" ? `i${Date.now()}` : i.id;
          setInvoices((is) => [{ ...i, id }, ...is.filter((x) => x.id !== i.id)]);
          setMaking(false);
          setOpen(id);
        }}
      />
    );
  if (invoice)
    return (
      <InvoiceView
        invoice={invoice}
        onBack={() => setOpen(null)}
        onChange={(i) => setInvoices((is) => is.map((x) => (x.id === i.id ? i : x)))}
        onCreditNote={(i) =>
          setMaking({
            ...i,
            id: `cn-${i.id}`,
            kind: "credit_note",
            number: null,
            status: "draft",
            type: "IADE",
            payments: [],
            of: i.number ?? undefined,
          })
        }
      />
    );
  const rows = invoices.filter((i) => {
    const q = `${i.number ?? "draft"} ${customerOf(i.customer).name}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"));
    if (!q) return false;
    if (filter === "owed") return balance(i) > 0;
    if (filter === "overdue") return balance(i) > 0 && i.late > 0;
    if (filter === "drafts") return i.status === "draft" || i.status === "refused";
    if (filter === "credit") return i.kind === "credit_note";
    return true;
  });
  const cols: Column<Invoice>[] = [
    {
      id: "number",
      header: "Number",
      width: "22%",
      cell: (i) => (
        <button
          type="button"
          onClick={() => (i.status === "draft" ? setMaking(i) : setOpen(i.id))}
          className="text-left font-mono text-xs text-fg hover:underline"
        >
          {i.number ?? "Draft"}
        </button>
      ),
    },
    {
      id: "customer",
      header: "Customer",
      sortValue: (i) => customerOf(i.customer).name,
      cell: (i) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate">{customerOf(i.customer).name}</span>
          <span className="text-2xs text-fg-muted">
            {i.kind === "credit_note" ? `Credit note for ${i.of}` : `${i.channel === "e-fatura" ? "e-Fatura" : "e-Arşiv"} · ${i.type}`}
          </span>
        </span>
      ),
    },
    { id: "status", header: "State", cell: (i) => <StatusBadge tone={STATUS[i.status].tone}>{STATUS[i.status].label}</StatusBadge> },
    { id: "issued", header: "Issued", cell: (i) => i.issued ?? "–" },
    {
      id: "due",
      header: "Due",
      sortValue: (i) => i.late,
      cell: (i) =>
        balance(i) > 0 && i.late > 0 ? <span className="text-danger-text">{i.late} days late</span> : <span className="text-fg-muted">{i.due ?? "–"}</span>,
    },
    {
      id: "total",
      header: "To pay",
      align: "right",
      mono: true,
      cell: (i) => `${i.kind === "credit_note" ? "−" : ""}${money(totals(i.lines).payable, i.currency)}`,
    },
    {
      id: "left",
      header: "Left",
      align: "right",
      mono: true,
      sortValue: (i) => inTry(i, balance(i)),
      cell: (i) => (balance(i) ? money(balance(i), i.currency) : "–"),
    },
  ];
  return (
    <>
      <PageHeader
        title="Invoices"
        description="Invoices and credit notes, with their state at GİB and what is left to pay. One series per channel and year: ACM for e-Fatura, ACA for e-Arşiv."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setMaking(true)}>
            New invoice
          </Button>
        }
      />
      <div className="mb-2.5 flex flex-wrap items-end gap-2">
        <SegmentedControl
          label="Show"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All" },
            { value: "owed", label: "Owed" },
            { value: "overdue", label: "Overdue" },
            { value: "drafts", label: "Needs you" },
            { value: "credit", label: "Credit notes" },
          ]}
        />
        <SearchInput label="Search invoices" placeholder="Number or customer" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
      </div>
      <Panel flush>
        <DataTable label="Invoices" columns={cols} rows={rows} getRowId={(i) => i.id} minWidth={900} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------- customers */

function CustomersPage({ invoices }: { invoices: Invoice[] }) {
  const [customers, setCustomers] = useState(CUSTOMERS);
  const [notice, setNotice] = useState<string | null>(null);
  const cols: Column<Customer>[] = [
    {
      id: "name",
      header: "Customer",
      width: "26%",
      sortValue: (c) => c.name,
      cell: (c) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{c.name}</span>
          <span className="truncate text-2xs text-fg-muted">{c.email}</span>
        </span>
      ),
    },
    {
      id: "tax",
      header: "Tax number",
      cell: (c) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs">{c.taxId}</span>
          <span className="text-2xs text-fg-muted">{c.taxOffice ? `${c.taxOffice}, ${c.city}` : `Tax office missing, ${c.city}`}</span>
        </span>
      ),
    },
    {
      id: "efatura",
      header: "e-Fatura",
      description: "Whether GİB lists them as an e-Fatura user, asked through the integrator. Others get e-Arşiv.",
      cell: (c) =>
        c.eFatura === null ? (
          <Button
            size="xs"
            onClick={() => {
              setCustomers((cs) => cs.map((x) => (x.id === c.id ? { ...x, eFatura: true, alias: "urn:mail:defaultpk@erturizm.example.com" } : x)));
              setNotice(`${c.name} is an e-Fatura user since 2021. Their invoices go as e-Fatura from now on.`);
            }}
          >
            Check
          </Button>
        ) : c.eFatura ? (
          <StatusBadge tone="success">User</StatusBadge>
        ) : (
          <StatusBadge tone="neutral">e-Arşiv</StatusBadge>
        ),
    },
    { id: "terms", header: "Terms", align: "right", mono: true, cell: (c) => `${c.terms} d` },
    { id: "currency", header: "Currency", cell: (c) => c.currency },
    {
      id: "owed",
      header: "Owed",
      align: "right",
      mono: true,
      sortValue: (c) => invoices.filter((i) => i.customer === c.id).reduce((n, i) => n + inTry(i, balance(i)), 0),
      cell: (c) => {
        const n = invoices.filter((i) => i.customer === c.id).reduce((s, i) => s + balance(i), 0);
        return n ? money(n, c.currency) : "–";
      },
    },
  ];
  return (
    <>
      <PageHeader
        title="Customers"
        description="Who you invoice, with their tax number and office, payment terms and currency. A won deal in CRM brings its company here."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New customer
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <Panel flush>
        <DataTable label="Customers" columns={cols} rows={customers} getRowId={(c) => c.id} minWidth={860} />
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- products */

function ProductsPage() {
  return (
    <>
      <PageHeader
        title="Products"
        description="Products and services with their unit, price and KDV. A product on an issued invoice is taken off the list, not deleted."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New product
          </Button>
        }
      />
      <Panel flush>
        <DataTable
          label="Products"
          rows={PRODUCTS}
          getRowId={(p) => p.id}
          minWidth={760}
          columns={[
            { id: "code", header: "Code", mono: true, cell: (p) => p.code },
            { id: "name", header: "Name", sortValue: (p) => p.name, cell: (p) => p.name },
            { id: "unit", header: "Unit", cell: (p) => `${UNITS[p.unit]} (${p.unit})` },
            { id: "price", header: "Price", align: "right", mono: true, sortValue: (p) => p.price, cell: (p) => money(p.price, p.currency) },
            { id: "kdv", header: "KDV", align: "right", mono: true, cell: (p) => (p.kdv ? `${p.kdv}%` : "0%, exempt 302") },
            { id: "w", header: "Tevkifat", cell: (p) => (p.withholding ? <Badge>{p.withholding}, 9/10</Badge> : <span className="text-fg-muted">–</span>) },
          ]}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------- recurring */

const RECURRING = [
  { id: "r1", customer: "c5", what: "Acme Books Pro, 6 users", every: "Every month", next: "1 Dec 2026", amount: 1499.98, issue: true },
  { id: "r2", customer: "c8", what: "Acme Books Pro, 5 users", every: "Every 3 months", next: "1 Jan 2027", amount: 15000, issue: false },
  { id: "r3", customer: "c1", what: "Acme Books Business, 68 users", every: "Every 12 months", next: "29 Oct 2027", amount: 306000, issue: true },
];

function RecurringPage() {
  const [rows, setRows] = useState(RECURRING);
  return (
    <>
      <PageHeader
        title="Recurring"
        description="Invoices made every few months from the same lines. Each is issued on its day, or kept as a draft for someone to check first."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New recurring invoice
          </Button>
        }
      />
      <Panel flush>
        <DataTable
          label="Recurring invoices"
          rows={rows}
          getRowId={(r) => r.id}
          minWidth={820}
          columns={[
            {
              id: "customer",
              header: "Customer",
              cell: (r) => (
                <span className="flex flex-col">
                  <span className="font-medium">{customerOf(r.customer).name}</span>
                  <span className="text-2xs text-fg-muted">{r.what}</span>
                </span>
              ),
            },
            { id: "every", header: "Every", cell: (r) => r.every },
            { id: "next", header: "Next", cell: (r) => r.next },
            { id: "amount", header: "To pay", align: "right", mono: true, cell: (r) => money(r.amount) },
            {
              id: "issue",
              header: "On the day",
              cell: (r) => (
                <Switch
                  label={r.issue ? "Issue it" : "Keep a draft"}
                  checked={r.issue}
                  onCheckedChange={(v) => setRows((rs) => rs.map((x) => (x.id === r.id ? { ...x, issue: v } : x)))}
                />
              ),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ bank */

interface BankLine {
  id: string;
  date: string;
  amount: number;
  text: string;
  state: "matched" | "unmatched" | "ignored" | "outgoing";
  invoice?: string;
}

const BANK: BankLine[] = [
  { id: "b1", date: "6 Nov", amount: 200000, text: "AVCI LOJISTIK AS ACM2026000000409 KISMI ODEME", state: "matched", invoice: "ACM2026000000409" },
  { id: "b2", date: "6 Nov", amount: 18000, text: "EFT KAYA ECZANE ELIF KAYA", state: "unmatched" },
  { id: "b3", date: "5 Nov", amount: 30000, text: "POLAT GIDA SAN FATURA ODEMESI", state: "unmatched" },
  { id: "b4", date: "5 Nov", amount: -42500, text: "OFIS KIRASI KASIM", state: "outgoing" },
  { id: "b5", date: "4 Nov", amount: 312.4, text: "MEVDUAT FAIZI", state: "ignored" },
];

const BANK_TONE = { matched: "success", unmatched: "warning", ignored: "neutral", outgoing: "neutral" } as const;

function BankPage({ invoices, setInvoices }: { invoices: Invoice[]; setInvoices: (fn: (is: Invoice[]) => Invoice[]) => void }) {
  const [lines, setLines] = useState(BANK);
  const [matching, setMatching] = useState<BankLine | null>(null);
  const [pick, setPick] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const owed = invoices.filter((i) => balance(i) > 0 && i.currency === "TRY");
  return (
    <>
      <PageHeader
        title="Bank"
        description="Statements imported from your bank. A line that names an invoice number, or pays exactly what a customer owes and names them, is matched by itself; the rest wait for you."
        actions={<Button icon={<Upload />}>Import a statement</Button>}
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <Panel title="Garanti TL" description="TR33 0006 1005 1978 6457 8413 26 · garanti-2026-11-06.csv, imported today" flush>
        <DataTable
          label="Bank lines"
          rows={lines}
          getRowId={(l) => l.id}
          minWidth={820}
          columns={[
            { id: "date", header: "Date", cell: (l) => l.date },
            { id: "text", header: "Description", cell: (l) => <span className="font-mono text-xs">{l.text}</span> },
            { id: "amount", header: "Amount", align: "right", mono: true, cell: (l) => money(l.amount) },
            {
              id: "state",
              header: "State",
              cell: (l) =>
                l.state === "unmatched" ? (
                  <Button
                    size="xs"
                    onClick={() => {
                      setPick(owed.find((i) => i.customer === (l.text.includes("KAYA") ? "c4" : "c3"))?.id ?? owed[0]?.id ?? "");
                      setMatching(l);
                    }}
                  >
                    Match
                  </Button>
                ) : (
                  <StatusBadge tone={BANK_TONE[l.state]}>
                    {l.state === "matched" ? `Matched to ${l.invoice}` : l.state === "outgoing" ? "Outgoing" : "Ignored"}
                  </StatusBadge>
                ),
            },
          ]}
        />
      </Panel>
      <Dialog
        open={!!matching}
        onOpenChange={(o) => !o && setMatching(null)}
        title="Match a bank line"
        description={matching ? `${matching.date}, ${money(matching.amount)}: ${matching.text}` : undefined}
        footer={
          <>
            <Button
              type="button"
              onClick={() => {
                if (matching) setLines((ls) => ls.map((x) => (x.id === matching.id ? { ...x, state: "ignored" } : x)));
                setMatching(null);
              }}
            >
              Ignore the line
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                const inv = owed.find((i) => i.id === pick);
                if (matching && inv) {
                  setLines((ls) => ls.map((x) => (x.id === matching.id ? { ...x, state: "matched", invoice: inv.number ?? "" } : x)));
                  setInvoices((is) =>
                    is.map((x) =>
                      x.id === inv.id
                        ? {
                            ...x,
                            payments: [
                              ...x.payments,
                              { id: `pay-${matching.id}`, date: matching.date, amount: matching.amount, method: "bank", note: "Matched by hand" },
                            ],
                          }
                        : x,
                    ),
                  );
                  const left = round2(balance(inv) - matching.amount);
                  setNotice(`Matched to ${inv.number}. ${left > 0 ? `${money(left)} is still owed.` : "It is paid in full."}`);
                }
                setMatching(null);
              }}
            >
              Match
            </Button>
          </>
        }
      >
        <SelectField
          label="Invoice"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          options={owed.map((i) => ({ value: i.id, label: `${i.number}, ${customerOf(i.customer).name}, ${money(balance(i))} left` }))}
        />
      </Dialog>
    </>
  );
}

/* --------------------------------------------------------------- exports */

function ExportsPage() {
  const [period, setPeriod] = useState("2026-10");
  const [done, setDone] = useState<string | null>(null);
  const label = { "2026-09": "September 2026", "2026-10": "October 2026", "2026-11": "November 2026, so far" }[period];
  const files = [
    {
      id: "invoices",
      name: `invoices-${period}.csv`,
      text: "Every issued invoice and credit note: number, date, customer, VKN, net, KDV by rate, tevkifat, total",
      count: "41 invoices, 2 credit notes",
    },
    { id: "payments", name: `payments-${period}.csv`, text: "Payments received, with the invoice each one paid", count: "36 payments" },
    { id: "ubl", name: `ubl-${period}.zip`, text: "The UBL-TR XML of each invoice as it went to the integrator", count: "43 files" },
  ];
  return (
    <>
      <PageHeader
        title="Exports"
        description="For your accountant. Invoices does not keep the books; these files go into the accountant's program. CSV with ; and a decimal comma, as Excel in Turkish reads it."
      />
      <div className="mb-2.5 w-56">
        <SelectField
          label="Period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={[
            { value: "2026-09", label: "September 2026" },
            { value: "2026-10", label: "October 2026" },
            { value: "2026-11", label: "November 2026, so far" },
          ]}
        />
      </div>
      {done && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          Downloaded {done} for {label}.
        </div>
      )}
      <div className="grid gap-2.5 md:grid-cols-3">
        {files.map((f) => (
          <Panel
            key={f.id}
            title={f.name}
            aria-label={f.name}
            footer={f.count}
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
currency: TRY
language: tr
seller:
  name: Acme Yazılım A.Ş.
  tax_id: "1234567890"
  tax_office: Zincirlikuyu
  address:
    street: Büyükdere Cad. No:1
    district: Şişli
    city: İstanbul
    postal_code: "34394"
  email: fatura@example.com
  iban: TR33 0006 1005 1978 6457 8413 26
series:
  e_fatura: ACM
  e_arsiv: ACA
payment_terms: 30d
integrator:
  provider: nilvera
  api_key: INVOICES_INTEGRATOR_KEY
  profile: TEMELFATURA
  poll_every: 5m
exchange_rates:
  rate: forex_buying
reminders:
  before: [3d]
  after: [1d, 7d, 30d]
  at: "09:00"
email_on_issue: true
bank:
  garanti:
    name: Garanti TL
    iban: TR33 0006 1005 1978 6457 8413 26
    format: csv
crm:
  url: http://crm:8080
  token: INVOICES_CRM_TOKEN
  won_deals: draft`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="invoices"
      file="invoices.yaml"
      applied="3 days ago"
      yaml={YAML}
      groups={[
        {
          title: "Seller",
          description: "As every invoice names you.",
          items: [
            { label: "Name", value: "Acme Yazılım A.Ş.", path: "seller.name" },
            { label: "VKN and tax office", value: "1234567890, Zincirlikuyu", path: "seller.tax_id" },
          ],
        },
        {
          title: "Numbers and GİB",
          items: [
            { label: "Series", value: "ACM for e-Fatura, ACA for e-Arşiv; each starts again at 1 every year", path: "series" },
            { label: "Integrator", value: "Nilvera, TEMELFATURA, asked for news every 5 minutes", path: "integrator" },
            { label: "Currencies", value: "TCMB's forex buying rate of the last bulletin before the invoice's day", path: "exchange_rates.rate" },
          ],
        },
        {
          title: "Collecting",
          items: [
            { label: "Payment terms", value: "30 days unless the customer has their own", path: "payment_terms" },
            { label: "Reminders", value: "3 days before the due day; 1, 7 and 30 days after, at 09:00", path: "reminders" },
            { label: "Bank", value: "Garanti TL statements as CSV", path: "bank.garanti" },
            { label: "CRM", value: "Each deal won becomes a draft invoice", path: "crm.won_deals" },
          ],
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------- app */

function InvoicesApp({ initial, open: initialOpen = null, making }: { initial: string; open?: string | null; making?: boolean }) {
  const [invoices, setInvoices] = useState(INVOICES);
  const [open, setOpen] = useState<string | null>(initialOpen);
  const [jump, setJump] = useState({ page: initial, n: 0 });
  const pages: PageMap = {
    overview: () => (
      <OverviewPage
        invoices={invoices}
        onOpen={(id) => {
          setOpen(id);
          setJump((j) => ({ page: "invoices", n: j.n + 1 }));
        }}
      />
    ),
    invoices: () => <InvoicesPage invoices={invoices} setInvoices={setInvoices} open={open} setOpen={setOpen} initialNew={making} />,
    customers: () => <CustomersPage invoices={invoices} />,
    products: () => <ProductsPage />,
    recurring: () => <RecurringPage />,
    bank: () => <BankPage invoices={invoices} setInvoices={setInvoices} />,
    exports: () => <ExportsPage />,
    settings: () => <SettingsPage />,
  };
  // ProductApp keeps its own page state; a new key moves it to Invoices when the overview opens one.
  return <ProductApp key={jump.n} product="invoices" nav={nav} pages={pages} initial={jump.page} />;
}

const app = (initial: string, opts: { open?: string; making?: boolean } = {}): Story => ({
  render: () => <InvoicesApp initial={initial} open={opts.open} making={opts.making} />,
});

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();
const body = (el: HTMLElement) => within(el.ownerDocument.body);
const rowsOf = (t: HTMLElement) => within(t).getAllByRole("row").slice(1);

/* ----------------------------------------------------------------- stories */

export const Overview: Story = {
  ...app("overview"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Owed by customer" });
    await expect(rowsOf(table)[0]).toHaveTextContent("Avcı Lojistik A.Ş.");
    await userEvent.click(within(table).getByRole("button", { name: /ACM2026000000371/ }));
    await expect(c.getByRole("heading", { level: 1, name: "Invoice ACM2026000000371" })).toBeInTheDocument();
    await expect(c.getByText("24 days late")).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Invoices: Story = {
  ...app("invoices"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Invoices" });
    await expect(rowsOf(table)).toHaveLength(INVOICES.length);
    await userEvent.click(c.getByRole("radio", { name: "Overdue" }));
    await expect(rowsOf(table)).toHaveLength(3);
    await userEvent.click(c.getByRole("radio", { name: "Needs you" }));
    await expect(rowsOf(table)).toHaveLength(2);
    await userEvent.click(c.getByRole("radio", { name: "All" }));
    await userEvent.type(c.getByRole("searchbox", { name: "Search invoices" }), "ACA");
    await expect(rowsOf(table)).toHaveLength(3);
    blur(canvasElement);
  },
};

export const InvoicePage: Story = {
  name: "Invoice",
  ...app("invoices", { open: "i409" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Invoice lines" })).toHaveTextContent("Onboarding for the Mersin depot");
    await expect(c.getByLabelText("Totals")).toHaveTextContent("To pay360,000.00 TL");
    await expect(c.getByRole("table", { name: "Payments" })).toHaveTextContent("200,000.00 TL");
    await expect(c.getByRole("list", { name: "Reminders" })).toHaveTextContent("3 days before the due day");
    await expect(c.getByRole("list", { name: "Sending" })).toHaveTextContent("Delivered to the buyer, done");
  },
};

export const Withholding: Story = {
  name: "Invoice with tevkifat",
  ...app("invoices", { open: "i411" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const t = c.getByLabelText("Totals");
    await expect(t).toHaveTextContent("KDV 20%19,200.00 TL");
    await expect(t).toHaveTextContent("KDV withheld (602, 9/10)−17,280.00 TL");
    await expect(t).toHaveTextContent("To pay97,920.00 TL");
  },
};

export const ForeignCurrency: Story = {
  name: "Invoice in euros",
  ...app("invoices", { open: "a186" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "Invoice lines" })).toHaveTextContent("Exempt: 302");
    await expect(c.getByLabelText("Totals")).toHaveTextContent("In TL at TCMB 48.215052,072.20 TL");
  },
};

export const RecordPayment: Story = {
  name: "Record a payment",
  ...app("invoices", { open: "i409" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Record a payment" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Record a payment for ACM2026000000409" }));
    const amount = dialog.getByRole("textbox", { name: "Amount" });
    await expect(amount).toHaveValue("160000");
    await userEvent.clear(amount);
    await userEvent.type(amount, "60000");
    await userEvent.click(dialog.getByRole("button", { name: "Record" }));
    await expect(c.getByRole("status")).toHaveTextContent("Recorded 60,000.00 TL. 100,000.00 TL is still owed.");
    await expect(rowsOf(c.getByRole("table", { name: "Payments" }))).toHaveLength(2);
  },
};

export const RefusedInvoice: Story = {
  name: "Refused by the integrator",
  ...app("invoices", { open: "i412" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/the buyer's tax office is missing/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Fix and send again" }));
    await expect(c.getByRole("status")).toHaveTextContent("Sent again under ACM2026000000412");
    await expect(c.getAllByText("Queued")[0]).toBeInTheDocument();
  },
};

export const NewInvoicePage: Story = {
  name: "New invoice",
  ...app("invoices", { making: true }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const customer = c.getByRole("region", { name: "Customer" });
    await expect(customer).toHaveTextContent("An e-Fatura user");
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Tevkifat" }), "602");
    await expect(c.getByLabelText("Totals")).toHaveTextContent("KDV withheld (602, 9/10)−4,320.00 TL");
    await userEvent.click(c.getByRole("button", { name: "Add line" }));
    await expect(within(c.getByRole("list", { name: "Draft lines" })).getAllByRole("listitem")).toHaveLength(2);
    await expect(c.getByLabelText("Totals")).toHaveTextContent("To pay78,480.00 TL");
    await userEvent.selectOptions(within(customer).getByRole("combobox", { name: "Customer" }), "c4");
    await expect(customer).toHaveTextContent("Not an e-Fatura user: goes as e-Arşiv");
    await expect(customer).toHaveTextContent("ACA2026000000187");
    await userEvent.click(c.getByRole("button", { name: "Issue" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Issue ACA2026000000187?" }));
    await userEvent.click(dialog.getByRole("button", { name: "Issue ACA2026000000187" }));
    await expect(c.getByRole("heading", { level: 1, name: "Invoice ACA2026000000187" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const CreditNote: Story = {
  name: "Credit note",
  ...app("invoices", { open: "i409" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Credit note" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Credit note for ACM2026000000409" }));
    await userEvent.click(dialog.getByRole("button", { name: "Draft the credit note" }));
    await expect(c.getByRole("heading", { level: 1, name: "Credit note for ACM2026000000409" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Remove line 1" }));
    await userEvent.click(c.getByRole("button", { name: "Remove line 1" }));
    await expect(c.getByLabelText("Totals")).toHaveTextContent("To pay54,000.00 TL");
    blur(canvasElement);
  },
};

export const Customers: Story = {
  ...app("customers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Customers" });
    await expect(within(table).getByText("Tax office missing, İzmir")).toBeInTheDocument();
    await userEvent.click(within(table).getByRole("button", { name: "Check" }));
    await expect(c.getByRole("status")).toHaveTextContent("Er Turizm Ltd. Şti. is an e-Fatura user since 2021");
    await expect(within(table).queryByRole("button", { name: "Check" })).not.toBeInTheDocument();
  },
};

export const Products: Story = {
  ...app("products"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Products" });
    await expect(within(table).getByText("CONSULT").closest("tr")).toHaveTextContent("602, 9/10");
    await expect(within(table).getByText("BOOKS-PRO-EU").closest("tr")).toHaveTextContent("90.00 EUR");
  },
};

export const Recurring: Story = {
  ...app("recurring"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Recurring invoices" });
    await expect(rowsOf(table)).toHaveLength(3);
    await userEvent.click(within(table).getByRole("switch", { name: "Keep a draft" }));
    await expect(within(table).getAllByRole("switch", { name: "Issue it" })).toHaveLength(3);
    blur(canvasElement);
  },
};

export const Bank: Story = {
  ...app("bank"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Bank lines" });
    await expect(rowsOf(table)[0]).toHaveTextContent("Matched to ACM2026000000409");
    await userEvent.click(within(rowsOf(table)[2]!).getByRole("button", { name: "Match" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Match a bank line" }));
    await expect(dialog.getByRole("combobox", { name: "Invoice" })).toHaveValue("i371");
    await userEvent.click(dialog.getByRole("button", { name: "Match" }));
    await expect(c.getByRole("status")).toHaveTextContent("Matched to ACM2026000000371. 33,000.00 TL is still owed.");
  },
};

export const Exports: Story = {
  ...app("exports"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Period" }), "2026-09");
    await userEvent.click(c.getByRole("button", { name: "Download ubl-2026-09.zip" }));
    await expect(c.getByRole("status")).toHaveTextContent("Downloaded ubl-2026-09.zip for September 2026.");
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("invoices.yaml as applied")).toHaveTextContent("after: [1d, 7d, 30d]");
  },
};
