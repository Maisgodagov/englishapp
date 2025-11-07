import type { ReactNode } from 'react';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Platform } from 'react-native';
import { ThemeProvider as SCThemeProvider } from 'styled-components/native';

import { darkTheme, lightTheme } from '../theme';
import { useAppSelector } from '@core/store/hooks';
import { preferencesApi } from '@shared/api/preferencesApi';

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
    } catch {}
    return 'light';
  };
  
  const [mode, setMode] = useState<ThemeMode>(readLocal);
  const userId = useAppSelector((s) => s.user.profile?.id);

  // Load preference when userId changes
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!userId) return;
      try {
        // Загружаем предпочтения с бэкенда
        const preferences = await preferencesApi.getTheme(userId);
        if (!alive) return;
        if (preferences.theme === 'dark' || preferences.theme === 'light') {
          setMode(preferences.theme);
          // Синхронизируем с локальным хранилищем
          try {
            if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem(`themeMode:${userId}`, preferences.theme);
              window.localStorage.setItem('themeMode:last', preferences.theme);
            }
          } catch {}
        }
      } catch (error) {
        // Если не удалось загрузить с сервера, используем локальное хранилище
        try {
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            const saved = window.localStorage.getItem(`themeMode:${userId}`);
            if (saved === 'dark' || saved === 'light') {
              setMode(saved);
            }
          }
        } catch {}
      }
    };
    run();
    return () => { alive = false; };
  }, [userId]);

  const value = useMemo<ThemeModeContextValue>(() => ({
    mode,
    setMode: (m: ThemeMode) => {
      setMode(m);
      // Сохраняем локально
      try {
        if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem('themeMode:last', m);
          if (userId) window.localStorage.setItem(`themeMode:${userId}`, m);
        }
      } catch {}
      // Сохраняем на сервере
      if (userId) {
        preferencesApi.updateTheme(userId, m).catch((error) => {
          console.error('Failed to save theme preference:', error);
        });
      }
    },
    toggle: () => {
      setMode((m) => {
        const next = m === 'light' ? 'dark' : 'light';
        // Сохраняем локально
        try {
          if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
            window.localStorage.setItem('themeMode:last', next);
            if (userId) window.localStorage.setItem(`themeMode:${userId}`, next);
          }
        } catch {}
        // Сохраняем на сервере
        if (userId) {
          preferencesApi.updateTheme(userId, next).catch((error) => {
            console.error('Failed to save theme preference:', error);
          });
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
