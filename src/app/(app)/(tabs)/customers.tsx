import React from 'react';

import { Empty, Screen, Title } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/components/tab-bar';

export default function Customers() {
  return (
    <Screen bottomInset={TAB_BAR_SPACE}>
      <Title>Customers</Title>
      <Empty icon="people-outline" title="Coming soon" text={'Customer list and the five-tab customer screen arrive in Phase 1.'} />
    </Screen>
  );
}
