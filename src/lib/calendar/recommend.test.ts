import { describe, expect, it } from "vitest";
import { formatExclusionReason, recommendMembers } from "./recommend";
import type { UnavailabilityBlock } from "./unavailability";

const MEMBERS = [
  { id: "m1", name: "김민준", color: "#F87171" },
  { id: "m2", name: "이서연", color: "#FB923C" },
  { id: "m3", name: "박도윤", color: "#FBBF24" },
];

describe("recommendMembers", () => {
  it("recommends everyone when there are no shifts or unavailability", () => {
    const result = recommendMembers(0, 540, 1080, MEMBERS, [], []);
    expect(result.excluded).toEqual([]);
    expect(result.recommended.map((r) => r.member.id)).toEqual(["m1", "m2", "m3"]);
    expect(result.recommended.every((r) => r.hoursThisWeek === 0)).toBe(true);
  });

  it("excludes a member whose unavailability overlaps the slot", () => {
    const unavailability: UnavailabilityBlock[] = [
      { id: "u1", memberId: "m2", dayIndex: 0, startMinutes: 540, endMinutes: 780, reason: null },
    ];
    const result = recommendMembers(0, 600, 660, MEMBERS, [], unavailability);
    expect(result.recommended.map((r) => r.member.id)).toEqual(["m1", "m3"]);
    expect(result.excluded).toEqual([
      { member: MEMBERS[1], reason: "unavailable", hoursThisWeek: 0 },
    ]);
  });

  it("excludes a member who already has an overlapping shift", () => {
    const shifts = [
      { id: "s1", memberId: "m1", dayIndex: 0, startMinutes: 540, endMinutes: 1080 },
    ];
    const result = recommendMembers(0, 600, 660, MEMBERS, shifts, []);
    expect(result.recommended.map((r) => r.member.id)).toEqual(["m2", "m3"]);
    expect(result.excluded[0].reason).toBe("already_booked");
  });

  it("does not exclude a member for a non-overlapping shift on the same day", () => {
    const shifts = [
      { id: "s1", memberId: "m1", dayIndex: 0, startMinutes: 0, endMinutes: 540 },
    ];
    const result = recommendMembers(0, 540, 600, MEMBERS, shifts, []);
    expect(result.recommended.map((r) => r.member.id)).toContain("m1");
  });

  it("sorts recommended members by ascending hours this week (load balancing)", () => {
    const shifts = [
      { id: "s1", memberId: "m1", dayIndex: 1, startMinutes: 0, endMinutes: 600 }, // 10h
      { id: "s2", memberId: "m3", dayIndex: 1, startMinutes: 0, endMinutes: 120 }, // 2h
    ];
    const result = recommendMembers(0, 540, 600, MEMBERS, shifts, []);
    expect(result.recommended.map((r) => r.member.id)).toEqual(["m2", "m3", "m1"]);
    expect(result.recommended.map((r) => r.hoursThisWeek)).toEqual([0, 2, 10]);
  });

  it("prioritizes the unavailable reason when a member is both unavailable and double-booked", () => {
    const shifts = [
      { id: "s1", memberId: "m1", dayIndex: 0, startMinutes: 540, endMinutes: 1080 },
    ];
    const unavailability: UnavailabilityBlock[] = [
      { id: "u1", memberId: "m1", dayIndex: 0, startMinutes: 540, endMinutes: 1080, reason: null },
    ];
    const result = recommendMembers(0, 600, 660, MEMBERS, shifts, unavailability);
    expect(result.excluded.find((e) => e.member.id === "m1")?.reason).toBe("unavailable");
  });
});

describe("formatExclusionReason", () => {
  it("formats unavailable", () => {
    expect(formatExclusionReason("unavailable")).toBe("불가 시간 등록");
  });

  it("formats already_booked", () => {
    expect(formatExclusionReason("already_booked")).toBe("이미 근무 중");
  });
});
