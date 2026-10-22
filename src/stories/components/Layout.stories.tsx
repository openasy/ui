import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Activity, Globe, KeyRound, LayoutGrid, LogIn, Server, Settings2, TriangleAlert, Users } from "lucide-react";
import { AppShell } from "../../components/AppShell";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/Badge";
import { AVAILABLE, CONNECTED, USER } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "people", label: "People", icon: Users, count: 214 },
  { id: "servers", label: "Server", icon: Server, count: 2 },
  { id: "activity", label: "Activity", icon: Activity },
];

const meta = {
  title: "Layout/AppShell",
  component: AppShell,
  parameters: { layout: "fullscreen" },
  args: {
    product: "vpn",
    nav,
    activeNav: "overview",
    // Stays on the story; a product's links go to its page paths, /people.
    onNavigate: fn(),
    connectedProducts: [...CONNECTED],
    availableProducts: [...AVAILABLE],
    user: USER,
    children: null,
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shell: Story = {
  render: (args) => (
    <AppShell {...args}>
      <PageHeader
        title="Overview"
        description="2 nodes · OpenVPN 2.6 · split tunnel by default"
        breadcrumbs={[{ label: "VPN", href: "#" }, { label: "Overview" }]}
        meta={<StatusBadge tone="success">Healthy</StatusBadge>}
        actions={
          <>
            <Button size="sm">Export</Button>
            <Button size="sm" variant="primary">
              Invite people
            </Button>
          </>
        }
      />
      <Panel title="Content">Every product page sits in this main column.</Panel>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: /Switch product/ }));
    const body = within(canvasElement.ownerDocument.body);
    const list = await body.findByRole("list", { name: "Connected products" });
    await expect(within(list).getByRole("button", { name: "Logs" })).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
  },
};

/** A product that runs alone hides the switcher menu. */
export const Standalone: Story = {
  args: { connectedProducts: undefined, product: "siem" },
  render: (args) => (
    <AppShell {...args}>
      <PageHeader title="Signals" description="SIEM running without other OpenAsy products" />
    </AppShell>
  ),
};

/** With theme and onThemeChange, the top bar offers system, light and dark from a menu on the right. */
export const WithThemeToggle: Story = {
  args: { theme: "system", onThemeChange: fn() },
  render: (args) => (
    <AppShell {...args}>
      <PageHeader title="Overview" description="The theme menu sits on the right of the top bar" />
    </AppShell>
  ),
  play: async ({ args, canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Theme: System" }));
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(await body.findByRole("menuitemradio", { name: "Dark" }));
    await expect(args.onThemeChange).toHaveBeenCalledWith("dark");
  },
};

/**
 * A product menu in two groups, as Uptime has it. Counts that need action are
 * red and become a dot on the icon rail, which tablets show and desktops get
 * with Collapse.
 */
export const WithSettingsGroup: Story = {
  args: {
    product: "uptime",
    navLabel: "Monitoring",
    activeNav: "checks",
    nav: [
      { id: "checks", label: "Checks", icon: Activity, count: 6 },
      { id: "outages", label: "Outages", shortLabel: "Outages", icon: TriangleAlert, count: 1, attention: true },
      { id: "status", label: "Status page", shortLabel: "Status", icon: Globe },
    ],
    footerNav: [
      { id: "setup", label: "Setup", icon: Settings2 },
      { id: "members", label: "Members", icon: Users },
      { id: "signin", label: "Sign-in", icon: LogIn },
      { id: "tokens", label: "API tokens", shortLabel: "Tokens", icon: KeyRound },
    ],
  },
  render: (args) => (
    <AppShell {...args}>
      <PageHeader
        title="Checks"
        description="6 checks · last result 2 min ago"
        breadcrumbs={[{ label: "Uptime", href: "#" }, { label: "Checks" }]}
        actions={
          <Button size="sm" variant="primary">
            Add check
          </Button>
        }
      />
      <Panel title="Content">The page fills the space next to the menu at every width.</Panel>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const nav = c.getByRole("navigation", { name: "Uptime navigation" });
    await expect(within(nav).getByRole("group", { name: "Settings" })).toBeInTheDocument();
    await expect(within(nav).getByRole("link", { name: /^Checks/ })).toHaveAttribute("aria-current", "page");
  },
};

export const Header: Story = {
  name: "PageHeader",
  parameters: { layout: "padded" },
  render: () => (
    <PageHeader
      breadcrumbs={[{ label: "orders-api", href: "#" }, { label: "Pull requests", href: "#" }, { label: "#482" }]}
      title="#482 · Add order search endpoint"
      meta={<StatusBadge tone="danger">Gate failed</StatusBadge>}
      description="feat/order-search → main · scanned 2 min ago"
      actions={<Button size="sm">View on GitHub</Button>}
    />
  ),
};
