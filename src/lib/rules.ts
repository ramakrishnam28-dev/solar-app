/**
 * Copies of the server's own rules (backend utils/statusEngine.js and workflow.js).
 * A unit test compares them with backend-rules.json, which is generated from the backend
 * files, so if the backend changes and this file does not, `npm test` fails.
 */
export const VALID_TRANSITIONS: Record<string, string[]> = {
  kyc_pending: ['lead_captured', 'onboarded', 'cancelled'],
  lead_captured: ['onboarded', 'pmsg_pending', 'cancelled'],
  onboarded: ['pmsg_pending', 'cancelled'],
  pmsg_pending: ['pmsg_registered', 'cancelled'],
  pmsg_registered: ['loan_ready', 'loan_applied', 'amount_disbursed', 'disbursed_full', 'installation_complete', 'cancelled'],
  loan_ready: ['loan_applied', 'cancelled'],
  loan_applied: ['loan_sanctioned', 'loan_rejected', 'cancelled'],
  loan_rejected: ['loan_reapplication', 'cancelled'],
  loan_reapplication: ['loan_applied', 'cancelled'],
  loan_sanctioned: ['amount_disbursed', 'disbursed_full', 'disbursed_partial'],
  amount_disbursed: ['disbursed_full', 'disbursed_partial', 'installation_complete'],
  disbursed_full: ['installation_complete'],
  disbursed_partial: ['disbursed_full', 'installation_complete'],
  installation_complete: ['net_meter_applied', 'cancelled'],
  net_meter_applied: ['net_meter_approved'],
  net_meter_approved: ['net_meter_installed'],
  net_meter_installed: ['subsidy_awaited', 'subsidy_credited'],
  subsidy_awaited: ['subsidy_credited'],
  subsidy_credited: ['project_complete'],
  project_complete: [],
  survey_completed: ['quotation_sent', 'pmsg_pending', 'cancelled'],
  quotation_sent: ['loan_ready', 'loan_applied', 'cancelled'],
  cancelled: ['lead_captured', 'onboarded'],
};

export const STATUS_RANK: Record<string, number> = {
  kyc_pending: 0, lead_captured: 1, survey_completed: 1, onboarded: 2, pmsg_pending: 3, pmsg_registered: 4,
  quotation_sent: 4, loan_ready: 5, loan_applied: 6, loan_rejected: 6, loan_reapplication: 6,
  loan_sanctioned: 7, amount_disbursed: 8, disbursed_partial: 8, disbursed_full: 9,
  installation_complete: 10, net_meter_applied: 11, net_meter_approved: 12, net_meter_installed: 13,
  subsidy_awaited: 14, subsidy_credited: 15, project_complete: 16,
};

export const LOAN_STEPS = ['lead_captured', 'onboarded', 'pmsg_pending', 'pmsg_registered', 'loan_ready', 'loan_applied', 'loan_sanctioned',
  'amount_disbursed', 'disbursed_full', 'installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed',
  'subsidy_awaited', 'subsidy_credited', 'project_complete'];
export const CASH_STEPS = ['lead_captured', 'onboarded', 'pmsg_pending', 'pmsg_registered', 'amount_disbursed', 'installation_complete',
  'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited', 'project_complete'];

/** Branch states that exist only on the loan path. */
const LOAN_ONLY = ['loan_ready', 'loan_applied', 'loan_sanctioned', 'loan_rejected', 'loan_reapplication', 'disbursed_full', 'disbursed_partial'];

/**
 * The statuses a user can move this customer forward to.
 * Cancel and Project Complete have their own buttons, so they are never in this list.
 * Cash customers do not see loan-only steps.
 */
export function nextStatuses(status: string | null | undefined, paymentMethod?: string | null): string[] {
  if (status === 'cancelled') return [];   // Reactivate has its own button
  const allowed = VALID_TRANSITIONS[status ?? ''] ?? [];
  const cash = (paymentMethod || 'loan') === 'cash';
  return allowed
    .filter((s) => s !== 'cancelled' && s !== 'project_complete')
    .filter((s) => !(cash && LOAN_ONLY.includes(s)));
}
