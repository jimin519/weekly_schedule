import { describe, expect, it } from "vitest";
import { expandUnavailabilityForWeek } from "./unavailability";

// 2026-09-14(월) ~ 2026-09-20(일)
const WEEK_DATES = [
  "2026-09-14",
  "2026-09-15",
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
  "2026-09-19",
  "2026-09-20",
];

describe("expandUnavailabilityForWeek", () => {
  it("places a one-time entry on its exact date", () => {
    const result = expandUnavailabilityForWeek(
      [
        {
          id: "u1",
          member_id: "m1",
          start_at: "2026-09-16T00:00:00+09:00", // 수요일 00:00
          end_at: "2026-09-16T04:00:00+09:00",
          is_recurring: false,
          recurrence_rule: null,
          reason: "개인 사정",
        },
      ],
      WEEK_DATES,
    );
    expect(result).toEqual([
      {
        id: "u1",
        memberId: "m1",
        dayIndex: 2,
        startMinutes: 0,
        endMinutes: 240,
        reason: "개인 사정",
      },
    ]);
  });

  it("omits a one-time entry whose date falls outside the displayed week", () => {
    const result = expandUnavailabilityForWeek(
      [
        {
          id: "u1",
          member_id: "m1",
          start_at: "2026-09-01T00:00:00+09:00",
          end_at: "2026-09-01T04:00:00+09:00",
          is_recurring: false,
          recurrence_rule: null,
          reason: null,
        },
      ],
      WEEK_DATES,
    );
    expect(result).toEqual([]);
  });

  it("expands a weekly-recurring entry onto every matching weekday from the anchor onward", () => {
    // 앵커: 2026-09-01(화) 09:00-13:00 매주 반복
    const result = expandUnavailabilityForWeek(
      [
        {
          id: "u2",
          member_id: "m2",
          start_at: "2026-09-01T09:00:00+09:00",
          end_at: "2026-09-01T13:00:00+09:00",
          is_recurring: true,
          recurrence_rule: { freq: "weekly" },
          reason: "병원 진료",
        },
      ],
      WEEK_DATES,
    );
    // 이 주(9/14~9/20)의 화요일은 9/15
    expect(result).toEqual([
      {
        id: "u2:2026-09-15",
        memberId: "m2",
        dayIndex: 1,
        startMinutes: 540,
        endMinutes: 780,
        reason: "병원 진료",
      },
    ]);
  });

  it("stops recurring after the until date", () => {
    const result = expandUnavailabilityForWeek(
      [
        {
          id: "u3",
          member_id: "m3",
          start_at: "2026-09-01T09:00:00+09:00",
          end_at: "2026-09-01T13:00:00+09:00",
          is_recurring: true,
          recurrence_rule: { freq: "weekly", until: "2026-09-10" },
          reason: null,
        },
      ],
      WEEK_DATES,
    );
    expect(result).toEqual([]);
  });

  it("treats a midnight end time as the end of day", () => {
    const result = expandUnavailabilityForWeek(
      [
        {
          id: "u4",
          member_id: "m4",
          start_at: "2026-09-19T00:00:00+09:00", // 토요일 00:00
          end_at: "2026-09-20T00:00:00+09:00", // 일요일 00:00 (자정)
          is_recurring: false,
          recurrence_rule: null,
          reason: "하루 종일",
        },
      ],
      WEEK_DATES,
    );
    expect(result).toEqual([
      {
        id: "u4",
        memberId: "m4",
        dayIndex: 5,
        startMinutes: 0,
        endMinutes: 1440,
        reason: "하루 종일",
      },
    ]);
  });
});
