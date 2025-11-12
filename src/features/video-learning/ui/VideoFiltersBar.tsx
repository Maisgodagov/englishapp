import { memo, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import {
  selectDifficultyLevel,
  selectSpeechSpeed,
  setDifficultyLevel,
  setSpeechSpeed,
  type DifficultyLevel,
  type SpeechSpeed,
} from '../model/videoSettingsSlice';
import { fetchVideoFeedWithRelaxation } from '../model/videoLearningSlice';
import { FilterDropdown, FilterOption } from './FilterDropdown';

const DIFFICULTY_OPTIONS: FilterOption<DifficultyLevel>[] = [
  { value: 'all', label: 'Все уровни' },
  { value: 'easy', label: 'A1 (Легкий)' },
  { value: 'medium', label: 'A2-B1 (Средний)' },
  { value: 'hard', label: 'B2-C1 (Сложный)' },
];

const SPEECH_SPEED_OPTIONS: FilterOption<SpeechSpeed>[] = [
  { value: 'all', label: 'Любая скорость', icon: 'resize' },
  { value: 'slow', label: 'Медленная', icon: 'chevron-back' },
  { value: 'normal', label: 'Средняя', icon: 'play' },
  { value: 'fast', label: 'Быстрая', icon: 'chevron-forward' },
];

const VideoFiltersBarComponent = () => {
  const dispatch = useAppDispatch();
  const insets = useSafeAreaInsets();
  const difficultyLevel = useAppSelector(selectDifficultyLevel);
  const speechSpeed = useAppSelector(selectSpeechSpeed);

  const handleDifficultyChange = useCallback((value: DifficultyLevel) => {
    dispatch(setDifficultyLevel(value));
    // Refresh feed when filter changes
    dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
  }, [dispatch]);

  const handleSpeechSpeedChange = useCallback((value: SpeechSpeed) => {
    dispatch(setSpeechSpeed(value));
    // Refresh feed when filter changes
    dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
  }, [dispatch]);

  return (
    <View style={[styles.container, { top: insets.top + 12 }]}>
      <FilterDropdown
        value={difficultyLevel}
        options={DIFFICULTY_OPTIONS}
        onChange={handleDifficultyChange}
        placeholder="Уровень"
        style={styles.dropdown}
      />
      <FilterDropdown
        value={speechSpeed}
        options={SPEECH_SPEED_OPTIONS}
        onChange={handleSpeechSpeedChange}
        placeholder="Скорость"
        style={styles.dropdown}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 12,
    right: 12,
    flexDirection: 'row',
    gap: 8,
    zIndex: 100,
  },
  dropdown: {
    flex: 1,
  },
});

export const VideoFiltersBar = memo(VideoFiltersBarComponent);
