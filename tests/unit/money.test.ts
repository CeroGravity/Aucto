import { describe, expect, it } from "vitest";

import { formatPriceMinor, minorToTakaInput, parseTakaToMinor } from "@/lib/money";

describe("parseTakaToMinor", () => {
  it("parses whole Taka", () => {
    expect(parseTakaToMinor("2500")).toBe(250000);
  });
  it("parses one/two decimal places (poisha) without float drift", () => {
    expect(parseTakaToMinor("2500.5")).toBe(250050);
    expect(parseTakaToMinor("2500.50")).toBe(250050);
    expect(parseTakaToMinor("0.01")).toBe(1);
    expect(parseTakaToMinor("19.99")).toBe(1999);
  });
  it("strips grouping commas", () => {
    expect(parseTakaToMinor("1,250")).toBe(125000);
  });
  it("rejects invalid / negative / over-precise input", () => {
    expect(parseTakaToMinor("abc")).toBeNull();
    expect(parseTakaToMinor("-5")).toBeNull();
    expect(parseTakaToMinor("1.234")).toBeNull();
    expect(parseTakaToMinor("")).toBeNull();
  });
  it("round-trips with minorToTakaInput", () => {
    for (const minor of [250000, 250050, 1, 1999, 120000]) {
      expect(parseTakaToMinor(minorToTakaInput(minor))).toBe(minor);
    }
  });
});

describe("formatPriceMinor", () => {
  it("formats ৳ with grouping", () => {
    expect(formatPriceMinor(250000)).toBe("৳2,500");
    expect(formatPriceMinor(250050)).toBe("৳2,500.50");
  });
});
