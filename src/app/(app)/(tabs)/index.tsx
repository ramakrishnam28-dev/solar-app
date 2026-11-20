import React from 'react';
import { Text, View } from 'react-native';

import { Card, Empty, Pill, Screen, SectionLabel, Title } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { colors, font } from '@/constants/theme';
import { PAGE_KEYS, PAGE_LABELS, ROLE_LABELS } from '@/lib/permissions';
import { useSession } from '@/state/session';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default function Home() {
  const { user, can } = useSession();
  const first = (user?.name ?? '').split(' ')[0];
  const allowed = PAGE_KEYS.filter((p) => can(p) && p !== 'profile');

  return (
    <Screen bottomInset={TAB_BAR_SPACE}>
      <Title sub={user ? `${ROLE_LABELS[user.role] ?? user.role}${user.emp_id ? ' · ' + user.emp_id : ''}` : undefined}>
        {greeting()}, {first || 'there'}
      </Title>

      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: font.lead, fontWeight: '600', color: colors.ink }}>Signed in</Text>
          <Pill tone="done">Connected</Pill>
        </View>
        <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 6 }}>
          Your account can open {allowed.length} sections. They arrive in the app phase by phase.
        </Text>
      </Card>

      <SectionLabel>Your access</SectionLabel>
      <Card>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {allowed.map((p) => (
            <View key={p} style={{ backgroundColor: colors.brandTint, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: colors.brand, fontSize: font.small, fontWeight: '600' }}>{PAGE_LABELS[p]}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Empty icon="construct-outline" title="Dashboard comes next" text="Phase 1 adds today's numbers, the customer list and the customer screen." />
    </Screen>
  );
}
