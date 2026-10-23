/**
 * Deterministic sample data for stories. Addresses use the RFC 5737
 * documentation ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24).
 */

/** Small seeded PRNG so stories render the same every time. */
export function rng(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

/** "HH:MM" labels ending at `end` (minutes since midnight), stepping back by `stepMin`. */
export function timeLabels(count: number, stepMin = 15, end = 14 * 60): string[] {
  return Array.from({ length: count }, (_, i) => {
    const m = (((end - (count - 1 - i) * stepMin) % 1440) + 1440) % 1440;
    return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  });
}

export interface WaveOptions {
  base: number;
  amp?: number;
  phase?: number;
  noise?: number;
  /** Adds a bump of this height starting at `spikeAt`. */
  spike?: number;
  spikeAt?: number;
  spikeLen?: number;
  seed?: number;
  min?: number;
}

/** A believable series: daily wave + noise + optional incident bump. */
export function wave(count: number, o: WaveOptions): number[] {
  const r = rng(o.seed ?? 7);
  const amp = o.amp ?? o.base * 0.25;
  const spikeAt = o.spikeAt ?? Math.floor(count * 0.6);
  const spikeLen = o.spikeLen ?? Math.max(4, Math.floor(count / 8));
  return Array.from({ length: count }, (_, i) => {
    let v = o.base + amp * Math.sin(i / (count / 6) + (o.phase ?? 0)) + (r() - 0.5) * 2 * (o.noise ?? amp * 0.15);
    if (o.spike && i >= spikeAt) {
      const t = Math.min(1, (i - spikeAt) / spikeLen);
      v += o.spike * (i - spikeAt < spikeLen ? Math.sin((t * Math.PI) / 2) : 1);
    }
    return Math.max(o.min ?? 0, Math.round(v * 100) / 100);
  });
}

export const PEOPLE = ["Dana Kim", "Emily Clark", "Mark Wilson", "Sarah Chen", "Ben Ortiz", "Amy Davis", "Chris Shaw", "Zoe Adams"] as const;

export const HOSTS = ["api-prod-01", "api-prod-03", "api-prod-05", "worker-prod-04", "worker-prod-09", "db-prod-01", "db-prod-02", "edge-fra-02"] as const;

export function emailOf(name: string): string {
  return `${name.toLowerCase().replace(" ", ".")}@example.com`;
}

export const DOC_IPS = ["203.0.113.24", "198.51.100.7", "203.0.113.181", "198.51.100.96", "203.0.113.9", "192.0.2.44", "198.51.100.201"] as const;

export const CONNECTED = ["infrastructure", "logs", "metrics", "alerts", "vulnerabilities", "incidents"] as const;
export const AVAILABLE = ["vpn", "siem", "audit", "sast", "dast", "malware", "posture", "secrets", "runtime", "access", "compliance", "identity"] as const;

export const USER = { name: "Emily Clark", role: "Owner" };
