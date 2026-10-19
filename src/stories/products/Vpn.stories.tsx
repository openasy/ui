import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Activity, LayoutGrid, Network, Plug, Server, UserRound, Users, Power } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { StatusBadge, LevelBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { BarList } from "../../charts/BarList";
import { formatBytes } from "../../lib/format";
import type { LogLevel } from "../../tokens/levels";
import { DOC_IPS, PEOPLE, emailOf, timeLabels, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "people", label: "People", icon: Users, count: 214 },
  { id: "ip-groups", label: "IP groups", icon: Network, count: 12 },
  { id: "connections", label: "Connections", icon: Plug, count: 128 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "server", label: "Server", icon: Server, count: 2 },
  { id: "my-vpn", label: "My VPN", icon: UserRound },
];

const meta = {
  title: "Products/VPN",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const N = 25;
const labels = timeLabels(N, 60);

interface Session {
  id: string;
  person: string;
  client: string;
  realIp: string;
  vpnIp: string;
  node: string;
  minutes: number;
  bytes: number;
}

const sessions: Session[] = PEOPLE.map((p, i) => ({
  id: `s${i}`,
  person: p,
  client: ["OpenVPN Connect 3.5", "Tunnelblick 4.0", "openvpn 2.6.12", "NetworkManager"][i % 4]!,
  realIp: DOC_IPS[i % DOC_IPS.length]!,
  vpnIp: `10.8.0.${14 + i * 7}`,
  node: i % 3 ? "ist-01" : "fra-01",
  minutes: [134, 48, 362, 12, 90, 7, 220, 31][i]!,
  bytes: [1.2e9, 3.1e8, 4.8e9, 2.4e7, 6.4e8, 1.1e7, 2.2e9, 9.0e7][i]!,
}));

const sessionColumns: Column<Session>[] = [
  {
    id: "person",
    header: "Person",
    sortValue: (s) => s.person,
    width: "26%",
    cell: (s) => (
      <span className="flex items-center gap-2">
        <Avatar name={s.person} size="sm" />
        <span className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{s.person}</span>
          <span className="truncate text-2xs text-fg-muted">{emailOf(s.person)}</span>
        </span>
      </span>
    ),
  },
  { id: "client", header: "Client", cell: (s) => s.client },
  { id: "real", header: "Real IP", cell: (s) => <EntityChip kind="ip" value={s.realIp} hideKind href="#ip" /> },
  { id: "vpn", header: "VPN IP", mono: true, cell: (s) => s.vpnIp },
  { id: "node", header: "Node", mono: true, sortValue: (s) => s.node, cell: (s) => s.node },
  { id: "since", header: "Since", align: "right", sortValue: (s) => s.minutes, cell: (s) => `${Math.floor(s.minutes / 60)} h ${s.minutes % 60} m` },
  { id: "bytes", header: "Traffic", align: "right", mono: true, sortValue: (s) => s.bytes, cell: (s) => formatBytes(s.bytes) },
  {
    id: "act",
    header: <span className="sr-only">Actions</span>,
    width: "44px",
    align: "right",
    cell: (s) => (
      <IconButton label={`End session for ${s.person}`} size="xs">
        <Power />
      </IconButton>
    ),
  },
];

const events: Array<{ level: LogLevel; text: string; meta: string; time: string }> = [
  { level: "info", text: "Deniz Kaya connected", meta: "203.0.113.24 → 10.8.0.14 · ist-01", time: "2 min" },
  { level: "error", text: "Failed sign-in for burak.oz: wrong TOTP", meta: "198.51.100.201 · attempt 3 of 5", time: "9 min" },
  { level: "info", text: "Elif Arslan added 172.16.30.0/24 to Production databases", meta: "audit · ip_group.update", time: "31 min" },
  { level: "warn", text: "Node fra-01 CPU above 80% for 10 minutes", meta: "fra-01 · 81%", time: "44 min" },
  { level: "info", text: "Syslog sink siem-prod enabled · CEF over TLS", meta: "audit · log_sink.create", time: "Yesterday" },
];

/** Overview: KPIs, sessions stacked by node, busiest people, live connections and recent activity. */
export const Overview: Story = {
  render: () => {
    const [range, setRange] = useState("24h");
    const [nodes, setNodes] = useState<string[]>([]);
    return (
      <ProductFrame product="vpn" nav={nav} active="overview">
        <PageHeader
          title="Overview"
          description="2 nodes · OpenVPN 2.6 · split tunnel by default"
          meta={<StatusBadge tone="success">Healthy</StatusBadge>}
          actions={
            <>
              <SearchInput label="Search people or IPs" shortcut="/" className="w-60" />
              <Button size="md" variant="primary" icon={<Users />}>
                Invite people
              </Button>
            </>
          }
        />
        <FilterBar>
          <TimeRangePicker value={range} onChange={setRange} />
          <FacetFilter
            label="Node"
            selected={nodes}
            onChange={setNodes}
            options={[
              { value: "ist-01", count: 91 },
              { value: "fra-01", count: 37 },
            ]}
          />
        </FilterBar>
        <Callout tone="warning" title="4 certificates expire within 30 days" action={<Button size="sm">Review</Button>}>
          Owners get an email 14 and 3 days before.
        </Callout>
        <KpiGrid>
          <KpiCard label="Active connections" value="128" unit="now" trend={wave(24, { base: 80, amp: 50, seed: 31 })} delta={{ label: "+12 vs. yesterday", direction: "up" }} />
          <KpiCard label="People" value="214" unit="6 invited" delta={{ label: "197 with MFA" }} />
          <KpiCard label="Traffic · 24 h" value="412" unit="GB" trend={wave(24, { base: 18, amp: 8, seed: 32 })} delta={{ label: "61% via split routes" }} />
          <KpiCard
            label="Failed sign-ins · 24 h"
            value="9"
            unit="attempts"
            tone="danger"
            trendColor="var(--oa-danger)"
            trend={[0, 0, 1, 0, 2, 0, 0, 0, 3, 2, 0, 1]}
            delta={{ label: "3 from one address", direction: "up", intent: "bad" }}
          />
        </KpiGrid>
        <div className="grid gap-2.5 xl:grid-cols-[2fr_1fr]">
          <Panel title="Concurrent sessions" description="Stacked by node">
            <TimeSeriesChart
              label="Concurrent VPN sessions by node"
              labels={labels}
              stacked
              height={200}
              series={[
                { id: "ist", name: "ist-01", data: wave(N, { base: 70, amp: 45, seed: 33, phase: -1 }) },
                { id: "fra", name: "fra-01", data: wave(N, { base: 28, amp: 16, seed: 34, phase: -1 }) },
              ]}
            />
          </Panel>
          <Panel title="Most traffic · 24 h">
            <BarList
              label="People with the most VPN traffic"
              format={(v) => formatBytes(v)}
              items={[...sessions].sort((a, b) => b.bytes - a.bytes).slice(0, 6).map((s) => ({ id: s.id, label: s.person, value: s.bytes, href: "#person" }))}
            />
          </Panel>
        </div>
        <div className="grid gap-2.5 xl:grid-cols-[2fr_1fr]">
          <Panel title="Live connections" actions={<Button size="sm" variant="ghost">Open Connections</Button>} flush>
            <DataTable label="Live connections" columns={sessionColumns} rows={sessions} getRowId={(s) => s.id} pageSize={6} defaultSort={{ id: "bytes", direction: "desc" }} minWidth={860} />
          </Panel>
          <Panel title="Recent activity" flush>
            <ul className="flex flex-col">
              {events.map((e, i) => (
                <li key={i} className="grid grid-cols-[52px_minmax(0,1fr)_auto] items-start gap-2 border-b border-subtle px-3 py-2 last:border-0">
                  <LevelBadge level={e.level} />
                  <span className="flex min-w-0 flex-col">
                    <span className="text-sm">{e.text}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">{e.meta}</span>
                  </span>
                  <span className="text-2xs whitespace-nowrap text-fg-muted">{e.time}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Overview" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("link", { name: /People/ }));
    await expect(c.getByRole("link", { name: /People/ })).toHaveAttribute("aria-current", "page");
  },
};
