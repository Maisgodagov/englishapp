import { Slot, SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppProviders } from '@core/providers';
import { preloadLanguageModels } from '@shared/services/mlkitTranslator';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
    // Preload ML Kit language models for faster translations
    preloadLanguageModels().catch((error) => {
      console.warn('[App] Failed to preload ML Kit models:', error);
    });
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
