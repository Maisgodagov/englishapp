import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import dayjs from 'dayjs';
import { useTheme } from 'styled-components/native';

import { useAppSelector } from '@core/store/hooks';
import { selectIsAdmin, selectUserProfile } from '@entities/user/model/selectors';
import { adminApi, type AdminCatalogResponse } from '@features/admin/api/adminApi';
import { lessonsApi } from '@features/lessons/api/lessonsApi';
import type { LessonSummary } from '@features/lessons/model/types';
import { PrimaryButton, SurfaceCard, TextButton, Typography } from '@shared/ui';

const LESSONS_LIMIT = 200;

export default function AdminDashboardScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const profile = useAppSelector(selectUserProfile);
  const isAdmin = useAppSelector(selectIsAdmin);

  const [catalog, setCatalog] = useState<AdminCatalogResponse | null>(null);
  const [lessons, setLessons] = useState<LessonSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCatalog = useCallback(
    async (opts: { refreshing?: boolean } = {}) => {
      if (!profile?.role) return;

      if (opts.refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const [catalogResponse, lessonsResponse] = await Promise.all([
          adminApi.getCatalog(profile.role),
          lessonsApi.list({ limit: LESSONS_LIMIT }),
        ]);
        setCatalog(catalogResponse);
        setLessons(lessonsResponse.items);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось загрузить данные. Попробуйте ещё раз.';
        setErrorMessage(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [profile?.role],
  );

  useFocusEffect(
    useCallback(() => {
      if (isAdmin) {
        fetchCatalog();
      } else if (profile) {
        router.replace('/(tabs)/home');
      }
    }, [fetchCatalog, isAdmin, profile, router]),
  );

  const handleDeleteLesson = useCallback(
    (lessonId: string) => {
      if (!profile?.role) return;

      Alert.alert(
        'Удалить урок',
        'Вы уверены, что хотите удалить этот урок? Действие невозможно отменить.',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Удалить',
            style: 'destructive',
            onPress: async () => {
              try {
                await lessonsApi.remove(lessonId, profile.role);
                setLessons((prev) => prev.filter((lesson) => lesson.id !== lessonId));
                fetchCatalog({ refreshing: true });
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : 'Не удалось удалить урок. Попробуйте ещё раз.';
                Alert.alert('Ошибка', message);
              }
            },
          },
        ],
      );
    },
    [fetchCatalog, profile?.role],
  );

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Typography variant="body" style={styles.centeredText}>
            Загружаем профиль...
          </Typography>
        </View>
      </SafeAreaView>
    );
  }

  if (!isAdmin) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Typography variant="title" style={styles.centeredTitle}>
            Доступ ограничен
          </Typography>
          <Typography variant="body" style={styles.centeredText}>
            Этот раздел доступен только администраторам.
          </Typography>
          <PrimaryButton onPress={() => router.replace('/(tabs)/home')} style={styles.backButton}>
            На главную
          </PrimaryButton>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => fetchCatalog({ refreshing: true })} />}
      >
        <View style={styles.header}>
          <View>
            <Typography variant="title" style={styles.title}>
              Панель администратора
            </Typography>
            <Typography variant="caption" style={styles.subtitle}>
              Управляйте курсами, модулями и уроками платформы
            </Typography>
          </View>
          <PrimaryButton onPress={() => router.push('/admin/lessons/create')}>
            Создать урок
          </PrimaryButton>
        </View>

        {isLoading && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Typography variant="caption" style={styles.statusText}>
              Загружаем данные...
            </Typography>
          </View>
        )}

        {errorMessage && (
          <SurfaceCard>
            <Typography variant="body" style={[styles.statusText, { color: theme.colors.danger }]}>
              {errorMessage}
            </Typography>
          </SurfaceCard>
        )}

        {catalog && (
          <>
            <SurfaceCard>
              <View style={styles.sectionHeader}>
                <Typography variant="subtitle">Курсы</Typography>
                <Typography variant="caption" style={styles.caption}>
                  {catalog.courses.length}
                </Typography>
              </View>
              <View style={styles.listContainer}>
                {catalog.courses.length === 0 ? (
                  <Typography variant="body" style={styles.placeholder}>
                    Курсы пока не созданы.
                  </Typography>
                ) : (
                  catalog.courses.map((course) => (
                    <SurfaceCard key={course.id} padded style={styles.childCard}>
                      <Typography variant="subtitle" style={styles.itemTitle}>
                        {course.title}
                      </Typography>
                      {course.description && (
                        <Typography variant="body" style={styles.itemDescription}>
                          {course.description}
                        </Typography>
                      )}
                      <View style={styles.metaRow}>
                        <Typography variant="caption">Модулей: {course.modules.length}</Typography>
                        <Typography variant="caption">
                          Сложности: {course.difficultyLevels.join(', ') || 'не указаны'}
                        </Typography>
                        <Typography variant="caption">
                          Цена: {course.price} ₽
                        </Typography>
                      </View>
                      <View style={styles.moduleList}>
                        {course.modules.map((module) => (
                          <Typography key={module.id} variant="caption" style={styles.caption}>
                            {module.order}. {module.title} — уроков: {module.lessonCount}
                          </Typography>
                        ))}
                      </View>
                    </SurfaceCard>
                  ))
                )}
              </View>
            </SurfaceCard>

            <SurfaceCard>
              <View style={styles.sectionHeader}>
                <Typography variant="subtitle">Модули</Typography>
                <Typography variant="caption" style={styles.caption}>
                  {catalog.modules.length}
                </Typography>
              </View>
              <View style={styles.listContainer}>
                {catalog.modules.length === 0 ? (
                  <Typography variant="body" style={styles.placeholder}>
                    Модули пока не созданы.
                  </Typography>
                ) : (
                  catalog.modules.map((module) => (
                    <SurfaceCard key={module.id} padded style={styles.childCard}>
                      <Typography variant="subtitle" style={styles.itemTitle}>
                        {module.title}
                      </Typography>
                      {module.description && (
                        <Typography variant="body" style={styles.itemDescription}>
                          {module.description}
                        </Typography>
                      )}
                      <View style={styles.metaRow}>
                        <Typography variant="caption">
                          Уроков: {module.lessons.length}
                        </Typography>
                        <Typography variant="caption">
                          Курсы: {module.courses.map((course) => course.title).join(', ') || 'не привязан'}
                        </Typography>
                      </View>
                      <View style={styles.moduleList}>
                        {module.lessons.map((lesson) => (
                          <Typography key={lesson.id} variant="caption" style={styles.caption}>
                            {lesson.order}. {lesson.title} — XP {lesson.xpReward}
                          </Typography>
                        ))}
                      </View>
                    </SurfaceCard>
                  ))
                )}
              </View>
            </SurfaceCard>
          </>
        )}

        <SurfaceCard>
          <View style={styles.sectionHeader}>
            <Typography variant="subtitle">Уроки</Typography>
            <Typography variant="caption" style={styles.caption}>
              {lessons.length}
            </Typography>
          </View>
          <View style={styles.listContainer}>
            {lessons.length === 0 ? (
              <Typography variant="body" style={styles.placeholder}>
                Уроки пока не созданы. Нажмите «Создать урок», чтобы добавить первый.
              </Typography>
            ) : (
              lessons.map((lesson) => (
                <SurfaceCard key={lesson.id} padded style={styles.lessonCard}>
                  <View style={styles.lessonHeader}>
                    <View style={{ flex: 1 }}>
                      <Typography variant="subtitle" style={styles.itemTitle}>
                        {lesson.title}
                      </Typography>
                      {lesson.description && (
                        <Typography variant="body" style={styles.itemDescription}>
                          {lesson.description}
                        </Typography>
                      )}
                    </View>
                    <View style={styles.lessonActions}>
                      <TextButton onPress={() => router.push(`/admin/lessons/${lesson.id}/preview`)}>
                        Просмотр
                      </TextButton>
                      <TextButton onPress={() => router.push(`/admin/lessons/${lesson.id}/edit`)}>
                        Редактировать
                      </TextButton>
                      <TextButton onPress={() => handleDeleteLesson(lesson.id)}>
                        Удалить
                      </TextButton>
                    </View>
                  </View>
                  <View style={styles.metaRow}>
                    <Typography variant="caption">XP: {lesson.xpReward}</Typography>
                    {typeof lesson.durationMinutes === 'number' && (
                      <Typography variant="caption">Длительность: {lesson.durationMinutes} мин</Typography>
                    )}
                    <Typography variant="caption">
                      Обновлено: {dayjs(lesson.updatedAt).format('DD.MM.YYYY HH:mm')}
                    </Typography>
                  </View>
                </SurfaceCard>
              ))
            )}
          </View>
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.backgroundAlt,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 20,
      paddingBottom: 40,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      marginBottom: 2,
    },
    subtitle: {
      color: theme.colors.textSecondary,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    statusText: {
      fontWeight: '600',
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    caption: {
      color: theme.colors.textSecondary,
    },
    listContainer: {
      gap: 12,
    },
    childCard: {
      borderColor: theme.colors.border,
    },
    itemTitle: {
      marginBottom: 6,
    },
    itemDescription: {
      color: theme.colors.textSecondary,
      marginBottom: 12,
    },
    metaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    moduleList: {
      marginTop: 8,
      gap: 4,
    },
    placeholder: {
      color: theme.colors.textSecondary,
    },
    lessonCard: {
      borderColor: theme.colors.border,
      gap: 12,
    },
    lessonHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    lessonActions: {
      alignItems: 'flex-end',
      gap: 4,
    },
    centered: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 16,
      padding: 32,
    },
    centeredTitle: {
      textAlign: 'center',
    },
    centeredText: {
      textAlign: 'center',
      color: theme.colors.textSecondary,
    },
    backButton: {
      marginTop: 12,
    },
  });
