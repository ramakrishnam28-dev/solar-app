import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Banner, Btn, Card, Divider, Pill, SectionLabel } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { fetchCustomer, type Customer } from '@/lib/customers';
import { dateShort, initials, inr, kw, place } from '@/lib/format';
import { STAGES, stageIndex, statusLabel, statusTone } from '@/lib/status';
import { api } from '@/state/api';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

type Tab = 'Overview' | 'Progress' | 'Loan';

export default function CustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const tabs: Tab[] = user?.role === 'installer' ? ['Progress'] : ['Overview', 'Progress', 'Loan'];
  const [tab, setTab] = useState<Tab>(tabs[0]);
  const { data: c, error, loading, reload } = useLoad(() => fetchCustomer(api, String(id)), [id]);

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: space[3], backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/customers'))}
          style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="chevron-back" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text numberOfLines={1} style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink }}>{c?.name ?? 'Customer'}</Text>
          <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink3 }}>{c?.project_id ?? ' '}</Text>
        </View>
        {c?.phone ? (
          <Pressable accessibilityRole="button" accessibilityLabel={`Call ${c.name}`} onPress={() => Linking.openURL(`tel:${c.phone}`)}
            style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center', borderRadius: 22, backgroundColor: colors.brandTint }}>
            <Ionicons name="call" size={20} color={colors.brand} />
          </Pressable>
        ) : null}
      </View>

      {tabs.length > 1 ? (
        <View style={{ flexDirection: 'row', backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border }}>
          {tabs.map((t) => {
            const on = t === tab;
            return (
              <Pressable key={t} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => setTab(t)}
                style={{ flex: 1, minHeight: MIN_TAP, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderBottomColor: on ? colors.brand : 'transparent' }}>
                <Text style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.brand : colors.ink3 }}>{t}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }}>
        {error && !c ? (
          <>
            <Banner>{error}</Banner>
            <Btn label="Try again" onPress={reload} />
          </>
        ) : loading && !c ? (
          <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading customer…</Text>
        ) : c ? (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[3] }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
                <Text style={{ color: colors.white, fontWeight: '700', fontSize: font.lead }}>{initials(c.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill>
                <Text style={{ color: colors.ink3, fontSize: font.caption, marginTop: 4 }}>{[place(c), kw(c.system_kw)].filter(Boolean).join(' · ')}</Text>
              </View>
            </View>
            {tab === 'Overview' ? <Overview c={c} /> : tab === 'Progress' ? <Progress c={c} /> : <Loan c={c} />}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Line({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 10, minHeight: 44, alignItems: 'flex-start' }}>
      <Text style={{ width: 120, color: colors.ink3, fontSize: font.small }}>{label}</Text>
      <Text selectable style={{ flex: 1, color: colors.ink, fontSize: font.body }}>{value && String(value).trim() ? value : '–'}</Text>
    </View>
  );
}

function Lines({ rows }: { rows: [string, string | null | undefined][] }) {
  return (
    <Card style={{ paddingVertical: space[1] }}>
      {rows.map(([l, v], i) => (
        <View key={l}>{i > 0 ? <Divider /> : null}<Line label={l} value={v} /></View>
      ))}
    </Card>
  );
}

const SOURCE: Record<string, string> = { referral: 'Referral', walk_in: 'Walk-in', direct: 'Direct', website: 'Website', social: 'Social media' };

function Overview({ c }: { c: Customer }) {
  const agent = c.assigned_agent_name || c.agent_name;
  return (
    <>
      <SectionLabel>Customer</SectionLabel>
      <Lines rows={[
        ['Phone', c.phone], ['Project ID', c.project_id], ['Location', place(c)],
        ['System size', kw(c.system_kw)], ['Lead source', c.lead_source ? SOURCE[c.lead_source] ?? c.lead_source.replace(/_/g, ' ') : null],
        ['Sales agent', agent],
      ]} />
      <SectionLabel>Money</SectionLabel>
      <Lines rows={[
        ['Quotation', c.quotation_value ? inr(c.quotation_value) : null],
        ['Payment', c.payment_method ? String(c.payment_method).replace(/_/g, ' ') : null],
        ['Disbursed', (c.amount_disbursed || c.disbursed_amount) ? inr(c.amount_disbursed || c.disbursed_amount) : null],
      ]} />
    </>
  );
}

function Loan({ c }: { c: Customer }) {
  const bank = c.loan_bank || c.loan_bank_name || null;
  const amount = Number(c.loan_amount) > 0 ? c.loan_amount : null;
  const sanctioned = Number(c.sanctioned_amount) > 0 ? c.sanctioned_amount : null;
  const disbursed = Number(c.amount_disbursed || c.disbursed_amount) > 0 ? (c.amount_disbursed || c.disbursed_amount) : null;
  const has = !!(bank || amount || sanctioned || disbursed || c.loan_application_no);
  return (
    <>
      <SectionLabel>Loan</SectionLabel>
      {has ? (
        <Lines rows={[
          ['Bank', bank], ['Application no.', c.loan_application_no as string | null],
          ['Loan amount', amount ? inr(amount) : null], ['Sanctioned', sanctioned ? inr(sanctioned) : null],
          ['Disbursed', disbursed ? inr(disbursed) : null],
          ['2nd disbursal', Number(c.second_disbursal_amount) > 0 ? inr(c.second_disbursal_amount) : null],
        ]} />
      ) : (
        <Card><Text style={{ color: colors.ink2, fontSize: font.body }}>No loan details on this customer yet.</Text></Card>
      )}
    </>
  );
}

function Progress({ c }: { c: Customer }) {
  const cancelled = c.status === 'cancelled';
  const cur = stageIndex(c.status);
  return (
    <>
      {cancelled ? <Banner tone="inactive">This customer is cancelled.</Banner> : null}
      <SectionLabel>Stages</SectionLabel>
      <Card style={{ paddingVertical: space[2] }}>
        {STAGES.map((s, i) => {
          const done = !cancelled && i < cur;
          const active = !cancelled && i === cur;
          const problem = active && c.status === 'loan_rejected';
          const bg = problem ? colors.tone.problem.fg : done || active ? colors.brand : colors.border;
          return (
            <View key={s.key} style={{ flexDirection: 'row', minHeight: 52 }} accessible accessibilityLabel={`${s.label}, ${done ? 'done' : active ? 'current' : 'not started'}`}>
              <View style={{ alignItems: 'center', width: 32 }}>
                <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginTop: 6 }}>
                  {done ? <Ionicons name="checkmark" size={16} color={colors.white} /> : active ? <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white }} /> : null}
                </View>
                {i < STAGES.length - 1 ? <View style={{ flex: 1, width: 2, backgroundColor: done ? colors.brand : colors.border }} /> : null}
              </View>
              <View style={{ flex: 1, paddingTop: 8, paddingBottom: 10, paddingLeft: space[2] }}>
                <Text style={{ fontSize: font.body, fontWeight: active ? '700' : '500', color: done || active ? colors.ink : colors.ink3 }}>{s.label}</Text>
                {active ? <Text style={{ fontSize: font.small, color: problem ? colors.tone.problem.fg : colors.ink2, marginTop: 2 }}>{statusLabel(c.status)}</Text> : null}
              </View>
            </View>
          );
        })}
      </Card>
      <Text style={{ color: colors.ink3, fontSize: font.caption, marginTop: space[2] }}>
        Updating progress from the app comes in the next phase. For now, use the website.
      </Text>
    </>
  );
}
