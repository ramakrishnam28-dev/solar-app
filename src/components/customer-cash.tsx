import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { ActionModal, Choice } from '@/components/action-modal';
import { Banner, Btn, Field } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import type { Customer } from '@/lib/customers';
import { dateShort, inr } from '@/lib/format';
import { cashAmountError, computeCashFlow, fetchCashPayments, recordCashPayment, type MoneyStep } from '@/lib/money';
import { api } from '@/state/api';
import { useLoad } from '@/state/useLoad';

type Filter = 'all' | 'received' | 'projected';
const PART_COLORS = [colors.bar[3], colors.mint, colors.bar[4]];

/** Cash flow tab (wireframe A5): quotation split, two tiles, money steps, record payment. */
export function CustomerCash({ c, role, rk, onChanged, recordOpen, setRecordOpen }: {
  c: Customer; role?: string; rk: number; onChanged: (msg: string) => void; recordOpen: boolean; setRecordOpen: (v: boolean) => void;
}) {
  const method = String(c.payment_method ?? 'loan').toLowerCase();
  const usesCash = method === 'cash' || method === 'hybrid';
  const { data: cash, error, loading, reload } = useLoad(
    () => (usesCash && can.cashView(role) ? fetchCashPayments(api, c.id) : Promise.resolve(null)), [c.id, rk, usesCash]);
  const [filter, setFilter] = useState<Filter>('all');
  const flow = computeCashFlow(c, cash ?? null);
  const steps = flow.steps.filter((s) => filter === 'all' || s.state === filter);
  const total = flow.parts.reduce((a, p) => a + p.amount, 0);

  if (role === 'installer') return <Banner tone="inactive">Your role cannot see money for this customer.</Banner>;

  return (
    <>
      <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[4], marginBottom: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: colors.mint, fontSize: font.small }}>Quotation{flow.method === 'loan' ? ' (bank sanctions)' : ''}</Text>
          <View style={{ backgroundColor: colors.heroSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: colors.white, fontSize: font.caption, fontWeight: '600' }}>{flow.method === 'cash' ? 'Cash' : flow.method === 'hybrid' ? 'Hybrid' : c.dc_contribution_scenario ? `Scenario ${String(c.dc_contribution_scenario)}` : 'Loan'}</Text>
          </View>
        </View>
        <Text style={{ color: colors.white, fontSize: 34, fontWeight: '700', marginVertical: space[2] }}>{flow.quotation ? inr(flow.quotation) : 'No quotation yet'}</Text>
        {total > 0 ? (
          <>
            <View style={{ flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.heroSoft }} accessibilityLabel={flow.parts.map((p) => `${p.label} ${inr(p.amount)}`).join(', ')}>
              {flow.parts.map((p, i) => <View key={p.label} style={{ flex: p.amount, backgroundColor: PART_COLORS[i] }} />)}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[3], marginTop: space[2] }}>
              {flow.parts.map((p, i) => (
                <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <View style={{ width: 8, height: 8, backgroundColor: PART_COLORS[i] }} />
                  <Text style={{ color: colors.mint, fontSize: font.caption }}>{p.label} {inr(p.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : <Text style={{ color: colors.mint, fontSize: font.small }}>Save the deal on the web to see the split.</Text>}
      </View>

      <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
        <Tile label="Project cost" value={flow.projectCost ? inr(flow.projectCost) : '–'} bg={colors.tileGrey} />
        <Tile label="Govt subsidy" value={flow.subsidy ? inr(flow.subsidy) : '–'} bg={colors.tileGreen} />
      </View>

      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space[2] }}>
        {(['all', 'received', 'projected'] as Filter[]).map((k) => {
          const on = k === filter;
          const label = k === 'all' ? 'All steps' : k === 'received' ? 'Received' : 'Projected';
          return (
            <Pressable key={k} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} onPress={() => setFilter(k)}
              style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: on ? colors.mint : colors.ink, backgroundColor: on ? colors.mint : colors.surface }}>
              {on ? <Ionicons name="checkmark" size={15} color={colors.mintInk} /> : null}
              <Text style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.mintInk : colors.ink }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: space[1] }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>Money steps</Text>
        <Text style={{ fontSize: font.small, color: colors.ink2 }}>{flow.received} of {flow.steps.length} received</Text>
      </View>
      {usesCash && !can.cashView(role) ? <Banner tone="inactive">Cash installments are not shown to your role, so they appear as projected.</Banner> : null}
      {error && usesCash ? <Banner tone="waiting">Cash payments did not load: {error}</Banner> : null}
      {loading && usesCash && !cash ? <ActivityIndicator color={colors.brand} /> : null}
      {steps.length === 0 ? <Text style={{ fontSize: font.small, color: colors.ink2, paddingVertical: space[3] }}>Nothing here.</Text>
        : steps.map((s, i) => <StepRow key={s.key} s={s} n={flow.steps.indexOf(s) + 1} last={i === steps.length - 1} />)}
      {error && usesCash ? <Btn label="Try again" variant="secondary" onPress={reload} /> : null}

      {recordOpen ? (
        <RecordPayment c={c} next={flow.nextInstallment} due={flow.cashDue}
          onClose={() => setRecordOpen(false)}
          onDone={(m) => { setRecordOpen(false); onChanged(m); }} />
      ) : null}
    </>
  );
}

function Tile({ label, value, bg }: { label: string; value: string; bg: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: radius.md, padding: space[3] }}>
      <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{label}</Text>
      <Text style={{ fontSize: font.title, fontWeight: '700', color: colors.ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function StepRow({ s, n, last }: { s: MoneyStep; n: number; last: boolean }) {
  const got = s.state === 'received';
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 60, borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border, gap: space[3] }}
      accessible accessibilityLabel={`${s.title}, ${s.sub}, ${s.amount ? inr(s.amount) : 'amount not known'}, ${got ? 'received' : 'projected'}`}>
      <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: got ? colors.brand : colors.tileGreen, alignItems: 'center', justifyContent: 'center' }}>
        {got ? <Ionicons name="checkmark" size={16} color={colors.white} /> : <Text style={{ fontSize: font.small, color: colors.mintInk }}>{n}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{s.title}</Text>
        <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{s.sub}{got && s.date ? ` · ${dateShort(s.date)}` : ''}</Text>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{s.amount ? inr(s.amount) : '–'}</Text>
        <Text style={{ fontSize: font.caption, color: got ? colors.brand : colors.ink3 }}>{got ? 'Received' : 'Projected'}</Text>
      </View>
    </View>
  );
}

function RecordPayment({ c, next, due, onClose, onDone }: { c: Customer; next: 1 | 2 | null; due: number; onClose: () => void; onDone: (m: string) => void }) {
  const [inst, setInst] = useState<1 | 2>(next ?? 1);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<string | undefined>();
  return (
    <ActionModal title="Record payment" intro={due > 0 ? `Still due in cash: ${inr(due)}` : 'Cash received from the customer.'}
      confirmLabel={`Save installment ${inst}`} textLabel="Note" textPlaceholder="Receipt number, mode, who paid"
      onConfirm={async (note) => {
        const e = cashAmountError(amount, due);
        if (e) { setErr(e); throw Object.assign(new Error(e), { quiet: true }); }
        const n = Number(amount.replace(/[,₹\s]/g, ''));
        const r = await recordCashPayment(api, c.id, inst, n, note);
        onDone(r?.fully_paid ? 'Payment saved. Cash is fully paid.' : 'Payment saved.');
      }} onClose={onClose}>
      {next === null ? <Banner tone="waiting">Both installments are already recorded. Only an admin can correct them, on the web.</Banner> : null}
      <Choice label="Installment 1" selected={inst === 1} onPress={() => setInst(1)} />
      <Choice label="Installment 2" selected={inst === 2} onPress={() => setInst(2)} />
      <Field label="Amount received (₹)" value={amount} onChangeText={(t) => { setAmount(t.replace(/[^\d.]/g, '')); setErr(undefined); }} keyboardType="number-pad" error={err} placeholder="e.g. 50000" />
    </ActionModal>
  );
}
