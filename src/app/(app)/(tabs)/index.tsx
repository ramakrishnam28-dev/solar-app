import React from 'react';
import { Pressable, RefreshControl, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { useUnderDevelopment } from '@/components/under-development';
import { Banner, Btn, Empty } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { fetchAllForDashboard } from '@/lib/customers';
import { computeHome, overdueLoanCount } from '@/lib/dashboard';
import { can as canRole } from '@/lib/actions';
import { count, initials } from '@/lib/format';
import { IOS_DESIGN } from '@/lib/design';
import { PIPELINE_BUCKETS } from '@/lib/status';
import { api } from '@/state/api';
import { useSession } from '@/state/session';
import { useDataVersion } from '@/state/dataVersion';
import { useLoad } from '@/state/useLoad';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

async function loadHome(canLoans: boolean) {
  const d = await fetchAllForDashboard(api);
  let sla: number | null = null;
  // GET /loans is only open to admin, finance, loan officers and sales agents
  if (canLoans) { try { sla = overdueLoanCount(await api.getPage('/loans?overdue=true&limit=1')); } catch { sla = null; } }
  return { list: d.list, total: d.total, sla };
}

export default function Home() {
  const { user, can } = useSession();
  const soon = useUnderDevelopment();
  const allowed = can('dashboard');
  const allowedLoans = can('loans') && canRole.loans(user?.role);
  const version = useDataVersion();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => loadHome(allowedLoans), [version, allowedLoans]);
  const h = data ? computeHome(data.list) : null;
  const sla = data?.sla ?? null;

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={{ padding: space[4], paddingBottom: TAB_BAR_SPACE + space[4] }}
        refreshControl={allowed ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.brand} colors={[colors.brand]} /> : undefined}
        showsVerticalScrollIndicator={false}>
        {/* top bar */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space[4] }}>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
            <Text style={{ fontWeight: '700', color: colors.mintInk, fontSize: font.small }}>{initials(user?.name)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: font.caption, color: colors.ink2 }}>{IOS_DESIGN ? new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' }) : greeting()}</Text>
            <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink }}>{IOS_DESIGN ? `Hello, ${(user?.name ?? 'there').split(' ')[0]}` : user?.name ?? 'there'}</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="Notifications" onPress={() => soon('Notifications')} style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="notifications-outline" size={24} color={colors.ink} />
          </Pressable>
        </View>

        {!allowed ? (
          <Empty icon="lock-closed-outline" title="No dashboard for your role" text="Use the other tabs to open your work." />
        ) : error && !data ? (
          <>
            <Banner>{error}</Banner>
            <Btn label="Try again" onPress={reload} />
          </>
        ) : loading && !data ? (
          <Text accessibilityLiveRegion="polite" style={{ color: colors.ink3, fontSize: font.body }}>Loading today's numbers…</Text>
        ) : h ? (
          <>
            {error ? <Banner tone="waiting">{error} Showing the last numbers.</Banner> : null}

            {/* hero */}
            <View style={{ backgroundColor: colors.hero, borderRadius: radius.lg, padding: space[4] }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.mint, fontSize: font.small }}>Active projects</Text>
                <Text style={{ color: colors.mint, fontSize: font.small }}>{count(h.pipelineKw)} kW in pipeline</Text>
              </View>
              <Text accessibilityLabel={`${h.active} active projects`} style={{ color: colors.white, fontSize: 48, fontWeight: '700', marginVertical: space[2] }}>{count(h.active)}</Text>
              <View style={{ flexDirection: 'row', gap: 4, height: 6, marginBottom: space[3] }} accessibilityLabel={PIPELINE_BUCKETS.map((b, i) => `${b} ${h.buckets[i]}`).join(', ')}>
                {PIPELINE_BUCKETS.map((b, i) => (
                  <View key={b} style={{ flex: Math.max(h.buckets[i], 0.15), backgroundColor: colors.bar[i], borderRadius: 3 }} />
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: -space[2], marginBottom: space[4] }}>
                {PIPELINE_BUCKETS.map((b) => <Text key={b} style={{ color: colors.mint, fontSize: 10 }}>{b}</Text>)}
              </View>
              <View style={{ flexDirection: 'row', gap: space[2] }}>
                <Pressable accessibilityRole="button" accessibilityLabel="View pipeline" onPress={() => router.navigate('/customers')} style={{ minHeight: MIN_TAP, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.mintInk, fontWeight: '700', fontSize: font.body }}>View pipeline</Text>
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="Reports" onPress={() => soon('Reports')} style={{ minHeight: MIN_TAP, paddingHorizontal: 18, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.mint, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: colors.white, fontWeight: '600', fontSize: font.body }}>Reports</Text>
                </Pressable>
              </View>
            </View>

            {/* quick actions (iOS design, kept on Android) */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: space[3] }}>
              {([
                ...(can('newCustomer') ? [['add', 'New customer', () => router.push('/new-customer')] as const] : []),
                ['camera-outline', 'Scan document', () => router.navigate('/customers')],
                ['cash-outline', 'Record payment', () => router.navigate('/customers')],
                ['checkmark', 'Update progress', () => router.navigate('/customers')],
              ] as const).map(([icon, label, run]) => (
                <Pressable key={label} accessibilityRole="button" accessibilityLabel={label} onPress={run} style={{ flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.ink, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' }}>
                    <Ionicons name={icon} size={24} color={colors.ink} />
                  </View>
                  <Text numberOfLines={2} style={{ fontSize: font.caption, color: colors.ink2, textAlign: 'center', marginTop: 4, maxWidth: 76 }}>{label}</Text>
                </Pressable>
              ))}
            </View>

            {/* tiles */}
            <View style={{ flexDirection: 'row', gap: space[2], marginTop: space[3] }}>
              <Tile label="Customers" value={count(data!.total)} bg={colors.tileGrey} />
              <Tile label="SLA breached" value={sla === null ? '–' : count(sla)} bg={sla ? colors.peach : colors.tileGrey} ink={sla ? colors.peachInk : colors.ink} />
              <Tile label="Installed" value={count(h.installed)} bg={colors.tileGrey} />
            </View>

            {/* needs attention */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space[4], marginBottom: space[1] }}>
              <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink }}>Needs attention</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="See all" onPress={() => router.navigate('/tasks')} style={{ minHeight: MIN_TAP, justifyContent: 'center' }}>
                <Text style={{ color: colors.brand, fontWeight: '600', fontSize: font.small }}>See all</Text>
              </Pressable>
            </View>
            <Attention icon="alert" warm title="Loans past bank SLA" sub="Respond to the bank" n={sla ?? 0} onPress={() => (allowedLoans ? router.push('/loans') : soon('Loan tracker'))} />
            <Attention icon="cash-outline" title="Loans awaiting approval" sub="Follow up with the bank" n={h.awaitingApproval} onPress={() => router.navigate('/customers')} />
            <Attention icon="home-outline" title="Field visits pending" sub="Required before install" n={h.fieldVisits} onPress={() => router.navigate('/customers')} />
            {data!.total > data!.list.length ? (
              <Text style={{ color: colors.ink3, fontSize: font.caption, marginTop: space[3] }}>
                Numbers use the first {count(data!.list.length)} of {count(data!.total)} customers, same as the website.
              </Text>
            ) : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Tile({ label, value, bg, ink = colors.ink }: { label: string; value: string; bg: string; ink?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: bg, borderRadius: radius.md, padding: space[3] }}>
      <Text style={{ fontSize: font.caption, color: ink === colors.ink ? colors.ink2 : ink }}>{label}</Text>
      <Text style={{ fontSize: 26, fontWeight: '700', color: ink, marginTop: 2 }}>{value}</Text>
    </View>
  );
}

function Attention({ icon, title, sub, n, warm, onPress }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; sub: string; n: number; warm?: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${n}`} onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', minHeight: 60, borderBottomWidth: 1, borderBottomColor: colors.border, opacity: pressed ? 0.6 : 1 })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: warm ? colors.peach : colors.tileGreen, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
        <Ionicons name={icon} size={18} color={warm ? colors.peachInk : colors.mintInk} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{title}</Text>
        <Text style={{ fontSize: font.caption, color: colors.ink3 }}>{sub}</Text>
      </View>
      <View style={{ minWidth: 24, height: 24, borderRadius: 12, paddingHorizontal: 6, backgroundColor: warm ? colors.peach : colors.tileGreen, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: font.caption, fontWeight: '700', color: warm ? colors.peachInk : colors.mintInk }}>{n}</Text>
      </View>
    </Pressable>
  );
}
