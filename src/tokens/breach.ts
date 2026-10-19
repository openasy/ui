import type { ProductId } from "./products";

/** One MITRE ATT&CK stage and the products that can detect activity in it. */
export interface BreachStage {
  id: string;
  name: string;
  tactic: string;
  examples: string;
  detectors: ProductId[];
}

/** One step of an attack: when it happens (minutes from the start), what it is and who would notice. */
export interface BreachStep {
  id: string;
  at: number;
  stage: string;
  technique: string;
  action: string;
  detectors: ProductId[];
  signal: string;
}

/** Every ATT&CK stage needs at least one detector, or a breach can pass through it unseen. */
export const BREACH_STAGES: BreachStage[] = [
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

/** A realistic chain: phished credentials to crypto miner and data theft. */
export const BREACH_SCENARIO: BreachStep[] = [
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
