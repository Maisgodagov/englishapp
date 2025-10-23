import { apiFetch } from '@shared/api/client';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
export type SpeechSpeed = 'slow' | 'normal' | 'fast';
export type GrammarComplexity = 'simple' | 'intermediate' | 'complex';
export type VocabularyComplexity = 'basic' | 'intermediate' | 'advanced';

export type Timestamp = [number, number];

export interface TranscriptChunk {
  text: string;
  timestamp: Timestamp;
}

export interface TranscriptionResult {
  fullText: string;
  text: string;
  chunks: TranscriptChunk[];
}

export type TranslationResult = TranscriptionResult;

export interface AnalysisResult {
  cefrLevel: CEFRLevel;
  speechSpeed: SpeechSpeed;
  grammarComplexity: GrammarComplexity;
  vocabularyComplexity: VocabularyComplexity;
  topics: string[];
}

export type ExerciseType = 'vocabulary' | 'topic' | 'statementCheck';

export interface BaseExercise {
  id: string;
  type: ExerciseType;
  question: string;
  options: string[];
  correctAnswer: number;
  word?: string;
}

export type Exercise = BaseExercise;

export interface VideoFeedItem {
  id: string;
  videoName: string;
  videoUrl: string;
  durationSeconds: number | null;
  analysis: AnalysisResult;
  status: 'NOT_STARTED' | 'WATCHED' | 'COMPLETED';
  audioLevel?: number; // Измеренный уровень громкости видео (0-1), если доступен
  createdAt: string;
}

export interface VideoFeedResponse {
  items: VideoFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface VideoContent {
  id: string;
  videoName: string;
  videoUrl: string;
  durationSeconds: number | null;
  transcription: TranscriptionResult;
  translation: TranslationResult;
  analysis: AnalysisResult;
  exercises: Exercise[];
  audioLevel?: number; // Измеренный уровень громкости видео (0-1), если доступен
  createdAt: string;
  updatedAt: string;
}

export interface SubmitAnswerPayload {
  exerciseId: string;
  selectedOption: number;
}

export interface SubmitProgressResponse {
  result: {
    total: number;
    correct: number;
    incorrect: Array<{ exerciseId: string; correctAnswer: number; selected?: number }>;
    completed: boolean;
  };
  nextContentId: string | null;
}

const baseHeaders = (userId: string) => ({
  'x-user-id': userId,
});

export const videoLearningApi = {
  getFeed(userId: string, limit?: number, cursor?: string | null) {
    const params = new URLSearchParams();
    if (limit !== undefined && limit > 0) {
      params.append('limit', limit.toString());
    }
    if (cursor) {
      params.append('cursor', cursor);
    }
    const query = params.toString();
    const url = query ? `video-learning/feed?${query}` : 'video-learning/feed';
    return apiFetch<VideoFeedResponse>(url, {
      headers: baseHeaders(userId),
    });
  },
  getContent(userId: string, contentId: string) {
    return apiFetch<VideoContent>(`video-learning/${contentId}`, {
      headers: baseHeaders(userId),
    });
  },
  submitProgress(userId: string, contentId: string, answers: SubmitAnswerPayload[]) {
    return apiFetch<SubmitProgressResponse>(`video-learning/${contentId}/progress`, {
      method: 'POST',
      headers: baseHeaders(userId),
      body: { answers },
    });
  },
};
