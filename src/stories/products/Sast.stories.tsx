import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowRight, BookOpen, Bug, CircleSlash, Clock, Code2, FolderGit2, GitBranch, GitCommitHorizontal, GitPullRequest, ListChecks, ScanSearch, Settings2 } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Panel } from "../../components/Panel";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { cn } from "../../lib/cn";
import type { Severity } from "../../tokens/levels";

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

const STATE_TONE = { new: "danger", fixed: "success", existing: "neutral" } as const;

/** PR #482: what this change introduced, with flow, code, a suggested fix and a DAST cross-check. */
export const PullRequest: Story = {
  render: () => {
    const [sel, setSel] = useState("f1");
    const f = findings.find((x) => x.id === sel) ?? findings[0]!;
    return (
      <ProductFrame product="sast" nav={nav} active="prs">
        <PageHeader
          breadcrumbs={[{ label: "Pull requests", href: "#prs" }, { label: "acme/orders-api" }]}
          title="#482 Add order search endpoint"
          meta={<StatusBadge tone="danger">Gate failed · 2 new high</StatusBadge>}
          actions={
            <>
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
              feat/order-search → main
            </Badge>
            <Badge icon={<Clock aria-hidden className="size-3" />}>Scanned 2 min ago · 41 s</Badge>
            <Badge icon={<Code2 aria-hidden className="size-3" />}>Semgrep CE + gosec</Badge>
            <Badge tone="danger">3 new</Badge>
            <Badge tone="success">1 fixed</Badge>
            <Badge>14 existing</Badge>
            <EntityChip kind="user" value="mert.yildiz" href="#user" />
          </div>
        </PageHeader>
        <div className="grid gap-2.5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Panel title="Findings in this PR" description="Only lines changed by #482" flush className="self-start">
            <ul aria-label="Findings in this pull request" className="flex flex-col p-1">
              {findings.map((x) => {
                const on = x.id === sel;
                return (
                  <li key={x.id}>
                    <button
                      type="button"
                      aria-current={on ? "true" : undefined}
                      onClick={() => setSel(x.id)}
                      className={cn(
                        "flex w-full flex-col gap-1 rounded-md px-2 py-1.5 text-left hover:bg-subtle",
                        on && "bg-accent-soft hover:bg-accent-soft",
                      )}
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
                    <div
                      key={l.n}
                      data-hot={l.hot || undefined}
                      className={cn("flex border-l-2 pr-3", l.hot ? "border-danger bg-danger-soft" : "border-transparent")}
                    >
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
      </ProductFrame>
    );
  },
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
