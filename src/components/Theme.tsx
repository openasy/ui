import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "../lib/cn";
import { SegmentedControl } from "./SegmentedControl";

export type ThemeMode = "light" | "dark";
/** What the person chose; "system" follows the operating system (platform decision 0007). */
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

/**
 * One button that shows the current theme and opens a menu of system, light
 * and dark. The shell puts it on the right of its top bar.
 */
export function ThemeMenu({ value, onChange, className }: ThemeToggleProps) {
  const [open, setOpen] = useState(false);
  const items = useRef<Array<HTMLButtonElement | null>>([]);
  const current = OPTIONS.find((o) => o.value === value) ?? OPTIONS[0];
  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    e.preventDefault();
    const at = items.current.findIndex((el) => el === document.activeElement);
    const next = (at + (e.key === "ArrowDown" ? 1 : OPTIONS.length - 1)) % OPTIONS.length;
    items.current[next]?.focus();
  };
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger aria-label={`Theme: ${current.name}`} title="Theme" className={cn("grid size-10 place-items-center rounded-md", className)}>
        <current.Icon aria-hidden className="size-[18px]" />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={4}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            items.current[OPTIONS.findIndex((o) => o.value === current.value)]?.focus();
          }}
          className="oa-root z-50 w-44 rounded-lg border border-line bg-surface p-1 shadow-overlay"
        >
          <div role="menu" aria-label="Theme" onKeyDown={onKey} className="flex flex-col gap-0.5">
            {OPTIONS.map(({ value: v, name, Icon }, i) => {
              const on = v === value;
              return (
                <button
                  key={v}
                  ref={(el) => {
                    items.current[i] = el;
                  }}
                  type="button"
                  role="menuitemradio"
                  aria-checked={on}
                  onClick={() => {
                    onChange(v);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-left text-sm",
                    on ? "bg-accent-soft font-medium text-accent-text" : "text-fg hover:bg-subtle",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  {name}
                </button>
              );
            })}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
