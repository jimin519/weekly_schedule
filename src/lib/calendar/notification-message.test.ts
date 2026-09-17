import { describe, expect, it } from "vitest";
import { formatNotificationMessage } from "./notification-message";

describe("formatNotificationMessage", () => {
  it("formats week_published with the Mon-Sun date range", () => {
    const message = formatNotificationMessage("week_published", {
      week_start_date: "2026-09-14",
    });
    expect(message).toBe("9월 14일 – 9월 20일 스케줄이 게시되었습니다.");
  });

  it("formats week_unpublished", () => {
    const message = formatNotificationMessage("week_unpublished", {
      week_start_date: "2026-09-14",
    });
    expect(message).toBe("9월 14일 – 9월 20일 스케줄이 초안으로 되돌아갔습니다.");
  });

  it("formats shift_created with date and time", () => {
    const message = formatNotificationMessage("shift_created", {
      week_start_date: "2026-09-14",
      start_at: "2026-09-15T00:00:00+00:00", // 2026-09-15 09:00 KST (화)
      end_at: "2026-09-15T09:00:00+00:00",
    });
    expect(message).toBe("9월 15일 (화) 근무가 09:00–18:00에 배정되었습니다.");
  });

  it("formats shift_deleted", () => {
    const message = formatNotificationMessage("shift_deleted", {
      week_start_date: "2026-09-14",
      start_at: "2026-09-15T00:00:00+00:00",
      end_at: "2026-09-15T09:00:00+00:00",
    });
    expect(message).toBe("9월 15일 (화) 09:00–18:00 근무가 취소되었습니다.");
  });

  it("formats shift_updated matching the spec example exactly", () => {
    const message = formatNotificationMessage("shift_updated", {
      week_start_date: "2026-09-21",
      old_start_at: "2026-09-22T01:00:00+00:00", // 10:00 KST
      old_end_at: "2026-09-22T09:00:00+00:00", // 18:00 KST
      start_at: "2026-09-22T04:00:00+00:00", // 13:00 KST
      end_at: "2026-09-22T12:00:00+00:00", // 21:00 KST
    });
    expect(message).toBe(
      "9월 22일 (화) 근무가 10:00–18:00에서 13:00–21:00으로 변경되었습니다.",
    );
  });

  it("formats unavailability_conflict with the resolved member name", () => {
    const message = formatNotificationMessage(
      "unavailability_conflict",
      { start_at: "2026-09-15T00:00:00+00:00", end_at: "2026-09-15T04:00:00+00:00" },
      { memberName: "이서연" },
    );
    expect(message).toBe(
      "이서연님의 근무와 겹치는 불가 시간이 등록되었습니다: 09:00–13:00",
    );
  });

  it("falls back to a generic member label when name is not provided", () => {
    const message = formatNotificationMessage("unavailability_conflict", {
      start_at: "2026-09-15T00:00:00+00:00",
      end_at: "2026-09-15T04:00:00+00:00",
    });
    expect(message.startsWith("멤버님의")).toBe(true);
  });

  it("formats new_inquiry with the subject when present", () => {
    const message = formatNotificationMessage("new_inquiry", {
      subject: "다음 주 근무 변경 요청",
    });
    expect(message).toBe("새 문의가 도착했습니다: 다음 주 근무 변경 요청");
  });

  it("formats inquiry_reply with the subject when present", () => {
    const message = formatNotificationMessage("inquiry_reply", {
      subject: "휴가 문의",
    });
    expect(message).toBe("문의에 새 답장이 도착했습니다: 휴가 문의");
  });
});
