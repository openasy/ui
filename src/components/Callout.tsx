import type { ReactNode } from "react";
import { CircleCheck, CircleX, Info, OctagonAlert, TriangleAlert, X } from "lucide-react";
import { cn } from "../lib/cn";
import type { Tone } from "../tokens/levels";
import { useT } from "./Locale";

export type CalloutTone = Exclude<Tone, "neutral">;

export interface CalloutProps {
  tone?: CalloutTone;
  title: ReactNode;
  children?: ReactNode;
  /** Action on the right, usually a link or small button. */
  action?: ReactNode;
  onDismiss?: () => void;
  className?: string;
}

const styles: Record<CalloutTone, { box: string; icon: string; Icon: typeof Info }> = {
  info: { box: "bg-accent-soft border-accent/25", icon: "text-accent", Icon: Info },
  success: { box: "bg-success-soft border-success/25", icon: "text-success", Icon: CircleCheck },
  warning: { box: "bg-warning-soft border-warning/30", icon: "text-warning", Icon: TriangleAlert },
  danger: { box: "bg-danger-soft border-danger/25", icon: "text-danger", Icon: CircleX },
  critical: { box: "bg-danger-soft border-critical", icon: "text-critical", Icon: OctagonAlert },
};

/** Inline message for a whole page or section. Danger and critical are announced. */
export function Callout({ tone = "info", title, children, action, onDismiss, className }: CalloutProps) {
  const t = useT();
  const s = styles[tone];
  const urgent = tone === "danger" || tone === "critical";
  return (
    <div role={urgent ? "alert" : "status"} data-tone={tone} className={cn("flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm", s.box, className)}>
      <s.Icon aria-hidden className={cn("mt-px size-4 shrink-0", s.icon)} />
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <span className="font-semibold text-fg">{title}</span>
        {children && <span className="text-fg-muted">{children}</span>}
      </div>
      {action && <div className="shrink-0 self-center">{action}</div>}
      {onDismiss && (
        <button
          type="button"
          aria-label={t("common.dismiss")}
          onClick={onDismiss}
          className="-m-1 grid size-6 shrink-0 place-items-center rounded text-fg-muted hover:bg-black/5"
        >
          <X aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}
