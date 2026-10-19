# 0002. How the theme is chosen and applied

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `src/components/Theme.tsx`, `src/components/BrandProvider.tsx`, the OpenAsy site
- **Area:** Behaviour

## Context

Platform decision 0007 asks for system, light and dark, with system as the default and no flash of the wrong theme. Pages may be rendered on the server, where the person's choice and their system setting are unknown.

## Decision

- `BrandProvider` takes `theme="system" | "light" | "dark"` and defaults to `"system"`, which follows `prefers-color-scheme` and updates when it changes. `useBrand().theme` is always the resolved `light` or `dark`.
- `useThemePreference()` keeps the person's choice in `localStorage` under `oa-theme` and syncs it across tabs; `"system"` removes the key. Blocked storage falls back to `"system"`.
- `ThemeToggle` offers the three choices as a radio group with named icon buttons.
- On prerendered pages, `themeScript()` runs inline in `<head>` and sets `data-theme` on `<html>` before the first paint. `<BrandProvider root>` then keeps the theme on `<html>` instead of its own element, and skips its first write during hydration so the server's guess never overrides the script.

## Consequences

- Embedded uses (Storybook, a product inside another page) keep the theme on the provider's own element.
- A product can offer the toggle in its header with two lines of code.
