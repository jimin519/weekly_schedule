import { requireRole } from "@/lib/auth/get-profile";
import { TopBar } from "@/components/layout/top-bar";
import { SectionNav } from "@/components/layout/section-nav";

const NAV_ITEMS = [
  { href: "/admin/schedule", label: "스케줄" },
  { href: "/admin/members", label: "멤버 관리" },
  { href: "/admin/inquiries", label: "문의" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("admin");

  return (
    <div className="flex h-screen flex-col">
      <TopBar userId={profile.id} name={profile.name} role={profile.role} />
      <SectionNav items={NAV_ITEMS} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
