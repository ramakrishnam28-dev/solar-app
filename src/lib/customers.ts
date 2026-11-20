import type { ApiBody, ApiClient } from './api';
import type { Segment } from './status';

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  project_id?: string | null;
  status?: string | null;
  system_kw?: number | string | null;
  village?: string | null;
  mandal?: string | null;
  district?: string | null;
  city?: string | null;
  lead_source?: string | null;
  assigned_agent_name?: string | null;
  agent_name?: string | null;
  quotation_value?: number | string | null;
  amount_disbursed?: number | string | null;
  disbursed_amount?: number | string | null;
  loan_bank?: string | null;
  loan_amount?: number | string | null;
  payment_method?: string | null;
  referral_s1_paid?: boolean | null;
  referral_s2_paid?: boolean | null;
  discom_submission_date?: string | null;
  post_install_bank_docs_submitted?: boolean | null;
  consumer_app_installed?: boolean | null;
  second_disbursal_amount?: number | string | null;
  reverification_required?: boolean | null;
  field_visit_done?: boolean | null;
  [k: string]: unknown;
}

export interface SegmentCounts { active?: number; completed?: number; cancelled?: number; all?: number; [k: string]: number | undefined }

/** The API sometimes wraps lists as {data:[...]} and sometimes {data:{customers:[...]}}. */
export function unwrapList(body: ApiBody<unknown> | undefined | null): Customer[] {
  const d = body?.data as unknown;
  if (Array.isArray(d)) return d as Customer[];
  if (d && typeof d === 'object') {
    const o = d as { customers?: unknown; data?: unknown };
    if (Array.isArray(o.customers)) return o.customers as Customer[];
    if (Array.isArray(o.data)) return o.data as Customer[];
  }
  return [];
}

export function unwrapPagination(body: ApiBody<unknown> | undefined | null, listLen: number) {
  const d = body?.data as { pagination?: ApiBody<unknown>['pagination'] } | undefined;
  const p = d?.pagination ?? body?.pagination;
  return { total: p?.total ?? listLen, totalPages: p?.totalPages ?? 1 };
}

export interface ListQuery { page?: number; limit?: number; search?: string; segment?: Segment }

export function listPath({ page = 1, limit = 20, search, segment = 'active' }: ListQuery): string {
  const q = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (search && search.trim()) q.set('search', search.trim());
  if (segment !== 'all') q.set('segment', segment);
  return `/customers?${q.toString()}`;
}

export async function fetchCustomersPage(api: Pick<ApiClient, 'getPage'>, query: ListQuery) {
  const body = await api.getPage<unknown>(listPath(query));
  const list = unwrapList(body);
  const { total, totalPages } = unwrapPagination(body, list.length);
  return { list, total, totalPages, page: query.page ?? 1 };
}

export async function fetchSegmentCounts(api: Pick<ApiClient, 'get'>): Promise<SegmentCounts> {
  const d = await api.get<SegmentCounts>('/customers/segment-counts');
  return d ?? {};
}

export async function fetchCustomer(api: Pick<ApiClient, 'get'>, id: string): Promise<Customer> {
  return api.get<Customer>(`/customers/${encodeURIComponent(id)}`);
}

/** Everything the dashboard needs, same source as the web dashboard (first 500 customers). */
export async function fetchAllForDashboard(api: Pick<ApiClient, 'getPage'>) {
  const body = await api.getPage<unknown>('/customers?limit=500');
  const list = unwrapList(body);
  return { list, total: unwrapPagination(body, list.length).total };
}
