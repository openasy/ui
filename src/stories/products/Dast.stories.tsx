import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Bug, CalendarClock, Crosshair, KeyRound, Pause, Radar, Square } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { SEVERITY_META, type Severity } from "../../tokens/levels";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "scans", label: "Scans", icon: Radar, count: 12 },
  { id: "targets", label: "Targets", icon: Crosshair, count: 5 },
  { id: "findings", label: "Findings", icon: Bug, count: 27 },
  { id: "auth", label: "Auth profiles", icon: KeyRound, count: 3 },
  { id: "schedules", label: "Schedules", icon: CalendarClock },
];

const meta = {
  title: "Products/DAST",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Finding {
  id: string;
  severity: Severity;
  title: string;
  url: string;
  param?: string;
  engine: "ZAP" | "Nuclei";
  rule: string;
  confirmed: boolean;
  request: string;
  response: string;
}

const findings: Finding[] = [
  {
    id: "d1",
    severity: "critical",
    title: "SQL injection",
    url: "/v1/orders?q=",
    param: "q",
    engine: "ZAP",
    rule: "40018 SQL Injection (boolean based)",
    confirmed: true,
    request: "GET /v1/orders?q=x%27%20AND%20%271%27%3D%271 HTTP/1.1\nHost: staging.example.com\nAuthorization: Bearer eyJhbGciOi…redacted\nUser-Agent: OpenAsy-DAST/1.4 (ZAP 2.15)",
    response: "HTTP/1.1 200 OK\nContent-Type: application/json\nContent-Length: 48211\n\n{\"items\":[{\"id\":\"ord_9f2c\",\"total\":129.90}, … 412 rows]}\n\n# q=x' AND '1'='2 returned 0 rows: boolean condition controls result",
  },
  {
    id: "d2",
    severity: "high",
    title: "Reflected cross-site scripting",
    url: "/search",
    param: "term",
    engine: "ZAP",
    rule: "40012 Cross Site Scripting (Reflected)",
    confirmed: true,
    request: "GET /search?term=%3Cscript%3Ealert(1)%3C%2Fscript%3E HTTP/1.1\nHost: staging.example.com",
    response: "HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\n\n<h2>Results for <script>alert(1)</script></h2>",
  },
  {
    id: "d3",
    severity: "medium",
    title: "Open redirect",
    url: "/login?next=",
    param: "next",
    engine: "Nuclei",
    rule: "generic-open-redirect",
    confirmed: true,
    request: "GET /login?next=https://example.net/ HTTP/1.1\nHost: staging.example.com",
    response: "HTTP/1.1 302 Found\nLocation: https://example.net/",
  },
  {
    id: "d4",
    severity: "medium",
    title: "TLS 1.0 enabled",
    url: "staging.example.com:443",
    engine: "Nuclei",
    rule: "deprecated-tls",
    confirmed: false,
    request: "ClientHello version=TLS1.0 cipher=TLS_RSA_WITH_AES_128_CBC_SHA",
    response: "ServerHello version=TLS1.0 cipher=TLS_RSA_WITH_AES_128_CBC_SHA",
  },
  {
    id: "d5",
    severity: "low",
    title: "Missing Content-Security-Policy header",
    url: "/",
    engine: "ZAP",
    rule: "10038 Content Security Policy (CSP) Header Not Set",
    confirmed: false,
    request: "GET / HTTP/1.1\nHost: staging.example.com",
    response: "HTTP/1.1 200 OK\nContent-Type: text/html; charset=utf-8\nX-Frame-Options: DENY\nStrict-Transport-Security: max-age=31536000",
  },
];

const columns: Column<Finding>[] = [
  { id: "sev", header: "Severity", width: "100px", sortValue: (f) => SEVERITY_META[f.severity].rank, cell: (f) => <SeverityBadge severity={f.severity} /> },
  {
    id: "title",
    header: "Finding",
    width: "34%",
    cell: (f) => (
      <span className="flex min-w-0 flex-col">
        {/* Click bubbles to the row handler; the button makes it keyboard reachable. */}
        <button type="button" className="self-start truncate text-left font-medium text-fg hover:underline">
          {f.title}
        </button>
        <span className="truncate font-mono text-2xs text-fg-muted">{f.rule}</span>
      </span>
    ),
  },
  { id: "url", header: "Location", cell: (f) => <EntityChip kind="url" value={f.url} hideKind /> },
  { id: "param", header: "Param", mono: true, cell: (f) => f.param ?? "—" },
  { id: "engine", header: "Engine", cell: (f) => <Badge>{f.engine}</Badge> },
  { id: "state", header: "Status", cell: (f) => (f.confirmed ? <StatusBadge tone="danger">Confirmed</StatusBadge> : <StatusBadge tone="neutral">Detected</StatusBadge>) },
];

const N = 30;
const minutes = timeLabels(N, 1, 14 * 60 + 2);

function Progress({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-xs">
        <span id="scan-progress-label" className="font-medium text-fg">
          {label}
        </span>
        <span className="font-mono text-fg-muted">{value}%</span>
      </div>
      <div
        role="progressbar"
        aria-labelledby="scan-progress-label"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
        aria-valuetext={`${value}% · active scan, 14 of 22 rules`}
        className="h-2 overflow-hidden rounded-full bg-subtle"
      >
        <div className="h-full rounded-full bg-accent" style={{ width: `${value}%` }} />
      </div>
      <span className="text-2xs text-fg-muted">Passive scan done · active scan rule 14 of 22 (SQL injection) · about 9 min left</span>
    </div>
  );
}

/** A running scan of staging: progress, throughput, findings and evidence for the selected one. */
export const Scan: Story = {
  render: () => {
    const [open, setOpen] = useState<Finding>(findings[0]!);
    const [paused, setPaused] = useState(false);
    return (
      <ProductFrame product="dast" nav={nav} active="scans">
        <PageHeader
          breadcrumbs={[{ label: "Scans", href: "#scans" }, { label: "#312" }]}
          title="Scan #312 · staging"
          description={
            <span className="flex flex-wrap items-center gap-1.5">
              <EntityChip kind="url" value="https://staging.example.com" href="#target" />
              <span>Full scan · auth profile “staging-user” · started 14:02 by schedule “nightly-staging”</span>
            </span>
          }
          meta={paused ? <StatusBadge tone="warning">Paused</StatusBadge> : <StatusBadge tone="info">Running</StatusBadge>}
          actions={
            <>
              <Button size="md" icon={<Pause />} onClick={() => setPaused((p) => !p)}>
                {paused ? "Resume" : "Pause"}
              </Button>
              <Button size="md" variant="danger" icon={<Square />}>
                Stop scan
              </Button>
            </>
          }
        />
        <Panel>
          <div className="flex flex-col gap-2 pt-2.5">
            <Progress value={64} label="Scan progress" />
            <p className="text-xs text-fg-muted">
              Engines: <span className="font-medium text-fg">OWASP ZAP 2.15</span> (spider, AJAX spider, active scan) +{" "}
              <span className="font-medium text-fg">Nuclei 3.3</span> (1,912 templates: cves, misconfig, exposures). Rate limit 60 req/s.
            </p>
          </div>
        </Panel>
        <KpiGrid minWidth={150}>
          <KpiCard label="URLs crawled" value="1,482" unit="unique" trend={wave(12, { base: 900, amp: 500, seed: 70 })} />
          <KpiCard label="Requests" value="38k" unit="sent" delta={{ label: "0.4% errors (5xx)" }} />
          <KpiCard label="Critical" value="1" tone="critical" footer={<SeverityBadge severity="critical" />} />
          <KpiCard label="High" value="1" tone="danger" footer={<SeverityBadge severity="high" />} />
          <KpiCard label="Medium · low" value="3" footer={<span className="flex gap-1"><SeverityBadge severity="medium" /><SeverityBadge severity="low" /></span>} />
        </KpiGrid>
        <Panel title="Requests per second" description="During this scan, by engine">
          <TimeSeriesChart
            label="DAST requests per second during the scan"
            labels={minutes}
            stacked
            height={150}
            xTicks={6}
            format={(v) => `${Math.round(v)}/s`}
            threshold={{ value: 60, label: "Rate limit" }}
            series={[
              { id: "zap", name: "ZAP", data: wave(N, { base: 30, amp: 12, seed: 71 }) },
              { id: "nuclei", name: "Nuclei", data: wave(N, { base: 12, amp: 8, seed: 72, phase: 2 }) },
            ]}
          />
        </Panel>
        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(340px,2fr)]">
          <Panel title="Findings" description="5 so far · 3 confirmed with a working payload" flush>
            <DataTable
              label="DAST findings"
              columns={columns}
              rows={findings}
              getRowId={(f) => f.id}
              onRowClick={setOpen}
              activeRowId={open.id}
              defaultSort={{ id: "sev", direction: "desc" }}
              minWidth={760}
            />
          </Panel>
          <Panel
            aria-label="Evidence"
            title={
              <span className="flex items-center gap-1.5">
                <SeverityBadge severity={open.severity} compact role="img" />
                Evidence · {open.title}
              </span>
            }
            description={
              <span className="font-mono">
                {open.engine} · {open.url}
              </span>
            }
            footer={
              <span className="flex flex-wrap gap-1.5">
                <Button size="sm" variant="primary">
                  Create issue
                </Button>
                <Button size="sm">Retest</Button>
                <Button size="sm" variant="ghost">
                  Copy as curl
                </Button>
              </span>
            }
          >
            <div className="flex flex-col gap-2">
              {open.id === "d1" && (
                <Callout tone="info" title="Also found by SAST">
                  CWE-89 in internal/orders/search.go:42 on PR #482.
                </Callout>
              )}
              {(["Request", "Response"] as const).map((k) => (
                <div key={k} className="flex flex-col gap-1">
                  <span className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{k}</span>
                  <pre
                    role="region"
                    aria-label={`${k} for ${open.title}`}
                    tabIndex={0}
                    className="m-0 max-h-48 overflow-auto rounded-md border border-line bg-subtle px-2.5 py-2 font-mono text-xs whitespace-pre-wrap text-fg"
                  >
                    {k === "Request" ? open.request : open.response}
                  </pre>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Scan #312 · staging" })).toBeInTheDocument();
    const bar = c.getByRole("progressbar", { name: "Scan progress" });
    await expect(bar).toHaveAttribute("aria-valuenow", "64");

    const evidence = () => within(c.getByRole("region", { name: "Evidence" }));
    await expect(evidence().getByText(/x%27%20AND/)).toBeInTheDocument();

    const table = within(c.getByRole("table", { name: "DAST findings" }));
    await userEvent.click(table.getByRole("button", { name: "Open redirect" }));
    await expect(evidence().getByRole("heading", { name: /Open redirect/ })).toBeInTheDocument();
    await expect(evidence().getByText(/Location: https:\/\/example.net\//)).toBeInTheDocument();
    await expect(evidence().queryByText("Also found by SAST")).not.toBeInTheDocument();

    await userEvent.click(c.getByRole("button", { name: "Pause" }));
    await expect(c.getByText("Paused")).toBeInTheDocument();
  },
};
