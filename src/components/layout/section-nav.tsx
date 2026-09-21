import Link from "next/link";
import { cn } from "@/lib/utils";

export function SectionNav({
  items,
}: {
  items: { href: string; label: string }[];
}) {
  return (
    <nav className="flex gap-1 overflow-x-auto border-b bg-background px-3 sm:px-6">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "shrink-0 whitespace-nowrap px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
