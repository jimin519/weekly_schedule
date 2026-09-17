-- =========================================================
-- 문의 알림 트리거
-- 멤버가 보낸 메시지(새 문의 포함)는 관리자 전원에게, 관리자의 답장은 해당 멤버에게 알린다.
-- 스레드 생성 자체가 아니라 메시지 삽입 시점에 알림을 발생시켜, 첫 메시지와 스레드 생성이
-- 한 번의 사용자 동작으로 함께 일어나도 알림이 중복되지 않게 한다.
-- =========================================================

create or replace function public.notify_inquiry_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  thread_member_id uuid;
  thread_subject text;
  admin_id uuid;
begin
  select member_id, subject into thread_member_id, thread_subject
  from public.inquiry_threads
  where id = new.thread_id;

  if new.sender_id = thread_member_id then
    -- 멤버가 보낸 메시지(새 문의 또는 후속 메시지) → 관리자 전원에게 알림
    for admin_id in select id from public.profiles where role = 'admin'
    loop
      insert into public.notifications (user_id, type, payload)
      values (
        admin_id,
        'new_inquiry',
        jsonb_build_object('thread_id', new.thread_id, 'subject', thread_subject)
      );
    end loop;
  else
    -- 관리자(또는 그 외)가 보낸 답장 → 문의를 등록한 멤버에게 알림
    insert into public.notifications (user_id, type, payload)
    values (
      thread_member_id,
      'inquiry_reply',
      jsonb_build_object('thread_id', new.thread_id, 'subject', thread_subject)
    );
  end if;

  return new;
end;
$$;

create trigger inquiry_messages_notify
  after insert on public.inquiry_messages
  for each row
  execute function public.notify_inquiry_message();
