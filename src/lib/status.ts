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
