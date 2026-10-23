# 0006. The library's own words are translated

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `src/lib/i18n.ts`, `src/components/Locale.tsx`, `src/components/BrandProvider.tsx`, `src/components/LanguageMenu.tsx`
- **Area:** Behaviour

## Context

The shell, tables, filters, dialogs, charts and severity badges carry words of their own: "Settings", "Previous", "Clear filters", "Critical". A product that wants to speak Turkish or German could translate its pages but not these, so every screen would mix languages.

## Decision

- `MESSAGES` in `src/lib/i18n.ts` holds every word the library shows, in English, Turkish and German (`LOCALES`). The type requires each message in each locale, and a test checks they share the same `{placeholders}`.
- `BrandProvider` takes `locale`, English by default, and sets `lang` on its element (on `<html>` with `root`). Components read it with `useT()`.
- `useLocalePreference()` keeps the person's choice in `localStorage` under `oa-locale` and syncs it across tabs, like the theme (decision 0002). Without a choice it follows the browser's language, English when that is not supported.
- A product keeps its own words in a `Catalogue` of the same shape and reads them with `useMessages(catalogue)`. `catalogueProblems(catalogue)` lists what a catalogue misses, for the product's tests.
- `AppShell` shows `LanguageMenu` next to the theme menu when given `onLanguageChange`. It lists `LOCALES` by their own names unless the product passes `languages`.

## Consequences

- A product adds a language in two steps: pass `useLocalePreference()` to `BrandProvider` and `AppShell`, then translate its own pages with `useMessages()`. Until it does, nothing changes and no language menu appears.
- Numbers and dates are still formatted for English (`formatNumber` and friends); making them follow the locale is a later step.
- Log levels (TRACE to FATAL) stay as they are, since they are the words people search logs for.
