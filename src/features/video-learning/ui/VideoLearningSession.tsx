import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@shared/ui';
import { PrimaryButton } from '@shared/ui/button/PrimaryButton';
import type { SubmitAnswerPayload, VideoContent } from '../api/videoLearningApi';
import { SCREEN_WIDTH, getContentHeight } from '@shared/utils/dimensions';
const WRONG_FEEDBACK_DELAY = 2000;
const CORRECT_FEEDBACK_DELAY = 800;

interface VideoLearningSessionProps {
  content: VideoContent;
  submitStatus: 'idle' | 'submitting' | 'succeeded' | 'failed';
  lastSubmission?: { contentId: string; completed: boolean; correct: number; total: number };
  onSubmit: (answers: SubmitAnswerPayload[]) => void;
  onNextVideo?: () => void;
}

export const VideoLearningSession = ({
  content,
  submitStatus,
  lastSubmission,
  onSubmit,
  onNextVideo,
}: VideoLearningSessionProps) => {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Create video player using expo-video
  // Explicitly specify HLS content type for master.m3u8 playlists
  const player = useVideoPlayer(
    {
      uri: content.videoUrl,
      ...(content.videoUrl.includes('.m3u8') && { contentType: 'hls' as const }),
    },
    (player) => {
      player.loop = false;
      player.volume = 1.0;
    }
  );
  const [activeView, setActiveView] = useState<'video' | 'exercises'>('video');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; correctAnswer?: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showControls, setShowControls] = useState(true);

  // Calculate content height excluding safe areas
  const SCREEN_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  const transcriptChunks = content.transcription.chunks ?? [];
  const translationChunks = content.translation.chunks ?? [];

  // Improved subtitle synchronization with better fallback logic
  const activeChunkIndex = useMemo(() => {
    if (transcriptChunks.length === 0) return -1;

    // Find the current active chunk
    const index = transcriptChunks.findIndex((chunk) => {
      const [start, end] = chunk.timestamp;
      return currentTime >= start && currentTime <= end + 0.3;
    });

    // If no active chunk found, return the last passed chunk (not -1)
    if (index === -1 && currentTime > 0) {
      // Find the last chunk that has already passed
      for (let i = transcriptChunks.length - 1; i >= 0; i--) {
        const [, end] = transcriptChunks[i].timestamp;
        if (currentTime > end) {
          return i;
        }
      }
      return 0; // If no chunk has passed yet, show the first one
    }

    return index;
  }, [currentTime, transcriptChunks]);

  const activeTranscript = useMemo(() => {
    if (activeChunkIndex >= 0 && activeChunkIndex < transcriptChunks.length) {
      return transcriptChunks[activeChunkIndex];
    }
    // Show first chunk as initial state
    return transcriptChunks[0] ?? null;
  }, [activeChunkIndex, transcriptChunks]);

  const activeTranslation = useMemo(() => {
    if (activeChunkIndex >= 0 && activeChunkIndex < translationChunks.length) {
      return translationChunks[activeChunkIndex];
    }
    // Show first translation as initial state
    return translationChunks[0] ?? null;
  }, [activeChunkIndex, translationChunks]);

  // Track player status with polling
  useEffect(() => {
    if (!player) return;

    const interval = setInterval(() => {
      if (player.duration && player.duration !== duration) {
        setDuration(player.duration);
      }
      if (player.currentTime !== currentTime) {
        setCurrentTime(player.currentTime);
      }
      if (player.playing !== isPlaying) {
        setIsPlaying(player.playing);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [player, duration, currentTime, isPlaying]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      if (isLocked) return;
      const exercise = content.exercises[currentExerciseIndex];
      if (!exercise) return;

      const isCorrect = optionIndex === exercise.correctAnswer;
      const updatedAnswers = { ...answers, [exercise.id]: optionIndex };
      setAnswers(updatedAnswers);
      setIsLocked(true);
      setFeedback({ type: isCorrect ? 'correct' : 'incorrect', correctAnswer: exercise.correctAnswer });

      clearTimer();
      timerRef.current = setTimeout(() => {
        setFeedback(null);
        setIsLocked(false);
        if (currentExerciseIndex + 1 < content.exercises.length) {
          setCurrentExerciseIndex((prev) => prev + 1);
        } else {
          const payload: SubmitAnswerPayload[] = content.exercises.map((item) => ({
            exerciseId: item.id,
            selectedOption: updatedAnswers[item.id] ?? -1,
          }));
          onSubmit(payload);
        }
        timerRef.current = null;
      }, isCorrect ? CORRECT_FEEDBACK_DELAY : WRONG_FEEDBACK_DELAY);
    },
    [answers, clearTimer, content.exercises, currentExerciseIndex, isLocked, onSubmit],
  );

  const handleMomentumScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const pageIndex = Math.round(offsetY / SCREEN_HEIGHT);
      const nextView: 'video' | 'exercises' = pageIndex >= 1 ? 'exercises' : 'video';
      if (nextView !== activeView) {
        setActiveView(nextView);
        if (nextView === 'exercises') {
          player?.pause();
        }
      }
    },
    [activeView, SCREEN_HEIGHT],
  );

  const togglePlayback = useCallback(() => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
  }, [isPlaying, player]);

  const handleVideoPress = useCallback(() => {
    setShowControls((prev) => !prev);
  }, []);

  const canGoNext = Boolean(lastSubmission) && submitStatus !== 'submitting';
  const currentExercise = content.exercises[currentExerciseIndex];
  const selectedOption = currentExercise ? answers[currentExercise.id] : undefined;
  const progress = duration > 0 ? currentTime / duration : 0;

  // Reset state when content changes
  useEffect(() => {
    setActiveView('video');
    setAnswers({});
    setCurrentExerciseIndex(0);
    setFeedback(null);
    setIsLocked(false);
    setCurrentTime(0);
    setDuration(0);
    clearTimer();
    scrollRef.current?.scrollTo({ y: 0, animated: false });
    if (player) {
      player.currentTime = 0;
      player.play();
    }
  }, [content.id, clearTimer, player]);

  // Auto play when returning to video view
  useEffect(() => {
    if (activeView === 'video' && player) {
      player.play();
    }
  }, [activeView, player]);

  // Fade in when content changes
  useEffect(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [content.id, fadeAnim]);

  // Clean up timer
  useEffect(() => clearTimer, [clearTimer]);

  // Auto-hide controls after 3 seconds
  useEffect(() => {
    if (!showControls || !isPlaying) return;
    const timeout = setTimeout(() => setShowControls(false), 3000);
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        snapToAlignment="start"
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        scrollEnabled={activeView === 'video'}
        onMomentumScrollEnd={handleMomentumScrollEnd}
      >
        {/* VIDEO VIEW */}
        <Pressable style={[styles.videoPage, { height: SCREEN_HEIGHT }]} onPress={handleVideoPress}>
          <VideoView
            player={player}
            style={styles.video}
            contentFit="cover"
            nativeControls={false}
          />

          {/* Top gradient overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent']}
            style={styles.topGradient}
            pointerEvents="none"
          />

          {/* Bottom gradient overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.bottomGradient}
            pointerEvents="box-none"
          >
            {/* Subtitles */}
            {(activeTranscript || activeTranslation) && (
              <View style={styles.subtitleContainer}>
                {activeTranscript && (
                  <View style={styles.subtitleBox}>
                    <Typography variant="subtitle" style={styles.subtitleEn}>
                      {activeTranscript.text}
                    </Typography>
                  </View>
                )}
                {activeTranslation && (
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

          {/* Top bar with info */}
          <View style={styles.topBar}>
            <View style={styles.levelBadge}>
              <Typography variant="caption" style={styles.levelText}>
                {content.analysis.cefrLevel}
              </Typography>
            </View>

            <View style={styles.topicBadges}>
              {content.analysis.topics.slice(0, 2).map((topic, idx) => (
                <View key={idx} style={styles.topicBadge}>
                  <Typography variant="caption" style={styles.topicText}>
                    {topic}
                  </Typography>
                </View>
              ))}
            </View>
          </View>

          {/* Center play/pause button (when controls visible) */}
          {showControls && (
            <TouchableOpacity style={styles.centerPlayButton} onPress={togglePlayback} activeOpacity={0.8}>
              <View style={styles.playButtonBlur}>
                <Ionicons name={isPlaying ? 'pause' : 'play'} size={48} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
          )}

          {/* Progress bar */}
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
            </View>
          </View>
        </Pressable>

        {/* EXERCISES VIEW */}
        <View style={[styles.exercisePage, { backgroundColor: theme.colors.background, height: SCREEN_HEIGHT }]}>
          <ScrollView
            style={styles.exerciseScroll}
            contentContainerStyle={styles.exerciseScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.exerciseHeader}>
              <Typography variant="title" style={styles.exerciseTitle}>
                Упражнения
              </Typography>
              <Typography variant="caption" style={styles.exerciseSubtitle}>
                Ответьте на вопросы по видео
              </Typography>
            </View>

            {/* Current Exercise */}
            {currentExercise ? (
              <View style={styles.exerciseContent}>
                {/* Progress indicator */}
                <View style={styles.progressIndicator}>
                  {content.exercises.map((_, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.progressDot,
                        {
                          backgroundColor:
                            idx < currentExerciseIndex
                              ? theme.colors.success ?? '#22C55E'
                              : idx === currentExerciseIndex
                              ? theme.colors.primary
                              : theme.colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>

                {/* Question */}
                <View style={[styles.questionCard, { backgroundColor: theme.colors.surface }]}>
                  <Typography variant="body" style={styles.questionNumber}>
                    Вопрос {currentExerciseIndex + 1} из {content.exercises.length}
                  </Typography>
                  <Typography variant="subtitle" style={styles.questionText}>
                    {currentExercise.question}
                  </Typography>
                  {currentExercise.type === 'vocabulary' && currentExercise.word && (
                    <View style={styles.wordBadge}>
                      <Typography variant="caption" style={styles.wordText}>
                        {currentExercise.word}
                      </Typography>
                    </View>
                  )}
                </View>

                {/* Options */}
                <View style={styles.optionsContainer}>
                  {currentExercise.options.map((option, index) => {
                    const isSelected = selectedOption === index;
                    const showFeedback = Boolean(feedback);
                    const isCorrectOption = feedback?.correctAnswer === index;
                    const isWrongSelection = showFeedback && isSelected && feedback?.type === 'incorrect';

                    let borderColor = theme.colors.border;
                    let backgroundColor = theme.colors.surface;
                    let icon: 'checkmark-circle' | 'close-circle' | null = null;

                    if (isCorrectOption) {
                      borderColor = theme.colors.success ?? '#22C55E';
                      backgroundColor = `${theme.colors.success ?? '#22C55E'}15`;
                      icon = 'checkmark-circle';
                    } else if (isWrongSelection) {
                      borderColor = theme.colors.danger ?? '#EF4444';
                      backgroundColor = `${theme.colors.danger ?? '#EF4444'}15`;
                      icon = 'close-circle';
                    } else if (isSelected) {
                      borderColor = theme.colors.primary;
                      backgroundColor = `${theme.colors.primary}10`;
                    }

                    return (
                      <TouchableOpacity
                        key={`${currentExercise.id}-${index}`}
                        style={[
                          styles.option,
                          {
                            borderColor,
                            backgroundColor,
                            opacity: isLocked && !isSelected && !isCorrectOption ? 0.5 : 1,
                          },
                        ]}
                        onPress={() => handleOptionSelect(index)}
                        disabled={isLocked}
                        activeOpacity={0.7}
                      >
                        <Typography variant="body" style={styles.optionText}>
                          {option}
                        </Typography>
                        {icon && (
                          <Ionicons
                            name={icon}
                            size={24}
                            color={isCorrectOption ? theme.colors.success ?? '#22C55E' : theme.colors.danger ?? '#EF4444'}
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Feedback message */}
                {feedback && (
                  <View
                    style={[
                      styles.feedbackCard,
                      {
                        backgroundColor:
                          feedback.type === 'correct'
                            ? `${theme.colors.success ?? '#22C55E'}15`
                            : `${theme.colors.danger ?? '#EF4444'}15`,
                        borderColor: feedback.type === 'correct' ? theme.colors.success ?? '#22C55E' : theme.colors.danger ?? '#EF4444',
                      },
                    ]}
                  >
                    <Ionicons
                      name={feedback.type === 'correct' ? 'checkmark-circle' : 'close-circle'}
                      size={28}
                      color={feedback.type === 'correct' ? theme.colors.success ?? '#22C55E' : theme.colors.danger ?? '#EF4444'}
                    />
                    <Typography variant="body" style={styles.feedbackText}>
                      {feedback.type === 'correct' ? 'Отлично! Правильный ответ!' : 'Неправильно, попробуйте ещё раз'}
                    </Typography>
                  </View>
                )}
              </View>
            ) : null}

            {/* Results after all exercises */}
            {lastSubmission && (
              <View style={styles.resultsContainer}>
                <View style={[styles.resultsCard, { backgroundColor: theme.colors.surface }]}>
                  <Ionicons
                    name={lastSubmission.completed ? 'trophy' : 'analytics'}
                    size={48}
                    color={lastSubmission.completed ? '#FFD700' : theme.colors.primary}
                  />
                  <Typography variant="title" style={styles.resultsTitle}>
                    {lastSubmission.completed ? 'Отличная работа!' : 'Хороший результат!'}
                  </Typography>
                  <Typography variant="body" style={styles.resultsScore}>
                    {lastSubmission.correct} из {lastSubmission.total} правильных ответов
                  </Typography>
                  <View style={styles.resultsProgress}>
                    <View style={styles.resultsProgressBar}>
                      <View
                        style={[
                          styles.resultsProgressFill,
                          {
                            width: `${(lastSubmission.correct / lastSubmission.total) * 100}%`,
                            backgroundColor: lastSubmission.completed ? theme.colors.success ?? '#22C55E' : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                  </View>
                </View>

                {canGoNext && onNextVideo ? (
                  <>
                    <Typography variant="caption" style={styles.autoAdvanceText}>
                      Загрузка следующего видео...
                    </Typography>
                    <PrimaryButton onPress={onNextVideo} style={styles.nextButton}>
                      <View style={styles.nextButtonContent}>
                        <Typography variant="subtitle" style={styles.nextButtonText}>
                          Пропустить ожидание
                        </Typography>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </View>
                    </PrimaryButton>
                  </>
                ) : null}
              </View>
            )}
          </ScrollView>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  videoPage: {
    width: SCREEN_WIDTH,
    backgroundColor: '#000000',
    position: 'relative',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
  },
  bottomGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 280,
    justifyContent: 'flex-end',
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  levelBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backdropFilter: 'blur(10px)',
  },
  levelText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  topicBadges: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    maxWidth: '60%',
  },
  topicBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  topicText: {
    color: '#FFFFFF',
    fontSize: 11,
  },
  subtitleContainer: {
    gap: 8,
    marginBottom: 16,
  },
  subtitleBox: {
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center',
    maxWidth: '90%',
  },
  subtitleBoxRu: {
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  subtitleEn: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleRu: {
    color: '#E5E5E5',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 20,
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
  centerPlayButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -48,
    marginLeft: -48,
  },
  playButtonBlur: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  progressBarContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  progressBar: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
  },
  exercisePage: {
    width: SCREEN_WIDTH,
  },
  exerciseScroll: {
    flex: 1,
  },
  exerciseScrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  exerciseHeader: {
    marginBottom: 24,
  },
  exerciseTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  exerciseSubtitle: {
    opacity: 0.6,
  },
  exerciseContent: {
    gap: 20,
  },
  progressIndicator: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  questionCard: {
    padding: 20,
    borderRadius: 16,
    gap: 12,
  },
  questionNumber: {
    opacity: 0.6,
    fontSize: 13,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  wordBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(100,100,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 4,
  },
  wordText: {
    color: '#6464FF',
    fontWeight: '600',
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionText: {
    fontSize: 16,
    flex: 1,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  feedbackText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  resultsContainer: {
    marginTop: 32,
    gap: 20,
  },
  resultsCard: {
    padding: 32,
    borderRadius: 20,
    alignItems: 'center',
    gap: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultsScore: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: 'center',
  },
  resultsProgress: {
    width: '100%',
    marginTop: 8,
  },
  resultsProgressBar: {
    width: '100%',
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  resultsProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  nextButton: {
    marginTop: 8,
  },
  nextButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  autoAdvanceText: {
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 16,
  },
});
