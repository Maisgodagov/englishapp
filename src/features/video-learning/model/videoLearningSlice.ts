import { createAsyncThunk, createSelector, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { DifficultyLevel } from './videoSettingsSlice';
import { setDifficultyLevel, setSpeechSpeed } from './videoSettingsSlice';
import { relaxFilters } from './filterRelaxation';

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
  // Track like toggle in progress per content
  likesUpdating: Record<string, boolean>;
  likeErrors: Record<string, string | undefined>;
  // Filter relaxation message
  filterRelaxationMessage?: string;
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
  likesUpdating: {},
  likeErrors: {},
  filterRelaxationMessage: undefined,
};

const requireUserId = (state: RootState) => {
  const userId = state.user.profile?.id;
  if (!userId) {
    throw new Error('Не удалось определить пользователя');
  }
  return userId;
};

const mapDifficultyToCefrLevels = (level: DifficultyLevel): string | undefined => {
  switch (level) {
    case 'easy':
      return 'A1';
    case 'medium':
      return 'A2,B1';
    case 'hard':
      return 'B2,C1';
    default:
      return undefined;
  }
};

const mapSpeechSpeedToValues = (speed: import('./videoSettingsSlice').SpeechSpeed): string | undefined => {
  if (speed === 'all') {
    return undefined;
  }
  return speed;
};

export const fetchVideoFeed = createAsyncThunk<VideoFeedResponse, void, { state: RootState }>(
  'videoLearning/fetchFeed',
  async (_payload, { getState }) => {
    const state = getState();
    const userId = requireUserId(state);
    const cefrLevels = mapDifficultyToCefrLevels(state.videoSettings.difficultyLevel);
    const speechSpeeds = mapSpeechSpeedToValues(state.videoSettings.speechSpeed);
    const isAdmin = state.user.profile?.role === 'admin';
    // TEMPORARY: Show all videos in development, only moderated in production
    const moderationFilter = isAdmin ? state.videoSettings.moderationFilter : (__DEV__ ? 'all' : 'moderated');

    return videoLearningApi.getFeed(userId, {
      limit: 1,
      cefrLevels,
      speechSpeeds,
      showAdultContent: state.videoSettings.showAdultContent,
      moderationFilter,
      userRole: state.user.profile?.role,
    });
  },
);

export const fetchVideoFeedWithRelaxation = createAsyncThunk<
  { response: VideoFeedResponse; relaxationMessage?: string },
  { attemptNumber?: number },
  { state: RootState; dispatch: any }
>(
  'videoLearning/fetchFeedWithRelaxation',
  async ({ attemptNumber = 0 }, { getState, dispatch }) => {
    const state = getState();
    const userId = requireUserId(state);
    const cefrLevels = mapDifficultyToCefrLevels(state.videoSettings.difficultyLevel);
    const speechSpeeds = mapSpeechSpeedToValues(state.videoSettings.speechSpeed);
    const isAdmin = state.user.profile?.role === 'admin';
    // TEMPORARY: Show all videos in development, only moderated in production
    const moderationFilter = isAdmin ? state.videoSettings.moderationFilter : (__DEV__ ? 'all' : 'moderated');

    const response = await videoLearningApi.getFeed(userId, {
      limit: 1,
      cefrLevels,
      speechSpeeds,
      showAdultContent: state.videoSettings.showAdultContent,
      moderationFilter,
      userRole: state.user.profile?.role,
    });

    // If we got videos, return success
    if (response.items.length > 0) {
      return { response };
    }

    // No videos found, try to relax filters
    const relaxed = relaxFilters(
      {
        difficultyLevel: state.videoSettings.difficultyLevel,
        speechSpeed: state.videoSettings.speechSpeed,
      },
      attemptNumber
    );

    // If we can't relax further, return empty result
    if (!relaxed) {
      return { response };
    }

    // Apply relaxed filters temporarily (don't save to AsyncStorage)
    dispatch(setDifficultyLevel(relaxed.difficultyLevel));
    dispatch(setSpeechSpeed(relaxed.speechSpeed));

    // Try again with relaxed filters
    const relaxedCefrLevels = mapDifficultyToCefrLevels(relaxed.difficultyLevel);
    const relaxedSpeechSpeeds = mapSpeechSpeedToValues(relaxed.speechSpeed);
    const relaxedResponse = await videoLearningApi.getFeed(userId, {
      limit: 1,
      cefrLevels: relaxedCefrLevels,
      speechSpeeds: relaxedSpeechSpeeds,
      showAdultContent: state.videoSettings.showAdultContent,
      moderationFilter,
      userRole: state.user.profile?.role,
    });

    // If still no videos, try one more time with further relaxation
    if (relaxedResponse.items.length === 0 && attemptNumber === 0) {
      return dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: attemptNumber + 1 })).unwrap();
    }

    return {
      response: relaxedResponse,
      relaxationMessage: relaxedResponse.items.length > 0 ? relaxed.message : undefined,
    };
  },
);

export const loadMoreVideoFeed = createAsyncThunk<
  { response: VideoFeedResponse; relaxationMessage?: string },
  { attemptNumber?: number },
  { state: RootState; dispatch: any }
>(
  'videoLearning/loadMoreFeed',
  async ({ attemptNumber = 0 }, { getState, dispatch }) => {
    const state = getState();
    const userId = requireUserId(state);
    const cursor = state.videoLearning.feedCursor;
    const hasMoreFeed = state.videoLearning.hasMoreFeed;

    const cefrLevels = mapDifficultyToCefrLevels(state.videoSettings.difficultyLevel);
    const speechSpeeds = mapSpeechSpeedToValues(state.videoSettings.speechSpeed);
    const isAdmin = state.user.profile?.role === 'admin';
    // TEMPORARY: Show all videos in development, only moderated in production
    const moderationFilter = isAdmin ? state.videoSettings.moderationFilter : (__DEV__ ? 'all' : 'moderated');

    // Try to load more with cursor if available and hasMore is true
    if (cursor && hasMoreFeed) {
      const response = await videoLearningApi.getFeed(userId, {
        limit: 2,
        cursor: cursor ?? undefined,
        cefrLevels,
        speechSpeeds,
        showAdultContent: state.videoSettings.showAdultContent,
        moderationFilter,
        userRole: state.user.profile?.role,
      });

      // If we got videos, return success
      if (response.items.length > 0) {
        return { response };
      }
    }

    // No more videos with current filters (or no cursor), try to relax filters
    const relaxed = relaxFilters(
      {
        difficultyLevel: state.videoSettings.difficultyLevel,
        speechSpeed: state.videoSettings.speechSpeed,
      },
      attemptNumber
    );

    // If we can't relax further, return empty result
    if (!relaxed) {
      return {
        response: {
          items: [],
          nextCursor: null,
          hasMore: false,
          total: 0
        }
      };
    }

    // Apply relaxed filters temporarily
    dispatch(setDifficultyLevel(relaxed.difficultyLevel));
    dispatch(setSpeechSpeed(relaxed.speechSpeed));

    // Try again with relaxed filters (no cursor - start from beginning with new filters)
    const relaxedCefrLevels = mapDifficultyToCefrLevels(relaxed.difficultyLevel);
    const relaxedSpeechSpeeds = mapSpeechSpeedToValues(relaxed.speechSpeed);
    const relaxedResponse = await videoLearningApi.getFeed(userId, {
      limit: 2,
      cefrLevels: relaxedCefrLevels,
      speechSpeeds: relaxedSpeechSpeeds,
      showAdultContent: state.videoSettings.showAdultContent,
      moderationFilter,
      userRole: state.user.profile?.role,
    });

    // If still no videos, try one more time with further relaxation
    if (relaxedResponse.items.length === 0 && attemptNumber === 0) {
      return dispatch(loadMoreVideoFeed({ attemptNumber: attemptNumber + 1 })).unwrap();
    }

    return {
      response: relaxedResponse,
      relaxationMessage: relaxedResponse.items.length > 0 ? relaxed.message : undefined,
    };
  },
);

export const loadVideoContent = createAsyncThunk<VideoContent, string | undefined, { state: RootState }>(
  'videoLearning/loadContent',
  async (contentId, { getState }) => {
    const state = getState();
    const userId = requireUserId(state);

    // If contentId is explicitly provided, use it (e.g., when clicking "Next video")
    const userRole = state.user.profile?.role ?? null;
    if (contentId) {
      return videoLearningApi.getContent(userId, contentId, userRole);
    }

    // Otherwise, use nextContentId from state or fall back to first feed item
    const id = state.videoLearning.nextContentId ?? state.videoLearning.feed[0]?.id;
    if (!id) {
      throw new Error('Контент отсутствует');
    }
    return videoLearningApi.getContent(userId, id, userRole);
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

export const updateVideoLike = createAsyncThunk<
  { contentId: string; likesCount: number; isLiked: boolean },
  { contentId: string; like: boolean },
  { state: RootState }
>('videoLearning/updateLike', async ({ contentId, like }, { getState }) => {
  const userId = requireUserId(getState());
  const response = await videoLearningApi.updateLike(userId, contentId, like);
  return {
    contentId,
    likesCount: response.likesCount,
    isLiked: response.isLiked,
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
    clearFilterRelaxationMessage(state) {
      state.filterRelaxationMessage = undefined;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchVideoFeed.pending, (state) => {
        state.feedStatus = 'loading';
        state.error = undefined;
        state.filterRelaxationMessage = undefined;
      })
      .addCase(fetchVideoFeed.fulfilled, (state, action) => {
        state.feedStatus = 'succeeded';
        state.feed = action.payload.items;
        state.feedCursor = action.payload.nextCursor;
        state.hasMoreFeed = action.payload.hasMore;
        state.nextContentId = action.payload.items[0]?.id ?? null;
        state.likesUpdating = {};
        state.likeErrors = {};
        // Clear relaxation message on successful fetch
        if (action.payload.items.length > 0) {
          state.filterRelaxationMessage = undefined;
        }
      })
      .addCase(fetchVideoFeed.rejected, (state, action) => {
        state.feedStatus = 'failed';
        state.error = action.error.message;
      })
      .addCase(fetchVideoFeedWithRelaxation.pending, (state) => {
        state.feedStatus = 'loading';
        state.error = undefined;
        state.filterRelaxationMessage = undefined;
      })
      .addCase(fetchVideoFeedWithRelaxation.fulfilled, (state, action) => {
        state.feedStatus = 'succeeded';
        state.feed = action.payload.response.items;
        state.feedCursor = action.payload.response.nextCursor;
        state.hasMoreFeed = action.payload.response.hasMore;
        state.nextContentId = action.payload.response.items[0]?.id ?? null;
        state.likesUpdating = {};
        state.likeErrors = {};
        // Set relaxation message if filters were relaxed
        state.filterRelaxationMessage = action.payload.relaxationMessage;
      })
      .addCase(fetchVideoFeedWithRelaxation.rejected, (state, action) => {
        state.feedStatus = 'failed';
        state.error = action.error.message;
      })
      .addCase(loadMoreVideoFeed.pending, (state) => {
        state.isLoadingMore = true;
      })
      .addCase(loadMoreVideoFeed.fulfilled, (state, action) => {
        state.isLoadingMore = false;
        const existingIds = new Set(state.feed.map((item) => item.id));
        const newItems = action.payload.response.items.filter((item) => !existingIds.has(item.id));
        state.feed = [...state.feed, ...newItems];
        state.feedCursor = action.payload.response.nextCursor;
        state.hasMoreFeed = action.payload.response.hasMore;
        // Set relaxation message if filters were relaxed
        if (action.payload.relaxationMessage) {
          state.filterRelaxationMessage = action.payload.relaxationMessage;
        }
      })
      .addCase(loadMoreVideoFeed.rejected, (state, action) => {
        state.isLoadingMore = false;
        state.error = action.error.message;
      })
      .addCase(updateVideoLike.pending, (state, action) => {
        const { contentId } = action.meta.arg;
        state.likesUpdating[contentId] = true;
        state.likeErrors[contentId] = undefined;
      })
      .addCase(updateVideoLike.fulfilled, (state, action) => {
        const { contentId, likesCount, isLiked } = action.payload;
        state.likesUpdating[contentId] = false;
        state.likeErrors[contentId] = undefined;

        const feedIndex = state.feed.findIndex((item) => item.id === contentId);
        if (feedIndex >= 0) {
          state.feed[feedIndex] = {
            ...state.feed[feedIndex],
            likesCount,
            isLiked,
          };
        }

        // Use direct mutation instead of spread to preserve VideoContent object reference
        // This prevents VideoFeedItem from re-rendering and recreating video player
        if (state.loadedContents[contentId]) {
          state.loadedContents[contentId].likesCount = likesCount;
          state.loadedContents[contentId].isLiked = isLiked;
        }

        // Use direct mutation to preserve object reference
        if (state.content?.id === contentId) {
          state.content.likesCount = likesCount;
          state.content.isLiked = isLiked;
        }
      })
      .addCase(updateVideoLike.rejected, (state, action) => {
        const { contentId } = action.meta.arg;
        state.likesUpdating[contentId] = false;
        state.likeErrors[contentId] = action.error.message;
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

export const { resetContentState, resetSubmitState, clearFilterRelaxationMessage } = videoLearningSlice.actions;
export const videoLearningReducer = videoLearningSlice.reducer;

export const selectVideoFeed = (state: RootState) => state.videoLearning.feed;
export const selectVideoFeedStatus = (state: RootState) => state.videoLearning.feedStatus;
export const selectHasMoreFeed = (state: RootState) => state.videoLearning.hasMoreFeed;
export const selectIsLoadingMore = (state: RootState) => state.videoLearning.isLoadingMore;
export const selectActiveVideoContent = (state: RootState) => state.videoLearning.content;
export const selectVideoContentStatus = (state: RootState) => state.videoLearning.contentStatus;
export const selectVideoSubmitStatus = (state: RootState) => state.videoLearning.submitStatus;
export const selectNextContentId = (state: RootState) => state.videoLearning.nextContentId;
export const selectVideoErrors = createSelector(
  [(state: RootState) => state.videoLearning.error, (state: RootState) => state.videoLearning.submitError],
  (feedError, submitError) => ({
    feedError,
    submitError,
  })
);
export const selectLastSubmission = (state: RootState) => state.videoLearning.lastSubmission;
export const selectLoadedContents = (state: RootState) => state.videoLearning.loadedContents;
export const selectLoadingContents = (state: RootState) => state.videoLearning.loadingContents;
export const selectLikesUpdating = (state: RootState) => state.videoLearning.likesUpdating;
export const selectLikeErrors = (state: RootState) => state.videoLearning.likeErrors;
export const selectFilterRelaxationMessage = (state: RootState) => state.videoLearning.filterRelaxationMessage;


