-- =========================================================
-- Realtime: 클라이언트가 postgres_changes로 구독할 테이블 등록
-- RLS는 그대로 적용되므로 각 사용자는 자신이 SELECT 가능한 행의 변경만 수신한다.
-- =========================================================

alter publication supabase_realtime add table public.shifts;
alter publication supabase_realtime add table public.schedule_weeks;
alter publication supabase_realtime add table public.unavailability;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.inquiry_messages;
