import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Banner, Btn, Empty, Pill } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { ApiError } from '@/lib/api';
import { fetchCustomersPage, fetchSegmentCounts, type Customer, type SegmentCounts } from '@/lib/customers';
import { initials, kw, place } from '@/lib/format';
import { SEGMENTS, statusLabel, statusTone, type Segment } from '@/lib/status';
import { api } from '@/state/api';

export default function Customers() {
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
  useEffect(() => { fetchSegmentCounts(api).then(setCounts).catch(() => {}); }, []);

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

  const sub = total === null ? '' : `${total} ${{ active: 'under process', completed: 'completed', cancelled: 'cancelled', all: 'total' }[segment]} project${total === 1 ? '' : 's'}`;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ paddingHorizontal: space[4], paddingTop: space[4] }}>
        <Text accessibilityRole="header" style={{ fontSize: font.large, fontWeight: '700', color: colors.ink }}>Customers</Text>
        <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 2, minHeight: 20 }}>{sub}</Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, marginTop: space[3], minHeight: 48, paddingHorizontal: space[3] }}>
          <Ionicons name="search" size={18} color={colors.ink3} />
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Name, phone or project ID"
            placeholderTextColor={colors.ink3}
            accessibilityLabel="Search customers"
            returnKeyType="search"
            autoCorrect={false}
            style={{ flex: 1, fontSize: font.lead, color: colors.ink, paddingHorizontal: space[2], paddingVertical: 10 }}
          />
          {text ? (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setText('')} style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center', marginRight: -12 }}>
              <Ionicons name="close-circle" size={20} color={colors.ink3} />
            </Pressable>
          ) : null}
        </View>

      </View>
      <View style={{ flexGrow: 0 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: space[4], paddingVertical: space[3] }}>
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
                style={{ minHeight: MIN_TAP, justifyContent: 'center', paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: on ? colors.brand : colors.surface, borderWidth: 1, borderColor: on ? colors.brand : colors.border, flexShrink: 0 }}>
                <Text numberOfLines={1} style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.white : colors.ink2 }}>
                  {s.label}{n !== undefined ? ` ${n}` : ''}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

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

function CustomerCard({ c }: { c: Customer }) {
  const loc = [place(c), kw(c.system_kw)].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${c.name}, ${statusLabel(c.status)}`}
      onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[3], marginBottom: space[2], minHeight: 68, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
        <Text style={{ color: colors.white, fontWeight: '700', fontSize: font.small }}>{initials(c.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          <Pill tone={statusTone(c.status)}>{statusLabel(c.status)}</Pill>
        </View>
        {loc ? <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink3, marginTop: 4 }}>{loc}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
    </Pressable>
  );
}
