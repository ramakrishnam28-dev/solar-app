/** Loan tracker (wireframe A6): GET /loans, sorted so loans past the bank's SLA come first. */
import type { ApiClient } from './api';

export interface Loan {
  id: string; customer_id?: string; customer_name?: string | null; customer_project_id?: string | null; customer_phone?: string | null;
  loan_ref?: string | null; bank_name?: string | null; branch?: string | null; status?: string | null;
  applied_amount?: number | string | null; sanctioned_amount?: number | string | null; disbursed_amount?: number | string | null;
  sla_days?: number | null; days_elapsed?: number | null; sla_days_left?: number | null; escalation_level?: number | null;
  loan_officer_phone?: string | null; submitted_at?: string | null;
}

const ACTIVE = ['applied', 'under_review'];
export const isActive = (l: Loan) => ACTIVE.includes(String(l.status));
export const isOverdue = (l: Loan) => isActive(l) && l.submitted_at != null && (l.sla_days_left ?? 1) < 0;
export const isDisbursed = (l: Loan) => ['disbursed', 'partially_disbursed', 'fully_disbursed', 'disbursed_partial', 'disbursed_full'].includes(String(l.status)) || Number(l.disbursed_amount) > 0;

export const LOAN_STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', applied: 'Applied', under_review: 'In review', sanctioned: 'Sanctioned', approved: 'Approved',
  rejected: 'Rejected', disbursed: 'Disbursed', partially_disbursed: 'Part disbursed', fully_disbursed: 'Disbursed',
};
export const loanStatusLabel = (s?: string | null) => (s ? LOAN_STATUS_LABEL[s] ?? s.replace(/_/g, ' ') : '–');

export function loanTiles(loans: Loan[]) {
  return {
    pastSla: loans.filter(isOverdue).length,
    inReview: loans.filter((l) => isActive(l) && !isOverdue(l)).length,
    disbursed: loans.filter(isDisbursed).length,
  };
}

/** Overdue first (most overdue on top), then active by days left, then the rest newest first. */
export function sortBySla(loans: Loan[]): Loan[] {
  const rank = (l: Loan) => (isOverdue(l) ? 0 : isActive(l) ? 1 : 2);
  return [...loans].sort((a, b) => rank(a) - rank(b) || (a.sla_days_left ?? 999) - (b.sla_days_left ?? 999));
}

export const banksOf = (loans: Loan[]) =>
  [...new Set(loans.map((l) => (l.bank_name ?? '').trim()).filter(Boolean))].sort();

export function loanAmount(l: Loan): number {
  return Number(l.disbursed_amount) > 0 ? Number(l.disbursed_amount) : Number(l.sanctioned_amount) > 0 ? Number(l.sanctioned_amount) : Number(l.applied_amount) || 0;
}

/** "Day 18 of 7" / "7 days left" line and how full the SLA bar is (0–1). */
export function slaLine(l: Loan): { text: string; fill: number; over: boolean } {
  const sla = l.sla_days ?? 0;
  const day = l.days_elapsed ?? 0;
  if (!isActive(l) || !sla || l.submitted_at == null) return { text: loanStatusLabel(l.status), fill: isDisbursed(l) ? 1 : 0, over: false };
  const over = day > sla;
  return { text: over ? `Day ${day} of ${sla}` : `${Math.max(sla - day, 0)} days left`, fill: Math.min(day / sla, 1), over };
}

export async function fetchLoans(api: Pick<ApiClient, 'getPage'>): Promise<{ loans: Loan[]; total: number }> {
  const body = await api.getPage<unknown>('/loans?limit=200');
  const d = body?.data as unknown;
  const loans = Array.isArray(d) ? (d as Loan[]) : Array.isArray((d as { loans?: unknown })?.loans) ? (d as { loans: Loan[] }).loans : [];
  return { loans, total: body?.pagination?.total ?? loans.length };
}

export async function escalateLoan(api: Pick<ApiClient, 'post'>, id: string, reason: string) {
  return api.post<{ escalation_level?: number; label?: string }>(`/loans/${encodeURIComponent(id)}/escalate`, { reason: reason.trim() });
}
