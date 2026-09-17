"use client";

import { useCallback, useMemo, useState } from "react";
import {
  addWeeks,
  formatWeekLabel,
  getWeekDates,
  mondayOfWeekContaining,
} from "@/lib/calendar/week";
import { currentWeekStartDate } from "@/lib/date";

export function useWeekNavigation(initialWeekStart?: string) {
  const [weekStart, setWeekStart] = useState(
    initialWeekStart ?? currentWeekStartDate(),
  );

  const weekDates = useMemo(() => getWeekDates(weekStart), [weekStart]);
  const weekLabel = useMemo(() => formatWeekLabel(weekStart), [weekStart]);

  const goToday = useCallback(() => setWeekStart(currentWeekStartDate()), []);
  const goPrev = useCallback(
    () => setWeekStart((w) => addWeeks(w, -1)),
    [],
  );
  const goNext = useCallback(() => setWeekStart((w) => addWeeks(w, 1)), []);
  const goToWeekOf = useCallback((dateStr: string) => {
    setWeekStart(mondayOfWeekContaining(dateStr));
  }, []);

  return { weekStart, weekDates, weekLabel, goToday, goPrev, goNext, goToWeekOf };
}
