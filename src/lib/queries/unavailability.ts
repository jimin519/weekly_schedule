"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { RecurrenceRule, Unavailability } from "@/lib/types/domain";
import type { TablesUpdate } from "@/lib/types/database";

export function unavailabilityQueryKey(scope: string) {
  return ["unavailability", scope] as const;
}

/** 본인(또는 관리자가 특정 멤버)의 불가 시간 전체를 가져온다. */
export function useUnavailability(memberId: string | undefined) {
  return useQuery({
    queryKey: unavailabilityQueryKey(memberId ?? "none"),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("unavailability")
        .select("*")
        .eq("member_id", memberId!)
        .order("start_at");
      if (error) throw error;
      return data as Unavailability[];
    },
    enabled: !!memberId,
  });
}

/** 관리자용: 전체 멤버의 불가 시간을 가져온다(그리드 오버레이용). */
export function useAllUnavailability() {
  return useQuery({
    queryKey: unavailabilityQueryKey("all"),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("unavailability")
        .select("*")
        .order("start_at");
      if (error) throw error;
      return data as Unavailability[];
    },
  });
}

function useInvalidateUnavailability(scope: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: unavailabilityQueryKey(scope) }),
      queryClient.invalidateQueries({ queryKey: unavailabilityQueryKey("all") }),
    ]);
}

export function useCreateUnavailability(memberId: string | undefined) {
  const invalidate = useInvalidateUnavailability(memberId ?? "none");
  return useMutation({
    mutationFn: async (input: {
      startAt: string;
      endAt: string;
      reason?: string | null;
      isRecurring: boolean;
      recurrenceRule?: RecurrenceRule | null;
    }) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("unavailability")
        .insert({
          member_id: memberId!,
          start_at: input.startAt,
          end_at: input.endAt,
          reason: input.reason ?? null,
          is_recurring: input.isRecurring,
          recurrence_rule: input.isRecurring
            ? (input.recurrenceRule ?? { freq: "weekly" })
            : null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Unavailability;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateUnavailability(memberId: string | undefined) {
  const invalidate = useInvalidateUnavailability(memberId ?? "none");
  return useMutation({
    mutationFn: async (input: {
      id: string;
      startAt?: string;
      endAt?: string;
      reason?: string | null;
      isRecurring?: boolean;
      recurrenceRule?: RecurrenceRule | null;
    }) => {
      const supabase = createClient();
      const patch: TablesUpdate<"unavailability"> = {
        ...(input.startAt !== undefined && { start_at: input.startAt }),
        ...(input.endAt !== undefined && { end_at: input.endAt }),
        ...(input.reason !== undefined && { reason: input.reason }),
        ...(input.isRecurring !== undefined && {
          is_recurring: input.isRecurring,
          recurrence_rule: input.isRecurring
            ? (input.recurrenceRule ?? { freq: "weekly" })
            : null,
        }),
      };

      const { data, error } = await supabase
        .from("unavailability")
        .update(patch)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Unavailability;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteUnavailability(memberId: string | undefined) {
  const invalidate = useInvalidateUnavailability(memberId ?? "none");
  return useMutation({
    mutationFn: async (id: string) => {
      const supabase = createClient();
      const { error } = await supabase.from("unavailability").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
