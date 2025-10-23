import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ListRenderItem,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';
import { useAppSelector, useAppDispatch } from '@core/store/hooks';
import { selectViewMode, selectExerciseCount } from '../model/videoSettingsSlice';
import { loadMoreVideoFeed, selectHasMoreFeed, selectIsLoadingMore } from '../model/videoLearningSlice';
import { VideoFeedItem } from './VideoFeedItem';
import { ExerciseOverlay } from './ExerciseOverlay';
import { VideoSettingsModal } from './VideoSettingsModal';
import type { VideoContent, SubmitAnswerPayload } from '../api/videoLearningApi';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface FeedItem {
  type: 'video' | 'exercises';
  content: VideoContent;
  index: number;
}

interface VideoFeedProps {
  videos: VideoContent[];
  totalFeedCount: number;
  completedVideoIds: Set<string>;
  onSubmitExercises: (contentId: string, answers: SubmitAnswerPayload[]) => void;
  submitStatus: 'idle' | 'submitting' | 'succeeded' | 'failed';
  lastSubmission?: { contentId: string; completed: boolean; correct: number; total: number };
}

export const VideoFeed = ({
  videos,
  totalFeedCount,
  completedVideoIds,
  onSubmitExercises,
  submitStatus,
  lastSubmission,
}: VideoFeedProps) => {
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const flatListRef = useRef<FlatList<FeedItem>>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBlockMessage, setShowBlockMessage] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const scrollLocked = useRef(false);
  const loadMoreRequestedRef = useRef(false);
  const previousVideoCountRef = useRef(videos.length);

  // Get settings
  const viewMode = useAppSelector(selectViewMode);
  const exerciseCount = useAppSelector(selectExerciseCount);
  const hasMoreFeed = useAppSelector(selectHasMoreFeed);
  const isLoadingMore = useAppSelector(selectIsLoadingMore);

  // Build feed based on view mode
  const feedItems: FeedItem[] = useMemo(() => {
    const items: FeedItem[] = [];
    videos.forEach((content, index) => {
      items.push({ type: 'video', content, index });
      // Only add exercises if mode is with-exercises
      if (viewMode === 'with-exercises') {
        items.push({ type: 'exercises', content, index });
      }
    });
    return items;
  }, [videos, viewMode]);

  const currentItem = feedItems[currentIndex];
  const currentVideoIndex = currentItem?.index ?? 0;

  // Filter exercises based on count setting
  const getFilteredExercises = useCallback(
    (content: VideoContent) => {
      // Take minimum of exerciseCount and available exercises
      return content.exercises.slice(0, Math.min(exerciseCount, content.exercises.length));
    },
    [exerciseCount],
  );

  // Check if user can scroll down
  const canScrollDown = useCallback(() => {
    if (currentIndex >= feedItems.length - 1) return false;

    const currentFeedItem = feedItems[currentIndex];

    // If in without-exercises mode, always allow scroll
    if (viewMode === 'without-exercises') return true;

    // If on video page, always allow scroll to exercises
    if (currentFeedItem?.type === 'video') return true;

    // If on exercises page, check if completed
    if (currentFeedItem?.type === 'exercises') {
      const hasSubmission = lastSubmission && lastSubmission.contentId === currentFeedItem.content.id && submitStatus === 'succeeded';
      const isInCompleted = completedVideoIds.has(currentFeedItem.content.id);
      return isInCompleted || hasSubmission;
    }

    return true;
  }, [currentIndex, feedItems, completedVideoIds, lastSubmission, submitStatus, viewMode]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const rawIndex = Math.round(offsetY / SCREEN_HEIGHT);

      if (rawIndex === currentIndex) {
        return;
      }

      const direction = rawIndex > currentIndex ? 1 : -1;
      let targetIndex = rawIndex;

      if (Math.abs(rawIndex - currentIndex) > 1) {
        targetIndex = currentIndex + direction;
      }

      if (direction > 0 && !canScrollDown()) {
        scrollLocked.current = true;
        flatListRef.current?.scrollToIndex({ index: currentIndex, animated: true });
        setShowBlockMessage(true);
        setTimeout(() => setShowBlockMessage(false), 2000);
        return;
      }

      if (targetIndex < 0 || targetIndex >= feedItems.length) {
        return;
      }

      if (targetIndex !== rawIndex) {
        flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
      }

      setCurrentIndex(targetIndex);
    },
    [currentIndex, canScrollDown, feedItems.length],
  );

  const handleScrollBeginDrag = useCallback(() => {
    scrollLocked.current = false;
  }, []);

  const handleSubmit = useCallback(
    (answers: SubmitAnswerPayload[]) => {
      if (currentItem) {
        onSubmitExercises(currentItem.content.id, answers);
      }
    },
    [currentItem, onSubmitExercises],
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
    if (!hasMoreFeed || isLoadingMore || videos.length === 0 || totalFeedCount === 0) {
      return;
    }

    const remainingUnloaded = totalFeedCount - videos.length;
    if (remainingUnloaded > 1) {
      return;
    }

    if (currentVideoIndex >= Math.max(0, videos.length - 2) && !loadMoreRequestedRef.current) {
      loadMoreRequestedRef.current = true;
      dispatch(loadMoreVideoFeed());
    }
  }, [dispatch, hasMoreFeed, isLoadingMore, videos.length, totalFeedCount, currentVideoIndex]);

  // Auto-scroll to next video after completion
  useEffect(() => {
    if (lastSubmission && submitStatus === 'succeeded' && currentItem?.type === 'exercises') {
      if (lastSubmission.contentId === currentItem.content.id) {
        const timer = setTimeout(() => {
          if (currentIndex + 1 < feedItems.length) {
            flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
          }
        }, 2000);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [lastSubmission, submitStatus, currentItem, currentIndex, feedItems.length]);

  const renderItem: ListRenderItem<FeedItem> = useCallback(
    ({ item, index }) => {
      const isActive = index === currentIndex;
      const isCompleted = completedVideoIds.has(item.content.id);

      if (item.type === 'video') {
        return (
          <VideoFeedItem
            content={item.content}
            isActive={isActive}
            isCompleted={isCompleted}
            onComplete={() => {}}
          />
        );
      }

      // Exercises - filter based on settings
      const filteredExercises = getFilteredExercises(item.content);
      const exerciseSubmission =
        lastSubmission && lastSubmission.contentId === item.content.id ? lastSubmission : undefined;

      return (
        <ExerciseOverlay
          exercises={filteredExercises}
          onSubmit={handleSubmit}
          submitStatus={submitStatus}
          lastSubmission={exerciseSubmission}
        />
      );
    },
    [currentIndex, completedVideoIds, handleSubmit, submitStatus, lastSubmission, getFilteredExercises],
  );

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_HEIGHT,
      offset: SCREEN_HEIGHT * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: FeedItem) => `${item.type}-${item.content.id}`, []);

  const footerComponent = useMemo(() => {
    if (isLoadingMore) {
      return (
        <View style={styles.footerLoader}>
          <ActivityIndicator color="#FFFFFF" />
        </View>
      );
    }

    if (!hasMoreFeed && totalFeedCount > 0 && videos.length === totalFeedCount) {
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
      {/* Settings button - fixed at top right */}
      <View style={styles.settingsButton}>
        <TouchableOpacity
          onPress={() => setShowSettings(true)}
          style={[styles.settingsButtonInner, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

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
        scrollEventThrottle={16}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        ListFooterComponent={footerComponent}
      />

      {/* Block message overlay */}
      <Modal visible={showBlockMessage} transparent animationType="fade">
        <View style={styles.blockOverlay}>
          <View style={[styles.blockMessage, { backgroundColor: theme.colors.surface }]}>
            <Ionicons name="lock-closed" size={32} color={theme.colors.danger ?? '#EF4444'} />
            <Typography variant="subtitle" style={styles.blockTitle}>
              Сначала пройдите упражнения
            </Typography>
            <Typography variant="body" style={styles.blockText}>
              Ответьте на все вопросы, чтобы перейти к следующему видео
            </Typography>
          </View>
        </View>
      </Modal>

      {/* Settings modal */}
      <VideoSettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  settingsButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 100,
  },
  settingsButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  blockOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  blockMessage: {
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    gap: 12,
    maxWidth: 320,
  },
  blockTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  blockText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  footerLoader: {
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerMessage: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
});
