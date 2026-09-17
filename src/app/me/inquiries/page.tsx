import { requireProfile } from "@/lib/auth/get-profile";
import { MyInquiriesClient } from "./my-inquiries-client";

export default async function MyInquiriesPage() {
  const profile = await requireProfile();
  return <MyInquiriesClient memberId={profile.id} memberName={profile.name} />;
}
