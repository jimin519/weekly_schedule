"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { formatInTimeZone } from "date-fns-tz";
import { APP_TIMEZONE } from "@/lib/date";
import {
  clampMinutes,
  labelToMinutes,
  snapToSlot,
} from "@/lib/calendar/time";
import { GRID_HEIGHT_PX, PX_PER_MINUTE, TIME_GUTTER_WIDTH_PX } from "./constants";
import { DayColumn } from "./day-column";
import { DayHeaderRow } from "./day-header-row";
import { TimeGutter } from "./time-gutter";
import type { CalendarBlock, CalendarMember } from "./types";
import type { UnavailabilityBlock } from "@/lib/calendar/unavailability";

function useNowMinutes() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return {
    today: formatInTimeZone(now, APP_TIMEZONE, "yyyy-MM-dd"),
    nowMinutes: labelToMinutes(formatInTimeZone(now, APP_TIMEZONE, "HH:mm")),
  };
}

export function WeekTimeGrid({
  weekDates,
  blocks,
  unavailabilityBlocks = [],
  members,
  visibleMemberIds,
  selectedBlockId,
  onSelectBlock,
  onCreateBlock,
  onMoveBlock,
  onResizeBlock,
  onSelectDate,
  readOnly = false,
  emphasizedMemberId,
  highlightedBlockIds,
}: {
  weekDates: string[];
  blocks: CalendarBlock[];
  unavailabilityBlocks?: UnavailabilityBlock[];
  members: CalendarMember[];
  visibleMemberIds: Set<string>;
  selectedBlockId: string | null;
  onSelectBlock: (id: string | null) => void;
  onCreateBlock?: (dayIndex: number, start: number, end: number) => void;
  onMoveBlock?: (id: string, dayIndex: number, start: number) => void;
  onResizeBlock?: (id: string, end: number) => void;
  onSelectDate?: (date: string) => void;
  readOnly?: boolean;
  emphasizedMemberId?: string;
  highlightedBlockIds?: Set<string>;
}) {
  const { today, nowMinutes } = useNowMinutes();
  const scrollRef = useRef<HTMLDivElement>(null);
  const daysRowRef = useRef<HTMLDivElement>(null);
  const columnWidthRef = useRef(0);

  // dnd-kit이 생성하는 aria id와 현재 시각 인디케이터 위치는 서버 렌더와
  // 클라이언트 렌더 시점이 달라 하이드레이션 경고를 유발하므로, 그리드 본문은
  // 마운트 이후에만 렌더링한다.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 클라이언트 마운트 감지는 effect 없이 표현할 수 없다.
    setMounted(true);
  }, []);

  const membersById = useMemo(
    () => new Map(members.map((m) => [m.id, m])),
    [members],
  );

  const visibleBlocks = useMemo(
    () => blocks.filter((b) => visibleMemberIds.has(b.memberId)),
    [blocks, visibleMemberIds],
  );

  const visibleUnavailability = useMemo(
    () => unavailabilityBlocks.filter((b) => visibleMemberIds.has(b.memberId)),
    [unavailabilityBlocks, visibleMemberIds],
  );

  const blocksById = useMemo(
    () => new Map(visibleBlocks.map((b) => [b.id, b])),
    [visibleBlocks],
  );

  // 마운트되어 실제 그리드가 렌더링된 직후 08:00 부근으로 스크롤
  useEffect(() => {
    if (!mounted) return;
    scrollRef.current?.scrollTo({ top: 8 * 60 * PX_PER_MINUTE - 24 });
  }, [mounted]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  function handleDragStart() {
    columnWidthRef.current = (daysRowRef.current?.getBoundingClientRect().width ?? 0) / 7;
  }

  function handleDragEnd(event: DragEndEvent) {
    const block = blocksById.get(String(event.active.id));
    if (!block || !columnWidthRef.current) return;

    const minuteDelta = snapToSlot(event.delta.y / PX_PER_MINUTE);
    const dayDelta = Math.round(event.delta.x / columnWidthRef.current);
    const duration = block.endMinutes - block.startMinutes;

    const newDayIndex = Math.min(Math.max(block.dayIndex + dayDelta, 0), 6);
    const newStart = Math.min(
      Math.max(block.startMinutes + minuteDelta, 0),
      1440 - duration,
    );

    if (newDayIndex !== block.dayIndex || newStart !== block.startMinutes) {
      onMoveBlock?.(block.id, newDayIndex, clampMinutes(newStart));
    }
  }

  if (!mounted) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <DayHeaderRow weekDates={weekDates} todayDate={today} onSelectDate={onSelectDate} />
        <div className="flex flex-1 overflow-hidden">
          <div className="shrink-0" style={{ width: TIME_GUTTER_WIDTH_PX }} />
          <div className="flex-1 animate-pulse bg-muted/20" />
        </div>
      </div>
    );
  }

  const content = (
    <div className="flex flex-1 flex-col overflow-hidden">
      <DayHeaderRow weekDates={weekDates} todayDate={today} onSelectDate={onSelectDate} />
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="flex">
          <TimeGutter />
          <div ref={daysRowRef} className="flex flex-1" style={{ height: GRID_HEIGHT_PX }}>
            {weekDates.map((date, dayIndex) => (
              <DayColumn
                key={date}
                dayIndex={dayIndex}
                blocks={visibleBlocks.filter((b) => b.dayIndex === dayIndex)}
                unavailabilityBlocks={visibleUnavailability.filter(
                  (b) => b.dayIndex === dayIndex,
                )}
                membersById={membersById}
                selectedBlockId={selectedBlockId}
                onSelectBlock={onSelectBlock}
                onCreateBlock={onCreateBlock}
                onResizeBlock={onResizeBlock}
                isToday={date === today}
                nowMinutes={nowMinutes}
                readOnly={readOnly}
                emphasizedMemberId={emphasizedMemberId}
                highlightedBlockIds={highlightedBlockIds}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  if (readOnly) return content;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      {content}
    </DndContext>
  );
}
