import { createClient } from '@/lib/supabase/server';
import type { Entity } from '@/lib/registry';

/** Nhãn cho các trường tham chiếu (ví dụ group_id -> tên nhóm), mỗi trường một Map. */
export async function loadRefs(entity: Entity) {
  const supabase = await createClient();
  const refs: Record<string, { value: string; label: string }[]> = {};
  for (const f of entity.fields) {
    if (f.type !== 'ref' || !f.ref) continue;
    const { data } = await supabase.from(f.ref.table).select(`${f.ref.value}, ${f.ref.label}`).order(f.ref.order);
    refs[f.name] = ((data ?? []) as unknown as Record<string, unknown>[]).map((r) => ({
      value: String(r[f.ref!.value]),
      label: String(r[f.ref!.label]),
    }));
  }
  return refs;
}
