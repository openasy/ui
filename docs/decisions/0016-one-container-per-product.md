# 0016. One container per product, signed

- **Status:** Accepted
- **Area:** Operations

## Context

Installing should take minutes, and you should be able to verify what you run.

## Decision

- Each product is one container image (`openasy/<product>`), started with `docker compose up` or a Helm chart. Agents that run on hosts (ADR 0018) have their own image, for example `openasy/vpn-manager` and `openasy/vpn-server`.
- Images are built and pushed to Docker Hub by GitHub Actions when a version tag is pushed, for `linux/amd64` and `linux/arm64`.
- Images are signed with cosign, ship an SBOM and carry SLSA level 3 provenance.

## Consequences

- You can verify an image before running it:

  ```bash
  cosign verify openasy/vpn-manager:0.1.0 \
    --certificate-identity-regexp '^https://github.com/openasy/vpn-manager/' \
    --certificate-oidc-issuer https://token.actions.githubusercontent.com
  ```

## Where you can see it

- [Supply Chain → Images](https://openasy.github.io/ui/?path=/story/products-supply-chain--images)
