/**
 * New customer / edit customer form. Same rules as the server (customers.validator.js):
 * name at least 2 letters, phone exactly 10 digits, pincode 6 digits, kW a positive number.
 */
import type { ApiClient } from './api';

export const LEAD_SOURCES: { value: string; label: string }[] = [
  { value: 'walk_in', label: 'Walk-in' }, { value: 'referral', label: 'Referral' },
  { value: 'online_ad', label: 'Online ad' }, { value: 'cold_call', label: 'Cold call' },
  { value: 'google', label: 'Google' }, { value: 'facebook', label: 'Facebook' },
  { value: 'indiamart', label: 'IndiaMART' }, { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'exhibition', label: 'Camp / exhibition' },
];
export const sourceLabel = (v?: string | null) =>
  !v ? null : LEAD_SOURCES.find((s) => s.value === v)?.label ?? ({ direct: 'Direct', website: 'Website', social: 'Social media' } as Record<string, string>)[v] ?? v.replace(/_/g, ' ');

export const ROOF_TYPES = ['RCC Flat', 'RCC Sloped', 'Tin Shed', 'Ground Mount', 'Other'];
export const CATEGORIES: { value: string; label: string }[] = [
  { value: 'residential', label: 'Residential' }, { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' }, { value: 'agricultural', label: 'Agricultural' },
];

export interface CustomerForm {
  name: string; phone: string; whatsapp: string; email: string; father_name: string;
  village: string; mandal: string; district: string; city: string; pincode: string; address: string;
  consumer_number: string; system_kw: string; monthly_bill: string; category: string; roof_type: string;
  lead_source: string; referrer_name: string; referrer_phone: string; notes: string;
}

export const emptyForm = (): CustomerForm => ({
  name: '', phone: '', whatsapp: '', email: '', father_name: '',
  village: '', mandal: '', district: '', city: '', pincode: '', address: '',
  consumer_number: '', system_kw: '', monthly_bill: '', category: 'residential', roof_type: '',
  lead_source: 'walk_in', referrer_name: '', referrer_phone: '', notes: '',
});

/** Fill the form from a customer (edit). */
export function formFrom(c: Record<string, unknown>): CustomerForm {
  const f = emptyForm();
  for (const k of Object.keys(f) as (keyof CustomerForm)[]) {
    const v = c[k];
    if (v !== null && v !== undefined) f[k] = String(v);
  }
  if (!f.category) f.category = 'residential';
  // editing: keep the customer's own value, never a form default
  if (!c.lead_source) f.lead_source = '';
  return f;
}

export const digits = (s: string) => s.replace(/\D/g, '');
/** Typed or pasted phone: keeps digits, drops a +91 / 0 prefix, max 10. */
export function phoneDigits(s: string): string {
  let d = digits(s);
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}
export type Errors = Partial<Record<keyof CustomerForm, string>>;

export function validateContact(f: CustomerForm): Errors {
  const e: Errors = {};
  if (f.name.trim().length < 2) e.name = 'Enter the customer name (at least 2 letters).';
  if (!/^\d{10}$/.test(digits(f.phone))) e.phone = 'Phone must be exactly 10 digits.';
  if (f.whatsapp.trim() && !/^\d{10}$/.test(digits(f.whatsapp))) e.whatsapp = 'WhatsApp number must be 10 digits.';
  if (f.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter a valid email or leave it empty.';
  return e;
}

export function validateSite(f: CustomerForm): Errors {
  const e: Errors = {};
  if (!f.city.trim() && !f.village.trim()) e.city = 'Enter the village or city.';
  if (f.pincode.trim() && !/^\d{6}$/.test(f.pincode.trim())) e.pincode = 'Pincode must be 6 digits.';
  const kw = Number(f.system_kw);
  if (f.system_kw.trim() && !(kw > 0 && kw <= 1000)) e.system_kw = 'System size must be a number above 0.';
  const bill = Number(f.monthly_bill);
  if (f.monthly_bill.trim() && !(bill > 0)) e.monthly_bill = 'Monthly bill must be a number above 0.';
  if (f.lead_source === 'referral') {
    if (f.referrer_name.trim().length < 2) e.referrer_name = 'Enter who referred this customer.';
    if (!/^\d{10}$/.test(digits(f.referrer_phone))) e.referrer_phone = 'Referrer phone must be 10 digits.';
  }
  return e;
}

/** Body for POST /customers (and PATCH, with only the changed keys). Empty strings are left out. */
export function buildPayload(f: CustomerForm, forCreate = true): Record<string, unknown> {
  const t = (s: string) => s.trim();
  const out: Record<string, unknown> = {
    name: t(f.name), phone: digits(f.phone), category: f.category || 'residential', lead_source: f.lead_source || undefined,
  };
  const put = (k: string, v: unknown) => { if (v !== '' && v !== undefined && v !== null) out[k] = v; };
  put('whatsapp', forCreate ? digits(f.whatsapp) || digits(f.phone) : digits(f.whatsapp));
  put('email', t(f.email).toLowerCase());
  put('father_name', t(f.father_name));
  put('village', t(f.village)); put('mandal', t(f.mandal)); put('district', t(f.district));
  put('city', forCreate ? t(f.city) || t(f.village) : t(f.city)); put('pincode', t(f.pincode)); put('address', t(f.address));
  put('consumer_number', t(f.consumer_number)); put('roof_type', f.roof_type);
  if (t(f.system_kw)) out.system_kw = Number(f.system_kw);
  if (t(f.monthly_bill)) out.monthly_bill = Number(f.monthly_bill);
  if (f.lead_source === 'referral') { put('referrer_name', t(f.referrer_name)); put('referrer_phone', digits(f.referrer_phone)); }
  put('notes', t(f.notes));
  return out;
}

/** Only the keys whose value changed (edit). */
export function changedKeys(before: Record<string, unknown>, after: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(after)) {
    if (k === 'category' && !before[k]) continue;
    const a = before[k], b = v;
    const same = typeof b === 'number' ? Number(a) === b : String(a ?? '').trim() === String(b ?? '').trim();
    if (!same) out[k] = v;
  }
  return out;
}

export interface Duplicate { id: string; name: string; project_id?: string | null; phone?: string | null }

export async function checkDuplicatePhone(api: Pick<ApiClient, 'get'>, phone: string, excludeId?: string): Promise<Duplicate | null> {
  const p = digits(phone);
  if (p.length !== 10) return null;
  const q = new URLSearchParams({ field: 'phone', value: p });
  if (excludeId) q.set('exclude_id', excludeId);
  return (await api.get<Duplicate | null>(`/customers/check-duplicate?${q.toString()}`)) ?? null;
}

/** Fields the server's create call ignores; they are saved with a follow-up update. */
export const AFTER_CREATE = ['father_name', 'consumer_number'] as const;

export async function createCustomer(api: Pick<ApiClient, 'post' | 'patch'>, f: CustomerForm): Promise<{ id: string; project_id?: string; followUpFailed?: boolean }> {
  const body = buildPayload(f);
  const later: Record<string, unknown> = {};
  for (const k of AFTER_CREATE) if (body[k] !== undefined) { later[k] = body[k]; delete body[k]; }
  const c = await api.post<{ id: string; project_id?: string }>('/customers', body);
  if (Object.keys(later).length && c?.id) {
    try { await api.patch(`/customers/${encodeURIComponent(c.id)}`, later); } catch { return { ...c, followUpFailed: true }; }
  }
  return c;
}

/** Keys the server's update call accepts (customers.service.js updateCustomer). */
export const EDITABLE = ['name', 'phone', 'email', 'address', 'city', 'district', 'pincode', 'whatsapp', 'mandal', 'village',
  'system_kw', 'roof_type', 'monthly_bill', 'lead_source', 'notes', 'referrer_name', 'referrer_phone', 'father_name', 'consumer_number'];

export async function updateCustomer(api: Pick<ApiClient, 'patch'>, id: string, before: Record<string, unknown>, f: CustomerForm) {
  const all = buildPayload(f, false);
  const allowed: Record<string, unknown> = {};
  for (const k of EDITABLE) if (all[k] !== undefined) allowed[k] = all[k];
  const diff = changedKeys(before, allowed);
  if (!Object.keys(diff).length) return { unchanged: true };
  await api.patch(`/customers/${encodeURIComponent(id)}`, diff);
  return { unchanged: false };
}

/** Field visit "Mark done" (PATCH /customers/:id). */
export async function markFieldVisitDone(api: Pick<ApiClient, 'patch'>, id: string, user: { name?: string; emp_id?: string | null; role?: string }) {
  return api.patch(`/customers/${encodeURIComponent(id)}`, {
    field_visit_done: true, field_visit_date: new Date().toISOString().slice(0, 10),
    field_visit_by_name: user.name, field_visit_by_emp_id: user.emp_id ?? undefined, field_visit_by_role: user.role,
  });
}
