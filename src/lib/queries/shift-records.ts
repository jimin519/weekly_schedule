"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { dateMinutesToISO } from "@/lib/calendar/attendance";
import type { Period } from "@/lib/calendar/period";
import type { AttendanceStatus, Shift, ShiftRecord } from "@/lib/types/domain";

export function weekRecordsQueryKey(weekId: string | undefined) {
  return ["attendance", "week", weekId ?? "none"] as const;
}

/** 근무 기록 집계 화면(주/월) 쿼리의 공통 접두사. 실시간 변경 시 한 번에 무효화한다. */
export const ATTENDANCE_RANGE_ROOT_KEY = ["attendance", "range"] as const;

export function attendanceRangeQueryKey(period: Period, memberId: string | undefined) {
  return [...ATTENDANCE_RANGE_ROOT_KEY, period.startDate, period.endDate, memberId ?? "all"] as const;
}

/** 한 주차에 속한 근무 기록. 멤버는 RLS 때문에 본인 기록만 받는다. */
export function useWeekShiftRecords(weekId: string | undefined) {
  return useQuery({
    queryKey: weekRecordsQueryKey(weekId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shift_records")
        .select("*, shifts!inner(week_id)")
        .eq("shifts.week_id", weekId!);
      if (error) throw error;
      return (data ?? []).map((row) => {
        const { shifts, ...record } = row;
        void shifts;
        return record as ShiftRecord;
      });
    },
    enabled: !!weekId,
  });
}

export type SaveShiftRecordInput =
  | {
      shiftId: string;
      status: "worked";
      startAt: string;
      endAt: string;
      note: string | null;
      recordedBy: string;
    }
  | { shiftId: string; status: "absent"; note: string | null; recordedBy: string };

export function useSaveShiftRecord(weekId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: SaveShiftRecordInput) => {
      const supabase = createClient();
      const { error } = await supabase.from("shift_records").upsert(
        {
          shift_id: input.shiftId,
          status: input.status satisfies AttendanceStatus,
          actual_start_at: input.status === "worked" ? input.startAt : null,
          actual_end_at: input.status === "worked" ? input.endAt : null,
          note: input.note,
          recorded_by: input.recordedBy,
        },
        { onConflict: "shift_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weekRecordsQueryKey(weekId) });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_RANGE_ROOT_KEY });
    },
  });
}

export function useDeleteShiftRecord(weekId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (shiftId: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("shift_records").delete().eq("shift_id", shiftId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weekRecordsQueryKey(weekId) });
      queryClient.invalidateQueries({ queryKey: ATTENDANCE_RANGE_ROOT_KEY });
    },
  });
}

export type AttendanceRow = { shift: Shift; record: ShiftRecord | null };

/** 기간 안에 시작하는 근무와 각 근무의 기록. memberId를 주면 그 멤버의 근무만 가져온다. */
export function useAttendanceRange(period: Period, memberId?: string) {
  return useQuery({
    queryKey: attendanceRangeQueryKey(period, memberId),
    queryFn: async (): Promise<AttendanceRow[]> => {
      const supabase = createClient();
      let query = supabase
        .from("shifts")
        .select("*, shift_records(*)")
        .gte("start_at", dateMinutesToISO(period.startDate, 0))
        .lt("start_at", dateMinutesToISO(period.endDate, 0))
        .order("start_at");
      if (memberId) query = query.eq("member_id", memberId);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((row) => {
        const { shift_records: embedded, ...shift } = row;
        const record = Array.isArray(embedded) ? (embedded[0] ?? null) : embedded;
        return { shift: shift as Shift, record: (record as ShiftRecord | null) ?? null };
      });
    },
  });
}
