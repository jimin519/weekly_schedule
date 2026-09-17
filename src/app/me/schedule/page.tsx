import { requireProfile } from "@/lib/auth/get-profile";
import { MyScheduleClient } from "./my-schedule-client";

export default async function MySchedulePage() {
  const profile = await requireProfile();
  return (
    <MyScheduleClient
      memberId={profile.id}
      memberName={profile.name}
      memberColor={profile.color}
    />
  );
}
