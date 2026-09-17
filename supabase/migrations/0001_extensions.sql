-- 필요한 Postgres 확장 기능
create extension if not exists pgcrypto;   -- gen_random_uuid()
create extension if not exists btree_gist; -- shifts 겹침 방지 EXCLUDE 제약조건
