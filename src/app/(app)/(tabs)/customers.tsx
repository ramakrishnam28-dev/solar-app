import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { useUnderDevelopment } from '@/components/under-development';
import { Banner, Btn, Empty } from '@/components/ui';
import { useSession } from '@/state/session';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { fetchCustomersPage, fetchSegmentCounts, type Customer, type SegmentCounts } from '@/lib/customers';
import { initials, kw, place } from '@/lib/format';
import { IOS_DESIGN } from '@/lib/design';
import { SEGMENTS, nextAction, stepNumber, STEP_COUNT, statusLabel, statusTone, type Segment } from '@/lib/status';
import { api } from '@/state/api';
import { useDataVersion } from '@/state/dataVersion';

export default function Customers() {
  const { user } = useSession();
  const soon = useUnderDevelopment();
  const [segment, setSegment] = useState<Segment>('active');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [items, setItems] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState<number | null>(null);
  const [counts, setCounts] = useState<SegmentCounts>({});
  const [loading, setLoading] = useState(true);
  const [more, setMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  // wait a moment after typing before searching
  useEffect(() => {
    const t = setTimeout(() => setSearch(text.trim()), 400);
    return () => clearTimeout(t);
  }, [text]);

  const load = useCallback(async (mode: 'reset' | 'refresh') => {
    const id = ++seq.current;
    if (mode === 'reset') setLoading(true); else setRefreshing(true);
    try {
      const r = await fetchCustomersPage(api, { page: 1, search, segment });
      if (id !== seq.current) return;
      setItems(r.list); setPage(1); setTotalPages(r.totalPages); setTotal(r.total); setError(null);
    } catch (e) {
      if (id !== seq.current) return;
      setError(e instanceof ApiError ? e.message : 'Could not load customers.');
    } finally {
      if (id === seq.current) { setLoading(false); setRefreshing(false); }
    }
  }, [search, segment]);

  useEffect(() => { load('reset'); }, [load]);
  const version = useDataVersion();
  const firstVersion = useRef(true);
  // a customer was changed elsewhere in the app: reload the list and the chip counts
  useEffect(() => {
    if (firstVersion.current) { firstVersion.current = false; }
    else load('refresh');
    fetchSegmentCounts(api).then(setCounts).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const loadMore = async () => {
    if (more || loading || page >= totalPages) return;
    const id = seq.current;
    setMore(true);
    try {
      const r = await fetchCustomersPage(api, { page: page + 1, search, segment });
      if (id !== seq.current) return;
      setItems((prev) => {
        const seen = new Set(prev.map((c) => c.id));
        return [...prev, ...r.list.filter((c) => !seen.has(c.id))];
      });
      setPage(page + 1); setTotalPages(r.totalPages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Could not load more.');
    } finally { setMore(false); }
  };

  const sub = total === null ? '' : `${total} project${total === 1 ? '' : 's'} · newest first`;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space[4], paddingTop: space[3] }}>
        {IOS_DESIGN ? <Text accessibilityRole="header" style={{ fontSize: font.large, fontWeight: '700', color: colors.ink, marginBottom: space[3] }}>Customers</Text> : null}
        <View style={IOS_DESIGN
          ? { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 48, paddingLeft: space[3], paddingRight: 6 }
          : { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.tileGrey, borderRadius: radius.pill, minHeight: 52, paddingLeft: space[4], paddingRight: 6 }}>
          <Ionicons name="search" size={20} color={colors.ink2} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={IOS_DESIGN ? 'Search name, phone or EPC ID' : 'Search customers'}
            placeholderTextColor={colors.ink2}
            accessibilityLabel="Search customers"
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, fontSize: font.lead, color: colors.ink, paddingHorizontal: space[3], paddingVertical: 10 }}
          />
          {text ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText('')} style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="close-circle" size={20} color={colors.ink3} />
            </Pressable>
          ) : null}
          {IOS_DESIGN ? null : (
            <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontWeight: '700', color: colors.mintInk, fontSize: font.caption }}>{initials(user?.name)}</Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ flexGrow: 0, flexShrink: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space[4], paddingTop: space[3], paddingBottom: space[2] }}>
          {SEGMENTS.map((s) => {
            const on = s.key === segment;
            const n = counts[s.key];
            return (
              <Pressable
                key={s.key}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={`${s.label}${n !== undefined ? ', ' + n : ''}`}
                onPress={() => setSegment(s.key)}
                style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 10, backgroundColor: on ? colors.mint : colors.surface, borderWidth: 1, borderColor: on ? colors.mint : colors.ink, flexShrink: 0 }}>
                {on ? <Ionicons name="checkmark" size={16} color={colors.mintInk} /> : null}
                <Text numberOfLines={1} style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.mintInk : colors.ink }}>{s.label}</Text>
              </Pressable>
            );
          })}
          <Pressable accessibilityRole="button" accessibilityLabel="Stage filter" onPress={() => soon('Stage filter')} style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, borderRadius: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.ink, flexShrink: 0 }}>
            <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.ink }}>Stage</Text>
            <Ionicons name="chevron-down" size={14} color={colors.ink} />
          </Pressable>
        </ScrollView>
      </View>
      <Text style={{ fontSize: font.small, color: colors.ink2, paddingHorizontal: space[4], paddingBottom: space[2], minHeight: 22 }}>{sub}</Text>

      {error && !items.length ? (
        <View style={{ paddingHorizontal: space[4] }}>
          <Banner>{error}</Banner>
          <Btn label="Try again" onPress={() => load('reset')} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ paddingHorizontal: space[4], paddingBottom: TAB_BAR_SPACE + space[5] }}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load('refresh')} tintColor={colors.brand} colors={[colors.brand]} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListHeaderComponent={error ? <Banner tone="waiting">{error}</Banner> : undefined}
          ListEmptyComponent={loading ? (
            <ActivityIndicator color={colors.brand} style={{ marginTop: space[6] }} accessibilityLabel="Loading" />
          ) : (
            <Empty icon="people-outline" title="No customers found" text={search ? 'Try a different name, phone number or project ID.' : 'Nothing in this list yet.'} />
          )}
          ListFooterComponent={more ? <ActivityIndicator color={colors.brand} style={{ marginVertical: space[4] }} /> : undefined}
          renderItem={({ item }) => <CustomerCard c={item} />}
        />
      )}
    </SafeAreaView>
  );
}

const TONE_CHIP: Record<string, { bg: string; fg: string }> = {
  done: { bg: colors.mint, fg: colors.mintInk },
  progress: { bg: '#e0ebff', fg: '#1d4ed8' },
  waiting: { bg: colors.peach, fg: colors.peachInk },
  problem: { bg: colors.tone.problem.bg, fg: colors.tone.problem.fg },
  inactive: { bg: colors.tone.inactive.bg, fg: colors.tone.inactive.fg },
};

function CustomerCard({ c }: { c: Customer }) {
  const loc = [c.project_id, place(c)].filter(Boolean).join(' · ');
  const step = stepNumber(c.status);
  const chip = TONE_CHIP[statusTone(c.status)] ?? TONE_CHIP.inactive;
  const next = nextAction(c);
  const agent = c.assigned_agent_name ?? c.agent_name;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${statusLabel(c.status)}, ${next.text}`}
      onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink, padding: space[3], marginBottom: space[3], opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
          <Text style={{ color: colors.mintInk, fontWeight: '700', fontSize: font.small }}>{initials(c.name)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
          {loc ? <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink2, marginTop: 2 }}>{loc}</Text> : null}
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] }}>
        <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{kw(c.system_kw)}</Text>
        {step ? <Text style={{ fontSize: font.caption, color: colors.ink2 }}>Step {step} of {STEP_COUNT}</Text> : null}
      </View>
      <View style={{ height: 3, backgroundColor: colors.border, borderRadius: 2, marginTop: space[1], overflow: 'hidden' }} accessibilityLabel={step ? `Step ${step} of ${STEP_COUNT}` : undefined}>
        <View style={{ width: `${(step / STEP_COUNT) * 100}%`, height: 3, backgroundColor: colors.brand }} />
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: space[3], gap: space[2] }}>
        <View style={{ backgroundColor: chip.bg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1 }}>
          <Text numberOfLines={1} style={{ fontSize: font.caption, fontWeight: '600', color: chip.fg }}>{statusLabel(c.status)}</Text>
        </View>
        <Text numberOfLines={1} style={{ fontSize: font.small, fontWeight: next.warm ? '600' : '400', color: next.warm ? colors.peachInk : colors.ink2, flexShrink: 1 }}>{next.text}</Text>
      </View>
      {agent ? <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink3, marginTop: 6 }}>Agent: {agent}</Text> : null}
    </Pressable>
  );
}
