import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Container, FileText, Fingerprint, GitCommitHorizontal, Hammer, Package, Plus, Scale, ScrollText, ShieldCheck, Workflow } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { SegmentedControl } from "../../components/SegmentedControl";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter } from "../../components/Filters";
import { SearchInput, SelectField } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { BarList } from "../../charts/BarList";
import { formatNumber } from "../../lib/format";
import { wave } from "../mocks";

const nav = [
  { id: "images", label: "Images", icon: Container, count: 61 },
  { id: "signatures", label: "Signatures", icon: Fingerprint },
  { id: "sboms", label: "SBOMs", icon: FileText },
  { id: "provenance", label: "Provenance", icon: GitCommitHorizontal },
  { id: "policies", label: "Policies", icon: ShieldCheck, count: 5 },
  { id: "licences", label: "Licences", icon: Scale },
];

const meta = {
  title: "Products/Supply Chain",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Licence = "pass" | "warn" | "fail";

interface Image {
  id: string;
  ref: string;
  digest: string;
  signed: boolean;
  slsa: 0 | 1 | 2 | 3;
  sbom: boolean;
  critical: number;
  licence: Licence;
  licenceNote: string;
  deployed: string[];
  repo: string;
  commit: string;
  workflow: string;
  runId: string;
  builder: string;
}

const images: Image[] = [
  { id: "img-api", ref: "ghcr.io/acme/api:1.42.0", digest: "sha256:4f9c1e2a7b3d", signed: true, slsa: 3, sbom: true, critical: 0, licence: "pass", licenceNote: "All allowed", deployed: ["prod", "staging"], repo: "acme/api", commit: "a1c9e07", workflow: ".github/workflows/release.yml", runId: "#8812", builder: "slsa-github-generator v2.0.0" },
  { id: "img-web", ref: "ghcr.io/acme/web:3.8.1", digest: "sha256:b82e0d4c91fa", signed: true, slsa: 3, sbom: true, critical: 1, licence: "pass", licenceNote: "All allowed", deployed: ["prod"], repo: "acme/web", commit: "5e2b1f4", workflow: ".github/workflows/release.yml", runId: "#4410", builder: "slsa-github-generator v2.0.0" },
  { id: "img-worker", ref: "ghcr.io/acme/worker:2.19.3", digest: "sha256:0c7a55e9d213", signed: true, slsa: 3, sbom: true, critical: 0, licence: "warn", licenceNote: "LGPL-3.0 in libmagic", deployed: ["prod", "staging"], repo: "acme/worker", commit: "9d04c3a", workflow: ".github/workflows/build.yml", runId: "#2276", builder: "slsa-github-generator v2.0.0" },
  { id: "img-billing", ref: "ghcr.io/acme/billing:0.31.0", digest: "sha256:e1f3a0b8c6d7", signed: true, slsa: 2, sbom: true, critical: 3, licence: "pass", licenceNote: "All allowed", deployed: ["staging"], repo: "acme/billing", commit: "c77e812", workflow: ".github/workflows/ci.yml", runId: "#991", builder: "GitHub-hosted runner ubuntu-24.04" },
  { id: "img-gateway", ref: "ghcr.io/acme/gateway:5.2.0", digest: "sha256:7a2d9e4f1b05", signed: true, slsa: 3, sbom: true, critical: 0, licence: "pass", licenceNote: "All allowed", deployed: ["prod"], repo: "acme/gateway", commit: "3f6a90d", workflow: ".github/workflows/release.yml", runId: "#1532", builder: "slsa-github-generator v2.0.0" },
  { id: "img-reports", ref: "ghcr.io/acme/reports:1.0.4", digest: "sha256:2b6e8c0a4f37", signed: false, slsa: 1, sbom: false, critical: 2, licence: "fail", licenceNote: "AGPL-3.0 in pdf-render", deployed: ["staging"], repo: "acme/reports", commit: "e4d1b29", workflow: "manual docker push", runId: "–", builder: "Developer laptop (unverified)" },
  { id: "img-nginx", ref: "docker.io/library/nginx:1.27.2", digest: "sha256:d4a1f8e3c902", signed: false, slsa: 0, sbom: true, critical: 0, licence: "pass", licenceNote: "All allowed", deployed: ["dev"], repo: "nginx/docker-nginx", commit: "upstream", workflow: "Docker Official Images", runId: "–", builder: "Docker Hub (third party)" },
  { id: "img-migrate", ref: "ghcr.io/acme/migrate:4.17.1", digest: "sha256:9e0b3c7d5a18", signed: true, slsa: 3, sbom: true, critical: 0, licence: "pass", licenceNote: "All allowed", deployed: ["prod", "staging"], repo: "acme/migrate", commit: "0ab7e55", workflow: ".github/workflows/release.yml", runId: "#640", builder: "slsa-github-generator v2.0.0" },
];

const LICENCE: Record<Licence, { label: string; tone: "success" | "warning" | "danger" }> = {
  pass: { label: "Pass", tone: "success" },
  warn: { label: "Review", tone: "warning" },
  fail: { label: "Blocked", tone: "danger" },
};

const columns: Column<Image>[] = [
  {
    id: "image",
    header: "Image",
    width: "26%",
    sortValue: (i) => i.ref,
    cell: (i) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-mono text-xs font-medium">{i.ref}</span>
        <span className="truncate font-mono text-2xs text-fg-muted">{i.digest}…</span>
      </span>
    ),
  },
  {
    id: "signed",
    header: "Signature",
    sortValue: (i) => (i.signed ? 1 : 0),
    cell: (i) => (i.signed ? <StatusBadge tone="success">Signed · cosign keyless</StatusBadge> : <StatusBadge tone="danger">Unsigned</StatusBadge>),
  },
  {
    id: "slsa",
    header: "SLSA",
    align: "center",
    sortValue: (i) => i.slsa,
    cell: (i) => (
      <Badge tone={i.slsa === 3 ? "success" : i.slsa === 0 ? "neutral" : "warning"} mono>
        L{i.slsa}
      </Badge>
    ),
  },
  { id: "sbom", header: "SBOM", cell: (i) => (i.sbom ? <span className="text-xs text-success">SPDX 2.3</span> : <span className="text-xs text-danger-text">Missing</span>) },
  {
    id: "crit",
    header: "Critical vulns",
    align: "right",
    sortValue: (i) => i.critical,
    cell: (i) =>
      i.critical > 0 ? (
        <a href={`#vulnerabilities/${i.id}`} aria-label={`${i.critical} critical vulnerabilities in ${i.ref}`} className="font-mono text-xs font-semibold text-danger-text">
          {i.critical}
        </a>
      ) : (
        <span className="font-mono text-xs text-fg-muted">0</span>
      ),
  },
  { id: "lic", header: "Licence policy", cell: (i) => <Badge tone={LICENCE[i.licence].tone} title={i.licenceNote}>{LICENCE[i.licence].label}</Badge> },
  {
    id: "deployed",
    header: "Deployed to",
    cell: (i) => (
      <span className="flex flex-wrap gap-1">
        {i.deployed.map((d) => (
          <Badge key={d} mono tone={d === "prod" ? "info" : "neutral"}>
            {d}
          </Badge>
        ))}
      </span>
    ),
  },
];

const policies = [
  { id: "p1", name: "Only signed images from ghcr.io/acme may run in prod", mode: "Enforce", pass: 412, fail: 0 },
  { id: "p2", name: "Prod images need SLSA level 3 provenance", mode: "Enforce", pass: 398, fail: 0 },
  { id: "p3", name: "Every image ships an SBOM", mode: "Warn", pass: 58, fail: 3 },
  { id: "p4", name: "No AGPL or SSPL licences", mode: "Enforce", pass: 60, fail: 1 },
  { id: "p5", name: "No critical CVE older than 14 days", mode: "Warn", pass: 55, fail: 6 },
];

function ProvenanceChain({ image }: { image: Image }) {
  const steps = [
    { icon: GitCommitHorizontal, title: "Source commit", value: `${image.repo}@${image.commit}`, note: "github.com · signed commit" },
    { icon: Workflow, title: "GitHub Actions workflow", value: image.workflow, note: `run ${image.runId}` },
    { icon: Hammer, title: "Builder", value: image.builder, note: image.slsa >= 3 ? "isolated, non-falsifiable provenance" : "provenance not verifiable" },
    { icon: Package, title: "Image digest", value: `${image.digest}…`, note: image.signed ? "Rekor entry 128,904,113" : "no transparency log entry" },
  ];
  return (
    <ol aria-label={`Provenance chain for ${image.ref}`} className="flex flex-col">
      {steps.map((s, i) => (
        <li key={s.title} className="relative grid grid-cols-[24px_minmax(0,1fr)] gap-2.5 pb-3 last:pb-0">
          {i < steps.length - 1 && <span aria-hidden className="absolute top-6 bottom-0 left-[11px] w-px bg-line" />}
          <span className="grid size-6 place-items-center rounded-full border border-line bg-canvas text-fg-muted">
            <s.icon aria-hidden className="size-3.5" />
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{s.title}</span>
            <span className="truncate font-mono text-xs text-fg">{s.value}</span>
            <span className="text-2xs text-fg-muted">{s.note}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Images: every container image with its signature, provenance, SBOM, vulnerabilities and licence result. */
function ImagesPage() {
  const [selected, setSelected] = useState("img-api");
  const [env, setEnv] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const rows = images.filter((i) => (env.length === 0 || i.deployed.some((d) => env.includes(d))) && (!q || i.ref.includes(q.toLowerCase())));
  const current = images.find((i) => i.id === selected);
  return (
    <>
      <PageHeader
        title="Images"
        description="61 images in 3 registries · verified at admission by the Kubernetes policy controller"
        meta={<StatusBadge tone="success">Admission enforcing</StatusBadge>}
        actions={
          <>
            <Button size="md" icon={<ScrollText aria-hidden />}>
              Export SBOMs
            </Button>
            <Button size="md" variant="primary" icon={<Plus aria-hidden />}>
              New policy
            </Button>
          </>
        }
      />
      <FilterBar
        onClear={
          env.length || q
            ? () => {
                setEnv([]);
                setQ("");
              }
            : undefined
        }
      >
        <FacetFilter
          label="Environment"
          selected={env}
          onChange={setEnv}
          options={["prod", "staging", "dev"].map((d) => ({ value: d, count: images.filter((i) => i.deployed.includes(d)).length }))}
        />
        <SearchInput label="Search images" className="w-64" value={q} onChange={(e) => setQ(e.target.value)} />
      </FilterBar>
      <KpiGrid>
        <KpiCard label="Signed" value="93%" unit="57 of 61 images" trend={wave(12, { base: 88, amp: 4, seed: 21 })} delta={{ label: "+5 pts this month", direction: "up", intent: "good" }} />
        <KpiCard label="Verified at admission" value="100%" unit="of prod pods" delta={{ label: "0 unsigned in prod", intent: "good" }} />
        <KpiCard label="SLSA level 3 builds" value="48" unit="of 61" delta={{ label: "4 still on self-hosted runners" }} />
        <KpiCard label="Policy violations" value="10" unit="open" tone="danger" delta={{ label: "1 blocked at admission today", direction: "up", intent: "bad" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="Images" description="Select an image to see its provenance" flush>
          <DataTable
            label="Images"
            columns={columns}
            rows={rows}
            getRowId={(i) => i.id}
            onRowClick={(i) => setSelected(i.id)}
            activeRowId={selected}
            minWidth={960}
            empty={<p className="py-8">No images match these filters</p>}
          />
        </Panel>
        <div className="flex min-w-0 flex-col gap-2.5">
          <Panel title="Provenance" description={current ? current.ref : "No image selected"} aria-label="Provenance">
            {current ? <ProvenanceChain image={current} /> : <p className="py-6 text-center text-sm text-fg-muted">Select an image</p>}
          </Panel>
          <Panel title="Admission policies" description="Last 24 h" flush>
            <ul aria-label="Admission policies" className="flex flex-col">
              {policies.map((p) => (
                <li key={p.id} className="flex flex-col gap-1 border-b border-subtle px-3 py-2 last:border-0">
                  <span className="text-sm">{p.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5 text-2xs">
                    <Badge tone={p.mode === "Enforce" ? "info" : "neutral"}>{p.mode}</Badge>
                    <span className="font-mono text-success">{p.pass} pass</span>
                    <span className={p.fail ? "font-mono text-danger-text" : "font-mono text-fg-muted"}>{p.fail} fail</span>
                  </span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
      <Panel title="Repository" description="Where the selected image comes from">
        {current && (
          <span className="flex flex-wrap items-center gap-1.5 text-sm">
            <EntityChip kind="repo" value={current.repo} href="#repo" />
            <span className="text-fg-muted">built by</span>
            <span className="font-mono text-xs">{current.builder}</span>
          </span>
        )}
      </Panel>
    </>
  );
  
}

/* ------------------------------------------------------------------ */
/* Signatures                                                          */
/* ------------------------------------------------------------------ */

interface Verification {
  id: string;
  time: string;
  image: string;
  where: string;
  identity: string;
  issuer: string;
  rekor: string;
  result: "verified" | "rejected" | "warned";
  reason?: string;
}

const VERIFICATIONS: Verification[] = [
  { id: "v1", time: "13:58:04", image: "ghcr.io/acme/api:1.42.0", where: "prod · orders ns", identity: "https://github.com/acme/api/.github/workflows/release.yml@refs/tags/v1.42.0", issuer: "token.actions.githubusercontent.com", rekor: "128904113", result: "verified" },
  { id: "v2", time: "13:41:22", image: "ghcr.io/acme/reports:1.0.4", where: "prod · reports ns", identity: "–", issuer: "–", rekor: "–", result: "rejected", reason: "No signature found for digest sha256:2b6e8c0a4f37" },
  { id: "v3", time: "13:30:10", image: "ghcr.io/acme/web:3.8.1", where: "prod · web ns", identity: "https://github.com/acme/web/.github/workflows/release.yml@refs/tags/v3.8.1", issuer: "token.actions.githubusercontent.com", rekor: "128901877", result: "verified" },
  { id: "v4", time: "12:12:45", image: "docker.io/library/nginx:1.27.2", where: "dev · sandbox ns", identity: "–", issuer: "–", rekor: "–", result: "warned", reason: "Third-party image; dev namespace allows unsigned with a warning" },
  { id: "v5", time: "11:05:31", image: "ghcr.io/acme/worker:2.19.3", where: "staging · jobs ns", identity: "https://github.com/acme/worker/.github/workflows/build.yml@refs/heads/main", issuer: "token.actions.githubusercontent.com", rekor: "128880412", result: "verified" },
  { id: "v6", time: "10:44:02", image: "ghcr.io/acme/billing:0.31.0", where: "prod · billing ns", identity: "https://github.com/acme/billing/.github/workflows/ci.yml@refs/heads/feature/tax", issuer: "token.actions.githubusercontent.com", rekor: "128871990", result: "rejected", reason: "Signed from a feature branch; prod requires refs/tags/*" },
];

const VERIFY_TONE = { verified: "success", rejected: "danger", warned: "warning" } as const;

function SignaturesPage() {
  const [result, setResult] = useState<string[]>([]);
  const [active, setActive] = useState("v2");
  const rows = VERIFICATIONS.filter((v) => result.length === 0 || result.includes(v.result));
  const cur = VERIFICATIONS.find((v) => v.id === active);
  const cols: Column<Verification>[] = [
    { id: "time", header: "Time", mono: true, width: "90px", cell: (v) => v.time },
    { id: "image", header: "Image", width: "30%", cell: (v) => <span className="block truncate font-mono text-xs">{v.image}</span> },
    { id: "where", header: "Admission", cell: (v) => <span className="text-xs">{v.where}</span> },
    { id: "result", header: "Result", cell: (v) => <StatusBadge tone={VERIFY_TONE[v.result]}>{v.result}</StatusBadge> },
  ];
  return (
    <>
      <PageHeader title="Signatures" description="cosign keyless signatures checked at every pod admission against the Sigstore transparency log." />
      <KpiGrid>
        <KpiCard label="Verifications · 24 h" value="4,812" />
        <KpiCard label="Rejected" value="2" tone="danger" delta={{ label: "Both blocked before running", intent: "good" }} />
        <KpiCard label="Trusted identities" value="14" unit="workflows" />
        <KpiCard label="Signing keys to manage" value="0" tone="success" delta={{ label: "Keyless via GitHub OIDC" }} />
      </KpiGrid>
      <FilterBar onClear={result.length ? () => setResult([]) : undefined}>
        <FacetFilter label="Result" selected={result} onChange={setResult} options={(["verified", "rejected", "warned"] as const).map((r) => ({ value: r, count: VERIFICATIONS.filter((v) => v.result === r).length }))} />
      </FilterBar>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Admission checks" flush>
          <DataTable label="Signature checks" columns={cols} rows={rows} getRowId={(v) => v.id} onRowClick={(v) => setActive(v.id)} activeRowId={active} minWidth={720} />
        </Panel>
        <Panel title="Check detail" description={cur?.image} aria-label="Signature detail">
          {cur && (
            <div className="flex flex-col gap-2 text-sm">
              {cur.reason && <Callout tone={cur.result === "rejected" ? "danger" : "warning"} title={cur.reason} />}
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1">
                <dt className="text-fg-muted">Identity</dt>
                <dd className="font-mono text-xs break-all">{cur.identity}</dd>
                <dt className="text-fg-muted">Issuer</dt>
                <dd className="font-mono text-xs">{cur.issuer}</dd>
                <dt className="text-fg-muted">Rekor index</dt>
                <dd className="font-mono text-xs">{cur.rekor}</dd>
              </dl>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* SBOMs                                                               */
/* ------------------------------------------------------------------ */

interface Component {
  name: string;
  version: string;
  type: "npm" | "deb" | "go" | "pypi";
  licence: string;
  vulns: number;
}

const SBOM: Record<string, Component[]> = {
  "img-api": [
    { name: "express", version: "4.21.1", type: "npm", licence: "MIT", vulns: 0 },
    { name: "pg", version: "8.13.0", type: "npm", licence: "MIT", vulns: 0 },
    { name: "jsonwebtoken", version: "9.0.2", type: "npm", licence: "MIT", vulns: 0 },
    { name: "openssl", version: "3.0.13-0ubuntu3.4", type: "deb", licence: "Apache-2.0", vulns: 0 },
    { name: "libc6", version: "2.39-0ubuntu8.3", type: "deb", licence: "LGPL-2.1", vulns: 0 },
    { name: "zlib1g", version: "1:1.3.dfsg-3.1ubuntu2", type: "deb", licence: "Zlib", vulns: 0 },
  ],
  "img-reports": [
    { name: "pdf-render", version: "2.4.0", type: "npm", licence: "AGPL-3.0", vulns: 0 },
    { name: "lodash", version: "4.17.20", type: "npm", licence: "MIT", vulns: 1 },
    { name: "axios", version: "0.21.1", type: "npm", licence: "MIT", vulns: 1 },
    { name: "openssl", version: "1.1.1f-1ubuntu2", type: "deb", licence: "OpenSSL", vulns: 0 },
  ],
  "img-worker": [
    { name: "celery", version: "5.4.0", type: "pypi", licence: "BSD-3-Clause", vulns: 0 },
    { name: "python-magic", version: "0.4.27", type: "pypi", licence: "MIT", vulns: 0 },
    { name: "libmagic1", version: "1:5.45-3", type: "deb", licence: "LGPL-3.0", vulns: 0 },
    { name: "requests", version: "2.32.3", type: "pypi", licence: "Apache-2.0", vulns: 0 },
  ],
};

function SbomsPage() {
  const [image, setImage] = useState("img-api");
  const [q, setQ] = useState("");
  const [exported, setExported] = useState<string | null>(null);
  const img = images.find((i) => i.id === image)!;
  const comps = (SBOM[image] ?? []).filter((c) => !q || c.name.includes(q.toLowerCase()));
  const cols: Column<Component>[] = [
    { id: "name", header: "Package", mono: true, sortValue: (c) => c.name, cell: (c) => c.name },
    { id: "version", header: "Version", mono: true, cell: (c) => c.version },
    { id: "type", header: "Ecosystem", cell: (c) => <Badge mono>{c.type}</Badge> },
    { id: "licence", header: "Licence", mono: true, cell: (c) => c.licence },
    { id: "vulns", header: "Vulns", align: "right", mono: true, sortValue: (c) => c.vulns, cell: (c) => (c.vulns ? <Badge tone="danger">{c.vulns}</Badge> : 0) },
  ];
  return (
    <>
      <PageHeader
        title="SBOMs"
        description="SPDX 2.3 bills of materials generated at build time and attached to the image as an attestation."
        actions={
          <Button icon={<ScrollText />} onClick={() => setExported(`${img.ref}.spdx.json`)}>
            Export SPDX
          </Button>
        }
      />
      <FilterBar>
        <SelectField label="Image" value={image} onChange={(e) => (setImage(e.target.value), setExported(null))} options={images.filter((i) => SBOM[i.id]).map((i) => ({ value: i.id, label: i.ref }))} />
        <SearchInput label="Search packages" value={q} onChange={(e) => setQ(e.target.value)} className="w-56" />
      </FilterBar>
      {exported && (
        <p role="status" className="text-sm text-success">
          Exported {exported}
        </p>
      )}
      <Panel title={`Components of ${img.ref}`} description={`${comps.length} packages shown · digest ${img.digest}…`} flush>
        <DataTable label="SBOM components" columns={cols} rows={comps} getRowId={(c) => c.name} minWidth={700} empty={<p className="py-8">No packages match</p>} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Provenance                                                          */
/* ------------------------------------------------------------------ */

function ProvenancePage() {
  const [active, setActive] = useState("img-billing");
  const cur = images.find((i) => i.id === active);
  const cols: Column<Image>[] = [
    { id: "image", header: "Image", width: "34%", cell: (i) => <span className="block truncate font-mono text-xs">{i.ref}</span> },
    { id: "slsa", header: "SLSA", sortValue: (i) => i.slsa, cell: (i) => <Badge tone={i.slsa === 3 ? "success" : i.slsa === 0 ? "neutral" : "warning"} mono>L{i.slsa}</Badge> },
    { id: "builder", header: "Builder", cell: (i) => <span className="block truncate text-xs">{i.builder}</span> },
    { id: "run", header: "Run", mono: true, cell: (i) => i.runId },
  ];
  return (
    <>
      <PageHeader title="Provenance" description="in-toto SLSA provenance for every build: which commit, which workflow, which builder." />
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel title="Builds" flush>
          <DataTable label="Builds" columns={cols} rows={images} getRowId={(i) => i.id} onRowClick={(i) => setActive(i.id)} activeRowId={active} defaultSort={{ id: "slsa", direction: "asc" }} minWidth={680} />
        </Panel>
        <Panel title="Chain" description={cur?.ref} aria-label="Provenance chain">
          {cur && (
            <div className="flex flex-col gap-2.5">
              <ProvenanceChain image={cur} />
              {cur.slsa < 3 && (
                <Callout tone="warning" title={`SLSA L${cur.slsa}: provenance can be forged by the build itself`}>
                  Move the build to slsa-github-generator to reach level 3. Prod admission requires it.
                </Callout>
              )}
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Policies                                                            */
/* ------------------------------------------------------------------ */

interface Violation {
  id: string;
  policy: string;
  image: string;
  where: string;
  when: string;
}

const VIOLATIONS: Violation[] = [
  { id: "x1", policy: "p1", image: "ghcr.io/acme/reports:1.0.4", where: "prod · reports ns", when: "13:41" },
  { id: "x2", policy: "p3", image: "ghcr.io/acme/reports:1.0.4", where: "staging", when: "Yesterday" },
  { id: "x3", policy: "p4", image: "ghcr.io/acme/reports:1.0.4", where: "staging", when: "Yesterday" },
  { id: "x4", policy: "p5", image: "ghcr.io/acme/billing:0.31.0", where: "staging", when: "Oct 15" },
  { id: "x5", policy: "p5", image: "ghcr.io/acme/web:3.8.1", where: "prod", when: "Oct 12" },
];

function PoliciesPage() {
  const [modes, setModes] = useState<Record<string, string>>(Object.fromEntries(policies.map((p) => [p.id, p.mode])));
  const [saved, setSaved] = useState<string | null>(null);
  const cols: Column<(typeof policies)[number]>[] = [
    { id: "name", header: "Policy", width: "44%", cell: (p) => <span>{p.name}</span> },
    { id: "pass", header: "Pass · 24 h", align: "right", mono: true, cell: (p) => p.pass },
    { id: "fail", header: "Fail", align: "right", mono: true, sortValue: (p) => p.fail, cell: (p) => (p.fail ? <span className="text-danger-text">{p.fail}</span> : 0) },
    {
      id: "mode",
      header: "Mode",
      width: "200px",
      cell: (p) => (
        <SegmentedControl
          label={`Mode for ${p.name}`}
          value={modes[p.id] ?? p.mode}
          onChange={(m) => (setModes((s) => ({ ...s, [p.id]: m })), setSaved(`${p.name}: ${m}`))}
          options={[
            { value: "Enforce", label: "Enforce" },
            { value: "Warn", label: "Warn" },
            { value: "Off", label: "Off" },
          ]}
        />
      ),
    },
  ];
  const vcols: Column<Violation>[] = [
    { id: "image", header: "Image", width: "36%", cell: (v) => <span className="block truncate font-mono text-xs">{v.image}</span> },
    { id: "policy", header: "Policy", cell: (v) => <span className="block truncate text-xs">{policies.find((p) => p.id === v.policy)?.name}</span> },
    { id: "where", header: "Where", cell: (v) => <span className="text-xs">{v.where}</span> },
    { id: "when", header: "When", cell: (v) => <span className="text-xs">{v.when}</span> },
  ];
  return (
    <>
      <PageHeader title="Policies" description="Admission rules for the Kubernetes policy controller, written in CEL. Warn mode logs but lets the pod start." actions={<Button variant="primary" icon={<Plus />}>New policy</Button>} />
      {saved && (
        <p role="status" className="text-sm text-success">
          {saved} · applied to 2 clusters
        </p>
      )}
      <Panel title="Policies" flush>
        <DataTable label="Admission policies" columns={cols} rows={policies} getRowId={(p) => p.id} minWidth={860} />
      </Panel>
      <Panel title="Open violations" description={`${VIOLATIONS.length} images`} flush>
        <DataTable label="Policy violations" columns={vcols} rows={VIOLATIONS} getRowId={(v) => v.id} minWidth={760} />
      </Panel>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Licences                                                            */
/* ------------------------------------------------------------------ */

const LICENCE_RULES: Array<{ id: string; licence: string; packages: number; rule: "allow" | "review" | "deny" }> = [
  { id: "MIT", licence: "MIT", packages: 1840, rule: "allow" },
  { id: "Apache-2.0", licence: "Apache-2.0", packages: 612, rule: "allow" },
  { id: "BSD-3-Clause", licence: "BSD-3-Clause", packages: 204, rule: "allow" },
  { id: "ISC", licence: "ISC", packages: 188, rule: "allow" },
  { id: "LGPL-2.1", licence: "LGPL-2.1", packages: 41, rule: "review" },
  { id: "LGPL-3.0", licence: "LGPL-3.0", packages: 6, rule: "review" },
  { id: "MPL-2.0", licence: "MPL-2.0", packages: 22, rule: "review" },
  { id: "AGPL-3.0", licence: "AGPL-3.0", packages: 1, rule: "deny" },
  { id: "SSPL-1.0", licence: "SSPL-1.0", packages: 0, rule: "deny" },
  { id: "unknown", licence: "No licence found", packages: 9, rule: "review" },
];

function LicencesPage() {
  const [rules, setRules] = useState<Record<string, string>>(Object.fromEntries(LICENCE_RULES.map((l) => [l.id, l.rule])));
  const cols: Column<(typeof LICENCE_RULES)[number]>[] = [
    { id: "licence", header: "Licence", mono: true, cell: (l) => l.licence },
    { id: "packages", header: "Packages", align: "right", mono: true, sortValue: (l) => l.packages, cell: (l) => formatNumber(l.packages) },
    {
      id: "rule",
      header: "Policy",
      width: "180px",
      cell: (l) => (
        <SelectField
          label={<span className="sr-only">Policy for {l.licence}</span>}
          value={rules[l.id] ?? l.rule}
          onChange={(e) => setRules((r) => ({ ...r, [l.id]: e.target.value }))}
          options={[
            { value: "allow", label: "Allow" },
            { value: "review", label: "Needs review" },
            { value: "deny", label: "Block" },
          ]}
        />
      ),
    },
  ];
  const blocked = LICENCE_RULES.filter((l) => rules[l.id] === "deny").reduce((s, l) => s + l.packages, 0);
  return (
    <>
      <PageHeader title="Licences" description="Licences of every package in every SBOM, checked against your policy at build time." />
      <KpiGrid>
        <KpiCard label="Packages" value="2,923" unit="unique" />
        <KpiCard label="Blocked" value={`${blocked}`} tone={blocked ? "danger" : "success"} delta={{ label: "pdf-render in acme/reports" }} />
        <KpiCard label="Needs review" value={`${LICENCE_RULES.filter((l) => rules[l.id] === "review").reduce((s, l) => s + l.packages, 0)}`} tone="warning" />
        <KpiCard label="No licence" value="9" tone="warning" />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Licence policy" flush>
          <DataTable label="Licence policy" columns={cols} rows={LICENCE_RULES} getRowId={(l) => l.id} defaultSort={{ id: "packages", direction: "desc" }} minWidth={520} />
        </Panel>
        <Panel title="Packages by licence">
          <BarList label="Packages by licence" items={LICENCE_RULES.filter((l) => l.packages > 0).map((l) => ({ id: l.id, label: l.licence, value: l.packages, color: rules[l.id] === "deny" ? "var(--oa-danger)" : rules[l.id] === "review" ? "var(--oa-warning)" : undefined }))} />
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  images: () => <ImagesPage />,
  signatures: () => <SignaturesPage />,
  sboms: () => <SbomsPage />,
  provenance: () => <ProvenancePage />,
  policies: () => <PoliciesPage />,
  licences: () => <LicencesPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="supply-chain" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories: one per page; the nav switches pages inside each.          */
/* ------------------------------------------------------------------ */

export const Images: Story = {
  ...app("images"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Images" })).toBeInTheDocument();
    await expect(c.getByRole("list", { name: "Provenance chain for ghcr.io/acme/api:1.42.0" })).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Images" });
    await userEvent.click(within(table).getByText("ghcr.io/acme/reports:1.0.4"));
    const chain = c.getByRole("list", { name: "Provenance chain for ghcr.io/acme/reports:1.0.4" });
    await expect(within(chain).getAllByRole("listitem")).toHaveLength(4);
    await expect(within(chain).getByText("Developer laptop (unverified)")).toBeInTheDocument();
    await expect(within(chain).getByText("acme/reports@e4d1b29")).toBeInTheDocument();
    await expect(c.getByText("Only signed images from ghcr.io/acme may run in prod")).toBeInTheDocument();
  },
};

export const Signatures: Story = {
  ...app("signatures"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByLabelText("Signature detail")).toHaveTextContent("No signature found");
    await userEvent.click(within(c.getByRole("table", { name: "Signature checks" })).getByText("ghcr.io/acme/billing:0.31.0"));
    await expect(c.getByLabelText("Signature detail")).toHaveTextContent("feature branch");
  },
};

export const Sboms: Story = {
  name: "SBOMs",
  ...app("sboms"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Image" }), "img-reports");
    await expect(c.getByRole("table", { name: "SBOM components" }).querySelectorAll("tbody tr")).toHaveLength(4);
    await userEvent.click(c.getByRole("button", { name: "Export SPDX" }));
    await expect(c.getByText("Exported ghcr.io/acme/reports:1.0.4.spdx.json")).toBeInTheDocument();
  },
};

export const Provenance: Story = {
  ...app("provenance"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText(/SLSA L2: provenance can be forged/)).toBeInTheDocument();
    await userEvent.click(within(c.getByRole("table", { name: "Builds" })).getByText("ghcr.io/acme/api:1.42.0"));
    await expect(c.queryByText(/provenance can be forged/)).not.toBeInTheDocument();
  },
};

export const Policies: Story = {
  ...app("policies"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(within(c.getByRole("radiogroup", { name: "Mode for Every image ships an SBOM" })).getByRole("radio", { name: "Enforce" }));
    await expect(c.getByText(/Every image ships an SBOM: Enforce · applied to 2 clusters/)).toBeInTheDocument();
  },
};

export const Licences: Story = {
  ...app("licences"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.selectOptions(c.getByRole("combobox", { name: "Policy for LGPL-3.0" }), "deny");
    await expect(c.getByText("7")).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = app("settings");
