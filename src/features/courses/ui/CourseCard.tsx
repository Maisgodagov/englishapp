import { View, StyleSheet } from 'react-native';
import type { CourseSummary } from '@features/courses/model/coursesSlice';
import { SurfaceCard, Typography } from '@shared/ui';

export interface CourseCardProps {
  course: CourseSummary;
}

export const CourseCard = ({ course }: CourseCardProps) => (
  <SurfaceCard padded style={styles.card}>
    <View style={styles.header}>
      <Typography variant="subtitle" style={styles.title}>{course.title}</Typography>
      <Typography variant="caption" style={styles.level}>{course.level}</Typography>
    </View>
    <Typography variant="body" style={styles.description}>
      {course.description}
    </Typography>
    <View style={styles.meta}>
      <Typography variant="caption">Уроков: {course.lessonCount}</Typography>
      <Typography variant="caption">Прогресс: {course.progress}%</Typography>
    </View>
  </SurfaceCard>
);

const styles = StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  title: {
    flex: 1,
    marginRight: 8,
  },
  level: {
    color: '#6B7280',
  },
  description: {
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
