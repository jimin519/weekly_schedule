"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  MemberFormDialog,
  type MemberFormValues,
} from "@/components/members/member-form-dialog";
import { ResetPasswordDialog } from "@/components/members/reset-password-dialog";
import {
  createMember,
  resetMemberPassword,
  setMemberActive,
  updateMember,
  type MemberActionResult,
} from "@/lib/members/actions";
import type { Profile } from "@/lib/types/domain";

type Editing = { kind: "create" } | { kind: "edit" | "password" | "toggle"; member: Profile };

export function MembersClient({
  members,
  currentUserId,
  loadFailed,
}: {
  members: Profile[];
  currentUserId: string;
  loadFailed: boolean;
}) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [togglePending, setTogglePending] = useState(false);

  function close() {
    setEditing(null);
  }

  // 스케줄 화면의 멤버 목록 캐시도 함께 갱신한다.
  async function afterChange(pending: Promise<MemberActionResult>, successMessage: string) {
    const result = await pending;
    if (result.ok) {
      await queryClient.invalidateQueries({ queryKey: ["members"] });
      toast.success(successMessage);
    }
    return result;
  }

  async function handleToggle(member: Profile) {
    setTogglePending(true);
    const result = await afterChange(
      setMemberActive(member.id, !member.is_active),
      member.is_active ? "계정을 비활성화했습니다." : "계정을 다시 활성화했습니다.",
    );
    setTogglePending(false);
    if (result.ok) close();
    else toast.error(result.error);
  }

  const editingMember = editing && editing.kind !== "create" ? editing.member : null;

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">멤버 관리</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              계정 생성, 정보 수정, 비밀번호 재설정, 비활성화를 할 수 있습니다.
            </p>
          </div>
          <Button onClick={() => setEditing({ kind: "create" })}>멤버 추가</Button>
        </div>

        {loadFailed ? (
          <p className="mt-6 text-sm text-muted-foreground">멤버를 불러오지 못했습니다.</p>
        ) : (
          <ul className="mt-4 divide-y rounded-md border">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 text-sm"
              >
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: member.color }}
                />
                <span className={member.is_active ? "font-medium" : "font-medium opacity-50"}>
                  {member.name}
                </span>
                <span className="text-muted-foreground">{member.email}</span>
                <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                  {member.role === "admin" ? "관리자" : "멤버"}
                </Badge>
                {!member.is_active && <Badge variant="outline">비활성</Badge>}
                <div className="ml-auto flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing({ kind: "edit", member })}
                  >
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditing({ kind: "password", member })}
                  >
                    비밀번호
                  </Button>
                  {member.id !== currentUserId && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditing({ kind: "toggle", member })}
                    >
                      {member.is_active ? "비활성화" : "활성화"}
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <MemberFormDialog
        open={editing?.kind === "create" || editing?.kind === "edit"}
        onOpenChange={(open) => !open && close()}
        member={editing?.kind === "edit" ? editing.member : null}
        isSelf={editing?.kind === "edit" && editing.member.id === currentUserId}
        onSubmit={(values: MemberFormValues) =>
          editing?.kind === "edit"
            ? afterChange(
                updateMember(editing.member.id, {
                  email: values.email,
                  name: values.name,
                  role: values.role,
                  color: values.color,
                }),
                "멤버 정보를 저장했습니다.",
              )
            : afterChange(createMember(values), "멤버를 추가했습니다.")
        }
      />

      <ResetPasswordDialog
        open={editing?.kind === "password"}
        onOpenChange={(open) => !open && close()}
        memberName={editingMember?.name ?? ""}
        onSubmit={async (password) => {
          if (editing?.kind !== "password") return { ok: false, error: "대상을 찾을 수 없습니다." };
          const result = await resetMemberPassword(editing.member.id, password);
          if (result.ok) toast.success("비밀번호를 변경했습니다.");
          return result;
        }}
      />

      <Dialog open={editing?.kind === "toggle"} onOpenChange={(open) => !open && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingMember?.is_active ? "계정을 비활성화할까요?" : "계정을 활성화할까요?"}
            </DialogTitle>
            <DialogDescription>
              {editingMember?.is_active
                ? `${editingMember?.name}님은 더 이상 로그인할 수 없고 스케줄 배정 후보에서 제외됩니다. 기존 근무 기록은 그대로 유지되며 언제든 다시 활성화할 수 있습니다.`
                : `${editingMember?.name}님이 다시 로그인하고 스케줄에 배정될 수 있습니다.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              취소
            </Button>
            <Button
              variant={editingMember?.is_active ? "destructive" : "default"}
              disabled={togglePending}
              onClick={() => editingMember && handleToggle(editingMember)}
            >
              {editingMember?.is_active ? "비활성화" : "활성화"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
