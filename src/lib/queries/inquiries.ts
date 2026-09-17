"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { InquiryMessage, InquiryStatus, InquiryThread } from "@/lib/types/domain";

export function inquiryThreadsQueryKey(scope: string) {
  return ["inquiry-threads", scope] as const;
}

export function inquiryMessagesQueryKey(threadId: string | undefined) {
  return ["inquiry-messages", threadId ?? "none"] as const;
}

/** 멤버 본인의 문의 스레드 전체(최신순). */
export function useMyInquiryThreads(memberId: string | undefined) {
  return useQuery({
    queryKey: inquiryThreadsQueryKey(memberId ?? "none"),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inquiry_threads")
        .select("*")
        .eq("member_id", memberId!)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as InquiryThread[];
    },
    enabled: !!memberId,
  });
}

/** 관리자용: 전체 문의 스레드(최신순). */
export function useAllInquiryThreads() {
  return useQuery({
    queryKey: inquiryThreadsQueryKey("all"),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inquiry_threads")
        .select("*")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as InquiryThread[];
    },
  });
}

export function useInquiryMessages(threadId: string | undefined) {
  return useQuery({
    queryKey: inquiryMessagesQueryKey(threadId),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("inquiry_messages")
        .select("*")
        .eq("thread_id", threadId!)
        .order("created_at");
      if (error) throw error;
      return data as InquiryMessage[];
    },
    enabled: !!threadId,
  });
}

function useInvalidateThreads(scope: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: inquiryThreadsQueryKey(scope) }),
      queryClient.invalidateQueries({ queryKey: inquiryThreadsQueryKey("all") }),
    ]);
}

/** 새 문의 스레드를 만들고(선택적으로 근무/주차와 연결) 첫 메시지를 함께 등록한다. */
export function useCreateInquiryThread(memberId: string | undefined) {
  const invalidate = useInvalidateThreads(memberId ?? "none");
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      body: string;
      weekId?: string;
      shiftId?: string;
    }) => {
      const supabase = createClient();
      const { data: thread, error: threadError } = await supabase
        .from("inquiry_threads")
        .insert({
          member_id: memberId!,
          subject: input.subject,
          week_id: input.weekId ?? null,
          shift_id: input.shiftId ?? null,
        })
        .select("*")
        .single();
      if (threadError) throw threadError;

      const { error: messageError } = await supabase.from("inquiry_messages").insert({
        thread_id: thread.id,
        sender_id: memberId!,
        body: input.body,
      });
      if (messageError) throw messageError;

      return thread as InquiryThread;
    },
    onSuccess: invalidate,
  });
}

export function useSendInquiryMessage(threadId: string | undefined, scope: string) {
  const queryClient = useQueryClient();
  const invalidateThreads = useInvalidateThreads(scope);
  return useMutation({
    mutationFn: async (input: { senderId: string; body: string }) => {
      const supabase = createClient();
      const { error } = await supabase.from("inquiry_messages").insert({
        thread_id: threadId!,
        sender_id: input.senderId,
        body: input.body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inquiryMessagesQueryKey(threadId) });
      invalidateThreads();
    },
  });
}

export function useSetInquiryThreadStatus(scope: string) {
  const invalidate = useInvalidateThreads(scope);
  return useMutation({
    mutationFn: async (input: { id: string; status: InquiryStatus }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("inquiry_threads")
        .update({ status: input.status })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}
