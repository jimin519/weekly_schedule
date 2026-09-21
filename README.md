# 주간 근무 스케줄 관리 웹앱

약 10명 규모 팀을 위한 주간 근무 스케줄 관리 도구. Notion Calendar 스타일 UI, 관리자/멤버
역할 분리, Supabase(Postgres + Auth + Realtime + RLS) 기반.

## 기술 스택

- Next.js 16 (App Router) + TypeScript(strict)
- Tailwind CSS + shadcn/ui + lucide-react
- Supabase (Postgres, Auth, Realtime, RLS)
- date-fns / date-fns-tz (Asia/Seoul)
- @dnd-kit/core, TanStack Query
- Vitest

## 사전 준비물

- Node.js 20+ (Homebrew로 설치됨: `brew install node`)
- Supabase CLI (Homebrew로 설치됨: `brew install supabase/tap/supabase`)
- **Docker Desktop** — 로컬 Supabase 스택(Postgres/Auth/Realtime)을 Docker 컨테이너로 띄웁니다.
  1. `/Applications`에 Docker Desktop이 없다면 https://www.docker.com/products/docker-desktop/ 에서 설치하세요.
  2. Docker Desktop을 실행하고 최초 1회 라이선스 동의 및 관리자 권한 설정(암호 입력)을 완료하세요.
  3. 메뉴바 고래 아이콘이 "Docker Desktop is running" 상태가 될 때까지 기다리세요.

## 로컬 실행 방법

```bash
npm install
supabase start   # Docker 컨테이너로 로컬 Supabase 스택 기동 + migrations/seed 자동 적용
npm run dev
```

`supabase start`가 출력하는 API URL / anon key / service_role key는 로컬 개발에서는 항상
동일한 고정값이며, 이미 `.env.local`에 채워져 있습니다(다른 값이 출력되면 `.env.local`을
갱신하세요).

브라우저에서 http://localhost:3000 접속 시 로그인 페이지로 리다이렉트됩니다.

### 시드 계정 (비밀번호 공통: `Password123!`)

| 이메일 | 역할 |
| --- | --- |
| admin@example.com | 관리자 |
| member01@example.com ~ member10@example.com | 멤버 |

### 유용한 명령어

```bash
npm run dev          # 개발 서버
npm run build         # 프로덕션 빌드
npm run lint           # ESLint
npm run test            # Vitest 단위 테스트
npm run test:rls          # RLS 통합 테스트 (supabase start 필요)
supabase status          # 로컬 Supabase 상태/URL 확인
supabase db reset         # migrations + seed 재적용(데이터 초기화)
supabase stop               # 로컬 스택 종료
npx supabase gen types typescript --local > src/lib/types/database.ts
                              # 스키마 변경 후 타입 재생성
```

## 환경 변수 (`.env.local`)

| 변수 | 설명 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 로컬 Supabase API URL (기본 `http://127.0.0.1:54321`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 클라이언트용 anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 서버 전용(RLS 우회) 키. 절대 클라이언트에 노출 금지 |
| `NEXT_PUBLIC_APP_TIMEZONE` | `Asia/Seoul` 고정 |

## 디렉터리 구조

```
src/
  app/               라우트(App Router)
    admin/           관리자 전용 (/admin/schedule, /admin/members, /admin/inquiries)
    me/              멤버 전용 (/me/schedule, /me/availability, /me/inquiries)
    login/           로그인
    settings/        공통 설정
  components/ui/     shadcn/ui 컴포넌트
  components/layout/ 공통 레이아웃(상단바, 섹션 내비게이션)
  lib/supabase/      Supabase 클라이언트(브라우저/서버/proxy)
  lib/auth/          인증 Server Actions, 프로필 조회(DAL)
  lib/types/         Database 타입
  proxy.ts           Next.js 16의 middleware.ts 대체 파일. 세션 갱신 + 미인증 리다이렉트
supabase/
  migrations/        스키마·함수·트리거·RLS 마이그레이션
  seed.sql             시드 데이터(관리자 1명 + 멤버 10명 + 샘플 게시 주차)
```

## 구현 현황

- [x] 1단계 — 프로젝트 세팅, Supabase 스키마·RLS·시드, 인증 및 역할별 라우팅
- [x] 2단계 — 주간 캘린더 공통 컴포넌트(타임 그리드, 드래그/리사이즈). `/admin/schedule`에 로컬
      상태 기반 데모로 연결되어 있으며, 실제 Supabase 연동(생성/이동/리사이즈 영속화)은
      3단계에서 진행합니다.
- [x] 3단계 — 관리자 스케줄 작성(타임 그리드/멤버 행 보기, 지난주 복사, 불가 시간 오버레이,
      충돌 확인 모달, 중복 배정 차단) + 멤버 불가 시간 등록(일회성/매주 반복). 실제 Supabase
      CRUD로 동작하며 TanStack Query로 데이터 페칭/캐시 관리
- [x] 4단계 — 근무 가능 인원 자동 추천(불가 시간/중복 배정 제외, 누적 근무 시간 오름차순 정렬,
      제외 인원 접힌 섹션). 충돌 경고 모달과 중복 배정 차단은 3단계에서 함께 구현됨
- [x] 5단계 — 게시/초안 되돌리기(확인 모달에 배정 인원·충돌 건수 요약) + 멤버 내 스케줄 보기
      (내 근무만/팀 전체, 본인 블록 강조, 미게시 주차 빈 상태) + 일별 상세 패널(겹침 시간축
      시각화). 알림 발송(게시/변경사항)은 6단계에서 구현. 진행 중 로그아웃 시 TanStack Query
      캐시가 남아 이전 세션 데이터가 잠깐 보이는 버그를 발견해 로그아웃을 하드 리로드 방식으로
      수정
- [x] 6단계 — DB 트리거 기반 알림 생성(게시/초안 전환, 근무 생성·수정·삭제, 불가시간 충돌),
      Supabase Realtime 구독(관리자/멤버 화면 새로고침 없이 반영, 2초 하이라이트, 연결 끊김
      배너), 알림 벨 UI(안 읽은 배지, 드롭다운, 클릭 시 주차 이동+읽음 처리, 모두 읽음, 새 알림
      토스트+브라우저 알림), 설정 페이지 브라우저 알림 권한 토글. 두 관리자 탭으로 실시간 동기화,
      멤버 계정으로 알림 벨 전체 흐름을 직접 검증함
- [x] 7단계 — 문의 기능. 멤버가 문의 스레드 생성(제목/본문) 및 답장, 관리자는 전체 문의를
      열림/해결됨/전체로 필터링하며 답장·상태 전환(해결됨 표시/다시 열기). 근무 블록에서
      "문의하기" 클릭 시 해당 근무 정보로 제목이 채워진 새 문의가 자동으로 열리고, 문의
      스레드에서 연결된 근무 클릭 시 해당 주차 스케줄로 이동. 메시지 INSERT 트리거로
      알림 생성(멤버 발신 → 전체 관리자에게, 관리자 발신 → 해당 멤버에게), Realtime 구독으로
      새 메시지 즉시 반영. 스레드+첫 메시지를 한 번에 생성할 때 알림이 중복 발송되지 않도록
      메시지 INSERT 트리거 하나로만 알림을 생성하도록 설계함
- [x] 8단계 — 반응형/다크 모드 마감, 테스트, README 정리
      - 반응형: 375px 모바일 뷰포트에서 실제 로그인 후 전 페이지(스케줄/불가시간/문의/멤버
        관리/설정/로그인) 점검. 캘린더는 이미 모바일 일간 보기로 전환되어 있었고, 이번 단계에서
        관리자·멤버 문의 화면의 좌우 2단 레이아웃이 모바일에서 겹쳐 깨지는 문제를 발견해
        `useIsMobile` 훅 기반으로 목록/대화 중 하나만 보여주고 뒤로가기 버튼으로 전환하는
        방식으로 수정
      - 다크 모드: Tailwind 시맨틱 토큰(`bg-background`, `text-muted-foreground` 등)을
        전 컴포넌트에서 일관되게 사용해 별도 하드코딩 없이 정상 렌더링 확인
      - 테스트: Vitest 단위 테스트 57개(추천 로직, 충돌 검사, 알림 메시지 포맷, 주/시간 변환
        등 순수 함수) + RLS 통합 테스트 5개(멤버가 API로도 draft 주차/타 멤버 데이터에 접근 못함
        확인) 모두 통과. `npx tsc --noEmit`, `npm run lint`, `npm run build` 모두 클린
      - README: 로컬 실행법/환경 변수는 1단계에서 이미 작성됨. 아래 배포 방법 섹션을 실제
        절차로 구체화함

- [x] 멤버 관리 (관리자 웹 UI) — 8단계 완료 시 조회 화면으로만 남겨두었던 부분을 보완.
      `/admin/members`에서 관리자가 직접 계정 생성(이메일/이름/역할/색상/초기 비밀번호,
      자동 생성 버튼), 정보 수정, 비밀번호 재설정, 비활성화/재활성화를 할 수 있음.
      `service_role` 키는 서버 액션(`src/lib/members/actions.ts`)에서만 사용하며 매 호출마다
      요청자가 활성 관리자인지 확인함. 비활성화는 `profiles.is_active=false` + Supabase Auth
      정지(ban)를 함께 적용해 로그인/세션 갱신을 막고, 근무 기록은 보존됨. 관리자가 자기
      자신을 강등/비활성화하는 것은 막음. 검증 로직은 Vitest 단위 테스트 포함

- [x] 실제 근무 기록(연장/조퇴/결근) — 지금까지 계획(shifts)만 있던 구조에 "실제로 어떻게
      근무했는지"를 별도로 기록하고 집계함.
      - **데이터:** `shift_records` 테이블(근무 1건당 최대 1행: `worked` 실제 시작/종료 시각,
        `absent` 결근, 메모). 연장/조퇴는 별도 입력 없이 계획 대비 차이로 자동 계산. 근무
        블록에 컬럼을 추가하지 않고 테이블을 분리한 이유는 RLS가 행 단위라, 컬럼으로 두면
        멤버가 동료의 결근/조퇴 사유까지 API로 조회할 수 있기 때문. 멤버는 본인 근무의 기록만
        조회 가능하고 쓰기는 관리자만 가능(RLS 통합 테스트로 검증)
      - **기록 방식:** 관리자가 지난 근무 블록을 열어 "계획대로 근무 / 시간 수정(종료 ±30분·1시간
        빠른 버튼) / 결근" 중 선택. 기록이 없는 지난 근무는 계획대로 근무한 것으로 집계하고
        "확인 필요"로 표시. 아직 시작하지 않은 근무는 기록 불가
      - **화면:** 스케줄 블록에 `+1시간`/`−2시간`/`결근` 뱃지, 좌측 멤버별 시간은 실제 시간 기준
        (계획 대비 증감 병기), 관리자 "근무 기록"(주/월별 멤버 집계 표 + 날짜별 펼침), 멤버
        "내 근무 기록"(본인 읽기 전용) 및 내 스케줄의 주간 합계·일별 상세에 반영
      - **알림:** 계획과 다르게 기록(연장/조퇴/결근 또는 그 정정)되면 해당 멤버에게 알림.
        "계획대로 확인"은 알리지 않음
      - **알려진 제약:** 실제 시각은 계획 시작일 기준으로 입력(자정을 넘기는 종료는 지원).
        근무를 삭제하면 그 근무의 기록도 함께 삭제됨. 휴게시간 공제와 CSV 내보내기는
        포함하지 않음

## 신규 계정 만들기

관리자로 로그인 → 상단 "멤버 관리" → "멤버 추가". 초기 비밀번호를 정해(또는 자동 생성)
멤버에게 전달하면 됩니다. Supabase Studio/SQL을 직접 만질 필요가 없습니다. 시드 계정은
로컬 개발용이므로 프로덕션에서는 첫 관리자만 Supabase 대시보드에서 만든 뒤 그 계정으로
나머지를 등록하세요.

## 배포 방법 (Vercel + Supabase 프로덕션 프로젝트)

로컬 개발은 Supabase CLI로 띄운 Docker 스택을 사용하지만, 배포 시에는 실제(호스티드)
Supabase 프로젝트가 필요합니다.

### 1) Supabase 프로덕션 프로젝트 생성 및 마이그레이션 적용

```bash
# Supabase 대시보드(https://supabase.com/dashboard)에서 새 프로젝트 생성 후
supabase login
supabase link --project-ref <project-ref>   # 대시보드 URL의 프로젝트 ref
supabase db push                             # supabase/migrations/*.sql 을 순서대로 적용
```

- 시드 데이터(`supabase/seed.sql`)는 로컬 개발/테스트 전용 더미 계정입니다. 프로덕션에는
  실행하지 말고, 첫 관리자 계정만 Supabase 대시보드의 Authentication → Add user에서
  만드세요(User Metadata에 `{"name":"이름","role":"admin"}` 입력. `profiles` 행은 트리거가
  자동 생성). 이후 멤버는 앱의 "멤버 관리"에서 등록합니다.
- 마이그레이션에는 `btree_gist` 확장, RLS 정책, 알림 생성 트리거, `supabase_realtime`
  publication 등록이 모두 포함되어 있으므로 `db push` 한 번으로 스키마가 완전히 갖춰집니다.

### 2) Vercel 프로젝트 연결 및 환경 변수 설정

```bash
vercel link
```

Vercel 프로젝트 설정 → Environment Variables에 아래 값을 등록합니다(Supabase 대시보드의
Project Settings → API에서 확인):

| 변수 | 값 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 프로덕션 프로젝트의 API URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 프로덕션 anon 키 |
| `SUPABASE_SERVICE_ROLE_KEY` | 프로덕션 service_role 키 (Vercel의 서버 전용 환경 변수로만 등록, 클라이언트 번들에 노출되지 않도록 `NEXT_PUBLIC_` 접두어를 붙이지 않음) |
| `NEXT_PUBLIC_APP_TIMEZONE` | `Asia/Seoul` |

### 3) 배포

```bash
vercel deploy --prod
```

또는 GitHub 저장소를 Vercel에 연결해 두면 기본 브랜치에 푸시할 때마다 자동 배포됩니다.
스키마 변경이 있는 커밋을 배포하기 전에는 항상 `supabase db push`로 프로덕션 DB에
마이그레이션을 먼저 적용하세요(앱 코드가 새 컬럼/함수를 기대하는데 DB가 구버전이면 런타임
오류가 발생합니다).

### 4) Supabase Auth 리다이렉트 설정

Supabase 대시보드 → Authentication → URL Configuration에서 Site URL과 Redirect URLs를
배포된 Vercel 도메인(예: `https://your-app.vercel.app`)으로 등록해야 로그인이 정상
동작합니다.
