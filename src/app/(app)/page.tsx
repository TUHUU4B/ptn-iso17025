import Link from 'next/link';
import { requireMe } from '@/lib/session';
import { createClient } from '@/lib/supabase/server';
import { fmtDate, todayVN } from '@/lib/format';

export default async function HomePage() {
  const me = await requireMe();
  const supabase = await createClient();

  const { data: setting } = await supabase.from('settings').select('value').eq('key', 'nhac_truoc_han_ngay').maybeSingle();
  const days = Number(setting?.value ?? 30);
  const today = todayVN();
  const limit = new Date(Date.parse(today) + days * 864e5).toISOString().slice(0, 10);

  // Thiết bị đang dùng, có yêu cầu đảm bảo đo lường, đã quá hạn hoặc sắp đến hạn
  const { data: due } = await supabase
    .from('equipment')
    .select('id, code, name, assurance, next_due_date')
    .eq('active', true)
    .neq('assurance', 'KHONG')
    .lte('next_due_date', limit)
    .order('next_due_date');
  const { count: noDate } = await supabase
    .from('equipment')
    .select('id', { count: 'exact', head: true })
    .eq('active', true)
    .neq('assurance', 'KHONG')
    .is('last_check_date', null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="h1">Xin chào, {me.fullName}</h1>
        <p className="muted">Hôm nay {fmtDate(today)}</p>
      </div>

      <section className="card">
        <h2 className="mb-3 font-semibold text-navy">Nhắc việc – thiết bị đến hạn hiệu chuẩn, kiểm tra (trong {days} ngày)</h2>
        {due && due.length > 0 ? (
          <table className="table">
            <thead>
              <tr><th>Mã</th><th>Thiết bị</th><th>Hình thức</th><th>Hạn</th></tr>
            </thead>
            <tbody>
              {due.map((e) => {
                const late = (e.next_due_date as string) < today;
                return (
                  <tr key={e.id}>
                    <td><Link className="text-navy underline" href={`/cau-hinh/thiet-bi/${e.id}`}>{e.code}</Link></td>
                    <td>{e.name}</td>
                    <td>{e.assurance === 'HC' ? 'Hiệu chuẩn' : 'Kiểm tra nội bộ'}</td>
                    <td className={late ? 'font-semibold text-red-700' : 'text-amber-700'}>
                      {fmtDate(e.next_due_date)} {late ? '– quá hạn' : ''}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <p className="muted">Không có thiết bị nào đến hạn.</p>
        )}
        {(noDate ?? 0) > 0 && (
          <p className="mt-3 text-sm text-amber-700">
            {noDate} thiết bị cần hiệu chuẩn hoặc kiểm tra nhưng chưa có ngày gần nhất –{' '}
            <Link className="underline" href="/cau-hinh/thiet-bi">cập nhật trong danh mục thiết bị</Link>.
          </p>
        )}
      </section>
    </div>
  );
}
