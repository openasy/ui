import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { Server } from "lucide-react";
import { renderUI } from "../test/render";
import { Checkbox, SearchInput, SelectField, Switch, TextField } from "./Controls";
import { SegmentedControl } from "./SegmentedControl";
import { Tabs } from "./Tabs";
import { AppShell, BrandMark, NAV_COLLAPSED_KEY, ProductSwitcher } from "./AppShell";
import { PageHeader } from "./PageHeader";
import { KpiCard, KpiGrid } from "./Kpi";
import { FacetFilter, FilterBar, FilterChip, QueryBar, TimeRangePicker } from "./Filters";

describe("form controls", () => {
  it("TextField links label, hint and error", () => {
    renderUI(
      <>
        <TextField label="Email" hint="Used for sign-in" defaultValue="a@b.c" />
        <TextField label="Port" error="Use 1–65535" mono adornment={<span>tcp</span>} />
      </>,
    );
    const email = screen.getByLabelText("Email");
    expect(email).toHaveAccessibleDescription("Used for sign-in");
    const port = screen.getByLabelText("Port");
    expect(port).toHaveAttribute("aria-invalid", "true");
    expect(port).toHaveAccessibleDescription("Use 1–65535");
    expect(port.className).toContain("font-mono");
    expect(screen.getByText("tcp")).toBeInTheDocument();
  });

  it("TextField without hint has no description", () => {
    renderUI(<TextField label="Name" id="fixed" />);
    expect(screen.getByLabelText("Name")).not.toHaveAttribute("aria-describedby");
    expect(screen.getByLabelText("Name")).toHaveAttribute("id", "fixed");
  });

  it("SelectField renders options and reports changes", async () => {
    const onChange = vi.fn();
    const { user } = renderUI(
      <SelectField
        label="Protocol"
        onChange={(e) => onChange(e.target.value)}
        options={[
          { value: "udp", label: "UDP" },
          { value: "tcp", label: "TCP" },
        ]}
      />,
    );
    await user.selectOptions(screen.getByLabelText("Protocol"), "tcp");
    expect(onChange).toHaveBeenCalledWith("tcp");
  });

  it("SelectField works without a visible label", () => {
    renderUI(<SelectField aria-label="Env" options={[{ value: "prod", label: "prod" }]} />);
    expect(screen.getByRole("combobox", { name: "Env" })).toBeInTheDocument();
  });

  it("SearchInput uses its label as placeholder and shows a shortcut", () => {
    renderUI(
      <>
        <SearchInput label="Search hosts" shortcut="/" />
        <SearchInput label="Other" placeholder="Name or IP" />
      </>,
    );
    expect(screen.getByRole("searchbox", { name: "Search hosts" })).toHaveAttribute("placeholder", "Search hosts");
    expect(screen.getByText("/")).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "Other" })).toHaveAttribute("placeholder", "Name or IP");
  });

  it("Checkbox toggles", async () => {
    const { user } = renderUI(<Checkbox label="Email me" description="After 5 failures" />);
    const box = screen.getByRole("checkbox", { name: /Email me/ });
    await user.click(box);
    expect(box).toBeChecked();
  });

  it("Switch flips aria-checked through its callback", async () => {
    function Harness() {
      const [on, setOn] = useState(false);
      return <Switch checked={on} onCheckedChange={setOn} label="Require MFA" description="TOTP" />;
    }
    const { user } = renderUI(<Harness />);
    const sw = screen.getByRole("switch", { name: "Require MFA" });
    expect(sw).toHaveAttribute("aria-checked", "false");
    await user.click(sw);
    expect(sw).toHaveAttribute("aria-checked", "true");
  });
});

describe("SegmentedControl and Tabs", () => {
  const opts = [
    { value: "hosts", label: "Hosts" },
    { value: "containers", label: "Containers" },
    { value: "k8s", label: "Kubernetes" },
  ] as const;

  function Seg({ size }: { size?: "sm" | "md" }) {
    const [v, setV] = useState<string>("hosts");
    return <SegmentedControl label="View" value={v} onChange={setV} options={opts} size={size} />;
  }

  it("selects by click and wraps with arrow keys", async () => {
    const { user } = renderUI(<Seg size="md" />);
    await user.click(screen.getByRole("radio", { name: "Containers" }));
    expect(screen.getByRole("radio", { name: "Containers" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Containers" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Kubernetes" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Kubernetes" }), { key: "ArrowRight" });
    expect(screen.getByRole("radio", { name: "Hosts" })).toHaveAttribute("aria-checked", "true");
    fireEvent.keyDown(screen.getByRole("radio", { name: "Hosts" }), { key: "ArrowLeft" });
    expect(screen.getByRole("radio", { name: "Kubernetes" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("radio", { name: "Kubernetes" }), { key: "Enter" });
    expect(screen.getByRole("radio", { name: "Kubernetes" })).toHaveAttribute("aria-checked", "true");
  });

  it("Tabs select by click and arrow keys and show counts", async () => {
    function T() {
      const [v, setV] = useState<string>("all");
      return (
        <Tabs
          label="Filter"
          value={v}
          onChange={setV}
          items={[
            { value: "all", label: "All", count: 12 },
            { value: "auth", label: "Sign-ins" },
          ]}
        />
      );
    }
    const { user } = renderUI(<T />);
    expect(screen.getByText("12")).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Sign-ins" }));
    expect(screen.getByRole("tab", { name: "Sign-ins" })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: "Sign-ins" }), { key: "ArrowLeft" });
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(screen.getByRole("tab", { name: /All/ }), { key: "a" });
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute("aria-selected", "true");
  });
});

describe("AppShell", () => {
  const nav = [
    { id: "overview", label: "Overview", icon: Server },
    { id: "hosts", label: "Hosts", count: 48 },
  ];

  it("renders navigation, marks the active item and calls onNavigate", async () => {
    const onNavigate = vi.fn();
    const { user } = renderUI(
      <AppShell product="infrastructure" nav={nav} activeNav="hosts" onNavigate={onNavigate} user={{ name: "Emily Clark", role: "Owner" }}>
        <p>content</p>
      </AppShell>,
    );
    const navEl = screen.getByRole("navigation", { name: "Infrastructure navigation" });
    expect(within(navEl).getByRole("link", { name: /Hosts/ })).toHaveAttribute("aria-current", "page");
    expect(within(navEl).getByText("48")).toBeInTheDocument();
    await user.click(within(navEl).getByRole("link", { name: "Overview" }));
    expect(onNavigate).toHaveBeenCalledWith("overview");
    expect(screen.getByText("content")).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.queryByText("Powered by OpenAsy")).not.toBeInTheDocument();
  });

  it("opens and closes the mobile navigation drawer", async () => {
    const onNavigate = vi.fn();
    const { user } = renderUI(
      <AppShell product="logs" nav={nav} activeNav="overview" onNavigate={onNavigate}>
        <p>content</p>
      </AppShell>,
    );
    const navEl = screen.getByRole("navigation", { name: "Logs navigation" });
    expect(navEl).not.toHaveAttribute("data-open");
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    expect(navEl).toHaveAttribute("data-open", "true");
    expect(screen.getByRole("button", { name: "Close navigation" })).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{Escape}");
    expect(navEl).not.toHaveAttribute("data-open");
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.click(screen.getByTestId("drawer-backdrop"));
    expect(navEl).not.toHaveAttribute("data-open");
    await user.click(screen.getByRole("button", { name: "Open navigation" }));
    await user.keyboard("a");
    expect(navEl).toHaveAttribute("data-open", "true");
    await user.click(within(navEl).getByRole("link", { name: /Hosts/ }));
    expect(onNavigate).toHaveBeenCalledWith("hosts");
    expect(navEl).not.toHaveAttribute("data-open");
  });

  it("follows hrefs when no onNavigate is given", () => {
    renderUI(
      <AppShell product="logs" nav={[{ id: "x", label: "X", href: "/x" }]}>
        <p />
      </AppShell>,
    );
    expect(screen.getByRole("link", { name: "X" })).toHaveAttribute("href", "/x");
  });

  it("shows a theme toggle only when given the theme and a handler", async () => {
    const onThemeChange = vi.fn();
    const { unmount } = renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
    );
    expect(screen.queryByRole("button", { name: /^Theme/ })).not.toBeInTheDocument();
    unmount();
    const { user } = renderUI(
      <AppShell product="logs" nav={nav} theme="system" onThemeChange={onThemeChange}>
        <p />
      </AppShell>,
    );
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Theme: System" }));
    const menu = await screen.findByRole("menu", { name: "Theme" });
    expect(within(menu).getByRole("menuitemradio", { name: "System" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "System" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(within(menu).getByRole("menuitemradio", { name: "Light" })).toHaveFocus();
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(within(menu).getByRole("menuitemradio", { name: "Dark" })).toHaveFocus();
    await user.click(within(menu).getByRole("menuitemradio", { name: "Dark" }));
    expect(onThemeChange).toHaveBeenCalledWith("dark");
    expect(screen.queryByRole("menu", { name: "Theme" })).not.toBeInTheDocument();
  });

  it("shows the account in a top bar menu", async () => {
    const { user } = renderUI(
      <AppShell product="logs" nav={nav} user={{ name: "Emily Clark", role: "Owner" }}>
        <p />
      </AppShell>,
    );
    await user.click(screen.getByRole("button", { name: /^Account: Emily Clark/ }));
    const menu = await screen.findByRole("dialog", { name: "Account" });
    expect(within(menu).getByText("Owner")).toBeInTheDocument();
  });

  it("shows a language menu only when given languages and a handler", async () => {
    const languages = [
      { code: "en", name: "English" },
      { code: "tr", name: "Türkçe" },
    ];
    const { unmount } = renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
    );
    expect(screen.queryByRole("button", { name: /^Language/ })).not.toBeInTheDocument();
    unmount();
    const onLanguageChange = vi.fn();
    const { user } = renderUI(
      <AppShell product="logs" nav={nav} language="en" languages={languages} onLanguageChange={onLanguageChange}>
        <p />
      </AppShell>,
    );
    await user.click(within(screen.getByRole("banner")).getByRole("button", { name: "Language: English" }));
    const menu = await screen.findByRole("menu", { name: "Language" });
    expect(within(menu).getByRole("menuitemradio", { name: "English" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "English" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(within(menu).getByRole("menuitemradio", { name: "Türkçe" })).toHaveFocus();
    await user.click(within(menu).getByRole("menuitemradio", { name: "Türkçe" }));
    expect(onLanguageChange).toHaveBeenCalledWith("tr");
    expect(screen.queryByRole("menu", { name: "Language" })).not.toBeInTheDocument();
  });

  it("groups settings under their own heading", () => {
    renderUI(
      <AppShell product="uptime" nav={nav} navLabel="Monitoring" footerNav={[{ id: "members", label: "Members" }]}>
        <p />
      </AppShell>,
    );
    const navEl = screen.getByRole("navigation", { name: "Uptime navigation" });
    expect(within(within(navEl).getByRole("group", { name: "Monitoring" })).getByRole("link", { name: /^Hosts/ })).toBeInTheDocument();
    expect(within(within(navEl).getByRole("group", { name: "Settings" })).getByRole("link", { name: "Members" })).toBeInTheDocument();
  });

  it("marks a count that needs action and shows a short label for the rail", () => {
    renderUI(
      <AppShell product="uptime" nav={[{ id: "outages", label: "Outages", shortLabel: "Out", count: 1, attention: true, icon: Server }]}>
        <p />
      </AppShell>,
    );
    const link = screen.getByRole("link", { name: /^Outages/ });
    expect(link).toHaveAttribute("data-short", "true");
    expect(within(link).getByText("1")).toHaveClass("bg-danger");
    expect(link.querySelector(".oa-nav-dot")).toBeInTheDocument();
  });

  it("filters a long menu", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `p${i}`, label: `Page ${i}` }));
    const { user } = renderUI(
      <AppShell product="logs" nav={many}>
        <p />
      </AppShell>,
    );
    await user.type(screen.getByRole("searchbox", { name: "Filter the menu" }), "page 3");
    const navEl = screen.getByRole("navigation", { name: "Logs navigation" });
    expect(within(navEl).getByRole("link", { name: "Page 3" })).toBeInTheDocument();
    expect(within(navEl).queryByRole("link", { name: "Page 4" })).not.toBeInTheDocument();
    await user.clear(screen.getByRole("searchbox", { name: "Filter the menu" }));
    await user.type(screen.getByRole("searchbox", { name: "Filter the menu" }), "nothing");
    expect(within(navEl).getByText("No page matches.")).toBeInTheDocument();
  });

  it("collapses the menu to the rail and remembers it", async () => {
    window.localStorage.removeItem(NAV_COLLAPSED_KEY);
    const { user, unmount } = renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
    );
    const navEl = screen.getByRole("navigation", { name: "Logs navigation" });
    expect(navEl).not.toHaveAttribute("data-collapsed");
    await user.click(screen.getByRole("button", { name: "Collapse the menu" }));
    expect(navEl).toHaveAttribute("data-collapsed", "true");
    expect(window.localStorage.getItem(NAV_COLLAPSED_KEY)).toBe("1");
    unmount();
    renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
    );
    await user.click(screen.getByRole("button", { name: "Expand the menu" }));
    expect(screen.getByRole("navigation", { name: "Logs navigation" })).not.toHaveAttribute("data-collapsed");
    expect(window.localStorage.getItem(NAV_COLLAPSED_KEY)).toBeNull();
  });

  it("opens the products menu from the top bar", async () => {
    const onSwitch = vi.fn();
    const { user } = renderUI(
      <AppShell product="logs" nav={nav} connectedProducts={["metrics"]} onSwitchProduct={onSwitch}>
        <p />
      </AppShell>,
    );
    await user.click(screen.getByRole("button", { name: "Switch product, current: Logs" }));
    const list = await screen.findByRole("list", { name: "Connected products" });
    await user.click(within(list).getByRole("button", { name: "Metrics" }));
    expect(onSwitch).toHaveBeenCalledWith("metrics");
  });

  it("links each item to its page path by default", () => {
    renderUI(
      <AppShell product="logs" nav={[{ id: "hosts", label: "Hosts" }]}>
        <p />
      </AppShell>,
    );
    expect(screen.getByRole("link", { name: "Hosts" })).toHaveAttribute("href", "/hosts");
  });

  it("shows the OpenAsy mark and wordmark when the brand is OpenAsy", () => {
    const { container } = renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
    );
    const banner = screen.getByRole("banner");
    expect(banner).toHaveTextContent("OpenAsy");
    expect(banner.querySelector(".oa-topbar-wordmark")).toHaveTextContent("Asy");
    expect(container.querySelector('header svg rect[fill="#1f4fd8"]')).toBeInTheDocument();
  });

  it("shows white-label name, logo and a powered-by line", () => {
    const { container } = renderUI(
      <AppShell product="vpn" nav={nav}>
        <p />
      </AppShell>,
      { brand: { name: "Acme Shield", organization: "Acme Prod", logoUrl: "logo.svg" } },
    );
    expect(screen.getByText("Acme Prod")).toBeInTheDocument();
    expect(container.querySelector('img[src="logo.svg"]')).toBeInTheDocument();
    expect(screen.getByText("Powered by OpenAsy")).toBeInTheDocument();
  });

  it("uses the dark logo in dark mode and hides powered-by on request", () => {
    const { container } = renderUI(
      <AppShell product="vpn" nav={nav}>
        <p />
      </AppShell>,
      { brand: { name: "Acme", logoUrl: "l.svg", logoDarkUrl: "d.svg", hidePoweredBy: true }, theme: "dark" },
    );
    expect(container.querySelector('img[src="d.svg"]')).toBeInTheDocument();
    expect(screen.queryByText("Powered by OpenAsy")).not.toBeInTheDocument();
  });

  it("ProductSwitcher lists connected and available products and switches", async () => {
    const onSwitch = vi.fn();
    const { user } = renderUI(<ProductSwitcher product="logs" connected={["metrics", "logs", "alerts"]} available={["vpn"]} onSwitch={onSwitch} />);
    await user.click(screen.getByRole("button", { name: /^Switch product, current: Logs/ }));
    const list = await screen.findByRole("list", { name: "Connected products" });
    expect(within(list).getAllByRole("button")).toHaveLength(3);
    expect(within(list).getByRole("button", { name: "Logs" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("list", { name: "Available products" })).toHaveTextContent("VPN");
    await user.click(within(list).getByRole("button", { name: "Metrics" }));
    expect(onSwitch).toHaveBeenCalledWith("metrics");
    expect(screen.queryByRole("list", { name: "Connected products" })).not.toBeInTheDocument();
  });

  it("ProductSwitcher asks to connect an available product", async () => {
    const onConnect = vi.fn();
    const { user } = renderUI(<ProductSwitcher product="logs" connected={["metrics"]} available={["vpn"]} onConnect={onConnect} />);
    await user.click(screen.getByRole("button", { name: /^Switch product, current: Logs/ }));
    await user.click(await screen.findByRole("button", { name: "Connect" }));
    expect(onConnect).toHaveBeenCalledWith("vpn");
  });

  it("BrandMark falls back to the product glyph and accepts a class", () => {
    const { container } = renderUI(<BrandMark product="identity" size={40} className="extra" />);
    const mark = container.querySelector(".extra") as HTMLElement;
    expect(mark.style.width).toBe("40px");
    expect(mark.querySelector("svg")).toBeInTheDocument();
  });

  it("BrandMark shows a logo at a fixed height, as wide as it is", () => {
    const { container } = renderUI(<BrandMark product="identity" size={28} />, { brand: { name: "Acme", logoUrl: "/logo.png" } });
    const logo = container.querySelector("img") as HTMLImageElement;
    expect(logo.style.height).toBe("28px");
    expect(logo.style.maxWidth).toBe("168px");
    expect(logo).not.toHaveAttribute("width");
  });

  it("the top bar shows a logo instead of the brand's name", () => {
    const { container } = renderUI(
      <AppShell product="logs" nav={[{ id: "x", label: "X", href: "/x" }]}>
        <p>content</p>
      </AppShell>,
      { brand: { name: "Acme", logoUrl: "/logo.png" } },
    );
    expect(container.querySelector("header img")).toHaveAttribute("src", "/logo.png");
    expect(screen.queryByText("Acme")).not.toBeInTheDocument();
  });

  it("ProductSwitcher without connections is static", () => {
    renderUI(<ProductSwitcher product="siem" connected={[]} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByText("SIEM")).toBeInTheDocument();
  });

  it("ProductSwitcher can open without the available section", async () => {
    renderUI(<ProductSwitcher product="siem" connected={["logs"]} defaultOpen />);
    expect(await screen.findByRole("list", { name: "Connected products" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Available products" })).not.toBeInTheDocument();
  });
});

describe("PageHeader", () => {
  it("renders breadcrumbs, title, meta, actions and children", () => {
    renderUI(
      <PageHeader
        title="Hosts"
        description="48 hosts"
        breadcrumbs={[{ label: "Infrastructure", href: "/infra" }, { label: "Hosts" }]}
        meta={<span>prod</span>}
        actions={<button type="button">Install agent</button>}
      >
        <p>tabs</p>
      </PageHeader>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Hosts" })).toBeInTheDocument();
    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(within(crumbs).getByRole("link", { name: "Infrastructure" })).toHaveAttribute("href", "/infra");
    expect(screen.getByText("prod")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Install agent" })).toBeInTheDocument();
    expect(screen.getByText("tabs")).toBeInTheDocument();
  });

  it("works with just a title", () => {
    renderUI(<PageHeader title="Only" />);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });
});

describe("KPI", () => {
  it("renders label, value, unit, delta and trend", () => {
    renderUI(
      <KpiGrid minWidth={150}>
        <KpiCard label="Active connections" value="128" unit="now" delta={{ label: "+12", direction: "up", intent: "good" }} trend={[1, 3, 2]} />
        <KpiCard label="Failed sign-ins" value="9" tone="danger" delta={{ label: "3 from one IP", direction: "down", intent: "bad" }} />
        <KpiCard label="Flat" value="0" delta={{ label: "no change", direction: "flat" }} footer={<span>foot</span>} href="#k" />
        <KpiCard label="Plain" value="1" delta={{ label: "n/a" }} tone="neutral" />
      </KpiGrid>,
    );
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("+12").className).toContain("text-success");
    expect(screen.getByText("9").className).toContain("text-danger-text");
    expect(screen.getByText("3 from one IP").className).toContain("text-danger-text");
    expect(screen.getByRole("img", { name: /Active connections trend/ })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "#k");
    expect(screen.getByText("foot")).toBeInTheDocument();
  });

  it("names the trend generically when the label is not text", () => {
    renderUI(<KpiCard label={<span>Rich</span>} value="1" trend={[1, 2]} />);
    expect(screen.getByRole("img", { name: /^Trend/ })).toBeInTheDocument();
  });
});

describe("filters", () => {
  it("FilterBar renders children and a clear action", async () => {
    const onClear = vi.fn();
    const { user } = renderUI(
      <FilterBar onClear={onClear}>
        <FilterChip field="env" value="prod" />
      </FilterBar>,
    );
    expect(screen.getByRole("toolbar", { name: "Filters" })).toHaveTextContent("envprod");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(onClear).toHaveBeenCalled();
  });

  it("FilterChip can be negated and removed", async () => {
    const onRemove = vi.fn();
    const { user } = renderUI(<FilterChip field="path" value='"/healthz"' negate onRemove={onRemove} />);
    expect(screen.getByText("-path")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Remove filter path" }));
    expect(onRemove).toHaveBeenCalled();
  });

  it("TimeRangePicker picks a preset", async () => {
    function H() {
      const [v, setV] = useState("1h");
      return <TimeRangePicker value={v} onChange={setV} />;
    }
    const { user } = renderUI(<H />);
    await user.click(screen.getByRole("button", { name: "Time range: Last 1 hour" }));
    const menu = await screen.findByRole("menu", { name: "Time range" });
    expect(within(menu).getByRole("menuitemradio", { name: "Last 1 hour" })).toHaveAttribute("aria-checked", "true");
    expect(within(menu).getByRole("menuitemradio", { name: "Last 1 hour" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(within(menu).getByRole("menuitemradio", { name: "Last 6 hours" })).toHaveFocus();
    await user.click(within(menu).getByRole("menuitemradio", { name: "Last 7 days" }));
    expect(screen.getByRole("button", { name: "Time range: Last 7 days" })).toBeInTheDocument();
  });

  it("TimeRangePicker shows unknown values verbatim", () => {
    renderUI(<TimeRangePicker value="2026-10-01..2026-10-07" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Time range: 2026-10-01..2026-10-07" })).toBeInTheDocument();
  });

  it("TimeRangePicker is as tall as the filters, or as a QueryBar's Run button with size md", () => {
    renderUI(
      <>
        <TimeRangePicker value="1h" onChange={() => {}} />
        <QueryBar value="" onChange={() => {}} onSubmit={() => {}} />
        <TimeRangePicker size="md" value="24h" onChange={() => {}} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Time range: Last 1 hour" })).toHaveClass("h-7");
    expect(screen.getByRole("button", { name: "Time range: Last 24 hours" })).toHaveClass("h-8");
    expect(screen.getByRole("button", { name: "Run" })).toHaveClass("h-8");
  });

  it("FacetFilter toggles, searches and clears", async () => {
    function H() {
      const [sel, setSel] = useState<string[]>(["error"]);
      return (
        <FacetFilter
          label="Level"
          searchable
          defaultOpen
          selected={sel}
          onChange={setSel}
          options={[
            { value: "error", count: 812 },
            { value: "warn", count: 392 },
            { value: "info", label: "Info" },
          ]}
        />
      );
    }
    const { user } = renderUI(<H />);
    expect(screen.getByRole("checkbox", { name: /error/ })).toBeChecked();
    expect(screen.getByText("812")).toBeInTheDocument();
    await user.click(screen.getByRole("checkbox", { name: /warn/ }));
    expect(screen.getByRole("checkbox", { name: /warn/ })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: /error/ }));
    expect(screen.getByRole("checkbox", { name: /error/ })).not.toBeChecked();
    await user.type(screen.getByRole("textbox", { name: "Search Level" }), "zzz");
    expect(screen.getByText("No matches")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Clear" }));
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();
  });

  it("QueryBar submits on Enter and on Run", async () => {
    const onSubmit = vi.fn();
    function H() {
      const [q, setQ] = useState("");
      return <QueryBar value={q} onChange={setQ} onSubmit={onSubmit} />;
    }
    const { user } = renderUI(<H />);
    const input = screen.getByRole("textbox", { name: "Query" });
    await user.type(input, "level:error{Enter}");
    expect(onSubmit).toHaveBeenLastCalledWith("level:error");
    await user.click(screen.getByRole("button", { name: "Run" }));
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});
