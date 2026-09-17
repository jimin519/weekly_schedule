import { cn } from "@/lib/utils";
import { formatSeoul } from "@/lib/date";
import { Badge } from "@/components/ui/badge";
import type { InquiryThread } from "@/lib/types/domain";

export function InquiryThreadList({
  threads,
  selectedId,
  onSelect,
  memberNameById,
}: {
  threads: InquiryThread[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  memberNameById?: Map<string, string>;
}) {
  if (threads.length === 0) {
    return <p className="p-4 text-center text-xs text-muted-foreground">문의가 없습니다.</p>;
  }

  return (
    <ul className="divide-y overflow-y-auto">
      {threads.map((t) => (
        <li key={t.id}>
          <button
            type="button"
            onClick={() => onSelect(t.id)}
            className={cn(
              "flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left hover:bg-accent",
              selectedId === t.id && "bg-accent",
            )}
          >
            <div className="flex w-full items-center justify-between gap-2">
              <span className="truncate text-sm font-medium">{t.subject}</span>
              <Badge variant={t.status === "open" ? "secondary" : "outline"} className="shrink-0">
                {t.status === "open" ? "열림" : "해결됨"}
              </Badge>
            </div>
            <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
              <span>{memberNameById?.get(t.member_id) ?? ""}</span>
              <span>{formatSeoul(new Date(t.updated_at), "M/d HH:mm")}</span>
            </div>
          </button>
        </li>
      ))}
    </ul>
  );
}
