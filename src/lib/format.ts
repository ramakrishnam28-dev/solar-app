/** Indian rupees with lakh/crore grouping: 1234567 -> ₹12,34,567 */
export function inr(v: unknown): string {
  const n = Number(v);
  if (v === null || v === undefined || v === '' || !Number.isFinite(n)) return '–';
  const neg = n < 0 ? '-' : '';
  const [int, dec] = Math.abs(Math.round(n * 100) / 100).toString().split('.');
  let out: string;
  if (int.length <= 3) out = int;
  else out = int.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + int.slice(-3);
  return `${neg}₹${out}${dec ? '.' + dec : ''}`;
}

export function count(v: number): string {
  return inr(v).replace('₹', '');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function dateShort(v: unknown): string {
  if (!v) return '–';
  const d = new Date(String(v));
  if (Number.isNaN(d.getTime())) return '–';
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function initials(name?: string | null): string {
  return (name ?? '?').split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
}

export function place(c: { village?: string | null; mandal?: string | null; district?: string | null; city?: string | null }): string {
  const p = [c.village || c.mandal, c.district].filter(Boolean).join(', ');
  return p || c.city || '';
}

export function kw(v: unknown): string {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? `${n} kW` : '';
}
