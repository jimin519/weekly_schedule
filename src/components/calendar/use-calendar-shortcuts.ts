"use client";

import { useEffect } from "react";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

/** T(오늘), J/K 또는 ←/→(주 이동), Esc(패널 닫기) 단축키. */
export function useCalendarShortcuts({
  onToday,
  onPrev,
  onNext,
  onEscape,
}: {
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEscape: () => void;
}) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case "t":
        case "T":
          onToday();
          break;
        case "j":
        case "J":
        case "ArrowLeft":
          onPrev();
          break;
        case "k":
        case "K":
        case "ArrowRight":
          onNext();
          break;
        case "Escape":
          onEscape();
          break;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToday, onPrev, onNext, onEscape]);
}
