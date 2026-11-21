-- =====================================================================
-- Bước 1 – Khung ứng dụng: cấu hình, nhân sự, vai trò, nhật ký sửa đổi
-- Nguyên tắc: không xóa dữ liệu (chỉ ngừng dùng); mọi thay đổi ghi nhật ký;
-- quyền kiểm soát trong cơ sở dữ liệu (RLS), không chỉ trên giao diện.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Thông tin công ty và phòng thí nghiệm (mỗi bảng đúng 1 dòng) ----------
create table public.company (
  id          int primary key default 1 check (id = 1),
  name        text not null,
  tax_code    text,
  address     text,
  phone       text,
  email       text,
  website     text,
  logo_url    text,
  updated_at  timestamptz not null default now()
);

create table public.lab (
  id                int primary key default 1 check (id = 1),
  name              text not null,
  las_code          text,            -- mã LAS-XD
  vilas_code        text,            -- số hiệu VILAS (nếu có)
  standard          text not null default 'TCVN ISO/IEC 17025:2017',
  address           text,
  phone             text,
  email             text,
  certificate_no    text,            -- số giấy chứng nhận đủ điều kiện
  certificate_date  date,
  updated_at        timestamptz not null default now()
);

-- ---------- Vai trò và nhân sự ----------
create table public.roles (
  code         text primary key,
  name         text not null,
  description  text,
  sort         int not null default 0
);

create table public.staff (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  title       text,                                   -- chức danh
  email       text unique,                            -- dùng để liên kết tài khoản đăng nhập
  user_id     uuid unique references auth.users (id) on delete set null,
  active      boolean not null default true,          -- nghỉ việc: false, không xóa
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.staff_roles (
  staff_id   uuid not null references public.staff (id) on delete cascade,
  role_code  text not null references public.roles (code),
  primary key (staff_id, role_code)
);

-- ---------- Danh mục chỉ tiêu (danh mục năng lực đã công bố) ----------
create table public.material_groups (
  id    serial primary key,
  name  text not null unique,
  sort  int not null default 0
);

create table public.tests (
  id              serial primary key,
  stt             int not null unique,                -- số thứ tự trong danh mục năng lực
  group_id        int not null references public.material_groups (id),
  name            text not null,
  standards       text[] not null default '{}',
  excel_file      text,                               -- file Excel tính kết quả (BM-01/QT-7.11)
  retention_days  int,                                -- hạn lưu mẫu; trống = theo thông số chung
  active          boolean not null default true
);

-- ---------- Thiết bị ----------
create table public.equipment_groups (
  id    serial primary key,
  name  text not null unique,
  sort  int not null default 0
);

create table public.equipment (
  id               serial primary key,
  code             text not null unique,              -- mã TB, ví dụ TB-A01
  name             text not null,
  group_id         int not null references public.equipment_groups (id),
  requirement      text,                              -- yêu cầu kỹ thuật
  test_refs        text,                              -- chỉ tiêu sử dụng (theo STT)
  assurance        text not null default 'KHONG'
                   check (assurance in ('HC', 'KT', 'KHONG')), -- hiệu chuẩn / kiểm tra nội bộ / không yêu cầu
  part             text,                              -- bộ phận đo được hiệu chuẩn, kiểm tra
  guide_refs       text[] not null default '{}',      -- HD-xx/QT-6.4 áp dụng
  cycle_months     int check (cycle_months is null or cycle_months > 0),
  last_check_date  date,                              -- ngày hiệu chuẩn hoặc kiểm tra gần nhất
  next_due_date    date generated always as
                   ((last_check_date + make_interval(months => cycle_months))::date) stored,
  certificate      text,                              -- số giấy chứng nhận gần nhất
  status           text not null default 'dang_su_dung'
                   check (status in ('dang_su_dung', 'hong_cho_sua', 'ngung_su_dung', 'thanh_ly')),
  note             text,
  active           boolean not null default true
);

-- ---------- Thủ tục, mã biểu mẫu, quy tắc đánh số, thông số chung ----------
create table public.procedures (
  code     text primary key,                          -- QT-7.1 …
  name     text not null,
  clauses  text,                                      -- điều khoản ISO tương ứng
  active   boolean not null default true
);

create table public.form_codes (
  code            text primary key,                   -- BM-01/QT-7.1 …
  name            text not null,
  procedure_code  text references public.procedures (code),
  revision        text not null default '01',         -- lần ban hành
  active          boolean not null default true
);

create table public.numbering_rules (
  key          text primary key,
  description  text not null,
  pattern      text not null                          -- {yymmdd}, {yyyy}, {seq:3}
);

create table public.settings (
  key          text primary key,
  value        text not null,
  description  text not null
);

-- ---------- Nhật ký sửa đổi (ISO 17025 điều 7.5.2) ----------
create table public.audit_log (
  id          bigserial primary key,
  at          timestamptz not null default now(),
  actor_id    uuid,                                   -- auth.users.id
  actor_name  text,
  table_name  text not null,
  row_key     text,
  action      text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data    jsonb,
  new_data    jsonb
);
create index audit_log_table_at on public.audit_log (table_name, at desc);

-- =====================================================================
-- Hàm hỗ trợ phân quyền
-- =====================================================================
create or replace function public.is_active_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from staff where user_id = auth.uid() and active);
$$;

create or replace function public.has_role(r text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from staff s join staff_roles sr on sr.staff_id = s.id
    where s.user_id = auth.uid() and s.active and sr.role_code = r
  );
$$;

-- Ghi nhật ký cho mọi bảng cấu hình
create or replace function public.audit_row() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  k text;
  who text;
begin
  select full_name into who from staff where user_id = auth.uid();
  if tg_op = 'DELETE' then
    k := coalesce(to_jsonb(old) ->> 'code', to_jsonb(old) ->> 'key', to_jsonb(old) ->> 'id');
    insert into audit_log (actor_id, actor_name, table_name, row_key, action, old_data)
    values (auth.uid(), who, tg_table_name, k, tg_op, to_jsonb(old));
    return old;
  end if;
  k := coalesce(to_jsonb(new) ->> 'code', to_jsonb(new) ->> 'key', to_jsonb(new) ->> 'id');
  if tg_op = 'UPDATE' then
    if to_jsonb(new) = to_jsonb(old) then return new; end if;
    insert into audit_log (actor_id, actor_name, table_name, row_key, action, old_data, new_data)
    values (auth.uid(), who, tg_table_name, k, tg_op, to_jsonb(old), to_jsonb(new));
  else
    insert into audit_log (actor_id, actor_name, table_name, row_key, action, new_data)
    values (auth.uid(), who, tg_table_name, k, tg_op, to_jsonb(new));
  end if;
  return new;
end;
$$;

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['company', 'lab', 'roles', 'staff', 'staff_roles', 'material_groups', 'tests',
                           'equipment_groups', 'equipment', 'procedures', 'form_codes', 'numbering_rules', 'settings']
  loop
    execute format('create trigger %I_audit after insert or update or delete on public.%I
                    for each row execute function public.audit_row()', t, t);
  end loop;
  foreach t in array array['company', 'lab', 'staff']
  loop
    execute format('create trigger %I_touch before update on public.%I
                    for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- Tài khoản mới tạo trong Supabase tự liên kết với nhân sự có cùng email
create or replace function public.link_staff_account() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update staff set user_id = new.id
  where lower(email) = lower(new.email) and user_id is null;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.link_staff_account();

-- Tạo quản trị đầu tiên – chỉ chạy được trong SQL Editor của Supabase (không cấp cho người dùng web)
create or replace function public.bootstrap_admin(p_email text, p_full_name text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  sid uuid;
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email);
  if uid is null then
    raise exception 'Chưa có tài khoản đăng nhập với email %; hãy tạo trong Authentication trước', p_email;
  end if;
  select id into sid from staff where lower(email) = lower(p_email) or lower(full_name) = lower(p_full_name)
  order by (lower(email) = lower(p_email)) desc nulls last limit 1;
  if sid is null then
    insert into staff (full_name, email, user_id) values (p_full_name, p_email, uid) returning id into sid;
  else
    update staff set email = p_email, user_id = uid, active = true where id = sid;
  end if;
  insert into staff_roles (staff_id, role_code) values (sid, 'admin') on conflict do nothing;
  return sid;
end;
$$;
revoke all on function public.bootstrap_admin(text, text) from public;

-- =====================================================================
-- Bảo mật theo dòng (RLS)
-- Đọc: nhân sự đang làm việc. Ghi: quản trị hệ thống. Không ai được xóa
-- (ngừng dùng bằng cột active), trừ gỡ vai trò khỏi một người.
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['company', 'lab', 'roles', 'staff', 'staff_roles', 'material_groups', 'tests',
                           'equipment_groups', 'equipment', 'procedures', 'form_codes', 'numbering_rules', 'settings']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I_read on public.%I for select to authenticated using (public.is_active_staff())', t, t);
    execute format('create policy %I_insert on public.%I for insert to authenticated with check (public.has_role(''admin''))', t, t);
    execute format('create policy %I_update on public.%I for update to authenticated
                    using (public.has_role(''admin'')) with check (public.has_role(''admin''))', t, t);
  end loop;
end $$;

create policy staff_roles_delete on public.staff_roles for delete to authenticated using (public.has_role('admin'));

alter table public.audit_log enable row level security;
create policy audit_log_read on public.audit_log for select to authenticated
  using (public.has_role('admin') or public.has_role('phu_trach_cl') or public.has_role('giam_doc'));
-- Nhật ký chỉ được ghi qua trigger; không ai sửa hoặc xóa
revoke insert, update, delete, truncate on public.audit_log from anon, authenticated;
