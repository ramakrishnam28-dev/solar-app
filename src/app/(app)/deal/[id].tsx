import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { MoneyField, RadioField } from '@/components/fields';
import { FormScreen, Section } from '@/components/form-screen';
import { Banner, Btn, Screen } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import { ApiError } from '@/lib/api';
import { computeDeal, inr0, type DealInput } from '@/lib/deal';
import { loadFullCustomer, type FullCustomer } from '@/lib/full-customer';
import { SCENARIOS } from '@/lib/progress-cards';
import { api } from '@/state/api';
import { bumpData } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

const METHODS = [
  { value: 'loan', label: 'Loan', hint: 'Bank loan for the quotation (90%), 10% contribution scenario applies.' },
  { value: 'cash', label: 'Cash', hint: 'Customer pays the agreed price in cash. No loan stages.' },
  { value: 'hybrid', label: 'Hybrid', hint: 'Part cash from the customer, the rest as a bank loan.' },
];

/** Deal Calculator (website dcSave / computeDealLocal). Save: admin, finance (server rule). */
export default function DealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { data, error, reload } = useLoad(() => loadFullCustomer(api, String(id), user?.role), [id]);
  if (error && !data) return <Screen><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></Screen>;
  if (!data) return <Screen><Text style={{ color: colors.ink3, fontSize: font.body }}>Loading deal…</Text></Screen>;
  return <DealForm c={data} />;
}

const s = (v: unknown) => (v === null || v === undefined || Number(v) === 0 ? '' : String(Math.round(Number(v) * 100) / 100));

function DealForm({ c }: { c: FullCustomer }) {
  const { user } = useSession();
  const canSave = can.saveDeal(user?.role);
  const [f, setF] = useState<DealInput>(() => ({
    payment_method: String(c.payment_method || 'loan'), deal_price: s(c.dc_deal_price), quotation_value: s(c.dc_quotation_value || c.quotation_value),
    project_cost: s(c.dc_project_cost), cash_amount: s(c.cash_amount), system_kw: s(c.system_kw) || '3', contribution_scenario: String(c.dc_contribution_scenario || 'C'),
    referral_total: s(Number(c.dc_referral_stage1 || 0) + Number(c.dc_referral_stage2 || 0)), referral_stage1: s(c.dc_referral_stage1), referral_stage2: s(c.dc_referral_stage2),
    disbursal_pct_1: s(c.dc_disbursal_pct_1) || '70', subsidy_shadow_receivable: s(c.dc_subsidy_shadow_receivable),
  }));
  const qvTouched = useRef(!!s(c.dc_quotation_value || c.quotation_value));
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof DealInput) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  const d = computeDeal(f);

  // dcAutoQuotation: quotation follows the agreed price until typed by hand
  useEffect(() => {
    if (qvTouched.current) return;
    const auto = computeDeal({ ...f, quotation_value: '' }).qv;
    setF((p) => ({ ...p, quotation_value: auto ? String(Math.round(auto)) : '' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.deal_price, f.payment_method, f.cash_amount]);

  const refTotal = (v: string) => { const t = parseFloat(v) || 0; const half = Math.round(t / 2); setF((p) => ({ ...p, referral_total: v, referral_stage1: v ? String(half) : '', referral_stage2: v ? String(t - half) : '' })); };
  const refStage = (k: 'referral_stage1' | 'referral_stage2') => (v: string) => setF((p) => { const n = { ...p, [k]: v }; n.referral_total = String((parseFloat(String(n.referral_stage1)) || 0) + (parseFloat(String(n.referral_stage2)) || 0)); return n; });

  const save = async () => {
    if (!(parseFloat(String(f.quotation_value)) > 0) || !(parseFloat(String(f.project_cost)) > 0)) { setMsg({ ok: false, text: 'Quotation value and project cost are required' }); return; }
    setBusy(true); setMsg(null);
    try {
      const method = f.payment_method || 'loan';
      const saved = await api.post<{ saved?: { payment_method?: string } }>(`/finance/deal-calculator/${encodeURIComponent(c.id)}`, {
        deal_price: parseFloat(String(f.deal_price)) || 0, quotation_value: parseFloat(String(f.quotation_value)) || 0, project_cost: parseFloat(String(f.project_cost)) || 0,
        system_kw: parseFloat(String(f.system_kw)) || 3, bank_name: '', disbursal_pct_1: parseFloat(String(f.disbursal_pct_1)) || 70,
        contribution_scenario: f.contribution_scenario || 'C', referral_total: parseFloat(String(f.referral_total)) || 0,
        referral_stage1: parseFloat(String(f.referral_stage1)) || 0, referral_stage2: parseFloat(String(f.referral_stage2)) || 0,
        subsidy_shadow_receivable: parseFloat(String(f.subsidy_shadow_receivable)) || 0, notes: '', payment_method: method,
        cash_amount: method === 'hybrid' ? parseFloat(String(f.cash_amount)) || 0 : null,
      });
      bumpData();
      if (saved?.saved?.payment_method === 'cash' && method === 'hybrid') { setMsg({ ok: true, text: 'Cash amount covers full quotation, switched to Cash method automatically.' }); return; }
      router.back();
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : 'Save failed' }); } finally { setBusy(false); }
  };

  const isCash = d.method === 'cash';
  return (
    <FormScreen title="Deal Calculator" sub={`${c.name} · ${f.system_kw} kW`} bottom={canSave ? <Btn label="Save to Customer" onPress={save} loading={busy} disabled={busy} style={{ flex: 1 }} /> : undefined}>
      {!canSave ? <Banner tone="waiting">Only admin and finance can save a deal. You can check the numbers here.</Banner> : null}
      {msg ? <Banner tone={msg.ok ? 'done' : 'problem'}>{msg.text}</Banner> : null}
      <Section title="Payment method"><RadioField label="Payment method" options={METHODS} value={String(f.payment_method)} onChange={set('payment_method')} /></Section>
      <Section title="Price">
        <MoneyField label="Customer agreed price (₹)" value={String(f.deal_price ?? '')} onChange={set('deal_price')} placeholder="210000" />
        <MoneyField label="Quotation value (₹)" value={String(f.quotation_value ?? '')} onChange={(v) => { qvTouched.current = true; set('quotation_value')(v); }} placeholder="233333" />
        <MoneyField label="Project cost (₹)" value={String(f.project_cost ?? '')} onChange={set('project_cost')} placeholder="190000" />
        {d.method === 'hybrid' ? <MoneyField label="Cash amount to collect from customer (₹)" value={String(f.cash_amount ?? '')} onChange={set('cash_amount')} placeholder="50000" /> : null}
      </Section>
      <Section title="Referral commission">
        <MoneyField label="Total (₹)" value={String(f.referral_total ?? '')} onChange={refTotal} placeholder="0" />
        <MoneyField label="Stage 1 (₹)" value={String(f.referral_stage1 ?? '')} onChange={refStage('referral_stage1')} placeholder="0" />
        <MoneyField label="Stage 2 (₹)" value={String(f.referral_stage2 ?? '')} onChange={refStage('referral_stage2')} placeholder="0" />
      </Section>
      {!isCash ? <Section title="10% contribution scenario"><RadioField label="Scenario" options={SCENARIOS} value={String(f.contribution_scenario)} onChange={set('contribution_scenario')} /></Section> : null}
      <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[4] }}>
        <Text style={{ color: colors.mint, fontSize: font.small, marginBottom: space[2] }}>Breakdown</Text>
        {([
          ['Quotation', d.qv], ...(isCash ? [] : [['Loan quotation', d.loanQuotation], ['Customer loan (90%)', d.bank_loan], ['10% contribution', d.contrib], [`1st disbursal (${d.p1}%)`, d.disb1], [`2nd disbursal (${d.p2}%)`, d.disb2]]),
          ['Project cost (net revenue)', d.net_rev], ['Govt subsidy', d.subsidy],
        ] as [string, number][]).map(([l, v]) => (
          <View key={l} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 }}>
            <Text style={{ color: colors.mint, fontSize: font.small }}>{l}</Text><Text style={{ color: colors.white, fontSize: font.body, fontWeight: '700' }}>{inr0(v)}</Text>
          </View>
        ))}
        <Text style={{ color: colors.mint, fontSize: font.caption, marginTop: space[2] }}>Margin {d.margin_pct}% of quotation</Text>
      </View>
      {d.flags.map((fl) => <View key={fl.msg} style={{ marginTop: space[2] }}><Banner tone={fl.type === 'warn' ? 'waiting' : fl.type === 'success' ? 'done' : 'progress'}>{fl.msg}</Banner></View>)}
    </FormScreen>
  );
}
