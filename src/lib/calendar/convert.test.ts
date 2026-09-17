import { describe, expect, it } from "vitest";
import { dayMinutesToISO, isoToDayMinutes } from "./convert";

describe("dayMinutesToISO", () => {
  it("converts Monday 09:00 Asia/Seoul to the correct UTC instant", () => {
    // 2026-09-14(월) 09:00 KST = 2026-09-14 00:00 UTC
    expect(dayMinutesToISO("2026-09-14", 0, 9 * 60)).toBe(
      "2026-09-14T00:00:00.000Z",
    );
  });

  it("rolls over to the next calendar day for late-night minutes", () => {
    // 2026-09-14(월) dayIndex 2 = 수요일, 09:00 KST = 09/16 00:00 UTC
    expect(dayMinutesToISO("2026-09-14", 2, 9 * 60)).toBe(
      "2026-09-16T00:00:00.000Z",
    );
  });
});

describe("isoToDayMinutes", () => {
  it("round-trips with dayMinutesToISO", () => {
    const iso = dayMinutesToISO("2026-09-14", 3, 13 * 60 + 30);
    expect(isoToDayMinutes(iso, "2026-09-14")).toEqual({
      dayIndex: 3,
      minutes: 13 * 60 + 30,
    });
  });

  it("returns dayIndex -1 when the timestamp falls outside the week", () => {
    const iso = dayMinutesToISO("2026-09-14", 0, 9 * 60);
    expect(isoToDayMinutes(iso, "2026-09-21").dayIndex).toBe(-1);
  });
});
