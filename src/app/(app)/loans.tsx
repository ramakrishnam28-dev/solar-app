import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { ActionModal } from '@/components/action-modal';
import { Banner, Btn, Empty } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import { ApiError } from '@/lib/api';
import { inr } from '@/lib/format';
import { banksOf, escalateLoan, fetchLoans, isActive, isDisbursed, isOverdue, loanAmount, loanStatusLabel, loanTiles, slaLine, sortBySla, type Loan } from '@/lib/loans';
import { api } from '@/state/api';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

type StatusFilter = 'all' | 'active' | 'disbursed' | 'rejected';
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'active', label: 'Active' }, { key: 'disbursed', label: 'Disbursed' }, { key: 'rejected', label: 'Rejected' },
];

/** More › Loan tracker (wireframe A6). */
export default function LoanTracker() {
  const { user } = useSession();
  const role = user?.role;
  const [rk, setRk] = useState(0);
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => fetchLoans(api), [rk]);
  const [bank, setBank] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>('all');
  const [statusOpen, setStatusOpen] = useState(false);
  const [q, setQ] = useState('');
  const [searching, setSearching] = useState(false);
  const [esc, setEsc] = useState<Loan | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  const loans = data?.loans ?? [];
  const tiles = loanTiles(loans);
  const banks = banksOf(loans);
  const shown = useMemo(() => sortBySla(loans).filter((l) =>
    (!bank || (l.bank_name ?? '').trim() === bank)
    && (status === 'all' || (status === 'active' ? isActive(l) : status === 'disbursed' ? isDisbursed(l) : l.status === 'rejected'))
    && (!q.trim() || `${l.customer_name} ${l.loan_ref} ${l.customer_project_id}`.toLowerCase().includes(q.trim().toLowerCase()))), [loans, bank, status, q]);

  if (!can.loans(role)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space[4] }}>
        <Empty icon="lock-closed-outline" title="Not available for your role" text="The loan tracker is for admin, finance, loan officers and sales agents." />
        <Btn label="Back" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingVertical: space[2], backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))} style={iconBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        {searching ? (
          <TextInput autoFocus value={q} onChangeText={setQ} placeholder="Customer, loan ref or project" placeholderTextColor={colors.ink3} accessibilityLabel="Search loans"
            style={{ flex: 1, fontSize: font.lead, color: colors.ink, paddingHorizontal: space[2] }} />
        ) : <View style={{ flex: 1, marginLeft: 4 }}><Text accessibilityRole="header" style={{ fontSize: font.title, fontWeight: '600', color: colors.ink }}>Loan tracker</Text><Text style={{ fontSize: font.caption, color: colors.ink2 }}>Past SLA first</Text></View>}
        <Pressable accessibilityRole="button" accessibilityLabel={searching ? 'Close search' : 'Search loans'} onPress={() => { if (searching) setQ(''); setSearching(!searching); }} style={iconBtn}>
          <Ionicons name={searching ? 'close' : 'search'} size={22} color={colors.ink} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}>
        {flash ? <Banner tone="done">{flash}</Banner> : null}
        {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
          : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading loans" />
          : (
            <>
              <View style={{ flexDirection: 'row', gap: space[2], marginBottom: space[3] }}>
                <Tile label="Past SLA" value={tiles.pastSla} warm={tiles.pastSla > 0} />
                <Tile label="In review" value={tiles.inReview} />
                <Tile label="Disbursed" value={tiles.disbursed} />
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: space[3] }}>
                {banks.map((b) => <Chip key={b} label={b} on={bank === b} onPress={() => setBank(bank === b ? null : b)} />)}
                <Chip label={status === 'all' ? 'Status' : STATUS_FILTERS.find((s) => s.key === status)!.label} on={status !== 'all'} caret onPress={() => setStatusOpen(!statusOpen)} />
              </ScrollView>
              {statusOpen ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: space[3] }}>
                  {STATUS_FILTERS.map((s) => <Chip key={s.key} label={s.label} on={status === s.key} onPress={() => { setStatus(s.key); setStatusOpen(false); }} />)}
                </View>
              ) : null}
              {shown.length === 0 ? <Empty icon="cash-outline" title="No loans" text={loans.length ? 'Nothing matches these filters.' : 'No loan applications yet.'} />
                : shown.map((l) => <LoanCard key={l.id} l={l} canEscalate={can.escalate(role)} onEscalate={() => setEsc(l)} />)}
            </>
          )}
      </ScrollView>

      {esc ? (
        <ActionModal title="Escalate loan?" intro={`${esc.customer_name ?? ''} · ${esc.bank_name ?? ''}. Escalation level ${Number(esc.escalation_level ?? 0) + 1} of 3 notifies the next person.`}
          confirmLabel="Escalate" textLabel="Reason" textRequired textPlaceholder="What is the bank waiting on? (at least 5 letters)"
          onConfirm={async (t) => {
            if (t.trim().length < 5) throw new ApiError('Write at least 5 characters.', 422);
            const r = await escalateLoan(api, esc.id, t);
            setEsc(null); setFlash(r?.label ? `Escalated: ${r.label}` : 'Loan escalated.'); setRk((n) => n + 1);
          }} onClose={() => setEsc(null)} />
      ) : null}
    </SafeAreaView>
  );
}

function Tile({ label, value, warm }: { label: string; value: number; warm?: boolean }) {
  return (
    <View style={{ flex: 1, borderRadius: radius.md, padding: space[3], backgroundColor: warm ? '#fbd5d5' : colors.tileGrey, borderWidth: 1, borderColor: warm ? '#f3a5a5' : colors.border }}>
      <Text style={{ fontSize: font.caption, color: warm ? colors.tone.problem.fg : colors.ink2 }}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: '700', color: warm ? colors.tone.problem.fg : colors.ink }}>{value}</Text>
    </View>
  );
}

function Chip({ label, on, caret, onPress }: { label: string; on?: boolean; caret?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: !!on }} onPress={onPress}
      style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: on ? colors.mint : colors.ink, backgroundColor: on ? colors.mint : colors.surface }}>
      {on && !caret ? <Ionicons name="checkmark" size={15} color={colors.mintInk} /> : null}
      <Text style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.mintInk : colors.ink }}>{label}</Text>
      {caret ? <Ionicons name="caret-down" size={12} color={on ? colors.mintInk : colors.ink} /> : null}
    </Pressable>
  );
}

function LoanCard({ l, canEscalate, onEscalate }: { l: Loan; canEscalate: boolean; onEscalate: () => void }) {
  const over = isOverdue(l);
  const sla = slaLine(l);
  const lvl = Number(l.escalation_level ?? 0);
  const disb = isDisbursed(l);
  const chip = lvl > 0 && isActive(l) ? { t: `Escalation L${lvl}`, bg: colors.tone.problem.bg, fg: colors.tone.problem.fg }
    : disb ? { t: 'Disbursed', bg: colors.mint, fg: colors.mintInk }
    : { t: loanStatusLabel(l.status), bg: over ? colors.tone.problem.bg : '#e0ebff', fg: over ? colors.tone.problem.fg : '#1d4ed8' };
  const phone = l.loan_officer_phone ?? null;
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: over ? 2 : 1.5, borderColor: over ? colors.tone.problem.fg : colors.ink, padding: space[3], marginBottom: space[3] }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open ${l.customer_name ?? 'customer'}`} disabled={!l.customer_id}
        onPress={() => l.customer_id && router.push({ pathname: '/customer/[id]', params: { id: l.customer_id, tab: 'Progress' } })}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: space[2] }}>
          <View style={{ flex: 1 }}>
            <Text numberOfLines={1} style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink }}>{l.customer_name ?? 'Customer'}</Text>
            <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink2 }}>{[l.loan_ref, l.bank_name].filter(Boolean).join(' · ')}</Text>
          </View>
          <View style={{ backgroundColor: chip.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ fontSize: font.caption, fontWeight: '600', color: chip.fg }}>{chip.t}</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: space[2] }}>
          <Text style={{ fontSize: font.title, fontWeight: '700', color: colors.ink }}>{inr(loanAmount(l))}</Text>
          <Text style={{ fontSize: font.small, color: sla.over ? colors.tone.problem.fg : colors.ink2 }}>{sla.text}</Text>
        </View>
        <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: space[2], overflow: 'hidden' }}>
          <View style={{ width: `${sla.fill * 100}%`, height: 4, backgroundColor: sla.over ? colors.tone.problem.fg : colors.brand }} />
        </View>
      </Pressable>
      {over ? (
        <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
          <Btn label="Call bank" variant="secondary" disabled={!phone} onPress={() => phone && Linking.openURL(`tel:${phone}`)} style={{ flex: 1 }} />
          {canEscalate ? <Btn label="Escalate" onPress={onEscalate} disabled={lvl >= 3} style={{ flex: 1 }} /> : null}
        </View>
      ) : null}
    </View>
  );
}

const iconBtn = { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' } as const;
