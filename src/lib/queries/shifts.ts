"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Shift } from "@/lib/types/domain";
import type { TablesUpdate } from "@/lib/types/database";
import { fetchWeekByStartDate } from "./weeks";

export function shiftsQueryKey(weekId: string | undefined) {
  return ["shifts", weekId ?? "none"] as const;
}

export function useShifts(weekId: string | undefined) {
  return useQuery({
    queryKey: shiftsQueryKey(weekId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("week_id", weekId!)
        .order("start_at");
      if (error) throw error;
      return data as Shift[];
    },
    enabled: !!weekId,
  });
}

export function useShift(shiftId: string | undefined) {
  return useQuery({
    queryKey: ["shift", shiftId ?? "none"] as const,
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", shiftId!)
        .single();
      if (error) throw error;
      return data as Shift;
    },
    enabled: !!shiftId,
  });
}

function useInvalidateShifts(weekId: string | undefined) {
  const queryClient = useQueryClient();
  return () =>
    queryClient.invalidateQueries({ queryKey: shiftsQueryKey(weekId) });
}

export function useCreateShift(weekId: string | undefined) {
  const invalidate = useInvalidateShifts(weekId);
  return useMutation({
    mutationFn: async (input: {
      memberId: string;
      startAt: string;
      endAt: string;
      createdBy: string;
      note?: string | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("shifts")
        .insert({
          week_id: weekId!,
          member_id: input.memberId,
          start_at: input.startAt,
          end_at: input.endAt,
          created_by: input.createdBy,
          note: input.note ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Shift;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateShift(weekId: string | undefined) {
  const invalidate = useInvalidateShifts(weekId);
  return useMutation({
    mutationFn: async (input: {
      id: string;
      memberId?: string;
      startAt?: string;
      endAt?: string;
      note?: string | null;
    }) => {
      const supabase = createClient();
      const patch: TablesUpdate<"shifts"> = {
        ...(input.memberId !== undefined && { member_id: input.memberId }),
        ...(input.startAt !== undefined && { start_at: input.startAt }),
        ...(input.endAt !== undefined && { end_at: input.endAt }),
        ...(input.note !== undefined && { note: input.note }),
      };

      const { data, error } = await supabase
        .from("shifts")
        .update(patch)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Shift;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteShift(weekId: string | undefined) {
  const invalidate = useInvalidateShifts(weekId);
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("shifts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useCopyPreviousWeek(weekId: string | undefined) {
  const invalidate = useInvalidateShifts(weekId);
  return useMutation({
    mutationFn: async (input: {
      currentWeekStartDate: string;
      previousWeekStartDate: string;
      createdBy: string;
    }) => {
      const previousWeek = await fetchWeekByStartDate(
        input.previousWeekStartDate,
      );
      if (!previousWeek) return { copied: 0 };

      const supabase = createClient();
      const { data: previousShifts, error: fetchError } = await supabase
        .from("shifts")
        .select("member_id, start_at, end_at, note")
        .eq("week_id", previousWeek.id);
      if (fetchError) throw fetchError;
      if (!previousShifts || previousShifts.length === 0) return { copied: 0 };

      const oneWeekMs = 7 * 24 * 60 * 60 * 1000;
      const rows = previousShifts.map((s) => ({
        week_id: weekId!,
        member_id: s.member_id,
        start_at: new Date(new Date(s.start_at).getTime() + oneWeekMs).toISOString(),
        end_at: new Date(new Date(s.end_at).getTime() + oneWeekMs).toISOString(),
        note: s.note,
        created_by: input.createdBy,
      }));

      const { error: insertError } = await supabase.from("shifts").insert(rows);
      if (insertError) throw insertError;
      return { copied: rows.length };
    },
    onSuccess: invalidate,
  });
}
