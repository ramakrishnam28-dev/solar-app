import React, { useEffect, useState } from 'react';
import { Platform, Pressable, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { Choice } from '@/components/action-modal';
import { Field } from '@/components/ui';
import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import { amountInWords } from '@/lib/deal';
import { fetchInstallers } from '@/lib/progress-ops';
import { api } from '@/state/api';

/** Text with **bold** parts (the website's <strong>). */
export function Rich({ text, style }: { text: string; style?: object }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return (
    <Text style={[{ fontSize: font.small, color: colors.ink2, lineHeight: 20 }, style]}>
      {parts.map((p, i) => (p.startsWith('**') ? <Text key={i} style={{ fontWeight: '700', color: colors.ink }}>{p.slice(2, -2)}</Text> : p))}
    </Text>
  );
}

/** Rupee field with the amount in words under it (dcShowWords on the website). */
export function MoneyField({ label, value, onChange, error, placeholder }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string }) {
  const words = amountInWords(value);
  return (
    <View>
      <Field label={label} value={value} onChangeText={(t) => onChange(t.replace(/[^\d.]/g, ''))} keyboardType="decimal-pad" placeholder={placeholder} error={error} style={{ marginBottom: words ? 2 : space[4] }} />
      {words ? <Text style={{ fontSize: font.caption, color: colors.brand, marginBottom: space[3] }}>{words}</Text> : null}
    </View>
  );
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date as YYYY-MM-DD. Phone: calendar dialog. Web preview: typed date. */
export function DateField({ label, value, onChange, error, minToday, maxToday }: { label: string; value: string; onChange: (v: string) => void; error?: string; minToday?: boolean; maxToday?: boolean }) {
  const [open, setOpen] = useState(false);
  if (Platform.OS === 'web') {
    return <Field label={label} value={value} onChangeText={onChange} placeholder="YYYY-MM-DD" error={error} />;
  }
  const d = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(value + 'T00:00:00') : new Date();
  return (
    <View style={{ marginBottom: space[4] }}>
      <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.ink2, marginBottom: 6 }}>{label}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label}, ${value || 'not set'}`} onPress={() => setOpen(true)}
        style={{ minHeight: 50, borderWidth: 1, borderColor: error ? colors.tone.problem.fg : colors.border, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[3], gap: space[2] }}>
        <Ionicons name="calendar-outline" size={20} color={colors.ink2} />
        <Text style={{ fontSize: font.lead, color: value ? colors.ink : colors.ink3 }}>{value ? new Date(value + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pick a date'}</Text>
      </Pressable>
      {error ? <Text style={{ color: colors.tone.problem.fg, fontSize: font.small, marginTop: 4 }}>{error}</Text> : null}
      {open ? (
        <DateTimePicker value={d} mode="date" minimumDate={minToday ? new Date() : undefined} maximumDate={maxToday ? new Date() : undefined}
          onChange={(e, sel) => { setOpen(false); if (e.type === 'set' && sel) onChange(iso(sel)); }} />
      ) : null}
    </View>
  );
}

export function RadioField({ label, options, value, onChange, error }: { label: string; options: { value: string; label: string; hint?: string }[]; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <View style={{ marginBottom: space[3] }} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => (
        <View key={o.value}>
          <Choice label={o.label} selected={value === o.value} onPress={() => onChange(o.value)} />
          {o.hint ? <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: -4, marginBottom: space[2], marginLeft: 36 }}>{o.hint}</Text> : null}
        </View>
      ))}
      {error ? <Text style={{ color: colors.tone.problem.fg, fontSize: font.small }}>{error}</Text> : null}
    </View>
  );
}

/** Installer list from /customers/team/installers (upLoadInstallers on the website). */
export function InstallerField({ value, onChange, error }: { value: string; onChange: (v: string) => void; error?: string }) {
  const [list, setList] = useState<{ id: string; name: string; phone?: string | null }[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => { fetchInstallers(api).then(setList).catch(() => setFailed(true)); }, []);
  if (failed) return <Text style={{ color: colors.tone.problem.fg, fontSize: font.small, marginBottom: space[2] }}>Could not load installers.</Text>;
  if (!list) return <Text style={{ color: colors.ink3, fontSize: font.small, marginBottom: space[2] }}>Loading installers…</Text>;
  if (!list.length) return <Text style={{ color: colors.ink2, fontSize: font.small, marginBottom: space[2] }}>No installers found. Add users with the installer role.</Text>;
  return (
    <View style={{ marginBottom: space[2] }}>
      {list.map((u) => <Choice key={u.id} label={u.name + (u.phone ? ' · ' + u.phone : '')} selected={value === u.id} onPress={() => onChange(u.id)} />)}
      {error ? <Text style={{ color: colors.tone.problem.fg, fontSize: font.small }}>{error}</Text> : null}
    </View>
  );
}

/** Small pill button used inside cards (44 px tall tap area). */
export function SmallBtn({ label, onPress, tone = 'outline', disabled, hint }: { label: string; onPress: () => void; tone?: 'outline' | 'green' | 'red' | 'mint'; disabled?: boolean; hint?: string }) {
  const bg = tone === 'green' ? colors.brand : tone === 'mint' ? colors.mint : colors.surface;
  const fg = tone === 'green' ? colors.white : tone === 'red' ? colors.tone.problem.fg : tone === 'mint' ? colors.mintInk : colors.brand;
  const border = tone === 'red' ? '#fecaca' : tone === 'green' ? colors.brand : tone === 'mint' ? colors.mint : colors.ink;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityHint={hint} accessibilityState={{ disabled: !!disabled }} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ minHeight: MIN_TAP, minWidth: MIN_TAP, paddingHorizontal: 14, borderRadius: radius.pill, borderWidth: 1, borderColor: border, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.45 : pressed ? 0.7 : 1 })}>
      <Text numberOfLines={1} style={{ fontSize: font.small, fontWeight: '600', color: fg }}>{label}</Text>
    </Pressable>
  );
}

export function TextLine({ label, value, onChange, error, placeholder, upper, multiline }: { label: string; value: string; onChange: (v: string) => void; error?: string; placeholder?: string; upper?: boolean; multiline?: boolean }) {
  return <Field label={label} value={value} onChangeText={(t) => onChange(upper ? t.toUpperCase() : t)} placeholder={placeholder} error={error} autoCapitalize={upper ? 'characters' : 'sentences'} multiline={multiline} numberOfLines={multiline ? 3 : 1} textAlignVertical={multiline ? 'top' : 'center'} />;
}

export const TextInputRaw = TextInput;
