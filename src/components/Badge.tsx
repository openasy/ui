import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";
import {
  LOG_LEVEL_META,
  SEVERITY_META,
  TONE_CLASSES,
  type LevelMeta,
  type LogLevel,
  type Severity,
  type Tone,
} from "../tokens/levels";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  /** "soft" tinted background (default) or "solid". */
  variant?: "soft" | "solid" | "outline";
  /** Leading dot, for live status. */
  dot?: boolean;
  /** Rounded pill (status) vs. small radius (tag). */
  pill?: boolean;
  mono?: boolean;
  icon?: ReactNode;
}

export function Badge({ tone = "neutral", variant = "soft", dot, pill, mono, icon, className, children, ...rest }: BadgeProps) {
  const t = TONE_CLASSES[tone];
  return (
    <span
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1.5 px-1.5 text-xs font-medium whitespace-nowrap",
        pill ? "rounded-full px-2" : "rounded",
        variant === "soft" && t.soft,
        variant === "solid" && t.solid,
        variant === "outline" && cn("border bg-surface text-fg", t.border),
        mono && "font-mono font-normal",
        className,
      )}
      {...rest}
    >
      {dot && <span aria-hidden className={cn("size-1.5 rounded-full", t.dot)} />}
      {icon}
      {children}
    </span>
  );
}

/** Shape glyph that keeps level scales readable without colour. */
export function LevelGlyph({ shape, className }: { shape: LevelMeta["shape"]; className?: string }) {
  const paths: Record<LevelMeta["shape"], string> = {
    diamond: "M6 0.5 11.5 6 6 11.5 0.5 6z",
    triangle: "M6 1 11 10H1z",
    square: "M1.5 1.5h9v9h-9z",
    circle: "M6 1.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z",
    dash: "M2.5 5h7v2h-7z",
  };
  return (
    <svg aria-hidden viewBox="0 0 12 12" className={cn("size-2.5 shrink-0", className)} data-shape={shape}>
      <path d={paths[shape]} fill="currentColor" />
    </svg>
  );
}

export interface SeverityBadgeProps extends Omit<BadgeProps, "tone" | "children"> {
  severity: Severity;
  /** Hide the text label (keeps an accessible name). */
  compact?: boolean;
}

/** Standard severity for findings, alerts and signals. */
export function SeverityBadge({ severity, compact, className, ...rest }: SeverityBadgeProps) {
  const meta = SEVERITY_META[severity];
  return (
    <Badge
      tone={meta.tone}
      className={cn("font-semibold", className)}
      role={compact ? "img" : undefined}
      aria-label={compact ? `Severity ${meta.label}` : undefined}
      data-severity={severity}
      {...rest}
    >
      <LevelGlyph shape={meta.shape} />
      {!compact && meta.label}
    </Badge>
  );
}

export interface LevelBadgeProps extends Omit<BadgeProps, "tone" | "children"> {
  level: LogLevel;
}

/** Standard log level: TRACE, DEBUG, INFO, WARN, ERROR, FATAL. */
export function LevelBadge({ level, className, ...rest }: LevelBadgeProps) {
  const meta = LOG_LEVEL_META[level];
  return (
    <Badge tone={meta.tone} mono className={cn("h-[18px] px-1.5 text-2xs font-medium", className)} data-level={level} {...rest}>
      {meta.label}
    </Badge>
  );
}

export interface StatusBadgeProps extends Omit<BadgeProps, "dot" | "pill"> {
  children: ReactNode;
}

/** Live state with a dot: Connected, Firing, Degraded… */
export function StatusBadge(props: StatusBadgeProps) {
  return <Badge dot pill {...props} />;
}
