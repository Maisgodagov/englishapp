import type { ReactNode } from 'react';
import React, { useMemo, useRef, useContext } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WordLookupContext } from '@shared/word-lookup/WordLookupProvider';
import { useTheme } from 'styled-components/native';

export type TypographyVariant = 'title' | 'subtitle' | 'body' | 'caption';

export type TypographyProps = {
  children?: ReactNode;
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  style?: object;
  enableWordLookup?: boolean;
};

const englishWord = /[A-Za-z][A-Za-z\-']*/g;


export const Typography = ({
  children,
  variant = 'body',
  color,
  align = 'left',
  style,
  enableWordLookup = true
}: TypographyProps) => {
  const wordLookupContext = useContext(WordLookupContext);
  const open = wordLookupContext?.open;
  const theme = useTheme();

  const styles = getStyles(theme);

  const content = useMemo(() => {
    if (!enableWordLookup || typeof children !== 'string' || !open) return children;
    const parts: React.ReactNode[] = [];
    const text = children as string;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = englishWord.exec(text))) {
      const [w] = m;
      const start = m.index;
      if (start > last) parts.push(text.slice(last, start));
      const word = w;
      parts.push(<WordToken key={`${start}-${word}`} word={word} onLongPress={open} styles={styles} />);
      last = start + w.length;
    }
    if (last < text.length) parts.push(text.slice(last));
    return parts;
  }, [children, enableWordLookup, open, styles]);
  const textStyle = [
    styles[variant],
    color && { color },
    align !== 'left' && { textAlign: align },
    style,
  ];

  return (
    <Text style={textStyle}>
      {content}
    </Text>
  );
};

const WordToken: React.FC<{ word: string; onLongPress: (word: string, anchor: { x: number; y: number }) => void; styles: any }>
  = ({ word, onLongPress, styles }) => {
    const ref = useRef<View>(null);
    const hapticTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const handlePressIn = () => {
      // Первая вибрация через 0.15 сек после начала зажатия
      hapticTimeoutRef.current = setTimeout(async () => {
        try {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } catch (error) {
          // Игнорируем ошибки вибрации
        }
      }, 150);
    };

    const handlePressOut = () => {
      // Отменяем первую вибрацию если отпустили до долгого нажатия
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
        hapticTimeoutRef.current = null;
      }
    };

    const handleLongPress = async () => {
      // Отменяем первую вибрацию, так как она уже сработала
      if (hapticTimeoutRef.current) {
        clearTimeout(hapticTimeoutRef.current);
        hapticTimeoutRef.current = null;
      }

      // Вторая вибрация при открытии попапа
      try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch (error) {
        // Игнорируем ошибки вибрации
      }

      ref.current?.measureInWindow((x, y, w, h) => {
        onLongPress(word, { x: x + w / 2, y });
      });
    };

    return (
      <Pressable
        ref={ref}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onLongPress={handleLongPress}
        delayLongPress={700}
      >
        <Text style={styles.inline}>{word}</Text>
      </Pressable>
    );
  };

const getStyles = (theme: any) => StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.text,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.text,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    color: theme.colors.text,
  },
  caption: {
    fontSize: 14,
    fontWeight: '400',
    color: theme.colors.textSecondary,
  },
  inline: {
    textDecorationLine: 'none',
  },
});
