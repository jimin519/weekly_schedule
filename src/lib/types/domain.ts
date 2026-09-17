import type { Tables } from "./database";

// profiles.role / schedule_weeks.status 등은 Postgres CHECK 제약으로만 강제되어
// 생성된 타입에서는 string 으로 나온다. 여기서 리터럴 유니온으로 좁혀서 재사용한다.

export type UserRole = "admin" | "member";
export type WeekStatus = "draft" | "published";
export type NotificationType =
  | "shift_created"
  | "shift_updated"
  | "shift_deleted"
  | "week_published"
  | "week_unpublished"
  | "inquiry_reply"
  | "new_inquiry"
  | "unavailability_conflict";
export type InquiryStatus = "open" | "resolved";
export type RecurrenceRule = {
  freq: "weekly";
  until?: string;
};

export type Profile = Omit<Tables<"profiles">, "role"> & { role: UserRole };
export type ScheduleWeek = Omit<Tables<"schedule_weeks">, "status"> & {
  status: WeekStatus;
};
export type Shift = Tables<"shifts">;
export type Unavailability = Omit<Tables<"unavailability">, "recurrence_rule"> & {
  recurrence_rule: RecurrenceRule | null;
};
export type Notification = Omit<Tables<"notifications">, "type"> & {
  type: NotificationType;
};
export type InquiryThread = Omit<Tables<"inquiry_threads">, "status"> & {
  status: InquiryStatus;
};
export type InquiryMessage = Tables<"inquiry_messages">;
