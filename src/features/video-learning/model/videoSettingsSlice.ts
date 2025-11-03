import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@core/store/store';

export type ViewMode = 'with-exercises' | 'without-exercises';
export type ExerciseCount = 1 | 2 | 3 | 4;
export type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';
export type SpeechSpeed = 'all' | 'slow' | 'normal' | 'fast';

interface VideoSettingsState {
  viewMode: ViewMode;
  exerciseCount: ExerciseCount;
  showEnglishSubtitles: boolean;
  showRussianSubtitles: boolean;
  difficultyLevel: DifficultyLevel;
  speechSpeed: SpeechSpeed;
}

const initialState: VideoSettingsState = {
  viewMode: 'with-exercises',
  exerciseCount: 3,
  showEnglishSubtitles: true,
  showRussianSubtitles: true,
  difficultyLevel: 'all',
  speechSpeed: 'all',
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
    setDifficultyLevel(state, action: PayloadAction<DifficultyLevel>) {
      state.difficultyLevel = action.payload;
    },
    setSpeechSpeed(state, action: PayloadAction<SpeechSpeed>) {
      state.speechSpeed = action.payload;
    },
    resetSettings(state) {
      state.viewMode = initialState.viewMode;
      state.exerciseCount = initialState.exerciseCount;
      state.showEnglishSubtitles = initialState.showEnglishSubtitles;
      state.showRussianSubtitles = initialState.showRussianSubtitles;
      state.difficultyLevel = initialState.difficultyLevel;
      state.speechSpeed = initialState.speechSpeed;
    },
  },
});

export const {
  setViewMode,
  setExerciseCount,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
  setDifficultyLevel,
  setSpeechSpeed,
  resetSettings
} = videoSettingsSlice.actions;
export const videoSettingsReducer = videoSettingsSlice.reducer;

export const selectViewMode = (state: RootState) => state.videoSettings.viewMode;
export const selectExerciseCount = (state: RootState) => state.videoSettings.exerciseCount;
export const selectShowEnglishSubtitles = (state: RootState) => state.videoSettings.showEnglishSubtitles;
export const selectShowRussianSubtitles = (state: RootState) => state.videoSettings.showRussianSubtitles;
export const selectDifficultyLevel = (state: RootState) => state.videoSettings.difficultyLevel;
export const selectSpeechSpeed = (state: RootState) => state.videoSettings.speechSpeed;
export const selectVideoSettings = createSelector(
  [selectViewMode, selectExerciseCount, selectShowEnglishSubtitles, selectShowRussianSubtitles, selectDifficultyLevel, selectSpeechSpeed],
  (viewMode, exerciseCount, showEnglishSubtitles, showRussianSubtitles, difficultyLevel, speechSpeed) => ({
    viewMode,
    exerciseCount,
    showEnglishSubtitles,
    showRussianSubtitles,
    difficultyLevel,
    speechSpeed,
  })
);
