/// <reference types="vitest/config" />
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    lib: {
      entry: path.resolve(dirname, "src/index.ts"),
      formats: ["es"],
      fileName: "index",
      cssFileName: "styles",
    },
    rolldownOptions: {
      external: [/^react($|\/)/, /^react-dom($|\/)/, "lucide-react", /^@radix-ui\//, "clsx", "tailwind-merge"],
    },
    sourcemap: true,
    emptyOutDir: true,
  },
  test: {
    // `npm run test:ci` sets OA_REPORTS=1 to write the reports published with Storybook.
    reporters: process.env.OA_REPORTS
      ? [
          "default",
          ["json", { outputFile: "reports/tests/results.json" }],
          ["junit", { outputFile: "reports/tests/junit.xml" }],
          ["html", { outputDir: "reports/tests" }],
        ]
      : ["default"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/stories/**", "src/**/*.test.{ts,tsx}", "src/test/**", "src/index.ts"],
      reporter: ["text-summary", "html", "json-summary", "lcov"],
      reportsDirectory: "reports/coverage",
      thresholds: {
        statements: 90,
        branches: 85,
        functions: 90,
        lines: 90,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["src/**/*.test.{ts,tsx}"],
          setupFiles: ["./vitest.setup.ts"],
        },
      },
      {
        extends: true,
        plugins: [storybookTest({ configDir: path.join(dirname, ".storybook") })],
        test: {
          name: "storybook",
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
