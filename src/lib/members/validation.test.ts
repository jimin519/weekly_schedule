import { describe, expect, it } from "vitest";
import {
  checkSelfProtection,
  validateEmail,
  validateMemberProfile,
  validateNewMember,
  validatePassword,
} from "./validation";

const valid = {
  email: "new@example.com",
  name: "홍길동",
  role: "member" as const,
  color: "#F87171",
  password: "Password123!",
};

describe("validateEmail", () => {
  it("올바른 이메일은 통과한다", () => {
    expect(validateEmail("a@b.co")).toBeNull();
  });
  it("형식이 잘못되면 오류를 반환한다", () => {
    expect(validateEmail("abc")).not.toBeNull();
    expect(validateEmail("a@b")).not.toBeNull();
    expect(validateEmail("a b@c.com")).not.toBeNull();
  });
});

describe("validatePassword", () => {
  it("8자 미만은 거부한다", () => {
    expect(validatePassword("1234567")).not.toBeNull();
  });
  it("8자 이상은 통과한다", () => {
    expect(validatePassword("12345678")).toBeNull();
  });
});

describe("validateMemberProfile", () => {
  it("공백뿐인 이름은 거부한다", () => {
    expect(validateMemberProfile({ ...valid, name: "   " })).not.toBeNull();
  });
  it("너무 긴 이름은 거부한다", () => {
    expect(validateMemberProfile({ ...valid, name: "가".repeat(31) })).not.toBeNull();
  });
  it("잘못된 색상 형식은 거부한다", () => {
    expect(validateMemberProfile({ ...valid, color: "red" })).not.toBeNull();
    expect(validateMemberProfile({ ...valid, color: "#FFF" })).not.toBeNull();
  });
  it("정상 입력은 통과한다", () => {
    expect(validateMemberProfile(valid)).toBeNull();
  });
});

describe("validateNewMember", () => {
  it("모든 필드가 유효하면 통과한다", () => {
    expect(validateNewMember(valid)).toBeNull();
  });
  it("이메일 오류를 먼저 보고한다", () => {
    expect(validateNewMember({ ...valid, email: "x", password: "1" })).toBe(
      "올바른 이메일 형식이 아닙니다.",
    );
  });
  it("비밀번호가 짧으면 거부한다", () => {
    expect(validateNewMember({ ...valid, password: "short" })).not.toBeNull();
  });
});

describe("checkSelfProtection", () => {
  it("다른 사람에 대한 변경은 항상 허용한다", () => {
    expect(checkSelfProtection("a", "b", { role: "member", isActive: false })).toBeNull();
  });
  it("자기 자신을 멤버로 강등하는 것을 막는다", () => {
    expect(checkSelfProtection("a", "a", { role: "member" })).not.toBeNull();
  });
  it("자기 자신을 비활성화하는 것을 막는다", () => {
    expect(checkSelfProtection("a", "a", { isActive: false })).not.toBeNull();
  });
  it("자기 자신의 이름/색상 변경(역할 유지)은 허용한다", () => {
    expect(checkSelfProtection("a", "a", { role: "admin", isActive: true })).toBeNull();
  });
});
