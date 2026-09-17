import { requireProfile } from "@/lib/auth/get-profile";
import { AdminInquiriesClient } from "./admin-inquiries-client";

export default async function AdminInquiriesPage() {
  const profile = await requireProfile();
  return <AdminInquiriesClient adminId={profile.id} adminName={profile.name} />;
}
