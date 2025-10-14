import type { LessonProgressStatus } from '@shared/constants/lessonProgress';

export interface RoadmapLesson {
  id: string;
  moduleId: string;
  title: string;
  description?: string;
  icon?: string;
  xpReward: number;
  order: number;
  difficulty: number;
  skill?: string;
  status: LessonProgressStatus;
  stars: number;
  isCurrent: boolean;
}

export interface RoadmapModule {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  theme?: string;
  order: number;
  lessons: RoadmapLesson[];
}

export interface RoadmapResponse {
  modules: RoadmapModule[];
}
