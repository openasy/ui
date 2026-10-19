# 0013. Secure by default

- **Status:** Accepted
- **Area:** Security

## Context

Most breaches use defaults nobody changed.

## Decision

- TLS everywhere, including between products. Plain HTTP only redirects.
- No default passwords: the first start prints a one-time link to create the owner.
- Secrets (tokens, keys, passwords) are encrypted at rest.
- Every admin action is written to an append-only audit log that can be streamed to SIEM.

## Consequences

- A fresh install passes our own Posture checks.

## Where you can see it

- [Audit log](https://openasy.github.io/ui/?path=/story/products-identity--audit-log)
