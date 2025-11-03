import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useIsFocused, useNavigation } from "@react-navigation/native";
import { useTheme } from "styled-components/native";

import { useAppDispatch, useAppSelector } from "@core/store/hooks";
import { Typography } from "@shared/ui";
import {
  fetchVideoFeed,
  fetchVideoFeedWithRelaxation,
  loadVideoContent,
  updateVideoLike,
  selectVideoFeed,
  selectVideoFeedStatus,
  selectVideoErrors,
  selectLoadedContents,
  selectLoadingContents,
  selectLikesUpdating,
  submitVideoProgress,
} from "@features/video-learning/model/videoLearningSlice";
import { VideoFeed } from "@features/video-learning/ui/VideoFeed";
import type {
  SubmitAnswerPayload,
  VideoContent,
} from "@features/video-learning/api/videoLearningApi";

const PREFETCH_BATCH = 3;

export default function VideoLearningScreen() {
  const dispatch = useAppDispatch();
  const theme = useTheme() as any;
  const navigation = useNavigation();
  const feedStatus = useAppSelector(selectVideoFeedStatus);
  const feed = useAppSelector(selectVideoFeed);
  const errors = useAppSelector(selectVideoErrors);
  const loadedContents = useAppSelector(selectLoadedContents);
  const loadingContents = useAppSelector(selectLoadingContents);
  const likesUpdating = useAppSelector(selectLikesUpdating);
  const submitStatus = useAppSelector((state) => state.videoLearning.submitStatus);
  const lastSubmission = useAppSelector((state) => state.videoLearning.lastSubmission);

  // Track if this tab is focused - using multiple methods
  const isTabFocused = useIsFocused();
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  // Method 2: Navigation listeners
  useEffect(() => {
    const unsubscribeFocus = navigation.addListener('focus', () => {
      setIsScreenFocused(true);
    });

    const unsubscribeBlur = navigation.addListener('blur', () => {
      setIsScreenFocused(false);
    });

    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Combine both methods for maximum reliability
  const finalIsTabFocused = useMemo(
    () => isTabFocused && isScreenFocused,
    [isTabFocused, isScreenFocused]
  );

  useEffect(() => {
    if (isTabFocused && feedStatus === "idle") {
      dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
    }
  }, [dispatch, feedStatus, isTabFocused]);

  useEffect(() => {
    if (feedStatus !== "succeeded" || feed.length === 0) {
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
        .filter(
          (item) => item.status === "COMPLETED" || item.status === "WATCHED"
        )
        .map((item) => item.id)
    );
  }, [feed]);

  const videos = useMemo((): VideoContent[] => {
    return feed
      .map((item) => loadedContents[item.id])
      .filter((content): content is VideoContent => content !== undefined);
  }, [feed, loadedContents]);

  const handleSubmitExercises = useCallback(
    (contentId: string, answers: SubmitAnswerPayload[]) => {
      dispatch(submitVideoProgress({ contentId, answers }));
    },
    [dispatch]
  );

  const handleToggleLike = useCallback(
    (contentId: string, nextLike: boolean) => {
      dispatch(updateVideoLike({ contentId, like: nextLike }));
    },
    [dispatch]
  );

  if (feedStatus === "loading") {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Typography variant="body" style={styles.loadingText}>
          Загрузка видео...
        </Typography>
      </SafeAreaView>
    );
  }

  if (errors.feedError) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Typography variant="body" align="center">
          {errors.feedError}
        </Typography>
      </SafeAreaView>
    );
  }

  if (feed.length === 0) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
        <Typography variant="body" align="center">
          Нет доступных видео. Попробуйте позже.
        </Typography>
      </SafeAreaView>
    );
  }

  // Show loading only if we don't have at least the first video
  if (videos.length === 0 && feedStatus === "succeeded") {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: theme.colors.background }]}
      >
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
        likesUpdating={likesUpdating}
        onToggleLike={handleToggleLike}
        isTabFocused={finalIsTabFocused}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  loadingText: {
    marginTop: 16,
  },
});
