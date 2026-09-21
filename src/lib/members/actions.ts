"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth/get-profile";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  checkSelfProtection,
  validateMemberProfile,
  validateNewMember,
  validatePassword,
  type MemberProfileInput,
} from "@/lib/members/validation";

export type MemberActionResult = { ok: true } | { ok: false; error: string };

// 영구 정지에 가까운 값. "none"을 넘기면 정지가 해제된다.
const BAN_FOREVER = "876000h";

async function requireAdminActor(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "admin" || !profile.is_active) {
    return { ok: false, error: "관리자 권한이 필요합니다." };
  }
  return { ok: true, id: profile.id };
}

function fail(error: string): MemberActionResult {
  return { ok: false, error };
}

export async function createMember(
  input: MemberProfileInput & { email: string; password: string },
): Promise<MemberActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  const validationError = validateNewMember(input);
  if (validationError) return fail(validationError);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: input.email.trim(),
    password: input.password,
    email_confirm: true,
    // public.handle_new_user() 트리거가 이 값으로 profiles 행을 만든다.
    user_metadata: { name: input.name.trim(), role: input.role, color: input.color },
  });

  if (error) {
    if (error.code === "email_exists") return fail("이미 등록된 이메일입니다.");
    return fail("계정을 만들지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function updateMember(
  memberId: string,
  input: MemberProfileInput,
): Promise<MemberActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  const validationError =
    validateMemberProfile(input) ??
    checkSelfProtection(actor.id, memberId, { role: input.role });
  if (validationError) return fail(validationError);

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ name: input.name.trim(), role: input.role, color: input.color })
    .eq("id", memberId);

  if (error) return fail("멤버 정보를 저장하지 못했습니다.");

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function resetMemberPassword(
  memberId: string,
  password: string,
): Promise<MemberActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  const validationError = validatePassword(password);
  if (validationError) return fail(validationError);

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(memberId, { password });
  if (error) return fail("비밀번호를 변경하지 못했습니다.");

  return { ok: true };
}

export async function setMemberActive(
  memberId: string,
  isActive: boolean,
): Promise<MemberActionResult> {
  const actor = await requireAdminActor();
  if (!actor.ok) return actor;

  const selfError = checkSelfProtection(actor.id, memberId, { isActive });
  if (selfError) return fail(selfError);

  // 로그인과 세션 갱신을 막기 위해 auth 쪽 정지 상태를 먼저 맞춘다.
  const admin = createAdminClient();
  const { error: banError } = await admin.auth.admin.updateUserById(memberId, {
    ban_duration: isActive ? "none" : BAN_FOREVER,
  });
  if (banError) return fail("계정 상태를 변경하지 못했습니다.");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", memberId);
  if (error) return fail("계정 상태를 변경하지 못했습니다.");

  revalidatePath("/admin/members");
  return { ok: true };
}
