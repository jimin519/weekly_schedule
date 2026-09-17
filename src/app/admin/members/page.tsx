import { createClient } from "@/lib/supabase/server";

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("profiles")
    .select("id, name, email, role, color, is_active")
    .order("role", { ascending: false })
    .order("name");

  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold">멤버 관리</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        초대/수정/비활성화 기능은 이후 단계에서 구현됩니다. 아래는 현재
        시드 데이터로 등록된 계정 목록입니다.
      </p>
      <ul className="mt-4 divide-y rounded-md border">
        {members?.map((member) => (
          <li
            key={member.id}
            className="flex items-center gap-3 px-4 py-2 text-sm"
          >
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: member.color }}
            />
            <span className="font-medium">{member.name}</span>
            <span className="text-muted-foreground">{member.email}</span>
            <span className="ml-auto text-xs text-muted-foreground">
              {member.role === "admin" ? "관리자" : "멤버"}
              {!member.is_active && " · 비활성화"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
