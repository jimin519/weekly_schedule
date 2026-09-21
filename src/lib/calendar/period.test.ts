import { describe, expect, it } from "vitest";
import { periodFor, shiftAnchor } from "./period";

describe("periodFor", () => {
  it("주 단위는 월요일부터 다음 월요일 직전까지다", () => {
    const p = periodFor("week", "2026-09-24");
    expect(p.startDate).toBe("2026-09-21");
    expect(p.endDate).toBe("2026-09-28");
    expect(p.label).toBe("9월 21일 – 9월 27일");
  });

  it("월 단위는 1일부터 다음 달 1일 직전까지다", () => {
    const p = periodFor("month", "2026-09-24");
    expect(p.startDate).toBe("2026-09-01");
    expect(p.endDate).toBe("2026-10-01");
    expect(p.label).toBe("2026년 9월");
  });

  it("12월은 다음 해 1월 1일에서 끝난다", () => {
    expect(periodFor("month", "2026-12-15").endDate).toBe("2027-01-01");
  });

  it("월을 넘나드는 주도 올바른 범위를 만든다", () => {
    const p = periodFor("week", "2026-09-30");
    expect(p.startDate).toBe("2026-09-28");
    expect(p.label).toBe("9월 28일 – 10월 4일");
  });
});

describe("shiftAnchor", () => {
  it("주 단위로 이동한다", () => {
    expect(shiftAnchor("week", "2026-09-24", 1)).toBe("2026-09-28");
    expect(shiftAnchor("week", "2026-09-24", -1)).toBe("2026-09-14");
  });

  it("월 단위로 이동한다", () => {
    expect(shiftAnchor("month", "2026-09-24", 1)).toBe("2026-10-01");
    expect(shiftAnchor("month", "2026-01-15", -1)).toBe("2025-12-01");
  });
});
