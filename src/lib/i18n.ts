/**
 * The words @openasy/ui shows on its own: shell, tables, filters, dialogs,
 * charts and levels. A product translates its own pages; these follow the
 * locale set on BrandProvider.
 */

export const LOCALES = ["en", "tr", "de"] as const;
export type Locale = (typeof LOCALES)[number];

/** Each locale by its own name, for a language menu. */
export const LOCALE_NAMES: Record<Locale, string> = { en: "English", tr: "Türkçe", de: "Deutsch" };

export const LOCALE_STORAGE_KEY = "oa-locale";

type Catalogue = Record<Locale, string>;

/** {name} in a message is replaced by the value given for it. */
export const MESSAGES = {
  "shell.openNavigation": { en: "Open navigation", tr: "Menüyü aç", de: "Navigation öffnen" },
  "shell.closeNavigation": { en: "Close navigation", tr: "Menüyü kapat", de: "Navigation schließen" },
  "shell.navigation": { en: "{product} navigation", tr: "{product} menüsü", de: "{product}-Navigation" },
  "shell.switchProduct": { en: "Switch product, current:", tr: "Ürün değiştir, şu anki:", de: "Produkt wechseln, aktuell:" },
  "shell.products": { en: "{brand} products", tr: "{brand} ürünleri", de: "{brand}-Produkte" },
  "shell.connectedProducts": { en: "Connected products", tr: "Bağlı ürünler", de: "Verbundene Produkte" },
  "shell.notConnected": { en: "Not connected", tr: "Bağlı değil", de: "Nicht verbunden" },
  "shell.availableProducts": { en: "Available products", tr: "Bağlanabilecek ürünler", de: "Verfügbare Produkte" },
  "shell.connect": { en: "Connect", tr: "Bağla", de: "Verbinden" },
  "shell.account": { en: "Account", tr: "Hesap", de: "Konto" },
  "shell.settings": { en: "Settings", tr: "Ayarlar", de: "Einstellungen" },
  "shell.integrations": { en: "Integrations", tr: "Entegrasyonlar", de: "Integrationen" },
  "shell.filterMenu": { en: "Filter the menu", tr: "Menüde ara", de: "Menü filtern" },
  "shell.noMatch": { en: "No page matches.", tr: "Eşleşen sayfa yok.", de: "Keine passende Seite." },
  "shell.collapse": { en: "Collapse", tr: "Daralt", de: "Einklappen" },
  "shell.collapseMenu": { en: "Collapse the menu", tr: "Menüyü daralt", de: "Menü einklappen" },
  "shell.expandMenu": { en: "Expand the menu", tr: "Menüyü genişlet", de: "Menü ausklappen" },
  "shell.poweredBy": { en: "Powered by OpenAsy", tr: "OpenAsy ile çalışır", de: "Bereitgestellt von OpenAsy" },
  "shell.language": { en: "Language", tr: "Dil", de: "Sprache" },

  "theme.label": { en: "Theme", tr: "Tema", de: "Design" },
  "theme.system": { en: "System", tr: "Sistem", de: "System" },
  "theme.light": { en: "Light", tr: "Açık", de: "Hell" },
  "theme.dark": { en: "Dark", tr: "Koyu", de: "Dunkel" },

  "common.close": { en: "Close", tr: "Kapat", de: "Schließen" },
  "common.dismiss": { en: "Dismiss", tr: "Kapat", de: "Ausblenden" },
  "common.moreInformation": { en: "More information", tr: "Daha fazla bilgi", de: "Weitere Informationen" },
  "common.trend": { en: "Trend", tr: "Eğilim", de: "Trend" },
  "common.labelTrend": { en: "{label} trend", tr: "{label} eğilimi", de: "{label}-Trend" },

  "table.hidden": { en: "{count} hidden", tr: "{count} gizli", de: "{count} ausgeblendet" },
  "table.showAll": { en: "Show all columns", tr: "Tüm sütunları göster", de: "Alle Spalten anzeigen" },
  "table.selectAll": { en: "Select all rows on this page", tr: "Bu sayfadaki tüm satırları seç", de: "Alle Zeilen dieser Seite auswählen" },
  "table.selectRow": { en: "Select row {id}", tr: "{id} satırını seç", de: "Zeile {id} auswählen" },
  "table.about": { en: "About {column}", tr: "{column} hakkında", de: "Über {column}" },
  "table.resize": { en: "Resize {column}", tr: "{column} genişliğini değiştir", de: "{column} Breite ändern" },
  "table.noResults": { en: "No results", tr: "Sonuç yok", de: "Keine Ergebnisse" },
  "table.range": { en: "{from}–{to} of {total}", tr: "{total} kayıttan {from}–{to}", de: "{from}–{to} von {total}" },
  "table.previous": { en: "Previous", tr: "Önceki", de: "Zurück" },
  "table.next": { en: "Next", tr: "Sonraki", de: "Weiter" },
  "table.columnOptions": { en: "{column} column options", tr: "{column} sütun seçenekleri", de: "Optionen für Spalte {column}" },
  "table.sortAscending": { en: "Sort ascending", tr: "Artan sırala", de: "Aufsteigend sortieren" },
  "table.sortDescending": { en: "Sort descending", tr: "Azalan sırala", de: "Absteigend sortieren" },
  "table.pinLeft": { en: "Pin to left", tr: "Sola sabitle", de: "Links anheften" },
  "table.pinRight": { en: "Pin to right", tr: "Sağa sabitle", de: "Rechts anheften" },
  "table.unpin": { en: "Unpin", tr: "Sabitlemeyi kaldır", de: "Lösen" },
  "table.resetWidths": { en: "Reset column widths", tr: "Sütun genişliklerini sıfırla", de: "Spaltenbreiten zurücksetzen" },
  "table.hideColumn": { en: "Hide column", tr: "Sütunu gizle", de: "Spalte ausblenden" },

  "filters.label": { en: "Filters", tr: "Filtreler", de: "Filter" },
  "filters.clearAll": { en: "Clear filters", tr: "Filtreleri temizle", de: "Filter zurücksetzen" },
  "filters.clear": { en: "Clear", tr: "Temizle", de: "Zurücksetzen" },
  "filters.noMatches": { en: "No matches", tr: "Eşleşme yok", de: "Keine Treffer" },
  "filters.search": { en: "Search {label}", tr: "{label} içinde ara", de: "{label} durchsuchen" },
  "filters.remove": { en: "Remove filter {field}", tr: "{field} filtresini kaldır", de: "Filter {field} entfernen" },
  "filters.timeRange": { en: "Time range", tr: "Zaman aralığı", de: "Zeitraum" },
  "filters.timeRangeIs": { en: "Time range: {range}", tr: "Zaman aralığı: {range}", de: "Zeitraum: {range}" },
  "filters.query": { en: "Query", tr: "Sorgu", de: "Abfrage" },
  "filters.run": { en: "Run", tr: "Çalıştır", de: "Ausführen" },
  "range.15m": { en: "Last 15 minutes", tr: "Son 15 dakika", de: "Letzte 15 Minuten" },
  "range.1h": { en: "Last 1 hour", tr: "Son 1 saat", de: "Letzte Stunde" },
  "range.6h": { en: "Last 6 hours", tr: "Son 6 saat", de: "Letzte 6 Stunden" },
  "range.24h": { en: "Last 24 hours", tr: "Son 24 saat", de: "Letzte 24 Stunden" },
  "range.7d": { en: "Last 7 days", tr: "Son 7 gün", de: "Letzte 7 Tage" },
  "range.30d": { en: "Last 30 days", tr: "Son 30 gün", de: "Letzte 30 Tage" },

  "chart.readValues": { en: "{label}. Use arrow keys to read values.", tr: "{label}. Değerleri okumak için ok tuşlarını kullanın.", de: "{label}. Mit den Pfeiltasten Werte lesen." },
  "chart.hoverCell": { en: "Hover a cell", tr: "Bir hücrenin üzerine gelin", de: "Zeigen Sie auf eine Zelle" },

  "severity.label": { en: "Severity {level}", tr: "Önem {level}", de: "Schweregrad {level}" },
  "severity.critical": { en: "Critical", tr: "Kritik", de: "Kritisch" },
  "severity.high": { en: "High", tr: "Yüksek", de: "Hoch" },
  "severity.medium": { en: "Medium", tr: "Orta", de: "Mittel" },
  "severity.low": { en: "Low", tr: "Düşük", de: "Niedrig" },
  "severity.info": { en: "Info", tr: "Bilgi", de: "Info" },
} satisfies Record<string, Catalogue>;

export type MessageKey = keyof typeof MESSAGES;

/** A supported locale from a tag such as "tr-TR"; English when none matches. */
export function toLocale(tag: string | null | undefined): Locale {
  const base = (tag ?? "").toLowerCase().split(/[-_]/)[0];
  return (LOCALES as readonly string[]).includes(base ?? "") ? (base as Locale) : "en";
}

/** The message in the locale, with each {name} filled in. */
export function translate(locale: Locale, key: MessageKey, vars?: Record<string, string | number>): string {
  const text: string = MESSAGES[key][locale] ?? MESSAGES[key].en;
  return vars ? text.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m)) : text;
}
