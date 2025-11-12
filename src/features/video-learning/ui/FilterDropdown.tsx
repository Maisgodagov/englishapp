import { memo, useState, useRef, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Platform,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';
import { Typography } from '@shared/ui';

export interface FilterOption<T = string> {
  value: T;
  label: string;
  icon?: string;
}

interface FilterDropdownProps<T = string> {
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
  style?: any;
}

const FilterDropdownComponent = <T extends string>({
  value,
  options,
  onChange,
  placeholder = 'Выберите',
  style,
}: FilterDropdownProps<T>) => {
  const theme = useTheme() as any;
  const [isOpen, setIsOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = useCallback((optionValue: T) => {
    onChange(optionValue);
    setIsOpen(false);
  }, [onChange]);

  const toggleDropdown = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        style={[
          styles.trigger,
          {
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
          }
        ]}
        onPress={toggleDropdown}
        activeOpacity={0.7}
      >
        <Typography
          variant="body"
          style={styles.triggerText}
          enableWordLookup={false}
        >
          {selectedOption?.label || placeholder}
        </Typography>
        <Ionicons
          name={isOpen ? "chevron-up" : "chevron-down"}
          size={16}
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
              <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
              >
                {options.map((option) => (
                  <TouchableOpacity
                    key={String(option.value)}
                    style={[
                      styles.option,
                      {
                        backgroundColor: option.value === value
                          ? theme.colors.primary + '15'
                          : 'transparent',
                        borderBottomColor: theme.colors.border,
                      }
                    ]}
                    onPress={() => handleSelect(option.value)}
                    activeOpacity={0.7}
                  >
                    {option.icon && (
                      <Ionicons
                        name={option.icon as any}
                        size={20}
                        color={option.value === value ? theme.colors.primary : theme.colors.textSecondary}
                        style={styles.optionIcon}
                      />
                    )}
                    <Typography
                      variant="body"
                      style={[
                        styles.optionText,
                        { color: option.value === value ? theme.colors.primary : theme.colors.text }
                      ]}
                      enableWordLookup={false}
                    >
                      {option.label}
                    </Typography>
                    {option.value === value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    minWidth: 120,
  },
  triggerText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 6,
    color: '#FFFFFF',
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
    maxHeight: '60%',
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
  scrollView: {
    maxHeight: 400,
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

export const FilterDropdown = memo(FilterDropdownComponent) as typeof FilterDropdownComponent;
