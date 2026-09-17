import { describe, expect, it } from "vitest";
import { currentWeekStartDate } from "./date";

describe("currentWeekStartDate", () => {
  it("returns the Monday of the same Asia/Seoul week", () => {
    // 2026-09-17 은 목요일(Asia/Seoul) → 같은 주 월요일은 2026-09-14
    const thursdayUtc = new Date("2026-09-17T05:00:00Z"); // Asia/Seoul 14:00
    expect(currentWeekStartDate(thursdayUtc)).toBe("2026-09-14");
  });

  it("rolls back correctly across a Sunday", () => {
    // 2026-09-13 일요일(Asia/Seoul) → 그 주 월요일은 2026-09-07
    const sundayUtc = new Date("2026-09-13T01:00:00Z"); // Asia/Seoul 10:00
    expect(currentWeekStartDate(sundayUtc)).toBe("2026-09-07");
  });

  it("handles the boundary just after Asia/Seoul midnight", () => {
    // Asia/Seoul 월요일 00:30 인 UTC 시각(전날 15:30 UTC)에도 같은 주 월요일을 반환해야 한다.
    const mondayJustAfterMidnightUtc = new Date("2026-09-13T15:30:00Z"); // Asia/Seoul 2026-09-14 00:30
    expect(currentWeekStartDate(mondayJustAfterMidnightUtc)).toBe(
      "2026-09-14",
    );
  });
});
