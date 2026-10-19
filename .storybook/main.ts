import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const reports = path.resolve(dirname, "../reports");

const config: StorybookConfig = {
  stories: ["../src/**/*.mdx", "../src/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-docs", "@storybook/addon-a11y", "@storybook/addon-vitest", "@storybook/addon-themes"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Test and coverage reports are served under /reports once `npm run test:ci` has run.
  staticDirs: existsSync(reports) ? [{ from: "../reports", to: "/reports" }] : [],
  docs: { defaultName: "Docs" },
  core: { disableTelemetry: true },
};

export default config;
