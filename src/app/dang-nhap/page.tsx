import { createClient } from '@/lib/supabase/server';
import { LoginForm } from './login-form';
import { signOut } from './actions';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ loi?: string }> }) {
  const { loi } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="card w-full max-w-sm">
        <h1 className="h1 mb-1">Quản lý phòng thí nghiệm</h1>
        <p className="muted mb-5">TCVN ISO/IEC 17025:2017</p>
        {signedIn && loi === 'chua-lien-ket' ? (
          <div className="space-y-4">
            <p className="alert-error">
              Tài khoản này chưa được gắn với nhân sự nào đang làm việc. Nhờ Quản trị hệ thống nhập đúng email của bạn
              trong Cấu hình → Nhân sự.
            </p>
            <form action={signOut}>
              <button className="btn w-full justify-center">Đăng xuất</button>
            </form>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}
