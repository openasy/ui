import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { Download, Ellipsis, Plus } from "lucide-react";
import { Button, IconButton } from "../../components/Button";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { SegmentedControl } from "../../components/SegmentedControl";
import { Tabs } from "../../components/Tabs";
import { ThemeToggle, type ThemePreference } from "../../components/Theme";

const meta = {
  title: "Inputs/Button",
  component: Button,
  args: { children: "Save changes", variant: "primary", size: "md", onClick: fn() },
  argTypes: {
    variant: { control: "inline-radio", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "inline-radio", options: ["xs", "sm", "md"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Playground: Story = {
  play: async ({ args, canvas }) => {
    await userEvent.click(canvas.getByRole("button", { name: "Save changes" }));
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};

export const Variants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" icon={<Plus />}>
        Add person
      </Button>
      <Button variant="secondary" icon={<Download />}>
        Export CSV
      </Button>
      <Button variant="ghost">View logs</Button>
      <Button variant="danger">End session</Button>
      <Button variant="primary" loading>
        Issuing profile
      </Button>
      <Button disabled>Disabled</Button>
      <IconButton label="More actions" variant="secondary">
        <Ellipsis />
      </IconButton>
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Button size="xs">Extra small 24</Button>
      <Button size="sm">Small 28</Button>
      <Button size="md">Default 32</Button>
    </div>
  ),
};

export const FormControls: Story = {
  render: () => {
    const [mfa, setMfa] = useState(true);
    return (
      <div className="grid max-w-3xl gap-4 md:grid-cols-2">
        <TextField label="Email" defaultValue="dana.kim@example.com" hint="Used for sign-in and certificate notices." />
        <TextField label="Network" mono defaultValue="172.16.20.0/24" adornment={<span className="rounded bg-accent-soft px-1.5 text-2xs font-medium text-accent-text">256 addresses</span>} />
        <TextField label="Port" mono defaultValue="70000" error="Use a port between 1 and 65535." />
        <SelectField
          label="Protocol"
          options={[
            { value: "udp", label: "UDP · 1194" },
            { value: "tcp", label: "TCP · 443" },
          ]}
        />
        <SearchInput label="Search people or IPs" shortcut="/" />
        <TextField label="CA fingerprint" mono disabled defaultValue="SHA256 4F:9A:21:…:C7" />
        <Switch checked={mfa} onCheckedChange={setMfa} label="Require MFA" description="TOTP code on every new connection" />
        <Checkbox label="Email me on failed sign-ins" description="After 5 failures within 10 minutes" />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const sw = c.getByRole("switch", { name: "Require MFA" });
    await userEvent.click(sw);
    await expect(sw).toHaveAttribute("aria-checked", "false");
    await expect(c.getByLabelText("Port")).toHaveAttribute("aria-invalid", "true");
  },
};

export const SegmentsAndTabs: Story = {
  name: "Segmented control & tabs",
  render: () => {
    const [view, setView] = useState("hosts");
    const [tab, setTab] = useState("all");
    return (
      <div className="flex max-w-xl flex-col gap-4">
        <SegmentedControl
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "hosts", label: "Hosts" },
            { value: "containers", label: "Containers" },
            { value: "k8s", label: "Kubernetes" },
          ]}
        />
        <Tabs
          label="Activity filter"
          value={tab}
          onChange={setTab}
          items={[
            { value: "all", label: "All events", count: "1,284" },
            { value: "auth", label: "Sign-ins", count: 312 },
            { value: "admin", label: "Admin", count: 27 },
          ]}
        />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("radio", { name: "Kubernetes" }));
    await expect(c.getByRole("radio", { name: "Kubernetes" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(c.getByRole("tab", { name: /Admin/ }));
    await expect(c.getByRole("tab", { name: /Admin/ })).toHaveAttribute("aria-selected", "true");
  },
};

export const ThemeSwitch: Story = {
  name: "Theme toggle",
  render: () => {
    const [theme, setTheme] = useState<ThemePreference>("system");
    return <ThemeToggle value={theme} onChange={setTheme} />;
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("radio", { name: "System" })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(c.getByRole("radio", { name: "Dark" }));
    await expect(c.getByRole("radio", { name: "Dark" })).toHaveAttribute("aria-checked", "true");
  },
};
