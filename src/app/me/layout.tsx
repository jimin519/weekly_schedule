import { requireRole } from "@/lib/auth/get-profile";
import { TopBar } from "@/components/layout/top-bar";
import { SectionNav } from "@/components/layout/section-nav";

const NAV_ITEMS = [
  { href: "/me/schedule", label: "내 스케줄" },
  { href: "/me/hours", label: "내 근무 기록" },
  { href: "/me/availability", label: "불가 시간 등록" },
  { href: "/me/inquiries", label: "문의" },
];

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireRole("member");

  return (
    <div className="flex h-screen flex-col">
      <TopBar userId={profile.id} name={profile.name} role={profile.role} />
      <SectionNav items={NAV_ITEMS} />
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
