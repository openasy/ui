import { useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { CircleCheck, CircleX } from "lucide-react";
import { PageHeader } from "../../components/PageHeader";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { Callout } from "../../components/Callout";
import { Checkbox } from "../../components/Controls";
import { Badge, StatusBadge } from "../../components/Badge";
import { Button } from "../../components/Button";
import { DataTable, type Column } from "../../components/DataTable";
import { PRODUCTS, type ProductId } from "../../tokens/products";
import { cn } from "../../lib/cn";

/**
 * Would we catch a breach? Every ATT&CK stage needs at least one detector,
 * detections must reach a person, and Attack Simulation has to keep proving it.
 */
const meta = {
  title: "Platform/Breach coverage",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Stage {
  id: string;
  name: string;
  tactic: string;
  examples: string;
  detectors: ProductId[];
}

const STAGES: Stage[] = [
  { id: "recon", name: "Reconnaissance", tactic: "TA0043", examples: "Scanning, exposed services", detectors: ["attack-surface", "waf", "network-ids", "threat-intel"] },
  { id: "initial", name: "Initial access", tactic: "TA0001", examples: "Phishing, valid accounts, exploited web app", detectors: ["identity", "vpn", "waf", "siem", "awareness", "vulnerabilities"] },
  { id: "exec", name: "Execution", tactic: "TA0002", examples: "Shell in a container, scripts", detectors: ["runtime", "endpoints", "siem"] },
  { id: "persist", name: "Persistence", tactic: "TA0003", examples: "New keys, cron jobs, startup items", detectors: ["runtime", "posture", "siem", "endpoints"] },
  { id: "privesc", name: "Privilege escalation", tactic: "TA0004", examples: "sudo abuse, kernel exploits", detectors: ["runtime", "siem", "vulnerabilities"] },
  { id: "evasion", name: "Defense evasion", tactic: "TA0005", examples: "Log tampering, disabled agents", detectors: ["infrastructure", "logs", "runtime"] },
  { id: "cred", name: "Credential access", tactic: "TA0006", examples: "Dumping, brute force, stolen secrets", detectors: ["identity", "secrets", "deception", "runtime"] },
  { id: "discovery", name: "Discovery", tactic: "TA0007", examples: "Internal scanning, cloud enumeration", detectors: ["network-ids", "deception", "siem"] },
  { id: "lateral", name: "Lateral movement", tactic: "TA0008", examples: "SSH, RDP, database hops", detectors: ["access", "network-ids", "deception", "siem"] },
  { id: "c2", name: "Command and control", tactic: "TA0011", examples: "Beacons, DNS tunnels", detectors: ["network-ids", "threat-intel", "runtime"] },
  { id: "exfil", name: "Exfiltration", tactic: "TA0010", examples: "Bulk uploads, DNS exfiltration", detectors: ["network-ids", "cost", "deception"] },
  { id: "impact", name: "Impact", tactic: "TA0040", examples: "Ransomware, miners, deletion", detectors: ["runtime", "malware", "backups", "metrics"] },
];

interface Step {
  id: string;
  at: number;
  stage: string;
  technique: string;
  action: string;
  detectors: ProductId[];
  signal: string;
}

/** A realistic chain: phished credentials to crypto miner and data theft. */
const SCENARIO: Step[] = [
  { id: "s1", at: 0, stage: "recon", technique: "T1595 Active scanning", action: "Scans api.example.com and finds staging-admin.example.com", detectors: ["attack-surface", "waf"], signal: "New internet-facing host staging-admin.example.com" },
  { id: "s2", at: 26, stage: "initial", technique: "T1566 Phishing", action: "Sends a fake SSO page to 40 staff; Ben Ortiz enters his password", detectors: ["awareness", "identity"], signal: "Credential submitted to look-alike domain sso-example.co" },
  { id: "s3", at: 31, stage: "initial", technique: "T1078 Valid accounts", action: "Signs in to the VPN from 198.51.100.201 after 3 MFA failures", detectors: ["identity", "vpn", "siem"], signal: "Impossible travel + MFA fatigue for ben.ortiz" },
  { id: "s4", at: 38, stage: "discovery", technique: "T1046 Network service discovery", action: "Scans 10.8.0.0/16 for SSH and Postgres", detectors: ["network-ids", "deception"], signal: "Decoy host db-backup-02 contacted" },
  { id: "s5", at: 44, stage: "cred", technique: "T1552 Unsecured credentials", action: "Finds an AWS key in a repo and tries it", detectors: ["secrets", "deception"], signal: "Canary AWS key used from 198.51.100.201" },
  { id: "s6", at: 52, stage: "lateral", technique: "T1021.004 SSH", action: "SSH to api-prod-03 with a reused key", detectors: ["access", "siem", "network-ids"], signal: "SSH without an Access grant" },
  { id: "s7", at: 55, stage: "exec", technique: "T1059.004 Unix shell", action: "Downloads and runs a script in /tmp", detectors: ["runtime", "endpoints"], signal: "Shell spawned curl | sh in orders-api container" },
  { id: "s8", at: 61, stage: "c2", technique: "T1071 Application layer protocol", action: "Beacons to 198.51.100.201:4444 every 30 s", detectors: ["network-ids", "threat-intel", "runtime"], signal: "Outbound to known C2 address" },
  { id: "s9", at: 70, stage: "exfil", technique: "T1048 Exfiltration over DNS", action: "Tunnels 2.3 GB of customer records over DNS", detectors: ["network-ids", "cost"], signal: "DNS tunnel + NAT egress anomaly" },
  { id: "s10", at: 82, stage: "impact", technique: "T1496 Resource hijacking", action: "Starts an XMRig crypto miner", detectors: ["malware", "runtime", "metrics"], signal: "YARA crypto_miner_xmrig, CPU 97%" },
];

const CORE: ProductId[] = ["identity", "vpn", "siem", "logs", "metrics", "alerts", "incidents", "infrastructure", "runtime", "malware", "network-ids", "deception", "secrets", "access", "attack-surface", "waf", "awareness", "threat-intel", "cost", "endpoints", "posture", "vulnerabilities", "backups"];

const OPTIONAL: ProductId[] = ["network-ids", "runtime", "deception", "secrets", "access", "endpoints", "threat-intel", "awareness", "attack-surface", "waf"];

function ProductChip({ id, on = true }: { id: ProductId; on?: boolean }) {
  const P = PRODUCTS[id];
  return (
    <span className={cn("inline-flex h-5 items-center gap-1 rounded border px-1.5 text-xs", on ? "border-line bg-surface text-fg" : "border-dashed border-line-strong bg-canvas text-fg-muted line-through")}>
      <P.icon aria-hidden className="size-3" />
      {P.name}
      {!on && <span className="sr-only"> (not deployed)</span>}
    </span>
  );
}

function strength(deployedCount: number): { tone: "success" | "warning" | "danger"; label: string } {
  if (deployedCount >= 2) return { tone: "success", label: "Covered" };
  if (deployedCount === 1) return { tone: "warning", label: "Single detector" };
  return { tone: "danger", label: "Gap" };
}

const minutes = (m: number) => `T+${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

export const Coverage: Story = {
  render: () => {
    const [deployed, setDeployed] = useState<ProductId[]>(CORE);
    const has = (p: ProductId) => deployed.includes(p);
    const toggle = (p: ProductId) => setDeployed((d) => (d.includes(p) ? d.filter((x) => x !== p) : [...d, p]));

    const steps = useMemo(
      () => SCENARIO.map((s) => ({ ...s, caughtBy: s.detectors.filter(has) })),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [deployed],
    );
    const firstCatch = steps.find((s) => s.caughtBy.length > 0);
    const missed = steps.filter((s) => s.caughtBy.length === 0);
    const stageStats = STAGES.map((st) => ({ ...st, live: st.detectors.filter(has) }));
    const gaps = stageStats.filter((s) => s.live.length === 0);
    const single = stageStats.filter((s) => s.live.length === 1);

    const stepColumns: Column<(typeof steps)[number]>[] = [
      { id: "at", header: "When", width: "72px", mono: true, cell: (s) => minutes(s.at), description: "Minutes since the attacker's first action." },
      { id: "technique", header: "Technique", width: "22%", cell: (s) => <span className="font-mono text-xs">{s.technique}</span>, description: "MITRE ATT&CK technique id." },
      { id: "action", header: "What the attacker did", cell: (s) => s.action },
      {
        id: "caught",
        header: "Caught by",
        width: "24%",
        description: "Products that raise a signal for this step. Crossed out ones would, but are not deployed.",
        cell: (s) => (
          <span className="flex flex-wrap gap-1">
            {s.detectors.map((d) => (
              <ProductChip key={d} id={d} on={has(d)} />
            ))}
          </span>
        ),
      },
      {
        id: "result",
        header: "Result",
        width: "120px",
        cell: (s) =>
          s.caughtBy.length ? (
            <StatusBadge tone="success">Detected</StatusBadge>
          ) : (
            <StatusBadge tone="danger">Missed</StatusBadge>
          ),
      },
    ];

    return (
      <div className="flex min-h-screen flex-col gap-3 bg-canvas px-4 pt-3 pb-6">
        <PageHeader
          breadcrumbs={[{ label: "Platform" }, { label: "Breach coverage" }]}
          title="Would we catch a breach?"
          description="Each attack stage needs at least one detector, ideally two. Turn products off below to see what would be missed."
          meta={gaps.length ? <StatusBadge tone="danger">{gaps.length} uncovered stages</StatusBadge> : <StatusBadge tone="success">Every stage covered</StatusBadge>}
          actions={<Button variant="primary">Run Attack Simulation</Button>}
        />
        <KpiGrid>
          <KpiCard label="ATT&CK stages covered" value={`${STAGES.length - gaps.length}/${STAGES.length}`} tone={gaps.length ? "danger" : "success"} delta={{ label: `${single.length} with a single detector` }} />
          <KpiCard label="Scenario steps detected" value={`${SCENARIO.length - missed.length}/${SCENARIO.length}`} tone={missed.length ? "warning" : "success"} delta={{ label: "phished credentials → miner and data theft" }} />
          <KpiCard
            label="Time to first detection"
            value={firstCatch ? minutes(firstCatch.at) : "Never"}
            tone={!firstCatch ? "critical" : firstCatch.at > 30 ? "warning" : "success"}
            delta={{ label: firstCatch ? `by ${PRODUCTS[firstCatch.caughtBy[0]!].name}` : "the breach goes unnoticed" }}
          />
          <KpiCard label="Last proven by simulation" value="2 h ago" delta={{ label: "189 of 212 techniques detected" }} />
        </KpiGrid>

        {missed.length > 0 && (
          <Callout tone="danger" title={`${missed.length} step${missed.length > 1 ? "s" : ""} of this breach would go unnoticed`}>
            {missed.map((m) => `${m.technique} (needs ${m.detectors.map((d) => PRODUCTS[d].name).join(" or ")})`).join(" · ")}
          </Callout>
        )}

        <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_280px]">
          <Panel title="Attack chain" description="MITRE ATT&CK enterprise tactics, in the order an intrusion usually unfolds">
            <ol className="grid gap-2 [grid-template-columns:repeat(auto-fill,minmax(176px,1fr))]">
              {stageStats.map((st, i) => {
                const s = strength(st.live.length);
                return (
                  <li key={st.id} className={cn("flex flex-col gap-1.5 rounded-lg border p-2.5", s.tone === "danger" ? "border-danger bg-danger-soft" : "border-line bg-surface")} data-stage={st.id}>
                    <span className="flex items-center justify-between gap-2">
                      <span className="font-mono text-2xs text-fg-muted">
                        {String(i + 1).padStart(2, "0")} · {st.tactic}
                      </span>
                      <StatusBadge tone={s.tone}>{s.label}</StatusBadge>
                    </span>
                    <span className="text-sm font-semibold">{st.name}</span>
                    <span className="text-xs text-fg-muted">{st.examples}</span>
                    <span className="flex flex-wrap gap-1">
                      {st.detectors.map((d) => (
                        <ProductChip key={d} id={d} on={has(d)} />
                      ))}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
          <Panel title="Deployed products" description="Untick to see what each one catches">
            <fieldset className="flex flex-col gap-1.5">
              <legend className="sr-only">Deployed detection products</legend>
              {OPTIONAL.map((p) => (
                <Checkbox key={p} label={PRODUCTS[p].name} description={PRODUCTS[p].summary} checked={has(p)} onChange={() => toggle(p)} />
              ))}
            </fieldset>
          </Panel>
        </div>

        <Panel title="Scenario: phished credentials → crypto miner and data theft" description="Ten steps over 82 minutes, replayed weekly by Attack Simulation with safe techniques" flush>
          <DataTable label="Breach scenario steps" columns={stepColumns} rows={steps} getRowId={(s) => s.id} minWidth={980} columnMenu={false} />
        </Panel>

        <Panel title="Detection only counts if someone acts on it" description="Operational requirements checked continuously">
          <ul className="grid gap-2 md:grid-cols-2">
            {[
              { ok: true, text: "Logs are kept 400 days in immutable (WORM) storage, so an attacker cannot erase them", by: "logs" as ProductId },
              { ok: false, text: "47 of 48 hosts report; edge-fra-02 has been silent for 14 minutes", by: "infrastructure" as ProductId },
              { ok: true, text: "Critical signals page on-call within 1 minute, 24/7", by: "alerts" as ProductId },
              { ok: true, text: "Critical signals open an incident and run the containment playbook", by: "automation" as ProductId },
              { ok: true, text: "Attack Simulation replays this chain every week and on every rule change", by: "attack-simulation" as ProductId },
              { ok: false, text: "Clocks drift more than 2 s on 3 hosts, which breaks event correlation", by: "infrastructure" as ProductId },
            ].map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                {r.ok ? <CircleCheck aria-label="Met" role="img" className="mt-px size-4 shrink-0 text-success" /> : <CircleX aria-label="Not met" role="img" className="mt-px size-4 shrink-0 text-danger" />}
                <span className="flex min-w-0 flex-col gap-1">
                  <span>{r.text}</span>
                  <span>
                    <Badge variant="outline">{PRODUCTS[r.by].name}</Badge>
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("Every stage covered")).toBeInTheDocument();
    await expect(c.queryByText(/would go unnoticed/)).not.toBeInTheDocument();
    // Network service discovery is only caught by Network IDS or Deception.
    await userEvent.click(c.getByRole("checkbox", { name: /Network IDS/ }));
    await userEvent.click(c.getByRole("checkbox", { name: /Deception/ }));
    await expect(c.getByRole("alert")).toHaveTextContent(/1 step of this breach would go unnoticed.*T1046/);
    await userEvent.click(c.getByRole("checkbox", { name: /Network IDS/ }));
    await expect(c.queryByText(/would go unnoticed/)).not.toBeInTheDocument();
  },
};
