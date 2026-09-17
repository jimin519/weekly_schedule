import { LogoutButton } from "./logout-button";
import { NotificationBell } from "./notification-bell";
import type { UserRole } from "@/lib/types/domain";

export function TopBar({
  userId,
  name,
  role,
}: {
  userId: string;
  name: string;
  role: UserRole;
}) {
  return (
    <header className="flex items-center justify-between border-b bg-background px-6 py-3">
      <span className="font-semibold">주간 근무 스케줄</span>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <NotificationBell
          userId={userId}
          homeHref={role === "admin" ? "/admin/schedule" : "/me/schedule"}
        />
        <span>
          {name} · {role === "admin" ? "관리자" : "멤버"}
        </span>
        <LogoutButton />
      </div>
    </header>
  );
}
