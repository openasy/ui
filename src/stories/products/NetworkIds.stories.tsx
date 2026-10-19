import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { ArrowRight, BookOpen, Download, FileArchive, Layers, Plus, Radio, RefreshCw, RotateCcw, ShieldAlert, Waypoints } from "lucide-react";
import { ProductApp } from "../ProductFrame";
import { PageHeader } from "../../components/PageHeader";
import { Button, IconButton } from "../../components/Button";
import { Callout } from "../../components/Callout";
import { KpiCard, KpiGrid } from "../../components/Kpi";
import { Panel } from "../../components/Panel";
import { FilterBar, FacetFilter, QueryBar, TimeRangePicker } from "../../components/Filters";
import { SearchInput, SelectField, Switch, TextField } from "../../components/Controls";
import { Tabs } from "../../components/Tabs";
import { DataTable, type Column } from "../../components/DataTable";
import { Badge, SeverityBadge, StatusBadge } from "../../components/Badge";
import { EntityChip } from "../../components/EntityChip";
import { StackedBarChart } from "../../charts/StackedBarChart";
import { BarList } from "../../charts/BarList";
import { TimeSeriesChart } from "../../charts/TimeSeriesChart";
import { Sparkline } from "../../charts/Sparkline";
import { formatBytes } from "../../lib/format";
import { SEVERITY_META, TONE_COLORS, type Severity } from "../../tokens/levels";
import { timeLabels, wave } from "../mocks";

const nav = [
  { id: "alerts", label: "Alerts", icon: ShieldAlert, count: 64 },
  { id: "flows", label: "Flows", icon: Waypoints },
  { id: "protocols", label: "Protocols", icon: Layers },
  { id: "rules", label: "Rules", icon: BookOpen },
  { id: "sensors", label: "Sensors", icon: Radio, count: 4 },
  { id: "pcap", label: "PCAP", icon: FileArchive },
];

const meta = {
  title: "Products/Network IDS",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

interface Alert {
  id: string;
  severity: Severity;
  signature: string;
  sid: number;
  src: string;
  srcPort: number;
  dst: string;
  dstPort: number;
  proto: string;
  sensor: string;
  communityId: string;
  time: string;
  bytesOut: number;
  bytesIn: number;
  duration: string;
  ja3: string;
  zeek: string[];
}

const alerts: Alert[] = [
  {
    id: "a1",
    severity: "critical",
    signature: "ET POLICY Possible data exfiltration via DNS tunnel",
    sid: 2027758,
    src: "192.0.2.17",
    srcPort: 53122,
    dst: "203.0.113.53",
    dstPort: 53,
    proto: "DNS/UDP",
    sensor: "nids-core-01",
    communityId: "1:Yh5fXo0pY2Tz1u0Fo8Hc3JxB0kE=",
    time: "13:58:12",
    bytesOut: 48_211_000,
    bytesIn: 3_904_000,
    duration: "41 m 06 s",
    ja3: "–",
    zeek: [
      "conn  1760882292.114  CmEu3t2  192.0.2.17  53122  203.0.113.53  53  udp  dns  2466.2  48211000  3904000  SF",
      "dns   1760882292.120  CmEu3t2  192.0.2.17  53122  203.0.113.53  53  udp  41873  aGVsbG8.d2b1.tunnel.example.com  TXT  NOERROR",
      "dns   1760882292.161  CmEu3t2  192.0.2.17  53122  203.0.113.53  53  udp  41874  c2VjcmV0.d2b2.tunnel.example.com  TXT  NOERROR",
    ],
  },
  {
    id: "a2",
    severity: "high",
    signature: "ET MALWARE Cobalt Strike Beacon Observed",
    sid: 2028591,
    src: "192.0.2.42",
    srcPort: 49811,
    dst: "198.51.100.77",
    dstPort: 443,
    proto: "TLS/TCP",
    sensor: "nids-core-01",
    communityId: "1:7mJ1cQnQ0uWj5vPq3yXc1sZ9aB4=",
    time: "13:41:50",
    bytesOut: 182_000,
    bytesIn: 96_400,
    duration: "6 h 12 m",
    ja3: "72a589da586844d7f0818ce684948eea",
    zeek: [
      "conn  1760881310.902  C8aKq91  192.0.2.42  49811  198.51.100.77  443  tcp  ssl  22320.4  182000  96400  S1",
      "ssl   1760881310.951  C8aKq91  192.0.2.42  49811  198.51.100.77  443  TLSv12  cdn.example.com  F  -  ja3=72a589da586844d7f0818ce684948eea",
    ],
  },
  {
    id: "a3",
    severity: "high",
    signature: "ET SCAN Possible Nmap User-Agent Observed",
    sid: 2024364,
    src: "192.0.2.44",
    srcPort: 61402,
    dst: "192.0.2.10",
    dstPort: 443,
    proto: "HTTP/TCP",
    sensor: "nids-edge-fra",
    communityId: "1:Q2kZr3u0bP8nG4hT6vLw9xYa1cE=",
    time: "13:20:04",
    bytesOut: 12_400,
    bytesIn: 88_900,
    duration: "2 m 18 s",
    ja3: "e7d705a3286e19ea42f587b344ee6865",
    zeek: [
      "conn  1760880004.330  CbX0e2Q  192.0.2.44  61402  192.0.2.10  443  tcp  http  138.1  12400  88900  SF",
      'http  1760880004.341  CbX0e2Q  192.0.2.44  61402  192.0.2.10  443  GET  www.example.com  /admin  -  "Mozilla/5.0 (compatible; Nmap Scripting Engine)"  404',
    ],
  },
  {
    id: "a4",
    severity: "medium",
    signature: "ET POLICY SSH session in non-standard port",
    sid: 2001984,
    src: "192.0.2.8",
    srcPort: 50211,
    dst: "203.0.113.181",
    dstPort: 2222,
    proto: "SSH/TCP",
    sensor: "nids-core-02",
    communityId: "1:b4XjK9mQ2pRa7cU1nV8eWf3gHs0=",
    time: "12:55:31",
    bytesOut: 2_310_000,
    bytesIn: 410_000,
    duration: "18 m 40 s",
    ja3: "–",
    zeek: ["conn  1760878531.007  Cq2Lm8z  192.0.2.8  50211  203.0.113.181  2222  tcp  ssh  1120.4  2310000  410000  SF", "ssh   1760878531.044  Cq2Lm8z  192.0.2.8  50211  203.0.113.181  2222  2  T  SSH-2.0-OpenSSH_9.6"],
  },
  {
    id: "a5",
    severity: "medium",
    signature: "ET INFO Observed DNS Query to Dynamic DNS Domain",
    sid: 2027863,
    src: "192.0.2.31",
    srcPort: 41022,
    dst: "198.51.100.53",
    dstPort: 53,
    proto: "DNS/UDP",
    sensor: "nids-core-02",
    communityId: "1:Zt8pN3kL6qWm1vYb4xCe7aRf2gU=",
    time: "12:31:09",
    bytesOut: 92,
    bytesIn: 148,
    duration: "0.02 s",
    ja3: "–",
    zeek: ["dns   1760877069.512  CzP4w1n  192.0.2.31  41022  198.51.100.53  53  udp  8812  home-nas.dyn.example.com  A  NXDOMAIN"],
  },
  {
    id: "a6",
    severity: "low",
    signature: "ET POLICY curl User-Agent Outbound",
    sid: 2013028,
    src: "192.0.2.9",
    srcPort: 38110,
    dst: "203.0.113.24",
    dstPort: 80,
    proto: "HTTP/TCP",
    sensor: "nids-core-01",
    communityId: "1:Lr0yB6tE3kQp9uWn2vXc5mZa8hJ=",
    time: "11:47:45",
    bytesOut: 840,
    bytesIn: 2_150_000,
    duration: "3.4 s",
    ja3: "–",
    zeek: ['http  1760874465.200  Cm5Nf0e  192.0.2.9  38110  203.0.113.24  80  GET  dl.example.com  /install.sh  -  "curl/8.5.0"  200'],
  },
  {
    id: "a7",
    severity: "low",
    signature: "SURICATA TLS invalid record type",
    sid: 2230002,
    src: "192.0.2.14",
    srcPort: 55300,
    dst: "198.51.100.10",
    dstPort: 443,
    proto: "TLS/TCP",
    sensor: "nids-edge-lon",
    communityId: "1:Ws3cV7bN0mKq2pTa9yXe4uLr6fG=",
    time: "11:02:18",
    bytesOut: 5_200,
    bytesIn: 3_100,
    duration: "0.8 s",
    ja3: "cd08e31494f9531f560d64c695473da9",
    zeek: ["conn  1760871738.640  Ck9Rt3v  192.0.2.14  55300  198.51.100.10  443  tcp  ssl  0.8  5200  3100  RSTO"],
  },
];

const SEV_ORDER: Severity[] = ["critical", "high", "medium", "low"];
const SEV_COUNTS: Record<string, number> = { critical: 2, high: 9, medium: 21, low: 32 };

const HOURS = 24;
const hours = timeLabels(HOURS, 60);
const sevSeries = [
  wave(HOURS, { base: 0.1, amp: 0.1, seed: 71, spike: 1, spikeAt: 21, spikeLen: 2 }),
  wave(HOURS, { base: 0.4, amp: 0.3, seed: 72, spike: 1.5, spikeAt: 20 }),
  wave(HOURS, { base: 0.9, amp: 0.5, seed: 73 }),
  wave(HOURS, { base: 1.3, amp: 0.7, seed: 74 }),
];
const perHour = hours.map((_, i) => sevSeries.map((s) => Math.round(s[i]!)));

const talkers = [
  { id: "t1", label: "192.0.2.17", value: 52.1e9, color: TONE_COLORS.danger },
  { id: "t2", label: "192.0.2.5", value: 38.4e9 },
  { id: "t3", label: "192.0.2.10", value: 21.7e9 },
  { id: "t4", label: "192.0.2.8", value: 9.6e9 },
  { id: "t5", label: "192.0.2.42", value: 4.2e9 },
  { id: "t6", label: "192.0.2.31", value: 1.9e9 },
];

const columns: Column<Alert>[] = [
  { id: "sev", header: "Severity", width: "100px", sortValue: (a) => SEVERITY_META[a.severity].rank, cell: (a) => <SeverityBadge severity={a.severity} /> },
  {
    id: "sig",
    header: "Signature",
    width: "30%",
    sortValue: (a) => a.signature,
    cell: (a) => (
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{a.signature}</span>
        <span className="font-mono text-2xs text-fg-muted">sid:{a.sid}</span>
      </span>
    ),
  },
  {
    id: "flow",
    header: "Source → destination",
    cell: (a) => (
      <span className="flex items-center gap-1 whitespace-nowrap">
        <EntityChip kind="ip" hideKind value={`${a.src}:${a.srcPort}`} />
        <ArrowRight aria-hidden className="size-3 shrink-0 text-fg-muted" />
        <EntityChip kind="ip" hideKind value={`${a.dst}:${a.dstPort}`} />
      </span>
    ),
  },
  { id: "proto", header: "Protocol", mono: true, cell: (a) => a.proto },
  { id: "sensor", header: "Sensor", mono: true, sortValue: (a) => a.sensor, cell: (a) => a.sensor },
  { id: "cid", header: "Community ID", cell: (a) => <span className="block max-w-[150px] truncate font-mono text-2xs text-fg-muted">{a.communityId}</span> },
  { id: "time", header: "Time", align: "right", mono: true, sortValue: (a) => a.time, cell: (a) => a.time },
];

function FlowDetail({ alert }: { alert: Alert }) {
  const stats = [
    { k: "Bytes out", v: formatBytes(alert.bytesOut) },
    { k: "Bytes in", v: formatBytes(alert.bytesIn) },
    { k: "Duration", v: alert.duration },
    { k: "Protocol", v: alert.proto },
  ];
  return (
    <div className="flex flex-col gap-2.5">
      <dl aria-label={`Flow detail for ${alert.signature}`} className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {stats.map((s) => (
          <div key={s.k} className="flex min-w-0 flex-col">
            <dt className="text-2xs font-medium tracking-wider text-fg-muted uppercase">{s.k}</dt>
            <dd className="m-0 font-mono text-sm text-fg">{s.v}</dd>
          </div>
        ))}
        <div className="col-span-2 flex min-w-0 flex-col">
          <dt className="text-2xs font-medium tracking-wider text-fg-muted uppercase">JA3</dt>
          <dd className="m-0 font-mono text-xs break-all text-fg">{alert.ja3}</dd>
        </div>
        <div className="col-span-2 flex min-w-0 flex-col">
          <dt className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Community ID</dt>
          <dd className="m-0 font-mono text-xs break-all text-fg">{alert.communityId}</dd>
        </div>
      </dl>
      <div className="flex flex-col gap-1">
        <h3 className="text-2xs font-medium tracking-wider text-fg-muted uppercase">Zeek logs</h3>
        <pre className="m-0 rounded-md border border-line bg-canvas px-2 py-1.5 font-mono text-2xs leading-4 break-all whitespace-pre-wrap text-fg">
          {alert.zeek.join("\n")}
        </pre>
      </div>
      <div className="flex flex-wrap gap-1.5 border-t border-line pt-2">
        <Button size="sm" icon={<Download aria-hidden />}>
          Download PCAP
        </Button>
        <Button size="sm" variant="ghost">
          Open in SIEM
        </Button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* More sample data                                                    */
/* ------------------------------------------------------------------ */

interface Conn {
  uid: string;
  ts: string;
  orig_h: string;
  orig_p: number;
  resp_h: string;
  resp_p: number;
  proto: "tcp" | "udp" | "icmp";
  service: string;
  duration: number;
  orig_bytes: number;
  resp_bytes: number;
  conn_state: string;
  history: string;
  sensor: string;
}

const CONNS: Conn[] = [
  { uid: "CmEu3t2", ts: "13:58:12.114", orig_h: "192.0.2.17", orig_p: 53122, resp_h: "203.0.113.53", resp_p: 53, proto: "udp", service: "dns", duration: 2466.2, orig_bytes: 48_211_000, resp_bytes: 3_904_000, conn_state: "SF", history: "Dd", sensor: "nids-core-01" },
  { uid: "C8aKq91", ts: "13:41:50.902", orig_h: "192.0.2.42", orig_p: 49811, resp_h: "198.51.100.77", resp_p: 443, proto: "tcp", service: "ssl", duration: 22320.4, orig_bytes: 182_000, resp_bytes: 96_400, conn_state: "S1", history: "ShADad", sensor: "nids-core-01" },
  { uid: "CbX0e2Q", ts: "13:20:04.330", orig_h: "192.0.2.44", orig_p: 61402, resp_h: "192.0.2.10", resp_p: 443, proto: "tcp", service: "http", duration: 138.1, orig_bytes: 12_400, resp_bytes: 88_900, conn_state: "SF", history: "ShADadFf", sensor: "nids-edge-fra" },
  { uid: "Cq2Lm8z", ts: "12:55:31.007", orig_h: "192.0.2.8", orig_p: 50211, resp_h: "203.0.113.181", resp_p: 2222, proto: "tcp", service: "ssh", duration: 1120.4, orig_bytes: 2_310_000, resp_bytes: 410_000, conn_state: "SF", history: "ShADadFf", sensor: "nids-core-02" },
  { uid: "CzP4w1n", ts: "12:31:09.512", orig_h: "192.0.2.31", orig_p: 41022, resp_h: "198.51.100.53", resp_p: 53, proto: "udp", service: "dns", duration: 0.02, orig_bytes: 92, resp_bytes: 148, conn_state: "SF", history: "Dd", sensor: "nids-core-02" },
  { uid: "Cm5Nf0e", ts: "11:47:45.200", orig_h: "192.0.2.9", orig_p: 38110, resp_h: "203.0.113.24", resp_p: 80, proto: "tcp", service: "http", duration: 3.4, orig_bytes: 840, resp_bytes: 2_150_000, conn_state: "SF", history: "ShADadFf", sensor: "nids-core-01" },
  { uid: "Ck9Rt3v", ts: "11:02:18.640", orig_h: "192.0.2.14", orig_p: 55300, resp_h: "198.51.100.10", resp_p: 443, proto: "tcp", service: "ssl", duration: 0.8, orig_bytes: 5_200, resp_bytes: 3_100, conn_state: "RSTO", history: "ShADR", sensor: "nids-edge-lon" },
  { uid: "Cw7Hx2a", ts: "10:44:02.018", orig_h: "192.0.2.5", orig_p: 44120, resp_h: "192.0.2.60", resp_p: 5432, proto: "tcp", service: "postgresql", duration: 3600.0, orig_bytes: 1_840_000_000, resp_bytes: 9_120_000_000, conn_state: "S1", history: "ShADad", sensor: "nids-core-02" },
  { uid: "Cr1Pk8d", ts: "10:31:55.771", orig_h: "198.51.100.201", orig_p: 51002, resp_h: "192.0.2.10", resp_p: 22, proto: "tcp", service: "ssh", duration: 2.1, orig_bytes: 1_204, resp_bytes: 2_008, conn_state: "RSTR", history: "ShAdR", sensor: "nids-edge-fra" },
  { uid: "Cy3Mv0q", ts: "10:12:40.004", orig_h: "192.0.2.17", orig_p: 0, resp_h: "192.0.2.1", resp_p: 0, proto: "icmp", service: "-", duration: 0.001, orig_bytes: 64, resp_bytes: 64, conn_state: "OTH", history: "-", sensor: "nids-core-01" },
  { uid: "Ct6Bn4s", ts: "09:58:13.330", orig_h: "192.0.2.22", orig_p: 39004, resp_h: "203.0.113.9", resp_p: 25, proto: "tcp", service: "smtp", duration: 4.8, orig_bytes: 48_200, resp_bytes: 1_920, conn_state: "SF", history: "ShADadFf", sensor: "nids-edge-lon" },
  { uid: "Cj2Fd9u", ts: "09:40:21.909", orig_h: "203.0.113.181", orig_p: 60111, resp_h: "192.0.2.10", resp_p: 3389, proto: "tcp", service: "-", duration: 0.0, orig_bytes: 0, resp_bytes: 0, conn_state: "REJ", history: "Sr", sensor: "nids-edge-fra" },
];

const CONN_STATE: Record<string, string> = {
  SF: "Normal establish and termination",
  S1: "Established, not terminated",
  RSTO: "Originator aborted",
  RSTR: "Responder aborted",
  REJ: "Connection attempt rejected",
  OTH: "No SYN seen, midstream traffic",
};

function matchesQuery(c: Conn, q: string) {
  const tokens = q.trim().split(/\s+/).filter(Boolean);
  return tokens.every((t) => {
    const [k, v] = t.includes(":") ? (t.split(/:(.*)/s) as [string, string]) : ["", t];
    const fields: Record<string, string> = {
      service: c.service,
      proto: c.proto,
      orig_h: c.orig_h,
      resp_h: c.resp_h,
      resp_p: String(c.resp_p),
      conn_state: c.conn_state,
      sensor: c.sensor,
      uid: c.uid,
    };
    if (k && k in fields) return fields[k]!.toLowerCase() === v.toLowerCase();
    return Object.values(fields).some((f) => f.toLowerCase().includes(t.toLowerCase()));
  });
}

const dnsQueries = [
  { id: "d1", label: "d2b1.tunnel.example.com", value: 2413, color: TONE_COLORS.danger },
  { id: "d2", label: "api.example.com", value: 1820 },
  { id: "d3", label: "registry.example.com", value: 1204 },
  { id: "d4", label: "time.example.com", value: 980 },
  { id: "d5", label: "home-nas.dyn.example.com", value: 77, color: TONE_COLORS.warning },
];

interface TlsServer {
  id: string;
  sni: string;
  version: string;
  cipher: string;
  ja3s: string;
  issuer: string;
  expires: string;
  conns: number;
  flag?: string;
}

const TLS_SERVERS: TlsServer[] = [
  { id: "t1", sni: "cdn.example.com", version: "TLSv1.2", cipher: "ECDHE-RSA-AES256-GCM-SHA384", ja3s: "ae4edc6faf64d08308082ad26be60767", issuer: "Self-signed", expires: "in 3 d", conns: 412, flag: "Cobalt Strike default JA3" },
  { id: "t2", sni: "api.example.com", version: "TLSv1.3", cipher: "TLS_AES_128_GCM_SHA256", ja3s: "15af977ce25de452b96affa2addb1036", issuer: "Let's Encrypt R11", expires: "in 61 d", conns: 18_204 },
  { id: "t3", sni: "registry.example.com", version: "TLSv1.3", cipher: "TLS_AES_256_GCM_SHA384", ja3s: "907bf3ecef1c987c889946b737b43de8", issuer: "Let's Encrypt R10", expires: "in 44 d", conns: 6_120 },
  { id: "t4", sni: "legacy.example.com", version: "TLSv1.0", cipher: "TLS_RSA_WITH_AES_128_CBC_SHA", ja3s: "6d4e5b73a8a1f2b2a3d1c7e9a0b8c6d2", issuer: "Example Internal CA", expires: "expired 12 d ago", conns: 88, flag: "TLS 1.0 and expired certificate" },
  { id: "t5", sni: "mail.example.com", version: "TLSv1.2", cipher: "ECDHE-ECDSA-AES128-GCM-SHA256", ja3s: "c4b3a2d1e0f9a8b7c6d5e4f3a2b1c0d9", issuer: "Example Internal CA", expires: "in 210 d", conns: 1_402 },
];

const HTTP_UA = [
  { id: "u1", label: "Mozilla/5.0 (Windows NT 10.0) Chrome/129", value: 48_200 },
  { id: "u2", label: "python-requests/2.32", value: 12_040 },
  { id: "u3", label: "Go-http-client/1.1", value: 9_880 },
  { id: "u4", label: "curl/8.5.0", value: 1_204, color: TONE_COLORS.warning },
  { id: "u5", label: "Nmap Scripting Engine", value: 212, color: TONE_COLORS.danger },
];

interface Ruleset {
  id: string;
  name: string;
  source: string;
  rules: number;
  enabled: number;
  updated: string;
  on: boolean;
}

const RULESETS: Ruleset[] = [
  { id: "et-open", name: "ET Open", source: "rules.emergingthreats.net · daily", rules: 48_912, enabled: 41_207, updated: "Today 04:00", on: true },
  { id: "suricata", name: "Suricata protocol events", source: "Bundled with Suricata 7.0.7", rules: 812, enabled: 812, updated: "Sep 30", on: true },
  { id: "sslbl", name: "abuse.ch SSLBL", source: "JA3 and certificate blacklist · hourly", rules: 3_204, enabled: 3_204, updated: "Today 13:00", on: true },
  { id: "threat-intel", name: "OpenAsy Threat Intel", source: "Generated from indicators with confidence ≥ 75", rules: 9_480, enabled: 9_480, updated: "Live", on: true },
  { id: "ptresearch", name: "PT Research attack detection", source: "github.com/example/AttackDetection", rules: 1_120, enabled: 0, updated: "Oct 2", on: false },
];

interface CustomRule {
  id: string;
  sid: number;
  msg: string;
  text: string;
  hits: number;
  author: string;
}

const CUSTOM_RULES: CustomRule[] = [
  { id: "r1", sid: 9_000_101, msg: "LOCAL Outbound SSH to non-standard port", text: 'alert tcp $HOME_NET any -> $EXTERNAL_NET !22 (msg:"LOCAL Outbound SSH to non-standard port"; app-layer-protocol:ssh; sid:9000101; rev:2;)', hits: 3, author: "Mark Wilson" },
  { id: "r2", sid: 9_000_102, msg: "LOCAL Long DNS TXT label", text: 'alert dns $HOME_NET any -> any any (msg:"LOCAL Long DNS TXT label"; dns.query; pcre:"/^[A-Za-z0-9]{40,}\\./"; sid:9000102; rev:1;)', hits: 2_413, author: "Sarah Chen" },
  { id: "r3", sid: 9_000_103, msg: "LOCAL Database traffic leaving the data subnet", text: 'alert tcp 192.0.2.60/32 5432 -> !$HOME_NET any (msg:"LOCAL Database traffic leaving the data subnet"; sid:9000103; rev:1;)', hits: 0, author: "Dana Kim" },
];

const SUPPRESSIONS = [
  { sid: 2013028, msg: "ET POLICY curl User-Agent Outbound", scope: "src 192.0.2.9 (build runner)", by: "Chris Shaw", until: "Dec 31" },
  { sid: 2027863, msg: "ET INFO DNS Query to Dynamic DNS Domain", scope: "threshold 10 per host per hour", by: "Sarah Chen", until: "No expiry" },
  { sid: 2221010, msg: "SURICATA HTTP unable to match response to request", scope: "all sources", by: "Mark Wilson", until: "No expiry" },
];

interface Sensor {
  id: string;
  site: string;
  status: "healthy" | "degraded";
  version: string;
  uptime: string;
  gbps: number;
  drop: number;
  cpu: number;
  mem: number;
  eps: number;
  ifaces: Array<{ name: string; mode: string; speed: string; util: number; drops: string }>;
  drops: number[];
}

const SENSORS: Sensor[] = [
  { id: "nids-core-01", site: "Frankfurt DC · core switch SPAN", status: "healthy", version: "Suricata 7.0.7 · Zeek 7.0.3", uptime: "41 d", gbps: 1.8, drop: 0.01, cpu: 38, mem: 61, eps: 2_140, ifaces: [{ name: "ens2f0", mode: "AF_PACKET · 8 workers", speed: "10 Gbps", util: 18, drops: "0.01%" }, { name: "ens2f1", mode: "AF_PACKET · 8 workers", speed: "10 Gbps", util: 7, drops: "0%" }], drops: wave(24, { base: 0.01, amp: 0.01, seed: 91 }) },
  { id: "nids-core-02", site: "Frankfurt DC · data VLAN tap", status: "healthy", version: "Suricata 7.0.7 · Zeek 7.0.3", uptime: "41 d", gbps: 1.2, drop: 0.0, cpu: 29, mem: 54, eps: 1_310, ifaces: [{ name: "ens3f0", mode: "AF_PACKET · 4 workers", speed: "10 Gbps", util: 12, drops: "0%" }], drops: wave(24, { base: 0.005, amp: 0.005, seed: 92 }) },
  { id: "nids-edge-fra", site: "Frankfurt edge · internet uplink", status: "degraded", version: "Suricata 7.0.7 · Zeek 7.0.3", uptime: "6 d", gbps: 0.7, drop: 1.8, cpu: 92, mem: 71, eps: 880, ifaces: [{ name: "eth1", mode: "AF_PACKET · 2 workers", speed: "1 Gbps", util: 71, drops: "1.8%" }], drops: wave(24, { base: 0.4, amp: 0.3, seed: 93, spike: 1.5, spikeAt: 16 }) },
  { id: "nids-edge-lon", site: "London edge · internet uplink", status: "healthy", version: "Suricata 7.0.6 · Zeek 7.0.3", uptime: "88 d", gbps: 0.1, drop: 0.0, cpu: 12, mem: 33, eps: 140, ifaces: [{ name: "eth1", mode: "AF_PACKET · 2 workers", speed: "1 Gbps", util: 9, drops: "0%" }], drops: wave(24, { base: 0.002, amp: 0.002, seed: 94 }) },
];

type CaptureStatus = "queued" | "running" | "ready" | "expired";
const CAPTURE_STATUS: Record<CaptureStatus, { label: string; tone: "neutral" | "info" | "success" | "warning" }> = {
  queued: { label: "Queued", tone: "neutral" },
  running: { label: "Capturing", tone: "info" },
  ready: { label: "Ready", tone: "success" },
  expired: { label: "Expired", tone: "warning" },
};

interface Capture {
  id: string;
  name: string;
  sensor: string;
  filter: string;
  requested: string;
  by: string;
  size: number;
  packets: number;
  status: CaptureStatus;
}

const CAPTURES: Capture[] = [
  { id: "pc-118", name: "DNS tunnel from 192.0.2.17", sensor: "nids-core-01", filter: "host 192.0.2.17 and udp port 53", requested: "Today 14:01", by: "Sarah Chen", size: 412_000_000, packets: 1_802_114, status: "running" },
  { id: "pc-117", name: "Alert a2 · Cobalt Strike beacon", sensor: "nids-core-01", filter: "community-id 1:7mJ1cQnQ0uWj5vPq3yXc1sZ9aB4=", requested: "Today 13:44", by: "auto · critical alert", size: 2_900_000, packets: 4_120, status: "ready" },
  { id: "pc-116", name: "Nmap scan from 192.0.2.44", sensor: "nids-edge-fra", filter: "host 192.0.2.44", requested: "Today 13:21", by: "auto · high alert", size: 18_400_000, packets: 61_008, status: "ready" },
  { id: "pc-115", name: "SSH on 2222 to 203.0.113.181", sensor: "nids-core-02", filter: "host 203.0.113.181 and tcp port 2222", requested: "Today 12:58", by: "Mark Wilson", size: 3_100_000, packets: 7_411, status: "ready" },
  { id: "pc-109", name: "TLS errors to legacy.example.com", sensor: "nids-edge-lon", filter: "tcp port 443 and host 198.51.100.10", requested: "Oct 11", by: "Dana Kim", size: 640_000, packets: 1_002, status: "expired" },
];

/* ------------------------------------------------------------------ */
/* Pages                                                               */
/* ------------------------------------------------------------------ */

function AlertsPage() {
  const [range, setRange] = useState("24h");
  const [sev, setSev] = useState<string[]>([]);
  const [sensor, setSensor] = useState<string[]>([]);
  const [selected, setSelected] = useState<string | undefined>();
  const rows = alerts.filter((a) => (sev.length === 0 || sev.includes(a.severity)) && (sensor.length === 0 || sensor.includes(a.sensor)));
  const current = alerts.find((a) => a.id === selected);
  return (
    <>
      <PageHeader
        title="Alerts"
        description="Suricata 7.0 with ET Open + 212 local rules · Zeek 7 flow and protocol logs"
        meta={<StatusBadge tone="success">4 of 4 sensors up</StatusBadge>}
        actions={
          <>
            <SearchInput label="Search signatures or IPs" className="w-60" />
            <Button size="md" variant="primary" icon={<BookOpen aria-hidden />}>
              Update rules
            </Button>
          </>
        }
      />
      <FilterBar
        onClear={
          sev.length || sensor.length
            ? () => {
                setSev([]);
                setSensor([]);
              }
            : undefined
        }
      >
        <TimeRangePicker value={range} onChange={setRange} />
        <FacetFilter label="Severity" selected={sev} onChange={setSev} options={SEV_ORDER.map((s) => ({ value: s, label: SEVERITY_META[s].label, count: SEV_COUNTS[s] }))} />
        <FacetFilter
          label="Sensor"
          selected={sensor}
          onChange={setSensor}
          options={["nids-core-01", "nids-core-02", "nids-edge-fra", "nids-edge-lon"].map((s) => ({ value: s, count: alerts.filter((a) => a.sensor === s).length }))}
        />
      </FilterBar>
      <KpiGrid minWidth={170}>
        <KpiCard
          label="Alerts · 24 h"
          value="64"
          unit="total"
          footer={
            <span className="flex flex-wrap gap-1">
              {SEV_ORDER.map((s) => (
                <span key={s} className="inline-flex items-center gap-1 font-mono text-xs text-fg">
                  <SeverityBadge severity={s} compact />
                  {SEV_COUNTS[s]}
                </span>
              ))}
            </span>
          }
        />
        <KpiCard label="Critical · 24 h" value="2" unit="open" tone="critical" delta={{ label: "+2 in the last hour", direction: "up", intent: "bad" }} />
        <KpiCard label="Sensors up" value="4" unit="of 4" delta={{ label: "0.02% packets dropped", intent: "good" }} />
        <KpiCard label="Inspected" value="3.8" unit="Gbps now" trend={wave(24, { base: 3.2, amp: 1.1, seed: 75 })} delta={{ label: "peak 6.1 Gbps at 10:00" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Alerts per hour" description="By severity, last 24 h">
          <StackedBarChart
            label="Network IDS alerts per hour by severity"
            categories={hours}
            height={160}
            xTicks={7}
            segments={SEV_ORDER.map((s) => ({ id: s, name: SEVERITY_META[s].label, color: TONE_COLORS[SEVERITY_META[s].tone] }))}
            values={perHour}
          />
        </Panel>
        <Panel title="Top talkers" description="Internal hosts by bytes, 24 h">
          <BarList label="Top talkers by bytes" items={talkers} format={(v) => formatBytes(v)} />
        </Panel>
      </div>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Alerts" description="Select an alert to see its flow" flush>
          <DataTable
            label="Alerts"
            columns={columns}
            rows={rows}
            getRowId={(a) => a.id}
            onRowClick={(a) => setSelected(a.id)}
            activeRowId={selected}
            defaultSort={{ id: "time", direction: "desc" }}
            minWidth={1060}
            empty={<p className="py-8">No alerts match these filters</p>}
          />
        </Panel>
        <Panel title="Flow detail" description={current ? `${current.src}:${current.srcPort} → ${current.dst}:${current.dstPort}` : "No alert selected"} aria-label="Flow detail">
          {current ? <FlowDetail alert={current} /> : <p className="py-6 text-center text-sm text-fg-muted">Select an alert to see bytes, JA3 and Zeek logs</p>}
        </Panel>
      </div>
    </>
  );
}

function FlowsPage() {
  const [range, setRange] = useState("24h");
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<string | undefined>();
  const rows = CONNS.filter((c) => matchesQuery(c, query));
  const cur = CONNS.find((c) => c.uid === active);
  const cols: Column<Conn>[] = [
    { id: "ts", header: "ts", mono: true, width: "110px", sortValue: (c) => c.ts, cell: (c) => c.ts, description: "Time of the first packet." },
    { id: "uid", header: "uid", mono: true, pinned: "left", width: "90px", cell: (c) => c.uid, description: "Zeek connection id; joins conn.log to dns, ssl, http and files logs." },
    { id: "orig", header: "id.orig_h:p", cell: (c) => <span className="font-mono text-xs whitespace-nowrap">{c.orig_h}:{c.orig_p}</span> },
    { id: "resp", header: "id.resp_h:p", cell: (c) => <span className="font-mono text-xs whitespace-nowrap">{c.resp_h}:{c.resp_p}</span> },
    { id: "proto", header: "proto", mono: true, cell: (c) => c.proto },
    { id: "service", header: "service", sortValue: (c) => c.service, cell: (c) => <Badge mono>{c.service}</Badge> },
    { id: "duration", header: "duration", align: "right", mono: true, sortValue: (c) => c.duration, cell: (c) => `${c.duration} s` },
    { id: "ob", header: "orig_bytes", align: "right", mono: true, sortValue: (c) => c.orig_bytes, cell: (c) => formatBytes(c.orig_bytes) },
    { id: "rb", header: "resp_bytes", align: "right", mono: true, sortValue: (c) => c.resp_bytes, cell: (c) => formatBytes(c.resp_bytes) },
    { id: "state", header: "conn_state", mono: true, description: "How the connection started and ended, e.g. SF normal, REJ rejected, S1 still open.", cell: (c) => c.conn_state },
    { id: "history", header: "history", mono: true, cell: (c) => c.history },
  ];
  return (
    <>
      <PageHeader title="Flows" description="Every connection Zeek saw, searchable by conn.log fields. 30 days hot, 400 days in the archive." actions={<Button icon={<Download />}>Export TSV</Button>} />
      <FilterBar>
        <TimeRangePicker value={range} onChange={setRange} />
        <QueryBar label="Zeek query" placeholder="service:dns orig_h:192.0.2.17" value={draft} onChange={setDraft} onSubmit={(v) => setQuery(v)} />
      </FilterBar>
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-fg-muted">
        <span>Try</span>
        {["service:dns", "conn_state:REJ", "resp_p:22", "sensor:nids-edge-fra"].map((q) => (
          <Button
            key={q}
            size="xs"
            variant="ghost"
            onClick={() => {
              setDraft(q);
              setQuery(q);
            }}
          >
            <span className="font-mono">{q}</span>
          </Button>
        ))}
      </div>
      <KpiGrid>
        <KpiCard label="Connections · 24 h" value="41.2M" trend={wave(24, { base: 1.7, amp: 0.6, seed: 95 })} />
        <KpiCard label="Matching" value={rows.length.toString()} unit="in sample" />
        <KpiCard label="Rejected" value="2.1%" unit="REJ + S0" delta={{ label: "Mostly from the internet edge" }} />
        <KpiCard label="Long-lived" value="318" unit="over 1 h" delta={{ label: "Check beacons with regular gaps" }} />
      </KpiGrid>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]">
        <Panel title="conn.log" description={`${rows.length} of ${CONNS.length} shown${query ? ` · ${query}` : ""}`} flush>
          <DataTable label="Flows" columns={cols} rows={rows} getRowId={(c) => c.uid} onRowClick={(c) => setActive(c.uid)} activeRowId={active} defaultSort={{ id: "ts", direction: "desc" }} minWidth={1180} stickyHeader maxHeight={420} empty={<p className="py-8">No flows match this query</p>} />
        </Panel>
        <Panel title="Connection" description={cur ? cur.uid : "Select a flow"} aria-label="Connection detail">
          {cur ? (
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-sm">
              <dt className="text-fg-muted">Sensor</dt>
              <dd className="font-mono text-xs">{cur.sensor}</dd>
              <dt className="text-fg-muted">State</dt>
              <dd className="text-xs">
                <span className="font-mono">{cur.conn_state}</span> · {CONN_STATE[cur.conn_state]}
              </dd>
              <dt className="text-fg-muted">Total</dt>
              <dd className="font-mono text-xs">{formatBytes(cur.orig_bytes + cur.resp_bytes)}</dd>
              <dt className="text-fg-muted">Ratio out:in</dt>
              <dd className="font-mono text-xs">{(cur.orig_bytes / Math.max(1, cur.resp_bytes)).toFixed(2)}</dd>
              <dt className="text-fg-muted">Logs</dt>
              <dd className="flex flex-wrap gap-1">
                <Badge mono>conn</Badge>
                {cur.service !== "-" && <Badge mono>{cur.service === "ssl" ? "ssl" : cur.service}</Badge>}
              </dd>
            </dl>
          ) : (
            <p className="py-6 text-center text-sm text-fg-muted">Select a flow to see its state and related logs</p>
          )}
        </Panel>
      </div>
    </>
  );
}

function ProtocolsPage() {
  const [tab, setTab] = useState<"dns" | "tls" | "http">("dns");
  return (
    <>
      <PageHeader title="Protocols" description="What Zeek parsed from DNS, TLS and HTTP in the last 24 hours.">
        <Tabs
          label="Protocol"
          value={tab}
          onChange={setTab}
          items={[
            { value: "dns", label: "DNS", count: "12.4M" },
            { value: "tls", label: "TLS", count: "8.1M" },
            { value: "http", label: "HTTP", count: "1.2M" },
          ]}
        />
      </PageHeader>
      {tab === "dns" && (
        <>
          <KpiGrid>
            <KpiCard label="Queries · 24 h" value="12.4M" trend={wave(24, { base: 520, amp: 160, seed: 96 })} />
            <KpiCard label="NXDOMAIN" value="3.2%" delta={{ label: "Normal is under 5%" }} />
            <KpiCard label="Long TXT labels" value="2,413" tone="danger" delta={{ label: "One host, one domain", intent: "bad", direction: "up" }} />
            <KpiCard label="Resolvers outside policy" value="2" unit="hosts" tone="warning" delta={{ label: "Use 192.0.2.53 only" }} />
          </KpiGrid>
          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="Most queried names">
              <BarList label="Most queried DNS names" items={dnsQueries} />
            </Panel>
            <Panel title="Response codes" description="Per hour">
              <StackedBarChart
                label="DNS response codes per hour"
                categories={hours}
                height={160}
                xTicks={6}
                segments={[
                  { id: "noerror", name: "NOERROR" },
                  { id: "nx", name: "NXDOMAIN", color: TONE_COLORS.warning },
                  { id: "fail", name: "SERVFAIL", color: TONE_COLORS.danger },
                ]}
                values={hours.map((_, i) => [400 + Math.round(120 * Math.sin(i / 4)), 14 + (i % 5), i % 7 === 0 ? 3 : 0])}
              />
            </Panel>
          </div>
          <Panel title="Query types" flush>
            <DataTable
              label="DNS query types"
              rows={[
                { id: "A", n: 7_900_000, pct: 63.7, note: "IPv4 address" },
                { id: "AAAA", n: 3_100_000, pct: 25.0, note: "IPv6 address" },
                { id: "TXT", n: 610_000, pct: 4.9, note: "Includes 2,413 tunnel queries" },
                { id: "SRV", n: 420_000, pct: 3.4, note: "Kubernetes and LDAP" },
                { id: "PTR", n: 370_000, pct: 3.0, note: "Reverse lookups" },
              ]}
              getRowId={(r) => r.id}
              minWidth={560}
              columns={[
                { id: "type", header: "qtype", mono: true, cell: (r) => r.id },
                { id: "n", header: "Queries", align: "right", mono: true, sortValue: (r) => r.n, cell: (r) => r.n.toLocaleString("en-US") },
                { id: "pct", header: "Share", align: "right", mono: true, cell: (r) => `${r.pct}%` },
                { id: "note", header: "Note", cell: (r) => <span className="text-fg-muted">{r.note}</span> },
              ]}
            />
          </Panel>
        </>
      )}
      {tab === "tls" && (
        <>
          <KpiGrid>
            <KpiCard label="Handshakes · 24 h" value="8.1M" trend={wave(24, { base: 340, amp: 110, seed: 97 })} />
            <KpiCard label="TLS 1.3" value="81%" tone="success" />
            <KpiCard label="Legacy TLS 1.0/1.1" value="88" unit="sessions" tone="warning" delta={{ label: "1 server: legacy.example.com" }} />
            <KpiCard label="Known-bad JA3" value="412" tone="danger" delta={{ label: "Cobalt Strike default profile", intent: "bad" }} />
          </KpiGrid>
          <Panel title="TLS servers" description="By SNI, with certificate and fingerprint" flush>
            <DataTable
              label="TLS servers"
              rows={TLS_SERVERS}
              getRowId={(t) => t.id}
              minWidth={1040}
              columns={[
                {
                  id: "sni",
                  header: "SNI",
                  cell: (t) => (
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-mono text-xs">{t.sni}</span>
                      {t.flag && <span className="truncate text-2xs text-danger-text">{t.flag}</span>}
                    </span>
                  ),
                },
                { id: "ver", header: "Version", mono: true, cell: (t) => <span className={t.version === "TLSv1.0" ? "text-warning-text" : undefined}>{t.version}</span> },
                { id: "cipher", header: "Cipher", cell: (t) => <span className="block max-w-[220px] truncate font-mono text-2xs">{t.cipher}</span> },
                { id: "ja3s", header: "JA3S", description: "Fingerprint of the server's TLS hello.", cell: (t) => <span className="block max-w-[150px] truncate font-mono text-2xs text-fg-muted">{t.ja3s}</span> },
                { id: "issuer", header: "Issuer", cell: (t) => t.issuer },
                { id: "exp", header: "Certificate", cell: (t) => <span className={t.expires.startsWith("expired") || t.expires === "in 3 d" ? "whitespace-nowrap text-danger-text" : "whitespace-nowrap text-fg-muted"}>{t.expires}</span> },
                { id: "conns", header: "Sessions", align: "right", mono: true, sortValue: (t) => t.conns, cell: (t) => t.conns.toLocaleString("en-US") },
              ]}
            />
          </Panel>
        </>
      )}
      {tab === "http" && (
        <>
          <KpiGrid>
            <KpiCard label="Requests · 24 h" value="1.2M" unit="cleartext" trend={wave(24, { base: 50, amp: 20, seed: 98 })} />
            <KpiCard label="5xx responses" value="0.4%" />
            <KpiCard label="Executable downloads" value="17" unit="files" tone="warning" delta={{ label: "Sent to Malware for scanning" }} />
            <KpiCard label="Scanner user agents" value="212" tone="danger" />
          </KpiGrid>
          <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <Panel title="User agents">
              <BarList label="HTTP user agents" items={HTTP_UA} />
            </Panel>
            <Panel title="Methods and status codes">
              <BarList
                label="HTTP methods and status codes"
                items={[
                  { id: "get", label: "GET · 2xx", value: 980_000 },
                  { id: "post", label: "POST · 2xx", value: 140_000 },
                  { id: "get4", label: "GET · 4xx", value: 61_000, color: TONE_COLORS.warning },
                  { id: "put", label: "PUT · 2xx", value: 12_000 },
                  { id: "get5", label: "GET · 5xx", value: 4_800, color: TONE_COLORS.danger },
                ]}
              />
            </Panel>
          </div>
        </>
      )}
    </>
  );
}

function RulesPage() {
  const [sets, setSets] = useState(RULESETS);
  const [custom, setCustom] = useState(CUSTOM_RULES);
  const [text, setText] = useState('alert http $EXTERNAL_NET any -> $HOME_NET any (msg:"LOCAL Admin path probe"; http.uri; content:"/admin"; sid:9000104; rev:1;)');
  const [check, setCheck] = useState<{ ok: boolean; msg: string } | null>(null);
  const [notice, setNotice] = useState("");
  const validate = () => {
    const sid = /sid:(\d+);/.exec(text);
    const msg = /msg:"([^"]+)"/.exec(text);
    if (!/^(alert|drop|pass|reject)\s/.test(text) || !sid || !msg) {
      setCheck({ ok: false, msg: "Rule needs an action, a msg and a sid." });
      return null;
    }
    setCheck({ ok: true, msg: `Valid · sid ${sid[1]} · would have matched 6 flows in the last 24 h` });
    return { sid: Number(sid[1]), msg: msg[1]! };
  };
  return (
    <>
      <PageHeader title="Rules" description="Suricata rulesets, local rules and suppressions. Changes reload sensors without dropping packets." actions={<Button variant="primary" icon={<RefreshCw />}>Update rulesets</Button>} />
      {notice && <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />}
      <KpiGrid>
        <KpiCard label="Rules loaded" value="54,703" unit="on 4 sensors" />
        <KpiCard label="Local rules" value={String(212 + custom.length - CUSTOM_RULES.length)} delta={{ label: "3 written this month" }} />
        <KpiCard label="Suppressed" value="41" unit="SIDs" delta={{ label: "3 with an expiry" }} />
        <KpiCard label="Last reload" value="04:00" unit="today" delta={{ label: "Took 21 s per sensor" }} />
      </KpiGrid>
      <Panel title="Rulesets" flush>
        <DataTable
          label="Rulesets"
          rows={sets}
          getRowId={(r) => r.id}
          minWidth={820}
          columns={[
            {
              id: "name",
              header: "Ruleset",
              cell: (r) => (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{r.name}</span>
                  <span className="truncate text-2xs text-fg-muted">{r.source}</span>
                </span>
              ),
            },
            { id: "rules", header: "Rules", align: "right", mono: true, sortValue: (r) => r.rules, cell: (r) => r.rules.toLocaleString("en-US") },
            { id: "enabled", header: "Enabled", align: "right", mono: true, description: "Rules enabled after local disable lists are applied.", cell: (r) => (r.on ? r.enabled.toLocaleString("en-US") : "0") },
            { id: "updated", header: "Updated", cell: (r) => <span className="whitespace-nowrap text-fg-muted">{r.updated}</span> },
            {
              id: "on",
              header: "Active",
              width: "90px",
              hideable: false,
              cell: (r) => (
                <Switch
                  checked={r.on}
                  onCheckedChange={(v) => {
                    setSets((ss) => ss.map((s) => (s.id === r.id ? { ...s, on: v } : s)));
                    setNotice(`${r.name} ${v ? "enabled" : "disabled"} · reloading 4 sensors`);
                  }}
                  label={<span className="sr-only">Use {r.name}</span>}
                />
              ),
            },
          ]}
        />
      </Panel>
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="Write a local rule" description="Suricata 7 syntax · SIDs 9,000,000 and up">
          <form
            aria-label="Local rule editor"
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              const r = validate();
              if (!r) return;
              setCustom((cs) => [...cs, { id: `r${cs.length + 1}`, sid: r.sid, msg: r.msg, text, hits: 0, author: "Emily Clark" }]);
              setNotice(`Saved sid ${r.sid} · deployed to 4 sensors`);
            }}
          >
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-fg">Rule</span>
              <textarea value={text} onChange={(e) => (setText(e.target.value), setCheck(null))} rows={4} spellCheck={false} className="w-full rounded-md border border-line-strong bg-surface px-2.5 py-1.5 font-mono text-xs text-fg" />
            </label>
            {check && (
              <span role="status" className={check.ok ? "text-xs text-success" : "text-xs text-danger-text"}>
                {check.msg}
              </span>
            )}
            <div className="flex gap-2">
              <Button type="button" size="sm" onClick={validate}>
                Validate
              </Button>
              <Button type="submit" size="sm" variant="primary">
                Save and deploy
              </Button>
            </div>
          </form>
        </Panel>
        <Panel title="Suppressions" description="Known-good traffic that should not alert" flush>
          <ul className="flex flex-col" aria-label="Suppressions">
            {SUPPRESSIONS.map((s) => (
              <li key={s.sid} className="flex flex-col gap-0.5 border-b border-subtle px-3 py-2 last:border-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm">{s.msg}</span>
                  <span className="font-mono text-2xs text-fg-muted">sid:{s.sid}</span>
                </span>
                <span className="text-2xs text-fg-muted">
                  {s.scope} · by {s.by} · until {s.until}
                </span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Local rules" description={`${custom.length} rules`} flush>
        <DataTable
          label="Local rules"
          rows={custom}
          getRowId={(r) => r.id}
          minWidth={900}
          columns={[
            { id: "sid", header: "SID", mono: true, width: "100px", sortValue: (r) => r.sid, cell: (r) => r.sid },
            {
              id: "msg",
              header: "Rule",
              cell: (r) => (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate font-medium">{r.msg}</span>
                  <span className="truncate font-mono text-2xs text-fg-muted">{r.text}</span>
                </span>
              ),
            },
            { id: "hits", header: "Hits · 24 h", align: "right", mono: true, sortValue: (r) => r.hits, cell: (r) => r.hits.toLocaleString("en-US") },
            { id: "author", header: "Author", cell: (r) => r.author },
          ]}
        />
      </Panel>
    </>
  );
}

function SensorsPage() {
  const [restarted, setRestarted] = useState<string[]>([]);
  return (
    <>
      <PageHeader title="Sensors" description="Capture points, interfaces and packet loss. Drop rate above 1% means rules miss traffic." meta={<StatusBadge tone="warning">1 degraded</StatusBadge>} actions={<Button variant="primary" icon={<Plus />}>Add sensor</Button>} />
      <Callout tone="warning" title="nids-edge-fra drops 1.8% of packets">
        CPU is at 92% with 2 workers on a 1 Gbps link. Add workers or move the sensor to a larger host.
      </Callout>
      <div className="grid gap-2.5 lg:grid-cols-2">
        {SENSORS.map((s) => (
          <Panel
            key={s.id}
            aria-label={`Sensor ${s.id}`}
            title={<span className="font-mono">{s.id}</span>}
            description={s.site}
            actions={s.status === "healthy" ? <StatusBadge tone="success">Healthy</StatusBadge> : <StatusBadge tone="warning">Degraded</StatusBadge>}
          >
            <div className="flex flex-col gap-2.5">
              <dl className="grid grid-cols-5 gap-2 text-sm">
                <div>
                  <dt className="text-2xs text-fg-muted">Traffic</dt>
                  <dd className="font-mono font-semibold">{s.gbps} Gbps</dd>
                </div>
                <div>
                  <dt className="text-2xs text-fg-muted">Dropped</dt>
                  <dd className={s.drop >= 1 ? "font-mono font-semibold text-warning-text" : "font-mono font-semibold"}>{s.drop}%</dd>
                </div>
                <div>
                  <dt className="text-2xs text-fg-muted">CPU</dt>
                  <dd className="font-mono font-semibold">{s.cpu}%</dd>
                </div>
                <div>
                  <dt className="text-2xs text-fg-muted">Memory</dt>
                  <dd className="font-mono font-semibold">{s.mem}%</dd>
                </div>
                <div>
                  <dt className="text-2xs text-fg-muted">Events/s</dt>
                  <dd className="font-mono font-semibold">{s.eps.toLocaleString("en-US")}</dd>
                </div>
              </dl>
              <Sparkline data={s.drops} label={`Packet drop rate for ${s.id}, last 24 hours`} height={28} color={s.drop >= 1 ? "var(--oa-warning)" : undefined} format={(v) => `${v.toFixed(2)}%`} />
              <table className="w-full text-sm">
                <caption className="sr-only">Interfaces on {s.id}</caption>
                <thead>
                  <tr className="text-left text-2xs text-fg-muted">
                    <th className="py-1 font-medium">Interface</th>
                    <th className="py-1 font-medium">Mode</th>
                    <th className="py-1 font-medium">Speed</th>
                    <th className="py-1 text-right font-medium">Util.</th>
                    <th className="py-1 text-right font-medium">Drops</th>
                  </tr>
                </thead>
                <tbody>
                  {s.ifaces.map((i) => (
                    <tr key={i.name} className="border-t border-subtle">
                      <td className="py-1 font-mono text-xs">{i.name}</td>
                      <td className="py-1 text-xs text-fg-muted">{i.mode}</td>
                      <td className="py-1 text-xs">{i.speed}</td>
                      <td className="py-1 text-right font-mono text-xs">{i.util}%</td>
                      <td className="py-1 text-right font-mono text-xs">{i.drops}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-2">
                <span className="text-2xs text-fg-muted">
                  {s.version} · up {s.uptime}
                </span>
                {restarted.includes(s.id) ? (
                  <span role="status" className="text-xs text-success">
                    Capture restarted on {s.id}
                  </span>
                ) : (
                  <Button size="xs" icon={<RotateCcw />} aria-label={`Restart capture on ${s.id}`} onClick={() => setRestarted((r) => [...r, s.id])}>
                    Restart capture
                  </Button>
                )}
              </div>
            </div>
          </Panel>
        ))}
      </div>
      <Panel title="Inspected traffic" description="Gbps per sensor, last 24 h">
        <TimeSeriesChart
          label="Inspected traffic per sensor"
          labels={hours}
          stacked
          height={170}
          format={(v) => `${v.toFixed(1)} Gbps`}
          series={SENSORS.map((s, i) => ({ id: s.id, name: s.id, data: wave(HOURS, { base: s.gbps, amp: s.gbps * 0.4, seed: 100 + i }) }))}
        />
      </Panel>
    </>
  );
}

function PcapPage() {
  const [rows, setRows] = useState(CAPTURES);
  const [sensor, setSensor] = useState("nids-core-01");
  const [filter, setFilter] = useState("");
  const [duration, setDuration] = useState("10");
  const [notice, setNotice] = useState("");
  return (
    <>
      <PageHeader title="PCAP" description="Full packet capture on demand. Critical and high alerts capture 60 s around the flow automatically. Kept 14 days." />
      {notice && (
        <Callout tone="success" title={notice} onDismiss={() => setNotice("")} />
      )}
      <div className="grid gap-2.5 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <Panel title="New capture" description="BPF filter on one sensor">
          <form
            aria-label="New capture"
            className="flex flex-col gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              if (!filter.trim()) return;
              const id = `pc-${119 + rows.length - CAPTURES.length}`;
              setRows((rs) => [{ id, name: `Capture ${filter.trim()}`, sensor, filter: filter.trim(), requested: "Just now", by: "Emily Clark", size: 0, packets: 0, status: "queued" }, ...rs]);
              setFilter("");
              setNotice(`${id} queued on ${sensor} for ${duration} minutes`);
            }}
          >
            <SelectField label="Sensor" value={sensor} onChange={(e) => setSensor(e.target.value)} options={SENSORS.map((s) => ({ value: s.id, label: s.id }))} />
            <TextField label="BPF filter" mono placeholder="host 192.0.2.17 and port 53" value={filter} onChange={(e) => setFilter(e.target.value)} hint="Berkeley Packet Filter syntax, as in tcpdump." />
            <div className="grid grid-cols-2 gap-2.5">
              <SelectField label="Duration" value={duration} onChange={(e) => setDuration(e.target.value)} options={[{ value: "1", label: "1 minute" }, { value: "10", label: "10 minutes" }, { value: "60", label: "1 hour" }]} />
              <SelectField label="Size limit" defaultValue="1g" options={[{ value: "100m", label: "100 MB" }, { value: "1g", label: "1 GB" }, { value: "10g", label: "10 GB" }]} />
            </div>
            <div>
              <Button type="submit" variant="primary" icon={<FileArchive />}>
                Start capture
              </Button>
            </div>
          </form>
        </Panel>
        <Panel title="Captures" description={`${rows.length} captures · 1.2 GB of 50 GB used`} flush>
          <DataTable
            label="Captures"
            rows={rows}
            getRowId={(r) => r.id}
            minWidth={880}
            columns={[
              {
                id: "name",
                header: "Capture",
                cell: (r) => (
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">{r.name}</span>
                    <span className="truncate font-mono text-2xs text-fg-muted">
                      {r.id} · {r.filter}
                    </span>
                  </span>
                ),
              },
              { id: "sensor", header: "Sensor", mono: true, cell: (r) => r.sensor },
              { id: "req", header: "Requested", cell: (r) => <span className="flex flex-col whitespace-nowrap"><span>{r.requested}</span><span className="text-2xs text-fg-muted">{r.by}</span></span> },
              { id: "size", header: "Size", align: "right", mono: true, sortValue: (r) => r.size, cell: (r) => (r.size ? formatBytes(r.size) : "–") },
              { id: "pk", header: "Packets", align: "right", mono: true, cell: (r) => (r.packets ? r.packets.toLocaleString("en-US") : "–") },
              { id: "status", header: "Status", sortValue: (r) => r.status, cell: (r) => <StatusBadge tone={CAPTURE_STATUS[r.status].tone}>{CAPTURE_STATUS[r.status].label}</StatusBadge> },
              {
                id: "act",
                header: <span className="sr-only">Actions</span>,
                label: "Actions",
                width: "48px",
                align: "right",
                hideable: false,
                cell: (r) =>
                  r.status === "ready" ? (
                    <IconButton label={`Download ${r.id}.pcap`} size="xs" onClick={() => setNotice(`Downloading ${r.id}.pcap · ${formatBytes(r.size)}`)}>
                      <Download />
                    </IconButton>
                  ) : null,
              },
            ]}
          />
        </Panel>
      </div>
    </>
  );
}

const PAGES = {
  alerts: () => <AlertsPage />,
  flows: () => <FlowsPage />,
  protocols: () => <ProtocolsPage />,
  rules: () => <RulesPage />,
  sensors: () => <SensorsPage />,
  pcap: () => <PcapPage />,
};

const app = (initial: string): Story => ({ render: () => <ProductApp product="network-ids" nav={nav} pages={PAGES} initial={initial} /> });

/* ------------------------------------------------------------------ */
/* Stories                                                             */
/* ------------------------------------------------------------------ */

/** Alerts: Suricata detections from 4 sensors, with the Zeek flow behind each alert. */
export const Alerts: Story = {
  ...app("alerts"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("heading", { level: 1, name: "Alerts" })).toBeInTheDocument();
    await expect(c.getByText("Select an alert to see bytes, JA3 and Zeek logs")).toBeInTheDocument();
    const table = c.getByRole("table", { name: "Alerts" });
    await userEvent.click(within(table).getByText("ET POLICY Possible data exfiltration via DNS tunnel"));
    const detail = c.getByRole("region", { name: "Flow detail" });
    await expect(within(detail).getByText("192.0.2.17:53122 → 203.0.113.53:53")).toBeInTheDocument();
    await expect(within(detail).getByText("41 m 06 s")).toBeInTheDocument();
    await expect(within(detail).getByText(/aGVsbG8\.d2b1\.tunnel\.example\.com/)).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-row-id="a1"]')).toHaveClass("bg-accent-soft");
  },
};

export const Flows: Story = {
  ...app("flows"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const table = c.getByRole("table", { name: "Flows" });
    await userEvent.type(c.getByRole("textbox", { name: "Zeek query" }), "service:ssh");
    await userEvent.click(c.getByRole("button", { name: "Run" }));
    await expect(within(table).getAllByRole("row")).toHaveLength(3);
    await userEvent.click(within(table).getByText("Cr1Pk8d"));
    await expect(c.getByRole("region", { name: "Connection detail" })).toHaveTextContent("Responder aborted");
  },
};

export const Protocols: Story = {
  ...app("protocols"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("table", { name: "DNS query types" })).toBeInTheDocument();
    await userEvent.click(c.getByRole("tab", { name: /TLS/ }));
    await expect(within(c.getByRole("table", { name: "TLS servers" })).getByText("legacy.example.com")).toBeInTheDocument();
  },
};

export const Rules: Story = {
  ...app("rules"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("switch", { name: "Use PT Research attack detection" }));
    await expect(c.getByText("PT Research attack detection enabled · reloading 4 sensors")).toBeInTheDocument();
    const form = within(c.getByRole("form", { name: "Local rule editor" }));
    await userEvent.click(form.getByRole("button", { name: "Save and deploy" }));
    await expect(within(c.getByRole("table", { name: "Local rules" })).getByText("LOCAL Admin path probe")).toBeInTheDocument();
  },
};

export const Sensors: Story = {
  ...app("sensors"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Restart capture on nids-edge-fra" }));
    await expect(c.getByText("Capture restarted on nids-edge-fra")).toBeInTheDocument();
  },
};

export const Pcap: Story = {
  name: "PCAP",
  ...app("pcap"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const form = within(c.getByRole("form", { name: "New capture" }));
    await userEvent.type(form.getByLabelText("BPF filter"), "host 192.0.2.44");
    await userEvent.click(form.getByRole("button", { name: "Start capture" }));
    await expect(c.getByText("pc-119 queued on nids-core-01 for 10 minutes")).toBeInTheDocument();
    await userEvent.click(c.getByRole("button", { name: "Download pc-117.pcap" }));
    await expect(c.getByText(/Downloading pc-117\.pcap/)).toBeInTheDocument();
  },
};

export const Integrations: Story = app("integrations");
export const Settings: Story = {
  ...app("settings"),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("tab", { name: "Data & GDPR" }));
    await expect(c.getByText(/Data subject access and erasure/)).toBeInTheDocument();
  },
};
