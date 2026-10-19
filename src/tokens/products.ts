import {
  Biohazard,
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

export type ProductGroup = "operations" | "security" | "identity";

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
  compliance: { id: "compliance", name: "Compliance", group: "security", icon: ClipboardCheck, image: "openasy/compliance", summary: "ISO 27001, KVKK, SOC 2 and PCI controls with evidence from every product." },
  incidents: { id: "incidents", name: "Incidents", group: "security", icon: Siren, image: "openasy/incidents", summary: "Run an incident: timeline, evidence, tasks and postmortem." },
  identity: { id: "identity", name: "Identity", group: "identity", icon: Fingerprint, image: "openasy/identity", summary: "SSO with OIDC and SAML, MFA and passkeys, for OpenAsy and anything else." },
};

export function getProduct(id: ProductId): ProductInfo {
  return PRODUCTS[id];
}

export const PRODUCT_LIST: ProductInfo[] = PRODUCT_IDS.map((id) => PRODUCTS[id]);
