"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConnectionBanner } from "@/components/layout/connection-banner";
import { useTableRealtime } from "@/lib/realtime/use-table-realtime";
import { ATTENDANCE_RANGE_ROOT_KEY, useAttendanceRange, type AttendanceRow } from "@/lib/queries/shift-records";
import { useAllMembers } from "@/lib/queries/members";
import {
  aggregateHoursByMember,
  attendanceBadgeLabel,
  emptyTotals,
  formatMinutes,
  formatSignedMinutes,
  summarizeAttendance,
  type HoursTotals,
} from "@/lib/calendar/attendance";
import { periodFor, shiftAnchor, type PeriodKind } from "@/lib/calendar/period";
import { mondayOfWeekContaining } from "@/lib/calendar/week";
import { formatSeoul } from "@/lib/date";
import { cn } from "@/lib/utils";

function todaySeoul(): string {
  return formatSeoul(new Date(), "yyyy-MM-dd");
}

function ShiftLines({
  rows,
  editable,
}: {
  rows: AttendanceRow[];
  editable: boolean;
}) {
  const now = new Date();
  return (
    <ul className="divide-y rounded-md border bg-background">
      {rows.map(({ shift, record }) => {
        const summary = summarizeAttendance(shift, record, now);
        const badge = attendanceBadgeLabel(summary);
        const planned = `${formatSeoul(new Date(shift.start_at), "HH:mm")}–${formatSeoul(new Date(shift.end_at), "HH:mm")}`;

        let actualText: string;
        if (record?.status === "absent") actualText = "결근";
        else if (record?.actual_start_at && record.actual_end_at) {
          actualText = `실제 ${formatSeoul(new Date(record.actual_start_at), "HH:mm")}–${formatSeoul(new Date(record.actual_end_at), "HH:mm")}`;
        } else if (summary.kind === "upcoming") actualText = "예정";
        else actualText = "미확인 · 계획대로 집계";

        return (
          <li key={shift.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-xs">
            <span className="w-20 font-medium">
              {formatSeoul(new Date(shift.start_at), "M/d (EEE)")}
            </span>
            <span className="text-muted-foreground sm:w-24">계획 {planned}</span>
            <span
              className={cn(
                "order-last basis-full sm:order-none sm:basis-auto sm:flex-1",
                summary.kind === "unrecorded" || summary.kind === "upcoming"
                  ? "text-muted-foreground"
                  : "text-foreground",
              )}
            >
              {actualText}
              {record?.note && <span className="ml-2 text-muted-foreground">· {record.note}</span>}
            </span>
            {badge && (
              <Badge variant={summary.diffMinutes > 0 ? "secondary" : "outline"}>{badge}</Badge>
            )}
            <span className="ml-auto w-16 text-right tabular-nums sm:ml-0">
              {formatMinutes(summary.effectiveMinutes)}
            </span>
            {editable && (
              <Link
                href={`/admin/schedule?week=${mondayOfWeekContaining(formatSeoul(new Date(shift.start_at), "yyyy-MM-dd"))}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                스케줄에서 수정
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function SummaryCards({ totals }: { totals: HoursTotals }) {
  const items = [
    { label: "계획", value: formatMinutes(totals.plannedMinutes) },
    { label: "실제 근무", value: formatMinutes(totals.actualMinutes) },
    { label: "연장", value: totals.overtimeMinutes ? `+${formatMinutes(totals.overtimeMinutes)}` : "-" },
    { label: "차감(조퇴·결근)", value: totals.deductionMinutes ? `−${formatMinutes(totals.deductionMinutes)}` : "-" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border p-3">
          <div className="text-xs text-muted-foreground">{item.label}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

export function HoursReport({
  scope,
  memberId,
}: {
  scope: "admin" | "member";
  memberId?: string;
}) {
  const [kind, setKind] = useState<PeriodKind>("month");
  const [anchor, setAnchor] = useState(todaySeoul);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const period = useMemo(() => periodFor(kind, anchor), [kind, anchor]);
  const rangeQuery = useAttendanceRange(period, scope === "member" ? memberId : undefined);
  const membersQuery = useAllMembers();

  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ATTENDANCE_RANGE_ROOT_KEY });
  const recordsStatus = useTableRealtime("shift_records", undefined, invalidate, {
    invalidateKey: ATTENDANCE_RANGE_ROOT_KEY,
  });
  const shiftsStatus = useTableRealtime("shifts", undefined, invalidate, {
    invalidateKey: ATTENDANCE_RANGE_ROOT_KEY,
  });

  const rows = useMemo(() => rangeQuery.data ?? [], [rangeQuery.data]);
  const totalsByMember = useMemo(
    () =>
      aggregateHoursByMember(
        rows.map(({ shift, record }) => ({
          member_id: shift.member_id,
          start_at: shift.start_at,
          end_at: shift.end_at,
          record,
        })),
      ),
    [rows],
  );
  const rowsByMember = useMemo(() => {
    const map = new Map<string, AttendanceRow[]>();
    for (const row of rows) {
      map.set(row.shift.member_id, [...(map.get(row.shift.member_id) ?? []), row]);
    }
    return map;
  }, [rows]);

  const members = useMemo(() => membersQuery.data ?? [], [membersQuery.data]);
  const listedMembers = members.filter((m) => totalsByMember.has(m.id));
  const grandTotals = useMemo(() => {
    const sum = emptyTotals();
    for (const t of totalsByMember.values()) {
      sum.shiftCount += t.shiftCount;
      sum.plannedMinutes += t.plannedMinutes;
      sum.actualMinutes += t.actualMinutes;
      sum.overtimeMinutes += t.overtimeMinutes;
      sum.deductionMinutes += t.deductionMinutes;
      sum.upcomingMinutes += t.upcomingMinutes;
      sum.unrecordedCount += t.unrecordedCount;
    }
    return sum;
  }, [totalsByMember]);

  const isDisconnected = recordsStatus === "disconnected" || shiftsStatus === "disconnected";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
        <h1 className="text-sm font-semibold">{scope === "admin" ? "근무 기록" : "내 근무 기록"}</h1>
        <div className="flex items-center gap-2">
          <Tabs value={kind} onValueChange={(v) => setKind(v as PeriodKind)}>
            <TabsList>
              <TabsTrigger value="week">주</TabsTrigger>
              <TabsTrigger value="month">월</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            variant="outline"
            size="icon"
            aria-label="이전 기간"
            onClick={() => setAnchor(shiftAnchor(kind, anchor, -1))}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <span className="min-w-32 text-center text-sm font-medium">{period.label}</span>
          <Button
            variant="outline"
            size="icon"
            aria-label="다음 기간"
            onClick={() => setAnchor(shiftAnchor(kind, anchor, 1))}
          >
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(todaySeoul())}>
            오늘
          </Button>
        </div>
      </div>
      <ConnectionBanner show={isDisconnected} />

      <div className="flex-1 overflow-y-auto p-4">
        {rangeQuery.isError ? (
          <div className="flex flex-col items-center gap-3 py-16 text-sm text-muted-foreground">
            <p>근무 기록을 불러오지 못했습니다.</p>
            <Button variant="outline" size="sm" onClick={() => rangeQuery.refetch()}>
              다시 시도
            </Button>
          </div>
        ) : rangeQuery.isLoading || membersQuery.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            이 기간에는 근무 기록이 없습니다.
          </p>
        ) : (
          <div className="mx-auto max-w-4xl space-y-4">
            {scope === "member" ? (
              <>
                <SummaryCards totals={grandTotals} />
                <HintLine totals={grandTotals} />
                <ShiftLines rows={rows} editable={false} />
              </>
            ) : (
              <>
                <SummaryCards totals={grandTotals} />
                <HintLine totals={grandTotals} />
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full min-w-[36rem] text-sm">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">멤버</th>
                        <th className="px-3 py-2 text-right font-medium">계획</th>
                        <th className="px-3 py-2 text-right font-medium">실제</th>
                        <th className="px-3 py-2 text-right font-medium">연장</th>
                        <th className="px-3 py-2 text-right font-medium">차감</th>
                        <th className="px-3 py-2 text-right font-medium">확인 필요</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {listedMembers.map((member) => {
                        const t = totalsByMember.get(member.id)!;
                        const open = expandedId === member.id;
                        return (
                          <Fragment key={member.id}>
                            <tr
                              className="cursor-pointer hover:bg-accent"
                              onClick={() => setExpandedId(open ? null : member.id)}
                            >
                              <td className="px-3 py-2">
                                <button
                                  type="button"
                                  className="flex items-center gap-2 text-left font-medium"
                                  aria-expanded={open}
                                >
                                  <span
                                    className="size-2.5 shrink-0 rounded-full"
                                    style={{ backgroundColor: member.color }}
                                  />
                                  {member.name}
                                  {!member.is_active && <Badge variant="outline">비활성</Badge>}
                                </button>
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">{formatMinutes(t.plannedMinutes)}</td>
                              <td className="px-3 py-2 text-right font-semibold tabular-nums">
                                {formatMinutes(t.actualMinutes)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                                {t.overtimeMinutes ? `+${formatMinutes(t.overtimeMinutes)}` : "-"}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-red-600 dark:text-red-400">
                                {t.deductionMinutes ? `−${formatMinutes(t.deductionMinutes)}` : "-"}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                                {t.unrecordedCount ? `${t.unrecordedCount}건` : "-"}
                              </td>
                            </tr>
                            {open && (
                              <tr>
                                <td colSpan={6} className="bg-muted/20 p-3">
                                  <ShiftLines rows={rowsByMember.get(member.id) ?? []} editable />
                                </td>
                              </tr>
                            )}
                          </Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function HintLine({ totals }: { totals: HoursTotals }) {
  const parts: string[] = [];
  if (totals.unrecordedCount > 0) {
    parts.push(`기록이 없는 지난 근무 ${totals.unrecordedCount}건은 계획대로 근무한 것으로 집계했습니다.`);
  }
  if (totals.upcomingMinutes > 0) {
    parts.push(`아직 끝나지 않은 근무 ${formatMinutes(totals.upcomingMinutes)}는 실제 시간에 포함하지 않았습니다.`);
  }
  if (totals.overtimeMinutes > 0 || totals.deductionMinutes > 0) {
    parts.push(`계획 대비 ${formatSignedMinutes(totals.overtimeMinutes - totals.deductionMinutes)}.`);
  }
  if (parts.length === 0) return null;
  return <p className="text-xs text-muted-foreground">{parts.join(" ")}</p>;
}
