import { cn } from "@/lib/utils";
import { WEEKDAY_LABELS_KO, weekdayIndexOf } from "@/lib/calendar/week";
import { TIME_GUTTER_WIDTH_PX } from "./constants";

export function DayHeaderRow({
  weekDates,
  todayDate,
  onSelectDate,
}: {
  weekDates: string[];
  todayDate: string;
  onSelectDate?: (date: string) => void;
}) {
  return (
    <div className="flex border-b bg-background">
      <div className="shrink-0" style={{ width: TIME_GUTTER_WIDTH_PX }} />
      {weekDates.map((date) => {
        const isToday = date === todayDate;
        const day = Number(date.slice(8, 10));
        const dayIndex = weekdayIndexOf(date);
        return (
          <button
            key={date}
            type="button"
            disabled={!onSelectDate}
            onClick={() => onSelectDate?.(date)}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 border-l py-2",
              isToday && "bg-accent/30",
              onSelectDate && "cursor-pointer hover:bg-accent",
            )}
          >
            <span className="text-[11px] text-muted-foreground">
              {WEEKDAY_LABELS_KO[dayIndex]}
            </span>
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-sm font-medium",
                isToday && "bg-primary text-primary-foreground",
              )}
            >
              {day}
            </span>
          </button>
        );
      })}
    </div>
  );
}
