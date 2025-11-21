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
import { useTheme } from 'styled-components/native';

import { Typography } from '@shared/ui';
import type { DifficultyLevel, SpeechSpeed } from '../model/videoSettingsSlice';
import { getContentHeight } from '@shared/utils/dimensions';
import type { AppTheme } from '@shared/theme/theme';

type Option<T extends string> = { label: string; value: T };

const difficultyOptions: Option<DifficultyLevel>[] = [
  { value: 'all', label: 'Все уровни' },
  { value: 'easy', label: 'Начальный — A1' },
  { value: 'medium', label: 'Средний — A2, B1' },
  { value: 'hard', label: 'Высокий — B2, C1' },
];

const speechOptions: Option<SpeechSpeed>[] = [
  { value: 'all', label: 'Любая скорость' },
  { value: 'slow', label: 'Медленная речь' },
  { value: 'normal', label: 'Обычная скорость речи' },
  { value: 'fast', label: 'Быстрая речь' },
];

const colorWithOpacity = (hex: string, opacity: number) => {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};


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
  const theme = useTheme() as AppTheme;
  const [isMounted, setIsMounted] = useState(visible);
  const translateY = useRef(new Animated.Value(0)).current;

  const [pendingDifficulty, setPendingDifficulty] = useState(difficultyLevel);
  const [pendingSpeech, setPendingSpeech] = useState(speechSpeed);
  const [pendingEnglish, setPendingEnglish] = useState(showEnglishSubtitles);
  const [pendingRussian, setPendingRussian] = useState(showRussianSubtitles);
  const [pendingAdult, setPendingAdult] = useState(showAdultContent);

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

  useEffect(() => {
    if (visible) {
      setPendingDifficulty(difficultyLevel);
      setPendingSpeech(speechSpeed);
      setPendingEnglish(showEnglishSubtitles);
      setPendingRussian(showRussianSubtitles);
      setPendingAdult(showAdultContent);
    }
  }, [
    visible,
    difficultyLevel,
    speechSpeed,
    showEnglishSubtitles,
    showRussianSubtitles,
    showAdultContent,
  ]);

  const isDark = useMemo(() => {
    const bg = theme.colors.background?.toLowerCase?.() ?? '';
    return bg === '#0f172a' || bg === '#111827' || bg === '#0b1220';
  }, [theme.colors.background]);

  const ui = useMemo(
    () => ({
      backdrop: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.35)',
      sheetBg: theme.colors.surface,
      handle: colorWithOpacity(theme.colors.text, isDark ? 0.2 : 0.15),
      title: theme.colors.text,
      subtitle: colorWithOpacity(theme.colors.textSecondary, 0.9),
      sectionLabel: colorWithOpacity(theme.colors.textSecondary, 0.85),
      chipBg: colorWithOpacity(theme.colors.text, isDark ? 0.14 : 0.08),
      chipActiveBg: colorWithOpacity(theme.colors.primary, isDark ? 0.32 : 0.18),
      chipActiveBorder: colorWithOpacity(
        theme.colors.primaryDark ?? theme.colors.primary,
        isDark ? 0.9 : 0.65
      ),
      toggleLabel: theme.colors.text,
      toggleDescription: colorWithOpacity(theme.colors.textSecondary, 0.85),
      divider: colorWithOpacity(theme.colors.text, isDark ? 0.12 : 0.08),
      saveBg: isDark
        ? colorWithOpacity(theme.colors.text, 0.22)
        : theme.colors.primary,
      saveBorder: isDark
        ? colorWithOpacity(theme.colors.text, 0.18)
        : colorWithOpacity(theme.colors.primaryDark ?? theme.colors.primary, 0.65),
      saveText: isDark ? theme.colors.text : theme.colors.onPrimary ?? '#FFFFFF',
    }),
    [
      isDark,
      theme.colors.primary,
      theme.colors.primaryDark,
      theme.colors.surface,
      theme.colors.text,
      theme.colors.textSecondary,
      theme.colors.onPrimary,
    ]
  );

  const handleSave = () => {
    if (pendingDifficulty !== difficultyLevel) {
      onSelectDifficulty(pendingDifficulty);
    }
    if (pendingSpeech !== speechSpeed) {
      onSelectSpeechSpeed(pendingSpeech);
    }
    if (pendingEnglish !== showEnglishSubtitles) {
      onToggleEnglish();
    }
    if (pendingRussian !== showRussianSubtitles) {
      onToggleRussian();
    }
    if (pendingAdult !== showAdultContent) {
      onToggleAdult();
    }
    onClose();
  };

  if (!isMounted) return null;

  const renderOptionGroup = <T extends string>(
    label: string,
    options: Option<T>[],
    selected: T,
    onSelect: (value: T) => void,
  ) => (
    <View style={styles.section}>
      <Typography variant="caption" style={[styles.sectionLabel, { color: ui.sectionLabel }]}>
        {label}
      </Typography>
      <View style={styles.chipRow}>
        {options.map((option) => {
          const isActive = selected === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.chip,
                { backgroundColor: ui.chipBg },
                isActive && [styles.chipActive, { backgroundColor: ui.chipActiveBg, borderColor: ui.chipActiveBorder }],
              ]}
              activeOpacity={0.85}
              onPress={() => onSelect(option.value)}
            >
            <Typography
              variant="body"
              style={[styles.chipLabel, { color: ui.title }, isActive && styles.chipLabelActive]}
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
    value: boolean,
    onToggle: (next: boolean) => void,
  ) => (
    <View style={styles.toggleRow}>
      <View style={styles.toggleTextWrapper}>
        <Typography variant="body" style={[styles.toggleLabel, { color: ui.toggleLabel }]}>
          {label}
        </Typography>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        thumbColor={value ? theme.colors.primary : colorWithOpacity(theme.colors.textSecondary, 0.6)}
        trackColor={{
          false: colorWithOpacity(theme.colors.text, isDark ? 0.18 : 0.15),
          true: colorWithOpacity(theme.colors.primary, isDark ? 0.35 : 0.28),
        }}
      />
    </View>
  );

  return (
    <Modal statusBarTranslucent animationType="none" transparent visible={visible}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={[styles.backdrop, { backgroundColor: ui.backdrop }]} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[
            styles.sheet,
            {
              backgroundColor: ui.sheetBg,
              paddingBottom: insets.bottom + 20,
              transform: [{ translateY }],
              height: sheetHeight + insets.bottom + 20,
            },
          ]}
        >
          <View style={[styles.handle, { backgroundColor: ui.handle }]} />

          <View style={styles.content}>
            <View style={styles.topBlocks}>
              {renderOptionGroup('Уровень языка', difficultyOptions, pendingDifficulty, setPendingDifficulty)}
              {renderOptionGroup('Скорость речи', speechOptions, pendingSpeech, setPendingSpeech)}

              <View style={[styles.divider, { backgroundColor: ui.divider }]} />

              <View style={styles.toggleGroup}>
                {renderToggleRow('Английские субтитры', pendingEnglish, setPendingEnglish)}
                {renderToggleRow('Русские субтитры', pendingRussian, setPendingRussian)}
                {renderToggleRow('Показывать 18+ видео', pendingAdult, setPendingAdult)}
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                { backgroundColor: ui.saveBg, borderColor: ui.saveBorder },
              ]}
              onPress={handleSave}
            >
              <Typography variant="button" style={[styles.saveButtonLabel, { color: ui.saveText }]}>
                Сохранить
              </Typography>
            </TouchableOpacity>
          </View>
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
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sheet: {
    backgroundColor: '#0A0D16',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 12,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topBlocks: {
    gap: 14,
  },
  section: {
    marginTop: 14,
    alignItems: 'flex-start',
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.55)',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.35,
    textAlign: 'left',
    fontSize: 14,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  toggleGroup: {
    gap: 10,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: 'transparent',
  },
  chipActive: {
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
  },
  chipLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  chipLabelActive: {
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    marginVertical: 16,
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
    fontSize: 17,
    fontWeight: '600',
  },
  toggleDescription: {
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    fontSize: 13,
  },
  saveButton: {
    marginTop: 18,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveButtonLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
});


