import { useId, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AppWindow, Building2, LayoutGrid, Palette, RotateCcw, Save, ScrollText, Smartphone, Users, UsersRound } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { BrandProvider, useBrand, type Brand } from "../../components/BrandProvider";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SelectField, Switch, TextField } from "../../components/Controls";
import { Badge, StatusBadge } from "../../components/Badge";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "overview", label: "Overview", icon: LayoutGrid },
  { id: "applications", label: "Applications", icon: AppWindow, count: 9 },
  { id: "users", label: "Users", icon: Users, count: 214 },
  { id: "groups", label: "Groups", icon: UsersRound, count: 18 },
  { id: "providers", label: "Providers", icon: Building2, count: 3 },
  { id: "mfa", label: "MFA", icon: Smartphone },
  { id: "branding", label: "Branding", icon: Palette },
  { id: "audit", label: "Audit", icon: ScrollText },
];

const meta = {
  title: "Identity/Branding",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const DEFAULT_ACCENT = "#1f4fd8";
const HEX = /^#[0-9a-f]{6}$/i;

const FONTS = [
  { value: "'IBM Plex Sans', system-ui, sans-serif", label: "IBM Plex Sans" },
  { value: "Inter, system-ui, sans-serif", label: "Inter" },
  { value: "system-ui, sans-serif", label: "System UI" },
];

/** WCAG 2.x relative luminance of a #rrggbb colour. */
function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = ch.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

interface Draft extends Brand {
  accent: string;
  fontFamily: string;
  domain: string;
  emailSender: string;
}

function PreviewMark({ brand }: { brand: Draft }) {
  const { theme } = useBrand();
  const logo = theme === "dark" ? brand.logoDarkUrl || brand.logoUrl : brand.logoUrl;
  if (logo) return <img src={logo} alt="" width={24} height={24} className="rounded-md object-contain" />;
  return (
    <span aria-hidden className="grid size-6 place-items-center rounded-md bg-accent text-xs font-semibold text-accent-contrast">
      {(brand.name.trim().charAt(0) || "?").toUpperCase()}
    </span>
  );
}

const N = 24;
const hours = timeLabels(N, 60);
const signIns = wave(N, { base: 140, amp: 90, seed: 62, phase: -1 });

/** Live preview: a nested BrandProvider so the draft never leaks into the rest of the page. */
function BrandPreview({ draft }: { draft: Draft }) {
  const { theme } = useBrand();
  const brand: Partial<Brand> = {
    name: draft.name,
    organization: draft.organization,
    logoUrl: draft.logoUrl || undefined,
    logoDarkUrl: draft.logoDarkUrl || undefined,
    accent: draft.accent,
    fontFamily: draft.fontFamily,
    hidePoweredBy: draft.hidePoweredBy,
  };
  return (
    <BrandProvider brand={brand} theme={theme} className="overflow-hidden rounded-lg border border-line bg-canvas text-fg">
      <div data-testid="brand-preview" className="flex flex-col font-sans">
        <div className="flex items-center gap-2 border-b border-line bg-surface px-3 py-2">
          <PreviewMark brand={draft} />
          <span className="flex min-w-0 grow flex-col">
            <span className="truncate text-sm font-semibold text-fg">{draft.name || "Untitled"}</span>
            <span className="truncate text-2xs text-fg-muted">{draft.organization}</span>
          </span>
          <Badge mono>{draft.domain || "id.example.com"}</Badge>
        </div>
        <div className="flex flex-col gap-2.5 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="primary">
              Sign in
            </Button>
            <Button size="sm">Cancel</Button>
            <StatusBadge tone="info">Connected</StatusBadge>
            <span className="text-sm text-accent-text">Accent link</span>
          </div>
          <KpiCard label="Sign-ins · 24 h" value="3,412" unit="successful" delta={{ label: "+6% vs. yesterday", direction: "up", intent: "good" }} />
          <div className="rounded-lg border border-line bg-surface p-2">
            <TimeSeriesChart label="Preview chart: sign-ins per hour" labels={hours} height={90} series={[{ id: "ok", name: "Sign-ins", data: signIns }]} />
          </div>
          {!draft.hidePoweredBy && <p className="text-center text-2xs text-fg-muted">Powered by OpenAsy</p>}
        </div>
      </div>
    </BrandProvider>
  );
}

function ColorField({ value, onChange, hexText, onHexText }: { value: string; onChange: (hex: string) => void; hexText: string; onHexText: (s: string) => void }) {
  const id = useId();
  const invalid = !HEX.test(hexText);
  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] items-end gap-2">
      <div className="flex flex-col gap-1">
        <label htmlFor={id} className="text-xs font-medium text-fg">
          Accent colour
        </label>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            onHexText(e.target.value);
          }}
          className="h-8 w-12 cursor-pointer rounded-md border border-line-strong bg-surface p-0.5"
        />
      </div>
      <TextField
        label="Accent hex"
        mono
        value={hexText}
        spellCheck={false}
        error={invalid ? "Use #rrggbb, e.g. #0f8c7c" : undefined}
        onChange={(e) => {
          const v = e.target.value.trim();
          onHexText(v);
          if (HEX.test(v)) onChange(v.toLowerCase());
        }}
      />
    </div>
  );
}

/** White-label settings with a live, isolated preview and a WCAG contrast check. */
export const Settings: Story = {
  render: () => {
    const { brand } = useBrand();
    const initial = useMemo<Draft>(
      () => ({
        name: brand.name,
        organization: brand.organization ?? "",
        logoUrl: brand.logoUrl ?? "",
        logoDarkUrl: brand.logoDarkUrl ?? "",
        accent: brand.accent && HEX.test(brand.accent) ? brand.accent : DEFAULT_ACCENT,
        fontFamily: FONTS[0]!.value,
        hidePoweredBy: brand.hidePoweredBy ?? false,
        domain: "id.example.com",
        emailSender: `${brand.name} Identity`,
      }),
      [brand],
    );
    const [draft, setDraft] = useState<Draft>(initial);
    const [hexText, setHexText] = useState(initial.accent);
    const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
    const ratio = contrast(draft.accent, "#ffffff");
    const passes = ratio >= 4.5;
    const dirty = JSON.stringify(draft) !== JSON.stringify(initial);

    return (
      <ProductFrame product="identity" nav={nav} active="branding">
        <PageHeader
          title="Branding"
          description="Sign-in pages, emails and every OpenAsy product shell use these settings"
          meta={dirty ? <StatusBadge tone="warning">Unsaved changes</StatusBadge> : undefined}
          actions={
            <>
              <Button
                icon={<RotateCcw />}
                disabled={!dirty}
                onClick={() => {
                  setDraft(initial);
                  setHexText(initial.accent);
                }}
              >
                Reset
              </Button>
              <Button variant="primary" icon={<Save />} disabled={!dirty}>
                Save changes
              </Button>
            </>
          }
        />
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,1fr)]">
          <Panel title="Settings">
            <form className="flex flex-col gap-3" onSubmit={(e) => e.preventDefault()}>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <TextField label="Product name" value={draft.name} onChange={(e) => set("name", e.target.value)} />
                <TextField label="Organization" value={draft.organization} onChange={(e) => set("organization", e.target.value)} />
                <TextField label="Logo URL" mono placeholder="https://cdn.example.com/logo.svg" hint="Square SVG or PNG, shown at 24 px" value={draft.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} />
                <TextField label="Dark logo URL" mono placeholder="Falls back to the logo" value={draft.logoDarkUrl} onChange={(e) => set("logoDarkUrl", e.target.value)} />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <ColorField value={draft.accent} onChange={(v) => set("accent", v)} hexText={hexText} onHexText={setHexText} />
                <SelectField label="Font" options={FONTS} value={draft.fontFamily} onChange={(e) => set("fontFamily", e.target.value)} />
              </div>
              <p data-testid="contrast" className={passes ? "flex items-center gap-1.5 text-xs text-success" : "flex items-center gap-1.5 text-xs text-warning-text"}>
                <span aria-hidden className="size-3 rounded-sm border border-line" style={{ background: draft.accent }} />
                {passes ? `Passes AA (${ratio.toFixed(1)}:1) for white text on the accent` : `Fails AA (${ratio.toFixed(1)}:1) for white text on the accent`}
              </p>
              {!passes && (
                <Callout tone="warning" title="Low contrast on primary buttons">
                  White text on {draft.accent} is {ratio.toFixed(1)}:1; WCAG AA needs 4.5:1. Pick a darker shade so button labels stay readable.
                </Callout>
              )}
              <div className="grid gap-2.5 sm:grid-cols-2">
                <TextField label="Custom domain" mono value={draft.domain} hint="CNAME to edge.openasy.example" onChange={(e) => set("domain", e.target.value)} />
                <TextField label="Email sender name" value={draft.emailSender} onChange={(e) => set("emailSender", e.target.value)} />
              </div>
              <Switch
                checked={draft.hidePoweredBy ?? false}
                onCheckedChange={(v) => set("hidePoweredBy", v)}
                label="Hide 'Powered by OpenAsy'"
                description="Removes the footer from sign-in pages and emails"
              />
            </form>
          </Panel>
          <Panel title="Preview" description="Updates as you type · not saved yet" aria-label="Brand preview">
            <BrandPreview draft={draft} />
          </Panel>
        </div>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const previewRoot = () => c.getByTestId("brand-preview").closest("[data-oa-brand]") as HTMLElement;
    const hex = c.getByLabelText("Accent hex");
    await userEvent.clear(hex);
    await userEvent.type(hex, "#0f8c7c");
    await expect(previewRoot().style.getPropertyValue("--oa-accent")).toBe("#0f8c7c");
    await expect(c.getByLabelText("Accent colour")).toHaveValue("#0f8c7c");
    await expect(c.getByTestId("contrast")).toHaveTextContent(/Fails AA \(4\.\d:1\)/);
    await expect(c.getByText("Low contrast on primary buttons")).toBeInTheDocument();
    await userEvent.clear(hex);
    await userEvent.type(hex, "#0b5f54");
    await expect(c.getByTestId("contrast")).toHaveTextContent(/Passes AA \(\d+\.\d:1\)/);
    await userEvent.clear(c.getByLabelText("Product name"));
    await userEvent.type(c.getByLabelText("Product name"), "Acme Shield");
    await expect(within(c.getByTestId("brand-preview")).getByText("Acme Shield")).toBeInTheDocument();
    await userEvent.click(c.getByRole("switch", { name: "Hide 'Powered by OpenAsy'" }));
    await expect(within(c.getByTestId("brand-preview")).queryByText("Powered by OpenAsy")).not.toBeInTheDocument();
  },
};
