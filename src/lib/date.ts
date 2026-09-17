import { formatInTimeZone } from "date-fns-tz";
import { ko } from "date-fns/locale";

export const APP_TIMEZONE = "Asia/Seoul";

export function formatSeoul(date: Date, pattern: string): string {
  return formatInTimeZone(date, APP_TIMEZONE, pattern, { locale: ko });
}

/** Asia/Seoul 기준 이번 주 월요일 날짜(YYYY-MM-DD)를 반환한다. */
export function currentWeekStartDate(now: Date = new Date()): string {
  const seoulDateStr = formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd");
  const isoWeekday = Number(formatInTimeZone(now, APP_TIMEZONE, "i")); // 1=월 ... 7=일
  const [y, m, d] = seoulDateStr.split("-").map(Number);

  // 자정 경계/DST 영향을 피하기 위해 UTC 정오를 기준으로 날짜만 계산한다.
  const noonUtc = new Date(Date.UTC(y, m - 1, d, 12));
  noonUtc.setUTCDate(noonUtc.getUTCDate() - (isoWeekday - 1));

  return formatInTimeZone(noonUtc, "UTC", "yyyy-MM-dd");
}
