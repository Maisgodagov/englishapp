import type { ReactNode } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ReduxProvider } from './ReduxProvider';
import { AppThemeProvider } from '@shared/theme';
import { WordLookupProvider } from '@shared/word-lookup/WordLookupProvider';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <ReduxProvider>
        <AppThemeProvider>
          <WordLookupProvider>
            {children}
          </WordLookupProvider>
        </AppThemeProvider>
      </ReduxProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);


