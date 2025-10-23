import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';
import { PrimaryButton } from '@shared/ui/button/PrimaryButton';
import type { Exercise, SubmitAnswerPayload } from '../api/videoLearningApi';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const SCREEN_WIDTH = Dimensions.get('window').width;
const WRONG_FEEDBACK_DELAY = 2000;
const CORRECT_FEEDBACK_DELAY = 800;

interface ExerciseOverlayProps {
  exercises: Exercise[];
  onSubmit: (answers: SubmitAnswerPayload[]) => void;
  submitStatus: 'idle' | 'submitting' | 'succeeded' | 'failed';
  lastSubmission?: { completed: boolean; correct: number; total: number };
}

export const ExerciseOverlay = ({
  exercises,
  onSubmit,
  submitStatus,
  lastSubmission
}: ExerciseOverlayProps) => {
  const theme = useTheme() as any;
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'incorrect'; correctAnswer?: number } | null>(null);
  const [isLocked, setIsLocked] = useState(false);

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

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
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
            <View style={styles.progressIndicator}>
              {exercises.map((_, idx) => (
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
                Вопрос {currentExerciseIndex + 1} из {exercises.length}
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

        {/* Results */}
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

            <View style={styles.swipeNextContainer}>
              <Ionicons name="chevron-down" size={32} color={theme.colors.primary} />
              <Typography variant="subtitle" style={styles.swipeNextText}>
                Свайпните вниз к следующему видео
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
    height: SCREEN_HEIGHT,
    width: SCREEN_WIDTH,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
  },
  subtitle: {
    opacity: 0.6,
  },
  content: {
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
    gap: 32,
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
  swipeNextContainer: {
    alignItems: 'center',
    gap: 8,
  },
  swipeNextText: {
    textAlign: 'center',
    fontWeight: '600',
  },
});
