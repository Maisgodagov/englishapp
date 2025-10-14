import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface DailyProgressPoint {
  date: string;
  studiedMinutes: number;
  wordsLearned: number;
}

export interface ProgressState {
  streak: number;
  weeklyMinutes: number;
  vocabularySize: number;
  dailyProgress: DailyProgressPoint[];
}

const initialState: ProgressState = {
  streak: 0,
  weeklyMinutes: 0,
  vocabularySize: 0,
  dailyProgress: [],
};

const progressSlice = createSlice({
  name: 'progress',
  initialState,
  reducers: {
    hydrateProgress(state, action: PayloadAction<ProgressState>) {
      return action.payload;
    },
    updateStreak(state, action: PayloadAction<number>) {
      state.streak = action.payload;
    },
    updateWeeklyMinutes(state, action: PayloadAction<number>) {
      state.weeklyMinutes = action.payload;
    },
    updateVocabularySize(state, action: PayloadAction<number>) {
      state.vocabularySize = action.payload;
    },
  },
});

export const {
  hydrateProgress,
  updateStreak,
  updateWeeklyMinutes,
  updateVocabularySize,
} = progressSlice.actions;

export const progressReducer = progressSlice.reducer;


