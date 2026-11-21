/** KYC & project details (step 2 of the website's New Customer wizard, _ncSaveStep2). */
import type { ApiClient } from './api';
import type { Customer } from './customers';

export const DISCOMS = ['APCPDCL', 'APEPDCL', 'APSPDCL', 'TSSPDCL', 'TSNPDCL', 'BESCOM', 'MSEDCL'];
export const PHASES = ['Single Phase', 'Three Phase'];
export const GRIDS = ['On-Grid', 'Off-Grid', 'Hybrid'];

export interface KycForm {
  aadhaar: string; pan: string; bank_account: string; bank_ifsc: string; bank_name: string; bank_branch: string; account_holder: string;
  system_kw: string; monthly_bill: string; sanctioned_load: string; roof_type: string; shadow_free_area: string;
  phase_type: string; grid_type: string; existing_solar: '' | 'yes' | 'no'; existing_solar_kw: string; company: string; consumer_number: string;
  field_visit: '' | 'yes' | 'no';
}
const s = (v: unknown) => (v === null || v === undefined ? '' : String(v));
export function kycFrom(c: Customer): KycForm {
  return {
    aadhaar: '', pan: s(c.pan).toUpperCase(), bank_account: s(c.bank_account), bank_ifsc: s(c.bank_ifsc).toUpperCase(), bank_name: s(c.bank_name),
    bank_branch: s(c.bank_branch), account_holder: s(c.account_holder || c.name).toUpperCase(),
    system_kw: s(c.system_kw), monthly_bill: s(c.monthly_bill), sanctioned_load: s(c.sanctioned_load), roof_type: s(c.roof_type),
    shadow_free_area: s(c.shadow_free_area), phase_type: s(c.phase_type), grid_type: s(c.grid_type),
    existing_solar: c.existing_solar === true ? 'yes' : c.existing_solar === false ? 'no' : '', existing_solar_kw: s(c.existing_solar_kw),
    company: s(c.company), consumer_number: s(c.consumer_number), field_visit: c.field_visit_done === true ? 'yes' : c.field_visit_done === false ? 'no' : '',
  };
}
export type KycErrors = Partial<Record<keyof KycForm, string>>;
const digits = (v: string) => v.replace(/\D/g, '');

/** Same rules as the website: Aadhaar 12 digits, PAN ABCDE1234F, kW at least 1. */
export function validateKyc(f: KycForm, hasAadhaarOnFile: boolean): KycErrors {
  const e: KycErrors = {};
  const a = digits(f.aadhaar);
  if (!(hasAadhaarOnFile && !a) && a.length !== 12) e.aadhaar = 'Aadhaar must be 12 digits';
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(f.pan.trim())) e.pan = 'PAN must be in format ABCDE1234F';
  const kw = parseFloat(f.system_kw);
  if (!f.system_kw.trim() || Number.isNaN(kw) || kw < 1) e.system_kw = 'System size (kW) is required and must be at least 1';
  if (f.bank_ifsc.trim() && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(f.bank_ifsc.trim())) e.bank_ifsc = 'IFSC must look like SBIN0001234';
  return e;
}

/** PATCH body. Empty values are left out (the website removes nulls). */
export function kycPayload(f: KycForm, user: { name?: string; emp_id?: string | null; role?: string }): Record<string, unknown> {
  const n = (v: string) => (v.trim() ? parseFloat(v) : undefined);
  const p: Record<string, unknown> = {
    aadhaar: digits(f.aadhaar) || undefined, pan: f.pan.trim() || undefined, bank_account: f.bank_account.trim() || undefined,
    bank_ifsc: f.bank_ifsc.trim() || undefined, bank_name: f.bank_name.trim() || undefined, bank_branch: f.bank_branch.trim() || undefined,
    account_holder: f.account_holder.trim() || undefined, system_kw: n(f.system_kw), monthly_bill: n(f.monthly_bill),
    sanctioned_load: n(f.sanctioned_load), roof_type: f.roof_type || undefined, shadow_free_area: n(f.shadow_free_area),
    phase_type: f.phase_type || undefined, grid_type: f.grid_type || undefined,
    existing_solar: f.existing_solar ? f.existing_solar === 'yes' : undefined,
    existing_solar_kw: f.existing_solar === 'yes' ? n(f.existing_solar_kw) : undefined,
    company: f.company || undefined, consumer_number: f.consumer_number.trim() || undefined,
  };
  if (f.field_visit === 'yes') Object.assign(p, { field_visit_done: true, field_visit_by_name: user.name, field_visit_by_emp_id: user.emp_id ?? undefined, field_visit_by_role: user.role, field_visit_date: new Date().toISOString() });
  if (f.field_visit === 'no') p.field_visit_done = false;
  for (const k of Object.keys(p)) if (p[k] === undefined || (typeof p[k] === 'number' && Number.isNaN(p[k]))) delete p[k];
  return p;
}

export async function kycDuplicates(api: Pick<ApiClient, 'get'>, id: string, f: KycForm): Promise<string | null> {
  const checks: [string, string, string][] = [['aadhaar', digits(f.aadhaar), 'Aadhaar'], ['pan', f.pan.trim(), 'PAN'], ['bank_account', f.bank_account.trim(), 'Bank account']];
  for (const [field, value, label] of checks) {
    if (!value) continue;
    try {
      const m = await api.get<{ name?: string; project_id?: string } | null>(`/customers/check-duplicate?${new URLSearchParams({ field, value, exclude_id: id })}`);
      if (m) return `${label} already belongs to ${m.name ?? 'another customer'}${m.project_id ? ' (' + m.project_id + ')' : ''}.`;
    } catch { /* duplicate check is advisory */ }
  }
  return null;
}
