import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import type { BottomTabBarProps } from 'expo-router/js-tabs';

import { MIN_TAP, colors, font, radius } from '@/constants/theme';
import { IOS_DESIGN } from '@/lib/design';
import type { TabKey } from '@/lib/permissions';

type IconName = React.ComponentProps<typeof Ionicons>['name'];
const META: Record<TabKey, { label: string; icon: IconName; iconOn: IconName; route: string }> = {
  home: { label: 'Home', icon: 'home-outline', iconOn: 'home', route: 'index' },
  customers: { label: 'Customers', icon: 'people-outline', iconOn: 'people', route: 'customers' },
  new: { label: 'New customer', icon: 'add', iconOn: 'add', route: '' },
  tasks: { label: 'Tasks', icon: 'list-outline', iconOn: 'list', route: 'tasks' },
  more: { label: 'More', icon: 'menu-outline', iconOn: 'menu', route: 'more' },
};

/**
 * Android (wireframes A1–A6): 4 destinations, pill indicator behind the active icon, extended FAB above the bar.
 * iOS: floating pill bar with a centre "+". `order` is decided by role.
 */
export function TabBar({ state, emitter, navigateToTab, order }: BottomTabBarProps & { order: TabKey[] }) {
  const insets = useSafeAreaInsets();
  const activeName = state.routes[state.index]?.name;
  const canNew = order.includes('new');
  const items = IOS_DESIGN ? order : order.filter((k) => k !== 'new');

  const press = (routeKey: string, focused: boolean) => {
    const e = emitter.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
    if (!focused && !e.defaultPrevented) navigateToTab(routeKey);
  };

  if (IOS_DESIGN) {
    return (
      <View pointerEvents="box-none" style={[s.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={s.bar}>
          {items.map((key) => {
            const m = META[key];
            if (key === 'new') {
              return (
                <Pressable key={key} accessibilityRole="button" accessibilityLabel="New customer" onPress={() => router.push('/new-customer')} hitSlop={{ top: 24 }} style={s.fabSlot}>
                  <View style={s.fab}><Ionicons name="add" size={30} color={colors.white} /></View>
                </Pressable>
              );
            }
            const route = state.routes.find((r) => r.name === m.route);
            if (!route) return null;
            const focused = activeName === m.route;
            return (
              <Pressable key={key} accessibilityRole="tab" accessibilityLabel={m.label} accessibilityState={{ selected: focused }} onPress={() => press(route.key, focused)} style={s.item}>
                <Ionicons name={focused ? m.iconOn : m.icon} size={22} color={focused ? colors.brand : colors.ink3} />
                <Text style={[s.label, { color: focused ? colors.brand : colors.ink3 }]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  }

  const onHome = activeName === 'index';
  const onCustomers = activeName === 'customers';
  const fabLabel = onCustomers ? 'New' : 'New customer';
  return (
    <View pointerEvents="box-none" style={s.aWrap}>
      {canNew && (onHome || onCustomers) ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="New customer"
          onPress={() => router.push('/new-customer')}
          style={({ pressed }) => [s.xfab, pressed && { opacity: 0.8 }]}>
          <Ionicons name="add" size={22} color={colors.mintInk} />
          <Text style={s.xfabText}>{fabLabel}</Text>
        </Pressable>
      ) : null}
      <View style={[s.aBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        {items.map((key) => {
          const m = META[key];
          const route = state.routes.find((r) => r.name === m.route);
          if (!route) return null;
          const focused = activeName === m.route;
          return (
            <Pressable key={key} accessibilityRole="tab" accessibilityLabel={m.label} accessibilityState={{ selected: focused }} onPress={() => press(route.key, focused)} style={s.aItem}>
              <View style={[s.aPill, focused && { backgroundColor: colors.mint }]}>
                <Ionicons name={focused ? m.iconOn : m.icon} size={22} color={focused ? colors.mintInk : colors.ink2} />
              </View>
              <Text style={[s.aLabel, { color: focused ? colors.ink : colors.ink2, fontWeight: focused ? '700' : '500' }]}>{m.label}</Text>
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
  aWrap: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  aBar: {
    flexDirection: 'row', backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: 10,
  },
  aItem: { flex: 1, alignItems: 'center', minHeight: MIN_TAP + 16, gap: 4 },
  aPill: { width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  aLabel: { fontSize: font.caption },
  xfab: {
    position: 'absolute', right: 16, bottom: 92, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.mint, borderRadius: radius.lg, paddingHorizontal: 20, height: 56,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  xfabText: { fontSize: font.body, fontWeight: '700', color: colors.mintInk },
});

/** Space the page content needs at the bottom so the last card clears the bar and the FAB. */
export const TAB_BAR_SPACE = 160;
