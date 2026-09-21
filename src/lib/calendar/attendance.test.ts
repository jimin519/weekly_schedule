import { describe, expect, it } from "vitest";
import {
  addToTotals,
  aggregateHoursByMember,
  attendanceBadgeLabel,
  dateMinutesToISO,
  describeRecord,
  emptyTotals,
  formatMinutes,
  formatSignedMinutes,
  minutesFromDateStart,
  summarizeAttendance,
  validateActualRange,
} from "./attendance";

// 2026-09-22(화) 09:00–18:00 KST = 00:00–09:00 UTC
const shift = { start_at: "2026-09-22T00:00:00.000Z", end_at: "2026-09-22T09:00:00.000Z" };
const AFTER = new Date("2026-09-23T00:00:00.000Z");
const BEFORE = new Date("2026-09-21T00:00:00.000Z");

const worked = (startIso: string, endIso: string) => ({
  status: "worked" as const,
  actual_start_at: startIso,
  actual_end_at: endIso,
});

describe("summarizeAttendance", () => {
  it("기록이 없고 이미 끝난 근무는 계획대로 근무한 것으로 간주한다", () => {
    const s = summarizeAttendance(shift, null, AFTER);
    expect(s.kind).toBe("unrecorded");
    expect(s.effectiveMinutes).toBe(540);
    expect(s.diffMinutes).toBe(0);
    expect(s.isSettled).toBe(true);
  });

  it("기록이 없고 아직 끝나지 않은 근무는 예정으로 본다", () => {
    const s = summarizeAttendance(shift, null, BEFORE);
    expect(s.kind).toBe("upcoming");
    expect(s.isSettled).toBe(false);
    expect(s.effectiveMinutes).toBe(540);
  });

  it("종료 시각이 계획보다 늦으면 연장으로 계산한다", () => {
    const s = summarizeAttendance(shift, worked(shift.start_at, "2026-09-22T10:00:00.000Z"), AFTER);
    expect(s.kind).toBe("extended");
    expect(s.diffMinutes).toBe(60);
    expect(s.effectiveMinutes).toBe(600);
  });

  it("종료 시각이 계획보다 빠르면 조퇴로 계산한다", () => {
    const s = summarizeAttendance(shift, worked(shift.start_at, "2026-09-22T07:00:00.000Z"), AFTER);
    expect(s.kind).toBe("shortened");
    expect(s.diffMinutes).toBe(-120);
    expect(s.effectiveMinutes).toBe(420);
  });

  it("시작과 종료가 함께 밀려 총 시간이 같으면 계획과 동일하게 본다", () => {
    const s = summarizeAttendance(
      shift,
      worked("2026-09-22T01:00:00.000Z", "2026-09-22T10:00:00.000Z"),
      AFTER,
    );
    expect(s.kind).toBe("as_planned");
    expect(s.diffMinutes).toBe(0);
  });

  it("결근은 0시간이고 계획 시간만큼 차감된다", () => {
    const s = summarizeAttendance(
      shift,
      { status: "absent", actual_start_at: null, actual_end_at: null },
      AFTER,
    );
    expect(s.kind).toBe("absent");
    expect(s.effectiveMinutes).toBe(0);
    expect(s.diffMinutes).toBe(-540);
  });

  it("아직 끝나지 않은 근무도 기록이 있으면 실제 시간으로 집계한다", () => {
    const s = summarizeAttendance(
      shift,
      worked(shift.start_at, "2026-09-22T07:00:00.000Z"),
      new Date("2026-09-22T05:00:00.000Z"),
    );
    expect(s.isSettled).toBe(true);
    expect(s.effectiveMinutes).toBe(420);
  });
});

describe("aggregateHoursByMember", () => {
  it("멤버별로 계획/실제/연장/차감/미확인/예정을 나눠 합산한다", () => {
    const totals = aggregateHoursByMember(
      [
        { member_id: "a", ...shift, record: null },
        { member_id: "a", ...shift, record: worked(shift.start_at, "2026-09-22T10:00:00.000Z") },
        { member_id: "a", ...shift, record: worked(shift.start_at, "2026-09-22T07:00:00.000Z") },
        { member_id: "b", ...shift, record: { status: "absent", actual_start_at: null, actual_end_at: null } },
      ],
      AFTER,
    );
    const a = totals.get("a")!;
    expect(a.shiftCount).toBe(3);
    expect(a.plannedMinutes).toBe(1620);
    expect(a.actualMinutes).toBe(540 + 600 + 420);
    expect(a.overtimeMinutes).toBe(60);
    expect(a.deductionMinutes).toBe(120);
    expect(a.unrecordedCount).toBe(1);

    const b = totals.get("b")!;
    expect(b.actualMinutes).toBe(0);
    expect(b.deductionMinutes).toBe(540);
  });

  it("아직 끝나지 않은 미기록 근무는 실제 시간에 넣지 않고 예정으로 분리한다", () => {
    const totals = aggregateHoursByMember([{ member_id: "a", ...shift, record: null }], BEFORE);
    const a = totals.get("a")!;
    expect(a.actualMinutes).toBe(0);
    expect(a.upcomingMinutes).toBe(540);
    expect(a.unrecordedCount).toBe(0);
  });

  it("addToTotals는 원본을 변경하지 않는다", () => {
    const base = emptyTotals();
    addToTotals(base, summarizeAttendance(shift, null, AFTER));
    expect(base.shiftCount).toBe(0);
  });
});

describe("표시 형식", () => {
  it("분을 시간/분으로 표시한다", () => {
    expect(formatMinutes(30)).toBe("30분");
    expect(formatMinutes(120)).toBe("2시간");
    expect(formatMinutes(90)).toBe("1시간 30분");
    expect(formatMinutes(0)).toBe("0분");
  });

  it("부호를 붙여 표시한다", () => {
    expect(formatSignedMinutes(60)).toBe("+1시간");
    expect(formatSignedMinutes(-30)).toBe("−30분");
    expect(formatSignedMinutes(0)).toBe("±0");
  });

  it("계획과 같으면 뱃지가 없고 결근/연장/조퇴만 뱃지를 갖는다", () => {
    expect(attendanceBadgeLabel(summarizeAttendance(shift, null, AFTER))).toBeNull();
    expect(
      attendanceBadgeLabel(summarizeAttendance(shift, worked(shift.start_at, "2026-09-22T10:00:00.000Z"), AFTER)),
    ).toBe("+1시간");
    expect(
      attendanceBadgeLabel(
        summarizeAttendance(shift, { status: "absent", actual_start_at: null, actual_end_at: null }, AFTER),
      ),
    ).toBe("결근");
  });
});

describe("날짜 기준 분 변환", () => {
  it("Seoul 날짜 00:00부터의 분을 계산한다", () => {
    expect(minutesFromDateStart(shift.start_at, "2026-09-22")).toBe(540);
    expect(minutesFromDateStart(shift.end_at, "2026-09-22")).toBe(1080);
  });

  it("자정을 넘긴 시각은 1440 이상이 된다", () => {
    // 2026-09-22 23:30 KST → 다음 날 01:00 KST
    expect(minutesFromDateStart("2026-09-22T16:00:00.000Z", "2026-09-22")).toBe(1500);
  });

  it("분을 다시 ISO로 되돌리면 원래 값과 같다", () => {
    expect(dateMinutesToISO("2026-09-22", 540)).toBe(shift.start_at);
    expect(dateMinutesToISO("2026-09-22", 1500)).toBe("2026-09-22T16:00:00.000Z");
  });
});

describe("validateActualRange", () => {
  it("종료가 시작보다 늦어야 한다", () => {
    expect(validateActualRange(540, 540)).not.toBeNull();
    expect(validateActualRange(600, 540)).not.toBeNull();
    expect(validateActualRange(540, 1080)).toBeNull();
  });
  it("24시간을 넘을 수 없다", () => {
    expect(validateActualRange(0, 1441)).not.toBeNull();
  });
});

describe("describeRecord", () => {
  it("기록이 없으면 null이다", () => {
    expect(describeRecord(shift, null)).toBeNull();
  });
  it("연장은 실제 시간과 증감, 메모를 함께 보여준다", () => {
    expect(
      describeRecord(shift, { ...worked(shift.start_at, "2026-09-22T10:00:00.000Z"), note: "인수인계" }),
    ).toBe("실제 09:00–19:00 (연장 +1시간) · 인수인계");
  });
  it("조퇴를 표시한다", () => {
    expect(describeRecord(shift, worked(shift.start_at, "2026-09-22T07:00:00.000Z"))).toBe(
      "실제 09:00–16:00 (조퇴 −2시간)",
    );
  });
  it("결근을 표시한다", () => {
    expect(
      describeRecord(shift, { status: "absent", actual_start_at: null, actual_end_at: null, note: "병가" }),
    ).toBe("결근으로 기록됨 · 병가");
  });
  it("계획과 같으면 증감을 생략한다", () => {
    expect(describeRecord(shift, worked(shift.start_at, shift.end_at))).toBe("실제 09:00–18:00");
  });
});
