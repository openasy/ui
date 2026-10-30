import { describe, expect, it } from "vitest";
import { LOG_LEVELS, LOG_LEVEL_META, SEVERITIES, SEVERITY_META, TONE_CLASSES, TONE_COLORS, compareSeverity, toLogLevel, toSeverity } from "./levels";
import { PRODUCTS, PRODUCT_IDS, PRODUCT_LIST, getProduct } from "./products";

describe("log levels", () => {
  it("defines every level with a unique, increasing rank", () => {
    const ranks = LOG_LEVELS.map((l) => LOG_LEVEL_META[l].rank);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(new Set(ranks).size).toBe(LOG_LEVELS.length);
  });

  it.each([
    ["ERROR", "error"],
    ["err", "error"],
    ["Warning", "warn"],
    ["panic", "fatal"],
    ["crit", "fatal"],
    ["DBG", "debug"],
    ["verbose", "trace"],
    ["notice", "info"],
  ] as const)("normalises %s to %s", (input, out) => {
    expect(toLogLevel(input)).toBe(out);
  });

  it.each([
    [0, "fatal"],
    [3, "error"],
    [4, "warn"],
    [5, "info"],
    [6, "info"],
    [7, "debug"],
  ] as const)("maps syslog severity %s to %s", (input, out) => {
    expect(toLogLevel(input)).toBe(out);
  });
});

describe("severity", () => {
  it.each([
    [9.8, "critical"],
    [7.5, "high"],
    [5, "medium"],
    [2, "low"],
    [0, "info"],
    ["CRITICAL", "critical"],
    ["High", "high"],
    ["error", "high"],
    ["moderate", "medium"],
    ["warning", "medium"],
    ["low", "low"],
    ["note", "info"],
  ] as const)("maps %s to %s", (input, out) => {
    expect(toSeverity(input)).toBe(out);
  });

  it("sorts worst first", () => {
    const sorted = [...SEVERITIES].reverse().sort(compareSeverity);
    expect(sorted).toEqual(["critical", "high", "medium", "low", "info"]);
  });

  it("gives every severity a CVSS range and a distinct shape", () => {
    const shapes = SEVERITIES.map((s) => SEVERITY_META[s].shape);
    expect(new Set(shapes).size).toBe(SEVERITIES.length);
    SEVERITIES.forEach((s) => expect(SEVERITY_META[s].cvss).toBeTruthy());
  });

  it("has classes and colours for every tone", () => {
    const tones = Object.keys(TONE_CLASSES);
    expect(Object.keys(TONE_COLORS)).toEqual(tones);
  });
});

describe("products", () => {
  it("registers 65 products with unique images and matching ids", () => {
    expect(PRODUCT_IDS).toHaveLength(65);
    expect(PRODUCT_LIST.map((p) => p.id)).toEqual([...PRODUCT_IDS]);
    expect(new Set(PRODUCT_LIST.map((p) => p.image)).size).toBe(65);
    PRODUCT_LIST.forEach((p) => expect(PRODUCTS[p.id].id).toBe(p.id));
  });

  it("groups every product", () => {
    const groups = new Set(PRODUCT_LIST.map((p) => p.group));
    expect([...groups].sort()).toEqual(["finance", "growth", "identity", "operations", "people", "platform", "security", "service", "workplace"]);
  });

  it("looks a product up by id", () => {
    expect(getProduct("posture")).toBe(PRODUCTS.posture);
    expect(getProduct("vpn").name).toBe("VPN");
  });
});
