import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Power } from "lucide-react";
import { DataTable, type Column } from "../../components/DataTable";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { IconButton } from "../../components/Button";
import { StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import { DOC_IPS, PEOPLE, emailOf, wave } from "../mocks";
import { formatBytes } from "../../lib/format";

interface Session {
  id: string;
  person: string;
  client: string;
  realIp: string;
  vpnIp: string;
  node: string;
  minutes: number;
  bytes: number;
  status: "connected" | "pending";
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
  status: i === 5 ? "pending" : "connected",
}));

const columns: Column<Session>[] = [
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
  { id: "status", header: "Status", cell: (s) => <StatusBadge tone={s.status === "connected" ? "success" : "warning"}>{s.status === "connected" ? "Connected" : "Pending MFA"}</StatusBadge> },
  { id: "client", header: "Client", cell: (s) => s.client },
  { id: "real", header: "Real IP", mono: true, cell: (s) => <EntityChip kind="ip" value={s.realIp} hideKind href="#ip" /> },
  { id: "vpn", header: "VPN IP", mono: true, cell: (s) => s.vpnIp, sortValue: (s) => Number(s.vpnIp.split(".")[3]) },
  { id: "node", header: "Node", mono: true, cell: (s) => s.node, sortValue: (s) => s.node },
  { id: "since", header: "Since", align: "right", cell: (s) => `${Math.floor(s.minutes / 60)} h ${s.minutes % 60} m`, sortValue: (s) => s.minutes },
  { id: "bytes", header: "Traffic", align: "right", mono: true, cell: (s) => formatBytes(s.bytes), sortValue: (s) => s.bytes },
  {
    id: "act",
    header: <span className="sr-only">Actions</span>,
    align: "right",
    width: "48px",
    cell: (s) => (
      <IconButton label={`End session for ${s.person}`} size="xs">
        <Power />
      </IconButton>
    ),
  },
];

const meta = {
  title: "Data/DataTable",
  component: DataTable,
  parameters: { layout: "padded" },
} satisfies Meta<typeof DataTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Sessions: Story = {
  args: {} as never,
  render: () => {
    const [sel, setSel] = useState<string[]>([]);
    return (
      <Panel title="Live connections" description={`${sel.length} selected`} flush>
        <DataTable
          label="Live connections"
          columns={columns}
          rows={sessions}
          getRowId={(s) => s.id}
          selectable
          selectedIds={sel}
          onSelectionChange={setSel}
          pageSize={5}
          defaultSort={{ id: "bytes", direction: "desc" }}
          minWidth={960}
        />
      </Panel>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Since/ }));
    await expect(c.getByRole("columnheader", { name: /Since/ })).toHaveAttribute("aria-sort", "descending");
    await userEvent.click(c.getByRole("checkbox", { name: "Select all rows on this page" }));
    await expect(c.getByText("5 selected")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Next" }));
    await expect(c.getByText("6–8 of 8")).toBeInTheDocument();
  },
};

export const Loading: Story = {
  args: {} as never,
  render: () => (
    <Panel title="Live connections" flush>
      <DataTable label="Loading connections" columns={columns} rows={[]} getRowId={(s) => s.id} loading pageSize={4} minWidth={960} />
    </Panel>
  ),
};

export const Empty: Story = {
  args: {} as never,
  render: () => (
    <Panel title="Live connections" flush>
      <DataTable label="No connections" columns={columns} rows={[]} getRowId={(s) => s.id} empty={<p className="py-8">Nobody is connected right now.</p>} minWidth={960} />
    </Panel>
  ),
};

export const Kpis: Story = {
  name: "KPI cards",
  args: {} as never,
  render: () => (
    <KpiGrid>
      <KpiCard label="Active connections" value="128" unit="now" trend={wave(24, { base: 90, amp: 50, seed: 3 })} delta={{ label: "+12 vs. yesterday", direction: "up", intent: "neutral" }} />
      <KpiCard label="Traffic · 24 h" value="412" unit="GB" trend={wave(24, { base: 40, seed: 5 })} delta={{ label: "61% via split routes" }} />
      <KpiCard
        label="Failed sign-ins · 24 h"
        value="9"
        unit="attempts"
        tone="danger"
        trendColor="var(--oa-danger)"
        trend={[0, 1, 0, 0, 2, 0, 0, 0, 6, 3, 0, 0, 1, 0]}
        delta={{ label: "3 from one address", direction: "up", intent: "bad" }}
      />
      <KpiCard label="Certificates expiring" value="4" unit="in 30 days" tone="warning" delta={{ label: "Next: 6 Nov" }} href="#certs" />
    </KpiGrid>
  ),
};
