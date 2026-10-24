import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { FileText, LogOut, Search, UserRound, type LucideIcon } from "lucide-react";
import { cn } from "../lib/cn";
import type { Severity } from "../tokens/levels";
import { PRODUCTS, type ProductId } from "../tokens/products";
import { SeverityBadge } from "./Badge";
import { useT } from "./Locale";

/** One of the product's own things the search window found, such as a CVE, a host or a rule. */
export interface SearchResult {
  id: string;
  label: string;
  /** A line under the label: where it is, how many, what it belongs to. */
  detail?: string;
  /** What it is, such as "CVE" or "Host", on the right. */
  kind?: string;
  icon?: LucideIcon;
  /** The product's page that shows it, such as /hosts/abc. */
  href: string;
  severity?: Severity;
  /** Shown in the monospace font: identifiers, package names, addresses. */
  mono?: boolean;
}

/** Finds the product's own things for the search window. Called from two characters on; aborted when the text changes. */
export type SearchFn = (query: string, signal: AbortSignal) => Promise<SearchResult[]>;

export interface PaletteEntry {
  id: string;
  label: string;
  detail?: string;
  icon?: LucideIcon;
  run: () => void;
}

interface Row extends PaletteEntry {
  kind?: string;
  severity?: Severity;
  mono?: boolean;
}

/** ⌘K on Apple devices, Ctrl K elsewhere. */
export function shortcutLabel(): string {
  const platform = typeof navigator === "undefined" ? "" : navigator.platform || navigator.userAgent;
  return /Mac|iPhone|iPad/.test(platform) ? "⌘K" : "Ctrl K";
}

/**
 * The search window (Cmd+K or Ctrl+K): the product's pages, the other products and the person's account when empty;
 * typed text filters them and, from two characters, `onSearch` looks through the product's own things.
 */
export function CommandPalette({
  open,
  onOpenChange,
  product,
  pages,
  products,
  account,
  onSearch,
  onOpenResult,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductId;
  pages: PaletteEntry[];
  products: PaletteEntry[];
  account: PaletteEntry[];
  onSearch?: SearchFn;
  onOpenResult: (href: string) => void;
}) {
  const t = useT();
  const id = useId();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<{ query: string; results: SearchResult[] | "failed" } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const name = PRODUCTS[product].name;
  const needle = query.trim().toLowerCase();
  const searchable = !!onSearch && needle.length >= 2;

  useEffect(() => {
    if (!open) {
      setQuery("");
      setFound(null);
    }
  }, [open]);

  // The product's own things, a moment after typing stops; the answer to older text is dropped.
  useEffect(() => {
    if (!searchable) return;
    const ask = new AbortController();
    const wait = setTimeout(() => {
      onSearch(needle, ask.signal).then(
        (results) => !ask.signal.aborted && setFound({ query: needle, results }),
        () => !ask.signal.aborted && setFound({ query: needle, results: "failed" }),
      );
    }, 200);
    return () => {
      clearTimeout(wait);
      ask.abort();
    };
  }, [needle, searchable, onSearch]);

  const results = searchable && found?.query === needle ? found.results : null;
  const searching = searchable && !results;
  const match = (e: PaletteEntry) => !needle || `${e.label} ${e.detail ?? ""}`.toLowerCase().includes(needle);
  const sections = (() => {
    const data: Row[] =
      Array.isArray(results) && searchable
        ? results.map((r) => ({
            id: `result:${r.id}`,
            label: r.label,
            detail: r.detail,
            icon: r.icon,
            kind: r.kind,
            severity: r.severity,
            mono: r.mono,
            run: () => onOpenResult(r.href),
          }))
        : [];
    const groups: Array<{ key: string; title: string; rows: Row[] }> = needle
      ? [
          { key: "data", title: t("search.inProduct", { product: name }), rows: data },
          { key: "pages", title: t("search.pages"), rows: pages.filter(match).map((p) => ({ ...p, kind: t("search.page") })) },
          { key: "products", title: t("search.products"), rows: products.filter(match).map((p) => ({ ...p, kind: t("search.product") })) },
        ]
      : [
          { key: "pages", title: t("search.pages"), rows: pages.map((p) => ({ ...p, kind: t("search.page") })) },
          { key: "products", title: t("search.products"), rows: products.map((p) => ({ ...p, kind: t("search.product") })) },
          { key: "account", title: t("search.account"), rows: account },
        ];
    return groups.filter((g) => g.rows.length > 0);
  })();
  const rows = sections.flatMap((s) => s.rows);
  const current = Math.min(active, Math.max(rows.length - 1, 0));

  useEffect(() => setActive(0), [needle, results]);
  useEffect(() => {
    list.current?.querySelector(`[data-index="${current}"]`)?.scrollIntoView?.({ block: "nearest" });
  }, [current]);

  const choose = (row: Row | undefined) => {
    if (!row) return;
    onOpenChange(false);
    row.run();
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!rows.length) return;
      setActive((current + (e.key === "ArrowDown" ? 1 : rows.length - 1)) % rows.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(rows[current]);
    }
  };

  let index = -1;
  const kbd = "rounded border border-line bg-surface px-1 font-mono text-2xs text-fg-muted";
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="oa-root fixed inset-0 z-50 bg-black/45" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className="oa-root fixed top-[12vh] left-1/2 z-50 flex max-h-[76vh] w-[calc(100vw-2rem)] max-w-[640px] -translate-x-1/2 flex-col overflow-hidden rounded-xl border border-line-strong bg-surface text-fg shadow-overlay"
        >
          <RadixDialog.Title className="sr-only">{t("search.title", { product: name })}</RadixDialog.Title>
          <div className="flex h-14 shrink-0 items-center gap-3 border-b border-line px-4">
            <Search aria-hidden className="size-[18px] shrink-0 text-fg-subtle" />
            <input
              type="text"
              role="combobox"
              aria-expanded
              aria-controls={`${id}-list`}
              aria-activedescendant={rows.length ? `${id}-${current}` : undefined}
              aria-label={t("search.label", { product: name })}
              placeholder={onSearch ? t("search.placeholderWithData", { product: name }) : t("search.placeholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKey}
              autoComplete="off"
              spellCheck={false}
              className="h-10 min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
            />
            <RadixDialog.Close className={cn(kbd, "h-6 cursor-pointer px-1.5")}>Esc</RadixDialog.Close>
          </div>

          <div ref={list} id={`${id}-list`} role="listbox" aria-label={t("search.results")} className="min-h-0 flex-1 overflow-y-auto p-2">
            {sections.map((s) => (
              <div key={s.key} role="group" aria-labelledby={`${id}-${s.key}`} className="pb-1.5">
                <div
                  id={`${id}-${s.key}`}
                  className="flex items-center gap-2 px-2.5 pt-2.5 pb-1.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase"
                >
                  {s.title}
                  {needle && <span className="font-medium tracking-normal normal-case">{s.rows.length}</span>}
                </div>
                {s.rows.map((row) => {
                  index++;
                  const i = index;
                  const on = i === current;
                  const Icon = row.icon ?? FileText;
                  return (
                    <div
                      key={row.id}
                      id={`${id}-${i}`}
                      data-index={i}
                      role="option"
                      aria-selected={on}
                      onMouseMove={() => i !== current && setActive(i)}
                      tabIndex={-1}
                      onClick={() => choose(row)}
                      onKeyDown={(e) => e.key === "Enter" && choose(row)}
                      className={cn("flex min-h-[52px] cursor-pointer items-center gap-3 rounded-lg px-2.5 py-1.5", on && "bg-accent-soft")}
                    >
                      <span
                        aria-hidden
                        className={cn("grid size-8 shrink-0 place-items-center rounded-md", on ? "bg-surface text-accent-text" : "bg-subtle text-fg-muted")}
                      >
                        <Icon className="size-4" />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className={cn("truncate font-medium", row.mono ? "font-mono text-sm" : "text-[15px]")}>{row.label}</span>
                        {row.detail && <span className="truncate text-[13px] text-fg-muted">{row.detail}</span>}
                      </span>
                      {row.severity && <SeverityBadge severity={row.severity} />}
                      <span className="shrink-0 text-xs text-fg-subtle">{on ? "↵" : row.kind}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            {searching && <Note>{t("search.searching", { product: name })}</Note>}
            {searchable && found?.query === needle && found.results === "failed" && <Note>{t("search.failed", { product: name })}</Note>}
            {needle && !searching && rows.length === 0 && (
              <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="text-base font-semibold">{t("search.nothing", { query: query.trim() })}</span>
                <span className="max-w-md text-sm text-fg-muted">{onSearch ? t("search.looksWithData", { product: name }) : t("search.looks")}</span>
              </div>
            )}
          </div>

          <div className="flex h-10 shrink-0 items-center gap-4 border-t border-line bg-subtle px-4 text-xs text-fg-muted">
            <span className="flex items-center gap-1.5">
              <kbd className={kbd}>↑</kbd>
              <kbd className={kbd}>↓</kbd>
              {t("search.move")}
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className={kbd}>↵</kbd>
              {t("search.open")}
            </span>
            <span className="hidden items-center gap-1.5 sm:flex">
              <kbd className={kbd}>Esc</kbd>
              {t("search.close")}
            </span>
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="m-0 px-2.5 py-3 text-sm text-fg-muted">{children}</p>;
}

/** The account entries: where to manage it (a page of the product, or another site) and signing out. */
export function accountEntries(t: ReturnType<typeof useT>, open: (href: string) => void, accountHref?: string, onSignOut?: () => void): PaletteEntry[] {
  return [
    ...(accountHref ? [{ id: "account:manage", label: t("shell.manageAccount"), icon: UserRound, run: () => open(accountHref) }] : []),
    ...(onSignOut ? [{ id: "account:signout", label: t("shell.signOut"), icon: LogOut, run: onSignOut }] : []),
  ];
}
