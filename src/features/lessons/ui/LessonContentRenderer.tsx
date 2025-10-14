import { Linking, StyleSheet, View, Image } from 'react-native';
import { useMemo } from 'react';
import { useTheme } from 'styled-components/native';

import { SurfaceCard, TextButton, Typography } from '@shared/ui';

import type {
  LessonBlockCallout,
  LessonBlockEmbed,
  LessonBlockList,
  LessonBlockMedia,
  LessonBlockQuiz,
  LessonBlockText,
  LessonContent,
  LessonContentBlock,
} from '../model/types';

interface LessonContentRendererProps {
  content: LessonContent;
}

const formatTextStyle = (theme: any, block: LessonBlockText) => {
  const base = {
    color: theme.colors.text,
    textAlign: block.align ?? 'left',
  } as const;

  switch (block.format) {
    case 'heading1':
      return { ...base, fontSize: 26, fontWeight: '700' as const, marginBottom: 8 };
    case 'heading2':
      return { ...base, fontSize: 20, fontWeight: '600' as const, marginBottom: 6 };
    case 'quote':
      return {
        ...base,
        fontStyle: 'italic' as const,
        borderLeftWidth: 3,
        borderLeftColor: theme.colors.primary,
        paddingLeft: 12,
      };
    default:
      return { ...base, fontSize: 16, lineHeight: 22 };
  }
};

const calloutColors = (theme: any, variant: NonNullable<LessonBlockCallout['variant']>) => {
  switch (variant) {
    case 'success':
      return { backgroundColor: theme.colors.success + '15', borderColor: theme.colors.success };
    case 'warning':
      return { backgroundColor: theme.colors.warning + '15', borderColor: theme.colors.warning };
    case 'danger':
      return { backgroundColor: theme.colors.danger + '15', borderColor: theme.colors.danger };
    default:
      return { backgroundColor: theme.colors.primary + '10', borderColor: theme.colors.primary };
  }
};

const openLink = async (url: string) => {
  const canOpen = await Linking.canOpenURL(url);
  if (canOpen) {
    await Linking.openURL(url);
  }
};

const renderBlock = (theme: any, block: LessonContentBlock) => {
  switch (block.type) {
    case 'text': {
      const textBlock = block as LessonBlockText;
      return (
        <Typography key={block.id} variant="body" style={formatTextStyle(theme, textBlock)}>
          {textBlock.text}
        </Typography>
      );
    }
    case 'media': {
      const mediaBlock = block as LessonBlockMedia;
      if (mediaBlock.mediaType === 'image') {
        return (
          <View key={block.id} style={styles.mediaContainer}>
            <Image source={{ uri: mediaBlock.url }} style={styles.image} resizeMode="cover" />
            {mediaBlock.caption && (
              <Typography variant="caption" style={styles.caption}>
                {mediaBlock.caption}
              </Typography>
            )}
          </View>
        );
      }

      const mediaLabel = mediaBlock.mediaType === 'video' ? 'Видео' : 'Аудио';
      return (
        <SurfaceCard key={block.id} padded style={styles.mediaCard}>
          <Typography variant="subtitle" style={styles.blockTitle}>
            {mediaLabel}
          </Typography>
          <Typography variant="body" style={styles.blockDescription}>
            Запустите проигрывание по ссылке ниже.
          </Typography>
          <TextButton onPress={() => openLink(mediaBlock.url)}>Открыть {mediaLabel.toLowerCase()}</TextButton>
          {mediaBlock.caption && (
            <Typography variant="caption" style={styles.caption}>
              {mediaBlock.caption}
            </Typography>
          )}
        </SurfaceCard>
      );
    }
    case 'quiz': {
      const quizBlock = block as LessonBlockQuiz;
      return (
        <SurfaceCard key={block.id} padded style={styles.quizCard}>
          <Typography variant="subtitle" style={styles.blockTitle}>
            {quizBlock.question}
          </Typography>
          <View style={styles.quizOptions}>
            {quizBlock.options.map((option, index) => (
              <SurfaceCard
                key={`${block.id}-${index}`}
                padded
                style={[
                  styles.quizOption,
                  index === quizBlock.correctOption && { borderColor: theme.colors.success },
                ]}
              >
                <Typography variant="body">{option}</Typography>
                {index === quizBlock.correctOption && (
                  <Typography variant="caption" style={{ color: theme.colors.success }}>
                    Правильный ответ
                  </Typography>
                )}
              </SurfaceCard>
            ))}
          </View>
          {quizBlock.explanation && (
            <Typography variant="caption" style={styles.caption}>
              Пояснение: {quizBlock.explanation}
            </Typography>
          )}
        </SurfaceCard>
      );
    }
    case 'callout': {
      const calloutBlock = block as LessonBlockCallout;
      const colors = calloutColors(theme, calloutBlock.variant ?? 'info');
      return (
        <SurfaceCard
          key={block.id}
          padded
          style={[styles.calloutCard, { borderColor: colors.borderColor, backgroundColor: colors.backgroundColor }]}
        >
          <View style={styles.calloutHeader}>
            {calloutBlock.icon && (
              <Typography variant="title" style={styles.calloutIcon}>
                {calloutBlock.icon}
              </Typography>
            )}
            {calloutBlock.title && (
              <Typography variant="subtitle" style={styles.blockTitle}>
                {calloutBlock.title}
              </Typography>
            )}
          </View>
          <Typography variant="body">{calloutBlock.body}</Typography>
        </SurfaceCard>
      );
    }
    case 'list': {
      const listBlock = block as LessonBlockList;
      return (
        <View key={block.id} style={styles.listContainer}>
          {listBlock.items.map((item, index) => (
            <View key={`${block.id}-${index}`} style={styles.listItem}>
              <Typography variant="body" style={styles.listMarker}>
                {listBlock.ordered ? `${index + 1}.` : '•'}
              </Typography>
              <Typography variant="body" style={styles.listText}>
                {item}
              </Typography>
            </View>
          ))}
        </View>
      );
    }
    case 'embed': {
      const embedBlock = block as LessonBlockEmbed;
      return (
        <SurfaceCard key={block.id} padded>
          <Typography variant="subtitle" style={styles.blockTitle}>
            Встроенный контент
          </Typography>
          <TextButton onPress={() => openLink(embedBlock.url)}>Открыть ссылку</TextButton>
          {embedBlock.caption && (
            <Typography variant="caption" style={styles.caption}>
              {embedBlock.caption}
            </Typography>
          )}
          {embedBlock.provider && (
            <Typography variant="caption" style={styles.caption}>
              Источник: {embedBlock.provider}
            </Typography>
          )}
        </SurfaceCard>
      );
    }
    default:
      return null;
  }
};

export const LessonContentRenderer = ({ content }: LessonContentRendererProps) => {
  const theme = useTheme();
  const blocks = useMemo(() => content.blocks ?? [], [content.blocks]);

  return <View style={styles.container}>{blocks.map((block) => renderBlock(theme, block))}</View>;
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  blockTitle: {
    marginBottom: 6,
  },
  blockDescription: {
    marginBottom: 8,
  },
  caption: {
    color: '#6B7280',
  },
  mediaContainer: {
    gap: 6,
  },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  mediaCard: {
    gap: 8,
  },
  quizCard: {
    gap: 12,
  },
  quizOptions: {
    gap: 8,
  },
  quizOption: {
    gap: 4,
  },
  calloutCard: {
    gap: 8,
  },
  calloutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calloutIcon: {
    marginRight: 4,
  },
  listContainer: {
    gap: 6,
  },
  listItem: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  listMarker: {
    width: 18,
  },
  listText: {
    flex: 1,
  },
});
