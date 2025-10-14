import { apiFetch } from './client';

export type ThemeMode = 'light' | 'dark';

export interface ThemePreferences {
  userId: string;
  theme: ThemeMode;
}

export const preferencesApi = {
  getTheme: async (userId: string): Promise<ThemePreferences> => {
    return apiFetch<ThemePreferences>(`preferences?userId=${userId}`);
  },

  updateTheme: async (userId: string, theme: ThemeMode): Promise<ThemePreferences> => {
    return apiFetch<ThemePreferences>('preferences', {
      method: 'PUT',
      body: { theme },
      headers: { 'x-user-id': userId },
    });
  },
};
