import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';

/** Tick chips for picking one value (Material filter chips, same look as the Customers list). */
export function ChipSelect({ label, options, value, onChange, error }: {
  label: string; options: { value: string; label: string }[]; value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <View style={{ marginBottom: space[4] }}>
      <Text style={{ fontSize: font.small, fontWeight: '600', color: colors.ink2, marginBottom: 6 }}>{label}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((o) => {
          const on = o.value === value;
          return (
            <Pressable key={o.value} accessibilityRole="radio" accessibilityLabel={o.label} accessibilityState={{ selected: on, checked: on }} onPress={() => onChange(on ? '' : o.value)}
              style={{ minHeight: MIN_TAP, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1, borderColor: on ? colors.mint : colors.ink, backgroundColor: on ? colors.mint : colors.surface }}>
              {on ? <Ionicons name="checkmark" size={16} color={colors.mintInk} /> : null}
              <Text style={{ fontSize: font.small, fontWeight: '600', color: on ? colors.mintInk : colors.ink }}>{o.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text style={{ color: colors.tone.problem.fg, fontSize: font.small, marginTop: 4 }}>{error}</Text> : null}
    </View>
  );
}

/** "Step 2 of 3 · Site" with a segmented progress line. */
export function StepHeader({ step, steps }: { step: number; steps: string[] }) {
  return (
    <View style={{ marginBottom: space[4] }} accessibilityLabel={`Step ${step} of ${steps.length}, ${steps[step - 1]}`}>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {steps.map((s, i) => <View key={s} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? colors.brand : colors.border }} />)}
      </View>
      <Text style={{ fontSize: font.small, color: colors.ink2, marginTop: 6 }}>Step {step} of {steps.length} · {steps[step - 1]}</Text>
    </View>
  );
}

/** Grey summary rows on the review step. */
export function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <View style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <Text style={{ width: 130, fontSize: font.small, color: colors.ink2 }}>{label}</Text>
      <Text style={{ flex: 1, fontSize: font.body, color: colors.ink }}>{value && value.trim() ? value : '–'}</Text>
    </View>
  );
}

export const panel = { backgroundColor: colors.surface, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.ink, padding: space[4], marginBottom: space[3] } as const;
