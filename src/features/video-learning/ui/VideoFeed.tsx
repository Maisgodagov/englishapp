import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItem,
} from "react-native";
import Animated from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Typography } from "@shared/ui";
import { useAppSelector, useAppDispatch } from "@core/store/hooks";
import {
  selectExerciseCount,
  selectDifficultyLevel,
  selectSpeechSpeed,
  selectShowAdultContent,
  selectShowEnglishSubtitles,
  selectShowRussianSubtitles,
  setDifficultyLevel,
  setSpeechSpeed,
  setShowAdultContent,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
  type DifficultyLevel,
  type SpeechSpeed,
} from "../model/videoSettingsSlice";
import {
  loadMoreVideoFeed,
  fetchVideoFeedWithRelaxation,
  selectHasMoreFeed,
  selectIsLoadingMore,
  selectFilterRelaxationMessage,
  clearFilterRelaxationMessage,
} from "../model/videoLearningSlice";
import { VideoFeedItem } from "./VideoFeedItem";
import { VideoModerationModal } from "./VideoModerationModal";
import { FilterRelaxationBanner } from "./FilterRelaxationBanner";
import type {
  VideoContent,
  SubmitAnswerPayload,
} from "../api/videoLearningApi";
import { getContentHeight } from "@shared/utils/dimensions";
import { selectIsAdmin } from "@entities/user/model/selectors";
import { VideoSettingsSheet } from "./VideoSettingsSheet";

interface FeedItem {
  type: "video";
  content: VideoContent;
  index: number;
}

interface VideoFeedProps {
  videos: VideoContent[];
  totalFeedCount: number;
  completedVideoIds: Set<string>;
  onSubmitExercises: (
    contentId: string,
    answers: SubmitAnswerPayload[]
  ) => void;
  submitStatus: "idle" | "submitting" | "succeeded" | "failed";
  lastSubmission?: {
    contentId: string;
    completed: boolean;
    correct: number;
    total: number;
  };
  likesUpdating: Record<string, boolean>;
  onToggleLike: (contentId: string, like: boolean) => void;
  isTabFocused: boolean;
  focusVideoId?: string | null;
  onClearFocus?: () => void;
}

export const VideoFeed = ({
  videos,
  totalFeedCount,
  completedVideoIds,
  onSubmitExercises,
  submitStatus,
  lastSubmission,
  likesUpdating,
  onToggleLike,
  isTabFocused,
  focusVideoId,
  onClearFocus,
}: VideoFeedProps) => {
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const exerciseCount = useAppSelector(selectExerciseCount);
  const difficultyLevel = useAppSelector(selectDifficultyLevel);
  const speechSpeedSetting = useAppSelector(selectSpeechSpeed);
  const showAdultContent = useAppSelector(selectShowAdultContent);
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);
  const hasMoreFeed = useAppSelector(selectHasMoreFeed);
  const isLoadingMore = useAppSelector(selectIsLoadingMore);
  const filterRelaxationMessage = useAppSelector(selectFilterRelaxationMessage);
  const isAdmin = useAppSelector(selectIsAdmin);

  const flatListRef = useRef<Animated.FlatList<FeedItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModeration, setShowModeration] = useState(false);
  const currentIndexRef = useRef(0);
  const lastScrollOffsetRef = useRef(0);
  const loadMoreRequestedRef = useRef(false);
  const previousVideoCountRef = useRef(videos.length);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const handleOpenSettings = useCallback(() => setSettingsVisible(true), []);
  const handleCloseSettings = useCallback(() => setSettingsVisible(false), []);
  const [isAnyDrawerOpen, setIsAnyDrawerOpen] = useState(false);

  // Prefetch state - track which video index should be prefetched
  const [prefetchVideoIndex, setPrefetchVideoIndex] = useState<number | null>(null);
  const prefetchCancelledRef = useRef(false);

  // Calculate content height excluding safe areas
  const SCREEN_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  // Build feed based on view mode with pre-sliced exercises
  const feedItems: FeedItem[] = useMemo(
    () =>
      videos.map((content, index) => ({
        type: "video",
        content: {
          ...content,
          // Pre-slice exercises to avoid doing it in render
          exercises: content.exercises.slice(0, exerciseCount),
        },
        index,
      })),
    [videos, exerciseCount]
  );

  const currentItem = feedItems[currentIndex];
  const currentVideoIndex = currentItem?.index ?? 0;
  const currentVideo = videos[currentVideoIndex] ?? null;

  useEffect(() => {
    if (!currentVideo || !isAdmin) {
      setShowModeration(false);
    }
  }, [currentVideo, isAdmin]);

  useEffect(() => {
    if (!focusVideoId) {
      return;
    }

    const targetIndex = feedItems.findIndex(
      (item) => item.type === "video" && item.content.id === focusVideoId
    );

    if (targetIndex === -1) {
      return;
    }

    currentIndexRef.current = targetIndex;
    setCurrentIndex(targetIndex);

    requestAnimationFrame(() => {
      const list = flatListRef.current;
      if (!list) return;

      try {
        list.scrollToIndex({ index: targetIndex, animated: true });
        onClearFocus?.();
      } catch {
        // Ignore scroll errors
      }
    });
  }, [focusVideoId, feedItems, onClearFocus]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);


  // Check if user can scroll down
  // Returns: { canScroll: boolean, reason: 'end' | 'exercises' | null }
  const handleDismissRelaxationBanner = useCallback(() => {
    dispatch(clearFilterRelaxationMessage());
  }, [dispatch]);

  const handleDifficultyChange = useCallback(
    (value: DifficultyLevel) => {
      dispatch(setDifficultyLevel(value));
      dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
    },
    [dispatch]
  );

  const handleSpeechSpeedChange = useCallback(
    (value: SpeechSpeed) => {
      dispatch(setSpeechSpeed(value));
      dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
    },
    [dispatch]
  );

  const handleToggleAdultContent = useCallback(() => {
    dispatch(setShowAdultContent(!showAdultContent));
    dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
  }, [dispatch, showAdultContent]);

  const handleToggleEnglishSubtitles = useCallback(() => {
    dispatch(setShowEnglishSubtitles(!showEnglishSubtitles));
  }, [dispatch, showEnglishSubtitles]);

  const handleToggleRussianSubtitles = useCallback(() => {
    dispatch(setShowRussianSubtitles(!showRussianSubtitles));
  }, [dispatch, showRussianSubtitles]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      lastScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  const handleScrollBeginDrag = useCallback(() => {
    const nextVideoIdx = currentIndexRef.current + 1;
    if (nextVideoIdx < feedItems.length) {
      const nextVideoItem = feedItems[nextVideoIdx];
      if (prefetchVideoIndex !== nextVideoItem.index) {
        prefetchCancelledRef.current = false;
        setPrefetchVideoIndex(nextVideoItem.index);
      }
    }
  }, [feedItems, prefetchVideoIndex]);

  const computeTargetIndex = useCallback(
    (
      offsetY: number,
      currentIndexValue: number,
      options?: { velocityY?: number }
    ) => {
      const progress = SCREEN_HEIGHT === 0 ? 0 : offsetY / SCREEN_HEIGHT;
      const delta = progress - currentIndexValue;
      const velocityY = options?.velocityY ?? 0;
      const velocityThreshold = 0.35;
      const dragThreshold = 0.18;

      let direction = 0;
      if (delta > dragThreshold) {
        direction = 1;
      } else if (delta < -dragThreshold) {
        direction = -1;
      } else if (Math.abs(velocityY) > velocityThreshold) {
        direction = velocityY > 0 ? -1 : 1;
      }

      if (direction === 0) {
        return currentIndexValue;
      }

      let nextIndex = currentIndexValue + direction;
      if (nextIndex < 0 || nextIndex >= feedItems.length) {
        nextIndex = Math.max(
          0,
          Math.min(nextIndex, Math.max(feedItems.length - 1, 0))
        );
      }

      return nextIndex;
    },
    [SCREEN_HEIGHT, feedItems.length]
  );

  const handleScrollEndDrag = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY =
        event.nativeEvent.contentOffset?.y ?? lastScrollOffsetRef.current;
      const velocityY = event.nativeEvent.velocity?.y ?? 0;
      const previousIndex = currentIndexRef.current;
      const targetIndex = computeTargetIndex(offsetY, previousIndex, {
        velocityY,
      });

      // Cancel prefetch if user didn't actually scroll to next video
      if (targetIndex === previousIndex && prefetchVideoIndex !== null) {
        prefetchCancelledRef.current = true;
        setPrefetchVideoIndex(null);
      }

      if (targetIndex !== previousIndex) {
        currentIndexRef.current = targetIndex;
        setCurrentIndex(targetIndex);
      }

      if (feedItems.length > 0) {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
        });
      }
    },
    [computeTargetIndex, feedItems.length, prefetchVideoIndex]
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY =
        event.nativeEvent.contentOffset?.y ?? lastScrollOffsetRef.current;
      const velocityY = event.nativeEvent.velocity?.y ?? 0;
      const previousIndex = currentIndexRef.current;
      const targetIndex = computeTargetIndex(offsetY, previousIndex, {
        velocityY,
      });

      if (targetIndex !== previousIndex) {
        currentIndexRef.current = targetIndex;
        setCurrentIndex(targetIndex);
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: true,
        });
        return;
      }

      if (feedItems.length > 0) {
        flatListRef.current?.scrollToIndex({
          index: previousIndex,
          animated: false,
        });
      }
    },
    [computeTargetIndex, feedItems.length]
  );

  const handleSubmit = useCallback(
    (contentId: string, answers: SubmitAnswerPayload[]) => {
      onSubmitExercises(contentId, answers);
    },
    [onSubmitExercises]
  );

  const handleShowModeration = useCallback(() => {
    setShowModeration(true);
  }, []);

  useEffect(() => {
    if (videos.length > previousVideoCountRef.current) {
      previousVideoCountRef.current = videos.length;
      loadMoreRequestedRef.current = false;
    } else if (videos.length < previousVideoCountRef.current) {
      previousVideoCountRef.current = videos.length;
    }
  }, [videos.length]);

  const handleEndReached = useCallback(() => {
    if (
      isLoadingMore ||
      videos.length === 0 ||
      loadMoreRequestedRef.current
    ) {
      return;
    }

    loadMoreRequestedRef.current = true;
    dispatch(loadMoreVideoFeed({ attemptNumber: 0 }));
  }, [dispatch, isLoadingMore, videos.length]);

  const renderItem: ListRenderItem<FeedItem> = useCallback(
    ({ item, index }) => {
      const isActive = index === currentIndex;
      const isCompleted = completedVideoIds.has(item.content.id);
      const shouldPrefetch = prefetchVideoIndex === item.index;

      return (
        <VideoFeedItem
          content={item.content}
          analysis={item.content.analysis}
          isActive={isActive}
          isCompleted={isCompleted}
          onToggleLike={onToggleLike}
          isLikePending={!!likesUpdating[item.content.id]}
          isTabFocused={isTabFocused}
          shouldPrefetch={shouldPrefetch}
          prefetchCancelled={prefetchCancelledRef.current}
          onOpenModeration={isActive ? handleShowModeration : undefined}
          onOpenSettings={handleOpenSettings}
          exercises={item.content.exercises}
          onSubmitExercises={handleSubmit}
          submitStatus={submitStatus}
          onDrawerStateChange={isActive ? setIsAnyDrawerOpen : undefined}
          exerciseSubmission={
            lastSubmission?.contentId === item.content.id ? lastSubmission : undefined
          }
        />
      );
    },
    [
      currentIndex,
      completedVideoIds,
      handleOpenSettings,
      handleShowModeration,
      handleSubmit,
      isTabFocused,
      lastSubmission,
      likesUpdating,
      onToggleLike,
      prefetchVideoIndex,
      submitStatus,
    ]
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [SCREEN_HEIGHT]
  );

  const keyExtractor = useCallback(
    (item: FeedItem) => `${item.type}-${item.content.id}`,
    []
  );

  const footerComponent = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      );
    }

    if (
      !hasMoreFeed &&
      totalFeedCount > 0 &&
      videos.length === totalFeedCount
    ) {
      return (
        <View style={styles.footerMessage}>
          <Typography variant="body" align="center" style={styles.footerText}>
            Видео закончились — скоро добавим новые!
          </Typography>
        </View>
      );
    }

    return null;
  }, [hasMoreFeed, isLoadingMore, totalFeedCount, videos.length]);

  return (
    <>
      <View style={styles.container}>
        <Animated.FlatList
          ref={flatListRef}
          data={feedItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          pagingEnabled
          scrollEnabled={!isAnyDrawerOpen}
          showsVerticalScrollIndicator={false}
          snapToInterval={SCREEN_HEIGHT}
          snapToAlignment="start"
          decelerationRate={0.98}
          onScroll={handleScroll}
          onScrollBeginDrag={handleScrollBeginDrag}
          onScrollEndDrag={handleScrollEndDrag}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onEndReached={handleEndReached}
          onEndReachedThreshold={3 / Math.max(1, videos.length)}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          removeClippedSubviews={true}
          maxToRenderPerBatch={1}
          windowSize={2}
          initialNumToRender={1}
          updateCellsBatchingPeriod={50}
          extraData={prefetchVideoIndex}
          ListFooterComponent={footerComponent}
        />

        {isAdmin && (
          <VideoModerationModal
            visible={showModeration}
            onClose={() => setShowModeration(false)}
            video={currentVideo}
          />
        )}

        {filterRelaxationMessage && (
          <FilterRelaxationBanner
            message={filterRelaxationMessage}
            onDismiss={handleDismissRelaxationBanner}
          />
        )}
      </View>

      <VideoSettingsSheet
        visible={settingsVisible}
        onClose={handleCloseSettings}
        difficultyLevel={difficultyLevel}
        speechSpeed={speechSpeedSetting}
        showEnglishSubtitles={showEnglishSubtitles}
        showRussianSubtitles={showRussianSubtitles}
        showAdultContent={showAdultContent}
        onSelectDifficulty={handleDifficultyChange}
        onSelectSpeechSpeed={handleSpeechSpeedChange}
        onToggleEnglish={handleToggleEnglishSubtitles}
        onToggleRussian={handleToggleRussianSubtitles}
        onToggleAdult={handleToggleAdultContent}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
    display: "flex",
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  moderationBadge: {
    position: "absolute",
    left: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
  },
  moderationBadgeText: {
    color: "#FFFFFF",
    fontSize: 12,
  },
  moderationStatusText: {
    color: "#FFFFFF",
    fontSize: 12,
    marginLeft: 8,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  footerMessage: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "rgba(255, 255, 255, 0.8)",
  },
});

