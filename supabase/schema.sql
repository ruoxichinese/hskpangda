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

-- =====================================================================
-- Đợt thi có mã (giáo viên phát mã, học sinh nhập mã mới mở được đề)
-- =====================================================================
create table if not exists public.exam_windows (
  id           uuid primary key default gen_random_uuid(),
  class_id     uuid not null references public.classes (id) on delete cascade,
  level        text not null check (char_length(level) <= 20),
  exam_id      text not null check (char_length(exam_id) <= 60),
  code         text not null unique check (code ~ '^[A-Z0-9]{6}$'),
  opens_at     timestamptz not null default now(),
  closes_at    timestamptz not null,
  max_attempts int not null default 1 check (max_attempts between 1 and 20),
  show_answers boolean not null default true,
  created_by   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  constraint exam_windows_time check (closes_at > opens_at)
);
create index if not exists exam_windows_class_idx on public.exam_windows (class_id);

create table if not exists public.exam_attempts (
  id           uuid primary key default gen_random_uuid(),
  window_id    uuid not null references public.exam_windows (id) on delete cascade,
  student_id   uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  started_at   timestamptz not null default now(),
  submitted_at timestamptz,
  answers      jsonb check (answers is null or octet_length(answers::text) < 50000),
  client_total int
);
create index if not exists exam_attempts_window_idx on public.exam_attempts (window_id);
create index if not exists exam_attempts_student_idx on public.exam_attempts (student_id);

create or replace function public.owns_window(p_window uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from exam_windows w join classes c on c.id = w.class_id
                 where w.id = p_window and c.teacher_id = auth.uid());
$$;

-- Học sinh nhập mã → kiểm tra lớp, giờ mở/đóng, số lượt → tạo (hoặc tiếp tục) một lượt thi
create or replace function public.start_exam(p_code text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  w record; a record; n int;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into w from exam_windows where code = upper(trim(p_code));
  if not found then raise exception 'exam_code_not_found'; end if;
  if not exists (select 1 from class_members where class_id = w.class_id and student_id = auth.uid())
     and not exists (select 1 from classes where id = w.class_id and teacher_id = auth.uid()) then
    raise exception 'not_in_class';
  end if;
  if now() < w.opens_at then raise exception 'exam_not_open'; end if;
  if now() > w.closes_at then raise exception 'exam_closed'; end if;
  select * into a from exam_attempts
    where window_id = w.id and student_id = auth.uid() and submitted_at is null
    order by started_at desc limit 1;
  if not found then
    select count(*) into n from exam_attempts where window_id = w.id and student_id = auth.uid();
    if n >= w.max_attempts then raise exception 'no_attempts_left'; end if;
    insert into exam_attempts (window_id, student_id) values (w.id, auth.uid()) returning * into a;
  end if;
  return jsonb_build_object('attempt_id', a.id, 'window_id', w.id, 'level', w.level, 'exam_id', w.exam_id,
                            'opens_at', w.opens_at, 'closes_at', w.closes_at, 'started_at', a.started_at, 'show_answers', w.show_answers);
end;
$$;

-- Nộp bài: chỉ chủ lượt thi, chưa nộp, trước giờ đóng + 15 phút
create or replace function public.submit_exam(p_attempt uuid, p_answers jsonb, p_total int) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  a record; w record;
begin
  select * into a from exam_attempts where id = p_attempt and student_id = auth.uid();
  if not found then raise exception 'attempt_not_found'; end if;
  if a.submitted_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  select * into w from exam_windows where id = a.window_id;
  if now() > w.closes_at + interval '15 minutes' then raise exception 'exam_closed'; end if;
  update exam_attempts set submitted_at = now(), answers = p_answers, client_total = p_total where id = p_attempt;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on public.exam_windows, public.exam_attempts from anon;
grant select, insert, update, delete on public.exam_windows to authenticated;
grant select, delete on public.exam_attempts to authenticated;
revoke execute on function public.start_exam(text), public.submit_exam(uuid, jsonb, int) from public, anon;
grant execute on function public.start_exam(text), public.submit_exam(uuid, jsonb, int), public.owns_window(uuid) to authenticated;

alter table public.exam_windows  enable row level security;
alter table public.exam_attempts enable row level security;

-- Mã thi chỉ giáo viên của lớp xem được (học sinh không liệt kê được mã)
drop policy if exists windows_select on public.exam_windows;
create policy windows_select on public.exam_windows for select to authenticated using (public.owns_class(class_id));
drop policy if exists windows_insert on public.exam_windows;
create policy windows_insert on public.exam_windows for insert to authenticated
  with check (created_by = auth.uid() and public.owns_class(class_id));
drop policy if exists windows_update on public.exam_windows;
create policy windows_update on public.exam_windows for update to authenticated
  using (public.owns_class(class_id)) with check (public.owns_class(class_id));
drop policy if exists windows_delete on public.exam_windows;
create policy windows_delete on public.exam_windows for delete to authenticated using (public.owns_class(class_id));

drop policy if exists attempts_select on public.exam_attempts;
create policy attempts_select on public.exam_attempts for select to authenticated
  using (student_id = auth.uid() or public.owns_window(window_id));
-- giáo viên xoá một lượt = cho học sinh thi lại
drop policy if exists attempts_delete on public.exam_attempts;
create policy attempts_delete on public.exam_attempts for delete to authenticated using (public.owns_window(window_id));
