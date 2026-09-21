import { formatSeoul } from "@/lib/date";
import { dayMinutesToISO } from "./convert";
import type { AttendanceStatus } from "@/lib/types/domain";

type PlannedShift = { start_at: string; end_at: string };
type RecordLike =
  | {
      status: AttendanceStatus;
      actual_start_at: string | null;
      actual_end_at: string | null;
    }
  | null
  | undefined;

export type AttendanceKind =
  | "upcoming"
  | "unrecorded"
  | "as_planned"
  | "extended"
  | "shortened"
  | "absent";

export type AttendanceSummary = {
  kind: AttendanceKind;
  plannedMinutes: number;
  /** 기록이 있으면 실제 시간, 없으면 계획 시간(계획대로 근무한 것으로 간주) */
  effectiveMinutes: number;
  /** 실제 − 계획. 연장이면 양수, 조퇴/결근이면 음수 */
  diffMinutes: number;
  /** 이미 끝났거나 기록이 있어 실제 근무 시간으로 집계할 수 있는지 */
  isSettled: boolean;
};

export function minutesBetween(startIso: string, endIso: string): number {
  return Math.round((new Date(endIso).getTime() - new Date(startIso).getTime()) / 60000);
}

/** 근무 1건의 계획 대비 실제 근무를 요약한다. 기록이 없으면 계획대로 근무한 것으로 본다. */
export function summarizeAttendance(
  shift: PlannedShift,
  record: RecordLike,
  now: Date = new Date(),
): AttendanceSummary {
  const plannedMinutes = minutesBetween(shift.start_at, shift.end_at);

  if (!record) {
    const ended = new Date(shift.end_at).getTime() <= now.getTime();
    return {
      kind: ended ? "unrecorded" : "upcoming",
      plannedMinutes,
      effectiveMinutes: plannedMinutes,
      diffMinutes: 0,
      isSettled: ended,
    };
  }

  if (record.status === "absent" || !record.actual_start_at || !record.actual_end_at) {
    return {
      kind: "absent",
      plannedMinutes,
      effectiveMinutes: 0,
      diffMinutes: -plannedMinutes,
      isSettled: true,
    };
  }

  const actualMinutes = minutesBetween(record.actual_start_at, record.actual_end_at);
  const diffMinutes = actualMinutes - plannedMinutes;
  return {
    kind: diffMinutes > 0 ? "extended" : diffMinutes < 0 ? "shortened" : "as_planned",
    plannedMinutes,
    effectiveMinutes: actualMinutes,
    diffMinutes,
    isSettled: true,
  };
}

export type HoursTotals = {
  shiftCount: number;
  plannedMinutes: number;
  /** 끝났거나 기록된 근무의 실제 시간 합계 */
  actualMinutes: number;
  overtimeMinutes: number;
  deductionMinutes: number;
  /** 아직 끝나지 않았고 기록도 없는 근무의 계획 시간 */
  upcomingMinutes: number;
  /** 끝났지만 기록이 없어 계획대로로 간주된 근무 수 */
  unrecordedCount: number;
};

export function emptyTotals(): HoursTotals {
  return {
    shiftCount: 0,
    plannedMinutes: 0,
    actualMinutes: 0,
    overtimeMinutes: 0,
    deductionMinutes: 0,
    upcomingMinutes: 0,
    unrecordedCount: 0,
  };
}

export function addToTotals(totals: HoursTotals, summary: AttendanceSummary): HoursTotals {
  return {
    shiftCount: totals.shiftCount + 1,
    plannedMinutes: totals.plannedMinutes + summary.plannedMinutes,
    actualMinutes: totals.actualMinutes + (summary.isSettled ? summary.effectiveMinutes : 0),
    overtimeMinutes: totals.overtimeMinutes + Math.max(summary.diffMinutes, 0),
    deductionMinutes: totals.deductionMinutes + Math.max(-summary.diffMinutes, 0),
    upcomingMinutes: totals.upcomingMinutes + (summary.isSettled ? 0 : summary.plannedMinutes),
    unrecordedCount: totals.unrecordedCount + (summary.kind === "unrecorded" ? 1 : 0),
  };
}

export function aggregateHoursByMember(
  rows: { member_id: string; start_at: string; end_at: string; record: RecordLike }[],
  now: Date = new Date(),
): Map<string, HoursTotals> {
  const byMember = new Map<string, HoursTotals>();
  for (const row of rows) {
    const summary = summarizeAttendance(row, row.record, now);
    byMember.set(row.member_id, addToTotals(byMember.get(row.member_id) ?? emptyTotals(), summary));
  }
  return byMember;
}

export function hasShiftStarted(shift: { start_at: string }, now: Date = new Date()): boolean {
  return new Date(shift.start_at).getTime() <= now.getTime();
}

/** 분을 "1시간 30분" / "30분" / "2시간" 형태로 표시한다. */
export function formatMinutes(totalMinutes: number): string {
  const abs = Math.abs(totalMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

/** 부호를 붙여 "+1시간" / "−30분" 형태로 표시한다. 0이면 "±0". */
export function formatSignedMinutes(diffMinutes: number): string {
  if (diffMinutes === 0) return "±0";
  return `${diffMinutes > 0 ? "+" : "−"}${formatMinutes(diffMinutes)}`;
}

/** 블록/목록에 붙일 짧은 뱃지 문구. 계획과 같으면 null. */
export function attendanceBadgeLabel(summary: AttendanceSummary): string | null {
  if (summary.kind === "absent") return "결근";
  if (summary.kind === "extended" || summary.kind === "shortened") {
    return formatSignedMinutes(summary.diffMinutes);
  }
  return null;
}

/** 근무 목록/상세에 붙일 실제 근무 설명. 기록이 없으면 null. */
export function describeRecord(
  shift: PlannedShift,
  record: (RecordLike & { note?: string | null }) | null | undefined,
): string | null {
  if (!record) return null;
  const summary = summarizeAttendance(shift, record);
  const note = record.note ? ` · ${record.note}` : "";
  if (summary.kind === "absent") return `결근으로 기록됨${note}`;
  if (!record.actual_start_at || !record.actual_end_at) return null;

  const range = `${formatSeoul(new Date(record.actual_start_at), "HH:mm")}–${formatSeoul(new Date(record.actual_end_at), "HH:mm")}`;
  const diff =
    summary.diffMinutes === 0
      ? ""
      : ` (${summary.diffMinutes > 0 ? "연장" : "조퇴"} ${formatSignedMinutes(summary.diffMinutes)})`;
  return `실제 ${range}${diff}${note}`;
}

/** Asia/Seoul 기준 날짜(yyyy-MM-dd). */
export function seoulDateOf(iso: string): string {
  return formatSeoul(new Date(iso), "yyyy-MM-dd");
}

/** 해당 Seoul 날짜 00:00부터의 분. 자정을 넘기면 1440 이상이 된다. */
export function minutesFromDateStart(iso: string, dateStr: string): number {
  const base = new Date(dayMinutesToISO(dateStr, 0, 0)).getTime();
  return Math.round((new Date(iso).getTime() - base) / 60000);
}

/** 날짜 + 그 날 00:00부터의 분(1440 이상 가능)을 UTC ISO로 변환한다. */
export function dateMinutesToISO(dateStr: string, minutes: number): string {
  return dayMinutesToISO(dateStr, 0, minutes);
}

export const MAX_ACTUAL_SHIFT_MINUTES = 24 * 60;

export function validateActualRange(startMinutes: number, endMinutes: number): string | null {
  if (endMinutes <= startMinutes) return "종료 시각이 시작 시각보다 늦어야 합니다.";
  if (endMinutes - startMinutes > MAX_ACTUAL_SHIFT_MINUTES) {
    return "근무 시간은 24시간을 넘을 수 없습니다.";
  }
  return null;
}
