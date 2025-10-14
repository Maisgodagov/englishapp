import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';

import type { RootState } from '@core/store/store';
import { roadmapApi } from '../api/roadmapApi';
import type { RoadmapModule } from './types';

interface RoadmapState {
  modules: RoadmapModule[];
  status: 'idle' | 'loading' | 'succeeded' | 'failed';
  error?: string;
}

const initialState: RoadmapState = {
  modules: [],
  status: 'idle',
  error: undefined,
};

export const fetchRoadmap = createAsyncThunk<RoadmapModule[], void, { state: RootState }>(
  'roadmap/fetch',
  async (_payload, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const userId = state.user.profile?.id;
      const response = await roadmapApi.getRoadmap(userId);
      return response.modules;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Не удалось загрузить роадмап');
    }
  },
);

const roadmapSlice = createSlice({
  name: 'roadmap',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchRoadmap.pending, (state) => {
        state.status = 'loading';
        state.error = undefined;
      })
      .addCase(fetchRoadmap.fulfilled, (state, action) => {
        state.status = 'succeeded';
        state.modules = action.payload;
      })
      .addCase(fetchRoadmap.rejected, (state, action) => {
        state.status = 'failed';
        state.error = (action.payload as string) ?? 'Не удалось загрузить роадмап';
      });
  },
});

export const roadmapReducer = roadmapSlice.reducer;

export const selectRoadmapModules = (state: RootState) => state.roadmap.modules;
export const selectRoadmapStatus = (state: RootState) => state.roadmap.status;
export const selectRoadmapError = (state: RootState) => state.roadmap.error;
