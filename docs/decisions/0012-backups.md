# 0012. Daily backups and point-in-time restore

- **Status:** Planned
- **Area:** Operations

## Context

Data loss must be recoverable, and people need to know the state of things at a moment in the past.

## Decision

- Every product takes a daily snapshot of its SQLite file (`VACUUM INTO`) and keeps 7 daily, 4 weekly and 12 monthly copies.
- Optionally, every change is streamed continuously to S3-compatible storage (Litestream). This allows restoring to any second inside the retention window.
- Backups are encrypted, and restores are tested automatically once a week.

## Consequences

- "Can we go back in time?" — yes: to any day with snapshots, and to any second with continuous replication.

## Where you can see it

- [Backups product](https://openasy.github.io/ui/?path=/story/products-backups--jobs)
- [Restore tests](https://openasy.github.io/ui/?path=/story/products-backups--restore-tests)
