import { SLOT_MINUTES } from "@/lib/calendar/time";

/** 30분당 높이(px) */
export const SLOT_HEIGHT_PX = 24;
export const PX_PER_MINUTE = SLOT_HEIGHT_PX / SLOT_MINUTES;
export const GRID_HEIGHT_PX = 24 * 60 * PX_PER_MINUTE;
export const TIME_GUTTER_WIDTH_PX = 56;
export const MIN_BLOCK_HEIGHT_PX = 18;
