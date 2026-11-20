import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';

import { Banner, Btn, Field } from '@/components/ui';
import { colors, font, space } from '@/constants/theme';
import { useSession } from '@/state/session';

// Same rule as the backend login validator.
const ID_RE = /^([^\s@]+@[^\s@]+\.[^\s@]+|EMP-\d+)$/i;

export default function SignIn() {
  const { login } = useSession();
  const [id, setId] = useState('');
  const [pw, setPw] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [idErr, setIdErr] = useState('');
  const [pwErr, setPwErr] = useState('');

  async function submit() {
    const v = id.trim();
    const e1 = ID_RE.test(v) ? '' : 'Enter your email or employee ID (for example EMP-001).';
    const e2 = pw.length >= 6 ? '' : 'Password must be at least 6 characters.';
    setIdErr(e1); setPwErr(e2); setErr('');
    if (e1 || e2) return;
    setBusy(true);
    try {
      await login(v, pw);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Sign in failed.');
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: space[5], flexGrow: 1, justifyContent: 'center' }} keyboardShouldPersistTaps="handled">
          <View style={{ alignItems: 'center', marginBottom: space[5] }}>
            <Image source={require('../../assets/images/icon.png')} style={{ width: 84, height: 84, borderRadius: 20 }} accessibilityLabel="RCAL Station logo" />
            <Text accessibilityRole="header" style={{ fontSize: font.large, fontWeight: '700', color: colors.ink, marginTop: space[3] }}>RCAL Station</Text>
            <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 2 }}>Sign in to continue</Text>
          </View>

          {err ? <Banner>{err}</Banner> : null}

          <Field
            label="Email or employee ID"
            value={id}
            onChangeText={setId}
            error={idErr}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            textContentType="username"
            returnKeyType="next"
            editable={!busy}
            placeholder="EMP-001"
          />
          <Field
            label="Password"
            value={pw}
            onChangeText={setPw}
            error={pwErr}
            secure
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="current-password"
            textContentType="password"
            returnKeyType="go"
            onSubmitEditing={submit}
            editable={!busy}
          />
          <Btn label="Sign in" onPress={submit} loading={busy} style={{ marginTop: space[2] }} />

          <Text style={{ fontSize: font.caption, color: colors.ink3, textAlign: 'center', marginTop: space[5], lineHeight: 17 }}>
            The connection is encrypted. You stay signed in on this phone until you sign out.{'\n'}
            Turn on fingerprint or face unlock in More after signing in.
          </Text>
          <Text style={{ fontSize: font.caption, color: colors.ink3, textAlign: 'center', marginTop: space[3] }}>
            Version {Constants.expoConfig?.version}
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
