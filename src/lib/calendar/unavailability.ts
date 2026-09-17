import { formatSeoul } from "@/lib/date";
import type { Unavailability } from "@/lib/types/domain";
import { labelToMinutes } from "./time";

export type UnavailabilityBlock = {
  id: string;
  memberId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  reason: string | null;
};

type UnavailabilityRow = Pick<
  Unavailability,
  "id" | "member_id" | "start_at" | "end_at" | "is_recurring" | "recurrence_rule" | "reason"
>;

/**
 * 불가 시간 레코드(반복 규칙 포함)를 주어진 주(weekDates)에 실제로 나타나는
 * 요일별 블록으로 펼친다. Asia/Seoul 기준으로 요일/시각을 계산한다.
 */
export function expandUnavailabilityForWeek(
  rows: UnavailabilityRow[],
  weekDates: string[],
): UnavailabilityBlock[] {
  const blocks: UnavailabilityBlock[] = [];

  for (const row of rows) {
    const anchor = new Date(row.start_at);
    const anchorDateStr = formatSeoul(anchor, "yyyy-MM-dd");
    const startMinutes = labelToMinutes(formatSeoul(anchor, "HH:mm"));
    let endMinutes = labelToMinutes(formatSeoul(new Date(row.end_at), "HH:mm"));
    // 자정에 끝나는 경우(00:00) 하루의 끝으로 처리
    if (endMinutes <= startMinutes) endMinutes = 24 * 60;

    if (!row.is_recurring) {
      const dayIndex = weekDates.indexOf(anchorDateStr);
      if (dayIndex !== -1) {
        blocks.push({
          id: row.id,
          memberId: row.member_id,
          dayIndex,
          startMinutes,
          endMinutes,
          reason: row.reason,
        });
      }
      continue;
    }

    const anchorWeekday = formatSeoul(anchor, "i");
    const until = row.recurrence_rule?.until;

    weekDates.forEach((date, dayIndex) => {
      if (date < anchorDateStr) return;
      if (until && date > until) return;
      const weekday = formatSeoul(new Date(`${date}T12:00:00Z`), "i");
      if (weekday !== anchorWeekday) return;

      blocks.push({
        id: `${row.id}:${date}`,
        memberId: row.member_id,
        dayIndex,
        startMinutes,
        endMinutes,
        reason: row.reason,
      });
    });
  }

  return blocks;
}
