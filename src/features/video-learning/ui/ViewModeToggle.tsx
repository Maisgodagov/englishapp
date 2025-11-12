import { memo, useCallback } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import {
  selectViewMode,
  setViewMode,
  type ViewMode,
} from '../model/videoSettingsSlice';
import { Typography } from '@shared/ui';

const ViewModeToggleComponent = () => {
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const viewMode = useAppSelector(selectViewMode);

  const isWithExercises = viewMode === 'with-exercises';

  const handleToggle = useCallback(() => {
    const newMode: ViewMode = isWithExercises ? 'without-exercises' : 'with-exercises';
    dispatch(setViewMode(newMode));
  }, [dispatch, isWithExercises]);

  return (
    <TouchableOpacity
      onPress={handleToggle}
      activeOpacity={0.7}
      style={[
        styles.container,
        {
          backgroundColor: isWithExercises
            ? theme.colors.primary
            : 'rgba(255, 255, 255, 0.2)',
        }
      ]}
    >
      <Ionicons
        name={isWithExercises ? 'school' : 'videocam'}
        size={24}
        color="#FFFFFF"
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const ViewModeToggle = memo(ViewModeToggleComponent);
