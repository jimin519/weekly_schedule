-- =========================================================
-- 스키마: profiles, schedule_weeks, shifts, unavailability,
--         notifications, inquiry_threads, inquiry_messages
-- =========================================================

-- ---------------------------------------------------------
-- profiles
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'member' check (role in ('admin', 'member')),
  color text not null default '#94A3B8',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.profiles is '사용자 프로필(관리자/멤버)';

-- ---------------------------------------------------------
-- schedule_weeks
-- ---------------------------------------------------------
create table public.schedule_weeks (
  id uuid primary key default gen_random_uuid(),
  week_start_date date not null unique,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint schedule_weeks_monday_start check (extract(dow from week_start_date) = 1)
);

comment on table public.schedule_weeks is '주차별 스케줄 상태(초안/게시)';

-- ---------------------------------------------------------
-- shifts
-- ---------------------------------------------------------
create table public.shifts (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references public.schedule_weeks (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_time_order check (end_at > start_at),
  -- 같은 멤버의 근무 시간 중복 배정 차단
  exclude using gist (
    member_id with =,
    tstzrange(start_at, end_at) with &&
  )
);

comment on table public.shifts is '근무 블록';

create index shifts_week_id_idx on public.shifts (week_id);
create index shifts_member_id_idx on public.shifts (member_id);
create index shifts_start_at_idx on public.shifts (start_at);

-- ---------------------------------------------------------
-- unavailability
-- ---------------------------------------------------------
create table public.unavailability (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  start_at timestamptz not null,
  end_at timestamptz not null,
  reason text,
  is_recurring boolean not null default false,
  -- 반복 규칙 예: {"freq": "weekly", "until": "2026-12-31"}
  -- 요일/시각은 start_at, end_at 로부터 파생(Asia/Seoul 기준은 애플리케이션에서 변환)
  recurrence_rule jsonb,
  created_at timestamptz not null default now(),
  constraint unavailability_time_order check (end_at > start_at),
  constraint unavailability_recurrence_rule_required check (
    (is_recurring = false) or (is_recurring = true and recurrence_rule is not null)
  )
);

comment on table public.unavailability is '멤버 근무 불가 시간(일회성/반복)';

create index unavailability_member_id_idx on public.unavailability (member_id);

-- ---------------------------------------------------------
-- notifications
-- ---------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (
    type in (
      'shift_created',
      'shift_updated',
      'shift_deleted',
      'week_published',
      'week_unpublished',
      'inquiry_reply',
      'new_inquiry',
      'unavailability_conflict'
    )
  ),
  payload jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.notifications is '사용자 알림';

create index notifications_user_id_is_read_idx on public.notifications (user_id, is_read);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------
-- inquiry_threads
-- ---------------------------------------------------------
create table public.inquiry_threads (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  week_id uuid references public.schedule_weeks (id) on delete set null,
  shift_id uuid references public.shifts (id) on delete set null,
  subject text not null,
  status text not null default 'open' check (status in ('open', 'resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.inquiry_threads is '스케줄 문의 스레드';

create index inquiry_threads_member_id_idx on public.inquiry_threads (member_id);
create index inquiry_threads_status_idx on public.inquiry_threads (status);
create index inquiry_threads_updated_at_idx on public.inquiry_threads (updated_at desc);

-- ---------------------------------------------------------
-- inquiry_messages
-- ---------------------------------------------------------
create table public.inquiry_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.inquiry_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

comment on table public.inquiry_messages is '문의 스레드 내 메시지';

create index inquiry_messages_thread_id_idx on public.inquiry_messages (thread_id, created_at);
