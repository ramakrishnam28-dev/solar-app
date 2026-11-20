import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Btn } from '@/components/ui';
import { colors, font, radius, space } from '@/constants/theme';

/** Rule 2 of CLAUDE.md: anything not built yet says "Under development". */
export function UnderDevelopment({ title, text }: { title?: string; text?: string }) {
  return (
    <View style={{ alignItems: 'center', paddingVertical: space[6], paddingHorizontal: space[4] }}>
      <Ionicons name="construct-outline" size={36} color={colors.ink3} />
      {title ? <Text style={{ fontSize: font.lead, fontWeight: '700', color: colors.ink, marginTop: space[3] }}>{title}</Text> : null}
      <Text style={{ fontSize: font.body, fontWeight: '600', color: colors.ink2, marginTop: 4 }}>Under development</Text>
      {text ? <Text style={{ fontSize: font.small, color: colors.ink3, marginTop: 6, textAlign: 'center' }}>{text}</Text> : null}
    </View>
  );
}

const Ctx = createContext<(what: string) => void>(() => {});
/** Call the returned function from any button that is not built yet. */
export const useUnderDevelopment = () => useContext(Ctx);

export function UnderDevelopmentProvider({ children }: { children: React.ReactNode }) {
  const [what, setWhat] = useState<string | null>(null);
  const open = useCallback((w: string) => setWhat(w), []);
  return (
    <Ctx.Provider value={open}>
      {children}
      {what ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setWhat(null)} statusBarTranslucent>
          <Pressable accessibilityLabel="Close dialog" onPress={() => setWhat(null)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: space[5] }}>
            <Pressable accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: space[5], width: '100%', maxWidth: 360 }}>
              <Text accessibilityRole="header" style={{ fontSize: font.title, fontWeight: '700', color: colors.ink }}>{what}</Text>
              <Text style={{ fontSize: font.body, color: colors.ink2, marginTop: 6, marginBottom: space[4] }}>Under development</Text>
              <Btn label="OK" onPress={() => setWhat(null)} />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </Ctx.Provider>
  );
}
