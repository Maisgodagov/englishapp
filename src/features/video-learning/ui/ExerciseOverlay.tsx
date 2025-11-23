import { memo, useCallback, useEffect, useRef, useState, useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "styled-components/native";
import { Check, X as XIcon, Trophy, BarChart3, ChevronDown, Volume2, BookmarkPlus, X, Play, Plus } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Typography } from "@shared/ui";
import type { SubmitAnswerPayload } from "../api/videoLearningApi";
import type { UiExerciseWithMeta } from "../../exercises/lib/exerciseAdapter";
import { SCREEN_WIDTH, getContentHeight } from "@shared/utils/dimensions";
const WRONG_FEEDBACK_DELAY = 2000;
const CORRECT_FEEDBACK_DELAY = 800;
interface ExerciseOverlayProps {
  exercises: UiExerciseWithMeta[];
  onSubmit: (answers: SubmitAnswerPayload[]) => void;
  submitStatus: "idle" | "submitting" | "succeeded" | "failed";
  lastSubmission?: { completed: boolean; correct: number; total: number };
  height?: number;
  onMarkKnown?: (wordId: number) => void;
  onAddToVocab?: (wordId: number) => void;
  onPlayWord?: (timestamp: [number, number]) => void;
  onClose?: () => void;
}

const withAlpha = (color: string | undefined, alphaHex: string) => {
  if (!color) return undefined;
  if (color.startsWith("#") && color.length === 7) {
    return `${color}${alphaHex}`;
  }
  if (color.startsWith("#") && color.length === 9) {
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

const ExerciseOverlayComponent = ({
  exercises,
  onSubmit,
  submitStatus,
  lastSubmission,
  height,
  onMarkKnown,
  onAddToVocab,
  onPlayWord,
  onClose,
}: ExerciseOverlayProps) => {
  const theme = useTheme() as any;
  const insets = useSafeAreaInsets();
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize all theme colors to avoid recalculation on every render
  const themeColors = useMemo(() => {
    const isDark = theme?.dark ?? (theme?.colors?.background ?? "").toLowerCase?.() === "#0f172a";
    const primary = theme.colors.primary;
    const success = theme.colors.success ?? "#22C55E";
    const danger = theme.colors.danger ?? "#EF4444";
    const textPrimary = theme.colors.text ?? "#FFFFFF";

    return {
      isDark,
      primary,
      success,
      danger,
      cardBackground: "transparent",
      cardBorder: "transparent",
      optionBaseBackground: pickOverlayColor(theme.colors.text, "14", "rgba(255,255,255,0.14)", "rgba(0,0,0,0.08)", isDark),
      optionBorder: "transparent",
      optionSelectedBackground: pickOverlayColor(primary, "32", "rgba(255,255,255,0.32)", "rgba(0,0,0,0.18)", isDark),
      optionBadgeBackground: pickOverlayColor(primary, "28", "rgba(255,255,255,0.12)", "rgba(0,0,0,0.08)", isDark),
      optionCorrectBackground: pickOverlayColor(success, "32", "rgba(34,197,94,0.32)", "rgba(34,197,94,0.18)", isDark),
      optionDangerBackground: pickOverlayColor(danger, "32", "rgba(239,68,68,0.32)", "rgba(239,68,68,0.18)", isDark),
      progressBackdrop: pickOverlayColor(primary, "14", "rgba(255,255,255,0.05)", "rgba(0,0,0,0.04)", isDark),
      feedbackSuccessBackground: pickOverlayColor(success, "32", "rgba(34,197,94,0.32)", "rgba(34,197,94,0.18)", isDark),
      feedbackDangerBackground: pickOverlayColor(danger, "32", "rgba(239,68,68,0.32)", "rgba(239,68,68,0.18)", isDark),
      resultsBackground: pickOverlayColor(theme.colors.text, "22", "rgba(255,255,255,0.22)", "rgba(0,0,0,0.08)", isDark),
      resultsBorder: "transparent",
      inactiveProgressColor: pickOverlayColor(theme.colors.border, "70", "rgba(255,255,255,0.15)", "rgba(0,0,0,0.14)", isDark),
      textPrimary,
      surface: theme.colors.surface ?? (isDark ? "#0A0D16" : "#FFFFFF"),
    };
  }, [theme]);

  // Memoize text style objects to prevent recreation
  const textStyles = useMemo(() => ({
    optionText: [styles.optionText, { color: themeColors.textPrimary }],
    resultsScore: [styles.resultsScore, { color: themeColors.textPrimary }],
    swipeNextText: [styles.swipeNextText, { color: themeColors.textPrimary }],
  }), [themeColors]);

  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [feedback, setFeedback] = useState<{
    type: "correct" | "incorrect";
    correctAnswer?: number;
  } | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Calculate content height excluding safe areas
  const containerHeight = useMemo(
    () => height ?? getContentHeight(insets.top, insets.bottom),
    [height, insets.top, insets.bottom]
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
      // Use functional update to avoid dependency on answers
      setAnswers((prevAnswers) => {
        const updatedAnswers = { ...prevAnswers, [exercise.id]: optionIndex };

        // Schedule submission in the timeout
        clearTimer();
        timerRef.current = setTimeout(
          () => {
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
          },
          isCorrect ? CORRECT_FEEDBACK_DELAY : WRONG_FEEDBACK_DELAY
        );

        return updatedAnswers;
      });

      setIsLocked(true);
      setFeedback({
        type: isCorrect ? "correct" : "incorrect",
        correctAnswer: exercise.correctAnswer,
      });
    },
    [clearTimer, exercises, currentExerciseIndex, onSubmit, isLocked]
  );

  const handleMarkKnownPress = useCallback(() => {
    const exercise = exercises[currentExerciseIndex];
    if (!exercise?.wordId) return;
    onMarkKnown?.(exercise.wordId);
    // Skip to next exercise
    if (currentExerciseIndex + 1 < exercises.length) {
      setCurrentExerciseIndex((prev) => prev + 1);
    } else {
      // Use functional state to avoid dependency on answers
      setAnswers((currentAnswers) => {
        const payload: SubmitAnswerPayload[] = exercises.map((item) => ({
          exerciseId: item.id,
          selectedOption: currentAnswers[item.id] ?? -1,
        }));
        onSubmit(payload);
        return currentAnswers;
      });
    }
  }, [currentExerciseIndex, exercises, onMarkKnown, onSubmit]);

  const handleAddToVocabPress = useCallback(() => {
    const exercise = exercises[currentExerciseIndex];
    if (!exercise?.wordId) return;
    onAddToVocab?.(exercise.wordId);
  }, [currentExerciseIndex, exercises, onAddToVocab]);

  const handlePlayWordPress = useCallback(() => {
    const exercise = exercises[currentExerciseIndex];
    if (!exercise?.timestamp || !onPlayWord) return;
    onPlayWord(exercise.timestamp);
  }, [currentExerciseIndex, exercises, onPlayWord]);

  useEffect(() => clearTimer, [clearTimer]);

  // Auto-close when all exercises are completed
  useEffect(() => {
    if (lastSubmission?.completed && onClose) {
      closeTimerRef.current = setTimeout(() => {
        onClose();
      }, 1000);
    }
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    };
  }, [lastSubmission?.completed, onClose]);

  // Memoize current exercise to prevent recalculation
  const currentExercise = useMemo(
    () => exercises[currentExerciseIndex],
    [exercises, currentExerciseIndex]
  );
  const selectedOption = currentExercise
    ? answers[currentExercise.id]
    : undefined;

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
    lastSubmission?.completed ??
    (resultTotal > 0 && resultCorrect === resultTotal);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: "#FFFFFF",
          height: containerHeight,
        },
      ]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Exercise */}
        {currentExercise && !lastSubmission ? (
          <View style={styles.content}>
        {/* Question */}
        <View
          style={[
            styles.questionCard,
            {
              backgroundColor: themeColors.cardBackground,
              borderColor: themeColors.cardBorder,
            },
          ]}
        >
          {/* Skip button hidden for now */}
          {false && currentExercise.type === "vocabulary" && currentExercise.wordId && !isLocked && (
            <TouchableOpacity
                  style={styles.skipButton}
                  onPress={handleMarkKnownPress}
                  activeOpacity={0.7}
                >
                  <X size={20} color={themeColors.textPrimary} />
                </TouchableOpacity>
              )}

          <Typography
            variant="caption"
            style={[styles.questionHint, { color: "#000000" }]}
            adjustsFontSizeToFit
            numberOfLines={2}
          >
            {currentExercise.question}
          </Typography>

          {currentExercise.type === "vocabulary" &&
            ((currentExercise.timestamp && onPlayWord) || currentExercise.wordId) ? (
            <View style={styles.wordActionsRow}>
              {currentExercise.timestamp && onPlayWord && (
                <TouchableOpacity
                  style={[
                    styles.wordActionButton,
                    {
                      backgroundColor: withAlpha(themeColors.primary, '15'),
                    },
                  ]}
                  onPress={handlePlayWordPress}
                  activeOpacity={0.7}
                >
                  <Play size={18} color={themeColors.primary} fill={themeColors.primary} />
                  <Typography
                    variant="caption"
                    style={[styles.wordActionText, { color: themeColors.primary }]}
                  >
                    слушать
                  </Typography>
                </TouchableOpacity>
              )}

              {currentExercise.wordId && (
                <TouchableOpacity
                  style={[
                    styles.wordActionButton,
                    {
                      backgroundColor: withAlpha(themeColors.primary, '15'),
                    },
                  ]}
                  onPress={handleAddToVocabPress}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color={themeColors.primary} strokeWidth={2.5} />
                  <Typography
                    variant="caption"
                    style={[styles.wordActionText, { color: themeColors.primary }]}
                  >
                    добавить
                  </Typography>
                </TouchableOpacity>
              )}
            </View>
          ) : null}
        </View>

        {/* Options */}
            <View style={styles.optionsContainer}>
              {currentExercise.options.map((option, index) => {
                const isSelected = selectedOption === index;
                const showFeedback = !!feedback;
                const isCorrectOption = feedback?.correctAnswer === index;
                const isWrongSelection =
                  showFeedback && isSelected && feedback?.type === "incorrect";

                let borderColor = themeColors.optionBorder;
                let backgroundColor = themeColors.optionBaseBackground;
                let indicatorBackground = themeColors.optionBadgeBackground;
                let indicatorBorder = themeColors.optionBorder;
                let indicatorColor = themeColors.primary;
                let icon: "check" | "x" | null = null;
                let iconColor = themeColors.primary;

                if (isCorrectOption) {
                  borderColor = themeColors.success;
                  backgroundColor = themeColors.feedbackSuccessBackground;
                  indicatorBackground = themeColors.optionCorrectBackground;
                  indicatorBorder = themeColors.success;
                  indicatorColor = themeColors.success;
                  icon = "check";
                  iconColor = themeColors.success;
                } else if (isWrongSelection) {
                  borderColor = themeColors.danger;
                  backgroundColor = themeColors.feedbackDangerBackground;
                  indicatorBackground = themeColors.optionDangerBackground;
                  indicatorBorder = themeColors.danger;
                  indicatorColor = themeColors.danger;
                  icon = "x";
                  iconColor = themeColors.danger;
                } else if (isSelected) {
                  borderColor = themeColors.primary;
                  backgroundColor = themeColors.optionSelectedBackground;
                  indicatorBorder = themeColors.primary;
                }

                return (
                  <TouchableOpacity
                    key={`${currentExercise.id}-${index}`}
                    style={[
                      styles.option,
                      {
                        borderColor,
                        backgroundColor,
                        opacity:
                          isLocked && !isSelected && !isCorrectOption
                            ? 0.55
                            : 1,
                      },
                    ]}
                    onPress={() => handleOptionSelect(index)}
                    disabled={isLocked}
                    activeOpacity={0.8}
                  >
                    <Typography
                      variant="body"
                      style={[textStyles.optionText, { flex: 1 }]}
                    >
                      {option}
                    </Typography>
                    {icon && (
                      icon === "check" ? (
                        <Check
                          size={22}
                          color={iconColor}
                          style={styles.optionTrailingIcon}
                          strokeWidth={2.6}
                        />
                      ) : (
                        <XIcon
                          size={22}
                          color={iconColor}
                          style={styles.optionTrailingIcon}
                          strokeWidth={2.6}
                        />
                      )
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

          </View>
        ) : null}

        {/* Results */}
        {lastSubmission && (
          <View style={styles.resultsContainer}>
            <View
              style={[
                styles.resultsCard,
                {
                  backgroundColor: "transparent",
                  borderColor: "transparent",
                },
              ]}
            >
              <Check
                size={64}
                color={themeColors.success}
                strokeWidth={3}
              />
              <Typography variant="title" style={[styles.resultsTitle, { color: themeColors.textPrimary, marginTop: 16 }]}>
                Все слова пройдены
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
    paddingHorizontal: 2,
    paddingTop: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 14,
    paddingHorizontal: 6,
    gap: 14,
  },
  header: {
    gap: 4,
    marginBottom: 4,
  },
  modeBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  modeBadgeText: {
    fontWeight: "600",
    letterSpacing: 0.3,
    fontSize: 11,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  subtitle: {
    opacity: 0.65,
    fontSize: 12,
  },
  content: {
    gap: 14,
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  progressIndicator: {
    flex: 1,
    flexDirection: "row",
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 5,
    gap: 3,
    alignItems: "center",
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 999,
  },
  progressCounter: {
    fontWeight: "600",
    letterSpacing: 0.3,
    fontSize: 12,
  },
  questionCard: {
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderWidth: 0,
    alignItems: "center",
    position: "relative",
  },
  questionHint: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "900",
    opacity: 1,
    textAlign: "center",
    marginBottom: 8,
  },
  questionNumber: {
    opacity: 0.6,
    fontSize: 12,
  },
  questionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  questionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 14,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 0,
  },
  optionInner: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  optionBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  optionBadgeText: {
    fontWeight: "700",
    fontSize: 13,
  },
  optionText: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: "700",
    flexShrink: 1,
  },
  optionTrailingIcon: {
    marginLeft: 6,
  },
  resultsContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsCard: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderWidth: 1,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  resultsScore: {
    fontSize: 16,
    opacity: 0.75,
    textAlign: "center",
  },
  resultsProgress: {
    width: "100%",
    marginTop: 8,
  },
  resultsProgressBar: {
    width: "100%",
    height: 10,
    borderRadius: 999,
    overflow: "hidden",
  },
  resultsProgressFill: {
    height: "100%",
    borderRadius: 999,
  },
  swipeNextContainer: {
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  swipeNextText: {
    textAlign: "center",
    fontWeight: "600",
    opacity: 0.85,
    fontSize: 15,
  },
  wordActionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 6,
    paddingHorizontal: 4,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  wordActionIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  skipButton: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.7,
  },
  skipButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  wordActionIcon: {
    marginRight: 6,
  },
  wordActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 0,
  },
  wordActionText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export const ExerciseOverlay = memo(ExerciseOverlayComponent);
