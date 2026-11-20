import React from 'react';
import { Pressable, Text, View } from 'react-native';

import { Banner, Btn, Card, Divider, Empty, Pill, Screen, SectionLabel, Title } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { colors, font, radius, space } from '@/constants/theme';
import { fetchAllForDashboard } from '@/lib/customers';
import { computeKpis, computeOps } from '@/lib/dashboard';
import { count } from '@/lib/format';
import { ROLE_LABELS } from '@/lib/permissions';
import { api } from '@/state/api';
import { useSession } from '@/state/session';
import { useDataVersion } from '@/state/dataVersion';
import { useLoad } from '@/state/useLoad';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { user, can } = useSession();
  const first = (user?.name ?? '').split(' ')[0];
  const allowed = can('dashboard');
  const version = useDataVersion();
  const { data, error, loading, refreshing, refresh, reload } = useLoad(() => fetchAllForDashboard(api), [version]);

  const kpis = data ? computeKpis(data.list, data.total) : [];
  const ops = data ? computeOps(data.list) : [];
  const truncated = !!data && data.total > data.list.length;

  return (
    <Screen bottomInset={TAB_BAR_SPACE} refreshing={refreshing} onRefresh={allowed ? refresh : undefined}>
      <Title sub={user ? `${ROLE_LABELS[user.role] ?? user.role}${user.emp_id ? ' · ' + user.emp_id : ''}` : undefined}>
        {greeting()}, {first || 'there'}
      </Title>

      {!allowed ? (
        <Empty icon="lock-closed-outline" title="No dashboard for your role" text="Use the other tabs to open your work." />
      ) : error && !data ? (
        <>
          <Banner>{error}</Banner>
          <Btn label="Try again" onPress={reload} />
        </>
      ) : loading && !data ? (
        <Text accessibilityLiveRegion="polite" style={{ color: colors.ink3, fontSize: font.body }}>Loading today's numbers…</Text>
      ) : data ? (
        <>
          {error ? <Banner tone="waiting">{error} Showing the last numbers.</Banner> : null}
          {kpis.map((k) => (
            <Card key={k.label}>
              <Text style={{ fontSize: font.small, color: colors.ink2, fontWeight: '600' }}>{k.label}</Text>
              <Text style={{ fontSize: 34, fontWeight: '700', color: colors.ink, marginTop: 2 }}>{count(k.value)}</Text>
              <Text style={{ fontSize: font.small, color: k.tone === 'warn' ? colors.tone.waiting.fg : colors.ink3, marginTop: 2 }}>{k.note}</Text>
            </Card>
          ))}

          <SectionLabel>Follow-ups</SectionLabel>
          <Card style={{ paddingVertical: space[1] }}>
            {ops.map((o, i) => (
              <View key={o.id}>
                {i > 0 ? <Divider /> : null}
                <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingVertical: 6 }}>
                  <Text style={{ width: 36, color: colors.ink3, fontSize: font.caption, fontWeight: '600' }}>{o.id}</Text>
                  <Text style={{ flex: 1, color: colors.ink, fontSize: font.body }}>{o.label}</Text>
                  <View style={{ minWidth: 36, alignItems: 'flex-end' }}>
                    {o.count ? <Pill tone="waiting">{count(o.count)}</Pill> : <Text style={{ color: colors.ink3, fontSize: font.body }}>0</Text>}
                  </View>
                </View>
              </View>
            ))}
          </Card>
          {truncated ? (
            <Text style={{ color: colors.ink3, fontSize: font.caption, marginTop: space[2] }}>
              Follow-up counts use the first {count(data.list.length)} of {count(data.total)} customers, same as the website.
            </Text>
          ) : null}
        </>
      ) : null}
    </Screen>
  );
}
