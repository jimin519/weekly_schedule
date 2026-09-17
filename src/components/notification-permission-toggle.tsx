"use client";

import { useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type PermissionState = NotificationPermission | "unsupported";

function getInitialPermission(): PermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function NotificationPermissionToggle() {
  const [permission, setPermission] = useState<PermissionState>(getInitialPermission);

  async function handleRequest() {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }

  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label>브라우저 알림</Label>
        <p className="text-xs text-muted-foreground">
          {permission === "unsupported" && "이 브라우저는 알림을 지원하지 않습니다."}
          {permission === "granted" && "알림이 허용되어 있습니다."}
          {permission === "denied" &&
            "알림이 차단되어 있습니다. 브라우저 주소창의 사이트 설정에서 변경할 수 있습니다."}
          {permission === "default" && "새 알림이 도착하면 브라우저 알림을 받아보세요."}
        </p>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={permission !== "default"}
        onClick={handleRequest}
      >
        {permission === "granted" && <BellRing className="size-4" />}
        {permission === "denied" && <BellOff className="size-4" />}
        {permission === "default" && <Bell className="size-4" />}
        {permission === "granted"
          ? "허용됨"
          : permission === "denied"
            ? "차단됨"
            : "권한 요청"}
      </Button>
    </div>
  );
}
