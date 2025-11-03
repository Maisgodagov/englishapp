import type { DifficultyLevel, SpeechSpeed } from './videoSettingsSlice';

export interface FilterSettings {
  difficultyLevel: DifficultyLevel;
  speechSpeed: SpeechSpeed;
}

export interface RelaxedFilters extends FilterSettings {
  message: string;
  wasRelaxed: boolean;
}

const DIFFICULTY_LABELS: Record<DifficultyLevel, string> = {
  all: 'все уровни',
  easy: 'легкий уровень (A1)',
  medium: 'средний уровень (A2-B1)',
  hard: 'сложный уровень (B2-C1)',
};

const SPEECH_SPEED_LABELS: Record<SpeechSpeed, string> = {
  all: 'любую скорость',
  slow: 'медленную речь',
  normal: 'среднюю скорость речи',
  fast: 'быструю речь',
};

/**
 * Relaxes filters when no videos are available.
 * Priority: speech speed first, then difficulty level.
 *
 * Strategy:
 * 1. Relax speech speed: slow → normal → fast → all
 * 2. If still no results, relax difficulty: easy → medium → hard → all
 * 3. If still no results, relax both to "all"
 */
export function relaxFilters(
  currentFilters: FilterSettings,
  attemptNumber: number = 0
): RelaxedFilters | null {
  const { difficultyLevel, speechSpeed } = currentFilters;

  // Step 1: Try to relax speech speed first
  if (speechSpeed === 'slow') {
    return {
      difficultyLevel,
      speechSpeed: 'normal',
      message: `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS.normal}`,
      wasRelaxed: true,
    };
  }

  if (speechSpeed === 'normal' && attemptNumber === 0) {
    return {
      difficultyLevel,
      speechSpeed: 'fast',
      message: `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS.fast}`,
      wasRelaxed: true,
    };
  }

  if (speechSpeed === 'fast' && attemptNumber === 0) {
    return {
      difficultyLevel,
      speechSpeed: 'all',
      message: `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS.all}`,
      wasRelaxed: true,
    };
  }

  // If speech speed is already at "all" or we've tried fast, try relaxing difficulty
  if (difficultyLevel === 'easy') {
    return {
      difficultyLevel: 'medium',
      speechSpeed: attemptNumber > 0 ? 'all' : speechSpeed,
      message: attemptNumber > 0
        ? `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS.medium}, ${SPEECH_SPEED_LABELS.all}`
        : `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS.medium}, ${SPEECH_SPEED_LABELS[speechSpeed]}`,
      wasRelaxed: true,
    };
  }

  if (difficultyLevel === 'medium') {
    return {
      difficultyLevel: 'hard',
      speechSpeed: attemptNumber > 0 ? 'all' : speechSpeed,
      message: attemptNumber > 0
        ? `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS.hard}, ${SPEECH_SPEED_LABELS.all}`
        : `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS.hard}, ${SPEECH_SPEED_LABELS[speechSpeed]}`,
      wasRelaxed: true,
    };
  }

  if (difficultyLevel === 'hard') {
    return {
      difficultyLevel: 'all',
      speechSpeed: attemptNumber > 0 ? 'all' : speechSpeed,
      message: attemptNumber > 0
        ? `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS.all}, ${SPEECH_SPEED_LABELS.all}`
        : `Видео с настройками "${DIFFICULTY_LABELS[difficultyLevel]}, ${SPEECH_SPEED_LABELS[speechSpeed]}" закончились. Показываем: ${DIFFICULTY_LABELS.all}, ${SPEECH_SPEED_LABELS[speechSpeed]}`,
      wasRelaxed: true,
    };
  }

  // If both are already "all", we can't relax further
  if (difficultyLevel === 'all' && speechSpeed === 'all') {
    return null;
  }

  // Final fallback - set both to "all"
  return {
    difficultyLevel: 'all',
    speechSpeed: 'all',
    message: `Видео с вашими настройками закончились. Показываем видео всех уровней и скоростей`,
    wasRelaxed: true,
  };
}
