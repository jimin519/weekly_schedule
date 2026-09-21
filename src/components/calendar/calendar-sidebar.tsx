import { MiniMonthCalendar } from "./mini-month-calendar";
import { MemberFilterList } from "./member-filter-list";
import type { CalendarMember } from "./types";

export function CalendarSidebar({
  weekStart,
  onSelectDate,
  members,
  visibleMemberIds,
  onToggleMember,
  onToggleAllMembers,
  hoursByMemberId,
  adjustmentByMemberId,
  extra,
}: {
  weekStart: string;
  onSelectDate: (dateStr: string) => void;
  members: CalendarMember[];
  visibleMemberIds: Set<string>;
  onToggleMember: (id: string) => void;
  onToggleAllMembers: (visible: boolean) => void;
  hoursByMemberId?: Map<string, number>;
  adjustmentByMemberId?: Map<string, number>;
  extra?: React.ReactNode;
}) {
  return (
    <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-r bg-background p-3">
      <MiniMonthCalendar weekStart={weekStart} onSelectDate={onSelectDate} />
      {extra}
      <MemberFilterList
        members={members}
        visibleIds={visibleMemberIds}
        onToggle={onToggleMember}
        onToggleAll={onToggleAllMembers}
        hoursByMemberId={hoursByMemberId}
        adjustmentByMemberId={adjustmentByMemberId}
      />
    </aside>
  );
}
