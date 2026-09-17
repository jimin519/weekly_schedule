import { PX_PER_MINUTE } from "./constants";
import type { UnavailabilityBlock } from "@/lib/calendar/unavailability";
import type { CalendarMember } from "./types";

export function UnavailabilityOverlay({
  block,
  member,
}: {
  block: UnavailabilityBlock;
  member: CalendarMember | undefined;
}) {
  const top = block.startMinutes * PX_PER_MINUTE;
  const height = (block.endMinutes - block.startMinutes) * PX_PER_MINUTE;
  const color = member?.color ?? "#94A3B8";

  return (
    <div
      role="presentation"
      title={member ? `${member.name} 불가 시간${block.reason ? `: ${block.reason}` : ""}` : undefined}
      className="pointer-events-none absolute inset-x-0 z-0 opacity-40"
      style={{
        top,
        height,
        backgroundImage: `repeating-linear-gradient(45deg, ${color} 0, ${color} 2px, transparent 2px, transparent 8px)`,
      }}
    />
  );
}
