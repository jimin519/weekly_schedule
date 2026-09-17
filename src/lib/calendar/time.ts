export const MINUTES_PER_DAY = 24 * 60;
export const SLOT_MINUTES = 30;
export const SLOTS_PER_DAY = MINUTES_PER_DAY / SLOT_MINUTES;

/** 0~1439 분을 30분 단위로 스냅한다. */
export function snapToSlot(minutes: number, slot: number = SLOT_MINUTES): number {
  return Math.round(minutes / slot) * slot;
}

export function clampMinutes(minutes: number): number {
  return Math.min(Math.max(minutes, 0), MINUTES_PER_DAY);
}

/** 분(0~1439)을 'HH:mm' 라벨로 변환한다. */
export function minutesToLabel(minutes: number): string {
  const clamped = clampMinutes(minutes);
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** 'HH:mm' 라벨을 분으로 변환한다. */
export function labelToMinutes(label: string): number {
  const [h, m] = label.split(":").map(Number);
  return h * 60 + m;
}

export function formatDurationLabel(startMinutes: number, endMinutes: number): string {
  return `${minutesToLabel(startMinutes)}–${minutesToLabel(endMinutes)}`;
}

/** 같은 날 안에서 두 시간 구간이 겹치는지 확인한다(맞닿기만 하는 경우는 겹침 아님). */
export function rangesOverlap(
  aStart: number,
  aEnd: number,
  bStart: number,
  bEnd: number,
): boolean {
  return aStart < bEnd && bStart < aEnd;
}
