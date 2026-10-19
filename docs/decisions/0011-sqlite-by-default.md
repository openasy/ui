# 0011. SQLite by default

- **Status:** Accepted
- **Area:** Architecture

## Context

Running a database server is a large part of the cost of self-hosting.

## Decision

- Each product stores its data in one SQLite file in WAL mode on a mounted volume. No database server is needed.
- Large time series (logs, metrics, traces) use their own storage engines; SQLite holds configuration and state.
- PostgreSQL may be added later as an option for very large installs.

## Consequences

- One product = one container + one volume. Backing up the volume backs up the product.
