"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  dateMinutesToISO,
  formatMinutes,
  formatSignedMinutes,
  minutesFromDateStart,
  seoulDateOf,
  summarizeAttendance,
  validateActualRange,
} from "@/lib/calendar/attendance";
import { labelToMinutes, minutesToLabel } from "@/lib/calendar/time";
import type { ShiftRecord } from "@/lib/types/domain";

type Mode = "planned" | "custom" | "absent";

export type AttendanceSaveInput =
  | { status: "worked"; startAt: string; endAt: string; note: string | null }
  | { status: "absent"; note: string | null };

type EditorState = { mode: Mode; startMin: number; endMin: number; note: string };

function initialState(
  shift: { start_at: string; end_at: string },
  record: ShiftRecord | null,
): EditorState {
  const date = seoulDateOf(shift.start_at);
  const plannedStart = minutesFromDateStart(shift.start_at, date);
  const plannedEnd = minutesFromDateStart(shift.end_at, date);
  const planned: EditorState = {
    mode: "planned",
    startMin: plannedStart,
    endMin: plannedEnd,
    note: record?.note ?? "",
  };

  if (!record) return planned;
  if (record.status === "absent") return { ...planned, mode: "absent" };
  if (!record.actual_start_at || !record.actual_end_at) return planned;

  const startMin = minutesFromDateStart(record.actual_start_at, date);
  const endMin = minutesFromDateStart(record.actual_end_at, date);
  const matchesPlan = startMin === plannedStart && endMin === plannedEnd;
  return { ...planned, mode: matchesPlan ? "planned" : "custom", startMin, endMin };
}

const MODE_LABELS: Record<Mode, string> = {
  planned: "계획대로 근무",
  custom: "시간 수정",
  absent: "결근",
};

const QUICK_END_ADJUSTMENTS = [-60, -30, 30, 60] as const;

export function AttendanceEditor({
  shift,
  record,
  hasStarted,
  isSaving,
  onSave,
  onClear,
}: {
  shift: { id: string; start_at: string; end_at: string };
  record: ShiftRecord | null;
  hasStarted: boolean;
  isSaving: boolean;
  onSave: (input: AttendanceSaveInput) => void;
  onClear: () => void;
}) {
  const date = seoulDateOf(shift.start_at);
  const [state, setState] = useState<EditorState>(() => initialState(shift, record));

  // 다른 근무를 열었거나 기록이 서버에서 바뀌었을 때만 입력값을 다시 맞춘다(렌더 중 상태 보정).
  const syncKey = `${shift.id}:${record?.updated_at ?? "none"}`;
  const [syncedKey, setSyncedKey] = useState(syncKey);
  if (syncKey !== syncedKey) {
    setSyncedKey(syncKey);
    setState(initialState(shift, record));
  }

  if (!hasStarted) {
    return (
      <div className="space-y-1.5 rounded-md border border-dashed p-3">
        <Label>실제 근무 기록</Label>
        <p className="text-xs text-muted-foreground">
          아직 시작하지 않은 근무는 기록할 수 없습니다. 근무가 시작된 뒤에 입력하세요.
        </p>
      </div>
    );
  }

  const summary = summarizeAttendance(shift, record);
  const rangeError =
    state.mode === "custom" ? validateActualRange(state.startMin, state.endMin) : null;
  const customDiff = state.endMin - state.startMin - summary.plannedMinutes;

  function update(patch: Partial<EditorState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function handleSave() {
    const note = state.note.trim() || null;
    if (state.mode === "absent") {
      onSave({ status: "absent", note });
    } else if (state.mode === "planned") {
      onSave({ status: "worked", startAt: shift.start_at, endAt: shift.end_at, note });
    } else if (!rangeError) {
      onSave({
        status: "worked",
        startAt: dateMinutesToISO(date, state.startMin),
        endAt: dateMinutesToISO(date, state.endMin),
        note,
      });
    }
  }

  return (
    <div className="space-y-3 rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <Label>실제 근무 기록</Label>
        <span className="text-xs text-muted-foreground">
          {!record
            ? "기록 없음 · 계획대로 집계"
            : record.status === "absent"
              ? "결근 · −" + formatMinutes(summary.plannedMinutes)
              : `실제 ${formatMinutes(summary.effectiveMinutes)} · ${formatSignedMinutes(summary.diffMinutes)}`}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-1">
        {(Object.keys(MODE_LABELS) as Mode[]).map((mode) => (
          <Button
            key={mode}
            type="button"
            size="sm"
            variant={state.mode === mode ? "default" : "outline"}
            aria-pressed={state.mode === mode}
            onClick={() => update({ mode })}
          >
            {MODE_LABELS[mode]}
          </Button>
        ))}
      </div>

      {state.mode === "custom" && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="actual-start">실제 시작</Label>
              <input
                id="actual-start"
                type="time"
                step={60}
                value={minutesToLabel(state.startMin % 1440)}
                onChange={(e) => e.target.value && update({ startMin: labelToMinutes(e.target.value) })}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="actual-end">
                실제 종료{state.endMin >= 1440 ? " (다음 날)" : ""}
              </Label>
              <input
                id="actual-end"
                type="time"
                step={60}
                value={minutesToLabel(state.endMin % 1440)}
                onChange={(e) => {
                  if (!e.target.value) return;
                  const minutes = labelToMinutes(e.target.value);
                  // 시작보다 이르면 자정을 넘긴 종료로 본다.
                  update({ endMin: minutes <= state.startMin ? minutes + 1440 : minutes });
                }}
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1">
            <span className="mr-1 text-xs text-muted-foreground">종료 시각 조정</span>
            {QUICK_END_ADJUSTMENTS.map((delta) => (
              <Button
                key={delta}
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={() => update({ endMin: state.endMin + delta })}
              >
                {delta > 0 ? "+" : "−"}
                {formatMinutes(delta)}
              </Button>
            ))}
          </div>
          <p
            className={cn(
              "text-xs",
              rangeError ? "text-destructive" : "text-muted-foreground",
            )}
            role={rangeError ? "alert" : undefined}
          >
            {rangeError ??
              `실제 ${formatMinutes(state.endMin - state.startMin)} · 계획 대비 ${formatSignedMinutes(customDiff)}`}
          </p>
        </div>
      )}

      {state.mode === "absent" && (
        <p className="text-xs text-muted-foreground">
          결근으로 기록하면 이 근무는 0시간으로 집계됩니다.
        </p>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="attendance-note">사유 메모</Label>
        <Textarea
          id="attendance-note"
          value={state.note}
          onChange={(e) => update({ note: e.target.value })}
          placeholder="예: 인수인계로 연장, 병원 방문으로 조퇴"
        />
      </div>

      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={isSaving || !!rangeError} onClick={handleSave}>
          기록 저장
        </Button>
        {record && (
          <Button type="button" size="sm" variant="outline" disabled={isSaving} onClick={onClear}>
            기록 초기화
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        기록을 바꾸면 멤버에게 알림이 전송됩니다(계획대로 확인은 제외). 근무를 삭제하면 이
        기록도 함께 삭제됩니다.
      </p>
    </div>
  );
}
