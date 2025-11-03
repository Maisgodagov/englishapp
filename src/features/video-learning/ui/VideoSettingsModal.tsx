import { useCallback, useMemo } from 'react';
import {
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { getContentHeight } from '@shared/utils/dimensions';

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
  const insets = useSafeAreaInsets();
  const currentViewMode = useAppSelector(selectViewMode);
  const currentExerciseCount = useAppSelector(selectExerciseCount);
  const showEnglishSubtitles = useAppSelector(selectShowEnglishSubtitles);
  const showRussianSubtitles = useAppSelector(selectShowRussianSubtitles);
  const globalVolume = useAppSelector(selectGlobalVolume);
  const autoNormalize = useAppSelector(selectAutoNormalize);

  // Calculate content height excluding safe areas
  const SCREEN_HEIGHT = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom]
  );

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
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
          <View style={[styles.modalContent, {
            backgroundColor: theme.colors.background,
            minHeight: SCREEN_HEIGHT * 0.6,
            maxHeight: SCREEN_HEIGHT * 0.85,
          }]}>
            {/* Header - Compact */}
            <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="settings-outline" size={22} color={theme.colors.text} />
              <Typography variant="subtitle" style={styles.title}>
                Настройки
              </Typography>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* View Mode Section - Compact */}
            <View style={styles.section}>
              <Typography variant="body" style={styles.sectionTitle}>
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
                            size={20}
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
                <Typography variant="body" style={styles.sectionTitle}>
                  Количество упражнений
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

            {/* Volume Section - Compact */}
            <View style={styles.section}>
              <Typography variant="body" style={styles.sectionTitle}>
                Громкость
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
                  <Ionicons name="volume-high" size={20} color={theme.colors.text} />
                  <View style={styles.toggleTextContainer}>
                    <Typography variant="body" style={styles.toggleLabel}>
                      Авто-нормализация
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

            {/* Subtitles Section - Compact */}
            <View style={styles.section}>
              <Typography variant="body" style={styles.sectionTitle}>
                Субтитры
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
                  <Ionicons name="text" size={20} color={theme.colors.text} />
                  <View style={styles.toggleTextContainer}>
                    <Typography variant="body" style={styles.toggleLabel}>
                      Английские
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
                  <Ionicons name="language" size={20} color={theme.colors.text} />
                  <View style={styles.toggleTextContainer}>
                    <Typography variant="body" style={styles.toggleLabel}>
                      Русские
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

          </ScrollView>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionDescription: {
    opacity: 0.6,
    marginBottom: 12,
    lineHeight: 16,
  },
  optionsContainer: {
    gap: 8,
  },
  option: {
    borderRadius: 12,
    padding: 12,
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
  // Toggle styles - Compact
  toggleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toggleTextContainer: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  toggleDescription: {
    opacity: 0.6,
    lineHeight: 16,
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
