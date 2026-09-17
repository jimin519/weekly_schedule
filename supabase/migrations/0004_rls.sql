-- =========================================================
-- Row Level Security
-- 모든 테이블: 관리자는 전체 읽기/쓰기, 멤버는 명세된 범위만 허용
-- =========================================================

alter table public.profiles enable row level security;
alter table public.schedule_weeks enable row level security;
alter table public.shifts enable row level security;
alter table public.unavailability enable row level security;
alter table public.notifications enable row level security;
alter table public.inquiry_threads enable row level security;
alter table public.inquiry_messages enable row level security;

-- ---------------------------------------------------------
-- profiles
-- 관리자: 전체 CRUD. 멤버: 전체 프로필 조회만 가능(이름/색상 표시용)
-- ---------------------------------------------------------
create policy "profiles_admin_all" on public.profiles
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "profiles_member_select" on public.profiles
  for select
  using (auth.uid() is not null);

-- ---------------------------------------------------------
-- schedule_weeks
-- 관리자: 전체 CRUD. 멤버: status='published' 인 주차만 조회
-- ---------------------------------------------------------
create policy "schedule_weeks_admin_all" on public.schedule_weeks
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "schedule_weeks_member_select_published" on public.schedule_weeks
  for select
  using (status = 'published');

-- ---------------------------------------------------------
-- shifts
-- 관리자: 전체 CRUD. 멤버: 게시된 주차의 근무만 조회(본인+동료), 쓰기 불가
-- ---------------------------------------------------------
create policy "shifts_admin_all" on public.shifts
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "shifts_member_select_published_week" on public.shifts
  for select
  using (
    exists (
      select 1 from public.schedule_weeks w
      where w.id = shifts.week_id and w.status = 'published'
    )
  );

-- ---------------------------------------------------------
-- unavailability
-- 관리자: 전체 CRUD. 멤버: 본인 것만 CRUD, 타인 것은 조회 불가
-- ---------------------------------------------------------
create policy "unavailability_admin_all" on public.unavailability
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "unavailability_member_select_own" on public.unavailability
  for select
  using (member_id = auth.uid());

create policy "unavailability_member_insert_own" on public.unavailability
  for insert
  with check (member_id = auth.uid());

create policy "unavailability_member_update_own" on public.unavailability
  for update
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

create policy "unavailability_member_delete_own" on public.unavailability
  for delete
  using (member_id = auth.uid());

-- ---------------------------------------------------------
-- notifications
-- 관리자: 전체 조회(운영/디버깅용). 멤버: 본인 것만 조회, is_read 만 수정 가능
-- 생성(INSERT)은 클라이언트에서 직접 하지 않고 트리거/Edge Function(SECURITY DEFINER,
-- service_role)에서만 수행하므로 authenticated role 에는 INSERT 정책을 부여하지 않는다.
-- ---------------------------------------------------------
create policy "notifications_admin_select" on public.notifications
  for select
  using (public.is_admin());

create policy "notifications_member_select_own" on public.notifications
  for select
  using (user_id = auth.uid());

create policy "notifications_owner_update_is_read" on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- is_read 컬럼만 수정 가능하도록 컬럼 단위 권한으로 제한
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;

-- ---------------------------------------------------------
-- inquiry_threads
-- 관리자: 전체 CRUD. 멤버: 본인이 만든 스레드만 CRUD
-- ---------------------------------------------------------
create policy "inquiry_threads_admin_all" on public.inquiry_threads
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "inquiry_threads_member_select_own" on public.inquiry_threads
  for select
  using (member_id = auth.uid());

create policy "inquiry_threads_member_insert_own" on public.inquiry_threads
  for insert
  with check (member_id = auth.uid());

create policy "inquiry_threads_member_update_own" on public.inquiry_threads
  for update
  using (member_id = auth.uid())
  with check (member_id = auth.uid());

-- ---------------------------------------------------------
-- inquiry_messages
-- 관리자: 전체 CRUD. 멤버: 본인 스레드에 속한 메시지만 조회/작성
-- ---------------------------------------------------------
create policy "inquiry_messages_admin_all" on public.inquiry_messages
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "inquiry_messages_member_select_own_thread" on public.inquiry_messages
  for select
  using (
    exists (
      select 1 from public.inquiry_threads t
      where t.id = inquiry_messages.thread_id and t.member_id = auth.uid()
    )
  );

create policy "inquiry_messages_member_insert_own_thread" on public.inquiry_messages
  for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.inquiry_threads t
      where t.id = inquiry_messages.thread_id and t.member_id = auth.uid()
    )
  );
