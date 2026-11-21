import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Banner } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { cashFlowView, inr0, type FlowRow } from '@/lib/deal';
import type { FullCustomer } from '@/lib/full-customer';
import { dateShort } from '@/lib/format';

type Filter = 'all' | 'received' | 'projected';
const TYPE: Record<FlowRow['type'], { fg: string; bg: string; label: string }> = {
  actual: { fg: '#166534', bg: '#ecfdf3', label: 'ACTUAL' }, paper: { fg: '#6b726e', bg: '#f1f3f2', label: 'PAPER' },
  float: { fg: '#92400e', bg: '#fffbeb', label: 'FLOAT' }, 'round-trip': { fg: '#166534', bg: '#ecfdf3', label: 'ROUND-TRIP' },
  'customer-owned': { fg: '#3d4440', bg: '#f1f3f2', label: 'CUSTOMER-OWNED' }, shadow: { fg: '#b91c1c', bg: '#fef2f2', label: 'SHADOW' },
};

/** Cash Flow tab: the website's deal-based cash flow (same rows, same numbers). */
export function CustomerCash({ c, role }: { c: FullCustomer; role?: string }) {
  const [filter, setFilter] = useState<Filter>('all');
  if (role === 'installer') return <Banner tone="inactive">Your role cannot see money for this customer.</Banner>;
  const v = cashFlowView(c);
  if (!v.hasDeal) {
    return (
      <View style={{ alignItems: 'center', padding: space[5] }}>
        <Text style={{ fontSize: 32 }}>🧮</Text>
        <Text style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink, marginTop: space[2] }}>No deal data yet</Text>
        <Text style={{ fontSize: font.small, color: colors.ink2, marginTop: 4 }}>Complete the Deal Calculator first.</Text>
      </View>
    );
  }
  const rows = v.rows.filter((r) => filter === 'all' || (filter === 'received' ? r.state === 'received' : r.state !== 'received'));
  const received = v.rows.filter((r) => r.state === 'received').length;
  return (
    <>
      <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[4], marginBottom: space[3] }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space[2] }}>
          <Text style={{ color: colors.mint, fontSize: font.small }}>{v.header[0].label} · {v.header[0].sub}</Text>
          <View style={{ backgroundColor: colors.heroSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2, flexShrink: 1 }}>
            <Text numberOfLines={2} style={{ color: colors.white, fontSize: font.caption, fontWeight: '600' }}>{v.scenarioLabel}</Text>
          </View>
        </View>
        <Text style={{ color: colors.white, fontSize: 32, fontWeight: '700', marginTop: space[2] }}>{inr0(v.header[0].value)}</Text>
        <Text style={{ color: colors.mint, fontSize: font.caption, marginTop: 2 }}>Projected, actuals may vary</Text>
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[3] }}>
        {v.header.slice(1).map((h) => (
          <View key={h.label} style={{ flexGrow: 1, flexBasis: '30%', backgroundColor: colors.tileGrey, borderRadius: radius.md, padding: space[3] }}>
            <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{h.label}</Text>
            <Text style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink, marginTop: 2 }}>{inr0(h.value)}</Text>
            <Text style={{ fontSize: 11, color: colors.ink3 }}>{h.sub}</Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: space[2] }}>
        {(['all', 'received', 'projected'] as Filter[]).map((k) => {
          const on = k === filter;
          const label = k === 'all' ? 'All steps' : k === 'received' ? 'Received' : 'Pending';
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
        <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>Cash Flow Steps</Text>
        <Text style={{ fontSize: font.small, color: colors.ink2 }}>{received} of {v.rows.length} received</Text>
      </View>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space[3], marginBottom: space[3] }}>
        {rows.length ? rows.map((r, i) => <RowView key={r.n} r={r} last={i === rows.length - 1} />) : <Text style={{ fontSize: font.small, color: colors.ink3, paddingVertical: space[3] }}>Nothing here.</Text>}
      </View>
      <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink, marginBottom: space[1] }}>Payment History</Text>
      <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, paddingHorizontal: space[3] }}>
        {v.history.length ? v.history.map((h, i) => (
          <View key={h.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48, borderTopWidth: i ? 1 : 0, borderTopColor: colors.border }}>
            <View><Text style={{ fontSize: font.body, color: colors.ink }}>{h.label}</Text>{h.date ? <Text style={{ fontSize: font.caption, color: colors.ink3 }}>{dateShort(h.date)}</Text> : null}</View>
            <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>{inr0(h.value)}</Text>
          </View>
        )) : <Text style={{ fontSize: font.small, color: colors.ink3, paddingVertical: space[3] }}>No payments recorded yet</Text>}
      </View>
      <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: space[3] }}>Payments, disbursals and confirmations are recorded in Progress.</Text>
    </>
  );
}

function RowView({ r, last }: { r: FlowRow; last: boolean }) {
  const t = TYPE[r.type];
  const st = r.state === 'received' ? { label: 'RECEIVED', fg: colors.brand } : r.state === 'pending' ? { label: 'PENDING', fg: colors.peachInk } : { label: 'Projected', fg: colors.ink3 };
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: space[3], paddingVertical: space[3], borderBottomWidth: last ? 0 : 1, borderBottomColor: colors.border }}
      accessible accessibilityLabel={`${r.from} to ${r.to}, ${r.trigger}, ${r.paper ? 'paper' : inr0(r.amount)}, ${st.label}`}>
      <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: r.state === 'received' ? colors.brand : colors.tileGreen, alignItems: 'center', justifyContent: 'center' }}>
        {r.state === 'received' ? <Ionicons name="checkmark" size={15} color={colors.white} /> : <Text style={{ fontSize: font.small, color: colors.mintInk }}>{r.n}</Text>}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{r.from} → {r.to}</Text>
        <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{r.trigger}</Text>
        {r.confirm ? <Text style={{ fontSize: font.caption, color: colors.peachInk, marginTop: 2 }}>{r.confirm === 'float' ? 'Float not confirmed yet' : 'Return not confirmed yet'}</Text> : null}
      </View>
      <View style={{ alignItems: 'flex-end', maxWidth: 130 }}>
        <Text style={{ fontSize: font.body, fontWeight: '700', color: colors.ink }}>{r.paper ? '₹0 (paper)' : inr0(r.amount)}</Text>
        <Text style={{ fontSize: 11, fontWeight: '700', color: st.fg }}>{st.label}</Text>
        <View style={{ backgroundColor: t.bg, borderRadius: 4, paddingHorizontal: 4, marginTop: 2 }}><Text style={{ fontSize: 9, fontWeight: '700', color: t.fg }}>{t.label}</Text></View>
      </View>
    </View>
  );
}
