/**
 * Translations with i18next. Each language is a JSON file: the library's own
 * words (shell, tables, filters, dialogs, charts and levels) are in
 * src/messages/<locale>.json under the "ui" namespace, and a product adds its
 * own files under its namespace with defineMessages(). They follow the locale
 * set on BrandProvider.
 */
import i18next, { type i18n as I18n } from "i18next";
import de from "../messages/de.json";
import en from "../messages/en.json";
import tr from "../messages/tr.json";

export const LOCALES = ["en", "tr", "de"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each locale by its own name, for a language menu. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", tr: "Türkçe", de: "Deutsch" };

export const LOCALE_STORAGE_KEY = "oa-locale";

/** One language's messages, as in a messages/<locale>.json file: strings, grouped in objects. */
export interface Messages {
  [key: string]: string | Messages;
}

/** "group.name" for every string in a Messages tree. */
export type MessageKey<M> = {
  [K in keyof M & string]: M[K] extends string ? K : `${K}.${MessageKey<M[K]>}`;
}[keyof M & string];

/** Values for the {{name}} placeholders of a message. */
export type MessageValues = Record<string, string | number>;
export type Translate<K extends string = string> = (key: K, values?: MessageValues) => string;

/** The library's messages in every locale. */
export const UI_MESSAGES: Record<Locale, typeof en> = { en, tr, de };
export type UiMessageKey = MessageKey<typeof en>;

/** One i18next instance for the page. The library's words are its "ui" namespace. */
export const i18n: I18n = i18next.createInstance();
void i18n.init({
  resources: Object.fromEntries(LOCALES.map((l) => [l, { ui: UI_MESSAGES[l] }])),
  lng: "en",
  fallbackLng: "en",
  supportedLngs: [...LOCALES],
  ns: ["ui"],
  defaultNS: "ui",
  // React escapes what it renders.
  interpolation: { escapeValue: false },
  initAsync: false,
});

const fixed = new Map<string, Translate>();

/**
 * `t(key, values)` for a namespace in one locale. The instance's own language is never changed, so two
 * BrandProviders with different locales on one page each keep theirs.
 */
export function fixedT(locale: Locale, ns: string): Translate {
  const id = `${locale}:${ns}`;
  let t = fixed.get(id);
  if (!t) {
    const f = i18n.getFixedT(locale, ns);
    t = (key, values) => String(f(key, values));
    fixed.set(id, t);
  }
  return t;
}

/** A library message in the locale, with each {{name}} filled in. */
export function translate(locale: Locale, key: UiMessageKey, values?: MessageValues): string {
  return fixedT(locale, "ui")(key, values);
}

/** A supported locale from a tag such as "tr-TR"; English when none matches. */
export function toLocale(tag: string | null | undefined): Locale {
  const base = (tag ?? "").toLowerCase().split(/[-_]/)[0];
  return (LOCALES as readonly string[]).includes(base ?? "") ? (base as Locale) : "en";
}

/** A product's messages: English always, other languages once they are translated. */
export type MessageBundles<M extends Messages = Messages> = { en: M } & Partial<Record<Exclude<Locale, "en">, M>>;

/** Adds a product's messages under its namespace. defineMessages() calls it. A language without a file shows English. */
export function addMessages(ns: string, bundles: MessageBundles) {
  for (const locale of LOCALES) {
    const messages = bundles[locale];
    if (messages) i18n.addResourceBundle(locale, ns, messages, true, true);
  }
}

function flatten(messages: Messages, prefix = ""): Map<string, string> {
  const out = new Map<string, string>();
  for (const [key, value] of Object.entries(messages)) {
    if (typeof value === "string") out.set(prefix + key, value);
    else for (const [k, v] of flatten(value, `${prefix}${key}.`)) out.set(k, v);
  }
  return out;
}

const placeholders = (text: string) => [...text.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]).sort().join(",");

/**
 * What is wrong with a product's messages: a key missing, empty or extra in a language given, or using other
 * {{placeholders}} than in English. A product's test expects this to be empty.
 */
export function messageProblems(bundles: MessageBundles): string[] {
  const problems: string[] = [];
  const english = flatten(bundles.en);
  for (const locale of LOCALES) {
    const messages = bundles[locale];
    if (locale === "en" || !messages) continue;
    const other = flatten(messages);
    for (const [key, text] of english) {
      const translated = other.get(key);
      if (!translated) problems.push(`${key}: no ${locale} text`);
      else if (placeholders(translated) !== placeholders(text)) problems.push(`${key}: ${locale} uses other placeholders than en`);
    }
    for (const key of other.keys()) if (!english.has(key)) problems.push(`${key}: in ${locale} but not in en`);
  }
  return problems;
}
