# 0004. Distributed as a GitHub release asset

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `.github/workflows/release.yml`; `vpn` (then `vpn-manager`) installed 0.1.0 this way
- **Area:** Engineering

## Context

Products need the built package. A registry adds accounts and tokens; GitHub Packages needs a token even to install public packages, and installing from git would build the library on every install.

## Decision

- A tag `vX.Y.Z` runs the release workflow: type checks, all tests, the build, then `npm pack`. The tarball is attached to the GitHub release.
- Products depend on the tarball URL, for example `"@openasy/ui": "https://github.com/openasy/ui/releases/download/v0.1.0/openasy-ui-0.1.0.tgz"`. The lock file records its integrity hash.
- A released tarball is never replaced. A fix is a new version.

## Consequences

- Installing needs no token and no registry.
- The update bot does not raise these URLs; a product moves to a new version by changing the URL. Publishing to npm can be added later without changing the package.
