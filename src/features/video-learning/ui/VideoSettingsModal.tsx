import { useCallback } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
  Dimensions,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import {
  setViewMode,
  setExerciseCount,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
  selectViewMode,
  selectExerciseCount,
  selectShowEnglishSubtitles,
  selectShowRussianSubtitles,
  type ViewMode,
  type ExerciseCount,
} from '../model/videoSettingsSlice';
import {
  setGlobalVolume,
  setAutoNormalize,
  selectGlobalVolume,
  selectAutoNormalize,
} from '../model/volumeSettingsSlice';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface VideoSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const VIEW_MODE_OPTIONS: { value: ViewMode; label: string; description: string }[] = [
  {
    value: 'with-exercises',
    label: 'С упражнениями',
    description: 'После каждого видео нужно выполнить задания',
  },
  {
    value: 'without-exercises',
    label: 'Без упражнений',
    description: 'Свободный просмотр видео без заданий',
  },
];

const EXERCISE_COUNT_OPTIONS: { value: ExerciseCount; label: string }[] = [
  { value: 1, label: '1 упражнение' },
  { value: 2, label: '2 упражнения' },
  { value: 3, label: '3 упражнения' },
  { value: 4, label: '4 упражнения' },
  { value: 5, label: '5 упражнений' },
];

export const VideoSettingsModal = ({ visible, onClose }: VideoSettingsModalProps) => {
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const currentViewMode = useAppSelector(selectViewMode);
  const currentExerciseCount = useAppSelector(selectExerciseCount);
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);
  const globalVolume = useAppSelector(selectGlobalVolume);
  const autoNormalize = useAppSelector(selectAutoNormalize);

  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      dispatch(setViewMode(mode));
    },
    [dispatch],
  );

  const handleExerciseCountChange = useCallback(
    (count: ExerciseCount) => {
      dispatch(setExerciseCount(count));
    },
    [dispatch],
  );

  const toggleEnglishSubtitles = useCallback(() => {
    dispatch(setShowEnglishSubtitles(!showEnglishSubtitles));
  }, [dispatch, showEnglishSubtitles]);

  const toggleRussianSubtitles = useCallback(() => {
    dispatch(setShowRussianSubtitles(!showRussianSubtitles));
  }, [dispatch, showRussianSubtitles]);

  const handleVolumeChange = useCallback(
    (value: number) => {
      dispatch(setGlobalVolume(value));
    },
    [dispatch],
  );

  const toggleAutoNormalize = useCallback(() => {
    dispatch(setAutoNormalize(!autoNormalize));
  }, [dispatch, autoNormalize]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modalContent, { backgroundColor: theme.colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings-outline" size={28} color={theme.colors.text} />
              <Typography variant="title" style={styles.title}>
                Настройки просмотра
              </Typography>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={28} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* View Mode Section */}
            <View style={styles.section}>
              <Typography variant="subtitle" style={styles.sectionTitle}>
                Режим просмотра
              </Typography>
              <View style={styles.optionsContainer}>
                {VIEW_MODE_OPTIONS.map((option) => {
                  const isSelected = currentViewMode === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.option,
                        {
                          backgroundColor: theme.colors.surface,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          borderWidth: isSelected ? 2 : 1,
                        },
                      ]}
                      onPress={() => handleViewModeChange(option.value)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.optionLeft}>
                          <Typography variant="body" style={styles.optionLabel}>
                            {option.label}
                          </Typography>
                          <Typography variant="caption" style={styles.optionDescription}>
                            {option.description}
                          </Typography>
                        </View>
                        {isSelected && (
                          <Ionicons
                            name="checkmark-circle"
                            size={24}
                            color={theme.colors.primary}
                          />
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Exercise Count Section - Only show if with-exercises mode */}
            {currentViewMode === 'with-exercises' && (
              <View style={styles.section}>
                <Typography variant="subtitle" style={styles.sectionTitle}>
                  Количество упражнений
                </Typography>
                <Typography variant="caption" style={styles.sectionDescription}>
                  Выберите количество упражнений (максимум 5-6 на видео)
                </Typography>
                <View style={styles.optionsContainer}>
                  {EXERCISE_COUNT_OPTIONS.map((option) => {
                    const isSelected = currentExerciseCount === option.value;
                    return (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.compactOption,
                          {
                            backgroundColor: isSelected
                              ? theme.colors.primary
                              : theme.colors.surface,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                          },
                        ]}
                        onPress={() => handleExerciseCountChange(option.value)}
                        activeOpacity={0.7}
                      >
                        <Typography
                          variant="body"
                          style={[
                            styles.compactOptionText,
                            { color: isSelected ? '#FFFFFF' : theme.colors.text },
                          ]}
                        >
                          {option.label}
                        </Typography>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Volume Section */}
            <View style={styles.section}>
              <Typography variant="subtitle" style={styles.sectionTitle}>
                Громкость и звук
              </Typography>
              <Typography variant="caption" style={styles.sectionDescription}>
                Настройте уровень громкости и автоматическую нормализацию
              </Typography>

              {/* Auto Normalize Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={toggleAutoNormalize}
                activeOpacity={0.7}
              >
                <View style={styles.toggleLeft}>
                  <Ionicons name="volume-high" size={24} color={theme.colors.text} />
                  <View style={styles.toggleTextContainer}>
                    <Typography variant="body" style={styles.toggleLabel}>
                      Автоматическая нормализация
                    </Typography>
                    <Typography variant="caption" style={styles.toggleDescription}>
                      Выравнивание громкости между видео
                    </Typography>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: autoNormalize ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        transform: [{ translateX: autoNormalize ? 22 : 2 }],
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Volume Slider */}
              <View
                style={[
                  styles.sliderOption,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
              >
                <View style={styles.sliderHeader}>
                  <Ionicons name="volume-medium" size={20} color={theme.colors.text} />
                  <Typography variant="body" style={styles.sliderLabel}>
                    Общая громкость
                  </Typography>
                  <Typography variant="caption" style={styles.volumeValue}>
                    {Math.round(globalVolume * 100)}%
                  </Typography>
                </View>
                <Slider
                  style={styles.slider}
                  minimumValue={0.3}
                  maximumValue={1.0}
                  step={0.05}
                  value={globalVolume}
                  onValueChange={handleVolumeChange}
                  minimumTrackTintColor={theme.colors.primary}
                  maximumTrackTintColor={theme.colors.border}
                  thumbTintColor={theme.colors.primary}
                />
                <View style={styles.sliderLabels}>
                  <Typography variant="caption" style={styles.sliderLabelText}>
                    Тихо
                  </Typography>
                  <Typography variant="caption" style={styles.sliderLabelText}>
                    Громко
                  </Typography>
                </View>
              </View>
            </View>

            {/* Subtitles Section */}
            <View style={styles.section}>
              <Typography variant="subtitle" style={styles.sectionTitle}>
                Субтитры
              </Typography>
              <Typography variant="caption" style={styles.sectionDescription}>
                Выберите, какие субтитры показывать во время просмотра
              </Typography>

              {/* English Subtitles Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={toggleEnglishSubtitles}
                activeOpacity={0.7}
              >
                <View style={styles.toggleLeft}>
                  <Ionicons name="text" size={24} color={theme.colors.text} />
                  <View style={styles.toggleTextContainer}>
                    <Typography variant="body" style={styles.toggleLabel}>
                      Английские субтитры
                    </Typography>
                    <Typography variant="caption" style={styles.toggleDescription}>
                      Оригинальный текст видео
                    </Typography>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: showEnglishSubtitles ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        transform: [{ translateX: showEnglishSubtitles ? 22 : 2 }],
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>

              {/* Russian Subtitles Toggle */}
              <TouchableOpacity
                style={[
                  styles.toggleOption,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.border,
                  },
                ]}
                onPress={toggleRussianSubtitles}
                activeOpacity={0.7}
              >
                <View style={styles.toggleLeft}>
                  <Ionicons name="language" size={24} color={theme.colors.text} />
                  <View style={styles.toggleTextContainer}>
                    <Typography variant="body" style={styles.toggleLabel}>
                      Русские субтитры
                    </Typography>
                    <Typography variant="caption" style={styles.toggleDescription}>
                      Перевод на русский язык
                    </Typography>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggle,
                    {
                      backgroundColor: showRussianSubtitles ? theme.colors.primary : theme.colors.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.toggleThumb,
                      {
                        transform: [{ translateX: showRussianSubtitles ? 22 : 2 }],
                      },
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>

            {/* Info Section */}
            <View style={[styles.infoCard, { backgroundColor: `${theme.colors.primary}15` }]}>
              <Ionicons name="information-circle" size={24} color={theme.colors.primary} />
              <View style={styles.infoText}>
                <Typography variant="caption" style={{ color: theme.colors.text }}>
                  {currentViewMode === 'with-exercises'
                    ? 'После просмотра видео вам нужно будет выполнить упражнения для закрепления материала. Без их выполнения нельзя перейти к следующему видео.'
                    : 'Вы можете свободно пролистывать видео без выполнения упражнений. Это удобно для быстрого просмотра контента.'}
                </Typography>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  modalContent: {
    maxHeight: SCREEN_HEIGHT * 0.85,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    opacity: 0.6,
    marginBottom: 16,
    lineHeight: 18,
  },
  optionsContainer: {
    gap: 12,
  },
  option: {
    borderRadius: 16,
    padding: 16,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeft: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  optionDescription: {
    opacity: 0.6,
    lineHeight: 18,
  },
  compactOption: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  compactOptionText: {
    fontSize: 15,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
  },
  // Toggle styles
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
    gap: 4,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  toggleDescription: {
    opacity: 0.6,
    lineHeight: 18,
  },
  toggle: {
    width: 48,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  // Slider styles
  sliderOption: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  sliderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sliderLabel: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  volumeValue: {
    fontSize: 14,
    fontWeight: '700',
    opacity: 0.7,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    opacity: 0.5,
    fontSize: 12,
  },
});
