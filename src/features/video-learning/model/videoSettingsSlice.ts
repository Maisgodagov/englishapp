import { createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RootState } from '@core/store/store';

export type ExerciseCount = 1 | 2 | 3 | 4;
export type DifficultyLevel = 'all' | 'easy' | 'medium' | 'hard';
export type SpeechSpeed = 'all' | 'slow' | 'normal' | 'fast';
export type ModerationFilter = 'all' | 'moderated' | 'unmoderated';

interface VideoSettingsState {
  exerciseCount: ExerciseCount;
  showEnglishSubtitles: boolean;
  showRussianSubtitles: boolean;
  difficultyLevel: DifficultyLevel;
  speechSpeed: SpeechSpeed;
  showAdultContent: boolean;
  moderationFilter: ModerationFilter;
}

const initialState: VideoSettingsState = {
  exerciseCount: 3,
  showEnglishSubtitles: true,
  showRussianSubtitles: true,
  difficultyLevel: 'all',
  speechSpeed: 'all',
  showAdultContent: true,
  // Use 'all' in development for easier testing, 'moderated' in production
  moderationFilter: __DEV__ ? 'all' : 'moderated',
};

const videoSettingsSlice = createSlice({
  name: 'videoSettings',
  initialState,
  reducers: {
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
    setShowAdultContent(state, action: PayloadAction<boolean>) {
      state.showAdultContent = action.payload;
    },
    setModerationFilter(state, action: PayloadAction<ModerationFilter>) {
      state.moderationFilter = action.payload;
    },
    resetSettings(state) {
      state.exerciseCount = initialState.exerciseCount;
      state.showEnglishSubtitles = initialState.showEnglishSubtitles;
      state.showRussianSubtitles = initialState.showRussianSubtitles;
      state.difficultyLevel = initialState.difficultyLevel;
      state.speechSpeed = initialState.speechSpeed;
      state.showAdultContent = initialState.showAdultContent;
      state.moderationFilter = initialState.moderationFilter;
    },
  },
});

export const {
  setExerciseCount,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
  setDifficultyLevel,
  setSpeechSpeed,
  setShowAdultContent,
  setModerationFilter,
  resetSettings
} = videoSettingsSlice.actions;
export const videoSettingsReducer = videoSettingsSlice.reducer;

export const selectExerciseCount = (state: RootState) => state.videoSettings.exerciseCount;
export const selectShowEnglishSubtitles = (state: RootState) => state.videoSettings.showEnglishSubtitles;
export const selectShowRussianSubtitles = (state: RootState) => state.videoSettings.showRussianSubtitles;
export const selectDifficultyLevel = (state: RootState) => state.videoSettings.difficultyLevel;
export const selectSpeechSpeed = (state: RootState) => state.videoSettings.speechSpeed;
export const selectShowAdultContent = (state: RootState) => state.videoSettings.showAdultContent;
export const selectModerationFilter = (state: RootState) => state.videoSettings.moderationFilter;
export const selectVideoSettings = createSelector(
  [
    selectExerciseCount,
    selectShowEnglishSubtitles,
    selectShowRussianSubtitles,
    selectDifficultyLevel,
    selectSpeechSpeed,
    selectShowAdultContent,
    selectModerationFilter,
  ],
  (
    exerciseCount,
    showEnglishSubtitles,
    showRussianSubtitles,
    difficultyLevel,
    speechSpeed,
    showAdultContent,
    moderationFilter,
  ) => ({
    exerciseCount,
    showEnglishSubtitles,
    showRussianSubtitles,
    difficultyLevel,
    speechSpeed,
    showAdultContent,
    moderationFilter,
  })
);
