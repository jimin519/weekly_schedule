import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types/domain";

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();

  // auth.getUser()(원격 검증) + profiles 조회를 각각 왕복하는 대신, auth.uid()를
  // 그대로 쓰는 RPC 하나로 합친다. 세션이 없거나 만료됐으면 auth.uid()가 null이라
  // 일치하는 행이 없고, Postgres는 이를 모든 필드가 null인 행으로 반환한다.
  const { data: profile } = await supabase.rpc("current_profile");

  if (!profile || !profile.id) return null;

  // role은 DB CHECK 제약으로 'admin' | 'member' 만 허용되므로 안전하게 좁힐 수 있다.
  return profile as Profile;
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
