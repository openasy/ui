# 0014. API-first

- **Status:** Accepted
- **Area:** Architecture

## Context

Everything you can click should be automatable.

## Decision

- Every screen is backed by a public REST API described with OpenAPI.
- Each product ships a CLI that uses the same API.
- The UI has no private endpoints.

## Consequences

- The API is versioned with the product and follows the same forward-only rule (ADR 0010).

## Where you can see it

- [REST API section in Integrations](https://openasy.github.io/ui/?path=/story/products-vpn--integrations)
