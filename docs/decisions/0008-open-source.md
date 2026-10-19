# 0008. Open source: AGPL-3.0 products, Apache-2.0 library, developed in public

- **Status:** Accepted
- **Area:** Project

## Context

Security tools must be inspectable, and nobody should be locked in. A permissive licence would also let anyone take the products, close them and sell them as a competing service without giving anything back.

## Decision

- Products and their agents (for example `vpn-manager` and `vpn-server`) are published under AGPL-3.0. Anyone may use, change and share them; whoever runs a changed version for others, including as a hosted service, must offer those users the source code under the same licence.
- The UI library `@openasy/ui` and this documentation stay under Apache-2.0, so anyone can build on them.
- A commercial licence without the AGPL obligations is available for organisations that cannot meet them. It covers the same code.
- Contributors sign a contributor licence agreement (CLA) that lets the project offer both licences.
- "OpenAsy" and its logo are trademarks. Neither licence grants the right to use them; forks must use another name.
- Issues, roadmaps and decisions (these ADRs) are public. Changes go through pull requests.
- Each repository has a SECURITY.md with a private disclosure address and response times.

## Consequences

- No closed "enterprise edition" features and no licence keys. The code is the same for everyone, whichever licence covers it.
- The project is funded by support plans (Standard and Enterprise) and commercial licences. Paying never unlocks code.
- Versions released before this decision (`@openasy/ui` 0.1.0, `vpn-manager` 0.1.0) keep the licence they were released under.
