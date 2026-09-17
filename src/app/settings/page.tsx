import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationPermissionToggle } from "@/components/notification-permission-toggle";

export default function SettingsPage() {
  return (
    <div className="max-w-md space-y-6 p-6">
      <h1 className="text-lg font-semibold">설정</h1>
      <div className="rounded-md border p-4">
        <ThemeToggle />
      </div>
      <div className="rounded-md border p-4">
        <NotificationPermissionToggle />
      </div>
    </div>
  );
}
