-- =========================================================
-- 현재 로그인한 사용자의 프로필 조회 RPC
-- 목적: getCurrentProfile()이 매 요청마다 auth.getUser()(원격 검증 1회 왕복) +
-- profiles 조회(1회 왕복)를 각각 호출하던 것을, auth.uid()를 그대로 쓰는 쿼리
-- 하나로 합쳐 왕복을 줄인다. auth.uid()는 이미 모든 요청에 실려오는 JWT에서
-- Postgres가 직접 해석하므로 별도 검증 호출이 필요 없다. 세션이 없거나
-- 만료됐으면 auth.uid()가 null이 되어 행이 없는 것과 동일하게 처리된다
-- (호출부의 "프로필 없으면 로그인으로 리다이렉트" 로직을 그대로 재사용).
-- =========================================================

create or replace function public.current_profile()
returns public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

comment on function public.current_profile() is
  '현재 로그인한 사용자의 profiles 행. 세션이 없으면 행이 반환되지 않는다.';
