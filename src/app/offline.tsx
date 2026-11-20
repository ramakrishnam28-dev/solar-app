import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { Btn } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { useSession } from '@/state/session';

export default function Offline() {
  const { retry, logout, offlineMessage } = useSession();
  const [busy, setBusy] = useState(false);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space[5], justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: space[6] }}>
        <Ionicons name="cloud-offline-outline" size={56} color={colors.ink3} />
        <Text accessibilityRole="header" style={{ fontSize: font.title, fontWeight: '700', color: colors.ink, marginTop: space[3] }}>Can't reach the server</Text>
        <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 6, textAlign: 'center' }}>
          {offlineMessage || 'Check your connection and try again.'}
        </Text>
        <Text style={{ fontSize: font.small, color: colors.ink3, marginTop: 10, textAlign: 'center' }}>
          You are still signed in. If the server was asleep, it can take up to a minute to wake.
        </Text>
      </View>
      <Btn label="Try again" onPress={async () => { setBusy(true); await retry(); setBusy(false); }} loading={busy} />
      <Btn label="Sign out" variant="ghost" onPress={logout} style={{ marginTop: space[2] }} />
    </SafeAreaView>
  );
}
