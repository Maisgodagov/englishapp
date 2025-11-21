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

const MODERATION_OPTIONS: { value: ModerationFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'Все видео', icon: 'apps' },
  { value: 'moderated', label: 'Прошли модерацию', icon: 'checkmark-circle' },
  { value: 'unmoderated', label: 'Не прошли модерацию', icon: 'alert-circle' },
];

const ModerationFilterButtonComponent = () => {
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

  // Background color based on filter
  const buttonColor = moderationFilter === 'moderated'
    ? 'rgba(76, 175, 80, 0.9)'
    : moderationFilter === 'unmoderated'
    ? 'rgba(239, 68, 68, 0.9)'
    : 'rgba(255, 255, 255, 0.2)';

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={toggleDropdown}
        activeOpacity={0.7}
        style={[
          styles.button,
          {
            backgroundColor: buttonColor,
          }
        ]}
      >
        <Ionicons
          name="filter"
          size={24}
          color="#FFFFFF"
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
                  <Ionicons
                    name={option.icon as any}
                    size={20}
                    color={option.value === moderationFilter ? theme.colors.primary : theme.colors.textSecondary}
                    style={styles.optionIcon}
                  />
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
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionIcon: {
    marginRight: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
});

export const ModerationFilterButton = memo(ModerationFilterButtonComponent);
