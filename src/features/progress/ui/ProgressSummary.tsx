import { View, StyleSheet } from 'react-native';
import { useAppSelector } from '@core/store/hooks';
import { Typography } from '@shared/ui';

export const ProgressSummary = () => {
  const profile = useAppSelector((state) => state.user.profile);

  const streak = profile?.streakDays ?? 0;
  const completedLessons = profile?.completedLessons ?? 0;
  const level = profile?.level ?? '—';
  const role = profile?.role ?? 'student';

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'STUDENT': return 'Ученик';
      case 'TEACHER': return 'Преподаватель';
      case 'ADMIN': return 'Админ';
      default: return 'Ученик';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.metric}>
        <Typography variant="subtitle">{streak}</Typography>
        <Typography variant="caption">Серия (дни)</Typography>
      </View>
      <View style={styles.metric}>
        <Typography variant="subtitle">{completedLessons}</Typography>
        <Typography variant="caption">Пройдено уроков</Typography>
      </View>
      <View style={styles.metric}>
        <Typography variant="subtitle">{level}</Typography>
        <Typography variant="caption">Уровень</Typography>
      </View>
      <View style={styles.metric}>
        <Typography variant="subtitle">{getRoleDisplayName(role)}</Typography>
        <Typography variant="caption">Роль</Typography>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    gap: 16,
  },
  metric: {
    alignItems: 'center',
    minWidth: 120,
    gap: 4,
  },
});
