"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatSeoul } from "@/lib/date";
import { formatNotificationMessage } from "@/lib/calendar/notification-message";
import { useActiveMembers } from "@/lib/queries/members";
import {
  notificationsQueryKey,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from "@/lib/queries/notifications";
import { useTableRealtime } from "@/lib/realtime/use-table-realtime";
import type { Notification } from "@/lib/types/domain";

export function NotificationBell({
  userId,
  homeHref,
}: {
  userId: string;
  homeHref: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const notificationsQuery = useNotifications(userId);
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const markRead = useMarkNotificationRead(userId);
  const markAllRead = useMarkAllNotificationsRead(userId);

  const membersQuery = useActiveMembers();
  const memberNameById = useMemo(
    () => new Map((membersQuery.data ?? []).map((m) => [m.id, m.name])),
    [membersQuery.data],
  );

  useTableRealtime<Notification>(
    "notifications",
    `user_id=eq.${userId}`,
    (payload) => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey(userId) });
      if (payload.eventType === "INSERT" && payload.new) {
        const n = payload.new;
        const payloadObj = (n.payload ?? {}) as Record<string, unknown>;
        const message = formatNotificationMessage(n.type, payloadObj, {
          memberName: memberNameById.get(String(payloadObj.member_id)),
        });
        toast.info(message);
        if (typeof window !== "undefined" && Notification.permission === "granted") {
          new Notification("주간 근무 스케줄", { body: message });
        }
      }
    },
    { invalidateKey: notificationsQueryKey(userId) },
  );

  function handleClickNotification(n: Notification) {
    if (!n.is_read) markRead.mutate(n.id);
    const payloadObj = (n.payload ?? {}) as Record<string, unknown>;
    const weekStart = payloadObj.week_start_date;
    if (typeof weekStart === "string") {
      router.push(`${homeHref}?week=${weekStart}`);
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button variant="ghost" size="icon" className="relative" aria-label="알림">
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">알림</span>
          {unreadCount > 0 && (
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => markAllRead.mutate()}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted-foreground">알림이 없습니다.</p>
          ) : (
            notifications.map((n) => {
              const payloadObj = (n.payload ?? {}) as Record<string, unknown>;
              return (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotification(n)}
                  className={cn(
                    "flex w-full flex-col items-start gap-0.5 border-b px-3 py-2 text-left text-xs last:border-b-0 hover:bg-accent",
                    !n.is_read && "bg-accent/40",
                  )}
                >
                  <span className="flex items-start gap-1.5">
                    {!n.is_read && (
                      <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
                    )}
                    <span>
                      {formatNotificationMessage(n.type, payloadObj, {
                        memberName: memberNameById.get(String(payloadObj.member_id)),
                      })}
                    </span>
                  </span>
                  <span className="pl-3 text-[10px] text-muted-foreground">
                    {formatSeoul(new Date(n.created_at), "M/d HH:mm")}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
