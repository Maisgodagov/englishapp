import { memo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import {
  selectShowEnglishSubtitles,
  selectShowRussianSubtitles,
  setShowEnglishSubtitles,
  setShowRussianSubtitles,
} from '../model/videoSettingsSlice';

const SubtitleTogglesComponent = () => {
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const showEnglish = useAppSelector(selectShowEnglishSubtitles);
  const showRussian = useAppSelector(selectShowRussianSubtitles);

  const handleToggleEnglish = useCallback(() => {
    dispatch(setShowEnglishSubtitles(!showEnglish));
  }, [dispatch, showEnglish]);

  const handleToggleRussian = useCallback(() => {
    dispatch(setShowRussianSubtitles(!showRussian));
  }, [dispatch, showRussian]);

  return (
    <>
      <TouchableOpacity
        onPress={handleToggleEnglish}
        activeOpacity={0.7}
        style={[
          styles.toggle,
          {
            backgroundColor: showEnglish
              ? theme.colors.primary
              : 'rgba(255, 255, 255, 0.2)',
          }
        ]}
      >
        <Ionicons
          name="text"
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleToggleRussian}
        activeOpacity={0.7}
        style={[
          styles.toggle,
          {
            backgroundColor: showRussian
              ? theme.colors.primary
              : 'rgba(255, 255, 255, 0.2)',
          }
        ]}
      >
        <Ionicons
          name="chatbox"
          size={24}
          color="#FFFFFF"
        />
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  toggle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const SubtitleToggles = memo(SubtitleTogglesComponent);
