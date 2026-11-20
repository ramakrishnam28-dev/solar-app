import React, { useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
  type StyleProp, type TextInputProps, type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

import { MIN_TAP, colors, font, radius, space, type Tone } from '@/constants/theme';

export function Screen({ children, scroll = true, padded = true, bottomInset = 0 }: {
  children: React.ReactNode; scroll?: boolean; padded?: boolean; bottomInset?: number;
}) {
  const body = scroll ? (
    <ScrollView
      contentContainerStyle={[padded && { padding: space[4] }, { paddingBottom: space[6] + bottomInset }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[{ flex: 1 }, padded && { padding: space[4] }]}>{children}</View>
  );
  return <SafeAreaView edges={['top']} style={s.screen}>{body}</SafeAreaView>;
}

export function Title({ children, sub }: { children: React.ReactNode; sub?: string }) {
  return (
    <View style={{ marginBottom: space[4] }}>
      <Text accessibilityRole="header" style={s.title}>{children}</Text>
      {sub ? <Text style={s.sub}>{sub}</Text> : null}
    </View>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={s.sectionLabel}>{children}</Text>;
}

type BtnVariant = 'primary' | 'secondary' | 'danger' | 'ghost';
export function Btn({ label, onPress, variant = 'primary', loading, disabled, icon, style }: {
  label: string; onPress: () => void; variant?: BtnVariant; loading?: boolean; disabled?: boolean;
  icon?: React.ComponentProps<typeof Ionicons>['name']; style?: StyleProp<ViewStyle>;
}) {
  const off = disabled || loading;
  const fg = variant === 'primary' ? colors.white : variant === 'danger' ? colors.tone.problem.fg : colors.brand;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [
        s.btn,
        variant === 'primary' && { backgroundColor: pressed ? colors.brandHover : colors.brand },
        variant === 'secondary' && { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
        variant === 'danger' && { backgroundColor: colors.tone.problem.bg },
        variant === 'ghost' && { backgroundColor: 'transparent' },
        pressed && variant !== 'primary' && { opacity: 0.7 },
        off && { opacity: 0.5 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {icon ? <Ionicons name={icon} size={18} color={fg} /> : null}
          <Text style={[s.btnText, { color: fg }]}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, error, secure, style, ...rest }: TextInputProps & { label: string; error?: string; secure?: boolean }) {
  const [hidden, setHidden] = useState(!!secure);
  return (
    <View style={[{ marginBottom: space[4] }, style as StyleProp<ViewStyle>]}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={[s.inputWrap, !!error && { borderColor: colors.tone.problem.fg }]}>
        <TextInput
          {...rest}
          accessibilityLabel={label}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          placeholderTextColor={colors.ink3}
          style={s.input}
        />
        {secure ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((h) => !h)}
            style={s.eye}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={22} color={colors.ink2} />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text style={s.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  const t = colors.tone[tone];
  return (
    <View style={[s.pill, { backgroundColor: t.bg }]}>
      <Text style={[s.pillText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

export function Banner({ tone = 'problem', children }: { tone?: Tone; children: React.ReactNode }) {
  const t = colors.tone[tone];
  return (
    <View accessibilityRole="alert" style={[s.banner, { backgroundColor: t.bg }]}>
      <Text style={{ color: t.fg, fontSize: font.small, lineHeight: 19 }}>{children}</Text>
    </View>
  );
}

export function Row({ icon, label, value, onPress, right }: {
  icon?: React.ComponentProps<typeof Ionicons>['name']; label: string; value?: string; onPress?: () => void; right?: React.ReactNode;
}) {
  const inner = (
    <View style={s.row}>
      {icon ? <Ionicons name={icon} size={20} color={colors.ink2} style={{ marginRight: space[3] }} /> : null}
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {value ? <Text style={s.rowValue}>{value}</Text> : null}
      </View>
      {right ?? (onPress ? <Ionicons name="chevron-forward" size={18} color={colors.ink3} /> : null)}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.6 }}>
      {inner}
    </Pressable>
  ) : inner;
}

export function Divider() { return <View style={s.divider} />; }

export function Empty({ icon, title, text }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; text: string }) {
  return (
    <View style={s.empty}>
      <Ionicons name={icon} size={36} color={colors.ink3} />
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={s.emptyText}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  title: { fontSize: font.large, fontWeight: '700', color: colors.ink },
  sub: { fontSize: font.body, color: colors.ink2, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.border, padding: space[4], marginBottom: space[3] },
  sectionLabel: { fontSize: font.caption, fontWeight: '600', color: colors.ink3, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: space[3], marginBottom: space[2], marginLeft: 4 },
  btn: { minHeight: 48, minWidth: MIN_TAP, borderRadius: radius.md, paddingHorizontal: space[4], alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: font.lead, fontWeight: '600' },
  fieldLabel: { fontSize: font.small, fontWeight: '600', color: colors.ink2, marginBottom: 6 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, minHeight: 50 },
  input: { flex: 1, fontSize: font.lead, color: colors.ink, paddingHorizontal: space[3], paddingVertical: 10 },
  eye: { width: MIN_TAP, height: MIN_TAP, alignItems: 'center', justifyContent: 'center' },
  fieldError: { color: colors.tone.problem.fg, fontSize: font.small, marginTop: 4 },
  pill: { alignSelf: 'flex-start', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { fontSize: font.caption, fontWeight: '600' },
  banner: { borderRadius: radius.md, padding: space[3], marginBottom: space[4] },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: space[2] },
  rowLabel: { fontSize: font.body, color: colors.ink },
  rowValue: { fontSize: font.small, color: colors.ink2, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border },
  empty: { alignItems: 'center', padding: space[6], gap: 6 },
  emptyTitle: { fontSize: font.lead, fontWeight: '600', color: colors.ink, marginTop: 6 },
  emptyText: { fontSize: font.body, color: colors.ink2, textAlign: 'center' },
});
