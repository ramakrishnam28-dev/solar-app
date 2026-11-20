import React from 'react';
import { Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MIN_TAP, colors, font, radius, space } from '@/constants/theme';
import type { Source } from '@/lib/media';

/** Bottom sheet: camera first, then gallery, then PDF (documents only). */
export function SourceSheet({ title, photosOnly, onPick, onClose }: { title: string; photosOnly?: boolean; onPick: (s: Source) => void; onClose: () => void }) {
  const rows: [Source, string, React.ComponentProps<typeof Ionicons>['name']][] = [
    ['camera', 'Take photo', 'camera-outline'],
    ['library', 'Choose from gallery', 'images-outline'],
    ...(photosOnly ? [] : [['pdf', 'Pick a PDF or file', 'document-outline']] as [Source, string, React.ComponentProps<typeof Ionicons>['name']][]),
  ];
  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose} statusBarTranslucent>
      <Pressable accessibilityLabel="Close" onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
        <Pressable accessibilityViewIsModal style={{ backgroundColor: colors.surface, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: space[4], paddingBottom: space[6] }}>
          <Text accessibilityRole="header" style={{ fontSize: font.title, fontWeight: '700', color: colors.ink, marginBottom: space[3] }}>{title}</Text>
          {rows.map(([s, label, icon]) => (
            <Pressable key={s} accessibilityRole="button" accessibilityLabel={label} onPress={() => onPick(s)}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: space[3], minHeight: MIN_TAP + 8, opacity: pressed ? 0.6 : 1 })}>
              <Ionicons name={icon} size={24} color={colors.brand} />
              <Text style={{ fontSize: font.lead, color: colors.ink }}>{label}</Text>
            </Pressable>
          ))}
          <Text style={{ fontSize: font.caption, color: colors.ink3, marginTop: space[2] }}>JPG, PNG, HEIC, WEBP{photosOnly ? '' : ' or PDF'}, up to 10 MB.</Text>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
