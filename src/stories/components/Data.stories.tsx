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
  node: i % 3 ? "lon-01" : "fra-01",
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
    await userEvent.click(c.getByRole("button", { name: /^Since$/ }));
    await expect(c.getByRole("columnheader", { name: /Since/ })).toHaveAttribute("aria-sort", "descending");
    await userEvent.click(c.getByRole("checkbox", { name: "Select all rows on this page" }));
    await expect(c.getByText("5 selected")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Next" }));
    await expect(c.getByText("6–8 of 8")).toBeInTheDocument();
  },
};

/**
 * Hover a header's (i) for its description. Drag a header edge (or focus it and use ← →) to resize;
 * double-click the edge to reset. The ⋮ menu sorts, pins left/right, and hides columns.
 * Person and Actions start pinned, so they stay visible while the table scrolls sideways.
 */
export const InteractiveColumns: Story = {
  args: {} as never,
  render: () => {
    const cols: Column<Session>[] = columns.map((c) => {
      const extra: Partial<Column<Session>> = {
        person: { pinned: "left" as const, description: "Who is connected. Click the avatar row to open their profile.", label: "Person" },
        status: { description: "Connected once the tunnel is up; Pending MFA while the TOTP prompt is open." },
        real: { description: "Public address the client connected from. Documentation ranges only in this demo." },
        vpn: { description: "Static address from the person's IP group, used by firewall rules." },
        bytes: { description: "Bytes in plus out since the session started." },
        act: { pinned: "right" as const, label: "Actions", hideable: false, resizable: false },
      }[c.id] ?? {};
      return { ...c, ...extra };
    });
    return (
      <div className="max-w-[880px]">
        <Panel title="Live connections" description="Resize, pin and hide columns; layout is remembered for this table." flush>
          <DataTable label="Interactive connections" columns={cols} rows={sessions} getRowId={(s) => s.id} minWidth={1180} stickyHeader maxHeight={320} persistKey="story-sessions" selectable />
        </Panel>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    localStorage.removeItem("oa-table:story-sessions");
    await userEvent.hover(c.getByRole("button", { name: "About VPN IP" }));
    await expect(await body.findByRole("tooltip")).toHaveTextContent(/firewall rules/);
    await userEvent.unhover(c.getByRole("button", { name: "About VPN IP" }));
    const handle = c.getByRole("separator", { name: "Resize Client" });
    const before = Number(handle.getAttribute("aria-valuenow"));
    handle.focus();
    await userEvent.keyboard("{ArrowRight}{ArrowRight}");
    await expect(Number(handle.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    await userEvent.click(c.getByRole("button", { name: "Node column options" }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Pin to left" }));
    await expect(c.getByRole("columnheader", { name: /Node/ })).toHaveAttribute("data-pinned", "left");
    await userEvent.click(c.getByRole("button", { name: "Client column options" }));
    await userEvent.click(await body.findByRole("menuitem", { name: "Hide column" }));
    await expect(c.getByText("1 hidden")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Show all columns" }));
    localStorage.removeItem("oa-table:story-sessions");
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
