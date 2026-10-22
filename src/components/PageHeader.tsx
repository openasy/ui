import { Fragment, type ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "../lib/cn";

export interface Crumb {
  label: ReactNode;
  href?: string;
}

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Badges next to the title: status, environment… */
  meta?: ReactNode;
  /** Buttons on the right. */
  actions?: ReactNode;
  /** Tabs or filters that belong to the header. */
  children?: ReactNode;
  className?: string;
}

/** Title row for every page: breadcrumbs, title, meta, actions. */
export function PageHeader({ title, description, breadcrumbs, meta, actions, children, className }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex min-w-0 grow flex-col gap-0.5">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" className="pb-1">
              <ol className="flex flex-wrap items-center gap-1 text-xs text-fg-muted">
                {breadcrumbs.map((c, i) => (
                  <Fragment key={i}>
                    <li>{c.href ? <a href={c.href} className="text-fg-muted no-underline hover:text-fg">{c.label}</a> : c.label}</li>
                    {i < breadcrumbs.length - 1 && (
                      <li aria-hidden>
                        <ChevronRight className="size-3" />
                      </li>
                    )}
                  </Fragment>
                ))}
              </ol>
            </nav>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl leading-7 font-semibold tracking-tight text-fg">{title}</h1>
            {meta}
          </div>
          {description && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-1.5">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
