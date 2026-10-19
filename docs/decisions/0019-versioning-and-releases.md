# 0019. Versioning: independent SemVer per product, monthly releases

- **Status:** Accepted
- **Area:** Engineering

## Context

38 products move at different speeds, but they integrate through each other's APIs and there is no backward compatibility (ADR 0010). People need to know which versions work together and when to expect upgrades.

## Decision

- Every product, every agent (ADR 0018) and `@openasy/ui` has its own version: MAJOR.MINOR.PATCH (SemVer). An agent always has the same version as its product.
- MAJOR changes when anything a user or another product relies on breaks: the public API, configuration, the CLI or the data format. MINOR adds features. PATCH only fixes bugs.
- Each product releases once a month when it has changes. Security fixes and critical bugs ship as a PATCH at any time; a critical security fix ships within 72 hours.
- Each product declares what it needs from others in a manifest, for example `requires: { identity: ">=2.1 <3" }`. A product refuses to link to an incompatible version and says which version to install.
- The site publishes a compatibility table generated from these manifests.
- The latest release of each product is supported, plus its current LTS lines (ADR 0020). Fixes go into a new release; only security and critical fixes are backported, and only to LTS lines. You can upgrade from any version straight to the latest; migrations run in order (ADR 0010).
- Container images are tagged `2.3.1`, `2.3` and `2`. There is no `latest` tag, so an upgrade to a new major is always a decision.
- Every release has notes listing breaking changes and the exact steps to take.

## Consequences

- Products can be upgraded one at a time; a major upgrade of one product may require upgrading the products it links to, and the manifest says so before anything breaks.
- Enterprise support customers get security advisories before the public release (ADR 0008).
