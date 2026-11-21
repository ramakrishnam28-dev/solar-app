/**
 * The requests behind each Update Progress button, ported from the website's up* functions.
 * Values are checked here first so a bad form never reaches the server.
 */
import type { ApiClient } from './api';
import type { Op } from './progress-cards';

type Api = Pick<ApiClient, 'patch' | 'post'>;
const enc = encodeURIComponent;
export class FormProblem extends Error { field?: string; constructor(msg: string, field?: string) { super(msg); this.field = field; } }

export const parseMoney = (v: unknown) => { const n = parseFloat(String(v ?? '').replace(/[,₹\s]/g, '')); return Number.isFinite(n) ? n : NaN; };
const need = (ok: boolean, msg: string, field?: string) => { if (!ok) throw new FormProblem(msg, field); };

export interface OpContext { id: string; values: Record<string, string>; args?: Record<string, unknown>; status?: string | null; paymentMethod?: string | null }

/** Runs one op. Returns the success message shown to the user. */
export async function runOp(api: Api, op: Op, ctx: OpContext): Promise<string> {
  const { id, values: v, args = {} } = ctx;
  const cid = enc(id);
  const status = (to: string) => api.patch(`/customers/${cid}/status`, { status: to });
  switch (op) {
    case 'status': await status(String(args.to)); return 'Updated.';
    case 'startInstallation': {
      if (ctx.paymentMethod === 'cash' && ['pmsg_registered', 'loan_ready', 'loan_applied', 'loan_sanctioned'].includes(String(ctx.status))) {
        try { await status('amount_disbursed'); } catch { /* same as website: ignored */ }
      }
      await api.patch(`/customers/${cid}/installation`, { action: 'start' });
      return 'Installation process started.';
    }
    case 'cashPayment': {
      const amount = parseMoney(v.amount);
      need(amount > 0, 'Enter a valid amount', 'amount');
      const r = await api.post<{ fully_paid?: boolean }>(`/customers/${cid}/cash-payment`, { installment: Number(args.installment), amount, notes: v.notes || '' });
      return r?.fully_paid ? 'Cash payment fully received.' : `Instalment ${args.installment} recorded, ₹${amount.toLocaleString('en-IN')}.`;
    }
    case 'hybridCash': {
      const amount = parseMoney(v.amount);
      need(amount > 0, 'Enter a valid amount', 'amount');
      need(!!v.date, 'Enter the date received', 'date');
      await api.post(`/customers/${cid}/cash-payment`, { installment: Number(args.installment) || 1, amount, date: v.date, notes: 'Hybrid cash portion collected' });
      return 'Cash instalment recorded.';
    }
    case 'referral': {
      const amount = parseMoney(v.amount);
      need(amount > 0, 'Enter a valid amount', 'amount');
      await api.patch(`/customers/${cid}/referral`, { stage: Number(args.stage), amount, paid_at: new Date().toISOString() });
      return `Stage ${args.stage} referral ₹${amount.toLocaleString('en-IN')} recorded.`;
    }
    case 'submitLoan': {
      const bank = (v.bank || '').trim(); const amount = parseMoney(v.amount);
      need(!!bank, 'Bank name is required', 'bank');
      need(amount > 0, 'Loan amount is required', 'amount');
      const branch = (v.branch || '').trim(); const ifsc = (v.ifsc || '').trim().toUpperCase(); const appno = (v.appno || '').trim();
      await api.patch(`/customers/${cid}`, { loan_bank: bank, loan_branch: branch, loan_ifsc: ifsc, loan_amount: amount, loan_application_no: appno, bank_name: bank, bank_branch: branch, bank_ifsc: ifsc });
      await status('loan_applied');
      return 'Loan application submitted.';
    }
    case 'loanRejected': {
      const reason = (v.reason || '').trim();
      need(!!reason, 'Please enter rejection reason', 'reason');
      await api.patch(`/customers/${cid}`, { loan_rejection_reason: reason });
      await status('loan_rejected');
      return 'Loan marked as rejected.';
    }
    case 'loanApproved': await status('loan_sanctioned'); return 'Loan sanctioned. Now confirm the 10% contribution scenario.';
    case 'confirmScenario': {
      need(['A', 'B', 'C'].includes(v.scenario), 'Please select a scenario', 'scenario');
      await api.patch(`/finance/deal-calculator/${cid}/confirm-scenario`, { scenario: v.scenario });
      return `Scenario ${v.scenario} confirmed.`;
    }
    case 'vendorFloat': await api.patch(`/finance/deal-calculator/${cid}/vendor-float-confirm`, {}); return 'Vendor float confirmed.';
    case 'contributionReturned': await api.patch(`/finance/deal-calculator/${cid}/contribution-returned`, {}); return '10% contribution return confirmed.';
    case 'confirmDisbursal': {
      const amt = parseMoney(v.amount);
      need(amt > 0, 'Please enter disbursed amount', 'amount');
      const loanAmt = Number(args.loanAmt) || 0;
      const pct = loanAmt > 0 ? (amt / loanAmt) * 100 : 100;
      const next = pct >= 99 ? 'disbursed_full' : 'disbursed_partial';
      await api.patch(`/customers/${cid}`, { amount_disbursed: amt, loan_sanctioned: true });
      if (args.status === 'loan_applied') await status('loan_sanctioned');
      await status(next);
      return pct >= 99 ? 'Amount fully disbursed.' : `First disbursal ${Math.round(pct)}% recorded.`;
    }
    case 'disbursal2': {
      const amount = parseMoney(v.amount);
      need(amount > 0, 'Enter 2nd disbursal amount', 'amount');
      await api.patch(`/customers/${cid}/disbursal2`, { amount });
      try { await api.patch(`/customers/${cid}/installation`, { action: 'complete' }); } catch { /* may already be complete */ }
      return `2nd disbursal ₹${amount.toLocaleString('en-IN')} recorded.`;
    }
    case 'assignInstaller':
      need(!!v.installer, 'Select an installer first', 'installer');
      await api.patch(`/customers/${cid}/installation`, { action: 'assign', installer_id: v.installer });
      return 'Installer assigned.';
    case 'scheduleInstall':
      need(/^\d{4}-\d{2}-\d{2}$/.test(v.date || ''), 'Select a date first', 'date');
      await api.patch(`/customers/${cid}/installation`, { action: 'schedule', date: v.date });
      return `Installation scheduled for ${new Date(v.date).toLocaleDateString('en-IN')}.`;
    case 'installComplete': await api.patch(`/customers/${cid}/installation`, { action: 'complete' }); return 'Installation marked complete.';
    case 'nmSubmit':
      need(/^\d{4}-\d{2}-\d{2}$/.test(v.date || ''), 'Please select the document submission date', 'date');
      await api.patch(`/customers/${cid}/netmeter`, { action: 'submitted', submission_date: v.date });
      return 'DISCOM document submission date recorded.';
    case 'netMeter': {
      await api.patch(`/customers/${cid}/netmeter`, { action: String(args.action) });
      return ({ applied: 'Net meter applied to DISCOM.', approved: 'Net meter approved.', installed: 'Net meter installed.' } as Record<string, string>)[String(args.action)] ?? 'Updated.';
    }
    case 'appInstalled': await api.patch(`/customers/${cid}/netmeter`, { action: 'app_installed' }); return 'Solar monitoring app marked as installed.';
    case 'subsidyCredited': await api.patch(`/customers/${cid}/subsidy`, { credited: true }); return 'Subsidy marked as credited.';
    case 'requestCompletion': await api.post(`/customers/${cid}/completion/request`, {}); return 'Completion requested. Waiting for approval.';
    case 'approveCompletion': await api.patch(`/customers/${cid}/completion/review`, { action: 'approve' }); return 'Project marked complete.';
    case 'sendBackCompletion': {
      const note = (v.note || '').trim();
      need(!!note, 'A reason is required to send it back', 'note');
      await api.patch(`/customers/${cid}/completion/review`, { action: 'reject', note });
      return 'Sent back to the requester.';
    }
    default: return '';
  }
}

/** Photo approval (installation photos and net meter photo). */
export async function approvePhoto(api: Api, id: string, label: string, action: 'approved' | 'rejected', note?: string | null) {
  await api.patch(`/customers/${enc(id)}/installation/photos/approve`, { label, action, note: note || null });
}
export async function nmPhotoReview(api: Api, id: string, action: 'approve' | 'reupload') {
  await api.patch(`/customers/${enc(id)}/netmeter/approve`, { action });
}
export async function fetchInstallers(api: Pick<ApiClient, 'get'>): Promise<{ id: string; name: string; phone?: string | null }[]> {
  const r = await api.get<unknown>('/customers/team/installers');
  return Array.isArray(r) ? (r as { id: string; name: string; phone?: string }[]) : [];
}
