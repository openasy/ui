import type { FormEvent, ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../lib/cn";
import { IconButton } from "./Button";
import { useT } from "./Locale";

export interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  description?: ReactNode;
  /** Left of the title, such as a check once something was added. */
  icon?: ReactNode;
  /** The circle behind the icon. */
  iconTone?: "neutral" | "success" | "warning";
  /** Buttons at the bottom right; the primary one last. */
  footer?: ReactNode;
  /** With it, the body and footer are one form: Enter and a submit button in the footer send it. */
  onSubmit?: (e: FormEvent<HTMLFormElement>) => void;
  size?: "sm" | "md" | "lg";
  children?: ReactNode;
  className?: string;
}

const WIDTH = { sm: "max-w-sm", md: "max-w-[520px]", lg: "max-w-2xl" } as const;
const TONE = { neutral: "bg-subtle text-fg-muted", success: "bg-success-soft text-success", warning: "bg-warning-soft text-warning-text" } as const;

/**
 * Adding or creating something happens here, over the page, never inside it. Escape and the close button close it;
 * a click outside does not, so a half-filled form is not lost.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  icon,
  iconTone = "neutral",
  footer,
  onSubmit,
  size = "md",
  children,
  className,
}: DialogProps) {
  const t = useT();
  const body = (
    <>
      {children !== undefined && <div className="flex min-h-0 flex-col gap-3 overflow-y-auto px-5 pt-4 pb-5">{children}</div>}
      {footer && <div className="flex flex-wrap justify-end gap-2 rounded-b-xl border-t border-line bg-canvas px-5 py-3">{footer}</div>}
    </>
  );
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="oa-root fixed inset-0 z-50 bg-black/45" />
        <RadixDialog.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          {...(description === undefined && { "aria-describedby": undefined })}
          className={cn(
            "oa-root fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100vh-32px)] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl border border-line bg-surface text-sm text-fg shadow-modal",
            WIDTH[size],
            className,
          )}
        >
          <div className="flex items-start gap-3 px-5 pt-5">
            {icon && <span className={cn("grid size-8 shrink-0 place-items-center rounded-full", TONE[iconTone])}>{icon}</span>}
            <div className="flex min-w-0 grow flex-col gap-1">
              <RadixDialog.Title className="text-base font-semibold">{title}</RadixDialog.Title>
              {description !== undefined && <RadixDialog.Description className="text-fg-muted">{description}</RadixDialog.Description>}
            </div>
            <RadixDialog.Close asChild>
              <IconButton label={t("common.close")} className="-mt-1 -mr-2 shrink-0">
                <X aria-hidden className="size-4" />
              </IconButton>
            </RadixDialog.Close>
          </div>
          {onSubmit ? (
            <form onSubmit={onSubmit} className="flex min-h-0 flex-col">
              {body}
            </form>
          ) : (
            body
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
