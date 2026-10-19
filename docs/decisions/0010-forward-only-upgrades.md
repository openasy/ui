# 0010. Forward-only upgrades, no backward compatibility

- **Status:** Accepted
- **Area:** Engineering

## Context

Supporting old versions and downgrade paths slows everyone down and keeps insecure code alive.

## Decision

- Versions follow SemVer, per product (ADR 0019). Each release migrates its database forward on start.
- There are no down-migrations and no support for older majors. To roll back, restore the backup taken automatically before the upgrade.
- Breaking changes are listed in release notes with the exact steps to take.

## Consequences

- Backups (ADR 0012) are mandatory before an upgrade, and the product refuses to upgrade without a fresh one.
