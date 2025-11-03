import { apiFetch } from '@shared/api/client';
import type { UserRole } from '@shared/constants/roles';

import type {
  TranscriptChunk,
  Exercise,
  VideoContent,
} from './videoLearningApi';

const adminHeaders = (userId: string, role: UserRole) => ({
  'x-user-id': userId,
  'x-user-role': role,
});

export const videoModerationApi = {
  updateCefrLevel(contentId: string, cefrLevel: string, userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/cefr-level`, {
      method: 'PATCH',
      body: { cefrLevel },
      headers: adminHeaders(userId, role),
    });
  },
  updateSpeechSpeed(contentId: string, speechSpeed: string, userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/speech-speed`, {
      method: 'PATCH',
      body: { speechSpeed },
      headers: adminHeaders(userId, role),
    });
  },
  updateGrammarComplexity(contentId: string, grammarComplexity: string, userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/grammar`, {
      method: 'PATCH',
      body: { grammarComplexity },
      headers: adminHeaders(userId, role),
    });
  },
  updateVocabularyComplexity(
    contentId: string,
    vocabularyComplexity: string,
    userId: string,
    role: UserRole,
  ) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/vocabulary`, {
      method: 'PATCH',
      body: { vocabularyComplexity },
      headers: adminHeaders(userId, role),
    });
  },
  updateTopics(contentId: string, topics: string[], userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/topics`, {
      method: 'PATCH',
      body: { topics },
      headers: adminHeaders(userId, role),
    });
  },
  updateTranscriptChunks(contentId: string, chunks: TranscriptChunk[], userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/transcript`, {
      method: 'PATCH',
      body: { chunks },
      headers: adminHeaders(userId, role),
    });
  },
  updateTranslationChunks(contentId: string, chunks: TranscriptChunk[], userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/translation`, {
      method: 'PATCH',
      body: { chunks },
      headers: adminHeaders(userId, role),
    });
  },
  updateExercises(contentId: string, exercises: Exercise[], userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/exercises`, {
      method: 'PATCH',
      body: { exercises },
      headers: adminHeaders(userId, role),
    });
  },
  updateAdultContentFlag(contentId: string, isAdultContent: boolean, userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/adult`, {
      method: 'PATCH',
      body: { isAdultContent },
      headers: adminHeaders(userId, role),
    });
  },
  updateModerationStatus(contentId: string, isModerated: boolean, userId: string, role: UserRole) {
    return apiFetch<VideoContent>(`video-learning/${contentId}/moderation/status`, {
      method: 'PATCH',
      body: { isModerated },
      headers: adminHeaders(userId, role),
    });
  },
  deleteVideo(contentId: string, userId: string, role: UserRole) {
    return apiFetch<void>(`video-learning/${contentId}`, {
      method: 'DELETE',
      headers: adminHeaders(userId, role),
    });
  },
};
