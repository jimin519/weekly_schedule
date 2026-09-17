import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const profile = await getCurrentProfile();
  if (profile) {
    redirect(profile.role === "admin" ? "/admin/schedule" : "/me/schedule");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6 rounded-xl border bg-background p-8 shadow-sm">
        <div className="space-y-1 text-center">
          <h1 className="text-xl font-semibold">주간 근무 스케줄</h1>
          <p className="text-sm text-muted-foreground">
            관리자에게 받은 계정으로 로그인하세요.
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
