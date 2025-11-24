import type { Exercise as DynamicExercise } from '../api/exercisesApi';
import type { Exercise as UiExercise, TranscriptWordChunk, Timestamp } from '../../video-learning/api/videoLearningApi';

export type UiExerciseWithMeta = UiExercise & {
  wordId: number;
  timestamp?: Timestamp; // First occurrence of the word in video
};

// Regex for removing punctuation - compiled once
const PUNCTUATION_REGEX = /[.,!?;:'"]/g;

const findWordTimestamp = (word: string, wordChunks: TranscriptWordChunk[]): Timestamp | undefined => {
  // Handle multi-word entries (e.g., "one of a kind", "stop talking")
  const words = word.toLowerCase().trim().split(' ');
  const firstWord = words[0];
  const isSingleWord = words.length === 1;

  for (const chunk of wordChunks) {
    // Normalize once per chunk
    const normalizedText = chunk.text.toLowerCase().trim().replace(PUNCTUATION_REGEX, '');

    // Check if normalized text matches or starts with first word
    if (normalizedText === firstWord || normalizedText.startsWith(firstWord)) {
      return chunk.timestamp;
    }
  }

  return undefined;
};

export const adaptExercisesToUi = (
  items: DynamicExercise[],
  wordChunks?: TranscriptWordChunk[]
): UiExerciseWithMeta[] => {
  return items.map((item, index) => {
    // Find correct answer index - use direct lookup instead of findIndex
    let correctIndex = -1;
    for (let i = 0; i < item.options.length; i++) {
      if (item.options[i] === item.correctAnswer) {
        correctIndex = i;
        break;
      }
    }
    const fallbackIndex = correctIndex >= 0 ? correctIndex : 0;

    // Find timestamp only for en-ru exercises (English word in prompt)
    const timestamp = item.direction === 'en-ru' && wordChunks
      ? findWordTimestamp(item.word, wordChunks)
      : undefined;

    return {
      id: `dyn-${item.wordId}-${item.direction}-${index}`,
      type: 'vocabulary' as const,
      question: item.prompt,
      options: item.options,
      correctAnswer: fallbackIndex,
      word: undefined, // Don't show word badge - it duplicates the question
      wordId: item.wordId,
      timestamp,
    };
  });
};
