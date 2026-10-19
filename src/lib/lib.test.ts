import { describe, expect, it } from "vitest";
import { cn } from "./cn";
import { formatBytes, formatDelta, formatDuration, formatNumber, formatPercent } from "./format";
import { colorAt, indexFromPointer, linearPath, niceScale, smoothPath } from "./chart";

describe("cn", () => {
  it("merges conditional classes and lets later Tailwind utilities win", () => {
    expect(cn("px-2 py-1", false && "hidden", "px-4")).toBe("py-1 px-4");
  });
});

describe("formatNumber", () => {
  it("keeps small numbers exact and compacts large ones", () => {
    expect(formatNumber(1204)).toBe("1,204");
    expect(formatNumber(48_200)).toBe("48.2K");
    expect(formatNumber(12, { compact: true })).toBe("12");
    expect(formatNumber(2_100_000, { compact: false })).toBe("2,100,000");
  });
  it("renders a dash for non-finite input", () => {
    expect(formatNumber(Number.NaN)).toBe("–");
  });
});

describe("formatBytes", () => {
  it("uses 1024 steps", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(3 * 1024 ** 3, 0)).toBe("3 GB");
    expect(formatBytes(-2048)).toBe("-2.0 KB");
  });
  it("handles infinity", () => {
    expect(formatBytes(Number.POSITIVE_INFINITY)).toBe("–");
  });
});

describe("formatDuration", () => {
  it.each([
    [5, "5 s"],
    [125, "2 m"],
    [8040, "2 h 14 m"],
    [90_000, "1 d 1 h"],
    [-1, "–"],
  ])("%s seconds -> %s", (input, out) => {
    expect(formatDuration(input)).toBe(out);
  });
});

describe("formatPercent", () => {
  it("formats ratios and plain percentages", () => {
    expect(formatPercent(0.457)).toBe("46%");
    expect(formatPercent(0.0523)).toBe("5.2%");
    expect(formatPercent(92, { ratio: false })).toBe("92%");
    expect(formatPercent(0.5, { decimals: 2 })).toBe("50.00%");
    expect(formatPercent(Number.NaN)).toBe("–");
  });
});

describe("formatDelta", () => {
  it("always shows a sign", () => {
    expect(formatDelta(12)).toBe("+12");
    expect(formatDelta(-3.5, "%")).toBe("−3.5%");
    expect(formatDelta(0, " ms")).toBe("0 ms");
    expect(formatDelta(Number.NaN)).toBe("–");
  });
});

describe("chart helpers", () => {
  it("smoothPath handles 0, 1 and many points", () => {
    expect(smoothPath([])).toBe("");
    expect(smoothPath([[1, 2]])).toBe("M1,2");
    const d = smoothPath([
      [0, 10],
      [50, 0],
      [100, 10],
    ]);
    expect(d.startsWith("M0,10 C")).toBe(true);
    expect(d.endsWith("100,10")).toBe(true);
    expect(d.match(/C/g)).toHaveLength(2);
  });

  it("linearPath draws straight segments", () => {
    expect(
      linearPath([
        [0, 0],
        [1.234, 5],
      ]),
    ).toBe("M0,0 L1.23,5");
  });

  it("niceScale rounds up to a readable bound", () => {
    expect(niceScale(141)).toEqual({ max: 160, ticks: [0, 40, 80, 120, 160] });
    expect(niceScale(0.9).max).toBe(1);
    expect(niceScale(0).max).toBe(1);
    expect(niceScale(-5).ticks).toHaveLength(5);
    expect(niceScale(100, 4).max).toBe(100);
  });

  it("indexFromPointer clamps and rounds", () => {
    const rect = { left: 100, width: 200 };
    expect(indexFromPointer(100, rect, 11)).toBe(0);
    expect(indexFromPointer(200, rect, 11)).toBe(5);
    expect(indexFromPointer(999, rect, 11)).toBe(10);
    expect(indexFromPointer(0, rect, 11)).toBe(0);
    expect(indexFromPointer(150, { left: 0, width: 0 }, 11)).toBe(0);
    expect(indexFromPointer(150, rect, 1)).toBe(0);
  });

  it("colorAt cycles through the fixed order", () => {
    expect(colorAt(0)).toBe("var(--oa-chart-1)");
    expect(colorAt(5)).toBe("var(--oa-chart-2)");
  });
});
