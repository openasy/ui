import { describe, expect, it } from "vitest";
import { fireEvent, screen } from "@testing-library/react";
import { mockRect, renderUI } from "../test/render";
import { TimeSeriesChart } from "./TimeSeriesChart";
import { ChartSync } from "./ChartSync";
import { StackedBarChart } from "./StackedBarChart";
import { Heatmap } from "./Heatmap";
import { Sparkline } from "./Sparkline";
import { BarList } from "./BarList";
import { ChartLegend, ChartTooltip } from "./parts";

const labels = ["00:00", "01:00", "02:00", "03:00", "04:00"];
const series = [
  { id: "a", name: "orders-api", data: [10, 20, 30, 40, 50] },
  { id: "b", name: "gateway", data: [5, 5, 5, 5, 5] },
];

function hit(index = 0) {
  return screen.getAllByTestId("chart-hit")[index]!;
}

describe("TimeSeriesChart", () => {
  it("draws one line per series and a legend", () => {
    const { container } = renderUI(<TimeSeriesChart label="RPS" series={series} labels={labels} />);
    expect(container.querySelectorAll("path[data-series]")).toHaveLength(2);
    expect(screen.getByRole("list", { name: "Legend" })).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: "RPS" })).toBeInTheDocument();
  });

  it("shows crosshair and a tooltip listing every series on pointer move", () => {
    renderUI(<TimeSeriesChart label="RPS" series={series} labels={labels} />);
    const el = hit();
    mockRect(el, { left: 0, width: 400 });
    fireEvent.pointerMove(el, { clientX: 300 });
    expect(screen.getByTestId("crosshair")).toBeInTheDocument();
    const tip = screen.getByRole("status");
    expect(tip).toHaveTextContent("03:00");
    expect(tip).toHaveTextContent("40");
    expect(tip).toHaveTextContent("gateway");
    fireEvent.pointerLeave(el);
    expect(screen.queryByTestId("crosshair")).not.toBeInTheDocument();
  });

  it("flips the tooltip to the left near the right edge", () => {
    renderUI(<TimeSeriesChart label="RPS" series={series} labels={labels} />);
    const el = hit();
    mockRect(el, { left: 0, width: 400 });
    fireEvent.pointerMove(el, { clientX: 400 });
    expect(screen.getByRole("status").style.transform).toContain("-100%");
  });

  it("is keyboard readable", () => {
    renderUI(<TimeSeriesChart label="RPS" series={series} labels={labels} />);
    const el = hit();
    fireEvent.keyDown(el, { key: "ArrowLeft" });
    expect(el).toHaveAttribute("aria-valuetext", "03:00");
    fireEvent.keyDown(el, { key: "Home" });
    expect(el).toHaveAttribute("aria-valuenow", "0");
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(el).toHaveAttribute("aria-valuetext", "01:00");
    fireEvent.keyDown(el, { key: "End" });
    expect(el).toHaveAttribute("aria-valuetext", "04:00");
    fireEvent.keyDown(el, { key: "Escape" });
    expect(screen.queryByTestId("crosshair")).not.toBeInTheDocument();
    fireEvent.keyDown(el, { key: "ArrowRight" });
    expect(el).toHaveAttribute("aria-valuetext", "04:00");
    fireEvent.keyDown(el, { key: "x" });
    fireEvent.blur(el);
    expect(screen.queryByTestId("crosshair")).not.toBeInTheDocument();
  });

  it("toggles a series from the legend without repainting others", () => {
    const { container } = renderUI(<TimeSeriesChart label="RPS" series={series} labels={labels} />);
    const btn = screen.getByRole("button", { name: "gateway" });
    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-pressed", "false");
    expect(container.querySelectorAll("path[data-series]")).toHaveLength(1);
    expect(container.querySelector('path[data-series="a"]')).toHaveAttribute("stroke", "var(--oa-chart-1)");
    fireEvent.click(btn);
    expect(container.querySelectorAll("path[data-series]")).toHaveLength(2);
  });

  it("supports stacked areas, threshold, fixed yMax, hidden defaults and no legend", () => {
    const { container } = renderUI(
      <TimeSeriesChart
        label="Sessions"
        series={[{ ...series[0]!, color: "red" }, series[1]!]}
        labels={labels}
        stacked
        threshold={{ value: 45, label: "alert 45" }}
        yMax={100}
        legend={false}
        defaultHidden={["b"]}
        format={(v) => `${v} req`}
        xTicks={1}
      />,
    );
    expect(screen.getByTestId("threshold")).toBeInTheDocument();
    expect(screen.getByText("alert 45")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Legend" })).not.toBeInTheDocument();
    expect(container.querySelectorAll("path[data-series]")).toHaveLength(1);
    // Visible tick plus the invisible copy that sizes the axis column.
    expect(screen.getAllByText("100 req")).toHaveLength(2);
  });

  it("renders a single series without legend and without area", () => {
    const { container } = renderUI(<TimeSeriesChart label="One" series={[series[0]!]} labels={labels} area={false} />);
    expect(screen.queryByRole("list", { name: "Legend" })).not.toBeInTheDocument();
    expect(container.querySelectorAll("path")).toHaveLength(1);
  });

  it("handles a single point", () => {
    renderUI(<TimeSeriesChart label="Point" series={[{ id: "p", name: "p", data: [3] }]} labels={["now"]} />);
    fireEvent.keyDown(hit(), { key: "ArrowLeft" });
    expect(hit()).toHaveAttribute("aria-valuetext", "now");
  });

  it("shares the cursor inside ChartSync and only the hovered chart shows a tooltip", () => {
    renderUI(
      <ChartSync>
        <TimeSeriesChart label="A" series={series} labels={labels} />
        <TimeSeriesChart label="B" series={series} labels={labels} />
      </ChartSync>,
    );
    const a = hit(0);
    mockRect(a, { left: 0, width: 400 });
    fireEvent.pointerMove(a, { clientX: 100 });
    expect(screen.getAllByTestId("crosshair")).toHaveLength(2);
    expect(screen.getAllByRole("status")).toHaveLength(1);
    fireEvent.pointerMove(a, { clientX: 100 });
    fireEvent.pointerLeave(a);
    expect(screen.queryAllByTestId("crosshair")).toHaveLength(0);
  });
});

describe("StackedBarChart", () => {
  const props = {
    label: "Events",
    categories: ["00", "01", "02"],
    segments: [
      { id: "high", name: "High", color: "red" },
      { id: "low", name: "Low" },
    ],
    values: [
      [1, 4],
      [0, 2],
      [3, 3],
    ],
  };

  it("draws one bar per category and skips empty segments", () => {
    renderUI(<StackedBarChart {...props} />);
    expect(screen.getAllByTestId("bar")).toHaveLength(3);
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("shows a tooltip for the hovered segment and clears it", () => {
    renderUI(<StackedBarChart {...props} xTicks={1} />);
    const seg = screen.getByRole("button", { name: "02: High 3" });
    fireEvent.pointerEnter(seg);
    expect(screen.getByRole("status")).toHaveTextContent("02");
    fireEvent.pointerLeave(seg.parentElement!.parentElement!);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    fireEvent.focus(seg);
    expect(screen.getByRole("status")).toBeInTheDocument();
    fireEvent.blur(seg);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});

describe("Heatmap", () => {
  it("colours cells by level and reads out the hovered cell", () => {
    const { container } = renderUI(
      <Heatmap label="Latency" rows={["slow", "fast"]} columns={["00", "01"]} values={[[0, 5], [10, 2]]} unit="req" />,
    );
    expect(container.querySelectorAll('[data-level="0"]')).toHaveLength(1);
    expect(container.querySelectorAll('[data-level="5"]')).toHaveLength(1);
    expect(screen.getByTestId("heatmap-readout")).toHaveTextContent("Hover a cell");
    const cell = container.querySelector('[data-level="5"]')!;
    fireEvent.pointerEnter(cell);
    expect(screen.getByTestId("heatmap-readout")).toHaveTextContent("00 · fast · 10 req");
    fireEvent.pointerLeave(cell.parentElement!.parentElement!.parentElement!);
    expect(screen.getByTestId("heatmap-readout")).toHaveTextContent("Hover a cell");
  });

  it("omits the unit when none is given", () => {
    const { container } = renderUI(<Heatmap label="L" rows={["r"]} columns={["c"]} values={[[1]]} />);
    fireEvent.pointerEnter(container.querySelector("[data-level]")!);
    expect(screen.getByTestId("heatmap-readout").textContent).toBe("c · r · 1");
  });
});

describe("Sparkline", () => {
  it("names the latest value and shows a readout on hover", () => {
    renderUI(<Sparkline data={[1, 5, 3]} label="Sessions" format={(v, i) => `${v}@${i}`} />);
    expect(screen.getByRole("img", { name: "Sessions, latest 3" })).toBeInTheDocument();
    const el = screen.getByTestId("spark-hit");
    mockRect(el, { left: 0, width: 100 });
    fireEvent.pointerMove(el, { clientX: 50 });
    expect(screen.getByTestId("spark-readout")).toHaveTextContent("5@1");
    fireEvent.pointerLeave(el);
    expect(screen.queryByTestId("spark-readout")).not.toBeInTheDocument();
  });

  it("works with one point, no format and empty data", () => {
    const { rerender } = renderUI(<Sparkline data={[4]} label="One" />);
    const el = screen.getByTestId("spark-hit");
    fireEvent.pointerMove(el, { clientX: 0 });
    expect(screen.getByTestId("spark-readout")).toHaveTextContent("4");
    rerender(<Sparkline data={[]} label="None" />);
    expect(screen.getByRole("img", { name: "None" })).toBeInTheDocument();
  });
});

describe("BarList", () => {
  it("renders ranked bars, links and custom colours", () => {
    const { container } = renderUI(
      <BarList
        label="Top hosts"
        items={[
          { id: "a", label: "api-prod-03", value: 92, color: "orange", href: "#a" },
          { id: "b", label: "api-prod-05", value: 46 },
        ]}
        max={100}
        format={(v) => `${v}%`}
      />,
    );
    expect(screen.getByRole("list", { name: "Top hosts" })).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "#a");
    expect(screen.getByText("92%")).toBeInTheDocument();
    const bars = container.querySelectorAll<HTMLElement>(".rounded-r-\\[3px\\] > span");
    expect(bars[1]!.style.width).toBe("46%");
  });

  it("scales to the largest value by default", () => {
    const { container } = renderUI(<BarList label="L" items={[{ id: "x", label: "x", value: 10 }, { id: "y", label: "y", value: 5 }]} />);
    const bars = container.querySelectorAll<HTMLElement>(".rounded-r-\\[3px\\] > span");
    expect(bars[0]!.style.width).toBe("100%");
    expect(bars[1]!.style.width).toBe("50%");
  });
});

describe("chart parts", () => {
  it("static legend and box tooltip", () => {
    renderUI(
      <div className="relative">
        <ChartLegend items={[{ id: "a", name: "A", color: "red" }]} mark="box" />
        <ChartTooltip title="t" mark="box" rows={[{ id: "a", color: "red", value: 1, name: "A", emphasis: true }]} />
      </div>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("t1A");
    expect(screen.getByRole("status").querySelector("[data-emphasis]")).toBeInTheDocument();
  });
});
