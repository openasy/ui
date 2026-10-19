import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AppWindow, Building2, KeyRound, LayoutGrid, Plus, RefreshCw, ScrollText, Smartphone, Users, UsersRound } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import type { Tone } from "../../tokens/levels";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "applications", label: "Applications", icon: AppWindow, count: 9 },
  { id: "users", label: "Users", icon: Users, count: 214 },
  { id: "groups", label: "Groups", icon: UsersRound, count: 18 },
  { id: "providers", label: "Providers", icon: Building2, count: 3 },
  { id: "mfa", label: "MFA", icon: Smartphone },
  { id: "audit", label: "Audit", icon: ScrollText },
];

const meta = {
  title: "Products/Identity",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type Protocol = "OIDC" | "SAML 2.0";

interface App {
  id: string;
  name: string;
  protocol: Protocol;
  redirect: string;
  users: number;
  lastUsed: string;
  lastUsedMin: number;
}

const apps: App[] = [
  { id: "vpn", name: "OpenAsy VPN", protocol: "OIDC", redirect: "https://vpn.example.com/oauth/callback", users: 214, lastUsed: "1 min ago", lastUsedMin: 1 },
  { id: "logs", name: "OpenAsy Logs", protocol: "OIDC", redirect: "https://logs.example.com/auth/oidc/callback", users: 96, lastUsed: "3 min ago", lastUsedMin: 3 },
  { id: "metrics", name: "OpenAsy Metrics", protocol: "OIDC", redirect: "https://metrics.example.com/auth/oidc/callback", users: 88, lastUsed: "6 min ago", lastUsedMin: 6 },
  { id: "grafana", name: "Grafana", protocol: "OIDC", redirect: "https://grafana.example.com/login/generic_oauth", users: 71, lastUsed: "12 min ago", lastUsedMin: 12 },
  { id: "jira", name: "Jira", protocol: "SAML 2.0", redirect: "https://acme.atlassian.net/plugins/servlet/samlconsumer", users: 187, lastUsed: "2 min ago", lastUsedMin: 2 },
  { id: "gitlab", name: "GitLab", protocol: "SAML 2.0", redirect: "https://gitlab.example.com/users/auth/saml/callback", users: 132, lastUsed: "4 min ago", lastUsedMin: 4 },
  { id: "keycloak", name: "Keycloak federation", protocol: "OIDC", redirect: "https://sso.example.com/realms/ops/broker/openasy/endpoint", users: 39, lastUsed: "38 min ago", lastUsedMin: 38 },
  { id: "aws", name: "AWS IAM Identity Center", protocol: "SAML 2.0", redirect: "https://signin.aws.amazon.com/saml", users: 24, lastUsed: "1 h ago", lastUsedMin: 60 },
  { id: "wiki", name: "Wiki.js", protocol: "OIDC", redirect: "https://wiki.example.com/login/oidc/callback", users: 143, lastUsed: "Yesterday", lastUsedMin: 1440 },
];

const columns: Column<App>[] = [
  {
    id: "name",
    header: "Application",
    width: "22%",
    sortValue: (a) => a.name,
    cell: (a) => (
      <span className="flex items-center gap-2">
        <span aria-hidden className="grid size-6 shrink-0 place-items-center rounded-md bg-subtle text-2xs font-semibold text-fg">
          {a.name[0]}
        </span>
        <span className="truncate font-medium">{a.name}</span>
      </span>
    ),
  },
  {
    id: "proto",
    header: "Protocol",
    width: "100px",
    sortValue: (a) => a.protocol,
    cell: (a) => (
      <Badge tone={a.protocol === "OIDC" ? "info" : "neutral"} mono>
        {a.protocol}
      </Badge>
    ),
  },
  {
    id: "redirect",
    header: "Redirect URI",
    width: "38%",
    cell: (a) => (
      <span className="block truncate font-mono text-xs" title={a.redirect}>
        {a.redirect}
      </span>
    ),
  },
  { id: "users", header: "Users", align: "right", mono: true, sortValue: (a) => a.users, cell: (a) => a.users },
  { id: "last", header: "Last used", align: "right", sortValue: (a) => -a.lastUsedMin, cell: (a) => <span className="whitespace-nowrap text-fg-muted">{a.lastUsed}</span> },
];

interface Provider {
  id: string;
  name: string;
  detail: string;
  status: { label: string; tone: Tone };
  meta: string;
}

const providers: Provider[] = [
  { id: "kc", name: "Upstream Keycloak", detail: "OIDC · realm ops", status: { label: "Connected", tone: "success" }, meta: "39 users · last login 38 min ago" },
  { id: "ad", name: "Corporate AD", detail: "LDAP · ldaps://dc01.corp.example.com:636", status: { label: "Sync failed", tone: "danger" }, meta: "Bind failed: invalid credentials · 2 h ago" },
  { id: "gw", name: "Google Workspace", detail: "OIDC · example.com", status: { label: "Connected", tone: "success" }, meta: "152 users · synced 9 min ago" },
];

const N = 24;
const hours = timeLabels(N, 60);

/** Identity applications: sign-in KPIs, success vs. failure, registered apps and upstream providers. */
export const Applications: Story = {
  render: () => {
    const [range, setRange] = useState("24h");
    const [proto, setProto] = useState<"all" | "oidc" | "saml">("all");
    const rows = useMemo(() => apps.filter((a) => proto === "all" || (proto === "oidc" ? a.protocol === "OIDC" : a.protocol === "SAML 2.0")), [proto]);
    return (
      <ProductFrame product="identity" nav={nav} active="applications">
        <PageHeader
          title="Applications"
          description="Issuer https://id.example.com · 9 applications · 3 upstream providers"
          actions={
            <>
              <SearchInput label="Search applications" className="w-60" />
              <Button size="md" variant="primary" icon={<Plus />}>
                Add application
              </Button>
            </>
          }
        />
        <FilterBar>
          <TimeRangePicker value={range} onChange={setRange} />
          <SegmentedControl
            label="Protocol"
            value={proto}
            onChange={setProto}
            options={[
              { value: "all", label: "All" },
              { value: "oidc", label: "OIDC" },
              { value: "saml", label: "SAML 2.0" },
            ]}
          />
        </FilterBar>
        <KpiGrid>
          <KpiCard label="Sign-ins · 24 h" value="3,412" unit="successful" trend={wave(24, { base: 140, amp: 90, seed: 61, phase: -1 })} delta={{ label: "+6% vs. yesterday", direction: "up", intent: "good" }} />
          <KpiCard label="MFA adoption" value="92%" unit="197 of 214" tone="success" delta={{ label: "17 users without a second factor" }} />
          <KpiCard label="Passkeys" value="41%" unit="88 users" delta={{ label: "+9 this week", direction: "up", intent: "good" }} />
          <KpiCard
            label="Failed sign-ins · 24 h"
            value="37"
            unit="attempts"
            tone="danger"
            trendColor="var(--oa-danger)"
            trend={[1, 0, 2, 1, 0, 3, 1, 2, 9, 7, 4, 2]}
            delta={{ label: "14 from 198.51.100.201", direction: "up", intent: "bad" }}
          />
        </KpiGrid>
        <div className="grid gap-2.5 xl:grid-cols-[2fr_1fr]">
          <Panel title="Sign-ins" description="Per hour, all applications">
            <TimeSeriesChart
              label="Sign-ins per hour, success versus failed"
              labels={hours}
              height={200}
              series={[
                { id: "ok", name: "Success", color: "var(--oa-success)", data: wave(N, { base: 140, amp: 90, seed: 62, phase: -1 }) },
                { id: "fail", name: "Failed", color: "var(--oa-danger)", data: wave(N, { base: 2, amp: 1, seed: 63, spike: 7, spikeAt: 16, spikeLen: 3 }) },
              ]}
            />
          </Panel>
          <Panel title="Providers" description="Upstream identity sources" actions={<Button size="sm" variant="ghost">Manage</Button>} flush>
            <ul aria-label="Identity providers" className="flex flex-col">
              {providers.map((p) => (
                <li key={p.id} className="flex items-start gap-2.5 border-b border-subtle px-3 py-2.5 last:border-0">
                  <span aria-hidden className="grid size-7 shrink-0 place-items-center rounded-md bg-subtle text-fg-muted">
                    {p.id === "ad" ? <Building2 className="size-4" /> : <KeyRound className="size-4" />}
                  </span>
                  <span className="flex min-w-0 grow flex-col">
                    <span className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">{p.name}</span>
                      <StatusBadge tone={p.status.tone}>{p.status.label}</StatusBadge>
                    </span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{p.detail}</span>
                    <span className={p.status.tone === "danger" ? "text-xs text-danger-text" : "text-xs text-fg-muted"}>{p.meta}</span>
                  </span>
                  {p.status.tone === "danger" && (
                    <IconButton label={`Retry sync for ${p.name}`} size="sm">
                      <RefreshCw />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
        <Panel title="Applications" description={`${rows.length} registered`} flush>
          <DataTable label="Applications" columns={columns} rows={rows} getRowId={(a) => a.id} defaultSort={{ id: "users", direction: "desc" }} minWidth={880} />
        </Panel>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Applications" });
    await expect(within(table).getAllByRole("row")).toHaveLength(apps.length + 1);
    await expect(within(c.getByRole("list", { name: "Identity providers" })).getByText("Sync failed")).toBeInTheDocument();
    await userEvent.click(c.getByRole("radio", { name: "SAML 2.0" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(4);
    await expect(within(table).getByText("Jira")).toBeInTheDocument();
    await expect(within(table).queryByText("Grafana")).not.toBeInTheDocument();
  },
};
