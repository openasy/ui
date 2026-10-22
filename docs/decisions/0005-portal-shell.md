# 0005. The shell is laid out like a cloud portal

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `src/components/AppShell.tsx`, `src/styles/index.css`, `src/styles/theme.css`
- **Area:** Layout

## Context

The first shell put everything in a 224 px sidebar: the product switcher, the pages, the settings, the user and the theme toggle. Pages sat close under the window edge, the settings links had no heading of their own, and on tablets the full sidebar took a quarter of the width. People who run OpenAsy also use cloud consoles, where a top bar for the whole install and a menu for the current service are familiar.

## Decision

- A dark top bar spans the window in both themes (`--oa-topbar` tokens). It holds the products menu, the brand and product name, an optional `search` field, then on the right the theme menu (`ThemeMenu`: one button showing the current theme, opening system, light and dark) and the account menu.
- The product menu on the left starts with the product and the organization, then `nav` (with an optional `navLabel` heading) and `footerNav` under its own heading, `footerLabel`, "Settings" by default. With eight links or more it offers a filter.
- A `count` marked `attention` is red, so an open outage or a failed job stands out from a plain total.
- From 768 to 1023 px the menu is an 84 px icon rail with labels, using `shortLabel` when set and a dot for counts that need attention. On wider screens it is 256 px and Collapse turns it into the rail; the choice is kept in `localStorage` under `oa-nav-collapsed`. Below 768 px it is a drawer opened from the top bar.
- The page fills the rest, with 24 px of space above it from tablet width up.

## Consequences

- Products keep their `nav` and `footerNav`; they get the new layout by updating `@openasy/ui`. `navLabel`, `shortLabel` and `attention` are optional.
- The theme toggle moved from the bottom of the sidebar to a menu on the right of the top bar (decision 0002). `ThemeToggle` stays for settings pages.
- `ProductSwitcher` stays exported for screens outside the shell; the shell itself opens the same menu from the top bar.
