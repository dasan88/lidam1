# Supabase Shared DB Setup

이 프로젝트는 `shared.js`의 Supabase 설정을 채우면 여러 PC에서 데이터를 공유할 수 있습니다.

## 1) Supabase 프로젝트 생성
- https://supabase.com 에서 프로젝트 생성
- `Project URL`, `anon public key` 확인

## 2) 테이블 생성(SQL Editor)
아래 SQL을 실행하세요.

```sql
create table if not exists public.app_state (
  id integer primary key,
  entries jsonb not null default '[]'::jsonb,
  rooms jsonb not null default '["101호","102호"]'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.app_state (id)
values (1)
on conflict (id) do nothing;

alter table public.app_state enable row level security;

create policy "app_state_read"
on public.app_state
for select
using (true);

create policy "app_state_write"
on public.app_state
for all
using (true)
with check (true);
```

## 3) 프로젝트 설정 반영
`shared.js` 상단 2개 값을 입력하세요.

```js
const SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

## 4) 동작 확인
- 등록 페이지 열기: 데이터가 클라우드에서 pull
- 등록/수정/삭제: 클라우드로 push
- 시간표 페이지: 15초마다 클라우드 동기화

## 참고
- 지금 설정은 빠른 테스트용으로 RLS를 완화한 상태입니다.
- 외부 공개 서비스로 운영할 때는 인증 기반 정책으로 변경하세요.
