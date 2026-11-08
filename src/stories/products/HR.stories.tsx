import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  FileText,
  FileUp,
  House,
  IdCard,
  ListChecks,
  Network,
  Pencil,
  Plus,
  ShieldCheck,
  Upload,
  UserMinus,
  Users,
} from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { FileSettingsPage } from "../shared/FileSettings";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Checkbox, SearchInput, SelectField, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Dialog } from "../../components/Dialog";
import { BarList } from "../../charts/BarList";
import type { Tone } from "../../tokens/levels";
import { cn } from "../../lib/cn";

// HR keeps each employee's record: a directory part everyone signed in reads, and the work, personal, pay, documents
// and leave parts that hr.yaml's access gives out. Every look at a record is logged and every change is kept field by
// field. Leave follows Turkish law by default (İş Kanunu md. 53: 14, 20 or 26 days by seniority, working days without
// the week's days off and public holidays, half days on Bayram eves). Joining and leaving start checklists, and Identity
// makes or turns off the account on the day through SCIM.

const nav = [
  { id: "home", label: "Home", icon: House },
  { id: "people", label: "People", icon: Users },
  { id: "org", label: "Org chart", icon: Network },
  { id: "leave", label: "Leave", icon: CalendarDays, count: 2 },
  { id: "joining", label: "Joining and leaving", icon: ListChecks, count: 6 },
  { id: "documents", label: "Documents", icon: FileText, count: 3 },
  { id: "me", label: "My record", icon: IdCard },
];

const meta = {
  title: "Products/HR",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = "Emily Clark";
const tl = (n: number) => `${n.toLocaleString("en")} TL`;
const days = (n: number) => `${n.toLocaleString("en")} ${n === 1 ? "day" : "days"}`;

type Dept = "management" | "sales" | "finance" | "engineering" | "support" | "people" | "operations";
const DEPTS: Record<Dept, string> = {
  management: "Management",
  sales: "Sales",
  finance: "Finance",
  engineering: "Engineering",
  support: "Customer Support",
  people: "People",
  operations: "Operations",
};

type Location = "istanbul" | "izmir";
const LOCATIONS: Record<Location, string> = { istanbul: "İstanbul HQ", izmir: "İzmir factory" };

interface Employee {
  id: string;
  number: string;
  name: string;
  email: string;
  position: string;
  dept: Dept;
  manager: string | null;
  location: Location;
  start: string;
  /** Start of service with Acme, for md. 53; may be before the start day in HR (md. 54). */
  serviceYears: number;
  age: number;
  type: "Full time" | "Part time" | "Fixed term";
  status: "working" | "starting" | "leaving";
  /** Annual leave left, in working days. */
  balance: number;
}

const PEOPLE: Employee[] = [
  {
    id: "e01",
    number: "1001",
    name: "Murat Aksoy",
    email: "murat@example.com",
    position: "Chief Executive Officer",
    dept: "management",
    manager: null,
    location: "istanbul",
    start: "4 Jan 2010",
    serviceYears: 16,
    age: 51,
    type: "Full time",
    status: "working",
    balance: 31,
  },
  {
    id: "e02",
    number: "1007",
    name: ME,
    email: "emily@example.com",
    position: "Sales Director",
    dept: "sales",
    manager: "e01",
    location: "istanbul",
    start: "4 Mar 2019",
    serviceYears: 7,
    age: 38,
    type: "Full time",
    status: "working",
    balance: 14.5,
  },
  {
    id: "e03",
    number: "1042",
    name: "Ali Demir",
    email: "ali@example.com",
    position: "Account Executive",
    dept: "sales",
    manager: "e02",
    location: "istanbul",
    start: "13 Jun 2022",
    serviceYears: 4,
    age: 29,
    type: "Full time",
    status: "working",
    balance: 11,
  },
  {
    id: "e04",
    number: "1031",
    name: "Hakan Yıldız",
    email: "hakan@example.com",
    position: "Account Manager",
    dept: "sales",
    manager: "e02",
    location: "istanbul",
    start: "1 Sep 2020",
    serviceYears: 6,
    age: 34,
    type: "Full time",
    status: "working",
    balance: 17.5,
  },
  {
    id: "e05",
    number: "1036",
    name: "Selin Aydın",
    email: "selin@example.com",
    position: "Account Manager",
    dept: "sales",
    manager: "e02",
    location: "istanbul",
    start: "15 Feb 2021",
    serviceYears: 5,
    age: 31,
    type: "Full time",
    status: "working",
    balance: 6,
  },
  {
    id: "e06",
    number: "1058",
    name: "Burak Şahin",
    email: "burak@example.com",
    position: "Sales Development Representative",
    dept: "sales",
    manager: "e02",
    location: "istanbul",
    start: "2 Oct 2025",
    serviceYears: 1,
    age: 24,
    type: "Full time",
    status: "working",
    balance: 14,
  },
  {
    id: "e07",
    number: "1003",
    name: "Deniz Şen",
    email: "cfo@example.com",
    position: "Chief Financial Officer",
    dept: "finance",
    manager: "e01",
    location: "istanbul",
    start: "1 Apr 2012",
    serviceYears: 14,
    age: 46,
    type: "Full time",
    status: "working",
    balance: 22,
  },
  {
    id: "e08",
    number: "1044",
    name: "Elif Koç",
    email: "elif@example.com",
    position: "Accountant",
    dept: "finance",
    manager: "e07",
    location: "istanbul",
    start: "5 Sep 2022",
    serviceYears: 4,
    age: 27,
    type: "Full time",
    status: "working",
    balance: 9,
  },
  {
    id: "e09",
    number: "1063",
    name: "Ayşe Yılmaz",
    email: "ayse@example.com",
    position: "Accountant",
    dept: "finance",
    manager: "e07",
    location: "istanbul",
    start: "1 Dec 2026",
    serviceYears: 0,
    age: 26,
    type: "Full time",
    status: "starting",
    balance: 0,
  },
  {
    id: "e10",
    number: "1005",
    name: "Kerem Öz",
    email: "cto@example.com",
    position: "Chief Technology Officer",
    dept: "engineering",
    manager: "e01",
    location: "istanbul",
    start: "1 Jun 2011",
    serviceYears: 15,
    age: 44,
    type: "Full time",
    status: "working",
    balance: 26,
  },
  {
    id: "e11",
    number: "1055",
    name: "Lukas Becker",
    email: "lukas@example.com",
    position: "Senior Software Engineer",
    dept: "engineering",
    manager: "e10",
    location: "istanbul",
    start: "1 Sep 2025",
    serviceYears: 1,
    age: 36,
    type: "Fixed term",
    status: "working",
    balance: 9,
  },
  {
    id: "e12",
    number: "1047",
    name: "Merve Çelik",
    email: "merve@example.com",
    position: "Software Engineer",
    dept: "engineering",
    manager: "e10",
    location: "istanbul",
    start: "9 Jan 2023",
    serviceYears: 3,
    age: 28,
    type: "Full time",
    status: "working",
    balance: 12,
  },
  {
    id: "e13",
    number: "1039",
    name: "Can Öztürk",
    email: "can@example.com",
    position: "Software Engineer",
    dept: "engineering",
    manager: "e10",
    location: "istanbul",
    start: "3 May 2021",
    serviceYears: 5,
    age: 30,
    type: "Full time",
    status: "leaving",
    balance: 6.5,
  },
  {
    id: "e14",
    number: "1050",
    name: "Mert Kaya",
    email: "mert@example.com",
    position: "Support Specialist",
    dept: "support",
    manager: "e10",
    location: "istanbul",
    start: "6 Mar 2023",
    serviceYears: 3,
    age: 27,
    type: "Full time",
    status: "working",
    balance: 8,
  },
  {
    id: "e15",
    number: "1012",
    name: "Zeynep Arslan",
    email: "zeynep@example.com",
    position: "HR Manager",
    dept: "people",
    manager: "e01",
    location: "istanbul",
    start: "14 Jan 2016",
    serviceYears: 10,
    age: 41,
    type: "Full time",
    status: "working",
    balance: 18,
  },
  {
    id: "e16",
    number: "1009",
    name: "Serkan Yurt",
    email: "serkan@example.com",
    position: "Factory Manager",
    dept: "operations",
    manager: "e01",
    location: "izmir",
    start: "2 Feb 2015",
    serviceYears: 11,
    age: 48,
    type: "Full time",
    status: "working",
    balance: 20,
  },
  {
    id: "e17",
    number: "1048",
    name: "Hasan Kurt",
    email: "hasan@example.com",
    position: "Production Operator",
    dept: "operations",
    manager: "e16",
    location: "izmir",
    start: "7 Mar 2023",
    serviceYears: 3,
    age: 52,
    type: "Full time",
    status: "working",
    balance: 15,
  },
  {
    id: "e18",
    number: "1052",
    name: "Gül Ateş",
    email: "gul@example.com",
    position: "Quality Technician",
    dept: "operations",
    manager: "e16",
    location: "izmir",
    start: "4 Sep 2023",
    serviceYears: 3,
    age: 33,
    type: "Part time",
    status: "working",
    balance: 7,
  },
];

const byId = (id: string | null) => PEOPLE.find((p) => p.id === id);
const nameOf = (id: string | null) => byId(id)?.name ?? "Nobody";

/** İş Kanunu md. 53 as hr.yaml writes it: by completed years of service, at least 20 at 18 or younger and 50 or older. */
function annualGrant(p: Employee): { days: number; why: string } {
  if (p.serviceYears < 1) return { days: 0, why: "Nothing in the first year" };
  const bySeniority = p.serviceYears >= 15 ? 26 : p.serviceYears >= 6 ? 20 : 14;
  const band = p.serviceYears >= 15 ? "15 years or more" : p.serviceYears >= 6 ? "6 to 14 years" : "1 to 5 years";
  if ((p.age <= 18 || p.age >= 50) && bySeniority < 20) return { days: 20, why: `At least 20 days at ${p.age}` };
  return { days: bySeniority, why: band };
}

const STATUS: Record<Employee["status"], { label: string; tone: Tone }> = {
  working: { label: "Working", tone: "success" },
  starting: { label: "Starts 1 Dec", tone: "info" },
  leaving: { label: "Leaves 30 Nov", tone: "warning" },
};

/* ------------------------------------------------------------------ home */

const UPCOMING = [
  { id: "u1", when: "Mon 9 Nov", what: "Merve Çelik's certificate expires in 12 days", kind: "Document" },
  { id: "u2", when: "Tue 17 Nov", what: "Lukas Becker's probation ends", kind: "Probation" },
  { id: "u3", when: "Mon 30 Nov", what: "Can Öztürk's last day; Identity turns the account off at 18:00", kind: "Leaving" },
  { id: "u4", when: "Tue 1 Dec", what: "Ayşe Yılmaz starts in Finance; Identity makes the account at 07:00", kind: "Joining" },
  { id: "u5", when: "Fri 18 Dec", what: "Lukas Becker's work permit expires", kind: "Document" },
  { id: "u6", when: "Thu 31 Dec", what: "Lukas Becker's fixed-term contract ends", kind: "Contract" },
  { id: "u7", when: "Thu 14 Jan", what: "Zeynep Arslan: 10 years with Acme", kind: "Anniversary" },
];

const KIND_TONE: Record<string, Tone> = {
  Document: "warning",
  Probation: "info",
  Leaving: "warning",
  Joining: "info",
  Contract: "warning",
  Anniversary: "neutral",
};

function HomePage({ onOpen }: { onOpen: (id: string) => void }) {
  const working = PEOPLE.filter((p) => p.status !== "starting");
  return (
    <>
      <PageHeader title="Home" description={`What waits for ${ME} today, who is away and what is coming up in the next 60 days.`} />
      <KpiGrid minWidth={160} className="mb-2.5">
        <KpiCard label="People working" value={String(working.length)} delta={{ label: "2 locations", intent: "neutral" }} />
        <KpiCard label="Joining" value="1" delta={{ label: "Ayşe Yılmaz, 1 Dec", intent: "neutral" }} />
        <KpiCard label="Leaving" value="1" delta={{ label: "Can Öztürk, 30 Nov", intent: "neutral" }} />
        <KpiCard label="Leave to approve" value="2" tone="warning" delta={{ label: "waiting for you as manager", intent: "neutral" }} />
        <KpiCard label="Documents expiring" value="3" tone="warning" delta={{ label: "1 expired", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Waiting for you" aria-label="Waiting for you">
            <ul aria-label="Your tasks" className="flex flex-col gap-2 text-sm">
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>Ali Demir asks for annual leave, 14 to 18 Dec: 5 working days</span>
                <StatusBadge tone="warning">Step 1 of 2: you</StatusBadge>
              </li>
              <li className="flex flex-wrap items-center justify-between gap-2">
                <span>Hakan Yıldız asks for the afternoon of Fri 13 Nov: half a day</span>
                <StatusBadge tone="warning">Step 1 of 2: you</StatusBadge>
              </li>
            </ul>
          </Panel>
          <Panel title="Coming up" description="Starts, ends, probation and contract ends, anniversaries and documents" flush>
            <ul aria-label="Coming up" className="flex flex-col">
              {UPCOMING.map((u) => (
                <li key={u.id} className="flex items-center gap-3 border-b border-subtle px-3 py-2 text-sm last:border-0">
                  <span className="w-24 shrink-0 text-xs text-fg-muted">{u.when}</span>
                  <span className="min-w-0 grow">{u.what}</span>
                  <Badge tone={KIND_TONE[u.kind]}>{u.kind}</Badge>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <div className="flex flex-col gap-2.5">
          <Panel title="Away today" description="Mon 9 Nov">
            <ul aria-label="Away today" className="flex flex-col gap-2 text-sm">
              {[
                { id: "e05", note: "Annual leave until Wed" },
                { id: "e12", note: "Away until Tue" },
              ].map((a) => (
                <li key={a.id} className="flex items-center gap-2">
                  <Avatar name={nameOf(a.id)} size="sm" />
                  <span className="flex min-w-0 flex-col">
                    <button type="button" onClick={() => onOpen(a.id)} className="truncate text-left text-fg hover:underline">
                      {nameOf(a.id)}
                    </button>
                    <span className="text-2xs text-fg-muted">{a.note}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="People by department">
            <BarList
              label="People by department"
              items={(Object.keys(DEPTS) as Dept[]).map((d) => ({ id: d, label: DEPTS[d], value: working.filter((p) => p.dept === d).length }))}
            />
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- record */

type Part = "work" | "personal" | "pay" | "documents" | "leave" | "history" | "access";
const READ_BY: Record<Exclude<Part, "history" | "access">, string> = {
  work: "The person, everyone above them and HR viewers",
  personal: "The person and HR editors",
  pay: "The person and HR viewers, such as Payroll's token",
  documents: "The person and HR editors",
  leave: "The person, everyone above them and HR viewers",
};

interface Look {
  id: string;
  who: string;
  as: string;
  at: string;
  parts: string;
}

const LOOKS: Look[] = [
  { id: "l1", who: "Payroll", as: "viewer token", at: "1 Nov 03:00", parts: "work, pay, personal: T.C. kimlik no; November's month" },
  { id: "l2", who: "Zeynep Arslan", as: "editor", at: "28 Oct 10:12", parts: "personal, documents" },
  { id: "l3", who: ME, as: "manager", at: "21 Oct 16:40", parts: "work, leave" },
];

const phoneOf = (p: Employee) => `+90 532 000 ${p.number.slice(0, 2)} ${p.number.slice(2)}`;

const historyOf = (p: Employee) => [
  { id: "h1", at: "2 Nov 09:14", who: p.name, field: "Phone", from: "+90 532 000 11 22", to: phoneOf(p) },
  { id: "h2", at: "1 Jul 09:00", who: "Zeynep Arslan", field: "Salary", from: "72,000 TL", to: "86,000 TL" },
  { id: "h3", at: "1 Jul 09:00", who: "Zeynep Arslan", field: "Position", from: "Sales Development Representative", to: "Account Executive" },
  { id: "h4", at: p.start, who: "Zeynep Arslan", field: "Record", from: "–", to: "Added from the CSV import" },
];

const PAY = [
  { id: "p1", from: "1 Jul 2026", gross: 86000, why: "Promoted to Account Executive" },
  { id: "p2", from: "1 Jan 2026", gross: 72000, why: "Yearly raise" },
  { id: "p3", from: "1 Jan 2025", gross: 58000, why: "Yearly raise" },
];

const DOC_KINDS = [
  { value: "contract", label: "Employment contract", expires: false },
  { value: "id-copy", label: "ID copy", expires: true },
  { value: "health-report", label: "Health report", expires: false },
  { value: "work-permit", label: "Work permit", expires: true },
  { value: "certificate", label: "Certificate", expires: true },
  { value: "other", label: "Other", expires: false },
];

interface Doc {
  id: string;
  kind: string;
  file: string;
  added: string;
  expires?: string;
}

const slug = (name: string) =>
  name
    .toLocaleLowerCase("tr")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/\s+/g, "-");

const docsOf = (p: Employee): Doc[] => [
  { id: "d1", kind: "Employment contract", file: `is-sozlesmesi-${slug(p.name)}.pdf`, added: p.start },
  { id: "d2", kind: "ID copy", file: `kimlik-${slug(p.name)}.pdf`, added: p.start, expires: "4 Mar 2031" },
  { id: "d3", kind: "Health report", file: "rapor-2026-03.pdf", added: "16 Mar 2026" },
];

const RECORD_LEAVE = [
  { id: "r1", type: "Annual leave", dates: "14 to 18 Dec", days: 5, state: "Waiting for you" },
  { id: "r2", type: "Annual leave", dates: "17 to 21 Aug", days: 5, state: "Approved" },
  { id: "r3", type: "Sick leave", dates: "16 to 17 Mar", days: 2, state: "Approved" },
];

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="contents">
      <dt className="text-fg-muted">{label}</dt>
      <dd className={cn("min-w-0 text-fg", mono && "font-mono")}>{value}</dd>
    </div>
  );
}

function ReadBy({ part }: { part: keyof typeof READ_BY }) {
  return (
    <p className="mb-2 flex items-center gap-1.5 text-xs text-fg-muted">
      <ShieldCheck aria-hidden className="size-3.5" />
      Read by: {READ_BY[part]}. Opening it is logged.
    </p>
  );
}

function RecordView({ person, onBack, initialPart = "work" }: { person: Employee; onBack: () => void; initialPart?: Part }) {
  const [part, setPart] = useState<Part>(initialPart);
  const [looks, setLooks] = useState(LOOKS);
  const [docs, setDocs] = useState(() => docsOf(person));
  const [adding, setAdding] = useState(false);
  const [kind, setKind] = useState("certificate");
  const [expires, setExpires] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const grant = annualGrant(person);
  const manager = byId(person.manager);
  const kindMeta = DOC_KINDS.find((k) => k.value === kind);
  const open = (p: Part) => {
    setPart(p);
    if (p === "pay" || p === "personal" || p === "documents") {
      setLooks((l) => [{ id: `l${l.length + 1}`, who: ME, as: "admin", at: "Just now", parts: p }, ...l]);
    }
  };
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "People", href: "#people" }, { label: person.name }]}
        title={person.name}
        meta={<StatusBadge tone={STATUS[person.status].tone}>{STATUS[person.status].label}</StatusBadge>}
        description={`${person.position}, ${DEPTS[person.dept]} · ${LOCATIONS[person.location]} · reports to ${manager?.name ?? "nobody"}`}
        actions={
          <Button icon={<ArrowLeft />} onClick={onBack}>
            Back to people
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Tabs
            label="Parts of the record"
            value={part}
            onChange={open}
            items={[
              { value: "work", label: "Work" },
              { value: "personal", label: "Personal" },
              { value: "pay", label: "Pay" },
              { value: "documents", label: "Documents", count: docs.length },
              { value: "leave", label: "Leave" },
              { value: "history", label: "History" },
              { value: "access", label: "Access log", count: looks.length },
            ]}
          />
          {part === "work" && (
            <Panel title="Work" aria-label="Work">
              <ReadBy part="work" />
              <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                <Field label="Employee number" value={person.number} mono />
                <Field label="Employment" value={person.type} />
                <Field label="Start day" value={person.start} />
                <Field label="Service start" value={`${person.start} (${person.serviceYears} years)`} />
                <Field
                  label="Probation"
                  value={person.id === "e11" ? "Ends 17 Nov 2026" : person.status === "starting" ? "Two months from the start day" : "Ended"}
                />
                <Field label="Contract" value={person.type === "Fixed term" ? "Fixed term, ends 31 Dec 2026" : `Indefinite, signed ${person.start}`} />
                <Field label="Work week" value={person.location === "izmir" ? "Monday to Saturday" : "Monday to Friday"} />
              </dl>
            </Panel>
          )}
          {part === "personal" && (
            <Panel title="Personal" aria-label="Personal" description="Encrypted at rest; the person changes their own contact details">
              <ReadBy part="personal" />
              <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
                <Field label="T.C. kimlik no" value="104•••••846" mono />
                <Field label="Birth date" value={`14 May ${2026 - person.age - 1}`} />
                <Field label="Nationality" value={person.id === "e11" ? "Germany" : person.id === "e02" ? "United Kingdom" : "Türkiye"} />
                <Field label="Marital status" value="Single" />
                <Field label="Phone" value={phoneOf(person)} mono />
                <Field label="Personal email" value={`${slug(person.name)}@mail.example.com`} />
                <Field label="Address" value={person.location === "izmir" ? "Atatürk Cad. 48/2, Karşıyaka, İzmir" : "Moda Cad. 12/4, Kadıköy, İstanbul"} />
                <Field label="Emergency contact" value={`${person.name.split(" ").at(-1)} family, +90 533 000 22 11`} />
              </dl>
            </Panel>
          )}
          {part === "pay" && (
            <Panel title="Pay" aria-label="Pay" flush>
              <div className="px-3 pt-2">
                <ReadBy part="pay" />
                <p className="pb-2 text-sm">
                  Paid to <span className="font-mono">TR33 0006 1005 1978 6457 8413 26</span>, Garanti BBVA. Payroll reads the current pay each month.
                </p>
              </div>
              <DataTable
                label="Pay over time"
                rows={PAY}
                getRowId={(r) => r.id}
                minWidth={480}
                columns={[
                  { id: "from", header: "From", cell: (r) => r.from },
                  { id: "gross", header: "Gross a month", align: "right", mono: true, cell: (r) => tl(r.gross) },
                  { id: "why", header: "Why", cell: (r) => r.why },
                ]}
              />
            </Panel>
          )}
          {part === "documents" && (
            <Panel
              title="Documents"
              aria-label="Documents"
              actions={
                <Button size="sm" icon={<Upload />} onClick={() => setAdding(true)}>
                  Add document
                </Button>
              }
              flush
            >
              <div className="px-3 pt-2">
                <ReadBy part="documents" />
              </div>
              <DataTable
                label="Documents of the record"
                rows={docs}
                getRowId={(d) => d.id}
                minWidth={520}
                columns={[
                  { id: "kind", header: "Kind", cell: (d) => d.kind },
                  { id: "file", header: "File", cell: (d) => <span className="font-mono text-xs">{d.file}</span> },
                  { id: "added", header: "Added", cell: (d) => d.added },
                  { id: "expires", header: "Expires", cell: (d) => d.expires ?? <span className="text-xs text-fg-muted">Does not expire</span> },
                ]}
              />
            </Panel>
          )}
          {part === "leave" && (
            <Panel title="Leave" aria-label="Leave" flush>
              <div className="px-3 pt-2">
                <ReadBy part="leave" />
                <KpiGrid minWidth={150} className="pb-2">
                  <KpiCard label="Annual leave left" value={days(person.balance)} />
                  <KpiCard label="Yearly grant" value={days(grant.days)} unit={grant.why} />
                  <KpiCard
                    label="Next grant"
                    value={person.start.replace(/\d{4}$/, "2027")}
                    unit={`${days(annualGrant({ ...person, serviceYears: person.serviceYears + 1 }).days)}`}
                  />
                </KpiGrid>
              </div>
              <DataTable
                label="Leave requests of the record"
                rows={RECORD_LEAVE}
                getRowId={(r) => r.id}
                minWidth={480}
                columns={[
                  { id: "type", header: "Type", cell: (r) => r.type },
                  { id: "dates", header: "Dates", cell: (r) => r.dates },
                  { id: "days", header: "Days", align: "right", mono: true, cell: (r) => r.days },
                  {
                    id: "state",
                    header: "State",
                    cell: (r) => <StatusBadge tone={r.state === "Approved" ? "success" : "warning"}>{r.state}</StatusBadge>,
                  },
                ]}
              />
            </Panel>
          )}
          {part === "history" && (
            <Panel title="History" aria-label="History" description="Every change, field by field; shown to those who read that part" flush>
              <DataTable
                label="Changes to the record"
                rows={historyOf(person)}
                getRowId={(h) => h.id}
                minWidth={620}
                columns={[
                  { id: "at", header: "When", cell: (h) => h.at },
                  { id: "who", header: "By", cell: (h) => h.who },
                  { id: "field", header: "Field", cell: (h) => h.field },
                  { id: "from", header: "Was", cell: (h) => <span className="text-fg-muted">{h.from}</span> },
                  { id: "to", header: "Now", cell: (h) => h.to },
                ]}
              />
            </Panel>
          )}
          {part === "access" && (
            <Panel
              title="Access log"
              aria-label="Access log"
              description="Who looked at the record, as whom and at which parts (KVKK md. 11). The person reads it too."
              flush
            >
              <DataTable
                label="Looks at the record"
                rows={looks}
                getRowId={(l) => l.id}
                minWidth={620}
                columns={[
                  { id: "at", header: "When", cell: (l) => l.at },
                  { id: "who", header: "Who", cell: (l) => l.who },
                  { id: "as", header: "As", cell: (l) => <Badge>{l.as}</Badge> },
                  { id: "parts", header: "Parts", cell: (l) => l.parts },
                ]}
              />
            </Panel>
          )}
        </div>
        <div className="flex flex-col gap-2.5">
          <Panel title="Directory" description="Everyone signed in reads this">
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-2">
                <Avatar name={person.name} />
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-fg">{person.name}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">{person.email}</span>
                </span>
              </span>
              <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1">
                <Field label="Department" value={DEPTS[person.dept]} />
                <Field label="Position" value={person.position} />
                <Field label="Manager" value={manager?.name ?? "Nobody"} />
                <Field label="Location" value={LOCATIONS[person.location]} />
                <Field label="Started" value={person.start} />
              </dl>
            </div>
          </Panel>
          <Panel title="Identity account">
            <p className="flex items-center gap-2 text-xs text-fg">
              <StatusBadge tone="success">In step</StatusBadge>
              Groups {DEPTS[person.dept]} and Employees
            </p>
          </Panel>
        </div>
      </div>
      <Dialog
        open={adding}
        onOpenChange={setAdding}
        title={`Add a document to ${person.name}'s record`}
        onSubmit={(e) => {
          e.preventDefault();
          if (kindMeta?.expires && !expires) return;
          setDocs((d) => [
            ...d,
            {
              id: `d${d.length + 1}`,
              kind: kindMeta?.label ?? kind,
              file: `sertifika-${slug(person.name)}.pdf`,
              added: "Today",
              expires: expires || undefined,
            },
          ]);
          setNotice(`${kindMeta?.label} added. HR is emailed once it comes within 30 days of expiring.`);
          setAdding(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={!!kindMeta?.expires && !expires}>
              Add
            </Button>
          </>
        }
      >
        <SelectField label="Kind" value={kind} onChange={(e) => setKind(e.target.value)} options={DOC_KINDS.map((k) => ({ value: k.value, label: k.label }))} />
        <p className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-fg-muted">
          <FileUp aria-hidden className="size-4" />
          sertifika-{slug(person.name)}.pdf, PDF, 412 KB
        </p>
        {kindMeta?.expires && (
          <TextField
            label="Expires on"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            placeholder="20 Nov 2028"
            hint="This kind needs an expiry day."
          />
        )}
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------------------- people */

const CSV_ROWS = [
  { row: 2, name: "Ayşe Yılmaz", email: "ayse@example.com", result: "Updated: position and start day" },
  { row: 3, name: "Onur Tan", email: "onur@example.com", result: "Added to Operations, İzmir factory; annual balance 9 days" },
  { row: 4, name: "Derya Su", email: "derya@example.com", result: "tckn fails its check digits" },
];

function PeoplePage({ open, setOpen, initialPart }: { open: string | null; setOpen: (id: string | null) => void; initialPart?: Part }) {
  const [query, setQuery] = useState("");
  const [depts, setDepts] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [checked, setChecked] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const person = byId(open);
  if (person) return <RecordView person={person} onBack={() => setOpen(null)} initialPart={initialPart} />;
  const rows = PEOPLE.filter(
    (p) => (!depts.length || depts.includes(p.dept)) && `${p.name} ${p.position} ${p.email}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")),
  );
  const cols: Column<Employee>[] = [
    {
      id: "name",
      header: "Name",
      width: "28%",
      sortValue: (p) => p.name,
      cell: (p) => (
        <span className="flex items-center gap-2">
          <Avatar name={p.name} size="sm" />
          <span className="flex min-w-0 flex-col">
            <button type="button" onClick={() => setOpen(p.id)} className="truncate text-left font-medium text-fg hover:underline">
              {p.name}
            </button>
            <span className="truncate text-2xs text-fg-muted">{p.position}</span>
          </span>
        </span>
      ),
    },
    { id: "dept", header: "Department", sortValue: (p) => DEPTS[p.dept], cell: (p) => DEPTS[p.dept] },
    { id: "manager", header: "Manager", cell: (p) => (p.manager ? nameOf(p.manager) : <span className="text-xs text-fg-muted">Nobody</span>) },
    { id: "location", header: "Location", cell: (p) => LOCATIONS[p.location] },
    { id: "start", header: "Started", cell: (p) => p.start },
    { id: "status", header: "Status", cell: (p) => <StatusBadge tone={STATUS[p.status].tone}>{STATUS[p.status].label}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="People"
        description="Everyone at Acme with their department, position and manager. Everyone signed in reads this directory; the rest of a record is given out by hr.yaml."
        actions={
          <>
            <Button icon={<Upload />} onClick={() => setImporting(true)}>
              Import CSV
            </Button>
            <Button variant="primary" icon={<Plus />}>
              Add employee
            </Button>
          </>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <Panel flush>
        <div className="px-3 py-2">
          <FilterBar onClear={depts.length ? () => setDepts([]) : undefined}>
            <SearchInput
              label="Search people"
              placeholder="Name, position or email"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-64"
            />
            <FacetFilter
              label="Department"
              options={(Object.keys(DEPTS) as Dept[]).map((d) => ({ value: d, label: DEPTS[d], count: PEOPLE.filter((p) => p.dept === d).length }))}
              selected={depts}
              onChange={setDepts}
            />
          </FilterBar>
        </div>
        <div className="border-t border-line">
          <DataTable label="People" columns={cols} rows={rows} getRowId={(p) => p.id} minWidth={820} />
        </div>
      </Panel>
      <Dialog
        open={importing}
        onOpenChange={(o) => {
          setImporting(o);
          setChecked(false);
        }}
        title="Import employees"
        description="A CSV from the old system, with English or Turkish headers. People are matched by work email or number."
        size="lg"
        footer={
          <>
            <Button type="button" onClick={() => setImporting(false)}>
              Cancel
            </Button>
            {checked ? (
              <Button
                variant="primary"
                onClick={() => {
                  setImporting(false);
                  setChecked(false);
                  setNotice("Imported 2 rows from kolay-ik-export.csv. Row 4 was left out: fix it and import the file again.");
                }}
              >
                Import 2 rows
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setChecked(true)}>
                Check rows
              </Button>
            )}
          </>
        }
      >
        <p className="flex items-center gap-2 rounded-md border border-dashed border-line-strong px-3 py-3 text-sm text-fg">
          <FileUp aria-hidden className="size-4 text-fg-muted" />
          kolay-ik-export.csv, 3 rows, separated by ;
        </p>
        <pre className="overflow-x-auto rounded-md bg-canvas px-2.5 py-2 font-mono text-2xs text-fg">
          {`Ad;Soyad;E-posta;İşe Giriş Tarihi;Departman;tckn;yıllık_izin_bakiyesi
Ayşe;Yılmaz;ayse@example.com;01.12.2026;Finance;…;0
Onur;Tan;onur@example.com;03.02.2025;Operations;…;9
Derya;Su;derya@example.com;15.04.2024;Sales;12345678901;4`}
        </pre>
        {checked && (
          <DataTable
            label="Rows checked"
            rows={CSV_ROWS}
            getRowId={(r) => String(r.row)}
            minWidth={520}
            columns={[
              { id: "row", header: "Row", mono: true, cell: (r) => r.row },
              { id: "name", header: "Name", cell: (r) => r.name },
              {
                id: "result",
                header: "Result",
                cell: (r) =>
                  r.row === 4 ? (
                    <span className="flex items-center gap-1.5">
                      <StatusBadge tone="danger">Mistake</StatusBadge>
                      {r.result}
                    </span>
                  ) : (
                    r.result
                  ),
              },
            ]}
          />
        )}
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------- org chart */

function PersonCard({ p, onOpen, lead }: { p: Employee; onOpen: (id: string) => void; lead?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(p.id)}
      className={cn(
        "flex w-full items-center gap-2 rounded-md border bg-surface px-2.5 py-2 text-left hover:border-line-strong",
        lead ? "border-line-strong" : "border-line",
      )}
    >
      <Avatar name={p.name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-fg">{p.name}</span>
        <span className="truncate text-2xs text-fg-muted">{p.position}</span>
      </span>
      {p.status !== "working" && (
        <Badge tone={STATUS[p.status].tone} className="ml-auto">
          {STATUS[p.status].label}
        </Badge>
      )}
    </button>
  );
}

function OrgChartPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const top = PEOPLE.find((p) => !p.manager);
  const reportsOf = (id: string) => PEOPLE.filter((p) => p.manager === id);
  const matches = (p: Employee) => !query || p.name.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"));
  if (!top) return null;
  const leads = reportsOf(top.id);
  const teamMatches = (l: Employee) => matches(l) || reportsOf(l.id).some((r) => matches(r) || reportsOf(r.id).some(matches));
  return (
    <>
      <PageHeader
        title="Org chart"
        description="Everyone working, by manager. A manager reads the work and leave parts of everyone below them, not only their direct reports."
      />
      <div className="mb-2.5">
        <SearchInput label="Find a person" placeholder="Name" value={query} onChange={(e) => setQuery(e.target.value)} className="w-64" />
      </div>
      <div className="mx-auto mb-2.5 w-full max-w-xs">
        <PersonCard p={top} onOpen={onOpen} lead />
        <p className="mt-1 text-center text-2xs text-fg-muted">{leads.length} direct reports</p>
      </div>
      <ul aria-label="Teams" className="grid gap-2.5 md:grid-cols-2 xl:grid-cols-3">
        {leads.filter(teamMatches).map((l) => {
          const team = reportsOf(l.id);
          return (
            <li key={l.id}>
              <section aria-label={`${l.name}'s team`} className="flex flex-col gap-1.5 rounded-lg border border-line bg-canvas p-2">
                <PersonCard p={l} onOpen={onOpen} lead />
                {team.length > 0 && (
                  <ul className="ml-3 flex flex-col gap-1.5 border-l border-line pl-2.5">
                    {team.map((r) => (
                      <li key={r.id} className={cn(!matches(r) && query && "opacity-60")}>
                        <PersonCard p={r} onOpen={onOpen} />
                        {reportsOf(r.id).length > 0 && (
                          <ul className="mt-1.5 ml-3 flex flex-col gap-1.5 border-l border-line pl-2.5">
                            {reportsOf(r.id).map((x) => (
                              <li key={x.id}>
                                <PersonCard p={x} onOpen={onOpen} />
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="px-1 text-2xs text-fg-muted">
                  {DEPTS[l.dept]} · {team.length} {team.length === 1 ? "person" : "people"}
                </p>
              </section>
            </li>
          );
        })}
      </ul>
    </>
  );
}

/* ----------------------------------------------------------------- leave */

type StepState = "waiting" | "approved" | "rejected" | "skipped";
interface Request {
  id: string;
  who: string;
  type: string;
  dates: string;
  days: number;
  note?: string;
  steps: { who: string; state: StepState }[];
}

const REQUESTS: Request[] = [
  {
    id: "q1",
    who: "e03",
    type: "Annual leave",
    dates: "Mon 14 to Fri 18 Dec",
    days: 5,
    note: "Family visit in Trabzon",
    steps: [
      { who: `Manager: ${ME}`, state: "waiting" },
      { who: "HR: Zeynep Arslan or any editor", state: "waiting" },
    ],
  },
  {
    id: "q2",
    who: "e04",
    type: "Annual leave",
    dates: "Fri 13 Nov, afternoon",
    days: 0.5,
    steps: [
      { who: `Manager: ${ME}`, state: "waiting" },
      { who: "HR: Zeynep Arslan or any editor", state: "waiting" },
    ],
  },
  {
    id: "q3",
    who: "e17",
    type: "Annual leave",
    dates: "Mon 16 to Sat 21 Nov",
    days: 6,
    steps: [
      { who: "Manager: Serkan Yurt", state: "approved" },
      { who: "HR: Zeynep Arslan", state: "approved" },
    ],
  },
  {
    id: "q4",
    who: "e12",
    type: "Sick leave",
    dates: "Mon 9 to Tue 10 Nov",
    days: 2,
    steps: [{ who: "HR: Zeynep Arslan", state: "approved" }],
  },
  {
    id: "q5",
    who: "e05",
    type: "Annual leave",
    dates: "Mon 9 to Wed 11 Nov",
    days: 3,
    steps: [
      { who: `Manager: ${ME}`, state: "approved" },
      { who: "HR: Zeynep Arslan", state: "approved" },
    ],
  },
  {
    id: "q6",
    who: "e14",
    type: "Marriage leave",
    dates: "Mon 23 to Wed 25 Nov",
    days: 3,
    steps: [
      { who: "Manager: Kerem Öz", state: "approved" },
      { who: "HR: Zeynep Arslan or any editor", state: "waiting" },
    ],
  },
];

const stateOf = (r: Request): { label: string; tone: Tone } => {
  if (r.steps.some((s) => s.state === "rejected")) return { label: "Rejected", tone: "danger" };
  const next = r.steps.find((s) => s.state === "waiting");
  if (!next) return { label: "Approved", tone: "success" };
  return { label: `Waiting for ${next.who.split(":")[0]}`, tone: "warning" };
};

const mineToDecide = (r: Request) => r.steps.find((s) => s.state === "waiting")?.who === `Manager: ${ME}`;

const LEAVE_TYPES = [
  { value: "annual", label: "Annual leave", counts: "working" as const, halfDays: true },
  { value: "unpaid", label: "Unpaid leave", counts: "working" as const, halfDays: true },
  { value: "marriage", label: "Marriage leave, 3 days", counts: "working" as const, halfDays: false },
  { value: "sick", label: "Sick leave, with a report", counts: "calendar" as const, halfDays: false },
];

/** Public holidays in the request's range: Türkiye's built in, and New Year's Eve added in hr.yaml as a half day. */
const HOLIDAYS: Record<string, { name: string; half: boolean }> = {
  "2026-12-31": { name: "New Year's Eve, half day (hr.yaml)", half: true },
  "2027-01-01": { name: "New Year's Day", half: false },
};

function quote(from: string, to: string, type: (typeof LEAVE_TYPES)[number], startNoon: boolean, endNoon: boolean) {
  const out: { day: string; label: string; n: number; why: string }[] = [];
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime()) || b < a) return out;
  for (let d = a; d <= b; d = new Date(d.getTime() + 86400000)) {
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    const weekend = d.getUTCDay() === 0 || d.getUTCDay() === 6;
    const h = HOLIDAYS[key];
    let n = 1;
    let why = "Working day";
    if (type.counts === "calendar") why = "Calendar day";
    else if (weekend) [n, why] = [0, "Day off"];
    else if (h && !h.half) [n, why] = [0, h.name];
    else if (h?.half) [n, why] = [0.5, h.name];
    if (n > 0 && type.halfDays && ((startNoon && key === from) || (endNoon && key === to))) [n, why] = [Math.min(n, 0.5), "Half day"];
    out.push({ day: key, label, n, why });
  }
  return out;
}

const AWAY_DAYS = ["Mon 9", "Tue 10", "Wed 11", "Thu 12", "Fri 13", "Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"];
const AWAY: { who: string; cells: Record<number, { text: string; tone: Tone }> }[] = [
  { who: "e05", cells: { 0: { text: "Annual", tone: "info" }, 1: { text: "Annual", tone: "info" }, 2: { text: "Annual", tone: "info" } } },
  { who: "e12", cells: { 0: { text: "Away", tone: "neutral" }, 1: { text: "Away", tone: "neutral" } } },
  { who: "e04", cells: { 4: { text: "½ pending", tone: "warning" } } },
  {
    who: "e17",
    cells: {
      5: { text: "Annual", tone: "info" },
      6: { text: "Annual", tone: "info" },
      7: { text: "Annual", tone: "info" },
      8: { text: "Annual", tone: "info" },
      9: { text: "Annual", tone: "info" },
    },
  },
];

type LeaveTab = "approve" | "requests" | "away" | "balances";

function LeavePage({ initialTab = "approve" }: { initialTab?: LeaveTab }) {
  const [tab, setTab] = useState<LeaveTab>(initialTab);
  const [requests, setRequests] = useState(REQUESTS);
  const [rejecting, setRejecting] = useState<Request | null>(null);
  const [reason, setReason] = useState("");
  const [asking, setAsking] = useState(false);
  const [type, setType] = useState("annual");
  const [from, setFrom] = useState("2026-12-28");
  const [to, setTo] = useState("2027-01-01");
  const [startNoon, setStartNoon] = useState(false);
  const [endNoon, setEndNoon] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const leaveType = LEAVE_TYPES.find((t) => t.value === type) ?? LEAVE_TYPES[0]!;
  const lines = quote(from, to, leaveType, startNoon, endNoon);
  const total = lines.reduce((n, l) => n + l.n, 0);
  const balance = 14.5;
  const toDecide = requests.filter(mineToDecide);
  const decide = (r: Request, approve: boolean, why?: string) => {
    setRequests((rs) =>
      rs.map((x) => {
        if (x.id !== r.id) return x;
        const i = x.steps.findIndex((s) => s.state === "waiting");
        return { ...x, steps: x.steps.map((s, j) => (j === i ? { ...s, state: approve ? "approved" : "rejected" } : s)) };
      }),
    );
    setNotice(
      approve
        ? `Approved your step for ${nameOf(r.who)}. Zeynep Arslan is emailed for HR's step; ${nameOf(r.who)} hears once it is decided.`
        : `Rejected ${nameOf(r.who)}'s request${why ? `: ${why}` : ""}. ${nameOf(r.who)} is emailed and the days go back to the balance.`,
    );
  };
  const reqCols: Column<Request>[] = [
    {
      id: "who",
      header: "Person",
      sortValue: (r) => nameOf(r.who),
      cell: (r) => (
        <span className="flex items-center gap-2">
          <Avatar name={nameOf(r.who)} size="sm" />
          {nameOf(r.who)}
        </span>
      ),
    },
    { id: "type", header: "Type", cell: (r) => r.type },
    { id: "dates", header: "Dates", cell: (r) => r.dates },
    { id: "days", header: "Days", align: "right", mono: true, cell: (r) => r.days },
    { id: "state", header: "State", cell: (r) => <StatusBadge tone={stateOf(r).tone}>{stateOf(r).label}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Leave"
        description="Requests go through the steps their type's rule had when they were made. Nobody approves their own leave."
        actions={
          <Button variant="primary" icon={<CalendarPlus />} onClick={() => setAsking(true)}>
            Ask for leave
          </Button>
        }
      />
      {notice && (
        <div role="status" className="mb-2.5 rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <Tabs
        label="Leave"
        value={tab}
        onChange={setTab}
        className="mb-2.5"
        items={[
          { value: "approve", label: "To approve", count: toDecide.length },
          { value: "requests", label: "All requests" },
          { value: "away", label: "Who is away" },
          { value: "balances", label: "Balances" },
        ]}
      />
      {tab === "approve" && (
        <div className="flex flex-col gap-2.5">
          {toDecide.length === 0 && <Callout tone="success" title="Nothing waits for you." />}
          {requests
            .filter((r) => r.steps.some((s) => s.who === `Manager: ${ME}`) && r.steps.some((s) => s.state === "waiting" || s.state === "rejected"))
            .map((r) => {
              const mine = mineToDecide(r);
              const p = byId(r.who);
              return (
                <Panel
                  key={r.id}
                  aria-label={`${nameOf(r.who)}, ${r.type}`}
                  title={`${nameOf(r.who)}: ${r.type}, ${r.dates}`}
                  description={`${days(r.days)} · ${p?.balance ?? 0} days left before this request${r.note ? ` · "${r.note}"` : ""}`}
                  actions={
                    mine ? (
                      <>
                        <Button size="sm" onClick={() => setRejecting(r)}>
                          Reject
                        </Button>
                        <Button size="sm" variant="primary" onClick={() => decide(r, true)}>
                          Approve
                        </Button>
                      </>
                    ) : (
                      <StatusBadge tone={stateOf(r).tone}>{stateOf(r).label}</StatusBadge>
                    )
                  }
                >
                  <ol aria-label="Approval steps" className="flex flex-wrap gap-1.5 text-xs">
                    {r.steps.map((s, i) => (
                      <li
                        key={s.who}
                        className={cn(
                          "flex items-center gap-1.5 rounded-md border px-2 py-1",
                          s.state === "approved" ? "border-success bg-success-soft" : s.state === "rejected" ? "border-danger bg-danger-soft" : "border-line",
                        )}
                      >
                        <span className="font-medium">Step {i + 1}</span> {s.who}:{" "}
                        {s.state === "approved" ? "approved" : s.state === "rejected" ? "rejected" : "waiting"}
                      </li>
                    ))}
                  </ol>
                  <p className="mt-2 text-xs text-fg-muted">Also away then: {r.id === "q1" ? "nobody in Sales" : "Selin Aydın is back on Thu 12 Nov"}.</p>
                </Panel>
              );
            })}
        </div>
      )}
      {tab === "requests" && (
        <Panel flush>
          <DataTable label="Leave requests" rows={requests} getRowId={(r) => r.id} columns={reqCols} minWidth={720} />
        </Panel>
      )}
      {tab === "away" && (
        <Panel title="Who is away" description="Next two weeks. Colleagues see that someone is away; the type only for types shown to colleagues." flush>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <caption className="sr-only">Who is away, 9 to 20 November</caption>
              <thead className="bg-canvas text-fg-muted">
                <tr>
                  <th scope="col" className="px-3 py-1.5 font-semibold">
                    Person
                  </th>
                  {AWAY_DAYS.map((d) => (
                    <th key={d} scope="col" className="px-1 py-1.5 text-center font-semibold">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {AWAY.map((a) => (
                  <tr key={a.who} className="border-t border-line">
                    <th scope="row" className="px-3 py-1.5 font-medium whitespace-nowrap text-fg">
                      {nameOf(a.who)}
                    </th>
                    {AWAY_DAYS.map((d, i) => {
                      const cell = a.cells[i];
                      return (
                        <td key={d} className="px-1 py-1.5 text-center">
                          {cell ? <Badge tone={cell.tone}>{cell.text}</Badge> : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      {tab === "balances" && (
        <Panel title="Annual leave" description="Granted on each anniversary of service (md. 53, 54); unused days carry over and do not expire." flush>
          <DataTable
            label="Annual leave balances"
            rows={PEOPLE.filter((p) => p.status !== "starting")}
            getRowId={(p) => p.id}
            minWidth={720}
            defaultSort={{ id: "who", direction: "asc" }}
            columns={[
              { id: "who", header: "Person", sortValue: (p) => p.name, cell: (p) => p.name },
              { id: "service", header: "Service", align: "right", mono: true, sortValue: (p) => p.serviceYears, cell: (p) => `${p.serviceYears} y` },
              { id: "grant", header: "Yearly grant", align: "right", mono: true, cell: (p) => annualGrant(p).days },
              { id: "rule", header: "Rule", cell: (p) => <span className="text-fg-muted">{annualGrant(p).why}</span> },
              { id: "left", header: "Left", align: "right", mono: true, sortValue: (p) => p.balance, cell: (p) => p.balance },
            ]}
          />
        </Panel>
      )}
      <Dialog
        open={!!rejecting}
        onOpenChange={(o) => !o && setRejecting(null)}
        title={`Reject ${rejecting ? nameOf(rejecting.who) : ""}'s request`}
        onSubmit={(e) => {
          e.preventDefault();
          if (rejecting) decide(rejecting, false, reason.trim());
          setRejecting(null);
          setReason("");
        }}
        footer={
          <>
            <Button type="button" onClick={() => setRejecting(null)}>
              Cancel
            </Button>
            <Button type="submit" variant="danger">
              Reject
            </Button>
          </>
        }
      >
        <TextField label="Reason, sent to them" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Year-end closing that week" />
      </Dialog>
      <Dialog
        open={asking}
        onOpenChange={setAsking}
        title="Ask for leave"
        description={`${ME} · annual leave left: ${days(balance)}`}
        size="lg"
        onSubmit={(e) => {
          e.preventDefault();
          setRequests((rs) => [
            ...rs,
            {
              id: `q${rs.length + 1}`,
              who: "e02",
              type: leaveType.label.split(",")[0]!,
              dates: `${lines[0]?.label} to ${lines.at(-1)?.label}`,
              days: total,
              steps: [
                { who: "Manager: Murat Aksoy", state: "waiting" },
                { who: "HR: Zeynep Arslan or any editor", state: "waiting" },
              ],
            },
          ]);
          setNotice(`Asked for ${days(total)}. Murat Aksoy is emailed for the first step; the days are held against your balance.`);
          setAsking(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setAsking(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" disabled={total <= 0 || (type === "annual" && total > balance)}>
              Ask for {days(total)}
            </Button>
          </>
        }
      >
        <SelectField
          label="Type"
          value={type}
          onChange={(e) => setType(e.target.value)}
          options={LEAVE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          <TextField label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {leaveType.halfDays && (
          <div className="flex flex-wrap gap-4">
            <Checkbox label="Start at noon" checked={startNoon} onChange={(e) => setStartNoon(e.target.checked)} />
            <Checkbox label="End at noon" checked={endNoon} onChange={(e) => setEndNoon(e.target.checked)} />
          </div>
        )}
        <section aria-label="Days this takes" className="rounded-md border border-line">
          <ul className="flex flex-col text-xs">
            {lines.map((l) => (
              <li key={l.day} className="flex items-center justify-between gap-2 border-b border-subtle px-2.5 py-1 last:border-0">
                <span className="w-24 text-fg">{l.label}</span>
                <span className="grow text-fg-muted">{l.why}</span>
                <span className="font-mono tabular-nums">{l.n}</span>
              </li>
            ))}
          </ul>
          <p className="border-t border-line bg-canvas px-2.5 py-1.5 text-xs font-semibold">
            {leaveType.counts === "calendar" ? "Calendar days" : "Working days"}: {total}
            {type === "annual" && ` · ${balance - total} left after`}
          </p>
        </section>
      </Dialog>
    </>
  );
}

/* --------------------------------------------------- joining and leaving */

interface Task {
  id: string;
  text: string;
  who: string;
  due: string;
  done: boolean;
}

interface Checklist {
  id: string;
  person: string;
  kind: "Joining" | "Leaving";
  day: string;
  tasks: Task[];
  identity: { tone: Tone; state: string; text: string };
}

const CHECKLISTS: Checklist[] = [
  {
    id: "c1",
    person: "e09",
    kind: "Joining",
    day: "Tue 1 Dec",
    tasks: [
      { id: "laptop", text: "Prepare the laptop", who: "Manager: Deniz Şen", due: "Sat 28 Nov", done: false },
      { id: "sgk", text: "Register with SGK before the first day", who: "HR", due: "Mon 30 Nov", done: false },
      { id: "contract", text: "Sign the contract", who: "HR", due: "Tue 1 Dec", done: true },
      { id: "details", text: "Check your details and bank account", who: "Ayşe Yılmaz", due: "Fri 4 Dec", done: false },
    ],
    identity: { tone: "info", state: "Scheduled", text: "Account ayse@example.com made on 1 Dec at 07:00, in groups Finance and Employees" },
  },
  {
    id: "c2",
    person: "e13",
    kind: "Leaving",
    day: "Mon 30 Nov",
    tasks: [
      { id: "handover", text: "Hand over open work", who: "Manager: Kerem Öz", due: "Fri 27 Nov", done: true },
      { id: "equipment", text: "Collect the laptop, badge and keys", who: "Manager: Kerem Öz", due: "Mon 30 Nov", done: false },
      { id: "final-pay", text: "Pay the final salary and 6.5 days of unused annual leave (md. 59)", who: "HR", due: "Mon 30 Nov", done: false },
      { id: "sgk", text: "Report the leaving to SGK within 10 days", who: "HR", due: "Thu 10 Dec", done: false },
    ],
    identity: { tone: "warning", state: "Scheduled", text: "Account can@example.com turned off on 30 Nov at 18:00; its sessions end everywhere" },
  },
];

function JoiningPage() {
  const [lists, setLists] = useState(CHECKLISTS);
  const [leaving, setLeaving] = useState(false);
  const [who, setWho] = useState("e18");
  const [end, setEnd] = useState("31 Dec 2026");
  const [reason, setReason] = useState("resignation");
  const toggle = (c: string, t: string) =>
    setLists((ls) => ls.map((l) => (l.id === c ? { ...l, tasks: l.tasks.map((x) => (x.id === t ? { ...x, done: !x.done } : x)) } : l)));
  return (
    <>
      <PageHeader
        title="Joining and leaving"
        description="A checklist starts for each new person on their start day and for each end day that is set. Moving the day moves the open tasks."
        actions={
          <Button icon={<UserMinus />} onClick={() => setLeaving(true)}>
            Record a leaving
          </Button>
        }
      />
      <Callout tone="warning" title="Identity: Mert Kaya moved from Sales to Customer Support on 2 Nov" className="mb-2.5">
        Taken out of Sales and put in Support. Identity has a group named Customer Support that was made by hand, so HR reported it and did not change it.
        Trying again every hour.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-2">
        {lists.map((l) => {
          const done = l.tasks.filter((t) => t.done).length;
          return (
            <Panel
              key={l.id}
              aria-label={`${nameOf(l.person)}, ${l.kind.toLowerCase()}`}
              title={`${l.kind}: ${nameOf(l.person)}`}
              description={`${l.kind === "Joining" ? "Starts" : "Last day"} ${l.day} · ${byId(l.person)?.position}, ${DEPTS[byId(l.person)?.dept ?? "sales"]}`}
              actions={
                <Badge tone={done === l.tasks.length ? "success" : "neutral"}>
                  {done} of {l.tasks.length} done
                </Badge>
              }
            >
              <ul aria-label="Tasks" className="flex flex-col gap-2">
                {l.tasks.map((t) => (
                  <li key={t.id} className="flex items-start justify-between gap-3 border-b border-subtle pb-2 last:border-0">
                    <Checkbox label={t.text} description={`${t.who} · due ${t.due}`} checked={t.done} onChange={() => toggle(l.id, t.id)} />
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-canvas px-2.5 py-1.5 text-xs">
                <StatusBadge tone={l.identity.tone}>Identity: {l.identity.state}</StatusBadge>
                {l.identity.text}
              </p>
            </Panel>
          );
        })}
      </div>
      <Dialog
        open={leaving}
        onOpenChange={setLeaving}
        title="Record a leaving"
        description="Setting an end day starts the leaving checklist and tells Identity to turn the account off that evening."
        onSubmit={(e) => {
          e.preventDefault();
          setLists((ls) => [
            ...ls,
            {
              id: `c${ls.length + 1}`,
              person: who,
              kind: "Leaving",
              day: end,
              tasks: [
                { id: "handover", text: "Hand over open work", who: `Manager: ${nameOf(byId(who)?.manager ?? null)}`, due: "3 days before", done: false },
                { id: "equipment", text: "Collect the laptop, badge and keys", who: `Manager: ${nameOf(byId(who)?.manager ?? null)}`, due: end, done: false },
                { id: "final-pay", text: "Pay the final salary and unused annual leave", who: "HR", due: end, done: false },
                { id: "sgk", text: "Report the leaving to SGK within 10 days", who: "HR", due: "10 days after", done: false },
              ],
              identity: { tone: "warning", state: "Scheduled", text: `Account ${byId(who)?.email} turned off on ${end} at 18:00` },
            },
          ]);
          setLeaving(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setLeaving(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Set end day
            </Button>
          </>
        }
      >
        <SelectField
          label="Person"
          value={who}
          onChange={(e) => setWho(e.target.value)}
          options={PEOPLE.filter((p) => p.status === "working").map((p) => ({ value: p.id, label: p.name }))}
        />
        <TextField label="Last day" value={end} onChange={(e) => setEnd(e.target.value)} />
        <SelectField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={[
            { value: "resignation", label: "Resignation" },
            { value: "end-of-contract", label: "End of a fixed-term contract" },
            { value: "dismissal", label: "Dismissal" },
            { value: "retirement", label: "Retirement" },
          ]}
        />
      </Dialog>
    </>
  );
}

/* ------------------------------------------------------------- documents */

const EXPIRING = [
  { id: "x1", who: "e18", kind: "ID copy", expires: "2 Nov 2026", left: -6 },
  { id: "x2", who: "e12", kind: "Certificate", expires: "20 Nov 2026", left: 12 },
  { id: "x3", who: "e11", kind: "Work permit", expires: "18 Dec 2026", left: 40 },
  { id: "x4", who: "e11", kind: "ID copy", expires: "9 Aug 2029", left: 1005 },
  { id: "x5", who: "e17", kind: "Certificate", expires: "1 Mar 2028", left: 479 },
];

function DocumentsPage({ onOpen }: { onOpen: (id: string) => void }) {
  const [show, setShow] = useState<"soon" | "all">("soon");
  const rows = EXPIRING.filter((d) => show === "all" || d.left <= 60);
  return (
    <>
      <PageHeader
        title="Documents"
        description="Documents that expire, by the kinds in hr.yaml. HR is emailed once when one comes within its kind's warning time: 60 days for work permits, 30 for the rest."
      />
      <div className="mb-2.5">
        <SegmentedControl
          label="Show"
          value={show}
          onChange={setShow}
          options={[
            { value: "soon", label: "Expired or expiring" },
            { value: "all", label: "All that expire" },
          ]}
        />
      </div>
      <Panel flush>
        <DataTable
          label="Documents that expire"
          rows={rows}
          getRowId={(d) => d.id}
          defaultSort={{ id: "left", direction: "asc" }}
          minWidth={640}
          columns={[
            {
              id: "who",
              header: "Person",
              cell: (d) => (
                <button type="button" onClick={() => onOpen(d.who)} className="text-left font-medium text-fg hover:underline">
                  {nameOf(d.who)}
                </button>
              ),
            },
            { id: "kind", header: "Kind", cell: (d) => d.kind },
            { id: "expires", header: "Expires", cell: (d) => d.expires },
            {
              id: "left",
              header: "State",
              sortValue: (d) => d.left,
              cell: (d) =>
                d.left < 0 ? (
                  <StatusBadge tone="danger">Expired {-d.left} days ago</StatusBadge>
                ) : d.left <= 60 ? (
                  <StatusBadge tone="warning">In {d.left} days</StatusBadge>
                ) : (
                  <StatusBadge tone="success">Valid</StatusBadge>
                ),
            },
          ]}
        />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------- my record */

function MyRecordPage() {
  const me = byId("e02")!;
  const [contact, setContact] = useState({
    phone: "+90 532 000 77 88",
    email: "emily.clark@mail.example.com",
    address: "Bağdat Cad. 210/7, Kadıköy, İstanbul",
  });
  const [draft, setDraft] = useState(contact);
  const [editing, setEditing] = useState(false);
  const [history, setHistory] = useState<{ id: string; text: string }[]>([{ id: "m1", text: "1 Jan: Salary changed by Zeynep Arslan" }]);
  return (
    <>
      <PageHeader
        title="My record"
        description="What HR keeps about you. You change your own phone, personal email, address and emergency contact; everything else is changed by HR."
        actions={
          <Button
            icon={<Pencil />}
            onClick={() => {
              setDraft(contact);
              setEditing(true);
            }}
          >
            Edit my contact details
          </Button>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Contact details" description="Yours to change" aria-label="Contact details">
          <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <Field label="Phone" value={contact.phone} mono />
            <Field label="Personal email" value={contact.email} />
            <Field label="Address" value={contact.address} />
            <Field label="Emergency contact" value="James Clark, brother, +44 7700 900123" />
          </dl>
        </Panel>
        <Panel title="Work" description="Changed by HR; ask Zeynep Arslan">
          <dl className="grid grid-cols-[140px_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-sm">
            <Field label="Position" value={me.position} />
            <Field label="Manager" value={nameOf(me.manager)} />
            <Field label="Started" value={me.start} />
            <Field label="Annual leave left" value={days(me.balance)} />
            <Field label="Next grant" value="4 Mar 2027: 20 days" />
          </dl>
        </Panel>
        <Panel title="Changes" description="Every change to your record">
          <ul aria-label="Changes to my record" className="flex flex-col gap-1 text-xs">
            {history.map((h) => (
              <li key={h.id}>{h.text}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Who looked at my record" description="KVKK md. 11: you may see who read your data">
          <ul aria-label="Who looked at my record" className="flex flex-col gap-1 text-xs">
            <li>1 Nov 03:00 · Payroll, viewer token: work, pay, personal</li>
            <li>12 Oct 11:20 · Zeynep Arslan, editor: documents</li>
            <li>3 Oct 09:05 · Murat Aksoy, manager: leave</li>
          </ul>
        </Panel>
      </div>
      <Dialog
        open={editing}
        onOpenChange={setEditing}
        title="Edit my contact details"
        onSubmit={(e) => {
          e.preventDefault();
          const changed = (["phone", "email", "address"] as const).filter((k) => draft[k] !== contact[k]);
          setContact(draft);
          setHistory((h) => [
            ...changed.map((k, i) => ({
              id: `n${h.length + i}`,
              text: `Just now: ${k === "email" ? "Personal email" : k[0]!.toUpperCase() + k.slice(1)} changed by you`,
            })),
            ...h,
          ]);
          setEditing(false);
        }}
        footer={
          <>
            <Button type="button" onClick={() => setEditing(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary">
              Save
            </Button>
          </>
        }
      >
        <TextField label="Phone" value={draft.phone} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
        <TextField label="Personal email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
        <TextField label="Address" value={draft.address} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------- settings */

const YAML = `time_zone: Europe/Istanbul
work_week: [mon, tue, wed, thu, fri]
locations:
  istanbul: { name: İstanbul HQ }
  izmir: { name: İzmir factory, work_week: [mon, tue, wed, thu, fri, sat] }
holidays:
  country: tr
  add:
    - { date: 2026-12-31, name: New Year's Eve, half: true }
leave_types:
  annual:
    accrual: anniversary
    by_seniority: { 1: 14, 6: 20, 15: 26 }
    at_least: { days: 20, age_up_to: 18, age_from: 50 }
    carry_over: all
    approval: standard
  marriage: { per_request: 3, approval: standard }
  paternity: { per_request: 5, approval: standard }
  maternity: { paid: false, counts: calendar_days, per_request: 126, approval: hr }
  sick: { paid: false, counts: calendar_days, approval: hr, shown_to_colleagues: false }
  unpaid: { paid: false, approval: standard }
approvals:
  standard: [manager, hr]
documents:
  work-permit: { expires: true, warn_before: 60d }
access:
  work: [self, manager, viewer]
  personal: [self, editor]
  pay: [self, viewer]
  documents: [self, editor]
  leave: [self, manager, viewer]
retention:
  after_leaving: 10y
  access_log: 2y
identity:
  url: http://identity:8080
  token: HR_IDENTITY_TOKEN
  create_at: "07:00"
  disable_at: "18:00"
  groups: { departments: true, all: [Employees] }`;

function SettingsPage() {
  return (
    <FileSettingsPage
      product="hr"
      file="hr.yaml"
      applied="5 days ago"
      yaml={YAML}
      groups={[
        {
          title: "Annual leave",
          description: "İş Kanunu md. 53, counted in working days (md. 56); unused days do not expire.",
          items: [
            { label: "1 to 5 years", value: "14 working days", path: "leave_types.annual.by_seniority.1" },
            { label: "6 to 14 years", value: "20 working days", path: "leave_types.annual.by_seniority.6" },
            { label: "15 years or more", value: "26 working days", path: "leave_types.annual.by_seniority.15" },
            { label: "At least", value: "20 days at 18 or younger and 50 or older", path: "leave_types.annual.at_least" },
          ],
        },
        {
          title: "Days off and holidays",
          items: [
            { label: "Work week", value: "Monday to Friday; Saturday too at the İzmir factory", path: "locations.izmir.work_week" },
            { label: "Holidays", value: "Türkiye's, with Bayrams to 2027; Bayram eves and 28 October are half days", path: "holidays.country" },
            { label: "Added", value: "31 Dec 2026, New Year's Eve, half day", path: "holidays.add" },
          ],
        },
        {
          title: "Approvals",
          items: [
            { label: "Standard", value: "Manager, then HR", path: "approvals.standard" },
            { label: "Sick and maternity", value: "HR only, with a health report", path: "leave_types.sick.approval" },
          ],
        },
        {
          title: "Who reads what",
          description: "Admins read everything. Everyone signed in reads the directory.",
          items: [
            { label: "Work and leave", value: "The person, everyone above them, viewers", path: "access.work" },
            { label: "Personal and documents", value: "The person and editors", path: "access.personal" },
            { label: "Pay", value: "The person and viewers, such as Payroll's token", path: "access.pay" },
            { label: "Retention", value: "Records 10 years after the end day; the access log 2 years", path: "retention" },
          ],
        },
        {
          title: "Identity",
          items: [
            {
              label: "Accounts",
              value: "Made at 07:00 on the start day, turned off at 18:00 on the end day; groups by department and Employees",
              path: "identity",
            },
          ],
        },
      ]}
    />
  );
}

/* ------------------------------------------------------------------- app */

function HrApp({ initial, person = null, part, leaveTab }: { initial: string; person?: string | null; part?: Part; leaveTab?: LeaveTab }) {
  const [open, setOpen] = useState<string | null>(person);
  const [jump, setJump] = useState({ page: initial, n: 0 });
  const openPerson = (id: string) => {
    setOpen(id);
    setJump((j) => ({ page: "people", n: j.n + 1 }));
  };
  const pages: PageMap = {
    home: () => <HomePage onOpen={openPerson} />,
    people: () => <PeoplePage open={open} setOpen={setOpen} initialPart={part} />,
    org: () => <OrgChartPage onOpen={openPerson} />,
    leave: () => <LeavePage initialTab={leaveTab} />,
    joining: () => <JoiningPage />,
    documents: () => <DocumentsPage onOpen={openPerson} />,
    me: () => <MyRecordPage />,
    settings: () => <SettingsPage />,
  };
  // ProductApp keeps its own page state; a new key moves it to People when another page opens a record.
  return <ProductApp key={jump.n} product="hr" nav={nav} pages={pages} initial={jump.page} />;
}

const app = (initial: string, opts: { person?: string; part?: Part; leaveTab?: LeaveTab } = {}): Story => ({
  render: () => <HrApp initial={initial} person={opts.person} part={opts.part} leaveTab={opts.leaveTab} />,
});

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();
const body = (el: HTMLElement) => within(el.ownerDocument.body);
const rowsOf = (t: HTMLElement) => within(t).getAllByRole("row").slice(1);

/* ----------------------------------------------------------------- stories */

export const Home: Story = {
  ...app("home"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("list", { name: "Your tasks" })).toHaveTextContent("Ali Demir asks for annual leave");
    await expect(c.getByRole("list", { name: "Coming up" })).toHaveTextContent("Identity makes the account at 07:00");
    await userEvent.click(within(c.getByRole("list", { name: "Away today" })).getByRole("button", { name: "Merve Çelik" }));
    await expect(c.getByRole("heading", { level: 1, name: "Merve Çelik" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const People: Story = {
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "People" });
    await expect(rowsOf(table)).toHaveLength(PEOPLE.length);
    await userEvent.type(c.getByRole("searchbox", { name: "Search people" }), "engineer");
    await expect(rowsOf(table)).toHaveLength(3);
    await userEvent.clear(c.getByRole("searchbox", { name: "Search people" }));
    await userEvent.click(c.getAllByRole("button", { name: "Department" })[0]!);
    await userEvent.click(body(canvasElement).getByRole("checkbox", { name: /Operations/ }));
    await userEvent.keyboard("{Escape}");
    await expect(rowsOf(table)).toHaveLength(3);
    await userEvent.click(within(table).getByRole("button", { name: "Hasan Kurt" }));
    await expect(c.getByRole("heading", { level: 1, name: "Hasan Kurt" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const ImportCsv: Story = {
  name: "Import CSV",
  ...app("people"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Import CSV" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Import employees" }));
    await userEvent.click(dialog.getByRole("button", { name: "Check rows" }));
    await expect(dialog.getByRole("table", { name: "Rows checked" })).toHaveTextContent("tckn fails its check digits");
    await userEvent.click(dialog.getByRole("button", { name: "Import 2 rows" }));
    await expect(c.getByRole("status")).toHaveTextContent("Imported 2 rows from kolay-ik-export.csv");
  },
};

export const EmployeeRecord: Story = {
  name: "Employee record",
  ...app("people", { person: "e03" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Ali Demir" })).toBeInTheDocument();
    await expect(c.getByRole("region", { name: "Work" })).toHaveTextContent("Read by: The person, everyone above them and HR viewers");
    await userEvent.click(c.getByRole("tab", { name: "Pay" }));
    await expect(c.getByRole("table", { name: "Pay over time" })).toHaveTextContent("86,000 TL");
    await userEvent.click(c.getByRole("tab", { name: /Access log/ }));
    const looks = c.getByRole("table", { name: "Looks at the record" });
    await expect(rowsOf(looks)[0]).toHaveTextContent("Just now");
    await expect(rowsOf(looks)[0]).toHaveTextContent("pay");
    await userEvent.click(c.getByRole("tab", { name: "History" }));
    await expect(c.getByRole("table", { name: "Changes to the record" })).toHaveTextContent("Account Executive");
    blur(canvasElement);
  },
};

export const RecordPersonal: Story = {
  name: "Employee record, personal",
  ...app("people", { person: "e03", part: "personal" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Personal" })).toHaveTextContent("T.C. kimlik no104•••••846");
    await expect(c.getByRole("region", { name: "Personal" })).toHaveTextContent("Read by: The person and HR editors");
  },
};

export const RecordLeave: Story = {
  name: "Employee record, leave",
  ...app("people", { person: "e03", part: "leave" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Leave" })).toHaveTextContent("14 days1 to 5 years");
    await expect(c.getByRole("table", { name: "Leave requests of the record" })).toHaveTextContent("Waiting for you");
  },
};

export const AddDocument: Story = {
  name: "Add a document",
  ...app("people", { person: "e03", part: "documents" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Add document" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Add a document to Ali Demir's record" }));
    await expect(dialog.getByRole("button", { name: "Add" })).toBeDisabled();
    await userEvent.type(dialog.getByRole("textbox", { name: "Expires on" }), "20 Nov 2028");
    await userEvent.click(dialog.getByRole("button", { name: "Add" }));
    await expect(c.getByRole("status")).toHaveTextContent("Certificate added");
    await expect(rowsOf(c.getByRole("table", { name: "Documents of the record" }))).toHaveLength(4);
  },
};

export const OrgChart: Story = {
  name: "Org chart",
  ...app("org"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(within(c.getByRole("list", { name: "Teams" })).getAllByRole("region")).toHaveLength(5);
    await expect(c.getByRole("region", { name: "Emily Clark's team" })).toHaveTextContent("4 people");
    await userEvent.type(c.getByRole("searchbox", { name: "Find a person" }), "Lukas");
    await expect(within(c.getByRole("list", { name: "Teams" })).getAllByRole("region")).toHaveLength(1);
    await userEvent.click(c.getByRole("button", { name: /Lukas Becker/ }));
    await expect(c.getByRole("heading", { level: 1, name: "Lukas Becker" })).toBeInTheDocument();
    blur(canvasElement);
  },
};

export const Leave: Story = {
  ...app("leave"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const ali = c.getByRole("region", { name: "Ali Demir, Annual leave" });
    await expect(within(ali).getByRole("list", { name: "Approval steps" })).toHaveTextContent("Step 1 Manager: Emily Clark: waiting");
    await userEvent.click(within(ali).getByRole("button", { name: "Approve" }));
    await expect(c.getByRole("status")).toHaveTextContent("Zeynep Arslan is emailed for HR's step");
    await expect(within(c.getByRole("region", { name: "Ali Demir, Annual leave" })).getByText("Waiting for HR")).toBeInTheDocument();
    await expect(c.getByRole("tab", { name: /To approve/ })).toHaveTextContent("1");
    blur(canvasElement);
  },
};

export const RejectLeave: Story = {
  name: "Reject leave",
  ...app("leave"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("region", { name: "Hakan Yıldız, Annual leave" })).getByRole("button", { name: "Reject" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Reject Hakan Yıldız's request" }));
    await userEvent.type(dialog.getByRole("textbox", { name: "Reason, sent to them" }), "Quarter-end calls that afternoon");
    await userEvent.click(dialog.getByRole("button", { name: "Reject" }));
    await expect(c.getByRole("status")).toHaveTextContent("Rejected Hakan Yıldız's request: Quarter-end calls that afternoon");
  },
};

export const AskForLeave: Story = {
  name: "Ask for leave",
  ...app("leave"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Ask for leave" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Ask for leave" }));
    const daysTaken = dialog.getByRole("region", { name: "Days this takes" });
    await expect(daysTaken).toHaveTextContent("New Year's Eve, half day (hr.yaml)0.5");
    await expect(daysTaken).toHaveTextContent("New Year's Day0");
    await expect(daysTaken).toHaveTextContent("Working days: 3.5 · 11 left after");
    await userEvent.click(dialog.getByRole("checkbox", { name: "Start at noon" }));
    await expect(daysTaken).toHaveTextContent("Working days: 3 · 11.5 left after");
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Type" }), "sick");
    await expect(daysTaken).toHaveTextContent("Calendar days: 5");
    await userEvent.selectOptions(dialog.getByRole("combobox", { name: "Type" }), "annual");
    await userEvent.click(dialog.getByRole("button", { name: "Ask for 3 days" }));
    await expect(c.getByRole("status")).toHaveTextContent("Asked for 3 days. Murat Aksoy is emailed for the first step");
  },
};

export const WhoIsAway: Story = {
  name: "Who is away",
  ...app("leave", { leaveTab: "away" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Who is away, 9 to 20 November" });
    await expect(within(table).getByRole("rowheader", { name: "Merve Çelik" }).closest("tr")).toHaveTextContent("Away");
    await expect(within(table).getByRole("rowheader", { name: "Merve Çelik" }).closest("tr")).not.toHaveTextContent("Sick");
  },
};

export const Balances: Story = {
  ...app("leave", { leaveTab: "balances" }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Annual leave balances" });
    await expect(within(table).getByText("Hasan Kurt").closest("tr")).toHaveTextContent("At least 20 days at 52");
    await expect(within(table).getByText("Murat Aksoy").closest("tr")).toHaveTextContent("2615 years or more");
    await expect(within(table).getByText("Burak Şahin").closest("tr")).toHaveTextContent("141 to 5 years");
  },
};

export const JoiningAndLeaving: Story = {
  name: "Joining and leaving",
  ...app("joining"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const joining = c.getByRole("region", { name: "Ayşe Yılmaz, joining" });
    await expect(joining).toHaveTextContent("Identity: Scheduled");
    await userEvent.click(within(joining).getByRole("checkbox", { name: /Prepare the laptop/ }));
    await expect(joining).toHaveTextContent("2 of 4 done");
    await expect(c.getByRole("region", { name: "Can Öztürk, leaving" })).toHaveTextContent("6.5 days of unused annual leave");
    blur(canvasElement);
  },
};

export const RecordLeaving: Story = {
  name: "Record a leaving",
  ...app("joining"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Record a leaving" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Record a leaving" }));
    await userEvent.click(dialog.getByRole("button", { name: "Set end day" }));
    const gul = c.getByRole("region", { name: "Gül Ateş, leaving" });
    await expect(gul).toHaveTextContent("Manager: Serkan Yurt");
    await expect(gul).toHaveTextContent("Account gul@example.com turned off on 31 Dec 2026 at 18:00");
  },
};

export const Documents: Story = {
  ...app("documents"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Documents that expire" });
    await expect(rowsOf(table)).toHaveLength(3);
    await expect(rowsOf(table)[0]).toHaveTextContent("Expired 6 days ago");
    await userEvent.click(c.getByRole("radio", { name: "All that expire" }));
    await expect(rowsOf(table)).toHaveLength(5);
    blur(canvasElement);
  },
};

export const MyRecord: Story = {
  name: "My record",
  ...app("me"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Edit my contact details" }));
    const dialog = within(body(canvasElement).getByRole("dialog", { name: "Edit my contact details" }));
    const phone = dialog.getByRole("textbox", { name: "Phone" });
    await userEvent.clear(phone);
    await userEvent.type(phone, "+90 532 000 99 00");
    await userEvent.click(dialog.getByRole("button", { name: "Save" }));
    await expect(c.getByRole("region", { name: "Contact details" })).toHaveTextContent("+90 532 000 99 00");
    await expect(c.getByRole("list", { name: "Changes to my record" })).toHaveTextContent("Just now: Phone changed by you");
  },
};

export const Integrations: Story = app("integrations");

export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("hr.yaml as applied")).toHaveTextContent("by_seniority: { 1: 14, 6: 20, 15: 26 }");
  },
};
