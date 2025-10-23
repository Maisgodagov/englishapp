import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@core/store/store';

export type ViewMode = 'with-exercises' | 'without-exercises';
export type ExerciseCount = 1 | 2 | 3 | 4 | 5;

interface VideoSettingsState {
  viewMode: ViewMode;
  exerciseCount: ExerciseCount;
  showEnglishSubtitles: boolean;
  showRussianSubtitles: boolean;
}

const initialState: VideoSettingsState = {
  viewMode: 'with-exercises',
  exerciseCount: 3,
  showEnglishSubtitles: true,
  showRussianSubtitles: true,
};

const videoSettingsSlice = createSlice({
  name: 'videoSettings',
  initialState,
  reducers: {
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
    },
    setExerciseCount(state, action: PayloadAction<ExerciseCount>) {
      state.exerciseCount = action.payload;
    },
    setShowEnglishSubtitles(state, action: PayloadAction<boolean>) {
      state.showEnglishSubtitles = action.payload;
    },
    setShowRussianSubtitles(state, action: PayloadAction<boolean>) {
      state.showRussianSubtitles = action.payload;
    },
    resetSettings(state) {
      state.viewMode = initialState.viewMode;
      state.exerciseCount = initialState.exerciseCount;
      state.showEnglishSubtitles = initialState.showEnglishSubtitles;
      state.showRussianSubtitles = initialState.showRussianSubtitles;
    },
  },
});

export const {
  setViewMode,
  setExerciseCount,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
  resetSettings
} = videoSettingsSlice.actions;
export const videoSettingsReducer = videoSettingsSlice.reducer;

export const selectViewMode = (state: RootState) => state.videoSettings.viewMode;
export const selectExerciseCount = (state: RootState) => state.videoSettings.exerciseCount;
export const selectShowEnglishSubtitles = (state: RootState) => state.videoSettings.showEnglishSubtitles;
export const selectShowRussianSubtitles = (state: RootState) => state.videoSettings.showRussianSubtitles;
export const selectVideoSettings = (state: RootState) => state.videoSettings;
