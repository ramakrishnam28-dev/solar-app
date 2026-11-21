import React from 'react';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { PhotoStampHost } from '@/components/photo-stamp';
import { UnderDevelopmentProvider } from '@/components/under-development';
import { SessionProvider, useSession } from '@/state/session';

SplashScreen.preventAutoHideAsync();

function SplashController() {
  const { status } = useSession();
  if (status !== 'loading') SplashScreen.hide();
  return null;
}

/** Each screen group is only reachable in its own session state. */
function Navigator() {
  const { status } = useSession();
  return (
    <>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#f4fbf7' } }}>
        <Stack.Protected guard={status === 'signedOut'}>
          <Stack.Screen name="sign-in" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'locked'}>
          <Stack.Screen name="locked" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'offline'}>
          <Stack.Screen name="offline" />
        </Stack.Protected>
        <Stack.Protected guard={status === 'signedIn'}>
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function Root() {
  return (
    <SafeAreaProvider>
      <SessionProvider>
        <SplashController />
        <UnderDevelopmentProvider>
          <PhotoStampHost>
            <Navigator />
          </PhotoStampHost>
        </UnderDevelopmentProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
