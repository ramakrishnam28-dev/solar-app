import React from 'react';
import { router } from 'expo-router';

import { CustomerFormScreen } from '@/components/customer-form-screen';
import { Btn, Empty, Screen } from '@/components/ui';
import { can } from '@/lib/actions';
import { useSession } from '@/state/session';

export default function NewCustomer() {
  const { user } = useSession();
  if (!can.createCustomer(user?.role)) {
    return (
      <Screen>
        <Empty icon="lock-closed-outline" title="Not available for your role" text="Only admins, managers and sales agents add customers." />
        <Btn label="Close" variant="secondary" onPress={() => router.back()} />
      </Screen>
    );
  }
  return <CustomerFormScreen />;
}
