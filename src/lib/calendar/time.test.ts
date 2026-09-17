import { describe, expect, it } from "vitest";
import {
  formatDurationLabel,
  labelToMinutes,
  minutesToLabel,
  snapToSlot,
} from "./time";

describe("snapToSlot", () => {
  it("rounds down to the nearest 30 minutes below the midpoint", () => {
    expect(snapToSlot(14)).toBe(0);
  });

  it("rounds up to the nearest 30 minutes at/above the midpoint", () => {
    expect(snapToSlot(15)).toBe(30);
    expect(snapToSlot(44)).toBe(30);
  });
});

describe("minutesToLabel / labelToMinutes", () => {
  it("round-trips 0 to 09:00", () => {
    expect(minutesToLabel(9 * 60)).toBe("09:00");
    expect(labelToMinutes("09:00")).toBe(9 * 60);
  });

  it("formats 18:30 correctly", () => {
    expect(minutesToLabel(18 * 60 + 30)).toBe("18:30");
  });
});

describe("formatDurationLabel", () => {
  it("joins start and end labels with an en dash", () => {
    expect(formatDurationLabel(9 * 60, 18 * 60)).toBe("09:00–18:00");
  });
});
