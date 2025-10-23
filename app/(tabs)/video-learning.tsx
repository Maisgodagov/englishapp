import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useTheme } from 'styled-components/native';

import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import { Typography } from '@shared/ui';
import {
  fetchVideoFeed,
  loadVideoContent,
  selectVideoFeed,
  selectVideoFeedStatus,
  selectVideoErrors,
  selectLoadedContents,
  selectLoadingContents,
  submitVideoProgress,
} from '@features/video-learning/model/videoLearningSlice';
import { VideoFeed } from '@features/video-learning/ui/VideoFeed';
import type { SubmitAnswerPayload, VideoContent } from '@features/video-learning/api/videoLearningApi';

const PREFETCH_BATCH = 3;

export default function VideoLearningScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme() as any;
  const feedStatus = useAppSelector(selectVideoFeedStatus);
  const feed = useAppSelector(selectVideoFeed);
  const errors = useAppSelector(selectVideoErrors);
  const loadedContents = useAppSelector(selectLoadedContents);
  const loadingContents = useAppSelector(selectLoadingContents);

  const videoLearningState = useAppSelector((state) => state.videoLearning);
  const { submitStatus, lastSubmission } = videoLearningState;

  // Load feed on mount
  useFocusEffect(
    useCallback(() => {
      if (feedStatus === 'idle') {
        dispatch(fetchVideoFeed());
      }
    }, [dispatch, feedStatus]),
  );

  useEffect(() => {
    if (feedStatus !== 'succeeded' || feed.length === 0) {
      return;
    }

    const idsToLoad = feed
      .filter((item) => !loadedContents[item.id] && !loadingContents[item.id])
      .slice(0, PREFETCH_BATCH)
      .map((item) => item.id);

    idsToLoad.forEach((id) => {
      dispatch(loadVideoContent(id));
    });
  }, [dispatch, feedStatus, feed, loadedContents, loadingContents]);

  // Build completed set (includes WATCHED and COMPLETED)
  const completedVideoIds = useMemo(() => {
    return new Set(
      feed
        .filter((item) => item.status === 'COMPLETED' || item.status === 'WATCHED')
        .map((item) => item.id)
    );
  }, [feed]);

  // Build videos array with full content
  const videos = useMemo((): VideoContent[] => {
    return feed
      .map((item) => loadedContents[item.id])
      .filter((content): content is VideoContent => content !== undefined);
  }, [feed, loadedContents]);

  const handleSubmitExercises = useCallback(
    (contentId: string, answers: SubmitAnswerPayload[]) => {
      dispatch(submitVideoProgress({ contentId, answers }));
    },
    [dispatch],
  );

  if (feedStatus === 'loading') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Typography variant="body" style={styles.loadingText}>
          Загрузка видео...
        </Typography>
      </SafeAreaView>
    );
  }

  if (errors.feedError) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" align="center">
          {errors.feedError}
        </Typography>
      </SafeAreaView>
    );
  }

  if (feed.length === 0) {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <Typography variant="body" align="center">
          Нет доступных видео. Попробуйте позже.
        </Typography>
      </SafeAreaView>
    );
  }

  // Show loading only if we don't have at least the first video
  if (videos.length === 0 && feedStatus === 'succeeded') {
    return (
      <SafeAreaView style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Typography variant="body" style={styles.loadingText}>
          Загрузка видео...
        </Typography>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <VideoFeed
        videos={videos}
        totalFeedCount={feed.length}
        completedVideoIds={completedVideoIds}
        onSubmitExercises={handleSubmitExercises}
        submitStatus={submitStatus}
        lastSubmission={lastSubmission}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
  },
});
