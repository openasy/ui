import { addons } from "storybook/manager-api";
import { create } from "storybook/theming";

addons.setConfig({
  theme: create({
    base: "light",
    brandTitle: "OpenAsy UI",
    brandUrl: "https://github.com/openasy/ui",
    colorPrimary: "#1f4fd8",
    colorSecondary: "#1f4fd8",
    fontBase: '"IBM Plex Sans", system-ui, sans-serif',
    fontCode: '"IBM Plex Mono", monospace',
    appBg: "#f5f6f8",
    appBorderColor: "#d9dde3",
    appBorderRadius: 8,
    textColor: "#11161d",
    barSelectedColor: "#1f4fd8",
  }),
});
