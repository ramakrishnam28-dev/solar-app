import React, { useCallback, useEffect, useState } from 'react';
import { Image, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Btn } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { useSession } from '@/state/session';

export default function Locked() {
  const { unlock, logout } = useSession();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  const tryUnlock = useCallback(async () => {
    setBusy(true); setFailed(false);
    const ok = await unlock();
    if (!ok) { setFailed(true); setBusy(false); }
  }, [unlock]);

  useEffect(() => { void tryUnlock(); }, [tryUnlock]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg, padding: space[5], justifyContent: 'center' }}>
      <View style={{ alignItems: 'center', marginBottom: space[6] }}>
        <Image source={require('../../assets/images/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} accessibilityLabel="RCAL Station logo" />
        <Text accessibilityRole="header" style={{ fontSize: font.title, fontWeight: '700', color: colors.ink, marginTop: space[3] }}>RCAL Station is locked</Text>
        <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 4, textAlign: 'center' }}>
          {failed ? 'Not unlocked. Try again.' : 'Use your fingerprint, face or screen lock.'}
        </Text>
      </View>
      <Btn label="Unlock" icon="finger-print" onPress={tryUnlock} loading={busy} />
      <Btn label="Sign out" variant="ghost" onPress={logout} style={{ marginTop: space[2] }} />
    </SafeAreaView>
  );
}
