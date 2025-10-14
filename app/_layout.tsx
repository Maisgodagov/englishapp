import { Slot, SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppProviders } from '@core/providers';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProviders>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="admin" options={{ headerShown: false }} />
      </Stack>
    </AppProviders>
  );
}
