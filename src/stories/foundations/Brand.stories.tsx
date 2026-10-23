import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { LayoutGrid, Server, Users } from "lucide-react";
import { AppShell, BrandMark } from "../../components/AppShell";
import { BrandProvider, useBrand } from "../../components/BrandProvider";
import { PageHeader } from "../../components/PageHeader";
import { Panel } from "../../components/Panel";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/Badge";
import { USER } from "../mocks";

/** Pictures as an install would mount them in config/brand (ADR 0053), inline so the story needs no files. */
const svg = (body: string, viewBox: string) =>
  "data:image/svg+xml;utf8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${body}</svg>`);
const LOGOS = {
  none: undefined,
  square: svg('<rect width="24" height="24" rx="6" fill="#c30193"/><path d="M7 16l5-9 5 9z" fill="#fff"/>', "0 0 24 24"),
  wide: svg(
    '<rect width="32" height="32" rx="7" fill="#c30193"/><path d="M9 22l7-12 7 12z" fill="#fff"/>' +
      '<text x="42" y="23" font-family="system-ui, sans-serif" font-size="20" font-weight="700" fill="#c30193">YouReply</text>',
    "0 0 140 32",
  ),
} as const;

interface BrandArgs {
  organization: string;
  accent: string;
  logo: keyof typeof LOGOS;
}

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "hosts", label: "Hosts", icon: Server, count: 12 },
  { id: "people", label: "People", icon: Users, count: 214 },
];

/** The sign-in screen's mark, as @openasy/auth draws it: the logo alone, or the brand's name without one. */
function SignInMark() {
  const { brand } = useBrand();
  return (
    <div className="flex w-80 flex-col items-center gap-2 rounded-xl border border-line bg-surface p-6 text-center shadow-raised">
      <BrandMark product="infrastructure" size={40} />
      {!brand.logoUrl && <span className="text-sm font-semibold text-fg">{brand.name}</span>}
      {brand.organization && <span className="-mt-1.5 text-xs text-fg-muted">{brand.organization}</span>}
      <Button variant="primary" className="mt-2 w-full">
        Sign in
      </Button>
    </div>
  );
}

/**
 * The install's brand, as every product shows it: OPENASY_ORGANIZATION, OPENASY_ACCENT and OPENASY_LOGO from
 * config/brand.env. Change them under Controls. A logo keeps its own shape at a fixed height and stands for the
 * brand, so no name is written next to it; the browser tab's icon is OPENASY_FAVICON, a picture of its own.
 */
const meta = {
  title: "Foundations/Brand",
  parameters: { layout: "fullscreen" },
  args: { organization: "Test IQ", accent: "#c30193", logo: "wide" },
  argTypes: {
    organization: { control: "text", description: "OPENASY_ORGANIZATION: under each product's name" },
    accent: { control: "color", description: "OPENASY_ACCENT: buttons, links and the selected item" },
    logo: { control: "inline-radio", options: Object.keys(LOGOS), description: "OPENASY_LOGO: none, a square mark or a wide logo with text" },
  },
  render: ({ organization, accent, logo }) => (
    <BrandProvider brand={{ name: "OpenAsy", organization: organization || undefined, accent: accent || undefined, logoUrl: LOGOS[logo] }}>
      <AppShell product="infrastructure" nav={nav} activeNav="overview" user={USER}>
        <PageHeader
          title="Overview"
          description="12 hosts · 3 need attention"
          meta={<StatusBadge tone="success">Healthy</StatusBadge>}
          actions={<Button variant="primary">Add host</Button>}
        />
        <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
          <Panel title="Sign-in screen">
            <div className="flex justify-center py-4">
              <SignInMark />
            </div>
          </Panel>
          <Panel title="What changes">
            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-sm text-fg-muted">
              <li>The top bar shows the logo, 28 px high, in place of the OpenAsy mark and name.</li>
              <li>The sign-in screen shows it 40 px high, without the name under it.</li>
              <li>The organization is the line under the product's name.</li>
              <li>The accent colors buttons, links, the selected menu item and focus rings; its hover and soft tones follow.</li>
            </ul>
          </Panel>
        </div>
      </AppShell>
    </BrandProvider>
  ),
} satisfies Meta<BrandArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A wide logo with text: no name next to it, and it keeps its shape. */
export const WideLogo: Story = {
  play: async ({ canvasElement }) => {
    const header = canvasElement.querySelector("header")!;
    expect(header.querySelector("img")).toHaveStyle({ height: "28px" });
    expect(within(header).queryByText("OpenAsy")).toBeNull();
  },
};

/** A square mark works the same way. */
export const SquareLogo: Story = { args: { logo: "square" } };

/** Without a logo, the OpenAsy mark and name stay, in the install's color. */
export const NoLogo: Story = {
  args: { logo: "none" },
  play: async ({ canvasElement }) => {
    expect(within(canvasElement.querySelector("header")!).getByText(/Open/)).toBeInTheDocument();
  },
};
