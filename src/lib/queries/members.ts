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
