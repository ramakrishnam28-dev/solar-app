/**
 * The website's "Update Progress" tab (_buildUpdateProgressTabCore in index.html), ported 1:1.
 * Same order, same conditions, same wording, same actions. Pure function: easy to test.
 * Each action names an "op"; lib/progress-ops.ts sends the same requests the website sends.
 */
import { num, truthy, type FullCustomer } from './full-customer';

export type CardTone = 'warn' | 'ok' | 'grey' | 'red' | 'violet' | 'dark';
export interface FormField {
  key: string; label: string; kind: 'money' | 'text' | 'date' | 'textarea' | 'radio' | 'installer';
  placeholder?: string; required?: boolean; initial?: string; options?: { value: string; label: string; hint?: string }[];
  minToday?: boolean; maxToday?: boolean; upper?: boolean;
}
export interface CardAction {
  op: Op; label: string; variant?: 'primary' | 'secondary' | 'danger';
  args?: Record<string, unknown>; confirm?: string; disabledNote?: string;
}
export interface InstallSection {
  instId: string | null; hasInstaller: boolean; assignedName: string; hasSchedule: boolean; scheduledDate: string | null;
  photoCount: number; canApprove: boolean; approvedCount: number; uploadedCount: number;
}
export interface NetMeterSection {
  submittedDate: string | null; activeSubmit: boolean; approvedDone: boolean; activeApproved: boolean;
  canMarkApproved: boolean; photoUrl: string | null; photoApproved: boolean; photoReupload: boolean; canApprove: boolean; canMarkInstalled: boolean;
}
export interface ProgressCard {
  key: string; icon: string; title: string; tone: CardTone;
  text?: string[]; rows?: [string, string][]; bar?: { left: string; right: string; pct: number };
  checklist?: string[]; fields?: FormField[]; actions?: CardAction[]; note?: string;
  install?: InstallSection; netmeter?: NetMeterSection;
}
export interface DoneStrip { label: string; detail?: string }
export interface ProgressView { complete?: { date: string | null }; done: DoneStrip[]; cards: ProgressCard[] }

export type Op =
  | 'status' | 'openKyc' | 'openDeal' | 'startInstallation' | 'cashPayment' | 'hybridCash' | 'referral'
  | 'submitLoan' | 'loanRejected' | 'loanApproved' | 'confirmScenario' | 'vendorFloat' | 'contributionReturned'
  | 'confirmDisbursal' | 'disbursal2' | 'assignInstaller' | 'scheduleInstall' | 'installComplete'
  | 'nmSubmit' | 'netMeter' | 'appInstalled' | 'subsidyCredited'
  | 'requestCompletion' | 'approveCompletion' | 'sendBackCompletion';

/** Who the server lets do each op (route authorize lists; builder passes every check). */
export const OP_ROLES: Record<Op, string[]> = {
  status: ['admin', 'manager', 'sales_agent', 'loan_officer'],
  openKyc: ['admin', 'manager', 'sales_agent', 'finance'],
  openDeal: ['admin', 'finance'],
  startInstallation: ['admin', 'manager', 'installer'],
  cashPayment: ['admin', 'manager', 'sales_agent', 'loan_officer'],
  hybridCash: ['admin', 'manager', 'sales_agent', 'loan_officer'],
  referral: ['admin', 'manager'],
  submitLoan: ['admin', 'manager', 'sales_agent'],
  loanRejected: ['admin', 'manager', 'sales_agent'],
  loanApproved: ['admin', 'manager', 'sales_agent', 'loan_officer'],
  confirmScenario: ['admin', 'manager', 'sales_agent'],
  vendorFloat: ['admin', 'manager', 'sales_agent'],
  contributionReturned: ['admin', 'manager', 'sales_agent'],
  confirmDisbursal: ['admin', 'manager', 'sales_agent'],
  disbursal2: ['admin', 'manager', 'loan_officer'],
  assignInstaller: ['admin', 'manager', 'installer'],
  scheduleInstall: ['admin', 'manager', 'installer'],
  installComplete: ['admin', 'manager', 'installer'],
  nmSubmit: ['admin', 'manager', 'installer'],
  netMeter: ['admin', 'manager', 'installer'],
  appInstalled: ['admin', 'manager', 'installer'],
  subsidyCredited: ['admin', 'manager'],
  requestCompletion: ['admin', 'manager', 'sales_agent', 'loan_officer', 'installer', 'finance'],
  approveCompletion: ['admin', 'manager'],
  sendBackCompletion: ['admin', 'manager'],
};
export const canOp = (op: Op, role?: string) => !!role && (role === 'builder' || OP_ROLES[op].includes(role));

const inr = (v: number) => '₹' + Math.round(v).toLocaleString('en-IN');
const today = () => new Date().toISOString().slice(0, 10);
const POST_NM_DONE1 = ['net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited'];
const POST_NM_DONE2 = ['net_meter_installed', 'subsidy_awaited', 'subsidy_credited'];

export const SCENARIOS = [
  { value: 'A', label: 'Scenario A · Customer pays bank', hint: 'Customer deposited 10% to bank. Vendor will return it after 1st disbursal.' },
  { value: 'B', label: 'Scenario B · Vendor credits customer', hint: 'Vendor will float 10% into customer account before disbursal.' },
  { value: 'C', label: 'Scenario C · Paper voucher only', hint: 'Paper voucher issued. No real cash movement.' },
];

export function progressView(c: FullCustomer, role?: string): ProgressView {
  const status = c.status || 'kyc_pending';
  const loanAmt = num(c.loan_amount);
  const disbAmt = num(c.amount_disbursed);
  const isPartial = status === 'disbursed_partial' || (!c.second_disbursal_amount && disbAmt < loanAmt && disbAmt > 0);
  const payMethod = String(c.payment_method || 'loan');
  const isCash = payMethod === 'cash';
  const isHybrid = payMethod === 'hybrid';
  const cards: ProgressCard[] = [];
  const done: DoneStrip[] = [];
  const view = (): ProgressView => ({ done, cards });
  const cp = c.cash_payments || {};
  const qvAll = num(c.dc_quotation_value || c.quotation_value);
  const confirmerRoles = ['admin', 'manager', 'agent', 'sales_agent', 'builder'];
  const canConfirm = confirmerRoles.includes(role ?? '');

  if (status === 'project_complete') return { complete: { date: (c.project_completed_at as string) ?? null }, done, cards };

  // STEP 1: KYC
  if (status === 'kyc_pending') {
    cards.push({ key: 'kyc', icon: '', title: 'Complete KYC', tone: 'warn', text: ['Customer profile created. Complete KYC & project details to proceed.'], actions: [{ op: 'openKyc', label: 'Complete KYC' }] });
    return view();
  }
  done.push({ label: 'Lead & KYC Complete' });

  // STEP 2: onboarded → deal before PMSG
  const hasDeal = qvAll > 0;
  if (['lead_captured', 'onboarded'].includes(status)) {
    const kycDone = c.aadhaar_masked || c.pan || c.consumer_number;
    if (!kycDone) {
      cards.push({ key: 'kyc2', icon: '📋', title: 'Complete KYC Details', tone: 'warn', text: ['Upload Aadhaar, PAN and electricity bill details to complete KYC before setting up the deal.'], actions: [{ op: 'openKyc', label: 'Complete KYC Step 2' }] });
      return view();
    }
    if (!hasDeal) {
      cards.push({ key: 'deal', icon: '🧮', title: 'Set Up Deal Calculator', tone: 'warn', text: ['Before proceeding, set up the deal, payment method, quotation value, project cost and referral commission must be configured first.'], actions: [{ op: 'openDeal', label: 'Open Deal Calculator' }] });
    } else {
      cards.push({ key: 'onboarded', icon: '✅', title: 'Customer Onboarded', tone: 'ok', text: ['KYC & deal saved. Next: Register on PM Surya Ghar portal.'], actions: [{ op: 'status', label: 'Start PM Surya Ghar Registration', args: { to: 'pmsg_pending' } }] });
    }
    return view();
  }

  if (status === 'pmsg_pending') {
    cards.push({ key: 'pmsg', icon: '🏛️', title: 'PM Surya Ghar Registration', tone: 'grey', text: ['Complete registration on the portal, then mark done here.'], actions: [{ op: 'status', label: 'Mark Registration Complete', args: { to: 'pmsg_registered' } }] });
    return view();
  }

  const hasReferral = c.lead_source === 'referral';
  const s1Paid = truthy(c.referral_s1_paid);
  const s2Paid = truthy(c.referral_s2_paid);

  if (status === 'pmsg_registered') {
    done.push({ label: 'PM Surya Ghar Registered' });
    if (isCash) {
      const i1 = num(cp.installment_1_amount);
      const fully = qvAll > 0 && i1 >= qvAll;
      const remaining = qvAll - i1;
      const pct1 = qvAll > 0 ? Math.round((i1 / qvAll) * 100) : 0;
      const s1Amt = num(c.referral_s1_amount);
      if (fully) {
        done.push({ label: 'Cash Payment Fully Received', detail: `${inr(i1)} (100%)` });
        cards.push({ key: 'startInst', icon: '🔧', title: 'Start Installation', tone: 'grey', text: ['Full payment received. Ready to start installation.'], actions: [{ op: 'startInstallation', label: 'Start Installation Process' }] });
      } else if (i1 > 0) {
        done.push({ label: '1st Instalment Received', detail: `${inr(i1)} (${pct1}%)` });
        cards.push({
          key: 'cash2', icon: '💵', title: 'Cash Collection', tone: 'ok',
          bar: { left: '1st Instalment Received', right: `${inr(i1)} (${pct1}%)`, pct: pct1 },
          text: [`Balance due: **${inr(remaining)}** (${100 - pct1}% remaining)`],
          fields: [{ key: 'amount', label: 'Final payment (₹)', kind: 'money', placeholder: `Final payment ${inr(remaining)}`, required: true }, { key: 'notes', label: 'UPI / Cash / Cheque no.', kind: 'text' }],
          actions: [{ op: 'cashPayment', label: 'Record Final Payment', args: { installment: 2 } }],
        });
        if (hasReferral) {
          if (s1Paid) done.push({ label: 'Referral Stage 1 Paid', detail: inr(num(c.referral_s1_amount)) });
          else cards.push(referralCard(1, s1Amt));
        }
        cards.push({ key: 'startInst', icon: '🔧', title: 'Start Installation', tone: 'grey', text: ['You can start installation and collect the outstanding balance during the project.'], actions: [{ op: 'startInstallation', label: 'Proceed to Installation' }] });
      } else {
        cards.push({
          key: 'cash1', icon: '💵', title: 'Enter Payment Particulars', tone: 'ok', text: ['PM Surya Ghar registration complete. Record the cash payment received from customer.'],
          fields: [{ key: 'amount', label: 'Amount Received (₹) *', kind: 'money', placeholder: `e.g. ${qvAll > 0 ? qvAll.toLocaleString('en-IN') : '210000'}`, required: true }, { key: 'notes', label: 'Notes (optional)', kind: 'text', placeholder: 'e.g. UPI / Cash / Cheque no.' }],
          actions: [{ op: 'cashPayment', label: 'Record Payment Received', args: { installment: 1 } }],
        });
      }
    } else {
      cards.push({ key: 'toLoan', icon: '🏛️', title: 'PMSG Done: Proceed to Loan', tone: 'ok', text: ['Registration complete. Apply for JanSamarth solar loan.'], actions: [{ op: 'status', label: 'Proceed to Loan Application', args: { to: 'loan_ready' } }] });
    }
    return view();
  }

  done.push({ label: 'PM Surya Ghar Registered' });

  if (!isCash && ['loan_ready', 'loan_reapplication'].includes(status)) {
    cards.push({
      key: 'applyLoan', icon: '🏦', title: status === 'loan_reapplication' ? 'Re-apply with Another Bank' : 'Apply for JanSamarth Loan', tone: 'warn',
      fields: [
        { key: 'bank', label: 'Bank Name *', kind: 'text', placeholder: 'e.g. Indian Bank', required: true },
        { key: 'branch', label: 'Branch', kind: 'text' },
        { key: 'ifsc', label: 'IFSC Code', kind: 'text', placeholder: 'IDIB000T138', upper: true },
        { key: 'amount', label: 'Loan Amount (₹) *', kind: 'money', required: true },
        { key: 'appno', label: 'Application Number', kind: 'text', placeholder: 'ANS-SOLAR-XXXXXXXX-XXXXXXX', upper: true },
      ],
      actions: [{ op: 'submitLoan', label: 'Submit Loan Application' }],
    });
    return view();
  }

  if (!isCash && status === 'loan_applied') {
    cards.push({
      key: 'loanDecision', icon: '📋', title: 'Loan Applied: Awaiting Decision', tone: 'ok',
      rows: c.loan_bank ? [['Bank', String(c.loan_bank || '—')], ['Amount', inr(loanAmt)], ['Application No.', String(c.loan_application_no || '—')]] : undefined,
      actions: [{ op: 'loanRejected', label: 'Rejected', variant: 'danger' }, { op: 'loanApproved', label: 'Loan Sanctioned' }],
    });
    return view();
  }

  if (!isCash && status === 'loan_rejected') {
    cards.push({ key: 'rejected', icon: '❌', title: 'Loan Rejected', tone: 'red', text: c.loan_rejection_reason ? [`Reason: ${c.loan_rejection_reason}`] : undefined, actions: [{ op: 'status', label: 'Re-apply with Another Bank', args: { to: 'loan_reapplication' } }] });
    return view();
  }

  if (!isCash && status === 'loan_sanctioned') {
    done.push({ label: 'Loan Sanctioned', detail: inr(loanAmt) });
    const sc = String(c.dc_contribution_scenario || c.contribution_scenario || 'C');
    const scenarioConfirmed = !!c.dc_scenario_confirmed_at;
    const floatConfirmed = !!c.dc_vendor_float_confirmed_at;
    if (!scenarioConfirmed) {
      cards.push({
        key: 'scenario', icon: '📋', title: 'Confirm 10% Contribution Scenario', tone: 'warn', text: ['Before recording the disbursal, confirm which 10% contribution scenario applies for this bank.'],
        fields: [{ key: 'scenario', label: 'Scenario', kind: 'radio', initial: sc, options: SCENARIOS }],
        actions: canConfirm ? [{ op: 'confirmScenario', label: 'Confirm Scenario' }] : undefined,
        note: canConfirm ? undefined : 'Only admin/manager/agent can confirm',
      });
      return view();
    }
    done.push({ label: `Scenario ${sc} Confirmed`, detail: sc === 'A' ? 'Customer pays bank' : sc === 'B' ? 'Vendor credits customer' : 'Paper voucher' });
    if (sc === 'B' && !floatConfirmed) {
      const contrib = num(c.dc_loan_quotation || c.quotation_value) * 0.1;
      cards.push({
        key: 'float', icon: '🏦', title: 'Confirm Vendor Float', tone: 'ok',
        text: [`Scenario B: Vendor must credit **${inr(contrib)}** to customer's bank account before the disbursal is processed. Verify with the customer that the amount is received.`],
        checklist: ['Ask customer to share bank statement showing the credit', 'Amount should appear as credit from vendor'],
        actions: canConfirm ? [{ op: 'vendorFloat', label: 'Confirm Vendor Float Received' }] : undefined,
        note: canConfirm ? undefined : 'Only admin/manager/agent can confirm',
      });
      return view();
    }
    if (sc === 'B' && floatConfirmed) done.push({ label: 'Vendor Float Confirmed', detail: '10% credited to customer a/c' });
    if (isHybrid) {
      const h = hybridState(c);
      if (!h.collected) {
        cards.push(hybridCard('hyb1', c, h, 'Hybrid payment: Collect full cash portion of **' + inr(h.cash) + '** from customer. This must be fully collected before bank disbursal can be recorded.', 'Record Cash Received'));
        return view();
      }
      done.push({ label: 'Cash Fully Collected', detail: `${inr(h.total)} received` });
    }
    cards.push({
      key: 'disb1', icon: '💰', title: 'Confirm 1st Disbursal', tone: 'ok',
      fields: [{ key: 'amount', label: 'Disbursed Amount (₹) *', kind: 'money', placeholder: 'e.g. 189000', required: true }],
      actions: [{ op: 'confirmDisbursal', label: 'Confirm Disbursal', args: { loanAmt, status } }],
    });
    return view();
  }

  if (!isCash) {
    done.push({ label: 'Loan Sanctioned', detail: inr(loanAmt) });
    done.push({ label: '1st Disbursal Received', detail: inr(disbAmt) });
  }

  // STEP 4: disbursed, start installation
  if (!isCash && ['amount_disbursed', 'disbursed_full', 'disbursed_partial'].includes(status) && !c.installation_id) {
    if (isHybrid) {
      const h = hybridState(c);
      if (!h.collected) {
        cards.push(hybridCard('hyb2', c, h, `Cash portion must be fully collected before installation can begin. Total cash due: **${inr(h.cash)}** | Collected: **${inr(h.total)}**`, 'Record Cash: Unlock Installation'));
        return view();
      }
    }
    const pct = loanAmt > 0 ? Math.round((disbAmt / loanAmt) * 100) : 0;
    cards.push({
      key: 'disbursal', icon: '💰', title: 'Disbursal', tone: 'ok',
      rows: [['Loan Amount', inr(loanAmt)], [isPartial ? '1st Disbursed' : 'Disbursed', inr(disbAmt)]],
      bar: { left: 'Disbursed', right: `${pct}%`, pct },
      actions: [{ op: 'startInstallation', label: 'Start Installation Process' }],
    });
  }

  // STEP 5: Installation
  const installStat = isCash ? ['amount_disbursed', 'disbursed_full', 'disbursed_partial', 'installation_complete'] : ['disbursed_full', 'disbursed_partial', 'installation_complete'];
  if (installStat.includes(status) && (c.installation_id || status === 'installation_complete')) {
    const inst = c.installation;
    const isComplete = !!inst.completed_date || status === 'installation_complete';
    if (!isComplete) {
      const uploaded = Object.values(inst.photo_map).filter((p) => p.file_url);
      cards.push({
        key: 'install', icon: '🔧', title: 'Installation', tone: 'grey',
        install: {
          instId: inst.id || (c.installation_id as string) || null, hasInstaller: !!inst.assigned_to, assignedName: inst.assigned_name || '',
          hasSchedule: !!inst.scheduled_date, scheduledDate: inst.scheduled_date || null,
          photoCount: Object.keys(inst.photo_map).length || inst.photos_uploaded || 0,
          canApprove: ['admin', 'manager', 'builder'].includes(role ?? ''),
          approvedCount: uploaded.filter((p) => p.approval_status === 'approved').length, uploadedCount: uploaded.length,
        },
      });
    } else {
      done.push({ label: 'Installation Complete', detail: inst.completed_date ? new Date(inst.completed_date).toLocaleDateString('en-IN') : '' });
    }
  }

  const atNetMeter = ['net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited'].includes(status);
  const atInstallOrBeyond = status === 'installation_complete' || atNetMeter;

  // 2nd disbursal (parallel)
  const postInstall = ['installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited'];
  if (!isCash && postInstall.includes(status) && isPartial && !c.second_disbursal_amount) {
    const rem = loanAmt - disbAmt;
    const remPct = loanAmt > 0 ? Math.round((rem / loanAmt) * 100) : 0;
    cards.push({
      key: 'disb2', icon: '💰', title: '2nd Disbursal Pending', tone: 'warn', text: [`Remaining: **${inr(rem)}** (${remPct}% of loan)`],
      fields: [{ key: 'amount', label: '2nd disbursal amount (₹)', kind: 'money', required: true }],
      actions: [{ op: 'disbursal2', label: 'Confirm', args: { remaining: rem } }],
    });
  } else if (!isCash && c.second_disbursal_amount) {
    done.push({ label: '2nd Disbursal Received', detail: inr(num(c.second_disbursal_amount)) });
  }

  // Cash collection (cash + hybrid)
  const CASH_STATUSES = ['pmsg_registered', 'loan_ready', 'loan_applied', 'loan_sanctioned', 'amount_disbursed', 'disbursed_full', 'disbursed_partial', 'installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited'];
  const atSubsidy = ['subsidy_awaited', 'subsidy_credited', 'project_complete'].includes(status);
  const cashVisible = isCash ? CASH_STATUSES.includes(status) : isHybrid && atInstallOrBeyond && !atSubsidy;
  const i1 = num(cp.installment_1_amount);
  const i2 = num(cp.installment_2_amount);
  const caAll = num(c.cash_amount || c.dc_cash_amount || qvAll);
  const cashPending = (isCash || isHybrid) && i1 + i2 < caAll;
  if (cashVisible || cashPending || ((isCash || isHybrid) && atSubsidy)) {
    const receivable = isCash ? qvAll : num(c.cash_amount || c.dc_cash_amount);
    const total = i1 + i2;
    const fully = receivable > 0 && total >= receivable;
    const pct1 = receivable > 0 ? Math.round((i1 / receivable) * 100) : 0;
    if (fully) {
      done.push({ label: 'Cash Payment Fully Received', detail: `${inr(total)} (100%)` });
      if (isCash && !atInstallOrBeyond && !c.installation_id) {
        cards.push({ key: 'startInst', icon: '🔧', title: 'Start Installation', tone: 'grey', text: ['Cash payment fully received. Ready to start installation.'], actions: [{ op: 'startInstallation', label: 'Start Installation Process' }] });
        return view();
      }
    } else if (cashVisible || cashPending) {
      if (i1 > 0) {
        cards.push({
          key: 'cashColl', icon: '💵', title: isCash ? 'Cash Collection' : 'Cash Collection (Hybrid)', tone: 'ok',
          bar: { left: '1st Instalment Received', right: `${inr(i1)} (${pct1}%)`, pct: pct1 },
          text: [`${cp.installment_1_date ? 'Recorded: ' + new Date(cp.installment_1_date).toLocaleDateString('en-IN') + '. ' : ''}Balance due: **${inr(receivable - i1)}** (${100 - pct1}% remaining)`],
          fields: [{ key: 'amount', label: 'Final payment amount (₹)', kind: 'money', required: true }, { key: 'notes', label: 'Payment notes (optional)', kind: 'text' }],
          actions: [{ op: 'cashPayment', label: 'Record Final Payment', args: { installment: 2 } }],
        });
      } else {
        cards.push({
          key: 'cashColl', icon: '💵', title: isCash ? 'Cash Collection' : 'Cash Collection (Hybrid)', tone: 'ok',
          text: [isHybrid ? `Total cash to collect from customer: **${inr(receivable)}**` : 'Record cash payment received from customer.'],
          fields: [{ key: 'amount', label: 'Amount Received (₹) *', kind: 'money', placeholder: `e.g. ${Math.round(receivable / 2).toLocaleString('en-IN')}`, required: true }, { key: 'notes', label: 'Payment notes (UPI / Cash / Cheque no.)', kind: 'text' }],
          actions: [{ op: 'cashPayment', label: 'Record Payment Received', args: { installment: 1 } }],
        });
      }
    }
  }

  // Referral S1
  if (atInstallOrBeyond && hasReferral && !s1Paid) cards.push(referralCard(1, num(c.referral_s1_amount), 'Pay S1'));
  else if (hasReferral && s1Paid) done.push({ label: 'Referral Stage 1 Paid', detail: inr(num(c.referral_s1_amount)) });

  // Net metering
  if (status === 'installation_complete') {
    cards.push({ key: 'nmApply', icon: '⚡', title: 'Net Metering', tone: 'ok', text: ['Installation complete. Next step: Apply for net metering with DISCOM to enable grid connection.'], actions: [{ op: 'status', label: 'Apply for Net Metering', args: { to: 'net_meter_applied' } }] });
  }
  if (atNetMeter) {
    const nmDone1 = POST_NM_DONE1.includes(status);
    const nmDone2 = POST_NM_DONE2.includes(status);
    const inst = c.installation;
    if (!nmDone2) {
      const photoUrl = (c.net_meter_photo_url as string) || inst.net_meter_photo_url || null;
      cards.push({
        key: 'nm', icon: '⚡', title: 'Net Metering', tone: 'ok',
        netmeter: {
          submittedDate: (c.discom_submission_date as string) || null, activeSubmit: status === 'net_meter_applied', approvedDone: nmDone1,
          activeApproved: status === 'net_meter_approved', canMarkApproved: status === 'net_meter_applied' && !!c.discom_submission_date,
          photoUrl, photoApproved: !!inst.nm_photo_approved, photoReupload: !!inst.nm_photo_reupload_requested,
          canApprove: ['admin', 'manager', 'builder'].includes(role ?? ''),
          canMarkInstalled: status === 'net_meter_approved' && !!photoUrl && !!inst.nm_photo_approved,
        },
      });
    } else {
      done.push({ label: 'Net Meter Installed' });
      if (status === 'net_meter_installed') {
        const appInst = truthy(c.consumer_app_installed);
        if (!appInst) cards.push({ key: 'app', icon: '📱', title: 'Install Solar Monitoring App on Consumer Device', tone: 'ok', text: ["Install and activate the solar generation monitoring app on the consumer's mobile device to track real-time energy output."], actions: [{ op: 'appInstalled', label: 'Mark Solar Monitoring App Installed' }] });
        cards.push({
          key: 'toSubsidy', icon: '⚡', title: 'Net Meter Installed', tone: 'ok', text: appInst ? undefined : ['Install PM Surya Ghar app on consumer device before proceeding.'],
          actions: [{ op: 'status', label: 'Proceed to Subsidy', args: { to: 'subsidy_awaited' }, disabledNote: appInst ? undefined : 'Install the solar monitoring app on consumer device first' }],
        });
      }
    }
  }

  // Subsidy
  if (['subsidy_awaited', 'subsidy_credited'].includes(status)) {
    const appInst = truthy(c.consumer_app_installed);
    if (!appInst) cards.push({ key: 'app2', icon: '📱', title: 'Install Solar Monitoring App on Consumer Device', tone: 'ok', text: ["Install and activate the solar generation monitoring app on the consumer's device."], actions: [{ op: 'appInstalled', label: 'Mark App Installed' }] });
    const subsidyDone = status === 'subsidy_credited' || truthy(c.subsidy_credited);
    if (!subsidyDone) {
      cards.push({ key: 'subsidy', icon: '☀️', title: 'Subsidy Awaited', tone: 'warn', text: ['**Awaiting PM Surya Ghar subsidy**', 'Typically credited within 30–60 days of net meter installation.'], actions: [{ op: 'subsidyCredited', label: 'Mark Subsidy Credited', confirm: 'Mark PM Surya Ghar subsidy as credited to customer account?' }] });
    } else {
      done.push({ label: 'Subsidy Credited', detail: c.subsidy_credited_at ? new Date(c.subsidy_credited_at as string).toLocaleDateString('en-IN') : '' });
      if (hasReferral && s1Paid && !s2Paid) cards.push(referralCard(2, num(c.referral_s2_amount), 'Pay S2'));
      else if (hasReferral && s2Paid) done.push({ label: 'Referral Stage 2 Paid', detail: inr(num(c.referral_s2_amount)) });

      const sc = String(c.dc_contribution_scenario || c.contribution_scenario || 'C');
      const returned = !!c.dc_contribution_returned_at;
      const isA = sc === 'A' && payMethod !== 'cash';
      if (isA && !returned) {
        const contrib = Math.round(num(c.dc_loan_quotation || c.quotation_value) * 0.1);
        cards.push({
          key: 'returned', icon: '🔄', title: 'Confirm 10% Returned to Customer', tone: 'warn',
          text: [`Scenario A: Vendor must return **${inr(contrib)}** to customer. This must be confirmed before the project can be marked complete.`],
          checklist: ['Confirm with customer that vendor returned the amount', 'Ask for bank statement or UPI screenshot if possible'],
          actions: canConfirm ? [{ op: 'contributionReturned', label: 'Confirm 10% Returned to Customer' }] : undefined,
          note: canConfirm ? undefined : 'Only admin/manager/agent can confirm',
        });
        return view();
      }
      if (isA && returned) done.push({ label: '10% Contribution Returned to Customer', detail: 'Vendor returned contribution' });

      const cashFullyPaidGate = !isCash && !isHybrid ? true : i1 + i2 >= caAll;
      const disbursal2Gate = !isPartial ? true : !!c.second_disbursal_amount;
      const canComplete = (!hasReferral || (s1Paid && s2Paid)) && appInst && cashFullyPaidGate && disbursal2Gate;
      if (!appInst && !cards.some((x) => x.key === 'app2')) cards.push({ key: 'appReq', icon: '📱', title: 'Solar Monitoring App Required', tone: 'ok', text: ["Install the solar monitoring app on the consumer's device before completing the project."], actions: [{ op: 'appInstalled', label: 'Mark App Installed' }] });
      if (!cashFullyPaidGate) cards.push({ key: 'cashOut', icon: '💵', title: 'Outstanding Cash Balance', tone: 'warn', text: ['Full cash payment must be received before completing the project.', `Pending: ${inr(caAll - i1 - i2)}`] });
      if (!disbursal2Gate) cards.push({ key: 'disb2Gate', icon: '💰', title: '2nd Disbursal Pending', tone: 'warn', text: ['Record 2nd loan disbursal before completing the project.'] });
      if (hasReferral && !(s1Paid && s2Paid)) cards.push({ key: 'refGate', icon: '🤝', title: 'Referral Commission Pending', tone: 'violet', text: [`${!s1Paid ? 'Stage 1' : 'Stage 2'} referral commission must be paid before the project can be completed.`] });
      if (canComplete) {
        const canClose = ['admin', 'manager', 'builder', 'super_admin'].includes(role ?? '');
        const reqAt = c.completion_requested_at;
        const reqBy = c.completion_requested_by_name || 'a team member';
        const reqDate = reqAt ? new Date(reqAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
        const reqNote = c.completion_request_note ? [`Note: ${c.completion_request_note}`] : [];
        if (canClose && reqAt) {
          cards.push({ key: 'complete', icon: '🏆', title: 'Ready to Complete', tone: 'dark', text: [`Completion requested by **${reqBy}** on ${reqDate}.`, ...reqNote], actions: [{ op: 'approveCompletion', label: 'Approve & Complete' }, { op: 'sendBackCompletion', label: 'Send Back', variant: 'secondary' }] });
        } else if (canClose) {
          cards.push({ key: 'complete', icon: '🏆', title: 'Ready to Complete', tone: 'dark', text: ['All stages done. Mark the project as complete.'], actions: [{ op: 'status', label: 'Mark Project Complete', args: { to: 'project_complete' } }] });
        } else if (reqAt) {
          cards.push({ key: 'complete', icon: '🏆', title: 'Ready to Complete', tone: 'dark', text: [`Waiting for admin / manager approval. Requested by **${reqBy}** on ${reqDate}.`, ...reqNote] });
        } else {
          cards.push({ key: 'complete', icon: '🏆', title: 'Ready to Complete', tone: 'dark', text: [...(c.completion_rejected_note ? [`Sent back: ${c.completion_rejected_note}`] : []), 'All stages are done. Request completion and an admin or manager will approve it.'], actions: [{ op: 'requestCompletion', label: 'Request Completion' }] });
        }
      }
    }
  }
  return view();

  function referralCard(stage: 1 | 2, amt: number, label = 'Confirm'): ProgressCard {
    return {
      key: `ref${stage}`, icon: '🤝', title: `Referral Stage ${stage} Commission`, tone: 'violet',
      text: [amt > 0 ? `Amount: **${inr(amt)}**` : stage === 1 && status === 'pmsg_registered' ? 'Enter Stage 1 commission amount' : 'Enter amount to record payment'],
      fields: [{ key: 'amount', label: `Stage ${stage} amount (₹)`, kind: 'money', initial: amt ? String(amt) : '', required: true }],
      actions: [{ op: 'referral', label, args: { stage } }],
    };
  }
}

interface HybridState { i1: number; i2: number; total: number; cash: number; collected: boolean; balance: number }
function hybridState(c: FullCustomer): HybridState {
  const cp = c.cash_payments || {};
  const i1 = num(cp.installment_1_amount); const i2 = num(cp.installment_2_amount);
  const cash = num(c.cash_amount || c.dc_cash_amount);
  const total = i1 + i2;
  return { i1, i2, total, cash, collected: cash > 0 && total >= cash, balance: cash - total };
}
function hybridCard(key: string, _c: FullCustomer, h: HybridState, intro: string, btn: string): ProgressCard {
  const inst1 = h.i1 > 0;
  return {
    key, icon: '💵', title: 'Collect Cash Instalment', tone: 'warn',
    text: [intro, ...(inst1 ? [`1st instalment received: ${inr(h.i1)}`, `Balance due: ${inr(h.balance)}`] : [])],
    fields: [
      { key: 'amount', label: `${inst1 ? '2nd' : '1st'} Instalment Amount (₹) *`, kind: 'money', placeholder: inr(h.balance), required: true },
      { key: 'date', label: 'Date Received *', kind: 'date', initial: today(), maxToday: true, required: true },
    ],
    actions: [{ op: 'hybridCash', label: btn, args: { installment: inst1 ? 2 : 1 } }],
  };
}

export const PHOTO_SLOTS = [
  { key: 'before_install', label: 'Before Install' }, { key: 'mount_frame', label: 'Mount Frame' },
  { key: 'panels_array', label: 'Panels Array' }, { key: 'inverter_mount', label: 'Inverter Mount' },
  { key: 'dc_wiring', label: 'DC Wiring' }, { key: 'ac_wiring', label: 'AC Wiring' },
  { key: 'meter_board', label: 'Meter Board' }, { key: 'team_customer', label: 'Team + Customer' },
];

/** Installer's simplified view (buildInstallerProgressView on the website). */
export function installerView(c: FullCustomer) {
  const inst = c.installation;
  const map = inst.photo_map;
  const photos = Number(c.photos_uploaded ?? Object.keys(map).filter((k) => map[k]?.file_url).length) || 0;
  const schedDate = inst.scheduled_date || null;
  const isComplete = inst.status === 'completed' || ['installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited', 'project_complete'].includes(String(c.status));
  const isPast = !!schedDate && new Date(schedDate) < new Date(new Date().setHours(0, 0, 0, 0) - 86400000);
  const underProcess = !isComplete && (inst.status === 'in_progress' || photos > 0);
  const pendingInstall = !isComplete && !underProcess && isPast;
  const banner = isComplete ? { title: 'Installation Completed', sub: 'Congratulations', tone: 'ok' as const }
    : pendingInstall ? { title: 'Pending for Installation', sub: `Scheduled: ${new Date(schedDate!).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · please proceed`, tone: 'red' as const }
    : underProcess ? { title: 'Under Process', sub: `${photos}/8 photos uploaded, continue to complete`, tone: 'warn' as const }
    : { title: 'Assigned as Installer', sub: schedDate ? `Scheduled: ${new Date(schedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}` : 'No date scheduled yet', tone: 'grey' as const };
  const uploaded = PHOTO_SLOTS.filter((p) => map[p.key]?.file_url).length;
  const approved = PHOTO_SLOTS.filter((p) => map[p.key]?.approval_status === 'approved').length;
  return { isComplete, banner, uploaded, allUploaded: uploaded >= 8, allApproved: approved >= 8, instId: inst.id || null, schedDate, assignedName: inst.assigned_name || '' };
}
