-- =========================================================
-- 공통 함수 & 트리거
-- =========================================================

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger schedule_weeks_set_updated_at
  before update on public.schedule_weeks
  for each row execute function public.set_updated_at();

create trigger shifts_set_updated_at
  before update on public.shifts
  for each row execute function public.set_updated_at();

create trigger inquiry_threads_set_updated_at
  before update on public.inquiry_threads
  for each row execute function public.set_updated_at();

-- 새 문의 메시지가 생기면 스레드 updated_at 갱신(최신순 정렬용)
create or replace function public.bump_inquiry_thread_updated_at()
returns trigger
language plpgsql
as $$
begin
  update public.inquiry_threads
  set updated_at = now()
  where id = new.thread_id;
  return new;
end;
$$;

create trigger inquiry_messages_bump_thread
  after insert on public.inquiry_messages
  for each row execute function public.bump_inquiry_thread_updated_at();

-- auth.users 생성 시 profiles 행 자동 생성
-- (관리자 초대 시 raw_user_meta_data 로 name/role/color 전달)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, color)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'member'),
    coalesce(new.raw_user_meta_data ->> 'color', '#94A3B8')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 현재 로그인한 사용자가 관리자인지 확인 (RLS 정책에서 재사용)
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
