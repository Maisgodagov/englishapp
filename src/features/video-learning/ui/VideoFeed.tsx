import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "styled-components/native";
import { Ionicons } from "@expo/vector-icons";

import { Typography } from "@shared/ui";
import { useAppSelector, useAppDispatch } from "@core/store/hooks";
import {
  selectViewMode,
  selectExerciseCount,
} from "../model/videoSettingsSlice";
import {
  loadMoreVideoFeed,
  selectHasMoreFeed,
  selectIsLoadingMore,
  selectFilterRelaxationMessage,
  clearFilterRelaxationMessage,
} from "../model/videoLearningSlice";
import { VideoFeedItem } from "./VideoFeedItem";
import { ExerciseOverlay } from "./ExerciseOverlay";
import { VideoModerationModal } from "./VideoModerationModal";
import { FilterRelaxationBanner } from "./FilterRelaxationBanner";
import type {
  VideoContent,
  SubmitAnswerPayload,
} from "../api/videoLearningApi";
import { LinearGradient } from "expo-linear-gradient";
import { getContentHeight } from "@shared/utils/dimensions";
import { selectIsAdmin } from "@entities/user/model/selectors";

interface FeedItem {
  type: "video" | "exercises";
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
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(selectViewMode);
  const exerciseCount = useAppSelector(selectExerciseCount);
  const hasMoreFeed = useAppSelector(selectHasMoreFeed);
  const isLoadingMore = useAppSelector(selectIsLoadingMore);
  const filterRelaxationMessage = useAppSelector(selectFilterRelaxationMessage);
  const isAdmin = useAppSelector(selectIsAdmin);

  const flatListRef = useRef<FlatList<FeedItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBlockMessage, setShowBlockMessage] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const currentIndexRef = useRef(0);
  const blockMessageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastScrollOffsetRef = useRef(0);
  const loadMoreRequestedRef = useRef(false);
  const previousVideoCountRef = useRef(videos.length);
  const previousViewModeRef = useRef(viewMode);

  // Prefetch state - track which video index should be prefetched
  const [prefetchVideoIndex, setPrefetchVideoIndex] = useState<number | null>(null);
  const prefetchCancelledRef = useRef(false);

  // Calculate content height excluding safe areas
  const SCREEN_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  // Build feed based on view mode
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    videos.forEach((content, index) => {
      items.push({ type: "video", content, index });
      // Only add exercises if mode is with-exercises
      if (viewMode === "with-exercises") {
        items.push({ type: "exercises", content, index });
      }
    });
    return items;
  }, [videos, viewMode]);

  const currentItem = feedItems[currentIndex];
  const currentVideoIndex = currentItem?.index ?? 0;
  const currentVideo = videos[currentVideoIndex] ?? null;

  useEffect(() => {
    if (currentItem && currentItem.index !== activeVideoIndex) {
      setActiveVideoIndex(currentItem.index);
    }
  }, [currentItem, activeVideoIndex, currentIndex]);

  useEffect(() => {
    if (!currentVideo) {
      setShowModeration(false);
    }
  }, [currentVideo]);

  useEffect(() => {
    if (!isAdmin) {
      setShowModeration(false);
    }
  }, [isAdmin]);

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
      } catch (error) {
        console.warn("[VideoFeed] Failed to scroll to focused video:", error);
      }
    });
  }, [focusVideoId, feedItems, onClearFocus]);

  useEffect(() => {
    if (previousViewModeRef.current === viewMode) {
      return;
    }

    previousViewModeRef.current = viewMode;

    const targetIndex = feedItems.findIndex(
      (item) => item.type === "video" && item.index === activeVideoIndex
    );

    if (targetIndex >= 0 && targetIndex !== currentIndex) {
      currentIndexRef.current = targetIndex;
      setCurrentIndex(targetIndex);
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToIndex({
          index: targetIndex,
          animated: false,
        });
      });
    }
  }, [viewMode, feedItems, activeVideoIndex, currentIndex]);

  useEffect(() => {
    currentIndexRef.current = currentIndex;
  }, [currentIndex]);

  useEffect(() => {
    return () => {
      if (blockMessageTimerRef.current) {
        clearTimeout(blockMessageTimerRef.current);
        blockMessageTimerRef.current = null;
      }
    };
  }, []);

  // Filter exercises based on count setting
  const getFilteredExercises = useCallback(
    (content: VideoContent) => {
      // Take minimum of exerciseCount and available exercises
      return content.exercises.slice(
        0,
        Math.min(exerciseCount, content.exercises.length)
      );
    },
    [exerciseCount]
  );

  // Check if user can scroll down
  // Returns: { canScroll: boolean, reason: 'end' | 'exercises' | null }
  const canScrollDown = useCallback((): { canScroll: boolean; reason: 'end' | 'exercises' | null } => {
    // Can't scroll past the end
    if (currentIndex >= feedItems.length - 1) {
      return { canScroll: false, reason: 'end' };
    }

    const currentFeedItem = feedItems[currentIndex];

    // Safety check: if current item doesn't exist, don't allow scroll
    if (!currentFeedItem) {
      return { canScroll: false, reason: 'end' };
    }

    // If in without-exercises mode, ALL items are videos, so always allow scroll
    if (viewMode === "without-exercises") {
      return { canScroll: true, reason: null };
    }

    // In with-exercises mode:
    // If on video page, always allow scroll to exercises
    if (currentFeedItem.type === "video") {
      return { canScroll: true, reason: null };
    }

    // If on exercises page, check if completed
    if (currentFeedItem.type === "exercises") {
      const hasSubmission =
        lastSubmission &&
        lastSubmission.contentId === currentFeedItem.content.id &&
        submitStatus === "succeeded";
      const isInCompleted = completedVideoIds.has(currentFeedItem.content.id);
      const canScroll = isInCompleted || Boolean(hasSubmission);
      return { canScroll, reason: canScroll ? null : 'exercises' };
    }

    // Default: allow scroll
    return { canScroll: true, reason: null };
  }, [
    currentIndex,
    feedItems,
    completedVideoIds,
    lastSubmission,
    submitStatus,
    viewMode,
  ]);

  const showScrollBlockedMessage = useCallback(() => {
    setShowBlockMessage(true);
    if (blockMessageTimerRef.current) {
      clearTimeout(blockMessageTimerRef.current);
    }
    blockMessageTimerRef.current = setTimeout(() => {
      setShowBlockMessage(false);
      blockMessageTimerRef.current = null;
    }, 2000);
  }, []);

  const handleDismissRelaxationBanner = useCallback(() => {
    dispatch(clearFilterRelaxationMessage());
  }, [dispatch]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      lastScrollOffsetRef.current = event.nativeEvent.contentOffset.y;
    },
    []
  );

  const handleScrollBeginDrag = useCallback(() => {
    if (blockMessageTimerRef.current) {
      clearTimeout(blockMessageTimerRef.current);
      blockMessageTimerRef.current = null;
    }

    // Start prefetching next video when user begins scrolling
    const currentIdx = currentIndexRef.current;
    const currentFeedItem = feedItems[currentIdx];

    if (currentFeedItem) {
      // Find the next video item (skip exercise rows)
      let nextVideoIdx = -1;
      for (let i = currentIdx + 1; i < feedItems.length; i += 1) {
        if (feedItems[i].type === "video") {
          nextVideoIdx = i;
          break;
        }
      }

      if (nextVideoIdx !== -1) {
        const nextVideoItem = feedItems[nextVideoIdx];
        if (prefetchVideoIndex !== nextVideoItem.index) {
          prefetchCancelledRef.current = false;
          setPrefetchVideoIndex(nextVideoItem.index);
        }
      }
    }
  }, [feedItems, prefetchVideoIndex]);

  const computeTargetIndex = useCallback(
    (
      offsetY: number,
      currentIndexValue: number,
      options?: { velocityY?: number; showBlockMessage?: boolean }
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

      if (direction > 0) {
        const scrollCheck = canScrollDown();
        if (!scrollCheck.canScroll) {
          // Only show blocked message if it's due to exercises, not end of feed
          if (scrollCheck.reason === 'exercises' && (options?.showBlockMessage ?? true)) {
            showScrollBlockedMessage();
          }
          return currentIndexValue;
        }
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
    [SCREEN_HEIGHT, canScrollDown, feedItems.length, showScrollBlockedMessage]
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
        showBlockMessage: false,
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
    (answers: SubmitAnswerPayload[]) => {
      if (currentItem) {
        onSubmitExercises(currentItem.content.id, answers);
      }
    },
    [currentItem, onSubmitExercises]
  );

  useEffect(() => {
    if (videos.length > previousVideoCountRef.current) {
      previousVideoCountRef.current = videos.length;
      loadMoreRequestedRef.current = false;
    } else if (videos.length < previousVideoCountRef.current) {
      previousVideoCountRef.current = videos.length;
    }
  }, [videos.length]);

  useEffect(() => {
    if (
      isLoadingMore ||
      videos.length === 0 ||
      loadMoreRequestedRef.current
    ) {
      return;
    }

    // Start loading more videos when we're 3 videos away from the end
    // This gives time for videos to buffer while user watches current video
    // Also try to load more even if hasMoreFeed is false (filter relaxation)
    if (currentVideoIndex >= Math.max(0, videos.length - 3)) {
      loadMoreRequestedRef.current = true;
      dispatch(loadMoreVideoFeed({ attemptNumber: 0 }));
    }
  }, [
    dispatch,
    isLoadingMore,
    videos.length,
    currentVideoIndex,
  ]);

  // Auto-scroll to next video after completion
  useEffect(() => {
    if (
      lastSubmission &&
      submitStatus === "succeeded" &&
      currentItem?.type === "exercises"
    ) {
      if (lastSubmission.contentId === currentItem.content.id) {
        const timer = setTimeout(() => {
          if (currentIndex + 1 < feedItems.length) {
            flatListRef.current?.scrollToIndex({
              index: currentIndex + 1,
              animated: true,
            });
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [
    lastSubmission,
    submitStatus,
    currentItem,
    currentIndex,
    feedItems.length,
  ]);

  const renderItem: ListRenderItem<FeedItem> = useCallback(
    ({ item, index }) => {
      const isActive = index === currentIndex;
      const isCompleted = completedVideoIds.has(item.content.id);
      // Preload current video + next 2 videos for smoother scrolling
      // Use video index, not feed item index, to handle exercises correctly
      if (item.type === "video") {
        // Check if this video should be prefetched
        const shouldPrefetch = prefetchVideoIndex === item.index;

        return (
          <VideoFeedItem
            content={item.content}
            isActive={isActive}
            isCompleted={isCompleted}
            onToggleLike={onToggleLike}
            isLikePending={Boolean(likesUpdating[item.content.id])}
            isTabFocused={isTabFocused}
            shouldPrefetch={shouldPrefetch}
            prefetchCancelled={prefetchCancelledRef.current}
            onOpenModeration={isActive ? () => setShowModeration(true) : undefined}
          />
        );
      }

      // Exercises - filter based on settings
      const filteredExercises = getFilteredExercises(item.content);
      const exerciseSubmission =
        lastSubmission && lastSubmission.contentId === item.content.id
          ? lastSubmission
          : undefined;

      return (
        <ExerciseOverlay
          exercises={filteredExercises}
          onSubmit={handleSubmit}
          submitStatus={submitStatus}
          lastSubmission={exerciseSubmission}
        />
      );
    },
    [
      currentIndex,
      // currentVideoIndex removed - not used in renderItem
      completedVideoIds,
      handleSubmit,
      submitStatus,
      lastSubmission,
      getFilteredExercises,
      likesUpdating,
      onToggleLike,
      isTabFocused,
      prefetchVideoIndex,
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
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        onScroll={handleScroll}
        onScrollBeginDrag={handleScrollBeginDrag}
        onScrollEndDrag={handleScrollEndDrag}
        onMomentumScrollEnd={handleMomentumScrollEnd}
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        removeClippedSubviews={true}
        maxToRenderPerBatch={1}
        windowSize={2}  // CRITICAL: Reduced from 3 to 2 - only render current + next video to save bandwidth
        initialNumToRender={1}
        updateCellsBatchingPeriod={50}
        extraData={prefetchVideoIndex}
        ListFooterComponent={footerComponent}
      />

      {/* Block message overlay */}
      <Modal visible={showBlockMessage} transparent animationType="fade">
        <View style={styles.blockOverlay}>
          <View
            style={[
              styles.blockMessage,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <Ionicons
              name="lock-closed"
              size={32}
              color={theme.colors.danger ?? "#EF4444"}
            />
            <Typography variant="subtitle" style={styles.blockTitle}>
              Сначала пройдите упражнения
            </Typography>
            <Typography variant="body" style={styles.blockText}>
              Ответьте на все вопросы, чтобы перейти к следующему видео
            </Typography>
          </View>
        </View>
      </Modal>

      {isAdmin && (
        <VideoModerationModal
          visible={showModeration}
          onClose={() => setShowModeration(false)}
          video={currentVideo}
        />
      )}

      {/* Filter relaxation banner */}
      {filterRelaxationMessage && (
        <FilterRelaxationBanner
          message={filterRelaxationMessage}
          onDismiss={handleDismissRelaxationBanner}
        />
      )}
    </View>
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
  blockOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  blockMessage: {
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    maxWidth: 320,
  },
  blockTitle: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  blockText: {
    textAlign: "center",
    opacity: 0.7,
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

