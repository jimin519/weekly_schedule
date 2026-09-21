import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

// 로컬 Supabase(`supabase start`)가 떠 있어야 통과하는 통합 테스트.
// 목적: 프론트엔드 라우트 가드와 별개로 DB 레벨 RLS가 실제로 강제되는지 확인한다.
//   npm run test:rls

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MEMBER01_ID = "00000000-0000-0000-0000-000000000002";
const MEMBER02_ID = "00000000-0000-0000-0000-000000000003";

describe("RLS: draft 주차는 멤버에게 절대 노출되지 않는다", () => {
  const admin = createClient<Database>(URL, SERVICE_ROLE_KEY);
  let member: SupabaseClient<Database>;
  let draftWeekId: string;

  beforeAll(async () => {
    const { data, error } = await admin
      .from("schedule_weeks")
      .insert({ week_start_date: "2026-11-02", status: "draft" })
      .select("id")
      .single();
    if (error) throw error;
    draftWeekId = data.id;

    member = createClient<Database>(URL, ANON_KEY);
    const { error: signInError } = await member.auth.signInWithPassword({
      email: "member01@example.com",
      password: "Password123!",
    });
    if (signInError) throw signInError;
  });

  afterAll(async () => {
    await admin.from("schedule_weeks").delete().eq("id", draftWeekId);
  });

  it("멤버는 draft 주차를 조회할 수 없다", async () => {
    const { data } = await member
      .from("schedule_weeks")
      .select("id")
      .eq("id", draftWeekId);
    expect(data).toEqual([]);
  });

  it("멤버는 published 주차는 조회할 수 있다", async () => {
    const { data } = await member
      .from("schedule_weeks")
      .select("id")
      .eq("status", "published");
    expect((data ?? []).length).toBeGreaterThan(0);
  });

  it("멤버는 shifts 테이블에 직접 쓸 수 없다", async () => {
    const { error, status } = await member.from("shifts").insert({
      week_id: draftWeekId,
      member_id: MEMBER01_ID,
      start_at: "2026-11-02T09:00:00+09:00",
      end_at: "2026-11-02T18:00:00+09:00",
    });
    expect(status).toBe(403);
    expect(error?.code).toBe("42501");
  });

  it("멤버는 다른 멤버의 불가 시간을 조회할 수 없다", async () => {
    const { data } = await member
      .from("unavailability")
      .select("id")
      .eq("member_id", MEMBER02_ID);
    expect(data).toEqual([]);
  });

  it("멤버는 본인 불가 시간은 CRUD 할 수 있다", async () => {
    const { data: inserted, error: insertError } = await member
      .from("unavailability")
      .insert({
        member_id: MEMBER01_ID,
        start_at: "2026-11-02T09:00:00+09:00",
        end_at: "2026-11-02T12:00:00+09:00",
        reason: "RLS 통합 테스트",
      })
      .select("id")
      .single();

    expect(insertError).toBeNull();
    expect(inserted?.id).toBeDefined();

    await member.from("unavailability").delete().eq("id", inserted!.id);
  });
});

describe("RLS: 실제 근무 기록(shift_records)은 본인 것만 읽을 수 있고 멤버는 쓸 수 없다", () => {
  const admin = createClient<Database>(URL, SERVICE_ROLE_KEY);
  let member: SupabaseClient<Database>;
  let ownShiftId: string;
  let otherShiftId: string;
  const testStartedAt = new Date().toISOString();

  async function pickPublishedShiftWithoutRecord(memberId: string): Promise<string> {
    const { data: shifts, error } = await admin
      .from("shifts")
      .select("id, schedule_weeks!inner(status), shift_records(shift_id)")
      .eq("member_id", memberId)
      .eq("schedule_weeks.status", "published");
    if (error) throw error;
    const candidate = (shifts ?? []).find((s) => {
      const records = s.shift_records as unknown;
      return records === null || (Array.isArray(records) && records.length === 0);
    });
    if (!candidate) throw new Error(`기록이 없는 게시된 근무가 없습니다: ${memberId}`);
    return candidate.id;
  }

  beforeAll(async () => {
    ownShiftId = await pickPublishedShiftWithoutRecord(MEMBER01_ID);
    otherShiftId = await pickPublishedShiftWithoutRecord(MEMBER02_ID);

    const { error } = await admin.from("shift_records").insert([
      { shift_id: ownShiftId, status: "absent", note: "RLS 통합 테스트" },
      { shift_id: otherShiftId, status: "absent", note: "RLS 통합 테스트" },
    ]);
    if (error) throw error;

    member = createClient<Database>(URL, ANON_KEY);
    const { error: signInError } = await member.auth.signInWithPassword({
      email: "member01@example.com",
      password: "Password123!",
    });
    if (signInError) throw signInError;
  });

  afterAll(async () => {
    await admin.from("shift_records").delete().in("shift_id", [ownShiftId, otherShiftId]);
    await admin
      .from("notifications")
      .delete()
      .eq("type", "attendance_recorded")
      .gte("created_at", testStartedAt);
  });

  it("멤버는 본인 근무의 기록을 조회할 수 있다", async () => {
    const { data } = await member.from("shift_records").select("shift_id").eq("shift_id", ownShiftId);
    expect(data).toEqual([{ shift_id: ownShiftId }]);
  });

  it("멤버는 동료 근무의 기록을 API로도 조회할 수 없다", async () => {
    const { data } = await member.from("shift_records").select("shift_id").eq("shift_id", otherShiftId);
    expect(data).toEqual([]);

    const { data: all } = await member.from("shift_records").select("shift_id");
    expect((all ?? []).map((r) => r.shift_id)).not.toContain(otherShiftId);
  });

  it("멤버는 shift_records에 직접 쓸 수 없다", async () => {
    const { error } = await member
      .from("shift_records")
      .update({ status: "worked", actual_start_at: "2026-01-01T00:00:00Z", actual_end_at: "2026-01-01T01:00:00Z" })
      .eq("shift_id", ownShiftId);
    expect(error).toBeNull();

    const { data } = await admin.from("shift_records").select("status").eq("shift_id", ownShiftId).single();
    expect(data?.status).toBe("absent");

    const { error: insertError } = await member
      .from("shift_records")
      .insert({ shift_id: otherShiftId, status: "absent" });
    expect(insertError).not.toBeNull();

    await member.from("shift_records").delete().eq("shift_id", ownShiftId);
    const { data: stillThere } = await admin.from("shift_records").select("shift_id").eq("shift_id", ownShiftId);
    expect(stillThere).toHaveLength(1);
  });

  it("결근/실제 시각이 서로 모순되는 기록은 DB가 거부한다", async () => {
    const { error } = await admin
      .from("shift_records")
      .update({ status: "worked" })
      .eq("shift_id", ownShiftId);
    expect(error).not.toBeNull();
  });
});
