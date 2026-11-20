import React, { useState } from 'react';
import { Linking, Switch, Text, View } from 'react-native';
import Constants from 'expo-constants';

import { Banner, Btn, Card, Divider, Pill, Row, Screen, SectionLabel, Title } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/components/tab-bar';
import { colors, font, space } from '@/constants/theme';
import { API_URL, LOCK_AFTER_MS, WEB_URL } from '@/lib/config';
import { confirm } from '@/lib/confirm';
import { PAGE_KEYS, PAGE_LABELS, ROLE_LABELS } from '@/lib/permissions';
import { useSession } from '@/state/session';

export default function More() {
  const { user, can, logout, biometricAvailable, biometricEnabled, setBiometricEnabled, checkConnection } = useSession();
  const [bioMsg, setBioMsg] = useState('');
  const [conn, setConn] = useState<{ ok: boolean; text: string } | null>(null);
  const [checking, setChecking] = useState(false);

  const webPages = PAGE_KEYS.filter((p) => can(p) && p !== 'dashboard' && p !== 'profile');

  async function toggleBio(on: boolean) {
    setBioMsg('');
    const r = await setBiometricEnabled(on);
    if (!r.ok && r.message) setBioMsg(r.message);
  }

  async function check() {
    setChecking(true); setConn(null);
    const r = await checkConnection();
    setConn({ ok: r.ok, text: r.ok ? `Connected (${r.ms} ms)` : r.message });
    setChecking(false);
  }

  return (
    <Screen bottomInset={TAB_BAR_SPACE}>
      <Title>More</Title>

      <Card>
        <Text style={{ fontSize: font.title, fontWeight: '700', color: colors.ink }}>{user?.name}</Text>
        <View style={{ marginTop: 6 }}><Pill tone="progress">{ROLE_LABELS[user?.role ?? ''] ?? user?.role}</Pill></View>
        <View style={{ marginTop: space[3] }}>
          {user?.emp_id ? <Row icon="id-card-outline" label="Employee ID" value={user.emp_id} /> : null}
          {user?.phone ? <Row icon="call-outline" label="Phone" value={user.phone} /> : null}
          {user?.email ? <Row icon="mail-outline" label="Email" value={user.email} /> : null}
          {user?.city ? <Row icon="location-outline" label="City" value={user.city} /> : null}
        </View>
      </Card>

      <SectionLabel>Security</SectionLabel>
      <Card>
        <Row
          icon="finger-print"
          label="Fingerprint or face unlock"
          value={biometricAvailable
            ? `Locks the app after ${Math.round(LOCK_AFTER_MS / 60000)} minutes in the background`
            : 'Not available. Set up a fingerprint, face or screen lock in your phone settings.'}
          right={
            <Switch
              accessibilityLabel="Fingerprint or face unlock"
              value={biometricEnabled}
              onValueChange={toggleBio}
              disabled={!biometricAvailable}
              trackColor={{ true: colors.brand, false: colors.border }}
            />
          }
        />
        {bioMsg ? <View style={{ marginTop: space[2] }}><Banner tone="waiting">{bioMsg}</Banner></View> : null}
      </Card>

      {webPages.length ? (
        <>
          <SectionLabel>Open on the web for now</SectionLabel>
          <Card style={{ paddingVertical: space[2] }}>
            {webPages.map((p, i) => (
              <View key={p}>
                {i > 0 ? <Divider /> : null}
                <Row label={PAGE_LABELS[p]} onPress={() => { if (WEB_URL) void Linking.openURL(WEB_URL); }} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionLabel>Connection</SectionLabel>
      <Card>
        <Row icon="server-outline" label="Server" value={API_URL.replace(/^https?:\/\//, '')} />
        {conn ? <View style={{ marginVertical: space[2] }}><Banner tone={conn.ok ? 'done' : 'problem'}>{conn.text}</Banner></View> : null}
        <Btn label="Check connection" variant="secondary" icon="pulse-outline" onPress={check} loading={checking} style={{ marginTop: space[2] }} />
      </Card>

      <Btn
        label="Sign out"
        variant="danger"
        icon="log-out-outline"
        onPress={() => confirm('Sign out?', 'You will need your password to sign in again.', 'Sign out', () => { void logout(); })}
        style={{ marginTop: space[4] }}
      />
      <Text style={{ fontSize: font.caption, color: colors.ink3, textAlign: 'center', marginTop: space[4] }}>
        RCAL Station {Constants.expoConfig?.version}
      </Text>
    </Screen>
  );
}
