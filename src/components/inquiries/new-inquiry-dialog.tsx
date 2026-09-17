"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function NewInquiryDialog({
  open,
  onOpenChange,
  initialSubject = "",
  onSubmit,
  isPending,
  trigger = true,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialSubject?: string;
  onSubmit: (input: { subject: string; body: string }) => void;
  isPending: boolean;
  trigger?: boolean;
}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const isOpen = isControlled ? open : internalOpen;
  const setOpen = isControlled ? onOpenChange! : setInternalOpen;

  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState("");

  // 다이얼로그가 닫힘→열림으로 바뀔 때만 제목을 초기값으로 맞춘다(렌더 중 상태 보정).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) setSubject(initialSubject);
  }

  function handleSubmit() {
    if (!subject.trim() || !body.trim()) return;
    onSubmit({ subject: subject.trim(), body: body.trim() });
    setSubject("");
    setBody("");
    setOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={<Button size="sm">새 문의</Button>} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 문의 작성</DialogTitle>
          <DialogDescription>관리자에게 전달할 문의 내용을 입력하세요.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="inquiry-subject">제목</Label>
            <Input
              id="inquiry-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="예: 다음 주 근무 변경 요청"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="inquiry-body">내용</Label>
            <Textarea
              id="inquiry-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="문의 내용을 입력하세요"
              className="min-h-24"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={isPending || !subject.trim() || !body.trim()}
          >
            보내기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
