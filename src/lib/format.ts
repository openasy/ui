const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });
const plain = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

/** 1234 -> "1.2K", 12 -> "12". Values under 10,000 keep full precision. */
export function formatNumber(value: number, opts: { compact?: boolean } = {}): string {
  if (!Number.isFinite(value)) return "–";
  if (opts.compact ?? Math.abs(value) >= 10_000) return compact.format(value);
  return plain.format(value);
}

/** Bytes to a human string using 1024 steps: 1536 -> "1.5 KB". */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes)) return "–";
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let value = Math.abs(bytes);
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const sign = bytes < 0 ? "-" : "";
  return `${sign}${unit === 0 ? value : value.toFixed(decimals)} ${units[unit]}`;
}

/** Seconds to "2 h 14 m", "48 m", "12 s". */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "–";
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const s = Math.floor(seconds % 60);
  if (d > 0) return `${d} d ${h} h`;
  if (h > 0) return `${h} h ${String(m).padStart(2, "0")} m`;
  if (m > 0) return `${m} m`;
  return `${s} s`;
}

/** 0.4567 -> "45.7%" (ratio) or 45.67 -> "45.7%" with { ratio: false }. */
export function formatPercent(value: number, opts: { ratio?: boolean; decimals?: number } = {}): string {
  if (!Number.isFinite(value)) return "–";
  const pct = (opts.ratio ?? true) ? value * 100 : value;
  return `${pct.toFixed(opts.decimals ?? (Math.abs(pct) < 10 && pct % 1 !== 0 ? 1 : 0))}%`;
}

/** Signed delta with an explicit plus sign: 12 -> "+12", -3.5 -> "−3.5". */
export function formatDelta(value: number, suffix = ""): string {
  if (!Number.isFinite(value)) return "–";
  if (value === 0) return `0${suffix}`;
  const sign = value > 0 ? "+" : "−";
  return `${sign}${plain.format(Math.abs(value))}${suffix}`;
}
