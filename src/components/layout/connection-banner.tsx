import { WifiOff } from "lucide-react";

export function ConnectionBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div className="flex items-center justify-center gap-2 bg-destructive/10 px-4 py-1.5 text-xs text-destructive">
      <WifiOff className="size-3.5" />
      연결 끊김, 재연결 중...
    </div>
  );
}
