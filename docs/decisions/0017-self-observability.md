# 0017. Every product can be monitored

- **Status:** Accepted
- **Area:** Operations

## Context

Tools that watch your systems must themselves be watched.

## Decision

- Each product exposes `/healthz` (liveness), `/readyz` (readiness) and `/metrics` (Prometheus).
- Logs are structured JSON on stdout with trace ids.

## Consequences

- Uptime, Metrics and Logs can monitor every other OpenAsy product with no extra setup.
