# 0007. Theme: light, dark and follow the system

- **Status:** Accepted
- **Area:** Product

## Context

People work in bright offices and in dark NOCs.

## Decision

- Every colour is a token with a light and a dark value; components never use raw colours.
- `BrandProvider` takes `theme="system" | "light" | "dark"`. `"system"` follows `prefers-color-scheme` and is the default.
- People choose with `ThemeToggle` (system, light, dark). The choice is remembered in the browser; prerendered pages apply it before the first paint with `themeScript()`.

## Consequences

- Every story is checked in both themes from the Storybook toolbar.

## Where you can see it

- [Colour tokens (switch Theme in the toolbar)](https://openasy.github.io/ui/?path=/story/foundations-overview--colors)
