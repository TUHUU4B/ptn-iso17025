// Sinh supabase/seed.sql từ thư mục data/ (một nguồn dữ liệu duy nhất cho dữ liệu nạp ban đầu)
import { readFileSync, writeFileSync } from 'node:fs';

const read = (f) => JSON.parse(readFileSync(new URL(`../data/${f}`, import.meta.url), 'utf8'));
const q = (v) => (v === null || v === undefined || v === '' ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a && a.length ? `array[${a.map(q).join(', ')}]::text[]` : `'{}'::text[]`);
// "GCN 131.03L/0326 (18/03/2026)" -> '2026-03-18'
const dateIn = (s) => {
  const m = s && s.match(/\((\d{2})\/(\d{2})\/(\d{4})\)/);
  return m ? `'${m[3]}-${m[2]}-${m[1]}'` : 'null';
};

const org = read('to-chuc.json');
const tt = read('thu-tuc.json');
const tb = read('thiet-bi.json');
const ct = read('chi-tieu.json');
const ns = read('nhan-su.json');
const out = ['-- Tự sinh bởi scripts/gen-seed.mjs – không sửa tay', 'begin;'];

const c = org.company, l = org.lab;
out.push(`insert into company (id, name, phone, email, website) values (1, ${q(c.name)}, ${q(c.phone)}, ${q(c.email)}, ${q(c.website)}) on conflict (id) do nothing;`);
out.push(`insert into lab (id, name, las_code, standard, address, phone, email) values (1, ${q(l.name)}, ${q(l.las_code)}, ${q(l.standard)}, ${q(l.address)}, ${q(l.phone)}, ${q(l.email)}) on conflict (id) do nothing;`);

ns.roles.forEach((r, i) => out.push(`insert into roles (code, name, description, sort) values (${q(r.code)}, ${q(r.name)}, ${q(r.description)}, ${i + 1}) on conflict (code) do nothing;`));
for (const s of ns.staff) {
  out.push(`insert into staff (full_name, title) select ${q(s.full_name)}, ${q(s.title)} where not exists (select 1 from staff where full_name = ${q(s.full_name)});`);
  for (const r of s.roles) out.push(`insert into staff_roles (staff_id, role_code) select id, ${q(r)} from staff where full_name = ${q(s.full_name)} on conflict do nothing;`);
}
ns.settings.forEach((s) => out.push(`insert into settings (key, value, description) values (${q(s.key)}, ${q(s.value)}, ${q(s.description)}) on conflict (key) do nothing;`));
ns.numbering.forEach((n) => out.push(`insert into numbering_rules (key, description, pattern) values (${q(n.key)}, ${q(n.description)}, ${q(n.pattern)}) on conflict (key) do nothing;`));

tt.procedures.forEach((p) => out.push(`insert into procedures (code, name, clauses) values (${q(p.code)}, ${q(p.name)}, ${q(p.clauses)}) on conflict (code) do nothing;`));
tt.forms.forEach((f) => out.push(`insert into form_codes (code, name, procedure_code) values (${q(f.code)}, ${q(f.name)}, ${q(f.procedure_code)}) on conflict (code) do nothing;`));

ct.forEach((g, i) => {
  out.push(`insert into material_groups (name, sort) values (${q(g.name)}, ${i + 1}) on conflict (name) do nothing;`);
  for (const t of g.items) {
    out.push(`insert into tests (stt, group_id, name, standards) select ${t.stt}, id, ${q(t.name)}, ${arr(t.std)} from material_groups where name = ${q(g.name)} on conflict (stt) do nothing;`);
  }
});

tb.forEach((g, i) => {
  out.push(`insert into equipment_groups (name, sort) values (${q(g.group)}, ${i + 1}) on conflict (name) do nothing;`);
  for (const e of g.items) {
    out.push(`insert into equipment (code, name, group_id, requirement, test_refs, assurance, part, guide_refs, cycle_months, last_check_date, certificate) select ${q(e.code)}, ${q(e.name)}, id, ${q(e.requirement)}, ${q(e.test_refs)}, ${q(e.assurance)}, ${q(e.part)}, ${arr(e.guide_refs)}, ${e.cycle_months ?? 'null'}, ${dateIn(e.certificate)}, ${q(e.certificate)} from equipment_groups where name = ${q(g.group)} on conflict (code) do nothing;`);
  }
});

out.push('commit;', '');
writeFileSync(new URL('../supabase/seed.sql', import.meta.url), out.join('\n'));
console.log(`seed.sql: ${out.length} dòng`);
