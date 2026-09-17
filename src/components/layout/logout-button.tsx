"use client";

import { useState } from "react";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const [pending, setPending] = useState(false);

  async function handleClick() {
    setPending(true);
    await logout();
    // 소프트 네비게이션이 아니라 강제 새로고침으로 이동해 TanStack Query
    // 캐시 등 클라이언트 상태를 확실히 초기화한다.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- 의도적인 하드 리로드
    window.location.href = "/login";
  }

  return (
    <Button type="button" variant="ghost" size="sm" onClick={handleClick} disabled={pending}>
      로그아웃
    </Button>
  );
}
