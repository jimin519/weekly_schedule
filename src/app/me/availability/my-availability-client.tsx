"use client";

import { useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { WeekTopBar } from "@/components/calendar/week-top-bar";
import { MiniMonthCalendar } from "@/components/calendar/mini-month-calendar";
import { WeekTimeGrid } from "@/components/calendar/week-time-grid";
import { BlockDetailPanel } from "@/components/calendar/block-detail-panel";
import { useWeekNavigation } from "@/components/calendar/use-week-navigation";
import { useCalendarShortcuts } from "@/components/calendar/use-calendar-shortcuts";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { useTableRealtime } from "@/lib/realtime/use-table-realtime";
import { useHighlightedIds } from "@/lib/realtime/use-highlighted-ids";
import {
  unavailabilityQueryKey,
  useCreateUnavailability,
  useDeleteUnavailability,
  useUnavailability,
  useUpdateUnavailability,
} from "@/lib/queries/unavailability";
import { expandUnavailabilityForWeek } from "@/lib/calendar/unavailability";
import { dayMinutesToISO } from "@/lib/calendar/convert";
import { WEEKDAY_LABELS_KO } from "@/lib/calendar/week";
import { formatDurationLabel, minutesToLabel, labelToMinutes } from "@/lib/calendar/time";
import type { CalendarBlock } from "@/components/calendar/types";

function realIdOf(blockId: string): string {
  return blockId.split(":")[0];
}

export function MyAvailabilityClient({
  memberId,
  memberName,
  memberColor,
}: {
  memberId: string;
  memberName: string;
  memberColor: string;
}) {
  const { weekStart, weekDates, weekLabel, goToday, goPrev, goNext, goToWeekOf } =
    useWeekNavigation();
  const isMobile = useIsMobile();
  const [mobileDayIndex, setMobileDayIndex] = useState(0);

  const unavailabilityQuery = useUnavailability(memberId);
  const rows = useMemo(() => unavailabilityQuery.data ?? [], [unavailabilityQuery.data]);
  const rowsById = useMemo(() => new Map(rows.map((r) => [r.id, r])), [rows]);

  const blocks: CalendarBlock[] = useMemo(() => {
    const expanded = expandUnavailabilityForWeek(rows, weekDates);
    return expanded.map((b) => ({
      id: b.id,
      memberId: b.memberId,
      dayIndex: b.dayIndex,
      startMinutes: b.startMinutes,
      endMinutes: b.endMinutes,
      note: b.reason,
    }));
  }, [rows, weekDates]);
  const blocksById = useMemo(() => new Map(blocks.map((b) => [b.id, b])), [blocks]);

  const member = useMemo(
    () => [{ id: memberId, name: memberName, color: memberColor }],
    [memberId, memberName, memberColor],
  );
  const visibleMemberIds = useMemo(() => new Set([memberId]), [memberId]);

  const createMutation = useCreateUnavailability(memberId);
  const updateMutation = useUpdateUnavailability(memberId);
  const deleteMutation = useDeleteUnavailability(memberId);

  const queryClient = useQueryClient();
  const { highlightedIds, markHighlighted } = useHighlightedIds();
  const realtimeStatus = useTableRealtime(
    "unavailability",
    `member_id=eq.${memberId}`,
    (payload) => {
      const row = (payload.new ?? payload.old) as { id?: string } | null;
      if (row?.id) markHighlighted(row.id);
      queryClient.invalidateQueries({ queryKey: unavailabilityQueryKey(memberId) });
    },
    { invalidateKey: unavailabilityQueryKey(memberId) },
  );

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [draftCreation, setDraftCreation] = useState<{
    dayIndex: number;
    start: number;
    end: number;
  } | null>(null);
  const [draftRecurring, setDraftRecurring] = useState(false);
  const [draftReason, setDraftReason] = useState("");

  useCalendarShortcuts({
    onToday: () => {
      goToday();
      setMobileDayIndex(0);
    },
    onPrev: isMobile ? () => setMobileDayIndex((d) => Math.max(d - 1, 0)) : goPrev,
    onNext: isMobile ? () => setMobileDayIndex((d) => Math.min(d + 1, 6)) : goNext,
    onEscape: () => {
      setSelectedBlockId(null);
      setDraftCreation(null);
    },
  });

  function handleMutationError(error: unknown) {
    toast.error(error instanceof Error ? error.message : String(error));
  }

  function handleCreateBlock(dayIndex: number, start: number, end: number) {
    setSelectedBlockId(null);
    setDraftRecurring(false);
    setDraftReason("");
    setDraftCreation({ dayIndex: isMobile ? mobileDayIndex : dayIndex, start, end });
  }

  function commitCreate() {
    if (!draftCreation) return;
    const { dayIndex, start, end } = draftCreation;
    createMutation.mutate(
      {
        startAt: dayMinutesToISO(weekStart, dayIndex, start),
        endAt: dayMinutesToISO(weekStart, dayIndex, end),
        reason: draftReason || null,
        isRecurring: draftRecurring,
      },
      {
        onError: handleMutationError,
        onSuccess: () => setDraftCreation(null),
      },
    );
  }

  function handleMoveBlock(blockId: string, dayIndex: number, start: number) {
    const block = blocksById.get(blockId);
    if (!block) return;
    const duration = block.endMinutes - block.startMinutes;
    updateMutation.mutate(
      {
        id: realIdOf(blockId),
        startAt: dayMinutesToISO(weekStart, dayIndex, start),
        endAt: dayMinutesToISO(weekStart, dayIndex, start + duration),
      },
      { onError: handleMutationError },
    );
  }

  function handleResizeBlock(blockId: string, end: number) {
    const block = blocksById.get(blockId);
    if (!block) return;
    updateMutation.mutate(
      { id: realIdOf(blockId), endAt: dayMinutesToISO(weekStart, block.dayIndex, end) },
      { onError: handleMutationError },
    );
  }

  function handleChangeTime(field: "start" | "end", label: string) {
    const block = selectedBlockId ? blocksById.get(selectedBlockId) : undefined;
    if (!block) return;
    const minutes = labelToMinutes(label);
    const newStart = field === "start" ? minutes : block.startMinutes;
    const newEnd = field === "end" ? minutes : block.endMinutes;
    if (newEnd <= newStart) {
      toast.error("종료 시간은 시작 시간보다 늦어야 합니다.");
      return;
    }
    updateMutation.mutate(
      {
        id: realIdOf(block.id),
        startAt: dayMinutesToISO(weekStart, block.dayIndex, newStart),
        endAt: dayMinutesToISO(weekStart, block.dayIndex, newEnd),
      },
      { onError: handleMutationError },
    );
  }

  function handleChangeReason(reason: string) {
    if (!selectedBlockId) return;
    updateMutation.mutate(
      { id: realIdOf(selectedBlockId), reason: reason || null },
      { onError: handleMutationError },
    );
  }

  function handleChangeRecurring(isRecurring: boolean) {
    if (!selectedBlockId) return;
    updateMutation.mutate(
      { id: realIdOf(selectedBlockId), isRecurring },
      { onError: handleMutationError },
    );
  }

  function handleDelete() {
    if (!selectedBlockId) return;
    deleteMutation.mutate(realIdOf(selectedBlockId), { onError: handleMutationError });
    setSelectedBlockId(null);
  }

  const displayDates = isMobile ? [weekDates[mobileDayIndex]] : weekDates;
  const selectedRow = selectedBlockId ? rowsById.get(realIdOf(selectedBlockId)) : undefined;
  const selectedBlock = selectedBlockId ? blocksById.get(selectedBlockId) : undefined;

  if (unavailabilityQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <p>불가 시간을 불러오지 못했습니다.</p>
        <Button variant="outline" size="sm" onClick={() => unavailabilityQuery.refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (unavailabilityQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-full flex-1" />
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
          <span className="text-xs text-muted-foreground">
            빈 칸을 드래그해 근무 불가 시간을 등록하세요.
          </span>
        }
      />
      <ConnectionBanner show={realtimeStatus === "disconnected"} />
      <div className="flex flex-1 overflow-hidden">
        {!isMobile && (
          <aside className="w-64 shrink-0 space-y-4 overflow-y-auto border-r bg-background p-3">
            <MiniMonthCalendar weekStart={weekStart} onSelectDate={goToWeekOf} />
            <div className="space-y-1 px-1 text-xs text-muted-foreground">
              <p>사선 표시된 블록이 등록된 불가 시간입니다.</p>
              <p>매주 반복 항목은 매주 같은 요일에 자동으로 나타납니다.</p>
            </div>
          </aside>
        )}
        <WeekTimeGrid
          weekDates={displayDates}
          blocks={blocks}
          members={member}
          visibleMemberIds={visibleMemberIds}
          selectedBlockId={selectedBlockId}
          onSelectBlock={(id) => {
            setSelectedBlockId(id);
            setDraftCreation(null);
          }}
          onCreateBlock={handleCreateBlock}
          onMoveBlock={handleMoveBlock}
          onResizeBlock={handleResizeBlock}
          highlightedBlockIds={highlightedIds}
        />
      </div>

      <BlockDetailPanel
        open={draftCreation !== null}
        onOpenChange={(open) => !open && setDraftCreation(null)}
        title="불가 시간 등록"
        description={
          draftCreation
            ? `${WEEKDAY_LABELS_KO[draftCreation.dayIndex]}요일 · ${formatDurationLabel(draftCreation.start, draftCreation.end)}`
            : undefined
        }
      >
        {draftCreation && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="draft-recurring">매주 반복</Label>
              <Switch
                id="draft-recurring"
                checked={draftRecurring}
                onCheckedChange={setDraftRecurring}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="draft-reason">사유 (선택)</Label>
              <Input
                id="draft-reason"
                value={draftReason}
                onChange={(e) => setDraftReason(e.target.value)}
                placeholder="예: 병원 진료"
              />
            </div>
            <Button onClick={commitCreate} disabled={createMutation.isPending}>
              등록
            </Button>
          </div>
        )}
      </BlockDetailPanel>

      <BlockDetailPanel
        open={selectedRow !== undefined}
        onOpenChange={(open) => !open && setSelectedBlockId(null)}
        title="불가 시간"
        description={
          selectedBlock
            ? `${WEEKDAY_LABELS_KO[selectedBlock.dayIndex]}요일 · ${formatDurationLabel(selectedBlock.startMinutes, selectedBlock.endMinutes)}`
            : undefined
        }
      >
        {selectedRow && selectedBlock && (
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="edit-start">시작</Label>
                <input
                  id="edit-start"
                  type="time"
                  step={1800}
                  value={minutesToLabel(selectedBlock.startMinutes)}
                  onChange={(e) => handleChangeTime("start", e.target.value)}
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-end">종료</Label>
                <input
                  id="edit-end"
                  type="time"
                  step={1800}
                  value={minutesToLabel(selectedBlock.endMinutes)}
                  onChange={(e) => handleChangeTime("end", e.target.value)}
                  className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-recurring">매주 반복</Label>
              <Switch
                id="edit-recurring"
                checked={selectedRow.is_recurring}
                onCheckedChange={handleChangeRecurring}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-reason">사유 (선택)</Label>
              <Input
                id="edit-reason"
                defaultValue={selectedRow.reason ?? ""}
                onBlur={(e) => handleChangeReason(e.target.value)}
                placeholder="예: 병원 진료"
              />
            </div>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              삭제
            </Button>
          </div>
        )}
      </BlockDetailPanel>
    </div>
  );
}
