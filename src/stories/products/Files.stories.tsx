import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ChevronRight,
  Download,
  File,
  FileImage,
  FileSpreadsheet,
  FileText,
  Folder,
  FolderOpen,
  HardDrive,
  Link2,
  Lock,
  Plus,
  RotateCcw,
  Share2,
  Trash2,
  Upload,
  Users,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { cn } from "../../lib/cn";
import type { Tone } from "../../tokens/levels";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "space", label: "Files", icon: FolderOpen },
  { id: "links", label: "Links", icon: Link2, count: 14 },
  { id: "bin", label: "Recycle bin", icon: Trash2 },
  { id: "spaces", label: "Spaces", icon: HardDrive },
];

const meta = {
  title: "Products/Files",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const ME = PEOPLE[1];
const AUDITOR = { name: "Selin Aydın", email: "selin.aydin@audit-firm.example" };

interface Space {
  id: string;
  name: string;
  kind: "personal" | "team" | "project";
  group?: string;
  used: number;
  quota: number;
  files: number;
  links: number;
}

const SPACES: Space[] = [
  { id: "mine", name: "My files", kind: "personal", used: 6.2, quota: 20, files: 1_204, links: 1 },
  { id: "finance", name: "Finance", kind: "team", group: "finance", used: 48.3, quota: 100, files: 3_812, links: 4 },
  { id: "sales", name: "Sales", kind: "team", group: "sales", used: 31.9, quota: 100, files: 2_440, links: 6 },
  { id: "marketing", name: "Marketing", kind: "team", group: "marketing", used: 184.6, quota: 250, files: 9_105, links: 2 },
  { id: "engineering", name: "Engineering", kind: "team", group: "engineering", used: 72.1, quota: 200, files: 15_377, links: 0 },
  { id: "northwind", name: "Northwind rollout", kind: "project", group: "project-northwind", used: 3.4, quota: 20, files: 212, links: 1 },
  { id: "office-move", name: "Office move", kind: "project", group: "everyone", used: 1.1, quota: 10, files: 87, links: 0 },
];

type FileKind = "folder" | "pdf" | "sheet" | "doc" | "image" | "other";

interface Entry {
  id: string;
  name: string;
  kind: FileKind;
  modified: string;
  by: string;
  size?: string;
  items?: number;
  shared?: "link" | "upload";
  versions?: number;
}

const ENTRIES: Entry[] = [
  { id: "bank", name: "Bank statements", kind: "folder", modified: "28 Oct", by: PEOPLE[3], items: 12 },
  { id: "invoices", name: "Invoices issued", kind: "folder", modified: "Today 09:40", by: PEOPLE[5], items: 418 },
  { id: "receipts", name: "Receipts from the auditor", kind: "folder", modified: "Yesterday", by: AUDITOR.name, items: 3, shared: "upload" },
  { id: "tb", name: "Trial balance 2026-09.xlsx", kind: "sheet", modified: "Today 11:02", by: PEOPLE[3], size: "1.8 MB", shared: "link", versions: 6 },
  { id: "fs", name: "Financial statements draft.pdf", kind: "pdf", modified: "Yesterday 17:30", by: ME, size: "2.4 MB", shared: "link", versions: 3 },
  { id: "fa", name: "Fixed asset register.xlsx", kind: "sheet", modified: "21 Oct", by: PEOPLE[3], size: "640 KB", shared: "link", versions: 11 },
  { id: "letter", name: "Management representation letter.docx", kind: "doc", modified: "20 Oct", by: ME, size: "88 KB", versions: 2 },
  { id: "contracts", name: "Lease and loan contracts.pdf", kind: "pdf", modified: "14 Oct", by: PEOPLE[5], size: "9.1 MB", shared: "link", versions: 1 },
  { id: "scan", name: "Inventory count, signed.jpg", kind: "image", modified: "2 Oct", by: PEOPLE[6], size: "3.7 MB", versions: 1 },
];

const KIND_ICON = { folder: Folder, pdf: FileText, sheet: FileSpreadsheet, doc: FileText, image: FileImage, other: File } as const;

const VERSIONS = [
  { n: 3, when: "Yesterday 17:30", by: ME, size: "2.4 MB", note: "Notes 12 to 18 added" },
  { n: 2, when: "27 Oct 10:14", by: PEOPLE[3], size: "2.2 MB", note: "" },
  { n: 1, when: "22 Oct 15:48", by: ME, size: "1.9 MB", note: "First draft" },
];

/* ----------------------------------------------------------------- space */

function Preview({ entry }: { entry: Entry }) {
  const Icon = KIND_ICON[entry.kind];
  return (
    <Panel aria-label="Preview">
      <div className="flex flex-col gap-3">
        <div aria-hidden className="flex aspect-[4/3] flex-col gap-1.5 overflow-hidden rounded-md border border-line bg-canvas p-5">
          <span className="h-2 w-1/2 rounded bg-fg-subtle/50" />
          <span className="mb-2 h-1.5 w-1/3 rounded bg-subtle" />
          {[92, 88, 95, 70, 0, 90, 84, 93, 60, 0, 86, 91, 40].map((w, i) =>
            w ? <span key={i} className="h-1.5 rounded bg-subtle" style={{ width: `${w}%` }} /> : <span key={i} className="h-1.5" />,
          )}
          <span className="mt-auto flex justify-between text-2xs text-fg-subtle">
            <span>Acme Corp</span>
            <span>Page 1 of 14</span>
          </span>
        </div>
        <div className="flex items-start gap-2">
          <Icon aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-muted" />
          <span className="flex min-w-0 flex-col">
            <span className="text-sm font-semibold break-words text-fg">{entry.name}</span>
            <span className="text-xs text-fg-muted">
              {entry.size} · changed {entry.modified} by {entry.by}
            </span>
          </span>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" icon={<Download />}>
            Download
          </Button>
          <Button size="sm" icon={<Share2 />}>
            Share
          </Button>
        </div>
        {entry.shared === "link" && (
          <p className="rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-fg">
            In a link to <span className="font-medium">{AUDITOR.name}</span>, password set, expires 13 November.
          </p>
        )}
        <section className="flex flex-col gap-1.5 border-t border-line pt-2.5">
          <h2 className="text-xs font-semibold text-fg-muted">Versions</h2>
          <ol aria-label="Versions" className="flex flex-col gap-1.5">
            {VERSIONS.map((v) => (
              <li key={v.n} className="flex items-center gap-2 text-xs">
                <Avatar name={v.by} size="sm" className="size-5" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="text-fg">
                    {v.n === 3 ? "Current" : `Version ${v.n}`} · {v.when}
                  </span>
                  {v.note && <span className="truncate text-fg-muted">{v.note}</span>}
                </span>
                {v.n !== 3 && (
                  <IconButton label={`Restore version ${v.n}`} size="xs">
                    <RotateCcw className="size-3.5" />
                  </IconButton>
                )}
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Panel>
  );
}

/** A team space: its folders and files, one open in the preview with its versions and links. */
function SpacePage() {
  const [space, setSpace] = useState("finance");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("fs");
  const s = SPACES.find((x) => x.id === space) ?? SPACES[0]!;
  const rows = ENTRIES.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));
  const cur = ENTRIES.find((e) => e.id === active && e.kind !== "folder");
  const cols: Column<Entry>[] = [
    {
      id: "name",
      header: "Name",
      width: "46%",
      sortValue: (e) => `${e.kind === "folder" ? 0 : 1}${e.name}`,
      cell: (e) => {
        const Icon = KIND_ICON[e.kind];
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden className={cn("size-4 shrink-0", e.kind === "folder" ? "text-accent" : "text-fg-muted")} />
            <span className="truncate font-medium">{e.name}</span>
            {e.shared === "link" && <Link2 aria-label="Shared by link" className="size-3.5 shrink-0 text-warning-text" />}
            {e.shared === "upload" && <Badge tone="info">Upload link</Badge>}
          </span>
        );
      },
    },
    { id: "modified", header: "Changed", cell: (e) => <span className="text-xs whitespace-nowrap">{e.modified}</span> },
    {
      id: "by",
      header: "By",
      cell: (e) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={e.by} size="sm" className="size-5" />
          <span className="truncate text-xs">{e.by}</span>
        </span>
      ),
    },
    { id: "size", header: "Size", align: "right", mono: true, cell: (e) => (e.kind === "folder" ? `${e.items} items` : e.size) },
  ];
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: s.name, href: "#space" }, { label: "Audit 2026" }]}
        title="Audit 2026"
        meta={<Badge icon={<Users aria-hidden className="size-3" />}>Group {s.group ?? "you"}</Badge>}
        actions={
          <>
            <Button icon={<Plus />}>New folder</Button>
            <Button variant="primary" icon={<Upload />}>
              Upload
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[200px_minmax(0,1fr)_300px]">
        <div className="flex flex-col gap-2.5">
          <Panel flush aria-label="Spaces">
            {(["personal", "team", "project"] as const).map((k) => (
              <div key={k} className="border-b border-line py-1 last:border-0">
                <span className="block px-3 pt-1 pb-0.5 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
                  {k === "personal" ? "Yours" : k === "team" ? "Teams" : "Projects"}
                </span>
                <ul>
                  {SPACES.filter((x) => x.kind === k).map((x) => (
                    <li key={x.id}>
                      <button
                        type="button"
                        onClick={() => setSpace(x.id)}
                        aria-current={x.id === space ? "true" : undefined}
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-1 text-left text-sm",
                          x.id === space ? "bg-accent-soft text-accent-text" : "text-fg hover:bg-canvas",
                        )}
                      >
                        {x.kind === "personal" ? <Lock aria-hidden className="size-3.5 shrink-0" /> : <Folder aria-hidden className="size-3.5 shrink-0" />}
                        <span className="truncate font-medium">{x.name}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </Panel>
          <Panel>
            <div className="flex flex-col gap-1.5">
              <span className="flex justify-between text-xs">
                <span className="font-medium text-fg">{s.name}</span>
                <span className="text-fg-muted tabular-nums">
                  {s.used} of {s.quota} GB
                </span>
              </span>
              <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-subtle">
                <span className="block h-full rounded-full bg-accent" style={{ width: `${(s.used / s.quota) * 100}%` }} />
              </span>
              <span className="text-2xs text-fg-muted">Earlier versions are kept 90 days, the recycle bin 30.</span>
            </div>
          </Panel>
        </div>

        <Panel flush aria-label="Folder">
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
            <nav aria-label="Folder path" className="flex items-center gap-1 text-xs text-fg-muted">
              <span>{s.name}</span>
              <ChevronRight aria-hidden className="size-3" />
              <span className="font-medium text-fg">Audit 2026</span>
            </nav>
            <SearchInput label="Search this space" placeholder="Search Finance" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Files"
              columns={cols}
              rows={rows}
              getRowId={(e) => e.id}
              onRowClick={(e) => setActive(e.id)}
              activeRowId={active}
              defaultSort={{ id: "name", direction: "asc" }}
              minWidth={600}
            />
          </div>
          <p className="border-t border-line px-3 py-2 text-xs text-fg-muted">Drop files here to upload, or sync this folder with the desktop app.</p>
        </Panel>

        {cur && <Preview key={cur.id} entry={cur} />}
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- links */

interface ShareLink {
  id: string;
  item: string;
  space: string;
  by: string;
  to: string;
  kind: "download" | "upload";
  password: boolean;
  expires: string;
  daysLeft: number;
  opens: number;
}

const LINKS: ShareLink[] = [
  { id: "l1", item: "Audit 2026", space: "Finance", by: ME, to: AUDITOR.email, kind: "download", password: true, expires: "13 Nov", daysLeft: 9, opens: 23 },
  {
    id: "l2",
    item: "Receipts from the auditor",
    space: "Finance",
    by: ME,
    to: AUDITOR.email,
    kind: "upload",
    password: true,
    expires: "13 Nov",
    daysLeft: 9,
    opens: 3,
  },
  {
    id: "l3",
    item: "Northwind proposal v4.pdf",
    space: "Sales",
    by: PEOPLE[6],
    to: "dana@northwind.example",
    kind: "download",
    password: false,
    expires: "6 Nov",
    daysLeft: 2,
    opens: 5,
  },
  {
    id: "l4",
    item: "Brand kit",
    space: "Marketing",
    by: PEOPLE[7],
    to: "Anyone with the link",
    kind: "download",
    password: false,
    expires: "31 Dec",
    daysLeft: 57,
    opens: 142,
  },
  {
    id: "l5",
    item: "CVs for the AE role",
    space: "Sales",
    by: PEOPLE[5],
    to: "Anyone with the link",
    kind: "upload",
    password: true,
    expires: "20 Nov",
    daysLeft: 16,
    opens: 11,
  },
  {
    id: "l6",
    item: "Signed lease.pdf",
    space: "Finance",
    by: PEOPLE[3],
    to: "legal@lawfirm.example",
    kind: "download",
    password: true,
    expires: "5 Nov",
    daysLeft: 1,
    opens: 1,
  },
  {
    id: "l7",
    item: "Floor plan, new office.pdf",
    space: "Office move",
    by: PEOPLE[4],
    to: "movers@moving.example",
    kind: "download",
    password: false,
    expires: "28 Oct",
    daysLeft: -7,
    opens: 4,
  },
];

const OPENS = [
  { when: "Today 10:42", file: "Trial balance 2026-09.xlsx", what: "downloaded", from: "Istanbul, 81.214.x.x" },
  { when: "Today 10:40", file: "Fixed asset register.xlsx", what: "viewed", from: "Istanbul, 81.214.x.x" },
  { when: "Yesterday 18:05", file: "Financial statements draft.pdf", what: "downloaded", from: "Istanbul, 81.214.x.x" },
  { when: "Yesterday 18:01", file: "Lease and loan contracts.pdf", what: "viewed", from: "Istanbul, 81.214.x.x" },
  { when: "30 Oct 09:15", file: "Audit 2026 (folder)", what: "opened with password", from: "Istanbul, 81.214.x.x" },
];

const expiryTone = (d: number): Tone => (d < 0 ? "neutral" : d <= 2 ? "warning" : "success");
const expiryText = (l: ShareLink) => (l.daysLeft < 0 ? `Expired ${l.expires}` : l.daysLeft === 0 ? "Expires today" : `${l.expires}, in ${l.daysLeft} d`);

/** Every link to someone outside: what it opens, to whom, with a password or not, and when it stops working. */
function LinksPage() {
  const [links, setLinks] = useState(LINKS);
  const [tab, setTab] = useState<"active" | "expired">("active");
  const [active, setActive] = useState("l1");
  const [notice, setNotice] = useState<string | null>(null);
  const rows = links.filter((l) => (tab === "active" ? l.daysLeft >= 0 : l.daysLeft < 0));
  const cur = links.find((l) => l.id === active);
  const revoke = (l: ShareLink) => {
    setLinks((xs) => xs.map((x) => (x.id === l.id ? { ...x, daysLeft: -1, expires: "today" } : x)));
    setNotice(`The link to ${l.item} no longer works.`);
  };
  const cols: Column<ShareLink>[] = [
    {
      id: "item",
      header: "Opens",
      width: "28%",
      sortValue: (l) => l.item,
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{l.item}</span>
          <span className="text-2xs text-fg-muted">
            {l.space} · by {l.by}
          </span>
        </span>
      ),
    },
    { id: "to", header: "For", width: "24%", cell: (l) => <span className={cn("block truncate text-xs", l.to.includes("@") && "font-mono")}>{l.to}</span> },
    {
      id: "kind",
      header: "Kind",
      cell: (l) => (
        <span className="flex gap-1">
          <Badge tone={l.kind === "upload" ? "info" : "neutral"}>{l.kind === "upload" ? "Upload only" : "Download"}</Badge>
          {l.password && <Lock aria-label="Password set" className="size-3.5 self-center text-fg-muted" />}
        </span>
      ),
    },
    { id: "expires", header: "Expires", sortValue: (l) => l.daysLeft, cell: (l) => <StatusBadge tone={expiryTone(l.daysLeft)}>{expiryText(l)}</StatusBadge> },
    { id: "opens", header: "Opened", align: "right", mono: true, sortValue: (l) => l.opens, cell: (l) => l.opens },
  ];
  return (
    <>
      <PageHeader title="Links" description="Every link to someone outside expires; the longest a link may last is 90 days, set in files.yaml." />
      <KpiGrid minWidth={170}>
        <KpiCard label="Working links" value={String(links.filter((l) => l.daysLeft >= 0).length)} icon={Link2} />
        <KpiCard
          label="Expire this week"
          value={String(links.filter((l) => l.daysLeft >= 0 && l.daysLeft <= 7).length)}
          delta={{ label: "2 with no password", intent: "neutral" }}
        />
        <KpiCard label="Anyone with the link" value="2" delta={{ label: "Brand kit, CVs", intent: "neutral" }} />
        <KpiCard label="Opened from outside · 7 d" value="47" />
      </KpiGrid>
      {notice && (
        <div role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush>
          <div className="px-3 pt-2">
            <Tabs
              label="Links"
              value={tab}
              onChange={setTab}
              items={[
                { value: "active", label: "Working", count: links.filter((l) => l.daysLeft >= 0).length },
                { value: "expired", label: "Expired", count: links.filter((l) => l.daysLeft < 0).length },
              ]}
              className="border-b-0"
            />
          </div>
          <div className="border-t border-line">
            <DataTable
              label="Links"
              columns={cols}
              rows={rows}
              getRowId={(l) => l.id}
              onRowClick={(l) => setActive(l.id)}
              activeRowId={active}
              defaultSort={{ id: "expires", direction: "asc" }}
              minWidth={720}
            />
          </div>
        </Panel>
        {cur && (
          <Panel
            aria-label="Link"
            title={cur.item}
            description={cur.to}
            actions={
              cur.daysLeft >= 0 && (
                <Button size="sm" variant="danger" onClick={() => revoke(cur)}>
                  Stop link
                </Button>
              )
            }
            className="self-start"
          >
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-[80px_minmax(0,1fr)] gap-x-2 gap-y-1 text-xs">
                <dt className="text-fg-muted">Address</dt>
                <dd className="truncate font-mono text-fg">files.example.com/s/k8Qz2v</dd>
                <dt className="text-fg-muted">Password</dt>
                <dd className="text-fg">{cur.password ? "Set, sent separately by SMS" : "None"}</dd>
                <dt className="text-fg-muted">Expires</dt>
                <dd className="text-fg">{expiryText(cur)}</dd>
              </dl>
              <section className="flex flex-col gap-1.5 border-t border-line pt-2.5">
                <h2 className="text-xs font-semibold text-fg-muted">What was opened</h2>
                <ol aria-label="Opened through the link" className="flex flex-col gap-1.5">
                  {OPENS.map((o) => (
                    <li key={o.when} className="flex flex-col text-xs">
                      <span className="truncate text-fg">
                        <span className="font-medium">{o.file}</span> {o.what}
                      </span>
                      <span className="text-2xs text-fg-muted">
                        {o.when} · {o.from}
                      </span>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------ recycle bin */

interface Deleted {
  id: string;
  name: string;
  kind: FileKind;
  space: string;
  from: string;
  by: string;
  when: string;
  keptUntil: string;
  size: string;
  leaver?: boolean;
}

const DELETED: Deleted[] = [
  {
    id: "d1",
    name: "Q3 board deck v2.pptx",
    kind: "doc",
    space: "Finance",
    from: "Board/2026",
    by: PEOPLE[3],
    when: "Today 08:12",
    keptUntil: "3 Dec",
    size: "14.2 MB",
  },
  {
    id: "d2",
    name: "Old price lists",
    kind: "folder",
    space: "Sales",
    from: "Pricing",
    by: PEOPLE[6],
    when: "Yesterday",
    keptUntil: "2 Dec",
    size: "38 items",
  },
  {
    id: "d3",
    name: "Campaign photos raw",
    kind: "folder",
    space: "Marketing",
    from: "Spring 2026",
    by: PEOPLE[7],
    when: "29 Oct",
    keptUntil: "28 Nov",
    size: "1,204 items",
  },
  { id: "d4", name: "VPN export.csv", kind: "sheet", space: "Engineering", from: "Exports", by: PEOPLE[0], when: "27 Oct", keptUntil: "26 Nov", size: "22 KB" },
  {
    id: "d5",
    name: "Desk plan draft.png",
    kind: "image",
    space: "Office move",
    from: "Plans",
    by: PEOPLE[4],
    when: "15 Oct",
    keptUntil: "14 Nov",
    size: "2.1 MB",
  },
];

/** Deleted files and folders, kept 30 days; anyone in the space can bring one back. */
function BinPage() {
  const [items, setItems] = useState(DELETED);
  const [restored, setRestored] = useState<string | null>(null);
  const cols: Column<Deleted>[] = [
    {
      id: "name",
      header: "Name",
      width: "30%",
      cell: (d) => {
        const Icon = KIND_ICON[d.kind];
        return (
          <span className="flex min-w-0 items-center gap-2">
            <Icon aria-hidden className="size-4 shrink-0 text-fg-muted" />
            <span className="truncate font-medium">{d.name}</span>
          </span>
        );
      },
    },
    { id: "from", header: "Was in", width: "22%", cell: (d) => <span className="block truncate text-xs">{`${d.space} / ${d.from}`}</span> },
    { id: "by", header: "Deleted by", cell: (d) => <span className="text-xs">{d.by}</span> },
    { id: "when", header: "When", cell: (d) => <span className="text-xs whitespace-nowrap">{d.when}</span> },
    { id: "kept", header: "Kept until", cell: (d) => <span className="text-xs whitespace-nowrap">{d.keptUntil}</span> },
    { id: "size", header: "Size", align: "right", mono: true, cell: (d) => d.size },
    {
      id: "restore",
      header: <span className="sr-only">Restore</span>,
      align: "right",
      cell: (d) => (
        <Button
          size="xs"
          icon={<RotateCcw />}
          onClick={() => {
            setItems((xs) => xs.filter((x) => x.id !== d.id));
            setRestored(`${d.name} is back in ${d.space} / ${d.from}.`);
          }}
        >
          Restore
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Recycle bin"
        description="Deleted files are kept 30 days, then removed for good. Earlier versions of a file are under the file itself."
      />
      <Callout tone="info" title={`${PEOPLE[2]} leaves on 30 November`}>
        Mark&apos;s personal files, 6.8 GB, go to Mark&apos;s manager {ME} on that day, not to the recycle bin.
      </Callout>
      {restored && (
        <div role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {restored}
        </div>
      )}
      <Panel flush>
        <DataTable label="Deleted" columns={cols} rows={items} getRowId={(d) => d.id} minWidth={880} />
      </Panel>
    </>
  );
}

/* ---------------------------------------------------------------- spaces */

/** The spaces in files.yaml, their groups, size and quota; changed in the file, not here. */
function SpacesPage() {
  const total = SPACES.reduce((n, s) => n + s.used, 0);
  const cols: Column<Space>[] = [
    {
      id: "name",
      header: "Space",
      width: "24%",
      sortValue: (s) => s.name,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{s.name}</span>
          <span className="text-2xs text-fg-muted">{s.kind === "personal" ? "Personal, one per person" : s.kind === "team" ? "Team" : "Project"}</span>
        </span>
      ),
    },
    { id: "group", header: "Identity group", cell: (s) => <span className="font-mono text-xs">{s.group ?? "–"}</span> },
    { id: "files", header: "Files", align: "right", mono: true, sortValue: (s) => s.files, cell: (s) => s.files.toLocaleString("en-US") },
    {
      id: "used",
      header: "Used",
      width: "24%",
      sortValue: (s) => s.used / s.quota,
      cell: (s) => (
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 grow overflow-hidden rounded-full bg-subtle">
            <span
              className={cn("block h-full rounded-full", s.used / s.quota > 0.7 ? "bg-warning" : "bg-accent")}
              style={{ width: `${(s.used / s.quota) * 100}%` }}
            />
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums">
            {s.used} / {s.quota} GB
          </span>
        </span>
      ),
    },
    { id: "links", header: "Links out", align: "right", mono: true, sortValue: (s) => s.links, cell: (s) => s.links },
  ];
  return (
    <>
      <PageHeader title="Spaces" description="Spaces, their members and quotas are set in files.yaml and read again within a minute." />
      <KpiGrid minWidth={170}>
        <KpiCard label="Stored" value={total.toFixed(0)} unit="GB" delta={{ label: "+4.2 GB this week", intent: "neutral" }} />
        <KpiCard label="Spaces" value={String(SPACES.length - 1)} unit="+ 38 personal" />
        <KpiCard label="Devices syncing" value="61" delta={{ label: "3 not seen in 30 days", intent: "neutral" }} />
        <KpiCard label="Disk left" value="1.2" unit="TB of 2 TB" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Panel flush title="Spaces">
          <DataTable label="Spaces" columns={cols} rows={SPACES} getRowId={(s) => s.id} defaultSort={{ id: "used", direction: "desc" }} minWidth={680} />
        </Panel>
        <Panel title="files.yaml" description="Applied 2 hours ago, whole" className="self-start">
          <pre className="overflow-x-auto rounded-md bg-canvas p-2.5 font-mono text-2xs leading-relaxed text-fg">{`spaces:
  - name: Finance
    group: finance
    quota: 100GB
  - name: Northwind rollout
    group: project-northwind
    quota: 20GB
links:
  maxDays: 90
  passwordRequired: false
versions:
  keepDays: 90`}</pre>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  space: () => <SpacePage />,
  links: () => <LinksPage />,
  bin: () => <BinPage />,
  spaces: () => <SpacesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="files" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const SpaceView: Story = {
  name: "Space",
  ...app("space"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Audit 2026" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Files" });
    // Folders come first.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Bank statements");
    await expect(c.getByRole("region", { name: "Preview" })).toHaveTextContent(`In a link to ${AUDITOR.name}`);
    await userEvent.type(c.getByRole("searchbox", { name: "Search this space" }), "xlsx");
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(2);
    await userEvent.clear(c.getByRole("searchbox", { name: "Search this space" }));
    await userEvent.click(within(table).getByText("Management representation letter.docx"));
    await expect(c.getByRole("region", { name: "Preview" })).not.toHaveTextContent("In a link to");
    await userEvent.click(within(table).getByText("Financial statements draft.pdf"));
    blur(canvasElement);
  },
};

export const Links: Story = {
  ...app("links"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Links" });
    // The one expiring soonest is first.
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Signed lease.pdf");
    await expect(c.getByRole("region", { name: "Link" })).toHaveTextContent("Trial balance 2026-09.xlsx downloaded");
    await userEvent.click(c.getByRole("tab", { name: /Expired/ }));
    await expect(within(table).getAllByRole("row").slice(1)).toHaveLength(1);
    await userEvent.click(c.getByRole("tab", { name: /Working/ }));
    blur(canvasElement);
  },
};

export const StopLink: Story = {
  name: "Stop a link",
  ...app("links"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Stop link" }));
    await expect(c.getByRole("status")).toHaveTextContent("The link to Audit 2026 no longer works.");
    await expect(within(c.getByRole("table", { name: "Links" })).queryByText("Audit 2026")).not.toBeInTheDocument();
  },
};

export const RecycleBin: Story = {
  name: "Recycle bin",
  ...app("bin"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(
      within(c.getByRole("table", { name: "Deleted" }))
        .getAllByRole("row")
        .slice(1),
    ).toHaveLength(DELETED.length);
    await expect(c.getByText(`${PEOPLE[2]} leaves on 30 November`)).toBeInTheDocument();
  },
};

export const RestoreFile: Story = {
  name: "Restore a file",
  ...app("bin"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Deleted" })).getAllByRole("button", { name: "Restore" })[0]!);
    await expect(c.getByText("Q3 board deck v2.pptx is back in Finance / Board/2026.")).toBeInTheDocument();
  },
};

export const Spaces: Story = {
  ...app("spaces"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    // The fullest space is first.
    await expect(within(c.getByRole("table", { name: "Spaces" })).getAllByRole("row")[1]).toHaveTextContent("Marketing");
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
