import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Video, ResizeMode, type AVPlaybackStatus } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';
import { useAppSelector, useAppDispatch } from '@core/store/hooks';
import { selectShowEnglishSubtitles, selectShowRussianSubtitles } from '../model/videoSettingsSlice';
import { selectGlobalVolume, selectAutoNormalize, selectVideoVolume, setVideoVolume } from '../model/volumeSettingsSlice';
import type { VideoContent } from '../api/videoLearningApi';
import { AudioVolumeAnalyzer } from '@shared/utils/audioVolumeAnalyzer';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const TARGET_NORMALIZED_VOLUME = 0.7;
const MIN_NORMALIZED_VOLUME = 0.2;
const MAX_NORMALIZED_VOLUME = 1.0;
const MIN_AUDIO_REFERENCE = 0.35;
const CACHE_SMOOTHING_FACTOR = 0.6;

const clampVolume = (value: number) =>
  Math.max(MIN_NORMALIZED_VOLUME, Math.min(MAX_NORMALIZED_VOLUME, value));

const normalizeFromAudioLevel = (audioLevel: number) =>
  clampVolume(TARGET_NORMALIZED_VOLUME / Math.max(audioLevel, MIN_AUDIO_REFERENCE));

interface VideoFeedItemProps {
  content: VideoContent;
  isActive: boolean;
  isCompleted: boolean;
  onComplete: () => void;
}

export const VideoFeedItem = ({ content, isActive, isCompleted, onComplete }: VideoFeedItemProps) => {
  const dispatch = useAppDispatch();
  const videoRef = useRef<Video | null>(null);
  const pauseIconAnim = useRef(new Animated.Value(0)).current;
  const initialVolumeSet = useRef(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const localVolumeAdjustment = 0;

  // Get subtitle settings
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);

  // Get volume settings
  const globalVolume = useAppSelector(selectGlobalVolume);
  const autoNormalize = useAppSelector(selectAutoNormalize);
  const cachedVideoVolume = useAppSelector(selectVideoVolume(content.id));

  const transcriptChunks = useMemo(
    () => content.transcription?.chunks ?? [],
    [content.transcription],
  );
  const translationChunks = useMemo(
    () => content.translation?.chunks ?? [],
    [content.translation],
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

  const baseNormalizedVolume = useMemo(() => {
    if (!autoNormalize) {
      return clampVolume(1);
    }

    if (cachedVideoVolume !== null) {
      return clampVolume(cachedVideoVolume);
    }

    if (content.audioLevel !== undefined && content.audioLevel > 0) {
      return normalizeFromAudioLevel(content.audioLevel);
    }

    const estimate = AudioVolumeAnalyzer.estimateFromMetadata(
      content.videoUrl,
      content.durationSeconds ?? undefined,
    );

    return clampVolume(estimate.normalizedVolume);
  }, [autoNormalize, cachedVideoVolume, content.audioLevel, content.durationSeconds, content.videoUrl]);

  const normalizedVolume = useMemo(() => {
    if (!autoNormalize) {
      return clampVolume(globalVolume + localVolumeAdjustment);
    }

    const scaled = baseNormalizedVolume * globalVolume;
    return clampVolume(scaled + localVolumeAdjustment);
  }, [autoNormalize, baseNormalizedVolume, globalVolume, localVolumeAdjustment]);

  useEffect(() => {
    if (!autoNormalize) {
      return;
    }

    const audioLevel = content.audioLevel;
    if (audioLevel !== undefined && audioLevel > 0) {
      const computed = normalizeFromAudioLevel(audioLevel);
      const current = cachedVideoVolume;
      const blended =
        current !== null
          ? clampVolume(current * CACHE_SMOOTHING_FACTOR + computed * (1 - CACHE_SMOOTHING_FACTOR))
          : computed;

      if (current === null || Math.abs(current - blended) > 0.01) {
        dispatch(setVideoVolume({ videoId: content.id, volume: blended }));
      }
      return;
    }

    if (cachedVideoVolume === null) {
      const estimate = AudioVolumeAnalyzer.estimateFromMetadata(
        content.videoUrl,
        content.durationSeconds ?? undefined,
      );
      dispatch(setVideoVolume({ videoId: content.id, volume: clampVolume(estimate.normalizedVolume) }));
    }
  }, [
    autoNormalize,
    cachedVideoVolume,
    content.audioLevel,
    content.durationSeconds,
    content.id,
    content.videoUrl,
    dispatch,
  ]);

  const handleStatusUpdate = useCallback((status: AVPlaybackStatus) => {
    if (!status.isLoaded) {
      setIsBuffering(true);
      return;
    }
    setIsBuffering(false);
    setCurrentTime(status.positionMillis / 1000);
    setIsPlaying(status.isPlaying ?? false);
    if (status.durationMillis) {
      setDuration(status.durationMillis / 1000);
    }
  }, []);

  const togglePlayback = useCallback(() => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pauseAsync().catch(() => undefined);
    } else {
      videoRef.current.playAsync().catch(() => undefined);
    }

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
  }, [isPlaying, pauseIconAnim]);

  // Single tap to pause/play
  const handleTap = useCallback(() => {
    togglePlayback();
  }, [togglePlayback]);

  const progress = duration > 0 ? currentTime / duration : 0;

  // Установка начальной громкости при загрузке видео
  useEffect(() => {
    const setInitialVolume = async () => {
      if (!initialVolumeSet.current && videoRef.current) {
        try {
          await videoRef.current.setVolumeAsync(normalizedVolume);
          initialVolumeSet.current = true;
        } catch (error) {
          console.warn('[VideoVolume] Failed to set initial volume:', error);
        }
      }
    };

    if (isActive && duration > 0) {
      setInitialVolume();
    }
  }, [isActive, duration, normalizedVolume]);

  // Обновление громкости при изменении настроек
  useEffect(() => {
    const updateVolume = async () => {
      if (videoRef.current && initialVolumeSet.current) {
        try {
          await videoRef.current.setVolumeAsync(normalizedVolume);
        } catch (error) {
          console.warn('[VideoVolume] Failed to update volume:', error);
        }
      }
    };

    updateVolume();
  }, [normalizedVolume]);

  // Auto play when active
  useEffect(() => {
    if (isActive) {
      videoRef.current?.playAsync().catch(() => undefined);
    } else {
      videoRef.current?.pauseAsync().catch(() => undefined);
    }
  }, [isActive]);

  // Get level color
  const getLevelColor = (level: string) => {
    switch (level) {
      case 'A1':
        return '#4CAF50'; // Green
      case 'A2':
        return '#8BC34A'; // Light Green
      case 'B1':
        return '#FFC107'; // Amber
      case 'B2':
        return '#FF9800'; // Orange
      case 'C1':
        return '#FF5722'; // Deep Orange
      case 'C2':
        return '#F44336'; // Red
      default:
        return '#9E9E9E'; // Grey
    }
  };

  const levelColor = getLevelColor(content.analysis.cefrLevel);

  return (
    <TouchableWithoutFeedback onPress={handleTap}>
      <View style={styles.container}>
        {/* Modern Header with Material Design */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.8)', 'rgba(0, 0, 0, 0.4)', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={styles.headerContent}>
              {/* Level Badge - Material Design */}
              <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
                <Typography variant="caption" style={styles.levelText}>
                  {content.analysis.cefrLevel}
                </Typography>
              </View>

              {/* Topics - Material Design Chips */}
              <View style={styles.topicChips}>
                {content.analysis.topics.slice(0, 2).map((topic, idx) => (
                  <View key={idx} style={styles.topicChip}>
                    <Ionicons name="pricetag" size={12} color="rgba(255,255,255,0.9)" />
                    <Typography variant="caption" style={styles.topicText}>
                      {topic}
                    </Typography>
                  </View>
                ))}
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Video container with black background */}
        <View style={styles.videoContainer}>
          <Video
            ref={(instance) => {
              videoRef.current = instance;
            }}
            style={styles.video}
            source={{ uri: content.videoUrl }}
            resizeMode={ResizeMode.CONTAIN}
            posterResizeMode={ResizeMode.CONTAIN}
            shouldPlay={false}
            isLooping={false}
            onPlaybackStatusUpdate={handleStatusUpdate}
            useNativeControls={false}
            videoStyle={styles.videoInner}
          />
        </View>

        {/* Buffering indicator */}
        {isBuffering && (
          <View style={styles.bufferingContainer}>
            <View style={styles.bufferingSpinner}>
              <Ionicons name="reload-circle" size={48} color="#FFFFFF" />
            </View>
          </View>
        )}

        {/* Bottom gradient overlay */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.4)', 'rgba(0,0,0,0.8)']}
          style={styles.bottomGradient}
          pointerEvents="box-none"
        >
          {/* Subtitles with reduced transparency */}
          {((showEnglishSubtitles && activeTranscript) || (showRussianSubtitles && activeTranslation)) && (
            <View style={styles.subtitleContainer}>
              {showEnglishSubtitles && activeTranscript && (
                <View style={styles.subtitleBox}>
                  <Typography variant="subtitle" style={styles.subtitleEn}>
                    {activeTranscript.text}
                  </Typography>
                </View>
              )}
              {showRussianSubtitles && activeTranslation && (
                <View style={[styles.subtitleBox, styles.subtitleBoxRu]}>
                  <Typography variant="body" style={styles.subtitleRu}>
                    {activeTranslation.text}
                  </Typography>
                </View>
              )}
            </View>
          )}

          {/* Swipe indicator */}
          <View style={styles.swipeIndicator}>
            <Ionicons name="chevron-down" size={24} color="rgba(255,255,255,0.7)" />
            <Typography variant="caption" style={styles.swipeText}>
              Свайпните вниз для упражнений
            </Typography>
          </View>
        </LinearGradient>

        {/* Completed badge - Material Design */}
        {isCompleted && (
          <View style={styles.completedBadge}>
            <View style={styles.completedBadgeInner}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Typography variant="caption" style={styles.completedText}>
                Пройдено
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
            <Ionicons name={isPlaying ? 'pause' : 'play'} size={56} color="#FFFFFF" />
          </View>
        </Animated.View>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <LinearGradient
              colors={['#FF6B6B', '#4ECDC4', '#45B7D1']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
        </View>
      </View>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
    backgroundColor: '#000000',
    position: 'relative',
  },
  headerGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    paddingTop: 50,
    paddingBottom: 20,
  },
  header: {
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  video: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  videoInner: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  bufferingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  bufferingSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  // Level Badge - Material Design Style
  levelBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  levelText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  // Topic Chips - Material Design
  topicChips: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    flex: 1,
  },
  topicChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  topicText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // Completed Badge - Material Design
  completedBadge: {
    position: 'absolute',
    top: 120,
    right: 16,
    zIndex: 11,
  },
  completedBadgeInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 4,
    shadowColor: '#4CAF50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  completedText: {
    color: '#4CAF50',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.3,
  },
  // Subtitles - Less transparent
  subtitleContainer: {
    gap: 10,
    marginBottom: 16,
  },
  subtitleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.90)', // Increased from 0.75
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 12,
    alignSelf: 'center',
    maxWidth: '90%',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  subtitleBoxRu: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)', // Increased from 0.6
  },
  subtitleEn: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 26,
  },
  subtitleRu: {
    color: '#F0F0F0',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  swipeIndicator: {
    alignItems: 'center',
    marginTop: 12,
    opacity: 0.8,
  },
  swipeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 4,
  },
  centerIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -60,
    marginLeft: -60,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 4,
  },
  progressBar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height: '100%',
  },
});
