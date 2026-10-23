import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { CircleCheck, FileSearch, GitBranch, KeyRound, Layers, Plus, ScrollText, ShieldOff, Trash2, X } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";
import { PEOPLE } from "../mocks";

const nav = [
  { id: "findings", label: "Findings", icon: KeyRound, count: 23 },
  { id: "repositories", label: "Repositories", icon: GitBranch, count: 41 },
  { id: "images", label: "Images", icon: Layers, count: 61 },
  { id: "ci-logs", label: "CI logs", icon: ScrollText },
  { id: "validators", label: "Validators", icon: FileSearch },
  { id: "exceptions", label: "Exceptions", icon: ShieldOff },
];

const meta = {
  title: "Products/Secrets",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Validity = "active" | "revoked" | "unverified";
const VALIDITY: Record<Validity, { label: string; tone: Tone }> = {
  active: { label: "Verified active", tone: "danger" },
  revoked: { label: "Revoked", tone: "success" },
  unverified: { label: "Unverified", tone: "neutral" },
};

type SourceKind = "repo" | "ci" | "image";

interface Finding {
  id: string;
  severity: Severity;
  type: string;
  /** Always masked: only a prefix and the last four characters are stored for display. */
  masked: string;
  source: SourceKind;
  location: string;
  where: string;
  validity: Validity;
  firstSeen: string;
  author: string;
  rotate: string[];
}

const findings: Finding[] = [
  {
    id: "f1",
    severity: "critical",
    type: "AWS access key",
    masked: "AKIA••••••••••••QX7Z",
    source: "repo",
    location: "orders-api/.env.example:4",
    where: "orders-api · main · 9c41e0b",
    validity: "active",
    firstSeen: "2 h ago",
    author: "Mark Wilson",
    rotate: [
      "Create a new key for iam/user/orders-api and deploy it through the secrets store.",
      "Deactivate AKIA…QX7Z, watch CloudTrail for 24 h, then delete it.",
      "Remove the value from .env.example and rewrite history if the repository is public.",
    ],
  },
  {
    id: "f2",
    severity: "high",
    type: "Slack bot token",
    masked: "xoxb-••••••••••••-8Kq2",
    source: "ci",
    location: "gitlab-ci · job #8812 · deploy-staging log line 214",
    where: "platform/deploy · job #8812",
    validity: "active",
    firstSeen: "Yesterday",
    author: "CI runner ci-02",
    rotate: [
      "Regenerate the bot token in the Slack app settings (OAuth & Permissions).",
      "Update SLACK_BOT_TOKEN as a masked, protected CI variable.",
      "Erase the job log for #8812.",
    ],
  },
  {
    id: "f3",
    severity: "critical",
    type: "Private RSA key",
    masked: "-----BEGIN RSA PRIVATE KEY----- ••••",
    source: "image",
    location: "payments-api:1.9.0 · layer 7 · /app/certs/server.key",
    where: "registry.example.com/payments-api:1.9.0",
    validity: "unverified",
    firstSeen: "3 days ago",
    author: "Docker build",
    rotate: [
      "Issue a new certificate and key from the internal CA.",
      "Mount the key at runtime from a Kubernetes secret instead of COPY in the Dockerfile.",
      "Delete payments-api:1.9.0 from the registry after rolling out 1.9.1.",
    ],
  },
  {
    id: "f4",
    severity: "high",
    type: "GitHub PAT",
    masked: "ghp_••••••••••••••••Wd3k",
    source: "repo",
    location: "legacy-portal · commit 3f9a21c · config/deploy.yml:18",
    where: "legacy-portal · 3f9a21c",
    validity: "revoked",
    firstSeen: "12 days ago",
    author: "Ben Ortiz",
    rotate: ["The token was revoked on GitHub. Close the finding once the commit is purged."],
  },
  {
    id: "f5",
    severity: "low",
    type: "Stripe test key",
    masked: "sk_test_••••••••••••7rTq",
    source: "repo",
    location: "checkout-web/src/config/stripe.ts:3",
    where: "checkout-web · develop",
    validity: "unverified",
    firstSeen: "5 days ago",
    author: "Zoe Adams",
    rotate: ["Roll the test key in the Stripe dashboard (test mode) and read it from the environment."],
  },
];

/** Secrets findings: validity KPIs, masked findings and a detail panel with rotation steps. */
function FindingsPage() {
  const [range, setRange] = useState("7d");
  const [sources, setSources] = useState<string[]>([]);
  const [validity, setValidity] = useState<Record<string, Validity>>(() => Object.fromEntries(findings.map((f) => [f.id, f.validity])));
  const [openId, setOpenId] = useState<string | undefined>();
  const rows = useMemo(
    () => findings.map((f) => ({ ...f, validity: validity[f.id]! })).filter((f) => sources.length === 0 || sources.includes(f.source)),
    [validity, sources],
  );
  const open = rows.find((f) => f.id === openId);
  const markRevoked = (id: string) => setValidity((v) => ({ ...v, [id]: "revoked" }));
  const counts = {
    active: Object.values(validity).filter((v) => v === "active").length,
    revoked: 9 + Object.values(validity).filter((v) => v === "revoked").length,
    unverified: 6 + Object.values(validity).filter((v) => v === "unverified").length,
  };

  const columns: Column<Finding>[] = [
    { id: "sev", header: "Severity", width: "96px", sortValue: (f) => SEVERITY_META[f.severity].rank, cell: (f) => <SeverityBadge severity={f.severity} /> },
    {
      id: "type",
      header: "Type",
      width: "20%",
      sortValue: (f) => f.type,
      cell: (f) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{f.type}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{f.masked}</span>
        </span>
      ),
    },
    {
      id: "loc",
      header: "Location",
      width: "32%",
      cell: (f) => (
        <span className="block max-w-full truncate font-mono text-xs" title={f.location}>
          {f.location}
        </span>
      ),
    },
    { id: "valid", header: "Validity", cell: (f) => <StatusBadge tone={VALIDITY[f.validity].tone}>{VALIDITY[f.validity].label}</StatusBadge> },
    { id: "seen", header: "First seen", cell: (f) => <span className="whitespace-nowrap text-fg-muted">{f.firstSeen}</span> },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      width: "190px",
      align: "right",
      cell: (f) => (
        <span className="inline-flex gap-1">
          <Button size="xs" variant="primary" aria-label={`Rotate ${f.type}`} onClick={() => setOpenId(f.id)}>
            Rotate
          </Button>
          <Button size="xs" aria-label={`Mark revoked: ${f.type}`} disabled={f.validity === "revoked"} onClick={() => markRevoked(f.id)}>
            Mark revoked
          </Button>
        </span>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Findings"
        description="41 repositories, 61 images and CI logs from 3 runners · values are never stored in full"
        actions={
          <>
            <SearchInput label="Search findings" className="w-60" />
            <Button size="md" variant="primary" icon={<FileSearch />}>
              Scan now
            </Button>
          </>
        }
      />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter
          label="Source"
          selected={sources}
          onChange={setSources}
          options={[
            { value: "repo", label: "Repositories", count: 3 },
            { value: "image", label: "Images", count: 1 },
            { value: "ci", label: "CI logs", count: 1 },
          ]}
        />
      </FilterBar>
      <KpiGrid>
        <KpiCard
          label="Verified active"
          value={counts.active}
          unit="secrets"
          tone="danger"
          delta={{ label: "Validated against the provider API", intent: "bad" }}
        />
        <KpiCard label="Revoked" value={counts.revoked} unit="secrets" tone="success" delta={{ label: "+2 this week", direction: "up", intent: "good" }} />
        <KpiCard label="Unverified" value={counts.unverified} unit="secrets" delta={{ label: "No validator, or provider unreachable" }} />
        <KpiCard label="Median time to revoke" value="6.4" unit="hours" delta={{ label: "-1.2 h vs. last month", direction: "down", intent: "good" }} />
      </KpiGrid>
      <div className={open ? "grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]" : "grid gap-2.5"}>
        <Panel title="Findings" description="Click a row for rotation steps" flush>
          <DataTable
            label="Secret findings"
            columns={columns}
            rows={rows}
            getRowId={(f) => f.id}
            onRowClick={(f) => setOpenId(f.id)}
            activeRowId={openId}
            defaultSort={{ id: "sev", direction: "desc" }}
            minWidth={960}
          />
        </Panel>
        {open && (
          <Panel
            title={open.type}
            description={open.where}
            aria-label={`Finding detail: ${open.type}`}
            actions={
              <IconButton label="Close detail" size="sm" onClick={() => setOpenId(undefined)}>
                <X />
              </IconButton>
            }
          >
            <div className="flex flex-col gap-2.5 text-sm">
              <dl className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-2 gap-y-1.5">
                <dt className="text-fg-muted">Severity</dt>
                <dd>
                  <SeverityBadge severity={open.severity} />
                </dd>
                <dt className="text-fg-muted">Value</dt>
                <dd className="truncate font-mono text-xs">{open.masked}</dd>
                <dt className="text-fg-muted">Location</dt>
                <dd className="font-mono text-xs break-all">{open.location}</dd>
                <dt className="text-fg-muted">Validity</dt>
                <dd>
                  <StatusBadge tone={VALIDITY[open.validity].tone}>{VALIDITY[open.validity].label}</StatusBadge>
                </dd>
                <dt className="text-fg-muted">Introduced by</dt>
                <dd>
                  <EntityChip kind="user" value={open.author} hideKind />
                </dd>
              </dl>
              <Callout tone={open.validity === "revoked" ? "success" : "warning"} title={open.validity === "revoked" ? "Already revoked" : "How to rotate"}>
                <ol className="mt-1 list-decimal pl-4">
                  {open.rotate.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ol>
              </Callout>
              <div className="flex gap-1.5">
                <Button size="sm" variant="primary" icon={<CircleCheck />} disabled={open.validity === "revoked"} onClick={() => markRevoked(open.id)}>
                  Mark revoked
                </Button>
                <Button size="sm">Add exception</Button>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-fg-muted">
                <Badge mono>{open.source}</Badge>
                First seen {open.firstSeen}
              </p>
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Repositories                                                        */
/* ------------------------------------------------------------------ */

interface Repo {
  id: string;
  name: string;
  provider: "GitHub" | "GitLab";
  visibility: "public" | "private" | "internal";
  branch: string;
  commit: string;
  scanned: string;
  history: "Full history" | "Incremental";
  findings: { critical: number; high: number; other: number };
  protection: boolean;
  owner: string;
}

const REPOS: Repo[] = [
  {
    id: "r1",
    name: "acme/orders-api",
    provider: "GitHub",
    visibility: "private",
    branch: "main",
    commit: "9c41e0b",
    scanned: "2 h ago",
    history: "Full history",
    findings: { critical: 1, high: 0, other: 2 },
    protection: true,
    owner: PEOPLE[2],
  },
  {
    id: "r2",
    name: "acme/legacy-portal",
    provider: "GitHub",
    visibility: "public",
    branch: "master",
    commit: "3f9a21c",
    scanned: "1 day ago",
    history: "Full history",
    findings: { critical: 0, high: 1, other: 4 },
    protection: false,
    owner: PEOPLE[4],
  },
  {
    id: "r3",
    name: "acme/checkout-web",
    provider: "GitHub",
    visibility: "private",
    branch: "develop",
    commit: "e7b0d14",
    scanned: "5 h ago",
    history: "Incremental",
    findings: { critical: 0, high: 0, other: 1 },
    protection: true,
    owner: PEOPLE[7],
  },
  {
    id: "r4",
    name: "platform/deploy",
    provider: "GitLab",
    visibility: "internal",
    branch: "main",
    commit: "71ac0f2",
    scanned: "40 min ago",
    history: "Incremental",
    findings: { critical: 0, high: 1, other: 0 },
    protection: true,
    owner: PEOPLE[0],
  },
  {
    id: "r5",
    name: "platform/terraform-live",
    provider: "GitLab",
    visibility: "internal",
    branch: "main",
    commit: "0d93be1",
    scanned: "3 h ago",
    history: "Full history",
    findings: { critical: 0, high: 0, other: 0 },
    protection: true,
    owner: PEOPLE[1],
  },
  {
    id: "r6",
    name: "acme/docs-site",
    provider: "GitHub",
    visibility: "public",
    branch: "main",
    commit: "a12f6c9",
    scanned: "6 h ago",
    history: "Full history",
    findings: { critical: 0, high: 0, other: 0 },
    protection: false,
    owner: PEOPLE[5],
  },
  {
    id: "r7",
    name: "acme/payments-api",
    provider: "GitHub",
    visibility: "private",
    branch: "main",
    commit: "5be2a70",
    scanned: "1 h ago",
    history: "Full history",
    findings: { critical: 0, high: 0, other: 3 },
    protection: true,
    owner: PEOPLE[3],
  },
  {
    id: "r8",
    name: "data/etl-jobs",
    provider: "GitLab",
    visibility: "private",
    branch: "main",
    commit: "c4419de",
    scanned: "12 h ago",
    history: "Incremental",
    findings: { critical: 0, high: 2, other: 1 },
    protection: false,
    owner: PEOPLE[6],
  },
];

const VIS_TONE = { public: "warning", private: "neutral", internal: "info" } as const;

function RepositoriesPage() {
  const [protection, setProtection] = useState<Record<string, boolean>>(Object.fromEntries(REPOS.map((r) => [r.id, r.protection])));
  const [vis, setVis] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const shown = REPOS.filter((r) => (vis.length === 0 || vis.includes(r.visibility)) && r.name.includes(query.toLowerCase()));
  const cols: Column<Repo>[] = [
    {
      id: "name",
      header: "Repository",
      pinned: "left",
      width: "24%",
      sortValue: (r) => r.name,
      cell: (r) => (
        <span className="flex min-w-0 flex-col items-start gap-0.5">
          <EntityChip kind="repo" value={r.name} hideKind />
          <span className="text-2xs text-fg-muted">
            {r.provider} · owner {r.owner}
          </span>
        </span>
      ),
    },
    { id: "vis", header: "Visibility", sortValue: (r) => r.visibility, cell: (r) => <Badge tone={VIS_TONE[r.visibility]}>{r.visibility}</Badge> },
    {
      id: "commit",
      header: "Last scanned",
      cell: (r) => (
        <span className="flex flex-col">
          <span className="font-mono text-xs">
            {r.branch} · {r.commit}
          </span>
          <span className="text-2xs text-fg-muted">{r.scanned}</span>
        </span>
      ),
    },
    {
      id: "history",
      header: "Depth",
      description: "Full history scans every commit ever pushed; incremental scans only new pushes.",
      cell: (r) => <span className="text-xs">{r.history}</span>,
    },
    {
      id: "findings",
      header: "Open findings",
      sortValue: (r) => r.findings.critical * 100 + r.findings.high * 10 + r.findings.other,
      cell: (r) =>
        r.findings.critical + r.findings.high + r.findings.other === 0 ? (
          <StatusBadge tone="success">Clean</StatusBadge>
        ) : (
          <span className="flex flex-wrap gap-1">
            {r.findings.critical > 0 && <Badge tone="critical">{r.findings.critical} critical</Badge>}
            {r.findings.high > 0 && <Badge tone="danger">{r.findings.high} high</Badge>}
            {r.findings.other > 0 && <Badge>{r.findings.other} other</Badge>}
          </span>
        ),
    },
    {
      id: "push",
      header: "Push protection",
      width: "130px",
      description: "Blocks pushes that contain a verified secret. Developers can bypass with a reason, which is logged.",
      cell: (r) => (
        <Switch
          checked={protection[r.id] ?? false}
          onCheckedChange={(v) => setProtection((p) => ({ ...p, [r.id]: v }))}
          label={<span className="sr-only">Push protection for {r.name}</span>}
        />
      ),
    },
  ];
  const enabled = Object.values(protection).filter(Boolean).length;
  return (
    <>
      <PageHeader
        title="Repositories"
        description="41 repositories from GitHub and GitLab. New repositories are added automatically."
        actions={
          <Button variant="primary" icon={<Plus />}>
            Add organisation
          </Button>
        }
      />
      <KpiGrid>
        <KpiCard label="Repositories" value="41" unit="12 public" />
        <KpiCard
          label="Push protection"
          value={`${enabled + 33}`}
          unit="/ 41"
          tone={enabled + 33 < 41 ? "warning" : "success"}
          delta={{ label: "Blocked 6 pushes this month" }}
        />
        <KpiCard label="Commits scanned · 7 d" value="3,214" delta={{ label: "Median 2.1 s per push" }} />
        <KpiCard label="With open findings" value="6" tone="danger" delta={{ label: "1 public repository", intent: "bad" }} />
      </KpiGrid>
      <FilterBar onClear={vis.length || query ? () => (setVis([]), setQuery("")) : undefined}>
        <SearchInput label="Search repositories" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />
        <FacetFilter
          label="Visibility"
          selected={vis}
          onChange={setVis}
          options={(["public", "private", "internal"] as const).map((v) => ({ value: v, count: REPOS.filter((r) => r.visibility === v).length }))}
        />
      </FilterBar>
      <Panel title="Repositories" description={`${shown.length} shown`} flush>
        <DataTable label="Repositories" columns={cols} rows={shown} getRowId={(r) => r.id} minWidth={980} defaultSort={{ id: "findings", direction: "desc" }} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

interface Layer {
  n: number;
  instr: string;
  size: string;
  secret?: string;
}

interface Image {
  id: string;
  ref: string;
  digest: string;
  base: string;
  pushed: string;
  layers: Layer[];
  status: "clean" | "finding" | "scanning";
}

const IMAGES: Image[] = [
  {
    id: "i1",
    ref: "payments-api:1.9.0",
    digest: "sha256:4be1…c09a",
    base: "python:3.12-slim",
    pushed: "3 days ago",
    status: "finding",
    layers: [
      { n: 1, instr: "FROM python:3.12-slim", size: "45 MB" },
      { n: 2, instr: "RUN apt-get update && apt-get install -y libpq5", size: "12 MB" },
      { n: 3, instr: "WORKDIR /app", size: "0 B" },
      { n: 4, instr: "COPY requirements.txt .", size: "1 KB" },
      { n: 5, instr: "RUN pip install --no-cache-dir -r requirements.txt", size: "88 MB" },
      { n: 6, instr: "COPY src/ /app/", size: "3 MB" },
      { n: 7, instr: "COPY certs/ /app/certs/", size: "6 KB", secret: "Private RSA key · /app/certs/server.key · -----BEGIN RSA PRIVATE KEY----- ••••" },
      { n: 8, instr: 'CMD ["gunicorn", "payments.wsgi"]', size: "0 B" },
    ],
  },
  {
    id: "i2",
    ref: "orders-api:2.4.1",
    digest: "sha256:91ac…7e12",
    base: "node:22-alpine",
    pushed: "6 h ago",
    status: "clean",
    layers: [
      { n: 1, instr: "FROM node:22-alpine", size: "52 MB" },
      { n: 2, instr: "COPY package*.json ./", size: "410 KB" },
      { n: 3, instr: "RUN npm ci --omit=dev", size: "61 MB" },
      { n: 4, instr: "COPY dist/ ./dist", size: "4 MB" },
    ],
  },
  {
    id: "i3",
    ref: "reports-cron:0.8.3",
    digest: "sha256:0e7d…a441",
    base: "debian:12-slim",
    pushed: "Yesterday",
    status: "finding",
    layers: [
      { n: 1, instr: "FROM debian:12-slim", size: "29 MB" },
      { n: 2, instr: "ENV AWS_ACCESS_KEY_ID=AKIA…J4PL", size: "0 B", secret: "AWS access key in ENV · AKIA••••••••••••J4PL" },
      { n: 3, instr: "COPY run.sh /opt/reports/", size: "2 KB" },
    ],
  },
  {
    id: "i4",
    ref: "checkout-web:5.2.0",
    digest: "sha256:7aa9…31f0",
    base: "nginx:1.27-alpine",
    pushed: "2 h ago",
    status: "scanning",
    layers: [
      { n: 1, instr: "FROM nginx:1.27-alpine", size: "20 MB" },
      { n: 2, instr: "COPY build/ /usr/share/nginx/html", size: "9 MB" },
    ],
  },
  {
    id: "i5",
    ref: "edge-proxy:1.3.7",
    digest: "sha256:c2f0…9b13",
    base: "envoyproxy/envoy:v1.31",
    pushed: "4 days ago",
    status: "clean",
    layers: [
      { n: 1, instr: "FROM envoyproxy/envoy:v1.31", size: "70 MB" },
      { n: 2, instr: "COPY envoy.yaml /etc/envoy/", size: "8 KB" },
    ],
  },
];

const IMG_STATUS = {
  clean: { label: "Clean", tone: "success" },
  finding: { label: "Secret found", tone: "danger" },
  scanning: { label: "Scanning", tone: "info" },
} as const;

function ImagesPage() {
  const [active, setActive] = useState("i1");
  const img = IMAGES.find((i) => i.id === active)!;
  const cols: Column<Image>[] = [
    {
      id: "ref",
      header: "Image",
      width: "34%",
      sortValue: (i) => i.ref,
      cell: (i) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-medium">registry.example.com/{i.ref}</span>
          <span className="truncate font-mono text-2xs text-fg-muted">{i.digest}</span>
        </span>
      ),
    },
    { id: "base", header: "Base", mono: true, cell: (i) => <span className="text-xs">{i.base}</span> },
    { id: "layers", header: "Layers", align: "right", mono: true, sortValue: (i) => i.layers.length, cell: (i) => i.layers.length },
    { id: "pushed", header: "Pushed", cell: (i) => <span className="whitespace-nowrap text-fg-muted">{i.pushed}</span> },
    {
      id: "status",
      header: "Result",
      sortValue: (i) => i.status,
      cell: (i) => <StatusBadge tone={IMG_STATUS[i.status].tone}>{IMG_STATUS[i.status].label}</StatusBadge>,
    },
  ];
  return (
    <>
      <PageHeader title="Images" description="61 images in registry.example.com. Every layer is unpacked and scanned on push, including deleted files." />
      <KpiGrid>
        <KpiCard label="Images" value="61" unit="312 tags" />
        <KpiCard label="Layers scanned · 7 d" value="1,904" delta={{ label: "Shared layers scanned once" }} />
        <KpiCard label="Images with secrets" value="2" tone="danger" delta={{ label: "Both running in prod", intent: "bad" }} />
        <KpiCard label="Secrets in ENV" value="1" tone="warning" delta={{ label: "Visible in docker inspect" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Images" description="Click an image to see its layers" flush>
          <DataTable
            label="Container images"
            columns={cols}
            rows={IMAGES}
            getRowId={(i) => i.id}
            onRowClick={(i) => setActive(i.id)}
            activeRowId={active}
            minWidth={760}
          />
        </Panel>
        <Panel title={<span className="font-mono">{img.ref}</span>} description={`${img.layers.length} layers · base ${img.base}`} aria-label="Image layers">
          <ol className="flex flex-col">
            {img.layers.map((l) => (
              <li
                key={l.n}
                className={
                  l.secret
                    ? "flex flex-col gap-1 rounded-md border border-danger/30 bg-danger-soft px-2 py-1.5"
                    : "flex flex-col gap-1 border-b border-subtle px-2 py-1.5 last:border-0"
                }
              >
                <span className="grid grid-cols-[24px_minmax(0,1fr)_auto] items-start gap-2">
                  <span className="font-mono text-2xs text-fg-muted">{l.n}</span>
                  <code className="font-mono text-xs break-all">{l.instr}</code>
                  <span className="font-mono text-2xs text-fg-muted">{l.size}</span>
                </span>
                {l.secret && <span className="pl-8 text-xs text-danger-text">{l.secret}</span>}
              </li>
            ))}
          </ol>
          {img.status === "finding" && (
            <Callout tone="warning" title="Removing the file in a later layer does not help" className="mt-2.5">
              Rebuild without the secret and delete the old tags. Inject secrets at runtime from the secrets store.
            </Callout>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* CI logs                                                             */
/* ------------------------------------------------------------------ */

interface Job {
  id: string;
  pipeline: string;
  job: string;
  runner: string;
  when: string;
  lines: number;
  hits: number;
}

const JOBS: Job[] = [
  { id: "8812", pipeline: "platform/deploy", job: "deploy-staging", runner: "ci-02", when: "Yesterday 16:40", lines: 482, hits: 1 },
  { id: "8840", pipeline: "acme/orders-api", job: "integration-tests", runner: "ci-01", when: "Today 11:02", lines: 1_904, hits: 0 },
  { id: "8843", pipeline: "data/etl-jobs", job: "dbt-run", runner: "ci-03", when: "Today 12:15", lines: 733, hits: 2 },
  { id: "8851", pipeline: "acme/checkout-web", job: "build", runner: "ci-01", when: "Today 13:30", lines: 260, hits: 0 },
  { id: "8856", pipeline: "platform/terraform-live", job: "plan-prod", runner: "ci-02", when: "Today 13:51", lines: 1_120, hits: 0 },
];

const LOG: Record<string, Array<{ n: number; text: string; hit?: boolean }>> = {
  "8812": [
    { n: 209, text: "$ ./scripts/notify.sh staging" },
    { n: 210, text: "+ set -x" },
    { n: 211, text: "+ CHANNEL=#deploys" },
    { n: 212, text: "+ VERSION=2.4.1-rc3" },
    { n: 213, text: "+ curl -sS -X POST https://slack.example.com/api/chat.postMessage \\" },
    { n: 214, text: "    -H 'Authorization: Bearer xoxb-••••••••••••-8Kq2' \\", hit: true },
    { n: 215, text: "    -d channel=#deploys -d text='Deployed 2.4.1-rc3 to staging'" },
    { n: 216, text: '{"ok":true,"channel":"C04…","ts":"1729262412.000200"}' },
    { n: 217, text: "Job succeeded" },
  ],
  "8843": [
    { n: 88, text: "$ dbt run --profiles-dir ." },
    { n: 89, text: "Connecting to warehouse.example.com:8443 as etl_user" },
    { n: 90, text: "DEBUG: DSN=clickhouse://etl_user:••••••••@warehouse.example.com:8443/analytics", hit: true },
    { n: 91, text: "Running with dbt=1.8.7" },
    { n: 92, text: "export DBT_ENV_SECRET_TOKEN=dbtc_••••••••••••Zq1", hit: true },
    { n: 93, text: "Found 214 models, 61 tests" },
  ],
};

function CiLogsPage() {
  const [active, setActive] = useState("8812");
  const [erased, setErased] = useState<string[]>([]);
  const job = JOBS.find((j) => j.id === active)!;
  const lines = LOG[active] ?? [{ n: 1, text: "No secrets found in this job log." }];
  const cols: Column<Job>[] = [
    { id: "id", header: "Job", width: "100px", mono: true, sortValue: (j) => Number(j.id), cell: (j) => `#${j.id}` },
    {
      id: "pipeline",
      header: "Pipeline",
      cell: (j) => (
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{j.pipeline}</span>
          <span className="truncate text-2xs text-fg-muted">{j.job}</span>
        </span>
      ),
    },
    { id: "runner", header: "Runner", mono: true, cell: (j) => j.runner },
    { id: "when", header: "Finished", cell: (j) => <span className="whitespace-nowrap text-fg-muted">{j.when}</span> },
    {
      id: "hits",
      header: "Secrets",
      align: "right",
      sortValue: (j) => j.hits,
      cell: (j) => (erased.includes(j.id) ? <Badge>Erased</Badge> : j.hits ? <Badge tone="danger">{j.hits}</Badge> : <span className="text-fg-muted">0</span>),
    },
  ];
  return (
    <>
      <PageHeader
        title="CI logs"
        description="Job logs from 3 GitLab runners and GitHub Actions are scanned as they stream. Matches are masked before storage."
      />
      <Callout tone="info" title="Turn on runner-side masking">
        The runner plugin masks known secret formats before logs leave the runner, so they never reach GitLab.
      </Callout>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <Panel title="Jobs" description="Last 24 hours" flush>
          <DataTable
            label="CI jobs"
            columns={cols}
            rows={JOBS}
            getRowId={(j) => j.id}
            onRowClick={(j) => setActive(j.id)}
            activeRowId={active}
            defaultSort={{ id: "hits", direction: "desc" }}
            minWidth={560}
          />
        </Panel>
        <Panel
          title={`Job #${job.id} · ${job.job}`}
          description={`${job.pipeline} · runner ${job.runner} · ${job.lines} lines`}
          actions={
            <Button
              size="sm"
              variant="danger"
              icon={<Trash2 />}
              disabled={!job.hits || erased.includes(job.id)}
              onClick={() => setErased((e) => [...e, job.id])}
            >
              Erase job log
            </Button>
          }
        >
          <div tabIndex={0} role="region" aria-label={`Log of job ${job.id}`} className="max-h-80 overflow-auto rounded-md border border-line bg-subtle py-1.5">
            {erased.includes(job.id) ? (
              <p className="px-2.5 font-mono text-xs text-fg-muted">Log erased in GitLab by Emily Clark. Finding kept with masked value.</p>
            ) : (
              lines.map((l) => (
                <div
                  key={l.n}
                  className={
                    l.hit
                      ? "grid grid-cols-[40px_minmax(0,1fr)] gap-2 bg-danger-soft px-2.5 font-mono text-xs text-danger-text"
                      : "grid grid-cols-[40px_minmax(0,1fr)] gap-2 px-2.5 font-mono text-xs"
                  }
                >
                  <span className="text-right text-fg-muted select-none">{l.n}</span>
                  <span className="break-all whitespace-pre-wrap">{l.text}</span>
                </div>
              ))
            )}
          </div>
          {erased.includes(job.id) && (
            <p role="status" className="mt-2 text-xs text-success">
              Job log #{job.id} erased
            </p>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Validators                                                          */
/* ------------------------------------------------------------------ */

interface Validator {
  id: string;
  type: string;
  provider: string;
  method: string;
  detector: string;
  verified: number;
  enabled: boolean;
  scope: string;
}

const VALIDATORS: Validator[] = [
  {
    id: "v1",
    type: "AWS access key",
    provider: "AWS",
    method: "sts:GetCallerIdentity",
    detector: "aws-access-key-id + secret pair",
    verified: 3,
    enabled: true,
    scope: "Read-only, no side effects",
  },
  {
    id: "v2",
    type: "GitHub PAT",
    provider: "GitHub",
    method: "GET /user",
    detector: "ghp_, github_pat_",
    verified: 2,
    enabled: true,
    scope: "Reads token owner and scopes",
  },
  {
    id: "v3",
    type: "Slack bot token",
    provider: "Slack",
    method: "auth.test",
    detector: "xoxb-, xoxp-",
    verified: 1,
    enabled: true,
    scope: "Reads workspace and bot id",
  },
  {
    id: "v4",
    type: "Stripe live key",
    provider: "Stripe",
    method: "GET /v1/balance",
    detector: "sk_live_, rk_live_",
    verified: 0,
    enabled: false,
    scope: "Reads balance; disabled by policy",
  },
  {
    id: "v5",
    type: "Google API key",
    provider: "Google Cloud",
    method: "GET tokeninfo",
    detector: "AIza…",
    verified: 0,
    enabled: true,
    scope: "No data access",
  },
  {
    id: "v6",
    type: "Twilio auth token",
    provider: "Twilio",
    method: "GET /Accounts/{sid}",
    detector: "SK…, AC… pair",
    verified: 0,
    enabled: true,
    scope: "Reads account status",
  },
  {
    id: "v7",
    type: "Private key",
    provider: "–",
    method: "No live check",
    detector: "PEM headers",
    verified: 0,
    enabled: false,
    scope: "Matched certificate inventory instead",
  },
  {
    id: "v8",
    type: "Postgres URI",
    provider: "Database",
    method: "TCP handshake only",
    detector: "postgres://user:pass@",
    verified: 1,
    enabled: true,
    scope: "Never authenticates",
  },
];

function ValidatorsPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(Object.fromEntries(VALIDATORS.map((v) => [v.id, v.enabled])));
  const [query, setQuery] = useState("");
  const shown = VALIDATORS.filter((v) => `${v.type} ${v.provider}`.toLowerCase().includes(query.toLowerCase()));
  const cols: Column<Validator>[] = [
    {
      id: "type",
      header: "Secret type",
      width: "20%",
      sortValue: (v) => v.type,
      cell: (v) => (
        <span className="flex flex-col">
          <span className="font-medium">{v.type}</span>
          <span className="text-2xs text-fg-muted">{v.provider}</span>
        </span>
      ),
    },
    { id: "detector", header: "Detector", mono: true, cell: (v) => <span className="text-xs">{v.detector}</span> },
    {
      id: "method",
      header: "Live check",
      mono: true,
      description: "The API call made with the found secret to see if it still works. Calls go out from validator.example.com.",
      cell: (v) => <span className="text-xs">{v.method}</span>,
    },
    { id: "scope", header: "Effect", cell: (v) => <span className="text-xs text-fg-muted">{v.scope}</span> },
    {
      id: "verified",
      header: "Verified active",
      align: "right",
      mono: true,
      sortValue: (v) => v.verified,
      cell: (v) => (v.verified ? <span className="font-semibold text-danger-text">{v.verified}</span> : "0"),
    },
    {
      id: "on",
      header: "Validate",
      width: "90px",
      align: "right",
      cell: (v) => (
        <Switch
          checked={enabled[v.id] ?? false}
          onCheckedChange={(x) => setEnabled((e) => ({ ...e, [v.id]: x }))}
          label={<span className="sr-only">Validate {v.type}</span>}
        />
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Validators" description="Which secret types are checked live against the provider. Only checks without side effects are used." />
      <KpiGrid>
        <KpiCard label="Detectors" value="214" unit="secret types" />
        <KpiCard label="Live validators" value={Object.values(enabled).filter(Boolean).length + 34} unit="enabled" />
        <KpiCard label="Validations · 24 h" value="1,288" delta={{ label: "Re-checked every 6 h until revoked" }} />
        <KpiCard label="Provider errors · 24 h" value="4" tone="warning" delta={{ label: "Twilio rate limited" }} />
      </KpiGrid>
      <FilterBar>
        <SearchInput label="Search secret types" value={query} onChange={(e) => setQuery(e.target.value)} className="w-60" />
      </FilterBar>
      <Panel title="Validators" flush>
        <DataTable label="Secret validators" columns={cols} rows={shown} getRowId={(v) => v.id} minWidth={980} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Exceptions                                                          */
/* ------------------------------------------------------------------ */

interface SecretException {
  id: string;
  kind: "Path" | "Fingerprint" | "Rule";
  value: string;
  repo: string;
  reason: string;
  by: string;
  expires: string;
}

const SECRET_EXCEPTIONS: SecretException[] = [
  {
    id: "x1",
    kind: "Path",
    value: "**/testdata/**",
    repo: "All repositories",
    reason: "Fixtures with fake keys used by unit tests",
    by: PEOPLE[1],
    expires: "Never",
  },
  {
    id: "x2",
    kind: "Path",
    value: "docs/examples/*.md",
    repo: "acme/docs-site",
    reason: "Documentation uses AKIAIOSFODNN7EXAMPLE style placeholders",
    by: PEOPLE[5],
    expires: "Never",
  },
  {
    id: "x3",
    kind: "Fingerprint",
    value: "fp:7a91c2…e04b",
    repo: "acme/checkout-web",
    reason: "Stripe test-mode key, no access to live data",
    by: PEOPLE[7],
    expires: "Jan 31",
  },
  {
    id: "x4",
    kind: "Rule",
    value: "generic-high-entropy-string",
    repo: "data/etl-jobs",
    reason: "Hashes in dbt seeds trigger the entropy rule",
    by: PEOPLE[6],
    expires: "Dec 15",
  },
];

function SecretExceptionsPage() {
  const [rows, setRows] = useState(SECRET_EXCEPTIONS);
  const [kind, setKind] = useState<SecretException["kind"]>("Path");
  const [value, setValue] = useState("");
  const [reason, setReason] = useState("");
  const cols: Column<SecretException>[] = [
    { id: "kind", header: "Type", width: "110px", cell: (x) => <Badge>{x.kind}</Badge> },
    { id: "value", header: "Value", mono: true, cell: (x) => <span className="text-xs">{x.value}</span> },
    { id: "repo", header: "Repository", cell: (x) => <span className="text-xs">{x.repo}</span> },
    { id: "reason", header: "Reason", width: "30%", cell: (x) => <span className="line-clamp-2 text-xs text-fg-muted">{x.reason}</span> },
    { id: "by", header: "Added by", cell: (x) => <span className="whitespace-nowrap">{x.by}</span> },
    { id: "exp", header: "Expires", cell: (x) => (x.expires === "Never" ? <StatusBadge tone="warning">Never</StatusBadge> : x.expires) },
    {
      id: "act",
      header: <span className="sr-only">Actions</span>,
      label: "Actions",
      width: "44px",
      align: "right",
      hideable: false,
      cell: (x) => (
        <IconButton label={`Remove exception ${x.value}`} size="xs" onClick={() => setRows((rs) => rs.filter((r) => r.id !== x.id))}>
          <Trash2 />
        </IconButton>
      ),
    },
  ];
  return (
    <>
      <PageHeader title="Exceptions" description="Paths, fingerprints and rules ignored by the scanner. Verified active secrets can never be excepted." />
      <Panel title="Add an exception">
        <form
          className="grid gap-2.5 md:grid-cols-[140px_minmax(0,1fr)_minmax(0,1.5fr)_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            if (!value.trim()) return;
            setRows((rs) => [
              {
                id: `x${rs.length + 10}`,
                kind,
                value: value.trim(),
                repo: "All repositories",
                reason: reason.trim() || "–",
                by: "Emily Clark",
                expires: "Jan 19",
              },
              ...rs,
            ]);
            setValue("");
            setReason("");
          }}
        >
          <SelectField
            label="Type"
            value={kind}
            onChange={(e) => setKind(e.target.value as SecretException["kind"])}
            options={(["Path", "Fingerprint", "Rule"] as const).map((k) => ({ value: k, label: k }))}
          />
          <TextField
            label="Value"
            mono
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={kind === "Path" ? "**/fixtures/**" : kind === "Fingerprint" ? "fp:…" : "rule id"}
          />
          <TextField label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Button type="submit" variant="primary" icon={<Plus />}>
            Add exception
          </Button>
        </form>
      </Panel>
      <Panel title="Exceptions" description={`${rows.length} rules`} flush>
        <DataTable label="Secret exceptions" columns={cols} rows={rows} getRowId={(x) => x.id} minWidth={900} />
      </Panel>
    </>
  );
}

const PAGES = {
  findings: () => <FindingsPage />,
  repositories: () => <RepositoriesPage />,
  images: () => <ImagesPage />,
  "ci-logs": () => <CiLogsPage />,
  validators: () => <ValidatorsPage />,
  exceptions: () => <SecretExceptionsPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="secrets" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page                                               */
/* ------------------------------------------------------------------ */

export const Findings: Story = {
  ...app("findings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Secret findings" });
    // Full secrets are never rendered.
    await expect(within(table).getByText("AKIA••••••••••••QX7Z")).toBeInTheDocument();
    await userEvent.click(within(table).getByText("Slack bot token"));
    await expect(c.getByText("How to rotate")).toBeInTheDocument();
    await expect(c.getByText(/Regenerate the bot token/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Mark revoked: Slack bot token" }));
    await expect(c.getByText("Already revoked")).toBeInTheDocument();
    await expect(c.getByRole("button", { name: "Mark revoked: Slack bot token" })).toBeDisabled();
    await userEvent.click(c.getByRole("button", { name: "Close detail" }));
    await expect(c.queryByText("Already revoked")).not.toBeInTheDocument();
  },
};

export const Repositories: Story = {
  ...app("repositories"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "Push protection for acme/legacy-portal" });
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.type(c.getByRole("searchbox", { name: "Search repositories" }), "platform");
    await expect(c.getByRole("table", { name: "Repositories" }).querySelectorAll("tbody tr")).toHaveLength(2);
  },
};

export const Images: Story = {
  ...app("images"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Image layers")).toHaveTextContent("COPY certs/ /app/certs/");
    await userEvent.click(c.getByText("registry.example.com/reports-cron:0.8.3"));
    await expect(c.getByLabelText("Image layers")).toHaveTextContent("AKIA••••••••••••J4PL");
  },
};

export const CiLogs: Story = {
  name: "CI logs",
  ...app("ci-logs"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("region", { name: "Log of job 8812" })).toHaveTextContent("xoxb-••••••••••••-8Kq2");
    await userEvent.click(c.getByRole("button", { name: "Erase job log" }));
    await expect(c.getByText("Job log #8812 erased")).toBeInTheDocument();
    await userEvent.click(c.getByText("#8843"));
    await expect(c.getByRole("region", { name: "Log of job 8843" })).toHaveTextContent("dbtc_••••••••••••Zq1");
  },
};

export const Validators: Story = {
  ...app("validators"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "Validate Stripe live key" });
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "true");
    await userEvent.type(c.getByRole("searchbox", { name: "Search secret types" }), "slack");
    await expect(c.getByRole("table", { name: "Secret validators" }).querySelectorAll("tbody tr")).toHaveLength(1);
  },
};

export const Exceptions: Story = {
  ...app("exceptions"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.type(c.getByRole("textbox", { name: "Value" }), "**/fixtures/**");
    await userEvent.type(c.getByRole("textbox", { name: "Reason" }), "Fake keys for tests");
    await userEvent.click(c.getByRole("button", { name: "Add exception" }));
    await expect(within(c.getByRole("table", { name: "Secret exceptions" })).getByText("**/fixtures/**")).toBeInTheDocument();
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
