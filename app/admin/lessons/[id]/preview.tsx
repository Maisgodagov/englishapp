import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'styled-components/native';

import { lessonsApi } from '@features/lessons/api/lessonsApi';
import type { LessonDetail } from '@features/lessons/model/types';
import { LessonContentRenderer } from '@features/lessons/ui/LessonContentRenderer';
import { TextButton, Typography } from '@shared/ui';

export default function LessonPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const styles = getStyles(theme);

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const data = await lessonsApi.get(id);
        setLesson(data);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить урок.';
        Alert.alert('Ошибка', message, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [id, router]);

  if (isLoading || !lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Typography variant="title" style={styles.title}>
              {lesson.title}
            </Typography>
            {lesson.description && (
              <Typography variant="body" style={styles.description}>
                {lesson.description}
              </Typography>
            )}
            <View style={styles.metaRow}>
              <Typography variant="caption">XP: {lesson.xpReward}</Typography>
              {lesson.durationMinutes && (
                <Typography variant="caption">Длительность: {lesson.durationMinutes} мин</Typography>
              )}
            </View>
          </View>
          <View style={styles.actions}>
            <TextButton onPress={() => router.back()}>Назад</TextButton>
            <TextButton onPress={() => router.push(`/admin/lessons/${lesson.id}/edit`)}>
              Редактировать
            </TextButton>
          </View>
        </View>
        <LessonContentRenderer content={lesson.content} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundAlt,
    },
    loadingContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.backgroundAlt,
    },
    scrollContent: {
      paddingTop: 16,
      gap: 16,
    },
    header: {
      paddingHorizontal: 20,
      gap: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    title: {
      marginBottom: 4,
    },
    description: {
      color: theme.colors.textSecondary,
    },
    metaRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    actions: {
      gap: 4,
      alignItems: 'flex-end',
    },
  });
