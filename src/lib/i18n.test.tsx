import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Server } from "lucide-react";
import { renderUI } from "../test/render";
import { AppShell } from "../components/AppShell";
import { DataTable } from "../components/DataTable";
import { SeverityBadge } from "../components/Badge";
import { TimeRangePicker } from "../components/Filters";
import { BrandProvider } from "../components/BrandProvider";
import { useLocalePreference } from "../components/Locale";
import { LOCALES, LOCALE_STORAGE_KEY, MESSAGES, toLocale, translate } from "./i18n";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("translate", () => {
  it("fills in values and falls back to the placeholder when one is missing", () => {
    expect(translate("tr", "table.range", { from: 1, to: 10, total: 42 })).toBe("42 kayıttan 1–10");
    expect(translate("de", "shell.navigation", { product: "Logs" })).toBe("Logs-Navigation");
    expect(translate("en", "table.selectRow")).toBe("Select row {id}");
  });

  it("has every message in every locale, with the same placeholders", () => {
    for (const [key, byLocale] of Object.entries(MESSAGES)) {
      const names = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
      for (const locale of LOCALES) {
        expect(byLocale[locale], `${key} in ${locale}`).toBeTruthy();
        expect(names(byLocale[locale]), `${key} in ${locale}`).toEqual(names(byLocale.en));
      }
    }
  });

  it("reads a locale from a language tag", () => {
    expect(toLocale("tr-TR")).toBe("tr");
    expect(toLocale("de_AT")).toBe("de");
    expect(toLocale("fr")).toBe("en");
    expect(toLocale(undefined)).toBe("en");
  });
});

describe("components follow the locale", () => {
  const nav = [{ id: "hosts", label: "Hosts", icon: Server }];

  it("shows the shell in Turkish and German", () => {
    const { unmount } = renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
      { locale: "tr" },
    );
    const navEl = screen.getByRole("navigation", { name: "Logs menüsü" });
    expect(within(navEl).getByRole("group", { name: "Ayarlar" })).toBeInTheDocument();
    expect(within(navEl).getByRole("link", { name: "Entegrasyonlar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Menüyü aç" })).toBeInTheDocument();
    unmount();
    renderUI(
      <AppShell product="logs" nav={nav}>
        <p />
      </AppShell>,
      { locale: "de" },
    );
    expect(screen.getByRole("group", { name: "Einstellungen" })).toBeInTheDocument();
  });

  it("translates tables, severities and time ranges", () => {
    renderUI(
      <>
        <DataTable label="Rows" columns={[{ id: "a", header: "A", cell: (r: { id: string }) => r.id }]} rows={[]} getRowId={(r) => r.id} />
        <SeverityBadge severity="critical" />
        <TimeRangePicker value="24h" onChange={() => {}} />
      </>,
      { locale: "tr" },
    );
    expect(screen.getByText("Sonuç yok")).toBeInTheDocument();
    expect(screen.getByText("Kritik")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zaman aralığı: Son 24 saat" })).toBeInTheDocument();
  });

  it("sets lang on the provider", () => {
    const { container } = renderUI(<p />, { locale: "de" });
    expect(container.querySelector("[data-oa-brand]")).toHaveAttribute("lang", "de");
  });
});

function Picker() {
  const [locale, setLocale] = useLocalePreference();
  return (
    <BrandProvider locale={locale}>
      <AppShell product="logs" nav={[{ id: "hosts", label: "Hosts" }]} onLanguageChange={(code) => setLocale(toLocale(code))}>
        <p />
      </AppShell>
    </BrandProvider>
  );
}

describe("useLocalePreference", () => {
  it("follows the browser at first, then the choice, which it remembers", async () => {
    vi.stubGlobal("navigator", { ...navigator, language: "de-DE" });
    const user = userEvent.setup();
    const { unmount } = render(<Picker />);
    await user.click(screen.getByRole("button", { name: "Sprache: Deutsch" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Türkçe" }));
    expect(screen.getByRole("button", { name: "Dil: Türkçe" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Ayarlar" })).toBeInTheDocument();
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("tr");
    unmount();
    render(<Picker />);
    expect(screen.getByRole("button", { name: "Dil: Türkçe" })).toBeInTheDocument();
  });
});
