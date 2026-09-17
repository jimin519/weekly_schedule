"use client";

import { useEffect, useRef, useState } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type RealtimeStatus = "connecting" | "connected" | "disconnected";

const DISCONNECTED_STATES = new Set(["CLOSED", "TIMED_OUT", "CHANNEL_ERROR"]);

/**
 * 한 테이블(+선택적 필터)의 postgres_changes를 구독한다.
 * 재연결되면(연결 끊김 → 재연결) invalidateKey에 해당하는 쿼리를 자동으로 재조회한다.
 */
export function useTableRealtime<T extends Record<string, unknown>>(
  table: string,
  filter: string | undefined,
  onEvent: (payload: RealtimePostgresChangesPayload<T>) => void,
  options: { enabled?: boolean; invalidateKey?: QueryKey } = {},
): RealtimeStatus {
  const { enabled = true, invalidateKey } = options;
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  });
  const queryClient = useQueryClient();
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createClient();
    const channelName = `${table}:${filter ?? "all"}:${Math.random().toString(36).slice(2, 8)}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        (payload) => onEventRef.current(payload as RealtimePostgresChangesPayload<T>),
      )
      .subscribe((subscribeStatus) => {
        if (subscribeStatus === "SUBSCRIBED") {
          if (wasDisconnectedRef.current && invalidateKey) {
            queryClient.invalidateQueries({ queryKey: invalidateKey });
          }
          wasDisconnectedRef.current = false;
          setStatus("connected");
        } else if (DISCONNECTED_STATES.has(subscribeStatus)) {
          wasDisconnectedRef.current = true;
          setStatus("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- invalidateKey/queryClient는 안정적이라고 가정
  }, [table, filter, enabled]);

  return status;
}
