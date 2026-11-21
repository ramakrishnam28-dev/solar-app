import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';

import { MIN_TAP, colors, font, space } from '@/constants/theme';

/** Full-screen form with a close button and a sticky bottom bar. */
export function FormScreen({ title, sub, bottom, children }: { title: string; sub?: string; bottom?: React.ReactNode; children: React.ReactNode }) {
  return (
    <SafeAreaView edges={['top', 'bottom']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[2], paddingVertical: space[2], backgroundColor: colors.surface }}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/customers'))} style={{ width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="close" size={24} color={colors.ink} />
        </Pressable>
        <View style={{ flex: 1, marginLeft: 4 }}>
          <Text accessibilityRole="header" numberOfLines={1} style={{ fontSize: font.title, fontWeight: '600', color: colors.ink }}>{title}</Text>
          {sub ? <Text numberOfLines={1} style={{ fontSize: font.caption, color: colors.ink2 }}>{sub}</Text> : null}
        </View>
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: space[4], paddingBottom: space[6] }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        {bottom ? <View style={{ flexDirection: 'row', gap: space[3], padding: space[3], backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border }}>{bottom}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: space[4], marginBottom: space[3] }}>
      <Text accessibilityRole="header" style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink, marginBottom: space[3] }}>{title}</Text>
      {children}
    </View>
  );
}
