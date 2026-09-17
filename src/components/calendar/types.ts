export type CalendarMember = {
  id: string;
  name: string;
  color: string;
};

/** 주간 그리드 안에서 요일 인덱스(0=월 ... 6=일)와 분 단위 시간으로 표현되는 블록. */
export type CalendarBlock = {
  id: string;
  memberId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
  note?: string | null;
};
