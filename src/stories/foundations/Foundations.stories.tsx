import type { Meta, StoryObj } from "@storybook/react-vite";
import { LevelBadge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { Callout } from "../../components/Callout";
import { Panel } from "../../components/Panel";
import { LOG_LEVELS, LOG_LEVEL_META, SEVERITIES, SEVERITY_META } from "../../tokens/levels";
import { PRODUCT_LIST } from "../../tokens/products";

const meta = {
  title: "Foundations/Overview",
  parameters: { layout: "padded" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const swatches: Array<{ group: string; items: Array<[string, string]> }> = [
  {
    group: "Surfaces & text",
    items: [
      ["canvas", "--oa-canvas"],
      ["surface", "--oa-surface"],
      ["subtle", "--oa-subtle"],
      ["line", "--oa-line"],
      ["line-strong", "--oa-line-strong"],
      ["fg-subtle", "--oa-fg-subtle"],
      ["fg-muted", "--oa-fg-muted"],
      ["fg", "--oa-fg"],
    ],
  },
  {
    group: "Accent (white-label)",
    items: [
      ["accent", "--oa-accent"],
      ["accent-hover", "--oa-accent-hover"],
      ["accent-soft", "--oa-accent-soft"],
      ["accent-text", "--oa-accent-text"],
    ],
  },
  {
    group: "Status (reserved for state)",
    items: [
      ["success", "--oa-success"],
      ["success-soft", "--oa-success-soft"],
      ["warning", "--oa-warning"],
      ["warning-soft", "--oa-warning-soft"],
      ["danger", "--oa-danger"],
      ["danger-soft", "--oa-danger-soft"],
      ["critical", "--oa-critical"],
    ],
  },
  {
    group: "Chart series (fixed order)",
    items: [
      ["chart-1", "--oa-chart-1"],
      ["chart-2", "--oa-chart-2"],
      ["chart-3", "--oa-chart-3"],
      ["chart-4", "--oa-chart-4"],
    ],
  },
];

/** Colour tokens. Switch Theme and Brand in the toolbar to see them change. */
export const Colors: Story = {
  render: () => (
    <div className="flex flex-col gap-5">
      {swatches.map((g) => (
        <section key={g.group} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold">{g.group}</h2>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(120px,1fr))] gap-2.5">
            {g.items.map(([name, v]) => (
              <div key={name} className="flex flex-col gap-1">
                <span className="h-12 rounded-md border border-line" style={{ background: `var(${v})` }} />
                <span className="text-xs font-medium">{name}</span>
                <code className="font-mono text-2xs text-fg-muted">{v}</code>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  ),
};

/** The type scale is dense by default: 13 px body, 32 px controls and rows. */
export const Typography: Story = {
  render: () => (
    <Panel title="Type scale" flush>
      <table className="w-full text-left">
        <tbody>
          {[
            ["Title", "text-xl font-semibold", "20 / 28 · 600", "Connections"],
            ["Section", "text-sm font-semibold", "13 / 18 · 600", "Split tunnel routes"],
            ["Body", "text-sm", "13 / 18 · 400", "Routes are pushed only for the IP groups a person can reach."],
            ["Small", "text-xs text-fg-muted", "12 / 16 · 400", "Last handshake 4 minutes ago"],
            ["Label", "text-2xs font-medium uppercase tracking-wider text-fg-muted", "11 / 14 · caps", "Active sessions"],
            ["Mono", "font-mono text-xs", "12 / 16 · mono", "10.8.0.14 → 172.16.20.0/24 tcp/443"],
            ["KPI", "text-2xl font-semibold tabular-nums", "24 / 32 · 600", "1,204"],
          ].map(([name, cls, spec, sample]) => (
            <tr key={name} className="border-b border-subtle last:border-0">
              <th scope="row" className="w-32 px-3 py-2 text-xs font-semibold">
                {name}
                <div className="font-mono text-2xs font-normal text-fg-muted">{spec}</div>
              </th>
              <td className={`px-3 py-2 ${cls}`}>{sample}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Panel>
  ),
};

/**
 * One vocabulary for every product. Log levels describe a line, severities
 * rank findings and alerts, tones drive badges and callouts. Shapes keep the
 * scale readable without colour.
 */
export const StandardLevels: Story = {
  name: "Standard levels (error, warn, info…)",
  render: () => (
    <div className="grid gap-3 md:grid-cols-2">
      <Panel title="Log levels" description="toLogLevel() normalises err, warning, panic, syslog 0–7…" flush>
        <table className="w-full text-sm">
          <tbody>
            {[...LOG_LEVELS].reverse().map((l) => (
              <tr key={l} className="border-b border-subtle last:border-0">
                <td className="px-3 py-1.5">
                  <LevelBadge level={l} />
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-fg-muted">{l}</td>
                <td className="px-3 py-1.5 text-xs text-fg-muted">tone: {LOG_LEVEL_META[l].tone}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Severities" description="toSeverity() accepts CVSS scores and words" flush>
        <table className="w-full text-sm">
          <tbody>
            {SEVERITIES.map((s) => (
              <tr key={s} className="border-b border-subtle last:border-0">
                <td className="px-3 py-1.5">
                  <SeverityBadge severity={s} />
                </td>
                <td className="px-3 py-1.5 font-mono text-xs text-fg-muted">CVSS {SEVERITY_META[s].cvss}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
      <Panel title="Status tones">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone="success">Connected</StatusBadge>
          <StatusBadge tone="info">Running</StatusBadge>
          <StatusBadge tone="warning">Degraded</StatusBadge>
          <StatusBadge tone="danger">Firing</StatusBadge>
          <StatusBadge tone="critical">Breached</StatusBadge>
          <StatusBadge tone="neutral">Offline</StatusBadge>
        </div>
      </Panel>
      <div className="flex flex-col gap-2">
        <Callout tone="info" title="Info">
          Context only, never alerts.
        </Callout>
        <Callout tone="warning" title="Warning">
          Plan a fix.
        </Callout>
        <Callout tone="danger" title="Error">
          Something failed and needs action.
        </Callout>
      </div>
    </div>
  ),
};

/** Every product in the family, with its image and icon. */
export const Products: Story = {
  render: () => (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-2.5">
      {PRODUCT_LIST.map((p) => (
        <div key={p.id} className="flex gap-2.5 rounded-lg border border-line bg-surface p-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-fg text-surface">
            <p.icon aria-hidden className="size-4" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold">{p.name}</span>
              <code className="font-mono text-2xs text-fg-muted">{p.image}</code>
            </span>
            <span className="text-xs text-fg-muted">{p.summary}</span>
          </div>
        </div>
      ))}
    </div>
  ),
};
