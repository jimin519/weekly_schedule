"use client";

import { useCallback, useRef, useState } from "react";

/** 실시간으로 변경된 항목의 id를 일정 시간 동안 하이라이트 상태로 유지한다. */
export function useHighlightedIds(durationMs = 2000) {
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const markHighlighted = useCallback(
    (id: string) => {
      setHighlightedIds((prev) => new Set(prev).add(id));

      const existing = timers.current.get(id);
      if (existing) clearTimeout(existing);

      const timer = setTimeout(() => {
        setHighlightedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        timers.current.delete(id);
      }, durationMs);
      timers.current.set(id, timer);
    },
    [durationMs],
  );

  return { highlightedIds, markHighlighted };
}
