import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/get-profile";
import type { Profile } from "@/lib/types/domain";
import { MembersClient } from "./members-client";

export default async function AdminMembersPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("role", { ascending: true })
    .order("name");

  return (
    <MembersClient
      members={(data ?? []) as Profile[]}
      currentUserId={profile.id}
      loadFailed={!!error}
    />
  );
}
