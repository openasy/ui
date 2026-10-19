# 0015. Your data stays yours

- **Status:** Accepted
- **Area:** Privacy

## Context

Security and operations data is among the most sensitive data a company has.

## Decision

- No telemetry, no phone-home, no external fonts or CDNs at runtime.
- Products install and run air-gapped.
- Every product has retention settings and can export or delete data about a person (GDPR Art. 15 and 17).

## Consequences

- The Assistant runs a model inside your network and is read-only.

## Where you can see it

- [Assistant sources](https://openasy.github.io/ui/?path=/story/products-assistant--sources)
