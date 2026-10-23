import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { LatestTestResults, TestResultsView, type Summary } from "./TestResults";

const meta = {
  title: "Quality/Test results",
  parameters: { layout: "fullscreen" },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** The results of the CI run that built this Storybook. */
export const Latest: Story = {
  render: () => <LatestTestResults />,
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("heading", { name: "Test results" })).toBeInTheDocument();
  },
};

const example: Summary = {
  generatedAt: "2026-10-19T13:30:00.000Z",
  commit: "3f9a21c7d0e4b5a6",
  runUrl: null,
  success: false,
  totals: { files: 4, tests: 60, passed: 59, failed: 1, skipped: 0, durationMs: 4200 },
  byProject: {
    unit: { files: 2, tests: 50, passed: 50, failed: 0, skipped: 0 },
    storybook: { files: 2, tests: 10, passed: 9, failed: 1, skipped: 0 },
  },
  coverage: {
    lines: { pct: 100, covered: 434, total: 434 },
    statements: { pct: 99.4, covered: 526, total: 529 },
    functions: { pct: 100, covered: 194, total: 194 },
    branches: { pct: 84.2, covered: 540, total: 642 },
  },
  coverageFiles: [
    { file: "src/charts/TimeSeriesChart.tsx", lines: 100, branches: 95.4, functions: 100, statements: 100 },
    { file: "src/components/DataTable.tsx", lines: 100, branches: 97, functions: 100, statements: 98.4 },
  ],
  files: [
    {
      file: "src/components/DataTable.test.tsx",
      project: "unit",
      status: "passed",
      tests: 10,
      passed: 10,
      failed: 0,
      skipped: 0,
      durationMs: 480,
      failures: [],
    },
    { file: "src/charts/charts.test.tsx", project: "unit", status: "passed", tests: 40, passed: 40, failed: 0, skipped: 0, durationMs: 610, failures: [] },
    {
      file: "src/stories/components/Charts.stories.tsx",
      project: "storybook",
      status: "passed",
      tests: 6,
      passed: 6,
      failed: 0,
      skipped: 0,
      durationMs: 1800,
      failures: [],
    },
    {
      file: "src/stories/components/Layout.stories.tsx",
      project: "storybook",
      status: "failed",
      tests: 4,
      passed: 3,
      failed: 1,
      skipped: 0,
      durationMs: 1310,
      failures: [{ title: "Shell", message: "Elements must have their visible text as part of their accessible name (label-content-name-mismatch)" }],
    },
  ],
};

/** Static sample showing a failing run, so the page design can be reviewed without CI data. */
export const ExampleWithFailure: Story = {
  render: () => <TestResultsView summary={example} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByText("1 failing")).toBeInTheDocument();
    await expect(c.getByRole("alert")).toHaveTextContent("label-content-name-mismatch");
    await userEvent.click(c.getByRole("tab", { name: /Stories/ }));
    await expect(c.getByRole("table", { name: "Test files" }).querySelectorAll("tbody tr")).toHaveLength(2);
  },
};
