import { requireProfile } from "@/lib/auth/get-profile";
import { TopBar } from "@/components/layout/top-bar";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar userId={profile.id} name={profile.name} role={profile.role} />
      <div className="flex-1">{children}</div>
    </div>
  );
}
