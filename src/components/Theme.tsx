import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { SegmentedControl } from "./SegmentedControl";

export type ThemeMode = "light" | "dark";
/** What the person chose; "system" follows the operating system (ADR 0007). */
export type ThemePreference = "system" | ThemeMode;

export const THEME_STORAGE_KEY = "oa-theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";
const CHANGE_EVENT = "oa-theme-change";

const isPreference = (v: unknown): v is ThemePreference => v === "system" || v === "light" || v === "dark";

function readPreference(key: string): ThemePreference {
  try {
    const v = window.localStorage.getItem(key);
    return isPreference(v) ? v : "system";
  } catch {
    return "system";
  }
}

/** The light or dark the operating system asks for. Server renders start light. */
export function useSystemTheme(): ThemeMode {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== "function") return () => {};
      const m = window.matchMedia(DARK_QUERY);
      m.addEventListener("change", onChange);
      return () => m.removeEventListener("change", onChange);
    },
    () => (typeof window.matchMedia === "function" && window.matchMedia(DARK_QUERY).matches ? "dark" : "light"),
    () => "light",
  );
}

/** Turns a preference into the theme to show. */
export function useResolvedTheme(preference: ThemePreference): ThemeMode {
  const system = useSystemTheme();
  return preference === "system" ? system : preference;
}

/**
 * The person's theme choice, remembered in this browser and kept in sync across tabs.
 * Falls back to "system" when storage is unavailable.
 */
export function useThemePreference(storageKey: string = THEME_STORAGE_KEY): [ThemePreference, (next: ThemePreference) => void] {
  const preference = useSyncExternalStore<ThemePreference>(
    (onChange) => {
      const onStorage = (e: StorageEvent) => e.key === storageKey && onChange();
      window.addEventListener("storage", onStorage);
      window.addEventListener(CHANGE_EVENT, onChange);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(CHANGE_EVENT, onChange);
      };
    },
    () => readPreference(storageKey),
    () => "system",
  );
  const setPreference = (next: ThemePreference) => {
    try {
      if (next === "system") window.localStorage.removeItem(storageKey);
      else window.localStorage.setItem(storageKey, next);
    } catch {
      // Storage blocked: the choice lasts until the page reloads.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };
  return [preference, setPreference];
}

/**
 * Inline script for <head> on prerendered pages. It applies the remembered theme to <html>
 * before the first paint, so a dark page never flashes light. Pair it with `<BrandProvider root>`.
 */
export function themeScript(storageKey: string = THEME_STORAGE_KEY): string {
  return `(function(){try{var p=localStorage.getItem(${JSON.stringify(storageKey)})}catch(e){}if(p!=="light"&&p!=="dark")p=matchMedia(${JSON.stringify(DARK_QUERY)}).matches?"dark":"light";document.documentElement.dataset.theme=p})()`;
}

const OPTIONS = [
  { value: "system", name: "System", Icon: Monitor },
  { value: "light", name: "Light", Icon: Sun },
  { value: "dark", name: "Dark", Icon: Moon },
] as const;

export interface ThemeToggleProps {
  value: ThemePreference;
  onChange: (next: ThemePreference) => void;
  className?: string;
}

/** System, light or dark, as three icon buttons. */
export function ThemeToggle({ value, onChange, className }: ThemeToggleProps) {
  return (
    <SegmentedControl
      label="Theme"
      value={value}
      onChange={onChange}
      options={OPTIONS.map(({ value, name, Icon }) => ({
        value,
        label: (
          <span title={name} className="flex items-center">
            <Icon aria-hidden className="size-3.5" />
            <span className="sr-only">{name}</span>
          </span>
        ),
      }))}
      className={className}
    />
  );
}
