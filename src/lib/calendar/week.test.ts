import { describe, expect, it } from "vitest";
import {
  addWeeks,
  formatWeekLabel,
  getWeekDates,
  mondayOfWeekContaining,
  weekdayIndexOf,
} from "./week";

describe("addWeeks", () => {
  it("moves forward by whole weeks", () => {
    expect(addWeeks("2026-09-14", 1)).toBe("2026-09-21");
  });

  it("moves backward by whole weeks", () => {
    expect(addWeeks("2026-09-14", -1)).toBe("2026-09-07");
  });

  it("returns the same date for delta 0", () => {
    expect(addWeeks("2026-09-14", 0)).toBe("2026-09-14");
  });
});

describe("getWeekDates", () => {
  it("returns the 7 dates of the week starting Monday", () => {
    expect(getWeekDates("2026-09-14")).toEqual([
      "2026-09-14",
      "2026-09-15",
      "2026-09-16",
      "2026-09-17",
      "2026-09-18",
      "2026-09-19",
      "2026-09-20",
    ]);
  });
});

describe("formatWeekLabel", () => {
  it("labels the first Monday-week of the month as 1주차", () => {
    // 2026-09-07 은 9월의 첫 번째 월요일
    expect(formatWeekLabel("2026-09-07")).toBe("2026년 9월 1주차");
  });

  it("increments week-of-month for later Mondays in the same month", () => {
    expect(formatWeekLabel("2026-09-14")).toBe("2026년 9월 2주차");
    expect(formatWeekLabel("2026-09-21")).toBe("2026년 9월 3주차");
  });
});

describe("weekdayIndexOf", () => {
  it("returns 0 for Monday and 6 for Sunday", () => {
    expect(weekdayIndexOf("2026-09-14")).toBe(0);
    expect(weekdayIndexOf("2026-09-20")).toBe(6);
  });

  it("returns the correct index for a mid-week date", () => {
    expect(weekdayIndexOf("2026-09-17")).toBe(3);
  });
});

describe("mondayOfWeekContaining", () => {
  it("returns the same date when already Monday", () => {
    expect(mondayOfWeekContaining("2026-09-14")).toBe("2026-09-14");
  });

  it("rolls back to Monday from a mid-week date", () => {
    expect(mondayOfWeekContaining("2026-09-17")).toBe("2026-09-14");
  });

  it("rolls back to Monday from Sunday", () => {
    expect(mondayOfWeekContaining("2026-09-20")).toBe("2026-09-14");
  });
});
