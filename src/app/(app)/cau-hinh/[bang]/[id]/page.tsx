import Link from 'next/link';
import { notFound } from 'next/navigation';
import { entityBySlug } from '@/lib/registry';
import { createClient } from '@/lib/supabase/server';
import { requireMe, isAdmin } from '@/lib/session';
import { loadRefs } from '@/lib/entity-data';
import { EntityForm } from '@/components/entity-form';
import { saveEntity } from '../../actions';

export default async function EntityEditPage({ params }: { params: Promise<{ bang: string; id: string }> }) {
  const { bang, id: rawId } = await params;
  const entity = entityBySlug(bang);
  if (!entity || entity.singleton) notFound();
  const id = decodeURIComponent(rawId);
  const isNew = id === 'moi';
  const me = await requireMe();
  const supabase = await createClient();
  const refs = await loadRefs(entity);

  let values: Record<string, unknown> = {};
  if (!isNew) {
    const { data } = await supabase
      .from(entity.table)
      .select('*')
      .eq(entity.key, entity.keyType === 'int' ? Number(id) : id)
      .maybeSingle();
    if (!data) notFound();
    values = data as Record<string, unknown>;
  } else if (entity.slug === 'thiet-bi') {
    values = { status: 'dang_su_dung', assurance: 'HC', cycle_months: 12 };
  } else if (entity.slug === 'bieu-mau') {
    values = { revision: '01' };
  }

  let roles: { code: string; name: string }[] | undefined;
  let currentRoles: string[] = [];
  if (entity.withRoles) {
    const { data: r } = await supabase.from('roles').select('code, name').order('sort');
    roles = r ?? [];
    if (!isNew) {
      const { data: sr } = await supabase.from('staff_roles').select('role_code').eq('staff_id', id);
      currentRoles = (sr ?? []).map((x) => x.role_code as string);
    }
  }

  const title = isNew ? `Thêm ${entity.title.toLowerCase()}` : String(values[entity.listColumns[0]] ?? id);

  return (
    <div className="space-y-4">
      <div>
        <p className="muted">
          <Link href="/cau-hinh" className="underline">Cấu hình</Link> /{' '}
          <Link href={`/cau-hinh/${entity.slug}`} className="underline">{entity.title}</Link> /
        </p>
        <h1 className="h1">{title}</h1>
      </div>
      <EntityForm
        fields={entity.fields}
        values={values}
        refs={refs}
        isNew={isNew}
        canEdit={isAdmin(me)}
        action={saveEntity.bind(null, entity.slug, isNew ? null : id)}
        roles={roles}
        currentRoles={currentRoles}
      />
    </div>
  );
}
