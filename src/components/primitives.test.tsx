import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Plus } from "lucide-react";
import { renderUI } from "../test/render";
import { Button, IconButton } from "./Button";
import { Badge, LevelBadge, LevelGlyph, SeverityBadge, StatusBadge } from "./Badge";
import { Callout } from "./Callout";
import { Panel } from "./Panel";
import { EmptyState } from "./EmptyState";
import { Avatar, initials } from "./Avatar";
import { EntityChip } from "./EntityChip";
import { BrandProvider, useBrand } from "./BrandProvider";
import { LOG_LEVELS, SEVERITIES } from "../tokens/levels";

describe("Button", () => {
  it("calls onClick and defaults to type=button", async () => {
    const onClick = vi.fn();
    const { user } = renderUI(<Button onClick={onClick}>Save</Button>);
    const btn = screen.getByRole("button", { name: "Save" });
    expect(btn).toHaveAttribute("type", "button");
    await user.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("is disabled and busy while loading", async () => {
    const onClick = vi.fn();
    const { user } = renderUI(
      <Button loading onClick={onClick} variant="primary" icon={<Plus />}>
        Issuing
      </Button>,
    );
    const btn = screen.getByRole("button", { name: "Issuing" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-busy", "true");
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it.each(["primary", "secondary", "ghost", "danger"] as const)("renders the %s variant", (variant) => {
    renderUI(
      <Button variant={variant} size="xs" iconRight={<Plus data-testid="right" />}>
        Go
      </Button>,
    );
    expect(screen.getByRole("button", { name: "Go" })).toBeInTheDocument();
    expect(screen.getByTestId("right")).toBeInTheDocument();
  });

  it("IconButton is named by its label in every size", () => {
    renderUI(
      <>
        <IconButton label="More" size="xs">
          <Plus />
        </IconButton>
        <IconButton label="Add" size="sm">
          <Plus />
        </IconButton>
        <IconButton label="Download">
          <Plus />
        </IconButton>
      </>,
    );
    expect(screen.getByRole("button", { name: "More" })).toHaveAttribute("title", "More");
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Download" })).toBeInTheDocument();
  });
});

describe("Badges", () => {
  it("renders soft, solid and outline variants with an optional dot", () => {
    renderUI(
      <>
        <Badge tone="success" dot>
          OK
        </Badge>
        <Badge tone="danger" variant="solid" pill>
          Down
        </Badge>
        <Badge tone="info" variant="outline" mono icon={<Plus data-testid="icon" />}>
          10.8.0.0/24
        </Badge>
      </>,
    );
    expect(screen.getByText("OK")).toBeInTheDocument();
    expect(screen.getByText("Down").className).toContain("rounded-full");
    expect(screen.getByText("10.8.0.0/24").className).toContain("font-mono");
    expect(screen.getByTestId("icon")).toBeInTheDocument();
  });

  it.each(SEVERITIES)("SeverityBadge %s carries label and shape", (sev) => {
    const { container } = renderUI(<SeverityBadge severity={sev} />);
    const el = container.querySelector(`[data-severity="${sev}"]`)!;
    expect(el).toBeInTheDocument();
    expect(el.querySelector("svg[data-shape]")).toBeInTheDocument();
    expect(el.textContent).toMatch(/[A-Z][a-z]+/);
  });

  it("compact SeverityBadge keeps an accessible name", () => {
    renderUI(<SeverityBadge severity="critical" compact />);
    expect(screen.getByRole("img", { name: "Severity Critical" })).toBeInTheDocument();
  });

  it.each(LOG_LEVELS)("LevelBadge %s uses the standard label", (level) => {
    renderUI(<LevelBadge level={level} />);
    expect(screen.getByText(level.toUpperCase())).toHaveAttribute("data-level", level);
  });

  it("StatusBadge is a pill with a dot", () => {
    const { container } = renderUI(<StatusBadge tone="warning">Degraded</StatusBadge>);
    expect(screen.getByText("Degraded").className).toContain("rounded-full");
    expect(container.querySelector(".size-1\\.5")).toBeInTheDocument();
  });

  it("LevelGlyph draws each shape", () => {
    const { container } = renderUI(
      <>
        {(["diamond", "triangle", "square", "circle", "dash"] as const).map((s) => (
          <LevelGlyph key={s} shape={s} />
        ))}
      </>,
    );
    expect(container.querySelectorAll("svg[data-shape]")).toHaveLength(5);
  });
});

describe("Callout", () => {
  it("announces danger as an alert and others as status", () => {
    renderUI(
      <>
        <Callout tone="danger" title="Node down" />
        <Callout tone="warning" title="CA expires soon">
          Rotate it
        </Callout>
      </>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Node down");
    expect(screen.getByRole("status")).toHaveTextContent("Rotate it");
  });

  it.each(["info", "success", "critical"] as const)("renders the %s tone", (tone) => {
    renderUI(<Callout tone={tone} title={`T-${tone}`} action={<a href="#x">Act</a>} />);
    expect(screen.getByText(`T-${tone}`).closest("[data-tone]")).toHaveAttribute("data-tone", tone);
    expect(screen.getByRole("link", { name: "Act" })).toBeInTheDocument();
  });

  it("can be dismissed", async () => {
    const onDismiss = vi.fn();
    const { user } = renderUI(<Callout title="Hi" onDismiss={onDismiss} />);
    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(onDismiss).toHaveBeenCalled();
  });
});

describe("Panel and EmptyState", () => {
  it("renders header, body and footer", () => {
    renderUI(
      <Panel title="Nodes" description="2 healthy" actions={<button type="button">Manage</button>} footer="Updated now">
        body
      </Panel>,
    );
    expect(screen.getByRole("heading", { name: "Nodes" })).toBeInTheDocument();
    expect(screen.getByText("2 healthy")).toBeInTheDocument();
    expect(screen.getByText("Updated now")).toBeInTheDocument();
    expect(screen.getByText("body")).toBeInTheDocument();
  });

  it("gives the body room at the top when there is no header to", () => {
    renderUI(
      <>
        <Panel>alone</Panel>
        <Panel title="T">under a title</Panel>
      </>,
    );
    expect(screen.getByText("alone")).toHaveClass("p-3");
    expect(screen.getByText("under a title")).toHaveClass("px-3", "pb-3");
    expect(screen.getByText("under a title")).not.toHaveClass("p-3");
  });

  it("flush panels without a header still render", () => {
    renderUI(
      <>
        <Panel flush>edge</Panel>
        <Panel flush title="T">
          edge2
        </Panel>
      </>,
    );
    expect(screen.getByText("edge")).toBeInTheDocument();
    expect(screen.getByText("edge2").className).toContain("border-t");
  });

  it("EmptyState shows icon, text and action", () => {
    renderUI(
      <EmptyState icon={<Plus data-testid="i" />} title="No IP groups" action={<button type="button">Create</button>}>
        Group the networks
      </EmptyState>,
    );
    expect(screen.getByText("No IP groups")).toBeInTheDocument();
    expect(screen.getByTestId("i")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
  });
});

describe("Avatar", () => {
  it.each([
    ["Dana Kim", "DK"],
    ["mark.wilson", "MW"],
    ["admin", "AD"],
    ["  ", "?"],
  ])("initials(%s) = %s", (name, out) => {
    expect(initials(name)).toBe(out);
  });

  it("is labelled with the full name", () => {
    renderUI(<Avatar name="Emily Clark" size="sm" />);
    expect(screen.getByRole("img", { name: "Emily Clark" })).toHaveTextContent("EC");
  });
});

describe("EntityChip", () => {
  it("renders as link, button or plain text", async () => {
    const onClick = vi.fn();
    const { user } = renderUI(
      <>
        <EntityChip kind="host" value="api-prod-03" href="#host" />
        <EntityChip kind="ip" value="198.51.100.7" onClick={onClick} />
        <EntityChip kind="cve" value="CVE-2024-6387" hideKind />
      </>,
    );
    expect(screen.getByRole("link")).toHaveTextContent("hostapi-prod-03");
    await user.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalled();
    expect(screen.getByText("CVE-2024-6387").parentElement).toHaveAttribute("data-entity", "cve");
    expect(screen.queryByText("cve")).not.toBeInTheDocument();
  });
});

describe("BrandProvider", () => {
  function Probe() {
    const { brand, theme } = useBrand();
    return (
      <span>
        {brand.name}/{brand.organization}/{theme}
      </span>
    );
  }

  it("applies theme, accent and font and exposes the brand", () => {
    const { container } = renderUI(<Probe />, { brand: { name: "Acme", accent: "#0f8c7c", fontFamily: "Inter" }, theme: "dark" });
    const root = container.querySelector("[data-theme]") as HTMLElement;
    expect(root).toHaveAttribute("data-theme", "dark");
    expect(root.style.getPropertyValue("--oa-accent")).toBe("#0f8c7c");
    expect(root.style.getPropertyValue("--oa-font-sans")).toBe("Inter");
    expect(screen.getByText("Acme/Acme Corp/dark")).toBeInTheDocument();
  });

  it("falls back to defaults outside a provider", () => {
    render(<Probe />);
    expect(screen.getByText("OpenAsy/Acme Corp/light")).toBeInTheDocument();
  });

  it("renders children without custom brand variables by default", () => {
    const { container } = render(
      <BrandProvider>
        <span>x</span>
      </BrandProvider>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue("--oa-accent")).toBe("");
    expect(root).toHaveAttribute("data-theme", "light");
  });
});
