# Design decisions

Architecture decision records for OpenAsy. Each one says what we decided, why, and what follows from it.

| # | Decision | Area | Status |
| --- | --- | --- | --- |
| 0001 | [Every product runs alone, with the others and with third-party tools](./0001-standalone-and-together.md) | Architecture | Accepted |
| 0002 | [Authentication: local accounts, MFA and single sign-on](./0002-authentication.md) | Security | Accepted |
| 0003 | [Authorization: per-product roles and scoped tokens](./0003-authorization.md) | Security | Accepted |
| 0004 | [Customization: white-label and feature switches](./0004-customization.md) | Product | Accepted (white-label) · Planned (feature switches) |
| 0005 | [Accessibility: WCAG 2.2 AA, tested in CI](./0005-accessibility.md) | Quality | Accepted |
| 0006 | [Languages: English first, ready for translation](./0006-languages.md) | Product | Planned |
| 0007 | [Theme: light, dark and follow the system](./0007-theme.md) | Product | Accepted |
| 0008 | [Open source: AGPL-3.0 products, Apache-2.0 library, developed in public](./0008-open-source.md) | Project | Accepted |
| 0009 | [Use the latest libraries](./0009-latest-libraries.md) | Engineering | Accepted |
| 0010 | [Forward-only upgrades, no backward compatibility](./0010-forward-only-upgrades.md) | Engineering | Accepted |
| 0011 | [SQLite by default](./0011-sqlite-by-default.md) | Architecture | Accepted |
| 0012 | [Daily backups and point-in-time restore](./0012-backups.md) | Operations | Planned |
| 0013 | [Secure by default](./0013-secure-by-default.md) | Security | Accepted |
| 0014 | [API-first](./0014-api-first.md) | Architecture | Accepted |
| 0015 | [Your data stays yours](./0015-data-ownership.md) | Privacy | Accepted |
| 0016 | [One container per product, signed](./0016-one-container-per-product.md) | Operations | Accepted |
| 0017 | [Every product can be monitored](./0017-self-observability.md) | Operations | Accepted |
| 0018 | [One application per product; agents on hosts are separate](./0018-one-application-per-product.md) | Architecture | Accepted |
| 0019 | [Versioning: independent SemVer per product, monthly releases](./0019-versioning-and-releases.md) | Engineering | Accepted |
| 0020 | [Long-term support: one LTS line per year](./0020-long-term-support.md) | Engineering | Accepted |

To propose a change, open a pull request that adds a new record or updates the status of an existing one.
