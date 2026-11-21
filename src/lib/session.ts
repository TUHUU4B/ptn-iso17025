import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type Me = { staffId: string; fullName: string; title: string | null; roles: string[] };

/** Người đang đăng nhập và vai trò của họ (đọc một lần cho mỗi lượt tải trang). */
export const getMe = cache(async (): Promise<Me | null> => {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const uid = claims?.claims?.sub;
  if (!uid) return null;
  const { data } = await supabase
    .from('staff')
    .select('id, full_name, title, staff_roles(role_code)')
    .eq('user_id', uid)
    .eq('active', true)
    .maybeSingle();
  if (!data) return null;
  return {
    staffId: data.id,
    fullName: data.full_name,
    title: data.title,
    roles: ((data.staff_roles ?? []) as { role_code: string }[]).map((r) => r.role_code),
  };
});

export async function requireMe(): Promise<Me> {
  const me = await getMe();
  if (!me) redirect('/dang-nhap?loi=chua-lien-ket');
  return me;
}

export const isAdmin = (me: Me) => me.roles.includes('admin');
