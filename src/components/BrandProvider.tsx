import { createContext, useContext, useMemo, type CSSProperties, type ReactNode } from "react";
import { cn } from "../lib/cn";

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

export type ThemeMode = "light" | "dark";

interface BrandContextValue {
  brand: Brand;
  theme: ThemeMode;
}

const BrandContext = createContext<BrandContextValue>({ brand: DEFAULT_BRAND, theme: "light" });

export interface BrandProviderProps {
  brand?: Partial<Brand>;
  theme?: ThemeMode;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Root of every OpenAsy screen. Applies the theme, the brand accent and font,
 * and exposes the brand to the shell and sign-in components.
 */
export function BrandProvider({ brand, theme = "light", className, style, children }: BrandProviderProps) {
  const value = useMemo<BrandContextValue>(() => ({ brand: { ...DEFAULT_BRAND, ...brand }, theme }), [brand, theme]);
  const vars: Record<string, string> = {};
  if (value.brand.accent) vars["--oa-accent"] = value.brand.accent;
  if (value.brand.fontFamily) vars["--oa-font-sans"] = value.brand.fontFamily;
  return (
    <BrandContext.Provider value={value}>
      <div
        data-theme={theme}
        data-oa-brand=""
        className={cn("oa-root", className)}
        style={{ ...(vars as CSSProperties), ...style }}
      >
        {children}
      </div>
    </BrandContext.Provider>
  );
}

export function useBrand(): BrandContextValue {
  return useContext(BrandContext);
}
