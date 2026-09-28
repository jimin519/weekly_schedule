/** "이메일 찾기" 결과에 쓸 마스킹. 로컬파트 앞 최대 2자만 보여주고 나머지는 가린다. */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return email;

  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***${domain}`;
}
