import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Carousel from 'react-native-reanimated-carousel';

import { useAppSelector } from '@core/store/hooks';
import type { AppTheme } from '@shared/theme/theme';
import { PrimaryButton, Typography } from '@shared/ui';
import {
  type PhraseSnippet,
  type PhraseSearchResponse,
  videoLearningApi,
} from '@features/video-learning/api/videoLearningApi';
import { SCREEN_WIDTH, WINDOW_HEIGHT } from '@shared/utils/dimensions';
import { useVideoDataUsageTracker } from '../model/videoDataUsageTracker';

const VIDEO_WIDTH = SCREEN_WIDTH * 0.88;
const VIDEO_HEIGHT = WINDOW_HEIGHT * 0.55;

const DEFAULT_LIMIT = 6;

interface VideoCardProps {
  snippet: PhraseSnippet;
  phrase: string;
  theme: AppTheme;
  isActive: boolean;
}

const VideoCard = React.memo(({ snippet, phrase, theme, isActive }: VideoCardProps) => {
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isReady, setIsReady] = React.useState(false);
  const videoRef = React.useRef<Video>(null);
  const isPlayingRef = React.useRef(false);

  // No need to extract these - use snippet properties directly to avoid unnecessary dependencies
  const shouldLoad = isActive;

  const dataUsageTracker = useVideoDataUsageTracker({
    enabled: shouldLoad,
    contentId: snippet.id,
  });

  // OPTIMIZATION: Memoize video source to prevent recreation
  const videoSource = React.useMemo(
    () => snippet.videoUrl.includes('.m3u8')
      ? { uri: snippet.videoUrl, type: 'm3u8' as const }
      : { uri: snippet.videoUrl },
    [snippet.videoUrl]
  );

  // OPTIMIZATION: Memoize bufferConfig to prevent Video component recreation
  const bufferConfig = React.useMemo(
    () => ({
      minBufferMs: 2000,
      maxBufferMs: 3000,  // Even smaller for short snippets
      bufferForPlaybackMs: 1000,
      bufferForPlaybackAfterRebufferMs: 1500,
    }),
    []
  );

  const handleLoad = React.useCallback(
    (data: OnLoadData) => {
      console.log(`[PhraseSearch ${snippet.id}] ✅ Video loaded:`, {
        duration: Math.floor(data.duration),
        startSeconds: snippet.startSeconds,
        endSeconds: snippet.endSeconds,
      });
      dataUsageTracker.handleLoad(data);
      setIsReady(true);
    },
    [dataUsageTracker, snippet.id, snippet.startSeconds, snippet.endSeconds]
  );

  const handleProgress = React.useCallback(
    (data: OnProgressData) => {
      dataUsageTracker.handleProgress(data);

      if (data.currentTime >= snippet.endSeconds && isPlayingRef.current) {
        console.log(`[PhraseSearch ${snippet.id}] ⏹️ Reached end of snippet`);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    },
    [dataUsageTracker, snippet.endSeconds, snippet.id]
  );

  const handleError = React.useCallback((error: any) => {
    console.error(`[PhraseSearch ${snippet.id}] ❌ Video error:`, error);
  }, [snippet.id]);

  React.useEffect(() => {
    if (!isReady) {
      return;
    }

    if (isActive) {
      videoRef.current?.seek(snippet.startSeconds);
      setIsPlaying(true);
      isPlayingRef.current = true;
    } else {
      setIsPlaying(false);
      isPlayingRef.current = false;
    }
  }, [isActive, isReady, snippet.startSeconds]);

  React.useEffect(() => {
    if (!shouldLoad) {
      setIsPlaying(false);
      setIsReady(false);
      isPlayingRef.current = false;
    }
  }, [shouldLoad]);

  const handlePlayPause = React.useCallback(() => {
    if (!isReady || !isActive) {
      return;
    }

    setIsPlaying((prev) => {
      const next = !prev;
      isPlayingRef.current = next;
      return next;
    });
  }, [isActive, isReady]);

  const highlightPhrase = (text: string) => {
    if (!phrase || !text) return <Text style={styles.subtitleText}>{text}</Text>;

    const escapedPhrase = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(\\b${escapedPhrase}\\b)`, 'gi');
    const parts = text.split(regex);

    return (
      <Text style={styles.subtitleText}>
        {parts.map((part, index) => {
          const isMatch = part.toLowerCase() === phrase.toLowerCase();
          return (
            <Text
              key={index}
              style={[
                styles.subtitleText,
                isMatch && {
                  color: '#FFD700',
                  fontWeight: '700',
                  backgroundColor: 'rgba(255, 215, 0, 0.2)',
                },
              ]}
            >
              {part}
            </Text>
          );
        })}
      </Text>
    );
  };

  return (
    <View style={styles.videoCard}>
      <View style={styles.videoWrapper}>
        <Pressable onPress={handlePlayPause} style={styles.videoContainer}>
          {shouldLoad ? (
            <Video
              ref={videoRef}
              source={videoSource}  // OPTIMIZATION: Use memoized source
              style={styles.video}
              resizeMode="cover"
              repeat={false}
              paused={!isPlaying || !isActive}
              volume={1}
              muted={false}
              playInBackground={false}
              playWhenInactive={false}
              preventsDisplaySleepDuringVideoPlayback={true}
              maxBitRate={2000000}  // Limit to 2 Mbps (~720p) to save bandwidth
              bufferConfig={bufferConfig}  // OPTIMIZATION: Use memoized config
              onLoad={handleLoad}
              onProgress={handleProgress}
              onBandwidthUpdate={dataUsageTracker.handleBandwidthUpdate}
              onError={handleError}  // OPTIMIZATION: Use memoized handler
            />
          ) : (
            <View style={[styles.video, { backgroundColor: '#000' }]} />
          )}

          {snippet.contextText && (
            <View style={styles.subtitleOverlay}>
              <View style={styles.subtitleBox}>{highlightPhrase(snippet.contextText)}</View>
            </View>
          )}

          {shouldLoad && !isReady && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          {/* Кнопка play только когда на паузе и карточка активна */}
          {isReady && !isPlaying && isActive && (
            <View style={styles.playOverlay}>
              <View style={styles.playButton}>
                <Text style={styles.playButtonText}>▶</Text>
              </View>
            </View>
          )}

          {/* Показываем иконку паузы при наведении когда видео играет */}
          {isReady && isPlaying && isActive && (
            <View style={styles.playingOverlay}>
              <View style={styles.pauseButton}>
                <Text style={styles.pauseButtonText}>❚❚</Text>
              </View>
            </View>
          )}
        </Pressable>
      </View>

      <View style={styles.infoContainer}>
        <Text style={[styles.phraseLabel, { color: theme.colors.textSecondary }]}>
          Найденная фраза:
        </Text>
        <Text style={[styles.phraseText, { color: theme.colors.text }]}>
          &quot;{snippet.matchedText}&quot;
        </Text>
      </View>
    </View>
  );
});

VideoCard.displayName = 'VideoCard';

export const PhraseSearch = () => {
  const theme = useTheme() as AppTheme;
  const userId = useAppSelector((state) => state.user.profile?.id ?? null);

  const [phrase, setPhrase] = useState('');
  const [limitText, setLimitText] = useState(String(DEFAULT_LIMIT));
  const [snippets, setSnippets] = useState<PhraseSnippet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const carouselRef = useRef<any>(null);

  const performSearch = async () => {
    const trimmed = phrase.trim();
    if (!trimmed) {
      setError('Введите фразу для поиска');
      return;
    }

    const limit = Math.max(1, Math.min(50, parseInt(limitText) || DEFAULT_LIMIT));

    setLoading(true);
    setError(null);

    try {
      const response: PhraseSearchResponse = await videoLearningApi.searchPhrase(
        trimmed,
        limit,
        userId ?? undefined,
      );
      setSnippets(response.items);
      setActiveIndex(0); // Сброс на первый элемент при новом поиске
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Не удалось выполнить поиск';
      setError(message);
      setSnippets([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.form}>
        <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Фраза</Text>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              color: theme.colors.text,
            },
          ]}
          placeholder="Например: I'm sorry"
          placeholderTextColor={theme.colors.textSecondary}
          value={phrase}
          onChangeText={setPhrase}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={performSearch}
        />

        <View style={styles.limitRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>Лимит</Text>
          <TextInput
            style={[
              styles.limitInput,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={limitText}
            onChangeText={(value) => setLimitText(value.replace(/[^0-9]/g, ''))}
            keyboardType="number-pad"
            placeholder="6"
            placeholderTextColor={theme.colors.textSecondary}
            returnKeyType="done"
          />
        </View>

        <PrimaryButton onPress={performSearch} disabled={loading}>
          Найти
        </PrimaryButton>
      </View>

      {error && <Text style={[styles.errorMessage, { color: theme.colors.danger }]}>{error}</Text>}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : snippets.length === 0 ? (
        <View style={styles.placeholderContainer}>
          <Typography variant="body" align="center" style={{ color: theme.colors.textSecondary }}>
            Найдите нужную фразу, чтобы увидеть подходящие фрагменты.
          </Typography>
        </View>
      ) : (
        <>
          <View style={styles.carouselContainer}>
            <Carousel
              ref={carouselRef}
              width={SCREEN_WIDTH}
              height={VIDEO_HEIGHT + 200}
              data={snippets}
              renderItem={({ item, index }) => (
                <View style={styles.carouselItem}>
                  <VideoCard
                    snippet={item}
                    phrase={phrase}
                    theme={theme}
                    isActive={index === activeIndex}
                  />
                </View>
              )}
              onSnapToItem={(index) => {
                setActiveIndex(index);
              }}
              mode="parallax"
              modeConfig={{
                parallaxScrollingScale: 0.9,
                parallaxScrollingOffset: 50,
              }}
            />
          </View>

          <View style={styles.navigation}>
            <Pressable
              style={[styles.navButton, activeIndex === 0 && styles.navButtonDisabled]}
              onPress={() => {
                if (activeIndex > 0) {
                  carouselRef.current?.prev();
                }
              }}
              disabled={activeIndex === 0}
            >
              <Text style={styles.navButtonText}>← Назад</Text>
            </Pressable>

            <Text style={[styles.pageIndicator, { color: theme.colors.text }]}>
              {activeIndex + 1} / {snippets.length}
            </Text>

            <Pressable
              style={[styles.navButton, activeIndex === snippets.length - 1 && styles.navButtonDisabled]}
              onPress={() => {
                if (activeIndex < snippets.length - 1) {
                  carouselRef.current?.next();
                }
              }}
              disabled={activeIndex === snippets.length - 1}
            >
              <Text style={styles.navButtonText}>Далее →</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  form: {
    gap: 12,
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  limitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  limitInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 70,
    textAlign: 'center',
    fontSize: 16,
  },
  errorMessage: {
    marginBottom: 12,
    fontSize: 14,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  scrollView: {
    flex: 1,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselItem: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCard: {
    marginBottom: 32,
    alignItems: 'center',
  },
  navigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 12,
  },
  navButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    minWidth: 100,
    alignItems: 'center',
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  pageIndicator: {
    fontSize: 16,
    fontWeight: '600',
  },
  videoWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  videoContainer: {
    width: VIDEO_WIDTH,
    height: VIDEO_HEIGHT,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#000',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
    elevation: 6,
  },
  video: {
    width: '100%',
    height: '100%',
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 24,
    paddingTop: 80,
  },
  subtitleBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignSelf: 'center',
    maxWidth: '95%',
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 32,
    color: '#000',
    marginLeft: 4,
  },
  playingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  pauseButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseButtonText: {
    fontSize: 24,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  infoContainer: {
    width: VIDEO_WIDTH,
    marginTop: 16,
    gap: 8,
  },
  phraseLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  phraseText: {
    fontSize: 18,
    fontWeight: '700',
  },
});
