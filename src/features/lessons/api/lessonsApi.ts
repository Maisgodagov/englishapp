import { apiFetch } from '@shared/api/client';

import type {
  CreateLessonPayload,
  LessonDetail,
  ListLessonsResponse,
} from '../model/types';

export interface ListLessonsParams {
  search?: string;
  limit?: number;
  cursor?: string | null;
}

export const lessonsApi = {
  list(params: ListLessonsParams = {}) {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.limit) searchParams.append('limit', String(params.limit));
    if (params.cursor) searchParams.append('cursor', params.cursor);
    const query = searchParams.toString();
    const endpoint = query ? `lessons?${query}` : 'lessons';
    return apiFetch<ListLessonsResponse>(endpoint);
  },
  get(id: string) {
    return apiFetch<LessonDetail>(`lessons/${id}`);
  },
  create(payload: CreateLessonPayload, roleHeader: string) {
    return apiFetch<LessonDetail>('lessons', {
      method: 'POST',
      body: payload,
      headers: {
        'x-user-role': roleHeader,
      },
    });
  },
  update(id: string, payload: CreateLessonPayload, roleHeader: string) {
    return apiFetch<LessonDetail>(`lessons/${id}`, {
      method: 'PUT',
      body: payload,
      headers: {
        'x-user-role': roleHeader,
      },
    });
  },
  remove(id: string, roleHeader: string) {
    return apiFetch<void>(`lessons/${id}`, {
      method: 'DELETE',
      headers: {
        'x-user-role': roleHeader,
      },
    });
  },
};
