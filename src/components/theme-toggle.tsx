"use client";

import { useTheme } from "next-themes";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

const THEME_LABELS = {
  light: "라이트",
  dark: "다크",
  system: "시스템 설정",
};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center justify-between">
      <Label htmlFor="theme-select">화면 테마</Label>
      <Select
        items={THEME_LABELS}
        value={theme ?? "system"}
        onValueChange={(value) => value && setTheme(value)}
      >
        <SelectTrigger id="theme-select" className="w-36">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="light">라이트</SelectItem>
          <SelectItem value="dark">다크</SelectItem>
          <SelectItem value="system">시스템 설정</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
