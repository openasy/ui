import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../lib/cn";

export interface PanelProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  title?: ReactNode;
  description?: ReactNode;
  /** Right side of the header: legend, menu, link. */
  actions?: ReactNode;
  /** Remove body padding, for tables that run edge to edge. */
  flush?: boolean;
  footer?: ReactNode;
}

/** The card every chart, table and list sits in. */
export function Panel({ title, description, actions, flush, footer, className, children, ...rest }: PanelProps) {
  const hasHeader = title || description || actions;
  return (
    <section className={cn("flex min-w-0 flex-col rounded-lg border border-line bg-surface", className)} {...rest}>
      {hasHeader && (
        <header className={cn("flex flex-wrap items-center gap-2 px-3 pt-2.5", flush ? "pb-2.5" : "pb-1")}>
          <div className="flex min-w-0 grow flex-col">
            {title && <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>}
            {description && <p className="text-xs text-fg-muted">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
        </header>
      )}
      <div className={cn("min-w-0 grow", !flush && "px-3 pb-3", flush && hasHeader && "border-t border-line")}>{children}</div>
      {footer && <footer className="border-t border-line px-3 py-2 text-xs text-fg-muted">{footer}</footer>}
    </section>
  );
}
