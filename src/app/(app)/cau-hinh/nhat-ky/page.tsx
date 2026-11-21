import Link from 'next/link';
import { ENTITIES } from '@/lib/registry';
import { createClient } from '@/lib/supabase/server';
import { fmtDateTime } from '@/lib/format';

const ACTION = { INSERT: 'Thêm', UPDATE: 'Sửa', DELETE: 'Gỡ' } as Record<string, string>;
const TABLE_TITLE = new Map<string, string>([
  ...ENTITIES.map((e) => [e.table, e.title] as [string, string]),
  ['staff_roles', 'Vai trò của nhân sự'],
]);

type Log = {
  id: number;
  at: string;
  actor_name: string | null;
  table_name: string;
  row_key: string | null;
  action: string;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
};

/** Các trường đổi giá trị: "tên: cũ → mới" */
function changes(l: Log): string[] {
  if (l.action !== 'UPDATE' || !l.old_data || !l.new_data) return [];
  return Object.keys(l.new_data)
    .filter((k) => k !== 'updated_at' && JSON.stringify(l.old_data![k]) !== JSON.stringify(l.new_data![k]))
    .map((k) => `${k}: ${JSON.stringify(l.old_data![k])} → ${JSON.stringify(l.new_data![k])}`);
}

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ bang?: string }> }) {
  const { bang } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from('audit_log').select('*').order('at', { ascending: false }).limit(300);
  if (bang) q = q.eq('table_name', bang);
  const { data, error } = await q;
  const logs = (data ?? []) as Log[];

  return (
    <div className="space-y-4">
      <div>
        <p className="muted"><Link href="/cau-hinh" className="underline">Cấu hình</Link> /</p>
        <h1 className="h1">Nhật ký sửa đổi</h1>
        <p className="muted">300 thay đổi gần nhất. Nhật ký không sửa, không xóa được.</p>
      </div>
      <form className="flex gap-2">
        <select name="bang" defaultValue={bang ?? ''} className="input max-w-xs">
          <option value="">Tất cả danh mục</option>
          {[...TABLE_TITLE].map(([t, title]) => <option key={t} value={t}>{title}</option>)}
        </select>
        <button className="btn">Lọc</button>
      </form>
      {error && <p className="alert-error">Bạn không có quyền xem nhật ký (cần vai trò Quản trị, Giám đốc hoặc Phụ trách chất lượng).</p>}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="table">
          <thead>
            <tr><th>Thời điểm</th><th>Người sửa</th><th>Danh mục</th><th>Dòng</th><th>Thao tác</th><th>Thay đổi</th></tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td className="whitespace-nowrap">{fmtDateTime(l.at)}</td>
                <td>{l.actor_name ?? 'Hệ thống'}</td>
                <td>{TABLE_TITLE.get(l.table_name) ?? l.table_name}</td>
                <td>{l.row_key}</td>
                <td>{ACTION[l.action] ?? l.action}</td>
                <td className="font-mono text-xs">{changes(l).map((c) => <div key={c}>{c}</div>)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
