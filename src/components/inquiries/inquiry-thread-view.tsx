"use client";

import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatSeoul } from "@/lib/date";
import type { InquiryMessage, InquiryThread } from "@/lib/types/domain";

export function InquiryThreadView({
  thread,
  messages,
  currentUserId,
  senderNameById,
  onSendMessage,
  isSending,
  onResolve,
  onReopen,
  linkedShiftLabel,
  onViewSchedule,
  onBack,
}: {
  thread: InquiryThread;
  messages: InquiryMessage[];
  currentUserId: string;
  senderNameById: Map<string, string>;
  onSendMessage: (body: string) => void;
  isSending: boolean;
  onResolve?: () => void;
  onReopen?: () => void;
  linkedShiftLabel?: string;
  onViewSchedule?: () => void;
  onBack?: () => void;
}) {
  const [draft, setDraft] = useState("");

  function handleSend() {
    const body = draft.trim();
    if (!body) return;
    onSendMessage(body);
    setDraft("");
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-start gap-2">
          {onBack && (
            <Button
              variant="ghost"
              size="icon"
              className="-ml-2 shrink-0"
              onClick={onBack}
              aria-label="목록으로"
            >
              <ArrowLeft className="size-4" />
            </Button>
          )}
          <div>
            <h2 className="text-sm font-semibold">{thread.subject}</h2>
            <Badge
              variant={thread.status === "open" ? "secondary" : "outline"}
              className="mt-1"
            >
              {thread.status === "open" ? "열림" : "해결됨"}
            </Badge>
          </div>
        </div>
        {onResolve && thread.status === "open" && (
          <Button size="sm" variant="outline" onClick={onResolve}>
            해결됨으로 표시
          </Button>
        )}
        {onReopen && thread.status === "resolved" && (
          <Button size="sm" variant="outline" onClick={onReopen}>
            다시 열기
          </Button>
        )}
      </div>

      {linkedShiftLabel && (
        <button
          type="button"
          onClick={onViewSchedule}
          className="border-b px-4 py-2 text-left text-xs text-muted-foreground hover:bg-accent"
        >
          연결된 근무: {linkedShiftLabel} →
        </button>
      )}

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <p className="text-center text-xs text-muted-foreground">메시지가 없습니다.</p>
        )}
        {messages.map((m) => {
          const isMine = m.sender_id === currentUserId;
          return (
            <div
              key={m.id}
              className={cn("flex flex-col", isMine ? "items-end" : "items-start")}
            >
              <span className="mb-0.5 text-[10px] text-muted-foreground">
                {senderNameById.get(m.sender_id) ?? "알 수 없음"} ·{" "}
                {formatSeoul(new Date(m.created_at), "M/d HH:mm")}
              </span>
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  isMine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m.body}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-end gap-2 border-t p-3">
        <Textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="메시지를 입력하세요"
          className="min-h-16 flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={isSending || !draft.trim()}>
          전송
        </Button>
      </div>
    </div>
  );
}
