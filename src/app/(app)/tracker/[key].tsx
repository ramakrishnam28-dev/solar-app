import React, { useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';

import { Banner, Btn, Empty } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { fetchAllForDashboard, type Customer } from '@/lib/customers';
import { count, inr, kw, place } from '@/lib/format';
import { nextAction, statusLabel } from '@/lib/status';
import { TRACKERS, trackerTiles } from '@/lib/work';
import { api } from '@/state/api';
import { useDataVersion } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

/** More › Net meter / Subsidy / Disbursements. Same list pattern as the loan tracker: tiles, chips, cards. */
export default function TrackerScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const t = TRACKERS.find((x) => x.key === key);
  const { can: canPage } = useSession();
  const version = useDataVersion();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => fetchAllForDashboard(api), [version]);
  const [pick, setPick] = useState<string | null>(null);

  if (!t || !canPage(t.page)) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space[4] }}>
        <Empty icon="lock-closed-outline" title="Not available" text="This tracker is not open for your role." />
        <Btn label="Back" variant="secondary" onPress={() => router.back()} />
      </SafeAreaView>
    );
  }
  const list = (data?.list ?? []).filter((c) => t.statuses.includes(String(c.status)));
  const tiles = trackerTiles(t, list);
  const shown = (pick ? list.filter((c) => c.status === pick) : list)
    .sort((a, b) => t.statuses.indexOf(String(a.status)) - t.statuses.indexOf(String(b.status)));

  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingVertical: space[2], backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/more'))}
          style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="arrow-back" size={24} color={colors.ink} />
        </Pressable>
        <Text accessibilityRole="header" style={{ flex: 1, marginLeft: 4, fontSize: font.title, fontWeight: '600', color: colors.ink }}>{t.title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}>
        {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
          : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading" />
          : (
            <>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginBottom: space[3] }}>
                {tiles.map((x) => {
                  const on = pick === x.status;
                  return (
                    <Pressable key={x.status} accessibilityRole="button" accessibilityLabel={`${statusLabel(x.status)}, ${x.count}`} accessibilityState={{ selected: on }}
                      onPress={() => setPick(on ? null : x.status)}
                      style={{ width: '48%', borderRadius: radius.md, padding: space[3], backgroundColor: on ? colors.mint : colors.tileGrey, borderWidth: 1, borderColor: on ? colors.mint : colors.border }}>
                      <Text numberOfLines={2} style={{ fontSize: font.caption, color: on ? colors.mintInk : colors.ink2 }}>{statusLabel(x.status)}</Text>
                      <Text style={{ fontSize: 24, fontWeight: '700', color: on ? colors.mintInk : colors.ink }}>{count(x.count)}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontSize: font.small, color: colors.ink2, marginBottom: space[2] }}>{shown.length} customer{shown.length === 1 ? '' : 's'}{pick ? ` · ${statusLabel(pick)}` : ''} · tap a tile to filter</Text>
              {shown.length === 0 ? <Empty icon="file-tray-outline" title="Nothing here" text="No customers at these steps." />
                : shown.map((c) => <Row key={c.id} c={c} money={t.key !== 'netmeter'} />)}
              {data && data.total > data.list.length ? <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: space[2] }}>Uses the first {count(data.list.length)} of {count(data.total)} customers, same as the website.</Text> : null}
            </>
          )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ c, money }: { c: Customer; money: boolean }) {
  const amount = money ? Number(c.subsidy_amount ?? 0) || Number(c.disbursed_amount ?? c.amount_disbursed ?? 0) : 0;
  const next = nextAction(c);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${c.name}, ${statusLabel(c.status)}`}
      onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id, tab: 'Progress' } })}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink, padding: space[3], marginBottom: space[3], opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: font.lead, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
        <View style={{ backgroundColor: '#e0ebff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: font.caption, fontWeight: '600', color: '#1d4ed8' }}>{statusLabel(c.status)}</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink2, marginTop: 2 }}>{[c.project_id, place(c), kw(c.system_kw)].filter(Boolean).join(' · ')}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{amount ? inr(amount) : ''}</Text>
        <Text style={{ fontSize: font.small, color: next.warm ? colors.peachInk : colors.ink2, fontWeight: next.warm ? '600' : '400' }}>{next.text}</Text>
      </View>
    </Pressable>
  );
}
