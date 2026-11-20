import React from 'react';
import { router } from 'expo-router';

import { Btn, Empty, Screen, Title } from '@/components/ui';

export default function NewCustomer() {
  return (
    <Screen>
      <Title sub="Step by step, camera first">New customer</Title>
      <Empty icon="person-add-outline" title="Coming in Phase 3" text="The three-step form with camera, GPS and documents arrives in Phase 3." />
      <Btn label="Close" variant="secondary" onPress={() => router.back()} />
    </Screen>
  );
}
