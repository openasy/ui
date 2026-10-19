# 0001. Design tokens are CSS variables

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `src/styles/theme.css`, `src/styles/index.css`
- **Area:** Styling

## Context

Products are white-labelled at runtime (platform decision 0004) and switch between light and dark (platform decision 0007). Colours baked in at build time could do neither.

## Decision

- Every colour, shadow and font is a CSS variable named `--oa-*`, defined for light on `:root` and `[data-theme="light"]` and for dark on `[data-theme="dark"]`.
- Components never use raw colours. Tailwind CSS 4 maps the variables to utilities in `@theme inline` (`bg-surface`, `text-fg-muted`, `border-line`), so a class names a role, not a colour.
- A brand sets only `--oa-accent` (and optionally `--oa-font-sans`) through `BrandProvider`. Hover, soft, text-on-soft and focus tones are derived with `color-mix()`.
- Text tokens meet WCAG AA contrast (4.5:1) on every surface token in both themes.

## Consequences

- A new theme or brand is a set of variable values, not a rebuild.
- Products that use the library's CSS get both themes and white-labelling with no extra work.
