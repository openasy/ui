import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { FacetFilter, FilterBar, FilterChip, QueryBar, TimeRangePicker } from "../../components/Filters";
import { SearchInput } from "../../components/Controls";

const meta = {
  title: "Filters/FilterBar",
  component: FilterBar,
  parameters: { layout: "padded" },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The standard filter row: date range first, then facets, then applied chips. */
export const Standard: Story = {
  args: { children: null },
  render: () => {
    const [range, setRange] = useState("24h");
    const [levels, setLevels] = useState<string[]>(["error", "warn"]);
    const [hosts, setHosts] = useState<string[]>([]);
    const [chips, setChips] = useState([
      { field: "env", value: "prod" },
      { field: "path", value: '"/healthz"', negate: true },
    ]);
    return (
      <div className="flex flex-col gap-2">
        <FilterBar
          onClear={() => {
            setLevels([]);
            setHosts([]);
            setChips([]);
          }}
        >
          <TimeRangePicker value={range} onChange={setRange} />
          <FacetFilter
            label="Level"
            selected={levels}
            onChange={setLevels}
            options={[
              { value: "fatal", count: 3 },
              { value: "error", count: 812 },
              { value: "warn", count: 392 },
              { value: "info", count: 48_210 },
              { value: "debug", count: 120_400 },
            ]}
          />
          <FacetFilter
            label="Host"
            searchable
            selected={hosts}
            onChange={setHosts}
            options={["api-prod-01", "api-prod-03", "api-prod-05", "worker-prod-04", "db-prod-01"].map((h, i) => ({ value: h, count: 900 - i * 170 }))}
          />
          {chips.map((c) => (
            <FilterChip key={c.field} field={c.field} value={c.value} negate={c.negate} onRemove={() => setChips(chips.filter((x) => x !== c))} />
          ))}
          <SearchInput label="Search" className="ml-auto w-56" shortcut="/" />
        </FilterBar>
        <p className="text-xs text-fg-muted">
          range={range} · level={levels.join(",") || "any"} · host={hosts.join(",") || "any"}
        </p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await userEvent.click(c.getByRole("button", { name: /Time range/ }));
    await userEvent.click(await body.findByRole("button", { name: "Last 7 days" }));
    await expect(c.getByText(/range=7d/)).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Remove filter env" }));
    await expect(c.queryByRole("button", { name: "Remove filter env" })).not.toBeInTheDocument();
  },
};

export const Query: Story = {
  name: "QueryBar",
  args: { children: null },
  render: () => {
    const [q, setQ] = useState('service:orders-api level:(error OR warn) -path:"/healthz"');
    const [ran, setRan] = useState("");
    return (
      <div className="flex flex-col gap-2">
        <QueryBar value={q} onChange={setQ} onSubmit={setRan} />
        <p className="font-mono text-xs text-fg-muted">last run: {ran || "—"}</p>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Run" }));
    await expect(c.getByText(/last run: service:orders-api/)).toBeInTheDocument();
  },
};
