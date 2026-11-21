import Link from 'next/link';
import { notFound } from 'next/navigation';
import { entityBySlug, fieldLabel } from '@/lib/registry';
import { createClient } from '@/lib/supabase/server';
import { requireMe, isAdmin } from '@/lib/session';
import { display } from '@/lib/format';
import { loadRefs } from '@/lib/entity-data';
import { ListTable } from '@/components/list-table';
import { EntityForm } from '@/components/entity-form';
import { saveEntity } from '../actions';

export default async function EntityListPage({ params }: { params: Promise<{ bang: string }> }) {
  const { bang } = await params;
  const entity = entityBySlug(bang);
  if (!entity) notFound();
  const me = await requireMe();
  const supabase = await createClient();
  const refs = await loadRefs(entity);

  const head = (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="muted"><Link href="/cau-hinh" className="underline">Cấu hình</Link> /</p>
        <h1 className="h1">{entity.title}</h1>
        <p className="muted">{entity.description}</p>
      </div>
      {!entity.singleton && isAdmin(me) && (
        <Link href={`/cau-hinh/${entity.slug}/moi`} className="btn btn-primary">+ Thêm mới</Link>
      )}
    </div>
  );

  if (entity.singleton) {
    const { data } = await supabase.from(entity.table).select('*').eq('id', 1).maybeSingle();
    return (
      <div className="space-y-4">
        {head}
        <EntityForm
          fields={entity.fields}
          values={(data ?? {}) as Record<string, unknown>}
          refs={refs}
          isNew={!data}
          canEdit={isAdmin(me)}
          action={saveEntity.bind(null, entity.slug, '1')}
        />
      </div>
    );
  }

  let query = supabase.from(entity.table).select('*');
  for (const o of entity.order) query = query.order(o.column, { ascending: o.ascending ?? true });
  const { data, error } = await query;
  const refMaps = Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, new Map(v.map((o) => [o.value, o.label]))]));

  const rows = ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    href: `/cau-hinh/${entity.slug}/${encodeURIComponent(String(r[entity.key]))}`,
    muted: r.active === false,
    cells: entity.listColumns.map((c) => display(entity.fields.find((f) => f.name === c), r[c], refMaps[c])),
  }));

  return (
    <div className="space-y-4">
      {head}
      {error ? <p className="alert-error">Không đọc được dữ liệu: {error.message}</p> : null}
      <ListTable headers={entity.listColumns.map((c) => fieldLabel(entity, c))} rows={rows} />
    </div>
  );
}
