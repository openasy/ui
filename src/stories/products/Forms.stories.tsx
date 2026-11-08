import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  AlignLeft,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  AtSign,
  CalendarDays,
  ChartColumn,
  CircleDot,
  ClipboardList,
  Code,
  Copy,
  EyeOff,
  FileDown,
  Gauge,
  Hash,
  Inbox,
  ListChecks,
  Paperclip,
  Phone,
  Plus,
  RotateCw,
  Send,
  ShieldCheck,
  SquareChevronDown,
  Star,
  Trash2,
  Type,
} from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { BarList } from "../../charts/BarList";
import { DonutChart } from "../../charts/DonutChart";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import type { Tone } from "../../tokens/levels";
import { cn } from "../../lib/cn";

// Forms keeps lead, contact and NPS forms in files under forms/, embeds them with one script tag or a hosted page,
// keeps the answers in the install and sends each one where its form says: a profile to Audience, a contact and a deal
// to CRM, a ticket to Helpdesk and the consent checkbox to Consent with the text the person saw. Spam is filtered by a
// hidden field, timing and rate, never by a third-party CAPTCHA. Short forms only: no long branching surveys, no payments.

const nav = [
  { id: "forms", label: "Forms", icon: ClipboardList },
  { id: "answers", label: "Answers", icon: Inbox, count: 3 },
  { id: "results", label: "Results", icon: ChartColumn },
];

const meta = {
  title: "Products/Forms",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
const HOST = "forms.acme.example.com";
const fmt = (n: number) => n.toLocaleString("en");
const pct = (n: number, of: number) => (of ? `${Math.round((n / of) * 100)}%` : "–");

type Kind = "lead" | "contact" | "nps" | "survey";
const KIND: Record<Kind, string> = { lead: "Lead", contact: "Contact", nps: "NPS", survey: "Survey" };

type State = "live" | "draft" | "closed";
const STATE: Record<State, { label: string; tone: Tone }> = {
  live: { label: "Live", tone: "success" },
  draft: { label: "Draft", tone: "neutral" },
  closed: { label: "Closed", tone: "warning" },
};

type Dest = "Audience" | "CRM" | "Consent" | "Helpdesk" | "Analytics" | "Webhook";

interface Form {
  id: string;
  name: string;
  kind: Kind;
  state: State;
  /** Where it is shown. */
  on: string;
  views: number;
  answers: number;
  spam: number;
  sendsTo: Dest[];
  owner: string;
  changed: string;
}

const FORMS: Form[] = [
  {
    id: "demo-request",
    name: "Demo request",
    kind: "lead",
    state: "live",
    on: "/pricing, /demo",
    views: 1920,
    answers: 64,
    spam: 41,
    sendsTo: ["Audience", "CRM", "Consent", "Analytics", "Webhook"],
    owner: ME,
    changed: "3 Nov",
  },
  {
    id: "contact-sales",
    name: "Contact sales",
    kind: "lead",
    state: "live",
    on: "/contact",
    views: 860,
    answers: 37,
    spam: 18,
    sendsTo: ["Audience", "CRM", "Consent"],
    owner: "Hakan Yıldız",
    changed: "12 Oct",
  },
  {
    id: "contact-support",
    name: "Contact support",
    kind: "contact",
    state: "live",
    on: "/help, in the app",
    views: 2310,
    answers: 112,
    spam: 9,
    sendsTo: ["Audience", "Helpdesk"],
    owner: "Selin Aydın",
    changed: "28 Sep",
  },
  {
    id: "customer-nps",
    name: "Customer NPS",
    kind: "nps",
    state: "live",
    on: "In the app after 30 days, and a link in Messages",
    views: 1104,
    answers: 286,
    spam: 0,
    sendsTo: ["Audience", "Analytics"],
    owner: "Emre Koç",
    changed: "1 Sep",
  },
  {
    id: "webinar-e-arsiv",
    name: "e-Arşiv webinar registration",
    kind: "lead",
    state: "live",
    on: "/webinar/e-arsiv",
    views: 1480,
    answers: 203,
    spam: 6,
    sendsTo: ["Audience", "Consent", "Analytics"],
    owner: ME,
    changed: "20 Oct",
  },
  {
    id: "onboarding-feedback",
    name: "Onboarding feedback",
    kind: "survey",
    state: "draft",
    on: "Not shown yet",
    views: 0,
    answers: 0,
    spam: 0,
    sendsTo: ["Audience"],
    owner: "Emre Koç",
    changed: "Yesterday",
  },
  {
    id: "year-end-checklist",
    name: "Year-end checklist download",
    kind: "lead",
    state: "closed",
    on: "Closed 31 Oct",
    views: 0,
    answers: 0,
    spam: 0,
    sendsTo: ["Audience", "Consent"],
    owner: ME,
    changed: "31 Oct",
  },
];

/* ---------------------------------------------------------------- fields */

type FieldType = "text" | "long" | "email" | "phone" | "number" | "one" | "many" | "dropdown" | "date" | "rating" | "nps" | "file" | "consent" | "hidden";

const TYPES: Record<FieldType, { label: string; icon: typeof Type; check: string }> = {
  text: { label: "Short text", icon: Type, check: "Up to 200 characters" },
  long: { label: "Long text", icon: AlignLeft, check: "Up to 1,000 characters" },
  email: { label: "Email", icon: AtSign, check: "A valid address with a domain that receives mail" },
  phone: { label: "Phone", icon: Phone, check: "+90 and 10 digits, or another country code" },
  number: { label: "Number", icon: Hash, check: "A whole number between the limits you set" },
  one: { label: "Single choice", icon: CircleDot, check: "One of the options" },
  many: { label: "Multiple choice", icon: ListChecks, check: "Any of the options" },
  dropdown: { label: "Dropdown", icon: SquareChevronDown, check: "One of the options" },
  date: { label: "Date", icon: CalendarDays, check: "A date, shown as DD.MM.YYYY" },
  rating: { label: "Rating", icon: Star, check: "1 to 5 stars" },
  nps: { label: "NPS, 0 to 10", icon: Gauge, check: "A score from 0 to 10" },
  file: { label: "File upload", icon: Paperclip, check: "PDF, PNG, JPG or XLSX, up to 10 MB, scanned by Malware" },
  consent: { label: "Consent checkbox", icon: ShieldCheck, check: "Unticked is no; a ticked box is recorded in Consent with its text" },
  hidden: { label: "Hidden field", icon: EyeOff, check: "Filled from the address or the page, never shown" },
};

interface Field {
  id: string;
  type: FieldType;
  label: string;
  required: boolean;
  page: number;
  options?: string[];
  help?: string;
  /** Only shown when this condition holds; set on the Logic tab. */
  showWhen?: string;
}

const SIZES = ["1 to 9", "10 to 49", "50 to 249", "250 or more"];
const CITIES = ["İstanbul", "Ankara", "İzmir", "Bursa", "Another city"];
const NEEDS = ["e-Fatura and e-Arşiv", "Bank feeds", "Payroll export", "Inventory"];
const CONSENT_TEXT =
  "I agree that Acme and its group company Acme Sigorta may send me offers, campaigns and news about their products by the channels I choose. I can withdraw at any time from the link in each message, by replying STOP, or on the preference page.";

const DEMO_FIELDS: Field[] = [
  { id: "name", type: "text", label: "Full name", required: true, page: 1 },
  { id: "email", type: "email", label: "Work email", required: true, page: 1 },
  { id: "phone", type: "phone", label: "Phone", required: false, page: 1, help: "So the sales owner can call to set a time" },
  { id: "company", type: "text", label: "Company", required: true, page: 2 },
  { id: "size", type: "dropdown", label: "Company size", required: true, page: 2, options: SIZES },
  { id: "branches", type: "number", label: "How many branches?", required: false, page: 2, showWhen: "Company size is 50 to 249 or 250 or more" },
  { id: "city", type: "dropdown", label: "City", required: true, page: 2, options: CITIES },
  { id: "needs", type: "many", label: "What do you need?", required: false, page: 2, options: NEEDS },
  { id: "note", type: "long", label: "Anything else?", required: false, page: 2 },
  { id: "consent", type: "consent", label: "Marketing emails and SMS", required: false, page: 2, help: "Commercial messages, text v3" },
  { id: "utm_source", type: "hidden", label: "utm_source", required: false, page: 1 },
  { id: "utm_campaign", type: "hidden", label: "utm_campaign", required: false, page: 1 },
];

const PAGE_NAMES = ["About you", "Your company"];

interface Rule {
  id: string;
  show: string;
  when: string;
  is: string;
}

const DEMO_RULES: Rule[] = [{ id: "r1", show: "How many branches?", when: "Company size", is: "50 to 249 or 250 or more" }];

const OWNERS = [
  { city: "İstanbul", owner: "Hakan Yıldız" },
  { city: "Ankara", owner: ME },
  { city: "İzmir", owner: "Selin Aydın" },
  { city: "Bursa", owner: "Burak Şahin" },
  { city: "Another city", owner: ME },
];

/* ---------------------------------------------------------------- preview */

/** The form as a visitor sees it: one page at a time, with the rules applied. */
function FormPreview({ fields, title }: { fields: Field[]; title: string }) {
  const pages = Math.max(...fields.map((f) => f.page));
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(SIZES[0]!);
  const [score, setScore] = useState<number | null>(null);
  const shown = fields.filter((f) => f.page === page && f.type !== "hidden").filter((f) => !f.showWhen || size === SIZES[2] || size === SIZES[3]);
  return (
    <Panel aria-label="Preview" title="Preview" description={`As a visitor sees it on ${HOST}`}>
      <div className="flex flex-col gap-3 rounded-md border border-line bg-canvas p-3">
        <div className="flex flex-col gap-1">
          <span className="text-sm font-semibold text-fg">{title}</span>
          {pages > 1 && (
            <span className="flex items-center gap-2 text-2xs text-fg-muted">
              Step {page} of {pages}: {PAGE_NAMES[page - 1] ?? `Page ${page}`}
              <span aria-hidden className="h-1 grow overflow-hidden rounded-full bg-subtle">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(page / pages) * 100}%` }} />
              </span>
            </span>
          )}
        </div>
        {shown.map((f) => (
          <PreviewField key={f.id} f={f} size={size} onSize={setSize} score={score} onScore={setScore} />
        ))}
        <div className="flex justify-between gap-2">
          {page > 1 ? <Button onClick={() => setPage(page - 1)}>Back</Button> : <span />}
          {page < pages ? (
            <Button variant="primary" onClick={() => setPage(page + 1)}>
              Next
            </Button>
          ) : (
            <Button variant="primary">Send</Button>
          )}
        </div>
      </div>
    </Panel>
  );
}

function PreviewField({
  f,
  size,
  onSize,
  score,
  onScore,
}: {
  f: Field;
  size: string;
  onSize: (s: string) => void;
  score: number | null;
  onScore: (n: number) => void;
}) {
  const label = `${f.label}${f.required ? " *" : ""}`;
  switch (f.type) {
    case "dropdown":
      return (
        <SelectField
          label={label}
          options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
          value={f.id === "size" ? size : undefined}
          onChange={f.id === "size" ? (e) => onSize(e.target.value) : undefined}
        />
      );
    case "one":
    case "many":
      return (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-xs font-medium text-fg">{label}</legend>
          {(f.options ?? ["Option 1", "Option 2"]).map((o) =>
            f.type === "many" ? (
              <Checkbox key={o} label={o} />
            ) : (
              <label key={o} className="flex items-center gap-2 text-sm text-fg">
                <input type="radio" name={f.id} className="size-3.5 accent-[var(--oa-accent)]" />
                {o}
              </label>
            ),
          )}
        </fieldset>
      );
    case "long":
      return (
        <label className="flex flex-col gap-1 text-xs font-medium text-fg">
          {label}
          <textarea rows={3} className="rounded-md border border-line-strong bg-surface px-2.5 py-1.5 text-sm font-normal text-fg" />
        </label>
      );
    case "consent":
      return <Checkbox label={CONSENT_TEXT} description="Optional. Leaving it unticked is a no." />;
    case "nps":
      return (
        <fieldset>
          <legend className="mb-1 text-xs font-medium text-fg">{label}</legend>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 11 }, (_, n) => (
              <button
                key={n}
                type="button"
                aria-pressed={score === n}
                onClick={() => onScore(n)}
                className={cn(
                  "size-7 rounded-md border text-xs",
                  score === n ? "border-accent bg-accent-soft text-accent-text" : "border-line bg-surface text-fg hover:bg-subtle",
                )}
              >
                {n}
              </button>
            ))}
          </div>
          <span className="mt-1 flex justify-between text-2xs text-fg-muted">
            <span>Not likely</span>
            <span>Very likely</span>
          </span>
        </fieldset>
      );
    case "file":
      return (
        <label className="flex flex-col gap-1 text-xs font-medium text-fg">
          {label}
          <input type="file" className="text-xs font-normal text-fg-muted" />
          <span className="font-normal text-fg-muted">{TYPES.file.check}</span>
        </label>
      );
    default:
      return (
        <TextField
          label={label}
          hint={f.help}
          type={f.type === "email" ? "email" : f.type === "phone" ? "tel" : f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
        />
      );
  }
}

/* -------------------------------------------------------------- editor */

function yamlOf(form: Form, fields: Field[], rules: Rule[]) {
  const lines = [
    `# forms/${form.id}.yaml`,
    `name: ${form.name}`,
    `kind: ${form.kind}`,
    "pages:",
    ...PAGE_NAMES.slice(0, Math.max(...fields.map((f) => f.page))).map((p) => `  - ${p}`),
    "fields:",
    ...fields.map(
      (f) =>
        `  - { id: ${f.id}, type: ${f.type}, label: "${f.label}", page: ${f.page}${f.required ? ", required: true" : ""}${
          f.type === "consent" ? ", purpose: commercial, channels: [email, sms]" : ""
        }${f.type === "hidden" ? ", from: query" : ""} }`,
    ),
    "logic:",
    ...rules.map((r) => `  - show: "${r.show}"\n    when: { field: "${r.when}", is: "${r.is}" }`),
    "send_to:",
    "  audience: true",
    "  crm: { pipeline: sales, stage: demo, owner_by: city }",
    "  consent: true",
    "  analytics: { goal: demo-request }",
    "  webhook: https://hooks.acme.example.com/forms",
    "notify:",
    "  - email: owner",
    "  - chat: '#leads'",
    "after_send: { message: Thanks, we will call within a working day., redirect: /demo/thanks }",
  ];
  return lines.join("\n");
}

function AddFieldDialog({ open, onOpenChange, onAdd }: { open: boolean; onOpenChange: (o: boolean) => void; onAdd: (f: Omit<Field, "id" | "page">) => void }) {
  const [type, setType] = useState<FieldType>("text");
  const [label, setLabel] = useState("");
  const [required, setRequired] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add a field"
      description="It goes at the end of the page you are on. Payments are not taken in forms."
      size="lg"
      onSubmit={(e) => {
        e.preventDefault();
        if (!label.trim()) return;
        onAdd({ type, label: label.trim(), required });
        setLabel("");
        setRequired(false);
        setType("text");
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!label.trim()}>
            Add field
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="mb-1 text-xs font-medium text-fg">Type</legend>
        <ul aria-label="Field types" className="grid grid-cols-2 gap-1 sm:grid-cols-3">
          {(Object.keys(TYPES) as FieldType[]).map((t) => {
            const T = TYPES[t];
            return (
              <li key={t}>
                <button
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm",
                    type === t ? "border-accent bg-accent-soft text-accent-text" : "border-line text-fg hover:bg-canvas",
                  )}
                >
                  <T.icon aria-hidden className="size-3.5 shrink-0" />
                  {T.label}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="mt-1 text-xs text-fg-muted">Checked: {TYPES[type].check}.</p>
      </fieldset>
      <TextField label="Question" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Current accounting program" />
      <Checkbox label="Required" checked={required} onChange={(e) => setRequired(e.target.checked)} />
    </Dialog>
  );
}

function FieldsTab({ form, fields, setFields }: { form: Form; fields: Field[]; setFields: (f: Field[]) => void }) {
  const [selected, setSelected] = useState(fields[0]?.id ?? "");
  const [adding, setAdding] = useState(false);
  const [page, setPage] = useState(1);
  const cur = fields.find((f) => f.id === selected);
  const update = (patch: Partial<Field>) => setFields(fields.map((f) => (f.id === selected ? { ...f, ...patch } : f)));
  const move = (id: string, dir: -1 | 1) => {
    const i = fields.findIndex((f) => f.id === id);
    const j = i + dir;
    if (j < 0 || j >= fields.length) return;
    const next = [...fields];
    [next[i], next[j]] = [next[j]!, next[i]!];
    setFields(next);
  };
  const onPage = fields.filter((f) => f.page === page);
  const hidden = fields.filter((f) => f.type === "hidden");
  const pages = Math.max(1, ...fields.map((f) => f.page));
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        aria-label="Fields"
        title="Fields"
        description={`${fields.length} fields on ${pages === 1 ? "1 page" : `${pages} pages`}`}
        actions={
          <Button size="sm" icon={<Plus />} onClick={() => setAdding(true)}>
            Add a field
          </Button>
        }
      >
        {pages > 1 && (
          <SegmentedControl
            label="Page"
            value={String(page)}
            onChange={(v) => setPage(Number(v))}
            options={PAGE_NAMES.slice(0, pages).map((p, i) => ({ value: String(i + 1), label: `${i + 1}. ${p}` }))}
            className="mb-2"
          />
        )}
        <ol aria-label="Fields on this page" className="flex flex-col gap-1">
          {onPage.map((f) => {
            const T = TYPES[f.type];
            return (
              <li key={f.id} className="flex items-center gap-1">
                <button
                  type="button"
                  aria-pressed={f.id === selected}
                  onClick={() => setSelected(f.id)}
                  className={cn(
                    "flex min-w-0 grow items-center gap-2 rounded-md border px-2 py-1.5 text-left text-sm",
                    f.id === selected ? "border-accent bg-accent-soft text-accent-text" : "border-line text-fg hover:bg-canvas",
                  )}
                >
                  <T.icon aria-hidden className="size-3.5 shrink-0" />
                  <span className="min-w-0 grow truncate">{f.label}</span>
                  {f.required && <Badge>Required</Badge>}
                  {f.showWhen && <Badge tone="info">Rule</Badge>}
                </button>
                <IconButton label={`Move ${f.label} up`} size="xs" onClick={() => move(f.id, -1)}>
                  <ArrowUp className="size-3.5" />
                </IconButton>
                <IconButton label={`Move ${f.label} down`} size="xs" onClick={() => move(f.id, 1)}>
                  <ArrowDown className="size-3.5" />
                </IconButton>
              </li>
            );
          })}
        </ol>
        <p className="mt-2 text-xs text-fg-muted">
          {hidden.length ? `Hidden fields, filled from the address: ${hidden.map((h) => h.label).join(", ")}. ` : ""}Prefill any field with ?field=value.
        </p>
      </Panel>
      <Panel aria-label="Field settings" title="Field settings" description={cur ? TYPES[cur.type].label : "Pick a field"}>
        {cur && (
          <div className="flex flex-col gap-2.5">
            <TextField label="Question" value={cur.label} onChange={(e) => update({ label: e.target.value })} />
            <TextField label="Help text" value={cur.help ?? ""} onChange={(e) => update({ help: e.target.value })} placeholder="Shown under the question" />
            <Switch label="Required" description="The form cannot be sent without it" checked={cur.required} onCheckedChange={(v) => update({ required: v })} />
            <div className="flex flex-col gap-0.5 text-xs">
              <span className="font-medium text-fg">Checked when sent</span>
              <span className="text-fg-muted">{TYPES[cur.type].check}</span>
            </div>
            {cur.showWhen && <Callout tone="info" title={`Shown only when ${cur.showWhen}`} />}
            {cur.type === "consent" && (
              <Callout tone="info" title="Recorded in Consent as Commercial messages, email and SMS, text v3">
                The text comes from consent.yaml, so it is the one Consent keeps as proof.
              </Callout>
            )}
            <div>
              <Button
                size="sm"
                variant="danger"
                icon={<Trash2 />}
                onClick={() => {
                  setFields(fields.filter((f) => f.id !== cur.id));
                  setSelected(fields.find((f) => f.id !== cur.id)?.id ?? "");
                }}
              >
                Remove field
              </Button>
            </div>
          </div>
        )}
      </Panel>
      <FormPreview key={fields.map((f) => f.id + f.label + f.required).join()} fields={fields} title={form.name} />
      <AddFieldDialog
        open={adding}
        onOpenChange={setAdding}
        onAdd={(f) => {
          const id = `f${fields.length + 1}`;
          setFields([
            ...fields,
            { ...f, id, page, options: f.type === "one" || f.type === "many" || f.type === "dropdown" ? ["Option 1", "Option 2"] : undefined },
          ]);
          setSelected(id);
          setAdding(false);
        }}
      />
    </div>
  );
}

function LogicTab({ fields, rules, setRules }: { fields: Field[]; rules: Rule[]; setRules: (r: Rule[]) => void }) {
  const [adding, setAdding] = useState(false);
  const shown = fields.filter((f) => f.type !== "hidden" && f.type !== "consent");
  const choices = fields.filter((f) => f.options);
  const [show, setShow] = useState(shown[shown.length - 1]?.label ?? "");
  const [when, setWhen] = useState(choices[0]?.label ?? "");
  const options = choices.find((c) => c.label === when)?.options ?? [];
  const [is, setIs] = useState(options[0] ?? "");
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel
        aria-label="Rules"
        title="Rules"
        description="A rule shows or hides a field, or makes it required, from an earlier answer."
        actions={
          <Button size="sm" icon={<Plus />} onClick={() => setAdding(true)}>
            Add a rule
          </Button>
        }
      >
        <ol aria-label="Rules" className="flex flex-col gap-1.5">
          {rules.map((r) => (
            <li key={r.id} className="rounded-md border border-line px-2.5 py-1.5 text-sm text-fg">
              Show <strong>{r.show}</strong> when <strong>{r.when}</strong> is <strong>{r.is}</strong>
            </li>
          ))}
        </ol>
      </Panel>
      <div className="flex flex-col gap-2.5">
        <Panel title="Owner by city" description="The CRM deal goes to the sales owner of the city the person picked.">
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
            {OWNERS.map((o) => (
              <div key={o.city} className="contents">
                <dt className="text-fg-muted">{o.city}</dt>
                <dd className="flex items-center gap-1.5 text-fg">
                  <Avatar name={o.owner} size="sm" className="size-5" />
                  {o.owner}
                </dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Callout tone="info" title="Forms keeps to short forms">
          Rules work on the fields of a form. Jumping between pages, scoring quizzes and long branching surveys are not part of Forms.
        </Callout>
      </div>
      <Dialog
        open={adding}
        onOpenChange={setAdding}
        title="Add a rule"
        onSubmit={(e) => {
          e.preventDefault();
          setRules([...rules, { id: `r${rules.length + 1}`, show, when, is }]);
          setAdding(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Add rule
            </Button>
          </>
        }
      >
        <SelectField label="Show" value={show} onChange={(e) => setShow(e.target.value)} options={shown.map((f) => ({ value: f.label, label: f.label }))} />
        <SelectField
          label="When"
          value={when}
          onChange={(e) => {
            setWhen(e.target.value);
            setIs(choices.find((c) => c.label === e.target.value)?.options?.[0] ?? "");
          }}
          options={choices.map((f) => ({ value: f.label, label: f.label }))}
        />
        <SelectField label="Is" value={is} onChange={(e) => setIs(e.target.value)} options={options.map((o) => ({ value: o, label: o }))} />
      </Dialog>
    </div>
  );
}

type Mode = "inline" | "popup" | "page";

function ShareTab({ form }: { form: Form }) {
  const [mode, setMode] = useState<Mode>("inline");
  const [copied, setCopied] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [campaign, setCampaign] = useState("autumn-2026");
  const [hide, setHide] = useState(true);
  const url = `https://${HOST}/${form.id}`;
  const snippet =
    mode === "page"
      ? url
      : `<script src="https://${HOST}/embed.js" async></script>\n<div data-openasy-form="${form.id}"${mode === "popup" ? ' data-mode="popup" data-button="Ask for a demo"' : ""}></div>`;
  const params = [
    email && `email=${encodeURIComponent(email)}`,
    campaign && `utm_campaign=${encodeURIComponent(campaign)}`,
    hide && email && "hide=email",
  ].filter(Boolean);
  const prefilled = `${url}${params.length ? `?${params.join("&")}` : ""}`;
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Panel aria-label="Embed" title="Embed" description="One script tag; the form takes your site's font and colours from the brand settings.">
        <div className="flex flex-col gap-2">
          <SegmentedControl
            label="Shown as"
            value={mode}
            onChange={setMode}
            options={[
              { value: "inline", label: "In the page" },
              { value: "popup", label: "Popup from a button" },
              { value: "page", label: "Its own page" },
            ]}
          />
          <pre tabIndex={0} aria-label="Code to paste" className="overflow-x-auto rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs leading-relaxed text-fg">
            {snippet}
          </pre>
          <div className="flex items-center gap-2">
            <Button size="sm" icon={<Copy />} onClick={() => setCopied("Code copied.")}>
              Copy code
            </Button>
            {copied && (
              <span role="status" className="text-xs text-success">
                {copied}
              </span>
            )}
          </div>
          <p className="text-xs text-fg-muted">
            Shown on {form.on}. Views and answers count in Analytics as the events form_view and form_submit, and the goal {form.id}.
          </p>
        </div>
      </Panel>
      <Panel aria-label="Prefilled link" title="Prefilled link" description="Fill fields and hidden fields from the address, for a link in a message or an ad.">
        <div className="flex flex-col gap-2">
          <TextField label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ayse@yilmazmuhasebe.example.com" />
          <TextField
            label="utm_campaign"
            mono
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            hint="Campaigns makes these links for you, by its naming rules."
          />
          <Checkbox label="Hide fields that are prefilled" checked={hide} onChange={(e) => setHide(e.target.checked)} />
          <code aria-label="Link" className="block rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs break-all text-fg">
            {prefilled}
          </code>
        </div>
      </Panel>
    </div>
  );
}

const ROUTES: Array<{ dest: Dest; what: string }> = [
  { dest: "Audience", what: "Adds or updates the profile by email, with the visits Analytics had before the answer" },
  { dest: "CRM", what: "Finds or creates the contact and company, and opens a deal in Demo for the owner of the city" },
  { dest: "Consent", what: "A ticked box is recorded as Commercial messages, email and SMS, with text v3; unticked is no" },
  { dest: "Analytics", what: "Counts the goal demo-request, under the campaign in utm_campaign" },
  { dest: "Webhook", what: "POST to https://hooks.acme.example.com/forms, signed with the form's secret, retried for a day" },
];

function RoutingTab() {
  const [tested, setTested] = useState(false);
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Panel
        aria-label="Where answers go"
        title="Where answers go"
        description="An answer goes where its form says. With a product not linked, it stays in Forms."
        actions={
          <Button size="sm" icon={<Send />} onClick={() => setTested(true)}>
            Send a test answer
          </Button>
        }
      >
        <ul aria-label="Destinations" className="flex flex-col gap-1.5">
          {ROUTES.map((r) => (
            <li key={r.dest} className="flex items-start justify-between gap-3 border-b border-subtle pb-1.5 text-sm last:border-0">
              <span className="flex min-w-0 flex-col">
                <span className="font-medium text-fg">{r.dest}</span>
                <span className="text-xs text-fg-muted">{r.what}</span>
              </span>
              {tested ? <StatusBadge tone="success">Test received</StatusBadge> : <StatusBadge tone="neutral">On</StatusBadge>}
            </li>
          ))}
        </ul>
        {tested && (
          <p role="status" className="mt-2 text-xs text-fg">
            The test answer from test@acme.example.com reached all 5. It is marked as a test, so CRM and Analytics do not count it.
          </p>
        )}
      </Panel>
      <div className="flex flex-col gap-2.5">
        <Panel title="Notify">
          <ul aria-label="Notify" className="flex flex-col gap-1 text-xs text-fg">
            <li>An email to the deal's owner</li>
            <li>A message in Chat, channel #leads</li>
            <li>Thank-you message, then /demo/thanks</li>
          </ul>
        </Panel>
        <Panel title="Spam" description="No third-party CAPTCHA is loaded.">
          <ul aria-label="Spam checks" className="flex flex-col gap-1 text-xs text-fg">
            <li>A hidden field people never see, which bots fill</li>
            <li>Sent less than 3 seconds after the page opened</li>
            <li>More than 5 answers from one address in 10 minutes</li>
          </ul>
          <p className="mt-1.5 text-2xs text-fg-muted">41 answers held this week; see Answers, Spam.</p>
        </Panel>
      </div>
    </div>
  );
}

type EditorTab = "fields" | "logic" | "share" | "routing";

function FormEditor({ form, onBack, initialTab = "fields" }: { form: Form; onBack: () => void; initialTab?: EditorTab }) {
  const [tab, setTab] = useState<EditorTab>(initialTab);
  const [fields, setFields] = useState(form.id === "demo-request" ? DEMO_FIELDS : DEMO_FIELDS.slice(0, 3));
  const [rules, setRules] = useState(form.id === "demo-request" ? DEMO_RULES : []);
  const [yaml, setYaml] = useState(false);
  const [copied, setCopied] = useState(false);
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Forms", href: "#forms" }, { label: form.name }]}
        title={form.name}
        meta={
          <>
            <StatusBadge tone={STATE[form.state].tone}>{STATE[form.state].label}</StatusBadge>
            <Badge>{KIND[form.kind]}</Badge>
          </>
        }
        actions={
          <>
            <Button icon={<ArrowLeft />} onClick={onBack}>
              Back to forms
            </Button>
            <Button variant="primary" icon={<Code />} onClick={() => setYaml(true)}>
              Save as YAML
            </Button>
          </>
        }
      >
        <Tabs
          label="Form"
          value={tab}
          onChange={setTab}
          items={[
            { value: "fields", label: "Fields", count: fields.length },
            { value: "logic", label: "Logic", count: rules.length },
            { value: "share", label: "Share" },
            { value: "routing", label: "Routing" },
          ]}
        />
      </PageHeader>
      <Callout tone="info" title={`Kept in forms/${form.id}.yaml`} className="my-2.5">
        Changes here are a draft. Save them as YAML and commit the file; the live form changes once Forms reads it, within a minute.
      </Callout>
      {tab === "fields" && <FieldsTab form={form} fields={fields} setFields={setFields} />}
      {tab === "logic" && <LogicTab fields={fields} rules={rules} setRules={setRules} />}
      {tab === "share" && <ShareTab form={form} />}
      {tab === "routing" && <RoutingTab />}
      <Dialog
        open={yaml}
        onOpenChange={(o) => {
          setYaml(o);
          setCopied(false);
        }}
        title={`forms/${form.id}.yaml`}
        description="Commit this file. Forms reads it within a minute and lists any line it could not apply."
        size="lg"
        footer={
          <>
            {copied && (
              <span role="status" className="mr-auto self-center text-xs text-success">
                Copied.
              </span>
            )}
            <Button type="button" icon={<Copy />} variant="primary" onClick={() => setCopied(true)}>
              Copy
            </Button>
          </>
        }
      >
        <pre tabIndex={0} aria-label="Form as YAML" className="overflow-x-auto rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs leading-relaxed text-fg">
          {yamlOf(form, fields, rules)}
        </pre>
      </Dialog>
    </>
  );
}

/* ----------------------------------------------------------------- forms */

function NewFormDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (f: Form) => void }) {
  const [name, setName] = useState("");
  const [kind, setKind] = useState<Kind>("lead");
  const id = name
    .toLocaleLowerCase("tr")
    .replace(/ı/g, "i")
    .replace(/ş/g, "s")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="New form"
      description="It starts as a draft with the fields every form of its kind needs."
      onSubmit={(e) => {
        e.preventDefault();
        if (!id) return;
        onCreate({
          id,
          name: name.trim(),
          kind,
          state: "draft",
          on: "Not shown yet",
          views: 0,
          answers: 0,
          spam: 0,
          sendsTo: ["Audience"],
          owner: ME,
          changed: "Now",
        });
        setName("");
      }}
      footer={
        <>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={!id}>
            Create form
          </Button>
        </>
      }
    >
      <TextField
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Payroll export interest"
        hint={id ? `forms/${id}.yaml` : undefined}
      />
      <SelectField
        label="Kind"
        value={kind}
        onChange={(e) => setKind(e.target.value as Kind)}
        options={[
          { value: "lead", label: "Lead: name, work email, company; to Audience and CRM" },
          { value: "contact", label: "Contact: name, email, message; to Helpdesk" },
          { value: "nps", label: "NPS: score and a reason; to Audience" },
          { value: "survey", label: "Short survey: up to 10 questions" },
        ]}
      />
    </Dialog>
  );
}

function FormsPage({ initialForm, initialTab }: { initialForm?: string; initialTab?: EditorTab }) {
  const [forms, setForms] = useState(FORMS);
  const [open, setOpen] = useState<string | null>(initialForm ?? null);
  const [kind, setKind] = useState<"all" | Kind>("all");
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const form = forms.find((f) => f.id === open);
  if (form) return <FormEditor form={form} initialTab={initialTab} onBack={() => setOpen(null)} />;
  const rows = forms.filter((f) => (kind === "all" || f.kind === kind) && f.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  const live = forms.filter((f) => f.state === "live");
  const views = live.reduce((n, f) => n + f.views, 0);
  const answers = live.reduce((n, f) => n + f.answers, 0);
  const cols: Column<Form>[] = [
    {
      id: "name",
      header: "Form",
      width: "30%",
      sortValue: (f) => f.name,
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{f.name}</span>
          <span className="truncate text-2xs text-fg-muted">{f.on}</span>
        </span>
      ),
    },
    { id: "kind", header: "Kind", cell: (f) => <Badge>{KIND[f.kind]}</Badge> },
    { id: "state", header: "State", cell: (f) => <StatusBadge tone={STATE[f.state].tone}>{STATE[f.state].label}</StatusBadge> },
    { id: "answers", header: "Answers, 7 days", align: "right", mono: true, sortValue: (f) => f.answers, cell: (f) => fmt(f.answers) },
    {
      id: "rate",
      header: "Of views",
      description: "Answers as a share of the people who saw the form",
      align: "right",
      mono: true,
      cell: (f) => pct(f.answers, f.views),
    },
    {
      id: "to",
      header: "Sends to",
      cell: (f) => (
        <span className="flex flex-wrap gap-1">
          {f.sendsTo.map((d) => (
            <Badge key={d} tone="info">
              {d}
            </Badge>
          ))}
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Forms"
        description="Every form with its answers this week and where they went. Each form is a file in forms/, reviewed like code."
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setCreating(true)}>
            New form
          </Button>
        }
      />
      <KpiGrid minWidth={170} className="my-2.5">
        <KpiCard label="Answers, 7 days" value={fmt(answers)} delta={{ label: "+12% on last week", direction: "up", intent: "good" }} />
        <KpiCard label="Of views" value={pct(answers, views)} delta={{ label: `${fmt(views)} views`, intent: "neutral" }} />
        <KpiCard label="Leads to CRM" value="101" delta={{ label: "contacts and deals opened", intent: "neutral" }} />
        <KpiCard label="Consent given" value="62%" delta={{ label: "of lead forms, the box ticked", intent: "neutral" }} />
        <KpiCard label="Spam held" value={fmt(forms.reduce((n, f) => n + f.spam, 0))} delta={{ label: "never sent anywhere", intent: "neutral" }} />
      </KpiGrid>
      <Panel flush>
        <div className="flex flex-wrap items-center gap-2 px-3 py-2">
          <SegmentedControl
            label="Kind"
            value={kind}
            onChange={setKind}
            options={[
              { value: "all", label: "All" },
              { value: "lead", label: "Lead" },
              { value: "contact", label: "Contact" },
              { value: "nps", label: "NPS" },
              { value: "survey", label: "Survey" },
            ]}
          />
          <SearchInput label="Search forms" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />
        </div>
        <div className="border-t border-line">
          <DataTable label="Forms" columns={cols} rows={rows} getRowId={(f) => f.id} onRowClick={(f) => setOpen(f.id)} minWidth={820} />
        </div>
      </Panel>
      <NewFormDialog
        open={creating}
        onOpenChange={setCreating}
        onCreate={(f) => {
          setForms((fs) => [f, ...fs]);
          setCreating(false);
          setOpen(f.id);
        }}
      />
    </>
  );
}

/* --------------------------------------------------------------- answers */

interface Delivery {
  dest: Dest;
  text: string;
  ok: boolean;
}

interface Answer {
  id: string;
  at: string;
  name: string;
  email: string;
  company: string;
  city: string;
  size: string;
  branches?: number;
  needs: string[];
  note?: string;
  consent: boolean;
  source: string;
  campaign?: string;
  page: string;
  went: Delivery[];
}

const owner = (city: string) => OWNERS.find((o) => o.city === city)?.owner ?? ME;

function delivered(a: Omit<Answer, "went">, crm: string, crmOk = true): Delivery[] {
  return [
    { dest: "Audience", text: "Profile updated, with 4 earlier visits", ok: true },
    { dest: "CRM", text: crmOk ? crm : "CRM did not answer; tried 3 times, last at 09:12", ok: crmOk },
    {
      dest: "Consent",
      text: a.consent ? "Commercial messages, email and SMS: yes, text v3" : "Box unticked: nothing recorded as consent",
      ok: true,
    },
    { dest: "Analytics", text: `Goal demo-request${a.campaign ? `, campaign ${a.campaign}` : ""}`, ok: true },
    { dest: "Webhook", text: "200 in 140 ms", ok: true },
  ];
}

const BASE: Array<Omit<Answer, "went"> & { crm: string; crmOk?: boolean }> = [
  {
    id: "a1",
    at: "Today 11:42",
    name: "Ayşe Yılmaz",
    email: "ayse@yilmazmuhasebe.example.com",
    company: "Yılmaz Muhasebe",
    city: "İstanbul",
    size: "10 to 49",
    needs: ["e-Fatura and e-Arşiv", "Bank feeds"],
    note: "We keep the books of 60 small companies; want to see bank feeds for Ziraat and Garanti.",
    consent: true,
    source: "google",
    page: "/pricing",
    crm: "Contact and a deal in Demo for Hakan Yıldız",
  },
  {
    id: "a2",
    at: "Today 09:05",
    name: "Deniz Arslan",
    email: "deniz@arslantekstil.example.com",
    company: "Arslan Tekstil",
    city: "Bursa",
    size: "250 or more",
    branches: 14,
    needs: ["Payroll export", "Inventory"],
    consent: false,
    source: "linkedin",
    campaign: "autumn-2026",
    page: "/demo",
    crm: "",
    crmOk: false,
  },
  {
    id: "a3",
    at: "Yesterday 17:20",
    name: "Elif Kaya",
    email: "elif@kayaeczane.example.com",
    company: "Kaya Eczane",
    city: "Ankara",
    size: "50 to 249",
    branches: 8,
    needs: ["e-Fatura and e-Arşiv", "Inventory"],
    consent: true,
    source: "newsletter",
    campaign: "autumn-2026",
    page: "/pricing",
    crm: "Deal Pharmacy chain, 8 branches in Lead for Emily Clark",
  },
  {
    id: "a4",
    at: "6 Nov 14:10",
    name: "Murat Kılıç",
    email: "murat.kilic@example.com",
    company: "Kılıç Ticaret",
    city: "Ankara",
    size: "1 to 9",
    needs: ["e-Fatura and e-Arşiv"],
    consent: true,
    source: "direct",
    page: "/demo",
    crm: "Deal e-Arşiv for 3 shops in Demo for Emily Clark",
  },
  {
    id: "a5",
    at: "5 Nov 10:31",
    name: "Can Öztürk",
    email: "can@ozturkkirtasiye.example.com",
    company: "Öztürk Kırtasiye",
    city: "İzmir",
    size: "1 to 9",
    needs: ["Bank feeds"],
    consent: false,
    source: "google",
    page: "/pricing",
    crm: "Contact and a deal in Demo for Selin Aydın",
  },
  {
    id: "a6",
    at: "2 Nov 16:48",
    name: "Burcu Aydemir",
    email: "burcu@aydemiroto.example.com",
    company: "Aydemir Otomotiv",
    city: "İzmir",
    size: "10 to 49",
    needs: ["Inventory", "Payroll export"],
    consent: true,
    source: "newsletter",
    campaign: "autumn-2026",
    page: "/demo",
    crm: "Contact and a deal in Demo for Selin Aydın",
  },
];

const ANSWERS: Answer[] = BASE.map(({ crm, crmOk, ...a }) => ({ ...a, went: delivered(a, crm, crmOk ?? true) }));

const PARTIAL = [
  { id: "p1", at: "Today 12:02", email: "okan@tekinyapi.example.com", reached: "Company size", of: "6 of 10 fields" },
  { id: "p2", at: "Today 10:14", email: "seda@polatgida.example.com", reached: "City", of: "7 of 10 fields" },
  { id: "p3", at: "Yesterday 21:40", email: "Not given yet", reached: "Work email", of: "1 of 10 fields" },
];

interface SpamAnswer {
  id: string;
  at: string;
  from: string;
  why: string;
  name: string;
}

const SPAM: SpamAnswer[] = [
  { id: "s1", at: "Today 12:31", from: "203.0.113.24", why: "The hidden field was filled", name: "SEO Services Best" },
  { id: "s2", at: "Today 12:30", from: "203.0.113.24", why: "6th answer from this address in 10 minutes", name: "SEO Services Best" },
  { id: "s3", at: "Today 08:12", from: "198.51.100.7", why: "Sent 1.2 seconds after the page opened", name: "Kerem Aksoy" },
];

function AnswerPanel({ a, onResend }: { a: Answer; onResend: () => void }) {
  const rows: Array<[string, string]> = [
    ["Work email", a.email],
    ["Company", a.company],
    ["Company size", a.size],
    ...(a.branches ? ([["How many branches?", String(a.branches)]] as Array<[string, string]>) : []),
    ["City", a.city],
    ["What do you need?", a.needs.join(", ") || "–"],
    ["Anything else?", a.note ?? "–"],
  ];
  return (
    <Panel aria-label="Answer" title={`${a.name}, ${a.company}`} description={`${a.at} on ${a.page}`}>
      <div className="flex flex-col gap-3 text-xs">
        <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-2 gap-y-1">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-fg-muted">{k}</dt>
              <dd className="min-w-0 break-words text-fg">{v}</dd>
            </div>
          ))}
          <dt className="text-fg-muted">Hidden</dt>
          <dd className="font-mono text-2xs text-fg">
            utm_source={a.source}
            {a.campaign ? ` utm_campaign=${a.campaign}` : ""}
          </dd>
        </dl>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-fg">Consent box</span>
          {a.consent ? (
            <span className="text-fg">
              Ticked next to text v3: <q className="text-fg-muted">{CONSENT_TEXT}</q>
            </span>
          ) : (
            <span className="text-fg-muted">Not ticked. Messages will not send this person offers.</span>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-medium text-fg">Where it went</span>
          <ul aria-label="Where it went" className="flex flex-col gap-1">
            {a.went.map((d) => (
              <li key={d.dest} className="flex items-start justify-between gap-2">
                <span className="flex min-w-0 flex-col">
                  <span className="text-fg">{d.dest}</span>
                  <span className="text-2xs text-fg-muted">{d.text}</span>
                </span>
                <StatusBadge tone={d.ok ? "success" : "danger"}>{d.ok ? "Done" : "Failed"}</StatusBadge>
              </li>
            ))}
          </ul>
          {a.went.some((d) => !d.ok) && (
            <div>
              <Button size="sm" icon={<RotateCw />} onClick={onResend}>
                Send to CRM again
              </Button>
            </div>
          )}
        </div>
      </div>
    </Panel>
  );
}

type AnswersTab = "complete" | "partial" | "spam";

function AnswersPage({ initialTab = "complete" }: { initialTab?: AnswersTab }) {
  const [tab, setTab] = useState<AnswersTab>(initialTab);
  const [answers, setAnswers] = useState(ANSWERS);
  const [spam, setSpam] = useState(SPAM);
  const [active, setActive] = useState("a1");
  const [query, setQuery] = useState("");
  const [consent, setConsent] = useState<string[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const rows = answers.filter(
    (a) =>
      `${a.name} ${a.company} ${a.email}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")) &&
      (!consent.length || consent.includes(a.consent ? "yes" : "no")) &&
      (!sources.length || sources.includes(a.source)),
  );
  const cur = rows.find((a) => a.id === active) ?? rows[0];
  const cols: Column<Answer>[] = [
    {
      id: "name",
      header: "Person",
      width: "30%",
      cell: (a) => (
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={a.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{a.name}</span>
            <span className="truncate text-2xs text-fg-muted">{a.company}</span>
          </span>
        </span>
      ),
    },
    { id: "at", header: "Sent", cell: (a) => <span className="text-xs whitespace-nowrap">{a.at}</span> },
    { id: "size", header: "Size", cell: (a) => <span className="text-xs">{a.size}</span> },
    { id: "source", header: "Source", cell: (a) => <span className="font-mono text-xs">{a.source}</span> },
    { id: "consent", header: "Consent", cell: (a) => (a.consent ? <Badge tone="success">Yes, v3</Badge> : <Badge>No</Badge>) },
    {
      id: "went",
      header: "Went to",
      cell: (a) =>
        a.went.every((d) => d.ok) ? (
          <StatusBadge tone="success">All 5</StatusBadge>
        ) : (
          <StatusBadge tone="danger">{a.went.filter((d) => !d.ok).length} failed</StatusBadge>
        ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Answers"
        description="One form's answers, where each went, and what was held as spam. Answers are kept in your install for 2 years."
        actions={
          <>
            <SelectField
              aria-label="Form"
              value="demo-request"
              onChange={() => {}}
              options={FORMS.filter((f) => f.state !== "draft").map((f) => ({ value: f.id, label: f.name }))}
              className="w-56"
            />
            <Button
              icon={<FileDown />}
              onClick={() => setNotice(`Exported ${rows.length} answers as demo-request-2026-11-08.csv, with the hidden fields and where each went.`)}
            >
              Export CSV
            </Button>
          </>
        }
      >
        <Tabs
          label="Answers"
          value={tab}
          onChange={setTab}
          items={[
            { value: "complete", label: "Complete", count: answers.length },
            { value: "partial", label: "Partial", count: PARTIAL.length },
            { value: "spam", label: "Spam", count: spam.length },
          ]}
        />
      </PageHeader>
      {notice && (
        <div role="status" className="my-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="mt-2.5">
        {tab === "complete" && (
          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <Panel flush aria-label="All answers">
              <div className="px-3 py-2">
                <FilterBar
                  onClear={
                    consent.length || sources.length || query
                      ? () => {
                          setConsent([]);
                          setSources([]);
                          setQuery("");
                        }
                      : undefined
                  }
                >
                  <SearchInput
                    label="Search answers"
                    placeholder="Name, company or email"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-56"
                  />
                  <FacetFilter
                    label="Consent"
                    options={[
                      { value: "yes", label: "Ticked", count: answers.filter((a) => a.consent).length },
                      { value: "no", label: "Not ticked", count: answers.filter((a) => !a.consent).length },
                    ]}
                    selected={consent}
                    onChange={setConsent}
                  />
                  <FacetFilter
                    label="Source"
                    options={["google", "newsletter", "linkedin", "direct"].map((s) => ({ value: s, count: answers.filter((a) => a.source === s).length }))}
                    selected={sources}
                    onChange={setSources}
                  />
                </FilterBar>
              </div>
              <div className="border-t border-line">
                <DataTable
                  label="Answers"
                  columns={cols}
                  rows={rows}
                  getRowId={(a) => a.id}
                  onRowClick={(a) => setActive(a.id)}
                  activeRowId={cur?.id}
                  minWidth={720}
                />
              </div>
            </Panel>
            {cur && (
              <AnswerPanel
                key={cur.id}
                a={cur}
                onResend={() => {
                  setAnswers((as) =>
                    as.map((a) =>
                      a.id === cur.id
                        ? { ...a, went: a.went.map((d) => (d.ok ? d : { ...d, ok: true, text: `Contact and a deal in Demo for ${owner(a.city)}` })) }
                        : a,
                    ),
                  );
                  setNotice(`${cur.name}'s answer reached CRM: a deal in Demo for ${owner(cur.city)}.`);
                }}
              />
            )}
          </div>
        )}
        {tab === "partial" && (
          <Panel
            flush
            title="Partial answers"
            description="People who started and stopped. Kept here only, sent nowhere, and deleted after 30 days unless finished."
          >
            <DataTable
              label="Partial answers"
              rows={PARTIAL}
              getRowId={(p) => p.id}
              minWidth={560}
              columns={[
                { id: "at", header: "Started", cell: (p) => <span className="text-xs">{p.at}</span> },
                { id: "email", header: "Work email", cell: (p) => <span className="font-mono text-xs">{p.email}</span> },
                { id: "reached", header: "Stopped at", cell: (p) => p.reached },
                { id: "of", header: "Answered", cell: (p) => <span className="text-xs text-fg-muted">{p.of}</span> },
              ]}
            />
          </Panel>
        )}
        {tab === "spam" && (
          <Panel flush title="Held as spam" description="Never sent anywhere. Mark one as not spam and it is sent where its form says.">
            <DataTable
              label="Spam"
              rows={spam}
              getRowId={(s) => s.id}
              minWidth={640}
              empty="Nothing held."
              columns={[
                { id: "at", header: "Sent", cell: (s) => <span className="text-xs">{s.at}</span> },
                { id: "name", header: "Name given", cell: (s) => s.name },
                { id: "from", header: "From", cell: (s) => <span className="font-mono text-xs">{s.from}</span> },
                { id: "why", header: "Why it was held", cell: (s) => <span className="text-xs">{s.why}</span> },
                {
                  id: "act",
                  header: <span className="sr-only">Actions</span>,
                  label: "Actions",
                  align: "right",
                  cell: (s) => (
                    <Button
                      size="xs"
                      onClick={() => {
                        setSpam((x) => x.filter((y) => y.id !== s.id));
                        setNotice(`${s.name}'s answer is not spam: it went to Audience, CRM and Consent.`);
                      }}
                    >
                      Not spam
                    </Button>
                  ),
                },
              ]}
            />
          </Panel>
        )}
      </div>
    </>
  );
}

/* --------------------------------------------------------------- results */

const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function ResultsPage() {
  const [which, setWhich] = useState<"demo" | "nps">("demo");
  return (
    <>
      <PageHeader
        title="Results"
        description="How far people get in a form, what they answer, and NPS over time."
        actions={
          <SegmentedControl
            label="Form"
            value={which}
            onChange={setWhich}
            options={[
              { value: "demo", label: "Demo request" },
              { value: "nps", label: "Customer NPS" },
            ]}
          />
        }
      />
      {which === "demo" ? (
        <>
          <KpiGrid minWidth={160} className="my-2.5">
            <KpiCard label="Views, 7 days" value="1,920" />
            <KpiCard label="Started" value="236" delta={{ label: "12% of views", intent: "neutral" }} />
            <KpiCard label="Sent" value="64" delta={{ label: "27% of those who started", intent: "neutral" }} />
            <KpiCard label="Time to finish" value="1 m 48 s" unit="median" />
            <KpiCard label="Deals won from it, 90 days" value="9" delta={{ label: "from CRM", intent: "neutral" }} />
          </KpiGrid>
          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Where people stop" description="People who reached each field, last 7 days">
              <BarList
                label="People who reached each field"
                items={[
                  { id: "name", label: "Full name", value: 236 },
                  { id: "email", label: "Work email", value: 221 },
                  { id: "phone", label: "Phone", value: 198 },
                  { id: "company", label: "Page 2: Company", value: 141, color: "var(--oa-warning)" },
                  { id: "size", label: "Company size", value: 132 },
                  { id: "city", label: "City", value: 118 },
                  { id: "needs", label: "What do you need?", value: 104 },
                  { id: "sent", label: "Sent", value: 64, color: "var(--oa-success)" },
                ]}
              />
              <Callout tone="warning" title="57 of 198 people leave between the two pages" className="mt-2">
                Most of them gave a phone number. Making Phone optional on page 2, or dropping it, is worth a try.
              </Callout>
            </Panel>
            <div className="flex flex-col gap-2.5">
              <Panel title="Company size">
                <BarList
                  label="Answers to Company size"
                  items={[
                    { id: "a", label: "1 to 9", value: 22 },
                    { id: "b", label: "10 to 49", value: 27 },
                    { id: "c", label: "50 to 249", value: 11 },
                    { id: "d", label: "250 or more", value: 4 },
                  ]}
                />
              </Panel>
              <Panel title="What do you need?" description="More than one may be picked">
                <BarList label="Answers to What do you need" items={NEEDS.map((n, i) => ({ id: n, label: n, value: [41, 33, 18, 12][i]! }))} />
              </Panel>
              <Panel title="Where they came from" description="utm_source of the answers">
                <BarList
                  label="Answers by source"
                  items={[
                    { id: "google", label: "google", value: 26 },
                    { id: "newsletter", label: "newsletter", value: 17 },
                    { id: "direct", label: "direct", value: 12 },
                    { id: "linkedin", label: "linkedin", value: 9 },
                  ]}
                />
              </Panel>
            </div>
          </div>
        </>
      ) : (
        <>
          <KpiGrid minWidth={160} className="my-2.5">
            <KpiCard label="NPS, November" value="44" delta={{ label: "+3 on October", direction: "up", intent: "good" }} />
            <KpiCard label="Answers, 30 days" value="1,212" />
            <KpiCard label="Of people asked" value="26%" />
          </KpiGrid>
          <div className="mb-2.5 grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
            <Panel title="NPS over time" description="Promoters minus detractors, by month">
              <TimeSeriesChart
                label="NPS by month"
                labels={MONTHS}
                series={[{ id: "nps", name: "NPS", data: [31, 34, 33, 38, 41, 44] }]}
                yMax={100}
                xTicks={6}
                height={200}
              />
            </Panel>
            <Panel title="Scores, 30 days">
              <DonutChart
                label="Promoters, passives and detractors"
                caption="answers"
                slices={[
                  { id: "pro", name: "Promoters, 9 and 10", value: 667, color: "var(--oa-success)" },
                  { id: "pas", name: "Passives, 7 and 8", value: 351 },
                  { id: "det", name: "Detractors, 0 to 6", value: 194, color: "var(--oa-danger)" },
                ]}
              />
            </Panel>
          </div>
          <Panel title="Latest reasons" description="Shown after the score: what to do better for 0 to 6, what they like for 9 and 10">
            <ul aria-label="Latest reasons" className="flex flex-col gap-2">
              {[
                { who: "Gizem Avcı", score: 9, text: "Bank feeds save us a day every month." },
                { who: "Seda Polat", score: 4, text: "e-Arşiv invoices failed to send for a morning and nobody told us." },
                { who: "Kerem Aksoy", score: 10, text: "Year-end closing took two days instead of a week." },
              ].map((r) => (
                <li key={r.who} className="flex items-start gap-2 text-sm">
                  <Badge tone={r.score >= 9 ? "success" : r.score >= 7 ? "neutral" : "danger"} mono>
                    {r.score}
                  </Badge>
                  <span className="flex flex-col">
                    <span className="text-fg">{r.text}</span>
                    <span className="text-2xs text-fg-muted">{r.who}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      )}
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `domain: ${HOST}
forms_dir: forms/          # one file per form
answers:
  keep: 2y
  partial: { keep: 30d, send: false }
spam:
  hidden_field: website
  min_seconds: 3
  rate: { max: 5, per: 10m, by: address }
  captcha: none
uploads:
  max_size: 10MB
  types: [pdf, png, jpg, xlsx]
  scan: malware            # OpenAsy Malware
send_to:
  audience: audience       # OpenAsy Audience
  crm: crm                 # OpenAsy CRM
  consent: consent         # OpenAsy Consent
  helpdesk: helpdesk       # OpenAsy Helpdesk
  analytics: analytics     # OpenAsy Analytics
roles:
  admins: [group:marketing-leads]
  editors: [group:marketing, group:sales-leads]
  viewers: [group:sales, group:support]`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="forms"
      file="forms.yaml"
      applied="5 days ago"
      yaml={YAML}
      groups={[
        {
          title: "Answers",
          description: "Kept in your install; partial answers are never sent anywhere.",
          items: [
            { label: "Kept for", value: "2 years, then deleted", path: "answers.keep" },
            { label: "Partial answers", value: "Kept 30 days, not sent", path: "answers.partial" },
          ],
        },
        {
          title: "Spam",
          description: "No third-party CAPTCHA is loaded.",
          items: [
            { label: "Hidden field", value: "website", path: "spam.hidden_field" },
            { label: "Too fast", value: "Under 3 seconds", path: "spam.min_seconds" },
            { label: "Too many", value: "More than 5 in 10 minutes from one address", path: "spam.rate" },
          ],
        },
        {
          title: "Uploads",
          items: [{ label: "Files", value: "PDF, PNG, JPG, XLSX up to 10 MB, scanned by Malware", path: "uploads" }],
        },
        {
          title: "Who may change what",
          items: [{ label: "Roles", value: "Marketing leads are admins; marketing and sales leads edit forms; sales and support see answers", path: "roles" }],
        },
      ]}
    />
  );
}

const PAGES: PageMap = {
  forms: () => <FormsPage />,
  answers: () => <AnswersPage />,
  results: () => <ResultsPage />,
  settings: () => <SettingsPage />,
};

const app = (initial: string, pages: PageMap = PAGES): Story => ({ render: () => <ProductApp product="forms" nav={nav} pages={pages} initial={initial} /> });
const editor = (tab: EditorTab): PageMap => ({ ...PAGES, forms: () => <FormsPage initialForm="demo-request" initialTab={tab} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();
const body = (el: HTMLElement) => within(el.ownerDocument.body);

/* ----------------------------------------------------------------- stories */

export const Forms: Story = {
  ...app("forms"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Forms" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(7);
    await userEvent.click(c.getByRole("radio", { name: "NPS" }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await expect(table).toHaveTextContent("Customer NPS");
    await userEvent.click(c.getByRole("radio", { name: "All" }));
    await userEvent.type(c.getByRole("searchbox", { name: "Search forms" }), "webinar");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    blur(canvasElement);
  },
};

export const NewForm: Story = {
  name: "New form",
  ...app("forms"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New form" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "New form" }));
    await expect(dialog.getByRole("button", { name: "Create form" })).toBeDisabled();
    await userEvent.type(dialog.getByRole("textbox", { name: "Name" }), "Payroll export interest");
    await expect(dialog.getByText("forms/payroll-export-interest.yaml")).toBeInTheDocument();
    await userEvent.click(dialog.getByRole("button", { name: "Create form" }));
    await expect(c.getByRole("heading", { level: 1, name: "Payroll export interest" })).toBeInTheDocument();
    await expect(c.getByText("Kept in forms/payroll-export-interest.yaml")).toBeInTheDocument();
  },
};

export const Builder: Story = {
  name: "Build a form",
  ...app("forms", editor("fields")),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const preview = within(c.getByRole("region", { name: "Preview" }));
    await expect(preview.getByText("Step 1 of 2: About you")).toBeInTheDocument();
    await userEvent.click(preview.getByRole("button", { name: "Next" }));
    await expect(preview.queryByRole("spinbutton", { name: /How many branches/ })).not.toBeInTheDocument();
    await userEvent.selectOptions(preview.getByRole("combobox", { name: /Company size/ }), "50 to 249");
    await expect(preview.getByRole("spinbutton", { name: /How many branches/ })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Phone" }));
    await userEvent.click(c.getByRole("switch", { name: "Required" }));
    await expect(c.getByRole("button", { name: /^Phone\s*Required$/ })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const AddField: Story = {
  name: "Add a field",
  ...app("forms", editor("fields")),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: "2. Your company" }));
    await userEvent.click(c.getByRole("button", { name: "Add a field" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add a field" }));
    await userEvent.click(dialog.getByRole("button", { name: "File upload" }));
    await expect(dialog.getByText(/scanned by Malware/)).toBeInTheDocument();
    await userEvent.type(dialog.getByRole("textbox", { name: "Question" }), "A sample invoice");
    await userEvent.click(dialog.getByRole("button", { name: "Add field" }));
    await expect(c.getByRole("list", { name: "Fields on this page" })).toHaveTextContent("A sample invoice");
    await expect(c.getByRole("region", { name: "Field settings" })).toHaveTextContent("File upload");
    await userEvent.click(c.getByRole("button", { name: "Save as YAML" }));
    await expect(body(canvasElement).getByLabelText("Form as YAML")).toHaveTextContent('type: file, label: "A sample invoice"');
  },
};

export const Logic: Story = {
  ...app("forms", editor("logic")),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const rules = c.getByRole("list", { name: "Rules" });
    await expect(rules).toHaveTextContent("Show How many branches? when Company size is 50 to 249 or 250 or more");
    await userEvent.click(c.getByRole("button", { name: "Add a rule" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add a rule" }));
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "When" }), "City");
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Is" }), "Another city");
    await userEvent.click(dialog.getByRole("button", { name: "Add rule" }));
    await expect(within(rules).getAllByRole("listitem")).toHaveLength(2);
    await expect(rules).toHaveTextContent("when City is Another city");
    await expect(c.getByText("Forms keeps to short forms")).toBeInTheDocument();
  },
};

export const Share: Story = {
  ...app("forms", editor("share")),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Code to paste")).toHaveTextContent('data-openasy-form="demo-request"');
    await userEvent.click(c.getByRole("radio", { name: "Popup from a button" }));
    await expect(c.getByLabelText("Code to paste")).toHaveTextContent('data-mode="popup"');
    await userEvent.click(c.getByRole("button", { name: "Copy code" }));
    await expect(within(c.getByRole("region", { name: "Embed" })).getByRole("status")).toHaveTextContent("Code copied.");
    await userEvent.type(c.getByRole("textbox", { name: "Work email" }), "ayse@yilmazmuhasebe.example.com");
    await expect(c.getByLabelText("Link")).toHaveTextContent(
      `https://${HOST}/demo-request?email=ayse%40yilmazmuhasebe.example.com&utm_campaign=autumn-2026&hide=email`,
    );
    blur(canvasElement);
  },
};

export const Routing: Story = {
  ...app("forms", editor("routing")),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Destinations" })).getAllByRole("listitem")).toHaveLength(5);
    await expect(c.getByRole("list", { name: "Spam checks" })).toHaveTextContent("less than 3 seconds");
    await userEvent.click(c.getByRole("button", { name: "Send a test answer" }));
    await expect(within(c.getByRole("region", { name: "Where answers go" })).getByRole("status")).toHaveTextContent("reached all 5");
    await expect(within(c.getByRole("list", { name: "Destinations" })).getAllByText("Test received")).toHaveLength(5);
  },
};

export const Answers: Story = {
  ...app("answers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const answer = c.getByRole("region", { name: "Answer" });
    await expect(answer).toHaveTextContent("Ayşe Yılmaz, Yılmaz Muhasebe");
    await expect(within(answer).getByRole("list", { name: "Where it went" })).toHaveTextContent("Contact and a deal in Demo for Hakan Yıldız");
    await expect(answer).toHaveTextContent("Ticked next to text v3");
    await userEvent.click(within(c.getByRole("table", { name: "Answers" })).getByText("Can Öztürk"));
    await expect(c.getByRole("region", { name: "Answer" })).toHaveTextContent("Not ticked. Messages will not send this person offers.");
    await userEvent.type(c.getByRole("searchbox", { name: "Search answers" }), "kaya");
    await expect(
      within(c.getByRole("table", { name: "Answers" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(1);
    blur(canvasElement);
  },
};

export const FilterAnswers: Story = {
  name: "Filter answers",
  ...app("answers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Consent" }));
    await userEvent.click(body(canvasElement).getByRole("checkbox", { name: /Not ticked/ }));
    await userEvent.keyboard("{Escape}");
    const table = c.getByRole("table", { name: "Answers" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await userEvent.click(c.getByRole("button", { name: "Export CSV" }));
    await expect(c.getByRole("status")).toHaveTextContent("Exported 2 answers as demo-request-2026-11-08.csv");
    blur(canvasElement);
  },
};

export const ResendToCrm: Story = {
  name: "Send an answer to CRM again",
  ...app("answers"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Answers" })).getByText("Deniz Arslan"));
    const answer = c.getByRole("region", { name: "Answer" });
    await expect(within(answer).getByRole("list", { name: "Where it went" })).toHaveTextContent("CRM did not answer");
    await userEvent.click(within(answer).getByRole("button", { name: "Send to CRM again" }));
    await expect(c.getByRole("status")).toHaveTextContent("Deniz Arslan's answer reached CRM: a deal in Demo for Burak Şahin.");
    await expect(within(c.getByRole("region", { name: "Answer" })).queryByText("Failed")).not.toBeInTheDocument();
  },
};

export const PartialAnswers: Story = {
  name: "Partial answers",
  ...app("answers", { ...PAGES, answers: () => <AnswersPage initialTab="partial" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Partial answers" });
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(3);
    await expect(table).toHaveTextContent("okan@tekinyapi.example.com");
    await expect(c.getByText(/sent nowhere, and deleted after 30 days/)).toBeInTheDocument();
  },
};

export const Spam: Story = {
  ...app("answers", { ...PAGES, answers: () => <AnswersPage initialTab="spam" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Spam" });
    await expect(table).toHaveTextContent("The hidden field was filled");
    const row = within(table).getByText("Kerem Aksoy").closest("tr")!;
    await userEvent.click(within(row).getByRole("button", { name: "Not spam" }));
    await expect(c.getByRole("status")).toHaveTextContent("Kerem Aksoy's answer is not spam");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await expect(c.getByRole("tab", { name: /Spam/ })).toHaveTextContent("2");
  },
};

export const Results: Story = {
  ...app("results"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "People who reached each field" })).toHaveTextContent("Page 2: Company");
    await expect(c.getByText("57 of 198 people leave between the two pages")).toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "Customer NPS" }));
    await expect(c.getByRole("figure", { name: "NPS by month" })).toBeInTheDocument();
    await expect(c.getByRole("list", { name: "Latest reasons" })).toHaveTextContent("e-Arşiv invoices failed to send");
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("forms.yaml as applied")).toHaveTextContent("captcha: none");
  },
};
