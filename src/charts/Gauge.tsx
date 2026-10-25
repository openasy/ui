import type { ReactNode } from "react";
import { cn } from "../lib/cn";
import { TONE_CLASSES, TONE_COLORS, type Tone } from "../tokens/levels";

export interface GaugeProps {
  label: string;
  value: number;
  max?: number;
  /** The number in the middle; by default the share of max as a percentage. */
  display?: ReactNode;
  /** Under the number, e.g. "41 of 44 people". */
  caption?: ReactNode;
  /** Colours the arc and the number; the product decides what is good. */
  tone?: Tone;
  /** Width in pixels; the height is about half. */
  size?: number;
  className?: string;
}

const R = 40;
const STROKE = 10;
const LEN = Math.PI * R;

/** One ratio on a half ring: uptime, people with a second factor, backups that worked. */
export function Gauge({ label, value, max = 100, display, caption, tone = "info", size = 180, className }: GaugeProps) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const pct = `${Math.round(ratio * 1000) / 10}%`;
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={typeof display === "string" ? display : pct}
      className={cn("mx-auto flex flex-col items-center", className)}
      style={{ width: size }}
    >
      <div className="relative w-full" style={{ aspectRatio: "100 / 56" }}>
        <svg viewBox="0 0 100 56" className="size-full" aria-hidden>
          <path d={`M${50 - R},50 A${R},${R} 0 0 1 ${50 + R},50`} fill="none" stroke="var(--oa-subtle)" strokeWidth={STROKE} strokeLinecap="round" />
          {ratio > 0 && (
            <path
              data-testid="gauge-arc"
              d={`M${50 - R},50 A${R},${R} 0 0 1 ${50 + R},50`}
              fill="none"
              stroke={TONE_COLORS[tone]}
              strokeWidth={STROKE}
              strokeLinecap="round"
              strokeDasharray={`${ratio * LEN} ${LEN}`}
              className="transition-[stroke-dasharray] duration-500"
            />
          )}
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span className={cn("text-2xl leading-7 font-semibold tabular-nums", tone === "neutral" ? "text-fg" : TONE_CLASSES[tone].text)}>
            {display ?? pct}
          </span>
        </div>
      </div>
      {caption && <span className="mt-0.5 text-center text-xs text-fg-muted">{caption}</span>}
    </div>
  );
}
