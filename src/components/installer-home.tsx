import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';

import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Banner, Btn } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { dateShort, kw } from '@/lib/format';
import { INST_STATUS, fetchInstallations, sortInstallations, type Installation } from '@/lib/work';
import { api } from '@/state/api';
import { useDataVersion } from '@/state/dataVersion';
import { useLoad } from '@/state/useLoad';

const dayKey = (d?: string | null) => (d ? String(d).slice(0, 10) : '');

/** Installer Home: only their own jobs (no company numbers). */
export function InstallerHome({ header }: { header: React.ReactNode }) {
  const version = useDataVersion();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => fetchInstallations(api), [version]);
  const today = new Date().toISOString().slice(0, 10);
  const jobs = sortInstallations(data ?? []);
  const open = jobs.filter((j) => j.status !== 'completed' && j.status !== 'cancelled');
  const todays = open.filter((j) => dayKey(j.scheduled_date) === today);
  const overdue = open.filter((j) => j.scheduled_date && dayKey(j.scheduled_date) < today);
  const photosMissing = open.reduce((a, j) => a + Math.max(0, 8 - Number(j.photos_uploaded ?? 0)), 0);
  const done = jobs.filter((j) => j.status === 'completed').length;
  return (
    <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: TAB_BAR_SPACE + space[4] }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}>
      {header}
      {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
        : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading your jobs" />
        : (
          <>
            <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[4] }}>
              <Text style={{ color: colors.mint, fontSize: font.small }}>Your open jobs</Text>
              <Text style={{ color: colors.white, fontSize: 48, fontWeight: '700', marginVertical: space[1] }}>{open.length}</Text>
              <Text style={{ color: colors.mint, fontSize: font.small }}>{todays.length} today · {overdue.length} overdue · {done} completed</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
              <Tile label="Today" value={todays.length} warm={false} />
              <Tile label="Overdue" value={overdue.length} warm={overdue.length > 0} />
              <Tile label="Photos missing" value={photosMissing} warm={photosMissing > 0} />
            </View>
            <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink, marginTop: space[4], marginBottom: space[2] }}>Next jobs</Text>
            {open.length === 0 ? <Text style={{ color: colors.ink2, fontSize: font.body }}>No open jobs. New jobs assigned to you show up here.</Text>
              : open.slice(0, 5).map((j) => <Job key={j.id} j={j} today={today} />)}
            {open.length > 5 ? <Btn label={`See all ${open.length} jobs`} variant="secondary" onPress={() => router.navigate('/tasks')} /> : null}
          </>
        )}
    </ScrollView>
  );
}

function Tile({ label, value, warm }: { label: string; value: number; warm: boolean }) {
  return (
    <View style={{ flex: 1, backgroundColor: warm ? colors.peach : colors.tileGrey, borderRadius: radius.md, padding: space[3] }}>
      <Text numberOfLines={1} style={{ fontSize: font.caption, color: warm ? colors.peachInk : colors.ink2 }}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: '700', color: warm ? colors.peachInk : colors.ink }}>{value}</Text>
    </View>
  );
}

function Job({ j, today }: { j: Installation; today: string }) {
  const d = dayKey(j.scheduled_date);
  const when = !d ? 'Not scheduled' : d === today ? 'Today' : d < today ? `Overdue · ${dateShort(j.scheduled_date)}` : dateShort(j.scheduled_date);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${j.customer_name}, ${when}`} onPress={() => router.push({ pathname: '/customer/[id]', params: { id: j.customer_id, tab: 'Progress' } })}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space[3], marginBottom: space[2], opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: space[2] }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: font.body, fontWeight: '600', color: colors.ink }}>{j.customer_name ?? 'Customer'}</Text>
        <Text style={{ fontSize: font.small, fontWeight: '600', color: d && d < today ? colors.tone.problem.fg : colors.ink2 }}>{when}</Text>
      </View>
      <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink2, marginTop: 2 }}>{[j.customer_project_id, j.customer_city, kw(j.system_kw), INST_STATUS[j.status ?? ''] ?? j.status, `${Number(j.photos_uploaded ?? 0)}/8 photos`].filter(Boolean).join(' · ')}</Text>
    </Pressable>
  );
}
