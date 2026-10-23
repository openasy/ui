import type { ReactElement } from "react";
import { render, type RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrandProvider, type Brand } from "../components/BrandProvider";
import type { ThemeMode } from "../components/Theme";
import type { Locale } from "../lib/i18n";

/** Render inside the brand/theme root, like every real screen. */
export function renderUI(ui: ReactElement, opts: RenderOptions & { brand?: Partial<Brand>; theme?: ThemeMode; locale?: Locale } = {}) {
  const { brand, theme, locale, ...rest } = opts;
  const user = userEvent.setup();
  return {
    user,
    ...render(
      <BrandProvider brand={brand} theme={theme} locale={locale}>
        {ui}
      </BrandProvider>,
      rest,
    ),
  };
}

/** Pretend an element is laid out at a given box, so pointer maths works in jsdom. */
export function mockRect(el: Element, rect: Partial<DOMRect>) {
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0, x: 0, y: 0, toJSON: () => ({}), ...rect }) as DOMRect;
}
