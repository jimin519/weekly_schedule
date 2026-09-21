"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WeekTopBar } from "@/components/calendar/week-top-bar";
import { CalendarSidebar } from "@/components/calendar/calendar-sidebar";
import { WeekTimeGrid } from "@/components/calendar/week-time-grid";
import { MemberRowView } from "@/components/calendar/member-row-view";
import { BlockDetailPanel } from "@/components/calendar/block-detail-panel";
import { useWeekNavigation } from "@/components/calendar/use-week-navigation";
import { useCalendarShortcuts } from "@/components/calendar/use-calendar-shortcuts";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { useTableRealtime } from "@/lib/realtime/use-table-realtime";
import { useHighlightedIds } from "@/lib/realtime/use-highlighted-ids";
import { useActiveMembers } from "@/lib/queries/members";
import { useSetWeekStatus, useWeek, weekQueryKey } from "@/lib/queries/weeks";
import {
  shiftsQueryKey,
  useCopyPreviousWeek,
  useCreateShift,
  useDeleteShift,
  useShifts,
  useUpdateShift,
} from "@/lib/queries/shifts";
import { useAllUnavailability, unavailabilityQueryKey } from "@/lib/queries/unavailability";
import {
  ATTENDANCE_RANGE_ROOT_KEY,
  useDeleteShiftRecord,
  useSaveShiftRecord,
  useWeekShiftRecords,
  weekRecordsQueryKey,
} from "@/lib/queries/shift-records";
import { AttendanceEditor, type AttendanceSaveInput } from "@/components/attendance/attendance-editor";
import {
  attendanceBadgeLabel,
  hasShiftStarted,
  summarizeAttendance,
} from "@/lib/calendar/attendance";
import { addWeeks, WEEKDAY_LABELS_KO } from "@/lib/calendar/week";
import {
  dayMinutesToISO,
  isoToDayMinutes,
  normalizeEndMinutes,
} from "@/lib/calendar/convert";
import { expandUnavailabilityForWeek } from "@/lib/calendar/unavailability";
import { findUnavailabilityConflicts, hasDoubleBooking } from "@/lib/calendar/conflict";
import { formatExclusionReason, recommendMembers } from "@/lib/calendar/recommend";
import { formatDurationLabel, labelToMinutes, minutesToLabel } from "@/lib/calendar/time";
import type { CalendarBlock } from "@/components/calendar/types";

type View = "grid" | "rows";

export function AdminScheduleClient({ adminId }: { adminId: string }) {
  const searchParams = useSearchParams();
  const weekParam = searchParams.get("week");
  const { weekStart, weekDates, weekLabel, goToday, goPrev, goNext, goToWeekOf } =
    useWeekNavigation(weekParam ?? undefined);

  // 알림 클릭 등으로 ?week= 파라미터가 바뀌면(마운트된 상태에서도) 해당 주로 이동한다.
  useEffect(() => {
    if (weekParam) goToWeekOf(weekParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goToWeekOf는 안정적인 콜백이다
  }, [weekParam]);
  const [view, setView] = useState<View>("grid");
  const isMobile = useIsMobile();
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  const membersQuery = useActiveMembers();
  const members = useMemo(
    () =>
      (membersQuery.data ?? []).map((m) => ({ id: m.id, name: m.name, color: m.color })),
    [membersQuery.data],
  );

  const [visibleMemberIds, setVisibleMemberIds] = useState<Set<string> | null>(null);
  // 멤버 목록이 처음 로드되면 전체 표시를 기본값으로 한다(렌더 중 상태 보정).
  if (visibleMemberIds === null && members.length > 0) {
    setVisibleMemberIds(new Set(members.map((m) => m.id)));
  }
  const effectiveVisibleIds = visibleMemberIds ?? new Set<string>();

  const weekQuery = useWeek(weekStart, { createIfMissing: true });
  const week = weekQuery.data ?? null;

  const shiftsQuery = useShifts(week?.id);
  const shifts = useMemo(() => shiftsQuery.data ?? [], [shiftsQuery.data]);

  const recordsQuery = useWeekShiftRecords(week?.id);
  const recordsByShiftId = useMemo(
    () => new Map((recordsQuery.data ?? []).map((r) => [r.shift_id, r])),
    [recordsQuery.data],
  );

  const unavailabilityQuery = useAllUnavailability();
  const unavailabilityBlocks = useMemo(
    () => expandUnavailabilityForWeek(unavailabilityQuery.data ?? [], weekDates),
    [unavailabilityQuery.data, weekDates],
  );

  const createShift = useCreateShift(week?.id);
  const updateShift = useUpdateShift(week?.id);
  const deleteShift = useDeleteShift(week?.id);
  const saveRecord = useSaveShiftRecord(week?.id);
  const deleteRecord = useDeleteShiftRecord(week?.id);
  const copyPreviousWeek = useCopyPreviousWeek(week?.id);
  const setWeekStatus = useSetWeekStatus(weekStart);

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

  const recordsRealtimeStatus = useTableRealtime(
    "shift_records",
    undefined,
    () => {
      queryClient.invalidateQueries({ queryKey: weekRecordsQueryKey(week?.id) });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_RANGE_ROOT_KEY });
    },
    { invalidateKey: weekRecordsQueryKey(week?.id) },
  );

  const unavailabilityRealtimeStatus = useTableRealtime(
    "unavailability",
    undefined,
    () => queryClient.invalidateQueries({ queryKey: unavailabilityQueryKey("all") }),
    { invalidateKey: unavailabilityQueryKey("all") },
  );

  const isRealtimeDisconnected = [
    shiftsRealtimeStatus,
    weekRealtimeStatus,
    unavailabilityRealtimeStatus,
    recordsRealtimeStatus,
  ].includes("disconnected");

  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [draftCreation, setDraftCreation] = useState<{
    dayIndex: number;
    start: number;
    end: number;
  } | null>(null);
  const [pendingConflict, setPendingConflict] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);
  const [showExcluded, setShowExcluded] = useState(false);
  const [statusDialog, setStatusDialog] = useState<"publish" | "unpublish" | null>(null);

  useCalendarShortcuts({
    onToday: () => {
      goToday();
      setMobileDayIndex(0);
    },
    onPrev: isMobile ? () => setMobileDayIndex((d) => Math.max(d - 1, 0)) : goPrev,
    onNext: isMobile ? () => setMobileDayIndex((d) => Math.min(d + 1, 6)) : goNext,
    onEscape: () => {
      setSelectedShiftId(null);
      setDraftCreation(null);
    },
  });

  const blocks: CalendarBlock[] = useMemo(() => {
    return shifts.flatMap((s) => {
      const { dayIndex, minutes: startMinutes } = isoToDayMinutes(s.start_at, weekStart);
      if (dayIndex === -1) return [];
      const endMinutes = normalizeEndMinutes(dayIndex, s.end_at, weekStart);
      const badge = attendanceBadgeLabel(summarizeAttendance(s, recordsByShiftId.get(s.id)));
      return [
        { id: s.id, memberId: s.member_id, dayIndex, startMinutes, endMinutes, note: s.note, badge },
      ];
    });
  }, [shifts, weekStart, recordsByShiftId]);

  const shiftsById = useMemo(() => new Map(shifts.map((s) => [s.id, s])), [shifts]);
  const blocksById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);

  const recommendation = useMemo(() => {
    if (!draftCreation) return null;
    return recommendMembers(
      draftCreation.dayIndex,
      draftCreation.start,
      draftCreation.end,
      members,
      blocks,
      unavailabilityBlocks,
    );
  }, [draftCreation, members, blocks, unavailabilityBlocks]);

  // 좌측 멤버별 시간: 기록이 있으면 실제 근무 시간, 없으면 계획 시간으로 합산한다.
  const { hoursByMemberId, adjustmentByMemberId } = useMemo(() => {
    const hours = new Map<string, number>();
    const adjustments = new Map<string, number>();
    for (const s of shifts) {
      const summary = summarizeAttendance(s, recordsByShiftId.get(s.id));
      hours.set(s.member_id, (hours.get(s.member_id) ?? 0) + summary.effectiveMinutes);
      if (summary.diffMinutes !== 0) {
        adjustments.set(s.member_id, (adjustments.get(s.member_id) ?? 0) + summary.diffMinutes);
      }
    }
    return { hoursByMemberId: hours, adjustmentByMemberId: adjustments };
  }, [shifts, recordsByShiftId]);

  const publishSummary = useMemo(() => {
    const assignedMemberIds = new Set(blocks.map((b) => b.memberId));
    const conflictCount = blocks.filter(
      (b) =>
        findUnavailabilityConflicts(
          b.memberId,
          b.dayIndex,
          b.startMinutes,
          b.endMinutes,
          unavailabilityBlocks,
        ).length > 0,
    ).length;
    return {
      shiftCount: blocks.length,
      memberCount: assignedMemberIds.size,
      conflictCount,
    };
  }, [blocks, unavailabilityBlocks]);

  function handleMutationError(error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("exclude") || message.toLowerCase().includes("shifts")) {
      toast.error("이미 해당 시간에 근무가 배정되어 있습니다.");
    } else {
      toast.error(message);
    }
  }

  function runWithConflictCheck(
    memberId: string,
    dayIndex: number,
    start: number,
    end: number,
    action: () => void,
  ) {
    const conflicts = findUnavailabilityConflicts(
      memberId,
      dayIndex,
      start,
      end,
      unavailabilityBlocks,
    );
    if (conflicts.length > 0) {
      const member = members.find((m) => m.id === memberId);
      setPendingConflict({
        message: `${member?.name ?? "이 멤버"}의 등록된 불가 시간과 겹칩니다. 그래도 배정하시겠습니까?`,
        onConfirm: action,
      });
      return;
    }
    action();
  }

  function handleCreateBlock(dayIndex: number, start: number, end: number) {
    setSelectedShiftId(null);
    setShowExcluded(false);
    setDraftCreation({ dayIndex: isMobile ? mobileDayIndex : dayIndex, start, end });
  }

  function commitCreate(memberId: string) {
    if (!draftCreation || !week) return;
    const { dayIndex, start, end } = draftCreation;

    if (hasDoubleBooking(memberId, dayIndex, start, end, blocks)) {
      toast.error("이미 해당 시간에 근무가 배정되어 있습니다.");
      return;
    }

    runWithConflictCheck(memberId, dayIndex, start, end, () => {
      createShift.mutate(
        {
          memberId,
          startAt: dayMinutesToISO(weekStart, dayIndex, start),
          endAt: dayMinutesToISO(weekStart, dayIndex, end),
          createdBy: adminId,
        },
        {
          onError: handleMutationError,
          onSuccess: () => setDraftCreation(null),
        },
      );
    });
  }

  function handleMoveBlock(id: string, dayIndex: number, start: number) {
    const shift = shiftsById.get(id);
    const block = blocksById.get(id);
    if (!shift || !block) return;
    const duration = block.endMinutes - block.startMinutes;
    const end = start + duration;

    if (hasDoubleBooking(shift.member_id, dayIndex, start, end, blocks, id)) {
      toast.error("이미 해당 시간에 근무가 배정되어 있습니다.");
      return;
    }

    runWithConflictCheck(shift.member_id, dayIndex, start, end, () => {
      updateShift.mutate(
        {
          id,
          startAt: dayMinutesToISO(weekStart, dayIndex, start),
          endAt: dayMinutesToISO(weekStart, dayIndex, end),
        },
        { onError: handleMutationError },
      );
    });
  }

  function handleResizeBlock(id: string, end: number) {
    const shift = shiftsById.get(id);
    const block = blocksById.get(id);
    if (!shift || !block) return;

    if (hasDoubleBooking(shift.member_id, block.dayIndex, block.startMinutes, end, blocks, id)) {
      toast.error("이미 해당 시간에 근무가 배정되어 있습니다.");
      return;
    }

    runWithConflictCheck(shift.member_id, block.dayIndex, block.startMinutes, end, () => {
      updateShift.mutate(
        { id, endAt: dayMinutesToISO(weekStart, block.dayIndex, end) },
        { onError: handleMutationError },
      );
    });
  }

  function handleChangeShiftMember(newMemberId: string) {
    const shift = selectedShiftId ? shiftsById.get(selectedShiftId) : undefined;
    const block = selectedShiftId ? blocksById.get(selectedShiftId) : undefined;
    if (!shift || !block) return;

    if (
      hasDoubleBooking(
        newMemberId,
        block.dayIndex,
        block.startMinutes,
        block.endMinutes,
        blocks,
        shift.id,
      )
    ) {
      toast.error("이미 해당 시간에 근무가 배정되어 있습니다.");
      return;
    }

    runWithConflictCheck(
      newMemberId,
      block.dayIndex,
      block.startMinutes,
      block.endMinutes,
      () => {
        updateShift.mutate(
          { id: shift.id, memberId: newMemberId },
          { onError: handleMutationError },
        );
      },
    );
  }

  function handleChangeShiftTime(field: "start" | "end", label: string) {
    const shift = selectedShiftId ? shiftsById.get(selectedShiftId) : undefined;
    const block = selectedShiftId ? blocksById.get(selectedShiftId) : undefined;
    if (!shift || !block) return;

    const minutes = labelToMinutes(label);
    const newStart = field === "start" ? minutes : block.startMinutes;
    const newEnd = field === "end" ? minutes : block.endMinutes;
    if (newEnd <= newStart) {
      toast.error("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }

    if (hasDoubleBooking(shift.member_id, block.dayIndex, newStart, newEnd, blocks, shift.id)) {
      toast.error("이미 해당 시간에 근무가 배정되어 있습니다.");
      return;
    }

    runWithConflictCheck(shift.member_id, block.dayIndex, newStart, newEnd, () => {
      updateShift.mutate(
        {
          id: shift.id,
          startAt: dayMinutesToISO(weekStart, block.dayIndex, newStart),
          endAt: dayMinutesToISO(weekStart, block.dayIndex, newEnd),
        },
        { onError: handleMutationError },
      );
    });
  }

  function handleChangeNote(note: string) {
    if (!selectedShiftId) return;
    updateShift.mutate(
      { id: selectedShiftId, note: note || null },
      { onError: handleMutationError },
    );
  }

  function handleDeleteShift() {
    if (!selectedShiftId) return;
    deleteShift.mutate(selectedShiftId, { onError: handleMutationError });
    setSelectedShiftId(null);
  }

  function handleSaveRecord(input: AttendanceSaveInput) {
    if (!selectedShiftId) return;
    saveRecord.mutate(
      { shiftId: selectedShiftId, recordedBy: adminId, ...input },
      {
        onSuccess: () => toast.success("실제 근무 기록을 저장했습니다."),
        onError: () => toast.error("기록을 저장하지 못했습니다."),
      },
    );
  }

  function handleClearRecord() {
    if (!selectedShiftId) return;
    deleteRecord.mutate(selectedShiftId, {
      onSuccess: () => toast.success("기록을 초기화했습니다."),
      onError: () => toast.error("기록을 초기화하지 못했습니다."),
    });
  }

  function handleCopyLastWeek() {
    if (!week) return;
    copyPreviousWeek.mutate(
      {
        currentWeekStartDate: weekStart,
        previousWeekStartDate: addWeeks(weekStart, -1),
        createdBy: adminId,
      },
      {
        onSuccess: ({ copied }) => {
          if (copied === 0) toast.info("지난주에 복사할 근무가 없습니다.");
          else toast.success(`지난주 근무 ${copied}건을 복사했습니다.`);
        },
        onError: handleMutationError,
      },
    );
  }

  function handleConfirmPublish() {
    if (!week) return;
    setWeekStatus.mutate(
      { id: week.id, status: "published" },
      {
        onSuccess: () => toast.success("이번 주 스케줄을 게시했습니다."),
        onError: handleMutationError,
      },
    );
    setStatusDialog(null);
  }

  function handleConfirmUnpublish() {
    if (!week) return;
    setWeekStatus.mutate(
      { id: week.id, status: "draft" },
      {
        onSuccess: () => toast.success("초안으로 되돌렸습니다."),
        onError: handleMutationError,
      },
    );
    setStatusDialog(null);
  }

  const displayDates = isMobile ? [weekDates[mobileDayIndex]] : weekDates;
  const selectedShift = selectedShiftId ? shiftsById.get(selectedShiftId) : undefined;
  const selectedBlock = selectedShiftId ? blocksById.get(selectedShiftId) : undefined;

  if (membersQuery.isError || weekQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <p>데이터를 불러오지 못했습니다.</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            membersQuery.refetch();
            weekQuery.refetch();
          }}
        >
          다시 시도
        </Button>
      </div>
    );
  }

  if (membersQuery.isLoading || weekQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-full flex-1" />
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
        <p>등록된 멤버가 없습니다.</p>
        <p>멤버 관리 탭에서 먼저 멤버를 초대해주세요.</p>
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
            <Badge variant={week?.status === "published" ? "default" : "secondary"}>
              {week?.status === "published" ? "게시됨" : "초안"}
            </Badge>
            <Tabs value={view} onValueChange={(v) => setView(v as View)}>
              <TabsList>
                <TabsTrigger value="grid">타임 그리드</TabsTrigger>
                <TabsTrigger value="rows">멤버 행</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyLastWeek}
              disabled={copyPreviousWeek.isPending}
            >
              지난주 복사
            </Button>
            {week?.status === "published" ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setStatusDialog("unpublish")}
              >
                초안으로 되돌리기
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStatusDialog("publish")}>
                게시
              </Button>
            )}
          </div>
        }
      />
      <ConnectionBanner show={isRealtimeDisconnected} />
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <CalendarSidebar
            weekStart={weekStart}
            onSelectDate={goToWeekOf}
            members={members}
            visibleMemberIds={effectiveVisibleIds}
            onToggleMember={(id) =>
              setVisibleMemberIds((prev) => {
                const next = new Set(prev ?? []);
                if (next.has(id)) next.delete(id);
                else next.add(id);
                return next;
              })
            }
            onToggleAllMembers={(visible) =>
              setVisibleMemberIds(visible ? new Set(members.map((m) => m.id)) : new Set())
            }
            hoursByMemberId={hoursByMemberId}
            adjustmentByMemberId={adjustmentByMemberId}
          />
        )}

        {view === "grid" ? (
          <WeekTimeGrid
            weekDates={displayDates}
            blocks={blocks}
            unavailabilityBlocks={unavailabilityBlocks}
            members={members}
            visibleMemberIds={effectiveVisibleIds}
            selectedBlockId={selectedShiftId}
            onSelectBlock={(id) => {
              setSelectedShiftId(id);
              setDraftCreation(null);
            }}
            onCreateBlock={handleCreateBlock}
            onMoveBlock={handleMoveBlock}
            onResizeBlock={handleResizeBlock}
            highlightedBlockIds={highlightedIds}
          />
        ) : (
          <MemberRowView
            weekDates={weekDates}
            members={members}
            blocks={blocks}
            visibleMemberIds={effectiveVisibleIds}
            todayDate={weekStart}
          />
        )}
      </div>

      <BlockDetailPanel
        open={draftCreation !== null}
        onOpenChange={(open) => !open && setDraftCreation(null)}
        title="새 근무 배정"
        description={
          draftCreation
            ? `${WEEKDAY_LABELS_KO[draftCreation.dayIndex]}요일 · ${formatDurationLabel(draftCreation.start, draftCreation.end)}`
            : undefined
        }
      >
        {draftCreation && recommendation && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>추천 인원</Label>
              {recommendation.recommended.length === 0 ? (
                <p className="text-sm text-muted-foreground">추천 가능한 멤버가 없습니다.</p>
              ) : (
                <ul className="space-y-1">
                  {recommendation.recommended.map(({ member, hoursThisWeek }) => (
                    <li key={member.id}>
                      <button
                        type="button"
                        onClick={() => commitCreate(member.id)}
                        className="flex w-full items-center gap-2 rounded-md border px-3 py-2 text-left text-sm hover:bg-accent"
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        <span className="flex-1 font-medium">{member.name}</span>
                        <span className="text-xs text-muted-foreground">
                          이번 주 {hoursThisWeek}시간 배정됨
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {recommendation.excluded.length > 0 && (
              <div className="space-y-1.5">
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => setShowExcluded((v) => !v)}
                >
                  제외된 인원 {recommendation.excluded.length}명 {showExcluded ? "숨기기" : "보기"}
                </Button>
                {showExcluded && (
                  <ul className="space-y-1">
                    {recommendation.excluded.map(({ member, reason, hoursThisWeek }) => {
                      const rowContent = (
                        <>
                          <span
                            className="size-2.5 shrink-0 rounded-full opacity-50"
                            style={{ backgroundColor: member.color }}
                          />
                          <span className="flex-1">
                            {member.name} · 이번 주 {hoursThisWeek}시간
                          </span>
                          <span className="text-xs">{formatExclusionReason(reason)}</span>
                        </>
                      );
                      const rowClass =
                        "flex w-full items-center gap-2 rounded-md border border-dashed px-3 py-2 text-left text-sm text-muted-foreground";

                      // 불가 시간은 관리자가 확인 후 예외로 배정할 수 있다.
                      // 이미 근무 중인 경우는 DB가 중복 배정을 막으므로 선택할 수 없다.
                      return (
                        <li key={member.id}>
                          {reason === "unavailable" ? (
                            <button
                              type="button"
                              onClick={() => commitCreate(member.id)}
                              className={`${rowClass} hover:bg-accent hover:text-foreground`}
                            >
                              {rowContent}
                            </button>
                          ) : (
                            <div className={rowClass}>{rowContent}</div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              추천 인원을 클릭하면 즉시 근무가 배정됩니다. 불가 시간을 등록한 인원은 확인 후
              예외로 배정할 수 있습니다.
            </p>
          </div>
        )}
      </BlockDetailPanel>

      <BlockDetailPanel
        open={selectedShift !== undefined}
        onOpenChange={(open) => !open && setSelectedShiftId(null)}
        title={members.find((m) => m.id === selectedShift?.member_id)?.name ?? "근무 상세"}
        description={
          selectedBlock
            ? `${WEEKDAY_LABELS_KO[selectedBlock.dayIndex]}요일 · ${formatDurationLabel(selectedBlock.startMinutes, selectedBlock.endMinutes)}`
            : undefined
        }
      >
        {selectedShift && selectedBlock && (
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>담당 멤버</Label>
              <Select
                items={Object.fromEntries(members.map((m) => [m.id, m.name]))}
                value={selectedShift.member_id}
                onValueChange={(value) => value && handleChangeShiftMember(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="start-time">시작</Label>
                <input
                  id="start-time"
                  type="time"
                  step={1800}
                  value={minutesToLabel(selectedBlock.startMinutes)}
                  onChange={(e) => handleChangeShiftTime("start", e.target.value)}
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="end-time">종료</Label>
                <input
                  id="end-time"
                  type="time"
                  step={1800}
                  value={minutesToLabel(selectedBlock.endMinutes)}
                  onChange={(e) => handleChangeShiftTime("end", e.target.value)}
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="note">메모</Label>
              <Textarea
                id="note"
                defaultValue={selectedShift.note ?? ""}
                onBlur={(e) => handleChangeNote(e.target.value)}
                placeholder="선택 사항"
              />
            </div>
            <AttendanceEditor
              shift={selectedShift}
              record={recordsByShiftId.get(selectedShift.id) ?? null}
              hasStarted={hasShiftStarted(selectedShift)}
              isSaving={saveRecord.isPending || deleteRecord.isPending}
              onSave={handleSaveRecord}
              onClear={handleClearRecord}
            />
            <Button variant="destructive" size="sm" onClick={handleDeleteShift}>
              근무 삭제
            </Button>
          </div>
        )}
      </BlockDetailPanel>

      <AlertDialog
        open={pendingConflict !== null}
        onOpenChange={(open) => !open && setPendingConflict(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>불가 시간과 겹칩니다</AlertDialogTitle>
            <AlertDialogDescription>{pendingConflict?.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingConflict(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                pendingConflict?.onConfirm();
                setPendingConflict(null);
              }}
            >
              그래도 배정
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={statusDialog !== null}
        onOpenChange={(open) => !open && setStatusDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {statusDialog === "publish" ? "이번 주 스케줄을 게시할까요?" : "초안으로 되돌릴까요?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {statusDialog === "publish" ? (
                <>
                  배정된 근무 {publishSummary.shiftCount}건 · 배정 멤버{" "}
                  {publishSummary.memberCount}명
                  {publishSummary.conflictCount > 0 && (
                    <>
                      <br />
                      불가 시간과 겹치는 근무 {publishSummary.conflictCount}건이 있습니다.
                    </>
                  )}
                  <br />
                  게시하면 멤버들이 본인 스케줄을 볼 수 있게 됩니다.
                </>
              ) : (
                "멤버 화면에서 이번 주 스케줄이 즉시 사라집니다."
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setStatusDialog(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={statusDialog === "publish" ? handleConfirmPublish : handleConfirmUnpublish}
            >
              {statusDialog === "publish" ? "게시" : "초안으로 되돌리기"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
