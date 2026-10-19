import { Fragment, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Archive, Camera, Database, FlaskConical, Lock, Play, Plus, RotateCcw, ScrollText, ShieldCheck, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { formatBytes } from "../../lib/format";
import { cn } from "../../lib/cn";
import { TONE_COLORS, type Tone } from "../../tokens/levels";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "jobs", label: "Jobs", icon: Archive, count: 38 },
  { id: "snapshots", label: "Snapshots", icon: Camera },
  { id: "restore-tests", label: "Restore tests", icon: FlaskConical },
  { id: "repositories", label: "Repositories", icon: Database },
  { id: "policies", label: "Policies", icon: ScrollText },
];

const meta = {
  title: "Products/Backups",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

type RunState = "Succeeded" | "Failed" | "Running" | "Warning";
const RUN_TONE: Record<RunState, Tone> = { Succeeded: "success", Failed: "danger", Running: "info", Warning: "warning" };

interface Job {
  id: string;
  name: string;
  engine: "restic" | "Velero";
  source: string;
  sourceKind: "host" | "container";
  schedule: string;
  last: RunState;
  lastAt: string;
  durationMin: number;
  bytes: number;
  next: string;
  repo: string;
  retention: string;
}

const jobs: Job[] = [
  { id: "j1", name: "db-prod-01 · postgres base", engine: "restic", source: "db-prod-01", sourceKind: "host", schedule: "0 */6 * * *", last: "Failed", lastAt: "Today 12:00", durationMin: 3, bytes: 0, next: "18:00", repo: "s3:backups-eu/db", retention: "7 daily · 4 weekly · 12 monthly" },
  { id: "j2", name: "db-prod-02 · postgres base", engine: "restic", source: "db-prod-02", sourceKind: "host", schedule: "30 */6 * * *", last: "Succeeded", lastAt: "Today 12:30", durationMin: 41, bytes: 182e9, next: "18:30", repo: "s3:backups-eu/db", retention: "7 daily · 4 weekly · 12 monthly" },
  { id: "j3", name: "prod cluster · all namespaces", engine: "Velero", source: "k8s-prod", sourceKind: "container", schedule: "0 2 * * *", last: "Succeeded", lastAt: "Today 02:00", durationMin: 26, bytes: 64e9, next: "Tomorrow 02:00", repo: "velero-prod", retention: "14 daily" },
  { id: "j4", name: "payments namespace · hourly", engine: "Velero", source: "k8s-prod/payments", sourceKind: "container", schedule: "15 * * * *", last: "Running", lastAt: "Today 14:15", durationMin: 4, bytes: 3.2e9, next: "15:15", repo: "velero-prod", retention: "48 hourly" },
  { id: "j5", name: "api-prod-01 · /etc and /var/lib", engine: "restic", source: "api-prod-01", sourceKind: "host", schedule: "0 3 * * *", last: "Succeeded", lastAt: "Today 03:00", durationMin: 6, bytes: 2.1e9, next: "Tomorrow 03:00", repo: "s3:backups-eu/hosts", retention: "30 daily" },
  { id: "j6", name: "worker-prod-04 · uploads", engine: "restic", source: "worker-prod-04", sourceKind: "host", schedule: "0 1 * * *", last: "Warning", lastAt: "Today 01:00", durationMin: 58, bytes: 412e9, next: "Tomorrow 01:00", repo: "s3:backups-eu/files", retention: "14 daily · 8 weekly" },
  { id: "j7", name: "edge-fra-02 · nginx config", engine: "restic", source: "edge-fra-02", sourceKind: "host", schedule: "0 4 * * 0", last: "Succeeded", lastAt: "Oct 18 04:00", durationMin: 1, bytes: 18e6, next: "Oct 25 04:00", repo: "s3:backups-eu/hosts", retention: "12 weekly" },
  { id: "j8", name: "staging cluster · nightly", engine: "Velero", source: "k8s-staging", sourceKind: "container", schedule: "0 23 * * *", last: "Succeeded", lastAt: "Oct 18 23:00", durationMin: 14, bytes: 21e9, next: "Today 23:00", repo: "velero-staging", retention: "7 daily" },
];

const columns: Column<Job>[] = [
  {
    id: "name",
    header: "Job",
    width: "26%",
    pinned: "left",
    sortValue: (j) => j.name,
    cell: (j) => <span className="block truncate font-medium">{j.name}</span>,
  },
  { id: "engine", header: "Engine", sortValue: (j) => j.engine, cell: (j) => <Badge mono>{j.engine}</Badge> },
  { id: "source", header: "Source", cell: (j) => <EntityChip kind={j.sourceKind} value={j.source} hideKind /> },
  { id: "schedule", header: "Schedule", mono: true, description: "Cron expression in the agent's local time zone.", cell: (j) => j.schedule },
  { id: "last", header: "Last run", sortValue: (j) => j.last, cell: (j) => <StatusBadge tone={RUN_TONE[j.last]}>{j.last}</StatusBadge> },
  { id: "duration", header: "Duration", align: "right", mono: true, sortValue: (j) => j.durationMin, cell: (j) => `${j.durationMin} m` },
  { id: "size", header: "Size", align: "right", mono: true, description: "Data added to the repository by the last run, after deduplication.", sortValue: (j) => j.bytes, cell: (j) => (j.bytes ? formatBytes(j.bytes) : "–") },
  { id: "next", header: "Next run", align: "right", cell: (j) => <span className="text-xs whitespace-nowrap text-fg-muted">{j.next}</span> },
];

interface RestoreTest {
  id: string;
  date: string;
  target: string;
  passed: boolean;
  detail: string;
  rtoMin: number;
  targetMin: number;
  kind: "Database" | "Cluster" | "Files" | "Config";
}

const restoreTests: RestoreTest[] = [
  { id: "t8", date: "Oct 19", target: "db-prod-02 → scratch", passed: true, detail: "Restored 182 GB in 23 m · 412 tables checked", rtoMin: 23, targetMin: 60, kind: "Database" },
  { id: "t7", date: "Oct 18", target: "k8s-prod/payments", passed: true, detail: "11 deployments ready in 4 m", rtoMin: 4, targetMin: 15, kind: "Cluster" },
  { id: "t6", date: "Oct 17", target: "worker-prod-04 uploads", passed: false, detail: "Checksum mismatch in 3 of 18,204 files", rtoMin: 71, targetMin: 120, kind: "Files" },
  { id: "t5", date: "Oct 16", target: "db-prod-01 → scratch", passed: true, detail: "Restored 176 GB in 22 m", rtoMin: 22, targetMin: 60, kind: "Database" },
  { id: "t4", date: "Oct 15", target: "api-prod-01 /etc", passed: true, detail: "Config diff clean", rtoMin: 2, targetMin: 15, kind: "Config" },
  { id: "t3", date: "Oct 14", target: "k8s-staging", passed: true, detail: "38 workloads ready in 9 m", rtoMin: 9, targetMin: 30, kind: "Cluster" },
  { id: "t2", date: "Oct 13", target: "db-prod-02 → scratch", passed: true, detail: "Restored 179 GB in 24 m", rtoMin: 24, targetMin: 60, kind: "Database" },
  { id: "t1", date: "Oct 12", target: "edge-fra-02 nginx", passed: true, detail: "nginx -t passed", rtoMin: 1, targetMin: 15, kind: "Config" },
];

/* ------------------------------------------------------------------ */
/* Jobs                                                                */
/* ------------------------------------------------------------------ */

function JobDetail({ job, onClose }: { job: Job; onClose: () => void }) {
  const [ran, setRan] = useState(false);
  return (
    <Panel
      aria-label={`Job ${job.name}`}
      title={job.name}
      description={`${job.engine} · ${job.repo}`}
      actions={
        <IconButton label="Close job details" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      }
      footer={
        <span className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="primary" icon={<Play />} onClick={() => setRan(true)}>
            Run now
          </Button>
          <Button size="sm" icon={<FlaskConical />}>
            Test restore
          </Button>
          {ran && (
            <span role="status" className="text-xs text-success">
              Queued on {job.source}
            </span>
          )}
        </span>
      }
    >
      <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-sm">
        <dt className="text-fg-muted">Last run</dt>
        <dd className="flex items-center gap-2">
          <StatusBadge tone={RUN_TONE[job.last]}>{job.last}</StatusBadge>
          <span className="text-xs text-fg-muted">{job.lastAt}</span>
        </dd>
        <dt className="text-fg-muted">Schedule</dt>
        <dd className="font-mono text-xs">{job.schedule}</dd>
        <dt className="text-fg-muted">Source</dt>
        <dd>
          <EntityChip kind={job.sourceKind} value={job.source} href={`#infrastructure/${job.source}`} />
        </dd>
        <dt className="text-fg-muted">Retention</dt>
        <dd>{job.retention}</dd>
        <dt className="text-fg-muted">Size</dt>
        <dd className="font-mono text-xs">{job.bytes ? formatBytes(job.bytes) : "–"}</dd>
        <dt className="text-fg-muted">Next run</dt>
        <dd>{job.next}</dd>
      </dl>
      {job.last === "Failed" && (
        <pre tabIndex={0} aria-label="Last run error output" className="mt-2.5 overflow-x-auto rounded-md bg-canvas p-2 font-mono text-2xs text-danger-text">
          {"Fatal: unable to open repository at s3:backups-eu/db:\n  Stat: 403 Forbidden (AccessDenied)\nrestic exited with code 1"}
        </pre>
      )}
    </Panel>
  );
}

function JobsPage() {
  const [range, setRange] = useState("24h");
  const [engines, setEngines] = useState<string[]>([]);
  const [openId, setOpenId] = useState<string | undefined>();
  const rows = useMemo(() => jobs.filter((j) => engines.length === 0 || engines.includes(j.engine)), [engines]);
  const open = jobs.find((j) => j.id === openId);
  return (
    <>
      <PageHeader
        title="Jobs"
        description="38 jobs · 3 repositories · restic 0.17 and Velero 1.14"
        actions={
          <>
            <SearchInput label="Search jobs" className="w-56" />
            <Button variant="primary" icon={<Plus />}>
              New job
            </Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Engine"
          selected={engines}
          onChange={setEngines}
          options={[
            { value: "restic", count: 27 },
            { value: "Velero", count: 11 },
          ]}
        />
      </FilterBar>
      <Callout tone="danger" title="db-prod-01 · postgres base failed at 12:00" action={<Button size="sm" onClick={() => setOpenId("j1")}>View job</Button>}>
        restic could not open s3:backups-eu/db (403 AccessDenied). Last good snapshot is 8 h old; the 6 h RPO will be missed at 18:00.
      </Callout>
      <KpiGrid>
        <KpiCard label="Successful · 24 h" value="141" unit="of 144 runs" tone="success" delta={{ label: "97.9% success", intent: "good" }} />
        <KpiCard label="Failed · 24 h" value="3" unit="runs" tone="danger" delta={{ label: "1 job still failing", direction: "up", intent: "bad" }} />
        <KpiCard label="Last restore test" value="Passed" unit="today 06:10" delta={{ label: "db-prod-02 in 23 m" }} />
        <KpiCard label="RPO met" value="97%" unit="37 of 38 jobs" tone="warning" delta={{ label: "db-prod-01 at risk", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Jobs" description={`${rows.length} shown · click a row for details`} flush>
          <DataTable label="Backup jobs" columns={columns} rows={rows} getRowId={(j) => j.id} onRowClick={(j) => setOpenId(j.id)} activeRowId={openId} minWidth={900} />
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          {open && <JobDetail key={open.id} job={open} onClose={() => setOpenId(undefined)} />}
          <Panel title="Restore tests" description="Last 8 automated tests" flush>
            <ol aria-label="Restore test timeline" className="flex flex-col py-1">
              {restoreTests.map((t) => (
                <li key={t.id} className="grid grid-cols-[48px_minmax(0,1fr)_auto] items-start gap-2 px-3 py-1.5">
                  <span className="font-mono text-2xs text-fg-muted">{t.date}</span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-sm">{t.target}</span>
                    <span className="truncate text-2xs text-fg-muted">{t.detail}</span>
                  </span>
                  <StatusBadge tone={t.passed ? "success" : "danger"}>{t.passed ? "Passed" : "Failed"}</StatusBadge>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

interface Snapshot {
  id: string;
  time: string;
  added: number;
  total: number;
  files: number;
  tags: string[];
  verified: "Verified" | "Not checked" | "Damaged";
  locked: boolean;
}

function snapshotsFor(job: Job): Snapshot[] {
  const base = job.bytes || 176e9;
  const times = ["Today 12:30", "Today 06:30", "Today 00:30", "Oct 18 18:30", "Oct 18 12:30", "Oct 18 06:30", "Oct 17 00:30", "Oct 12 00:30", "Oct 5 00:30", "Sep 30 00:30"];
  return times.map((time, i) => ({
    id: `${job.id}${["4f9a21c7", "b31e0d2a", "77c0a91e", "e2d4f118", "0a6b3c55", "9d81e7f0", "c5a2b7d3", "18f3e6a9", "6e0c4d21", "a7b9f2e4"][i]}`.slice(-8),
    time,
    added: Math.round((base * (0.004 + ((i * 37) % 11) / 900)) / 1e6) * 1e6,
    total: base * (1 - i * 0.004),
    files: 18204 - i * 41,
    tags: i === 0 ? ["latest"] : i === 6 ? ["weekly"] : i >= 8 ? ["monthly"] : ["daily"],
    verified: job.id === "j6" && i === 1 ? "Damaged" : i < 2 ? "Not checked" : "Verified",
    locked: i >= 6,
  }));
}

const VERIFY_TONE = { Verified: "success", "Not checked": "neutral", Damaged: "danger" } as const;

type WizardStep = 0 | 1 | 2;

function RestoreWizard({ job, snap, onClose }: { job: Job; snap: Snapshot; onClose: () => void }) {
  const [step, setStep] = useState<WizardStep>(0);
  const [scope, setScope] = useState<"all" | "paths">("all");
  const [target, setTarget] = useState<"scratch" | "original" | "other">("scratch");
  const [verify, setVerify] = useState(true);
  const [started, setStarted] = useState(false);
  const steps = ["What to restore", "Where to restore", "Review"];
  return (
    <Panel
      aria-label="Restore wizard"
      title={`Restore snapshot ${snap.id}`}
      description={`${job.name} · ${snap.time}`}
      actions={
        <IconButton label="Close restore wizard" size="sm" onClick={onClose}>
          <X />
        </IconButton>
      }
    >
      <ol aria-label="Restore steps" className="mb-3 grid grid-cols-3 gap-1.5">
        {steps.map((s, i) => (
          <li key={s} aria-current={i === step ? "step" : undefined} className={cn("flex flex-col gap-0.5 border-t-2 pt-1 text-xs", i <= step ? "border-accent text-fg" : "border-line text-fg-muted")}>
            <span className="font-mono text-2xs">Step {i + 1}</span>
            <span className="font-medium">{s}</span>
          </li>
        ))}
      </ol>
      {started ? (
        <Callout tone="success" title="Restore started">
          {formatBytes(snap.total)} to {target === "scratch" ? "scratch-restore-01" : target === "original" ? job.source : "db-prod-02"} · estimated 24 m. Progress shows in Jobs.
        </Callout>
      ) : (
        <div className="flex flex-col gap-3">
          {step === 0 && (
            <>
              <SegmentedControl
                label="Restore scope"
                value={scope}
                onChange={setScope}
                options={[
                  { value: "all", label: "Whole snapshot" },
                  { value: "paths", label: "Selected paths" },
                ]}
              />
              {scope === "paths" ? (
                <TextField label="Paths to include" mono defaultValue="/var/lib/postgresql/16/main/base" hint="One per line or comma separated. Globs allowed." />
              ) : (
                <p className="text-sm text-fg-muted">
                  {snap.files.toLocaleString("en-US")} files · {formatBytes(snap.total)}
                </p>
              )}
            </>
          )}
          {step === 1 && (
            <>
              <SegmentedControl
                label="Restore target"
                value={target}
                onChange={setTarget}
                options={[
                  { value: "scratch", label: "Scratch host" },
                  { value: "original", label: "Original location" },
                  { value: "other", label: "Another host" },
                ]}
              />
              {target === "original" && (
                <Callout tone="warning" title="Overwrites live data on the source">
                  Files on {job.source} are replaced. A pre-restore snapshot is taken first.
                </Callout>
              )}
              <TextField label="Target directory" mono defaultValue="/restore/2026-10-19" />
              <Checkbox label="Verify checksums after restore" checked={verify} onChange={() => setVerify((v) => !v)} />
            </>
          )}
          {step === 2 && (
            <dl className="grid grid-cols-[110px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-sm">
              <dt className="text-fg-muted">Snapshot</dt>
              <dd className="font-mono text-xs">{snap.id}</dd>
              <dt className="text-fg-muted">Scope</dt>
              <dd>{scope === "all" ? "Whole snapshot" : "Selected paths"}</dd>
              <dt className="text-fg-muted">Target</dt>
              <dd>{target === "scratch" ? "scratch-restore-01" : target === "original" ? `${job.source} (overwrite)` : "db-prod-02"}</dd>
              <dt className="text-fg-muted">Verify</dt>
              <dd>{verify ? "Yes, SHA-256 per file" : "No"}</dd>
              <dt className="text-fg-muted">Approval</dt>
              <dd>Not needed for scratch targets</dd>
            </dl>
          )}
          <div className="flex items-center justify-between gap-2 border-t border-line pt-2.5">
            <Button size="sm" variant="ghost" disabled={step === 0} onClick={() => setStep((s) => (s - 1) as WizardStep)}>
              Back
            </Button>
            {step < 2 ? (
              <Button size="sm" variant="primary" onClick={() => setStep((s) => (s + 1) as WizardStep)}>
                Next
              </Button>
            ) : (
              <Button size="sm" variant="primary" icon={<RotateCcw />} onClick={() => setStarted(true)}>
                Start restore
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}

function SnapshotsPage() {
  const [jobId, setJobId] = useState("j2");
  const [restoring, setRestoring] = useState<string | undefined>();
  const job = jobs.find((j) => j.id === jobId)!;
  const snaps = useMemo(() => snapshotsFor(job), [job]);
  const snap = snaps.find((s) => s.id === restoring);
  const cols: Column<Snapshot>[] = [
    { id: "id", header: "Snapshot", mono: true, pinned: "left", width: "110px", cell: (s) => s.id },
    { id: "time", header: "Taken", cell: (s) => <span className="whitespace-nowrap">{s.time}</span> },
    { id: "tags", header: "Tags", cell: (s) => <span className="flex gap-1">{s.tags.map((t) => <Badge key={t} variant="outline">{t}</Badge>)}</span> },
    { id: "added", header: "Added", align: "right", mono: true, description: "New data this snapshot added after deduplication.", sortValue: (s) => s.added, cell: (s) => formatBytes(s.added) },
    { id: "total", header: "Restore size", align: "right", mono: true, sortValue: (s) => s.total, cell: (s) => formatBytes(s.total) },
    { id: "files", header: "Files", align: "right", mono: true, cell: (s) => s.files.toLocaleString("en-US") },
    { id: "verified", header: "Integrity", description: "Result of the last restic check --read-data-subset over this snapshot.", cell: (s) => <StatusBadge tone={VERIFY_TONE[s.verified]}>{s.verified}</StatusBadge> },
    { id: "lock", header: "Lock", description: "Object Lock in compliance mode; cannot be deleted before expiry.", cell: (s) => (s.locked ? <Badge tone="info" icon={<Lock aria-hidden className="size-3" />}>Locked</Badge> : <span className="text-xs text-fg-muted">–</span>) },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "92px",
      align: "right",
      hideable: false,
      cell: (s) => (
        <Button size="xs" icon={<RotateCcw />} onClick={() => setRestoring(s.id)} aria-label={`Restore ${s.id}`}>
          Restore
        </Button>
      ),
    },
  ];
  return (
    <>
      <PageHeader
        title="Snapshots"
        description="Browse restore points per job. Locked snapshots are immutable until their retention ends."
        actions={<SelectField aria-label="Job" value={jobId} onChange={(e) => (setJobId(e.target.value), setRestoring(undefined))} options={jobs.map((j) => ({ value: j.id, label: j.name }))} />}
      />
      <KpiGrid>
        <KpiCard label="Snapshots" value={String(snaps.length * 7 + 4)} unit="for this job" />
        <KpiCard label="Newest" value={snaps[0]!.time.replace("Today ", "")} unit="today" tone={job.last === "Failed" ? "danger" : undefined} delta={job.last === "Failed" ? { label: "last run failed", intent: "bad" } : { label: "on schedule", intent: "good" }} />
        <KpiCard label="Restore size" value={formatBytes(snaps[0]!.total)} unit="latest" />
        <KpiCard label="Stored after dedup" value={formatBytes(snaps.reduce((a, s) => a + s.added, 0) + snaps[0]!.total * 0.42)} delta={{ label: "2.4× dedup ratio" }} />
      </KpiGrid>
      <div className={cn("grid gap-2.5", snap && "xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]")}>
        <Panel title={`Snapshots of ${job.name}`} description={`${job.repo} · ${job.retention}`} flush>
          <DataTable label="Snapshots" columns={cols} rows={snaps} getRowId={(s) => s.id} activeRowId={restoring} minWidth={920} />
        </Panel>
        {snap && <RestoreWizard key={snap.id} job={job} snap={snap} onClose={() => setRestoring(undefined)} />}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Restore tests                                                       */
/* ------------------------------------------------------------------ */

interface TestSchedule {
  id: string;
  target: string;
  cadence: string;
  next: string;
  check: string;
  rtoTarget: string;
  last: "Passed" | "Failed";
}

const SCHEDULES: TestSchedule[] = [
  { id: "s1", target: "db-prod-02 → scratch", cadence: "Daily 06:00", next: "Tomorrow 06:00", check: "pg_restore + row counts on 412 tables", rtoTarget: "60 m", last: "Passed" },
  { id: "s2", target: "db-prod-01 → scratch", cadence: "Every 3 days", next: "Oct 22 06:00", check: "pg_restore + row counts", rtoTarget: "60 m", last: "Passed" },
  { id: "s3", target: "k8s-prod/payments", cadence: "Daily 07:00", next: "Tomorrow 07:00", check: "All deployments ready, smoke test /healthz", rtoTarget: "15 m", last: "Passed" },
  { id: "s4", target: "worker-prod-04 uploads", cadence: "Weekly Fri", next: "Oct 24 05:00", check: "SHA-256 of a 2% sample", rtoTarget: "120 m", last: "Failed" },
  { id: "s5", target: "api-prod-01 /etc", cadence: "Weekly Wed", next: "Oct 22 04:00", check: "Diff against live config", rtoTarget: "15 m", last: "Passed" },
  { id: "s6", target: "k8s-staging", cadence: "Weekly Tue", next: "Oct 21 08:00", check: "Workloads ready", rtoTarget: "30 m", last: "Passed" },
];

function RestoreTestsPage() {
  const [tab, setTab] = useState<"all" | "passed" | "failed">("all");
  const [queued, setQueued] = useState<string | undefined>();
  const rows = restoreTests.filter((t) => tab === "all" || (tab === "passed" ? t.passed : !t.passed));
  const histCols: Column<RestoreTest>[] = [
    { id: "date", header: "Date", mono: true, width: "80px", cell: (t) => t.date },
    { id: "target", header: "Target", cell: (t) => <span className="font-medium">{t.target}</span> },
    { id: "kind", header: "Kind", cell: (t) => <Badge variant="outline">{t.kind}</Badge> },
    {
      id: "rto",
      header: "RTO measured",
      align: "right",
      mono: true,
      description: "Time from starting the restore until the checks passed.",
      sortValue: (t) => t.rtoMin,
      cell: (t) => <span className={cn(t.rtoMin > t.targetMin * 0.5 && "text-warning-text")}>{t.rtoMin} m</span>,
    },
    { id: "target-rto", header: "RTO target", align: "right", mono: true, cell: (t) => `${t.targetMin} m` },
    { id: "detail", header: "Checks", cell: (t) => <span className="text-xs text-fg-muted">{t.detail}</span> },
    { id: "result", header: "Result", cell: (t) => <StatusBadge tone={t.passed ? "success" : "danger"}>{t.passed ? "Passed" : "Failed"}</StatusBadge> },
  ];
  const dbRto = [26, 25, 24, 27, 23, 22, 24, 25, 23, 22, 24, 23, 22, 24];
  const clusterRto = [6, 5, 5, 7, 4, 5, 6, 4, 9, 5, 4, 5, 4, 4];
  const days = ["Oct 6", "Oct 7", "Oct 8", "Oct 9", "Oct 10", "Oct 11", "Oct 12", "Oct 13", "Oct 14", "Oct 15", "Oct 16", "Oct 17", "Oct 18", "Oct 19"];
  return (
    <>
      <PageHeader
        title="Restore tests"
        description="Backups are only as good as the last restore. Tests run on isolated scratch hosts and never touch production."
        actions={<Button variant="primary" icon={<Plus />}>Schedule test</Button>}
      />
      <KpiGrid>
        <KpiCard label="Pass rate · 30 d" value="96%" unit="27 of 28" tone="success" delta={{ label: "+4 pts", direction: "up", intent: "good" }} />
        <KpiCard label="Median RTO · databases" value="23" unit="min" trend={dbRto} delta={{ label: "target 60 m", intent: "good" }} />
        <KpiCard label="Median RTO · clusters" value="5" unit="min" trend={clusterRto} delta={{ label: "target 15 m", intent: "good" }} />
        <KpiCard label="Jobs never tested" value="4" unit="of 38" tone="warning" delta={{ label: "all staging", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Measured RTO" description="Minutes from start to checks passed · last 14 days">
          <TimeSeriesChart
            label="Measured restore time for databases and clusters"
            labels={days}
            height={180}
            xTicks={7}
            format={(v) => `${Math.round(v)} m`}
            threshold={{ value: 60, label: "DB target 60 m" }}
            yMax={70}
            series={[
              { id: "db", name: "Databases", data: dbRto },
              { id: "k8s", name: "Clusters", data: clusterRto },
            ]}
          />
        </Panel>
        <Panel title="Tests per week" description="Passed vs failed">
          <StackedBarChart
            label="Restore tests per week by result"
            categories={["Sep 22", "Sep 29", "Oct 6", "Oct 13"]}
            segments={[
              { id: "pass", name: "Passed", color: TONE_COLORS.success },
              { id: "fail", name: "Failed", color: TONE_COLORS.danger },
            ]}
            values={[
              [6, 1],
              [7, 0],
              [7, 0],
              [7, 1],
            ]}
            height={180}
            xTicks={4}
          />
        </Panel>
      </div>
      <Panel title="Schedule" description="Each test restores the newest snapshot to a scratch host, runs its checks and tears down." flush>
        {queued && (
          <div className="border-b border-line px-3 py-2">
            <Callout tone="success" title={`Test queued for ${queued}`} onDismiss={() => setQueued(undefined)}>
              A scratch host is being provisioned; results land in the history below.
            </Callout>
          </div>
        )}
        <DataTable
          label="Restore test schedule"
          rows={SCHEDULES}
          getRowId={(s) => s.id}
          minWidth={900}
          columns={[
            { id: "target", header: "Target", pinned: "left", cell: (s) => <span className="font-medium">{s.target}</span> },
            { id: "cadence", header: "Cadence", cell: (s) => s.cadence },
            { id: "next", header: "Next", cell: (s) => <span className="text-xs text-fg-muted">{s.next}</span> },
            { id: "check", header: "Checks", cell: (s) => <span className="text-xs">{s.check}</span> },
            { id: "rto", header: "RTO target", align: "right", mono: true, cell: (s) => s.rtoTarget },
            { id: "last", header: "Last", cell: (s) => <StatusBadge tone={s.last === "Passed" ? "success" : "danger"}>{s.last}</StatusBadge> },
            {
              id: "run",
              header: <span className="sr-only">Actions</span>,
              label: "Actions",
              width: "96px",
              align: "right",
              hideable: false,
              cell: (s) => (
                <Button size="xs" icon={<Play />} aria-label={`Run now for ${s.target}`} onClick={() => setQueued(s.target)}>
                  Run now
                </Button>
              ),
            },
          ]}
        />
      </Panel>
      <Panel flush>
        <div className="px-3 pt-2">
          <Tabs
            label="Test history filter"
            value={tab}
            onChange={setTab}
            className="border-b-0"
            items={[
              { value: "all", label: "All", count: restoreTests.length },
              { value: "passed", label: "Passed", count: restoreTests.filter((t) => t.passed).length },
              { value: "failed", label: "Failed", count: restoreTests.filter((t) => !t.passed).length },
            ]}
          />
        </div>
        <div className="border-t border-line">
          <DataTable label="Restore test history" columns={histCols} rows={rows} getRowId={(t) => t.id} minWidth={900} />
        </div>
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Repositories                                                        */
/* ------------------------------------------------------------------ */

interface Repo {
  id: string;
  name: string;
  kind: "restic · S3" | "Velero · S3" | "restic · SFTP";
  endpoint: string;
  region: string;
  used: number;
  quota: number;
  dedup: number;
  snapshots: number;
  jobs: number;
  encryption: string;
  lock: string;
  lastCheck: string;
  health: "Healthy" | "Degraded" | "Error";
}

const REPOS: Repo[] = [
  { id: "r1", name: "s3:backups-eu/db", kind: "restic · S3", endpoint: "s3.eu-central-1.example.com", region: "eu-central-1", used: 3.8e12, quota: 5e12, dedup: 2.4, snapshots: 1284, jobs: 6, encryption: "AES-256 · repo key in Secrets", lock: "Compliance · 35 days", lastCheck: "Today 04:00 · 5% read", health: "Error" },
  { id: "r2", name: "s3:backups-eu/hosts", kind: "restic · S3", endpoint: "s3.eu-central-1.example.com", region: "eu-central-1", used: 0.41e12, quota: 2e12, dedup: 5.1, snapshots: 3410, jobs: 19, encryption: "AES-256 · repo key in Secrets", lock: "Governance · 14 days", lastCheck: "Today 04:20 · 5% read", health: "Healthy" },
  { id: "r3", name: "s3:backups-eu/files", kind: "restic · S3", endpoint: "s3.eu-west-1.example.com", region: "eu-west-1", used: 6.2e12, quota: 8e12, dedup: 1.3, snapshots: 298, jobs: 3, encryption: "AES-256 · repo key in Secrets", lock: "Off", lastCheck: "Oct 17 · found 3 damaged packs", health: "Degraded" },
  { id: "r4", name: "velero-prod", kind: "Velero · S3", endpoint: "minio.internal.example.com", region: "on-prem", used: 1.1e12, quota: 4e12, dedup: 1.0, snapshots: 612, jobs: 7, encryption: "SSE-S3 + CSI snapshot encryption", lock: "Compliance · 14 days", lastCheck: "Today 03:10", health: "Healthy" },
  { id: "r5", name: "velero-staging", kind: "Velero · S3", endpoint: "minio.internal.example.com", region: "on-prem", used: 0.18e12, quota: 1e12, dedup: 1.0, snapshots: 54, jobs: 2, encryption: "SSE-S3", lock: "Off", lastCheck: "Oct 18 03:10", health: "Healthy" },
  { id: "r6", name: "sftp:offsite-vault", kind: "restic · SFTP", endpoint: "vault.offsite.example.com:22", region: "Dublin DC", used: 2.9e12, quota: 10e12, dedup: 2.1, snapshots: 410, jobs: 4, encryption: "AES-256 · offline key escrow", lock: "Append-only (rest-server)", lastCheck: "Oct 16 · 2% read", health: "Healthy" },
];

const HEALTH_TONE = { Healthy: "success", Degraded: "warning", Error: "danger" } as const;

function RepositoriesPage() {
  const [active, setActive] = useState("r1");
  const [checking, setChecking] = useState<string[]>([]);
  const repo = REPOS.find((r) => r.id === active)!;
  const pct = (r: Repo) => Math.round((r.used / r.quota) * 100);
  const cols: Column<Repo>[] = [
    { id: "name", header: "Repository", pinned: "left", sortValue: (r) => r.name, cell: (r) => <span className="font-mono text-xs font-medium">{r.name}</span> },
    { id: "kind", header: "Type", cell: (r) => <Badge mono>{r.kind}</Badge> },
    {
      id: "used",
      header: "Capacity",
      sortValue: (r) => r.used / r.quota,
      description: "Bytes stored against the bucket quota.",
      cell: (r) => (
        <span className="flex items-center gap-2">
          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-subtle" aria-hidden>
            <span className={cn("block h-full rounded-full", pct(r) > 80 ? "bg-danger" : pct(r) > 70 ? "bg-warning" : "bg-accent")} style={{ width: `${pct(r)}%` }} />
          </span>
          <span className="font-mono text-xs whitespace-nowrap">
            {formatBytes(r.used)} · {pct(r)}%
          </span>
        </span>
      ),
    },
    { id: "dedup", header: "Dedup", align: "right", mono: true, sortValue: (r) => r.dedup, cell: (r) => `${r.dedup.toFixed(1)}×` },
    { id: "snaps", header: "Snapshots", align: "right", mono: true, sortValue: (r) => r.snapshots, cell: (r) => r.snapshots.toLocaleString("en-US") },
    { id: "lock", header: "Immutability", cell: (r) => (r.lock === "Off" ? <Badge tone="warning">Off</Badge> : <span className="text-xs">{r.lock}</span>) },
    { id: "health", header: "Health", sortValue: (r) => r.health, cell: (r) => <StatusBadge tone={HEALTH_TONE[r.health]}>{r.health}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader
        title="Repositories"
        description="Where snapshots are stored. All repositories are encrypted client-side; keys live in Secrets."
        actions={<Button variant="primary" icon={<Plus />}>Add repository</Button>}
      />
      <KpiGrid>
        <KpiCard label="Stored" value="14.6" unit="TB" delta={{ label: "+212 GB this week", direction: "up" }} trend={[12.9, 13.1, 13.3, 13.6, 13.8, 14.0, 14.2, 14.4, 14.6]} />
        <KpiCard label="Quota used" value="48%" unit="of 30 TB" />
        <KpiCard label="Immutable" value="4" unit="of 6 repositories" tone="warning" delta={{ label: "files, staging without lock", intent: "bad" }} />
        <KpiCard label="Off-site copy" value="Yes" unit="sftp:offsite-vault" tone="success" delta={{ label: "3-2-1 rule met" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Repositories" flush>
          <DataTable label="Repositories" columns={cols} rows={REPOS} getRowId={(r) => r.id} onRowClick={(r) => setActive(r.id)} activeRowId={active} minWidth={820} />
        </Panel>
        <Panel
          aria-label="Repository detail"
          title={<span className="font-mono">{repo.name}</span>}
          description={`${repo.kind} · ${repo.region}`}
          actions={<StatusBadge tone={HEALTH_TONE[repo.health]}>{repo.health}</StatusBadge>}
          footer={
            <span className="flex flex-wrap items-center gap-2">
              <Button size="sm" icon={<ShieldCheck />} onClick={() => setChecking((c) => [...c, repo.id])} disabled={checking.includes(repo.id)}>
                Run integrity check
              </Button>
              <Button size="sm" variant="ghost">
                Prune now
              </Button>
              {checking.includes(repo.id) && (
                <span role="status" className="text-xs text-success">
                  Check started · reading 5% of packs
                </span>
              )}
            </span>
          }
        >
          {repo.health === "Error" && (
            <Callout tone="danger" title="403 AccessDenied since 12:00" className="mb-2.5">
              The IAM role backups-writer lost s3:PutObject after a policy change by Mark Wilson at 11:42.
            </Callout>
          )}
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-2.5 gap-y-1.5 text-sm">
            <dt className="text-fg-muted">Endpoint</dt>
            <dd className="truncate font-mono text-xs">{repo.endpoint}</dd>
            <dt className="text-fg-muted">Used</dt>
            <dd>
              {formatBytes(repo.used)} of {formatBytes(repo.quota)}
            </dd>
            <dt className="text-fg-muted">Encryption</dt>
            <dd>{repo.encryption}</dd>
            <dt className="text-fg-muted">Immutability</dt>
            <dd>{repo.lock}</dd>
            <dt className="text-fg-muted">Last check</dt>
            <dd>{repo.lastCheck}</dd>
            <dt className="text-fg-muted">Jobs writing</dt>
            <dd>{repo.jobs}</dd>
          </dl>
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-2">
        <Panel title="Growth" description="Stored bytes per repository · 14 days">
          <TimeSeriesChart
            label="Stored bytes per repository over 14 days"
            labels={["Oct 6", "Oct 7", "Oct 8", "Oct 9", "Oct 10", "Oct 11", "Oct 12", "Oct 13", "Oct 14", "Oct 15", "Oct 16", "Oct 17", "Oct 18", "Oct 19"]}
            height={180}
            stacked
            xTicks={7}
            format={(v) => formatBytes(v)}
            series={[
              { id: "files", name: "files", data: Array.from({ length: 14 }, (_, i) => 5.6e12 + i * 4.5e10) },
              { id: "db", name: "db", data: Array.from({ length: 14 }, (_, i) => 3.4e12 + i * 3e10) },
              { id: "offsite", name: "offsite", data: Array.from({ length: 14 }, (_, i) => 2.7e12 + i * 1.5e10) },
              { id: "other", name: "other", data: Array.from({ length: 14 }, (_, i) => 1.6e12 + i * 6e9) },
            ]}
          />
        </Panel>
        <Panel title="Largest sources" description="Bytes stored per source, after dedup">
          <BarList
            label="Sources using the most backup storage"
            format={(v) => formatBytes(v)}
            items={[
              { id: "w4", label: "worker-prod-04 uploads", value: 5.9e12 },
              { id: "db1", label: "db-prod-01", value: 1.9e12 },
              { id: "db2", label: "db-prod-02", value: 1.8e12 },
              { id: "k8s", label: "k8s-prod", value: 0.9e12 },
              { id: "pay", label: "k8s-prod/payments", value: 0.2e12 },
              { id: "api", label: "api-prod-* (19 hosts)", value: 0.4e12 },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

interface Policy {
  id: string;
  name: string;
  hourly: number;
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
  rpo: string;
  rto: string;
  jobs: number;
  immutable: boolean;
  offsite: boolean;
  compliance: number;
}

const POLICIES: Policy[] = [
  { id: "p1", name: "Tier 1 · production databases", hourly: 0, daily: 7, weekly: 4, monthly: 12, yearly: 1, rpo: "6 h", rto: "1 h", jobs: 6, immutable: true, offsite: true, compliance: 83 },
  { id: "p2", name: "Tier 1 · payments", hourly: 48, daily: 7, weekly: 4, monthly: 12, yearly: 7, rpo: "1 h", rto: "15 m", jobs: 3, immutable: true, offsite: true, compliance: 100 },
  { id: "p3", name: "Tier 2 · clusters", hourly: 0, daily: 14, weekly: 4, monthly: 3, yearly: 0, rpo: "24 h", rto: "30 m", jobs: 9, immutable: true, offsite: false, compliance: 100 },
  { id: "p4", name: "Tier 2 · user files", hourly: 0, daily: 14, weekly: 8, monthly: 6, yearly: 0, rpo: "24 h", rto: "2 h", jobs: 3, immutable: false, offsite: true, compliance: 100 },
  { id: "p5", name: "Tier 3 · host config", hourly: 0, daily: 30, weekly: 12, monthly: 0, yearly: 0, rpo: "7 d", rto: "4 h", jobs: 17, immutable: false, offsite: false, compliance: 100 },
];

function keepLabel(p: Policy) {
  return (
    [
      p.hourly && `${p.hourly} hourly`,
      p.daily && `${p.daily} daily`,
      p.weekly && `${p.weekly} weekly`,
      p.monthly && `${p.monthly} monthly`,
      p.yearly && `${p.yearly} yearly`,
    ]
      .filter(Boolean)
      .join(" · ") || "–"
  );
}

function PoliciesPage() {
  const [rows, setRows] = useState(POLICIES);
  const [active, setActive] = useState("p1");
  const [saved, setSaved] = useState("");
  const p = rows.find((x) => x.id === active)!;
  const [draft, setDraft] = useState(p);
  const select = (id: string) => {
    setActive(id);
    setDraft(rows.find((x) => x.id === id)!);
    setSaved("");
  };
  const cols: Column<Policy>[] = [
    { id: "name", header: "Policy", pinned: "left", sortValue: (x) => x.name, cell: (x) => <span className="font-medium">{x.name}</span> },
    { id: "keep", header: "Keep", description: "restic forget --keep-* rules applied after each run.", cell: (x) => <span className="text-xs">{keepLabel(x)}</span> },
    { id: "rpo", header: "RPO", mono: true, description: "Recovery point objective: the most data you can afford to lose.", cell: (x) => x.rpo },
    { id: "rto", header: "RTO", mono: true, description: "Recovery time objective: how fast a restore must finish.", cell: (x) => x.rto },
    { id: "jobs", header: "Jobs", align: "right", mono: true, sortValue: (x) => x.jobs, cell: (x) => x.jobs },
    {
      id: "flags",
      header: "Protection",
      cell: (x) => (
        <span className="flex gap-1">
          {x.immutable && <Badge tone="info">Immutable</Badge>}
          {x.offsite && <Badge tone="info">Off-site</Badge>}
          {!x.immutable && !x.offsite && <span className="text-xs text-fg-muted">–</span>}
        </span>
      ),
    },
    { id: "met", header: "RPO met", align: "right", sortValue: (x) => x.compliance, cell: (x) => <StatusBadge tone={x.compliance === 100 ? "success" : "warning"}>{x.compliance}%</StatusBadge> },
  ];
  const num = (k: "hourly" | "daily" | "weekly" | "monthly" | "yearly") => (
    <TextField label={k[0]!.toUpperCase() + k.slice(1)} type="number" min={0} mono value={draft[k]} onChange={(e) => setDraft((d) => ({ ...d, [k]: Number(e.target.value) }))} />
  );
  return (
    <>
      <PageHeader title="Policies" description="Retention rules and recovery targets. Every job belongs to exactly one policy." actions={<Button variant="primary" icon={<Plus />}>New policy</Button>} />
      <Callout tone="warning" title="Tier 1 · production databases misses its RPO on 1 of 6 jobs">
        db-prod-01 · postgres base has had no successful snapshot for 8 h against a 6 h target.
      </Callout>
      <Panel title="Policies" flush>
        <DataTable label="Retention policies" columns={cols} rows={rows} getRowId={(x) => x.id} onRowClick={(x) => select(x.id)} activeRowId={active} minWidth={900} />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title={`Edit ${p.name}`} description={`${p.jobs} jobs follow this policy`}>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setRows((rs) => rs.map((r) => (r.id === draft.id ? draft : r)));
              setSaved(`Saved · keep ${keepLabel(draft)}`);
            }}
          >
            <fieldset className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <legend className="mb-1 text-xs font-semibold text-fg">Snapshots to keep</legend>
              {num("hourly")}
              {num("daily")}
              {num("weekly")}
              {num("monthly")}
              {num("yearly")}
            </fieldset>
            <div className="grid gap-2.5 md:grid-cols-2">
              <SelectField label="RPO target" value={draft.rpo} onChange={(e) => setDraft((d) => ({ ...d, rpo: e.target.value }))} options={["1 h", "6 h", "24 h", "7 d"].map((v) => ({ value: v, label: v }))} />
              <SelectField label="RTO target" value={draft.rto} onChange={(e) => setDraft((d) => ({ ...d, rto: e.target.value }))} options={["15 m", "30 m", "1 h", "2 h", "4 h"].map((v) => ({ value: v, label: v }))} />
            </div>
            <Switch checked={draft.immutable} onCheckedChange={(v) => setDraft((d) => ({ ...d, immutable: v }))} label="Immutable snapshots" description="Object Lock in compliance mode for the retention period. Cannot be shortened later." />
            <Switch checked={draft.offsite} onCheckedChange={(v) => setDraft((d) => ({ ...d, offsite: v }))} label="Copy off-site" description="Replicate every daily snapshot to sftp:offsite-vault." />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" variant="primary">
                Save policy
              </Button>
              {saved && (
                <span role="status" className="text-xs text-success">
                  {saved}
                </span>
              )}
            </div>
          </form>
        </Panel>
        <Panel title="What this keeps" description="Restore points available after pruning">
          <ul className="flex flex-col gap-1.5 text-sm">
            {(
              [
                ["Hourly", draft.hourly, "last " + draft.hourly + " hours"],
                ["Daily", draft.daily, "last " + draft.daily + " days"],
                ["Weekly", draft.weekly, "last " + draft.weekly + " weeks"],
                ["Monthly", draft.monthly, "last " + draft.monthly + " months"],
                ["Yearly", draft.yearly, "last " + draft.yearly + " years"],
              ] as Array<[string, number, string]>
            ).map(([k, n, span]) => (
              <Fragment key={k}>
                <li className="flex items-center justify-between gap-2 border-b border-subtle pb-1.5 last:border-0">
                  <span>{k}</span>
                  <span className="text-xs text-fg-muted">{n ? span : "not kept"}</span>
                  <span className="w-10 text-right font-mono text-xs">{n}</span>
                </li>
              </Fragment>
            ))}
          </ul>
          <p className="mt-2 text-xs text-fg-muted">
            Oldest restore point: {draft.yearly ? `${draft.yearly} year${draft.yearly > 1 ? "s" : ""}` : draft.monthly ? `${draft.monthly} months` : draft.weekly ? `${draft.weekly} weeks` : `${draft.daily} days`} · GDPR erasure requests are honoured by excluding paths, not by deleting locked snapshots. Owner {PEOPLE[2]}.
          </p>
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* App and stories                                                     */
/* ------------------------------------------------------------------ */

const PAGES = {
  jobs: () => <JobsPage />,
  snapshots: () => <SnapshotsPage />,
  "restore-tests": () => <RestoreTestsPage />,
  repositories: () => <RepositoriesPage />,
  policies: () => <PoliciesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="backups" nav={nav} pages={PAGES} initial={initial} /> });

/** Jobs: run health KPIs, the jobs table with a detail panel and the restore-test timeline. */
export const Jobs: Story = {
  ...app("jobs"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Jobs" })).toBeInTheDocument();
    const timeline = c.getByRole("list", { name: "Restore test timeline" });
    await expect(within(timeline).getAllByRole("listitem")).toHaveLength(8);
    await expect(within(timeline).getAllByText("Failed")).toHaveLength(1);
    const table = c.getByRole("table", { name: "Backup jobs" });
    await userEvent.click(within(table).getByText("worker-prod-04 · uploads"));
    const detail = c.getByRole("region", { name: "Job worker-prod-04 · uploads" });
    await expect(within(detail).getByText("14 daily · 8 weekly")).toBeInTheDocument();
    await userEvent.click(within(detail).getByRole("button", { name: "Close job details" }));
    await expect(c.queryByRole("region", { name: /^Job / })).not.toBeInTheDocument();
  },
};

export const Snapshots: Story = {
  ...app("snapshots"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Snapshots" });
    await expect(within(table).getAllByRole("row")).toHaveLength(11);
    await userEvent.click(within(table).getAllByRole("button", { name: /^Restore [0-9a-f]{8}$/ })[0]!);
    const wizard = c.getByRole("region", { name: "Restore wizard" });
    await userEvent.click(within(wizard).getByRole("button", { name: "Next" }));
    await userEvent.click(within(wizard).getByRole("radio", { name: "Original location" }));
    await expect(within(wizard).getByText("Overwrites live data on the source")).toBeInTheDocument();
    await userEvent.click(within(wizard).getByRole("button", { name: "Next" }));
    await expect(within(wizard).getByText("db-prod-02 (overwrite)")).toBeInTheDocument();
    await userEvent.click(within(wizard).getByRole("button", { name: "Start restore" }));
    await expect(within(wizard).getByText("Restore started")).toBeInTheDocument();
  },
};

export const RestoreTests: Story = {
  name: "Restore tests",
  ...app("restore-tests"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: /Failed/ }));
    const hist = c.getByRole("table", { name: "Restore test history" });
    await expect(within(hist).getAllByRole("row")).toHaveLength(2);
    await expect(hist).toHaveTextContent("worker-prod-04 uploads");
    await userEvent.click(c.getByRole("button", { name: "Run now for k8s-prod/payments" }));
    await expect(c.getByText("Test queued for k8s-prod/payments")).toBeInTheDocument();
  },
};

export const Repositories: Story = {
  ...app("repositories"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const detail = c.getByRole("region", { name: "Repository detail" });
    await expect(within(detail).getByText("403 AccessDenied since 12:00")).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Repositories" })).getByText("sftp:offsite-vault"));
    await expect(detail).toHaveTextContent("Append-only (rest-server)");
    await userEvent.click(within(detail).getByRole("button", { name: "Run integrity check" }));
    await expect(within(detail).getByRole("status")).toHaveTextContent("Check started");
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("table", { name: "Retention policies" })).getByText("Tier 2 · user files"));
    const daily = c.getByRole("spinbutton", { name: "Daily" });
    await userEvent.clear(daily);
    await userEvent.type(daily, "21");
    await userEvent.click(c.getByRole("button", { name: "Save policy" }));
    await expect(c.getByText(/Saved · keep 21 daily · 8 weekly · 6 monthly/)).toBeInTheDocument();
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
