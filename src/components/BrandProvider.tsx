import { createContext, useContext, useLayoutEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/cn";
import { useResolvedTheme, type ThemeMode, type ThemePreference } from "./Theme";

export interface Brand {
  /** Shown in the shell and on the sign-in page, e.g. "Acme Security". */
  name: string;
  /** Organisation or workspace shown under the product name. */
  organization?: string;
  /** Logo for light surfaces. Square images work best (rendered at 24 px). */
  logoUrl?: string;
  /** Optional logo for dark surfaces. Falls back to logoUrl. */
  logoDarkUrl?: string;
  /** Any CSS colour. Hover, soft and focus tones are derived from it. */
  accent?: string;
  /** Overrides the sans font stack. */
  fontFamily?: string;
  /** Hide "Powered by OpenAsy" footers. */
  hidePoweredBy?: boolean;
}

export const DEFAULT_BRAND: Brand = { name: "OpenAsy", organization: "Acme Corp" };

interface BrandContextValue {
  brand: Brand;
  /** The theme on screen; "system" is already resolved to light or dark. */
  theme: ThemeMode;
}

const BrandContext = createContext<BrandContextValue>({ brand: DEFAULT_BRAND, theme: "light" });

export interface BrandProviderProps {
  brand?: Partial<Brand>;
  /** "system" follows the operating system and is the default (ADR 0007). */
  theme?: ThemePreference;
  /**
   * Set when the provider wraps the whole page. The theme then goes on <html>, where
   * `themeScript()` in <head> already put it before the first paint, so nothing flashes.
   */
  root?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Root of every OpenAsy screen. Applies the theme, the brand accent and font,
 * and exposes the brand to the shell and sign-in components.
 */
export function BrandProvider({ brand, theme: preference = "system", root, className, style, children }: BrandProviderProps) {
  const theme = useResolvedTheme(preference);
  const value = useMemo<BrandContextValue>(() => ({ brand: { ...DEFAULT_BRAND, ...brand }, theme }), [brand, theme]);
  const applied = useRef(false);
  useIsomorphicLayoutEffect(() => {
    if (!root) return;
    const html = document.documentElement;
    // Hydration renders the server's guess first; themeScript() already set the right theme, so keep it.
    const first = !applied.current;
    applied.current = true;
    if (first && html.dataset.theme) return;
    html.dataset.theme = theme;
  }, [root, theme]);
  const vars: Record<string, string> = {};
  if (value.brand.accent) vars["--oa-accent"] = value.brand.accent;
  if (value.brand.fontFamily) vars["--oa-font-sans"] = value.brand.fontFamily;
  return (
    <BrandContext.Provider value={value}>
      <div
        data-theme={root ? undefined : theme}
        data-oa-brand=""
        className={cn("oa-root", className)}
        style={{ ...(vars as CSSProperties), ...style }}
      >
        {children}
      </div>
    </BrandContext.Provider>
  );
}

const useIsomorphicLayoutEffect = typeof window === "undefined" ? () => {} : useLayoutEffect;

export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}
