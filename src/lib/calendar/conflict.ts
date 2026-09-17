import { rangesOverlap } from "./time";
import type { UnavailabilityBlock } from "./unavailability";

type TimeBlock = {
  id: string;
  memberId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
};

/** 특정 멤버의 특정 요일/시간대가 그 멤버의 불가 시간과 겹치는지 확인한다. */
export function findUnavailabilityConflicts(
  memberId: string,
  dayIndex: number,
  startMinutes: number,
  endMinutes: number,
  unavailabilityBlocks: UnavailabilityBlock[],
): UnavailabilityBlock[] {
  return unavailabilityBlocks.filter(
    (u) =>
      u.memberId === memberId &&
      u.dayIndex === dayIndex &&
      rangesOverlap(startMinutes, endMinutes, u.startMinutes, u.endMinutes),
  );
}

/** 같은 멤버에게 이미 겹치는 근무가 배정되어 있는지 확인한다(중복 배정 차단용). */
export function hasDoubleBooking(
  memberId: string,
  dayIndex: number,
  startMinutes: number,
  endMinutes: number,
  blocks: TimeBlock[],
  excludeBlockId?: string,
): boolean {
  return blocks.some(
    (b) =>
      b.id !== excludeBlockId &&
      b.memberId === memberId &&
      b.dayIndex === dayIndex &&
      rangesOverlap(startMinutes, endMinutes, b.startMinutes, b.endMinutes),
  );
}
