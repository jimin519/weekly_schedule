"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { WeekTopBar } from "@/components/calendar/week-top-bar";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { WeekTimeGrid } from "@/components/calendar/week-time-grid";
import { DailyDetailPanel } from "@/components/calendar/daily-detail-panel";
import { useWeekNavigation } from "@/components/calendar/use-week-navigation";
import { useCalendarShortcuts } from "@/components/calendar/use-calendar-shortcuts";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { useTableRealtime } from "@/lib/realtime/use-table-realtime";
import { useHighlightedIds } from "@/lib/realtime/use-highlighted-ids";
import { useActiveMembers } from "@/lib/queries/members";
import { useWeek, weekQueryKey } from "@/lib/queries/weeks";
import { shiftsQueryKey, useShifts } from "@/lib/queries/shifts";
import { isoToDayMinutes, normalizeEndMinutes } from "@/lib/calendar/convert";
import type { CalendarBlock } from "@/components/calendar/types";

type View = "mine" | "team";

export function MyScheduleClient({
  memberId,
  memberName,
  memberColor,
}: {
  memberId: string;
  memberName: string;
  memberColor: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const { weekStart, weekDates, weekLabel, goToday, goPrev, goNext, goToWeekOf } =
    useWeekNavigation(weekParam ?? undefined);

  useEffect(() => {
    if (weekParam) goToWeekOf(weekParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goToWeekOf는 안정적인 콜백이다
  }, [weekParam]);
  const isMobile = useIsMobile();
  const [mobileDayIndex, setMobileDayIndex] = useState(0);
  const [view, setView] = useState<View>("mine");
  const [detailDate, setDetailDate] = useState<string | null>(null);
  const [hiddenMemberIds, setHiddenMemberIds] = useState<Set<string>>(new Set());

  const weekQuery = useWeek(weekStart);
  const week = weekQuery.data ?? null;

  const shiftsQuery = useShifts(week?.id);
  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const membersQuery = useActiveMembers();
  const members = useMemo(
    () =>
      (membersQuery.data ?? []).map((m) => ({ id: m.id, name: m.name, color: m.color })),
    [membersQuery.data],
  );
  const allMembers = useMemo(() => {
    if (members.some((m) => m.id === memberId)) return members;
    return [...members, { id: memberId, name: memberName, color: memberColor }];
  }, [members, memberId, memberName, memberColor]);

  useCalendarShortcuts({
    onToday: () => {
      goToday();
      setMobileDayIndex(0);
    },
    onPrev: isMobile ? () => setMobileDayIndex((d) => Math.max(d - 1, 0)) : goPrev,
    onNext: isMobile ? () => setMobileDayIndex((d) => Math.min(d + 1, 6)) : goNext,
    onEscape: () => setDetailDate(null),
  });

  const blocks: CalendarBlock[] = useMemo(() => {
    return shifts.flatMap((s) => {
      const { dayIndex, minutes: startMinutes } = isoToDayMinutes(s.start_at, weekStart);
      if (dayIndex === -1) return [];
      const endMinutes = normalizeEndMinutes(dayIndex, s.end_at, weekStart);
      return [
        { id: s.id, memberId: s.member_id, dayIndex, startMinutes, endMinutes, note: s.note },
      ];
    });
  }, [shifts, weekStart]);

  const myTotalMinutes = useMemo(
    () =>
      blocks
        .filter((b) => b.memberId === memberId)
        .reduce((sum, b) => sum + (b.endMinutes - b.startMinutes), 0),
    [blocks, memberId],
  );

  const visibleMemberIds = useMemo(
    () =>
      view === "mine"
        ? new Set([memberId])
        : new Set(allMembers.map((m) => m.id).filter((id) => !hiddenMemberIds.has(id))),
    [view, memberId, allMembers, hiddenMemberIds],
  );

  const displayDates = isMobile ? [weekDates[mobileDayIndex]] : weekDates;

  const queryClient = useQueryClient();
  const { highlightedIds, markHighlighted } = useHighlightedIds();

  const shiftsRealtimeStatus = useTableRealtime(
    "shifts",
    week ? `week_id=eq.${week.id}` : undefined,
    (payload) => {
      const row = (payload.new ?? payload.old) as { id?: string } | null;
      if (row?.id) markHighlighted(row.id);
      queryClient.invalidateQueries({ queryKey: shiftsQueryKey(week?.id) });
    },
    { enabled: !!week, invalidateKey: shiftsQueryKey(week?.id) },
  );

  const weekRealtimeStatus = useTableRealtime(
    "schedule_weeks",
    `week_start_date=eq.${weekStart}`,
    () => queryClient.invalidateQueries({ queryKey: weekQueryKey(weekStart) }),
    { invalidateKey: weekQueryKey(weekStart) },
  );

  const isRealtimeDisconnected = [shiftsRealtimeStatus, weekRealtimeStatus].includes(
    "disconnected",
  );

  if (weekQuery.isError || membersQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <p>스케줄을 불러오지 못했습니다.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            weekQuery.refetch();
            membersQuery.refetch();
          }}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (weekQuery.isLoading || membersQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-full flex-1" />
      </div>
    );
  }

  if (!week) {
    return (
      <div className="flex h-full flex-col">
        <WeekTopBar
          weekLabel={weekLabel}
          onPrev={goPrev}
          onNext={goNext}
          onToday={goToday}
        />
        <ConnectionBanner show={isRealtimeDisconnected} />
        <div className="flex flex-1 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
          <p>아직 스케줄이 게시되지 않았습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <WeekTopBar
        weekLabel={weekLabel}
        onPrev={isMobile ? () => setMobileDayIndex((d) => Math.max(d - 1, 0)) : goPrev}
        onNext={isMobile ? () => setMobileDayIndex((d) => Math.min(d + 1, 6)) : goNext}
        onToday={() => {
          goToday();
          setMobileDayIndex(0);
        }}
        viewSwitch={
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">
              이번 주 총 근무 시간: {Math.floor(myTotalMinutes / 60)}시간{" "}
              {myTotalMinutes % 60}분
            </span>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="mine">내 근무만</TabsTrigger>
                <TabsTrigger value="team">팀 전체</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />
      <ConnectionBanner show={isRealtimeDisconnected} />
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <CalendarSidebar
            weekStart={weekStart}
            onSelectDate={goToWeekOf}
            members={view === "team" ? allMembers : []}
            visibleMemberIds={visibleMemberIds}
            onToggleMember={(id) =>
              setHiddenMemberIds((prev) => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAllMembers={(visible) =>
              setHiddenMemberIds(visible ? new Set() : new Set(allMembers.map((m) => m.id)))
            }
          />
        )}
        <WeekTimeGrid
          weekDates={displayDates}
          blocks={blocks}
          members={allMembers}
          visibleMemberIds={visibleMemberIds}
          selectedBlockId={null}
          onSelectBlock={() => {}}
          onSelectDate={setDetailDate}
          emphasizedMemberId={memberId}
          highlightedBlockIds={highlightedIds}
          readOnly
        />
      </div>

      <DailyDetailPanel
        date={detailDate}
        weekDates={weekDates}
        blocks={blocks}
        members={allMembers}
        onClose={() => setDetailDate(null)}
        currentMemberId={memberId}
        onInquireAboutShift={(block) =>
          router.push(`/me/inquiries?shiftId=${block.id}&weekId=${week.id}`)
        }
      />
    </div>
  );
}
