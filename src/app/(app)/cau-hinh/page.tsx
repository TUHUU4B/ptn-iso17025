import Link from 'next/link';
import { ENTITIES } from '@/lib/registry';

export default function ConfigHome() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="h1">Cấu hình</h1>
        <p className="muted">Mọi thông tin riêng của công ty và phòng thí nghiệm. Mỗi lần sửa đều được ghi vào nhật ký.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ENTITIES.map((e) => (
          <Link key={e.slug} href={`/cau-hinh/${e.slug}`} className="card hover:border-navy">
            <span className="block font-semibold text-navy">{e.title}</span>
            <span className="muted block">{e.description}</span>
          </Link>
        ))}
        <Link href="/cau-hinh/nhat-ky" className="card hover:border-navy">
          <span className="block font-semibold text-navy">Nhật ký sửa đổi</span>
          <span className="muted block">Ai sửa gì, lúc nào, giá trị trước và sau (ISO/IEC 17025 điều 7.5.2).</span>
        </Link>
      </div>
    </div>
  );
}
