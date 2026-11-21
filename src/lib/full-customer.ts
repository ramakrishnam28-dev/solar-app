/**
 * One customer with everything the website's customer page uses:
 * the customer record, the saved deal (deal calculator), cash payments and installation photos.
 * Mirrors refreshCustomerRow() on the website. Extra calls that a role may not use are skipped or
 * fail quietly, exactly like the website.
 */
import type { ApiClient } from './api';
import type { Customer } from './customers';

export interface PhotoInfo { file_url?: string | null; approval_status?: string | null; rejection_note?: string | null; uploaded_at?: string | null }
export interface InstallationInfo {
  id?: string | null; assigned_to?: string | null; assigned_name?: string | null; scheduled_date?: string | null;
  completed_date?: string | null; status?: string | null; photos_uploaded?: number; photo_map: Record<string, PhotoInfo>;
  net_meter_photo_url?: string | null; nm_photo_approved?: boolean | null; nm_photo_reupload_requested?: boolean | null;
  photos_reupload_requested?: boolean | null; photos_reupload_note?: string | null; gps_verified?: boolean | null;
}
export interface CashPaymentsRow {
  installment_1_amount?: number | string | null; installment_1_date?: string | null; installment_1_by_name?: string | null; installment_1_notes?: string | null;
  installment_2_amount?: number | string | null; installment_2_date?: string | null; installment_2_by_name?: string | null; installment_2_notes?: string | null;
}
export type FullCustomer = Customer & { cash_payments: CashPaymentsRow; installation: InstallationInfo; deal_loaded: boolean };

const DEAL_ROLES = ['admin', 'finance', 'builder', 'sales_agent', 'loan_officer', 'manager'];
const CASH_ROLES = ['admin', 'manager', 'sales_agent', 'loan_officer', 'installer', 'builder', 'finance'];
const PHOTO_ROLES = ['admin', 'manager', 'installer', 'sales_agent', 'loan_officer', 'builder'];

type Api = Pick<ApiClient, 'get'>;
const enc = encodeURIComponent;

export async function loadFullCustomer(api: Api, id: string, role?: string): Promise<FullCustomer> {
  const c = await api.get<Customer>(`/customers/${enc(id)}`);
  const r = role ?? '';
  const [deal, cash, photos] = await Promise.all([
    r !== 'installer' && DEAL_ROLES.includes(r) ? api.get<{ record?: Record<string, unknown> | null }>(`/finance/deal-calculator/${enc(id)}`).catch(() => null) : Promise.resolve(null),
    CASH_ROLES.includes(r) ? api.get<CashPaymentsRow | null>(`/customers/${enc(id)}/cash-payment`).catch(() => null) : Promise.resolve(null),
    PHOTO_ROLES.includes(r) && c.installation_id ? api.get<Record<string, unknown>>(`/customers/${enc(id)}/installation/photos`).catch(() => null) : Promise.resolve(null),
  ]);
  return mergeFull(c, deal?.record ?? null, cash ?? null, photos ?? null);
}

/** Pure merge, unit-tested. Field names follow the website (dc_*, cash_payments, installation.photo_map). */
export function mergeFull(c: Customer, deal: Record<string, unknown> | null, cash: CashPaymentsRow | null, photos: Record<string, unknown> | null): FullCustomer {
  const out = { ...c } as FullCustomer;
  if (deal) {
    const d = deal as Record<string, unknown>;
    const pick = (k: string) => (d[k] !== undefined && d[k] !== null ? d[k] : undefined);
    out.payment_method = (pick('payment_method') as string) ?? c.payment_method;
    out.cash_amount = pick('cash_amount') ?? c.cash_amount;
    out.dc_loan_quotation = pick('loan_quotation') ?? c.dc_loan_quotation;
    out.dc_quotation_value = pick('quotation_value') ?? c.dc_quotation_value;
    out.dc_project_cost = pick('project_cost') ?? c.dc_project_cost;
    out.dc_deal_price = pick('deal_price') ?? c.dc_deal_price;
    out.dc_subsidy_total = pick('subsidy_total') ?? c.dc_subsidy_total;
    out.dc_contribution_scenario = pick('contribution_scenario') ?? c.dc_contribution_scenario;
    out.dc_disbursal_pct_1 = pick('disbursal_pct_1') ?? c.dc_disbursal_pct_1;
    out.dc_referral_stage1 = pick('referral_stage1') ?? c.dc_referral_stage1;
    out.dc_referral_stage2 = pick('referral_stage2') ?? c.dc_referral_stage2;
    out.dc_subsidy_shadow_receivable = pick('subsidy_shadow_receivable') ?? c.dc_subsidy_shadow_receivable;
    out.dc_scenario_confirmed_at = d.scenario_confirmed_at ?? null;
    out.dc_vendor_float_confirmed_at = d.vendor_float_confirmed_at ?? null;
    out.dc_contribution_returned_at = d.contribution_returned_at ?? null;
    out.contribution_scenario = pick('contribution_scenario') ?? c.contribution_scenario;
  }
  out.deal_loaded = !!deal;
  out.cash_payments = cash ?? {};
  const photo_map: Record<string, PhotoInfo> = {};
  const list = Array.isArray(photos?.photos) ? (photos!.photos as (PhotoInfo & { label: string })[]) : [];
  for (const p of list) if (p?.label) photo_map[p.label] = { file_url: p.file_url, approval_status: p.approval_status, rejection_note: p.rejection_note, uploaded_at: p.uploaded_at };
  out.installation = {
    id: (c.installation_id as string) ?? (photos?.installation_id as string) ?? null,
    assigned_to: (c.inst_assigned_to as string) ?? null,
    assigned_name: (c.installer_name as string) ?? null,
    scheduled_date: (c.inst_scheduled_date as string) ?? null,
    completed_date: (c.inst_completed_date as string) ?? null,
    status: (c.inst_status as string) ?? null,
    photos_uploaded: Number(c.photos_uploaded ?? Object.values(photo_map).filter((p) => p.file_url).length) || 0,
    photo_map,
    net_meter_photo_url: (photos?.nm_photo_url as string) ?? (c.net_meter_photo_url as string) ?? null,
    nm_photo_approved: (photos?.nm_photo_approved as boolean) ?? (c.nm_photo_approved as boolean) ?? null,
    nm_photo_reupload_requested: (photos?.nm_photo_reupload_requested as boolean) ?? (c.nm_photo_reupload_requested as boolean) ?? null,
    photos_reupload_requested: (photos?.photos_reupload_requested as boolean) ?? (c.photos_reupload_requested as boolean) ?? null,
    photos_reupload_note: (photos?.photos_reupload_note as string) ?? (c.photos_reupload_note as string) ?? null,
    gps_verified: (c.gps_verified as boolean) ?? null,
  };
  return out;
}

export const truthy = (v: unknown) => v === true || v === 't' || v === 'true';
export const num = (v: unknown) => { const n = parseFloat(String(v ?? '')); return Number.isFinite(n) ? n : 0; };
