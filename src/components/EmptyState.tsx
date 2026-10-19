import type { ReactNode } from "react";
import { cn } from "../lib/cn";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

/** What a list, table or chart shows when there is nothing yet. */
export function EmptyState({ icon, title, children, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2 px-6 py-8 text-center", className)}>
      {icon && <span className="grid size-10 place-items-center rounded-lg bg-subtle text-fg-muted [&_svg]:size-5">{icon}</span>}
      <p className="text-base font-semibold text-fg">{title}</p>
      {children && <p className="max-w-sm text-sm text-fg-muted">{children}</p>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
