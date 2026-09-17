import { requireProfile } from "@/lib/auth/get-profile";
import { MyAvailabilityClient } from "./my-availability-client";

export default async function MyAvailabilityPage() {
  const profile = await requireProfile();
  return (
    <MyAvailabilityClient
      memberId={profile.id}
      memberName={profile.name}
      memberColor={profile.color}
    />
  );
}
