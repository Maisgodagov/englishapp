import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Platform,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  PanResponder,
} from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing as ReanimatedEasing,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Video, {
  OnLoadData,
  OnProgressData,
  OnBufferData,
  OnBandwidthUpdateData,
  VideoRef,
} from "react-native-video";
import {
  Heart,
  Play,
  MoreVertical,
  ShieldCheck,
  Brain,
  AlertCircle,
  Pencil,
} from "lucide-react-native";

import { Typography } from "@shared/ui";
import { useAppSelector } from "@core/store/hooks";
import {
  selectShowEnglishSubtitles,
  selectShowRussianSubtitles,
} from "../model/videoSettingsSlice";
import { selectGlobalVolume } from "../model/volumeSettingsSlice";
import type {
  AnalysisResult,
  Exercise,
  SubmitAnswerPayload,
  TranscriptChunk,
  VideoContent,
} from "../api/videoLearningApi";
import {
  SCREEN_WIDTH,
  getContentHeight,
  getVideoFeedHeight,
} from "@shared/utils/dimensions";

import { ModerationFilterButton } from "./ModerationFilterButton";
import { videoModerationApi } from "../api/videoModerationApi";
import { SubtitleChunkEditor } from "./SubtitleChunkEditor";
import { ExerciseOverlay } from "./ExerciseOverlay";
import { exercisesApi } from "../../exercises/api/exercisesApi";
import {
  selectIsAdmin,
  selectUserProfile,
} from "@entities/user/model/selectors";

// задержка обработки тапа, чтобы отличать даблтап лайка от паузы/плэй
const DOUBLE_TAP_DELAY = 250;

const DRAWER_ANIMATION_CONFIG = {
  duration: 200,
  easing: ReanimatedEasing.inOut(ReanimatedEasing.ease),
};

// форматируем время
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// форматируем уровень CEFR
const formatCEFRLevel = (level: string): string => level;

// форматируем скорость речи
const formatSpeechSpeed = (speed: string): string => {
  switch (speed) {
    case "slow":
      return "медленная речь";
    case "normal":
      return "обычная скорость речи";
    case "fast":
      return "быстрая речь";
    default:
      return speed;
  }
};

interface VideoFeedItemProps {
  content: VideoContent;
  isActive: boolean;
  isCompleted: boolean;
  onToggleLike: (videoId: string, nextLike: boolean) => void;
  isLikePending: boolean;
  isTabFocused: boolean;
  shouldPrefetch?: boolean;
  analysis: AnalysisResult;
  prefetchCancelled?: boolean;
  onOpenModeration?: () => void;
  onOpenSettings: () => void;
  exercises: Exercise[];
  onSubmitExercises: (answers: SubmitAnswerPayload[]) => void;
  submitStatus: "idle" | "submitting" | "succeeded" | "failed";
  exerciseSubmission?: { completed: boolean; correct: number; total: number };
  onDrawerStateChange?: (isOpen: boolean) => void;
}

const VideoFeedItemComponent = ({
  content,
  isActive,
  isCompleted,
  onToggleLike,
  isLikePending,
  isTabFocused,
  analysis,
  shouldPrefetch = false,
  prefetchCancelled = false,
  onOpenModeration,
  onOpenSettings,
  exercises,
  onSubmitExercises,
  submitStatus,
  exerciseSubmission,
  onDrawerStateChange,
}: VideoFeedItemProps) => {
  const insets = useSafeAreaInsets();
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isSeekingRef = useRef(false);

  const CONTAINER_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  const VIDEO_HEIGHT = useMemo(
    () => getVideoFeedHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Oптимистичное отображение лайка
  const [optimisticLike, setOptimisticLike] = useState<boolean | null>(null);
  const [optimisticLikeCount, setOptimisticLikeCount] = useState<number | null>(
    null
  );

  const shouldLoad = isActive && isTabFocused;
  const videoRef = useRef<VideoRef>(null);
  const [isExerciseDrawerOpen, setExerciseDrawerOpen] = useState(false);
  const [isExerciseDrawerMounted, setExerciseDrawerMounted] = useState(false);
  const exerciseDrawerAnim = useRef(new Animated.Value(0)).current;
  const exerciseDrawerProgress = useSharedValue(0);
  const hasExercises = exercises.length > 0;

  const drawerPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0 && isExerciseDrawerOpen) {
          const progress = Math.max(0, Math.min(1, 1 - gestureState.dy / 200));
          exerciseDrawerAnim.setValue(progress);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          closeExerciseDrawer();
        } else {
          Animated.spring(exerciseDrawerAnim, {
            toValue: 1,
            useNativeDriver: false,
            friction: 8,
            tension: 65,
          }).start();
        }
      },
    })
  ).current;

  const drawerHeight = useMemo(
    () => CONTAINER_HEIGHT * 0.5,
    [CONTAINER_HEIGHT]
  );
  const exerciseOverlayHeight = useMemo(
    () => Math.max(drawerHeight - 80 - insets.bottom, 200),
    [drawerHeight, insets.bottom]
  );

  // Расчитваем доступное место для видео при открытой модалке упражнений
  const availableVideoSpace = useMemo(() => {
    const spaceFromScreenTop = CONTAINER_HEIGHT - drawerHeight;
    return spaceFromScreenTop - (insets.top + 2);
  }, [CONTAINER_HEIGHT, drawerHeight, insets.top]);

  const videoBottomOffset = useMemo(
    () => Math.max(CONTAINER_HEIGHT - VIDEO_HEIGHT, 0),
    [CONTAINER_HEIGHT, VIDEO_HEIGHT]
  );

  const subtitleContainerStyle = useMemo(
    () =>
      isExerciseDrawerOpen
        ? {
            position: "absolute",
            bottom: videoBottomOffset + 16,
            left: 0,
            right: 0,
            alignItems: "center",
            paddingHorizontal: 0,
            zIndex: 220,
          }
        : null,
    [isExerciseDrawerOpen, videoBottomOffset]
  );

  const targetVideoScale = useMemo(() => {
    const clippedVideoHeight = VIDEO_HEIGHT - 120;
    return availableVideoSpace / clippedVideoHeight;
  }, [availableVideoSpace, VIDEO_HEIGHT]);

  // TODO: проверить и найти способ отказаться от этого
  const drawerTranslateY = exerciseDrawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [drawerHeight + insets.bottom, 0],
  });
  const drawerOverlayOpacity = exerciseDrawerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0],
  });

  // обрезаем и уменьшаем видео при открытых упражнениях
  const videoContainerStyle = useAnimatedStyle(() => {
    "worklet";
    const progress = exerciseDrawerProgress.value;
    const clippedHeight = VIDEO_HEIGHT - progress * 120;
    const scale = 1 + progress * (targetVideoScale - 1);
    const scaledHeight = clippedHeight * scale;
    const heightDifference = clippedHeight - scaledHeight;
    const translateY = progress * (-heightDifference / 2);

    return {
      position: "absolute",
      top: insets.top + 2,
      left: 0,
      right: 0,
      height: clippedHeight,
      transform: [{ translateY }, { scale }],
      borderRadius: progress * 32,
      overflow: "hidden",
      backgroundColor: "#000",
    };
  });

  const videoInnerStyle = useAnimatedStyle(() => {
    "worklet";
    const progress = exerciseDrawerProgress.value;
    const clipTop = progress * 50;

    return {
      marginTop: -clipTop,
    };
  });

  // синхронизируем анимации
  useEffect(() => {
    if (isExerciseDrawerOpen) {
      exerciseDrawerProgress.value = withTiming(1, DRAWER_ANIMATION_CONFIG);
    } else {
      exerciseDrawerProgress.value = withTiming(0, DRAWER_ANIMATION_CONFIG);
    }
  }, [isExerciseDrawerOpen, exerciseDrawerProgress]);

  const displayIsLiked =
    optimisticLike !== null ? optimisticLike : content.isLiked;
  const displayLikesCount =
    optimisticLikeCount !== null ? optimisticLikeCount : content.likesCount;

  const videoSource = useMemo(
    () => ({ uri: content.videoUrl }),
    [content.videoUrl]
  );
  const bufferConfig = useMemo(
    () => ({
      minBufferMs: 2000,
      maxBufferMs: 4000,
      bufferForPlaybackMs: 1000,
      bufferForPlaybackAfterRebufferMs: 1500,
    }),
    []
  );
  const videoStyle = useMemo(
    () => [
      styles.video,
      {
        width: SCREEN_WIDTH,
        height: VIDEO_HEIGHT,
      },
    ],
    [VIDEO_HEIGHT]
  );

  const openExerciseDrawer = useCallback(() => {
    if (!hasExercises) {
      Alert.alert("Нет доступных упражнений для этого видео");
      return;
    }
    if (isExerciseDrawerOpen) return;
    setExerciseDrawerMounted(true);
    setExerciseDrawerOpen(true);
    onDrawerStateChange?.(true);
    Animated.spring(exerciseDrawerAnim, {
      toValue: 1,
      useNativeDriver: true,
      friction: 9,
      tension: 45,
    }).start();
  }, [
    exerciseDrawerAnim,
    hasExercises,
    isExerciseDrawerOpen,
    onDrawerStateChange,
  ]);

  const closeExerciseDrawer = useCallback(() => {
    if (!isExerciseDrawerMounted) return;
    Animated.timing(exerciseDrawerAnim, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start(() => {
      setExerciseDrawerOpen(false);
      setExerciseDrawerMounted(false);
      onDrawerStateChange?.(false);
    });
  }, [exerciseDrawerAnim, isExerciseDrawerMounted, onDrawerStateChange]);

  const handleExerciseButtonPress = useCallback(() => {
    if (isExerciseDrawerOpen) {
      closeExerciseDrawer();
      return;
    }
    openExerciseDrawer();
  }, [closeExerciseDrawer, openExerciseDrawer, isExerciseDrawerOpen]);

  const updateIsSeeking = useCallback((value: boolean) => {
    isSeekingRef.current = value;
    setIsSeeking(value);
  }, []);

  // субтитры
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);

  const globalVolume = useAppSelector(selectGlobalVolume);

  // Роли
  const isAdmin = useAppSelector(selectIsAdmin);
  const profile = useAppSelector(selectUserProfile);

  // Exercise word actions
  const handleMarkKnown = useCallback(
    async (wordId: number) => {
      if (!profile?.id) return;
      try {
        await exercisesApi.markKnown(profile.id, { wordId });
      } catch {
        // Ignore errors
      }
    },
    [profile?.id]
  );

  const handleAddToVocab = useCallback(
    async (wordId: number) => {
      if (!profile?.id) return;
      try {
        await exercisesApi.addToVocab(profile.id, { wordId });
        Alert.alert('Успешно', 'Слово добавлено в словарь');
      } catch {
        Alert.alert('Ошибка', 'Не удалось добавить слово в словарь');
      }
    },
    [profile?.id]
  );

  const handlePlayWord = useCallback((timestamp: [number, number]) => {
    if (!videoRef.current) return;
    const [startTime] = timestamp;
    videoRef.current.seek(startTime);
    setIsPlaying(true);
  }, []);

  const handleSubmitExercises = useCallback(
    (answers: SubmitAnswerPayload[]) => {
      onSubmitExercises(content.id, answers);
    },
    [onSubmitExercises, content.id]
  );

  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>(
    () => content.transcription?.chunks ?? []
  );
  const [translationChunks, setTranslationChunks] = useState<TranscriptChunk[]>(
    () => content.translation?.chunks ?? []
  );

  useEffect(() => {
    setTranscriptChunks(content.transcription?.chunks ?? []);
    setTranslationChunks(content.translation?.chunks ?? []);
  }, [content.id, content.transcription?.chunks, content.translation?.chunks]);

  const [subtitleEditorState, setSubtitleEditorState] = useState<{
    chunkIndex: number;
    englishText: string;
    russianText: string;
    englishTimestamp: [number, number];
    russianTimestamp: [number, number];
  } | null>(null);
  const [isSavingSubtitle, setIsSavingSubtitle] = useState(false);
  const wasPlayingBeforeEditorRef = useRef(false);

  const resumePlaybackAfterEditor = useCallback(() => {
    if (wasPlayingBeforeEditorRef.current && shouldLoad) {
      setIsPlaying(true);
    }
    wasPlayingBeforeEditorRef.current = false;
  }, [setIsPlaying, shouldLoad]);

  const activeChunkIndex = useMemo(() => {
    if (transcriptChunks.length === 0) return -1;

    const index = transcriptChunks.findIndex((chunk) => {
      const [start, end] = chunk.timestamp;
      return currentTime >= start && currentTime <= end + 0.3;
    });

    if (index === -1 && currentTime > 0) {
      for (let i = transcriptChunks.length - 1; i >= 0; i--) {
        const [, end] = transcriptChunks[i].timestamp;
        if (currentTime > end) {
          return i;
        }
      }
      return 0;
    }

    return index;
  }, [currentTime, transcriptChunks]);

  const activeTranscript = useMemo(() => {
    if (activeChunkIndex >= 0 && activeChunkIndex < transcriptChunks.length) {
      return transcriptChunks[activeChunkIndex];
    }
    return transcriptChunks[0] ?? null;
  }, [activeChunkIndex, transcriptChunks]);

  const activeTranslation = useMemo(() => {
    if (activeChunkIndex >= 0 && activeChunkIndex < translationChunks.length) {
      return translationChunks[activeChunkIndex];
    }
    return translationChunks[0] ?? null;
  }, [activeChunkIndex, translationChunks]);

  const handleOpenSubtitleEditor = useCallback(() => {
    if (!isAdmin || !activeTranscript || activeChunkIndex < 0) {
      return;
    }
    wasPlayingBeforeEditorRef.current = isPlaying;
    if (isPlaying) {
      setIsPlaying(false);
    }
    setSubtitleEditorState({
      chunkIndex: activeChunkIndex,
      englishText: activeTranscript.text,
      russianText: activeTranslation?.text ?? "",
      englishTimestamp: activeTranscript.timestamp,
      russianTimestamp:
        activeTranslation?.timestamp ?? activeTranscript.timestamp,
    });
  }, [
    isAdmin,
    activeTranscript,
    activeChunkIndex,
    activeTranslation,
    isPlaying,
    setIsPlaying,
  ]);

  const handleEnglishSubtitleChange = useCallback((value: string) => {
    setSubtitleEditorState((prev) =>
      prev ? { ...prev, englishText: value } : prev
    );
  }, []);

  const handleRussianSubtitleChange = useCallback((value: string) => {
    setSubtitleEditorState((prev) =>
      prev ? { ...prev, russianText: value } : prev
    );
  }, []);

  const handleCancelSubtitleEditor = useCallback(() => {
    setSubtitleEditorState(null);
    resumePlaybackAfterEditor();
  }, [resumePlaybackAfterEditor]);

  const handleSaveSubtitleChunk = useCallback(async () => {
    if (!subtitleEditorState) {
      return;
    }
    if (!profile) {
      Alert.alert(
        "Ошибка",
        "Не удалось изменить субтитры: отсутствут данные пользователя."
      );
      return;
    }
    const englishText = subtitleEditorState.englishText.trim();
    const russianText = subtitleEditorState.russianText.trim();
    if (!englishText || !russianText) {
      Alert.alert(
        "Ошибка",
        "И английские и русские субтитры должны быть заполнены"
      );
      return;
    }

    setIsSavingSubtitle(true);
    try {
      const updated = await videoModerationApi.updateSubtitleChunk(
        content.id,
        {
          chunkIndex: subtitleEditorState.chunkIndex,
          transcript: {
            text: englishText,
            timestamp: subtitleEditorState.englishTimestamp,
          },
          translation: {
            text: russianText,
            timestamp: subtitleEditorState.russianTimestamp,
          },
        },
        profile.id,
        profile.role
      );
      setTranscriptChunks(updated.transcription?.chunks ?? []);
      setTranslationChunks(updated.translation?.chunks ?? []);
      setSubtitleEditorState(null);
      resumePlaybackAfterEditor();
    } catch {
      Alert.alert(
        "Ошибка",
        "Не удалось сохранить субтитры. Пожалуйста, попробуйте еще раз."
      );
    } finally {
      setIsSavingSubtitle(false);
    }
  }, [subtitleEditorState, profile, content.id, resumePlaybackAfterEditor]);

  // Ресет состояния
  useEffect(() => {
    isSeekingRef.current = false;
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(shouldLoad);
    setIsVideoReady(false);
    updateIsSeeking(false);
    setIsPlaying(shouldLoad);
  }, [content.id, shouldLoad, updateIsSeeking]);

  useEffect(() => {
    if (isExerciseDrawerMounted && (!isActive || !hasExercises)) {
      exerciseDrawerAnim.stopAnimation();
      exerciseDrawerAnim.setValue(0);
      setExerciseDrawerMounted(false);
      setExerciseDrawerOpen(false);
    }
  }, [isActive, hasExercises, isExerciseDrawerMounted, exerciseDrawerAnim]);

  useEffect(() => {
    if (optimisticLike !== null && optimisticLike === content.isLiked) {
      setOptimisticLike(null);
      setOptimisticLikeCount(null);
    }
  }, [content.isLiked, content.likesCount, content.id, optimisticLike]);

  const handleVideoLoad = useCallback((data: OnLoadData) => {
    setDuration(data.duration);
    setIsBuffering(false);
    setIsVideoReady(true);
  }, []);

  const handleVideoProgress = useCallback((data: OnProgressData) => {
    if (!isSeekingRef.current) {
      setCurrentTime(data.currentTime);
    }
  }, []);

  const handleVideoBandwidthUpdate = useCallback(
    (data: OnBandwidthUpdateData) => {},
    []
  );

  const handleVideoBuffer = useCallback((data: OnBufferData) => {
    setIsBuffering(data.isBuffering);
  }, []);

  const handleVideoError = useCallback(
    () => {
      setHasError(true);
      setIsVideoReady(false);
    },
    [content.id]
  );

  const handlePlaybackStateChanged = useCallback(() => {}, []);

  const handleVideoEnd = useCallback(() => {
    setCurrentTime(0);
  }, []);

  useEffect(
    () => () => {
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
      }
    },
    []
  );

  const togglePlayback = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const showDoubleTapLike = useCallback(() => {
    Animated.sequence([
      Animated.timing(doubleTapAnim, {
        toValue: 1,
        duration: 160,
        useNativeDriver: true,
      }),
      Animated.delay(220),
      Animated.timing(doubleTapAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [doubleTapAnim]);

  const handleDoubleTap = useCallback(() => {
    if (isLikePending) return;
    const nextLike = !displayIsLiked;
    setOptimisticLike(nextLike);
    setOptimisticLikeCount(displayLikesCount + (nextLike ? 1 : -1));
    onToggleLike(content.id, nextLike);
    if (nextLike) {
      showDoubleTapLike();
    }
  }, [
    content.id,
    displayIsLiked,
    displayLikesCount,
    isLikePending,
    onToggleLike,
    showDoubleTapLike,
  ]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapRef.current;

    if (timeSinceLastTap < DOUBLE_TAP_DELAY) {
      lastTapRef.current = 0;
      if (singleTapTimeoutRef.current) {
        clearTimeout(singleTapTimeoutRef.current);
        singleTapTimeoutRef.current = null;
      }
      handleDoubleTap();
      return;
    }

    lastTapRef.current = now;
    if (singleTapTimeoutRef.current) {
      clearTimeout(singleTapTimeoutRef.current);
    }
    singleTapTimeoutRef.current = setTimeout(() => {
      if (lastTapRef.current === now) {
        togglePlayback();
        lastTapRef.current = 0;
      }
      singleTapTimeoutRef.current = null;
    }, DOUBLE_TAP_DELAY);
  }, [handleDoubleTap, togglePlayback]);

  const handleLikePress = useCallback(() => {
    if (isLikePending) return;

    const nextLike = !displayIsLiked;

    setOptimisticLike(nextLike);
    setOptimisticLikeCount(displayLikesCount + (nextLike ? 1 : -1));

    onToggleLike(content.id, nextLike);
  }, [
    content.id,
    displayIsLiked,
    displayLikesCount,
    isLikePending,
    onToggleLike,
  ]);

  const progress = duration > 0 ? currentTime / duration : 0;

  const seekToPosition = useCallback(
    (position: number) => {
      if (!videoRef.current || duration === 0) return;
      const timeSeconds = Math.max(0, Math.min(position * duration, duration));
      videoRef.current.seek(timeSeconds);
      setCurrentTime(timeSeconds);
    },
    [duration]
  );
  // Перемотка (рассмотреть более оптимальные варианты чтоб отказаться от кастома)
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          updateIsSeeking(true);
          const touchX = evt.nativeEvent.locationX;
          const position = Math.max(0, Math.min(1, touchX / SCREEN_WIDTH));
          setCurrentTime(position * duration);
        },
        onPanResponderMove: (evt) => {
          const touchX = evt.nativeEvent.pageX;
          const position = Math.max(0, Math.min(1, touchX / SCREEN_WIDTH));
          setCurrentTime(position * duration);
        },
        onPanResponderRelease: (evt) => {
          const touchX = evt.nativeEvent.pageX;
          const position = Math.max(0, Math.min(1, touchX / SCREEN_WIDTH));
          seekToPosition(position);
          updateIsSeeking(false);
        },
      }),
    [duration, seekToPosition, updateIsSeeking]
  );

  return (
    <View style={[styles.container, { height: CONTAINER_HEIGHT }]}>
      {/* админ управление (панель слева) */}
      {isActive && isAdmin && !isExerciseDrawerOpen && (
        <View style={styles.leftControlsWrapper}>
          <ModerationFilterButton />
          {onOpenModeration && (
            <TouchableOpacity
              onPress={onOpenModeration}
              activeOpacity={0.7}
            style={[
              styles.moderationButton,
              {
                backgroundColor: content.isModerated
                  ? "rgba(76, 175, 80, 0.9)"
                  : "rgba(239, 68, 68, 0.9)",
              },
            ]}
          >
              <ShieldCheck size={24} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Панель справа, лайк и кнопка упражнений */}
      {!isExerciseDrawerOpen && (
        <View style={styles.rightControlsWrapper}>
          <TouchableOpacity
            onPress={handleLikePress}
            activeOpacity={0.7}
            style={styles.likeButton}
          >
            <Heart
              size={44}
              color={displayIsLiked ? "#E11D48" : "#FFFFFF"}
              fill={displayIsLiked ? "#E11D48" : "none"}
            />
          </TouchableOpacity>
          <Typography
            variant="body"
            style={[
              styles.likeCount,
              displayIsLiked ? styles.likeCountActive : undefined,
            ]}
            enableWordLookup={false}
          >
            {displayLikesCount}
          </Typography>

          <TouchableOpacity
            onPress={handleExerciseButtonPress}
            activeOpacity={0.85}
            style={styles.exerciseButton}
          >
            <Brain size={42} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* Header with tags and settings button */}
      {isActive && analysis && !isExerciseDrawerOpen && (
        <View style={[styles.headerContainer, { paddingTop: insets.top + 12 }]}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.tagsScroll}
            contentContainerStyle={styles.tagsContainer}
          >
            {[
              formatCEFRLevel(analysis.cefrLevel).toUpperCase(),
              formatSpeechSpeed(analysis.speechSpeed).toLowerCase(),
              ...(content.author ? [content.author.toLowerCase()] : []),
              ...(content.isAdultContent ? ["18+"] : []),
            ].map((label, index) => (
              <View key={`${label}-${index}`} style={styles.tag}>
                <Typography
                  variant="caption"
                  style={styles.tagText}
                  enableWordLookup={false}
                >
                  {label}
                </Typography>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            onPress={onOpenSettings}
            activeOpacity={0.7}
            style={styles.headerSettingsButton}
          >
            <MoreVertical size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[
          styles.videoContainer,
          {
            height: CONTAINER_HEIGHT,
          },
        ]}
      >
        <Reanimated.View style={videoContainerStyle}>
          {shouldPrefetch && !prefetchCancelled && !isActive && (
            <Video
              source={videoSource}
              style={{ width: 1, height: 1, opacity: 0 }}
              paused={true}
              muted={true}
              controls={false}
              maxBitRate={1500000}
              bufferConfig={{
                minBufferMs: 3000,
                maxBufferMs: 3000,
                bufferForPlaybackMs: 500,
                bufferForPlaybackAfterRebufferMs: 1000,
              }}
            />
          )}

          {shouldLoad ? (
            <>
              <Reanimated.View style={videoInnerStyle}>
                <Video
                  ref={videoRef}
                  source={videoSource}
                  style={[videoStyle, !isVideoReady && { opacity: 0 }]}
                  resizeMode="cover"
                  repeat={true}
                  paused={!isPlaying || !isActive || !isTabFocused}
                  volume={globalVolume}
                  muted={false}
                  playInBackground={false}
                  playWhenInactive={false}
                  controls={false}
                  maxBitRate={2000000}
                  onLoad={handleVideoLoad}
                  onProgress={handleVideoProgress}
                  onBandwidthUpdate={handleVideoBandwidthUpdate}
                  onBuffer={handleVideoBuffer}
                  onError={handleVideoError}
                  onPlaybackStateChanged={handlePlaybackStateChanged}
                  onEnd={handleVideoEnd}
                  bufferConfig={bufferConfig}
                  progressUpdateInterval={250}
                  ignoreSilentSwitch="ignore"
                  mixWithOthers="duck"
                />
              </Reanimated.View>
              {!isVideoReady && !hasError && (
                <View
                  style={[
                    styles.video,
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: SCREEN_WIDTH,
                      height: VIDEO_HEIGHT,
                      backgroundColor: "#000",
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <ActivityIndicator size="large" color="#FFFFFF" />
                </View>
              )}

              {hasError && (
                <View
                  style={[
                    styles.video,
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: SCREEN_WIDTH,
                      height: VIDEO_HEIGHT,
                      backgroundColor: "rgba(0,0,0,0.9)",
                      justifyContent: "center",
                      alignItems: "center",
                      padding: 20,
                    },
              ]}
            >
                  <AlertCircle size={64} color="#FF6B6B" />
                  <Typography
                    variant="subtitle"
                    style={{
                      color: "#FFFFFF",
                      marginTop: 16,
                      textAlign: "center",
                    }}
                  >
                    Не удалось загрузить видео
                  </Typography>
                  <Typography
                    variant="body"
                    style={{
                      color: "rgba(255, 255, 255, 0.7)",
                      marginTop: 8,
                      textAlign: "center",
                    }}
                  >
                    Проверьте подключение к сети
                  </Typography>
                </View>
              )}
            </>
          ) : (
            <View
              style={[
                styles.video,
                {
                  width: SCREEN_WIDTH,
                  height: VIDEO_HEIGHT,
                  backgroundColor: "#000",
                },
              ]}
            />
          )}
          {isExerciseDrawerOpen && activeTranscript && (
            <View style={styles.subtitleOverlayVideo} pointerEvents="none">
              <View style={[styles.subtitleBox, styles.subtitleBoxOverlay]}>
                <Typography
                  variant="body"
                  style={styles.subtitleEnOverlay}
                  enableWordLookup={true}
                >
                  {activeTranscript.text}
                </Typography>
              </View>
            </View>
          )}
        </Reanimated.View>
      </View>

      {shouldLoad && isBuffering && !isPlaying && isVideoReady && (
        <View style={styles.bufferingContainer}>
          <View style={styles.bufferingSpinner}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        </View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          styles.doubleTapHeart,
          {
            opacity: doubleTapAnim,
            transform: [
              {
                scale: doubleTapAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.7, 1.25],
                }),
              },
            ],
          },
        ]}
      >
        <Heart size={96} color="#E11D48" fill="#E11D48" />
      </Animated.View>

      <View
        style={[
          styles.bottomGradient,
          { paddingBottom: Math.max(insets.bottom + 60, 80) },
        ]}
        pointerEvents="box-none"
      >
        {!isExerciseDrawerOpen &&
          ((showEnglishSubtitles && activeTranscript) ||
            (showRussianSubtitles && activeTranslation)) && (
          <View style={[styles.subtitleContainer, subtitleContainerStyle]}>
            {isAdmin && showEnglishSubtitles && activeTranscript && (
              <TouchableOpacity
                style={styles.subtitleEditButton}
                onPress={handleOpenSubtitleEditor}
                disabled={isSavingSubtitle}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Pencil size={15} color="rgba(255,255,255,0.8)" />
              </TouchableOpacity>
            )}
            {showEnglishSubtitles && activeTranscript && (
              <View style={styles.subtitleRow}>
                <View style={styles.subtitleBox}>
                  <Typography
                    variant="body"
                    style={styles.subtitleEn}
                    enableWordLookup={true}
                  >
                    {activeTranscript.text}
                  </Typography>
                </View>
              </View>
            )}
            {showRussianSubtitles && !isExerciseDrawerOpen && activeTranslation && (
              <View style={[styles.subtitleBox, styles.subtitleBoxRu]}>
                <Typography
                  variant="body"
                  style={styles.subtitleRu}
                  enableWordLookup={false}
                >
                  {activeTranslation.text}
                </Typography>
              </View>
            )}
          </View>
        )}
      </View>

      {!isPlaying && !isExerciseDrawerOpen && (
        <View style={styles.centerIcon} pointerEvents="none">
          <View style={styles.iconBackground}>
            <Play size={56} color="#FFFFFF" />
          </View>
        </View>
      )}

      <View style={styles.progressBarContainer} {...panResponder.panHandlers}>
        <View style={styles.progressBar}>
          <View
            style={[styles.progressFill, { width: `${progress * 100}%` }]}
          />
        </View>
        {isSeeking && (
          <>
            <View style={[styles.seekThumb, { left: `${progress * 100}%` }]} />
            <View
              style={[styles.timeCodeContainer, { left: `${progress * 100}%` }]}
            >
              <Typography variant="caption" style={styles.timeCodeText}>
                {formatTime(currentTime)} / {formatTime(duration)}
              </Typography>
            </View>
          </>
        )}
      </View>

      <View style={styles.tapOverlay}>
        <TouchableWithoutFeedback onPress={handleTap}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </View>

      {isExerciseDrawerMounted && (
        <>
          <TouchableWithoutFeedback onPress={closeExerciseDrawer}>
            <Animated.View
              pointerEvents={isExerciseDrawerOpen ? "auto" : "none"}
              style={[
                styles.exerciseDrawerOverlay,
                { opacity: drawerOverlayOpacity },
              ]}
            />
          </TouchableWithoutFeedback>
          <Animated.View
            style={[
              styles.exerciseDrawer,
              {
                height: drawerHeight,
                paddingBottom: insets.bottom - 5,
                transform: [{ translateY: drawerTranslateY }],
              },
            ]}
            {...drawerPanResponder.panHandlers}
          >
            <View style={styles.exerciseDrawerHandle} />
            <ExerciseOverlay
              exercises={exercises}
              onSubmit={handleSubmitExercises}
              submitStatus={submitStatus}
              lastSubmission={exerciseSubmission}
              height={exerciseOverlayHeight}
              onMarkKnown={handleMarkKnown}
              onAddToVocab={handleAddToVocab}
              onPlayWord={handlePlayWord}
              onClose={closeExerciseDrawer}
            />
          </Animated.View>
        </>
      )}
      <SubtitleChunkEditor
        visible={Boolean(subtitleEditorState)}
        englishValue={subtitleEditorState?.englishText ?? ""}
        russianValue={subtitleEditorState?.russianText ?? ""}
        englishTimestamp={subtitleEditorState?.englishTimestamp}
        russianTimestamp={subtitleEditorState?.russianTimestamp}
        onChangeEnglish={handleEnglishSubtitleChange}
        onChangeRussian={handleRussianSubtitleChange}
        onClose={handleCancelSubtitleEditor}
        onSave={handleSaveSubtitleChunk}
        isSaving={isSavingSubtitle}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000000",
    position: "relative",
  },
  headerContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingRight: 0,
    paddingVertical: 12,
    zIndex: 200,
  },
  tagsScroll: {
    flex: 1,
  },
  tagsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingRight: 8,
  },
  tag: {
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 0,
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  headerSettingsButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  leftControlsWrapper: {
    position: "absolute",
    left: 8,
    top: "50%",
    transform: [{ translateY: -30 }],
    alignItems: "center",
    zIndex: 100,
    gap: 12,
  },
  rightControlsWrapper: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: 0 }],
    alignItems: "center",
    zIndex: 100,
    gap: 12,
  },
  likeButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  likeCount: {
    color: "#F5F5F5",
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.2,
    marginTop: -12,
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
    }),
  },
  likeCountActive: {
    color: "#E11D48",
  },
  exerciseButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseButtonDisabled: {
    opacity: 0.4,
  },
  exerciseButtonActive: {
    backgroundColor: "rgba(157,255,128,0.25)",
    borderColor: "#9dff80",
  },
  exerciseButtonLabel: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  exerciseBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    minWidth: 20,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: "#9dff80",
  },
  exerciseBadgeLabel: {
    color: "#051923",
    fontSize: 10,
    fontWeight: "700",
    textAlign: "center",
  },
  settingsButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  moderationButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  usageContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  usageText: {
    color: "#FFFFFF",
    opacity: 0.8,
  },
  resetButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    marginTop: 4,
  },
  resetButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  videoContainer: {
    width: "100%",
    backgroundColor: "#000000",
    position: "relative",
  },
  video: {
    marginTop: 2,
  },
  videoInner: {
    width: "100%",
    height: "100%",
  },
  bufferingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  bufferingSpinner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  doubleTapHeart: {
    position: "absolute",
    top: "40%",
    left: "50%",
    marginLeft: -48,
    marginTop: -48,
    zIndex: 15,
  },
  bottomGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "transparent",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    zIndex: 190,
  },
  completedBadge: {
    position: "absolute",
    top: 100,
    right: 12,
    zIndex: 11,
  },
  completedBadgeInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(76, 175, 80, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#4CAF50",
    elevation: 2,
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 2,
  },
  completedText: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.2,
  },
  subtitleContainer: {
    gap: 12,
    marginBottom: 10,
    zIndex: 200,
    position: "relative",
    alignItems: "center",
  },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "center",
  },
  subtitleBox: {
    backgroundColor: "rgba(0, 0, 0, 0.90)",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: "center",
    maxWidth: SCREEN_WIDTH - 40,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  subtitleOverlayVideo: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 8,
    alignItems: "center",
    zIndex: 400,
    elevation: 400,
    paddingHorizontal: 0,
  },
  subtitleBoxOverlay: {
    maxWidth: SCREEN_WIDTH,
    width: SCREEN_WIDTH,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
  },
  subtitleEnOverlay: {
    fontSize: 27,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    includeFontPadding: false,
  },
  subtitleEditButton: {
    position: "absolute",
    top: -32,
    left: 8,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    zIndex: 6,
  },
  subtitleBoxRu: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  subtitleEn: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    textAlign: "center",
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
    }),
  },
  subtitleRu: {
    color: "#F0F0F0",
    fontSize: 20,
    textAlign: "center",
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
    }),
  },
  centerIcon: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -60,
    marginLeft: -60,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  progressBarContainer: {
    position: "absolute",
    bottom: 24,
    left: 0,
    right: 0,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 0,
    zIndex: 10,
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4ECDC4",
  },
  seekThumb: {
    position: "absolute",
    top: "50%",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    marginTop: -8,
    marginLeft: -8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  timeCodeContainer: {
    position: "absolute",
    bottom: 30,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: -40,
  },
  timeCodeText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  exerciseDrawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.75)",
    zIndex: 150,
  },
  exerciseDrawer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 0,
    paddingTop: 8,
    zIndex: 160,
    overflow: "hidden",
  },
  exerciseDrawerHandle: {
    alignSelf: "center",
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginTop: 4,
    marginBottom: 8,
  },
  exerciseDrawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  exerciseDrawerTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  exerciseDrawerSubtitle: {
    color: "rgba(255,255,255,0.6)",
    marginTop: 3,
    marginBottom: 6,
    paddingHorizontal: 16,
    fontSize: 13,
  },
});

const areVideoContentsEqual = (
  prevContent: VideoContent,
  nextContent: VideoContent
) => {
  if (prevContent === nextContent) {
    return true;
  }

  if (prevContent.id !== nextContent.id) return false;
  if (prevContent.videoUrl !== nextContent.videoUrl) return false;
  if (prevContent.isLiked !== nextContent.isLiked) return false;
  if (prevContent.likesCount !== nextContent.likesCount) return false;
  if (prevContent.audioLevel !== nextContent.audioLevel) return false;
  if (prevContent.durationSeconds !== nextContent.durationSeconds) return false;
  if (prevContent.transcription !== nextContent.transcription) return false;
  if (prevContent.translation !== nextContent.translation) return false;

  const prevAnalysis = prevContent.analysis;
  const nextAnalysis = nextContent.analysis;

  if (prevAnalysis?.cefrLevel !== nextAnalysis?.cefrLevel) return false;

  const prevTopics = prevAnalysis?.topics ?? [];
  const nextTopics = nextAnalysis?.topics ?? [];

  if (prevTopics.length !== nextTopics.length) return false;
  for (let i = 0; i < prevTopics.length; i += 1) {
    if (prevTopics[i] !== nextTopics[i]) {
      return false;
    }
  }

  return true;
};

const areVideoFeedItemPropsEqual = (
  prev: VideoFeedItemProps,
  next: VideoFeedItemProps
) => {
  if (prev.isActive !== next.isActive) return false;
  if (prev.isCompleted !== next.isCompleted) return false;
  if (prev.isLikePending !== next.isLikePending) return false;
  if (prev.isTabFocused !== next.isTabFocused) return false;
  if (prev.onToggleLike !== next.onToggleLike) return false;
  if (!areVideoContentsEqual(prev.content, next.content)) return false;
  return true;
};

export const VideoFeedItem = memo(
  VideoFeedItemComponent,
  areVideoFeedItemPropsEqual
);
VideoFeedItem.displayName = "VideoFeedItem";

