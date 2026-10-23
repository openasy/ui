/**
 * The one vocabulary for "how bad is it" across every OpenAsy product.
 *
 * - LogLevel   : what a log line says about itself (Logs, VPN, every agent).
 * - Severity   : how urgent a finding or alert is (SIEM, Vulnerabilities, SAST…).
 * - Tone       : the visual intent of a state (badges, callouts, KPI deltas).
 *
 * Products must map their own vocabularies onto these, never invent new colours.
 */

export type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "critical";

export const LOG_LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
export type LogLevel = (typeof LOG_LEVELS)[number];

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export interface LevelMeta {
  label: string;
  tone: Tone;
  /** Rank for sorting: higher is worse. */
  rank: number;
  /** Shape so the scale never relies on colour alone. */
  shape: "diamond" | "triangle" | "square" | "circle" | "dash";
}

export const LOG_LEVEL_META: Record<LogLevel, LevelMeta> = {
  trace: { label: "TRACE", tone: "neutral", rank: 0, shape: "dash" },
  debug: { label: "DEBUG", tone: "neutral", rank: 1, shape: "dash" },
  info: { label: "INFO", tone: "info", rank: 2, shape: "circle" },
  warn: { label: "WARN", tone: "warning", rank: 3, shape: "square" },
  error: { label: "ERROR", tone: "danger", rank: 4, shape: "triangle" },
  fatal: { label: "FATAL", tone: "critical", rank: 5, shape: "diamond" },
};

export const SEVERITY_META: Record<Severity, LevelMeta & { cvss: string }> = {
  critical: { label: "Critical", tone: "critical", rank: 4, shape: "diamond", cvss: "9.0–10" },
  high: { label: "High", tone: "danger", rank: 3, shape: "triangle", cvss: "7.0–8.9" },
  medium: { label: "Medium", tone: "warning", rank: 2, shape: "square", cvss: "4.0–6.9" },
  low: { label: "Low", tone: "info", rank: 1, shape: "circle", cvss: "0.1–3.9" },
  info: { label: "Info", tone: "neutral", rank: 0, shape: "dash", cvss: "0" },
};

/** Normalise the many spellings products and agents send. */
export function toLogLevel(input: string | number): LogLevel {
  if (typeof input === "number") {
    // syslog numeric severity 0 (emerg) … 7 (debug)
    if (input <= 2) return "fatal";
    if (input === 3) return "error";
    if (input === 4) return "warn";
    if (input <= 6) return "info";
    return "debug";
  }
  const v = input.trim().toLowerCase();
  if (["fatal", "panic", "emerg", "emergency", "alert", "crit", "critical"].includes(v)) return "fatal";
  if (["error", "err", "e"].includes(v)) return "error";
  if (["warn", "warning", "w"].includes(v)) return "warn";
  if (["debug", "dbg", "d"].includes(v)) return "debug";
  if (["trace", "verbose", "t"].includes(v)) return "trace";
  return "info";
}

/** CVSS base score (or a word) to a Severity. */
export function toSeverity(input: string | number): Severity {
  if (typeof input === "number") {
    if (input >= 9) return "critical";
    if (input >= 7) return "high";
    if (input >= 4) return "medium";
    if (input > 0) return "low";
    return "info";
  }
  const v = input.trim().toLowerCase();
  if (v.startsWith("crit")) return "critical";
  if (v === "high" || v === "error") return "high";
  if (v.startsWith("med") || v === "moderate" || v === "warning") return "medium";
  if (v === "low") return "low";
  return "info";
}

export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_META[b].rank - SEVERITY_META[a].rank;
}

/** Tailwind classes per tone: soft background badge, solid badge, foreground. */
export const TONE_CLASSES: Record<Tone, { soft: string; solid: string; text: string; dot: string; border: string }> = {
  neutral: { soft: "bg-subtle text-fg-muted", solid: "bg-fg-muted text-surface", text: "text-fg-muted", dot: "bg-fg-subtle", border: "border-line" },
  info: {
    soft: "bg-accent-soft text-accent-text",
    solid: "bg-accent text-accent-contrast",
    text: "text-accent-text",
    dot: "bg-accent",
    border: "border-accent/30",
  },
  success: { soft: "bg-success-soft text-success", solid: "bg-success text-white", text: "text-success", dot: "bg-success", border: "border-success/30" },
  warning: {
    soft: "bg-warning-soft text-warning-text",
    solid: "bg-warning text-white",
    text: "text-warning-text",
    dot: "bg-warning",
    border: "border-warning/35",
  },
  danger: { soft: "bg-danger-soft text-danger-text", solid: "bg-danger text-white", text: "text-danger-text", dot: "bg-danger", border: "border-danger/30" },
  critical: { soft: "bg-critical text-white", solid: "bg-critical text-white", text: "text-critical", dot: "bg-critical", border: "border-critical" },
};

/** CSS colour per tone for chart marks (status colours are reserved for state). */
export const TONE_COLORS: Record<Tone, string> = {
  neutral: "var(--oa-fg-subtle)",
  info: "var(--oa-accent)",
  success: "var(--oa-success)",
  warning: "var(--oa-warning)",
  danger: "var(--oa-danger)",
  critical: "var(--oa-critical)",
};
