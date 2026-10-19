import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { CircleCheck, FileSearch, GitBranch, KeyRound, Layers, ScrollText, ShieldOff, X } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { SEVERITY_META, type Severity, type Tone } from "../../tokens/levels";

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
    author: "Mert Yıldız",
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
    author: "Burak Öz",
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
    author: "Zeynep Aydın",
    rotate: ["Roll the test key in the Stripe dashboard (test mode) and read it from the environment."],
  },
];

/** Secrets findings: validity KPIs, masked findings and a detail panel with rotation steps. */
export const Findings: Story = {
  render: () => {
    const [range, setRange] = useState("7d");
    const [sources, setSources] = useState<string[]>([]);
    const [validity, setValidity] = useState<Record<string, Validity>>(() => Object.fromEntries(findings.map((f) => [f.id, f.validity])));
    const [openId, setOpenId] = useState<string | undefined>();
    const rows = useMemo(() => findings.map((f) => ({ ...f, validity: validity[f.id]! })).filter((f) => sources.length === 0 || sources.includes(f.source)), [validity, sources]);
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
          <span className="inline-flex gap-1" onClick={(e) => e.stopPropagation()}>
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
      <ProductFrame product="secrets" nav={nav} active="findings">
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
          <KpiCard label="Verified active" value={counts.active} unit="secrets" tone="danger" delta={{ label: "Validated against the provider API", intent: "bad" }} />
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
      </ProductFrame>
    );
  },
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
