"use client";

import { useState } from "react";
import { ko } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { formatDateOnly, getWeekDates } from "@/lib/calendar/week";

export function MiniMonthCalendar({
  weekStart,
  onSelectDate,
}: {
  weekStart: string;
  onSelectDate: (dateStr: string) => void;
}) {
  const weekDates = getWeekDates(weekStart).map(
    (d) => new Date(`${d}T00:00:00`),
  );
  const [month, setMonth] = useState(weekDates[0]);
  const [syncedWeekStart, setSyncedWeekStart] = useState(weekStart);

  // weekStart가 바뀔 때(상단바 주 이동 등)만 표시 월을 따라가고,
  // 사용자가 미니 캘린더에서 직접 다른 달로 넘긴 상태는 건드리지 않는다.
  if (weekStart !== syncedWeekStart) {
    setSyncedWeekStart(weekStart);
    setMonth(weekDates[0]);
  }

  return (
    <Calendar
      mode="single"
      locale={ko}
      weekStartsOn={1}
      month={month}
      onMonthChange={setMonth}
      selected={undefined}
      modifiers={{ activeWeek: weekDates }}
      modifiersClassNames={{
        activeWeek: "bg-accent first:rounded-l-md last:rounded-r-md rounded-none",
      }}
      onDayClick={(date) => onSelectDate(formatDateOnly(date))}
      className="p-0"
    />
  );
}
