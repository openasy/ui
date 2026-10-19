# @openasy/ui

React component library shared by every [OpenAsy](https://github.com/openasy) product: one shell, one table,
one set of charts, one set of filters and one vocabulary for severity, from VPN and Logs to SIEM and Compliance.

**Storybook:** https://openasy.github.io/ui/ (every component, every product screen, and the latest test results under
_Quality → Test results_).

## Design decisions

What every OpenAsy product is built to do, and why, is recorded in [`docs/decisions/`](./docs/decisions/README.md)
and shown in Storybook under _Platform → Design decisions_.

## Install

```bash
npm install @openasy/ui
```

```tsx
import "@openasy/ui/styles.css";
import { BrandProvider, AppShell, PageHeader } from "@openasy/ui";

<BrandProvider theme="light" brand={{ name: "Acme Shield", accent: "#0f8c7c" }}>
  <AppShell product="logs" nav={[{ id: "explorer", label: "Explorer" }]} activeNav="explorer">
    <PageHeader title="Explorer" />
  </AppShell>
</BrandProvider>;
```

Peer dependency: React 19.

## What's inside

| Area | Components |
| --- | --- |
| Shell | `BrandProvider`, `AppShell`, `ProductSwitcher`, `PageHeader`, `Panel` |
| Data | `DataTable`, `KpiCard`, `KpiGrid`, `EntityChip`, `Avatar` |
| Charts | `TimeSeriesChart`, `ChartSync`, `StackedBarChart`, `Heatmap`, `Sparkline`, `BarList` |
| Filters | `FilterBar`, `TimeRangePicker`, `FacetFilter`, `FilterChip`, `QueryBar`, `SearchInput` |
| Inputs | `Button`, `IconButton`, `TextField`, `SelectField`, `Checkbox`, `Switch`, `SegmentedControl`, `Tabs` |
| Feedback | `Callout`, `Badge`, `StatusBadge`, `SeverityBadge`, `LevelBadge`, `EmptyState` |
| Tokens | `LOG_LEVELS`, `SEVERITIES`, `toLogLevel()`, `toSeverity()`, `PRODUCTS`, format helpers |

### Standard levels

- Log levels: `trace` · `debug` · `info` · `warn` · `error` · `fatal`
- Severities: `critical` · `high` · `medium` · `low` · `info`
- Tones: `neutral` · `info` · `success` · `warning` · `danger` · `critical`

Every product maps its own values onto these (`toLogLevel("warning")`, `toSeverity(9.8)`), so an error looks
the same everywhere.

### White-label

`BrandProvider` accepts `name`, `organization`, `logoUrl`, `logoDarkUrl`, `accent`, `fontFamily` and
`hidePoweredBy`. Hover, soft and focus tones are derived from the accent automatically.

## Develop

Requires Node 26.12+ and npm 11+ (see `.nvmrc`).

```bash
npm ci
npx playwright install chromium   # once, for story tests
npm run dev                       # Storybook on http://localhost:6006
npm test                          # unit tests (jsdom)
npm run test:stories              # every story as a browser test, incl. accessibility
npm run test:ci                   # both, with coverage and HTML/JSON/JUnit reports in ./reports
npm run build                     # library to ./dist
npm run pages                     # what CI publishes: tests, reports, Storybook
```

Coverage thresholds: 90% statements, lines and functions, 85% branches.

## Release

Tag `vX.Y.Z` matching `package.json` and push; the release workflow tests, builds and publishes to npm.

## Licence

[Apache-2.0](./LICENSE)
