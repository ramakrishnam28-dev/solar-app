import test from 'node:test';
import assert from 'node:assert/strict';

import { mergeFull, type FullCustomer } from '../full-customer';
import { canOp, installerView, progressView } from '../progress-cards';
import { runOp, FormProblem } from '../progress-ops';
import { amountInWords, cashFlowView, computeDeal, dealSubsidy } from '../deal';
import { kycPayload, validateKyc, kycFrom } from '../kyc';
import { auditCats, auditWhy, catOf } from '../audit';

const base = (extra: Record<string, unknown> = {}, deal: Record<string, unknown> | null = null, cash: Record<string, unknown> | null = null, photos: Record<string, unknown> | null = null): FullCustomer =>
  mergeFull({ id: 'c1', name: 'Anjali', ...extra } as never, deal, cash as never, photos);
const titles = (c: FullCustomer, role = 'admin') => progressView(c, role).cards.map((x) => x.title);

test('progress: KYC, deal and PMSG gates match the website', () => {
  assert.deepEqual(titles(base({ status: 'kyc_pending' })), ['Complete KYC']);
  assert.deepEqual(titles(base({ status: 'onboarded' })), ['Complete KYC Details']);
  assert.deepEqual(titles(base({ status: 'onboarded', pan: 'ABCDE1234F' })), ['Set Up Deal Calculator']);
  assert.deepEqual(titles(base({ status: 'onboarded', pan: 'ABCDE1234F', quotation_value: 233333 })), ['Customer Onboarded']);
  assert.deepEqual(titles(base({ status: 'pmsg_pending' })), ['PM Surya Ghar Registration']);
  assert.deepEqual(titles(base({ status: 'pmsg_registered' })), ['PMSG Done: Proceed to Loan']);
  const cash = base({ status: 'pmsg_registered', payment_method: 'cash', dc_quotation_value: 200000 });
  assert.deepEqual(titles(cash), ['Enter Payment Particulars']);
  const cashPart = base({ status: 'pmsg_registered', payment_method: 'cash', dc_quotation_value: 200000, lead_source: 'referral' }, null, { installment_1_amount: 50000 });
  assert.deepEqual(titles(cashPart), ['Cash Collection', 'Referral Stage 1 Commission', 'Start Installation']);
});

test('progress: loan path with scenario gates and disbursal', () => {
  assert.deepEqual(titles(base({ status: 'loan_ready' })), ['Apply for JanSamarth Loan']);
  assert.deepEqual(titles(base({ status: 'loan_reapplication' })), ['Re-apply with Another Bank']);
  const applied = progressView(base({ status: 'loan_applied', loan_bank: 'SBI', loan_amount: 250000 }), 'admin').cards[0];
  assert.equal(applied.title, 'Loan Applied: Awaiting Decision');
  assert.deepEqual(applied.actions!.map((a) => a.op), ['loanRejected', 'loanApproved']);
  assert.deepEqual(titles(base({ status: 'loan_sanctioned' })), ['Confirm 10% Contribution Scenario']);
  assert.deepEqual(titles(base({ status: 'loan_sanctioned', dc_contribution_scenario: 'B' }, { contribution_scenario: 'B', scenario_confirmed_at: 'x' })), ['Confirm Vendor Float']);
  assert.deepEqual(titles(base({ status: 'loan_sanctioned' }, { contribution_scenario: 'C', scenario_confirmed_at: 'x' })), ['Confirm 1st Disbursal']);
  const hyb = base({ status: 'loan_sanctioned', payment_method: 'hybrid', cash_amount: 50000 }, { contribution_scenario: 'C', scenario_confirmed_at: 'x', payment_method: 'hybrid', cash_amount: 50000 });
  assert.deepEqual(titles(hyb), ['Collect Cash Instalment']);
  const disb = base({ status: 'disbursed_partial', loan_amount: 300000, amount_disbursed: 210000 });
  assert.deepEqual(titles(disb), ['Disbursal']);
});

test('progress: installation, 2nd disbursal, net meter, subsidy, completion gates', () => {
  const inst = base({ status: 'disbursed_full', installation_id: 'i1', loan_amount: 300000, amount_disbursed: 300000 });
  const card = progressView(inst, 'admin').cards[0];
  assert.equal(card.title, 'Installation');
  assert.equal(card.install!.hasInstaller, false);
  const nm = base({ status: 'net_meter_applied', loan_amount: 300000, amount_disbursed: 210000 });
  assert.deepEqual(titles(nm), ['2nd Disbursal Pending', 'Net Metering']);
  assert.equal(progressView(nm, 'admin').cards[1].netmeter!.activeSubmit, true);
  const nmi = base({ status: 'net_meter_installed', loan_amount: 300000, amount_disbursed: 300000, second_disbursal_amount: 1 });
  const nmCards = progressView(nmi, 'admin').cards;
  assert.deepEqual(nmCards.map((x) => x.title), ['Install Solar Monitoring App on Consumer Device', 'Net Meter Installed']);
  assert.equal(nmCards[1].actions![0].disabledNote, 'Install the solar monitoring app on consumer device first');
  const sub = base({ status: 'subsidy_credited', consumer_app_installed: true, loan_amount: 300000, amount_disbursed: 300000 });
  assert.deepEqual(titles(sub, 'admin'), ['Ready to Complete']);
  assert.equal(progressView(sub, 'admin').cards[0].actions![0].label, 'Mark Project Complete');
  assert.equal(progressView(sub, 'sales_agent').cards[0].actions![0].op, 'requestCompletion');
  const subA = base({ status: 'subsidy_credited', consumer_app_installed: true, dc_contribution_scenario: 'A', quotation_value: 300000 });
  assert.deepEqual(titles(subA), ['Confirm 10% Returned to Customer']);
  const subRef = base({ status: 'subsidy_credited', consumer_app_installed: true, lead_source: 'referral', referral_s1_paid: true });
  assert.deepEqual(titles(subRef), ['Referral Stage 2 Commission', 'Referral Commission Pending']);
  assert.ok(progressView(base({ status: 'project_complete' })).complete);
});

test('progress: roles that the server would refuse get the action disabled', () => {
  assert.equal(canOp('referral', 'sales_agent'), false);
  assert.equal(canOp('referral', 'manager'), true);
  assert.equal(canOp('subsidyCredited', 'finance'), false);
  assert.equal(canOp('disbursal2', 'loan_officer'), true);
  assert.equal(canOp('status', 'builder'), true);
  assert.equal(canOp('openDeal', 'sales_agent'), false);
});

test('progress ops send the same requests as the website', async () => {
  const calls: string[] = [];
  const fake = { patch: async (p: string, b: unknown) => { calls.push('PATCH ' + p + ' ' + JSON.stringify(b)); return {}; }, post: async (p: string, b: unknown) => { calls.push('POST ' + p + ' ' + JSON.stringify(b)); return { fully_paid: false }; } };
  await runOp(fake as never, 'confirmDisbursal', { id: 'c1', values: { amount: '210000' }, args: { loanAmt: 300000, status: 'loan_sanctioned' } });
  assert.deepEqual(calls.splice(0), ['PATCH /customers/c1 {"amount_disbursed":210000,"loan_sanctioned":true}', 'PATCH /customers/c1/status {"status":"disbursed_partial"}']);
  await runOp(fake as never, 'submitLoan', { id: 'c1', values: { bank: 'SBI', amount: '250000', ifsc: 'sbin0001' } });
  assert.equal(calls[0], 'PATCH /customers/c1 {"loan_bank":"SBI","loan_branch":"","loan_ifsc":"SBIN0001","loan_amount":250000,"loan_application_no":"","bank_name":"SBI","bank_branch":"","bank_ifsc":"SBIN0001"}');
  assert.equal(calls[1], 'PATCH /customers/c1/status {"status":"loan_applied"}');
  calls.length = 0;
  await assert.rejects(runOp(fake as never, 'cashPayment', { id: 'c1', values: { amount: '' }, args: { installment: 1 } }), FormProblem);
  assert.equal(calls.length, 0);
  await runOp(fake as never, 'hybridCash', { id: 'c1', values: { amount: '50000', date: '2026-11-20' }, args: { installment: 1 } });
  assert.equal(calls[0], 'POST /customers/c1/cash-payment {"installment":1,"amount":50000,"date":"2026-11-20","notes":"Hybrid cash portion collected"}');
  calls.length = 0;
  await runOp(fake as never, 'startInstallation', { id: 'c1', values: {}, status: 'pmsg_registered', paymentMethod: 'cash' });
  assert.deepEqual(calls, ['PATCH /customers/c1/status {"status":"amount_disbursed"}', 'PATCH /customers/c1/installation {"action":"start"}']);
});

test('deal math matches the website formulas', () => {
  assert.equal(dealSubsidy(3), 78000);
  assert.equal(dealSubsidy(2), 60000);
  assert.equal(dealSubsidy(1.5), 45000);
  const d = computeDeal({ deal_price: 210000, project_cost: 190000, system_kw: 3, payment_method: 'loan' });
  assert.equal(d.qv, 233333.33);
  assert.equal(d.contrib, 23333.33);
  assert.equal(d.bank_loan, 210000);
  assert.equal(d.disb1, 163333.33);
  const h = computeDeal({ deal_price: 210000, payment_method: 'hybrid', cash_amount: 30000 });
  assert.equal(h.loanQuotation, 200000);
  assert.equal(amountInWords(233333), '₹ Two Lakh Thirty Three Thousand Three Hundred Thirty Three Only');
});

test('cash flow rows follow the scenario', () => {
  const c = base({ status: 'disbursed_partial', payment_method: 'loan', dc_quotation_value: 300000, dc_project_cost: 200000, system_kw: 3, amount_disbursed: 210000, dc_contribution_scenario: 'C' });
  const v = cashFlowView(c);
  assert.deepEqual(v.rows.map((r) => `${r.from}>${r.to}:${r.state}`), ['Vendor>Customer:projected', 'Customer>Bank:projected', 'Bank>Vendor:received', 'Bank>Vendor:pending', 'Company>Vendor / Project:projected', 'Government>Customer a/c:projected']);
  assert.equal(v.header[1].value, 270000);
  const cash = cashFlowView(base({ payment_method: 'cash', dc_quotation_value: 200000, status: 'pmsg_registered' }, null, { installment_1_amount: 50000 }));
  assert.equal(cash.rows[1].state, 'pending');
  assert.equal(cash.totals.cashPending, 150000);
  assert.equal(cashFlowView(base({})).hasDeal, false);
});

test('KYC rules and payload match the website', () => {
  const f = kycFrom({ id: 'c1', name: 'anjali devi' } as never);
  const e = validateKyc(f, false);
  assert.ok(e.aadhaar && e.pan && e.system_kw);
  f.aadhaar = '1234-5678-9012'; f.pan = 'ABCDE1234F'; f.system_kw = '3'; f.field_visit = 'yes'; f.company = 'APCPDCL';
  assert.deepEqual(validateKyc(f, false), {});
  const p = kycPayload(f, { name: 'Ravi', emp_id: 'EMP-1', role: 'sales_agent' });
  assert.equal(p.aadhaar, '123456789012');
  assert.equal(p.account_holder, 'ANJALI DEVI');
  assert.equal(p.field_visit_done, true);
  assert.equal('bank_account' in p, false);
  assert.deepEqual(validateKyc({ ...f, aadhaar: '' }, true), {});
});

test('installer view and audit helpers', () => {
  const c = base({ status: 'disbursed_full', installation_id: 'i1', inst_scheduled_date: '2020-01-01' }, null, null, { photos: [{ label: 'panels_array', file_url: 'u', approval_status: 'approved' }] });
  const v = installerView(c);
  assert.equal(v.banner.title, 'Under Process');
  assert.equal(v.uploaded, 1);
  assert.equal(catOf('loan').label, 'Loan');
  assert.deepEqual(auditCats([{ category: 'loan' }, { category: 'loan' }, {}]), ['loan', 'system']);
  assert.equal(auditWhy({ metadata: '{"reason":"typo"}' }), 'typo');
});
