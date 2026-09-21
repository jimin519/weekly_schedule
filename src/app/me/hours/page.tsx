import { requireProfile } from "@/lib/auth/get-profile";
import { HoursReport } from "@/components/attendance/hours-report";

export default async function MyHoursPage() {
  const profile = await requireProfile();
  return <HoursReport scope="member" memberId={profile.id} />;
}
