import { fromZonedTime } from "date-fns-tz";
import { APP_TIMEZONE, formatSeoul } from "@/lib/date";
import { getWeekDates } from "./week";
import { labelToMinutes, minutesToLabel } from "./time";

/** 주 시작일 + 요일 인덱스(0=월) + 분(0~1440)을 Asia/Seoul 기준 UTC ISO 문자열로 변환한다. */
export function dayMinutesToISO(
  weekStartDate: string,
  dayIndex: number,
  minutes: number,
): string {
  const [y, m, d] = weekStartDate.split("-").map(Number);
  const base = new Date(Date.UTC(y, m - 1, d));
  base.setUTCDate(base.getUTCDate() + dayIndex + Math.floor(minutes / 1440));

  const dateStr = `${base.getUTCFullYear()}-${String(base.getUTCMonth() + 1).padStart(2, "0")}-${String(base.getUTCDate()).padStart(2, "0")}`;
  const timeLabel = minutesToLabel(((minutes % 1440) + 1440) % 1440);
  const wallClock = `${dateStr}T${timeLabel}:00`;

  return fromZonedTime(wallClock, APP_TIMEZONE).toISOString();
}

/** ISO 타임스탬프를 해당 주 기준 요일 인덱스 + 분으로 변환한다. 주 밖의 날짜면 dayIndex는 -1. */
export function isoToDayMinutes(
  iso: string,
  weekStartDate: string,
): { dayIndex: number; minutes: number } {
  const date = new Date(iso);
  const dateStr = formatSeoul(date, "yyyy-MM-dd");
  const dayIndex = getWeekDates(weekStartDate).indexOf(dateStr);
  const minutes = labelToMinutes(formatSeoul(date, "HH:mm"));
  return { dayIndex, minutes };
}

/** end_at이 자정(다음날 00:00)인 경우 등 종료 시각을 같은 날 기준 분으로 정규화한다. */
export function normalizeEndMinutes(
  startDayIndex: number,
  endIso: string,
  weekStartDate: string,
): number {
  const { dayIndex: endDayIndex, minutes } = isoToDayMinutes(endIso, weekStartDate);
  if (endDayIndex !== startDayIndex) {
    // 다음 날로 넘어가는 경우(주로 자정 종료) 그날의 끝(24:00)으로 처리
    return 24 * 60;
  }
  return minutes;
}
