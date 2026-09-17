export const WEEKDAY_LABELS_KO = ["월", "화", "수", "목", "금", "토", "일"] as const;

/** 'YYYY-MM-DD' 문자열을 날짜 연산에 안전한 UTC 정오 Date로 파싱한다. */
function parseDateOnly(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
}

export function formatDateOnly(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 월요일 시작 주차 문자열(YYYY-MM-DD)을 delta 주만큼 이동한다. */
export function addWeeks(weekStartDate: string, delta: number): string {
  const date = parseDateOnly(weekStartDate);
  date.setUTCDate(date.getUTCDate() + delta * 7);
  return formatDateOnly(date);
}

/** 주의 월~일 7일치 날짜 문자열(YYYY-MM-DD) 배열을 반환한다. */
export function getWeekDates(weekStartDate: string): string[] {
  const date = parseDateOnly(weekStartDate);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(date);
    d.setUTCDate(date.getUTCDate() + i);
    return formatDateOnly(d);
  });
}

/** 'YYYY년 M월 N주차' 형식의 주차 라벨을 만든다. N은 해당 월의 몇 번째 월요일 시작 주인지. */
export function formatWeekLabel(weekStartDate: string): string {
  const monday = parseDateOnly(weekStartDate);
  const year = monday.getUTCFullYear();
  const month = monday.getUTCMonth(); // 0-based
  const day = monday.getUTCDate();

  const firstOfMonth = new Date(Date.UTC(year, month, 1, 12));
  const firstWeekday = firstOfMonth.getUTCDay(); // 0=일 ... 6=토
  const firstMonday = firstWeekday === 1 ? 1 : firstWeekday === 0 ? 2 : 9 - firstWeekday;

  const weekOfMonth = Math.floor((day - firstMonday) / 7) + 1;

  return `${year}년 ${month + 1}월 ${weekOfMonth}주차`;
}

export function isSameDate(a: string, b: string): boolean {
  return a === b;
}

/** 'YYYY-MM-DD' 문자열의 월요일 시작 요일 인덱스(0=월 ... 6=일)를 반환한다. */
export function weekdayIndexOf(dateStr: string): number {
  const date = parseDateOnly(dateStr);
  return (date.getUTCDay() + 6) % 7;
}

/** 주어진 날짜가 속한 주의 월요일(YYYY-MM-DD)을 반환한다. */
export function mondayOfWeekContaining(dateStr: string): string {
  const date = parseDateOnly(dateStr);
  date.setUTCDate(date.getUTCDate() - weekdayIndexOf(dateStr));
  return formatDateOnly(date);
}
