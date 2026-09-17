import { GRID_HEIGHT_PX, PX_PER_MINUTE, TIME_GUTTER_WIDTH_PX } from "./constants";

const HOURS = Array.from({ length: 24 }, (_, h) => h);

export function TimeGutter() {
  return (
    <div
      className="relative shrink-0"
      style={{ width: TIME_GUTTER_WIDTH_PX, height: GRID_HEIGHT_PX }}
    >
      {HOURS.map((hour) => (
        <div
          key={hour}
          className="absolute right-2 -translate-y-1/2 text-[11px] text-muted-foreground"
          style={{ top: hour * 60 * PX_PER_MINUTE }}
        >
          {String(hour).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}
