import { describe, expect, it } from "vitest";
import { BREACH_SCENARIO, BREACH_STAGES } from "./breach";
import { PRODUCT_IDS } from "./products";

describe("breach coverage data", () => {
  it("names only real products and stages", () => {
    const stages = new Set(BREACH_STAGES.map((s) => s.id));
    expect(stages.size).toBe(BREACH_STAGES.length);
    for (const s of [...BREACH_STAGES, ...BREACH_SCENARIO]) for (const d of s.detectors) expect(PRODUCT_IDS).toContain(d);
    for (const step of BREACH_SCENARIO) expect(stages).toContain(step.stage);
  });

  it("orders the scenario in time", () => {
    const times = BREACH_SCENARIO.map((s) => s.at);
    expect(times).toEqual([...times].sort((a, b) => a - b));
  });
});
