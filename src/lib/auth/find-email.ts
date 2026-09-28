"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { maskEmail } from "./mask-email";

export type FindEmailState = { emails?: string[]; error?: string } | undefined;

const MAX_RESULTS = 5;

/**
 * 이름으로 이메일을 찾는다. 로그인 전(비인증) 상태에서 호출되므로 RLS를 우회하는
 * service_role 클라이언트를 쓰되, 결과는 마스킹된 이메일만 최대 5개 반환한다.
 * 이름이 정확히 일치하는 경우만 찾는다(부분 일치를 허용하면 한두 글자로 전체 명단을
 * 훑어볼 수 있게 된다).
 */
export async function findEmailsByName(
  _prev: FindEmailState,
  formData: FormData,
): Promise<FindEmailState> {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "이름을 입력해주세요." };

  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("email")
    .ilike("name", name)
    .limit(MAX_RESULTS);

  return { emails: (data ?? []).map((row) => maskEmail(row.email)) };
}
