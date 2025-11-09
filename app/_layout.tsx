import { Slot, SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppProviders } from '@core/providers';
import { addDebugLog } from '../src/shared/debugLog';
import Constants from 'expo-constants';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    // Log app startup
    addDebugLog('info', 'App started', {
      version: Constants.expoConfig?.version,
      platform: Constants.platform,
      apiUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL,
    });

    console.log('[App] Starting application...');
    console.log('[App] Platform:', Constants.platform);
    console.log('[App] Version:', Constants.expoConfig?.version);
    console.log('[App] API URL from config:', Constants.expoConfig?.extra?.EXPO_PUBLIC_API_URL);

    SplashScreen.hideAsync();
  }, []);

  return (
    <AppProviders>
      <Stack>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="settings" options={{ headerShown: false, presentation: 'modal' }} />
      </Stack>
    </AppProviders>
  );
}
