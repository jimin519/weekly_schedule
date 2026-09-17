-- =========================================================
-- 알림 생성 트리거 (클라이언트가 아닌 DB에서 처리해 누락을 방지)
-- =========================================================

-- ---------------------------------------------------------
-- schedule_weeks 게시/초안 전환 시 해당 주에 근무가 있는 멤버 전원에게 알림
-- ---------------------------------------------------------
create or replace function public.notify_week_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_member record;
  notification_type text;
begin
  if new.status = old.status then
    return new;
  end if;

  if new.status = 'published' then
    notification_type := 'week_published';
  elsif new.status = 'draft' and old.status = 'published' then
    notification_type := 'week_unpublished';
  else
    return new;
  end if;

  for affected_member in
    select distinct member_id from public.shifts where week_id = new.id
  loop
    insert into public.notifications (user_id, type, payload)
    values (
      affected_member.member_id,
      notification_type,
      jsonb_build_object('week_start_date', new.week_start_date)
    );
  end loop;

  return new;
end;
$$;

create trigger schedule_weeks_notify_status_change
  after update on public.schedule_weeks
  for each row
  when (old.status is distinct from new.status)
  execute function public.notify_week_status_change();

-- ---------------------------------------------------------
-- 이미 게시된 주차의 근무가 생성/수정/삭제되면 당사자(들)에게 알림
-- (아직 게시되지 않은 주차의 편집은 알림을 발생시키지 않는다)
-- ---------------------------------------------------------
create or replace function public.notify_shift_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_week_id uuid := coalesce(new.week_id, old.week_id);
  week_status text;
  week_date date;
begin
  select status, week_start_date into week_status, week_date
  from public.schedule_weeks
  where id = target_week_id;

  if week_status is distinct from 'published' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, payload)
    values (
      new.member_id,
      'shift_created',
      jsonb_build_object(
        'week_start_date', week_date,
        'start_at', new.start_at,
        'end_at', new.end_at
      )
    );
  elsif tg_op = 'DELETE' then
    insert into public.notifications (user_id, type, payload)
    values (
      old.member_id,
      'shift_deleted',
      jsonb_build_object(
        'week_start_date', week_date,
        'start_at', old.start_at,
        'end_at', old.end_at
      )
    );
  elsif tg_op = 'UPDATE' then
    if new.member_id is distinct from old.member_id then
      insert into public.notifications (user_id, type, payload)
      values (
        old.member_id,
        'shift_deleted',
        jsonb_build_object(
          'week_start_date', week_date,
          'start_at', old.start_at,
          'end_at', old.end_at
        )
      );
      insert into public.notifications (user_id, type, payload)
      values (
        new.member_id,
        'shift_created',
        jsonb_build_object(
          'week_start_date', week_date,
          'start_at', new.start_at,
          'end_at', new.end_at
        )
      );
    elsif new.start_at is distinct from old.start_at or new.end_at is distinct from old.end_at then
      insert into public.notifications (user_id, type, payload)
      values (
        new.member_id,
        'shift_updated',
        jsonb_build_object(
          'week_start_date', week_date,
          'old_start_at', old.start_at,
          'old_end_at', old.end_at,
          'start_at', new.start_at,
          'end_at', new.end_at
        )
      );
    end if;
  end if;

  return coalesce(new, old);
end;
$$;

create trigger shifts_notify_change
  after insert or update or delete on public.shifts
  for each row
  execute function public.notify_shift_change();

-- ---------------------------------------------------------
-- 이미 게시된 주차의 근무와 겹치는 불가 시간을 새로 등록하면 관리자 전원에게 알림
-- (반복 규칙의 최초 발생일 기준으로만 검사한다)
-- ---------------------------------------------------------
create or replace function public.notify_unavailability_conflict()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_id uuid;
  conflicting_shift_id uuid;
begin
  select s.id into conflicting_shift_id
  from public.shifts s
  join public.schedule_weeks w on w.id = s.week_id
  where s.member_id = new.member_id
    and w.status = 'published'
    and tstzrange(s.start_at, s.end_at) && tstzrange(new.start_at, new.end_at)
  limit 1;

  if conflicting_shift_id is null then
    return new;
  end if;

  for admin_id in select id from public.profiles where role = 'admin'
  loop
    insert into public.notifications (user_id, type, payload)
    values (
      admin_id,
      'unavailability_conflict',
      jsonb_build_object(
        'member_id', new.member_id,
        'start_at', new.start_at,
        'end_at', new.end_at
      )
    );
  end loop;

  return new;
end;
$$;

create trigger unavailability_notify_conflict
  after insert on public.unavailability
  for each row
  execute function public.notify_unavailability_conflict();
