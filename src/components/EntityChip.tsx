import type { MouseEventHandler } from "react";
import { Box, Bug, Code, Cpu, Globe, Link as LinkIcon, Server, User, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";

export type EntityKind = "host" | "container" | "user" | "ip" | "cve" | "repo" | "process" | "url";

const ICONS: Record<EntityKind, LucideIcon> = {
  host: Server,
  container: Box,
  user: User,
  ip: Globe,
  cve: Bug,
  repo: Code,
  process: Cpu,
  url: LinkIcon,
};

export interface EntityChipProps {
  kind: EntityKind;
  value: string;
  href?: string;
  onClick?: MouseEventHandler<HTMLElement>;
  /** Hide the kind prefix when the column already says it. */
  hideKind?: boolean;
  className?: string;
}

/**
 * A host, user, IP or CVE that can be followed into any other product.
 * The same entity looks the same everywhere.
 */
export function EntityChip({ kind, value, href, onClick, hideKind, className }: EntityChipProps) {
  const Icon = ICONS[kind];
  const cls = cn(
    "inline-flex h-5 max-w-full items-center gap-1 rounded border border-line bg-surface px-1.5 font-mono text-xs text-fg no-underline",
    (href || onClick) && "hover:border-line-strong hover:bg-subtle",
    className,
  );
  const content = (
    <>
      <Icon aria-hidden className="size-3 shrink-0 text-fg-muted" />
      {!hideKind && <span className="text-fg-muted">{kind}</span>}
      <span className="truncate">{value}</span>
    </>
  );
  if (href) {
    return (
      <a href={href} onClick={onClick} className={cls} data-entity={kind}>
        {content}
      </a>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cls} data-entity={kind}>
        {content}
      </button>
    );
  }
  return (
    <span className={cls} data-entity={kind}>
      {content}
    </span>
  );
}
