import { memo, useCallback, useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import {
  selectModerationFilter,
  setModerationFilter,
  type ModerationFilter,
} from '../model/videoSettingsSlice';
import { fetchVideoFeedWithRelaxation } from '../model/videoLearningSlice';
import { Typography } from '@shared/ui';

const MODERATION_OPTIONS: { value: ModerationFilter; label: string; shortLabel: string }[] = [
  { value: 'all', label: 'Все видео', shortLabel: 'Все' },
  { value: 'moderated', label: 'Прошли модерацию', shortLabel: 'Мод.' },
  { value: 'unmoderated', label: 'Не прошли модерацию', shortLabel: 'Немод.' },
];

const ModerationFilterToggleComponent = () => {
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const moderationFilter = useAppSelector(selectModerationFilter);
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = MODERATION_OPTIONS.find(opt => opt.value === moderationFilter);

  const handleSelect = useCallback((value: ModerationFilter) => {
    dispatch(setModerationFilter(value));
    dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
    setIsOpen(false);
  }, [dispatch]);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleDropdown}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            backgroundColor: 'rgba(255, 165, 0, 0.25)',
            borderColor: 'rgba(255, 165, 0, 0.5)',
          }
        ]}
      >
        <Ionicons name="shield-checkmark" size={16} color="#FFA500" />
        <Typography
          variant="caption"
          style={styles.buttonText}
          enableWordLookup={false}
        >
          {selectedOption?.shortLabel}
        </Typography>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={14}
          color="#FFA500"
        />
      </TouchableOpacity>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeDropdown}
        >
          <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
            <View
              style={[
                styles.dropdownContent,
                { backgroundColor: theme.colors.surface }
              ]}
            >
              {MODERATION_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    {
                      backgroundColor: option.value === moderationFilter
                        ? theme.colors.primary + '15'
                        : 'transparent',
                      borderBottomColor: theme.colors.border,
                    }
                  ]}
                  onPress={() => handleSelect(option.value)}
                  activeOpacity={0.7}
                >
                  <Typography
                    variant="body"
                    style={[
                      styles.optionText,
                      { color: option.value === moderationFilter ? theme.colors.primary : theme.colors.text }
                    ]}
                    enableWordLookup={false}
                  >
                    {option.label}
                  </Typography>
                  {option.value === moderationFilter && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={theme.colors.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 4,
  },
  buttonText: {
    color: '#FFA500',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 0.3,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 320,
  },
  dropdownContent: {
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
});

export const ModerationFilterToggle = memo(ModerationFilterToggleComponent);
