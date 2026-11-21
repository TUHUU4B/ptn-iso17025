import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

/** Supabase client cho Server Component và Server Action – quyền theo người đang đăng nhập (RLS). */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Gọi từ Server Component: không ghi được cookie, proxy.ts đã làm mới phiên.
          }
        },
      },
    },
  );
}
