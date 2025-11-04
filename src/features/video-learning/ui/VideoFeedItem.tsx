import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  PanResponder,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Video, { OnLoadData, OnProgressData, OnBufferData, OnBandwidthUpdateData } from "react-native-video";
import { Ionicons } from "@expo/vector-icons";

import { Typography } from "@shared/ui";
import { useAppSelector } from "@core/store/hooks";
import {
  selectShowEnglishSubtitles,
  selectShowRussianSubtitles,
} from "../model/videoSettingsSlice";
import { selectGlobalVolume } from "../model/volumeSettingsSlice";
import type { VideoContent } from "../api/videoLearningApi";
import { SCREEN_WIDTH, getContentHeight } from "@shared/utils/dimensions";
import {
  resetVideoDataUsage,
  useVideoDataUsage,
} from "../model/videoDataUsageStore";
import { useVideoDataUsageTracker } from "../model/videoDataUsageTracker";

const DOUBLE_TAP_DELAY = 250;

// Topic translation map - moved outside component to prevent recreation
const TOPIC_TRANSLATIONS: Record<string, string> = {
  // Common topics
  travel: "Путешествия",
  business: "Бизнес",
  technology: "Технологии",
  education: "Образование",
  health: "Здоровье",
  sports: "Спорт",
  entertainment: "Развлечения",
  food: "Еда",
  culture: "Культура",
  science: "Наука",
  politics: "Политика",
  economy: "Экономика",
  nature: "Природа",
  art: "Искусство",
  music: "Музыка",
  movies: "Фильмы",
  books: "Книги",
  history: "История",
  geography: "География",
  psychology: "Психология",
  philosophy: "Философия",
  religion: "Религия",
  law: "Право",
  medicine: "Медицина",
  fashion: "Мода",
  beauty: "Красота",
  lifestyle: "Стиль жизни",
  relationships: "Отношения",
  family: "Семья",
  children: "Дети",
  pets: "Питомцы",
  home: "Дом",
  garden: "Сад",
  cooking: "Кулинария",
  fitness: "Фитнес",
  yoga: "Йога",
  meditation: "Медитация",
  motivation: "Мотивация",
  success: "Успех",
  finance: "Финансы",
  investment: "Инвестиции",
  career: "Карьера",
  marketing: "Маркетинг",
  sales: "Продажи",
  management: "Менеджмент",
  leadership: "Лидерство",
  communication: "Коммуникация",
  languages: "Языки",
  grammar: "Грамматика",
  vocabulary: "Словарь",
  pronunciation: "Произношение",
  conversation: "Разговор",
  news: "Новости",
  events: "События",
  social: "Общество",
  environment: "Экология",
  weather: "Погода",
  space: "Космос",
  animals: "Животные",
  cars: "Автомобили",
  aviation: "Авиация",
  shipping: "Морское дело",
  architecture: "Архитектура",
  design: "Дизайн",
  photography: "Фотография",
  games: "Игры",
  hobbies: "Хобби",
};

// Helper function moved outside component to prevent recreation
const translateTopic = (topic: string): string => {
  const lowerTopic = topic.toLowerCase();
  return TOPIC_TRANSLATIONS[lowerTopic] || topic;
};

// Helper function for level colors - moved outside component
const getLevelColor = (level: string): string => {
  switch (level) {
    case "A1":
      return "#4CAF50"; // Green
    case "A2":
      return "#8BC34A"; // Light Green
    case "B1":
      return "#FFC107"; // Amber
    case "B2":
      return "#FF9800"; // Orange
    case "C1":
      return "#FF5722"; // Deep Orange
    case "C2":
      return "#F44336"; // Red
    default:
      return "#9E9E9E"; // Grey
  }
};

// Helper function to format time as MM:SS
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

interface VideoFeedItemProps {
  content: VideoContent;
  isActive: boolean;
  isCompleted: boolean;
  onToggleLike: (videoId: string, nextLike: boolean) => void;
  isLikePending: boolean;
  isTabFocused: boolean;
}

const VideoFeedItemComponent = ({
  content,
  isActive,
  isCompleted,
  onToggleLike,
  isLikePending,
  isTabFocused,
}: VideoFeedItemProps) => {
  const insets = useSafeAreaInsets();
  const pauseIconAnim = useRef(new Animated.Value(0)).current;
  const doubleTapAnim = useRef(new Animated.Value(0)).current;
  const lastTapRef = useRef<number>(0);
  const singleTapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isSeekingRef = useRef(false);

  // Calculate content height excluding safe areas
  const SCREEN_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const shouldLoad = isActive && isTabFocused;
  const totalUsageBytes = useVideoDataUsage();
  const videoRef = useRef<Video>(null);

  // Data usage tracker - monitors bandwidth and calculates traffic
  const dataUsageTracker = useVideoDataUsageTracker({
    enabled: shouldLoad,
    contentId: content.id,
  });

  // CRITICAL: Memoize video source to prevent recreation on every render
  // Creating new object reference causes Video component to reload
  const videoSource = useMemo(
    () => ({ uri: content.videoUrl }),
    [content.videoUrl]
  );

  // CRITICAL: Memoize bufferConfig to prevent Video component recreation
  const bufferConfig = useMemo(
    () => ({
      minBufferMs: 2000,
      maxBufferMs: 4000,
      bufferForPlaybackMs: 1000,
      bufferForPlaybackAfterRebufferMs: 1500,
    }),
    []
  );

  // CRITICAL: Memoize video style to prevent recreation
  const videoStyle = useMemo(
    () => [
      styles.video,
      {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
      },
    ],
    [SCREEN_HEIGHT]
  );

  console.log(`[VideoFeedItem ${content.id}] 🎬 Render: isActive=${isActive}, shouldLoad=${shouldLoad}, tabFocused=${isTabFocused}`);

  const updateIsSeeking = useCallback((value: boolean) => {
    isSeekingRef.current = value;
    setIsSeeking(value);
  }, []);

  // Get subtitle settings
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);

  // Get volume settings
  const globalVolume = useAppSelector(selectGlobalVolume);

  const transcriptChunks = useMemo(
    () => content.transcription?.chunks ?? [],
    [content.transcription]
  );
  const translationChunks = useMemo(
    () => content.translation?.chunks ?? [],
    [content.translation]
  );

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

  // Reset video state when content changes
  useEffect(() => {
    console.log(`[VideoFeedItem ${content.id}] 🔄 Content changed - resetting state`);
    isSeekingRef.current = false;
    setCurrentTime(0);
    setDuration(0);
    setIsBuffering(true);
    updateIsSeeking(false);
    setIsPlaying(shouldLoad);
  }, [content.id, shouldLoad, updateIsSeeking]);

  useEffect(() => {
    console.log(`[VideoFeedItem ${content.id}] 👁️ shouldLoad changed: ${shouldLoad}`);
    if (shouldLoad) {
      setIsBuffering(true);
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  }, [shouldLoad, content.id]);

  const formattedUsage = useMemo(() => {
    const bytes = totalUsageBytes;
    if (bytes <= 0) {
      return "0 KB";
    }
    const megabytes = bytes / (1024 * 1024);
    if (megabytes >= 1) {
      return `${megabytes.toFixed(2)} MB`;
    }
    const kilobytes = bytes / 1024;
    return `${kilobytes.toFixed(1)} KB`;
  }, [totalUsageBytes]);

  const handleResetUsage = useCallback(() => {
    resetVideoDataUsage();
  }, []);

  // CRITICAL: Memoize all video event handlers to prevent Video recreation
  const handleVideoLoad = useCallback(
    (data: OnLoadData) => {
      console.log(`[VideoFeedItem ${content.id}] ✅ Video loaded:`, {
        duration: Math.floor(data.duration),
        naturalSize: data.naturalSize,
        videoTracks: data.videoTracks?.length ?? 0,
        audioTracks: data.audioTracks?.length ?? 0,
      });
      setDuration(data.duration);
      setIsBuffering(false);
      dataUsageTracker.handleLoad(data);
    },
    [content.id, dataUsageTracker]
  );

  const handleVideoProgress = useCallback(
    (data: OnProgressData) => {
      if (!isSeekingRef.current) {
        setCurrentTime(data.currentTime);
      }
      dataUsageTracker.handleProgress(data);
    },
    [dataUsageTracker]
  );

  const handleVideoBandwidthUpdate = useCallback(
    (data: OnBandwidthUpdateData) => {
      dataUsageTracker.handleBandwidthUpdate(data);
    },
    [dataUsageTracker]
  );

  const handleVideoBuffer = useCallback(
    (data: OnBufferData) => {
      console.log(`[VideoFeedItem ${content.id}] 📥 Buffer ${data.isBuffering ? 'START' : 'END'}`);
      setIsBuffering(data.isBuffering);
    },
    [content.id]
  );

  const handleVideoError = useCallback(
    (error: any) => {
      console.error(`[VideoFeedItem ${content.id}] ❌ Video error:`, error);
    },
    [content.id]
  );

  const handlePlaybackStateChanged = useCallback(
    (data: any) => {
      console.log(`[VideoFeedItem ${content.id}] 🎮 Playback state:`, data.isPlaying ? 'PLAYING' : 'PAUSED');
    },
    [content.id]
  );

  // No polling needed - react-native-video provides callbacks

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

    // Show pause/play icon animation
    Animated.sequence([
      Animated.timing(pauseIconAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.delay(500),
      Animated.timing(pauseIconAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pauseIconAnim]);

  // Single tap to pause/play
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
    const nextLike = !content.isLiked;
    onToggleLike(content.id, nextLike);
    if (nextLike) {
      showDoubleTapLike();
    }
  }, [
    content.id,
    content.isLiked,
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
    onToggleLike(content.id, !content.isLiked);
  }, [content.id, content.isLiked, isLikePending, onToggleLike]);

  const progress = duration > 0 ? currentTime / duration : 0;

  // Seek to position
  const seekToPosition = useCallback(
    (position: number) => {
      if (!videoRef.current || duration === 0) return;
      const timeSeconds = Math.max(0, Math.min(position * duration, duration));
      videoRef.current.seek(timeSeconds);
      setCurrentTime(timeSeconds);
    },
    [duration]
  );

  // PanResponder for progress bar scrubbing
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          updateIsSeeking(true);
          // Use initial touch position for immediate seeking
          const touchX = evt.nativeEvent.locationX;
          const position = Math.max(0, Math.min(1, touchX / SCREEN_WIDTH));
          setCurrentTime(position * duration);
        },
        onPanResponderMove: (evt) => {
          // Use absolute position (x0 + dx) instead of moveX
          const touchX = evt.nativeEvent.pageX;
          const position = Math.max(0, Math.min(1, touchX / SCREEN_WIDTH));
          setCurrentTime(position * duration);
        },
        onPanResponderRelease: (evt) => {
          // Use absolute position for final seek
          const touchX = evt.nativeEvent.pageX;
          const position = Math.max(0, Math.min(1, touchX / SCREEN_WIDTH));
          seekToPosition(position);
          updateIsSeeking(false);
        },
      }),
    [duration, seekToPosition, updateIsSeeking]
  );

  // Set volume
  // Playback is now controlled directly via Video component props (paused, volume)
  // No manual play/pause needed

  const levelColor = useMemo(
    () => getLevelColor(content.analysis.cefrLevel),
    [content.analysis.cefrLevel]
  );

  return (
    <View style={[styles.container, { height: SCREEN_HEIGHT }]}>
      {/* Badges row at the top */}
      <View style={styles.badgesContainer}>
        <View style={styles.badgesRow}>
          {/* Level Badge */}
          <View
            style={[
              styles.badge,
              styles.levelBadge,
              { backgroundColor: levelColor },
            ]}
          >
            <Typography
              variant="caption"
              style={styles.badgeText}
              enableWordLookup={false}
            >
              {content.analysis.cefrLevel}
            </Typography>
          </View>

          {/* Topic Badges */}
          {content.analysis.topics.slice(0, 2).map((topic, idx) => (
            <View key={idx} style={[styles.badge, styles.topicBadge]}>
              <Typography
                variant="caption"
                style={styles.badgeText}
                enableWordLookup={false}
              >
                {translateTopic(topic)}
              </Typography>
            </View>
          ))}
        </View>
      </View>

      {/* Like button centered on the right */}
      <View style={styles.likeButtonWrapper}>
        <TouchableOpacity
          onPress={handleLikePress}
          activeOpacity={0.7}
          style={styles.likeButton}
        >
          <Ionicons
            name={content.isLiked ? "heart" : "heart-outline"}
            size={44}
            color={content.isLiked ? "#E11D48" : "#FFFFFF"}
          />
        </TouchableOpacity>
        <Typography
          variant="body"
          style={[
            styles.likeCount,
            content.isLiked ? styles.likeCountActive : undefined,
          ]}
          enableWordLookup={false}
        >
          {content.likesCount}
        </Typography>
        <View style={styles.usageContainer}>
          <Typography
            variant="caption"
            style={styles.usageText}
            enableWordLookup={false}
          >
            Трафик: {formattedUsage}
          </Typography>
          {/* Debug info */}
          {shouldLoad && videoRef.current && (
            <Typography
              variant="caption"
              style={[styles.usageText, { fontSize: 10, marginTop: 4 }]}
              enableWordLookup={false}
            >
              ID: {content.id.slice(0, 8)}
            </Typography>
          )}
          <TouchableOpacity
            onPress={handleResetUsage}
            style={styles.resetButton}
            activeOpacity={0.7}
          >
            <Typography
              variant="caption"
              style={styles.resetButtonText}
              enableWordLookup={false}
            >
              Сбросить
            </Typography>
          </TouchableOpacity>
        </View>
      </View>

      {/* Video container with black background */}
      <View style={styles.videoContainer}>
        {shouldLoad ? (
          <Video
            ref={videoRef}
            source={videoSource}
            style={videoStyle}  // OPTIMIZATION: Use memoized style to prevent recreation
            resizeMode="cover"
            repeat={false}  // CRITICAL: Changed to false - repeat causes unnecessary buffer reload at video end
            paused={!isPlaying || !isActive || !isTabFocused}
            volume={globalVolume}
            muted={false}
            playInBackground={false}
            playWhenInactive={false}
            preventsDisplaySleepDuringVideoPlayback={true}
            maxBitRate={2000000}  // Limit to 2 Mbps (~720p) to save bandwidth
            onLoad={handleVideoLoad}  // OPTIMIZATION: Use memoized handler to prevent Video recreation
            onProgress={handleVideoProgress}  // OPTIMIZATION: Use memoized handler
            onBandwidthUpdate={handleVideoBandwidthUpdate}  // OPTIMIZATION: Use memoized handler
            onBuffer={handleVideoBuffer}  // OPTIMIZATION: Use memoized handler
            onError={handleVideoError}  // OPTIMIZATION: Use memoized handler
            onPlaybackStateChanged={handlePlaybackStateChanged}  // OPTIMIZATION: Use memoized handler
            bufferConfig={bufferConfig}  // OPTIMIZATION: Use memoized config to prevent recreation
            progressUpdateInterval={1000}  // OPTIMIZATION: Increased from 500ms to 1000ms - reduce callback frequency
            ignoreSilentSwitch="ignore"
            mixWithOthers="duck"
          />
        ) : (
          <View
            style={[
              styles.video,
              {
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT,
                backgroundColor: "#000",
              },
            ]}
          />
        )}
      </View>

      {/* Buffering indicator - only show when video is loading but not playing */}
      {shouldLoad && isBuffering && !isPlaying && (
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
        <Ionicons name="heart" size={96} color="#E11D48" />
      </Animated.View>

      {/* Bottom overlay */}
      <View
        style={[
          styles.bottomGradient,
          { paddingBottom: Math.max(insets.bottom + 60, 80) },
        ]}
        pointerEvents="box-none"
      >
        {/* Subtitles with reduced transparency */}
        {((showEnglishSubtitles && activeTranscript) ||
          (showRussianSubtitles && activeTranslation)) && (
          <View style={styles.subtitleContainer}>
            {showEnglishSubtitles && activeTranscript && (
              <View style={styles.subtitleBox}>
                <Typography
                  variant="body"
                  style={styles.subtitleEn}
                  enableWordLookup={true}
                >
                  {activeTranscript.text}
                </Typography>
              </View>
            )}
            {showRussianSubtitles && activeTranslation && (
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

      {/* Completed badge - Compact */}
      {isCompleted && (
        <View style={styles.completedBadge}>
          <View style={styles.completedBadgeInner}>
            <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
            <Typography variant="caption" style={styles.completedText}>
              Просмотренно
            </Typography>
          </View>
        </View>
      )}

      {/* Center pause/play animation */}
      <Animated.View
        style={[
          styles.centerIcon,
          {
            opacity: pauseIconAnim,
            transform: [
              {
                scale: pauseIconAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.1],
                }),
              },
            ],
          },
        ]}
        pointerEvents="none"
      >
        <View style={styles.iconBackground}>
          <Ionicons
            name={isPlaying ? "pause" : "play"}
            size={56}
            color="#FFFFFF"
          />
        </View>
      </Animated.View>

      {/* Progress bar with scrubbing */}
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

      {/* Transparent overlay to catch taps */}
      <View style={styles.tapOverlay}>
        <TouchableWithoutFeedback onPress={handleTap}>
          <View style={StyleSheet.absoluteFill} />
        </TouchableWithoutFeedback>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000000",
    position: "relative",
  },
  badgesContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 17,
    paddingBottom: 8,
    zIndex: 100,
  },
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.2,
    includeFontPadding: false,
    fontFamily: Platform.select({
      ios: "System",
      android: "Roboto",
    }),
  },
  likeButtonWrapper: {
    position: "absolute",
    right: 8,
    top: "50%",
    transform: [{ translateY: -44 }], // Half of button (32) + text height (~12)
    alignItems: "center",
    zIndex: 100,
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
    flex: 1,
    width: "100%",
    backgroundColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
  },
  video: {
    // Temporarily scaled down by 10% to check cropping
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
  },
  // Badge variants
  levelBadge: {
    // backgroundColor set dynamically based on CEFR level
  },
  topicBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  // Completed Badge - Compact
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
  // Subtitles - Less transparent
  subtitleContainer: {
    gap: 10,
    marginBottom: 16,
  },
  subtitleBox: {
    backgroundColor: "rgba(0, 0, 0, 0.90)",
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 16,
    alignSelf: "center",
    maxWidth: "90%",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  subtitleBoxRu: {
    backgroundColor: "rgba(0, 0, 0, 0.85)",
  },
  subtitleEn: {
    color: "#FFFFFF",
    fontSize: 18,
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
    fontSize: 15,
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
    bottom: 34,
    left: 0,
    right: 0,
    height: 20,
    justifyContent: "center",
    paddingHorizontal: 0,
    zIndex: 2,
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
