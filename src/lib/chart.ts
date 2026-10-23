export type Point = readonly [number, number];

/**
 * Smooth path through points (Catmull-Rom converted to cubic Béziers).
 * Points are in SVG user units.
 */
export function smoothPath(points: readonly Point[]): string {
  if (points.length === 0) return "";
  const f = (n: number) => Number(n.toFixed(2));
  const first = points[0]!;
  if (points.length === 1) return `M${f(first[0])},${f(first[1])}`;
  let d = `M${f(first[0])},${f(first[1])}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${f(c1x)},${f(c1y)} ${f(c2x)},${f(c2y)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d;
}

/** Straight segments, used when smoothing would misrepresent step data. */
export function linearPath(points: readonly Point[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"}${Number(p[0].toFixed(2))},${Number(p[1].toFixed(2))}`).join(" ");
}

/**
 * A "nice" upper bound and evenly spaced ticks starting at zero.
 * niceScale(141) -> { max: 160, ticks: [0, 40, 80, 120, 160] }
 */
export function niceScale(maxValue: number, tickCount = 4): { max: number; ticks: number[] } {
  if (!Number.isFinite(maxValue) || maxValue <= 0) {
    return { max: 1, ticks: Array.from({ length: tickCount + 1 }, (_, i) => i / tickCount) };
  }
  const rough = maxValue / tickCount;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 3, 4, 5, 10].map((m) => m * mag).find((s) => s * tickCount >= maxValue) ?? 10 * mag;
  const max = step * tickCount;
  return { max, ticks: Array.from({ length: tickCount + 1 }, (_, i) => Number((step * i).toPrecision(12))) };
}

/** Index of the nearest data point for a pointer at clientX over an element. */
export function indexFromPointer(clientX: number, rect: { left: number; width: number }, count: number): number {
  if (count <= 1 || rect.width <= 0) return 0;
  const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.round(ratio * (count - 1));
}

/** Default categorical order. Colour follows the series, never its rank. */
export const CHART_COLORS = ["var(--oa-chart-1)", "var(--oa-chart-2)", "var(--oa-chart-3)", "var(--oa-chart-4)"] as const;

export const SEQUENTIAL_RAMP = ["var(--oa-seq-0)", "var(--oa-seq-1)", "var(--oa-seq-2)", "var(--oa-seq-3)", "var(--oa-seq-4)", "var(--oa-seq-5)"] as const;

export function colorAt(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]!;
}
