import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 비밀번호 재설정 이메일 링크가 최종적으로 도착하는 곳.
// 코드 교환은 반드시 Route Handler(또는 Server Action)에서 해야 세션 쿠키가
// 실제로 저장된다. Server Component에서는 쿠키를 쓸 수 없어 조용히 무시된다.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.search = "";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      redirectUrl.pathname = "/reset-password";
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.pathname = "/reset-password";
  redirectUrl.searchParams.set("error", "invalid_link");
  return NextResponse.redirect(redirectUrl);
}
