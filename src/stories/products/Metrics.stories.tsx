import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { ChartLine, Compass, Crosshair, LayoutDashboard, List, Pencil, RefreshCw, Share2, Sigma } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Panel } from "../../components/Panel";
import { FilterBar, FilterChip, TimeRangePicker } from "../../components/Filters";
import { SegmentedControl } from "../../components/SegmentedControl";
import { StatusBadge } from "../../components/Badge";
import { ChartSync } from "../../charts/ChartSync";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "dashboards", label: "Dashboards", icon: LayoutDashboard, count: 23 },
  { id: "explore", label: "Explore", icon: Compass },
  { id: "metrics", label: "Metric list", icon: List, count: "4.1k" },
  { id: "rules", label: "Recording rules", icon: Sigma, count: 18 },
  { id: "targets", label: "Targets", icon: Crosshair, count: 96 },
];

const meta = {
  title: "Products/Metrics",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

const N = 60;
const labels = timeLabels(N, 1);
/** The incident starts here: a miner lands on api-prod-03 at 13:48. */
const AT = 36;

const pct = (v: number) => `${Math.round(v)}%`;
const clamp = (xs: number[], max = 100) => xs.map((v) => Math.min(max, v));

const PANELS = {
  cpu: [
    { id: "a1", name: "api-prod-01", data: wave(N, { base: 34, amp: 5, seed: 41 }) },
    { id: "a3", name: "api-prod-03", data: clamp(wave(N, { base: 38, amp: 5, seed: 42, spike: 58, spikeAt: AT, spikeLen: 4 })) },
    { id: "a5", name: "api-prod-05", data: wave(N, { base: 31, amp: 5, seed: 43, spike: 9, spikeAt: AT + 4 }) },
  ],
  rps: [
    { id: "2xx", name: "2xx", color: "var(--oa-chart-1)", data: wave(N, { base: 1240, amp: 120, seed: 44, spike: -380, spikeAt: AT + 2, spikeLen: 6 }) },
    { id: "5xx", name: "5xx", color: "var(--oa-danger)", data: wave(N, { base: 4, amp: 2, seed: 45, spike: 96, spikeAt: AT + 2, spikeLen: 6 }) },
  ],
  latency: [
    { id: "p95", name: "p95", color: "var(--oa-chart-2)", data: wave(N, { base: 0.42, amp: 0.06, seed: 46, spike: 2.9, spikeAt: AT + 1, spikeLen: 7 }) },
    { id: "p50", name: "p50", color: "var(--oa-chart-1)", data: wave(N, { base: 0.09, amp: 0.02, seed: 47, spike: 0.6, spikeAt: AT + 1, spikeLen: 7 }) },
  ],
  pool: [
    { id: "use", name: "in use", color: "var(--oa-chart-3)", data: clamp(wave(N, { base: 18, amp: 4, seed: 48, spike: 40, spikeAt: AT + 3, spikeLen: 5 }), 50) },
    { id: "wait", name: "waiting", color: "var(--oa-chart-4)", data: wave(N, { base: 0, amp: 0.5, seed: 49, spike: 37, spikeAt: AT + 6, spikeLen: 5 }) },
  ],
  mem: [
    { id: "a1", name: "api-prod-01", data: wave(N, { base: 58, amp: 3, seed: 50 }) },
    { id: "a3", name: "api-prod-03", data: clamp(wave(N, { base: 61, amp: 3, seed: 51, spike: 22, spikeAt: AT + 2, spikeLen: 10 })) },
    { id: "a5", name: "api-prod-05", data: wave(N, { base: 55, amp: 3, seed: 52 }) },
  ],
  net: [
    { id: "rx", name: "rx", data: wave(N, { base: 38, amp: 8, seed: 53, spike: -9, spikeAt: AT + 2 }) },
    { id: "tx", name: "tx", data: wave(N, { base: 21, amp: 5, seed: 54, spike: 34, spikeAt: AT, spikeLen: 3 }) },
  ],
};

/* --------------------------------------------------------------- stories */

/** Dashboard: six synced panels for orders-api, during an incident that starts at 13:48. */
export const Dashboard: Story = {
  render: () => {
    const [range, setRange] = useState("1h");
    const [vars, setVars] = useState<Array<{ field: string; value: string }>>([
      { field: "env", value: "prod" },
      { field: "service", value: "orders-api" },
      { field: "host", value: "All" },
    ]);
    const [refresh, setRefresh] = useState("30s");
    const height = 150;
    return (
      <ProductFrame product="metrics" nav={nav} active="dashboards">
        <PageHeader
          breadcrumbs={[{ label: "Dashboards", href: "#dashboards" }, { label: "orders-api" }]}
          title="orders-api"
          description="RED metrics, saturation and host resources · owned by Payments team"
          meta={<StatusBadge tone="danger">2 alerts firing</StatusBadge>}
          actions={
            <>
              <SegmentedControl
                label="Auto refresh"
                value={refresh}
                onChange={setRefresh}
                options={[
                  { value: "off", label: "Off" },
                  { value: "30s", label: "30 s" },
                  { value: "1m", label: "1 m" },
                ]}
              />
              <IconButton label="Refresh now">
                <RefreshCw />
              </IconButton>
              <Button icon={<Share2 />}>Share</Button>
              <Button icon={<Pencil />}>Edit</Button>
            </>
          }
        />
        <FilterBar>
          <TimeRangePicker value={range} onChange={setRange} />
          {vars.map((v) => (
            <FilterChip
              key={v.field}
              field={v.field}
              value={v.value}
              onRemove={v.field === "env" ? undefined : () => setVars((xs) => xs.filter((x) => x.field !== v.field))}
            />
          ))}
          <Button size="sm" variant="ghost" icon={<ChartLine />}>
            Add panel
          </Button>
        </FilterBar>
        <Callout tone="danger" title="Latency p95 above the 2 s SLO since 13:49" action={<Button size="sm">Open incident INC-142</Button>}>
          CPU on api-prod-03 hit 97% at 13:48, a minute before 5xx and DB pool waiters climbed.
        </Callout>
        <ChartSync>
          <div className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
            <Panel title="CPU by host · %" description="node_cpu_seconds_total">
              <TimeSeriesChart label="CPU by host" labels={labels} height={height} yMax={100} format={pct} threshold={{ value: 85, label: "alert 85%" }} series={PANELS.cpu} xTicks={4} />
            </Panel>
            <Panel title="Requests / s" description="by status class">
              <TimeSeriesChart label="Requests per second, 2xx and 5xx" labels={labels} height={height} format={(v) => `${Math.round(v)}`} series={PANELS.rps} xTicks={4} />
            </Panel>
            <Panel title="Latency · s" description="histogram_quantile over http_request_duration_seconds">
              <TimeSeriesChart
                label="Latency p95 and p50"
                labels={labels}
                height={height}
                area={false}
                format={(v) => `${v.toFixed(2)} s`}
                threshold={{ value: 2, label: "SLO 2 s" }}
                series={PANELS.latency}
                xTicks={4}
              />
            </Panel>
            <Panel title="DB pool" description="pgbouncer connections">
              <TimeSeriesChart label="Database pool in use and waiting" labels={labels} height={height} format={(v) => `${Math.round(v)}`} threshold={{ value: 50, label: "pool size 50" }} series={PANELS.pool} xTicks={4} />
            </Panel>
            <Panel title="Memory by host · %">
              <TimeSeriesChart label="Memory by host" labels={labels} height={height} yMax={100} format={pct} series={PANELS.mem} area={false} xTicks={4} />
            </Panel>
            <Panel title="Network · MB/s">
              <TimeSeriesChart label="Network receive and transmit" labels={labels} height={height} format={(v) => `${v.toFixed(1)} MB/s`} series={PANELS.net} xTicks={4} />
            </Panel>
          </div>
        </ChartSync>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "orders-api" })).toBeInTheDocument();
    await expect(c.getByRole("navigation", { name: "Breadcrumb" })).toHaveTextContent("Dashboards");

    // Hovering one chart marks the same moment on all six; only the hovered one shows a tooltip.
    const sliders = c.getAllByRole("slider");
    await expect(sliders).toHaveLength(6);
    const r = sliders[0]!.getBoundingClientRect();
    await fireEvent.pointerMove(sliders[0]!, { clientX: r.left + r.width * 0.7, clientY: r.top + 5 });
    await expect(c.getAllByTestId("crosshair")).toHaveLength(6);
    await expect(c.getAllByRole("status")).toHaveLength(1);
    sliders[0]!.focus();
    await userEvent.keyboard("{Escape}");
    await expect(c.queryAllByTestId("crosshair")).toHaveLength(0);

    // Template variables can be removed.
    await userEvent.click(c.getByRole("button", { name: "Remove filter host" }));
    await expect(c.queryByRole("button", { name: "Remove filter host" })).not.toBeInTheDocument();
  },
};
