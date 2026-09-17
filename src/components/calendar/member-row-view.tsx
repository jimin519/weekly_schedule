import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS_KO } from "@/lib/calendar/week";
import { formatDurationLabel } from "@/lib/calendar/time";
import type { CalendarBlock, CalendarMember } from "./types";

/** 행=멤버, 열=요일 타임라인형 보기. 전체 현황을 한눈에 파악하기 위한 읽기 전용 뷰. */
export function MemberRowView({
  weekDates,
  members,
  blocks,
  visibleMemberIds,
  todayDate,
}: {
  weekDates: string[];
  members: CalendarMember[];
  blocks: CalendarBlock[];
  visibleMemberIds: Set<string>;
  todayDate: string;
}) {
  const visibleMembers = members.filter((m) => visibleMemberIds.has(m.id));

  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-background">
          <tr>
            <th className="w-40 border-b border-r px-3 py-2 text-left text-xs font-medium text-muted-foreground">
              멤버
            </th>
            {weekDates.map((date, i) => (
              <th
                key={date}
                className={cn(
                  "min-w-32 border-b px-2 py-2 text-center text-xs font-medium text-muted-foreground",
                  date === todayDate && "bg-accent/30",
                )}
              >
                {WEEKDAY_LABELS_KO[i]} {Number(date.slice(8, 10))}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMembers.map((member) => (
            <tr key={member.id}>
              <td className="border-r px-3 py-2 align-top">
                <div className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                  />
                  <span className="truncate font-medium">{member.name}</span>
                </div>
              </td>
              {weekDates.map((date, dayIndex) => {
                const dayBlocks = blocks
                  .filter((b) => b.memberId === member.id && b.dayIndex === dayIndex)
                  .sort((a, b) => a.startMinutes - b.startMinutes);
                return (
                  <td
                    key={date}
                    className={cn(
                      "border-b px-1.5 py-1.5 align-top",
                      date === todayDate && "bg-accent/10",
                    )}
                  >
                    <div className="flex flex-col gap-1">
                      {dayBlocks.map((block) => (
                        <span
                          key={block.id}
                          className="rounded px-1.5 py-0.5 text-center text-[11px] whitespace-nowrap"
                          style={{
                            backgroundColor: `${member.color}33`,
                            border: `1px solid ${member.color}`,
                          }}
                        >
                          {formatDurationLabel(block.startMinutes, block.endMinutes)}
                        </span>
                      ))}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {visibleMembers.length === 0 && (
        <p className="p-6 text-sm text-muted-foreground">
          표시할 멤버가 없습니다. 좌측에서 멤버를 선택해주세요.
        </p>
      )}
    </div>
  );
}
