/**
 * Money logic ported from the website: dealSubsidy(), computeDealLocal(), buildCashFlowTab() and
 * dcBuildCashFlowRows(). Same formulas and wording so the app shows the website's numbers.
 */
import { num, truthy, type FullCustomer } from './full-customer';

const r2 = (v: number) => Math.round(v * 100) / 100;
export const inr0 = (v: number) => '₹' + Math.round(v || 0).toLocaleString('en-IN');

/** PM Surya Ghar subsidy: 30,000/kW up to 2 kW; 60,000 + 18,000 per extra kW to 3 kW; cap 78,000. */
export function dealSubsidy(kw: unknown): number {
  const k = parseFloat(String(kw ?? '')) || 0;
  if (k <= 0) return 0;
  if (k <= 2) return Math.round(k * 30000);
  return Math.min(78000, Math.round(60000 + (k - 2) * 18000));
}

export interface DealInput {
  deal_price?: string | number; quotation_value?: string | number; project_cost?: string | number; system_kw?: string | number;
  disbursal_pct_1?: string | number; referral_total?: string | number; referral_stage1?: string | number; referral_stage2?: string | number;
  subsidy_shadow_receivable?: string | number; contribution_scenario?: string; payment_method?: string; cash_amount?: string | number; bank_name?: string; notes?: string;
}
export interface Deal {
  qv: number; dp: number; pc: number; kw: number; p1: number; p2: number; rt: number; rs1: number; rs2: number; ssr: number; sc: string;
  method: 'loan' | 'cash' | 'hybrid'; cashAmt: number; loanQuotation: number; inflation: number; contrib: number; bank_loan: number;
  disb1: number; disb2: number; subsidy: number; net_rev: number; margin_pct: number; vendor_float: number; flags: { type: 'info' | 'warn' | 'success'; msg: string }[];
}

/** computeDealLocal() — mirrors the backend computeDeal. */
export function computeDeal(f: DealInput): Deal {
  const pf = (v: unknown) => parseFloat(String(v ?? '')) || 0;
  const dp = pf(f.deal_price), pc = pf(f.project_cost), kw = pf(f.system_kw) || 3, p1 = pf(f.disbursal_pct_1) || 70;
  const p2 = parseFloat((100 - p1).toFixed(2));
  const rt = pf(f.referral_total), rs1 = pf(f.referral_stage1), rs2 = pf(f.referral_stage2), ssr = pf(f.subsidy_shadow_receivable);
  const sc = f.contribution_scenario || 'C';
  const method = (f.payment_method === 'cash' || f.payment_method === 'hybrid' ? f.payment_method : 'loan') as Deal['method'];
  const isCash = method === 'cash', isHybrid = method === 'hybrid';
  const cashAmt = isHybrid ? pf(f.cash_amount) : 0;
  let qv: number, lq: number;
  if (isCash) { qv = pf(f.quotation_value) || dp; lq = 0; }
  else if (isHybrid) { const rem = Math.max(0, dp - cashAmt); const autoLQ = r2(rem / 0.9); qv = pf(f.quotation_value) || r2(cashAmt + autoLQ); lq = r2(qv - cashAmt); }
  else { qv = pf(f.quotation_value) || r2(dp / 0.9); lq = qv; }
  const inflation = isCash ? 0 : r2(qv - dp);
  const contrib = isCash ? 0 : r2(lq * 0.1);
  const bank_loan = isCash ? 0 : r2(lq * 0.9);
  const disb1 = isCash ? 0 : r2((lq * p1) / 100);
  const disb2 = isCash ? 0 : r2((lq * p2) / 100);
  const subsidy = dealSubsidy(kw);
  const net_rev = r2(pc);
  const margin_pct = qv > 0 ? Math.round((net_rev / qv) * 10000) / 100 : 0;
  const vendor_float = !isCash && sc === 'B' ? contrib : 0;
  const flags: Deal['flags'] = [];
  if (!isCash && sc === 'B') flags.push({ type: 'info', msg: `Scenario B: vendor must float ${inr0(contrib)} upfront, tracked as receivable` });
  if (ssr > 0 && rs2 > 0) flags.push({ type: 'warn', msg: `Referral stage 2 (${inr0(rs2)}) depends on customer subsidy cooperation` });
  if (!isCash && inflation > 0) flags.push({ type: 'success', msg: `10% inflation (${inr0(inflation)}) is structural, always returns to source via 1st disbursal` });
  return { qv, dp, pc, kw, p1, p2, rt, rs1, rs2, ssr, sc, method, cashAmt, loanQuotation: lq, inflation, contrib, bank_loan, disb1, disb2, subsidy, net_rev, margin_pct, vendor_float, flags };
}

// ── Cash Flow tab ─────────────────────────────────────────────────────
export type RowType = 'actual' | 'paper' | 'float' | 'round-trip' | 'customer-owned' | 'shadow';
export interface FlowRow { n: number; from: string; to: string; amount: number; trigger: string; type: RowType; paper: boolean; state: 'received' | 'pending' | 'projected'; confirm?: 'returned' | 'float' }
export interface CashFlowView {
  hasDeal: boolean; method: 'loan' | 'cash' | 'hybrid'; scenarioLabel: string;
  header: { label: string; value: number; sub: string }[];
  rows: FlowRow[]; history: { label: string; value: number; date: string | null }[];
  floatConfirmed: boolean; contributionReturned: boolean;
  totals: { disbursed: number; cashCollected: number; cashTarget: number; cashPending: number };
}

export function cashFlowView(c: FullCustomer): CashFlowView {
  const qv = num(c.dc_quotation_value || c.quotation_value);
  const dp = num(c.dc_deal_price || c.deal_price);
  const pc = num(c.dc_project_cost || c.project_cost);
  const kw = num(c.system_kw) || 3;
  const p1 = num(c.dc_disbursal_pct_1 || c.disbursal_pct_1) || 70;
  const p2 = Math.round((100 - p1) * 100) / 100;
  const rs1 = num(c.dc_referral_stage1 || c.referral_stage1 || c.referral_s1_amount);
  const rs2 = num(c.dc_referral_stage2 || c.referral_stage2 || c.referral_s2_amount);
  const sc = String(c.dc_contribution_scenario || c.contribution_scenario || 'C');
  const ssr = num(c.dc_subsidy_shadow_receivable || c.subsidy_shadow_receivable);
  const rawMethod = String(c.payment_method || c.dc_payment_method || 'loan');
  const method = (rawMethod === 'cash' || rawMethod === 'hybrid' ? rawMethod : 'loan') as CashFlowView['method'];
  const cashAmt = num(c.cash_amount || c.dc_cash_amount);
  const loanQ = num(c.dc_loan_quotation || c.loan_quotation) || (method === 'hybrid' ? Math.max(0, qv - cashAmt) : qv);
  const subsidy = num(c.dc_subsidy_total || c.subsidy_amount) || dealSubsidy(kw);
  const isCash = method === 'cash';
  const contrib = isCash ? 0 : r2(loanQ * 0.1);
  const disb1 = isCash ? 0 : r2((loanQ * p1) / 100);
  const disb2 = isCash ? 0 : r2((loanQ * p2) / 100);
  const bank_loan = isCash ? 0 : r2(loanQ * 0.9);
  const cp = c.cash_payments || {};
  const i1 = num(cp.installment_1_amount), i2 = num(cp.installment_2_amount);
  const realDisb1 = num(c.amount_disbursed), realDisb2 = num(c.second_disbursal_amount);
  const projComplete = ['project_complete', 'subsidy_credited'].includes(String(c.status));
  const installComplete = ['installation_complete', 'net_meter_applied', 'net_meter_approved', 'net_meter_installed', 'subsidy_awaited', 'subsidy_credited', 'project_complete'].includes(String(c.status));
  const nmInstalled = ['net_meter_installed', 'subsidy_awaited', 'subsidy_credited', 'project_complete'].includes(String(c.status));
  const floatConfirmed = !!c.dc_vendor_float_confirmed_at;
  const contributionReturned = !!c.dc_contribution_returned_at;
  const s1Paid = truthy(c.referral_s1_paid), s2Paid = truthy(c.referral_s2_paid);

  const rows: FlowRow[] = [];
  let n = 1;
  const st = (d: boolean | undefined): FlowRow['state'] => (d === true ? 'received' : d === false ? 'pending' : 'projected');
  const row = (from: string, to: string, amount: number, trigger: string, type: RowType, paper = false, done?: boolean, confirm?: FlowRow['confirm']) =>
    rows.push({ n: n++, from, to, amount, trigger, type, paper, state: st(done), confirm });
  const lq = loanQ || 1;
  const pctOf = (v: number) => Math.round((v / lq) * 100);

  if (isCash) {
    const i1done = i1 > 0 || projComplete;
    const i2done = i2 > 0 || (projComplete && i1 >= qv);
    const i2needed = i1done && !i2done && i1 < qv && !projComplete;
    const pct = (v: number) => (qv > 0 ? Math.round((v / qv) * 100) : 0);
    if (i1done) {
      row('Customer', 'Company: Instalment 1', i1, `Cash instalment 1 (${pct(i1)}% of ₹${Math.round(qv).toLocaleString('en-IN')})`, 'actual', false, true);
      if (i2done) row('Customer', 'Company: Instalment 2', i2, `Cash instalment 2 (${pct(i2)}% of ₹${Math.round(qv).toLocaleString('en-IN')})`, 'actual', false, true);
      else if (i2needed) { const rem = qv - i1; row('Customer', 'Company: Instalment 2', rem, `Outstanding balance (${pct(rem)}%, ₹${Math.round(rem).toLocaleString('en-IN')} pending)`, 'actual', false, false); }
    } else row('Customer', 'Company (Cash)', qv, 'Customer pays agreed price in cash', 'actual', false, false);
    if (rs1 > 0) row('Company', 'Referral Agent', rs1, 'Stage 1 commission, after cash confirmed', 'actual', false, s1Paid || projComplete || undefined);
    row('Company', 'Vendor / Project', pc, 'Company settles project cost with vendor', 'actual', false, projComplete || undefined);
    row('Government', 'Customer a/c', subsidy, 'PM Surya Ghar subsidy, after net meter', 'customer-owned', false, projComplete || undefined);
    if (rs2 > 0) row('Company', 'Referral Agent', rs2, 'Stage 2 commission, after subsidy', 'actual', false, s2Paid || projComplete || undefined);
  } else if (method === 'hybrid') {
    const total = i1 + i2;
    const cashDone = cashAmt > 0 && total >= cashAmt;
    const d1 = realDisb1 > 0, d2 = realDisb2 > 0, nm = projComplete || nmInstalled;
    const cashLabel = i1 > 0 && i2 > 0 ? `Cash portion, ₹${Math.round(i1).toLocaleString('en-IN')} + ₹${Math.round(i2).toLocaleString('en-IN')}`
      : i1 > 0 ? `Cash portion, ₹${Math.round(i1).toLocaleString('en-IN')} received${total < cashAmt ? ' (partial)' : ''}` : 'Cash portion from customer';
    const cashState = cashDone ? true : i1 > 0 ? false : undefined;
    row('Customer', 'Company (Cash)', cashAmt, cashLabel, 'actual', false, cashState);
    if (sc === 'A') {
      row('Customer', 'Bank', contrib, '10% contribution, before loan sanction', 'actual', false, d1 || projComplete ? true : undefined);
      row('Bank', 'Vendor', d1 ? realDisb1 : disb1, `1st disbursal (~${pctOf(disb1)}% of loan portion)`, 'actual', false, d1 ? true : undefined);
      row('Vendor', 'Customer', contrib, 'Return of 10% contribution after 1st disbursal', 'round-trip', false, contributionReturned ? true : d1 ? false : undefined, d1 && !contributionReturned ? 'returned' : undefined);
    } else if (sc === 'B') {
      row('Vendor', 'Customer a/c', contrib, 'Vendor floats 10% before sanction', 'float', false, floatConfirmed ? true : undefined, floatConfirmed ? undefined : 'float');
      row('Bank', 'Vendor', d1 ? realDisb1 : disb1, `1st disbursal (~${pctOf(disb1)}% of loan portion), recovers float`, 'actual', false, d1 ? true : undefined);
    } else {
      row('Vendor', 'Customer', 0, 'Paper voucher as 10% proof', 'paper', true);
      row('Customer', 'Bank', 0, 'Voucher submitted to bank', 'paper', true);
      row('Bank', 'Vendor', d1 ? realDisb1 : disb1, `1st disbursal (~${pctOf(disb1)}% of loan portion)`, 'actual', false, d1 ? true : undefined);
    }
    if (rs1 > 0) row('Company', 'Referral Agent', rs1, 'Stage 1 commission, after 1st disbursal', 'actual', false, s1Paid ? true : d1 ? false : undefined);
    row('Bank', 'Vendor', d2 ? realDisb2 : disb2, `2nd disbursal (~${pctOf(disb2)}% of loan portion)`, 'actual', false, d2 ? true : d1 ? false : undefined);
    row('Company', 'Vendor / Project', pc, 'Company settles project cost, after full disbursal', 'actual', false, projComplete ? true : d2 ? false : undefined);
    row('Government', 'Customer a/c', subsidy, 'PM Surya Ghar subsidy, after net meter', 'customer-owned', false, projComplete ? true : nm ? false : undefined);
    if (rs2 > 0) row('Company', 'Referral Agent', rs2, 'Stage 2 commission, after subsidy', 'actual', false, s2Paid ? true : projComplete ? false : undefined);
  } else {
    const d1 = realDisb1 > 0, d2 = realDisb2 > 0, nm = projComplete || nmInstalled;
    if (sc === 'A') {
      row('Customer', 'Bank', contrib, '10% contribution, before loan sanction', 'actual', false, d1 || projComplete ? true : undefined);
      row('Bank', 'Vendor', d1 ? realDisb1 : disb1, `1st disbursal (~${pctOf(disb1)}% of quotation)`, 'actual', false, d1 ? true : undefined);
      row('Vendor', 'Customer', contrib, 'Return of 10% after 1st disbursal', 'round-trip', false, contributionReturned ? true : d1 ? false : undefined, d1 && !contributionReturned ? 'returned' : undefined);
    } else if (sc === 'B') {
      row('Vendor', 'Customer a/c', contrib, 'Vendor floats 10% before sanction', 'float', false, floatConfirmed ? true : undefined, floatConfirmed ? undefined : 'float');
      row('Bank', 'Vendor', d1 ? realDisb1 : disb1, `1st disbursal (~${pctOf(disb1)}%), recovers float`, 'actual', false, d1 ? true : undefined);
    } else {
      row('Vendor', 'Customer', 0, 'Paper voucher as 10% proof', 'paper', true);
      row('Customer', 'Bank', 0, 'Voucher submitted to bank', 'paper', true);
      row('Bank', 'Vendor', d1 ? realDisb1 : disb1, `1st disbursal (~${pctOf(disb1)}% of quotation)`, 'actual', false, d1 ? true : undefined);
    }
    if (rs1 > 0) row('Company', 'Referral Agent', rs1, 'Stage 1 commission, after 1st disbursal', 'actual', false, s1Paid ? true : d1 ? false : undefined);
    row('Bank', 'Vendor', d2 ? realDisb2 : disb2, `2nd disbursal (~${pctOf(disb2)}% of quotation)`, 'actual', false, d2 ? true : d1 ? false : undefined);
    row('Company', 'Vendor / Project', pc, 'Company settles project cost, after full disbursal', 'actual', false, projComplete ? true : d2 ? false : undefined);
    row('Government', 'Customer a/c', subsidy, 'After net meter installation', 'customer-owned', false, projComplete ? true : nm ? false : undefined);
    if (rs2 > 0) row('Company', 'Referral Agent', rs2, 'Stage 2 commission, after subsidy', 'actual', false, s2Paid ? true : projComplete ? false : undefined);
    if (ssr > 0) row('Customer', 'Company', ssr, 'Subsidy recovery from customer', 'shadow');
  }
  void installComplete;

  const header = method === 'cash'
    ? [{ label: 'Quotation', value: qv, sub: 'Customer agreed price' }, { label: 'Cash to Collect', value: qv, sub: 'From customer' }, { label: 'Project Cost', value: pc, sub: 'Execution cost' }, { label: 'Govt Subsidy', value: subsidy, sub: 'PM Surya Ghar' }]
    : method === 'hybrid'
      ? [{ label: 'Quotation', value: qv, sub: 'Total project value' }, { label: 'Cash Portion', value: cashAmt, sub: 'From customer' }, { label: 'Loan Portion', value: loanQ, sub: 'From bank' }, { label: 'Govt Subsidy', value: subsidy, sub: 'PM Surya Ghar' }]
      : [{ label: 'Quotation', value: qv, sub: 'Bank sanctions this' }, { label: 'Customer Loan', value: bank_loan, sub: '90%: EMI to bank' }, { label: 'Project Cost', value: pc, sub: 'Execution cost' }, { label: 'Govt Subsidy', value: subsidy, sub: 'PM Surya Ghar' }];
  const scenarioLabel = method === 'cash' ? 'Cash Payment' : method === 'hybrid' ? `Hybrid · Scenario ${sc}` : `Scenario ${sc}, ${({ A: 'Customer pays bank', B: 'Vendor floats', C: 'Paper voucher' } as Record<string, string>)[sc] ?? ''}`;

  const history: CashFlowView['history'] = [];
  if (i1 > 0) history.push({ label: 'Cash Instalment 1', value: i1, date: cp.installment_1_date ?? null });
  if (i2 > 0) history.push({ label: 'Cash Instalment 2', value: i2, date: cp.installment_2_date ?? null });
  if (realDisb1 > 0) history.push({ label: '1st Disbursal Received', value: realDisb1, date: (c.disbursed_at as string) ?? (c.first_disbursal_at as string) ?? null });
  if (realDisb2 > 0) history.push({ label: '2nd Disbursal Received', value: realDisb2, date: (c.second_disbursal_at as string) ?? null });
  if (s1Paid && num(c.referral_s1_amount) > 0) history.push({ label: 'Referral Stage 1 Paid', value: num(c.referral_s1_amount), date: (c.referral_s1_paid_at as string) ?? null });
  if (s2Paid && num(c.referral_s2_amount) > 0) history.push({ label: 'Referral Stage 2 Paid', value: num(c.referral_s2_amount), date: (c.referral_s2_paid_at as string) ?? null });

  const cashTarget = method === 'cash' ? qv : cashAmt;
  return {
    hasDeal: qv > 0, method, scenarioLabel, header, rows, history, floatConfirmed, contributionReturned,
    totals: { disbursed: realDisb1 + realDisb2, cashCollected: i1 + i2, cashTarget, cashPending: Math.max(0, cashTarget - i1 - i2) },
  };
}

/** Amount in words, Indian system — amountToWords() on the website, same output. */
export function amountInWords(v: unknown): string {
  const n = Math.round(Number(String(v ?? '').replace(/[,₹\s]/g, '')));
  if (!n || Number.isNaN(n) || n <= 0) return '';
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const w = (x: number): string => {
    if (x === 0) return '';
    if (x < 20) return ones[x] + ' ';
    if (x < 100) return tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : '') + ' ';
    if (x < 1000) return ones[Math.floor(x / 100)] + ' Hundred ' + w(x % 100);
    return w(x);
  };
  let r = '', x = n;
  if (x >= 10000000) { r += w(Math.floor(x / 10000000)) + 'Crore '; x %= 10000000; }
  if (x >= 100000) { r += w(Math.floor(x / 100000)) + 'Lakh '; x %= 100000; }
  if (x >= 1000) { r += w(Math.floor(x / 1000)) + 'Thousand '; x %= 1000; }
  if (x > 0) r += w(x);
  return '₹ ' + r.trim() + ' Only';
}
