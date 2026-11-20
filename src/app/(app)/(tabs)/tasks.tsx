import React from 'react';

import { Empty, Screen, Title } from '@/components/ui';
import { TAB_BAR_SPACE } from '@/components/tab-bar';

export default function Tasks() {
  return (
    <Screen bottomInset={TAB_BAR_SPACE}>
      <Title>Tasks</Title>
      <Empty icon="construct-outline" title="Coming soon" text={'Work queues for installers, agents and loan officers arrive in Phase 4.'} />
    </Screen>
  );
}
