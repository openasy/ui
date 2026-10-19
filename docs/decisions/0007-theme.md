# 0007. Theme: light, dark and follow the system

- **Status:** Accepted (light, dark) · Planned (follow system)
- **Area:** Product

## Context

People work in bright offices and in dark NOCs.

## Decision

- Every colour is a token with a light and a dark value; components never use raw colours.
- `BrandProvider` takes `theme="light" | "dark"`. A `"system"` value that follows `prefers-color-scheme` is planned and will be the default.

## Consequences

- Every story is checked in both themes from the Storybook toolbar.

## Where you can see it

- [Colour tokens (switch Theme in the toolbar)](https://openasy.github.io/ui/?path=/story/foundations-overview--colors)
