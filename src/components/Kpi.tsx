import type { ReactNode } from "react";
import { ArrowDown, ArrowUp, Minus, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import { Sparkline } from "../charts/Sparkline";
import { TONE_CLASSES, type Tone } from "../tokens/levels";
import { useT } from "./Locale";

export interface KpiDelta {
  /** Display text, e.g. "+12 vs. yesterday". */
  label: ReactNode;
  direction?: "up" | "down" | "flat";
  /** Whether the change is good news. Colours the delta, not the value. */
  intent?: "good" | "bad" | "neutral";
}

export interface KpiCardProps {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  /** Small icon beside the label, tinted with the tone. */
  icon?: LucideIcon;
  delta?: KpiDelta;
  /** Tints the value for states like "9 failed sign-ins". */
  tone?: Tone;
  /** Small trend under the value. */
  trend?: number[];
  /** Pin the trend chart's colour, e.g. to a status tone. */
  trendColor?: string;
  /** Extra content under the value, e.g. a badge. */
  footer?: ReactNode;
  href?: string;
  className?: string;
}

const intentClass = { good: "text-success", bad: "text-danger-text", neutral: "text-fg-muted" } as const;

/** A headline number. Use KpiGrid to lay several out. */
export function KpiCard({ label, value, unit, icon: Icon, delta, tone, trend, trendColor, footer, href, className }: KpiCardProps) {
  const t = useT();
  const DirIcon = delta?.direction === "up" ? ArrowUp : delta?.direction === "down" ? ArrowDown : Minus;
  const body = (
    <>
      <span className="flex items-center justify-between gap-2">
        <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{label}</span>
        {Icon && <Icon aria-hidden className={cn("size-3.5 shrink-0", tone && tone !== "neutral" ? TONE_CLASSES[tone].text : "text-fg-subtle")} />}
      </span>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-2xl leading-8 font-semibold tabular-nums", tone && tone !== "neutral" ? TONE_CLASSES[tone].text : "text-fg")}>{value}</span>
        {unit && <span className="text-xs text-fg-muted">{unit}</span>}
      </div>
      {trend && trend.length > 1 && (
        <Sparkline data={trend} height={28} color={trendColor} label={typeof label === "string" ? t("common.labelTrend", { label }) : t("common.trend")} />
      )}
      {delta && (
        <span className={cn("flex items-center gap-1 text-xs", intentClass[delta.intent ?? "neutral"])}>
          {delta.direction && <DirIcon aria-hidden className="size-3" />}
          {delta.label}
        </span>
      )}
      {footer}
    </>
  );
  const cls = cn("flex min-w-0 flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2.5", className);
  return href ? (
    <a href={href} className={cn(cls, "text-fg no-underline hover:border-line-strong")}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export interface KpiGridProps {
  children: ReactNode;
  /** Minimum card width before wrapping. */
  minWidth?: number;
  className?: string;
}

export function KpiGrid({ children, minWidth = 180, className }: KpiGridProps) {
  return (
    <div className={cn("grid gap-2.5", className)} style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${minWidth}px, 1fr))` }}>
      {children}
    </div>
  );
}

export interface OverviewGridProps {
  children: ReactNode;
  /** main-side: two thirds and one third; halves: two equal columns; thirds: three. */
  layout?: "main-side" | "halves" | "thirds";
  className?: string;
}

/** Panels side by side on an overview, one under another on narrow screens. */
export function OverviewGrid({ children, layout = "main-side", className }: OverviewGridProps) {
  const cols = {
    "main-side": "xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]",
    halves: "lg:grid-cols-2",
    thirds: "lg:grid-cols-3",
  }[layout];
  return <div className={cn("grid gap-2.5", cols, className)}>{children}</div>;
}
