import React from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { Banner, Btn, Empty } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { can } from '@/lib/actions';
import { fetchAllForDashboard, type Customer } from '@/lib/customers';
import { dateShort, kw, place } from '@/lib/format';
import { statusLabel } from '@/lib/status';
import { INST_STATUS, fetchInstallations, sortInstallations, taskGroups, type Installation } from '@/lib/work';
import { api } from '@/state/api';
import { useDataVersion } from '@/state/dataVersion';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

/** Tasks tab: installers get their installation jobs, everyone else the customers waiting on them. */
export default function Tasks() {
  const { user } = useSession();
  const role = user?.role;
  const version = useDataVersion();
  const installer = role === 'installer';
  const { data, error, loading, refreshing, refresh, reload } = useLoad(async () => {
    if (installer) return { jobs: sortInstallations(await fetchInstallations(api)), groups: [] };
    const d = await fetchAllForDashboard(api);
    return { jobs: [] as Installation[], groups: taskGroups(d.list, role) };
  }, [version, role]);

  const sub = installer ? 'Your installation jobs' : role === 'loan_officer' ? 'Loans waiting on you' : role === 'finance' ? 'Money waiting on you' : 'Customers waiting on the team';
  const count = data ? (installer ? data.jobs.filter((j) => j.status !== 'completed').length : data.groups.reduce((a, g) => a + g.items.length, 0)) : 0;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: TAB_BAR_SPACE + space[4] }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} />}>
        <Text accessibilityRole="header" style={{ fontSize: font.large, fontWeight: '700', color: colors.ink }}>Tasks</Text>
        <Text style={{ fontSize: font.body, color: colors.ink2, marginBottom: space[3] }}>{sub}{data ? ` · ${count} open` : ''}</Text>
        {installer && !can.installations(role) ? <Empty icon="lock-closed-outline" title="No tasks for your role" text="" /> : null}
        {error && !data ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></>
          : loading && !data ? <ActivityIndicator color={colors.brand} accessibilityLabel="Loading tasks" />
          : data && installer ? (
            data.jobs.length ? data.jobs.map((j) => <JobCard key={j.id} j={j} />)
              : <Empty icon="construct-outline" title="No installation jobs" text="Jobs assigned to you on the web show up here." />
          ) : data ? (
            data.groups.length ? data.groups.map((g) => (
              <View key={g.title} style={{ marginBottom: space[3] }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space[2] }}>
                  <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink }}>{g.title}</Text>
                  <View style={{ minWidth: 26, height: 24, borderRadius: 12, paddingHorizontal: 8, backgroundColor: colors.peach, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: font.caption, fontWeight: '700', color: colors.peachInk }}>{g.items.length}</Text>
                  </View>
                </View>
                {g.items.slice(0, 20).map((c) => <TaskRow key={c.id} c={c} />)}
                {g.items.length > 20 ? <Text style={{ fontSize: font.caption, color: colors.ink3 }}>and {g.items.length - 20} more in Customers</Text> : null}
              </View>
            )) : <Empty icon="checkmark-done-outline" title="Nothing waiting" text="No customer needs your action right now." />
          ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TaskRow({ c }: { c: Customer }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${c.name}, ${statusLabel(c.status)}`}
      onPress={() => router.push({ pathname: '/customer/[id]', params: { id: c.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: space[3], marginBottom: space[2], minHeight: 60, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{c.name}</Text>
        <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink2 }}>{[c.project_id, place(c), statusLabel(c.status)].filter(Boolean).join(' · ')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.ink3} />
    </Pressable>
  );
}

function JobCard({ j }: { j: Installation }) {
  const done = j.status === 'completed';
  const photos = Number(j.photos_uploaded ?? 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${j.customer_name ?? 'Installation'}, ${INST_STATUS[j.status ?? ''] ?? j.status}`}
      onPress={() => router.push({ pathname: '/customer/[id]', params: { id: j.customer_id, tab: 'Docs' } })}
      style={({ pressed }) => ({ backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: done ? colors.border : colors.ink, padding: space[3], marginBottom: space[3], opacity: pressed ? 0.7 : done ? 0.75 : 1 })}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text numberOfLines={1} style={{ flex: 1, fontSize: font.lead, fontWeight: '600', color: colors.ink }}>{j.customer_name ?? 'Customer'}</Text>
        <View style={{ backgroundColor: done ? colors.mint : j.status === 'in_progress' ? '#e0ebff' : colors.peach, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 }}>
          <Text style={{ fontSize: font.caption, fontWeight: '600', color: done ? colors.mintInk : j.status === 'in_progress' ? '#1d4ed8' : colors.peachInk }}>{INST_STATUS[j.status ?? ''] ?? j.status}</Text>
        </View>
      </View>
      <Text style={{ fontSize: font.caption, color: colors.ink2, marginTop: 2 }}>{[j.customer_project_id, j.customer_city, kw(j.system_kw)].filter(Boolean).join(' · ')}</Text>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[2] }}>
        <Text style={{ fontSize: font.small, color: colors.ink }}>{j.scheduled_date ? `Scheduled ${dateShort(j.scheduled_date)}` : 'Not scheduled'}</Text>
        <Text style={{ fontSize: font.small, color: photos >= 8 ? colors.brand : colors.peachInk }}>{photos} / 8 photos{j.gps_verified ? ' · GPS ✓' : ''}</Text>
      </View>
      <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2, marginTop: space[2], overflow: 'hidden' }}>
        <View style={{ width: `${Math.min(Number(j.progress_pct ?? (done ? 100 : 0)), 100)}%`, height: 4, backgroundColor: colors.brand }} />
      </View>
    </Pressable>
  );
}
