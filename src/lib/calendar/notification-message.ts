import { formatSeoul } from "@/lib/date";
import type { NotificationType } from "@/lib/types/domain";

type NotificationPayload = Record<string, unknown>;

function formatWeekRangeLabel(weekStartDate: string): string {
  const start = new Date(`${weekStartDate}T12:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${formatSeoul(start, "M월 d일")} – ${formatSeoul(end, "M월 d일")}`;
}

function formatShiftDateLabel(payload: NotificationPayload): string {
  return formatSeoul(new Date(String(payload.start_at)), "M월 d일 (EEE)");
}

function formatTimeRange(startIso: string, endIso: string): string {
  return `${formatSeoul(new Date(startIso), "HH:mm")}–${formatSeoul(new Date(endIso), "HH:mm")}`;
}

/** 알림 타입+payload로부터 사람이 읽을 수 있는 한국어 문구를 생성한다. */
export function formatNotificationMessage(
  type: NotificationType,
  payload: NotificationPayload,
  context: { memberName?: string } = {},
): string {
  switch (type) {
    case "week_published":
      return `${formatWeekRangeLabel(String(payload.week_start_date))} 스케줄이 게시되었습니다.`;
    case "week_unpublished":
      return `${formatWeekRangeLabel(String(payload.week_start_date))} 스케줄이 초안으로 되돌아갔습니다.`;
    case "shift_created":
      return `${formatShiftDateLabel(payload)} 근무가 ${formatTimeRange(String(payload.start_at), String(payload.end_at))}에 배정되었습니다.`;
    case "shift_deleted":
      return `${formatShiftDateLabel(payload)} ${formatTimeRange(String(payload.start_at), String(payload.end_at))} 근무가 취소되었습니다.`;
    case "shift_updated":
      return `${formatShiftDateLabel(payload)} 근무가 ${formatTimeRange(String(payload.old_start_at), String(payload.old_end_at))}에서 ${formatTimeRange(String(payload.start_at), String(payload.end_at))}으로 변경되었습니다.`;
    case "unavailability_conflict":
      return `${context.memberName ?? "멤버"}님의 근무와 겹치는 불가 시간이 등록되었습니다: ${formatTimeRange(String(payload.start_at), String(payload.end_at))}`;
    case "new_inquiry":
      return payload.subject
        ? `새 문의가 도착했습니다: ${String(payload.subject)}`
        : "새 문의가 도착했습니다.";
    case "inquiry_reply":
      return payload.subject
        ? `문의에 새 답장이 도착했습니다: ${String(payload.subject)}`
        : "문의에 새 답장이 도착했습니다.";
    default:
      return "새 알림이 있습니다.";
  }
}
