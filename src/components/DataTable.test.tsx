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
    expect(screen.getByRole("columnheader", { name: /^OS/ })).not.toHaveAttribute("aria-sort");
  });

  it("sorts descending first, then ascending", async () => {
    const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts} getRowId={(h) => h.name} />);
    const cpuHeader = screen.getByRole("columnheader", { name: /CPU/ });
    expect(cpuHeader).toHaveAttribute("aria-sort", "none");
    await user.click(within(cpuHeader).getByRole("button", { name: /^CPU$/ }));
    expect(cpuHeader).toHaveAttribute("aria-sort", "descending");
    expect(bodyRows()[0]).toHaveTextContent("96%");
    await user.click(within(cpuHeader).getByRole("button", { name: /^CPU$/ }));
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

  describe("column tools", () => {
    const described: Column<Host>[] = [
      { ...columns[0]!, description: "Hostname reported by the agent" },
      { ...columns[1]!, minWidth: 80 },
      columns[2]!,
    ];

    it("explains a column in a tooltip on hover and focus", async () => {
      const { user } = renderUI(<DataTable label="Hosts" columns={described} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} />);
      const tip = screen.getByRole("button", { name: "About Host" });
      await user.hover(tip);
      expect(await screen.findByRole("tooltip")).toHaveTextContent("Hostname reported by the agent");
      fireEvent.blur(tip);
      expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
      fireEvent.focus(tip);
      expect(await screen.findByRole("tooltip")).toBeInTheDocument();
      fireEvent.pointerLeave(tip);
      await user.click(tip);
    });

    it("resizes with the keyboard, respects minWidth and resets", async () => {
      const { user } = renderUI(<DataTable label="Hosts" columns={described} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} selectable />);
      const handle = screen.getByRole("separator", { name: "Resize CPU" });
      handle.focus();
      await user.keyboard("{ArrowRight}");
      expect(handle).toHaveAttribute("aria-valuenow", "136");
      expect(screen.getByRole("table")).toHaveClass("table-fixed");
      await user.keyboard("{Shift>}{ArrowLeft}{ArrowLeft}{/Shift}");
      expect(handle).toHaveAttribute("aria-valuenow", "80");
      await user.keyboard("{ArrowLeft}");
      expect(handle).toHaveAttribute("aria-valuenow", "80");
      await user.keyboard("x");
      await user.keyboard("{Escape}");
      expect(screen.getByRole("table")).not.toHaveClass("table-fixed");
      fireEvent.keyDown(handle, { key: "ArrowLeft" });
      expect(screen.getByRole("table")).toHaveClass("table-fixed");
      fireEvent.doubleClick(handle);
      expect(screen.getByRole("table")).not.toHaveClass("table-fixed");
    });

    it("resizes by dragging the column edge", () => {
      renderUI(<DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} />);
      const handle = screen.getByTestId("resize-name");
      fireEvent.pointerDown(handle, { clientX: 100 });
      fireEvent.pointerMove(window, { clientX: 160 });
      fireEvent.pointerUp(window);
      expect(handle).toHaveAttribute("aria-valuenow", "180");
      fireEvent.pointerMove(window, { clientX: 400 });
      expect(handle).toHaveAttribute("aria-valuenow", "180");
    });

    it("pins, unpins and hides columns from the column menu, and shows them again", async () => {
      const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} selectable onRowClick={() => {}} />);
      await user.click(screen.getByRole("button", { name: "OS column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Pin to left" }));
      const headers = screen.getAllByRole("columnheader");
      expect(headers[1]).toHaveAttribute("data-pinned", "left");
      expect(headers[1]!.style.position).toBe("sticky");
      expect(screen.getByTestId("pinned-os")).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "OS column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Pin to right" }));
      expect(screen.getAllByRole("columnheader").at(-1)).toHaveAttribute("data-pinned", "right");

      await user.click(screen.getByRole("button", { name: "OS column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Unpin" }));
      expect(screen.queryByTestId("pinned-os")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "CPU column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Hide column" }));
      expect(screen.queryByRole("columnheader", { name: /CPU/ })).not.toBeInTheDocument();
      expect(screen.getByText("1 hidden")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Show all columns" }));
      expect(screen.getByRole("columnheader", { name: /CPU/ })).toBeInTheDocument();
    });

    it("sorts from the column menu and offers reset after a resize", async () => {
      const { user } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts} getRowId={(h) => h.name} />);
      await user.click(screen.getByRole("button", { name: "CPU column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Sort ascending" }));
      expect(screen.getByRole("columnheader", { name: /CPU/ })).toHaveAttribute("aria-sort", "ascending");
      await user.click(screen.getByRole("button", { name: "CPU column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Sort descending" }));
      expect(screen.getByRole("columnheader", { name: /CPU/ })).toHaveAttribute("aria-sort", "descending");
      screen.getByRole("separator", { name: "Resize CPU" }).focus();
      await user.keyboard("{ArrowRight}");
      await user.click(screen.getByRole("button", { name: "CPU column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Reset column widths" }));
      expect(screen.getByRole("table")).not.toHaveClass("table-fixed");
    });

    it("respects initial pins on both sides and keeps the last column visible", async () => {
      const pinned: Column<Host>[] = [
        { ...columns[0]!, pinned: "left" },
        { ...columns[1]!, hideable: false, resizable: false },
        { ...columns[2]!, pinned: "right", header: <b>OS</b>, label: "Operating system" },
      ];
      const { user } = renderUI(<DataTable label="Hosts" columns={pinned} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} activeRowId="host-01" />);
      const hs = screen.getAllByRole("columnheader");
      expect(hs[0]).toHaveAttribute("data-pinned", "left");
      expect(hs[2]).toHaveAttribute("data-pinned", "right");
      expect(screen.queryByRole("separator", { name: "Resize CPU" })).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "CPU column options" }));
      expect(await screen.findByRole("menu", { name: "CPU column options" })).not.toHaveTextContent("Hide column");
      await user.keyboard("{Escape}");
      await user.click(screen.getByRole("button", { name: "Operating system column options" }));
      await user.click(await screen.findByRole("menuitem", { name: "Hide column" }));
      expect(screen.getByText("1 hidden")).toBeInTheDocument();
    });

    it("never lets the last visible column be hidden", async () => {
      const { user } = renderUI(<DataTable label="One" columns={[columns[2]!]} rows={hosts.slice(0, 1)} getRowId={(h) => h.name} />);
      await user.click(screen.getByRole("button", { name: "OS column options" }));
      expect(await screen.findByRole("menu", { name: "OS column options" })).not.toHaveTextContent("Hide column");
    });

    it("shows scroll shadows on the sides that can still scroll", () => {
      renderUI(<DataTable label="Wide" columns={columns} rows={hosts.slice(0, 2)} getRowId={(h) => h.name} />);
      const box = screen.getByRole("table").parentElement as HTMLDivElement;
      Object.defineProperty(box, "clientWidth", { configurable: true, value: 300 });
      Object.defineProperty(box, "scrollWidth", { configurable: true, value: 900 });
      fireEvent.scroll(box);
      expect(screen.getByTestId("scroll-shadow-right")).toBeInTheDocument();
      expect(screen.queryByTestId("scroll-shadow-left")).not.toBeInTheDocument();
      box.scrollLeft = 600;
      fireEvent.scroll(box);
      expect(screen.getByTestId("scroll-shadow-left")).toBeInTheDocument();
      expect(screen.queryByTestId("scroll-shadow-right")).not.toBeInTheDocument();
      fireEvent.scroll(box);
    });

    it("can turn the menu and resizing off and keep a sticky header", () => {
      renderUI(<DataTable label="Hosts" columns={columns} rows={hosts} getRowId={(h) => h.name} columnMenu={false} resizable={false} stickyHeader maxHeight={200} />);
      expect(screen.queryByRole("button", { name: /column options/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("separator")).not.toBeInTheDocument();
      expect(screen.getByRole("table").parentElement!.style.maxHeight).toBe("200px");
    });

    it("remembers layout under persistKey and survives broken storage", async () => {
      localStorage.setItem("oa-table:hosts", JSON.stringify({ hidden: ["os"] }));
      const { user, unmount } = renderUI(<DataTable label="Hosts" columns={columns} rows={hosts.slice(0, 1)} getRowId={(h) => h.name} persistKey="hosts" />);
      expect(screen.queryByRole("columnheader", { name: /^OS/ })).not.toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Show all columns" }));
      expect(JSON.parse(localStorage.getItem("oa-table:hosts")!).hidden).toEqual([]);
      unmount();

      localStorage.setItem("oa-table:bad", "{not json");
      const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("quota");
      });
      renderUI(<DataTable label="Bad" columns={columns} rows={hosts.slice(0, 1)} getRowId={(h) => h.name} persistKey="bad" />);
      expect(screen.getByRole("table", { name: "Bad" })).toBeInTheDocument();
      spy.mockRestore();
      localStorage.clear();
    });
  });
});
