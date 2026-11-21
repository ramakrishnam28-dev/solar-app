/**
 * Who sees which button. Mirrors the server routes (customers.routes.js): the server
 * is always the final judge, this only hides buttons a role could never use.
 * Builder passes every server role check, so it is allowed everywhere.
 */
import type { Customer } from './customers';

const has = (role: string | undefined, list: string[]) => !!role && (role === 'builder' || list.includes(role));

export const can = {
  advance: (role?: string) => has(role, ['admin', 'manager', 'sales_agent', 'loan_officer']),
  moveBack: (role?: string) => has(role, ['admin', 'manager']),
  reactivate: (role?: string) => has(role, ['admin', 'manager']),
  review: (role?: string) => has(role, ['admin', 'manager']),
  cancel: (role?: string) => has(role, ['admin', 'manager', 'sales_agent']),
  requestCompletion: (role?: string) => !!role,
  note: (role?: string) => has(role, ['admin', 'manager', 'sales_agent', 'loan_officer', 'installer', 'finance']),
  // Phase 3–5, from the server routes
  // assigned_agent is only accepted from admin / manager / builder (customers.service updateCustomer)
  // GET /users (the staff list) is admin only
  assignAgent: (role?: string) => has(role, ['admin']),
  // POST /finance/deal-calculator/:id: admin, finance (builder passes)
  saveDeal: (role?: string) => has(role, ['admin', 'finance']),
  createCustomer: (role?: string) => has(role, ['admin', 'manager', 'sales_agent']),
  editCustomer: (role?: string) => has(role, ['admin', 'manager', 'sales_agent', 'finance']),
  documents: (role?: string) => has(role, ['admin', 'manager', 'sales_agent', 'finance', 'loan_officer']),
  // /documents/:id/verify allows admin, finance, loan_officer; the website also lets these roles download
  verifyDocs: (role?: string) => has(role, ['admin', 'finance', 'loan_officer']),
  downloadDocs: (role?: string) => has(role, ['admin', 'manager', 'finance', 'loan_officer']),
  sitePhotos: (role?: string) => has(role, ['admin', 'manager', 'installer', 'sales_agent', 'loan_officer']),
  uploadSitePhoto: (role?: string) => has(role, ['admin', 'manager', 'installer', 'sales_agent']),
  checkin: (role?: string) => has(role, ['admin', 'installer']),
  cashView: (role?: string) => has(role, ['admin', 'manager', 'sales_agent', 'loan_officer']),
  recordCash: (role?: string) => has(role, ['admin', 'manager', 'sales_agent', 'loan_officer']),
  loans: (role?: string) => has(role, ['admin', 'finance', 'loan_officer', 'sales_agent']),
  escalate: (role?: string) => has(role, ['admin', 'loan_officer', 'sales_agent', 'finance']),
  installations: (role?: string) => has(role, ['admin', 'installer', 'sales_agent', 'finance', 'loan_officer']),
};

export type ActionKey = 'advance' | 'moveBack' | 'cancel' | 'reactivate' | 'requestCompletion' | 'review';

/** Buttons to show on a customer for this role, in order. */
export function availableActions(c: Pick<Customer, 'status'> & { completion_requested_at?: string | null }, role?: string): ActionKey[] {
  const out: ActionKey[] = [];
  const st = c.status ?? '';
  if (st === 'cancelled') {
    if (can.reactivate(role)) out.push('reactivate');
    return out;
  }
  const pending = !!c.completion_requested_at;
  if (st === 'project_complete') {
    if (can.moveBack(role)) out.push('moveBack');
    return out;
  }
  if (pending) {
    if (can.review(role)) out.push('review');
  } else if (st === 'subsidy_credited' && can.requestCompletion(role)) {
    out.push('requestCompletion');
  }
  if (st !== 'subsidy_credited' && can.advance(role)) out.push('advance');
  if (can.moveBack(role)) out.push('moveBack');
  if (can.cancel(role)) out.push('cancel');
  return out;
}

export const MIN_REASON = 3;
export const reasonError = (text: string): string | null =>
  text.trim().length < MIN_REASON ? `Write at least ${MIN_REASON} characters.` : null;
