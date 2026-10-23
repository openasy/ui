# 0006. The library's own words are translated

- **Decision:** Accepted
- **Implementation:** Implemented
- **Where:** `src/messages/*.json`, `src/lib/i18n.ts`, `src/components/Locale.tsx`, `src/components/BrandProvider.tsx`, `src/components/LanguageMenu.tsx`
- **Area:** Behaviour

## Context

The shell, tables, filters, dialogs, charts and severity badges carry words of their own: "Settings", "Previous", "Clear filters", "Critical". A product that wants to speak Turkish or German could translate its pages but not these, so every screen would mix languages.

## Decision

- Translations use [i18next](https://www.i18next.com), with one JSON file per language. `src/messages/en.json`, `tr.json` and `de.json` hold every word the library shows (`LOCALES`), in i18next's `ui` namespace, with `{{name}}` placeholders. A test checks every language has every key with the same placeholders.
- The page has one i18next instance (`i18n`), whose own language never changes: each `BrandProvider` reads it through `getFixedT(locale)`, so two providers with different locales on one page keep theirs.
- `BrandProvider` takes `locale`, English by default, and sets `lang` on its element (on `<html>` with `root`). Components read it with `useT()`.
- `useLocalePreference()` keeps the person's choice in `localStorage` under `oa-locale` and syncs it across tabs, like the theme (decision 0002). Without a choice it follows the browser's language, English when that is not supported.
- A product keeps its own words in `messages/<locale>.json` files and registers them under its namespace with `defineMessages("vpn", { en, tr, de })`, which returns its `useT`. A product not translated yet passes `{ en }` alone, and other languages show its English. Keys come from `en.json`, and a key missing in another language fails the typecheck. `messageProblems({ en, tr, de })` also lists empty texts, extra keys and other placeholders, for the product's tests.
- `AppShell` shows `LanguageMenu` next to the theme menu when given `onLanguageChange`. It lists `LOCALES` by their own names unless the product passes `languages`.

## Consequences

- A product adds a language in two steps: pass `useLocalePreference()` to `BrandProvider` and `AppShell`, then translate its own pages in JSON files read with `defineMessages()`. Until it does, nothing changes and no language menu appears.
- Numbers and dates are still formatted for English (`formatNumber` and friends); making them follow the locale is a later step.
- Translators edit JSON files, which i18next tooling and translation services read as they are.
- Log levels (TRACE to FATAL) stay as they are, since they are the words people search logs for.
