"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { CalendarMember } from "./types";

function formatHours(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

export function MemberFilterList({
  members,
  visibleIds,
  onToggle,
  onToggleAll,
  hoursByMemberId,
}: {
  members: CalendarMember[];
  visibleIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (visible: boolean) => void;
  hoursByMemberId?: Map<string, number>;
}) {
  const allVisible = members.length > 0 && members.every((m) => visibleIds.has(m.id));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">멤버</span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
          onClick={() => onToggleAll(!allVisible)}
        >
          {allVisible ? "모두 숨기기" : "모두 표시"}
        </Button>
      </div>
      <ul className="space-y-0.5">
        {members.map((member) => {
          const id = `member-filter-${member.id}`;
          return (
            <li key={member.id} className="flex items-center gap-2 rounded px-1 py-1 hover:bg-accent">
              <Checkbox
                id={id}
                checked={visibleIds.has(member.id)}
                onCheckedChange={() => onToggle(member.id)}
              />
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: member.color }}
              />
              <Label htmlFor={id} className="flex-1 cursor-pointer truncate text-sm font-normal">
                {member.name}
              </Label>
              {hoursByMemberId && (
                <span className="text-xs text-muted-foreground">
                  {formatHours(hoursByMemberId.get(member.id) ?? 0)}
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
