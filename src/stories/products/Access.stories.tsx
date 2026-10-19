import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Check, Database, FileClock, Inbox, MonitorPlay, Plus, ScrollText, ShieldCheck, Square, TerminalSquare, X } from "lucide-react";
import { ProductFrame } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { SearchInput } from "../../components/Controls";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, StatusBadge } from "../../components/Badge";
import { Avatar } from "../../components/Avatar";
import { EntityChip } from "../../components/EntityChip";
import type { Tone } from "../../tokens/levels";
import { emailOf } from "../mocks";

const nav = [
  { id: "requests", label: "Requests", icon: Inbox, count: 3 },
  { id: "sessions", label: "Sessions", icon: TerminalSquare, count: 5 },
  { id: "resources", label: "Resources", icon: Database, count: 48 },
  { id: "recordings", label: "Recordings", icon: MonitorPlay },
  { id: "policies", label: "Policies", icon: ShieldCheck },
  { id: "audit", label: "Audit", icon: ScrollText },
];

const meta = {
  title: "Products/Access",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

type RequestStatus = "pending" | "approved" | "denied";
const REQ_STATUS: Record<RequestStatus, { label: string; tone: Tone }> = {
  pending: { label: "Pending", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  denied: { label: "Denied", tone: "danger" },
};

interface AccessRequest {
  id: string;
  person: string;
  resource: string;
  kind: string;
  role: string;
  duration: string;
  reason: string;
  ticket: string;
  requested: string;
}

const requests: AccessRequest[] = [
  {
    id: "r1",
    person: "Mert Yıldız",
    resource: "db-prod-01",
    kind: "Postgres",
    role: "read-only",
    duration: "1 h",
    reason: "Investigate duplicate orders reported in INC-2291; need to query orders and payments tables.",
    ticket: "INC-2291",
    requested: "4 min ago",
  },
  {
    id: "r2",
    person: "Selin Çelik",
    resource: "api-prod-05",
    kind: "SSH",
    role: "sudo",
    duration: "30 min",
    reason: "Rotate TLS certificate on the nginx sidecar before Friday's expiry.",
    ticket: "OPS-1874",
    requested: "11 min ago",
  },
  {
    id: "r3",
    person: "Can Şahin",
    resource: "win-bastion-02",
    kind: "RDP",
    role: "operator",
    duration: "2 h",
    reason: "Vendor support session for the legacy accounting client upgrade.",
    ticket: "CHG-0412",
    requested: "26 min ago",
  },
];

interface Session {
  id: string;
  protocol: "SSH" | "RDP" | "Postgres";
  person: string;
  resource: string;
  role: string;
  started: string;
  remaining: string;
}

const sessionsData: Session[] = [
  { id: "s1", protocol: "SSH", person: "Deniz Kaya", resource: "api-prod-03", role: "sudo", started: "13:12", remaining: "18 min" },
  { id: "s2", protocol: "Postgres", person: "Elif Arslan", resource: "db-prod-02", role: "read-only", started: "13:31", remaining: "42 min" },
  { id: "s3", protocol: "RDP", person: "Ayşe Demir", resource: "win-bastion-01", role: "operator", started: "12:58", remaining: "1 h 04 min" },
  { id: "s4", protocol: "SSH", person: "Burak Öz", resource: "worker-prod-09", role: "read-only", started: "13:47", remaining: "13 min" },
  { id: "s5", protocol: "Postgres", person: "Zeynep Aydın", resource: "db-analytics-01", role: "analyst", started: "13:05", remaining: "25 min" },
];

function Person({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar name={name} size="sm" />
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{name}</span>
        <span className="truncate text-2xs text-fg-muted">{emailOf(name)}</span>
      </span>
    </span>
  );
}

/** JIT access: approve or deny pending requests and watch or terminate live sessions. */
export const Requests: Story = {
  render: () => {
    const [status, setStatus] = useState<Record<string, RequestStatus>>({});
    const [sessions, setSessions] = useState(sessionsData);
    const pending = requests.filter((r) => (status[r.id] ?? "pending") === "pending").length;
    const decide = (id: string, s: RequestStatus) => setStatus((prev) => ({ ...prev, [id]: s }));

    const sessionColumns: Column<Session>[] = [
      { id: "proto", header: "Protocol", width: "96px", sortValue: (s) => s.protocol, cell: (s) => <Badge mono>{s.protocol}</Badge> },
      { id: "person", header: "Person", width: "24%", sortValue: (s) => s.person, cell: (s) => <Person name={s.person} /> },
      { id: "res", header: "Resource", cell: (s) => <EntityChip kind="host" value={s.resource} hideKind /> },
      { id: "role", header: "Role", mono: true, cell: (s) => s.role },
      { id: "started", header: "Started", mono: true, sortValue: (s) => s.started, cell: (s) => s.started },
      { id: "left", header: "Remaining", align: "right", cell: (s) => <span className="whitespace-nowrap">{s.remaining}</span> },
      { id: "rec", header: "Recording", cell: () => <StatusBadge tone="danger">Recording</StatusBadge> },
      {
        id: "act",
        header: <span className="sr-only">Actions</span>,
        width: "44px",
        align: "right",
        cell: (s) => (
          <IconButton label={`Terminate session for ${s.person} on ${s.resource}`} size="xs" onClick={() => setSessions((all) => all.filter((x) => x.id !== s.id))}>
            <Square />
          </IconButton>
        ),
      },
    ];

    return (
      <ProductFrame product="access" nav={nav} active="requests">
        <PageHeader
          title="Requests"
          description="Just-in-time access to 48 resources · every session is recorded"
          meta={<StatusBadge tone={pending ? "warning" : "success"}>{pending ? `${pending} pending` : "All reviewed"}</StatusBadge>}
          actions={
            <>
              <SearchInput label="Search people or resources" className="w-60" />
              <Button size="md" variant="primary" icon={<Plus />}>
                Request access
              </Button>
            </>
          }
        />
        <KpiGrid>
          <KpiCard label="Pending requests" value={pending} unit="awaiting you" tone={pending ? "warning" : undefined} />
          <KpiCard label="Active sessions" value={sessions.length} unit="now" delta={{ label: "2 SSH · 2 Postgres · 1 RDP" }} />
          <KpiCard label="Median approval" value="3.2" unit="min" delta={{ label: "-40 s vs. last week", direction: "down", intent: "good" }} />
          <KpiCard label="Standing admin" value="0" unit="accounts" tone="success" delta={{ label: "All privileged access is JIT", intent: "good" }} />
        </KpiGrid>
        <Panel title="Pending requests" description="Approver: Platform on-call" flush>
          <ul aria-label="Access requests" className="flex flex-col">
            {requests.map((r) => {
              const s = status[r.id] ?? "pending";
              return (
                <li key={r.id} className="grid grid-cols-1 gap-2 border-b border-subtle px-3 py-2.5 last:border-0 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                  <Person name={r.person} />
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex flex-wrap items-center gap-1.5 text-sm">
                      <EntityChip kind="host" value={r.resource} hideKind />
                      <Badge mono>{r.kind}</Badge>
                      <span className="text-fg-muted">as</span>
                      <Badge mono>{r.role}</Badge>
                      <span className="text-fg-muted">for</span>
                      <span className="font-medium">{r.duration}</span>
                      <span className="text-2xs text-fg-muted">· {r.requested}</span>
                    </span>
                    <span className="text-sm text-fg-muted">
                      <span className="font-mono text-xs text-fg">{r.ticket}</span> {r.reason}
                    </span>
                  </div>
                  <div className="flex items-center justify-end gap-1.5">
                    {s === "pending" ? (
                      <>
                        <Button size="sm" variant="primary" icon={<Check />} aria-label={`Approve ${r.person}`} onClick={() => decide(r.id, "approved")}>
                          Approve
                        </Button>
                        <Button size="sm" icon={<X />} aria-label={`Deny ${r.person}`} onClick={() => decide(r.id, "denied")}>
                          Deny
                        </Button>
                      </>
                    ) : (
                      <StatusBadge tone={REQ_STATUS[s].tone} data-testid={`status-${r.id}`}>
                        {REQ_STATUS[s].label}
                      </StatusBadge>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Callout tone="info" title="Sessions end automatically when the grant expires">
          Recordings are kept for 365 days and are searchable by command in Recordings.
        </Callout>
        <Panel title="Active sessions" actions={<Button size="sm" variant="ghost" icon={<FileClock />}>History</Button>} flush>
          <DataTable
            label="Active sessions"
            columns={sessionColumns}
            rows={sessions}
            getRowId={(s) => s.id}
            defaultSort={{ id: "started", direction: "desc" }}
            minWidth={900}
            empty={<p className="py-8">No active sessions</p>}
          />
        </Panel>
      </ProductFrame>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("3 pending")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Approve Mert Yıldız" }));
    await expect(c.getByTestId("status-r1")).toHaveTextContent("Approved");
    await userEvent.click(c.getByRole("button", { name: "Deny Selin Çelik" }));
    await expect(c.getByTestId("status-r2")).toHaveTextContent("Denied");
    await expect(c.getByText("1 pending")).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Active sessions" });
    await userEvent.click(within(table).getByRole("button", { name: "Terminate session for Burak Öz on worker-prod-09" }));
    await expect(within(table).queryByText("Burak Öz")).not.toBeInTheDocument();
  },
};
