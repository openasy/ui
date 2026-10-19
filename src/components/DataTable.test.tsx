import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, screen, within } from "@testing-library/react";
import { renderUI } from "../test/render";
import { DataTable, type Column } from "./DataTable";

interface Host {
  name: string;
  cpu: number;
  os: string;
}

const hosts: Host[] = Array.from({ length: 12 }, (_, i) => ({ name: `host-${String(i + 1).padStart(2, "0")}`, cpu: (i * 37) % 100, os: i % 2 ? "Debian" : "Ubuntu" }));

const columns: Column<Host>[] = [
  { id: "name", header: "Host", cell: (h) => h.name, sortValue: (h) => h.name, mono: true },
  { id: "cpu", header: "CPU", cell: (h) => `${h.cpu}%`, sortValue: (h) => h.cpu, align: "right", width: "80px" },
  { id: "os", header: "OS", cell: (h) => h.os, align: "center" },
];

const bodyRows = () => within(screen.getAllByRole("rowgroup")[1]!).getAllByRole("row");

describe("DataTable", () => {
  it("renders headers and rows with an accessible name", () => {
    renderUI(<DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 3)} getRowId={(h) => h.name} />);
    const table = screen.getByRole("table", { name: "Hosts" });
    expect(within(table).getAllByRole("columnheader")).toHaveLength(3);
    expect(bodyRows()).toHaveLength(3);
    expect(screen.getByRole("columnheader", { name: "OS" })).not.toHaveAttribute("aria-sort");
  });

  it("sorts descending first, then ascending", async () => {
    const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts} getRowId={(h) => h.name} />);
    const cpuHeader = screen.getByRole("columnheader", { name: /CPU/ });
    expect(cpuHeader).toHaveAttribute("aria-sort", "none");
    await user.click(within(cpuHeader).getByRole("button"));
    expect(cpuHeader).toHaveAttribute("aria-sort", "descending");
    expect(bodyRows()[0]).toHaveTextContent("96%");
    await user.click(within(cpuHeader).getByRole("button"));
    expect(cpuHeader).toHaveAttribute("aria-sort", "ascending");
    expect(bodyRows()[0]).toHaveTextContent("0%");
  });

  it("honours a default sort and keeps order for equal values", () => {
    const rows = [
      { name: "b", cpu: 1, os: "x" },
      { name: "a", cpu: 1, os: "x" },
    ];
    renderUI(<DataTable label="T" columns={columns} rows={rows} getRowId={(h) => h.name} defaultSort={{ id: "cpu", direction: "asc" }} />);
    expect(bodyRows()[0]).toHaveTextContent("b");
  });

  it("ignores a default sort on an unsortable column", () => {
    renderUI(<DataTable label="T" columns={columns} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} defaultSort={{ id: "os", direction: "asc" }} />);
    expect(bodyRows()[0]).toHaveTextContent("host-01");
  });

  it("paginates", async () => {
    const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts} getRowId={(h) => h.name} pageSize={5} />);
    expect(bodyRows()).toHaveLength(5);
    expect(screen.getByText("1–5 of 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Next" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("11–12 of 12")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(screen.getByText("6–10 of 12")).toBeInTheDocument();
  });

  it("selects rows, selects a page and reports selection (uncontrolled)", async () => {
    const onSel = vi.fn();
    const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts} getRowId={(h) => h.name} pageSize={5} selectable onSelectionChange={onSel} />);
    await user.click(screen.getByRole("checkbox", { name: "Select row host-02" }));
    expect(onSel).toHaveBeenLastCalledWith(["host-02"]);
    const all = screen.getByRole("checkbox", { name: "Select all rows on this page" }) as HTMLInputElement;
    expect(all.indeterminate).toBe(true);
    await user.click(all);
    expect(onSel).toHaveBeenLastCalledWith(["host-02", "host-01", "host-03", "host-04", "host-05"]);
    expect(bodyRows()[0]).toHaveAttribute("aria-selected", "true");
    await user.click(all);
    expect(onSel).toHaveBeenLastCalledWith([]);
    await user.click(screen.getByRole("checkbox", { name: "Select row host-01" }));
    await user.click(screen.getByRole("checkbox", { name: "Select row host-01" }));
    expect(onSel).toHaveBeenLastCalledWith([]);
  });

  it("supports controlled selection", async () => {
    function H() {
      const [sel, setSel] = useState<string[]>(["host-01"]);
      return (
        <>
          <span data-testid="count">{sel.length}</span>
          <DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 3)} getRowId={(h) => h.name} selectable selectedIds={sel} onSelectionChange={setSel} />
        </>
      );
    }
    const { user } = renderUI(<H />);
    expect(screen.getByRole("checkbox", { name: "Select row host-01" })).toBeChecked();
    await user.click(screen.getByRole("checkbox", { name: "Select row host-03" }));
    expect(screen.getByTestId("count")).toHaveTextContent("2");
  });

  it("calls onRowClick and highlights the active row", async () => {
    const onRowClick = vi.fn();
    const { user } = renderUI(
      <DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 3)} getRowId={(h) => h.name} onRowClick={onRowClick} activeRowId="host-02" density="comfortable" selectable />,
    );
    await user.click(screen.getByText("host-03"));
    expect(onRowClick).toHaveBeenCalledWith(hosts[2]);
    expect(bodyRows()[1]!.className).toContain("bg-accent-soft");
    await user.click(screen.getByRole("checkbox", { name: "Select row host-01" }));
    expect(onRowClick).toHaveBeenCalledTimes(1);
  });

  it("activates clickable rows from the keyboard", async () => {
    const onRowClick = vi.fn();
    const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} onRowClick={onRowClick} />);
    const row = bodyRows()[1]!;
    expect(row).toHaveAttribute("tabindex", "0");
    row.focus();
    await user.keyboard("{Enter}");
    expect(onRowClick).toHaveBeenLastCalledWith(hosts[1]);
    await user.keyboard(" ");
    expect(onRowClick).toHaveBeenCalledTimes(2);
    await user.keyboard("a");
    expect(onRowClick).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(within(row).getByText("host-02"), { key: "Enter" });
    expect(onRowClick).toHaveBeenCalledTimes(2);
  });

  it("rows without onRowClick are not focusable", () => {
    renderUI(<DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 1)} getRowId={(h) => h.name} />);
    expect(bodyRows()[0]).not.toHaveAttribute("tabindex");
  });

  it("shows skeleton rows while loading", () => {
    renderUI(<DataTable label="Hosts" columns={columns} rows={[]} getRowId={(h) => h.name} loading pageSize={3} />);
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true");
    expect(screen.getAllByTestId("skeleton-row")).toHaveLength(3);
  });

  it("shows the default and a custom empty state", () => {
    const { unmount } = renderUI(<DataTable label="Hosts" columns={columns} rows={[]} getRowId={(h) => h.name} />);
    expect(screen.getByText("No results")).toBeInTheDocument();
    unmount();
    renderUI(<DataTable label="Hosts" columns={columns} rows={[]} getRowId={(h) => h.name} empty={<b>Nothing here</b>} />);
    expect(screen.getByText("Nothing here")).toBeInTheDocument();
  });
});
