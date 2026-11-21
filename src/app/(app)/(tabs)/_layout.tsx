import React from 'react';
import { Tabs } from 'expo-router/js-tabs';

import { TabBar } from '@/components/tab-bar';
import { tabsFor } from '@/lib/permissions';
import { useSession } from '@/state/session';

export default function TabsLayout() {
  const { can, user } = useSession();
  const order = tabsFor(can, user?.role);
  const show = (k: 'home' | 'customers' | 'tasks' | 'more') => (order.includes(k) ? undefined : null);

  return (
    <Tabs tabBar={(props) => <TabBar {...props} order={order} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home', href: show('home') }} />
      <Tabs.Screen name="customers" options={{ title: 'Customers', href: show('customers') }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tasks', href: show('tasks') }} />
      <Tabs.Screen name="more" options={{ title: 'More', href: show('more') }} />
    </Tabs>
  );
}
