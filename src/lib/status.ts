import type { Tone } from '@/constants/theme';

/** Same wording as the web app (PIPELINE_STATUS_LABEL). */
export const STATUS_LABEL: Record<string, string> = {
  kyc_pending: 'KYC Pending',
  lead_captured: 'Lead Captured',
  onboarded: 'Onboarded',
  survey_completed: 'Survey Completed',
  quotation_sent: 'Quotation Sent',
  pmsg_pending: 'PM Surya Ghar: Pending',
  pmsg_registered: 'PM Surya Ghar: Registered',
  loan_ready: 'Loan: Ready to Apply',
  loan_applied: 'Loan: Applied',
  loan_sanctioned: 'Loan: Sanctioned',
  loan_rejected: 'Loan: Rejected',
  loan_reapplication: 'Loan: Reapplication',
  amount_disbursed: 'Amount Disbursed',
  disbursed_full: 'Disbursed: Full',
  disbursed_partial: 'Disbursed: Partial',
  installation_complete: 'Installation Complete',
  net_meter_applied: 'Net Metering: Applied',
  net_meter_approved: 'Net Metering: Approved',
  net_meter_installed: 'Net Metering: Installed',
  subsidy_awaited: 'Subsidy: Awaited',
  subsidy_credited: 'Subsidy: Credited',
  project_complete: 'Project Complete',
  cancelled: 'Cancelled',
};

export function statusLabel(status?: string | null): string {
  if (!status) return 'New Customer';
  return STATUS_LABEL[status] ?? status.replace(/_/g, ' ');
}

const DONE = ['pmsg_registered', 'loan_sanctioned', 'amount_disbursed', 'disbursed_full', 'installation_complete',
  'net_meter_installed', 'subsidy_credited', 'project_complete'];
const WAITING = ['kyc_pending', 'pmsg_pending', 'subsidy_awaited'];
const PROBLEM = ['loan_rejected'];

/** One meaning per colour. Grey is for "cancelled" only. */
export function statusTone(status?: string | null): Tone {
  if (!status) return 'progress';
  if (status === 'cancelled') return 'inactive';
  if (PROBLEM.includes(status)) return 'problem';
  if (WAITING.includes(status)) return 'waiting';
  if (DONE.includes(status)) return 'done';
  return 'progress';
}

/** The big stages shown on the Progress tab, in order. */
export const STAGES: { key: string; label: string; statuses: string[] }[] = [
  { key: 'lead', label: 'Lead and survey', statuses: ['kyc_pending', 'lead_captured', 'onboarded', 'survey_completed', 'quotation_sent'] },
  { key: 'pm', label: 'PM Surya Ghar registration', statuses: ['pmsg_pending', 'pmsg_registered'] },
  { key: 'loan', label: 'Loan application', statuses: ['loan_ready', 'loan_applied', 'loan_rejected', 'loan_reapplication'] },
  { key: 'disbursal', label: 'Loan approval and disbursal', statuses: ['loan_sanctioned', 'amount_disbursed', 'disbursed_partial', 'disbursed_full'] },
  { key: 'install', label: 'Installation', statuses: ['installation_complete'] },
  { key: 'netmeter', label: 'Net metering', statuses: ['net_meter_applied', 'net_meter_approved', 'net_meter_installed'] },
  { key: 'subsidy', label: 'Subsidy', statuses: ['subsidy_awaited', 'subsidy_credited'] },
  { key: 'done', label: 'Project complete', statuses: ['project_complete'] },
];

/** Index of the stage the customer is in, or -1 when unknown/cancelled. */
export function stageIndex(status?: string | null): number {
  if (!status) return 0;
  return STAGES.findIndex((s) => s.statuses.includes(status));
}

export type Segment = 'active' | 'completed' | 'cancelled' | 'all';
export const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'active', label: 'Under process' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'all', label: 'All' },
];

// ── Design pass helpers ─────────────────────────────────────────────

/** The 8 steps in the design's stepper ("Step 3 of 8"). 0 when cancelled or unknown. */
export const STEP_SHORT = ['KYC', 'PMSG', 'Loan', 'Disb.', 'Install', 'Net m.', 'Subsidy', 'Done'];
export const STEP_COUNT = STEP_SHORT.length;
export function stepNumber(status?: string | null): number {
  if (status === 'cancelled') return 0;
  const i = stageIndex(status);
  return i < 0 ? 0 : i + 1;
}

/** The 5 parts of the Home pipeline bar. Completed and cancelled projects are not in the pipeline. */
export const PIPELINE_BUCKETS = ['Onboard', 'PMSG', 'Loan', 'Install', 'Net meter'];
export function bucketOf(status?: string | null): number {
  if (!status || status === 'cancelled' || status === 'project_complete') return -1;
  const i = stageIndex(status);
  if (i < 0) return -1;
  return [0, 1, 2, 2, 3, 4, 4, -1][i];
}

const NEXT_ACTION: Record<string, string> = {
  kyc_pending: 'Complete KYC',
  lead_captured: 'Onboard customer',
  onboarded: 'Register on PM Surya Ghar',
  survey_completed: 'Send quotation',
  quotation_sent: 'Apply for loan',
  pmsg_pending: 'Complete registration',
  pmsg_registered: 'Start loan application',
  loan_ready: 'Apply for loan',
  loan_applied: 'Update loan decision',
  loan_rejected: 'Re-apply for loan',
  loan_reapplication: 'Update loan decision',
  loan_sanctioned: 'Record 1st disbursal',
  amount_disbursed: 'Record disbursal',
  disbursed_partial: 'Record 2nd disbursal',
  disbursed_full: 'Schedule installation',
  installation_complete: 'Net meter next',
  net_meter_applied: 'Awaiting DISCOM approval',
  net_meter_approved: 'Install net meter',
  net_meter_installed: 'Apply for subsidy',
  subsidy_awaited: 'Awaiting subsidy credit',
  subsidy_credited: 'Request completion',
  project_complete: 'Completed',
  cancelled: 'Cancelled',
};
const WAITING_ON_OTHERS = ['installation_complete', 'net_meter_applied', 'subsidy_awaited', 'project_complete', 'cancelled'];

/** The line at the bottom right of a customer card. `warm` = staff must act, otherwise grey. */
export function nextAction(c: { status?: string | null; field_visit_done?: boolean | null }): { text: string; warm: boolean } {
  const st = c.status ?? '';
  if (st === 'lead_captured' && !c.field_visit_done) return { text: 'Field visit pending', warm: true };
  return { text: NEXT_ACTION[st] ?? 'Open customer', warm: !WAITING_ON_OTHERS.includes(st) };
}

/** Label of the big button at the bottom of the customer screen. */
export function primaryLabel(status?: string | null): string {
  if (status === 'loan_applied' || status === 'loan_reapplication') return 'Update loan decision';
  if (status === 'subsidy_credited') return 'Request completion';
  if (status === 'cancelled') return 'Reactivate';
  return 'Move to next step';
}
