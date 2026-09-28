"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { validateEmail, validatePassword } from "@/lib/members/validation";

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

async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

export type RequestResetState = { success?: boolean; error?: string } | undefined;

export async function requestPasswordReset(
  _prevState: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const email = String(formData.get("email") ?? "").trim();
  const emailError = validateEmail(email);
  if (emailError) return { error: emailError };

  const supabase = await createClient();
  const origin = await currentOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/confirm`,
  });

  // 계정 존재 여부가 드러나지 않도록, 실제 발송 여부와 무관하게 항상 성공으로 응답한다.
  return { success: true };
}

export type UpdatePasswordState = { error?: string } | undefined;

export async function updatePassword(
  _prevState: UpdatePasswordState,
  formData: FormData,
): Promise<UpdatePasswordState> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password !== confirm) {
    return { error: "비밀번호가 서로 일치하지 않습니다." };
  }
  const validationError = validatePassword(password);
  if (validationError) return { error: validationError };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "세션이 만료되었습니다. 재설정 링크를 다시 요청해주세요." };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "비밀번호를 변경하지 못했습니다." };

  redirect("/");
}
