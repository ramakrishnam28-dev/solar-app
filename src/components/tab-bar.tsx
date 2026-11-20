import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { MIN_TAP, colors, font, radius } from '@/constants/theme';
import type { TabKey } from '@/lib/permissions';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const META: Record<TabKey, { label: string; icon: IconName; iconOn: IconName; route: string }> = {
  home: { label: 'Home', icon: 'home-outline', iconOn: 'home', route: 'index' },
  customers: { label: 'Customers', icon: 'people-outline', iconOn: 'people', route: 'customers' },
  new: { label: 'New customer', icon: 'add', iconOn: 'add', route: '' },
  tasks: { label: 'Tasks', icon: 'construct-outline', iconOn: 'construct', route: 'tasks' },
  more: { label: 'More', icon: 'ellipsis-horizontal', iconOn: 'ellipsis-horizontal', route: 'more' },
};

/** Floating pill tab bar with a centre "+" (wireframes). `order` is decided by role. */
export function TabBar({ state, emitter, navigateToTab, order }: BottomTabBarProps & { order: TabKey[] }) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;

  return (
    <View pointerEvents="box-none" style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={s.bar}>
        {order.map((key) => {
          const m = META[key];
          if (key === 'new') {
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel="New customer"
                onPress={() => router.push('/new-customer')}
                hitSlop={{ top: 24 }}
                style={s.fabSlot}>
                <View style={s.fab}><Ionicons name="add" size={30} color={colors.white} /></View>
              </Pressable>
            );
          }
          const route = state.routes.find((r) => r.name === m.route);
          if (!route) return null;
          const focused = activeName === m.route;
          return (
            <Pressable
              key={key}
              accessibilityRole="tab"
              accessibilityLabel={m.label}
              accessibilityState={{ selected: focused }}
              onPress={() => {
                const e = emitter.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !e.defaultPrevented) navigateToTab(route.key);
              }}
              style={s.item}>
              <Ionicons name={focused ? m.iconOn : m.icon} size={22} color={focused ? colors.brand : colors.ink3} />
              <Text style={[s.label, { color: focused ? colors.brand : colors.ink3 }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 12 },
  bar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around',
    backgroundColor: colors.surface, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border,
    minHeight: 64, paddingHorizontal: 6,
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },
  item: { flex: 1, minHeight: MIN_TAP + 12, minWidth: MIN_TAP, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: font.caption, fontWeight: '600' },
  fabSlot: { width: 76, minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center',
    transform: [{ translateY: -16 }], borderWidth: 4, borderColor: colors.bg,
  },
});

/** Space the page content needs at the bottom so the last card clears the bar. */
export const TAB_BAR_SPACE = 100;
