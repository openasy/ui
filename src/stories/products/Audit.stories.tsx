import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { BellOff, FileCode2, FolderGit2, GitPullRequest, Play, Scale, ShieldAlert, Workflow } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { cn } from "../../lib/cn";
import { SEVERITY_META, type Severity } from "../../tokens/levels";

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
  { id: "CVE-2024-45337", severity: "critical", title: "Misuse of ServerConfig.PublicKeyCallback may cause authorization bypass", pkg: "golang.org/x/crypto", ecosystem: "Go", from: "v0.28.0", to: "v0.31.0", path: "direct" },
  { id: "CVE-2024-21538", severity: "high", title: "Regular expression denial of service in cross-spawn", pkg: "cross-spawn", ecosystem: "npm", from: "7.0.3", to: "7.0.5", path: "via execa" },
  { id: "CVE-2024-4068", severity: "high", title: "Memory exhaustion in braces with unbalanced input", pkg: "braces", ecosystem: "npm", from: "3.0.2", to: "3.0.3", path: "via chokidar" },
  { id: "CVE-2024-45296", severity: "high", title: "Backtracking regular expressions in path-to-regexp", pkg: "path-to-regexp", ecosystem: "npm", from: "0.1.7", to: "0.1.12", path: "via express" },
  { id: "CVE-2024-4067", severity: "medium", title: "Regular expression denial of service in micromatch", pkg: "micromatch", ecosystem: "npm", from: "4.0.5", to: "4.0.8", path: "via fast-glob" },
  { id: "CVE-2024-47764", severity: "low", title: "cookie accepts out-of-bounds characters in name, path and domain", pkg: "cookie", ecosystem: "npm", from: "0.5.0", to: "0.7.0", path: "via express" },
];

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
  { id: "path", header: "Path", cell: (a) => (a.path === "direct" ? <Badge tone="info">Direct</Badge> : <span className="font-mono text-xs text-fg-muted">{a.path}</span>) },
  {
    id: "act",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    width: "190px",
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

/** One project: dependency counts, CI gate and the advisories that fail it. */
export const Project: Story = {
  render: () => {
    const [selected, setSelected] = useState("orders-api");
    const [q, setQ] = useState("");
    const p = projects.find((x) => x.id === selected) ?? projects[0]!;
    const list = projects.filter((x) => x.id.includes(q.toLowerCase()));
    return (
      <ProductFrame product="audit" nav={nav} active="projects">
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
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-subtle",
                        on && "bg-accent-soft hover:bg-accent-soft",
                      )}
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
              <KpiCard label="Licences flagged" value={p.licences} tone={p.licences ? "warning" : undefined} delta={{ label: p.licences ? "AGPL-3.0, SSPL-1.0" : "All allowed" }} />
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
              <DataTable label="Advisories" columns={advisoryColumns} rows={advisories} getRowId={(a) => a.id} defaultSort={{ id: "sev", direction: "desc" }} minWidth={940} />
            </Panel>
          </div>
        </div>
      </ProductFrame>
    );
  },
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
