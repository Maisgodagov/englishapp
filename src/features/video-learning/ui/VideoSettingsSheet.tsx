import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Switch,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Typography } from '@shared/ui';
import type { DifficultyLevel, SpeechSpeed } from '../model/videoSettingsSlice';
import { getContentHeight } from '@shared/utils/dimensions';

type Option<T extends string> = { label: string; value: T };

const difficultyOptions: Option<DifficultyLevel>[] = [
  { value: 'all', label: 'Все уровни' },
  { value: 'easy', label: 'A1' },
  { value: 'medium', label: 'A2-B1' },
  { value: 'hard', label: 'B2-C1' },
];

const speechOptions: Option<SpeechSpeed>[] = [
  { value: 'all', label: 'Любая скорость' },
  { value: 'slow', label: 'Медленно' },
  { value: 'normal', label: 'Средне' },
  { value: 'fast', label: 'Быстро' },
];

interface VideoSettingsSheetProps {
  visible: boolean;
  onClose: () => void;
  difficultyLevel: DifficultyLevel;
  speechSpeed: SpeechSpeed;
  showEnglishSubtitles: boolean;
  showRussianSubtitles: boolean;
  showAdultContent: boolean;
  onSelectDifficulty: (value: DifficultyLevel) => void;
  onSelectSpeechSpeed: (value: SpeechSpeed) => void;
  onToggleEnglish: () => void;
  onToggleRussian: () => void;
  onToggleAdult: () => void;
}

const SHEET_ANIMATION_DURATION = 250;

export const VideoSettingsSheet = ({
  visible,
  onClose,
  difficultyLevel,
  speechSpeed,
  showEnglishSubtitles,
  showRussianSubtitles,
  showAdultContent,
  onSelectDifficulty,
  onSelectSpeechSpeed,
  onToggleEnglish,
  onToggleRussian,
  onToggleAdult,
}: VideoSettingsSheetProps) => {
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(0)).current;
  const sheetHeight = useMemo(() => {
    const contentHeight = getContentHeight(insets.top, insets.bottom);
    return Math.min(contentHeight * 0.9, 560);
  }, [insets.top, insets.bottom]);

  useEffect(() => {
    if (visible) {
      setIsMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: visible ? 0 : sheetHeight + 40,
      duration: SHEET_ANIMATION_DURATION,
      useNativeDriver: true,
    }).start(() => {
      if (!visible) {
        setIsMounted(false);
      }
    });
  }, [visible, translateY, sheetHeight]);

  if (!isMounted) return null;

  const renderOptionGroup = <T extends string>(
    label: string,
    options: Option<T>[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={styles.section}>
      <Typography variant="caption" style={styles.sectionLabel}>
        {label}
      </Typography>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isActive = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.chip, isActive && styles.chipActive]}
              activeOpacity={0.9}
              onPress={() => onSelect(option.value)}
            >
              <Typography
                variant="body"
                style={[styles.chipLabel, isActive && styles.chipLabelActive]}
              >
                {option.label}
              </Typography>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderToggleRow = (
    label: string,
    description: string,
    value: boolean,
    onToggle: () => void,
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrapper}>
        <Typography variant="body" style={styles.toggleLabel}>
          {label}
        </Typography>
        <Typography variant="caption" style={styles.toggleDescription}>
          {description}
        </Typography>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={value ? '#9dff80' : '#d1d5db'}
        trackColor={{ false: 'rgba(255,255,255,0.2)', true: 'rgba(157,255,128,0.35)' }}
      />
    </View>
  );

  return (
    <Modal statusBarTranslucent animationType="none" transparent visible>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY }],
              height: sheetHeight + insets.bottom + 20,
            },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.header}>
            <Typography variant="title" style={styles.headerTitle}>
              Настройки ленты
            </Typography>
            <Typography variant="caption" style={styles.headerSubtitle}>
              Настрой фильтры и субтитры под себя
            </Typography>
          </View>

          {renderOptionGroup('Уровень языка', difficultyOptions, difficultyLevel, onSelectDifficulty)}
          {renderOptionGroup('Скорость речи', speechOptions, speechSpeed, onSelectSpeechSpeed)}

          <View style={styles.divider} />

          {renderToggleRow('Английские субтитры', 'Показывать оригинальный текст', showEnglishSubtitles, onToggleEnglish)}
          {renderToggleRow('Русские субтитры', 'Добавлять перевод под оригиналом', showRussianSubtitles, onToggleRussian)}
          {renderToggleRow('Показывать 18+ видео', 'Включая ролики с пометкой 18+', showAdultContent, onToggleAdult)}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Typography variant="button" style={styles.closeButtonLabel}>
              Готово
            </Typography>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: '#0F1119',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: 16,
  },
  header: {
    marginBottom: 12,
    gap: 4,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
  },
  section: {
    marginTop: 12,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  chipActive: {
    borderColor: '#9dff80',
    backgroundColor: 'rgba(157,255,128,0.18)',
  },
  chipLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  chipLabelActive: {
    color: '#9dff80',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 14,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  toggleTextWrapper: {
    flex: 1,
    paddingRight: 12,
  },
  toggleLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  toggleDescription: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  closeButton: {
    marginTop: 16,
    backgroundColor: '#9dff80',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  closeButtonLabel: {
    color: '#051923',
    fontWeight: '700',
  },
});

