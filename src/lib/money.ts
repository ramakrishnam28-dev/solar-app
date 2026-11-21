/** Cash flow tab (wireframe A5 / iOS 06). Built only from fields the server already returns. */
import type { ApiClient } from './api';
import type { Customer } from './customers';

const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) && n > 0 ? n : 0; };

export interface CashPayments {
  installment_1_amount?: number | string | null; installment_1_date?: string | null; installment_1_by_name?: string | null;
  installment_2_amount?: number | string | null; installment_2_date?: string | null; installment_2_by_name?: string | null;
}

export interface MoneyStep { key: string; title: string; sub: string; amount: number; state: 'received' | 'projected'; date?: string | null }
export interface MoneyPart { label: string; amount: number }
export interface CashFlow {
  method: 'loan' | 'cash' | 'hybrid';
  quotation: number;
  parts: MoneyPart[];      // loan, customer (in that order), only the ones above 0
  projectCost: number;
  subsidy: number;
  steps: MoneyStep[];
  received: number;        // how many steps are received
  nextInstallment: 1 | 2 | null; // for Record payment (cash / hybrid), null when both are recorded
  cashDue: number;         // what the customer still owes in cash (cash / hybrid)
}

export function computeCashFlow(c: Customer, cash: CashPayments | null): CashFlow {
  const raw = String(c.payment_method ?? 'loan').toLowerCase();
  const method: CashFlow['method'] = raw === 'cash' ? 'cash' : raw === 'hybrid' ? 'hybrid' : 'loan';
  const quotation = num(c.dc_quotation_value) || num(c.quotation_value);
  const loan = method === 'cash' ? 0 : num(c.sanctioned_amount) || num(c.loan_amount);
  const customerPart = method === 'cash' ? quotation : method === 'hybrid' ? num(c.cash_amount) || Math.max(quotation - loan, 0) : Math.max(quotation - loan, 0);
  const parts = [{ label: 'Loan', amount: loan }, { label: 'Customer', amount: customerPart }].filter((p) => p.amount > 0);
  const subsidy = num(c.subsidy_amount);
  const steps: MoneyStep[] = [];

  if (method !== 'cash') {
    const pct = num(c.dc_disbursal_pct_1) || 70;
    const first = num(c.disbursed_amount) || num(c.amount_disbursed);
    const firstDone = first > 0 || !!c.first_disbursal_at;
    const second = num(c.second_disbursal_amount);
    steps.push({ key: 'd1', title: 'Bank → Vendor', sub: `1st disbursal ~${pct}%`, amount: firstDone ? first : Math.round(loan * pct / 100), state: firstDone ? 'received' : 'projected', date: c.first_disbursal_at as string | null });
    steps.push({ key: 'd2', title: 'Bank → Vendor', sub: `2nd disbursal ~${100 - pct}%`, amount: second > 0 ? second : Math.max(Math.round(loan - (firstDone ? first : loan * pct / 100)), 0), state: second > 0 ? 'received' : 'projected', date: c.second_disbursal_at as string | null });
  }
  let nextInstallment: CashFlow['nextInstallment'] = null;
  let cashDue = 0;
  if (method !== 'loan') {
    const i1 = num(cash?.installment_1_amount);
    const i2 = num(cash?.installment_2_amount);
    cashDue = Math.max(customerPart - i1 - i2, 0);
    steps.push({ key: 'c1', title: 'Customer → Vendor', sub: 'Cash installment 1', amount: i1 || Math.round(customerPart / 2), state: i1 ? 'received' : 'projected', date: cash?.installment_1_date });
    steps.push({ key: 'c2', title: 'Customer → Vendor', sub: 'Cash installment 2', amount: i2 || Math.max(customerPart - (i1 || Math.round(customerPart / 2)), 0), state: i2 ? 'received' : 'projected', date: cash?.installment_2_date });
    nextInstallment = !i1 ? 1 : !i2 ? 2 : null;
  }
  if (subsidy > 0 || method !== 'cash') {
    const credited = ['subsidy_credited', 'project_complete'].includes(String(c.status)) || String(c.subsidy_status ?? '').toLowerCase() === 'credited';
    steps.push({ key: 's', title: 'Govt → Customer a/c', sub: 'After net meter', amount: subsidy, state: credited ? 'received' : 'projected' });
  }
  return {
    method, quotation, parts, projectCost: num(c.dc_project_cost) || quotation, subsidy, steps,
    received: steps.filter((s) => s.state === 'received').length, nextInstallment, cashDue,
  };
}

export async function fetchCashPayments(api: Pick<ApiClient, 'get'>, id: string): Promise<CashPayments | null> {
  return (await api.get<CashPayments | null>(`/customers/${encodeURIComponent(id)}/cash-payment`)) ?? null;
}

export function cashAmountError(text: string, due: number): string | null {
  const n = Number(text.replace(/[,₹\s]/g, ''));
  if (!text.trim() || !Number.isFinite(n) || n <= 0) return 'Enter the amount received.';
  if (due > 0 && n > due * 1.5) return `That is much more than the ₹${due.toLocaleString('en-IN')} still due. Check the amount.`;
  return null;
}

export async function recordCashPayment(api: Pick<ApiClient, 'post'>, id: string, installment: 1 | 2, amount: number, notes?: string) {
  return api.post<{ total_collected?: number; fully_paid?: boolean }>(`/customers/${encodeURIComponent(id)}/cash-payment`, {
    installment, amount, ...(notes?.trim() ? { notes: notes.trim() } : {}),
  });
}
