# 0020. Long-term support: one LTS line per year

- **Status:** Accepted
- **Area:** Engineering

## Context

Monthly releases (ADR 0019) suit most teams, but some cannot upgrade every month: change windows, audits and certified environments ask for a version that stays put and still gets security fixes.

## Decision

- Once a year, the January release of each product starts a long-term support (LTS) line: its `MAJOR.MINOR`, for example `1.4`.
- An LTS line gets security fixes and fixes for critical bugs for 12 months. When the next LTS line starts, the previous one is supported for 3 more months, so at most two LTS lines are supported at once.
- LTS starts with 1.0. Versions before 1.0 have no LTS line.
- A fix lands on `main` first and is then cherry-picked to the `lts/X.Y` branch and released as a PATCH (`1.4.7`). An LTS patch never adds a database migration; a fix that needs one ships only in the latest release, and the release notes say so.
- Upgrades stay forward-only (ADR 0010). You can upgrade from an LTS line to the next LTS line or to the latest release in one step; migrations run in order.
- An agent follows its product's LTS line: `vpn-server 1.4.x` runs with `vpn-manager 1.4.x` (ADR 0018).
- Image tags do not change: the `X.Y` tag (`1.4`) already follows the LTS line and there is still no `latest` tag. LTS images carry the labels `org.openasy.lts=true` and `org.openasy.lts.eol=<date>`.

## Consequences

- The release workflow accepts tags only from `main` or an `lts/X.Y` branch, and an LTS branch records its end-of-life date in `.github/lts-eol`.
- The update bot also targets active `lts/*` branches for security updates.
- The site's compatibility table (ADR 0019) shows each LTS line and its end-of-life date.
