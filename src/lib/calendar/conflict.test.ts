import { describe, expect, it } from "vitest";
import { findUnavailabilityConflicts, hasDoubleBooking } from "./conflict";
import type { UnavailabilityBlock } from "./unavailability";

const UNAVAILABILITY: UnavailabilityBlock[] = [
  { id: "u1", memberId: "m1", dayIndex: 1, startMinutes: 540, endMinutes: 780, reason: null },
  { id: "u2", memberId: "m2", dayIndex: 1, startMinutes: 0, endMinutes: 1440, reason: null },
];

describe("findUnavailabilityConflicts", () => {
  it("returns the overlapping entry for the same member/day", () => {
    const result = findUnavailabilityConflicts("m1", 1, 600, 660, UNAVAILABILITY);
    expect(result.map((r) => r.id)).toEqual(["u1"]);
  });

  it("ignores other members' unavailability", () => {
    const result = findUnavailabilityConflicts("m3", 1, 600, 660, UNAVAILABILITY);
    expect(result).toEqual([]);
  });

  it("ignores a different day", () => {
    const result = findUnavailabilityConflicts("m1", 2, 600, 660, UNAVAILABILITY);
    expect(result).toEqual([]);
  });

  it("does not flag back-to-back (touching) ranges as a conflict", () => {
    const result = findUnavailabilityConflicts("m1", 1, 780, 900, UNAVAILABILITY);
    expect(result).toEqual([]);
  });
});

describe("hasDoubleBooking", () => {
  const SHIFTS = [
    { id: "s1", memberId: "m1", dayIndex: 0, startMinutes: 540, endMinutes: 1080 },
  ];

  it("detects an overlapping shift for the same member", () => {
    expect(hasDoubleBooking("m1", 0, 600, 660, SHIFTS)).toBe(true);
  });

  it("allows a non-overlapping shift for the same member", () => {
    expect(hasDoubleBooking("m1", 0, 1080, 1140, SHIFTS)).toBe(false);
  });

  it("ignores other members", () => {
    expect(hasDoubleBooking("m2", 0, 600, 660, SHIFTS)).toBe(false);
  });

  it("excludes the block being edited from the check", () => {
    expect(hasDoubleBooking("m1", 0, 600, 660, SHIFTS, "s1")).toBe(false);
  });
});
