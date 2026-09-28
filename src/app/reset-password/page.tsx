import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export default async function ResetPasswordPage() {
  // 코드 교환은 /auth/confirm(Route Handler)에서 끝내고 여기로 리다이렉트해온다.
  // Server Component는 쿠키를 쓸 수 없어 여기서 교환하면 세션이 저장되지 않는다.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">비밀번호 재설정</h1>
        </div>
        {user ? (
          <ResetPasswordForm />
        ) : (
          <p className="text-center text-sm text-muted-foreground">
            링크가 유효하지 않거나 만료되었습니다. 로그인 화면에서 재설정 링크를 다시
            요청해주세요.
          </p>
        )}
      </div>
    </div>
  );
}
