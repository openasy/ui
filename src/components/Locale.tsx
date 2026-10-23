import { useCallback, useSyncExternalStore } from "react";
import { LOCALE_STORAGE_KEY, toLocale, translate, translateFrom, type Catalogue, type Locale, type MessageKey } from "../lib/i18n";
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

/** `t(key, vars)` in the locale of the nearest BrandProvider. */
export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const { locale } = useBrand();
  return useCallback((key, vars) => translate(locale, key, vars), [locale]);
}

/**
 * `t(key, vars)` for a product's own catalogue, in the locale of the nearest BrandProvider.
 * Define the catalogue outside the component so `t` stays the same between renders.
 */
export function useMessages<K extends string>(catalogue: Catalogue<K>): (key: K, vars?: Record<string, string | number>) => string {
  const { locale } = useBrand();
  return useCallback((key, vars) => translateFrom(catalogue, locale, key, vars), [catalogue, locale]);
}
