import { useId, useState, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Info } from "lucide-react";
import { cn } from "../lib/cn";
import { useT } from "./Locale";

export interface InfoTipProps {
  /** What the tooltip explains, e.g. a column or a metric. */
  content: ReactNode;
  /** Accessible name of the trigger. */
  label?: string;
  className?: string;
}

/**
 * Small info icon that explains something on hover or keyboard focus.
 * Rendered in a portal, so it is never clipped by scrolling tables.
 */
export function InfoTip({ content, label, className }: InfoTipProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={label ?? t("common.moreInformation")}
        aria-describedby={open ? id : undefined}
        onPointerEnter={() => setOpen(true)}
        onPointerLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(e) => e.stopPropagation()}
        className={cn("inline-grid size-4 shrink-0 place-items-center rounded-full text-fg-muted hover:text-fg", className)}
      >
        <Info aria-hidden className="size-3" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          id={id}
          role="tooltip"
          side="top"
          sideOffset={6}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="oa-root z-50 max-w-64 rounded-md bg-fg px-2 py-1.5 text-xs font-normal tracking-normal text-surface normal-case shadow-overlay"
        >
          {content}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
