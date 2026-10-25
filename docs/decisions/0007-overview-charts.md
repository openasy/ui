# 0007. Every product opens on an overview drawn from one set of charts

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `src/charts/DonutChart.tsx`, `src/charts/Gauge.tsx`, `src/charts/StatusStrip.tsx`, `src/components/Kpi.tsx`
- **Area:** Layout

## Context

Six products opened on an overview and fifteen on a list with a row of numbers above it. Someone moving between products had to learn where each one kept its state, and the library had charts for time and ranking but none for parts of a whole, a single ratio or a run of days, so products told those with plain numbers.

## Decision

- Every product opens on an Overview page: a row of `KpiCard`s, the worst first, then panels laid out with `OverviewGrid`, then short lists that lead to the pages where the work is done.
- Each kind of data has one chart:
  - change over time: `TimeSeriesChart` for rates, `StackedBarChart` for counts per day or week;
  - parts of a whole: `DonutChart`, with the total in the middle and each slice's value and share beside it;
  - one ratio: `Gauge`, a half ring whose tone the product chooses, since only it knows whether 86% is good;
  - a run of days or jobs: `StatusStrip`, one bar each, coloured by how it went;
  - a ranking: `BarList`; two dimensions: `Heatmap`.
- States keep the tone colours (`TONE_COLORS`) and severities their tones, so red means the same thing in every product. Other categories take the chart colours in fixed order.
- `KpiCard` takes an `icon`, tinted with its tone, so a row of numbers can be told apart at a glance.
- `OverviewGrid` lays panels side by side: two thirds and one third, halves or thirds, one under another on narrow screens.

## Consequences

- A product's overview needs one `GET /api/v1/overview` that returns what the page draws; the page itself is composed from these parts.
- The numbers that used to sit above a product's list move to its overview, and the list keeps its filters and table.
- Every new chart reads by hover and by keyboard focus, and names what it shows for screen readers (decision 0003).
