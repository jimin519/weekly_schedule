"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  // 로그인 사용자가 바뀌면(로그아웃 포함) 캐시를 비운다. 그렇지 않으면
  // 같은 탭에서 계정을 전환했을 때 이전 사용자의 RLS로 걸러진 데이터가
  // 잠시 그대로 보일 수 있다.
  const lastUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    const supabase = createClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (lastUserId.current !== undefined && lastUserId.current !== userId) {
        queryClient.clear();
      }
      lastUserId.current = userId;
    });
    return () => subscription.unsubscribe();
  }, [queryClient]);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
