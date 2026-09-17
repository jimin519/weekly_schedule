"use client";

import { useState, type PointerEvent as ReactPointerEvent, useRef } from "react";
import { cn } from "@/lib/utils";
import { clampMinutes, snapToSlot, SLOT_MINUTES } from "@/lib/calendar/time";
import { layoutOverlappingBlocks } from "@/lib/calendar/layout";
import { GRID_HEIGHT_PX, PX_PER_MINUTE, SLOT_HEIGHT_PX } from "./constants";
import { ShiftBlock } from "./shift-block";
import { UnavailabilityOverlay } from "./unavailability-overlay";
import type { CalendarBlock, CalendarMember } from "./types";
import type { UnavailabilityBlock } from "@/lib/calendar/unavailability";

type Interaction =
  | { type: "create"; anchor: number; start: number; end: number }
  | { type: "resize"; blockId: string; startMinutes: number; end: number };

export function DayColumn({
  dayIndex,
  blocks,
  unavailabilityBlocks = [],
  membersById,
  selectedBlockId,
  onSelectBlock,
  onCreateBlock,
  onResizeBlock,
  isToday,
  nowMinutes,
  readOnly = false,
  emphasizedMemberId,
  highlightedBlockIds,
}: {
  dayIndex: number;
  blocks: CalendarBlock[];
  unavailabilityBlocks?: UnavailabilityBlock[];
  membersById: Map<string, CalendarMember>;
  selectedBlockId: string | null;
  onSelectBlock: (id: string) => void;
  onCreateBlock?: (dayIndex: number, start: number, end: number) => void;
  onResizeBlock?: (id: string, end: number) => void;
  isToday: boolean;
  nowMinutes: number;
  readOnly?: boolean;
  emphasizedMemberId?: string;
  highlightedBlockIds?: Set<string>;
}) {
  const columnRef = useRef<HTMLDivElement>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  const yToMinutes = (clientY: number) => {
    const rect = columnRef.current!.getBoundingClientRect();
    const minutes = (clientY - rect.top) / PX_PER_MINUTE;
    return snapToSlot(clampMinutes(minutes));
  };

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (readOnly) return;
    if (e.target !== e.currentTarget) return;
    columnRef.current?.setPointerCapture(e.pointerId);
    const minute = yToMinutes(e.clientY);
    setInteraction({
      type: "create",
      anchor: minute,
      start: minute,
      end: minute + SLOT_MINUTES,
    });
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interaction) return;
    const minute = yToMinutes(e.clientY);

    if (interaction.type === "create") {
      setInteraction({
        type: "create",
        anchor: interaction.anchor,
        start: Math.min(interaction.anchor, minute),
        end: Math.max(interaction.anchor, minute + SLOT_MINUTES),
      });
    } else {
      setInteraction({
        ...interaction,
        end: Math.max(minute, interaction.startMinutes + SLOT_MINUTES),
      });
    }
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!interaction) return;
    columnRef.current?.releasePointerCapture(e.pointerId);

    if (interaction.type === "create") {
      onCreateBlock?.(dayIndex, interaction.start, interaction.end);
    } else {
      onResizeBlock?.(interaction.blockId, interaction.end);
    }
    setInteraction(null);
  }

  function startResize(block: CalendarBlock, e: ReactPointerEvent) {
    columnRef.current?.setPointerCapture(e.pointerId);
    setInteraction({
      type: "resize",
      blockId: block.id,
      startMinutes: block.startMinutes,
      end: block.endMinutes,
    });
  }

  const displayBlocks = blocks.map((block) =>
    interaction?.type === "resize" && interaction.blockId === block.id
      ? { ...block, endMinutes: interaction.end }
      : block,
  );
  const layouted = layoutOverlappingBlocks(displayBlocks);

  return (
    <div
      ref={columnRef}
      data-day-column={dayIndex}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className={cn(
        "relative flex-1 border-l select-none",
        isToday && "bg-accent/30",
      )}
      style={{
        height: GRID_HEIGHT_PX,
        backgroundImage: `repeating-linear-gradient(to bottom, var(--border) 0, var(--border) 1px, transparent 1px, transparent ${SLOT_HEIGHT_PX * 2}px)`,
      }}
    >
      {unavailabilityBlocks.map((block) => (
        <UnavailabilityOverlay
          key={block.id}
          block={block}
          member={membersById.get(block.memberId)}
        />
      ))}

      {layouted.map((block) => (
        <ShiftBlock
          key={block.id}
          block={block}
          member={membersById.get(block.memberId)}
          column={block.column}
          columnCount={block.columnCount}
          isSelected={block.id === selectedBlockId}
          onSelect={() => onSelectBlock(block.id)}
          onResizeStart={(e) => startResize(block, e)}
          readOnly={readOnly}
          emphasized={block.memberId === emphasizedMemberId}
          highlighted={highlightedBlockIds?.has(block.id) ?? false}
        />
      ))}

      {interaction?.type === "create" && (
        <div
          className="pointer-events-none absolute inset-x-0.5 rounded-md border border-dashed border-primary bg-primary/10"
          style={{
            top: interaction.start * PX_PER_MINUTE,
            height: (interaction.end - interaction.start) * PX_PER_MINUTE,
          }}
        />
      )}

      {isToday && (
        <div
          className="pointer-events-none absolute inset-x-0 z-30 border-t-2 border-destructive"
          style={{ top: nowMinutes * PX_PER_MINUTE }}
        >
          <span className="absolute -left-1 -top-1 block size-2 rounded-full bg-destructive" />
        </div>
      )}
    </div>
  );
}
