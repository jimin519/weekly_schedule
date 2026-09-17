-- =========================================================
-- 시드 데이터: 관리자 1명 + 멤버 10명 + 샘플 주차 1개
-- 로그인 비밀번호(모든 계정 공통, 로컬 개발용): Password123!
-- =========================================================

-- auth.users, auth.identities 삽입 시 public.handle_new_user() 트리거가
-- 자동으로 public.profiles 행을 생성한다(raw_user_meta_data 사용).

do $$
declare
  v_instance uuid := '00000000-0000-0000-0000-000000000000';
  v_encrypted text := crypt('Password123!', gen_salt('bf'));

  -- 사용자 UUID
  admin_id uuid := '00000000-0000-0000-0000-000000000001';
  m1 uuid := '00000000-0000-0000-0000-000000000002'; -- 김민준
  m2 uuid := '00000000-0000-0000-0000-000000000003'; -- 이서연
  m3 uuid := '00000000-0000-0000-0000-000000000004'; -- 박도윤
  m4 uuid := '00000000-0000-0000-0000-000000000005'; -- 최지우
  m5 uuid := '00000000-0000-0000-0000-000000000006'; -- 정하은
  m6 uuid := '00000000-0000-0000-0000-000000000007'; -- 강시우
  m7 uuid := '00000000-0000-0000-0000-000000000008'; -- 조유나
  m8 uuid := '00000000-0000-0000-0000-000000000009'; -- 윤준서
  m9 uuid := '00000000-0000-0000-0000-000000000010'; -- 임서아
  m10 uuid := '00000000-0000-0000-0000-000000000011'; -- 한예준

  -- 이번 주 월요일(Asia/Seoul 기준)
  week_start date := (date_trunc('week', now() at time zone 'Asia/Seoul'))::date;
  week_id uuid;
begin
  -- ---------------------------------------------------------
  -- auth.users
  -- ---------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, recovery_token,
    email_change_token_new, email_change
  )
  values
    (v_instance, admin_id, 'authenticated', 'authenticated', 'admin@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"김관리","role":"admin","color":"#64748B"}', now(), now(), '', '', '', ''),
    (v_instance, m1, 'authenticated', 'authenticated', 'member01@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"김민준","role":"member","color":"#F87171"}', now(), now(), '', '', '', ''),
    (v_instance, m2, 'authenticated', 'authenticated', 'member02@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"이서연","role":"member","color":"#FB923C"}', now(), now(), '', '', '', ''),
    (v_instance, m3, 'authenticated', 'authenticated', 'member03@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"박도윤","role":"member","color":"#FBBF24"}', now(), now(), '', '', '', ''),
    (v_instance, m4, 'authenticated', 'authenticated', 'member04@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"최지우","role":"member","color":"#A3E635"}', now(), now(), '', '', '', ''),
    (v_instance, m5, 'authenticated', 'authenticated', 'member05@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"정하은","role":"member","color":"#34D399"}', now(), now(), '', '', '', ''),
    (v_instance, m6, 'authenticated', 'authenticated', 'member06@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"강시우","role":"member","color":"#22D3EE"}', now(), now(), '', '', '', ''),
    (v_instance, m7, 'authenticated', 'authenticated', 'member07@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"조유나","role":"member","color":"#60A5FA"}', now(), now(), '', '', '', ''),
    (v_instance, m8, 'authenticated', 'authenticated', 'member08@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"윤준서","role":"member","color":"#818CF8"}', now(), now(), '', '', '', ''),
    (v_instance, m9, 'authenticated', 'authenticated', 'member09@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"임서아","role":"member","color":"#C084FC"}', now(), now(), '', '', '', ''),
    (v_instance, m10, 'authenticated', 'authenticated', 'member10@example.com', v_encrypted, now(),
     '{"provider":"email","providers":["email"]}', '{"name":"한예준","role":"member","color":"#F472B6"}', now(), now(), '', '', '', '');

  -- ---------------------------------------------------------
  -- auth.identities (이메일/비밀번호 로그인에 필요)
  -- ---------------------------------------------------------
  insert into auth.identities (
    id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  )
  select
    gen_random_uuid(), u.id::text, u.id,
    jsonb_build_object('sub', u.id::text, 'email', u.email),
    'email', now(), now(), now()
  from auth.users u
  where u.id in (admin_id, m1, m2, m3, m4, m5, m6, m7, m8, m9, m10);

  -- ---------------------------------------------------------
  -- 샘플 주차 (이번 주 월요일 시작, 게시됨)
  -- ---------------------------------------------------------
  insert into public.schedule_weeks (week_start_date, status, published_at)
  values (week_start, 'published', now())
  returning id into week_id;

  -- ---------------------------------------------------------
  -- 샘플 근무 (일부 멤버만 배정하여 실제 현황과 비슷하게 구성)
  -- ---------------------------------------------------------
  insert into public.shifts (week_id, member_id, start_at, end_at, created_by)
  values
    -- 김민준: 월~금 09:00-18:00
    (week_id, m1, ((week_start + 0) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 0) + time '18:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m1, ((week_start + 1) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 1) + time '18:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m1, ((week_start + 2) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 2) + time '18:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m1, ((week_start + 3) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 3) + time '18:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m1, ((week_start + 4) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 4) + time '18:00') at time zone 'Asia/Seoul', admin_id),
    -- 이서연: 월~금 12:00-21:00
    (week_id, m2, ((week_start + 0) + time '12:00') at time zone 'Asia/Seoul', ((week_start + 0) + time '21:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m2, ((week_start + 1) + time '12:00') at time zone 'Asia/Seoul', ((week_start + 1) + time '21:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m2, ((week_start + 2) + time '12:00') at time zone 'Asia/Seoul', ((week_start + 2) + time '21:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m2, ((week_start + 3) + time '12:00') at time zone 'Asia/Seoul', ((week_start + 3) + time '21:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m2, ((week_start + 4) + time '12:00') at time zone 'Asia/Seoul', ((week_start + 4) + time '21:00') at time zone 'Asia/Seoul', admin_id),
    -- 박도윤: 월/수/금 09:00-15:00
    (week_id, m3, ((week_start + 0) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 0) + time '15:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m3, ((week_start + 2) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 2) + time '15:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m3, ((week_start + 4) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 4) + time '15:00') at time zone 'Asia/Seoul', admin_id),
    -- 최지우: 화/목 10:00-19:00
    (week_id, m4, ((week_start + 1) + time '10:00') at time zone 'Asia/Seoul', ((week_start + 1) + time '19:00') at time zone 'Asia/Seoul', admin_id),
    (week_id, m4, ((week_start + 3) + time '10:00') at time zone 'Asia/Seoul', ((week_start + 3) + time '19:00') at time zone 'Asia/Seoul', admin_id),
    -- 정하은: 토 10:00-16:00
    (week_id, m5, ((week_start + 5) + time '10:00') at time zone 'Asia/Seoul', ((week_start + 5) + time '16:00') at time zone 'Asia/Seoul', admin_id),
    -- 강시우: 일 10:00-16:00
    (week_id, m6, ((week_start + 6) + time '10:00') at time zone 'Asia/Seoul', ((week_start + 6) + time '16:00') at time zone 'Asia/Seoul', admin_id);

  -- ---------------------------------------------------------
  -- 샘플 근무 불가 시간
  -- ---------------------------------------------------------
  insert into public.unavailability (member_id, start_at, end_at, reason, is_recurring, recurrence_rule)
  values
    -- 이서연: 매주 화요일 09:00-13:00 반복 (병원 진료)
    (m2, ((week_start + 1) + time '09:00') at time zone 'Asia/Seoul', ((week_start + 1) + time '13:00') at time zone 'Asia/Seoul',
     '병원 진료', true, jsonb_build_object('freq', 'weekly')),
    -- 박도윤: 이번 주 토요일 하루 불가 (일회성)
    (m3, ((week_start + 5) + time '00:00') at time zone 'Asia/Seoul', ((week_start + 6) + time '00:00') at time zone 'Asia/Seoul',
     '개인 사정', false, null);
end $$;
