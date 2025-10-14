export enum LessonProgressStatus {
  LOCKED = 'LOCKED',
  AVAILABLE = 'AVAILABLE',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export const lessonProgressColors: Record<LessonProgressStatus, string> = {
  [LessonProgressStatus.LOCKED]: '#9CA3AF',
  [LessonProgressStatus.AVAILABLE]: '#3B82F6',
  [LessonProgressStatus.IN_PROGRESS]: '#F59E0B',
  [LessonProgressStatus.COMPLETED]: '#10B981',
};
