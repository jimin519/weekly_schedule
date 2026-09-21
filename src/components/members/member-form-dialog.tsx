"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PasswordField } from "@/components/members/password-field";
import { cn } from "@/lib/utils";
import { MEMBER_COLOR_PALETTE } from "@/lib/members/validation";
import type { MemberActionResult } from "@/lib/members/actions";
import type { Profile, UserRole } from "@/lib/types/domain";

const ROLE_LABELS: Record<UserRole, string> = { member: "멤버", admin: "관리자" };

export type MemberFormValues = {
  email: string;
  name: string;
  role: UserRole;
  color: string;
  password: string;
};

function initialValues(member: Profile | null): MemberFormValues {
  return {
    email: member?.email ?? "",
    name: member?.name ?? "",
    role: member?.role ?? "member",
    color: member?.color ?? MEMBER_COLOR_PALETTE[0],
    password: "",
  };
}

export function MemberFormDialog({
  open,
  onOpenChange,
  member,
  isSelf = false,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null이면 새 멤버 추가, 값이 있으면 해당 멤버 수정 */
  member: Profile | null;
  isSelf?: boolean;
  onSubmit: (values: MemberFormValues) => Promise<MemberActionResult>;
}) {
  // 닫히는 애니메이션 동안 화면이 다른 모드로 바뀌지 않도록 열릴 때의 값을 고정한다.
  const [shown, setShown] = useState({ isCreate: member === null, isSelf });
  const isCreate = shown.isCreate;
  const [values, setValues] = useState<MemberFormValues>(() => initialValues(member));
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  // 다이얼로그가 닫힘→열림으로 바뀔 때만 입력값을 초기화한다(렌더 중 상태 보정).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setShown({ isCreate: member === null, isSelf });
      setValues(initialValues(member));
      setError(null);
      setPending(false);
    }
  }

  function update<K extends keyof MemberFormValues>(key: K, value: MemberFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await onSubmit(values);
    setPending(false);
    if (result.ok) onOpenChange(false);
    else setError(result.error);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{isCreate ? "멤버 추가" : "멤버 수정"}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? "새 계정을 만들고 초기 비밀번호를 설정합니다."
                : "이메일, 이름, 역할, 색상을 변경합니다."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="member-email">이메일</Label>
            <Input
              id="member-email"
              type="email"
              value={values.email}
              onChange={(e) => update("email", e.target.value)}
              placeholder="name@example.com"
              autoComplete="off"
            />
            {!isCreate && (
              <p className="text-xs text-muted-foreground">
                이메일을 바꾸면 이 멤버는 새 이메일로 로그인해야 합니다.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="member-name">이름</Label>
            <Input
              id="member-name"
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              autoComplete="off"
            />
          </div>

          <div className="space-y-1.5">
            <Label>역할</Label>
            <Select
              items={ROLE_LABELS}
              value={values.role}
              onValueChange={(v) => v && update("role", v as UserRole)}
              disabled={shown.isSelf}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">멤버</SelectItem>
                <SelectItem value="admin">관리자</SelectItem>
              </SelectContent>
            </Select>
            {shown.isSelf && (
              <p className="text-xs text-muted-foreground">
                자기 자신의 역할은 변경할 수 없습니다.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>색상</Label>
            <div className="flex flex-wrap gap-2">
              {MEMBER_COLOR_PALETTE.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-label={`색상 ${color}`}
                  aria-pressed={values.color === color}
                  onClick={() => update("color", color)}
                  className={cn(
                    "size-7 rounded-full border-2 transition-transform",
                    values.color === color
                      ? "scale-110 border-foreground"
                      : "border-transparent",
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {isCreate && (
            <PasswordField
              id="member-password"
              value={values.password}
              onChange={(v) => update("password", v)}
            />
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button type="submit" disabled={pending}>
              {isCreate ? "추가" : "저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
