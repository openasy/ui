import type { Decorator, Preview } from "@storybook/react-vite";
import "../src/styles/index.css";
import { BrandProvider, type Brand } from "../src/components/BrandProvider";
import type { Locale } from "../src/lib/i18n";

const BRANDS: Record<string, Partial<Brand>> = {
  openasy: { name: "OpenAsy", organization: "Acme Corp" },
  acme: {
    name: "Acme Shield",
    organization: "Acme Corp · Production",
    accent: "#0b7366",
    logoUrl:
      "data:image/svg+xml;utf8," +
      encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0b7366"/><path d="M7 16l5-9 5 9z" fill="#fff"/></svg>',
      ),
  },
  bank: { name: "Northwind SOC", organization: "Security Operations Center", accent: "#7a4fd1", fontFamily: "system-ui, sans-serif" },
};

const withBrand: Decorator = (Story, context) => {
  const theme = (context.globals.theme as "light" | "dark") ?? "light";
  const brand = BRANDS[(context.globals.brand as string) ?? "openasy"];
  const locale = (context.globals.locale as Locale) ?? "en";
  const fullscreen = context.parameters.layout === "fullscreen";
  return (
    <BrandProvider brand={brand} theme={theme} locale={locale} style={{ minHeight: fullscreen ? "100vh" : undefined, padding: fullscreen ? 0 : 16 }}>
      <Story />
    </BrandProvider>
  );
};

const preview: Preview = {
  decorators: [withBrand],
  // Full-page screens must never scroll sideways; wide tables scroll inside their own box.
  async afterEach({ parameters, canvasElement }) {
    if (parameters.layout !== "fullscreen") return;
    if (canvasElement.querySelector('[data-testid="not-designed"]')) {
      throw new Error("A nav item opens a page that has not been designed yet.");
    }
    const doc = canvasElement.ownerDocument.documentElement;
    if (doc.scrollWidth > doc.clientWidth + 1) {
      throw new Error(`Page overflows horizontally: content is ${doc.scrollWidth}px wide in a ${doc.clientWidth}px viewport.`);
    }
  },
  globalTypes: {
    theme: {
      description: "Colour theme",
      toolbar: {
        title: "Theme",
        icon: "mirror",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
    locale: {
      description: "Language of the library's own words",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "tr", title: "Türkçe" },
          { value: "de", title: "Deutsch" },
        ],
        dynamicTitle: true,
      },
    },
    brand: {
      description: "White-label brand",
      toolbar: {
        title: "Brand",
        icon: "paintbrush",
        items: [
          { value: "openasy", title: "OpenAsy (default)" },
          { value: "acme", title: "Acme Shield (teal, custom logo)" },
          { value: "bank", title: "Northwind SOC (purple, system font)" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light", brand: "openasy", locale: "en" },
  parameters: {
    layout: "padded",
    controls: { expanded: true, matchers: { color: /(background|color|accent)$/i } },
    a11y: { test: "error" },
    options: {
      storySort: {
        order: ["Introduction", "Quality", "Platform", "Foundations", "Layout", "Data", "Charts", "Filters", "Inputs", "Feedback", "Products", "Identity"],
      },
    },
  },
};

export default preview;
