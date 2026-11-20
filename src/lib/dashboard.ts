import type { Customer } from './customers';

const POST_INSTALL = ['installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited', 'project_complete'];
const LOAN_STAGES = ['loan_ready', 'loan_applied', 'loan_reapplication', 'loan_rejected', 'loan_sanctioned', 'amount_disbursed', 'disbursed_full', 'disbursed_partial', ...POST_INSTALL];

export interface Kpi { label: string; value: number; note: string; tone?: 'warn' | 'neg' }
export interface Op { id: string; label: string; count: number }

export function computeKpis(customers: Customer[], total: number): Kpi[] {
  const in_ = (c: Customer, list: string[]) => !!c.status && list.includes(c.status);
  const n = (f: (c: Customer) => boolean) => customers.filter(f).length;
  const installed = n((c) => c.status === 'installation_complete');
  const approved = n((c) => in_(c, ['loan_sanctioned', 'disbursed_full', 'disbursed_partial', 'amount_disbursed']));
  const applied = n((c) => c.status === 'loan_applied');
  const instDone = n((c) => in_(c, POST_INSTALL));
  const readyInstall = n((c) => in_(c, ['disbursed_full', 'disbursed_partial']));
  const complete = n((c) => c.status === 'project_complete');
  const survey = n((c) => in_(c, ['survey_completed', 'quotation_sent']));
  return [
    { label: 'Customers', value: total, note: `${installed} installed` + (survey ? ` · ${survey} need a quotation` : '') },
    { label: 'Loans approved', value: approved, note: applied ? `${applied} awaiting bank approval` : 'None awaiting approval', tone: applied ? 'warn' : undefined },
    { label: 'Installations done', value: instDone, note: readyInstall ? `${readyInstall} ready to install` : complete ? `${complete} projects complete` : 'None waiting to install' },
  ];
}

/** The R1..R13 follow-up list, same rules as the web "Operational summary". */
export function computeOps(customers: Customer[]): Op[] {
  const n = (f: (c: Customer) => boolean) => customers.filter(f).length;
  const has = (c: Customer, list: string[]) => !!c.status && list.includes(c.status);
  const post = (c: Customer) => has(c, POST_INSTALL);
  const loanStage = (c: Customer) => has(c, LOAN_STAGES);
  return [
    { id: 'R1', label: 'PM Surya Ghar registration pending', count: n((c) => has(c, ['pmsg_pending', 'pmsg_registered'])) },
    { id: 'R2', label: 'Loan applied, docs to bank', count: n((c) => c.status === 'loan_applied') },
    { id: 'R3', label: 'Loan applications', count: n((c) => has(c, ['loan_applied', 'loan_reapplication'])) },
    { id: 'R4', label: 'Disbursed, install pending', count: n((c) => has(c, ['disbursed_full', 'disbursed_partial', 'amount_disbursed'])) },
    { id: 'R5', label: '1st disbursal pending', count: n((c) => post(c) && !c.disbursed_amount && loanStage(c)) },
    { id: 'R6', label: 'DISCOM docs pending', count: n((c) => post(c) && !c.discom_submission_date) },
    { id: 'R7', label: 'Net meter pending', count: n((c) => has(c, ['installation_complete', 'net_meter_applied', 'net_meter_approved'])) },
    { id: 'R8', label: 'Bank docs after install pending', count: n((c) => post(c) && loanStage(c) && !c.post_install_bank_docs_submitted) },
    { id: 'R9', label: 'Consumer app install pending', count: n((c) => post(c) && !c.consumer_app_installed) },
    { id: 'R10', label: 'Subsidy pending', count: n((c) => has(c, ['net_meter_installed', 'subsidy_awaited'])) },
    { id: 'R11', label: '2nd disbursal pending', count: n((c) => c.status === 'disbursed_partial' && !c.second_disbursal_amount) },
    { id: 'R12', label: 'Reverification required', count: n((c) => !!c.reverification_required) },
    { id: 'R13', label: 'Field visit pending', count: n((c) => !c.field_visit_done) },
  ];
}
