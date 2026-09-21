"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH } from "@/lib/members/validation";

const PASSWORD_CHARS = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generatePassword(length = 12): string {
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  return Array.from(values, (v) => PASSWORD_CHARS[v % PASSWORD_CHARS.length]).join("");
}

// 관리자가 값을 확인하고 멤버에게 전달해야 하므로 마스킹하지 않는다.
export function PasswordField({
  id,
  label = "초기 비밀번호",
  value,
  onChange,
}: {
  id: string;
  label?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex gap-2">
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
          autoComplete="off"
          className="font-mono"
        />
        <Button type="button" variant="outline" onClick={() => onChange(generatePassword())}>
          자동 생성
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        생성 후에는 다시 볼 수 없으니 멤버에게 전달할 값을 꼭 확인하세요.
      </p>
    </div>
  );
}
