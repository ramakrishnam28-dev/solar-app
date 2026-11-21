import React from 'react';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="customer/[id]" />
      <Stack.Screen name="new-customer" options={{ presentation: 'modal' }} />
      <Stack.Screen name="edit-customer/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="kyc/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="deal/[id]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="loans" />
      <Stack.Screen name="tracker/[key]" />
    </Stack>
  );
}
