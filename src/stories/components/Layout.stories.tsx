import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Activity, Globe, KeyRound, LayoutGrid, LogIn, Server, Settings2, TriangleAlert, Users } from "lucide-react";
import { AppShell, type AppShellProps } from "../../components/AppShell";
import { BrandProvider, useBrand } from "../../components/BrandProvider";
import type { ThemePreference } from "../../components/Theme";
import { toLocale } from "../../lib/i18n";
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

/**
 * A shell that really switches theme and language, as a product does with
 * useThemePreference: the choice is applied here and passed on to the args.
 */
function LiveShell(args: AppShellProps) {
  const { brand, locale } = useBrand();
  const [theme, setTheme] = useState<ThemePreference>(args.theme ?? "system");
  const [language, setLanguage] = useState(args.language ?? locale);
  return (
    <BrandProvider brand={brand} theme={theme} locale={toLocale(language)} style={{ minHeight: "100vh" }}>
      <AppShell
        {...args}
        theme={theme}
        onThemeChange={(next) => {
          setTheme(next);
          args.onThemeChange?.(next);
        }}
        language={language}
        onLanguageChange={(code) => {
          setLanguage(code);
          args.onLanguageChange?.(code);
        }}
      >
        <PageHeader title="Overview" description="The language and theme menus sit on the right of the top bar; the shell follows the language" />
      </AppShell>
    </BrandProvider>
  );
}

/** With theme and onThemeChange the top bar offers system, light and dark; with languages, a language menu next to it. */
export const WithThemeAndLanguage: Story = {
  args: {
    theme: "system",
    onThemeChange: fn(),
    onLanguageChange: fn(),
  },
  render: (args) => <LiveShell {...args} />,
  play: async ({ args, canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getByRole("button", { name: "Theme: System" }));
    await userEvent.click(await body.findByRole("menuitemradio", { name: "Dark" }));
    await expect(args.onThemeChange).toHaveBeenCalledWith("dark");
    await expect(c.getByRole("button", { name: "Theme: Dark" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Language: English" }));
    await userEvent.click(await body.findByRole("menuitemradio", { name: "Türkçe" }));
    await expect(args.onLanguageChange).toHaveBeenCalledWith("tr");
    // The shell's own words follow the chosen language.
    await expect(c.getByRole("button", { name: "Dil: Türkçe" })).toBeInTheDocument();
    await expect(c.getByRole("group", { name: "Ayarlar" })).toBeInTheDocument();
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

/** With a colophon from the colophon() Vite plugin: a help menu in the top bar, About in the menu and the About page. */
export const About: Story = {
  args: {
    product: "identity",
    activeNav: "about",
    nav: [
      { id: "overview", label: "Overview", icon: LayoutGrid },
      { id: "people", label: "People", icon: Users, count: 214 },
    ],
    footerNav: [{ id: "members", label: "Members", icon: Users }],
    user: USER,
    about: {
      version: "0.4.0",
      license: "AGPL-3.0-only",
      repository: "https://github.com/openasy/identity",
      libraries: [
        {
          name: "oidc-provider",
          version: "9.12.2",
          license: "MIT",
          url: "https://github.com/panva/node-oidc-provider",
          role: "The OpenID Connect provider, OpenID Certified",
        },
        { name: "samlify", version: "2.15.1", license: "MIT", url: "https://github.com/tngan/samlify", role: "SAML 2.0 for applications that need it" },
        { name: "ldapts", version: "9.2.0", license: "MIT", url: "https://github.com/ldapts/ldapts", role: "LDAP and Active Directory" },
        { name: "Node.js", version: "26 LTS", license: "MIT", url: "https://nodejs.org/", role: "Runs the server" },
        { name: "SQLite", version: "in Node.js", license: "Public domain", url: "https://sqlite.org/", role: "The database, one file" },
        { name: "React", version: "19.3.1", license: "MIT", url: "https://react.dev/", role: "The screens" },
        { name: "Lucide", version: "1.59.0", license: "ISC", url: "https://lucide.dev", role: "Icons" },
      ],
      openasy: [
        { name: "@openasy/auth", version: "0.9.0", license: "Apache-2.0", role: "Sign-in, members and API tokens, the same in every product" },
        { name: "@openasy/ui", version: "0.8.0", license: "Apache-2.0", role: "The components every product shares" },
      ],
    },
  },
  render: (args) => (
    <AppShell {...args}>
      <Panel title="Content">Shown on every page but about.</Panel>
    </AppShell>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "About Identity" })).toBeInTheDocument();
    await expect(c.getByRole("link", { name: "Email info@openasy.com" })).toHaveAttribute("href", "mailto:info@openasy.com?subject=OpenAsy%20Identity%200.4.0");
    await expect(within(c.getByRole("navigation", { name: "Identity navigation" })).getByRole("link", { name: "About" })).toHaveAttribute(
      "aria-current",
      "page",
    );
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
