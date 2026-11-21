import React from 'react';
import { Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { CustomerFormScreen } from '@/components/customer-form-screen';
import { Banner, Btn, Screen } from '@/components/ui';
import { colors, font } from '@/constants/theme';
import { can } from '@/lib/actions';
import { fetchCustomer } from '@/lib/customers';
import { api } from '@/state/api';
import { useSession } from '@/state/session';
import { useLoad } from '@/state/useLoad';

export default function EditCustomer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const { data, error, loading, reload } = useLoad(() => fetchCustomer(api, String(id)), [id]);
  if (!can.editCustomer(user?.role)) {
    return <Screen><Banner>Your role cannot edit customers.</Banner><Btn label="Close" variant="secondary" onPress={() => router.back()} /></Screen>;
  }
  if (data) return <CustomerFormScreen existing={data} />;
  return (
    <Screen>
      {error ? <><Banner>{error}</Banner><Btn label="Try again" onPress={reload} /></> : loading ? <Text style={{ color: colors.ink3, fontSize: font.body }}>Loading customer…</Text> : null}
    </Screen>
  );
}
