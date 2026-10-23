import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  Bell,
  CircleCheck,
  Compass,
  Download,
  GitCommitHorizontal,
  Inbox,
  Plus,
  RotateCcw,
  Save,
  ScrollText,
  Tag,
  Upload,
  UserPlus,
  Waypoints,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, QueryBar, TimeRangePicker } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, LevelBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { Sparkline } from "../../charts/Sparkline";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { formatNumber } from "../../lib/format";
import { cn } from "../../lib/cn";
import { PEOPLE, timeLabels, wave } from "../mocks";

const nav = [
  { id: "issues", label: "Issues", icon: Inbox, count: 318 },
  { id: "releases", label: "Releases", icon: Tag },
  { id: "alerts", label: "Alerts", icon: Bell },
  { id: "discover", label: "Discover", icon: Compass },
];

const meta = {
  title: "Products/Errors",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

interface Frame {
  fn: string;
  file: string;
  line: number;
  inApp: boolean;
  context?: Array<[number, string]>;
}

interface Issue {
  id: string;
  short: string;
  type: string;
  message: string;
  culprit: string;
  level: "error" | "fatal";
  events: number;
  users: number;
  trend: number[];
  firstSeen: string;
  lastSeen: string;
  release: string;
  assignee?: string;
  tags: Record<string, string>;
  frames: Frame[];
  breadcrumbs: Array<{ time: string; category: string; text: string; level: "info" | "warn" | "error" }>;
}

const issues: Issue[] = [
  {
    id: "ORD-4F2",
    short: "ORD-4F2",
    type: "TypeError",
    message: "Cannot read properties of undefined (reading 'currency')",
    culprit: "src/checkout/summary.ts:88",
    level: "error",
    events: 4812,
    users: 1290,
    trend: wave(24, { base: 40, amp: 15, seed: 81, spike: 380, spikeAt: 16, spikeLen: 2 }),
    firstSeen: "2 h ago",
    lastSeen: "1 min ago",
    release: "web@3.42.0",
    assignee: PEOPLE[3],
    tags: { browser: "Chrome 129", os: "macOS 15.1", release: "web@3.42.0", environment: "production", url: "/checkout/summary" },
    frames: [
      {
        fn: "formatTotal",
        file: "src/checkout/summary.ts",
        line: 88,
        inApp: true,
        context: [
          [86, "export function formatTotal(cart: Cart): string {"],
          [87, "  const totals = cart.totals;"],
          [88, "  return money(totals.grand, totals.discount.currency);"],
          [89, "}"],
        ],
      },
      {
        fn: "SummaryPanel",
        file: "src/checkout/SummaryPanel.tsx",
        line: 41,
        inApp: true,
        context: [
          [40, "  const cart = useCart();"],
          [41, "  const total = formatTotal(cart);"],
          [42, '  return <Panel title="Order summary">{total}</Panel>;'],
        ],
      },
      { fn: "renderWithHooks", file: "node_modules/react-dom/cjs/react-dom-client.production.js", line: 5521, inApp: false },
      { fn: "updateFunctionComponent", file: "node_modules/react-dom/cjs/react-dom-client.production.js", line: 7398, inApp: false },
      { fn: "performUnitOfWork", file: "node_modules/react-dom/cjs/react-dom-client.production.js", line: 11236, inApp: false },
    ],
    breadcrumbs: [
      { time: "13:51:02", category: "navigation", text: "/cart → /checkout/summary", level: "info" },
      { time: "13:51:03", category: "fetch", text: "GET /v1/cart/7c1e 200 · 84 ms", level: "info" },
      { time: "13:51:03", category: "ui.click", text: "button#apply-coupon", level: "info" },
      { time: "13:51:04", category: "fetch", text: "POST /v1/cart/7c1e/coupons 422 · 61 ms", level: "warn" },
      { time: "13:51:04", category: "exception", text: "TypeError: Cannot read properties of undefined", level: "error" },
    ],
  },
  {
    id: "ORD-3A9",
    short: "ORD-3A9",
    type: "pq: deadlock detected",
    message: 'while updating tuple (412,7) in relation "orders"',
    culprit: "internal/store/orders.go:214",
    level: "fatal",
    events: 312,
    users: 96,
    trend: wave(24, { base: 2, amp: 1, seed: 82, spike: 40, spikeAt: 17, spikeLen: 3 }),
    firstSeen: "47 min ago",
    lastSeen: "3 min ago",
    release: "orders-api@2.14.1",
    tags: { runtime: "go1.23.2", os: "linux 6.8", release: "orders-api@2.14.1", environment: "production", host: "api-prod-03" },
    frames: [
      {
        fn: "(*Store).UpdateStatus",
        file: "internal/store/orders.go",
        line: 214,
        inApp: true,
        context: [
          [212, "\tq := `UPDATE orders SET status = $1 WHERE id = $2`"],
          [213, "\tif _, err := tx.ExecContext(ctx, q, status, id); err != nil {"],
          [214, '\t\treturn fmt.Errorf("update status: %w", err)'],
          [215, "\t}"],
        ],
      },
      {
        fn: "(*Handler).PatchStatus",
        file: "internal/api/orders.go",
        line: 132,
        inApp: true,
        context: [[132, "\tif err := h.store.UpdateStatus(ctx, id, body.Status); err != nil {"]],
      },
      { fn: "database/sql.(*Tx).ExecContext", file: "database/sql/sql.go", line: 2589, inApp: false },
      { fn: "github.com/lib/pq.(*conn).Exec", file: "github.com/lib/pq/conn.go", line: 912, inApp: false },
      { fn: "net/http.HandlerFunc.ServeHTTP", file: "net/http/server.go", line: 2220, inApp: false },
    ],
    breadcrumbs: [
      { time: "13:47:12", category: "http", text: "PATCH /v1/orders/88213/status", level: "info" },
      { time: "13:47:12", category: "db", text: "BEGIN", level: "info" },
      { time: "13:47:13", category: "db", text: "SELECT … FOR UPDATE · 1 row", level: "info" },
      { time: "13:47:17", category: "db", text: "lock wait 4.1 s on orders", level: "warn" },
      { time: "13:47:17", category: "exception", text: "pq: deadlock detected", level: "error" },
    ],
  },
  {
    id: "ORD-2C7",
    short: "ORD-2C7",
    type: "ChunkLoadError",
    message: "Loading chunk 812 failed (timeout: /assets/812.3fa1.js)",
    culprit: "src/routes/lazy.ts:12",
    level: "error",
    events: 1406,
    users: 822,
    trend: wave(24, { base: 55, amp: 20, seed: 83 }),
    firstSeen: "6 days ago",
    lastSeen: "4 min ago",
    release: "web@3.41.2",
    assignee: PEOPLE[1],
    tags: { browser: "Safari 18.0", os: "iOS 18.0", release: "web@3.41.2", environment: "production", url: "/orders" },
    frames: [
      {
        fn: "loadRoute",
        file: "src/routes/lazy.ts",
        line: 12,
        inApp: true,
        context: [
          [11, "export const loadRoute = (name: string) =>"],
          [12, "  import(`./pages/${name}.tsx`);"],
        ],
      },
      { fn: "__webpack_require__.e", file: "webpack/runtime/ensure chunk", line: 6, inApp: false },
    ],
    breadcrumbs: [
      { time: "13:49:40", category: "navigation", text: "/ → /orders", level: "info" },
      { time: "13:49:50", category: "resource", text: "GET /assets/812.3fa1.js timeout", level: "error" },
    ],
  },
  {
    id: "ORD-1B0",
    short: "ORD-1B0",
    type: "ValidationError",
    message: "postal_code: does not match pattern for country GB",
    culprit: "app/validators/address.py:57",
    level: "error",
    events: 233,
    users: 201,
    trend: wave(24, { base: 10, amp: 4, seed: 84 }),
    firstSeen: "3 weeks ago",
    lastSeen: "12 min ago",
    release: "accounts@1.8.0",
    tags: { runtime: "CPython 3.12.6", os: "linux 6.8", release: "accounts@1.8.0", environment: "production", host: "api-prod-05" },
    frames: [
      {
        fn: "validate_postal_code",
        file: "app/validators/address.py",
        line: 57,
        inApp: true,
        context: [
          [56, "    if not PATTERNS[country].fullmatch(value):"],
          [57, '        raise ValidationError(f"postal_code: does not match pattern for country {country}")'],
        ],
      },
      { fn: "full_clean", file: "django/db/models/base.py", line: 1502, inApp: false },
    ],
    breadcrumbs: [{ time: "13:43:05", category: "http", text: "POST /v1/addresses 400", level: "warn" }],
  },
  {
    id: "ORD-0E4",
    short: "ORD-0E4",
    type: "OutOfMemoryError",
    message: "Java heap space",
    culprit: "com.acme.reports.CsvExporter.write(CsvExporter.java:144)",
    level: "fatal",
    events: 18,
    users: 4,
    trend: wave(24, { base: 0.5, amp: 0.5, seed: 85, spike: 3, spikeAt: 20 }),
    firstSeen: "Yesterday",
    lastSeen: "22 min ago",
    release: "reports@5.0.3",
    assignee: PEOPLE[2],
    tags: { runtime: "OpenJDK 21.0.4", os: "linux 6.8", release: "reports@5.0.3", environment: "production", host: "worker-prod-09" },
    frames: [
      {
        fn: "CsvExporter.write",
        file: "com/acme/reports/CsvExporter.java",
        line: 144,
        inApp: true,
        context: [
          [143, "        List<Row> all = repository.findAll(range);"],
          [144, '        String body = all.stream().map(Row::toCsv).collect(joining("\\n"));'],
        ],
      },
      { fn: "ThreadPoolExecutor.runWorker", file: "java/util/concurrent/ThreadPoolExecutor.java", line: 1144, inApp: false },
    ],
    breadcrumbs: [{ time: "13:30:00", category: "job", text: "export-monthly started · 2.1M rows", level: "info" }],
  },
];

const issueColumns: Column<Issue>[] = [
  {
    id: "issue",
    header: "Issue",
    width: "34%",
    cell: (i) => (
      <span className="flex min-w-0 flex-col">
        <span className="flex min-w-0 items-center gap-1.5">
          <LevelBadge level={i.level} />
          <span className="truncate font-semibold">{i.type}</span>
        </span>
        <span className="truncate text-xs text-fg-muted">{i.message}</span>
        <span className="truncate font-mono text-2xs text-fg-muted">{i.culprit}</span>
      </span>
    ),
  },
  {
    id: "trend",
    header: "Events · 24 h",
    width: "130px",
    cell: (i) => <Sparkline data={i.trend} label={`Events per hour for ${i.short}`} height={24} color="var(--oa-danger)" className="w-28" />,
  },
  { id: "events", header: "Events", align: "right", mono: true, sortValue: (i) => i.events, cell: (i) => formatNumber(i.events) },
  { id: "users", header: "Users", align: "right", mono: true, sortValue: (i) => i.users, cell: (i) => formatNumber(i.users) },
  {
    id: "seen",
    header: "Last / first seen",
    cell: (i) => (
      <span className="flex flex-col text-xs">
        <span>{i.lastSeen}</span>
        <span className="text-fg-muted">{i.firstSeen}</span>
      </span>
    ),
  },
  { id: "release", header: "Release", mono: true, cell: (i) => i.release },
  {
    id: "assignee",
    header: "Assignee",
    cell: (i) =>
      i.assignee ? (
        <span className="flex items-center gap-1.5">
          <Avatar name={i.assignee} size="sm" />
          <span className="truncate text-xs">{i.assignee}</span>
        </span>
      ) : (
        <span className="text-xs text-fg-muted">Unassigned</span>
      ),
  },
];

/* ------------------------------------------------------------ detail */

function StackTrace({ frames }: { frames: Frame[] }) {
  return (
    <ol aria-label="Stack frames" className="flex flex-col">
      {frames.map((f, idx) => (
        <li key={idx} className={cn("border-b border-subtle last:border-0", f.inApp ? "bg-surface" : "bg-canvas")}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 px-3 py-1.5 font-mono text-xs">
            <span className={cn(f.inApp ? "font-semibold text-fg" : "text-fg-muted")}>{f.fn}</span>
            <span className="text-fg-muted">
              {f.file}:{f.line}
            </span>
            {f.inApp && (
              <Badge tone="info" className="ml-auto font-sans">
                In app
              </Badge>
            )}
          </div>
          {f.inApp && f.context && (
            <div className="relative overflow-x-auto border-t border-subtle">
              <pre className="font-mono text-xs leading-5">
                {f.context.map(([n, code]) => (
                  <div key={n} className={cn("flex", n === f.line && "bg-danger-soft text-danger-text")}>
                    <span className="w-12 shrink-0 pr-3 text-right text-fg-muted select-none">{n}</span>
                    <code className="pr-3 whitespace-pre">{code}</code>
                  </div>
                ))}
              </pre>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

function IssueDetail({ issue }: { issue: Issue }) {
  return (
    <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Panel
        aria-label="Issue detail"
        title={`${issue.type}: ${issue.message}`}
        description={`${issue.short} · ${issue.culprit} · ${formatNumber(issue.events)} events · ${formatNumber(issue.users)} users`}
        actions={
          <>
            <Button size="sm" icon={<Waypoints />}>
              Open trace in Traces
            </Button>
            <Button size="sm" icon={<ScrollText />}>
              Logs around this event
            </Button>
            <Button size="sm" icon={<UserPlus />}>
              Assign
            </Button>
            <Button size="sm" variant="primary" icon={<CircleCheck />}>
              Resolve
            </Button>
          </>
        }
        flush
      >
        <StackTrace frames={issue.frames} />
      </Panel>
      <div className="flex min-w-0 flex-col gap-2.5">
        <Panel title="Tags">
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            {Object.entries(issue.tags).map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-fg-muted">{k}</dt>
                <dd className="truncate font-mono">{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel title="Breadcrumbs" description="Last actions before the error" flush>
          <ol className="flex flex-col">
            {issue.breadcrumbs.map((b, i) => (
              <li key={i} className="grid grid-cols-[64px_52px_minmax(0,1fr)] items-start gap-2 border-b border-subtle px-3 py-1.5 text-xs last:border-0">
                <span className="font-mono text-fg-muted">{b.time}</span>
                <LevelBadge level={b.level} />
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{b.category}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">{b.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------- pages */

/** Issues: errors grouped by fingerprint; selecting one opens its stack trace, breadcrumbs and tags. */
function IssuesPage() {
  const [range, setRange] = useState("24h");
  const [status, setStatus] = useState("unresolved");
  const [envs, setEnvs] = useState<string[]>(["production"]);
  const [active, setActive] = useState(issues[0]!.id);
  const issue = issues.find((i) => i.id === active)!;
  return (
    <>
      <PageHeader
        title="Issues"
        description="318 unresolved across 6 projects · grouped by fingerprint"
        meta={<StatusBadge tone="danger">2 regressions</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search issues" shortcut="/" className="w-64" />
            <SegmentedControl
              label="Issue status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "unresolved", label: "Unresolved" },
                { value: "ignored", label: "Ignored" },
                { value: "resolved", label: "Resolved" },
              ]}
            />
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Environment"
          selected={envs}
          onChange={setEnvs}
          options={[
            { value: "production", count: 318 },
            { value: "staging", count: 74 },
          ]}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Events · 24 h"
          value="6.8k"
          tone="danger"
          trendColor="var(--oa-danger)"
          trend={wave(24, { base: 200, amp: 40, seed: 86, spike: 420, spikeAt: 17 })}
          delta={{ label: "+212% vs. yesterday", direction: "up", intent: "bad" }}
        />
        <KpiCard label="Users affected" value="2,413" delta={{ label: "1.9% of active users", intent: "bad" }} />
        <KpiCard label="New issues" value="7" delta={{ label: "3 in web@3.42.0", direction: "up", intent: "bad" }} />
        <KpiCard label="Crash-free sessions" value="98.7" unit="%" delta={{ label: "-0.9 pts after web@3.42.0", direction: "down", intent: "bad" }} />
      </KpiGrid>
      <Panel title="Unresolved issues" description="Sorted by events" flush>
        <DataTable
          label="Issues"
          columns={issueColumns}
          rows={issues}
          getRowId={(i) => i.id}
          onRowClick={(i) => setActive(i.id)}
          activeRowId={active}
          defaultSort={{ id: "events", direction: "desc" }}
          minWidth={1000}
        />
      </Panel>
      <IssueDetail issue={issue} />
    </>
  );
}

/* -------------------------------------------------------------- releases */

interface Release {
  id: string;
  version: string;
  project: string;
  deployed: string;
  crashFreeSessions: number;
  crashFreeUsers: number;
  adoption: number;
  sessions: number;
  newIssues: number;
  regressions: number;
  commits: number;
  authors: string[];
  stage: "Production" | "Staging" | "Rolled back";
}

const RELEASES: Release[] = [
  {
    id: "r1",
    version: "web@3.42.0",
    project: "web",
    deployed: "Today 11:52",
    crashFreeSessions: 98.12,
    crashFreeUsers: 97.41,
    adoption: 46,
    sessions: 182_400,
    newIssues: 3,
    regressions: 1,
    commits: 24,
    authors: [PEOPLE[3], PEOPLE[0], PEOPLE[6]],
    stage: "Production",
  },
  {
    id: "r2",
    version: "web@3.41.2",
    project: "web",
    deployed: "Oct 13",
    crashFreeSessions: 99.61,
    crashFreeUsers: 99.18,
    adoption: 51,
    sessions: 1_204_880,
    newIssues: 1,
    regressions: 0,
    commits: 6,
    authors: [PEOPLE[1]],
    stage: "Production",
  },
  {
    id: "r3",
    version: "orders-api@2.14.1",
    project: "orders-api",
    deployed: "Today 13:20",
    crashFreeSessions: 99.08,
    crashFreeUsers: 98.9,
    adoption: 100,
    sessions: 412_090,
    newIssues: 1,
    regressions: 1,
    commits: 9,
    authors: [PEOPLE[2], PEOPLE[4]],
    stage: "Production",
  },
  {
    id: "r4",
    version: "orders-api@2.14.0",
    project: "orders-api",
    deployed: "Oct 16",
    crashFreeSessions: 99.94,
    crashFreeUsers: 99.9,
    adoption: 0,
    sessions: 2_840_100,
    newIssues: 0,
    regressions: 0,
    commits: 17,
    authors: [PEOPLE[2]],
    stage: "Rolled back",
  },
  {
    id: "r5",
    version: "accounts@1.8.0",
    project: "accounts",
    deployed: "Sep 28",
    crashFreeSessions: 99.89,
    crashFreeUsers: 99.85,
    adoption: 100,
    sessions: 3_102_400,
    newIssues: 1,
    regressions: 0,
    commits: 31,
    authors: [PEOPLE[5], PEOPLE[7]],
    stage: "Production",
  },
  {
    id: "r6",
    version: "reports@5.0.3",
    project: "reports",
    deployed: "Oct 10",
    crashFreeSessions: 99.42,
    crashFreeUsers: 98.6,
    adoption: 100,
    sessions: 4_210,
    newIssues: 1,
    regressions: 0,
    commits: 4,
    authors: [PEOPLE[2]],
    stage: "Production",
  },
  {
    id: "r7",
    version: "ios@4.8.0",
    project: "ios",
    deployed: "Oct 14",
    crashFreeSessions: 99.71,
    crashFreeUsers: 99.52,
    adoption: 63,
    sessions: 288_300,
    newIssues: 2,
    regressions: 0,
    commits: 42,
    authors: [PEOPLE[7], PEOPLE[5]],
    stage: "Production",
  },
  {
    id: "r8",
    version: "web@3.43.0-rc.1",
    project: "web",
    deployed: "Today 13:05",
    crashFreeSessions: 99.8,
    crashFreeUsers: 99.7,
    adoption: 0,
    sessions: 1_220,
    newIssues: 0,
    regressions: 0,
    commits: 11,
    authors: [PEOPLE[0]],
    stage: "Staging",
  },
];

const STAGE_TONE: Record<Release["stage"], "success" | "info" | "warning"> = { Production: "success", Staging: "info", "Rolled back": "warning" };
const crashTone = (v: number) => (v < 99 ? "text-danger-text" : v < 99.5 ? "text-warning-text" : "text-fg");

const COMMITS: Record<string, Array<{ sha: string; title: string; author: string }>> = {
  r1: [
    { sha: "8c41f0a", title: "checkout: show coupon discount in order summary", author: PEOPLE[3] },
    { sha: "2b9e7d1", title: "cart: return 422 when the coupon is expired", author: PEOPLE[0] },
    { sha: "e17a3c2", title: "routes: lazy-load the orders page", author: PEOPLE[6] },
    { sha: "51d0b9e", title: "deps: bump react-dom to 19.1.1", author: PEOPLE[0] },
  ],
};

function ReleasesPage() {
  const [range, setRange] = useState("24h");
  const [projects, setProjects] = useState<string[]>([]);
  const [active, setActive] = useState(RELEASES[0]!.id);
  const rel = RELEASES.find((r) => r.id === active)!;
  const rows = projects.length ? RELEASES.filter((r) => projects.includes(r.project)) : RELEASES;
  const relIssues = issues.filter((i) => i.release === rel.version);
  const cols: Column<Release>[] = [
    {
      id: "version",
      header: "Release",
      pinned: "left",
      width: "200px",
      sortValue: (r) => r.version,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-semibold">{r.version}</span>
          <span className="text-2xs text-fg-muted">{r.deployed}</span>
        </span>
      ),
    },
    { id: "stage", header: "Stage", cell: (r) => <StatusBadge tone={STAGE_TONE[r.stage]}>{r.stage}</StatusBadge> },
    {
      id: "cfs",
      header: "Crash-free sessions",
      align: "right",
      mono: true,
      description: "Share of sessions in this release that ended without an unhandled error.",
      sortValue: (r) => r.crashFreeSessions,
      cell: (r) => <span className={crashTone(r.crashFreeSessions)}>{r.crashFreeSessions.toFixed(2)}%</span>,
    },
    {
      id: "cfu",
      header: "Crash-free users",
      align: "right",
      mono: true,
      description: "Share of users who saw no unhandled error in this release.",
      sortValue: (r) => r.crashFreeUsers,
      cell: (r) => <span className={crashTone(r.crashFreeUsers)}>{r.crashFreeUsers.toFixed(2)}%</span>,
    },
    {
      id: "adoption",
      header: "Adoption",
      description: "Share of the project's sessions in the last 24 hours that ran this release.",
      sortValue: (r) => r.adoption,
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span aria-hidden className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full bg-subtle">
            <span className="block h-full rounded-full bg-accent" style={{ width: `${r.adoption}%` }} />
          </span>
          <span className="font-mono text-xs">{r.adoption}%</span>
        </span>
      ),
    },
    { id: "sessions", header: "Sessions", align: "right", mono: true, sortValue: (r) => r.sessions, cell: (r) => formatNumber(r.sessions, { compact: true }) },
    { id: "new", header: "New issues", align: "right", mono: true, sortValue: (r) => r.newIssues, cell: (r) => r.newIssues },
    {
      id: "regressions",
      header: "Regressions",
      align: "right",
      description: "Resolved issues that came back in this release.",
      sortValue: (r) => r.regressions,
      cell: (r) => (r.regressions ? <Badge tone="danger">{r.regressions}</Badge> : <span className="font-mono text-fg-muted">0</span>),
    },
  ];
  return (
    <>
      <PageHeader
        title="Releases"
        description="Release health from session tracking · 8 releases in 6 projects"
        meta={<StatusBadge tone="danger">web@3.42.0 below 99%</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search releases" className="w-56" />
            <Button icon={<Upload />}>Upload source maps</Button>
          </>
        }
      />
      <FilterBar onClear={projects.length ? () => setProjects([]) : undefined}>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Project"
          selected={projects}
          onChange={setProjects}
          options={["web", "orders-api", "accounts", "reports", "ios"].map((p) => ({ value: p, count: RELEASES.filter((r) => r.project === p).length }))}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Crash-free sessions"
          value="99.21"
          unit="% all projects"
          trend={wave(24, { base: 99.6, amp: 0.1, seed: 120, spike: -0.9, spikeAt: 16 })}
          delta={{ label: "-0.4 pts vs. last week", direction: "down", intent: "bad" }}
        />
        <KpiCard label="Releases · 7 d" value="8" delta={{ label: "1 rolled back" }} />
        <KpiCard label="New issues in releases" value="9" delta={{ label: "3 in web@3.42.0", intent: "bad" }} />
        <KpiCard label="Regressions" value="2" tone="danger" delta={{ label: "orders-api, web", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Adoption · web" description="Share of sessions per release, hourly">
          <TimeSeriesChart
            label="Session adoption by web release"
            labels={timeLabels(24, 60)}
            stacked
            height={190}
            format={(v) => `${Math.round(v)}%`}
            series={[
              { id: "342", name: "web@3.42.0", data: Array.from({ length: 24 }, (_, i) => (i < 9 ? 0 : Math.min(46, (i - 9) * 4))) },
              { id: "341", name: "web@3.41.2", data: Array.from({ length: 24 }, (_, i) => (i < 9 ? 97 : Math.max(51, 97 - (i - 9) * 4))) },
              { id: "340", name: "web@3.40.x", data: Array.from({ length: 24 }, () => 3) },
            ]}
          />
        </Panel>
        <Panel title="New issues by release" description="Last 7 days">
          <BarList
            label="New issues by release"
            items={RELEASES.filter((r) => r.newIssues > 0).map((r) => ({ id: r.id, label: r.version, value: r.newIssues }))}
          />
        </Panel>
      </div>
      <Panel title="All releases" description="Select a release to see its issues and commits" flush>
        <DataTable
          label="Releases"
          columns={cols}
          rows={rows}
          getRowId={(r) => r.id}
          onRowClick={(r) => setActive(r.id)}
          activeRowId={active}
          defaultSort={{ id: "cfs", direction: "asc" }}
          minWidth={980}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          aria-label="Release detail"
          title={rel.version}
          description={`${rel.project} · deployed ${rel.deployed} · ${rel.commits} commits · ${formatNumber(rel.sessions)} sessions`}
          actions={
            <>
              <Button size="sm" icon={<GitCommitHorizontal />}>
                Compare with previous
              </Button>
              {rel.stage === "Production" && (
                <Button size="sm" variant="danger" icon={<RotateCcw />}>
                  Roll back
                </Button>
              )}
            </>
          }
        >
          <div className="flex flex-col gap-3">
            {rel.regressions > 0 && (
              <Callout tone="warning" title={`${rel.regressions} regression${rel.regressions > 1 ? "s" : ""} in this release`}>
                An issue resolved in an earlier release is back. It reopened automatically and its owner was notified.
              </Callout>
            )}
            <dl className="grid grid-cols-2 gap-2.5 text-sm md:grid-cols-4">
              <div>
                <dt className="text-2xs text-fg-muted">Crash-free sessions</dt>
                <dd className={cn("font-mono font-semibold", crashTone(rel.crashFreeSessions))}>{rel.crashFreeSessions.toFixed(2)}%</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Crash-free users</dt>
                <dd className={cn("font-mono font-semibold", crashTone(rel.crashFreeUsers))}>{rel.crashFreeUsers.toFixed(2)}%</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Adoption</dt>
                <dd className="font-mono font-semibold">{rel.adoption}%</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">New issues</dt>
                <dd className="font-mono font-semibold">{rel.newIssues}</dd>
              </div>
            </dl>
            <div className="flex flex-col gap-1">
              <h3 className="text-xs font-semibold">Issues first seen in {rel.version}</h3>
              {relIssues.length ? (
                <ul className="flex flex-col rounded-md border border-line">
                  {relIssues.map((i) => (
                    <li key={i.id} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-2 border-b border-subtle px-2.5 py-1.5 last:border-0">
                      <LevelBadge level={i.level} />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-sm font-medium">{i.type}</span>
                        <span className="truncate text-2xs text-fg-muted">{i.message}</span>
                      </span>
                      <span className="font-mono text-xs">{formatNumber(i.events)} events</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-fg-muted">No new issues in this release.</p>
              )}
            </div>
          </div>
        </Panel>
        <Panel title="Commits" description={`${rel.commits} commits by ${rel.authors.join(", ")}`} flush>
          <ul aria-label="Commits in release" className="flex flex-col">
            {(COMMITS[rel.id] ?? [{ sha: "a90c3f1", title: `release ${rel.version}`, author: rel.authors[0]! }]).map((c) => (
              <li key={c.sha} className="flex items-center gap-2 border-b border-subtle px-3 py-2 last:border-0">
                <Avatar name={c.author} size="sm" />
                <span className="flex min-w-0 grow flex-col">
                  <span className="truncate text-sm">{c.title}</span>
                  <span className="text-2xs text-fg-muted">{c.author}</span>
                </span>
                <span className="font-mono text-2xs text-fg-muted">{c.sha}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- alerts */

interface AlertRule {
  id: string;
  name: string;
  condition: string;
  project: string;
  env: string;
  action: string;
  owner: string;
  last: string;
  state: "Firing" | "OK" | "Muted";
  enabled: boolean;
}

const RULES: AlertRule[] = [
  {
    id: "ar1",
    name: "Spike in checkout errors",
    condition: "events in an issue > 500 in 1 h",
    project: "web",
    env: "production",
    action: "Slack #checkout-alerts",
    owner: PEOPLE[3],
    last: "12 min ago",
    state: "Firing",
    enabled: true,
  },
  {
    id: "ar2",
    name: "New issue in orders-api",
    condition: "a new issue is created",
    project: "orders-api",
    env: "production",
    action: "Incidents · orders on-call",
    owner: PEOPLE[2],
    last: "47 min ago",
    state: "Firing",
    enabled: true,
  },
  {
    id: "ar3",
    name: "Any regression",
    condition: "a resolved issue happens again",
    project: "All projects",
    env: "production",
    action: "Email engineering@example.com",
    owner: PEOPLE[1],
    last: "2 h ago",
    state: "OK",
    enabled: true,
  },
  {
    id: "ar4",
    name: "Crash-free sessions below 99%",
    condition: "crash-free sessions < 99% for 30 min",
    project: "ios",
    env: "production",
    action: "Slack #mobile",
    owner: PEOPLE[7],
    last: "Oct 14",
    state: "OK",
    enabled: true,
  },
  {
    id: "ar5",
    name: "Fatal errors in reports",
    condition: "level is fatal",
    project: "reports",
    env: "production",
    action: "Webhook hooks.example.com/alerts",
    owner: PEOPLE[2],
    last: "22 min ago",
    state: "Muted",
    enabled: true,
  },
  {
    id: "ar6",
    name: "Many users affected",
    condition: "unique users in an issue > 100 in 1 h",
    project: "All projects",
    env: "production",
    action: "Incidents · platform on-call",
    owner: PEOPLE[1],
    last: "never",
    state: "OK",
    enabled: false,
  },
];

const RULE_TONE: Record<AlertRule["state"], "danger" | "success" | "neutral"> = { Firing: "danger", OK: "success", Muted: "neutral" };

const ALERT_HISTORY = [
  { id: "h1", time: "13:52", rule: "Spike in checkout errors", issue: "ORD-4F2 · TypeError", notified: "Slack #checkout-alerts", state: "Firing" },
  {
    id: "h2",
    time: "13:47",
    rule: "New issue in orders-api",
    issue: "ORD-3A9 · pq: deadlock detected",
    notified: "Incidents · Dana Kim paged",
    state: "Firing",
  },
  { id: "h3", time: "13:30", rule: "Fatal errors in reports", issue: "ORD-0E4 · OutOfMemoryError", notified: "Muted until 16:00", state: "Muted" },
  { id: "h4", time: "11:58", rule: "Any regression", issue: "ORD-2C7 · ChunkLoadError", notified: "engineering@example.com", state: "Resolved" },
  { id: "h5", time: "Yesterday", rule: "Spike in checkout errors", issue: "ORD-1B0 · ValidationError", notified: "Slack #checkout-alerts", state: "Resolved" },
];

function AlertsPage() {
  const [tab, setTab] = useState<"rules" | "history">("rules");
  const [rules, setRules] = useState(RULES);
  const [composing, setComposing] = useState(false);
  const [name, setName] = useState("");
  const [notice, setNotice] = useState("");
  const cols: Column<AlertRule>[] = [
    {
      id: "name",
      header: "Rule",
      pinned: "left",
      width: "240px",
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{r.name}</span>
          <span className="truncate text-2xs text-fg-muted">Owner {r.owner}</span>
        </span>
      ),
    },
    { id: "state", header: "State", sortValue: (r) => r.state, cell: (r) => <StatusBadge tone={RULE_TONE[r.state]}>{r.state}</StatusBadge> },
    {
      id: "condition",
      header: "When",
      description: "The condition that triggers the rule, checked every minute.",
      cell: (r) => <span className="text-xs">{r.condition}</span>,
    },
    { id: "project", header: "Project", mono: true, cell: (r) => r.project },
    { id: "env", header: "Environment", mono: true, cell: (r) => r.env },
    { id: "action", header: "Then notify", cell: (r) => <span className="text-xs">{r.action}</span> },
    { id: "last", header: "Last triggered", cell: (r) => <span className="text-xs">{r.last}</span> },
    {
      id: "enabled",
      header: "Enabled",
      width: "80px",
      hideable: false,
      cell: (r) => (
        <Switch
          checked={r.enabled}
          onCheckedChange={(v) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))}
          label={<span className="sr-only">Enable {r.name}</span>}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Alerts"
        description="Rules that notify people when issues spike, appear or regress"
        meta={<StatusBadge tone="danger">2 firing</StatusBadge>}
        actions={
          <Button variant="primary" icon={<Plus />} onClick={() => setComposing(true)}>
            New alert rule
          </Button>
        }
      >
        <Tabs
          label="Alert views"
          value={tab}
          onChange={setTab}
          items={[
            { value: "rules", label: "Rules", count: rules.length },
            { value: "history", label: "History", count: ALERT_HISTORY.length },
          ]}
        />
      </PageHeader>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      {composing && (
        <Panel
          title="New alert rule"
          actions={
            <Button size="sm" variant="ghost" onClick={() => setComposing(false)}>
              Cancel
            </Button>
          }
        >
          <form
            className="grid gap-3 md:grid-cols-3"
            onSubmit={(e) => {
              e.preventDefault();
              const n = name.trim() || "Untitled rule";
              setRules((rs) => [
                ...rs,
                {
                  id: `ar${rs.length + 1}`,
                  name: n,
                  condition: "events in an issue > 100 in 1 h",
                  project: "web",
                  env: "production",
                  action: "Slack #alerts",
                  owner: PEOPLE[1],
                  last: "never",
                  state: "OK",
                  enabled: true,
                },
              ]);
              setNotice(`Created “${n}”`);
              setComposing(false);
              setName("");
              setTab("rules");
            }}
          >
            <TextField label="Rule name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Payment errors spike" />
            <SelectField
              label="When"
              options={[
                { value: "count", label: "Events in an issue exceed a count" },
                { value: "new", label: "A new issue is created" },
                { value: "regression", label: "A resolved issue regresses" },
                { value: "users", label: "Unique users exceed a count" },
                { value: "crash", label: "Crash-free sessions drop below" },
              ]}
            />
            <TextField label="Threshold" type="number" defaultValue={100} adornment={<span className="text-xs text-fg-muted">in 1 h</span>} />
            <SelectField label="Project" options={["web", "orders-api", "accounts", "reports", "ios"].map((p) => ({ value: p, label: p }))} />
            <SelectField
              label="Environment"
              options={[
                { value: "production", label: "production" },
                { value: "staging", label: "staging" },
              ]}
            />
            <SelectField
              label="Then notify"
              options={[
                { value: "slack", label: "Slack · #alerts" },
                { value: "email", label: "Email · issue owners" },
                { value: "incidents", label: "Incidents · page on-call" },
                { value: "webhook", label: "Webhook" },
              ]}
            />
            <Checkbox label="Only if the issue is assigned to my team" className="md:col-span-2" />
            <div className="flex items-center justify-end gap-2">
              <Button type="submit" variant="primary">
                Create rule
              </Button>
            </div>
          </form>
        </Panel>
      )}
      {tab === "rules" ? (
        <>
          <KpiGrid>
            <KpiCard label="Rules" value={String(rules.length)} unit={`${rules.filter((r) => r.enabled).length} enabled`} />
            <KpiCard label="Firing now" value="2" tone="danger" delta={{ label: "checkout, orders-api", intent: "bad" }} />
            <KpiCard label="Notifications · 24 h" value="14" trend={[1, 0, 2, 1, 0, 0, 3, 1, 0, 2, 4]} />
            <KpiCard label="Muted" value="1" unit="until 16:00" />
          </KpiGrid>
          <Panel title="Alert rules" flush>
            <DataTable label="Alert rules" columns={cols} rows={rules} getRowId={(r) => r.id} minWidth={1080} />
          </Panel>
        </>
      ) : (
        <Panel title="Notifications sent" description="Last 7 days" flush>
          <DataTable
            label="Alert history"
            rows={ALERT_HISTORY}
            getRowId={(h) => h.id}
            minWidth={820}
            columns={[
              { id: "time", header: "Time", width: "96px", mono: true, cell: (h) => h.time },
              { id: "rule", header: "Rule", cell: (h) => <span className="font-medium">{h.rule}</span> },
              { id: "issue", header: "Issue", mono: true, cell: (h) => <span className="text-xs">{h.issue}</span> },
              { id: "notified", header: "Notified", cell: (h) => <span className="text-xs">{h.notified}</span> },
              {
                id: "state",
                header: "State",
                cell: (h) => <StatusBadge tone={h.state === "Firing" ? "danger" : h.state === "Muted" ? "neutral" : "success"}>{h.state}</StatusBadge>,
              },
            ]}
          />
        </Panel>
      )}
    </>
  );
}

/* -------------------------------------------------------------- discover */

type GroupBy = "release" | "browser" | "environment" | "transaction";

const DISCOVER: Record<GroupBy, Array<{ id: string; value: string; count: number; users: number; last: string }>> = {
  release: [
    { id: "d1", value: "web@3.42.0", count: 4_812, users: 1_290, last: "1 min ago" },
    { id: "d2", value: "web@3.41.2", count: 1_406, users: 822, last: "4 min ago" },
    { id: "d3", value: "orders-api@2.14.1", count: 312, users: 96, last: "3 min ago" },
    { id: "d4", value: "accounts@1.8.0", count: 233, users: 201, last: "12 min ago" },
    { id: "d5", value: "reports@5.0.3", count: 18, users: 4, last: "22 min ago" },
  ],
  browser: [
    { id: "b1", value: "Chrome 129", count: 3_120, users: 902, last: "1 min ago" },
    { id: "b2", value: "Safari 18.0", count: 1_840, users: 760, last: "2 min ago" },
    { id: "b3", value: "Firefox 131", count: 902, users: 288, last: "6 min ago" },
    { id: "b4", value: "Edge 129", count: 411, users: 140, last: "9 min ago" },
    { id: "b5", value: "Samsung Internet 26", count: 88, users: 31, last: "41 min ago" },
  ],
  environment: [
    { id: "e1", value: "production", count: 6_781, users: 2_413, last: "1 min ago" },
    { id: "e2", value: "staging", count: 412, users: 18, last: "8 min ago" },
  ],
  transaction: [
    { id: "t1", value: "/checkout/summary", count: 4_790, users: 1_281, last: "1 min ago" },
    { id: "t2", value: "/orders", count: 1_398, users: 815, last: "4 min ago" },
    { id: "t3", value: "PATCH /v1/orders/:id/status", count: 312, users: 96, last: "3 min ago" },
    { id: "t4", value: "POST /v1/addresses", count: 233, users: 201, last: "12 min ago" },
    { id: "t5", value: "job export-monthly", count: 18, users: 4, last: "22 min ago" },
  ],
};

const SAVED_QUERIES = [
  { id: "s1", name: "Checkout errors by browser", query: "transaction:/checkout/* level:error", by: PEOPLE[3] },
  { id: "s2", name: "5xx from orders-api", query: "project:orders-api http.status_code:>=500", by: PEOPLE[2] },
  { id: "s3", name: "Errors in latest web release", query: "release:latest project:web", by: PEOPLE[0] },
  { id: "s4", name: "Unhandled promise rejections", query: "mechanism:onunhandledrejection", by: PEOPLE[6] },
];

function DiscoverPage() {
  const [range, setRange] = useState("24h");
  const [query, setQuery] = useState("event.type:error environment:production");
  const [yAxis, setYAxis] = useState("count");
  const [groupDraft, setGroupDraft] = useState<GroupBy>("release");
  const [applied, setApplied] = useState<{ query: string; group: GroupBy }>({ query, group: "release" });
  const [saved, setSaved] = useState(false);
  const rows = DISCOVER[applied.group];
  const total = rows.reduce((s, r) => s + r.count, 0);
  const yLabel = yAxis === "users" ? "count_unique(user)" : "count()";
  const metric = (r: (typeof rows)[number]) => (yAxis === "users" ? r.users : r.count);
  return (
    <>
      <PageHeader
        title="Discover"
        description="Query every error event by any tag, then chart and group the results"
        actions={
          <>
            <Button icon={<Download />}>Export CSV</Button>
            <Button icon={<Save />} onClick={() => setSaved(true)}>
              Save query
            </Button>
          </>
        }
      />
      <Panel title="Query" aria-label="Query builder">
        <div className="flex flex-col gap-2.5">
          <QueryBar
            label="Event query"
            value={query}
            onChange={setQuery}
            onSubmit={(q) => setApplied({ query: q, group: groupDraft })}
            placeholder="level:error release:web@3.42.0"
          />
          <div className="flex flex-wrap items-end gap-2.5">
            <TimeRangePicker size="md" value={range} onChange={setRange} />
            <SelectField
              label="Y axis"
              value={yAxis}
              onChange={(e) => setYAxis(e.target.value)}
              className="w-48"
              options={[
                { value: "count", label: "count()" },
                { value: "users", label: "count_unique(user)" },
              ]}
            />
            <SelectField
              label="Group by"
              value={groupDraft}
              onChange={(e) => setGroupDraft(e.target.value as GroupBy)}
              className="w-48"
              options={[
                { value: "release", label: "release" },
                { value: "browser", label: "browser" },
                { value: "environment", label: "environment" },
                { value: "transaction", label: "transaction" },
              ]}
            />
            <span className="pb-1.5 text-xs text-fg-muted">Change the grouping, then Run.</span>
          </div>
        </div>
      </Panel>
      {saved && <Callout tone="success" title="Query saved to “My queries”" onDismiss={() => setSaved(false)} />}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title={`${yLabel} by ${applied.group}`} description={`Top ${Math.min(4, rows.length)} groups · ${applied.query}`}>
            <TimeSeriesChart
              label={`${yLabel} over time by ${applied.group}`}
              labels={timeLabels(24, 60)}
              height={200}
              series={rows.slice(0, 4).map((r, i) => ({
                id: r.id,
                name: r.value,
                data: wave(24, {
                  base: metric(r) / 24,
                  amp: metric(r) / 80,
                  seed: 140 + i,
                  spike: i === 0 && applied.group === "release" ? metric(r) / 6 : 0,
                  spikeAt: 16,
                }),
              }))}
            />
          </Panel>
          <Panel title="Results" description={`${rows.length} groups · ${formatNumber(total)} events`} flush>
            <DataTable
              label="Discover results"
              rows={rows}
              getRowId={(r) => r.id}
              defaultSort={{ id: "count", direction: "desc" }}
              minWidth={720}
              columns={[
                {
                  id: "value",
                  header: applied.group,
                  pinned: "left",
                  sortValue: (r) => r.value,
                  cell: (r) => <span className="font-mono text-xs">{r.value}</span>,
                },
                { id: "count", header: "count()", align: "right", mono: true, sortValue: (r) => r.count, cell: (r) => formatNumber(r.count) },
                {
                  id: "users",
                  header: "count_unique(user)",
                  align: "right",
                  mono: true,
                  description: "Distinct user IDs that sent at least one matching event.",
                  sortValue: (r) => r.users,
                  cell: (r) => formatNumber(r.users),
                },
                {
                  id: "share",
                  header: "Share",
                  align: "right",
                  mono: true,
                  sortValue: (r) => r.count,
                  cell: (r) => `${((r.count / total) * 100).toFixed(1)}%`,
                },
                { id: "last", header: "Last seen", cell: (r) => <span className="text-xs">{r.last}</span> },
              ]}
            />
          </Panel>
        </div>
        <Panel title="Saved queries" flush>
          <ul aria-label="Saved queries" className="flex flex-col">
            {SAVED_QUERIES.map((s) => (
              <li key={s.id} className="border-b border-subtle last:border-0">
                <button
                  type="button"
                  onClick={() => setQuery(s.query)}
                  className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left hover:bg-subtle"
                >
                  <span className="text-sm font-medium">{s.name}</span>
                  <span className="w-full truncate font-mono text-2xs text-fg-muted">{s.query}</span>
                  <span className="text-2xs text-fg-muted">by {s.by}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  issues: () => <IssuesPage />,
  releases: () => <ReleasesPage />,
  alerts: () => <AlertsPage />,
  discover: () => <DiscoverPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="errors" nav={nav} pages={PAGES} initial={initial} /> });

/* --------------------------------------------------------------- stories */

export const Issues: Story = {
  ...app("issues"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Issues" })).toBeInTheDocument();
    const detail = () => within(c.getByRole("region", { name: "Issue detail" }));
    await expect(detail().getByRole("heading", { name: /^TypeError: Cannot read properties/ })).toBeInTheDocument();
    await expect(detail().getByText("formatTotal")).toBeInTheDocument();

    const table = within(c.getByRole("table", { name: "Issues" }));
    await userEvent.click(table.getByText("pq: deadlock detected"));
    await expect(detail().getByRole("heading", { name: /^pq: deadlock detected/ })).toBeInTheDocument();
    await expect(detail().getByText("(*Store).UpdateStatus")).toBeInTheDocument();
    await expect(detail().queryByText("formatTotal")).not.toBeInTheDocument();
    await expect(c.getByText("orders-api@2.14.1", { selector: "dd" })).toBeInTheDocument();
    await expect(detail().getByRole("button", { name: "Open trace in Traces" })).toBeInTheDocument();
  },
};

export const Releases: Story = {
  ...app("releases"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = () => within(c.getByRole("region", { name: "Release detail" }));
    await expect(detail().getByText("TypeError")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Releases" })).getByText("orders-api@2.14.1"));
    await expect(detail().getByRole("heading", { name: "orders-api@2.14.1" })).toBeInTheDocument();
    await expect(detail().getByText("pq: deadlock detected")).toBeInTheDocument();
    await expect(detail().getByText("1 regression in this release")).toBeInTheDocument();
  },
};

export const Alerts: Story = {
  ...app("alerts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "New alert rule" }));
    await userEvent.type(c.getByRole("textbox", { name: "Rule name" }), "Payment errors spike");
    await userEvent.click(c.getByRole("button", { name: "Create rule" }));
    await expect(c.getByText("Created “Payment errors spike”")).toBeInTheDocument();
    await expect(within(c.getByRole("table", { name: "Alert rules" })).getByText("Payment errors spike")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Enable Many users affected" }));
    await expect(c.getByRole("switch", { name: "Enable Many users affected" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(c.getByRole("tab", { name: /History/ }));
    await expect(c.getByRole("table", { name: "Alert history" }).querySelectorAll("tbody tr")).toHaveLength(5);
  },
};

export const Discover: Story = {
  ...app("discover"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const results = () => within(c.getByRole("table", { name: "Discover results" }));
    await expect(results().getByText("web@3.42.0")).toBeInTheDocument();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Group by" }), "browser");
    await userEvent.click(c.getByRole("button", { name: "Run" }));
    await expect(results().getByText("Chrome 129")).toBeInTheDocument();
    await expect(results().queryByText("web@3.42.0")).not.toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
