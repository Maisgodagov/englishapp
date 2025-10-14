import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from 'styled-components/native';

import { useAppSelector } from '@core/store/hooks';
import { selectUserProfile } from '@entities/user/model/selectors';
import { lessonsApi } from '@features/lessons/api/lessonsApi';
import type { LessonDetail } from '@features/lessons/model/types';
import { LessonBuilder } from '@features/lessons/ui/LessonBuilder';
import { TextButton, Typography } from '@shared/ui';

export default function EditLessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const styles = getStyles(theme);

  const profile = useAppSelector(selectUserProfile);
  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

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

  const handleSubmit = async (payload: Parameters<typeof lessonsApi.update>[1]) => {
    if (!profile?.role || !id) {
      Alert.alert('Ошибка', 'Не удалось определить пользователя или урок.');
      return;
    }

    setIsSaving(true);
    try {
      const updated = await lessonsApi.update(id, payload, profile.role);
      setLesson(updated);
      router.replace('/admin');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось обновить урок. Попробуйте ещё раз.';
      Alert.alert('Ошибка', message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !lesson) {
    return (
      <SafeAreaView style={styles.loadingContainer} edges={['top', 'bottom']}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Typography variant="title">Редактирование урока</Typography>
        <TextButton onPress={() => router.back()}>Назад</TextButton>
      </View>
      <LessonBuilder
        onSubmit={handleSubmit}
        isSaving={isSaving}
        initialLesson={lesson}
        submitLabel="Сохранить изменения"
      />
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
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 16,
    },
  });
