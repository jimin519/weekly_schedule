import { addWeeks, formatDateOnly, mondayOfWeekContaining } from "./week";

export type PeriodKind = "week" | "month";

export type Period = {
  kind: PeriodKind;
  /** 기간의 첫 날(YYYY-MM-DD, 포함) */
  startDate: string;
  /** 기간이 끝난 다음 날(YYYY-MM-DD, 미포함) */
  endDate: string;
  label: string;
};

function firstOfMonth(dateStr: string): string {
  return `${dateStr.slice(0, 7)}-01`;
}

function addMonths(firstOfMonthStr: string, delta: number): string {
  const [y, m] = firstOfMonthStr.split("-").map(Number);
  return formatDateOnly(new Date(Date.UTC(y, m - 1 + delta, 1, 12)));
}

/** 기준 날짜가 속한 주(월~일) 또는 월의 범위를 만든다. */
export function periodFor(kind: PeriodKind, anchorDate: string): Period {
  if (kind === "week") {
    const startDate = mondayOfWeekContaining(anchorDate);
    const endDate = addWeeks(startDate, 1);
    const lastDay = formatDateOnly(new Date(Date.UTC(...toYmd(endDate), 12) - 24 * 3600 * 1000));
    return {
      kind,
      startDate,
      endDate,
      label: `${toKoreanMonthDay(startDate)} – ${toKoreanMonthDay(lastDay)}`,
    };
  }

  const startDate = firstOfMonth(anchorDate);
  const [y, m] = startDate.split("-").map(Number);
  return { kind, startDate, endDate: addMonths(startDate, 1), label: `${y}년 ${m}월` };
}

/** 기준 날짜를 기간 단위로 delta만큼 이동한다. */
export function shiftAnchor(kind: PeriodKind, anchorDate: string, delta: number): string {
  if (kind === "week") return addWeeks(mondayOfWeekContaining(anchorDate), delta);
  return addMonths(firstOfMonth(anchorDate), delta);
}

function toYmd(dateStr: string): [number, number, number] {
  const [y, m, d] = dateStr.split("-").map(Number);
  return [y, m - 1, d];
}

function toKoreanMonthDay(dateStr: string): string {
  const [, m, d] = dateStr.split("-").map(Number);
  return `${m}월 ${d}일`;
}
