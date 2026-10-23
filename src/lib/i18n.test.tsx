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
import { defineMessages, useLocalePreference } from "../components/Locale";
import { LOCALE_STORAGE_KEY, UI_MESSAGES, formatAgo, messageProblems, toLocale, translate } from "./i18n";

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("translate", () => {
  it("fills in values and falls back to the placeholder when one is missing", () => {
    expect(translate("tr", "table.range", { from: 1, to: 10, total: 42 })).toBe("42 kayıttan 1–10");
    expect(translate("de", "shell.navigation", { product: "Logs" })).toBe("Logs-Navigation");
    expect(translate("en", "table.selectRow")).toBe("Select row {{id}}");
  });

  it("has every message in every locale, with the same placeholders", () => {
    expect(messageProblems(UI_MESSAGES)).toEqual([]);
  });

  it("says how long ago a time was, in the locale", () => {
    const now = Date.parse("2026-10-23T12:00:00Z");
    expect(formatAgo("en", null, now)).toBe("never");
    expect(formatAgo("en", "2026-10-23T11:59:30Z", now)).toBe("just now");
    expect(formatAgo("tr", "2026-10-23T11:55:00Z", now)).toBe("5 dk önce");
    expect(formatAgo("de", "2026-10-21T12:00:00Z", now)).toBe("vor 2 T.");
  });

  it("reads plural forms by their base name, and lets each language have its own forms", () => {
    const useFilesT = defineMessages("plural-test", { en: { files_one: "{{count}} file", files_other: "{{count}} files" } });
    function Files({ n }: { n: number }) {
      const t = useFilesT();
      return <p>{t("files", { count: n })}</p>;
    }
    const { rerender } = render(
      <BrandProvider>
        <Files n={1} />
      </BrandProvider>,
    );
    expect(screen.getByText("1 file")).toBeInTheDocument();
    rerender(
      <BrandProvider>
        <Files n={3} />
      </BrandProvider>,
    );
    expect(screen.getByText("3 files")).toBeInTheDocument();
    expect(messageProblems({ en: { files_one: "{{count}} file", files_other: "{{count}} files" }, tr: { files_other: "{{count}} dosya" } })).toEqual([]);
    expect(messageProblems({ en: { files_one: "{{count}} file", files_other: "{{count}} files" }, tr: {} })).toEqual(["files: no tr text"]);
  });

  it("names the messages a language misses, adds or fills differently", () => {
    const en = { hosts: { ok: "{{n}} hosts", gap: "Hosts", drift: "{{n}} hosts" } };
    const tr = { hosts: { ok: "{{n}} sunucu", gap: "", drift: "{{count}} sunucu" }, extra: "Fazla" };
    expect(messageProblems({ en, tr, de: en })).toEqual([
      "hosts.gap: no tr text",
      "hosts.drift: tr uses other placeholders than en",
      "extra: in tr but not in en",
    ]);
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

const useHostsT = defineMessages("hosts-test", {
  en: { page: { title: "{{n}} hosts" } },
  tr: { page: { title: "{{n}} sunucu" } },
  de: { page: { title: "{{n}} Hosts" } },
});

function Page() {
  const t = useHostsT();
  return <h1>{t("page.title", { n: 3 })}</h1>;
}

const useEnglishOnlyT = defineMessages("english-only-test", { en: { title: "Hosts" } });

function EnglishOnly() {
  const t = useEnglishOnlyT();
  return <h1>{t("title")}</h1>;
}

describe("defineMessages", () => {
  it("shows English in a language a product has not translated yet", () => {
    render(
      <BrandProvider locale="de">
        <EnglishOnly />
      </BrandProvider>,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("Hosts");
    expect(messageProblems({ en: { title: "Hosts" } })).toEqual([]);
  });

  it("reads a product's own messages in the BrandProvider locale", () => {
    const { rerender } = render(
      <BrandProvider locale="tr">
        <Page />
      </BrandProvider>,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("3 sunucu");
    rerender(
      <BrandProvider locale="de">
        <Page />
      </BrandProvider>,
    );
    expect(screen.getByRole("heading")).toHaveTextContent("3 Hosts");
  });
});
