-- =====================================================================
-- Pàngdá HSK – lược đồ Supabase (đồng bộ tiến độ + trang giáo viên)
-- Chạy toàn bộ file này một lần trong Supabase → SQL Editor.
-- Chạy lại được nhiều lần (idempotent).
-- =====================================================================

-- ---------- Bảng ----------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) <= 60),
  email        text,
  created_at   timestamptz not null default now()
);

-- Danh sách giáo viên: CHỈ quản trị viên thêm bằng SQL (xem cuối file)
create table if not exists public.teachers (
  user_id uuid primary key references public.profiles (id) on delete cascade
);

create table if not exists public.classes (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (char_length(name) between 1 and 80),
  code       text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.class_members (
  class_id   uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  joined_at  timestamptz not null default now(),
  primary key (class_id, student_id)
);

-- Một dòng cho mỗi người học: data = toàn bộ tiến độ, summary = bản tóm tắt cho giáo viên
create table if not exists public.progress (
  user_id    uuid primary key default auth.uid() references public.profiles (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb check (octet_length(data::text) < 2000000),
  summary    jsonb not null default '{}'::jsonb check (octet_length(summary::text) < 200000),
  updated_at timestamptz not null default now()
);

create index if not exists class_members_student_idx on public.class_members (student_id);
create index if not exists classes_teacher_idx on public.classes (teacher_id);

-- ---------- Hàm trợ giúp (security definer để tránh đệ quy RLS) ----------
create or replace function public.is_teacher() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from teachers where user_id = auth.uid());
$$;

create or replace function public.owns_class(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from classes where id = p_class and teacher_id = auth.uid());
$$;

create or replace function public.is_member(p_class uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from class_members where class_id = p_class and student_id = auth.uid());
$$;

-- Người đang đăng nhập có phải giáo viên của học sinh này không
create or replace function public.teaches(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from class_members m join classes c on c.id = m.class_id
    where m.student_id = p_student and c.teacher_id = auth.uid()
  );
$$;

-- Học sinh vào lớp bằng mã 6 ký tự
create or replace function public.join_class(p_code text) returns text
language plpgsql security definer set search_path = public as $$
declare
  c record;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select id, name into c from classes where code = upper(trim(p_code));
  if not found then raise exception 'class_not_found'; end if;
  insert into class_members (class_id, student_id) values (c.id, auth.uid())
  on conflict do nothing;
  return c.name;
end;
$$;

-- Tự tạo profile khi có tài khoản mới
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, email)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)), 60),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Quản trị viên dùng trong SQL Editor: select public.make_teacher('co.giao@example.com');
create or replace function public.make_teacher(p_email text) returns text
language plpgsql security definer set search_path = public as $$
declare
  uid uuid;
begin
  select id into uid from profiles where lower(email) = lower(trim(p_email));
  if uid is null then raise exception 'Chưa có tài khoản với email %. Người đó cần đăng nhập vào website một lần trước.', p_email; end if;
  insert into teachers (user_id) values (uid) on conflict do nothing;
  return 'OK: ' || p_email || ' là giáo viên';
end;
$$;

-- ---------- Quyền ----------
revoke all on public.profiles, public.teachers, public.classes, public.class_members, public.progress from anon;
grant select, update on public.profiles to authenticated;
grant select on public.teachers to authenticated;
grant select, insert, update, delete on public.classes to authenticated;
grant select, delete on public.class_members to authenticated;
grant select, insert, update on public.progress to authenticated;

revoke execute on function public.make_teacher(text) from public, anon, authenticated;
revoke execute on function public.join_class(text) from public, anon;
grant execute on function public.join_class(text) to authenticated;
grant execute on function public.is_teacher(), public.owns_class(uuid), public.is_member(uuid), public.teaches(uuid) to authenticated;

-- ---------- Row Level Security ----------
alter table public.profiles      enable row level security;
alter table public.teachers      enable row level security;
alter table public.classes       enable row level security;
alter table public.class_members enable row level security;
alter table public.progress      enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.teaches(id));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists teachers_select on public.teachers;
create policy teachers_select on public.teachers for select to authenticated
  using (user_id = auth.uid());

drop policy if exists classes_select on public.classes;
create policy classes_select on public.classes for select to authenticated
  using (teacher_id = auth.uid() or public.is_member(id));
drop policy if exists classes_insert on public.classes;
create policy classes_insert on public.classes for insert to authenticated
  with check (teacher_id = auth.uid() and public.is_teacher());
drop policy if exists classes_update on public.classes;
create policy classes_update on public.classes for update to authenticated
  using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());
drop policy if exists classes_delete on public.classes;
create policy classes_delete on public.classes for delete to authenticated
  using (teacher_id = auth.uid());

drop policy if exists members_select on public.class_members;
create policy members_select on public.class_members for select to authenticated
  using (student_id = auth.uid() or public.owns_class(class_id));
drop policy if exists members_delete on public.class_members;
create policy members_delete on public.class_members for delete to authenticated
  using (student_id = auth.uid() or public.owns_class(class_id));

drop policy if exists progress_select on public.progress;
create policy progress_select on public.progress for select to authenticated
  using (user_id = auth.uid() or public.teaches(user_id));
drop policy if exists progress_insert on public.progress;
create policy progress_insert on public.progress for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists progress_update on public.progress;
create policy progress_update on public.progress for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
