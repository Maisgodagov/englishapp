import type { ReactNode } from 'react';
import React, { useMemo, useRef, useContext } from 'react';
import { Text, findNodeHandle, UIManager } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import * as Haptics from 'expo-haptics';
import { WordLookupContext } from '@shared/word-lookup/WordLookupProvider';

export type TypographyVariant = 'title' | 'subtitle' | 'body' | 'caption';

export type TypographyProps = {
  children?: ReactNode;
  variant?: TypographyVariant;
  color?: string;
  align?: 'left' | 'center' | 'right';
  style?: any;
  enableWordLookup?: boolean;
};

const englishWord = /[A-Za-z][A-Za-z\-']*/g;

export const Typography = ({
  children,
  variant = 'body',
  color,
  align = 'left',
  style,
  enableWordLookup = false
}: TypographyProps) => {
  const wordLookupContext = useContext(WordLookupContext);
  const open = wordLookupContext?.open;
  const selectedWord = wordLookupContext?.selectedWord;
  const selectedTokenKey = wordLookupContext?.selectedTokenKey ?? null;

  const textStyle = useMemo(() => {
    const baseStyle: any = {};

    if (color) baseStyle.color = color;
    if (align !== 'left') baseStyle.textAlign = align;

    return [baseStyle, style];
  }, [color, align, style]);

  const content = useMemo(() => {
    if (!enableWordLookup || typeof children !== 'string' || !open) {
      return children;
    }

    const parts: React.ReactNode[] = [];
    const text = children as string;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = englishWord.exec(text))) {
      const word = match[0];
      const startIndex = match.index;
      const tokenKey = `${startIndex}-${word}`;

      if (startIndex > lastIndex) {
        parts.push(text.slice(lastIndex, startIndex));
      }

      parts.push(
        <WordToken
          key={tokenKey}
          word={word}
          onTrigger={open}
          textStyle={textStyle}
          tokenKey={tokenKey}
          selectedTokenKey={selectedTokenKey}
          selectedWord={selectedWord ?? null}
        />
      );

      lastIndex = startIndex + word.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.slice(lastIndex));
    }

    return parts;
  }, [children, enableWordLookup, open, selectedTokenKey, selectedWord, textStyle]);

  return (
    <Text style={textStyle} allowFontScaling={false}>
      {content}
    </Text>
  );
};

const WordToken: React.FC<{
  word: string;
  onTrigger: (word: string, anchor: { x: number; y: number }, tokenKey?: string) => void;
  textStyle: any;
  tokenKey: string;
  selectedTokenKey: string | null;
  selectedWord: string | null;
}> = ({ word, onTrigger, textStyle, tokenKey, selectedTokenKey, selectedWord }) => {
  const textRef = useRef<any>(null);
  const layoutRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const isSelected = selectedTokenKey
    ? selectedTokenKey === tokenKey
    : selectedWord?.toLowerCase() === word.toLowerCase();
  const baseStyles = Array.isArray(textStyle) ? textStyle : [textStyle];

  const measureFallback = () =>
    new Promise<{ x: number; y: number; width: number; height: number } | null>((resolve) => {
      const node = textRef.current;
      const handle = findNodeHandle(node);
      if (!handle) {
        resolve(null);
        return;
      }
      UIManager.measure(
        handle,
        (x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          if (typeof pageX === 'number' && typeof pageY === 'number') {
            resolve({ x: pageX, y: pageY, width, height });
          } else {
            resolve({ x, y, width, height });
          }
        },
      );
    });

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    layoutRef.current = { width, height };
  };

  const triggerLookup = async (event: GestureResponderEvent) => {
    const native = event?.nativeEvent;
    const initialPageX = native?.pageX ?? null;
    const initialPageY = native?.pageY ?? null;
    const initialLocationX = native?.locationX ?? null;
    const initialLocationY = native?.locationY ?? null;
    const { width, height } = layoutRef.current;

    let anchorFromEvent: { x: number; y: number } | null = null;

    if (
      initialPageX !== null &&
      initialPageY !== null &&
      initialLocationX !== null &&
      initialLocationY !== null &&
      width &&
      height
    ) {
      anchorFromEvent = {
        x: initialPageX - initialLocationX + width / 2,
        y: initialPageY - initialLocationY + height,
      };
    } else if (initialPageX !== null && initialPageY !== null) {
      anchorFromEvent = { x: initialPageX, y: initialPageY };
    }

    // Легкая вибрация при открытии попапа
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    let anchorX = anchorFromEvent?.x ?? null;
    let anchorY = anchorFromEvent?.y ?? null;

    if (anchorX == null || anchorY == null) {
      const measured = await measureFallback();
      if (measured) {
        anchorX = measured.x + (measured.width || width || 0) / 2;
        anchorY = measured.y + (measured.height || height || 0);
      }
    }

    if (anchorX == null || anchorY == null) {
      anchorX = initialPageX ?? 0;
      anchorY = initialPageY ?? 0;
    }

    onTrigger(word, { x: anchorX, y: anchorY }, tokenKey);
  };

  return (
    <Text
      ref={textRef}
      style={[
        ...baseStyles,
        isSelected && {
          backgroundColor: '#3B82F6',
          color: '#FFFFFF',
          borderRadius: 4,
          paddingHorizontal: 4,
        },
      ]}
      onLayout={handleLayout}
      onPress={triggerLookup}
    >
      {word}
    </Text>
  );
};
