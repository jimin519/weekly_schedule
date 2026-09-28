import { describe, expect, it } from "vitest";
import { maskEmail } from "./mask-email";

describe("maskEmail", () => {
  it("로컬파트 앞 2자만 보여주고 나머지는 가린다", () => {
    expect(maskEmail("suhjim@gmail.com")).toBe("su***@gmail.com");
  });

  it("로컬파트가 1자여도 그 1자만 보여준다", () => {
    expect(maskEmail("a@b.com")).toBe("a***@b.com");
  });

  it("도메인은 그대로 유지한다", () => {
    expect(maskEmail("kim.min@company.co.kr")).toBe("ki***@company.co.kr");
  });

  it("@가 없는 이상한 값은 그대로 반환한다", () => {
    expect(maskEmail("not-an-email")).toBe("not-an-email");
  });
});
