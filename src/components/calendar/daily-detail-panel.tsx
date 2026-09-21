import { useMemo } from "react";
import { BlockDetailPanel } from "./block-detail-panel";
import { Button } from "@/components/ui/button";
import { formatDurationLabel, minutesToLabel } from "@/lib/calendar/time";
import { formatSeoul } from "@/lib/date";
import type { CalendarBlock, CalendarMember } from "./types";

export function DailyDetailPanel({
  date,
  weekDates,
  blocks,
  members,
  onClose,
  currentMemberId,
  onInquireAboutShift,
  recordLabelByBlockId,
}: {
  date: string | null;
  weekDates: string[];
  blocks: CalendarBlock[];
  members: CalendarMember[];
  onClose: () => void;
  currentMemberId?: string;
  onInquireAboutShift?: (block: CalendarBlock) => void;
  /** 근무 블록 id → 실제 근무 기록 설명(본인 근무에만 존재) */
  recordLabelByBlockId?: Map<string, string>;
}) {
  const membersById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);
  const dayIndex = date ? weekDates.indexOf(date) : -1;

  const dayBlocks = useMemo(
    () =>
      blocks
        .filter((b) => b.dayIndex === dayIndex)
        .sort((a, b) => a.startMinutes - b.startMinutes),
    [blocks, dayIndex],
  );

  const bounds = useMemo(() => {
    if (dayBlocks.length === 0) return { min: 9 * 60, max: 18 * 60 };
    return {
      min: Math.min(...dayBlocks.map((b) => b.startMinutes)),
      max: Math.max(...dayBlocks.map((b) => b.endMinutes)),
    };
  }, [dayBlocks]);
  const span = Math.max(bounds.max - bounds.min, 60);

  return (
    <BlockDetailPanel
      open={date !== null}
      onOpenChange={(open) => !open && onClose()}
      title={date ? formatSeoul(new Date(`${date}T12:00:00Z`), "M월 d일 (EEEE)") : ""}
      description={`함께 근무하는 멤버 ${dayBlocks.length}명`}
    >
      {dayBlocks.length === 0 ? (
        <p className="pt-4 text-sm text-muted-foreground">이 날은 배정된 근무가 없습니다.</p>
      ) : (
        <div className="space-y-5 pt-2">
          <ul className="space-y-1.5">
            {dayBlocks.map((b) => {
              const member = membersById.get(b.memberId);
              return (
                <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: member?.color ?? "#94A3B8" }}
                  />
                  <span className="flex-1 font-medium">{member?.name ?? "미배정"}</span>
                  <span className="text-muted-foreground">
                    {formatDurationLabel(b.startMinutes, b.endMinutes)}
                  </span>
                  {onInquireAboutShift && b.memberId === currentMemberId && (
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={() => onInquireAboutShift(b)}
                    >
                      문의하기
                    </Button>
                  )}
                  {recordLabelByBlockId?.get(b.id) && (
                    <div className="basis-full pl-[18px] text-xs text-muted-foreground">
                      {recordLabelByBlockId.get(b.id)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">시간대별 겹침</p>
            <div className="space-y-1">
              {dayBlocks.map((b) => {
                const member = membersById.get(b.memberId);
                const leftPct = ((b.startMinutes - bounds.min) / span) * 100;
                const widthPct = ((b.endMinutes - b.startMinutes) / span) * 100;
                return (
                  <div key={b.id} className="relative h-5 rounded bg-muted">
                    <div
                      className="absolute inset-y-0 rounded"
                      style={{
                        left: `${leftPct}%`,
                        width: `${widthPct}%`,
                        backgroundColor: member?.color ?? "#94A3B8",
                      }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>{minutesToLabel(bounds.min)}</span>
              <span>{minutesToLabel(bounds.max)}</span>
            </div>
          </div>
        </div>
      )}
    </BlockDetailPanel>
  );
}
