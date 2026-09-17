import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/domain";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // role은 DB CHECK 제약으로 'admin' | 'member' 만 허용되므로 안전하게 좁힐 수 있다.
  return profile as Profile | null;
});

export async function requireProfile() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

export async function requireRole(role: UserRole) {
  const profile = await requireProfile();
  if (profile.role !== role) {
    redirect(profile.role === "admin" ? "/admin/schedule" : "/me/schedule");
  }
  return profile;
}
