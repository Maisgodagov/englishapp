import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import { fetchVideoFeedWithRelaxation } from '../model/videoLearningSlice';
import {
  selectExerciseCount,
  selectDifficultyLevel,
  selectShowEnglishSubtitles,
  selectShowRussianSubtitles,
  selectViewMode,
  selectSpeechSpeed,
  setDifficultyLevel,
  setExerciseCount,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
  setViewMode,
  setSpeechSpeed,
  type DifficultyLevel,
  type ExerciseCount,
  type ViewMode,
  type SpeechSpeed,
} from '../model/videoSettingsSlice';
import { getContentHeight } from '@shared/utils/dimensions';

interface VideoSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string; description: string }[] = [
  {
    value: 'with-exercises',
    label: 'С упражнениями',
    description: 'Показывать упражнения после каждого видео',
  },
  {
    value: 'without-exercises',
    label: 'Только видео',
    description: 'Просматривать видео без упражнений',
  },
];

const EXERCISE_COUNT_OPTIONS: { value: ExerciseCount; label: string }[] = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
];

const DIFFICULTY_OPTIONS: { value: DifficultyLevel; label: string; badge: string }[] = [
  { value: 'all', label: 'Все уровни', badge: 'ВСЕ' },
  { value: 'easy', label: 'Легкий', badge: 'A1' },
  { value: 'medium', label: 'Средний', badge: 'A2-B1' },
  { value: 'hard', label: 'Сложный', badge: 'B2-C1' },
];

const SPEECH_SPEED_OPTIONS: { value: SpeechSpeed; label: string; icon: string }[] = [
  { value: 'all', label: 'Любая', icon: 'resize' },
  { value: 'slow', label: 'Медленная', icon: 'chevron-back' },
  { value: 'normal', label: 'Средняя', icon: 'play' },
  { value: 'fast', label: 'Быстрая', icon: 'chevron-forward' },
];

export const VideoSettingsModal = ({ visible, onClose }: VideoSettingsModalProps) => {
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();

  // Current settings from Redux
  const currentViewMode = useAppSelector(selectViewMode);
  const currentExerciseCount = useAppSelector(selectExerciseCount);
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);
  const difficultyLevel = useAppSelector(selectDifficultyLevel);
  const speechSpeed = useAppSelector(selectSpeechSpeed);

  // Local state for temporary changes
  const [localViewMode, setLocalViewMode] = useState(currentViewMode);
  const [localExerciseCount, setLocalExerciseCount] = useState(currentExerciseCount);
  const [localShowEnglish, setLocalShowEnglish] = useState(showEnglishSubtitles);
  const [localShowRussian, setLocalShowRussian] = useState(showRussianSubtitles);
  const [localDifficulty, setLocalDifficulty] = useState(difficultyLevel);
  const [localSpeechSpeed, setLocalSpeechSpeed] = useState(speechSpeed);

  // Reset local state when modal opens
  const handleOpen = useCallback(() => {
    setLocalViewMode(currentViewMode);
    setLocalExerciseCount(currentExerciseCount);
    setLocalShowEnglish(showEnglishSubtitles);
    setLocalShowRussian(showRussianSubtitles);
    setLocalDifficulty(difficultyLevel);
    setLocalSpeechSpeed(speechSpeed);
  }, [currentViewMode, currentExerciseCount, showEnglishSubtitles, showRussianSubtitles, difficultyLevel, speechSpeed]);

  // Apply all changes
  const handleApply = useCallback(() => {
    const filtersChanged =
      localDifficulty !== difficultyLevel ||
      localSpeechSpeed !== speechSpeed;

    // Apply all settings
    dispatch(setViewMode(localViewMode));
    dispatch(setExerciseCount(localExerciseCount));
    dispatch(setShowEnglishSubtitles(localShowEnglish));
    dispatch(setShowRussianSubtitles(localShowRussian));
    dispatch(setDifficultyLevel(localDifficulty));
    dispatch(setSpeechSpeed(localSpeechSpeed));

    // Refresh feed if filters changed
    if (filtersChanged) {
      dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
    }

    onClose();
  }, [
    dispatch,
    localViewMode,
    localExerciseCount,
    localShowEnglish,
    localShowRussian,
    localDifficulty,
    localSpeechSpeed,
    difficultyLevel,
    speechSpeed,
    onClose,
  ]);

  const screenHeight = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom],
  );

  // 3/4 of screen height
  const modalHeight = screenHeight * 0.75;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      onShow={handleOpen}
    >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View
            style={[
              styles.content,
              {
                backgroundColor: theme.colors.background,
                height: modalHeight,
                paddingBottom: insets.bottom || 16,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.header}>
              <Typography variant="h2" style={styles.title}>
                Настройки
              </Typography>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={28} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.scrollView}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Режим просмотра */}
              <View style={styles.section}>
                <Typography variant="subtitle" style={styles.sectionTitle}>
                  Режим просмотра
                </Typography>
                <View style={styles.rowOptions}>
                  {VIEW_MODE_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.rowOption,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: localViewMode === option.value ? theme.colors.primary : theme.colors.border,
                          borderWidth: localViewMode === option.value ? 2 : 1,
                        },
                      ]}
                      onPress={() => setLocalViewMode(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.rowOptionContent}>
                        <Typography variant="body" weight="semibold">
                          {option.label}
                        </Typography>
                        <Typography variant="caption" style={styles.optionDescription}>
                          {option.description}
                        </Typography>
                      </View>
                      {localViewMode === option.value && (
                        <Ionicons name="checkmark-circle" size={24} color={theme.colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Количество упражнений */}
              {localViewMode === 'with-exercises' && (
                <View style={styles.section}>
                  <Typography variant="subtitle" style={styles.sectionTitle}>
                    Количество упражнений
                  </Typography>
                  <View style={styles.chipRow}>
                    {EXERCISE_COUNT_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: localExerciseCount === option.value
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: theme.colors.border,
                          },
                        ]}
                        onPress={() => setLocalExerciseCount(option.value)}
                        activeOpacity={0.7}
                      >
                        <Typography
                          variant="body"
                          weight="semibold"
                          style={{
                            color: localExerciseCount === option.value
                              ? '#FFFFFF'
                              : theme.colors.text,
                          }}
                        >
                          {option.label}
                        </Typography>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Уровень сложности */}
              <View style={styles.section}>
                <Typography variant="subtitle" style={styles.sectionTitle}>
                  Уровень сложности
                </Typography>
                <View style={styles.chipRow}>
                  {DIFFICULTY_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        styles.chipLarge,
                        {
                          backgroundColor: localDifficulty === option.value
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setLocalDifficulty(option.value)}
                      activeOpacity={0.7}
                    >
                      <Typography
                        variant="caption"
                        weight="bold"
                        style={{
                          color: localDifficulty === option.value
                            ? '#FFFFFF'
                            : theme.colors.textSecondary,
                          marginBottom: 2,
                        }}
                      >
                        {option.badge}
                      </Typography>
                      <Typography
                        variant="body"
                        weight="semibold"
                        style={{
                          color: localDifficulty === option.value
                            ? '#FFFFFF'
                            : theme.colors.text,
                        }}
                      >
                        {option.label}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Скорость речи */}
              <View style={styles.section}>
                <Typography variant="subtitle" style={styles.sectionTitle}>
                  Скорость речи
                </Typography>
                <View style={styles.chipRow}>
                  {SPEECH_SPEED_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.chip,
                        styles.chipLarge,
                        {
                          backgroundColor: localSpeechSpeed === option.value
                            ? theme.colors.primary
                            : theme.colors.surface,
                          borderColor: theme.colors.border,
                        },
                      ]}
                      onPress={() => setLocalSpeechSpeed(option.value)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={option.icon as any}
                        size={18}
                        color={localSpeechSpeed === option.value ? '#FFFFFF' : theme.colors.textSecondary}
                        style={{ marginBottom: 4 }}
                      />
                      <Typography
                        variant="body"
                        weight="semibold"
                        style={{
                          color: localSpeechSpeed === option.value
                            ? '#FFFFFF'
                            : theme.colors.text,
                        }}
                      >
                        {option.label}
                      </Typography>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Субтитры */}
              <View style={styles.section}>
                <Typography variant="subtitle" style={styles.sectionTitle}>
                  Субтитры
                </Typography>
                <View style={styles.toggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setLocalShowEnglish(!localShowEnglish)}
                    activeOpacity={0.7}
                  >
                    <Typography variant="body" weight="medium">
                      Английские субтитры
                    </Typography>
                    <View
                      style={[
                        styles.switch,
                        {
                          backgroundColor: localShowEnglish
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          { transform: [{ translateX: localShowEnglish ? 20 : 2 }] },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.toggle,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: theme.colors.border,
                      },
                    ]}
                    onPress={() => setLocalShowRussian(!localShowRussian)}
                    activeOpacity={0.7}
                  >
                    <Typography variant="body" weight="medium">
                      Русские субтитры
                    </Typography>
                    <View
                      style={[
                        styles.switch,
                        {
                          backgroundColor: localShowRussian
                            ? theme.colors.primary
                            : theme.colors.border,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.switchThumb,
                          { transform: [{ translateX: localShowRussian ? 20 : 2 }] },
                        ]}
                      />
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>

            {/* Apply Button */}
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.applyButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                onPress={handleApply}
                activeOpacity={0.8}
              >
                <Typography variant="body" weight="bold" style={styles.applyButtonText}>
                  Применить
                </Typography>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  rowOptions: {
    gap: 12,
  },
  rowOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
  },
  rowOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  optionDescription: {
    marginTop: 4,
    opacity: 0.7,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  chipLarge: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flex: 1,
    minWidth: 0,
  },
  toggleRow: {
    gap: 12,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  switch: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
  },
  switchThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  applyButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
  },
});
