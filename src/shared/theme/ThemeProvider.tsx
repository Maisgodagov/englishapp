import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { ThemeProvider as SCThemeProvider } from 'styled-components/native';

import { darkTheme, lightTheme } from './theme';
import { useAppSelector } from '@core/store/hooks';

type ThemeMode = 'light' | 'dark';

type ThemeModeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
};

const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export const AppThemeProvider = ({ children }: { children: ReactNode }) => {
  const readLocal = (): ThemeMode => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        const v = window.localStorage.getItem('themeMode:last');
        if (v === 'dark' || v === 'light') return v;
      }
    } catch {
      // Игнорируем ошибки localStorage
    }
    return 'light';
  };
  const [mode, setMode] = useState<ThemeMode>(readLocal);
  const userId = useAppSelector((s) => s.user.profile?.id);

  // Simplified version without backend API for now
  useEffect(() => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage && userId) {
        const cached = window.localStorage.getItem(`themeMode:${userId}`);
        if (cached === 'dark' || cached === 'light') setMode(cached);
      }
    } catch {}
  }, [userId]);

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    setMode: (m: ThemeMode) => {
      setMode(m);
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('themeMode:last', m);
          if (userId) window.localStorage.setItem(`themeMode:${userId}`, m);
        }
      } catch {
        // Игнорируем ошибки localStorage
      }
    },
    toggle: () => {
      setMode((m) => {
        const next = m === 'light' ? 'dark' : 'light';
        try {
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('themeMode:last', next);
            if (userId) window.localStorage.setItem(`themeMode:${userId}`, next);
          }
        } catch {
          // Игнорируем ошибки localStorage
        }
        return next;
      });
    },
  }), [mode, userId]);

  const theme = mode === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeModeContext.Provider value={value}>
      <SCThemeProvider theme={theme}>{children}</SCThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within AppThemeProvider');
  return ctx;
};

