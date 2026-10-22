import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { ArrowDown, ArrowUp, ArrowUpDown, EllipsisVertical, EyeOff, Pin, PinOff, RotateCcw } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./Button";
import { InfoTip } from "./InfoTip";
import { useT } from "./Locale";

export type SortDirection = "asc" | "desc";
export type PinSide = "left" | "right";

export interface Column<T> {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Makes the column sortable. */
  sortValue?: (row: T) => string | number;
  align?: "left" | "right" | "center";
  /** CSS width of the column, e.g. "120px" or "20%". */
  width?: string;
  /** Monospace cell text (IPs, versions, counts). */
  mono?: boolean;
  className?: string;
  /** Explains the column; shown in a tooltip next to the header. */
  description?: ReactNode;
  /** Plain-text name used in menus when `header` is not a string. */
  label?: string;
  /** Pin the column so it stays visible while scrolling sideways. */
  pinned?: PinSide;
  /** Smallest width when resizing, in px. */
  minWidth?: number;
  /** Allow resizing this column (default: the table's `resizable`). */
  resizable?: boolean;
  /** Allow hiding this column from its menu (default true). */
  hideable?: boolean;
}

export interface DataTableProps<T> {
  /** Accessible name of the table. */
  label: string;
  columns: Column<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onRowClick?: (row: T) => void;
  /** Highlights a row, e.g. the one open in a side panel. */
  activeRowId?: string;
  defaultSort?: { id: string; direction: SortDirection };
  /** Client-side pagination. Omit to show every row. */
  pageSize?: number;
  loading?: boolean;
  empty?: ReactNode;
  /** Below this width the table scrolls horizontally inside its box. */
  minWidth?: number;
  density?: "compact" | "comfortable";
  /** Drag column edges to resize (default true). */
  resizable?: boolean;
  /** Per-column menu: sort, pin, hide, reset width (default true). */
  columnMenu?: boolean;
  /** Keep the header visible while the body scrolls; needs `maxHeight`. */
  stickyHeader?: boolean;
  maxHeight?: number;
  /** Remember widths, pins and hidden columns in localStorage under this key. */
  persistKey?: string;
  className?: string;
}

interface Layout {
  widths: Record<string, number>;
  pins: Record<string, PinSide | null>;
  hidden: string[];
}

const SELECT_W = 36;
const DEFAULT_MIN = 64;

function loadLayout(key?: string): Partial<Layout> {
  if (!key) return {};
  try {
    const raw = globalThis.localStorage?.getItem(`oa-table:${key}`);
    return raw ? (JSON.parse(raw) as Partial<Layout>) : {};
  } catch {
    return {};
  }
}

function saveLayout(key: string | undefined, layout: Layout) {
  if (!key) return;
  try {
    globalThis.localStorage?.setItem(`oa-table:${key}`, JSON.stringify(layout));
  } catch {
    /* storage unavailable: the layout simply isn't remembered */
  }
}

const labelOf = <T,>(c: Column<T>) => c.label ?? (typeof c.header === "string" ? c.header : c.id);

/**
 * The table every product list uses: sorting, selection, pagination, empty
 * and loading states, header tooltips, resizable, pinnable and hideable columns.
 */
export function DataTable<T>({
  label,
  columns,
  rows,
  getRowId,
  selectable,
  selectedIds,
  onSelectionChange,
  onRowClick,
  activeRowId,
  defaultSort,
  pageSize,
  loading,
  empty,
  minWidth = 640,
  density = "compact",
  resizable = true,
  columnMenu = true,
  stickyHeader,
  maxHeight,
  persistKey,
  className,
}: DataTableProps<T>) {
  const t = useT();
  const uid = useId();
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const [internalSel, setInternalSel] = useState<string[]>([]);
  const [layout, setLayout] = useState<Layout>(() => {
    const saved = loadLayout(persistKey);
    return { widths: saved.widths ?? {}, pins: saved.pins ?? {}, hidden: saved.hidden ?? [] };
  });
  const thRefs = useRef<Record<string, HTMLTableCellElement | null>>({});
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [edges, setEdges] = useState({ left: false, right: false });
  const updateEdges = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setEdges((e) => (e.left === left && e.right === right ? e : { left, right }));
  }, []);
  // Show a soft shadow on the side that can still scroll, so wide tables don't look cut off.
  useEffect(() => {
    updateEdges();
    const el = scrollRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(updateEdges);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateEdges]);
  const [measured, setMeasured] = useState<Record<string, number>>({});

  useEffect(() => saveLayout(persistKey, layout), [persistKey, layout]);

  const selection = selectedIds ?? internalSel;
  const setSelection = (ids: string[]) => {
    if (!selectedIds) setInternalSel(ids);
    onSelectionChange?.(ids);
  };

  const pinOf = useCallback((c: Column<T>): PinSide | null => (c.id in layout.pins ? (layout.pins[c.id] ?? null) : (c.pinned ?? null)), [layout.pins]);

  const visibleColumns = useMemo(() => {
    const shown = columns.filter((c) => !layout.hidden.includes(c.id));
    return [...shown.filter((c) => pinOf(c) === "left"), ...shown.filter((c) => !pinOf(c)), ...shown.filter((c) => pinOf(c) === "right")];
  }, [columns, layout.hidden, pinOf]);

  const sized = Object.keys(layout.widths).length > 0;
  const anyPinned = visibleColumns.some((c) => pinOf(c));

  // Measure rendered widths so pinned columns know their sticky offsets.
  useLayoutEffect(() => {
    if (!anyPinned) return;
    const next: Record<string, number> = {};
    for (const c of visibleColumns) next[c.id] = thRefs.current[c.id]?.getBoundingClientRect().width ?? 0;
    setMeasured((prev) => (visibleColumns.every((c) => prev[c.id] === next[c.id]) ? prev : next));
  });

  const widthOf = (id: string) => layout.widths[id] ?? measured[id] ?? 0;
  const offsets = { left: {} as Record<string, number>, right: {} as Record<string, number> };
  {
    let acc = selectable ? SELECT_W : 0;
    for (const c of visibleColumns) if (pinOf(c) === "left") (offsets.left[c.id] = acc), (acc += widthOf(c.id));
    acc = 0;
    for (const c of [...visibleColumns].reverse()) if (pinOf(c) === "right") (offsets.right[c.id] = acc), (acc += widthOf(c.id));
  }
  const lastLeft = [...visibleColumns].reverse().find((c) => pinOf(c) === "left")?.id;
  const firstRight = visibleColumns.find((c) => pinOf(c) === "right")?.id;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return rows;
    const get = col.sortValue;
    const dir = sort.direction === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = get(a);
      const vb = get(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [rows, columns, sort]);

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1;
  const safePage = Math.min(page, pageCount - 1);
  const visible = pageSize ? sorted.slice(safePage * pageSize, safePage * pageSize + pageSize) : sorted;
  const visibleIds = visible.map(getRowId);
  const allOnPage = visibleIds.length > 0 && visibleIds.every((id) => selection.includes(id));
  const someOnPage = visibleIds.some((id) => selection.includes(id));

  const toggleSort = (col: Column<T>) => {
    if (!col.sortValue) return;
    setSort((s) => (s?.id === col.id ? { id: col.id, direction: s.direction === "asc" ? "desc" : "asc" } : { id: col.id, direction: "desc" }));
  };

  const renderedWidth = (id: string) => Math.round(thRefs.current[id]?.getBoundingClientRect().width || 120);

  /** First resize freezes every column at its rendered width and switches to a fixed layout. */
  const setWidth = (id: string, width: number) => {
    setLayout((l) => {
      const base = { ...l.widths };
      if (Object.keys(base).length === 0) for (const c of visibleColumns) base[c.id] = renderedWidth(c.id);
      const col = columns.find((c) => c.id === id);
      base[id] = Math.max(col?.minWidth ?? DEFAULT_MIN, Math.round(width));
      return { ...l, widths: base };
    });
  };

  /** Reset puts the whole table back on automatic layout. */
  const resetWidths = () => setLayout((l) => ({ ...l, widths: {} }));

  const startResize = (e: ReactPointerEvent<HTMLElement>, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = layout.widths[id] ?? renderedWidth(id);
    const move = (ev: PointerEvent) => setWidth(id, startW + ev.clientX - startX);
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const keyResize = (e: KeyboardEvent<HTMLElement>, id: string) => {
    const step = e.shiftKey ? 64 : 16;
    const cur = layout.widths[id] ?? renderedWidth(id);
    if (e.key === "ArrowRight") {
      e.preventDefault();
      setWidth(id, cur + step);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      setWidth(id, cur - step);
    } else if (e.key === "Escape" || e.key === "Delete") {
      e.preventDefault();
      resetWidths();
    }
  };

  const setPin = (id: string, side: PinSide | null) => setLayout((l) => ({ ...l, pins: { ...l.pins, [id]: side } }));
  const hide = (id: string) => setLayout((l) => ({ ...l, hidden: [...l.hidden, id] }));
  const showAll = () => setLayout((l) => ({ ...l, hidden: [] }));

  const cellPad = density === "compact" ? "px-2.5 py-1.5" : "px-3 py-2.5";
  const colCount = visibleColumns.length + (selectable ? 1 : 0);
  const totalWidth = sized ? visibleColumns.reduce((a, c) => a + (layout.widths[c.id] ?? 120), selectable ? SELECT_W : 0) : undefined;

  const stickyStyle = (c: Column<T>) => {
    const p = pinOf(c);
    if (p === "left") return { position: "sticky" as const, left: offsets.left[c.id] ?? 0 };
    if (p === "right") return { position: "sticky" as const, right: offsets.right[c.id] ?? 0 };
    return undefined;
  };
  const edge = (c: Column<T>) =>
    c.id === lastLeft ? "shadow-[inset_-1px_0_0_var(--oa-line)]" : c.id === firstRight ? "shadow-[inset_1px_0_0_var(--oa-line)]" : "";

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      {layout.hidden.length > 0 && (
        <div className="flex items-center gap-2 border-b border-line px-2.5 py-1 text-xs text-fg-muted">
          <EyeOff aria-hidden className="size-3.5" />
          {t("table.hidden", { count: layout.hidden.length })}
          <button type="button" onClick={showAll} className="font-medium text-accent-text hover:underline">
            {t("table.showAll")}
          </button>
        </div>
      )}
      {/* relative: keeps absolutely positioned content (e.g. sr-only headers) inside the scroll box. */}
      <div className="relative min-w-0">
      {edges.left && <span aria-hidden data-testid="scroll-shadow-left" className="pointer-events-none absolute inset-y-0 left-0 z-30 w-4 bg-gradient-to-r from-black/10 to-transparent" />}
      {edges.right && <span aria-hidden data-testid="scroll-shadow-right" className="pointer-events-none absolute inset-y-0 right-0 z-30 w-4 bg-gradient-to-l from-black/10 to-transparent" />}
      <div ref={scrollRef} onScroll={updateEdges} className={cn("relative overflow-x-auto", stickyHeader && "overflow-y-auto")} style={stickyHeader && maxHeight ? { maxHeight } : undefined}>
        <table
          aria-label={label}
          aria-busy={loading || undefined}
          className={cn("border-collapse text-sm", sized ? "table-fixed" : "w-full")}
          style={sized ? { width: totalWidth } : { minWidth }}
        >
          <colgroup>
            {selectable && <col style={{ width: SELECT_W }} />}
            {visibleColumns.map((c) => (
              <col key={c.id} style={layout.widths[c.id] ? { width: layout.widths[c.id] } : c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <thead className={cn(stickyHeader && "sticky top-0 z-20")}>
            <tr className="border-b border-line bg-canvas">
              {selectable && (
                <th scope="col" className={cn("bg-canvas px-2.5 py-1.5 text-left", anyPinned && "sticky left-0 z-10")}>
                  <input
                    type="checkbox"
                    aria-label={t("table.selectAll")}
                    checked={allOnPage}
                    ref={(el) => {
                      if (el) el.indeterminate = !allOnPage && someOnPage;
                    }}
                    onChange={() =>
                      setSelection(allOnPage ? selection.filter((id) => !visibleIds.includes(id)) : Array.from(new Set([...selection, ...visibleIds])))
                    }
                    className="size-3.5 accent-[var(--oa-accent)]"
                  />
                </th>
              )}
              {visibleColumns.map((c) => {
                const active = sort?.id === c.id;
                const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined;
                const SortIcon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                const pin = pinOf(c);
                const canResize = c.resizable ?? resizable;
                return (
                  <th
                    key={c.id}
                    ref={(el) => {
                      thRefs.current[c.id] = el;
                    }}
                    scope="col"
                    aria-sort={ariaSort}
                    data-pinned={pin ?? undefined}
                    style={stickyStyle(c)}
                    className={cn(
                      "group/th relative bg-canvas px-2.5 py-1.5 text-2xs font-medium tracking-wider whitespace-nowrap text-fg-muted uppercase",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                      pin && "z-10",
                      edge(c),
                    )}
                  >
                    <span className={cn("inline-flex max-w-full items-center gap-1", c.align === "right" && "flex-row-reverse")}>
                      {c.sortValue ? (
                        <button type="button" onClick={() => toggleSort(c)} className={cn("inline-flex min-w-0 items-center gap-1 uppercase hover:text-fg", active && "text-fg")}>
                          <span id={`${uid}-h-${c.id}`} className="truncate">
                            {c.header}
                          </span>
                          <SortIcon aria-hidden className={cn("size-3 shrink-0", !active && "opacity-50")} />
                        </button>
                      ) : (
                        <span id={`${uid}-h-${c.id}`} className="truncate">
                          {c.header}
                        </span>
                      )}
                      {c.description && <InfoTip content={c.description} label={t("table.about", { column: labelOf(c) })} />}
                      {pin && <Pin aria-hidden className="size-3 shrink-0 text-fg-muted" data-testid={`pinned-${c.id}`} />}
                      {columnMenu && (
                        <ColumnMenu
                          name={labelOf(c)}
                          sortable={!!c.sortValue}
                          pin={pin}
                          hideable={(c.hideable ?? true) && visibleColumns.length > 1}
                          resized={sized}
                          onSort={(direction) => setSort({ id: c.id, direction })}
                          onPin={(side) => setPin(c.id, side)}
                          onHide={() => hide(c.id)}
                          onReset={resetWidths}
                        />
                      )}
                    </span>
                    {canResize && (
                      <span
                        role="separator"
                        aria-orientation="vertical"
                        aria-label={t("table.resize", { column: labelOf(c) })}
                        aria-valuenow={Math.round(widthOf(c.id))}
                        aria-valuemin={c.minWidth ?? DEFAULT_MIN}
                        aria-valuemax={2000}
                        tabIndex={0}
                        onPointerDown={(e) => startResize(e, c.id)}
                        onDoubleClick={resetWidths}
                        onKeyDown={(e) => keyResize(e, c.id)}
                        className="absolute inset-y-0 right-0 z-10 w-2 cursor-col-resize touch-none after:absolute after:inset-y-1 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-line-strong after:opacity-0 group-hover/th:after:opacity-100 hover:after:bg-accent focus-visible:after:bg-accent focus-visible:after:opacity-100"
                        data-testid={`resize-${c.id}`}
                      />
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: Math.min(pageSize ?? 5, 8) }, (_, i) => (
                <tr key={`sk-${i}`} className="border-b border-subtle" data-testid="skeleton-row">
                  {Array.from({ length: colCount }, (_, j) => (
                    <td key={j} className={cellPad}>
                      <span className="block h-3 animate-pulse rounded bg-subtle" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading && visible.length === 0 && (
              <tr>
                <td colSpan={colCount} className="text-center text-sm text-fg-muted">
                  {empty ?? <p className="py-8">{t("table.noResults")}</p>}
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((row) => {
                const id = getRowId(row);
                const selected = selection.includes(id);
                const active = activeRowId === id;
                const rowBg = selected || active ? "bg-accent-soft" : "bg-surface";
                return (
                  <tr
                    key={id}
                    data-row-id={id}
                    aria-selected={selectable ? selected : undefined}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.target !== e.currentTarget) return;
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      "group/row border-b border-subtle last:border-b-0",
                      onRowClick && "cursor-pointer hover:bg-canvas",
                      (selected || active) && "bg-accent-soft hover:bg-accent-soft",
                    )}
                  >
                    {selectable && (
                      <td className={cn(cellPad, anyPinned && cn("sticky left-0 z-[1]", rowBg))} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={t("table.selectRow", { id })}
                          checked={selected}
                          onChange={() => setSelection(selected ? selection.filter((s) => s !== id) : [...selection, id])}
                          className="size-3.5 accent-[var(--oa-accent)]"
                        />
                      </td>
                    )}
                    {visibleColumns.map((c) => {
                      const pin = pinOf(c);
                      return (
                        <td
                          key={c.id}
                          style={stickyStyle(c)}
                          className={cn(
                            cellPad,
                            "align-middle",
                            c.mono && "font-mono text-xs",
                            (c.mono || c.align === "right") && "whitespace-nowrap",
                            c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                            sized && "overflow-hidden text-ellipsis",
                            pin && cn("z-[1]", rowBg, onRowClick && !(selected || active) && "group-hover/row:bg-canvas"),
                            edge(c),
                            c.className,
                          )}
                        >
                          {c.cell(row)}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      </div>
      {pageSize && sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-2.5 py-1.5 text-xs text-fg-muted">
          <span>{t("table.range", { from: safePage * pageSize + 1, to: Math.min(sorted.length, (safePage + 1) * pageSize), total: sorted.length })}</span>
          <div className="flex gap-1">
            <Button size="xs" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              {t("table.previous")}
            </Button>
            <Button size="xs" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              {t("table.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

interface ColumnMenuProps {
  name: string;
  sortable: boolean;
  pin: PinSide | null;
  hideable: boolean;
  resized: boolean;
  onSort: (d: SortDirection) => void;
  onPin: (side: PinSide | null) => void;
  onHide: () => void;
  onReset: () => void;
}

function ColumnMenu({ name, sortable, pin, hideable, resized, onSort, onPin, onHide, onReset }: ColumnMenuProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const act = (fn: () => void) => () => {
    fn();
    setOpen(false);
  };
  const item = "flex h-7 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-normal tracking-normal text-fg normal-case hover:bg-subtle";
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        type="button"
        aria-label={t("table.columnOptions", { column: name })}
        className="inline-grid size-5 shrink-0 place-items-center rounded text-fg-muted opacity-0 group-hover/th:opacity-100 hover:bg-subtle hover:text-fg focus-visible:opacity-100 data-[state=open]:opacity-100"
      >
        <EllipsisVertical aria-hidden className="size-3.5" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={4} className="oa-root z-50 w-48 rounded-lg border border-line bg-surface p-1 shadow-overlay">
          <div role="menu" aria-label={t("table.columnOptions", { column: name })}>
            {sortable && (
              <>
                <button type="button" role="menuitem" className={item} onClick={act(() => onSort("asc"))}>
                  <ArrowUp aria-hidden className="size-3.5 text-fg-muted" /> {t("table.sortAscending")}
                </button>
                <button type="button" role="menuitem" className={item} onClick={act(() => onSort("desc"))}>
                  <ArrowDown aria-hidden className="size-3.5 text-fg-muted" /> {t("table.sortDescending")}
                </button>
                <div role="separator" className="my-1 h-px bg-line" />
              </>
            )}
            {pin !== "left" && (
              <button type="button" role="menuitem" className={item} onClick={act(() => onPin("left"))}>
                <Pin aria-hidden className="size-3.5 text-fg-muted" /> {t("table.pinLeft")}
              </button>
            )}
            {pin !== "right" && (
              <button type="button" role="menuitem" className={item} onClick={act(() => onPin("right"))}>
                <Pin aria-hidden className="size-3.5 text-fg-muted" /> {t("table.pinRight")}
              </button>
            )}
            {pin && (
              <button type="button" role="menuitem" className={item} onClick={act(() => onPin(null))}>
                <PinOff aria-hidden className="size-3.5 text-fg-muted" /> {t("table.unpin")}
              </button>
            )}
            {(hideable || resized) && <div role="separator" className="my-1 h-px bg-line" />}
            {resized && (
              <button type="button" role="menuitem" className={item} onClick={act(onReset)}>
                <RotateCcw aria-hidden className="size-3.5 text-fg-muted" /> {t("table.resetWidths")}
              </button>
            )}
            {hideable && (
              <button type="button" role="menuitem" className={item} onClick={act(onHide)}>
                <EyeOff aria-hidden className="size-3.5 text-fg-muted" /> {t("table.hideColumn")}
              </button>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
