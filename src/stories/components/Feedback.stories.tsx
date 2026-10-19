import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent } from "storybook/test";
import { Network, Plus } from "lucide-react";
import { Badge, LevelBadge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { EmptyState } from "../../components/EmptyState";
import { EntityChip } from "../../components/EntityChip";

const meta = {
  title: "Feedback/Callout",
  component: Callout,
  args: { tone: "warning", title: "CA certificate expires in 21 days", children: "Rotate it now; people get a new profile on their next sign-in." },
  argTypes: { tone: { control: "inline-radio", options: ["info", "success", "warning", "danger", "critical"] } },
} satisfies Meta<typeof Callout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {};

export const AllTones: Story = {
  render: () => (
    <div className="flex max-w-2xl flex-col gap-2">
      <Callout tone="info" title="Agent 0.5 is available" action={<Button size="sm">Upgrade</Button>}>
        Adds eBPF network events.
      </Callout>
      <Callout tone="success" title="Profile sent to deniz.kaya@example.com" />
      <Callout tone="warning" title="4 certificates expire within 30 days">
        Owners get an email 14 and 3 days before.
      </Callout>
      <Callout tone="danger" title="Node ist-01 stopped reporting">
        Last heartbeat 6 minutes ago. Existing tunnels may still be up.
      </Callout>
      <Callout tone="critical" title="Malware quarantined on api-prod-03">
        XMRig miner in /tmp/.x/kworker. Incident INC-142 opened.
      </Callout>
    </div>
  ),
};

export const Dismissible: Story = {
  args: { onDismiss: fn(), tone: "info", title: "New: synced chart cursors" },
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Dismiss" }));
    await expect(args.onDismiss).toHaveBeenCalled();
  },
};

export const Badges: Story = {
  render: () => (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-1.5">
        <SeverityBadge severity="critical" />
        <SeverityBadge severity="high" />
        <SeverityBadge severity="medium" />
        <SeverityBadge severity="low" />
        <SeverityBadge severity="info" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <LevelBadge level="fatal" />
        <LevelBadge level="error" />
        <LevelBadge level="warn" />
        <LevelBadge level="info" />
        <LevelBadge level="debug" />
        <LevelBadge level="trace" />
      </div>
      <div className="flex flex-wrap gap-1.5">
        <StatusBadge tone="success">Connected</StatusBadge>
        <StatusBadge tone="warning">Pending MFA</StatusBadge>
        <StatusBadge tone="neutral">Offline</StatusBadge>
        <StatusBadge tone="danger">Revoked</StatusBadge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone="info">Admin</Badge>
        <Badge variant="outline">MFA</Badge>
        <Badge mono>10.8.0.0/24</Badge>
        <Badge mono>tcp/443</Badge>
      </div>
      <div className="flex flex-wrap gap-1.5">
        <EntityChip kind="host" value="api-prod-03" href="#host" />
        <EntityChip kind="container" value="orders-api:2.14.1" href="#c" />
        <EntityChip kind="user" value="deniz.kaya" href="#u" />
        <EntityChip kind="ip" value="198.51.100.201" href="#ip" />
        <EntityChip kind="cve" value="CVE-2024-6387" href="#cve" />
        <EntityChip kind="repo" value="orders-api" />
      </div>
    </div>
  ),
};

export const Empty: Story = {
  render: () => (
    <div className="max-w-md rounded-lg border border-dashed border-line-strong bg-surface">
      <EmptyState icon={<Network />} title="No IP groups yet" action={<Button variant="primary" icon={<Plus />}>Create IP group</Button>}>
        Group the networks people need, then allow teams to reach them.
      </EmptyState>
    </div>
  ),
};
