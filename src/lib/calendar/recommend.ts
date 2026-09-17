import { findUnavailabilityConflicts, hasDoubleBooking } from "./conflict";
import type { UnavailabilityBlock } from "./unavailability";

type Member = { id: string; name: string; color: string };

type TimeBlock = {
  id: string;
  memberId: string;
  dayIndex: number;
  startMinutes: number;
  endMinutes: number;
};

export type ExclusionReason = "unavailable" | "already_booked";

export type RecommendedMember = {
  member: Member;
  hoursThisWeek: number;
};

export type ExcludedMember = {
  member: Member;
  reason: ExclusionReason;
  hoursThisWeek: number;
};

export type RecommendationResult = {
  recommended: RecommendedMember[];
  excluded: ExcludedMember[];
};

function hoursForMember(memberId: string, shiftBlocks: TimeBlock[]): number {
  const minutes = shiftBlocks
    .filter((b) => b.memberId === memberId)
    .reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

/**
 * 특정 시간대에 배정 가능한 멤버를 추천한다.
 * 1. 해당 시간대와 불가 시간(반복 포함)이 겹치는 멤버 제외
 * 2. 같은 시간대에 이미 근무가 배정된 멤버 제외
 * 3. 남은 인원을 이번 주 누적 근무 시간이 적은 순으로 정렬(근무 균형)
 */
export function recommendMembers(
  dayIndex: number,
  startMinutes: number,
  endMinutes: number,
  members: Member[],
  shiftBlocks: TimeBlock[],
  unavailabilityBlocks: UnavailabilityBlock[],
): RecommendationResult {
  const recommended: RecommendedMember[] = [];
  const excluded: ExcludedMember[] = [];

  for (const member of members) {
    const hoursThisWeek = hoursForMember(member.id, shiftBlocks);

    const isUnavailable =
      findUnavailabilityConflicts(
        member.id,
        dayIndex,
        startMinutes,
        endMinutes,
        unavailabilityBlocks,
      ).length > 0;

    if (isUnavailable) {
      excluded.push({ member, reason: "unavailable", hoursThisWeek });
      continue;
    }

    const isAlreadyBooked = hasDoubleBooking(
      member.id,
      dayIndex,
      startMinutes,
      endMinutes,
      shiftBlocks,
    );

    if (isAlreadyBooked) {
      excluded.push({ member, reason: "already_booked", hoursThisWeek });
      continue;
    }

    recommended.push({ member, hoursThisWeek });
  }

  recommended.sort((a, b) => a.hoursThisWeek - b.hoursThisWeek);

  return { recommended, excluded };
}

export function formatExclusionReason(reason: ExclusionReason): string {
  return reason === "unavailable" ? "불가 시간 등록" : "이미 근무 중";
}
