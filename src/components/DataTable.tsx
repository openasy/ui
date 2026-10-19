import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { cn } from "../lib/cn";
import { Button } from "./Button";

export type SortDirection = "asc" | "desc";

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
  className?: string;
}

/** The table every product list uses: sorting, selection, pagination, empty and loading states. */
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
  className,
}: DataTableProps<T>) {
  const [sort, setSort] = useState(defaultSort ?? null);
  const [page, setPage] = useState(0);
  const [internalSel, setInternalSel] = useState<string[]>([]);
  const selection = selectedIds ?? internalSel;
  const setSelection = (ids: string[]) => {
    if (!selectedIds) setInternalSel(ids);
    onSelectionChange?.(ids);
  };

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

  const cellPad = density === "compact" ? "px-2.5 py-1.5" : "px-3 py-2.5";
  const colCount = columns.length + (selectable ? 1 : 0);

  return (
    <div className={cn("flex min-w-0 flex-col", className)}>
      <div className="overflow-x-auto">
        <table aria-label={label} aria-busy={loading || undefined} className="w-full border-collapse text-sm" style={{ minWidth }}>
          <colgroup>
            {selectable && <col style={{ width: 36 }} />}
            {columns.map((c) => (
              <col key={c.id} style={c.width ? { width: c.width } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr className="border-b border-line bg-canvas">
              {selectable && (
                <th scope="col" className="px-2.5 py-1.5 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
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
              {columns.map((c) => {
                const active = sort?.id === c.id;
                const ariaSort = active ? (sort.direction === "asc" ? "ascending" : "descending") : c.sortValue ? "none" : undefined;
                const SortIcon = !active ? ArrowUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;
                return (
                  <th
                    key={c.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      "px-2.5 py-1.5 text-2xs font-medium tracking-wider whitespace-nowrap text-fg-muted uppercase",
                      c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                    )}
                  >
                    {c.sortValue ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className={cn("inline-flex items-center gap-1 uppercase hover:text-fg", active && "text-fg")}
                      >
                        {c.header}
                        <SortIcon aria-hidden className={cn("size-3", !active && "opacity-50")} />
                      </button>
                    ) : (
                      c.header
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
                  {empty ?? <p className="py-8">No results</p>}
                </td>
              </tr>
            )}
            {!loading &&
              visible.map((row) => {
                const id = getRowId(row);
                const selected = selection.includes(id);
                const active = activeRowId === id;
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
                      "border-b border-subtle last:border-b-0",
                      onRowClick && "cursor-pointer hover:bg-canvas",
                      (selected || active) && "bg-accent-soft hover:bg-accent-soft",
                    )}
                  >
                    {selectable && (
                      <td className={cellPad} onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${id}`}
                          checked={selected}
                          onChange={() => setSelection(selected ? selection.filter((s) => s !== id) : [...selection, id])}
                          className="size-3.5 accent-[var(--oa-accent)]"
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.id}
                        className={cn(
                          cellPad,
                          "align-middle",
                          c.mono && "font-mono text-xs",
                          (c.mono || c.align === "right") && "whitespace-nowrap",
                          c.align === "right" ? "text-right" : c.align === "center" ? "text-center" : "text-left",
                          c.className,
                        )}
                      >
                        {c.cell(row)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {pageSize && sorted.length > pageSize && (
        <div className="flex items-center justify-between border-t border-line px-2.5 py-1.5 text-xs text-fg-muted">
          <span>
            {safePage * pageSize + 1}–{Math.min(sorted.length, (safePage + 1) * pageSize)} of {sorted.length}
          </span>
          <div className="flex gap-1">
            <Button size="xs" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
              Previous
            </Button>
            <Button size="xs" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)}>
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
