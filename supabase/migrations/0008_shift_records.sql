-- =========================================================
-- 실제 근무 기록(shift_records)
-- shifts는 "계획"이고, 이 테이블은 그 근무를 실제로 어떻게 했는지를 근무 1건당 최대 1행으로 저장한다.
--   worked : 실제 시작/종료 시각을 기록(연장·조퇴는 계획 대비 차이로 계산)
--   absent : 결근(실제 시각 없음, 0시간)
-- 기록이 없는 근무는 "계획대로 근무"로 간주한다(애플리케이션에서 계산).
-- 별도 테이블로 두는 이유: RLS는 행 단위라 shifts에 컬럼으로 넣으면 멤버가 동료의
-- 결근/조퇴 기록까지 API로 조회할 수 있게 된다.
-- =========================================================

create table public.shift_records (
  shift_id uuid primary key references public.shifts (id) on delete cascade,
  status text not null check (status in ('worked', 'absent')),
  actual_start_at timestamptz,
  actual_end_at timestamptz,
  note text,
  recorded_by uuid references public.profiles (id) on delete set null,
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shift_records_times_match_status check (
    (
      status = 'worked'
      and actual_start_at is not null
      and actual_end_at is not null
      and actual_end_at > actual_start_at
    )
    or (
      status = 'absent'
      and actual_start_at is null
      and actual_end_at is null
    )
  )
);

comment on table public.shift_records is '근무별 실제 근무 기록(연장/조퇴/결근)';

create trigger shift_records_set_updated_at
  before update on public.shift_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- RLS: 관리자 전체 CRUD, 멤버는 게시된 주차의 "본인" 근무 기록만 조회
-- ---------------------------------------------------------
alter table public.shift_records enable row level security;

create policy "shift_records_admin_all" on public.shift_records
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "shift_records_member_select_own" on public.shift_records
  for select
  using (
    exists (
      select 1
      from public.shifts s
      join public.schedule_weeks w on w.id = s.week_id
      where s.id = shift_records.shift_id
        and s.member_id = auth.uid()
        and w.status = 'published'
    )
  );

-- ---------------------------------------------------------
-- 알림: 계획과 다르게 기록되었을 때(연장/조퇴/결근, 또는 그 정정) 해당 멤버에게 알린다.
-- "계획대로 근무"를 원클릭으로 확인하는 경우는 알리지 않는다.
-- ---------------------------------------------------------
alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in (
    'shift_created',
    'shift_updated',
    'shift_deleted',
    'week_published',
    'week_unpublished',
    'inquiry_reply',
    'new_inquiry',
    'unavailability_conflict',
    'attendance_recorded'
  )
);

create or replace function public.notify_shift_record()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  planned record;
  new_deviates boolean;
  old_deviates boolean := false;
begin
  select sh.member_id, sh.start_at, sh.end_at, w.status as week_status, w.week_start_date
  into planned
  from public.shifts sh
  join public.schedule_weeks w on w.id = sh.week_id
  where sh.id = new.shift_id;

  if not found or planned.week_status is distinct from 'published' then
    return new;
  end if;

  new_deviates := new.status = 'absent'
    or new.actual_start_at is distinct from planned.start_at
    or new.actual_end_at is distinct from planned.end_at;

  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status
      and old.actual_start_at is not distinct from new.actual_start_at
      and old.actual_end_at is not distinct from new.actual_end_at then
      return new;
    end if;
    old_deviates := old.status = 'absent'
      or old.actual_start_at is distinct from planned.start_at
      or old.actual_end_at is distinct from planned.end_at;
  end if;

  if not (new_deviates or old_deviates) then
    return new;
  end if;

  insert into public.notifications (user_id, type, payload)
  values (
    planned.member_id,
    'attendance_recorded',
    jsonb_build_object(
      'week_start_date', planned.week_start_date,
      'start_at', planned.start_at,
      'end_at', planned.end_at,
      'status', new.status,
      'actual_start_at', new.actual_start_at,
      'actual_end_at', new.actual_end_at,
      'note', new.note
    )
  );

  return new;
end;
$$;

create trigger shift_records_notify
  after insert or update on public.shift_records
  for each row
  execute function public.notify_shift_record();

-- Realtime 구독 대상 등록(RLS가 적용되므로 멤버는 본인 기록 변경만 수신)
alter publication supabase_realtime add table public.shift_records;
