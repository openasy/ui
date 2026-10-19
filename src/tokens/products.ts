import {
  ArchiveRestore,
  BadgeCheck,
  Bird,
  Biohazard,
  BrickWall,
  Coins,
  Crosshair,
  Database,
  Flame,
  GraduationCap,
  HeartPulse,
  Laptop,
  Network,
  OctagonX,
  PackageCheck,
  Scale,
  Sparkles,
  Swords,
  Target,
  Waypoints,
  Workflow,
  Bell,
  Bug,
  ChartLine,
  ClipboardCheck,
  Code,
  Cpu,
  DoorOpen,
  Fingerprint,
  Globe,
  KeyRound,
  Package,
  Radar,
  ScrollText,
  Server,
  Shield,
  ShieldCheck,
  Siren,
  type LucideIcon,
} from "lucide-react";

export type ProductGroup = "operations" | "security" | "identity" | "platform";

export interface ProductInfo {
  id: ProductId;
  name: string;
  group: ProductGroup;
  icon: LucideIcon;
  /** Docker image published for the product. */
  image: string;
  summary: string;
}

export const PRODUCT_IDS = [
  "vpn",
  "infrastructure",
  "logs",
  "metrics",
  "alerts",
  "siem",
  "vulnerabilities",
  "audit",
  "sast",
  "dast",
  "malware",
  "posture",
  "secrets",
  "runtime",
  "access",
  "compliance",
  "incidents",
  "identity",
  "traces",
  "uptime",
  "errors",
  "certificates",
  "attack-surface",
  "supply-chain",
  "endpoints",
  "automation",
  "threat-intel",
  "network-ids",
  "waf",
  "deception",
  "profiling",
  "database",
  "cost",
  "backups",
  "awareness",
  "risk",
  "attack-simulation",
  "assistant",
] as const;

export type ProductId = (typeof PRODUCT_IDS)[number];

export const PRODUCTS: Record<ProductId, ProductInfo> = {
  vpn: { id: "vpn", name: "VPN", group: "operations", icon: Shield, image: "openasy/vpn", summary: "OpenVPN server and manager with split tunnel and per-group access." },
  infrastructure: { id: "infrastructure", name: "Infrastructure", group: "operations", icon: Server, image: "openasy/infra", summary: "Hosts, containers and Kubernetes: inventory, health and the shared asset list." },
  logs: { id: "logs", name: "Logs", group: "operations", icon: ScrollText, image: "openasy/logs", summary: "Collect, search and keep logs from every host and service." },
  metrics: { id: "metrics", name: "Metrics", group: "operations", icon: ChartLine, image: "openasy/metrics", summary: "Time series, dashboards and PromQL. Grafana can read it as-is." },
  alerts: { id: "alerts", name: "Alerts", group: "operations", icon: Bell, image: "openasy/alerts", summary: "Rules, routing, silences and on-call for any source." },
  siem: { id: "siem", name: "SIEM", group: "security", icon: Radar, image: "openasy/siem", summary: "Sigma detection rules over security events, correlated into signals." },
  vulnerabilities: { id: "vulnerabilities", name: "Vulnerabilities", group: "security", icon: Bug, image: "openasy/vulns", summary: "OS package and container image CVEs, ranked by exploitability." },
  audit: { id: "audit", name: "Audit", group: "security", icon: Package, image: "openasy/audit", summary: "Dependency advisories for npm, pip, Go, Cargo and Composer." },
  sast: { id: "sast", name: "SAST", group: "security", icon: Code, image: "openasy/sast", summary: "Static analysis of source code on every push and pull request." },
  dast: { id: "dast", name: "DAST", group: "security", icon: Globe, image: "openasy/dast", summary: "Scans running web apps and APIs from the outside." },
  malware: { id: "malware", name: "Malware", group: "security", icon: Biohazard, image: "openasy/malware", summary: "ClamAV and YARA scans on hosts, buckets and uploads, with quarantine." },
  posture: { id: "posture", name: "Posture", group: "security", icon: ShieldCheck, image: "openasy/posture", summary: "Cloud, Kubernetes and host misconfiguration against CIS benchmarks." },
  secrets: { id: "secrets", name: "Secrets", group: "security", icon: KeyRound, image: "openasy/secrets", summary: "Leaked keys and passwords in repositories, images and CI logs." },
  runtime: { id: "runtime", name: "Runtime", group: "security", icon: Cpu, image: "openasy/runtime", summary: "eBPF process, network and file-integrity detection on hosts and pods." },
  access: { id: "access", name: "Access", group: "security", icon: DoorOpen, image: "openasy/access", summary: "Just-in-time SSH, RDP and database access with session recording." },
  compliance: { id: "compliance", name: "Compliance", group: "security", icon: ClipboardCheck, image: "openasy/compliance", summary: "ISO 27001, GDPR, SOC 2 and PCI controls with evidence from every product." },
  incidents: { id: "incidents", name: "Incidents", group: "security", icon: Siren, image: "openasy/incidents", summary: "Run an incident: timeline, evidence, tasks and postmortem." },
  identity: { id: "identity", name: "Identity", group: "identity", icon: Fingerprint, image: "openasy/identity", summary: "SSO with OIDC and SAML, MFA and passkeys, for OpenAsy and anything else." },
  traces: { id: "traces", name: "Traces", group: "operations", icon: Waypoints, image: "openasy/traces", summary: "OpenTelemetry tracing: service map, slow endpoints and request waterfalls." },
  uptime: { id: "uptime", name: "Uptime", group: "operations", icon: HeartPulse, image: "openasy/uptime", summary: "HTTP, TCP, DNS and TLS checks with a public status page. Runs from CI cron, no server needed." },
  errors: { id: "errors", name: "Errors", group: "operations", icon: OctagonX, image: "openasy/errors", summary: "Application errors grouped by fingerprint, with stack traces and release tracking." },
  certificates: { id: "certificates", name: "Certificates", group: "operations", icon: BadgeCheck, image: "openasy/certificates", summary: "Inventory of every TLS certificate, expiry alerts and ACME renewal." },
  "attack-surface": { id: "attack-surface", name: "Attack Surface", group: "security", icon: Crosshair, image: "openasy/attack-surface", summary: "Discovers the domains, subdomains, ports and services exposed to the internet." },
  "supply-chain": { id: "supply-chain", name: "Supply Chain", group: "security", icon: PackageCheck, image: "openasy/supply-chain", summary: "Image signing and verification, SBOM store, SLSA provenance and licence policy." },
  endpoints: { id: "endpoints", name: "Endpoints", group: "security", icon: Laptop, image: "openasy/endpoints", summary: "Laptop and workstation inventory and posture with osquery: encryption, updates, software." },
  automation: { id: "automation", name: "Automation", group: "platform", icon: Workflow, image: "openasy/automation", summary: "Visual playbooks that connect products: isolate a host, end a VPN session, open an incident." },
  "threat-intel": { id: "threat-intel", name: "Threat Intel", group: "security", icon: Target, image: "openasy/threat-intel", summary: "IOC feeds over STIX/TAXII that enrich SIEM, VPN, WAF and DAST." },
  "network-ids": { id: "network-ids", name: "Network IDS", group: "security", icon: Network, image: "openasy/network-ids", summary: "Suricata and Zeek network detection with flow and protocol logs." },
  waf: { id: "waf", name: "WAF", group: "security", icon: BrickWall, image: "openasy/waf", summary: "Coraza web application firewall with OWASP CRS and rules generated from DAST findings." },
  deception: { id: "deception", name: "Deception", group: "security", icon: Bird, image: "openasy/deception", summary: "Canary tokens and decoy credentials that only an attacker would touch." },
  profiling: { id: "profiling", name: "Profiling", group: "operations", icon: Flame, image: "openasy/profiling", summary: "Continuous eBPF CPU and memory profiles as flame graphs, linked to traces." },
  database: { id: "database", name: "Database", group: "operations", icon: Database, image: "openasy/database", summary: "Slow queries, locks, replication lag and connection pools for Postgres and MySQL." },
  cost: { id: "cost", name: "Cost", group: "operations", icon: Coins, image: "openasy/cost", summary: "Cloud spend by team and tag, forecasts and anomaly alerts." },
  backups: { id: "backups", name: "Backups", group: "operations", icon: ArchiveRestore, image: "openasy/backups", summary: "Backup job tracking for restic and Velero, with automated restore tests." },
  awareness: { id: "awareness", name: "Awareness", group: "security", icon: GraduationCap, image: "openasy/awareness", summary: "Phishing simulations and security training that produce compliance evidence." },
  risk: { id: "risk", name: "Risk", group: "security", icon: Scale, image: "openasy/risk", summary: "Risk register and vendor risk reviews, linked to controls and findings." },
  "attack-simulation": { id: "attack-simulation", name: "Attack Simulation", group: "security", icon: Swords, image: "openasy/attack-simulation", summary: "Safely runs MITRE ATT&CK techniques and proves every other product detects them." },
  assistant: { id: "assistant", name: "Assistant", group: "platform", icon: Sparkles, image: "openasy/assistant", summary: "Ask across products in plain language and get answers that cite the logs, metrics and signals." },
};

export function getProduct(id: ProductId): ProductInfo {
  return PRODUCTS[id];
}

export const PRODUCT_LIST: ProductInfo[] = PRODUCT_IDS.map((id) => PRODUCTS[id]);
