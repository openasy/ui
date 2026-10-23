#!/usr/bin/env node
// Turns Vitest's JSON report and the coverage summary into reports/summary.json,
// which the "Quality/Test results" page in Storybook reads at runtime.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const resultsPath = path.join(root, "reports/tests/results.json");
const coveragePath = path.join(root, "reports/coverage/coverage-summary.json");
const outPath = path.join(root, "reports/summary.json");

if (!existsSync(resultsPath)) {
  console.error(`No test results at ${path.relative(root, resultsPath)}. Run "npm run test:ci" first.`);
  process.exit(1);
}

const results = JSON.parse(readFileSync(resultsPath, "utf8"));
// Slim the published JSON: the coverage map lives in the coverage report, and story tests embed the
// full axe report (about 1 MB per story) in `meta`; the HTML test report keeps the details.
delete results.coverageMap;
for (const file of results.testResults) for (const t of file.assertionResults ?? []) delete t.meta;
writeFileSync(resultsPath, JSON.stringify(results));
const coverage = existsSync(coveragePath) ? JSON.parse(readFileSync(coveragePath, "utf8")) : null;

const rel = (f) => path.relative(root, f).split(path.sep).join("/");
const projectOf = (file) => (file.includes(".stories.") ? "storybook" : "unit");

const files = results.testResults.map((r) => {
  const tests = r.assertionResults ?? [];
  const count = (s) => tests.filter((t) => t.status === s).length;
  return {
    file: rel(r.name),
    project: projectOf(r.name),
    status: r.status,
    tests: tests.length,
    passed: count("passed"),
    failed: count("failed"),
    skipped: count("skipped") + count("pending") + count("todo"),
    durationMs: Math.max(0, (r.endTime ?? 0) - (r.startTime ?? 0)),
    failures: tests
      .filter((t) => t.status === "failed")
      .map((t) => ({ title: [...(t.ancestorTitles ?? []), t.title].join(" › "), message: (t.failureMessages ?? []).join("\n").slice(0, 2000) })),
  };
});

const byProject = {};
for (const f of files) {
  const p = (byProject[f.project] ??= { files: 0, tests: 0, passed: 0, failed: 0, skipped: 0 });
  p.files += 1;
  p.tests += f.tests;
  p.passed += f.passed;
  p.failed += f.failed;
  p.skipped += f.skipped;
}

let commit = process.env.GITHUB_SHA ?? null;
if (!commit) {
  try {
    commit = execSync("git rev-parse HEAD", { cwd: root, stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    commit = null;
  }
}

const pct = (k) => (coverage?.total?.[k] ? { pct: coverage.total[k].pct, covered: coverage.total[k].covered, total: coverage.total[k].total } : null);

const coverageFiles = coverage
  ? Object.entries(coverage)
      .filter(([k]) => k !== "total")
      .map(([file, v]) => ({ file: rel(file), lines: v.lines.pct, branches: v.branches.pct, functions: v.functions.pct, statements: v.statements.pct }))
      .sort((a, b) => a.file.localeCompare(b.file))
  : [];

const summary = {
  generatedAt: new Date().toISOString(),
  commit,
  runUrl:
    process.env.GITHUB_SERVER_URL && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null,
  success: results.success,
  totals: {
    files: files.length,
    tests: results.numTotalTests,
    passed: results.numPassedTests,
    failed: results.numFailedTests,
    skipped: (results.numPendingTests ?? 0) + (results.numTodoTests ?? 0),
    durationMs: files.reduce((a, f) => a + f.durationMs, 0),
  },
  byProject,
  coverage: coverage ? { lines: pct("lines"), statements: pct("statements"), functions: pct("functions"), branches: pct("branches") } : null,
  coverageFiles,
  files: files.sort((a, b) => a.file.localeCompare(b.file)),
};

mkdirSync(path.dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(summary, null, 2));
console.log(
  `Wrote ${rel(outPath)}: ${summary.totals.passed}/${summary.totals.tests} tests passed` +
    (summary.coverage?.lines ? `, ${summary.coverage.lines.pct}% lines covered` : ""),
);
