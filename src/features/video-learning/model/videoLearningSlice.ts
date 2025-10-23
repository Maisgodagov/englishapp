import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { RootState } from '@core/store/store';
import {
  type SubmitAnswerPayload,
  type VideoContent,
  type VideoFeedItem,
  type VideoFeedResponse,
  videoLearningApi,
} from '../api/videoLearningApi';

interface VideoLearningState {
  feed: VideoFeedItem[];
  feedStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  feedCursor: string | null;
  hasMoreFeed: boolean;
  isLoadingMore: boolean;
  content?: VideoContent;
  contentStatus: 'idle' | 'loading' | 'succeeded' | 'failed';
  submitStatus: 'idle' | 'submitting' | 'succeeded' | 'failed';
  nextContentId: string | null;
  error?: string;
  submitError?: string;
  lastSubmission?: {
    contentId: string;
    completed: boolean;
    correct: number;
    total: number;
  };
  // Cache for loaded video contents
  loadedContents: Record<string, VideoContent>;
  // Track which contents are currently being loaded (to prevent duplicate requests)
  loadingContents: Record<string, boolean>;
}

const initialState: VideoLearningState = {
  feed: [],
  feedStatus: 'idle',
  feedCursor: null,
  hasMoreFeed: false,
  isLoadingMore: false,
  contentStatus: 'idle',
  submitStatus: 'idle',
  nextContentId: null,
  error: undefined,
  submitError: undefined,
  lastSubmission: undefined,
  loadedContents: {},
  loadingContents: {},
};

const requireUserId = (state: RootState) => {
  const userId = state.user.profile?.id;
  if (!userId) {
    throw new Error('Не удалось определить пользователя');
  }
  return userId;
};

export const fetchVideoFeed = createAsyncThunk<VideoFeedResponse, void, { state: RootState }>(
  'videoLearning/fetchFeed',
  async (_payload, { getState }) => {
    const userId = requireUserId(getState());
    return videoLearningApi.getFeed(userId);
  },
);

export const loadMoreVideoFeed = createAsyncThunk<VideoFeedResponse, void, { state: RootState }>(
  'videoLearning/loadMoreFeed',
  async (_payload, { getState }) => {
    const state = getState();
    const userId = requireUserId(state);
    const cursor = state.videoLearning.feedCursor;

    if (!cursor || !state.videoLearning.hasMoreFeed) {
      throw new Error('No more content to load');
    }

    return videoLearningApi.getFeed(userId, undefined, cursor);
  },
);

export const loadVideoContent = createAsyncThunk<VideoContent, string | undefined, { state: RootState }>(
  'videoLearning/loadContent',
  async (contentId, { getState }) => {
    const state = getState();
    const userId = requireUserId(state);

    // If contentId is explicitly provided, use it (e.g., when clicking "Next video")
    if (contentId) {
      return videoLearningApi.getContent(userId, contentId);
    }

    // Otherwise, use nextContentId from state or fall back to first feed item
    const id = state.videoLearning.nextContentId ?? state.videoLearning.feed[0]?.id;
    if (!id) {
      throw new Error('Контент отсутствует');
    }
    return videoLearningApi.getContent(userId, id);
  },
  {
    condition: (contentId, { getState }) => {
      const state = getState();

      // Determine which ID we're trying to load
      const targetId = contentId ?? state.videoLearning.nextContentId ?? state.videoLearning.feed[0]?.id;

      if (!targetId) {
        return false; // Don't load if no ID
      }

      // Check if already loaded
      if (state.videoLearning.loadedContents[targetId]) {
        return false; // Already loaded, skip
      }

      // Check if currently loading
      if (state.videoLearning.loadingContents[targetId]) {
        return false; // Already loading, skip
      }

      return true; // OK to load
    },
  }
);

export const submitVideoProgress = createAsyncThunk<
  { contentId: string; total: number; correct: number; completed: boolean; nextContentId: string | null },
  { contentId: string; answers: SubmitAnswerPayload[] },
  { state: RootState }
>('videoLearning/submitProgress', async ({ contentId, answers }, { getState }) => {
  const userId = requireUserId(getState());
  const response = await videoLearningApi.submitProgress(userId, contentId, answers);
  return {
    contentId,
    total: response.result.total,
    correct: response.result.correct,
    completed: response.result.completed,
    nextContentId: response.nextContentId,
  };
});

const videoLearningSlice = createSlice({
  name: 'videoLearning',
  initialState,
  reducers: {
    resetContentState(state) {
      state.content = undefined;
      state.contentStatus = 'idle';
      state.submitStatus = 'idle';
      state.submitError = undefined;
    },
    setActiveContentId(state, action: PayloadAction<string | null>) {
      state.nextContentId = action.payload;
    },
    resetSubmitState(state) {
      state.submitStatus = 'idle';
      state.submitError = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideoFeed.pending, (state) => {
        state.feedStatus = 'loading';
        state.error = undefined;
      })
      .addCase(fetchVideoFeed.fulfilled, (state, action) => {
        state.feedStatus = 'succeeded';
        state.feed = action.payload.items;
        state.feedCursor = action.payload.nextCursor;
        state.hasMoreFeed = action.payload.hasMore;
        state.nextContentId = action.payload.items[0]?.id ?? null;
      })
      .addCase(fetchVideoFeed.rejected, (state, action) => {
        state.feedStatus = 'failed';
        state.error = action.error.message;
      })
      .addCase(loadMoreVideoFeed.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(loadMoreVideoFeed.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        state.feed = [...state.feed, ...action.payload.items];
        state.feedCursor = action.payload.nextCursor;
        state.hasMoreFeed = action.payload.hasMore;
      })
      .addCase(loadMoreVideoFeed.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.error = action.error.message;
      })
      .addCase(loadVideoContent.pending, (state, action) => {
        const targetId = action.meta.arg ?? state.nextContentId ?? state.feed[0]?.id ?? null;

        if (targetId) {
          state.loadingContents[targetId] = true;

          if (state.nextContentId === targetId) {
            state.error = undefined;
            state.contentStatus = 'loading';
            state.content = undefined;
          }
        }
      })
      .addCase(loadVideoContent.fulfilled, (state, action) => {
        if (state.nextContentId === action.payload.id) {
          state.contentStatus = 'succeeded';
          state.content = action.payload;
        }
        state.submitStatus = 'idle';
        state.submitError = undefined;
        state.lastSubmission = undefined;
        // Cache the loaded content
        state.loadedContents[action.payload.id] = action.payload;
        // Remove from loading
        delete state.loadingContents[action.payload.id];
      })
      .addCase(loadVideoContent.rejected, (state, action) => {
        const targetId = action.meta.arg ?? state.nextContentId ?? state.feed[0]?.id ?? null;

        if (targetId && state.nextContentId === targetId) {
          state.contentStatus = 'failed';
          state.content = undefined;
          state.error = action.error.message;
        }

        if (targetId) {
          delete state.loadingContents[targetId];
        }
      })
      .addCase(submitVideoProgress.pending, (state) => {
        state.submitStatus = 'submitting';
        state.submitError = undefined;
      })
      .addCase(submitVideoProgress.fulfilled, (state, action) => {
        state.submitStatus = 'succeeded';
        state.nextContentId = action.payload.nextContentId;
        state.lastSubmission = {
          contentId: action.payload.contentId,
          completed: action.payload.completed,
          correct: action.payload.correct,
          total: action.payload.total,
        };
        const feedIndex = state.feed.findIndex((item) => item.id === action.payload.contentId);
        if (feedIndex >= 0) {
          // Update status based on completion
          state.feed[feedIndex] = {
            ...state.feed[feedIndex],
            status: action.payload.completed ? 'COMPLETED' : 'WATCHED',
          };
        }
      })
      .addCase(submitVideoProgress.rejected, (state, action) => {
        state.submitStatus = 'failed';
        state.submitError = action.error.message;
      });
  },
});

export const { resetContentState, resetSubmitState } = videoLearningSlice.actions;
export const videoLearningReducer = videoLearningSlice.reducer;

export const selectVideoFeed = (state: RootState) => state.videoLearning.feed;
export const selectVideoFeedStatus = (state: RootState) => state.videoLearning.feedStatus;
export const selectHasMoreFeed = (state: RootState) => state.videoLearning.hasMoreFeed;
export const selectIsLoadingMore = (state: RootState) => state.videoLearning.isLoadingMore;
export const selectActiveVideoContent = (state: RootState) => state.videoLearning.content;
export const selectVideoContentStatus = (state: RootState) => state.videoLearning.contentStatus;
export const selectVideoSubmitStatus = (state: RootState) => state.videoLearning.submitStatus;
export const selectNextContentId = (state: RootState) => state.videoLearning.nextContentId;
export const selectVideoErrors = (state: RootState) => ({
  feedError: state.videoLearning.error,
  submitError: state.videoLearning.submitError,
});
export const selectLastSubmission = (state: RootState) => state.videoLearning.lastSubmission;
export const selectLoadedContents = (state: RootState) => state.videoLearning.loadedContents;
export const selectLoadingContents = (state: RootState) => state.videoLearning.loadingContents;
