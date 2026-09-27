import type { UserRole } from "@/lib/types/domain";

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_NAME_LENGTH = 30;

export const MEMBER_COLOR_PALETTE = [
  "#F87171",
  "#FB923C",
  "#FBBF24",
  "#A3E635",
  "#34D399",
  "#22D3EE",
  "#60A5FA",
  "#818CF8",
  "#C084FC",
  "#F472B6",
  "#64748B",
] as const;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export function validateEmail(email: string): string | null {
  if (!EMAIL_PATTERN.test(email.trim())) return "올바른 이메일 형식이 아닙니다.";
  return null;
}

export function validatePassword(password: string): string | null {
  // 붙여넣기 등으로 앞뒤에 섞인 공백은 그대로 저장되어, 멤버가 공백 없이 입력하면
  // 로그인이 조용히 실패한다. 만들 때 미리 막는다.
  if (password !== password.trim()) {
    return "비밀번호 앞뒤에 공백이 있습니다. 공백을 지워주세요.";
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  return null;
}

export type MemberProfileInput = { name: string; role: UserRole; color: string };

export function validateMemberProfile(input: MemberProfileInput): string | null {
  const name = input.name.trim();
  if (!name) return "이름을 입력해주세요.";
  if (name.length > MAX_NAME_LENGTH) {
    return `이름은 ${MAX_NAME_LENGTH}자 이하로 입력해주세요.`;
  }
  if (input.role !== "admin" && input.role !== "member") return "역할이 올바르지 않습니다.";
  if (!COLOR_PATTERN.test(input.color)) return "색상 형식이 올바르지 않습니다.";
  return null;
}

export function validateNewMember(
  input: MemberProfileInput & { email: string; password: string },
): string | null {
  return (
    validateEmail(input.email) ??
    validateMemberProfile(input) ??
    validatePassword(input.password)
  );
}

/** 관리자가 자기 자신을 강등/비활성화해 관리자가 0명이 되는 상황을 막는다. */
export function checkSelfProtection(
  actorId: string,
  targetId: string,
  change: { role?: UserRole; isActive?: boolean },
): string | null {
  if (actorId !== targetId) return null;
  if (change.role === "member") return "자기 자신의 관리자 권한은 변경할 수 없습니다.";
  if (change.isActive === false) return "자기 자신의 계정은 비활성화할 수 없습니다.";
  return null;
}
