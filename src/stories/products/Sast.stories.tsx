import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bug,
  CircleSlash,
  Clock,
  Code2,
  FlaskConical,
  FolderGit2,
  GitBranch,
  GitCommitHorizontal,
  GitPullRequest,
  ListChecks,
  Plus,
  ScanSearch,
  Settings2,
  Trash2,
} from "lucide-react";
import { ProductApp, type PageMap } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FacetFilter, FilterBar } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { EmptyState } from "../../components/EmptyState";
import { Tabs } from "../../components/Tabs";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import { SEVERITY_META, type Severity } from "../../tokens/levels";
import { PEOPLE, wave } from "../mocks";

const nav = [
  { id: "prs", label: "Pull requests", icon: GitPullRequest, count: 7 },
  { id: "findings", label: "Findings", icon: Bug, count: 18 },
  { id: "repos", label: "Repositories", icon: FolderGit2, count: 23 },
  { id: "rules", label: "Rules", icon: BookOpen, count: "2.4k" },
  { id: "policies", label: "Policies", icon: Settings2 },
];

const meta = {
  title: "Products/SAST",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

type State = "new" | "fixed" | "existing";

interface CodeLine {
  n: number;
  text: string;
  hot?: boolean;
}

interface Finding {
  id: string;
  severity: Severity;
  state: State;
  cwe: string;
  title: string;
  rule: string;
  engine: "Semgrep CE" | "gosec";
  file: string;
  line: number;
  flow: string[];
  explain: string;
  code: CodeLine[];
  fix?: { del: string[]; add: string[] };
  dast?: string;
}

const findings: Finding[] = [
  {
    id: "f1",
    severity: "high",
    state: "new",
    cwe: "CWE-89",
    title: "SQL injection",
    rule: "go.lang.security.audit.database.string-formatted-query",
    engine: "Semgrep CE",
    file: "internal/orders/search.go",
    line: 42,
    flow: ["req.URL.Query().Get(\"q\")", "term", "db.Query()"],
    explain: "User input from the q parameter is concatenated into a SQL string and run with db.Query. An attacker can read or change any table the service account can reach.",
    code: [
      { n: 38, text: "func (h *Handler) Search(w http.ResponseWriter, r *http.Request) {" },
      { n: 39, text: "\tterm := r.URL.Query().Get(\"q\")" },
      { n: 40, text: "\tlimit := parseLimit(r, 50)" },
      { n: 41, text: "" },
      { n: 42, text: "\trows, err := h.db.Query(\"SELECT id, total FROM orders WHERE note LIKE '%\" + term + \"%' LIMIT \" + limit)", hot: true },
      { n: 43, text: "\tif err != nil {" },
      { n: 44, text: "\t\thttp.Error(w, \"search failed\", http.StatusInternalServerError)" },
    ],
    fix: {
      del: ["rows, err := h.db.Query(\"SELECT id, total FROM orders WHERE note LIKE '%\" + term + \"%' LIMIT \" + limit)"],
      add: ["rows, err := h.db.Query(\"SELECT id, total FROM orders WHERE note LIKE $1 LIMIT $2\", \"%\"+term+\"%\", limit)"],
    },
    dast: "SQL injection confirmed on /v1/orders?q= (scan #312, 18 min ago)",
  },
  {
    id: "f2",
    severity: "high",
    state: "new",
    cwe: "CWE-22",
    title: "Path traversal in export download",
    rule: "gosec.G304",
    engine: "gosec",
    file: "internal/orders/export.go",
    line: 77,
    flow: ["chi.URLParam(r, \"name\")", "path", "os.Open()"],
    explain: "The export name from the URL is joined to the export directory without cleaning it, so ../ sequences can open any file the process can read.",
    code: [
      { n: 75, text: "\tname := chi.URLParam(r, \"name\")" },
      { n: 76, text: "\tpath := filepath.Join(h.exportDir, name)" },
      { n: 77, text: "\tf, err := os.Open(path)", hot: true },
      { n: 78, text: "\tif err != nil {" },
    ],
    fix: {
      del: ["f, err := os.Open(path)"],
      add: ["f, err := h.exportRoot.Open(name) // os.Root, Go 1.24"],
    },
  },
  {
    id: "f3",
    severity: "medium",
    state: "new",
    cwe: "CWE-209",
    title: "Database error returned to client",
    rule: "go.lang.security.audit.net.error-leak",
    engine: "Semgrep CE",
    file: "internal/orders/search.go",
    line: 51,
    flow: ["err", "fmt.Sprintf()", "w.Write()"],
    explain: "The raw driver error, including table and column names, is written to the HTTP response.",
    code: [
      { n: 50, text: "\tif err := rows.Err(); err != nil {" },
      { n: 51, text: "\t\tw.Write([]byte(fmt.Sprintf(\"query error: %v\", err)))", hot: true },
      { n: 52, text: "\t}" },
    ],
  },
  {
    id: "f4",
    severity: "medium",
    state: "fixed",
    cwe: "CWE-798",
    title: "Hard-coded credentials",
    rule: "gosec.G101",
    engine: "gosec",
    file: "internal/config/defaults.go",
    line: 12,
    flow: ["const dbPassword", "dsn", "sql.Open()"],
    explain: "A database password literal was removed in this pull request.",
    code: [{ n: 12, text: "\tdsn := os.Getenv(\"ORDERS_DSN\")" }],
  },
];

const xssFindings: Finding[] = [
  {
    id: "x1",
    severity: "high",
    state: "new",
    cwe: "CWE-79",
    title: "Cross-site scripting via dangerouslySetInnerHTML",
    rule: "typescript.react.security.audit.react-dangerouslysetinnerhtml",
    engine: "Semgrep CE",
    file: "src/pages/ticket/Comment.tsx",
    line: 28,
    flow: ["props.comment.body", "html", "dangerouslySetInnerHTML"],
    explain: "Comment bodies written by customers are rendered as raw HTML. A script tag in a support ticket runs in the agent's session.",
    code: [
      { n: 26, text: "  const html = marked.parse(props.comment.body);" },
      { n: 27, text: "  return (" },
      { n: 28, text: "    <div className=\"prose\" dangerouslySetInnerHTML={{ __html: html }} />", hot: true },
      { n: 29, text: "  );" },
    ],
    fix: {
      del: ["const html = marked.parse(props.comment.body);"],
      add: ["const html = DOMPurify.sanitize(marked.parse(props.comment.body));"],
    },
  },
];

const md5Findings: Finding[] = [
  {
    id: "m1",
    severity: "medium",
    state: "new",
    cwe: "CWE-327",
    title: "Weak hash used for invoice signature",
    rule: "python.lang.security.audit.insecure-hash-algorithms.insecure-hash-algorithm-md5",
    engine: "Semgrep CE",
    file: "billing/invoices/sign.py",
    line: 19,
    flow: ["invoice.payload", "hashlib.md5()"],
    explain: "MD5 is used to sign invoice payloads. Collisions are practical, so a forged invoice could carry a valid signature.",
    code: [
      { n: 18, text: "def sign(invoice):" },
      { n: 19, text: "    return hashlib.md5(SECRET + invoice.payload).hexdigest()", hot: true },
    ],
    fix: { del: ["return hashlib.md5(SECRET + invoice.payload).hexdigest()"], add: ["return hmac.new(SECRET, invoice.payload, hashlib.sha256).hexdigest()"] },
  },
];

const STATE_TONE = { new: "danger", fixed: "success", existing: "neutral" } as const;

type Gate = "failed" | "warn" | "passed" | "running";
const GATE: Record<Gate, { tone: "danger" | "warning" | "success" | "info"; label: string }> = {
  failed: { tone: "danger", label: "Failed" },
  warn: { tone: "warning", label: "Passed with warnings" },
  passed: { tone: "success", label: "Passed" },
  running: { tone: "info", label: "Scanning" },
};

interface PR {
  id: string;
  number: number;
  title: string;
  repo: string;
  author: string;
  branch: string;
  findings: Finding[];
  existing: number;
  scanned: string;
  duration: string;
  scanning?: boolean;
}

const PRS: PR[] = [
  { id: "485", number: 485, title: "Bump chi to v5.2", repo: "acme/orders-api", author: PEOPLE[3]!, branch: "deps/chi-5.2", findings: [], existing: 14, scanned: "now", duration: "–", scanning: true },
  { id: "482", number: 482, title: "Add order search endpoint", repo: "acme/orders-api", author: PEOPLE[2]!, branch: "feat/order-search", findings, existing: 14, scanned: "2 min ago", duration: "41 s" },
  { id: "481", number: 481, title: "Retry failed webhooks with backoff", repo: "acme/notifications", author: PEOPLE[6]!, branch: "fix/webhook-retry", findings: [], existing: 3, scanned: "34 min ago", duration: "52 s" },
  { id: "480", number: 480, title: "Sign invoices before upload", repo: "acme/billing-worker", author: PEOPLE[4]!, branch: "feat/invoice-signing", findings: md5Findings, existing: 6, scanned: "1 h ago", duration: "19 s" },
  { id: "477", number: 477, title: "Render markdown in ticket comments", repo: "acme/web-dashboard", author: PEOPLE[5]!, branch: "feat/markdown-comments", findings: xssFindings, existing: 9, scanned: "3 h ago", duration: "1 m 08 s" },
  { id: "476", number: 476, title: "Rotate session keys on password change", repo: "acme/auth-service", author: PEOPLE[0]!, branch: "sec/session-rotation", findings: [], existing: 2, scanned: "5 h ago", duration: "37 s" },
  { id: "473", number: 473, title: "Terraform: private subnets for workers", repo: "acme/infra-terraform", author: PEOPLE[7]!, branch: "infra/private-subnets", findings: [], existing: 4, scanned: "Yesterday", duration: "12 s" },
];

const newOf = (pr: PR) => pr.findings.filter((f) => f.state === "new");
const gateOf = (pr: PR): Gate => {
  if (pr.scanning) return "running";
  const n = newOf(pr);
  if (n.some((f) => f.severity === "high" || f.severity === "critical")) return "failed";
  return n.length ? "warn" : "passed";
};
const handleOf = (name: string) => name.toLowerCase().replace(" ", ".");

type Status = "open" | "triaged" | "fixing" | "accepted" | "false-positive";
const STATUS_META: Record<Status, { label: string; tone: "danger" | "info" | "warning" | "neutral" | "success" }> = {
  open: { label: "Open", tone: "danger" },
  triaged: { label: "Triaged", tone: "info" },
  fixing: { label: "In progress", tone: "warning" },
  accepted: { label: "Risk accepted", tone: "neutral" },
  "false-positive": { label: "False positive", tone: "success" },
};

interface OpenFinding {
  id: string;
  severity: Severity;
  cwe: string;
  title: string;
  rule: string;
  repo: string;
  file: string;
  line: number;
  age: number;
  status: Status;
  assignee?: string;
}

const OPEN: OpenFinding[] = (
  [
    ["critical", "CWE-502", "Unsafe YAML deserialization", "python.lang.security.deserialization.avoid-pyyaml-load", "acme/data-pipeline", "etl/config/loader.py", 33, 46, "fixing", PEOPLE[1]],
    ["critical", "CWE-78", "OS command injection in image resize", "go.lang.security.audit.dangerous-exec-command", "acme/mobile-bff", "internal/media/resize.go", 61, 12, "open"],
    ["high", "CWE-89", "SQL injection in report filter", "java.lang.security.audit.formatted-sql-string", "acme/notifications", "src/main/java/com/acme/notify/ReportDao.java", 88, 73, "triaged", PEOPLE[6]],
    ["high", "CWE-918", "Server-side request forgery in webhook test", "go.lang.security.audit.net.ssrf-user-url", "acme/notifications", "internal/webhook/test.go", 24, 31, "open"],
    ["high", "CWE-352", "CSRF protection disabled", "java.spring.security.audit.spring-csrf-disabled", "acme/search-indexer", "src/main/java/com/acme/search/SecurityConfig.java", 41, 120, "accepted", PEOPLE[0]],
    ["high", "CWE-611", "XML external entities enabled", "java.lang.security.audit.xxe.documentbuilderfactory-disallow-doctype-decl-missing", "acme/search-indexer", "src/main/java/com/acme/search/FeedParser.java", 17, 64, "open"],
    ["high", "CWE-327", "TLS verification disabled", "gosec.G402", "acme/payments-api", "internal/psp/client.go", 52, 9, "open"],
    ["medium", "CWE-601", "Open redirect after sign-in", "typescript.express.security.audit.express-open-redirect", "acme/web-dashboard", "server/routes/auth.ts", 112, 27, "triaged", PEOPLE[5]],
    ["medium", "CWE-209", "Stack trace in error response", "python.flask.security.audit.debug-enabled", "acme/billing-worker", "billing/api/app.py", 9, 88, "open"],
    ["medium", "CWE-338", "math/rand used for reset tokens", "gosec.G404", "acme/auth-service", "internal/reset/token.go", 15, 5, "fixing", PEOPLE[0]],
    ["medium", "CWE-1333", "Regular expression denial of service", "typescript.lang.security.audit.detect-redos", "acme/web-dashboard", "src/lib/validate.ts", 7, 140, "open"],
    ["medium", "CWE-732", "World-writable file permissions", "gosec.G302", "acme/orders-api", "internal/export/writer.go", 39, 54, "false-positive", PEOPLE[2]],
    ["medium", "CWE-200", "S3 bucket without public access block", "terraform.aws.security.aws-s3-bucket-public-access-block", "acme/infra-terraform", "modules/exports/s3.tf", 3, 210, "accepted", PEOPLE[7]],
    ["low", "CWE-614", "Cookie without Secure flag", "typescript.express.security.audit.express-cookie-session-no-secure", "acme/web-dashboard", "server/session.ts", 21, 33, "open"],
    ["low", "CWE-532", "Card number logged at debug level", "go.lang.security.audit.log-sensitive", "acme/payments-api", "internal/charge/handler.go", 104, 18, "triaged", PEOPLE[3]],
    ["low", "CWE-326", "RSA key shorter than 2048 bits", "gosec.G403", "acme/auth-service", "internal/keys/gen.go", 28, 300, "open"],
    ["low", "CWE-489", "Debug endpoint left enabled", "java.spring.security.audit.spring-actuator-dangerous-endpoints-enabled", "acme/notifications", "src/main/resources/application.yml", 14, 95, "open"],
    ["info", "CWE-1104", "Deprecated crypto/elliptic API", "go.lang.maintainability.deprecated-elliptic", "acme/orders-api", "internal/sign/ecdsa.go", 11, 41, "open"],
  ] as const
).map(([severity, cwe, title, rule, repo, file, line, age, status, assignee], i) => ({ id: `o${i + 1}`, severity, cwe, title, rule, repo, file, line, age, status, assignee }));

interface Repo {
  id: string;
  name: string;
  language: string;
  lastScan: string;
  open: [number, number, number, number];
  gate: Gate;
  packs: string[];
  loc: string;
}

const REPOS: Repo[] = [
  { id: "r1", name: "acme/orders-api", language: "Go", lastScan: "2 min ago", open: [0, 2, 3, 6], gate: "failed", packs: ["default", "owasp", "golang", "secrets", "acme"], loc: "84k" },
  { id: "r2", name: "acme/payments-api", language: "Go", lastScan: "18 min ago", open: [0, 1, 4, 5], gate: "passed", packs: ["default", "owasp", "golang", "secrets", "acme"], loc: "61k" },
  { id: "r3", name: "acme/web-dashboard", language: "TypeScript", lastScan: "3 h ago", open: [0, 1, 6, 9], gate: "failed", packs: ["default", "owasp", "typescript", "secrets"], loc: "142k" },
  { id: "r4", name: "acme/billing-worker", language: "Python", lastScan: "1 h ago", open: [0, 0, 2, 4], gate: "warn", packs: ["default", "python", "secrets"], loc: "23k" },
  { id: "r5", name: "acme/auth-service", language: "Go", lastScan: "5 h ago", open: [0, 0, 2, 3], gate: "passed", packs: ["default", "owasp", "golang", "secrets", "acme"], loc: "38k" },
  { id: "r6", name: "acme/notifications", language: "Java", lastScan: "34 min ago", open: [0, 2, 1, 7], gate: "passed", packs: ["default", "owasp", "java"], loc: "57k" },
  { id: "r7", name: "acme/data-pipeline", language: "Python", lastScan: "Yesterday", open: [1, 0, 3, 2], gate: "passed", packs: ["default", "python"], loc: "31k" },
  { id: "r8", name: "acme/mobile-bff", language: "Go", lastScan: "6 h ago", open: [1, 0, 1, 2], gate: "passed", packs: ["default", "golang"], loc: "19k" },
  { id: "r9", name: "acme/search-indexer", language: "Java", lastScan: "2 days ago", open: [0, 2, 2, 1], gate: "passed", packs: ["default", "java"], loc: "44k" },
  { id: "r10", name: "acme/infra-terraform", language: "HCL", lastScan: "Yesterday", open: [0, 0, 1, 3], gate: "passed", packs: ["terraform", "secrets"], loc: "12k" },
];

interface RulePack {
  id: string;
  name: string;
  source: string;
  rules: number;
  languages: string;
  enabled: boolean;
  updated: string;
}

const PACKS: RulePack[] = [
  { id: "default", name: "Semgrep default", source: "p/default", rules: 1046, languages: "All", enabled: true, updated: "Oct 14" },
  { id: "owasp", name: "OWASP Top Ten", source: "p/owasp-top-ten", rules: 612, languages: "All", enabled: true, updated: "Oct 14" },
  { id: "golang", name: "gosec", source: "gosec 2.21", rules: 58, languages: "Go", enabled: true, updated: "Sep 30" },
  { id: "python", name: "Python security", source: "p/python", rules: 214, languages: "Python", enabled: true, updated: "Oct 14" },
  { id: "typescript", name: "TypeScript and React", source: "p/typescript", rules: 187, languages: "TypeScript", enabled: true, updated: "Oct 14" },
  { id: "java", name: "Java and Spring", source: "p/java", rules: 241, languages: "Java", enabled: true, updated: "Oct 14" },
  { id: "secrets", name: "Hard-coded secrets", source: "p/secrets", rules: 96, languages: "All", enabled: true, updated: "Oct 10" },
  { id: "terraform", name: "Terraform", source: "p/terraform", rules: 132, languages: "HCL", enabled: false, updated: "Oct 2" },
  { id: "acme", name: "Acme custom rules", source: "rules/ in acme/sast-rules", rules: 11, languages: "Go", enabled: true, updated: "Oct 17" },
];

/* ------------------------------------------------------------------ */
/* Pull requests                                                       */
/* ------------------------------------------------------------------ */

function PrDetail({ pr, onBack }: { pr: PR; onBack: () => void }) {
  const [sel, setSel] = useState(pr.findings[0]?.id);
  const f = pr.findings.find((x) => x.id === sel) ?? pr.findings[0];
  const gate = gateOf(pr);
  const news = newOf(pr);
  const blocking = news.filter((x) => x.severity === "high" || x.severity === "critical").length;
  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Pull requests" }, { label: pr.repo }]}
        title={`#${pr.number} ${pr.title}`}
        meta={<StatusBadge tone={GATE[gate].tone}>{gate === "failed" ? `Gate failed · ${blocking} new high` : `Gate ${GATE[gate].label.toLowerCase()}`}</StatusBadge>}
        actions={
          <>
            <Button size="md" variant="ghost" icon={<ArrowLeft />} onClick={onBack}>
              All pull requests
            </Button>
            <Button size="md" icon={<ScanSearch />}>
              Rescan
            </Button>
            <Button size="md" variant="primary" icon={<GitPullRequest />}>
              Open in GitHub
            </Button>
          </>
        }
      >
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
          <Badge mono icon={<GitBranch aria-hidden className="size-3" />}>
            {pr.branch} → main
          </Badge>
          <Badge icon={<Clock aria-hidden className="size-3" />}>
            Scanned {pr.scanned} · {pr.duration}
          </Badge>
          <Badge icon={<Code2 aria-hidden className="size-3" />}>Semgrep CE + gosec</Badge>
          <Badge tone="danger">{news.length} new</Badge>
          <Badge tone="success">{pr.findings.filter((x) => x.state === "fixed").length} fixed</Badge>
          <Badge>{pr.existing} existing</Badge>
          <EntityChip kind="user" value={handleOf(pr.author)} href="#user" />
        </div>
      </PageHeader>
      {!f ? (
        <Panel title="Findings in this PR">
          <EmptyState icon={<ScanSearch />} title={pr.scanning ? "Scan in progress" : "No findings on changed lines"}>
            {pr.scanning ? "Results appear here when the scan finishes, usually within a minute." : `${pr.existing} existing findings in ${pr.repo} are not touched by this change.`}
          </EmptyState>
        </Panel>
      ) : (
        <div className="grid gap-2.5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Panel title="Findings in this PR" description={`Only lines changed by #${pr.number}`} flush className="self-start">
            <ul aria-label="Findings in this pull request" className="flex flex-col p-1">
              {pr.findings.map((x) => {
                const on = x.id === f.id;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => setSel(x.id)}
                      className={cn("flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left hover:bg-subtle", on && "bg-accent-soft hover:bg-accent-soft")}
                    >
                      <span className="flex items-center gap-1.5">
                        <SeverityBadge severity={x.severity} compact role="img" />
                        <span className="truncate text-sm font-medium text-fg">{x.title}</span>
                      </span>
                      <span className="flex items-center gap-1.5 text-2xs text-fg-muted">
                        <span className="truncate font-mono">
                          {x.file.split("/").pop()}:{x.line}
                        </span>
                        <Badge tone={STATE_TONE[x.state]} className="h-4 text-2xs">
                          {x.state === "new" ? "New" : x.state === "fixed" ? "Fixed" : "Existing"}
                        </Badge>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>
          <Panel
            aria-label="Finding detail"
            title={
              <span className="flex flex-wrap items-center gap-1.5">
                <SeverityBadge severity={f.severity} />
                <span>
                  {f.cwe} {f.title}
                </span>
              </span>
            }
            description={
              <span className="font-mono">
                {f.file}:{f.line} · {f.engine} · {f.rule}
              </span>
            }
            footer={
              <span className="flex flex-wrap gap-1.5">
                {f.fix && (
                  <Button size="sm" variant="primary" icon={<GitCommitHorizontal />}>
                    Commit suggestion
                  </Button>
                )}
                <Button size="sm" icon={<ListChecks />}>
                  Create issue
                </Button>
                <Button size="sm" variant="ghost" icon={<CircleSlash />}>
                  False positive
                </Button>
              </span>
            }
          >
            <div className="flex flex-col gap-2.5 text-sm">
              {f.dast && (
                <Callout tone="danger" title="Confirmed by DAST on staging" action={<a href="#dast-scan" className="text-sm font-medium text-accent-text">Open DAST finding</a>}>
                  {f.dast}
                </Callout>
              )}
              <p className="text-fg-muted">{f.explain}</p>
              <div className="flex flex-col gap-1">
                <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Data flow</span>
                <ol aria-label="Data flow" className="flex flex-wrap items-center gap-1">
                  {f.flow.map((step, i) => (
                    <li key={i} className="flex items-center gap-1">
                      <Badge tone={i === 0 ? "warning" : i === f.flow.length - 1 ? "danger" : "neutral"} mono>
                        <span className="font-sans font-medium">{i === 0 ? "source" : i === f.flow.length - 1 ? "sink" : "var"}</span>
                        {step}
                      </Badge>
                      {i < f.flow.length - 1 && <ArrowRight aria-hidden className="size-3 text-fg-muted" />}
                    </li>
                  ))}
                </ol>
              </div>
              <figure className="m-0 flex flex-col gap-1">
                <figcaption className="font-mono text-2xs text-fg-muted">{f.file}</figcaption>
                <div role="region" className="overflow-x-auto rounded-md border border-line bg-subtle py-1.5 font-mono text-xs text-fg" tabIndex={0} aria-label={`Code around line ${f.line}`}>
                  {f.code.map((l) => (
                    <div key={l.n} data-hot={l.hot || undefined} className={cn("flex border-l-2 pr-3", l.hot ? "border-danger bg-danger-soft" : "border-transparent")}>
                      <span className="w-10 shrink-0 pr-2 text-right text-fg-muted select-none">{l.n}</span>
                      <code className="whitespace-pre">{l.text}</code>
                    </div>
                  ))}
                </div>
              </figure>
              {f.fix && (
                <div className="flex flex-col gap-1">
                  <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Suggested fix</span>
                  <div role="region" className="overflow-x-auto rounded-md border border-line bg-surface py-1.5 font-mono text-xs" tabIndex={0} aria-label="Suggested fix diff">
                    {f.fix.del.map((t, i) => (
                      <div key={`d${i}`} className="flex bg-danger-soft pr-3 text-danger-text">
                        <span aria-hidden className="w-6 shrink-0 text-center select-none">
                          -
                        </span>
                        <span className="sr-only">Removed: </span>
                        <code className="whitespace-pre">{t}</code>
                      </div>
                    ))}
                    {f.fix.add.map((t, i) => (
                      <div key={`a${i}`} className="flex bg-success-soft pr-3 text-success">
                        <span aria-hidden className="w-6 shrink-0 text-center select-none">
                          +
                        </span>
                        <span className="sr-only">Added: </span>
                        <code className="whitespace-pre">{t}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}
    </>
  );
}

function PullRequestsPage({ initialOpen }: { initialOpen?: string }) {
  const [open, setOpen] = useState(initialOpen);
  const [repos, setRepos] = useState<string[]>([]);
  const [gates, setGates] = useState<string[]>([]);
  const pr = PRS.find((p) => p.id === open);
  if (pr) return <PrDetail pr={pr} onBack={() => setOpen(undefined)} />;
  const shown = PRS.filter((p) => (repos.length === 0 || repos.includes(p.repo)) && (gates.length === 0 || gates.includes(gateOf(p))));
  const cols: Column<PR>[] = [
    {
      id: "pr",
      header: "Pull request",
      pinned: "left",
      width: "30%",
      sortValue: (p) => p.number,
      cell: (p) => (
        <span className="flex min-w-0 flex-col items-start">
          <button type="button" onClick={() => setOpen(p.id)} className="max-w-full truncate text-left font-medium text-accent-text hover:underline">
            #{p.number} {p.title}
          </button>
          <span className="truncate font-mono text-2xs text-fg-muted">{p.repo}</span>
        </span>
      ),
    },
    {
      id: "author",
      header: "Author",
      sortValue: (p) => p.author,
      cell: (p) => (
        <span className="flex items-center gap-1.5">
          <Avatar name={p.author} size="sm" />
          <span className="truncate">{p.author}</span>
        </span>
      ),
    },
    { id: "branch", header: "Branch", cell: (p) => <Badge mono icon={<GitBranch aria-hidden className="size-3" />}>{p.branch}</Badge> },
    {
      id: "new",
      header: "New",
      align: "right",
      description: "Findings introduced on lines this pull request changes.",
      sortValue: (p) => newOf(p).length,
      cell: (p) => (p.scanning ? "–" : newOf(p).length ? <Badge tone="danger">{newOf(p).length}</Badge> : <span className="font-mono text-fg-muted">0</span>),
    },
    {
      id: "fixed",
      header: "Fixed",
      align: "right",
      sortValue: (p) => p.findings.filter((f) => f.state === "fixed").length,
      cell: (p) => {
        const n = p.findings.filter((f) => f.state === "fixed").length;
        return n ? <Badge tone="success">{n}</Badge> : <span className="font-mono text-fg-muted">0</span>;
      },
    },
    { id: "gate", header: "Gate", description: "Result of the merge gate from Policies.", sortValue: (p) => gateOf(p), cell: (p) => <StatusBadge tone={GATE[gateOf(p)].tone}>{GATE[gateOf(p)].label}</StatusBadge> },
    { id: "scanned", header: "Scanned", cell: (p) => <span className="text-fg-muted">{p.scanned}</span> },
  ];
  const weeks = ["Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12", "Oct 19"];
  return (
    <>
      <PageHeader title="Pull requests" description="Open pull requests across all connected repositories. Only findings on changed lines count toward the gate." actions={<SearchInput label="Search pull requests" className="w-60" />} />
      <KpiGrid>
        <KpiCard label="Open pull requests" value={PRS.length} unit="7 repositories" />
        <KpiCard label="Blocked by gate" value={PRS.filter((p) => gateOf(p) === "failed").length} tone="danger" delta={{ label: "new high findings", intent: "bad" }} />
        <KpiCard label="New findings · 7 d" value="11" trend={[2, 0, 3, 1, 0, 1, 4]} delta={{ label: "8 fixed in the same PR", intent: "good" }} />
        <KpiCard label="Median scan time" value="38" unit="s" trend={wave(14, { base: 40, amp: 6, seed: 82 })} />
      </KpiGrid>
      <FilterBar onClear={repos.length || gates.length ? () => (setRepos([]), setGates([])) : undefined}>
        <FacetFilter label="Repository" selected={repos} onChange={setRepos} options={[...new Set(PRS.map((p) => p.repo))].map((r) => ({ value: r, count: PRS.filter((p) => p.repo === r).length }))} />
        <FacetFilter
          label="Gate"
          selected={gates}
          onChange={setGates}
          options={(Object.keys(GATE) as Gate[]).map((g) => ({ value: g, label: GATE[g].label, count: PRS.filter((p) => gateOf(p) === g).length }))}
        />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Open pull requests" description={`${shown.length} of ${PRS.length}`} flush>
          <DataTable label="Open pull requests" columns={cols} rows={shown} getRowId={(p) => p.id} defaultSort={{ id: "pr", direction: "desc" }} minWidth={900} />
        </Panel>
        <Panel title="Gate results by week">
          <StackedBarChart
            label="Pull request gate results per week"
            categories={weeks}
            segments={[
              { id: "passed", name: "Passed", color: "var(--oa-success)" },
              { id: "warn", name: "Warnings", color: "var(--oa-warning)" },
              { id: "failed", name: "Failed", color: "var(--oa-danger)" },
            ]}
            values={[[21, 3, 1], [18, 2, 2], [24, 4, 0], [19, 1, 3], [26, 2, 1], [22, 3, 2], [9, 1, 2]]}
            height={180}
            xTicks={7}
          />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Findings                                                            */
/* ------------------------------------------------------------------ */

function FindingsPage() {
  const [rows, setRows] = useState(OPEN);
  const [query, setQuery] = useState("");
  const [sevs, setSevs] = useState<string[]>([]);
  const [repos, setRepos] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const shown = rows.filter(
    (r) =>
      (query === "" || `${r.title} ${r.cwe} ${r.rule} ${r.file}`.toLowerCase().includes(query.toLowerCase())) &&
      (sevs.length === 0 || sevs.includes(r.severity)) &&
      (repos.length === 0 || repos.includes(r.repo)) &&
      (statuses.length === 0 || statuses.includes(r.status)),
  );
  const triage = (status: Status | null, verb: string) => {
    setRows((rs) => rs.map((r) => (selected.includes(r.id) ? (status ? { ...r, status } : { ...r, assignee: PEOPLE[1] }) : r)));
    setNotice(`${verb} ${selected.length} ${selected.length === 1 ? "finding" : "findings"}`);
    setSelected([]);
  };
  const cols: Column<OpenFinding>[] = [
    { id: "sev", header: "Severity", width: "96px", sortValue: (r) => SEVERITY_META[r.severity].rank, cell: (r) => <SeverityBadge severity={r.severity} /> },
    {
      id: "title",
      header: "Finding",
      pinned: "left",
      width: "26%",
      sortValue: (r) => r.title,
      cell: (r) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{r.title}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{r.rule}</span>
        </span>
      ),
    },
    { id: "cwe", header: "CWE", mono: true, width: "96px", sortValue: (r) => r.cwe, cell: (r) => r.cwe },
    { id: "repo", header: "Repository", mono: true, sortValue: (r) => r.repo, cell: (r) => r.repo },
    { id: "file", header: "File", mono: true, cell: (r) => <span className="truncate text-xs">{r.file}:{r.line}</span> },
    { id: "age", header: "Age", align: "right", description: "Days since the finding first appeared on the default branch.", sortValue: (r) => r.age, cell: (r) => <span className={cn("font-mono", r.age > 90 && "text-danger-text")}>{r.age} d</span> },
    {
      id: "status",
      header: "Status",
      sortValue: (r) => r.status,
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          <StatusBadge tone={STATUS_META[r.status].tone}>{STATUS_META[r.status].label}</StatusBadge>
          {r.assignee && <Avatar name={r.assignee} size="sm" />}
        </span>
      ),
    },
  ];
  const cweCounts = Object.entries(rows.reduce<Record<string, number>>((a, r) => ((a[r.cwe] = (a[r.cwe] ?? 0) + 1), a), {})).sort((a, b) => b[1] - a[1]);
  const count = (s: Severity) => rows.filter((r) => r.severity === s && r.status !== "false-positive").length;
  return (
    <>
      <PageHeader title="Findings" description="Open findings on default branches of every repository. Triage here; PR findings live on each pull request." actions={<Button icon={<ListChecks />}>Export SARIF</Button>} />
      <KpiGrid>
        <KpiCard label="Critical" value={count("critical")} tone="critical" delta={{ label: "SLA 7 days" }} />
        <KpiCard label="High" value={count("high")} tone="danger" delta={{ label: "1 past SLA", intent: "bad" }} />
        <KpiCard label="Medium and low" value={count("medium") + count("low")} />
        <KpiCard label="Mean time to fix" value="12" unit="days" trend={[19, 18, 16, 17, 15, 14, 12]} delta={{ label: "−3 d vs. last month", direction: "down", intent: "good" }} />
      </KpiGrid>
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <FilterBar onClear={query || sevs.length || repos.length || statuses.length ? () => (setQuery(""), setSevs([]), setRepos([]), setStatuses([])) : undefined}>
        <SearchInput label="Search findings" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        <FacetFilter label="Severity" selected={sevs} onChange={setSevs} options={(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => ({ value: s, label: SEVERITY_META[s].label, count: rows.filter((r) => r.severity === s).length }))} />
        <FacetFilter label="Repository" searchable selected={repos} onChange={setRepos} options={[...new Set(rows.map((r) => r.repo))].map((r) => ({ value: r, count: rows.filter((x) => x.repo === r).length }))} />
        <FacetFilter label="Status" selected={statuses} onChange={setStatuses} options={(Object.keys(STATUS_META) as Status[]).map((s) => ({ value: s, label: STATUS_META[s].label, count: rows.filter((r) => r.status === s).length }))} />
      </FilterBar>
      {selected.length > 0 && (
        <div role="toolbar" aria-label="Triage actions" className="flex flex-wrap items-center gap-2 rounded-lg border border-accent bg-accent-soft px-3 py-1.5 text-sm">
          <span className="font-medium">{selected.length} selected</span>
          <Button size="sm" onClick={() => triage(null, "Assigned to Emily Clark:")}>
            Assign to me
          </Button>
          <Button size="sm" onClick={() => triage("fixing", "Marked in progress:")}>
            Start fix
          </Button>
          <Button size="sm" onClick={() => triage("accepted", "Accepted risk for")}>
            Accept risk
          </Button>
          <Button size="sm" onClick={() => triage("false-positive", "Marked as false positive:")}>
            Mark false positive
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected([])}>
            Clear selection
          </Button>
        </div>
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Open findings" description={`${shown.length} of ${rows.length}`} flush>
          <DataTable label="Open findings" columns={cols} rows={shown} getRowId={(r) => r.id} selectable selectedIds={selected} onSelectionChange={setSelected} defaultSort={{ id: "sev", direction: "desc" }} pageSize={10} minWidth={1000} />
        </Panel>
        <Panel title="Top weaknesses">
          <BarList label="Open findings by CWE" items={cweCounts.slice(0, 8).map(([cwe, n]) => ({ id: cwe, label: cwe, value: n, href: "#cwe" }))} />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Repositories                                                        */
/* ------------------------------------------------------------------ */

const SEV4: Severity[] = ["critical", "high", "medium", "low"];

function ReposPage() {
  const [active, setActive] = useState(REPOS[0]!.id);
  const [lang, setLang] = useState<string[]>([]);
  const [scanned, setScanned] = useState("");
  const r = REPOS.find((x) => x.id === active)!;
  const shown = REPOS.filter((x) => lang.length === 0 || lang.includes(x.language));
  const cols: Column<Repo>[] = [
    { id: "name", header: "Repository", pinned: "left", width: "22%", sortValue: (x) => x.name, cell: (x) => <span className="font-mono text-xs font-medium">{x.name}</span> },
    { id: "lang", header: "Language", sortValue: (x) => x.language, cell: (x) => <Badge variant="outline">{x.language}</Badge> },
    { id: "scan", header: "Last scan", cell: (x) => <span className="text-fg-muted">{x.lastScan}</span> },
    {
      id: "open",
      header: "Open by severity",
      label: "Open by severity",
      description: "Critical, high, medium, low on the default branch.",
      sortValue: (x) => x.open[0] * 1000 + x.open[1] * 100 + x.open[2] * 10 + x.open[3],
      cell: (x) => (
        <span className="flex gap-1">
          {SEV4.map((s, i) => (
            <Badge key={s} tone={x.open[i] ? SEVERITY_META[s].tone : "neutral"} mono title={SEVERITY_META[s].label}>
              <span className="sr-only">{SEVERITY_META[s].label} </span>
              {x.open[i]}
            </Badge>
          ))}
        </span>
      ),
    },
    { id: "gate", header: "Gate", sortValue: (x) => x.gate, cell: (x) => <StatusBadge tone={GATE[x.gate].tone}>{GATE[x.gate].label}</StatusBadge> },
    {
      id: "packs",
      header: "Rule packs",
      description: "Packs that apply to this repository's languages.",
      sortValue: (x) => x.packs.length,
      cell: (x) => (
        <span className="font-mono text-xs">
          {x.packs.length}/{PACKS.length}
        </span>
      ),
    },
  ];
  const trendLabels = ["Jul 27", "Aug 3", "Aug 10", "Aug 17", "Aug 24", "Aug 31", "Sep 7", "Sep 14", "Sep 21", "Sep 28", "Oct 5", "Oct 12"];
  const seed = Number(r.id.slice(1));
  return (
    <>
      <PageHeader title="Repositories" description="Showing the 10 most active of 23 connected repositories. Default branches are scanned nightly and on every push." actions={<Button variant="primary" icon={<Plus />}>Connect repository</Button>} />
      <FilterBar onClear={lang.length ? () => setLang([]) : undefined}>
        <SearchInput label="Search repositories" className="w-56" />
        <FacetFilter label="Language" selected={lang} onChange={setLang} options={[...new Set(REPOS.map((x) => x.language))].map((l) => ({ value: l, count: REPOS.filter((x) => x.language === l).length }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Repositories" flush>
          <DataTable label="Repositories" columns={cols} rows={shown} getRowId={(x) => x.id} onRowClick={(x) => (setActive(x.id), setScanned(""))} activeRowId={active} minWidth={820} />
        </Panel>
        <Panel
          aria-label="Repository detail"
          title={<span className="font-mono">{r.name}</span>}
          description={`${r.language} · ${r.loc} lines · last scan ${r.lastScan}`}
          actions={
            <Button size="sm" icon={<ScanSearch />} onClick={() => setScanned(`Full scan of ${r.name} queued`)}>
              Scan now
            </Button>
          }
        >
          <div className="flex flex-col gap-3">
            {scanned && (
              <p role="status" className="text-xs text-success">
                {scanned}
              </p>
            )}
            <TimeSeriesChart
              label={`Open findings in ${r.name} over 12 weeks`}
              labels={trendLabels}
              stacked
              height={150}
              series={[
                { id: "high", name: "High and critical", color: "var(--oa-danger)", data: wave(12, { base: r.open[0] + r.open[1] + 1, amp: 1, seed: seed + 3 }).map(Math.round) },
                { id: "medium", name: "Medium", color: "var(--oa-warning)", data: wave(12, { base: r.open[2] + 2, amp: 1.5, seed: seed + 5 }).map(Math.round) },
                { id: "low", name: "Low", data: wave(12, { base: r.open[3] + 2, amp: 2, seed: seed + 7 }).map(Math.round) },
              ]}
            />
            <div className="flex flex-col gap-1">
              <h3 className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Rule pack coverage</h3>
              <ul className="flex flex-wrap gap-1">
                {PACKS.map((p) => {
                  const on = r.packs.includes(p.id);
                  return (
                    <li key={p.id}>
                      <Badge tone={on ? "success" : "neutral"} variant={on ? "soft" : "outline"}>
                        {on ? "" : "Not applied: "}
                        {p.name}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <dt className="text-2xs text-fg-muted">Default branch</dt>
                <dd className="font-mono text-xs">main</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Scan trigger</dt>
                <dd>Push and nightly 02:00</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Owners</dt>
                <dd>{PEOPLE[seed % PEOPLE.length]}</dd>
              </div>
              <div>
                <dt className="text-2xs text-fg-muted">Gate</dt>
                <dd>
                  <StatusBadge tone={GATE[r.gate].tone}>{GATE[r.gate].label}</StatusBadge>
                </dd>
              </div>
            </dl>
          </div>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Rules                                                               */
/* ------------------------------------------------------------------ */

const DEFAULT_RULE = `rules:
  - id: acme.go.sql-string-concat
    languages: [go]
    severity: ERROR
    message: >
      SQL built with string concatenation. Pass values
      as query arguments ($1, $2) instead.
    metadata:
      cwe: "CWE-89"
      owner: appsec@example.com
    patterns:
      - pattern-either:
          - pattern: $DB.Query("..." + $X, ...)
          - pattern: $DB.Exec("..." + $X, ...)
      - pattern-not: $DB.Query("...", ...)`;

const DEFAULT_SAMPLE = `func list(db *sql.DB, team string) {
	db.Query("SELECT * FROM users WHERE team = '" + team + "'")
	db.Query("SELECT * FROM users WHERE team = $1", team)
	db.Exec("DELETE FROM sessions WHERE user = " + id)
}`;

type Match = { line: number; text: string };

function RulesPage() {
  const [packs, setPacks] = useState(PACKS);
  const [tab, setTab] = useState<"packs" | "editor">("packs");
  const [yaml, setYaml] = useState(DEFAULT_RULE);
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const [result, setResult] = useState<{ error?: string; matches: Match[] } | null>(null);
  const enabled = packs.filter((p) => p.enabled);
  const test = () => {
    if (!/^\s*-?\s*pattern/m.test(yaml)) {
      setResult({ error: "The rule has no pattern, patterns or pattern-either key.", matches: [] });
      return;
    }
    const matches = sample
      .split("\n")
      .map((text, i) => ({ line: i + 1, text: text.trim() }))
      .filter((l) => /\.(Query|Exec)\("[^"]*"\s*\+/.test(l.text));
    setResult({ matches });
  };
  return (
    <>
      <PageHeader title="Rules" description="Semgrep CE and gosec rule packs, plus rules your team writes." meta={<Badge>{enabled.reduce((a, p) => a + p.rules, 0).toLocaleString("en-US")} active rules</Badge>}>
        <Tabs
          label="Rules view"
          value={tab}
          onChange={setTab}
          items={[
            { value: "packs", label: "Rule packs", count: packs.length },
            { value: "editor", label: "Custom rule editor" },
          ]}
        />
      </PageHeader>
      {tab === "packs" ? (
        <>
          <KpiGrid>
            <KpiCard label="Packs enabled" value={`${enabled.length} of ${packs.length}`} />
            <KpiCard label="Active rules" value={enabled.reduce((a, p) => a + p.rules, 0).toLocaleString("en-US")} />
            <KpiCard label="Custom rules" value="11" unit="acme/sast-rules" />
            <KpiCard label="Noisiest rule · 30 d" value="18%" unit="false positives" tone="warning" delta={{ label: "gosec.G104" }} />
          </KpiGrid>
          <Panel title="Rule packs" description="Turning a pack off stops new findings from it; existing ones stay until closed." flush>
            <ul className="flex flex-col">
              {packs.map((p) => (
                <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-subtle px-3 py-2 last:border-0 md:grid-cols-[minmax(0,1fr)_180px_90px_auto]">
                  <Switch
                    checked={p.enabled}
                    onCheckedChange={(v) => setPacks((ps) => ps.map((x) => (x.id === p.id ? { ...x, enabled: v } : x)))}
                    label={p.name}
                    description={<span className="font-mono">{p.source}</span>}
                    className="flex-row-reverse justify-end"
                  />
                  <span className="hidden text-xs text-fg-muted md:block">Languages: {p.languages}</span>
                  <span className="hidden font-mono text-xs md:block">{p.rules.toLocaleString("en-US")} rules</span>
                  <span className="text-2xs text-fg-muted">Updated {p.updated}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </>
      ) : (
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <Panel title="Rule definition" description="Semgrep YAML · saved to acme/sast-rules on publish">
            <div className="flex flex-col gap-1">
              <label htmlFor="sast-rule-yaml" className="text-xs font-medium text-fg">
                Rule YAML
              </label>
              <textarea
                id="sast-rule-yaml"
                value={yaml}
                onChange={(e) => setYaml(e.target.value)}
                spellCheck={false}
                rows={18}
                className="w-full resize-y rounded-md border border-line-strong bg-subtle p-2 font-mono text-xs text-fg"
              />
            </div>
          </Panel>
          <div className="flex min-w-0 flex-col gap-2.5">
            <Panel
              title="Test against sample"
              footer={
                <span className="flex gap-1.5">
                  <Button size="sm" variant="primary" icon={<FlaskConical />} onClick={test}>
                    Test against sample
                  </Button>
                  <Button size="sm" disabled={!result || !!result.error}>
                    Publish rule
                  </Button>
                </span>
              }
            >
              <div className="flex flex-col gap-1">
                <label htmlFor="sast-rule-sample" className="text-xs font-medium text-fg">
                  Sample code (Go)
                </label>
                <textarea
                  id="sast-rule-sample"
                  value={sample}
                  onChange={(e) => setSample(e.target.value)}
                  spellCheck={false}
                  rows={7}
                  className="w-full resize-y rounded-md border border-line-strong bg-subtle p-2 font-mono text-xs text-fg"
                />
              </div>
            </Panel>
            <Panel title="Results" aria-label="Test results">
              {!result ? (
                <p className="text-sm text-fg-muted">Run the test to see which lines the rule matches.</p>
              ) : result.error ? (
                <Callout tone="danger" title="Rule is not valid">
                  {result.error}
                </Callout>
              ) : (
                <div className="flex flex-col gap-2 text-sm">
                  <p role="status" className="font-medium">
                    {result.matches.length} {result.matches.length === 1 ? "match" : "matches"} · 0 parse errors · 4 ms
                  </p>
                  <ul className="flex flex-col gap-1">
                    {result.matches.map((m) => (
                      <li key={m.line} className="flex min-w-0 items-center gap-2 rounded-md border border-line bg-danger-soft px-2 py-1">
                        <span className="w-12 shrink-0 font-mono text-2xs text-fg-muted">line {m.line}</span>
                        <code className="truncate font-mono text-xs text-fg">{m.text}</code>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

const THRESHOLDS: Record<string, Severity[]> = {
  critical: ["critical"],
  high: ["critical", "high"],
  medium: ["critical", "high", "medium"],
};

function PoliciesPage() {
  const [threshold, setThreshold] = useState("high");
  const [newOnly, setNewOnly] = useState(true);
  const [dast, setDast] = useState(true);
  const [summary, setSummary] = useState(true);
  const [inline, setInline] = useState(true);
  const [paths, setPaths] = useState(["**/vendor/**", "**/*_test.go", "**/node_modules/**", "docs/**"]);
  const [draft, setDraft] = useState("");
  const [saved, setSaved] = useState(false);
  const blocked = PRS.filter((p) => !p.scanning && newOf(p).some((f) => THRESHOLDS[threshold]!.includes(f.severity))).length;
  const add = () => {
    const v = draft.trim();
    if (v && !paths.includes(v)) setPaths((ps) => [...ps, v]);
    setDraft("");
  };
  return (
    <>
      <PageHeader title="Policies" description="When a pull request is blocked, what gets posted on it, what is not scanned, and how fast findings must be fixed." />
      {saved && <Callout tone="success" title="Policy saved" onDismiss={() => setSaved(false)}>Applies to the next scan of every repository.</Callout>}
      <form
        className="flex flex-col gap-2.5"
        onSubmit={(e) => {
          e.preventDefault();
          setSaved(true);
        }}
      >
        <div className="grid gap-2.5 xl:grid-cols-2">
          <Panel title="Merge gate">
            <div className="flex flex-col gap-3">
              <SelectField
                label="Block merge on"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
                options={[
                  { value: "critical", label: "New critical findings" },
                  { value: "high", label: "New high or critical findings" },
                  { value: "medium", label: "New medium or worse findings" },
                ]}
              />
              <Switch checked={newOnly} onCheckedChange={setNewOnly} label="Only count findings on changed lines" description="Existing findings never block a pull request." />
              <Switch checked={dast} onCheckedChange={setDast} label="Always block when DAST confirms a finding" description="Even if it is below the threshold." />
              <Callout tone={blocked ? "warning" : "info"} title={`${blocked} of ${PRS.length} open pull requests would be blocked`}>
                Preview against the current scan results.
              </Callout>
            </div>
          </Panel>
          <Panel title="Pull request comments">
            <div className="flex flex-col gap-3">
              <Switch checked={summary} onCheckedChange={setSummary} label="Post a summary comment" description="One comment per PR, updated on every push." />
              <Switch checked={inline} onCheckedChange={setInline} label="Inline comments on changed lines" description="With the suggested fix when one exists." />
              <SelectField
                label="Comment as"
                defaultValue="app"
                options={[
                  { value: "app", label: "OpenAsy GitHub App" },
                  { value: "bot", label: "acme-security-bot" },
                ]}
              />
              <Checkbox label="Mention the code owner on high findings" defaultChecked />
              <Checkbox label="Resolve comments when the finding is fixed" defaultChecked />
            </div>
          </Panel>
        </div>
        <div className="grid gap-2.5 xl:grid-cols-2">
          <Panel title="Path exclusions" description="Glob patterns that are never scanned.">
            <div className="flex flex-col gap-2">
              <ul aria-label="Excluded paths" className="flex flex-col">
                {paths.map((p) => (
                  <li key={p} className="flex items-center justify-between gap-2 border-b border-subtle py-1 last:border-0">
                    <code className="font-mono text-xs">{p}</code>
                    <IconButton label={`Remove ${p}`} size="xs" onClick={() => setPaths((ps) => ps.filter((x) => x !== p))}>
                      <Trash2 />
                    </IconButton>
                  </li>
                ))}
              </ul>
              <div className="flex items-end gap-2">
                <TextField
                  label="Add path exclusion"
                  mono
                  value={draft}
                  placeholder="**/testdata/**"
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      add();
                    }
                  }}
                  className="grow"
                />
                <Button icon={<Plus />} onClick={add}>
                  Add exclusion
                </Button>
              </div>
            </div>
          </Panel>
          <Panel title="Fix SLA" description="Days to fix after a finding reaches the default branch. Breaches open a ticket.">
            <table className="w-full text-sm">
              <caption className="sr-only">Fix SLA by severity</caption>
              <thead>
                <tr className="text-left text-2xs tracking-wider text-fg-muted uppercase">
                  <th className="py-1 font-medium">Severity</th>
                  <th className="py-1 font-medium">Days to fix</th>
                  <th className="py-1 text-right font-medium">Past SLA now</th>
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["critical", 7, 1],
                    ["high", 30, 2],
                    ["medium", 90, 1],
                    ["low", 180, 1],
                  ] as const
                ).map(([s, d, past]) => (
                  <tr key={s} className="border-t border-subtle">
                    <td className="py-1.5">
                      <SeverityBadge severity={s} />
                    </td>
                    <td className="py-1.5">
                      <label className="sr-only" htmlFor={`sla-${s}`}>
                        {SEVERITY_META[s].label} SLA in days
                      </label>
                      <input id={`sla-${s}`} type="number" min={1} defaultValue={d} className="h-7 w-20 rounded-md border border-line-strong bg-surface px-2 font-mono text-sm text-fg" />
                    </td>
                    <td className={cn("py-1.5 text-right font-mono", past ? "text-danger-text" : "text-fg-muted")}>{past}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" variant="primary">
            Save policy
          </Button>
          <span className="text-xs text-fg-muted">Changes are recorded in the audit log.</span>
        </div>
      </form>
    </>
  );
}

const PAGES = {
  prs: () => <PullRequestsPage />,
  findings: () => <FindingsPage />,
  repos: () => <ReposPage />,
  rules: () => <RulesPage />,
  policies: () => <PoliciesPage />,
};

const app = (initial: string, pages: PageMap = PAGES): Story => ({
  render: () => <ProductApp product="sast" nav={nav} pages={pages} initial={initial} />,
});

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const PullRequests: Story = {
  name: "Pull requests",
  ...app("prs"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = within(c.getByRole("table", { name: "Open pull requests" }));
    await expect(table.getAllByRole("button", { name: /^#\d+ / })).toHaveLength(7);
    await userEvent.click(table.getByRole("button", { name: "#482 Add order search endpoint" }));
    await expect(c.getByRole("heading", { level: 1, name: "#482 Add order search endpoint" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "All pull requests" }));
    await expect(c.getByRole("heading", { level: 1, name: "Pull requests" })).toBeInTheDocument();
  },
};

/** PR #482: what this change introduced, with flow, code, a suggested fix and a DAST cross-check. */
export const PullRequest: Story = {
  ...app("prs", { ...PAGES, prs: () => <PullRequestsPage initialOpen="482" /> }),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "#482 Add order search endpoint" })).toBeInTheDocument();
    const detail = () => within(c.getByRole("region", { name: "Finding detail" }));
    await expect(detail().getByRole("heading", { name: /CWE-89 SQL injection/ })).toBeInTheDocument();
    await expect(detail().getByText("Confirmed by DAST on staging")).toBeInTheDocument();
    await expect(detail().getByRole("button", { name: "Commit suggestion" })).toBeInTheDocument();
    await expect(canvasElement.querySelectorAll("[data-hot]")).toHaveLength(1);

    const list = within(c.getByRole("list", { name: "Findings in this pull request" }));
    await userEvent.click(list.getByRole("button", { name: /Path traversal/ }));
    await expect(list.getByRole("button", { name: /Path traversal/ })).toHaveAttribute("aria-current", "true");
    await expect(detail().getByRole("heading", { name: /CWE-22 Path traversal/ })).toBeInTheDocument();
    await expect(detail().queryByText("Confirmed by DAST on staging")).not.toBeInTheDocument();

    await userEvent.click(list.getByRole("button", { name: /Database error/ }));
    await expect(detail().getByRole("heading", { name: /CWE-209/ })).toBeInTheDocument();
    await expect(detail().queryByRole("button", { name: "Commit suggestion" })).not.toBeInTheDocument();
  },
};

export const Findings: Story = {
  ...app("findings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getAllByRole("button", { name: "Severity" }).find((b) => b.hasAttribute("aria-haspopup"))!);
    await userEvent.click(body.getByRole("checkbox", { name: /^Critical/ }));
    await userEvent.keyboard("{Escape}");
    const table = c.getByRole("table", { name: "Open findings" });
    await expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    await userEvent.click(c.getByRole("checkbox", { name: "Select row o2" }));
    await userEvent.click(within(c.getByRole("toolbar", { name: "Triage actions" })).getByRole("button", { name: "Mark false positive" }));
    await expect(c.getByText("Marked as false positive: 1 finding")).toBeInTheDocument();
  },
};

export const Repositories: Story = {
  ...app("repos"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Repositories" })).getByText("acme/billing-worker"));
    const detail = within(c.getByRole("region", { name: "Repository detail" }));
    await expect(detail.getByText(/Python · 23k lines/)).toBeInTheDocument();
    await userEvent.click(detail.getByRole("button", { name: "Scan now" }));
    await expect(detail.getByRole("status")).toHaveTextContent("Full scan of acme/billing-worker queued");
  },
};

export const Rules: Story = {
  ...app("rules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("8 of 9")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Terraform" }));
    await expect(c.getByText("9 of 9")).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /Custom rule editor/ }));
    await expect(c.getByLabelText("Rule YAML")).toHaveValue(DEFAULT_RULE);
    await userEvent.click(c.getByRole("button", { name: "Test against sample" }));
    await expect(within(c.getByRole("region", { name: "Test results" })).getByRole("status")).toHaveTextContent("2 matches");
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("2 of 7 open pull requests would be blocked")).toBeInTheDocument();
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Block merge on" }), "medium");
    await expect(c.getByText("3 of 7 open pull requests would be blocked")).toBeInTheDocument();
    await userEvent.type(c.getByRole("textbox", { name: "Add path exclusion" }), "**/testdata/**");
    await userEvent.click(c.getByRole("button", { name: "Add exclusion" }));
    await expect(within(c.getByRole("list", { name: "Excluded paths" })).getByText("**/testdata/**")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Save policy" }));
    await expect(c.getByText("Policy saved")).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
