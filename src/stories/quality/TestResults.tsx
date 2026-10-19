import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Callout } from "../../components/Callout";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { BarList } from "../../charts/BarList";
import { Tabs } from "../../components/Tabs";

export interface Metric {
  pct: number;
  covered: number;
  total: number;
}

export interface FileResult {
  file: string;
  project: "unit" | "storybook";
  status: string;
  tests: number;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  failures: Array<{ title: string; message: string }>;
}

export interface Summary {
  generatedAt: string;
  commit: string | null;
  runUrl: string | null;
  success: boolean;
  totals: { files: number; tests: number; passed: number; failed: number; skipped: number; durationMs: number };
  byProject: Record<string, { files: number; tests: number; passed: number; failed: number; skipped: number }>;
  coverage: { lines: Metric | null; statements: Metric | null; functions: Metric | null; branches: Metric | null } | null;
  coverageFiles: Array<{ file: string; lines: number; branches: number; functions: number; statements: number }>;
  files: FileResult[];
}

const THRESHOLDS = { statements: 90, branches: 85, functions: 90, lines: 90 } as const;

const fileColumns: Column<FileResult>[] = [
  { id: "file", header: "File", sortValue: (f) => f.file, cell: (f) => <span className="font-mono text-xs">{f.file}</span>, width: "48%" },
  { id: "project", header: "Project", sortValue: (f) => f.project, cell: (f) => <Badge tone={f.project === "unit" ? "neutral" : "info"}>{f.project === "unit" ? "Unit · jsdom" : "Story · Chromium"}</Badge> },
  { id: "tests", header: "Tests", align: "right", mono: true, sortValue: (f) => f.tests, cell: (f) => f.tests },
  { id: "failed", header: "Failed", align: "right", mono: true, sortValue: (f) => f.failed, cell: (f) => (f.failed ? <span className="font-semibold text-danger-text">{f.failed}</span> : "0") },
  { id: "time", header: "Time", align: "right", mono: true, sortValue: (f) => f.durationMs, cell: (f) => `${(f.durationMs / 1000).toFixed(2)} s` },
  { id: "status", header: "Status", cell: (f) => <StatusBadge tone={f.failed ? "danger" : "success"}>{f.failed ? "Failing" : "Passing"}</StatusBadge> },
];

export function TestResultsView({ summary, base = "reports" }: { summary: Summary; base?: string }) {
  const [project, setProject] = useState<"all" | "unit" | "storybook">("all");
  const t = summary.totals;
  const cov = summary.coverage;
  const failures = summary.files.flatMap((f) => f.failures.map((x) => ({ ...x, file: f.file })));
  const rows = project === "all" ? summary.files : summary.files.filter((f) => f.project === project);
  const metric = (k: keyof typeof THRESHOLDS) => cov?.[k] ?? null;
  return (
    <div className="flex flex-col gap-3 p-4">
      <PageHeader
        title="Test results"
        description={
          <>
            Generated {new Date(summary.generatedAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC
            {summary.commit && (
              <>
                {" "}
                · commit <span className="font-mono">{summary.commit.slice(0, 7)}</span>
              </>
            )}
          </>
        }
        meta={<StatusBadge tone={summary.success ? "success" : "danger"}>{summary.success ? "All passing" : `${t.failed} failing`}</StatusBadge>}
        actions={
          <>
            <a className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg no-underline hover:bg-subtle" href={`${base}/tests/index.html`} target="_blank" rel="noreferrer">
              Full test report <ExternalLink aria-hidden className="size-3.5" />
            </a>
            <a className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg no-underline hover:bg-subtle" href={`${base}/coverage/index.html`} target="_blank" rel="noreferrer">
              Coverage report <ExternalLink aria-hidden className="size-3.5" />
            </a>
            {summary.runUrl && (
              <a className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-sm font-medium text-fg no-underline hover:bg-subtle" href={summary.runUrl} target="_blank" rel="noreferrer">
                CI run <ExternalLink aria-hidden className="size-3.5" />
              </a>
            )}
          </>
        }
      />
      <KpiGrid>
        <KpiCard label="Tests passed" value={`${t.passed}/${t.tests}`} tone={t.failed ? "danger" : "success"} delta={{ label: `${t.files} files · ${(t.durationMs / 1000).toFixed(1)} s` }} />
        <KpiCard label="Unit tests · jsdom" value={summary.byProject.unit?.passed ?? 0} unit={`of ${summary.byProject.unit?.tests ?? 0}`} delta={{ label: `${summary.byProject.unit?.files ?? 0} files` }} />
        <KpiCard label="Story tests · Chromium" value={summary.byProject.storybook?.passed ?? 0} unit={`of ${summary.byProject.storybook?.tests ?? 0}`} delta={{ label: "interaction + accessibility" }} />
        <KpiCard
          label="Line coverage"
          value={metric("lines") ? `${metric("lines")!.pct}%` : "–"}
          tone={metric("lines") && metric("lines")!.pct >= THRESHOLDS.lines ? "success" : "warning"}
          delta={{ label: `threshold ${THRESHOLDS.lines}%` }}
        />
      </KpiGrid>
      {failures.length > 0 && (
        <div className="flex flex-col gap-2">
          {failures.map((f, i) => (
            <Callout key={i} tone="danger" title={f.title}>
              <span className="font-mono text-xs">{f.file}</span>
              <pre tabIndex={0} aria-label={`Failure output for ${f.title}`} className="mt-1 max-h-40 overflow-auto font-mono text-2xs whitespace-pre-wrap text-fg">{f.message}</pre>
            </Callout>
          ))}
        </div>
      )}
      <div className="grid gap-2.5 lg:grid-cols-[1fr_2fr]">
        <Panel title="Coverage" description="Library source, stories excluded">
          {cov ? (
            <BarList
              label="Coverage by metric"
              max={100}
              format={(v) => `${v}%`}
              items={(Object.keys(THRESHOLDS) as Array<keyof typeof THRESHOLDS>).map((k) => ({
                id: k,
                label: `${k} (≥${THRESHOLDS[k]}%)`,
                value: metric(k)?.pct ?? 0,
                color: (metric(k)?.pct ?? 0) >= THRESHOLDS[k] ? "var(--oa-success)" : "var(--oa-warning)",
              }))}
            />
          ) : (
            <p className="text-sm text-fg-muted">No coverage data in this run.</p>
          )}
        </Panel>
        <Panel title="Coverage by file" flush>
          <DataTable
            label="Coverage by file"
            rows={summary.coverageFiles}
            getRowId={(r) => r.file}
            minWidth={520}
            defaultSort={{ id: "branches", direction: "asc" }}
            columns={[
              { id: "file", header: "File", sortValue: (r) => r.file, cell: (r) => <span className="font-mono text-xs">{r.file}</span>, width: "52%" },
              { id: "lines", header: "Lines", align: "right", mono: true, sortValue: (r) => r.lines, cell: (r) => `${r.lines}%` },
              { id: "branches", header: "Branches", align: "right", mono: true, sortValue: (r) => r.branches, cell: (r) => `${r.branches}%` },
              { id: "functions", header: "Functions", align: "right", mono: true, sortValue: (r) => r.functions, cell: (r) => `${r.functions}%` },
            ]}
          />
        </Panel>
      </div>
      <Panel
        title="Test files"
        flush
        actions={
          <Tabs
            label="Project"
            value={project}
            onChange={setProject}
            items={[
              { value: "all", label: "All", count: summary.files.length },
              { value: "unit", label: "Unit", count: summary.byProject.unit?.files ?? 0 },
              { value: "storybook", label: "Stories", count: summary.byProject.storybook?.files ?? 0 },
            ]}
          />
        }
      >
        <DataTable label="Test files" columns={fileColumns} rows={rows} getRowId={(f) => f.file} minWidth={720} defaultSort={{ id: "failed", direction: "desc" }} />
      </Panel>
    </div>
  );
}

/** Loads reports/summary.json produced by `npm run test:ci && npm run report`. */
export function LatestTestResults() {
  const [state, setState] = useState<{ status: "loading" } | { status: "missing" } | { status: "ok"; summary: Summary }>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    fetch("reports/summary.json", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((summary: Summary) => alive && setState({ status: "ok", summary }))
      .catch(() => alive && setState({ status: "missing" }));
    return () => {
      alive = false;
    };
  }, []);
  if (state.status === "ok") return <TestResultsView summary={state.summary} />;
  return (
    <div className="flex flex-col gap-3 p-4">
      <PageHeader title="Test results" description="Results of the latest CI run, published with this Storybook." />
      {state.status === "loading" ? (
        <p className="text-sm text-fg-muted">Loading results…</p>
      ) : (
        <Callout tone="info" title="No results published with this build">
          Run <code className="font-mono">npm run test:ci && npm run report</code> before <code className="font-mono">npm run build-storybook</code>. The GitHub Pages workflow does this on every push to main.
        </Callout>
      )}
    </div>
  );
}
