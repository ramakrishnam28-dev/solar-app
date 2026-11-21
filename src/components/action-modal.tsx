import React, { useRef, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, View } from 'react-native';

import { Banner, Btn, Field } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';
import { reasonError } from '@/lib/actions';
import { ApiError } from '@/lib/api';

/**
 * One confirm dialog for every customer action.
 * - the confirm button locks while the request runs, so a double tap sends once
 * - a required reason is checked on the phone first (no request when it is too short)
 * - a server error stays in the dialog so nothing is lost
 */
export function ActionModal({ title, intro, confirmLabel, destructive, textLabel, textRequired, textPlaceholder, confirmWord, canConfirm = true, onConfirm, onClose, children }: {
  title: string; intro?: string; confirmLabel: string; destructive?: boolean;
  textLabel?: string; textRequired?: boolean; textPlaceholder?: string; confirmWord?: string; canConfirm?: boolean;
  onConfirm: (text: string) => Promise<unknown>; onClose: () => void; children?: React.ReactNode;
}) {
  const [text, setText] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [typed, setTyped] = useState('');
  const wordOk = !confirmWord || typed.trim() === confirmWord;
  const lock = useRef(false);

  const submit = async () => {
    if (lock.current || !wordOk) return;
    if (textLabel && textRequired) {
      const e = reasonError(text);
      if (e) { setFieldError(e); return; }
    }
    lock.current = true; setBusy(true); setError(null); setFieldError(undefined);
    try {
      await onConfirm(text);
    } catch (e) {
      // a "quiet" error is a field problem the caller already shows next to the field
      if (!(e as { quiet?: boolean })?.quiet) setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
      lock.current = false; setBusy(false);
    }
  };
  const close = () => { if (!lock.current) onClose(); };

  return (
    <Modal transparent animationType="slide" visible onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, justifyContent: 'flex-end' }}>
        <Pressable accessibilityLabel="Close dialog" onPress={close} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.45)' }} />
        <View accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, maxHeight: '88%', paddingBottom: space[5] }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: space[4] }}>
            <Text accessibilityRole="header" style={{ fontSize: font.title, fontWeight: '700', color: colors.ink }}>{title}</Text>
            {intro ? <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 6, marginBottom: space[3] }}>{intro}</Text> : <View style={{ height: space[3] }} />}
            {children}
            {textLabel ? (
              <Field
                label={`${textLabel}${textRequired ? '' : ' (optional)'}`}
                value={text}
                onChangeText={(t) => { setText(t); if (fieldError) setFieldError(undefined); }}
                error={fieldError}
                placeholder={textPlaceholder}
                multiline
                maxLength={500}
                numberOfLines={3}
                textAlignVertical="top"
                editable={!busy}
                style={{ marginTop: space[2] }}
              />
            ) : null}
            {confirmWord ? (
              <Field label={`Type ${confirmWord} to confirm`} value={typed} onChangeText={setTyped} autoCapitalize="characters" autoCorrect={false} editable={!busy} placeholder={confirmWord} />
            ) : null}
            {error ? <View style={{ marginTop: space[3] }}><Banner>{error}</Banner></View> : null}
            <View style={{ marginTop: space[4], gap: space[2] }}>
              <Btn label={confirmLabel} variant={destructive ? 'danger' : 'primary'} onPress={submit} loading={busy} disabled={!canConfirm || busy || !wordOk} />
              <Btn label="Cancel" variant="ghost" onPress={close} disabled={busy} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** One tappable choice row (radio style), at least 48 tall. */
export function Choice({ label, sub, selected, onPress }: { label: string; sub?: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, checked: selected }}
      aria-checked={selected}
      accessibilityLabel={label}
      onPress={onPress}
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingVertical: 8, paddingHorizontal: space[3], borderRadius: radius.md, borderWidth: 1.5, borderColor: selected ? colors.brand : colors.border, backgroundColor: selected ? colors.brandTint : colors.surface, marginBottom: space[2] }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: selected ? colors.brand : colors.ink3, alignItems: 'center', justifyContent: 'center', marginRight: space[3] }}>
        {selected ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.brand }} /> : null}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink }}>{label}</Text>
        {sub ? <Text style={{ fontSize: font.small, color: colors.ink2, marginTop: 2 }}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}
