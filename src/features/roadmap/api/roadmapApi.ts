import { apiFetch } from '@shared/api/client';
import type { LessonProgressStatus } from '@shared/constants/lessonProgress';

import type { RoadmapResponse } from '../model/types';

export const roadmapApi = {
  async getRoadmap(userId?: string | null) {
    return apiFetch<RoadmapResponse>('roadmap', {
      headers: userId ? { 'x-user-id': userId } : undefined,
    });
  },

  async updateLessonProgress(userId: string, lessonId: string, status: LessonProgressStatus, stars?: number) {
    return apiFetch<RoadmapResponse>(`roadmap/lessons/${lessonId}/progress`, {
      method: 'PATCH',
      headers: { 'x-user-id': userId },
      body: { status, stars },
    });
  },
};
