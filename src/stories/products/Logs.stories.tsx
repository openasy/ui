import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Archive, Bell, Bookmark, ChartLine, ChevronRight, Download, GitBranch, Pause, Play, Radio, Search, Server, Shapes } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, FilterChip, QueryBar, TimeRangePicker } from "../../components/Filters";
import { LevelBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { cn } from "../../lib/cn";
import type { LogLevel } from "../../tokens/levels";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "explorer", label: "Explorer", icon: Search },
  { id: "live", label: "Live tail", icon: Radio },
  { id: "saved", label: "Saved views", icon: Bookmark, count: 14 },
  { id: "patterns", label: "Patterns", icon: Shapes },
  { id: "pipelines", label: "Pipelines", icon: GitBranch, count: 6 },
  { id: "archives", label: "Archives", icon: Archive },
];

const meta = {
  title: "Products/Logs",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/* ------------------------------------------------------------------ data */

interface LogLine {
  id: string;
  ts: string;
  level: LogLevel;
  host: string;
  service: string;
  message: string;
  attrs: Record<string, string>;
}

const TEMPLATES: Array<Omit<LogLine, "id" | "ts" | "attrs"> & { route?: string; status?: string }> = [
  { level: "error", host: "api-prod-03", service: "orders-api", message: "upstream timeout after 5000ms calling payments-svc POST /v2/charge", route: "/v1/orders", status: "504" },
  { level: "error", host: "api-prod-03", service: "orders-api", message: "pq: remaining connection slots are reserved for non-replication superuser connections", route: "/v1/orders/:id", status: "500" },
  { level: "warn", host: "db-prod-01", service: "postgres", message: "connection pool saturated: 50/50 in use, 37 waiting", status: "-" },
  { level: "warn", host: "api-prod-03", service: "orders-api", message: "slow request GET /v1/orders?status=pending took 2841ms", route: "/v1/orders", status: "200" },
  { level: "info", host: "api-prod-01", service: "orders-api", message: "POST /v1/orders 201 in 84ms", route: "/v1/orders", status: "201" },
  { level: "info", host: "worker-prod-04", service: "billing-worker", message: "invoice batch 2026-10-19T14 processed: 1,284 invoices", status: "-" },
  { level: "fatal", host: "api-prod-03", service: "kernel", message: "Out of memory: Killed process 48211 (kworkerd) total-vm:2621440kB", status: "-" },
  { level: "error", host: "edge-fra-02", service: "nginx", message: "connect() failed (111: Connection refused) while connecting to upstream 192.0.2.13:8080", route: "/", status: "502" },
  { level: "info", host: "api-prod-05", service: "orders-api", message: "GET /v1/orders/ord_9f2a 200 in 31ms", route: "/v1/orders/:id", status: "200" },
  { level: "debug", host: "worker-prod-09", service: "billing-worker", message: "retrying job inv_44102 (attempt 2/5) after 800ms", status: "-" },
  { level: "warn", host: "api-prod-03", service: "sshd", message: "Failed password for invalid user admin from 198.51.100.201 port 51422 ssh2", status: "-" },
  { level: "info", host: "edge-fra-02", service: "nginx", message: "203.0.113.24 - - \"GET /healthz HTTP/1.1\" 200 2", route: "/healthz", status: "200" },
];

const lines: LogLine[] = Array.from({ length: 36 }, (_, i) => {
  const t = TEMPLATES[(i * 5 + (i % 3)) % TEMPLATES.length]!;
  const sec = 14 * 3600 - i * 17 - (i % 4) * 3;
  const ts = `${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}.${String((i * 137) % 1000).padStart(3, "0")}`;
  return {
    id: `l${i}`,
    ts: `2026-10-19 ${ts}`,
    level: t.level,
    host: t.host,
    service: t.service,
    message: t.message,
    attrs: {
      trace_id: `4bf92f35${(0x77b34da6 + i * 7919).toString(16)}a3ce929d0e0e4736`,
      span_id: (0x00f067aa0ba902b7 + i * 131).toString(16),
      "host.name": t.host,
      "service.name": t.service,
      "container.id": t.service === "kernel" || t.service === "sshd" ? "–" : `${(0x9c3e1 + i * 4099).toString(16)}d1f07a2`,
      "http.route": t.route ?? "–",
      "http.status_code": t.status ?? "–",
      "deployment.environment": "prod",
      "log.file.path": t.service === "nginx" ? "/var/log/nginx/error.log" : t.service === "kernel" ? "/var/log/kern.log" : "stdout",
    },
  };
});

const N = 30;
const minutes = timeLabels(N, 1);
const errs = wave(N, { base: 3, amp: 2, seed: 21, spike: 38, spikeAt: 18, spikeLen: 5 });
const warns = wave(N, { base: 11, amp: 4, seed: 22, spike: 24, spikeAt: 16, spikeLen: 6 });
const histogram = minutes.map((_, i) => [Math.round(errs[i]!), Math.round(warns[i]!)]);

const count = (key: "level" | "host" | "service", v: string) => lines.filter((l) => l[key] === v).length * 1137;
const uniq = <T,>(xs: T[]) => Array.from(new Set(xs));

/* ------------------------------------------------------------ fragments */

function LogRow({ line, open, onToggle }: { line: LogLine; open: boolean; onToggle: () => void }) {
  const detailId = `log-detail-${line.id}`;
  return (
    <li className={cn("border-b border-subtle last:border-0", open && "bg-canvas")}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={open ? detailId : undefined}
        onClick={onToggle}
        className="grid w-full grid-cols-[14px_96px_52px_110px_110px_minmax(0,1fr)] items-center gap-2 px-3 py-1 text-left hover:bg-canvas"
      >
        <ChevronRight aria-hidden className={cn("size-3.5 text-fg-muted transition-transform", open && "rotate-90")} />
        <span className="font-mono text-2xs text-fg-muted tabular-nums">{line.ts.slice(11)}</span>
        <LevelBadge level={line.level} />
        <span className="truncate font-mono text-xs text-fg-muted">{line.host}</span>
        <span className="truncate font-mono text-xs text-fg-muted">{line.service}</span>
        <span className="truncate font-mono text-xs text-fg">{line.message}</span>
      </button>
      {open && (
        <div id={detailId} role="region" aria-label={`Log details ${line.ts}`} className="grid gap-3 border-t border-subtle px-3 py-2.5 pl-8 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="flex min-w-0 flex-col gap-2">
            <p className="font-mono text-xs break-words text-fg">{line.message}</p>
            <dl className="grid grid-cols-[160px_minmax(0,1fr)] gap-x-3 gap-y-0.5 font-mono text-xs">
              {Object.entries(line.attrs).map(([k, v]) => (
                <div key={k} className="contents">
                  <dt className="text-fg-muted">{k}</dt>
                  <dd className="truncate text-fg">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="flex flex-col gap-1.5">
            <h3 className="text-xs font-semibold text-fg">Open in</h3>
            <EntityChip kind="host" value={line.host} href={`#infrastructure/hosts/${line.host}`} />
            <a href={`#infrastructure/hosts/${line.host}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle">
              <Server aria-hidden className="size-3.5 text-fg-muted" />
              Infrastructure host
            </a>
            <a href={`#metrics/explore?q=http_request_duration_seconds{service="${line.service}"}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle">
              <ChartLine aria-hidden className="size-3.5 text-fg-muted" />
              Metrics latency
            </a>
            <a href={`#alerts/rules/new?from=logs&service=${line.service}`} className="inline-flex h-7 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-2.5 text-xs font-medium text-fg no-underline hover:bg-subtle">
              <Bell aria-hidden className="size-3.5 text-fg-muted" />
              Create alert
            </a>
          </div>
        </div>
      )}
    </li>
  );
}

function LogHeader() {
  return (
    <div aria-hidden className="grid grid-cols-[14px_96px_52px_110px_110px_minmax(0,1fr)] gap-2 border-b border-line bg-canvas px-3 py-1.5 text-2xs font-medium tracking-wider text-fg-muted uppercase">
      <span />
      <span>Time</span>
      <span>Level</span>
      <span>Host</span>
      <span>Service</span>
      <span>Message</span>
    </div>
  );
}

/* --------------------------------------------------------------- stories */

/** Explorer: query, facets, error/warn histogram and expandable log lines that link into other products. */
export const Explorer: Story = {
  render: () => {
    const [draft, setDraft] = useState("env:prod -service:healthcheck");
    const [query, setQuery] = useState(draft);
    const [range, setRange] = useState("1h");
    const [levels, setLevels] = useState<string[]>([]);
    const [hostSel, setHostSel] = useState<string[]>([]);
    const [services, setServices] = useState<string[]>([]);
    const [open, setOpen] = useState<string | null>(null);

    const shown = useMemo(() => {
      const words = query
        .split(/\s+/)
        .filter((w) => w && !w.includes(":"))
        .map((w) => w.toLowerCase());
      return lines.filter(
        (l) =>
          (levels.length === 0 || levels.includes(l.level)) &&
          (hostSel.length === 0 || hostSel.includes(l.host)) &&
          (services.length === 0 || services.includes(l.service)) &&
          words.every((w) => l.message.toLowerCase().includes(w)),
      );
    }, [query, levels, hostSel, services]);

    const anyFilter = levels.length + hostSel.length + services.length > 0;
    return (
      <ProductFrame product="logs" nav={nav} active="explorer">
        <PageHeader
          title="Explorer"
          description="41.2 M lines in the last hour · 12 sources · 30 day retention"
          actions={
            <>
              <Button icon={<Bookmark />}>Save view</Button>
              <Button icon={<Download />}>Export</Button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-1.5">
            <QueryBar value={draft} onChange={setDraft} onSubmit={setQuery} label="Log query" placeholder='service:orders-api level:error "timeout"' />
            <TimeRangePicker value={range} onChange={setRange} />
          </div>
        </PageHeader>
        <FilterBar
          onClear={
            anyFilter
              ? () => {
                  setLevels([]);
                  setHostSel([]);
                  setServices([]);
                }
              : undefined
          }
        >
          <FacetFilter
            label="Level"
            selected={levels}
            onChange={setLevels}
            options={(["fatal", "error", "warn", "info", "debug"] as const).map((l) => ({ value: l, label: <LevelBadge level={l} />, count: count("level", l) }))}
          />
          <FacetFilter label="Host" searchable selected={hostSel} onChange={setHostSel} options={uniq(lines.map((l) => l.host)).map((h) => ({ value: h, count: count("host", h) }))} />
          <FacetFilter label="Service" selected={services} onChange={setServices} options={uniq(lines.map((l) => l.service)).map((s) => ({ value: s, count: count("service", s) }))} />
          {query
            .split(/\s+/)
            .filter((w) => w.includes(":"))
            .map((w) => {
              const neg = w.startsWith("-");
              const [f, v] = w.replace(/^-/, "").split(":");
              return <FilterChip key={w} field={f!} value={v} negate={neg} />;
            })}
        </FilterBar>
        <Callout tone="warning" title="Error rate on orders-api is 9× its 7-day baseline" action={<Button size="sm">Show pattern</Button>}>
          84% of new errors share the pattern “upstream timeout after * calling payments-svc”. Started 13:48 on api-prod-03.
        </Callout>
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
          <Panel title="Errors and warnings per minute" description="Last 30 minutes">
            <StackedBarChart
              label="Errors and warnings per minute"
              categories={minutes}
              segments={[
                { id: "error", name: "Error", color: "var(--oa-danger)" },
                { id: "warn", name: "Warn", color: "var(--oa-warning)" },
              ]}
              values={histogram}
              height={120}
              xTicks={6}
            />
          </Panel>
          <Panel title="Top error hosts">
            <BarList
              label="Hosts with the most errors"
              items={[
                { id: "a3", label: "api-prod-03", value: 1842, href: "#infrastructure/hosts/api-prod-03" },
                { id: "e2", label: "edge-fra-02", value: 412, href: "#infrastructure/hosts/edge-fra-02" },
                { id: "d1", label: "db-prod-01", value: 208, href: "#infrastructure/hosts/db-prod-01" },
                { id: "w4", label: "worker-prod-04", value: 37, href: "#infrastructure/hosts/worker-prod-04" },
              ]}
            />
          </Panel>
        </div>
        <Panel
          title="Log lines"
          description={`${shown.length} of ${lines.length} shown · newest first`}
          actions={<StatusBadge tone="info">Sampled 1:1</StatusBadge>}
          flush
        >
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <LogHeader />
              <ul aria-label="Log lines" className="flex flex-col">
                {shown.map((l) => (
                  <LogRow key={l.id} line={l} open={open === l.id} onToggle={() => setOpen((o) => (o === l.id ? null : l.id))} />
                ))}
              </ul>
              {shown.length === 0 && <p className="px-3 py-8 text-center text-sm text-fg-muted">No log lines match these filters.</p>}
            </div>
          </div>
        </Panel>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await expect(c.getByRole("heading", { level: 1, name: "Explorer" })).toBeInTheDocument();
    await expect(c.getAllByTestId("bar")).toHaveLength(30);

    const list = c.getByRole("list", { name: "Log lines" });
    const total = within(list).getAllByRole("button").length;

    // Level facet narrows to errors only.
    await userEvent.click(c.getByRole("button", { name: /^Level/ }));
    await userEvent.click(await body.findByRole("checkbox", { name: /ERROR/ }));
    await userEvent.keyboard("{Escape}");
    const errorRows = within(list).getAllByRole("button");
    await expect(errorRows.length).toBeLessThan(total);
    for (const row of errorRows) await expect(row.querySelector("[data-level]")).toHaveAttribute("data-level", "error");

    // Expand a line: attributes and cross-product links.
    await userEvent.click(errorRows[0]!);
    await expect(errorRows[0]).toHaveAttribute("aria-expanded", "true");
    const detail = c.getByRole("region", { name: /Log details/ });
    await expect(detail).toHaveTextContent("trace_id");
    await expect(detail).toHaveTextContent("http.route");
    await expect(within(detail).getByRole("link", { name: "Infrastructure host" })).toHaveAttribute("href", expect.stringContaining("#infrastructure/hosts/"));
    await expect(within(detail).getByRole("link", { name: "Create alert" })).toBeInTheDocument();

    // Free text query.
    await userEvent.click(c.getByRole("button", { name: "Clear filters" }));
    const input = c.getByRole("textbox", { name: "Log query" });
    await userEvent.clear(input);
    await userEvent.type(input, "kworkerd{Enter}");
    await expect(within(list).getAllByRole("button").every((b) => b.textContent?.includes("kworkerd"))).toBe(true);
  },
};

const STREAM = lines.slice(0, 12).reverse();

/** Live tail: new lines arrive every second until paused. */
export const LiveTail: Story = {
  render: () => {
    const [paused, setPaused] = useState(false);
    const [tick, setTick] = useState(8);
    useEffect(() => {
      if (paused) return;
      const t = setInterval(() => setTick((n) => n + 1), 1000);
      return () => clearInterval(t);
    }, [paused]);
    const shown = Array.from({ length: tick }, (_, i) => {
      const l = STREAM[i % STREAM.length]!;
      const sec = 14 * 3600 + i * 2;
      return {
        ...l,
        id: `t${i}`,
        ts: `2026-10-19 ${String(Math.floor(sec / 3600)).padStart(2, "0")}:${String(Math.floor((sec % 3600) / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}.${String((i * 211) % 1000).padStart(3, "0")}`,
      };
    })
      .reverse()
      .slice(0, 40);
    return (
      <ProductFrame product="logs" nav={nav} active="live">
        <PageHeader
          title="Live tail"
          description="service:orders-api OR host:api-prod-03"
          meta={paused ? <StatusBadge tone="neutral">Paused</StatusBadge> : <StatusBadge tone="success">Streaming</StatusBadge>}
          actions={
            <Button variant={paused ? "primary" : "secondary"} icon={paused ? <Play /> : <Pause />} aria-pressed={paused} onClick={() => setPaused((p) => !p)}>
              {paused ? "Resume" : "Pause"}
            </Button>
          }
        />
        <Panel title="Stream" description={`${tick} lines received · ~1 line/s after sampling`} flush>
          <LogHeader />
          <ul aria-label="Live log lines" aria-live={paused ? "off" : "polite"} className="flex flex-col">
            {shown.map((l) => (
              <li key={l.id} className="grid grid-cols-[14px_96px_52px_110px_110px_minmax(0,1fr)] items-center gap-2 border-b border-subtle px-3 py-1 last:border-0">
                <span />
                <span className="font-mono text-2xs text-fg-muted tabular-nums">{l.ts.slice(11)}</span>
                <LevelBadge level={l.level} />
                <span className="truncate font-mono text-xs text-fg-muted">{l.host}</span>
                <span className="truncate font-mono text-xs text-fg-muted">{l.service}</span>
                <span className="truncate font-mono text-xs text-fg">{l.message}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Pause" }));
    await expect(c.getByText("Paused")).toBeInTheDocument();
    const list = c.getByRole("list", { name: "Live log lines" });
    const n = within(list).getAllByRole("listitem").length;
    await new Promise((r) => setTimeout(r, 1200));
    await expect(within(list).getAllByRole("listitem")).toHaveLength(n);
    await userEvent.click(c.getByRole("button", { name: "Resume" }));
    await expect(c.getByText("Streaming")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Pause" }));
  },
};
