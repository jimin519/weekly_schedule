import { requireProfile } from "@/lib/auth/get-profile";
import { AdminScheduleClient } from "./admin-schedule-client";

export default async function AdminSchedulePage() {
  const profile = await requireProfile();
  return <AdminScheduleClient adminId={profile.id} />;
}
