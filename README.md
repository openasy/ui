# @openasy/ui

React component library shared by every [OpenAsy](https://github.com/openasy) product: one shell, one table,
one set of charts, one set of filters and one vocabulary for severity, from VPN and Logs to SIEM and Compliance.

**Storybook:** https://openasy.github.io/ui/ (every component, every product screen, and the latest test results under
_Quality → Test results_).

## Design decisions

What every OpenAsy product is built to do, and why, is recorded with the site in
[openasy.github.io `docs/decisions`](https://github.com/openasy/openasy.github.io/tree/main/docs/decisions) and shown at
[openasy.github.io/principles](https://openasy.github.io/principles). Decisions about this library itself are in
[`docs/decisions/`](./docs/decisions/README.md) and in Storybook under _Platform → Design decisions_.

## Install

Each release attaches the built package to its [GitHub release](https://github.com/openasy/ui/releases); no registry or token is needed.

```bash
npm install https://github.com/openasy/ui/releases/download/v0.3.0/openasy-ui-0.3.0.tgz
```

```tsx
import "@openasy/ui/styles.css";
import { BrandProvider, AppShell, PageHeader, useThemePreference } from "@openasy/ui";

function App() {
  // System, light or dark, remembered in this browser; AppShell shows the toggle.
  const [theme, setTheme] = useThemePreference();
  return (
    <BrandProvider theme={theme} brand={{ name: "Acme Shield", accent: "#0f8c7c" }}>
      <AppShell product="logs" nav={[{ id: "explorer", label: "Explorer" }]} activeNav="explorer" theme={theme} onThemeChange={setTheme}>
        <PageHeader title="Explorer" />
      </AppShell>
    </BrandProvider>
  );
}
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
| Feedback | `Callout`, `Dialog`, `Badge`, `StatusBadge`, `SeverityBadge`, `LevelBadge`, `EmptyState` |
| Tokens | `LOG_LEVELS`, `SEVERITIES`, `toLogLevel()`, `toSeverity()`, `PRODUCTS`, format helpers |
| Routing | `navigate()`, `usePath()`, `followLinks()` |

### Standard levels

- Log levels: `trace` · `debug` · `info` · `warn` · `error` · `fatal`
- Severities: `critical` · `high` · `medium` · `low` · `info`
- Tones: `neutral` · `info` · `success` · `warning` · `danger` · `critical`

Every product maps its own values onto these (`toLogLevel("warning")`, `toSeverity(9.8)`), so an error looks
the same everywhere.

### Adding things

Adding or creating something opens a `Dialog` over the page, never a form inside it. With `onSubmit` its body and
footer are one form; the primary button goes last in `footer`. A value shown once, such as a token, stays in the same
dialog with `icon` and `iconTone="success"` until it is copied. Escape and the close button close it, a click outside
does not, so a half-filled form is not lost.

### Routing

Pages are paths, `/people/abc`, never `#/people/abc`, so every page can be linked, bookmarked and opened in a new
tab. The product's server answers each page path with its `index.html`. At start, `followLinks(["people", "groups"])`
opens links to those pages without a reload and turns an old `/#/people/abc` address into `/people/abc`; other links,
such as `/api` or another product, are left to the browser. `usePath()` gives the current path, `navigate("/people")`
opens a page from code. `AppShell` links each item to `/<id>` unless it has its own `href`.

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
