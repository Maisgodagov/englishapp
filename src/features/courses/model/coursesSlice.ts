import { createSlice, nanoid, PayloadAction } from '@reduxjs/toolkit';

export interface LessonSummary {
  id: string;
  title: string;
  durationMinutes: number;
  progress: number;
}

export interface CourseSummary {
  id: string;
  title: string;
  description: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  progress: number;
  lessonCount: number;
  lessons: LessonSummary[];
}

export interface CoursesState {
  featured: CourseSummary[];
  enrolled: CourseSummary[];
}

const initialState: CoursesState = {
  featured: [],
  enrolled: [],
};

const coursesSlice = createSlice({
  name: 'courses',
  initialState,
  reducers: {
    upsertFeaturedCourses(state, action: PayloadAction<CourseSummary[]>) {
      state.featured = action.payload;
    },
    enrollCourse(state, action: PayloadAction<Omit<CourseSummary, 'lessons'>>) {
      const existing = state.enrolled.find((course) => course.id === action.payload.id);
      if (!existing) {
        state.enrolled.push({ ...action.payload, lessons: [] });
      }
    },
    seedMockCourses(state) {
      if (state.featured.length || state.enrolled.length) {
        return;
      }

      const lessons = Array.from({ length: 5 }).map((_, index) => ({
        id: nanoid(),
        title: `Lesson ${index + 1}`,
        durationMinutes: 12 + index * 3,
        progress: index === 0 ? 40 : 0,
      }));

      state.featured = [
        {
          id: nanoid(),
          title: 'English for Beginners',
          description: 'Basics of grammar, pronunciation and vocabulary to build a solid foundation. Learn essential words like "hello", "goodbye", "please", and "thank you". Practice basic sentences and improve your confidence.',
          level: 'Beginner',
          progress: 0,
          lessonCount: lessons.length,
          lessons,
        },
        {
          id: nanoid(),
          title: 'Conversational English',
          description: 'Dialogue practice and listening comprehension with real-life scenarios. Learn how to order food, ask for directions, and have friendly conversations. Perfect for travelers and daily communication.',
          level: 'Intermediate',
          progress: 0,
          lessonCount: lessons.length,
          lessons,
        },
      ];

      state.enrolled = [
        {
          id: nanoid(),
          title: 'IELTS Preparation',
          description: 'Complete roadmap for IELTS Academic with tips, tasks and mock exams. Master writing essays, speaking fluently, and understanding complex texts. Achieve your target band score.',
          level: 'Advanced',
          progress: 42,
          lessonCount: lessons.length,
          lessons,
        },
      ];
    },
  },
});

export const { upsertFeaturedCourses, enrollCourse, seedMockCourses } = coursesSlice.actions;
export const coursesReducer = coursesSlice.reducer;


