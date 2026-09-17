import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";

export function WeekTopBar({
  weekLabel,
  onPrev,
  onNext,
  onToday,
  viewSwitch,
}: {
  weekLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  viewSwitch?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3 sm:px-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onToday}>
          오늘
        </Button>
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="이전 주"
            onClick={onPrev}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="다음 주"
            onClick={onNext}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
        <span className="whitespace-nowrap text-sm font-medium">{weekLabel}</span>
      </div>
      {viewSwitch && <div className="hidden sm:block">{viewSwitch}</div>}
    </div>
  );
}
