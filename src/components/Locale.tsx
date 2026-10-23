import { useMemo, useSyncExternalStore } from "react";
import { addMessages, fixedT, LOCALE_STORAGE_KEY, toLocale, type Locale, type MessageKey, type Messages, type Translate, type UiMessageKey } from "../lib/i18n";
import { useBrand } from "./BrandProvider";

const CHANGE_EVENT = "oa-locale-change";

function readLocale(storageKey: string): Locale {
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (stored) return toLocale(stored);
  } catch {
    // Storage blocked: fall back to the browser's language.
  }
  return toLocale(navigator.language);
}

/**
 * The person's language, remembered in this browser and kept in sync across
 * tabs. Without a stored choice it follows the browser's language, English
 * when that is not one of LOCALES. Pass it to BrandProvider as `locale`.
 */
export function useLocalePreference(storageKey: string = LOCALE_STORAGE_KEY): [Locale, (next: Locale) => void] {
  const locale = useSyncExternalStore<Locale>(
    (onChange) => {
      const onStorage = (e: StorageEvent) => e.key === storageKey && onChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(CHANGE_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(CHANGE_EVENT, onChange);
      };
    },
    () => readLocale(storageKey),
    () => "en",
  );
  const setLocale = (next: Locale) => {
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [locale, setLocale];
}

/** `t(key, values)` for the library's own words, in the locale of the nearest BrandProvider. */
export function useT(): Translate<UiMessageKey> {
  const { locale } = useBrand();
  return useMemo(() => fixedT(locale, "ui"), [locale]);
}

/**
 * Adds a product's messages, one JSON file per locale, under its namespace and returns its `useT`:
 *
 *   import en from "./messages/en.json"; import tr from "./messages/tr.json"; import de from "./messages/de.json";
 *   export const useT = defineMessages("vpn", { en, tr, de });
 *
 * `t` takes the keys of en.json, and a key missing from tr.json or de.json fails the typecheck.
 */
export function defineMessages<M extends Messages>(ns: string, bundles: { en: M } & Record<Exclude<Locale, "en">, NoInfer<M>>): () => Translate<MessageKey<M>> {
  addMessages(ns, bundles);
  return function useMessages() {
    const { locale } = useBrand();
    return useMemo(() => fixedT(locale, ns), [locale]);
  };
}
