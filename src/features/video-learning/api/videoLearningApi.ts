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

export interface TranscriptWordChunk {
  text: string;
  timestamp: Timestamp;
}

export interface TranscriptionResult {
  fullText: string;
  text: string;
  chunks: TranscriptChunk[];
  wordChunks: TranscriptWordChunk[];
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
  likesCount: number;
  isLiked: boolean;
  audioLevel?: number; // 0-1 normalization coefficient
  createdAt: string;
  isAdultContent?: boolean;
  isModerated?: boolean;
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
  likesCount: number;
  isLiked: boolean;
  audioLevel?: number; // 0-1 normalization coefficient
  createdAt: string;
  updatedAt: string;
  isAdultContent?: boolean;
  isModerated?: boolean;
}

export interface PhraseSnippet {
  id: string;
  contentId: string;
  videoName: string;
  videoUrl: string;
  startSeconds: number;
  endSeconds: number;
  matchedText: string;
  contextText: string;
  phrase: string;
  durationSeconds: number | null;
  audioLevel?: number;
}

export interface PhraseSearchResponse {
  phrase: string;
  returned: number;
  items: PhraseSnippet[];
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

export interface UpdateLikeResponse {
  likesCount: number;
  isLiked: boolean;
}

interface FeedOptions {
  limit?: number;
  cursor?: string | null;
  cefrLevels?: string;
  speechSpeeds?: string;
  showAdultContent?: boolean;
  moderationFilter?: 'all' | 'moderated' | 'unmoderated';
  userRole?: string | null;
}

const buildHeaders = (userId: string, userRole?: string | null) => {
  const headers: Record<string, string> = {
    'x-user-id': userId,
  };
  if (userRole && userRole.trim().length > 0) {
    headers['x-user-role'] = userRole;
  }
  return headers;
};

export const videoLearningApi = {
  getFeed(userId: string, options: FeedOptions = {}) {
    const params = new URLSearchParams();
    if (options.limit !== undefined && options.limit > 0) {
      params.append('limit', options.limit.toString());
    }
    if (options.cursor) {
      params.append('cursor', options.cursor);
    }
    if (options.cefrLevels) {
      params.append('cefrLevels', options.cefrLevels);
    }
    if (options.speechSpeeds) {
      params.append('speechSpeeds', options.speechSpeeds);
    }
    if (options.showAdultContent !== undefined) {
      params.append('showAdultContent', options.showAdultContent ? 'true' : 'false');
    }
    if (options.moderationFilter) {
      params.append('moderationFilter', options.moderationFilter);
    }
    const query = params.toString();
    const url = query ? `video-learning/feed?${query}` : 'video-learning/feed';
    return apiFetch<VideoFeedResponse>(url, {
      headers: buildHeaders(userId, options.userRole),
    });
  },
  getContent(userId: string, contentId: string, userRole?: string | null) {
    return apiFetch<VideoContent>(`video-learning/${contentId}`, {
      headers: buildHeaders(userId, userRole),
    });
  },
  searchPhrase(phrase: string, limit?: number, userId?: string | null) {
    const params = new URLSearchParams();
    params.append('phrase', phrase);
    if (limit && limit > 0) {
      params.append('limit', limit.toString());
    }
    return apiFetch<PhraseSearchResponse>(`video-learning/search?${params.toString()}`, {
      headers: userId ? buildHeaders(userId) : undefined,
    });
  },
  submitProgress(userId: string, contentId: string, answers: SubmitAnswerPayload[]) {
    return apiFetch<SubmitProgressResponse>(`video-learning/${contentId}/progress`, {
      method: 'POST',
      headers: buildHeaders(userId),
      body: { answers },
    });
  },
  updateLike(userId: string, contentId: string, like: boolean) {
    return apiFetch<UpdateLikeResponse>(`video-learning/${contentId}/like`, {
      method: 'POST',
      headers: buildHeaders(userId),
      body: { like },
    });
  },
};



