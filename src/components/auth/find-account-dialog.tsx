"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { requestPasswordReset, type RequestResetState } from "@/lib/auth/actions";
import { findEmailsByName, type FindEmailState } from "@/lib/auth/find-email";

type Tab = "email" | "password";

export function FindAccountDialog() {
  const [tab, setTab] = useState<Tab>("email");
  const [emailState, emailAction, emailPending] = useActionState<
    FindEmailState,
    FormData
  >(findEmailsByName, undefined);
  const [resetState, resetAction, resetPending] = useActionState<
    RequestResetState,
    FormData
  >(requestPasswordReset, undefined);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <button
            type="button"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            이메일 또는 비밀번호를 잊으셨나요?
          </button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>계정 찾기</DialogTitle>
          <DialogDescription>
            등록된 이름으로 이메일을 찾거나, 이메일로 비밀번호 재설정 링크를 받을 수
            있습니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => v && setTab(v as Tab)}>
          <TabsList>
            <TabsTrigger value="email">이메일 찾기</TabsTrigger>
            <TabsTrigger value="password">비밀번호 재설정</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab === "email" ? (
          <form action={emailAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="find-name">이름</Label>
              <Input
                id="find-name"
                name="name"
                placeholder="가입 시 등록한 이름"
                autoComplete="off"
                required
              />
            </div>
            {emailState?.error && (
              <p role="alert" className="text-sm text-destructive">
                {emailState.error}
              </p>
            )}
            {emailState?.emails &&
              (emailState.emails.length > 0 ? (
                <ul className="space-y-1">
                  {emailState.emails.map((email) => (
                    <li
                      key={email}
                      className="rounded-md border px-3 py-2 text-sm font-mono"
                    >
                      {email}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  일치하는 계정을 찾지 못했습니다. 이름을 정확히 입력했는지 확인하거나
                  관리자에게 문의하세요.
                </p>
              ))}
            <Button type="submit" className="w-full" disabled={emailPending}>
              {emailPending ? "찾는 중..." : "이메일 찾기"}
            </Button>
          </form>
        ) : (
          <form action={resetAction} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="reset-email">이메일</Label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </div>
            {resetState?.error && (
              <p role="alert" className="text-sm text-destructive">
                {resetState.error}
              </p>
            )}
            {resetState?.success && (
              <p className="text-sm text-muted-foreground">
                입력하신 이메일로 등록된 계정이 있다면 비밀번호 재설정 링크를
                보냈습니다. 메일함(스팸함 포함)을 확인해주세요.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={resetPending}>
              {resetPending ? "전송 중..." : "재설정 링크 보내기"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
