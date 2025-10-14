import { apiFetch } from '@shared/api/client';

import type { LessonSummary } from '@features/lessons/model/types';

export interface AdminCourseModule {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessonCount: number;
}

export interface AdminCourse {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  price: string;
  difficultyLevels: string[];
  isPublished: boolean;
  modules: AdminCourseModule[];
  updatedAt: string;
}

export interface AdminModuleCourseRef {
  id: string;
  title: string;
  order: number;
}

export interface AdminModuleLesson {
  id: string;
  title: string;
  order: number;
  xpReward: number;
}

export interface AdminModule {
  id: string;
  title: string;
  description?: string;
  imageUrl?: string;
  lessons: AdminModuleLesson[];
  courses: AdminModuleCourseRef[];
  updatedAt: string;
}

export interface AdminCatalogResponse {
  courses: AdminCourse[];
  modules: AdminModule[];
  lessons: LessonSummary[];
}

export const adminApi = {
  getCatalog(roleHeader: string) {
    return apiFetch<AdminCatalogResponse>('admin/catalog', {
      headers: {
        'x-user-role': roleHeader,
      },
    });
  },
};
