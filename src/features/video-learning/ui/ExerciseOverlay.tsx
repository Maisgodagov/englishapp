import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@shared/ui';
import type { Exercise, SubmitAnswerPayload } from '../api/videoLearningApi';
import { SCREEN_WIDTH, getContentHeight } from '@shared/utils/dimensions';
const WRONG_FEEDBACK_DELAY = 2000;
const CORRECT_FEEDBACK_DELAY = 800;

interface ExerciseOverlayProps {
  exercises: Exercise[];
  onSubmit: (answers: SubmitAnswerPayload[]) => void;
  submitStatus: 'idle' | 'submitting' | 'succeeded' | 'failed';
  lastSubmission?: { completed: boolean; correct: number; total: number };
}

const withAlpha = (color: string | undefined, alphaHex: string) => {
  if (!color) return undefined;
  if (color.startsWith('#') && color.length === 7) {
    return `${color}${alphaHex}`;
  }
  if (color.startsWith('#') && color.length === 9) {
    return color;
  }
  return undefined;
};

const pickOverlayColor = (
  color: string | undefined,
  alphaHex: string,
  fallbackDark: string,
  fallbackLight: string,
  isDark: boolean
) => {
  const withOpacity = withAlpha(color, alphaHex);
  if (withOpacity) {
    return withOpacity;
  }
  return isDark ? fallbackDark : fallbackLight;
};

export const ExerciseOverlay = ({
  exercises,
  onSubmit,
  submitStatus,
  lastSubmission
}: ExerciseOverlayProps) => {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const isDark = Boolean(theme?.dark);
  const primary = theme.colors.primary;
  const success = theme.colors.success ?? '#22C55E';
  const danger = theme.colors.danger ?? '#EF4444';
  const cardBackground = pickOverlayColor(
    theme.colors.surface,
    '24',
    'rgba(255,255,255,0.08)',
    'rgba(0,0,0,0.06)',
    isDark
  );
  const cardBorder = pickOverlayColor(
    theme.colors.border,
    '80',
    'rgba(255,255,255,0.18)',
    'rgba(0,0,0,0.12)',
    isDark
  );
  const optionBaseBackground = pickOverlayColor(
    theme.colors.surface,
    '1A',
    'rgba(255,255,255,0.05)',
    'rgba(0,0,0,0.04)',
    isDark
  );
  const optionBorder = pickOverlayColor(
    theme.colors.border,
    '6A',
    'rgba(255,255,255,0.12)',
    'rgba(0,0,0,0.08)',
    isDark
  );
  const optionSelectedBackground = pickOverlayColor(
    primary,
    '33',
    'rgba(255,255,255,0.14)',
    'rgba(0,0,0,0.08)',
    isDark
  );
  const optionBadgeBackground = pickOverlayColor(
    primary,
    '28',
    'rgba(255,255,255,0.12)',
    'rgba(0,0,0,0.08)',
    isDark
  );
  const optionCorrectBackground = pickOverlayColor(
    success,
    '26',
    'rgba(34,197,94,0.18)',
    'rgba(34,197,94,0.14)',
    isDark
  );
  const optionDangerBackground = pickOverlayColor(
    danger,
    '26',
    'rgba(239,68,68,0.18)',
    'rgba(239,68,68,0.14)',
    isDark
  );
  const progressBackdrop = pickOverlayColor(
    primary,
    '14',
    'rgba(255,255,255,0.05)',
    'rgba(0,0,0,0.04)',
    isDark
  );
  const feedbackSuccessBackground = pickOverlayColor(
    success,
    '26',
    'rgba(34,197,94,0.14)',
    'rgba(34,197,94,0.12)',
    isDark
  );
  const feedbackDangerBackground = pickOverlayColor(
    danger,
    '26',
    'rgba(239,68,68,0.14)',
    'rgba(239,68,68,0.12)',
    isDark
  );
  const resultsBackground = pickOverlayColor(
    theme.colors.surface,
    '20',
    'rgba(255,255,255,0.1)',
    'rgba(0,0,0,0.06)',
    isDark
  );
  const resultsBorder = pickOverlayColor(
    theme.colors.border,
    '7F',
    'rgba(255,255,255,0.18)',
    'rgba(0,0,0,0.12)',
    isDark
  );
  const inactiveProgressColor = pickOverlayColor(
    theme.colors.border,
    '70',
    'rgba(255,255,255,0.15)',
    'rgba(0,0,0,0.14)',
    isDark
  );
  const textPrimary = theme.colors.text ?? '#FFFFFF';

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; correctAnswer?: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Calculate content height excluding safe areas
  const SCREEN_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleOptionSelect = useCallback(
    (optionIndex: number) => {
      if (isLocked) return;
      const exercise = exercises[currentExerciseIndex];
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
        if (currentExerciseIndex + 1 < exercises.length) {
          setCurrentExerciseIndex((prev) => prev + 1);
        } else {
          const payload: SubmitAnswerPayload[] = exercises.map((item) => ({
            exerciseId: item.id,
            selectedOption: updatedAnswers[item.id] ?? -1,
          }));
          onSubmit(payload);
        }
        timerRef.current = null;
      }, isCorrect ? CORRECT_FEEDBACK_DELAY : WRONG_FEEDBACK_DELAY);
    },
    [answers, clearTimer, exercises, currentExerciseIndex, isLocked, onSubmit],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const currentExercise = exercises[currentExerciseIndex];
  const selectedOption = currentExercise ? answers[currentExercise.id] : undefined;
  const totalExercises = exercises.length;
  const localCorrectCount = useMemo(() => {
    if (!totalExercises) {
      return 0;
    }
    return exercises.reduce((acc, exercise) => {
      const selected = answers[exercise.id];
      return acc + (selected === exercise.correctAnswer ? 1 : 0);
    }, 0);
  }, [answers, exercises, totalExercises]);
  const resultTotal = totalExercises;
  const resultCorrect = localCorrectCount;
  const resultCompleted =
    lastSubmission?.completed ?? (resultTotal > 0 && resultCorrect === resultTotal);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, height: SCREEN_HEIGHT }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View
            style={[
              styles.modeBadge,
              {
                backgroundColor: progressBackdrop,
                borderColor: optionBorder,
              },
            ]}
          >
            <Ionicons name="flash-outline" size={18} color={primary} />
            <Typography variant="caption" style={[styles.modeBadgeText, { color: primary }]}>
              Практика
            </Typography>
          </View>
          <Typography variant="title" style={styles.title}>
            Упражнения
          </Typography>
          <Typography variant="caption" style={styles.subtitle}>
            Ответьте на вопросы по видео
          </Typography>
        </View>

        {/* Current Exercise */}
        {currentExercise && !lastSubmission ? (
          <View style={styles.content}>
            {/* Progress indicator */}
            <View style={styles.progressRow}>
              <View
                style={[
                  styles.progressIndicator,
                  {
                    backgroundColor: progressBackdrop,
                    borderColor: optionBorder,
                  },
                ]}
              >
                {exercises.map((_, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.progressSegment,
                      {
                        backgroundColor:
                          idx < currentExerciseIndex
                            ? success
                            : idx === currentExerciseIndex
                            ? primary
                            : inactiveProgressColor,
                        opacity: idx <= currentExerciseIndex ? 1 : 0.45,
                      },
                    ]}
                  />
                ))}
              </View>
              <Typography variant="caption" style={[styles.progressCounter, { color: primary }]}>
                {currentExerciseIndex + 1}/{exercises.length}
              </Typography>
            </View>

            {/* Question */}
            <View
              style={[
                styles.questionCard,
                {
                  backgroundColor: cardBackground,
                  borderColor: cardBorder,
                },
              ]}
            >
              <Typography variant="body" style={styles.questionNumber}>
                Вопрос {currentExerciseIndex + 1} из {exercises.length}
              </Typography>
              <Typography variant="subtitle" style={styles.questionText}>
                {currentExercise.question}
              </Typography>
              {currentExercise.type === 'vocabulary' && currentExercise.word && (
                <View
                  style={[
                    styles.wordBadge,
                    {
                      backgroundColor: optionBadgeBackground,
                      borderColor: optionBorder,
                    },
                  ]}
                >
                  <Typography variant="caption" style={[styles.wordText, { color: primary }]}>
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

                let borderColor = optionBorder;
                let backgroundColor = optionBaseBackground;
                let indicatorBackground = optionBadgeBackground;
                let indicatorBorder = optionBorder;
                let indicatorColor = primary;
                let icon: 'checkmark-circle' | 'close-circle' | null = null;
                let iconColor = primary;

                if (isCorrectOption) {
                  borderColor = success;
                  backgroundColor = feedbackSuccessBackground;
                  indicatorBackground = optionCorrectBackground;
                  indicatorBorder = success;
                  indicatorColor = success;
                  icon = 'checkmark-circle';
                  iconColor = success;
                } else if (isWrongSelection) {
                  borderColor = danger;
                  backgroundColor = feedbackDangerBackground;
                  indicatorBackground = optionDangerBackground;
                  indicatorBorder = danger;
                  indicatorColor = danger;
                  icon = 'close-circle';
                  iconColor = danger;
                } else if (isSelected) {
                  borderColor = primary;
                  backgroundColor = optionSelectedBackground;
                  indicatorBorder = primary;
                }

                return (
                  <TouchableOpacity
                    key={`${currentExercise.id}-${index}`}
                    style={[
                      styles.option,
                      {
                        borderColor,
                        backgroundColor,
                        opacity: isLocked && !isSelected && !isCorrectOption ? 0.55 : 1,
                      },
                    ]}
                    onPress={() => handleOptionSelect(index)}
                    disabled={isLocked}
                    activeOpacity={0.8}
                  >
                    <View
                      style={[
                        styles.optionBadge,
                        {
                          backgroundColor: indicatorBackground,
                          borderColor: indicatorBorder,
                        },
                      ]}
                    >
                      <Typography variant="caption" style={[styles.optionBadgeText, { color: indicatorColor }]}>
                        {String.fromCharCode(65 + index)}
                      </Typography>
                    </View>
                    <View style={styles.optionInner}>
                      <Typography variant="body" style={[styles.optionText, { color: textPrimary }]}>
                        {option}
                      </Typography>
                    </View>
                    {icon && (
                      <Ionicons
                        name={icon}
                        size={24}
                        color={iconColor}
                        style={styles.optionTrailingIcon}
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
                        ? feedbackSuccessBackground
                        : feedbackDangerBackground,
                    borderColor: feedback.type === 'correct' ? success : danger,
                  },
                ]}
              >
                <Ionicons
                  name={feedback.type === 'correct' ? 'checkmark-circle' : 'close-circle'}
                  size={28}
                  color={feedback.type === 'correct' ? success : danger}
                />
                <Typography variant="body" style={styles.feedbackText}>
                  {feedback.type === 'correct' ? 'Отлично! Правильный ответ!' : 'Неправильно, попробуйте ещё раз'}
                </Typography>
              </View>
            )}
          </View>
        ) : null}

        {/* Results */}
        {lastSubmission && (
          <View style={styles.resultsContainer}>
            <View
              style={[
                styles.resultsCard,
                {
                  backgroundColor: resultsBackground,
                  borderColor: resultsBorder,
                },
              ]}
            >
              <Ionicons
                name={resultCompleted ? 'trophy' : 'analytics'}
                size={48}
                color={resultCompleted ? '#FFD700' : theme.colors.primary}
              />
              <Typography variant="title" style={styles.resultsTitle}>
                {resultCompleted ? 'All exercises complete!' : 'Keep practicing!'}
              </Typography>
              <Typography variant="body" style={[styles.resultsScore, { color: textPrimary }]}>
                {resultCorrect} of {resultTotal} correct answers
              </Typography>
              <View style={styles.resultsProgress}>
                <View
                  style={[
                    styles.resultsProgressBar,
                    { backgroundColor: inactiveProgressColor },
                  ]}
                >
                  <View
                    style={[
                      styles.resultsProgressFill,
                      {
                        width: `${resultTotal > 0 ? (resultCorrect / resultTotal) * 100 : 0}%`,
                        backgroundColor: resultCompleted ? theme.colors.success ?? '#22C55E' : theme.colors.primary,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>

            <View
              style={[
                styles.swipeNextContainer,
                {
                  backgroundColor: progressBackdrop,
                  borderColor: optionBorder,
                },
              ]}
            >
              <Ionicons name="chevron-down" size={32} color={theme.colors.primary} />
              <Typography variant="subtitle" style={[styles.swipeNextText, { color: textPrimary }]}>
                Swipe down to return to the feed
              </Typography>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 48,
    paddingBottom: 48,
    paddingHorizontal: 20,
    gap: 32,
  },
  header: {
    gap: 12,
    marginBottom: 12,
  },
  modeBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    opacity: 0.65,
  },
  content: {
    gap: 24,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressIndicator: {
    flex: 1,
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    gap: 6,
    alignItems: 'center',
  },
  progressSegment: {
    flex: 1,
    height: 6,
    borderRadius: 999,
  },
  progressCounter: {
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  questionCard: {
    padding: 24,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
  },
  questionNumber: {
    opacity: 0.6,
    fontSize: 13,
  },
  questionText: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  wordBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 6,
  },
  wordText: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  optionsContainer: {
    gap: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 18,
    paddingHorizontal: 18,
    borderRadius: 18,
    borderWidth: 1,
  },
  optionInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  optionBadgeText: {
    fontWeight: '700',
    fontSize: 14,
  },
  optionText: {
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  optionTrailingIcon: {
    marginLeft: 8,
  },
  feedbackCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  feedbackText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  resultsContainer: {
    gap: 32,
  },
  resultsCard: {
    paddingVertical: 32,
    paddingHorizontal: 28,
    borderRadius: 24,
    alignItems: 'center',
    gap: 16,
    borderWidth: 1,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  resultsScore: {
    fontSize: 16,
    opacity: 0.75,
    textAlign: 'center',
  },
  resultsProgress: {
    width: '100%',
    marginTop: 8,
  },
  resultsProgressBar: {
    width: '100%',
    height: 10,
    borderRadius: 999,
    overflow: 'hidden',
  },
  resultsProgressFill: {
    height: '100%',
    borderRadius: 999,
  },
  swipeNextContainer: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  swipeNextText: {
    textAlign: 'center',
    fontWeight: '600',
    opacity: 0.85,
  },
});








