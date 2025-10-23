import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@core/store/store';

interface VolumeSettingsState {
  // Глобальная громкость пользователя (0-1)
  globalVolume: number;
  // Включена ли автоматическая нормализация
  autoNormalize: boolean;
  // Кэш громкости для каждого видео
  videoVolumeCache: Record<string, number>;
}

const initialState: VolumeSettingsState = {
  globalVolume: 1.0,
  autoNormalize: true,
  videoVolumeCache: {},
};

const volumeSettingsSlice = createSlice({
  name: 'volumeSettings',
  initialState,
  reducers: {
    setGlobalVolume(state, action: PayloadAction<number>) {
      state.globalVolume = Math.max(0, Math.min(1, action.payload));
    },
    setAutoNormalize(state, action: PayloadAction<boolean>) {
      state.autoNormalize = action.payload;
    },
    setVideoVolume(state, action: PayloadAction<{ videoId: string; volume: number }>) {
      const { videoId, volume } = action.payload;
      state.videoVolumeCache[videoId] = Math.max(0, Math.min(1, volume));
    },
    clearVolumeCache(state) {
      state.videoVolumeCache = {};
    },
    resetVolumeSettings(state) {
      state.globalVolume = initialState.globalVolume;
      state.autoNormalize = initialState.autoNormalize;
      state.videoVolumeCache = {};
    },
  },
});

export const {
  setGlobalVolume,
  setAutoNormalize,
  setVideoVolume,
  clearVolumeCache,
  resetVolumeSettings,
} = volumeSettingsSlice.actions;

export const volumeSettingsReducer = volumeSettingsSlice.reducer;

// Selectors
export const selectGlobalVolume = (state: RootState) => state.volumeSettings.globalVolume;
export const selectAutoNormalize = (state: RootState) => state.volumeSettings.autoNormalize;
export const selectVideoVolumeCache = (state: RootState) => state.volumeSettings.videoVolumeCache;
export const selectVideoVolume = (videoId: string) => (state: RootState) =>
  state.volumeSettings.videoVolumeCache[videoId] ?? null;
export const selectVolumeSettings = (state: RootState) => state.volumeSettings;
