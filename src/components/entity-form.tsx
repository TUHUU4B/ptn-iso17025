'use client';

import { useActionState } from 'react';
import type { Field } from '@/lib/registry';
import type { SaveState } from '@/app/(app)/cau-hinh/actions';

type Props = {
  fields: Field[];
  values: Record<string, unknown>;
  refs: Record<string, { value: string; label: string }[]>;
  isNew: boolean;
  canEdit: boolean;
  action: (prev: SaveState, fd: FormData) => Promise<SaveState>;
  roles?: { code: string; name: string }[];
  currentRoles?: string[];
};

function asInput(f: Field, v: unknown): string {
  if (v === null || v === undefined) return '';
  if (f.type === 'list' && Array.isArray(v)) return v.join(', ');
  return String(v);
}

export function EntityForm({ fields, values, refs, isNew, canEdit, action, roles, currentRoles }: Props) {
  const [state, formAction, pending] = useActionState<SaveState, FormData>(action, {});

  return (
    <form action={formAction} className="card space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {fields.map((f) => {
          const disabled = !canEdit || f.readonly || (f.keyOnCreate && !isNew);
          const v = values[f.name];
          const wide = f.type === 'textarea';
          return (
            <div key={f.name} className={wide ? 'md:col-span-2' : ''}>
              {f.type === 'bool' ? (
                <label className="flex items-center gap-2 pt-6 text-sm">
                  <input type="checkbox" name={f.name} defaultChecked={isNew ? true : Boolean(v)} disabled={disabled} />
                  {f.label}
                </label>
              ) : (
                <>
                  <label className="label" htmlFor={f.name}>
                    {f.label} {f.required && !disabled && <span className="text-red-600">*</span>}
                  </label>
                  {f.type === 'textarea' ? (
                    <textarea id={f.name} name={f.name} rows={3} className="input" defaultValue={asInput(f, v)} disabled={disabled} />
                  ) : f.type === 'select' || f.type === 'ref' ? (
                    <select id={f.name} name={f.name} className="input" defaultValue={asInput(f, v)} disabled={disabled}>
                      <option value="">— chọn —</option>
                      {(f.type === 'select' ? f.options : refs[f.name])?.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={f.name}
                      name={f.name}
                      className="input"
                      type={f.type === 'int' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                      step={f.type === 'int' ? 1 : undefined}
                      defaultValue={asInput(f, v)}
                      disabled={disabled}
                    />
                  )}
                  {f.hint && <p className="mt-1 text-xs text-slate-500">{f.hint}</p>}
                </>
              )}
            </div>
          );
        })}
      </div>

      {roles && (
        <fieldset>
          <legend className="label">Vai trò</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {roles.map((r) => (
              <label key={r.code} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="roles" value={r.code} defaultChecked={currentRoles?.includes(r.code)} disabled={!canEdit} />
                {r.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {state.error && <p className="alert-error">{state.error}</p>}
      {state.ok && <p className="alert-ok">{state.ok}</p>}
      {canEdit ? (
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Đang lưu…' : 'Lưu'}</button>
      ) : (
        <p className="muted">Chỉ Quản trị hệ thống được sửa danh mục này.</p>
      )}
    </form>
  );
}
