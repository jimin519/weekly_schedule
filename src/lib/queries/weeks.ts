"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { ScheduleWeek, WeekStatus } from "@/lib/types/domain";

export function weekQueryKey(weekStartDate: string) {
  return ["schedule-week", weekStartDate] as const;
}

async function fetchOrCreateWeek(
  weekStartDate: string,
  createIfMissing: boolean,
): Promise<ScheduleWeek | null> {
  const supabase = createClient();
  const { data: existing, error: selectError } = await supabase
    .from("schedule_weeks")
    .select("*")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (selectError) throw selectError;
  if (existing) return existing as ScheduleWeek;
  if (!createIfMissing) return null;

  const { data: created, error: insertError } = await supabase
    .from("schedule_weeks")
    .insert({ week_start_date: weekStartDate })
    .select("*")
    .single();

  if (insertError) {
    // 다른 관리자가 동시에 같은 주차를 먼저 생성한 경우(unique violation) 재조회한다.
    if (insertError.code === "23505") {
      const { data: retry, error: retryError } = await supabase
        .from("schedule_weeks")
        .select("*")
        .eq("week_start_date", weekStartDate)
        .single();
      if (retryError) throw retryError;
      return retry as ScheduleWeek;
    }
    throw insertError;
  }

  return created as ScheduleWeek;
}

export function useWeek(
  weekStartDate: string,
  options: { createIfMissing?: boolean } = {},
) {
  const { createIfMissing = false } = options;
  return useQuery({
    queryKey: weekQueryKey(weekStartDate),
    queryFn: () => fetchOrCreateWeek(weekStartDate, createIfMissing),
  });
}

export async function fetchWeekByStartDate(
  weekStartDate: string,
): Promise<ScheduleWeek | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("schedule_weeks")
    .select("*")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  if (error) throw error;
  return data as ScheduleWeek | null;
}

export function useSetWeekStatus(weekStartDate: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; status: WeekStatus }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("schedule_weeks")
        .update({
          status: input.status,
          published_at: input.status === "published" ? new Date().toISOString() : null,
        })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as ScheduleWeek;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: weekQueryKey(weekStartDate) });
    },
  });
}
