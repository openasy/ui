# 0016. One container per product, signed

- **Status:** Accepted
- **Area:** Operations

## Context

Installing should take minutes, and you should be able to verify what you run.

## Decision

- Each product is one container image (`openasy/<product>`), started with `docker compose up` or a Helm chart.
- Images are signed with cosign, ship an SBOM and carry SLSA level 3 provenance.

## Consequences

- You can verify an image before running it: `cosign verify openasy/vpn`.

## Where you can see it

- [Supply Chain → Images](https://openasy.github.io/ui/?path=/story/products-supply-chain--images)
