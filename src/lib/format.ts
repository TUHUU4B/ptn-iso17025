import { optionLabel, type Field } from './registry';

/** 2026-03-18 -> 18/03/2026 */
export function fmtDate(v: unknown): string {
  if (typeof v !== 'string' || !v) return '';
  const [y, m, d] = v.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fmtDateTime(v: unknown): string {
  if (typeof v !== 'string' || !v) return '';
  return new Date(v).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
}

/** Giá trị hiển thị của một ô theo kiểu trường. */
export function display(f: Field | undefined, v: unknown, refLabels?: Map<string, string>): string {
  if (v === null || v === undefined || v === '') return '';
  if (!f) return String(v);
  switch (f.type) {
    case 'date':
      return fmtDate(v);
    case 'bool':
      return v ? 'Có' : 'Không';
    case 'select':
      return optionLabel(f.options, v);
    case 'list':
      return Array.isArray(v) ? v.join(', ') : String(v);
    case 'ref':
      return refLabels?.get(String(v)) ?? String(v);
    default:
      return String(v);
  }
}

/** Ngày hôm nay theo giờ Việt Nam, dạng yyyy-mm-dd. */
export function todayVN(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
}
