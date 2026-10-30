import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Bold,
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock,
  Code,
  FileCheck,
  FileText,
  Heading2,
  History,
  Image,
  Italic,
  Link2,
  List,
  Pencil,
  Plus,
  Table,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput, SelectField, TextField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { cn } from "../../lib/cn";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "page", label: "Pages", icon: BookOpen },
  { id: "stale", label: "To review", icon: Clock, count: 7 },
  { id: "policies", label: "Policies", icon: FileCheck },
];

const meta = {
  title: "Products/Wiki",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const OWNER = PEOPLE[4];

interface TreeNode {
  title: string;
  children?: TreeNode[];
  stale?: boolean;
}

const TREE: Array<{ space: string; group: string; pages: TreeNode[] }> = [
  {
    space: "Engineering",
    group: "engineering",
    pages: [
      { title: "Onboarding", children: [{ title: "Your first week" }, { title: "Laptop and accounts" }] },
      { title: "How we deploy", children: [{ title: "Rolling back" }, { title: "Database migrations", stale: true }] },
      { title: "On-call handbook", children: [{ title: "Paging rules" }, { title: "Incident roles" }] },
      { title: "Architecture", stale: true },
    ],
  },
  { space: "People", group: "everyone", pages: [{ title: "Leave policy" }, { title: "Travel and expenses" }, { title: "Working from abroad", stale: true }] },
  { space: "Sales", group: "sales", pages: [{ title: "Pricing and discounts" }, { title: "Demo script" }] },
];

const CHANGES = [
  { when: "Today 10:21", who: OWNER, what: "Rollback now uses the release tag, not the commit" },
  { when: "28 Oct", who: PEOPLE[0], what: "Added the migration check" },
  { when: "14 Oct", who: OWNER, what: "Reviewed, no changes" },
  { when: "2 Sep", who: PEOPLE[6], what: "Screenshots of the new pipeline" },
];

/* ------------------------------------------------------------------ page */

function Tree({ active }: { active: string }) {
  return (
    <Panel flush aria-label="Pages in the wiki">
      <div className="px-2.5 pt-2.5 pb-1">
        <SearchInput label="Search the wiki" placeholder="Search every page you can read" />
      </div>
      {TREE.map((s) => (
        <div key={s.space} className="border-t border-line px-1.5 py-1.5 first-of-type:border-t-0">
          <span className="flex items-center justify-between px-1.5 pb-0.5 text-2xs font-semibold tracking-wide text-fg-subtle uppercase">
            {s.space}
            <span className="font-mono font-normal normal-case">{s.group}</span>
          </span>
          <ul className="flex flex-col">
            {s.pages.map((p) => (
              <li key={p.title}>
                <a
                  href={`#page/${p.title}`}
                  aria-current={p.title === active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-1 rounded px-1.5 py-1 text-sm no-underline",
                    p.title === active ? "bg-accent-soft font-medium text-accent-text" : "text-fg hover:bg-canvas",
                  )}
                >
                  {p.children ? (
                    p.title === active ? (
                      <ChevronDown aria-hidden className="size-3 shrink-0 text-fg-muted" />
                    ) : (
                      <ChevronRight aria-hidden className="size-3 shrink-0 text-fg-muted" />
                    )
                  ) : (
                    <span aria-hidden className="w-3 shrink-0" />
                  )}
                  <span className="truncate">{p.title}</span>
                  {p.stale && <Clock aria-label="Needs a review" className="ml-auto size-3 shrink-0 text-warning-text" />}
                </a>
                {p.children && p.title === active && (
                  <ul className="ml-4 flex flex-col border-l border-line pl-1">
                    {p.children.map((c) => (
                      <li key={c.title}>
                        <a
                          href={`#page/${c.title}`}
                          className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-fg-muted no-underline hover:bg-canvas"
                        >
                          <span className="truncate">{c.title}</span>
                          {c.stale && <Clock aria-label="Needs a review" className="ml-auto size-3 shrink-0 text-warning-text" />}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </Panel>
  );
}

/** One page as people read it: the space's tree, the page, and its owner, review date and history beside it. */
function PagePage({ onEdit }: { onEdit: () => void }) {
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Engineering", href: "#page" }, { label: "How we deploy" }]}
        title="How we deploy"
        meta={<StatusBadge tone="success">Reviewed 2 days ago</StatusBadge>}
        actions={
          <>
            <Button icon={<Plus />}>New page</Button>
            <Button variant="primary" icon={<Pencil />} onClick={onEdit}>
              Edit
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[232px_minmax(0,1fr)_260px]">
        <Tree active="How we deploy" />
        <Panel aria-label="Page">
          <article className="flex max-w-[68ch] flex-col gap-3 px-2 py-1 text-sm leading-relaxed text-fg">
            <p className="text-base text-fg-muted">
              Every change reaches production through the pipeline. Nobody deploys from a laptop, and a deploy can always be rolled back in one step.
            </p>
            <h2 className="mt-1 text-base font-semibold">Before you merge</h2>
            <ol className="flex list-decimal flex-col gap-1 pl-5">
              <li>CI is green, including the SAST and dependency checks.</li>
              <li>A database migration is backwards compatible: the old release must still run against it.</li>
              <li>
                The change has a line in <code className="rounded bg-subtle px-1 font-mono text-xs">CHANGELOG.md</code>.
              </li>
            </ol>
            <h2 className="mt-1 text-base font-semibold">When it runs</h2>
            <div className="overflow-hidden rounded-md border border-line">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">Deploy windows</caption>
                <thead className="bg-canvas text-fg-muted">
                  <tr>
                    <th className="px-2.5 py-1.5 font-semibold">Service</th>
                    <th className="px-2.5 py-1.5 font-semibold">Deploys</th>
                    <th className="px-2.5 py-1.5 font-semibold">Approval</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["orders-api", "On merge, 09:00 to 17:00", "None"],
                    ["billing-worker", "On merge, weekdays", "None"],
                    ["Database schema", "Tuesdays and Thursdays", "A second engineer"],
                    ["Edge config", "On merge", "Platform team"],
                  ].map((r) => (
                    <tr key={r[0]} className="border-t border-line">
                      <td className="px-2.5 py-1.5 font-mono">{r[0]}</td>
                      <td className="px-2.5 py-1.5">{r[1]}</td>
                      <td className="px-2.5 py-1.5">{r[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <h2 className="mt-1 text-base font-semibold">Rolling back</h2>
            <p>
              Run the rollback job with the release tag of the last good version. Alerts and the error rate in{" "}
              <a href="#metrics" className="text-accent-text underline">
                Metrics
              </a>{" "}
              tell you within five minutes whether it helped. See{" "}
              <a href="#page/Rolling back" className="text-accent-text underline">
                Rolling back
              </a>{" "}
              for the details.
            </p>
            <pre className="overflow-x-auto rounded-md bg-canvas p-2.5 font-mono text-xs">deploy rollback orders-api --to v4.18.2</pre>
          </article>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="About this page">
            <dl className="grid grid-cols-[72px_minmax(0,1fr)] gap-x-2 gap-y-1.5 text-xs">
              <dt className="text-fg-muted">Owner</dt>
              <dd className="flex items-center gap-1.5 text-fg">
                <Avatar name={OWNER} size="sm" className="size-5" />
                {OWNER}
              </dd>
              <dt className="text-fg-muted">Review</dt>
              <dd className="text-fg">Every 6 months, next in April</dd>
              <dt className="text-fg-muted">Readers</dt>
              <dd className="text-fg">Group engineering</dd>
              <dt className="text-fg-muted">Linked from</dt>
              <dd className="text-fg">Onboarding, On-call handbook</dd>
            </dl>
          </Panel>
          <Panel title="Changes" actions={<History aria-hidden className="size-3.5 text-fg-muted" />}>
            <ol aria-label="Changes" className="flex flex-col gap-2">
              {CHANGES.map((c) => (
                <li key={c.when} className="flex gap-2 text-xs">
                  <Avatar name={c.who} size="sm" className="size-5" />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-fg">{c.what}</span>
                    <span className="text-2xs text-fg-muted">
                      {c.who} · {c.when}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ edit */

/** The editor: plain blocks with a toolbar, a note on what changed, and a template to start from. */
function EditPage({ onDone }: { onDone: (note: string) => void }) {
  const [note, setNote] = useState("");
  const tools = [
    { label: "Heading", icon: Heading2 },
    { label: "Bold", icon: Bold },
    { label: "Italic", icon: Italic },
    { label: "List", icon: List },
    { label: "Table", icon: Table },
    { label: "Image", icon: Image },
    { label: "Code", icon: Code },
    { label: "Link to a page", icon: Link2 },
  ];
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Engineering", href: "#page" }, { label: "How we deploy", href: "#page" }, { label: "Edit" }]}
        title="Editing How we deploy"
        meta={<Badge>Draft saved 10:24</Badge>}
        actions={
          <>
            <Button onClick={() => onDone("")}>Cancel</Button>
            <Button variant="primary" onClick={() => onDone(note)}>
              Publish
            </Button>
          </>
        }
      />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_280px]">
        <Panel flush aria-label="Editor">
          <div role="toolbar" aria-label="Formatting" className="flex flex-wrap gap-0.5 border-b border-line px-2 py-1.5">
            {tools.map((t) => (
              <IconButton key={t.label} label={t.label} size="sm">
                <t.icon className="size-4" />
              </IconButton>
            ))}
          </div>
          <div className="flex max-w-[68ch] flex-col gap-3 px-5 py-4 text-sm leading-relaxed text-fg">
            <p className="text-base text-fg-muted">
              Every change reaches production through the pipeline. Nobody deploys from a laptop, and a deploy can always be rolled back in one step.
            </p>
            <h2 className="text-base font-semibold">Rolling back</h2>
            <p className="rounded-sm bg-accent-soft/60 outline-2 outline-offset-2 outline-accent">
              Run the rollback job with the <mark className="bg-warning-soft px-0.5 text-fg">release tag</mark> of the last good version
              <span aria-hidden className="ml-px inline-block h-4 w-px translate-y-0.5 animate-pulse bg-fg" />
            </p>
            <p className="text-fg-subtle">Type / for a heading, table, image, code or a link to another page.</p>
          </div>
        </Panel>
        <div className="flex flex-col gap-2.5">
          <Panel title="Publish">
            <div className="flex flex-col gap-2">
              <TextField label="What changed" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Rollback uses the release tag" />
              <SelectField
                label="Tell readers"
                defaultValue="changes"
                options={[
                  { value: "none", label: "Nobody, a small fix" },
                  { value: "changes", label: "People who follow the page" },
                  { value: "all", label: "Everyone who can read it" },
                ]}
              />
            </div>
          </Panel>
          <Callout tone="info" title={`${PEOPLE[0]} is editing too`}>
            Dana is in the section Database migrations. Both edits are kept; the second to publish sees what the first changed.
          </Callout>
        </div>
      </div>
    </>
  );
}

function Pages() {
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  return (
    <>
      {notice && (
        <div role="status" className="rounded-md bg-success-soft px-3 py-2 text-sm text-fg">
          {notice}
        </div>
      )}
      {editing ? (
        <EditPage
          onDone={(note) => {
            setEditing(false);
            setNotice(note ? `Published: ${note}. People who follow the page are told.` : null);
          }}
        />
      ) : (
        <PagePage onEdit={() => setEditing(true)} />
      )}
    </>
  );
}

/* ----------------------------------------------------------------- stale */

interface StalePage {
  id: string;
  title: string;
  space: string;
  owner: string;
  reviewed: string;
  overdue: number;
  views: number;
  /** The owner left; someone else must take it. */
  orphan?: boolean;
}

const STALE: StalePage[] = [
  { id: "s1", title: "Architecture", space: "Engineering", owner: PEOPLE[0], reviewed: "12 Mar 2025", overdue: 233, views: 41 },
  { id: "s2", title: "Database migrations", space: "Engineering", owner: OWNER, reviewed: "2 Feb 2026", overdue: 89, views: 18 },
  { id: "s3", title: "Working from abroad", space: "People", owner: PEOPLE[5], reviewed: "1 Apr 2026", overdue: 30, views: 112 },
  { id: "s4", title: "Office Wi-Fi and printers", space: "Office", owner: PEOPLE[2], reviewed: "18 Jan 2026", overdue: 14, views: 64, orphan: true },
  { id: "s5", title: "Customer escalation", space: "Sales", owner: PEOPLE[3], reviewed: "20 Apr 2026", overdue: 11, views: 9 },
  { id: "s6", title: "Brand voice", space: "Marketing", owner: PEOPLE[7], reviewed: "29 Apr 2026", overdue: 2, views: 23 },
  { id: "s7", title: "Laptop and accounts", space: "Engineering", owner: PEOPLE[4], reviewed: "5 May 2026", overdue: 0, views: 37 },
];

/** Pages past their space's review period, the ones read most and overdue longest first. */
function StalePageView() {
  const [space, setSpace] = useState("all");
  const [reviewed, setReviewed] = useState<string[]>([]);
  const rows = STALE.filter((p) => (space === "all" || p.space === space) && !reviewed.includes(p.id));
  const cols: Column<StalePage>[] = [
    {
      id: "title",
      header: "Page",
      width: "28%",
      sortValue: (p) => p.title,
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-2">
          <FileText aria-hidden className="size-3.5 shrink-0 text-fg-muted" />
          <span className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{p.title}</span>
            <span className="text-2xs text-fg-muted">{p.space}</span>
          </span>
        </span>
      ),
    },
    {
      id: "owner",
      header: "Owner",
      sortValue: (p) => p.owner,
      cell: (p) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={p.owner} size="sm" className="size-5" />
          <span className="truncate text-xs">{p.owner}</span>
          {p.orphan && <Badge tone="warning">Leaving</Badge>}
        </span>
      ),
    },
    { id: "reviewed", header: "Last review", cell: (p) => <span className="text-xs whitespace-nowrap">{p.reviewed}</span> },
    {
      id: "overdue",
      header: "Overdue",
      sortValue: (p) => p.overdue,
      cell: (p) => (
        <StatusBadge tone={p.overdue > 60 ? "danger" : p.overdue > 0 ? "warning" : "neutral"}>{p.overdue ? `${p.overdue} d` : "Due today"}</StatusBadge>
      ),
    },
    { id: "views", header: "Read · 30 d", align: "right", mono: true, sortValue: (p) => p.views, cell: (p) => p.views },
    {
      id: "act",
      header: <span className="sr-only">Mark reviewed</span>,
      align: "right",
      cell: (p) => (
        <Button size="xs" onClick={() => setReviewed((r) => [...r, p.id])}>
          Still right
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="To review"
        description="A page not reviewed within its space's period is listed for its owner. Engineering reviews every 6 months, People every 12."
      />
      <KpiGrid minWidth={170}>
        <KpiCard label="Pages" value="412" unit="in 6 spaces" />
        <KpiCard label="To review" value={String(STALE.length - reviewed.length)} delta={{ label: "2 overdue more than 60 d", intent: "bad" }} />
        <KpiCard label="Owner leaving" value="1" delta={{ label: "needs a new owner", intent: "neutral" }} />
        <KpiCard label="Reviewed this month" value={String(23 + reviewed.length)} delta={{ label: "+9 vs. September", direction: "up", intent: "good" }} />
      </KpiGrid>
      <Panel flush>
        <div className="px-3 pt-2">
          <Tabs
            label="Space"
            value={space}
            onChange={setSpace}
            items={[
              { value: "all", label: "All spaces", count: STALE.length - reviewed.length },
              ...["Engineering", "People", "Sales", "Marketing", "Office"].map((s) => ({
                value: s,
                label: s,
                count: STALE.filter((p) => p.space === s && !reviewed.includes(p.id)).length,
              })),
            ]}
            className="border-b-0"
          />
        </div>
        <div className="border-t border-line">
          <DataTable
            label="Pages to review"
            columns={cols}
            rows={rows}
            getRowId={(p) => p.id}
            defaultSort={{ id: "overdue", direction: "desc" }}
            minWidth={820}
          />
        </div>
      </Panel>
    </>
  );
}

/* -------------------------------------------------------------- policies */

interface Policy {
  id: string;
  title: string;
  version: string;
  changed: string;
  readers: number;
  read: number;
  due: string;
}

const POLICIES: Policy[] = [
  { id: "p1", title: "Information security policy", version: "v7", changed: "1 Oct", readers: 38, read: 31, due: "15 Nov" },
  { id: "p2", title: "Acceptable use of devices", version: "v4", changed: "1 Oct", readers: 38, read: 35, due: "15 Nov" },
  { id: "p3", title: "Travel and expenses", version: "v3", changed: "12 Sep", readers: 38, read: 38, due: "Done" },
  { id: "p4", title: "Leave policy", version: "v5", changed: "2 Jun", readers: 38, read: 38, due: "Done" },
  { id: "p5", title: "Code of conduct", version: "v2", changed: "15 Jan", readers: 38, read: 37, due: "Overdue" },
];

const NOT_READ = [
  { name: PEOPLE[2], team: "Office", note: "Leaving 30 Nov" },
  { name: PEOPLE[6], team: "Sales", note: "" },
  { name: PEOPLE[7], team: "Management", note: "" },
  { name: "Jonas Berg", team: "Engineering", note: "On leave until 10 Nov" },
  { name: "Priya Shah", team: "Office", note: "" },
  { name: "Leo Grant", team: "Engineering", note: "Started 3 Nov" },
  { name: "Ana Lopes", team: "Sales", note: "" },
];

/** Pages marked as a policy, and who has read their current version; a new version asks everyone again. */
function PoliciesPage() {
  const [active, setActive] = useState("p1");
  const [reminded, setReminded] = useState(false);
  const cur = POLICIES.find((p) => p.id === active) ?? POLICIES[0]!;
  const cols: Column<Policy>[] = [
    {
      id: "title",
      header: "Policy",
      width: "34%",
      cell: (p) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{p.title}</span>
          <span className="text-2xs text-fg-muted">
            {p.version} · changed {p.changed}
          </span>
        </span>
      ),
    },
    {
      id: "read",
      header: "Read the current version",
      width: "34%",
      sortValue: (p) => p.read / p.readers,
      cell: (p) => (
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 grow overflow-hidden rounded-full bg-subtle">
            <span
              className={cn("block h-full rounded-full", p.read === p.readers ? "bg-success" : "bg-accent")}
              style={{ width: `${(p.read / p.readers) * 100}%` }}
            />
          </span>
          <span className="shrink-0 font-mono text-xs tabular-nums">
            {p.read} of {p.readers}
          </span>
        </span>
      ),
    },
    {
      id: "due",
      header: "By",
      cell: (p) => <StatusBadge tone={p.due === "Done" ? "success" : p.due === "Overdue" ? "danger" : "neutral"}>{p.due}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader title="Policies" description="Reading is confirmed by the reader with one click at the end of the page. Compliance uses these as evidence." />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Panel flush title="Policies">
          <DataTable
            label="Policies"
            columns={cols}
            rows={POLICIES}
            getRowId={(p) => p.id}
            onRowClick={(p) => (setActive(p.id), setReminded(false))}
            activeRowId={active}
            minWidth={600}
          />
        </Panel>
        <Panel
          aria-label="Not read yet"
          title={`${cur.readers - cur.read} have not read ${cur.version}`}
          description={cur.title}
          className="self-start"
          actions={
            cur.read < cur.readers && (
              <Button size="sm" onClick={() => setReminded(true)} disabled={reminded}>
                Remind
              </Button>
            )
          }
        >
          {cur.read === cur.readers ? (
            <p className="text-sm text-fg-muted">Everyone has read it.</p>
          ) : (
            <ul aria-label="People who have not read it" className="flex flex-col gap-1.5">
              {NOT_READ.slice(0, cur.readers - cur.read).map((p) => (
                <li key={p.name} className="flex items-center gap-2 text-sm">
                  <Avatar name={p.name} size="sm" className="size-5" />
                  <span className="flex min-w-0 grow flex-col">
                    <span className="truncate text-fg">{p.name}</span>
                    <span className="truncate text-2xs text-fg-muted">
                      {p.team}
                      {p.note && ` · ${p.note}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {reminded && (
            <p role="status" className="mt-2 text-xs text-success">
              Reminder sent by email to {cur.readers - cur.read} people.
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  page: () => <Pages />,
  stale: () => <StalePageView />,
  policies: () => <PoliciesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="wiki" nav={nav} pages={PAGES} initial={initial} /> });

const blur = (el: HTMLElement) => (el.ownerDocument.activeElement as HTMLElement | null)?.blur();

/* ----------------------------------------------------------------- stories */

export const Page: Story = {
  ...app("page"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "How we deploy" })).toBeInTheDocument();
    await expect(within(c.getByRole("region", { name: "Pages in the wiki" })).getByRole("link", { name: "How we deploy" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(c.getByRole("list", { name: "Changes" })).toHaveTextContent("Rollback now uses the release tag");
    await expect(c.getByRole("table", { name: "Deploy windows" })).toBeInTheDocument();
  },
};

export const Edit: Story = {
  ...app("page"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Edit" }));
    await expect(c.getByRole("heading", { level: 1, name: "Editing How we deploy" })).toBeInTheDocument();
    await expect(c.getByRole("toolbar", { name: "Formatting" })).toBeInTheDocument();
    await userEvent.type(c.getByRole("textbox", { name: "What changed" }), "Rollback uses the release tag");
    blur(canvasElement);
  },
};

export const Publish: Story = {
  name: "Publish a change",
  ...app("page"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Edit" }));
    await userEvent.type(c.getByRole("textbox", { name: "What changed" }), "Rollback uses the release tag");
    await userEvent.click(c.getByRole("button", { name: "Publish" }));
    await expect(c.getByRole("status")).toHaveTextContent("Published: Rollback uses the release tag. People who follow the page are told.");
    await expect(c.getByRole("heading", { level: 1, name: "How we deploy" })).toBeInTheDocument();
  },
};

export const ToReview: Story = {
  name: "To review",
  ...app("stale"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Pages to review" });
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Architecture");
    await userEvent.click(c.getByRole("tab", { name: /Office/ }));
    await expect(within(table).getAllByRole("row")[1]).toHaveTextContent("Leaving");
    await userEvent.click(c.getByRole("tab", { name: /All spaces/ }));
    blur(canvasElement);
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Not read yet" })).toHaveTextContent("7 have not read v7");
    await userEvent.click(c.getByRole("button", { name: "Remind" }));
    await expect(c.getByText("Reminder sent by email to 7 people.")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Policies" })).getByText("Travel and expenses"));
    await expect(c.getByText("Everyone has read it.")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Policies" })).getByText("Information security policy"));
    blur(canvasElement);
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
