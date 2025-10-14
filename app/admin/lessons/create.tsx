import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTheme } from 'styled-components/native';

import { useAppSelector } from '@core/store/hooks';
import { selectUserProfile } from '@entities/user/model/selectors';
import { lessonsApi } from '@features/lessons/api/lessonsApi';
import { LessonBuilder } from '@features/lessons/ui/LessonBuilder';
import { TextButton, Typography } from '@shared/ui';

export default function CreateLessonScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = getStyles(theme);

  const profile = useAppSelector(selectUserProfile);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (payload: Parameters<typeof lessonsApi.create>[0]) => {
    if (!profile?.role) {
      Alert.alert('Ошибка', 'Не удалось определить роль пользователя.');
      return;
    }

    setIsSaving(true);
    try {
      await lessonsApi.create(payload, profile.role);
      router.replace('/admin');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Не удалось создать урок. Попробуйте ещё раз.';
      Alert.alert('Ошибка', message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Typography variant="title">Создание урока</Typography>
        <TextButton onPress={() => router.back()}>Назад</TextButton>
      </View>
      <LessonBuilder onSubmit={handleSubmit} isSaving={isSaving} />
    </SafeAreaView>
  );
}

const getStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
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
