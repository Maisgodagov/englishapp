import { memo } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from 'styled-components/native';

import { Input, TextButton, Typography } from '@shared/ui';

import {
  type LessonBlockCallout,
  type LessonBlockEmbed,
  type LessonBlockList,
  type LessonBlockMedia,
  type LessonBlockQuiz,
  type LessonBlockText,
  type LessonContentBlock,
} from '../model/types';

interface LessonBlockEditorProps {
  block: LessonContentBlock;
  onChange: (block: LessonContentBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

const FORMAT_OPTIONS: { label: string; value: NonNullable<LessonBlockText['format']> }[] = [
  { label: 'Параграф', value: 'paragraph' },
  { label: 'Заголовок 1', value: 'heading1' },
  { label: 'Заголовок 2', value: 'heading2' },
  { label: 'Цитата', value: 'quote' },
];

const ALIGN_OPTIONS: { label: string; value: NonNullable<LessonBlockText['align']> }[] = [
  { label: 'Слева', value: 'left' },
  { label: 'По центру', value: 'center' },
  { label: 'Справа', value: 'right' },
];

const MEDIA_TYPES: { label: string; value: LessonBlockMedia['mediaType'] }[] = [
  { label: 'Изображение', value: 'image' },
  { label: 'Видео', value: 'video' },
  { label: 'Аудио', value: 'audio' },
];

const CALLOUT_VARIANTS: { label: string; value: NonNullable<LessonBlockCallout['variant']> }[] = [
  { label: 'Инфо', value: 'info' },
  { label: 'Успех', value: 'success' },
  { label: 'Внимание', value: 'warning' },
  { label: 'Опасность', value: 'danger' },
];

const ActionChip = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => {
  const theme = useTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? theme.colors.primary : theme.colors.surfaceAlt ?? theme.colors.surface,
          borderColor: active ? theme.colors.primary : theme.colors.border,
        },
      ]}
    >
      <Typography
        variant="body"
        style={{
          color: active ? theme.colors.onPrimary ?? '#fff' : theme.colors.text,
          fontSize: 13,
          fontWeight: active ? '700' : '500',
        }}
      >
        {label}
      </Typography>
    </TouchableOpacity>
  );
};

const LessonBlockEditorComponent = ({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: LessonBlockEditorProps) => {
  const update = (next: LessonContentBlock) => {
    onChange(next);
  };

  const renderToolbar = () => (
    <View style={styles.toolbar}>
      <TextButton onPress={onMoveUp} disabled={!canMoveUp}>
        Вверх
      </TextButton>
      <TextButton onPress={onMoveDown} disabled={!canMoveDown}>
        Вниз
      </TextButton>
      <TextButton onPress={onRemove}>
        Удалить блок
      </TextButton>
    </View>
  );

  switch (block.type) {
    case 'text': {
      const textBlock = block as LessonBlockText;
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Текстовый блок
          </Typography>
          <View style={styles.row}>
            {FORMAT_OPTIONS.map((option) => (
              <ActionChip
                key={option.value}
                label={option.label}
                active={textBlock.format === option.value}
                onPress={() => update({ ...textBlock, format: option.value })}
              />
            ))}
          </View>
          <View style={styles.row}>
            {ALIGN_OPTIONS.map((option) => (
              <ActionChip
                key={option.value}
                label={option.label}
                active={textBlock.align === option.value}
                onPress={() => update({ ...textBlock, align: option.value })}
              />
            ))}
          </View>
          <Input
            label="Текст"
            multiline
            numberOfLines={8}
            value={textBlock.text}
            onChangeText={(text) => update({ ...textBlock, text })}
            placeholder="Введите текст урока..."
          />
        </View>
      );
    }
    case 'media': {
      const mediaBlock = block as LessonBlockMedia;
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Медиа
          </Typography>
          <View style={styles.row}>
            {MEDIA_TYPES.map((option) => (
              <ActionChip
                key={option.value}
                label={option.label}
                active={mediaBlock.mediaType === option.value}
                onPress={() => update({ ...mediaBlock, mediaType: option.value })}
              />
            ))}
          </View>
          <Input
            label="Ссылка на медиа"
            value={mediaBlock.url}
            onChangeText={(url) => update({ ...mediaBlock, url })}
            placeholder="https://..."
          />
          <Input
            label="Подпись (необязательно)"
            value={mediaBlock.caption ?? ''}
            onChangeText={(caption) => update({ ...mediaBlock, caption })}
            placeholder="Комментарий к медиа"
          />
          <View style={styles.row}>
            <ActionChip
              label="Автовоспроизведение"
              active={mediaBlock.autoplay === true}
              onPress={() => update({ ...mediaBlock, autoplay: !mediaBlock.autoplay })}
            />
            <ActionChip
              label="Повтор"
              active={mediaBlock.loop === true}
              onPress={() => update({ ...mediaBlock, loop: !mediaBlock.loop })}
            />
          </View>
        </View>
      );
    }
    case 'quiz': {
      const quizBlock = block as LessonBlockQuiz;
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Тест
          </Typography>
          <Input
            label="Вопрос"
            value={quizBlock.question}
            onChangeText={(question) => update({ ...quizBlock, question })}
            placeholder="Введите вопрос"
          />
          {quizBlock.options.map((option, index) => (
            <View key={`${quizBlock.id}-option-${index}`} style={styles.quizOption}>
              <ActionChip
                label={quizBlock.correctOption === index ? 'Верный ответ' : `Вариант ${index + 1}`}
                active={quizBlock.correctOption === index}
                onPress={() => update({ ...quizBlock, correctOption: index })}
              />
              <Input
                value={option}
                onChangeText={(value) => {
                  const nextOptions = quizBlock.options.slice();
                  nextOptions[index] = value;
                  update({ ...quizBlock, options: nextOptions });
                }}
                placeholder={`Введите вариант ${index + 1}`}
              />
              {quizBlock.options.length > 2 && (
                <TextButton
                  onPress={() => {
                    const nextOptions = quizBlock.options.filter((_, i) => i !== index);
                    const nextCorrect = Math.min(quizBlock.correctOption, nextOptions.length - 1);
                    update({ ...quizBlock, options: nextOptions, correctOption: nextCorrect });
                  }}
                >
                  Удалить вариант
                </TextButton>
              )}
            </View>
          ))}
          <TextButton
            onPress={() => {
              if (quizBlock.options.length >= 6) return;
              update({ ...quizBlock, options: [...quizBlock.options, ''] });
            }}
            disabled={quizBlock.options.length >= 6}
          >
            Добавить вариант
          </TextButton>
          <Input
            label="Пояснение (необязательно)"
            value={quizBlock.explanation ?? ''}
            onChangeText={(explanation) => update({ ...quizBlock, explanation })}
            placeholder="Пояснение к ответу"
            multiline
          />
          <ActionChip
            label="Перемешивать ответы"
            active={quizBlock.shuffleOptions === true}
            onPress={() => update({ ...quizBlock, shuffleOptions: !quizBlock.shuffleOptions })}
          />
        </View>
      );
    }
    case 'callout': {
      const calloutBlock = block as LessonBlockCallout;
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Подсказка
          </Typography>
          <View style={styles.row}>
            {CALLOUT_VARIANTS.map((option) => (
              <ActionChip
                key={option.value}
                label={option.label}
                active={(calloutBlock.variant ?? 'info') === option.value}
                onPress={() => update({ ...calloutBlock, variant: option.value })}
              />
            ))}
          </View>
          <Input
            label="Заголовок"
            value={calloutBlock.title ?? ''}
            onChangeText={(title) => update({ ...calloutBlock, title })}
            placeholder="Например: Совет"
          />
          <Input
            label="Текст"
            value={calloutBlock.body}
            onChangeText={(body) => update({ ...calloutBlock, body })}
            placeholder="Введите текст подсказки"
            multiline
          />
          <Input
            label="Иконка (emoji, необязательно)"
            value={calloutBlock.icon ?? ''}
            onChangeText={(icon) => update({ ...calloutBlock, icon })}
            placeholder="Например: 💡"
          />
        </View>
      );
    }
    case 'list': {
      const listBlock = block as LessonBlockList;
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Список
          </Typography>
          <ActionChip
            label={listBlock.ordered ? 'Нумерованный' : 'Маркированный'}
            active={listBlock.ordered === true}
            onPress={() => update({ ...listBlock, ordered: !listBlock.ordered })}
          />
          <Input
            label="Пункты списка"
            multiline
            numberOfLines={6}
            value={listBlock.items.join('\n')}
            onChangeText={(text) =>
              update({
                ...listBlock,
                items: text
                  .split('\n')
                  .map((line) => line.trim())
                  .filter(Boolean),
              })
            }
            placeholder="Каждая строка будет отдельным пунктом"
          />
        </View>
      );
    }
    case 'embed': {
      const embedBlock = block as LessonBlockEmbed;
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Встроенный контент
          </Typography>
          <Input
            label="URL"
            value={embedBlock.url}
            onChangeText={(url) => update({ ...embedBlock, url })}
            placeholder="https://..."
          />
          <Input
            label="Подпись"
            value={embedBlock.caption ?? ''}
            onChangeText={(caption) => update({ ...embedBlock, caption })}
            placeholder="Описание встроенного блока"
          />
          <Input
            label="Источник (необязательно)"
            value={embedBlock.provider ?? ''}
            onChangeText={(provider) => update({ ...embedBlock, provider })}
            placeholder="YouTube, Vimeo..."
          />
        </View>
      );
    }
    default:
      return (
        <View style={styles.blockContainer}>
          {renderToolbar()}
          <Typography variant="subtitle" style={styles.blockTitle}>
            Неизвестный блок
          </Typography>
        </View>
      );
  }
};

export const LessonBlockEditor = memo(LessonBlockEditorComponent);

const styles = StyleSheet.create({
  blockContainer: {
    paddingVertical: 12,
    gap: 12,
  },
  blockTitle: {
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  quizOption: {
    gap: 8,
  },
});
