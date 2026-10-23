import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  BadgeCheck,
  BellOff,
  Download,
  FileCode2,
  FolderGit2,
  GitPullRequest,
  Play,
  Plus,
  RefreshCw,
  Scale,
  ShieldAlert,
  Trash2,
  Workflow,
  X,
} from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { BarList } from "../../charts/BarList";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { cn } from "../../lib/cn";
import { SEVERITY_META, type Severity } from "../../tokens/levels";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "projects", label: "Projects", icon: FolderGit2, count: 23 },
  { id: "advisories", label: "Advisories", icon: ShieldAlert, count: 96 },
  { id: "licences", label: "Licences", icon: Scale },
  { id: "sbom", label: "SBOM", icon: FileCode2 },
  { id: "gates", label: "CI gates", icon: Workflow, count: 5 },
];

const meta = {
  title: "Products/Audit",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

interface Project {
  id: string;
  ecosystem: string;
  crit: number;
  high: number;
  deps: number;
  direct: number;
  licences: number;
  gate: "failing" | "passing" | "warning";
  scanned: string;
}

const projects: Project[] = [
  { id: "orders-api", ecosystem: "Go · npm", crit: 1, high: 3, deps: 1184, direct: 62, licences: 2, gate: "failing", scanned: "6 min ago" },
  { id: "payments-api", ecosystem: "Go", crit: 0, high: 2, deps: 312, direct: 28, licences: 0, gate: "warning", scanned: "1 h ago" },
  { id: "web-console", ecosystem: "npm", crit: 0, high: 5, deps: 1876, direct: 74, licences: 1, gate: "failing", scanned: "22 min ago" },
  { id: "ml-scoring", ecosystem: "pip", crit: 2, high: 1, deps: 241, direct: 19, licences: 0, gate: "failing", scanned: "3 h ago" },
  { id: "billing-worker", ecosystem: "Composer", crit: 0, high: 0, deps: 138, direct: 21, licences: 0, gate: "passing", scanned: "2 h ago" },
  { id: "edge-proxy", ecosystem: "Cargo", crit: 0, high: 1, deps: 402, direct: 33, licences: 0, gate: "passing", scanned: "40 min ago" },
  { id: "legacy-portal", ecosystem: "npm · Composer", crit: 3, high: 11, deps: 2310, direct: 96, licences: 4, gate: "failing", scanned: "Yesterday" },
];

const GATE = {
  failing: { label: "Failing", tone: "danger" },
  warning: { label: "Warning", tone: "warning" },
  passing: { label: "Passing", tone: "success" },
} as const;

interface Advisory {
  id: string;
  severity: Severity;
  title: string;
  pkg: string;
  ecosystem: string;
  from: string;
  to: string;
  path: string;
}

const advisories: Advisory[] = [
  {
    id: "CVE-2024-45337",
    severity: "critical",
    title: "Misuse of ServerConfig.PublicKeyCallback may cause authorization bypass",
    pkg: "golang.org/x/crypto",
    ecosystem: "Go",
    from: "v0.28.0",
    to: "v0.31.0",
    path: "direct",
  },
  {
    id: "CVE-2024-21538",
    severity: "high",
    title: "Regular expression denial of service in cross-spawn",
    pkg: "cross-spawn",
    ecosystem: "npm",
    from: "7.0.3",
    to: "7.0.5",
    path: "via execa",
  },
  {
    id: "CVE-2024-4068",
    severity: "high",
    title: "Memory exhaustion in braces with unbalanced input",
    pkg: "braces",
    ecosystem: "npm",
    from: "3.0.2",
    to: "3.0.3",
    path: "via chokidar",
  },
  {
    id: "CVE-2024-45296",
    severity: "high",
    title: "Backtracking regular expressions in path-to-regexp",
    pkg: "path-to-regexp",
    ecosystem: "npm",
    from: "0.1.7",
    to: "0.1.12",
    path: "via express",
  },
  {
    id: "CVE-2024-4067",
    severity: "medium",
    title: "Regular expression denial of service in micromatch",
    pkg: "micromatch",
    ecosystem: "npm",
    from: "4.0.5",
    to: "4.0.8",
    path: "via fast-glob",
  },
  {
    id: "CVE-2024-47764",
    severity: "low",
    title: "cookie accepts out-of-bounds characters in name, path and domain",
    pkg: "cookie",
    ecosystem: "npm",
    from: "0.5.0",
    to: "0.7.0",
    path: "via express",
  },
];

/** Org-wide advisories (deduplicated across repositories). */
interface OrgAdvisory {
  id: string;
  severity: Severity;
  title: string;
  pkg: string;
  ecosystem: string;
  repos: string[];
  fix: string | null;
  reachable: boolean;
  direct: boolean;
  published: string;
}

const ORG_ADVISORIES: OrgAdvisory[] = [
  {
    id: "CVE-2024-45337",
    severity: "critical",
    title: "Authorization bypass via ServerConfig.PublicKeyCallback misuse",
    pkg: "golang.org/x/crypto",
    ecosystem: "Go",
    repos: ["orders-api", "payments-api"],
    fix: "v0.31.0",
    reachable: true,
    direct: true,
    published: "Dec 11, 2024",
  },
  {
    id: "CVE-2024-27304",
    severity: "critical",
    title: "SQL injection via integer overflow in pgx protocol messages",
    pkg: "github.com/jackc/pgx/v5",
    ecosystem: "Go",
    repos: ["orders-api"],
    fix: "v5.5.4",
    reachable: true,
    direct: true,
    published: "Mar 6, 2024",
  },
  {
    id: "CVE-2024-24790",
    severity: "critical",
    title: "net/netip Is* methods misclassify IPv4-mapped IPv6 addresses",
    pkg: "stdlib",
    ecosystem: "Go",
    repos: ["orders-api", "payments-api"],
    fix: "go1.22.4",
    reachable: false,
    direct: true,
    published: "Jun 4, 2024",
  },
  {
    id: "CVE-2024-21538",
    severity: "high",
    title: "Regular expression denial of service in cross-spawn",
    pkg: "cross-spawn",
    ecosystem: "npm",
    repos: ["web-console", "orders-api", "legacy-portal"],
    fix: "7.0.5",
    reachable: false,
    direct: false,
    published: "Nov 8, 2024",
  },
  {
    id: "CVE-2024-4068",
    severity: "high",
    title: "Memory exhaustion in braces with unbalanced input",
    pkg: "braces",
    ecosystem: "npm",
    repos: ["web-console", "legacy-portal"],
    fix: "3.0.3",
    reachable: false,
    direct: false,
    published: "May 14, 2024",
  },
  {
    id: "CVE-2024-45296",
    severity: "high",
    title: "Backtracking regular expressions in path-to-regexp",
    pkg: "path-to-regexp",
    ecosystem: "npm",
    repos: ["web-console", "legacy-portal", "orders-api"],
    fix: "0.1.12",
    reachable: true,
    direct: false,
    published: "Sep 9, 2024",
  },
  {
    id: "CVE-2024-29415",
    severity: "high",
    title: "ip.isPublic misclassifies some private addresses (SSRF)",
    pkg: "ip",
    ecosystem: "npm",
    repos: ["legacy-portal", "web-console"],
    fix: null,
    reachable: true,
    direct: false,
    published: "May 27, 2024",
  },
  {
    id: "CVE-2024-3651",
    severity: "high",
    title: "Quadratic complexity in idna.encode on crafted input",
    pkg: "idna",
    ecosystem: "pip",
    repos: ["ml-scoring"],
    fix: "3.7",
    reachable: true,
    direct: false,
    published: "Jul 7, 2024",
  },
  {
    id: "CVE-2023-29197",
    severity: "high",
    title: "Improper header validation in guzzlehttp/psr7",
    pkg: "guzzlehttp/psr7",
    ecosystem: "Composer",
    repos: ["legacy-portal"],
    fix: "2.4.5",
    reachable: false,
    direct: true,
    published: "Apr 17, 2023",
  },
  {
    id: "CVE-2024-32650",
    severity: "high",
    title: "rustls ConnectionCommon::complete_io infinite loop on close_notify",
    pkg: "rustls",
    ecosystem: "Cargo",
    repos: ["edge-proxy"],
    fix: "0.23.5",
    reachable: true,
    direct: true,
    published: "Apr 19, 2024",
  },
  {
    id: "CVE-2024-35195",
    severity: "medium",
    title: "requests Session keeps verify=False for later requests",
    pkg: "requests",
    ecosystem: "pip",
    repos: ["ml-scoring"],
    fix: "2.32.0",
    reachable: false,
    direct: true,
    published: "May 20, 2024",
  },
  {
    id: "CVE-2024-5206",
    severity: "medium",
    title: "TfidfVectorizer stores sensitive tokens in stop_words_",
    pkg: "scikit-learn",
    ecosystem: "pip",
    repos: ["ml-scoring"],
    fix: "1.5.0",
    reachable: false,
    direct: true,
    published: "Jun 6, 2024",
  },
  {
    id: "CVE-2024-4067",
    severity: "medium",
    title: "Regular expression denial of service in micromatch",
    pkg: "micromatch",
    ecosystem: "npm",
    repos: ["web-console"],
    fix: "4.0.8",
    reachable: false,
    direct: false,
    published: "May 14, 2024",
  },
  {
    id: "CVE-2024-47764",
    severity: "low",
    title: "cookie accepts out-of-bounds characters in name, path and domain",
    pkg: "cookie",
    ecosystem: "npm",
    repos: ["legacy-portal", "web-console"],
    fix: "0.7.0",
    reachable: false,
    direct: false,
    published: "Oct 4, 2024",
  },
];

type LicenceCategory = "allowed" | "review" | "denied";
const CATEGORY = {
  allowed: { label: "Allowed", tone: "success" },
  review: { label: "Review", tone: "warning" },
  denied: { label: "Denied", tone: "danger" },
} as const;

interface LicenceRow {
  id: string;
  name: string;
  category: LicenceCategory;
  packages: number;
  repos: number;
}

const LICENCES: LicenceRow[] = [
  { id: "MIT", name: "MIT License", category: "allowed", packages: 3412, repos: 23 },
  { id: "Apache-2.0", name: "Apache License 2.0", category: "allowed", packages: 1288, repos: 22 },
  { id: "BSD-3-Clause", name: "BSD 3-Clause", category: "allowed", packages: 641, repos: 19 },
  { id: "ISC", name: "ISC License", category: "allowed", packages: 588, repos: 14 },
  { id: "BSD-2-Clause", name: "BSD 2-Clause", category: "allowed", packages: 212, repos: 12 },
  { id: "MPL-2.0", name: "Mozilla Public License 2.0", category: "review", packages: 41, repos: 7 },
  { id: "LGPL-3.0-only", name: "GNU LGPL v3.0", category: "review", packages: 12, repos: 4 },
  { id: "CC-BY-4.0", name: "Creative Commons Attribution 4.0", category: "review", packages: 9, repos: 3 },
  { id: "GPL-3.0-only", name: "GNU GPL v3.0", category: "denied", packages: 3, repos: 2 },
  { id: "AGPL-3.0-only", name: "GNU AGPL v3.0", category: "denied", packages: 2, repos: 2 },
  { id: "SSPL-1.0", name: "Server Side Public License", category: "denied", packages: 1, repos: 1 },
  { id: "NOASSERTION", name: "Unknown / not declared", category: "review", packages: 27, repos: 9 },
];

interface Violation {
  id: string;
  repo: string;
  pkg: string;
  version: string;
  licence: string;
  category: LicenceCategory;
  via: string;
  found: string;
}

const VIOLATIONS: Violation[] = [
  {
    id: "v1",
    repo: "legacy-portal",
    pkg: "ghostscript-wrapper",
    version: "1.4.2",
    licence: "AGPL-3.0-only",
    category: "denied",
    via: "direct",
    found: "Oct 12",
  },
  {
    id: "v2",
    repo: "orders-api",
    pkg: "github.com/mongodb/mongo-tools",
    version: "100.9.4",
    licence: "SSPL-1.0",
    category: "denied",
    via: "direct",
    found: "Oct 16",
  },
  { id: "v3", repo: "legacy-portal", pkg: "readline", version: "1.3.0", licence: "GPL-3.0-only", category: "denied", via: "via repl-tools", found: "Sep 30" },
  { id: "v4", repo: "web-console", pkg: "pdfjs-viewer-ext", version: "2.1.0", licence: "AGPL-3.0-only", category: "denied", via: "direct", found: "Oct 18" },
  { id: "v5", repo: "orders-api", pkg: "libgit2-sys", version: "0.16.2", licence: "GPL-3.0-only", category: "denied", via: "via git2", found: "Oct 3" },
  { id: "v6", repo: "legacy-portal", pkg: "unicode-data", version: "0.9.1", licence: "NOASSERTION", category: "review", via: "via intl-pack", found: "Oct 1" },
  { id: "v7", repo: "ml-scoring", pkg: "certifi", version: "2024.8.30", licence: "MPL-2.0", category: "review", via: "via requests", found: "Oct 9" },
];

interface SbomRow {
  repo: string;
  ref: string;
  components: number;
  generated: string;
  signed: boolean;
}

const SBOMS: SbomRow[] = projects.map((p, i) => ({
  repo: p.id,
  ref: ["main @ 4f1c2ab", "main @ 9d03e71", "main @ c81aa0f", "main @ 12be7d4", "main @ 77f0c3e", "main @ e5a9d10", "master @ 0b4c6aa"][i]!,
  components: p.deps,
  generated: p.scanned,
  signed: p.id !== "legacy-portal",
}));

interface GateRule {
  id: string;
  name: string;
  condition: string;
  action: "block" | "warn";
  scope: string;
  enabled: boolean;
}

const RULES: GateRule[] = [
  { id: "r1", name: "No critical advisories", condition: "severity == critical", action: "block", scope: "All repositories", enabled: true },
  { id: "r2", name: "No fixable high advisories", condition: "severity == high && fix_available", action: "block", scope: "All repositories", enabled: true },
  { id: "r3", name: "Reachable medium advisories", condition: "severity == medium && reachable", action: "warn", scope: "Tier 1 services", enabled: true },
  { id: "r4", name: "Denied licences", condition: "licence.category == denied", action: "block", scope: "All repositories", enabled: true },
  { id: "r5", name: "Licences needing review", condition: "licence.category == review && !approved", action: "warn", scope: "All repositories", enabled: true },
  { id: "r6", name: "Unsigned SBOM", condition: "sbom.attestation == none", action: "warn", scope: "Release branches", enabled: false },
];

type GateResult = "pass" | "fail" | "warn";
const RESULT = {
  pass: { label: "Pass", tone: "success" },
  fail: { label: "Fail", tone: "danger" },
  warn: { label: "Warn", tone: "warning" },
} as const;

interface GateRun {
  id: string;
  run: string;
  repo: string;
  pipeline: string;
  branch: string;
  commit: string;
  author: string;
  result: GateResult;
  reasons: string[];
  time: string;
}

const RUNS: GateRun[] = [
  {
    id: "g1",
    run: "#4812",
    repo: "orders-api",
    pipeline: "GitHub Actions · ci.yml",
    branch: "feat/refunds",
    commit: "4f1c2ab",
    author: PEOPLE[0]!,
    result: "fail",
    reasons: ["CVE-2024-45337 critical in golang.org/x/crypto v0.28.0", "SSPL-1.0 in github.com/mongodb/mongo-tools"],
    time: "6 min ago",
  },
  {
    id: "g2",
    run: "#2207",
    repo: "web-console",
    pipeline: "GitHub Actions · build.yml",
    branch: "main",
    commit: "c81aa0f",
    author: PEOPLE[1]!,
    result: "fail",
    reasons: ["CVE-2024-45296 high, fix 0.1.12 available", "AGPL-3.0-only in pdfjs-viewer-ext"],
    time: "22 min ago",
  },
  {
    id: "g3",
    run: "#981",
    repo: "edge-proxy",
    pipeline: "GitLab CI · audit",
    branch: "main",
    commit: "e5a9d10",
    author: PEOPLE[2]!,
    result: "pass",
    reasons: [],
    time: "40 min ago",
  },
  {
    id: "g4",
    run: "#1530",
    repo: "payments-api",
    pipeline: "GitHub Actions · ci.yml",
    branch: "fix/retry-backoff",
    commit: "9d03e71",
    author: PEOPLE[3]!,
    result: "warn",
    reasons: ["CVE-2023-45288 in golang.org/x/net (medium, reachable)"],
    time: "1 h ago",
  },
  {
    id: "g5",
    run: "#660",
    repo: "billing-worker",
    pipeline: "Jenkins · audit-stage",
    branch: "main",
    commit: "77f0c3e",
    author: PEOPLE[4]!,
    result: "pass",
    reasons: [],
    time: "2 h ago",
  },
  {
    id: "g6",
    run: "#3302",
    repo: "ml-scoring",
    pipeline: "GitHub Actions · train.yml",
    branch: "exp/feature-store",
    commit: "12be7d4",
    author: PEOPLE[5]!,
    result: "fail",
    reasons: ["2 critical advisories", "CVE-2024-3651 high, fix 3.7 available"],
    time: "3 h ago",
  },
  {
    id: "g7",
    run: "#4809",
    repo: "orders-api",
    pipeline: "GitHub Actions · ci.yml",
    branch: "main",
    commit: "a07de52",
    author: PEOPLE[6]!,
    result: "warn",
    reasons: ["MPL-2.0 in certifi needs review"],
    time: "5 h ago",
  },
  {
    id: "g8",
    run: "#118",
    repo: "legacy-portal",
    pipeline: "Jenkins · nightly",
    branch: "master",
    commit: "0b4c6aa",
    author: PEOPLE[7]!,
    result: "fail",
    reasons: ["3 critical advisories", "AGPL-3.0-only in ghostscript-wrapper", "GPL-3.0-only in readline"],
    time: "Yesterday",
  },
];

/* ------------------------------------------------------------------ */
/* Projects                                                            */
/* ------------------------------------------------------------------ */

const advisoryColumns: Column<Advisory>[] = [
  { id: "sev", header: "Severity", width: "100px", sortValue: (a) => SEVERITY_META[a.severity].rank, cell: (a) => <SeverityBadge severity={a.severity} /> },
  {
    id: "adv",
    header: "Advisory",
    width: "34%",
    cell: (a) => (
      <span className="flex min-w-0 flex-col">
        <EntityChip kind="cve" value={a.id} hideKind href={`#${a.id}`} className="self-start" />
        <span className="truncate text-xs text-fg-muted">{a.title}</span>
      </span>
    ),
  },
  {
    id: "pkg",
    header: "Package",
    sortValue: (a) => a.pkg,
    cell: (a) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-xs font-medium">{a.pkg}</span>
        <span className="text-2xs text-fg-muted">{a.ecosystem}</span>
      </span>
    ),
  },
  {
    id: "ver",
    header: "Upgrade",
    cell: (a) => (
      <span className="font-mono text-xs whitespace-nowrap">
        {a.from} → <span className="text-success">{a.to}</span>
      </span>
    ),
  },
  {
    id: "path",
    header: "Path",
    cell: (a) => (a.path === "direct" ? <Badge tone="info">Direct</Badge> : <span className="font-mono text-xs text-fg-muted">{a.path}</span>),
  },
  {
    id: "act",
    header: <span className="sr-only">Actions</span>,
    label: "Actions",
    align: "right",
    width: "190px",
    hideable: false,
    cell: (a) => (
      <span className="flex justify-end gap-1">
        <Button size="xs" icon={<GitPullRequest />} aria-label={`Open PR to upgrade ${a.pkg} to ${a.to}`}>
          Open PR
        </Button>
        <Button size="xs" variant="ghost" icon={<BellOff />} aria-label={`Snooze ${a.id}`}>
          Snooze
        </Button>
      </span>
    ),
  },
];

function ProjectsPage() {
  const [selected, setSelected] = useState("orders-api");
  const [q, setQ] = useState("");
  const p = projects.find((x) => x.id === selected) ?? projects[0]!;
  const list = projects.filter((x) => x.id.includes(q.toLowerCase()));
  return (
    <div className="grid gap-2.5 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Panel title="Projects" description="23 repositories · 7 shown" flush className="self-start">
        <div className="border-b border-line p-2">
          <SearchInput label="Filter projects" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <ul aria-label="Projects" className="flex flex-col p-1">
          {list.map((x) => {
            const on = x.id === selected;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  aria-current={on ? "true" : undefined}
                  onClick={() => setSelected(x.id)}
                  className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-subtle", on && "bg-accent-soft hover:bg-accent-soft")}
                >
                  <span className="flex min-w-0 grow flex-col">
                    <span className={cn("truncate font-mono text-xs", on ? "font-semibold text-accent-text" : "text-fg")}>{x.id}</span>
                    <span className="text-2xs text-fg-muted">{x.ecosystem}</span>
                  </span>
                  <span className="flex gap-1 font-mono text-2xs">
                    <span className={x.crit ? "text-danger-text" : "text-fg-muted"}>
                      <span aria-hidden>{x.crit}C</span>
                      <span className="sr-only">{x.crit} critical</span>
                    </span>
                    <span className={x.high ? "text-warning-text" : "text-fg-muted"}>
                      <span aria-hidden>{x.high}H</span>
                      <span className="sr-only">{x.high} high</span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </Panel>
      <div className="flex min-w-0 flex-col gap-2.5">
        <PageHeader
          breadcrumbs={[{ label: "Projects", href: "#projects" }, { label: p.id }]}
          title={p.id}
          description={`${p.ecosystem} · default branch main · scanned ${p.scanned}`}
          meta={
            <>
              <EntityChip kind="repo" value={`acme/${p.id}`} href="#repo" />
              <StatusBadge tone={GATE[p.gate].tone}>CI gate {GATE[p.gate].label}</StatusBadge>
            </>
          }
          actions={
            <>
              <Button size="md">Download SBOM</Button>
              <Button size="md" variant="primary" icon={<Play />}>
                Rescan
              </Button>
            </>
          }
        />
        {p.gate === "failing" && (
          <Callout tone="danger" title="CI gate blocks merges to main" action={<Button size="sm">Edit gate</Button>}>
            Policy “No critical, no high with a fix” fails on {p.crit} critical and {p.high} high advisories.
          </Callout>
        )}
        <KpiGrid minWidth={150}>
          <KpiCard label="Dependencies" value={p.deps.toLocaleString("en-US")} unit="total" />
          <KpiCard label="Direct" value={p.direct} unit="declared" />
          <KpiCard
            label="Licences flagged"
            value={p.licences}
            tone={p.licences ? "warning" : undefined}
            delta={{ label: p.licences ? "AGPL-3.0, SSPL-1.0" : "All allowed" }}
          />
          <KpiCard label="CI gate" value={GATE[p.gate].label} tone={GATE[p.gate].tone} delta={{ label: "orders-ci · GitHub Actions" }} />
        </KpiGrid>
        <Panel
          title="Advisories"
          description="6 open · 4 fixable by a direct upgrade, 2 by refreshing the lockfile"
          actions={
            <Button size="sm" variant="ghost" icon={<GitPullRequest />}>
              Open one PR for all
            </Button>
          }
          flush
        >
          <DataTable
            label="Advisories"
            columns={advisoryColumns}
            rows={advisories}
            getRowId={(a) => a.id}
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={940}
          />
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Advisories                                                          */
/* ------------------------------------------------------------------ */

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low"];
const ECOSYSTEMS = ["Go", "npm", "pip", "Composer", "Cargo"];

function AdvisoriesPage() {
  const [q, setQ] = useState("");
  const [sev, setSev] = useState<string[]>([]);
  const [eco, setEco] = useState<string[]>([]);
  const [fix, setFix] = useState<string[]>([]);
  const [reach, setReach] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [prs, setPrs] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [active, setActive] = useState(ORG_ADVISORIES[0]!.id);
  const shown = ORG_ADVISORIES.filter(
    (a) =>
      (a.id.toLowerCase().includes(q.toLowerCase()) || a.pkg.toLowerCase().includes(q.toLowerCase())) &&
      (sev.length === 0 || sev.includes(a.severity)) &&
      (eco.length === 0 || eco.includes(a.ecosystem)) &&
      (fix.length === 0 || fix.includes(a.fix ? "Fix available" : "No fix yet")) &&
      (reach.length === 0 || reach.includes(a.reachable ? "Reachable" : "Not reachable")),
  );
  const detail = ORG_ADVISORIES.find((a) => a.id === active)!;
  const count = (f: (a: OrgAdvisory) => boolean) => ORG_ADVISORIES.filter(f).length;
  const cols: Column<OrgAdvisory>[] = [
    { id: "sev", header: "Severity", width: "100px", sortValue: (a) => SEVERITY_META[a.severity].rank, cell: (a) => <SeverityBadge severity={a.severity} /> },
    {
      id: "adv",
      header: "Advisory",
      width: "30%",
      sortValue: (a) => a.id,
      cell: (a) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-xs font-medium">{a.id}</span>
          <span className="truncate text-xs text-fg-muted">{a.title}</span>
        </span>
      ),
    },
    {
      id: "pkg",
      header: "Package",
      sortValue: (a) => a.pkg,
      cell: (a) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs">{a.pkg}</span>
          <span className="text-2xs text-fg-muted">{a.ecosystem}</span>
        </span>
      ),
    },
    {
      id: "repos",
      header: "Repos",
      align: "right",
      mono: true,
      description: "Repositories whose lockfile resolves an affected version.",
      sortValue: (a) => a.repos.length,
      cell: (a) => a.repos.length,
    },
    {
      id: "fix",
      header: "Fix",
      sortValue: (a) => (a.fix ? 1 : 0),
      cell: (a) => (a.fix ? <span className="font-mono text-xs text-success">{a.fix}</span> : <Badge tone="warning">No fix yet</Badge>),
    },
    {
      id: "reach",
      header: "Reachability",
      description: "Reachable: call-graph analysis found a path from your code to the vulnerable function.",
      sortValue: (a) => (a.reachable ? 1 : 0),
      cell: (a) => (
        <span className="flex flex-wrap gap-1">
          {a.reachable ? <Badge tone="danger">Reachable</Badge> : <Badge variant="outline">Not reachable</Badge>}
          <Badge tone={a.direct ? "info" : "neutral"}>{a.direct ? "Direct" : "Transitive"}</Badge>
        </span>
      ),
    },
    {
      id: "pr",
      header: "PR",
      width: "90px",
      cell: (a) => (prs.includes(a.id) ? <StatusBadge tone="info">Opened</StatusBadge> : <span className="text-xs text-fg-muted">–</span>),
    },
  ];
  const openPrs = () => {
    const fixable = selected.filter((id) => ORG_ADVISORIES.find((a) => a.id === id)?.fix);
    const pulls = ORG_ADVISORIES.filter((a) => fixable.includes(a.id)).reduce((n, a) => n + a.repos.length, 0);
    setPrs((p) => [...new Set([...p, ...fixable])]);
    const skipped = selected.length - fixable.length;
    setNotice(`Opened ${pulls} pull requests for ${fixable.length} advisories${skipped ? ` · ${skipped} skipped (no fix yet)` : ""}`);
    setSelected([]);
  };
  const clear = sev.length || eco.length || fix.length || reach.length || q ? () => (setSev([]), setEco([]), setFix([]), setReach([]), setQ("")) : undefined;
  return (
    <>
      <PageHeader
        title="Advisories"
        description="Every known vulnerability across all 23 repositories, deduplicated by advisory. Data from OSV and the GitHub Advisory Database."
        actions={<Button icon={<RefreshCw />}>Sync advisory data</Button>}
      />
      <KpiGrid>
        <KpiCard label="Open advisories" value="96" unit="14 unique packages" delta={{ label: "+4 this week", direction: "up", intent: "bad" }} />
        <KpiCard label="Critical" value={count((a) => a.severity === "critical")} tone="danger" delta={{ label: "2 reachable" }} />
        <KpiCard label="Fix available" value="91%" tone="success" delta={{ label: `${count((a) => !a.fix)} without a patched version` }} />
        <KpiCard
          label="Median time to fix"
          value="6.2"
          unit="days"
          trend={[11, 10, 9, 9, 8, 7, 7, 6.5, 6.2]}
          delta={{ label: "−1.4 d vs. last month", direction: "down", intent: "good" }}
        />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Open advisories by ecosystem" description="Stacked by severity">
          <StackedBarChart
            label="Open advisories by ecosystem and severity"
            categories={ECOSYSTEMS}
            segments={SEVERITIES.map((s) => ({ id: s, name: SEVERITY_META[s].label }))}
            values={ECOSYSTEMS.map((e) =>
              SEVERITIES.map((s) => ORG_ADVISORIES.filter((a) => a.ecosystem === e && a.severity === s).reduce((n, a) => n + a.repos.length, 0)),
            )}
            height={170}
          />
        </Panel>
        <Panel title="Most affected repositories">
          <BarList
            label="Repositories with the most open advisories"
            items={projects
              .map((p) => ({ id: p.id, label: p.id, value: p.crit * 3 + p.high * 2 + 4 }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 5)}
          />
        </Panel>
      </div>
      <FilterBar onClear={clear}>
        <SearchInput label="Search advisories" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
        <FacetFilter
          label="Severity"
          selected={sev}
          onChange={setSev}
          options={SEVERITIES.map((s) => ({ value: s, label: SEVERITY_META[s].label, count: count((a) => a.severity === s) }))}
        />
        <FacetFilter
          label="Ecosystem"
          selected={eco}
          onChange={setEco}
          options={ECOSYSTEMS.map((e) => ({ value: e, count: count((a) => a.ecosystem === e) }))}
        />
        <FacetFilter
          label="Fix"
          selected={fix}
          onChange={setFix}
          options={[
            { value: "Fix available", count: count((a) => !!a.fix) },
            { value: "No fix yet", count: count((a) => !a.fix) },
          ]}
        />
        <FacetFilter
          label="Reachability"
          selected={reach}
          onChange={setReach}
          options={[
            { value: "Reachable", count: count((a) => a.reachable) },
            { value: "Not reachable", count: count((a) => !a.reachable) },
          ]}
        />
      </FilterBar>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Bulk actions" className="flex items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" variant="primary" icon={<GitPullRequest />} onClick={openPrs}>
            Open PRs
          </Button>
          <Button size="sm" icon={<BellOff />} onClick={() => (setNotice(`Snoozed ${selected.length} advisories for 30 days`), setSelected([]))}>
            Snooze 30 days
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="All advisories" description={`${shown.length} of ${ORG_ADVISORIES.length} shown`} flush>
          <DataTable
            label="All advisories"
            columns={cols}
            rows={shown}
            getRowId={(a) => a.id}
            selectable
            selectedIds={selected}
            onSelectionChange={setSelected}
            onRowClick={(a) => setActive(a.id)}
            activeRowId={active}
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={960}
            pageSize={10}
          />
        </Panel>
        <Panel title={detail.id} description={`Published ${detail.published}`} aria-label="Advisory detail" className="self-start">
          <div className="flex flex-col gap-2.5 text-sm">
            <div className="flex flex-wrap gap-1">
              <SeverityBadge severity={detail.severity} />
              {detail.reachable && <Badge tone="danger">Reachable</Badge>}
            </div>
            <p>{detail.title}</p>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
              <dt className="text-fg-muted">Package</dt>
              <dd className="truncate font-mono">{detail.pkg}</dd>
              <dt className="text-fg-muted">Ecosystem</dt>
              <dd>{detail.ecosystem}</dd>
              <dt className="text-fg-muted">Patched in</dt>
              <dd className="font-mono">{detail.fix ?? "No patched version"}</dd>
            </dl>
            <h3 className="text-xs font-semibold text-fg-muted">Affected repositories</h3>
            <ul aria-label="Affected repositories" className="flex flex-col gap-1">
              {detail.repos.map((r) => (
                <li key={r} className="flex items-center justify-between gap-2">
                  <EntityChip kind="repo" value={`acme/${r}`} href="#repo" />
                  <span className="text-2xs text-fg-muted">{detail.direct ? "direct" : "transitive"}</span>
                </li>
              ))}
            </ul>
            <EntityChip kind="cve" value={detail.id} href={`#${detail.id}`} className="self-start" />
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Licences                                                            */
/* ------------------------------------------------------------------ */

function LicencesPage() {
  const [tab, setTab] = useState<"all" | LicenceCategory>("all");
  const [allowed, setAllowed] = useState(["MIT", "Apache-2.0", "BSD-3-Clause", "BSD-2-Clause", "ISC", "0BSD", "Unlicense"]);
  const [denied, setDenied] = useState(["GPL-3.0-only", "AGPL-3.0-only", "SSPL-1.0", "BUSL-1.1"]);
  const [newId, setNewId] = useState("");
  const [newCat, setNewCat] = useState<"allowed" | "denied">("denied");
  const [saved, setSaved] = useState("");
  const [waived, setWaived] = useState<string[]>([]);
  const inv = LICENCES.filter((l) => tab === "all" || l.category === tab);
  const invCols: Column<LicenceRow>[] = [
    {
      id: "id",
      header: "Licence",
      sortValue: (l) => l.id,
      cell: (l) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-xs font-medium">{l.id}</span>
          <span className="truncate text-2xs text-fg-muted">{l.name}</span>
        </span>
      ),
    },
    {
      id: "cat",
      header: "Category",
      sortValue: (l) => l.category,
      cell: (l) => <StatusBadge tone={CATEGORY[l.category].tone}>{CATEGORY[l.category].label}</StatusBadge>,
    },
    { id: "pkgs", header: "Packages", align: "right", mono: true, sortValue: (l) => l.packages, cell: (l) => l.packages.toLocaleString("en-US") },
    { id: "repos", header: "Repos", align: "right", mono: true, sortValue: (l) => l.repos, cell: (l) => l.repos },
  ];
  const vCols: Column<Violation>[] = [
    { id: "repo", header: "Repository", sortValue: (v) => v.repo, cell: (v) => <span className="font-mono text-xs">{v.repo}</span> },
    {
      id: "pkg",
      header: "Package",
      sortValue: (v) => v.pkg,
      cell: (v) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs">
            {v.pkg}@{v.version}
          </span>
          <span className="text-2xs text-fg-muted">{v.via}</span>
        </span>
      ),
    },
    { id: "lic", header: "Licence", cell: (v) => <span className="font-mono text-xs">{v.licence}</span> },
    {
      id: "cat",
      header: "Policy",
      cell: (v) =>
        waived.includes(v.id) ? (
          <StatusBadge tone="info">Waived</StatusBadge>
        ) : (
          <StatusBadge tone={CATEGORY[v.category].tone}>{CATEGORY[v.category].label}</StatusBadge>
        ),
    },
    { id: "found", header: "Found", cell: (v) => v.found },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      width: "110px",
      hideable: false,
      cell: (v) => (
        <Button
          size="xs"
          variant="ghost"
          disabled={waived.includes(v.id)}
          aria-label={`Waive ${v.licence} for ${v.pkg} in ${v.repo}`}
          onClick={() => setWaived((w) => [...w, v.id])}
        >
          Waive
        </Button>
      ),
    },
  ];
  const add = () => {
    const id = newId.trim();
    if (!id) return;
    if (newCat === "allowed") {
      setAllowed((a) => [...new Set([...a, id])]);
      setDenied((d) => d.filter((x) => x !== id));
    } else {
      setDenied((d) => [...new Set([...d, id])]);
      setAllowed((a) => a.filter((x) => x !== id));
    }
    setNewId("");
    setSaved("");
  };
  const policyList = (title: string, items: string[], remove: (id: string) => void, tone: "success" | "danger") => (
    <div className="flex min-w-0 flex-col gap-1.5">
      <h3 className="text-xs font-semibold text-fg-muted">{title}</h3>
      <ul aria-label={title} className="flex flex-wrap gap-1">
        {items.map((id) => (
          <li key={id} className="flex items-center gap-0.5">
            <Badge tone={tone} mono>
              {id}
            </Badge>
            <IconButton label={`Remove ${id} from ${title.toLowerCase()}`} size="xs" onClick={() => (remove(id), setSaved(""))}>
              <X />
            </IconButton>
          </li>
        ))}
      </ul>
    </div>
  );
  const openViolations = VIOLATIONS.filter((v) => !waived.includes(v.id)).length;
  return (
    <>
      <PageHeader
        title="Licences"
        description="Licence inventory across every resolved dependency, checked against your organisation's policy."
        actions={<Button icon={<Download />}>Export notice file</Button>}
      />
      <KpiGrid>
        <KpiCard label="Distinct licences" value={LICENCES.length} unit="SPDX identifiers" />
        <KpiCard label="Allowed" value="6,141" unit="packages" tone="success" />
        <KpiCard label="Needs review" value="89" unit="packages" tone="warning" delta={{ label: "27 without a declared licence" }} />
        <KpiCard label="Policy violations" value={openViolations} tone="danger" delta={{ label: `${waived.length} waived` }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel
          title="Inventory"
          flush
          actions={
            <Tabs
              label="Licence category"
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "All", count: LICENCES.length },
                { value: "allowed", label: "Allowed", count: LICENCES.filter((l) => l.category === "allowed").length },
                { value: "review", label: "Review", count: LICENCES.filter((l) => l.category === "review").length },
                { value: "denied", label: "Denied", count: LICENCES.filter((l) => l.category === "denied").length },
              ]}
            />
          }
        >
          <DataTable
            label="Licence inventory"
            columns={invCols}
            rows={inv}
            getRowId={(l) => l.id}
            defaultSort={{ id: "pkgs", direction: "desc" }}
            minWidth={520}
          />
        </Panel>
        <Panel title="Packages by licence" description="Top 6">
          <BarList label="Packages per licence" items={LICENCES.slice(0, 6).map((l) => ({ id: l.id, label: l.id, value: l.packages }))} />
        </Panel>
      </div>
      <Panel title="Policy violations" description={`${openViolations} open · denied licences block CI, review licences warn`} flush>
        <DataTable label="Policy violations" columns={vCols} rows={VIOLATIONS} getRowId={(v) => v.id} minWidth={860} />
      </Panel>
      <Panel title="Licence policy" description="Applies to all repositories. Anything not listed is treated as Review.">
        <div className="flex flex-col gap-3">
          <div className="grid gap-3 md:grid-cols-2">
            {policyList("Allowed licences", allowed, (id) => setAllowed((a) => a.filter((x) => x !== id)), "success")}
            {policyList("Denied licences", denied, (id) => setDenied((d) => d.filter((x) => x !== id)), "danger")}
          </div>
          <form
            className="grid gap-2.5 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] md:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              add();
            }}
          >
            <TextField label="SPDX identifier" mono placeholder="e.g. MPL-2.0" value={newId} onChange={(e) => setNewId(e.target.value)} />
            <SelectField
              label="List"
              value={newCat}
              onChange={(e) => setNewCat(e.target.value as "allowed" | "denied")}
              options={[
                { value: "allowed", label: "Allowed" },
                { value: "denied", label: "Denied" },
              ]}
            />
            <Button type="submit" icon={<Plus />}>
              Add to policy
            </Button>
          </form>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={() => setSaved(`Policy saved · ${allowed.length} allowed, ${denied.length} denied`)}>
              Save policy
            </Button>
            {saved && (
              <span role="status" className="text-xs text-success">
                {saved}
              </span>
            )}
          </div>
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* SBOM                                                                */
/* ------------------------------------------------------------------ */

type SbomFormat = "cyclonedx" | "spdx";
const FORMAT = {
  cyclonedx: { label: "CycloneDX 1.6", ext: "cdx.json" },
  spdx: { label: "SPDX 2.3", ext: "spdx.json" },
} as const;

function SbomPage() {
  const [format, setFormat] = useState<SbomFormat>("cyclonedx");
  const [status, setStatus] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [active, setActive] = useState("orders-api");
  const a = SBOMS.find((s) => s.repo === active)!;
  const download = (s: SbomRow) => {
    const file = `acme-${s.repo}.${FORMAT[format].ext}`;
    setStatus((st) => ({ ...st, [s.repo]: "Downloaded" }));
    setMessage(`${file} downloaded · ${s.components.toLocaleString("en-US")} components · ${FORMAT[format].label}`);
  };
  const regenerate = (s: SbomRow) => {
    setStatus((st) => ({ ...st, [s.repo]: "Regenerated" }));
    setMessage(`Regenerated the SBOM for ${s.repo} from ${s.ref}`);
  };
  const cols: Column<SbomRow>[] = [
    {
      id: "repo",
      header: "Repository",
      sortValue: (s) => s.repo,
      cell: (s) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-xs font-medium">{s.repo}</span>
          <span className="font-mono text-2xs text-fg-muted">{s.ref}</span>
        </span>
      ),
    },
    { id: "components", header: "Components", align: "right", mono: true, sortValue: (s) => s.components, cell: (s) => s.components.toLocaleString("en-US") },
    { id: "generated", header: "Last generated", cell: (s) => s.generated },
    {
      id: "signed",
      header: "Attestation",
      description: "Signed with Sigstore keyless signing and recorded in the Rekor transparency log.",
      cell: (s) => (s.signed ? <StatusBadge tone="success">Signed</StatusBadge> : <StatusBadge tone="warning">Unsigned</StatusBadge>),
    },
    {
      id: "status",
      header: "Status",
      cell: (s) => (status[s.repo] ? <StatusBadge tone="info">{status[s.repo]}</StatusBadge> : <span className="text-xs text-fg-muted">–</span>),
    },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      align: "right",
      width: "220px",
      hideable: false,
      cell: (s) => (
        <span className="flex justify-end gap-1">
          <Button size="xs" icon={<Download />} aria-label={`Download SBOM for ${s.repo}`} onClick={() => download(s)}>
            Download
          </Button>
          <Button size="xs" variant="ghost" icon={<RefreshCw />} aria-label={`Regenerate SBOM for ${s.repo}`} onClick={() => regenerate(s)}>
            Regenerate
          </Button>
        </span>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="SBOM"
        description="Software bills of materials generated on every default-branch scan. Exports include licences, hashes and dependency relationships."
        actions={
          <Button
            variant="primary"
            icon={<Download />}
            onClick={() => setMessage(`acme-all-repos.${FORMAT[format].ext}.zip downloaded · ${SBOMS.length} repositories`)}
          >
            Download all
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Repositories with SBOM" value="23" unit="of 23" tone="success" />
        <KpiCard label="Components" value="6,463" unit="unique" delta={{ label: "+112 this week", direction: "up" }} />
        <KpiCard label="Signed attestations" value="22" unit="of 23" tone="warning" delta={{ label: "legacy-portal unsigned" }} />
        <KpiCard label="Last full export" value="Oct 18" unit="02:00 UTC" />
      </KpiGrid>
      <div className="flex flex-wrap items-center gap-2.5">
        <SegmentedControl
          label="SBOM format"
          value={format}
          onChange={setFormat}
          options={[
            { value: "cyclonedx", label: "CycloneDX 1.6" },
            { value: "spdx", label: "SPDX 2.3" },
          ]}
        />
        <span className="text-xs text-fg-muted">JSON · includes VEX statements for not-affected advisories</span>
      </div>
      {message && <Callout tone="success" title={message} onDismiss={() => setMessage("")} />}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Per-repository SBOMs" description={`Exports as ${FORMAT[format].label}`} flush>
          <DataTable
            label="Repository SBOMs"
            columns={cols}
            rows={SBOMS}
            getRowId={(s) => s.repo}
            onRowClick={(s) => setActive(s.repo)}
            activeRowId={active}
            minWidth={860}
          />
        </Panel>
        <Panel title="Attestation" description={a.repo} aria-label="Attestation detail" className="self-start">
          {a.signed ? (
            <div className="flex flex-col gap-2 text-xs">
              <span className="flex items-center gap-1.5 text-sm text-success">
                <BadgeCheck aria-hidden className="size-4" /> Signature verified
              </span>
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">Predicate</dt>
                <dd className="truncate font-mono">in-toto · cyclonedx.org/bom</dd>
                <dt className="text-fg-muted">Signer</dt>
                <dd className="truncate font-mono">ci@example.com</dd>
                <dt className="text-fg-muted">Issuer</dt>
                <dd className="truncate font-mono">token.actions.example.com</dd>
                <dt className="text-fg-muted">Subject</dt>
                <dd className="truncate font-mono">sha256:9f2c…41ab</dd>
                <dt className="text-fg-muted">Rekor index</dt>
                <dd className="font-mono">148 203 977</dd>
                <dt className="text-fg-muted">SLSA</dt>
                <dd>Build L3 provenance</dd>
              </dl>
              <Button size="sm" icon={<Download />} className="self-start" onClick={() => setMessage(`acme-${a.repo}.intoto.jsonl downloaded`)}>
                Download attestation
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 text-sm">
              <p className="text-warning-text">No signed attestation. This repository builds on Jenkins without OIDC.</p>
              <Button size="sm" className="self-start">
                Set up signing
              </Button>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CI gates                                                            */
/* ------------------------------------------------------------------ */

function GatesPage() {
  const [rules, setRules] = useState(RULES);
  const [filter, setFilter] = useState<"all" | GateResult>("all");
  const [active, setActive] = useState(RUNS[0]!.id);
  const run = RUNS.find((r) => r.id === active)!;
  const runs = RUNS.filter((r) => filter === "all" || r.result === filter);
  const enabled = rules.filter((r) => r.enabled).length;
  const cols: Column<GateRun>[] = [
    { id: "run", header: "Run", width: "80px", mono: true, cell: (r) => r.run },
    {
      id: "repo",
      header: "Repository",
      sortValue: (r) => r.repo,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="font-mono text-xs font-medium">{r.repo}</span>
          <span className="truncate text-2xs text-fg-muted">{r.pipeline}</span>
        </span>
      ),
    },
    {
      id: "branch",
      header: "Branch",
      cell: (r) => (
        <span className="font-mono text-xs">
          {r.branch} · {r.commit}
        </span>
      ),
    },
    {
      id: "result",
      header: "Result",
      sortValue: (r) => r.result,
      cell: (r) => <StatusBadge tone={RESULT[r.result].tone}>{RESULT[r.result].label}</StatusBadge>,
    },
    {
      id: "reasons",
      header: "Reasons",
      width: "34%",
      cell: (r) =>
        r.reasons.length ? (
          <span className="truncate text-xs">
            {r.reasons[0]}
            {r.reasons.length > 1 ? ` (+${r.reasons.length - 1})` : ""}
          </span>
        ) : (
          <span className="text-xs text-fg-muted">All rules passed</span>
        ),
    },
    { id: "time", header: "When", cell: (r) => r.time },
  ];
  return (
    <>
      <PageHeader
        title="CI gates"
        description="Rules evaluated by the audit step in every pipeline. Block fails the build; warn annotates the pull request."
        actions={
          <Button variant="primary" icon={<Plus />}>
            New rule
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Enabled rules" value={enabled} unit={`of ${rules.length}`} />
        <KpiCard label="Runs · 7 days" value="1,284" trend={[160, 182, 171, 205, 190, 98, 77, 201]} />
        <KpiCard label="Blocked" value="9.4%" unit="of runs" tone="danger" delta={{ label: "−2.1 pts vs. last week", direction: "down", intent: "good" }} />
        <KpiCard label="Warnings" value="17%" unit="of runs" tone="warning" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Gate rules" description={`${enabled} of ${rules.length} enabled`} flush className="self-start">
          <ul aria-label="Gate rules" className="flex flex-col">
            {rules.map((r) => (
              <li key={r.id} className="flex flex-col gap-1 border-b border-subtle px-3 py-2 last:border-0">
                <Switch
                  label={r.name}
                  description={`${r.scope} · ${r.action === "block" ? "blocks the build" : "warns only"}`}
                  checked={r.enabled}
                  onCheckedChange={(v) => setRules((rs) => rs.map((x) => (x.id === r.id ? { ...x, enabled: v } : x)))}
                />
                <span className="flex flex-wrap items-center gap-1.5">
                  <code className="rounded bg-subtle px-1.5 py-0.5 font-mono text-2xs text-fg">{r.condition}</code>
                  <Badge tone={r.action === "block" ? "danger" : "warning"}>{r.action === "block" ? "Block" : "Warn"}</Badge>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel
            title="Recent gate results"
            flush
            actions={
              <SegmentedControl
                label="Result filter"
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "fail", label: "Fail" },
                  { value: "warn", label: "Warn" },
                  { value: "pass", label: "Pass" },
                ]}
              />
            }
          >
            <DataTable
              label="Gate results"
              columns={cols}
              rows={runs}
              getRowId={(r) => r.id}
              onRowClick={(r) => setActive(r.id)}
              activeRowId={active}
              minWidth={820}
            />
          </Panel>
          <Panel
            title={`${run.repo} ${run.run}`}
            description={`${run.pipeline} · ${run.branch} @ ${run.commit} · by ${run.author}`}
            aria-label="Gate run detail"
            actions={<StatusBadge tone={RESULT[run.result].tone}>{RESULT[run.result].label}</StatusBadge>}
          >
            {run.reasons.length ? (
              <ul aria-label="Failure reasons" className="flex flex-col gap-1 text-sm">
                {run.reasons.map((x) => (
                  <li key={x} className="flex items-start gap-2">
                    <span aria-hidden className={cn("mt-1.5 size-1.5 shrink-0 rounded-full", run.result === "fail" ? "bg-danger" : "bg-warning")} />
                    <span>{x}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-success">All {enabled} enabled rules passed.</p>
            )}
            <div className="mt-2 flex gap-1.5">
              <Button size="sm" icon={<Play />}>
                Re-run gate
              </Button>
              <Button size="sm" variant="ghost" icon={<Trash2 />}>
                Dismiss
              </Button>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}

const PAGES = {
  projects: () => <ProjectsPage />,
  advisories: () => <AdvisoriesPage />,
  licences: () => <LicencesPage />,
  sbom: () => <SbomPage />,
  gates: () => <GatesPage />,
};

const app = (initial: string, pages = PAGES): Story => ({ render: () => <ProductApp product="audit" nav={nav} pages={pages} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

/** One project: dependency counts, CI gate and the advisories that fail it. */
export const Project: Story = {
  name: "Projects",
  ...app("projects"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "orders-api" })).toBeInTheDocument();
    const list = within(c.getByRole("list", { name: "Projects" }));
    await expect(list.getByRole("button", { name: /orders-api/ })).toHaveAttribute("aria-current", "true");

    await userEvent.click(list.getByRole("button", { name: /billing-worker/ }));
    await expect(c.getByRole("heading", { level: 1, name: "billing-worker" })).toBeInTheDocument();
    await expect(list.getByRole("button", { name: /billing-worker/ })).toHaveAttribute("aria-current", "true");
    await expect(c.queryByText("CI gate blocks merges to main")).not.toBeInTheDocument();

    await userEvent.type(c.getByRole("searchbox", { name: "Filter projects" }), "legacy");
    await expect(list.getAllByRole("button")).toHaveLength(1);
    await userEvent.click(list.getByRole("button", { name: /legacy-portal/ }));
    await expect(c.getByRole("heading", { level: 1, name: "legacy-portal" })).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Open PR to upgrade golang.org/x/crypto to v0.31.0" })).toBeInTheDocument();
  },
};

export const Advisories: Story = {
  ...app("advisories"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getByRole("button", { name: "Ecosystem" }));
    await userEvent.click(body.getByRole("checkbox", { name: /^pip/ }));
    await userEvent.keyboard("{Escape}");
    const table = c.getByRole("table", { name: "All advisories" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(3);

    await userEvent.click(c.getByText("Quadratic complexity in idna.encode on crafted input"));
    await expect(c.getByLabelText("Advisory detail")).toHaveTextContent("acme/ml-scoring");

    await userEvent.click(c.getByRole("checkbox", { name: "Select row CVE-2024-3651" }));
    await userEvent.click(c.getByRole("checkbox", { name: "Select row CVE-2024-35195" }));
    await userEvent.click(within(c.getByRole("toolbar", { name: "Bulk actions" })).getByRole("button", { name: "Open PRs" }));
    await expect(c.getByText("Opened 2 pull requests for 2 advisories")).toBeInTheDocument();
  },
};

export const Licences: Story = {
  ...app("licences"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Denied/ }));
    await expect(c.getByRole("table", { name: "Licence inventory" }).querySelectorAll("tbody tr")).toHaveLength(3);

    await userEvent.click(c.getByRole("button", { name: "Waive SSPL-1.0 for github.com/mongodb/mongo-tools in orders-api" }));
    await expect(c.getByRole("button", { name: "Waive SSPL-1.0 for github.com/mongodb/mongo-tools in orders-api" })).toBeDisabled();

    await userEvent.type(c.getByRole("textbox", { name: "SPDX identifier" }), "MPL-2.0");
    await userEvent.click(c.getByRole("button", { name: "Add to policy" }));
    await expect(within(c.getByRole("list", { name: "Denied licences" })).getByText("MPL-2.0")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Save policy" }));
    await expect(c.getByRole("status")).toHaveTextContent("7 allowed, 5 denied");
  },
};

export const Sbom: Story = {
  name: "SBOM",
  ...app("sbom"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: "SPDX 2.3" }));
    await userEvent.click(c.getByRole("button", { name: "Download SBOM for orders-api" }));
    await expect(c.getByText(/acme-orders-api\.spdx\.json downloaded/)).toBeInTheDocument();

    await userEvent.click(c.getByText("legacy-portal"));
    await expect(c.getByLabelText("Attestation detail")).toHaveTextContent("No signed attestation");
  },
};

export const CiGates: Story = {
  name: "CI gates",
  ...app("gates"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const rules = within(c.getByRole("list", { name: "Gate rules" }));
    const sw = rules.getByRole("switch", { name: "Unsigned SBOM" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await expect(c.getByText("6 of 6 enabled")).toBeInTheDocument();

    await userEvent.click(c.getByRole("radio", { name: "Warn" }));
    await expect(c.getByRole("table", { name: "Gate results" }).querySelectorAll("tbody tr")).toHaveLength(2);
    await userEvent.click(c.getByText("payments-api"));
    await expect(c.getByLabelText("Gate run detail")).toHaveTextContent("CVE-2023-45288");
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
