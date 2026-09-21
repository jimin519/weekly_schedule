"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/domain";

export function useActiveMembers() {
  return useQuery({
    queryKey: ["members", "active"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "member")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

export function useAdmins() {
  return useQuery({
    queryKey: ["members", "admins"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "admin")
        .order("name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/** 비활성 멤버까지 포함한 전체 멤버. 과거 근무 기록에 이름을 표시할 때 사용한다. */
export function useAllMembers() {
  return useQuery({
    queryKey: ["members", "all"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "member")
        .order("name");
      if (error) throw error;
      return data as Profile[];
    },
  });
}
