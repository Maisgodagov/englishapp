import { apiFetch } from '@shared/api/client';

export type ExerciseDirection = 'en-ru' | 'ru-en';

export type ExerciseProgress = {
  status: 'new' | 'learning' | 'known' | 'ignored';
  touchesTotal: number;
  touchesCorrect: number;
  streak: number;
  addedToVocab: boolean;
};

export type Exercise = {
  wordId: number;
  word: string;
  partOfSpeech: string | null;
  direction: ExerciseDirection;
  prompt: string;
  correctAnswer: string;
  options: string[]; // always 3 items, shuffled
  translations: string[];
  progress: ExerciseProgress;
};

type GetExercisesRequest = {
  wordIds: number[];
  wordLimit?: number;
  exerciseLimit?: number;
  videoId?: number;
};

type GetExercisesResponse = {
  exercises: Exercise[];
};

type SubmitAnswerRequest = {
  wordId: number;
  isCorrect: boolean;
};

type SubmitAnswerResponse = {
  progress: ExerciseProgress;
};

type MarkKnownRequest = {
  wordId: number;
};

type MarkKnownResponse = {
  progress: ExerciseProgress;
};

type AddToVocabRequest = {
  wordId: number;
  note?: string;
};

type AddToVocabResponse = {
  progress: ExerciseProgress;
};

const buildHeaders = (userId: string) => ({
  'x-user-id': userId,
});

export const exercisesApi = {
  getExercises(userId: string, payload: GetExercisesRequest) {
    return apiFetch<GetExercisesResponse>('exercises/for-content', {
      method: 'POST',
      headers: buildHeaders(userId),
      body: payload,
    });
  },

  submitAnswer(userId: string, payload: SubmitAnswerRequest) {
    return apiFetch<SubmitAnswerResponse>('exercises/answer', {
      method: 'POST',
      headers: buildHeaders(userId),
      body: payload,
    });
  },

  markKnown(userId: string, payload: MarkKnownRequest) {
    return apiFetch<MarkKnownResponse>('exercises/mark-known', {
      method: 'POST',
      headers: buildHeaders(userId),
      body: payload,
    });
  },

  addToVocab(userId: string, payload: AddToVocabRequest) {
    return apiFetch<AddToVocabResponse>('exercises/add-to-vocab', {
      method: 'POST',
      headers: buildHeaders(userId),
      body: payload,
    });
  },
};
