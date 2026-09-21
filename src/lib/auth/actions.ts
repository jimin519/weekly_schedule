"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string } | undefined;

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력해주세요." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    if (error.code === "user_banned") {
      return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
    }
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다." };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, is_active")
    .eq("id", user!.id)
    .single();

  if (profile && !profile.is_active) {
    await supabase.auth.signOut();
    return { error: "비활성화된 계정입니다. 관리자에게 문의하세요." };
  }

  redirect(profile?.role === "admin" ? "/admin/schedule" : "/me/schedule");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // 리다이렉트는 클라이언트에서 강제 새로고침으로 수행한다(LogoutButton 참고).
  // 소프트 네비게이션에 의존하면 TanStack Query 캐시 등 클라이언트 상태가
  // 다음 로그인 세션까지 남아있을 수 있다.
}
