'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { entityBySlug, type Field } from '@/lib/registry';

export type SaveState = { error?: string; ok?: string };

function parseField(f: Field, fd: FormData): unknown {
  const raw = fd.get(f.name);
  switch (f.type) {
    case 'bool':
      return raw === 'on';
    case 'int': {
      const s = String(raw ?? '').trim();
      if (!s) return null;
      const n = Number(s);
      if (!Number.isInteger(n)) throw new Error(`"${f.label}" phải là số nguyên`);
      return n;
    }
    case 'ref': {
      const s = String(raw ?? '').trim();
      if (!s) return null;
      return f.ref?.value === 'id' ? Number(s) : s;
    }
    case 'list':
      return String(raw ?? '')
        .split(',')
        .map((x) => x.trim())
        .filter(Boolean);
    default: {
      const s = String(raw ?? '').trim();
      return s === '' ? null : s;
    }
  }
}

function friendly(err: { code?: string; message: string }): string {
  if (err.code === '42501' || /row-level security/i.test(err.message))
    return 'Bạn không có quyền sửa danh mục này (cần vai trò Quản trị hệ thống).';
  if (err.code === '23505') return 'Giá trị bị trùng với một dòng đã có (mã, tên hoặc email).';
  if (err.code === '23503') return 'Giá trị tham chiếu không tồn tại.';
  if (err.code === '23514') return 'Giá trị không hợp lệ.';
  return `Không lưu được: ${err.message}`;
}

export async function saveEntity(slug: string, key: string | null, _prev: SaveState, fd: FormData): Promise<SaveState> {
  const entity = entityBySlug(slug);
  if (!entity) return { error: 'Danh mục không tồn tại.' };
  const supabase = await createClient();

  const values: Record<string, unknown> = {};
  try {
    for (const f of entity.fields) {
      if (f.readonly) continue;
      if (f.keyOnCreate && key) continue; // khóa chính dạng chữ không đổi sau khi tạo
      const v = parseField(f, fd);
      if (f.required && (v === null || (Array.isArray(v) && v.length === 0))) return { error: `Chưa nhập "${f.label}".` };
      values[f.name] = v;
    }
  } catch (e) {
    return { error: (e as Error).message };
  }

  let rowKey = key;
  if (entity.singleton) {
    const { data, error } = await supabase.from(entity.table).upsert({ id: 1, ...values }).select('id');
    if (error) return { error: friendly(error) };
    if (!data?.length) return { error: friendly({ code: '42501', message: '' }) };
  } else if (key) {
    // RLS chặn thì Supabase không báo lỗi mà chỉ không cập nhật dòng nào – kiểm tra số dòng trả về
    const { data, error } = await supabase
      .from(entity.table)
      .update(values)
      .eq(entity.key, entity.keyType === 'int' ? Number(key) : key)
      .select(entity.key);
    if (error) return { error: friendly(error) };
    if (!data?.length) return { error: friendly({ code: '42501', message: '' }) };
  } else {
    const { data, error } = await supabase.from(entity.table).insert(values).select(entity.key).single();
    if (error) return { error: friendly(error) };
    rowKey = String((data as unknown as Record<string, unknown>)[entity.key]);
  }

  if (entity.withRoles && rowKey) {
    const wanted = new Set(fd.getAll('roles').map(String));
    const { data: cur, error: e1 } = await supabase.from('staff_roles').select('role_code').eq('staff_id', rowKey);
    if (e1) return { error: friendly(e1) };
    const have = new Set((cur ?? []).map((r) => r.role_code as string));
    const add = [...wanted].filter((r) => !have.has(r)).map((role_code) => ({ staff_id: rowKey, role_code }));
    const del = [...have].filter((r) => !wanted.has(r));
    if (add.length) {
      const { error } = await supabase.from('staff_roles').insert(add);
      if (error) return { error: friendly(error) };
    }
    if (del.length) {
      const { error } = await supabase.from('staff_roles').delete().eq('staff_id', rowKey).in('role_code', del);
      if (error) return { error: friendly(error) };
    }
  }

  revalidatePath('/', 'layout');
  if (entity.singleton) return { ok: 'Đã lưu.' };
  redirect(`/cau-hinh/${slug}`);
}
