"use client";

import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { formatDurationLabel } from "@/lib/calendar/time";
import { MIN_BLOCK_HEIGHT_PX, PX_PER_MINUTE } from "./constants";
import type { CalendarBlock, CalendarMember } from "./types";

export function ShiftBlock({
  block,
  member,
  column,
  columnCount,
  isSelected,
  onSelect,
  onResizeStart,
  readOnly = false,
  emphasized = false,
  highlighted = false,
}: {
  block: CalendarBlock;
  member: CalendarMember | undefined;
  column: number;
  columnCount: number;
  isSelected: boolean;
  onSelect: () => void;
  onResizeStart: (e: ReactPointerEvent) => void;
  readOnly?: boolean;
  emphasized?: boolean;
  highlighted?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: block.id, data: { block }, disabled: readOnly });

  const top = block.startMinutes * PX_PER_MINUTE;
  const height = Math.max(
    (block.endMinutes - block.startMinutes) * PX_PER_MINUTE,
    MIN_BLOCK_HEIGHT_PX,
  );
  const widthPct = 100 / columnCount;
  const leftPct = widthPct * column;
  const color = member?.color ?? "#94A3B8";

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect();
    }
  };

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute overflow-hidden rounded-md border px-1.5 py-0.5 text-left text-[11px] leading-tight shadow-sm outline-none transition-shadow duration-700",
        readOnly ? "cursor-default" : "cursor-grab active:cursor-grabbing",
        isSelected ? "z-20 ring-2 ring-ring" : "z-10",
        emphasized && "border-2 font-semibold shadow-md",
        highlighted && "z-30 ring-2 ring-yellow-400 ring-offset-1",
        isDragging && "opacity-60",
      )}
      style={{
        top,
        height,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        backgroundColor: emphasized ? `${color}55` : `${color}33`,
        borderColor: color,
        transform: CSS.Translate.toString(transform),
      }}
      {...(!readOnly && listeners)}
      {...(!readOnly && attributes)}
    >
      <div className="truncate font-medium text-foreground">
        {member?.name ?? "미배정"}
      </div>
      {height > 30 && (
        <div className="truncate text-muted-foreground">
          {formatDurationLabel(block.startMinutes, block.endMinutes)}
        </div>
      )}
      {!readOnly && (
        <div
          role="presentation"
          onPointerDown={(e) => {
            e.stopPropagation();
            onResizeStart(e);
          }}
          className="absolute inset-x-0 bottom-0 h-1.5 cursor-ns-resize"
        />
      )}
    </div>
  );
}
