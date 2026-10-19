import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, within } from "storybook/test";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { ChartSync } from "../../charts/ChartSync";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { Heatmap } from "../../charts/Heatmap";
import { Sparkline } from "../../charts/Sparkline";
import { BarList } from "../../charts/BarList";
import { Panel } from "../../components/Panel";
import { timeLabels, wave } from "../mocks";

const N = 49;
const labels = timeLabels(N, 15);

const meta = {
  title: "Charts/TimeSeriesChart",
  component: TimeSeriesChart,
  parameters: { layout: "padded" },
  args: {
    label: "Requests per second by service",
    labels,
    height: 220,
    series: [
      { id: "orders", name: "orders-api", data: wave(N, { base: 1300, amp: 380, seed: 1, spike: 500 }) },
      { id: "gateway", name: "gateway", data: wave(N, { base: 980, amp: 260, phase: 0.6, seed: 2 }) },
      { id: "payments", name: "payments-api", data: wave(N, { base: 520, amp: 160, phase: 1.3, seed: 3, spike: 260 }) },
      { id: "search", name: "search", data: wave(N, { base: 260, amp: 90, phase: 2.1, seed: 4 }) },
    ],
  },
} satisfies Meta<typeof TimeSeriesChart>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Hover for the crosshair; arrow keys work too. Click legend items to hide series. */
export const Lines: Story = {
  render: (args) => (
    <Panel title="Requests per second by service">
      <TimeSeriesChart {...args} />
    </Panel>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const hit = c.getByRole("slider");
    const r = hit.getBoundingClientRect();
    await fireEvent.pointerMove(hit, { clientX: r.left + r.width * 0.5, clientY: r.top + 10 });
    await expect(c.getByRole("status")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "search" }));
    await expect(c.getByRole("button", { name: "search" })).toHaveAttribute("aria-pressed", "false");
  },
};

export const StackedWithThreshold: Story = {
  args: {
    label: "VPN sessions stacked by node",
    stacked: true,
    threshold: { value: 160, label: "license 160" },
    series: [
      { id: "ist", name: "ist-01", data: wave(N, { base: 70, amp: 40, seed: 9 }) },
      { id: "fra", name: "fra-01", data: wave(N, { base: 30, amp: 15, seed: 10, phase: 0.5 }) },
    ],
  },
  render: (args) => (
    <Panel title="Concurrent sessions">
      <TimeSeriesChart {...args} />
    </Panel>
  ),
};

/** Wrap a dashboard in ChartSync: hovering one panel marks the same moment everywhere. */
export const SyncedDashboard: Story = {
  render: () => (
    <ChartSync>
      <div className="grid gap-2.5 md:grid-cols-2">
        <Panel title="CPU by host · %">
          <TimeSeriesChart
            label="CPU by host"
            labels={labels}
            height={140}
            yMax={100}
            threshold={{ value: 85, label: "alert 85%" }}
            format={(v) => `${Math.round(v)}%`}
            series={[
              { id: "a3", name: "api-prod-03", color: "var(--oa-chart-2)", data: wave(N, { base: 48, amp: 6, seed: 11, spike: 44 }) },
              { id: "a5", name: "api-prod-05", color: "var(--oa-chart-1)", data: wave(N, { base: 45, amp: 6, seed: 12, spike: 14 }) },
            ]}
          />
        </Panel>
        <Panel title="Latency p95 · s">
          <TimeSeriesChart
            label="Latency p95"
            labels={labels}
            height={140}
            format={(v) => `${v.toFixed(2)} s`}
            threshold={{ value: 2, label: "SLO 2 s" }}
            series={[{ id: "p95", name: "p95", data: wave(N, { base: 0.2, amp: 0.04, seed: 13, spike: 4.8 }) }]}
          />
        </Panel>
      </div>
    </ChartSync>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const [first] = c.getAllByRole("slider");
    const r = first!.getBoundingClientRect();
    await fireEvent.pointerMove(first!, { clientX: r.left + r.width * 0.8, clientY: r.top + 5 });
    await expect(c.getAllByTestId("crosshair")).toHaveLength(2);
    await expect(c.getAllByRole("status")).toHaveLength(1);
  },
};

const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, "0")}:00`);

export const StackedBars: Story = {
  render: () => (
    <Panel title="Security events by severity" description="24 hours">
      <StackedBarChart
        label="Security events by severity"
        categories={hours}
        segments={[
          { id: "critical", name: "Critical", color: "var(--oa-critical)" },
          { id: "high", name: "High", color: "var(--oa-danger)" },
          { id: "medium", name: "Medium", color: "var(--oa-warning)" },
          { id: "low", name: "Low", color: "var(--oa-seq-2)" },
        ]}
        values={hours.map((_, h) => {
          const base = 18 + 10 * Math.sin(h / 3.8) + (h >= 13 && h <= 15 ? 26 : 0);
          return [h === 14 ? 3 : h === 13 || h === 15 ? 1 : 0, Math.round(base * 0.18 + (h === 14 ? 9 : 0)), Math.round(base * 0.4), Math.round(base * 0.6 + 6)];
        })}
      />
    </Panel>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const seg = c.getAllByRole("button", { name: /^14:00: Critical/ })[0]!;
    await userEvent.hover(seg);
    await expect(c.getByRole("status")).toHaveTextContent("14:00");
  },
};

const buckets = ["> 5 s", "1–5 s", "500 ms", "250 ms", "100 ms", "50 ms", "< 25 ms"];

export const LatencyHeatmap: Story = {
  render: () => (
    <Panel title="Latency distribution">
      <Heatmap
        label="Latency distribution by hour"
        rows={buckets}
        columns={hours}
        unit="requests"
        values={buckets.map((_, r) =>
          hours.map((__, c) => {
            const center = c >= 13 && c <= 15 ? 1.6 : 4.4;
            const v = Math.max(0, 5.4 - Math.abs(r - center) * 1.5 + Math.sin(c / 2.7 + r) * 0.7);
            return Math.round(Math.pow(v + 0.4, 3) * 38);
          }),
        )}
      />
    </Panel>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const cells = canvasElement.querySelectorAll("[data-level]");
    await userEvent.hover(cells[30]!);
    await expect(c.getByTestId("heatmap-readout")).not.toHaveTextContent("Hover a cell");
  },
};

export const ListsAndSparklines: Story = {
  name: "BarList & Sparkline",
  render: () => (
    <div className="grid gap-2.5 md:grid-cols-2">
      <Panel title="Top hosts by CPU">
        <BarList
          label="Top hosts by CPU"
          max={100}
          format={(v) => `${v}%`}
          items={[
            { id: "a3", label: "api-prod-03", value: 92, color: "var(--oa-warning)", href: "#a3" },
            { id: "w4", label: "worker-prod-04", value: 88, color: "var(--oa-warning)", href: "#w4" },
            { id: "w9", label: "worker-prod-09", value: 81, href: "#w9" },
            { id: "w1", label: "worker-prod-01", value: 74, href: "#w1" },
            { id: "a5", label: "api-prod-05", value: 63, href: "#a5" },
          ]}
        />
      </Panel>
      <Panel title="Sparklines">
        <div className="grid grid-cols-3 gap-3 pt-5">
          <Sparkline label="VPN sessions" data={wave(24, { base: 90, amp: 50, seed: 21 })} format={(v) => `${Math.round(v)} sessions`} />
          <Sparkline label="Log ingest" data={wave(24, { base: 2.4, amp: 0.6, seed: 22 })} color="var(--oa-chart-3)" format={(v) => `${v.toFixed(1)}k/s`} />
          <Sparkline label="Errors" data={wave(24, { base: 4, amp: 3, seed: 23, spike: 30 })} color="var(--oa-danger)" />
        </div>
      </Panel>
    </div>
  ),
};
