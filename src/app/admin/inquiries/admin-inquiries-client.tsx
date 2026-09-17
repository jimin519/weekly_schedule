"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { InquiryThreadList } from "@/components/inquiries/inquiry-thread-list";
import { InquiryThreadView } from "@/components/inquiries/inquiry-thread-view";
import { useIsMobile } from "@/hooks/use-is-mobile";
import { useTableRealtime } from "@/lib/realtime/use-table-realtime";
import { useActiveMembers } from "@/lib/queries/members";
import { useShift } from "@/lib/queries/shifts";
import {
  inquiryMessagesQueryKey,
  inquiryThreadsQueryKey,
  useAllInquiryThreads,
  useInquiryMessages,
  useSendInquiryMessage,
  useSetInquiryThreadStatus,
} from "@/lib/queries/inquiries";
import { formatSeoul } from "@/lib/date";
import { mondayOfWeekContaining } from "@/lib/calendar/week";

type Filter = "open" | "resolved" | "all";

export function AdminInquiriesClient({
  adminId,
  adminName,
}: {
  adminId: string;
  adminName: string;
}) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [filter, setFilter] = useState<Filter>("open");
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);

  const threadsQuery = useAllInquiryThreads();
  const threads = useMemo(() => threadsQuery.data ?? [], [threadsQuery.data]);
  const filteredThreads = useMemo(
    () => (filter === "all" ? threads : threads.filter((t) => t.status === filter)),
    [threads, filter],
  );
  const selectedThread = threads.find((t) => t.id === selectedThreadId) ?? null;

  const membersQuery = useActiveMembers();
  const memberNameById = useMemo(() => {
    const map = new Map((membersQuery.data ?? []).map((m) => [m.id, m.name]));
    map.set(adminId, adminName);
    return map;
  }, [membersQuery.data, adminId, adminName]);

  const messagesQuery = useInquiryMessages(selectedThread?.id);
  const messages = messagesQuery.data ?? [];

  const linkedShiftQuery = useShift(selectedThread?.shift_id ?? undefined);

  const sendMessage = useSendInquiryMessage(selectedThread?.id, "all");
  const setStatus = useSetInquiryThreadStatus("all");

  const queryClient = useQueryClient();
  const realtimeStatus = useTableRealtime(
    "inquiry_messages",
    undefined,
    () => {
      queryClient.invalidateQueries({ queryKey: inquiryThreadsQueryKey("all") });
      if (selectedThread) {
        queryClient.invalidateQueries({
          queryKey: inquiryMessagesQueryKey(selectedThread.id),
        });
      }
    },
    { invalidateKey: inquiryThreadsQueryKey("all") },
  );

  if (threadsQuery.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-sm text-muted-foreground">
        <p>문의를 불러오지 못했습니다.</p>
      </div>
    );
  }

  if (threadsQuery.isLoading) {
    return (
      <div className="flex flex-1 flex-col gap-3 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-full flex-1" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="text-sm font-semibold">스케줄 문의</h1>
        <Tabs value={filter} onValueChange={(v) => setFilter(v as Filter)}>
          <TabsList>
            <TabsTrigger value="open">열림</TabsTrigger>
            <TabsTrigger value="resolved">해결됨</TabsTrigger>
            <TabsTrigger value="all">전체</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <ConnectionBanner show={realtimeStatus === "disconnected"} />
      <div className="flex flex-1 overflow-hidden">
        {(!isMobile || !selectedThread) && (
          <div
            className={
              isMobile ? "flex-1 overflow-y-auto" : "w-72 shrink-0 overflow-y-auto border-r"
            }
          >
            <InquiryThreadList
              threads={filteredThreads}
              selectedId={selectedThreadId}
              onSelect={setSelectedThreadId}
              memberNameById={memberNameById}
            />
          </div>
        )}
        {(!isMobile || selectedThread) && (
          <div className="flex-1">
            {selectedThread ? (
              <InquiryThreadView
                thread={selectedThread}
                messages={messages}
                currentUserId={adminId}
                senderNameById={memberNameById}
                onSendMessage={(body) => sendMessage.mutate({ senderId: adminId, body })}
                isSending={sendMessage.isPending}
                onResolve={() =>
                  setStatus.mutate({ id: selectedThread.id, status: "resolved" })
                }
                onReopen={() => setStatus.mutate({ id: selectedThread.id, status: "open" })}
                onBack={isMobile ? () => setSelectedThreadId(null) : undefined}
                linkedShiftLabel={
                  linkedShiftQuery.data
                    ? `${formatSeoul(new Date(linkedShiftQuery.data.start_at), "M월 d일 (EEE)")} ${formatSeoul(new Date(linkedShiftQuery.data.start_at), "HH:mm")}–${formatSeoul(new Date(linkedShiftQuery.data.end_at), "HH:mm")}`
                    : undefined
                }
                onViewSchedule={
                  linkedShiftQuery.data
                    ? () => {
                        const shiftDate = formatSeoul(
                          new Date(linkedShiftQuery.data!.start_at),
                          "yyyy-MM-dd",
                        );
                        router.push(
                          `/admin/schedule?week=${mondayOfWeekContaining(shiftDate)}`,
                        );
                      }
                    : undefined
                }
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                왼쪽에서 문의를 선택하세요.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
