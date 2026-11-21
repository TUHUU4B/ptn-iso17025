import Link from 'next/link';
import { requireMe } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/dang-nhap/actions';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  const supabase = await createClient();
  const { data: lab } = await supabase.from('lab').select('name, las_code').maybeSingle();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link href="/" className="leading-tight">
            <span className="block text-sm font-semibold text-navy">{lab?.name ?? 'Phòng thí nghiệm'}</span>
            <span className="block text-xs text-slate-500">{lab?.las_code}</span>
          </Link>
          <nav className="flex gap-1 text-sm">
            <Link href="/" className="rounded px-3 py-1.5 hover:bg-navy-light">Trang chủ</Link>
            <Link href="/cau-hinh" className="rounded px-3 py-1.5 hover:bg-navy-light">Cấu hình</Link>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm">
            <span className="text-slate-600">{me.fullName}</span>
            <form action={signOut}>
              <button className="btn">Đăng xuất</button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
