import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
} from 'react-native';
import { useTheme } from 'styled-components/native';
import { useFocusEffect } from '@react-navigation/native';
import Video, { OnLoadData, OnProgressData } from 'react-native-video';
import Carousel from 'react-native-reanimated-carousel';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  useAnimatedStyle,
  withTiming,
  useSharedValue,
  Easing,
} from 'react-native-reanimated';

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
import { detectLanguage } from '@shared/utils/languageDetection';
// Use ML Kit for fast local translation (fallback to MyMemory for better quality)
import { translateEnToRu, getTranslationVariants, clearTranslationCache } from '@shared/services/mlkitTranslator';

// Вертикальное видео 9:16 соотношение, увеличенный размер
const VIDEO_WIDTH = SCREEN_WIDTH * 0.88;
const VIDEO_HEIGHT = VIDEO_WIDTH * (16 / 9);

const DEFAULT_LIMIT = 6;
const DEFAULT_PADDING_SECONDS = 1;
const MAX_PADDING_SECONDS = 10;
const MAX_TRANSLATION_VARIANTS = 1; // Reduced from 5 to 1 for faster search
const VARIANT_SNIPPET_LIMIT = 1;

// Simple in-memory cache for search results
const searchCache = new Map<string, PhraseSearchResponse>();
const MAX_CACHE_SIZE = 50;

const getCacheKey = (phrase: string, limit: number, paddingSeconds: number): string => {
  return `${phrase.trim().toLowerCase()}|${limit}|${paddingSeconds}`;
};

const getFromCache = (key: string): PhraseSearchResponse | undefined => {
  return searchCache.get(key);
};

const setInCache = (key: string, value: PhraseSearchResponse): void => {
  if (searchCache.size >= MAX_CACHE_SIZE) {
    // Remove oldest entry
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
  searchCache.set(key, value);
};

interface VideoCardProps {
  snippet: PhraseSnippet;
  phrase: string;
  highlightPhrase?: string;
  theme: AppTheme;
  isActive: boolean;
  isScreenFocused: boolean;
  onPlaybackReady?: () => void;
}

interface VariantSnippetResult {
  variant: string;
  snippet: PhraseSnippet | null;
}

const VideoCard = React.memo(({ snippet, phrase, highlightPhrase, theme, isActive, isScreenFocused, onPlaybackReady }: VideoCardProps) => {
  const [isReady, setIsReady] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);
  const [showEnglish, setShowEnglish] = React.useState(true);
  const [showRussian, setShowRussian] = React.useState(true);
  const videoRef = React.useRef<Video>(null);
  const hasInitializedRef = React.useRef(false);
  const loopCheckIntervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const hasReportedPlaybackRef = React.useRef(false);

  const dataUsageTracker = useVideoDataUsageTracker({
    enabled: isActive,
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
      minBufferMs: 1500,
      maxBufferMs: 2500,
      bufferForPlaybackMs: 800,
      bufferForPlaybackAfterRebufferMs: 1200,
    }),
    []
  );

  const handleLoad = React.useCallback(
    (data: OnLoadData) => {
      dataUsageTracker.handleLoad(data);
      setIsReady(true);

      // Seek to start position immediately on load
      if (isActive && isScreenFocused && !hasInitializedRef.current) {
        hasInitializedRef.current = true;
        // Use setTimeout to ensure video is ready
        setTimeout(() => {
          videoRef.current?.seek(snippet.startSeconds);
        }, 100);
      }
    },
    [dataUsageTracker, isActive, isScreenFocused, snippet.startSeconds]
  );

  const handleProgress = React.useCallback(
    (data: OnProgressData) => {
      dataUsageTracker.handleProgress(data);

      // Loop logic: check if we've passed the end time
      if (isActive && isScreenFocused && data.currentTime >= snippet.endSeconds) {
        videoRef.current?.seek(snippet.startSeconds);
      }
    },
    [dataUsageTracker, snippet.endSeconds, snippet.startSeconds, isActive, isScreenFocused]
  );

  const handleError = React.useCallback((error: any) => {
    console.error(`[PhraseSearch ${snippet.id}] вќЊ Video error:`, error);
    setHasError(true);
    setIsReady(false);
  }, [snippet.id]);

  // Reset state when snippet changes
  React.useEffect(() => {
    setIsReady(false);
    setHasError(false);
    hasInitializedRef.current = false;
    hasReportedPlaybackRef.current = false;
  }, [snippet.id]);

  // Handle active state and screen focus changes
  React.useEffect(() => {
    if (isActive && isScreenFocused && isReady) {
      // Seek to start when becoming active
      videoRef.current?.seek(snippet.startSeconds);
    }

    if (!isActive || !isScreenFocused) {
      // Reset initialization flag when becoming inactive or screen loses focus
      hasInitializedRef.current = false;
    }
  }, [isActive, isScreenFocused, isReady, snippet.startSeconds]);

  React.useEffect(() => {
    if (isActive && isScreenFocused && isReady && !hasReportedPlaybackRef.current) {
      hasReportedPlaybackRef.current = true;
      onPlaybackReady?.();
    }
  }, [isActive, isScreenFocused, isReady, onPlaybackReady]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (loopCheckIntervalRef.current) {
        clearInterval(loopCheckIntervalRef.current);
      }
    };
  }, []);

  const handlePlayPause = React.useCallback(() => {
    if (!isReady || !isActive) {
      return;
    }
    // Note: We removed manual play/pause state as it conflicts with paused prop
    // Video is controlled by isActive prop only
  }, [isActive, isReady]);

  const toggleEnglish = React.useCallback(() => {
    setShowEnglish(prev => !prev);
  }, []);

  const toggleRussian = React.useCallback(() => {
    setShowRussian(prev => !prev);
  }, []);

  const highlightedEnglish = React.useMemo(() => {
    const text = snippet.contextText;
    const targetPhrase = highlightPhrase || phrase;
    if (!targetPhrase || !text) return <Text style={styles.subtitleText}>{text}</Text>;

    const normalize = (value: string) =>
      value
        .toLowerCase()
        .replace(/\u2019/g, "'")
        .replace(/['',]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const sanitizedTokens = targetPhrase
      .trim()
      .split(/\s+/)
      .map((token) => normalize(token))
      .filter((token) => token.length > 0);

    if (!sanitizedTokens.length) {
      return <Text style={styles.subtitleText}>{text}</Text>;
    }

    const buildTokenPattern = (token: string) => {
      const chars = token.split('');
      if (!chars.length) return '';
      return chars
        .map((char, index) => {
          const escaped = escapeRegex(char);
          return index === chars.length - 1 ? escaped : `${escaped}['',]?`;
        })
        .join('');
    };

    const tokenPatterns = sanitizedTokens
      .map((token) => buildTokenPattern(token))
      .filter((pattern) => pattern.length > 0);

    if (!tokenPatterns.length) {
      return <Text style={styles.subtitleText}>{text}</Text>;
    }

    const normalizedTarget = sanitizedTokens.join(' ');
    const pattern = tokenPatterns.join('\\s+');
    const regex = new RegExp(`(${pattern})`, 'gi');
    const parts = text.split(regex);

    return (
      <Text style={styles.subtitleText}>
        {parts.map((part, index) => {
          if (!part) return null;
          const isMatch = normalize(part) === normalizedTarget;
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
  }, [snippet.contextText, highlightPhrase, phrase]);

  return (
    <View style={styles.videoCard}>
      <View style={styles.videoWrapper}>
        <Pressable onPress={handlePlayPause} style={styles.videoContainer}>
          {isActive && isScreenFocused ? (
            <Video
              ref={videoRef}
              source={videoSource}
              style={styles.video}
              resizeMode="cover"
              repeat={false}
              paused={false}
              volume={1}
              muted={false}
              playInBackground={false}
              playWhenInactive={false}
              preventsDisplaySleepDuringVideoPlayback={true}
              maxBitRate={2000000}
              bufferConfig={bufferConfig}
              onLoad={handleLoad}
              onProgress={handleProgress}
              onBandwidthUpdate={dataUsageTracker.handleBandwidthUpdate}
              onError={handleError}
              progressUpdateInterval={250}
              ignoreSilentSwitch="ignore"
            />
          ) : (
            <View style={[styles.video, { backgroundColor: '#000' }]} />
          )}

          {/* Subtitle controls */}
          <View style={styles.subtitleControls}>
            <Pressable
              style={[
                styles.subtitleButton,
                { backgroundColor: showEnglish ? 'rgba(255, 255, 255, 0.9)' : 'rgba(128, 128, 128, 0.6)' },
              ]}
              onPress={toggleEnglish}
            >
              <Text style={[styles.subtitleButtonText, { color: showEnglish ? '#000' : '#FFF' }]}>
                EN
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.subtitleButton,
                { backgroundColor: showRussian ? 'rgba(255, 255, 255, 0.9)' : 'rgba(128, 128, 128, 0.6)' },
              ]}
              onPress={toggleRussian}
            >
              <Text style={[styles.subtitleButtonText, { color: showRussian ? '#000' : '#FFF' }]}>
                RU
              </Text>
            </Pressable>
          </View>

          {(snippet.contextText || snippet.translationContextText) && (
            <View style={styles.subtitleOverlay}>
              {snippet.contextText && showEnglish ? (
                <View style={styles.subtitleEnglishBox}>{highlightedEnglish}</View>
              ) : null}
              {snippet.translationContextText && showRussian ? (
                <View style={styles.subtitleRussianBox}>
                  <Text style={styles.subtitleTranslationText}>{snippet.translationContextText}</Text>
                </View>
              ) : null}
            </View>
          )}

          {isActive && isScreenFocused && !isReady && !hasError && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FFFFFF" />
            </View>
          )}

          {hasError && (
            <View style={styles.errorOverlay}>
              <Ionicons name="alert-circle-outline" size={48} color="#FF6B6B" />
              <Text style={styles.errorText}>Не удалось загрузить видео</Text>
              <Text style={styles.errorSubtext}>Проверьте подключение к сети</Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.snippet.id === nextProps.snippet.id &&
      prevProps.isActive === nextProps.isActive &&
      prevProps.phrase === nextProps.phrase &&
      prevProps.highlightPhrase === nextProps.highlightPhrase &&
      prevProps.isScreenFocused === nextProps.isScreenFocused &&
      prevProps.onPlaybackReady === nextProps.onPlaybackReady
  );
});

VideoCard.displayName = 'VideoCard';

interface CarouselIndicatorProps {
  total: number;
  activeIndex: number;
  activeIndexShared: Animated.SharedValue<number>;
  theme: AppTheme;
}

const DotIndicator = ({
  index,
  activeIndexShared,
  theme
}: {
  index: number;
  activeIndexShared: Animated.SharedValue<number>;
  theme: AppTheme;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const distance = Math.abs(activeIndexShared.value - index);
    const isActive = distance < 0.5;
    const targetWidth = isActive ? 24 : 8;

    return {
      width: withTiming(targetWidth, {
        duration: 200,
        easing: Easing.out(Easing.ease),
      }),
      backgroundColor: isActive ? theme.colors.primary : theme.colors.border,
    };
  });

  return <Animated.View style={[styles.indicatorDot, animatedStyle]} />;
};

const CarouselIndicator = React.memo(({ total, activeIndexShared, theme }: CarouselIndicatorProps) => {
  if (total <= 1) return null;

  return (
    <View style={styles.indicatorContainer}>
      {Array.from({ length: total }).map((_, index) => (
        <DotIndicator key={index} index={index} activeIndexShared={activeIndexShared} theme={theme} />
      ))}
    </View>
  );
});

CarouselIndicator.displayName = 'CarouselIndicator';

export const PhraseSearch = () => {
  const theme = useTheme() as AppTheme;
  const userId = useAppSelector((state) => state.user.profile?.id ?? null);

  const [phrase, setPhrase] = useState('');
  const [snippets, setSnippets] = useState<PhraseSnippet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [translation, setTranslation] = useState<string>('');
  const [snippetTranslations, setSnippetTranslations] = useState<string[]>([]);
  const [noVideoFound, setNoVideoFound] = useState(false);
  const [detectedLang, setDetectedLang] = useState<'en' | 'ru' | 'unknown'>('unknown');
  const [searchTimestamp, setSearchTimestamp] = useState<number | null>(null);
  const [playbackLatencyMs, setPlaybackLatencyMs] = useState<number | null>(null);

  const carouselRef = useRef<any>(null);
  const activeIndexShared = useSharedValue(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const playbackReportedRef = useRef(false);
  const currentSearchTokenRef = useRef<symbol | null>(null);

  const handleClear = useCallback(() => {
    setPhrase('');
    setSnippets([]);
    setSnippetTranslations([]);
    setTranslation('');
    setNoVideoFound(false);
    setError(null);
    setDetectedLang('unknown');
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSearchTimestamp(null);
    setPlaybackLatencyMs(null);
    playbackReportedRef.current = false;
    currentSearchTokenRef.current = null;
    // Clear translation cache to remove incorrect translations
    clearTranslationCache();
    searchCache.clear();
  }, []);

  const handleSnippetPlaybackReady = useCallback(() => {
    if (playbackReportedRef.current || searchTimestamp == null) {
      return;
    }
    playbackReportedRef.current = true;
    setPlaybackLatencyMs(Date.now() - searchTimestamp);
    setSearchTimestamp(null);
  }, [searchTimestamp]);

  // Handle screen focus/blur to pause videos when switching tabs
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
      };
    }, [])
  );

  // Auto-calculate padding based on phrase word count
  const calculatePadding = useCallback((phraseText: string): number => {
    const wordCount = phraseText.trim().split(/\s+/).filter(w => w.length > 0).length;

    if (wordCount <= 2) {
      return 3; // 1-2 words: 3 seconds
    } else if (wordCount <= 4) {
      return 2; // 3-4 words: 2 seconds
    } else {
      return 1; // 5+ words: 1 second
    }
  }, []);

  const performSearch = useCallback(async (searchPhrase?: string) => {
    const currentPhrase = searchPhrase ?? phrase;
    if (typeof currentPhrase !== 'string') {
      return;
    }
    const trimmed = currentPhrase.trim();
    if (!trimmed) {
      setError('Введите фразу для поиска');
      return;
    }

    // Detect language
    const lang = detectLanguage(trimmed);
    setDetectedLang(lang);

    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request and keep a stable reference
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    const searchToken = Symbol('search');
    currentSearchTokenRef.current = searchToken;
    const isLatestSearch = () => currentSearchTokenRef.current === searchToken;

    setLoading(true);
    setError(null);
    setTranslation('');
    setSnippetTranslations([]);
    setNoVideoFound(false);
    setSearchTimestamp(Date.now());
    setPlaybackLatencyMs(null);
    playbackReportedRef.current = false;

    try {
      if (lang === 'ru') {
        // OPTIMIZATION: Start translation immediately without await
        const translationPromise = getTranslationVariants(trimmed, 'ru', 'en', MAX_TRANSLATION_VARIANTS);

        // Wait for translation to complete
        const variants = await translationPromise;
        const uniqueVariants = Array.from(
          new Set(
            variants
              .map((variant) => variant.trim())
              .filter((variant) => variant.length > 0)
          )
        ).slice(0, MAX_TRANSLATION_VARIANTS);

        if (uniqueVariants.length === 0) {
          setSnippets([]);
          setSnippetTranslations([]);
          setTranslation('');
          setActiveIndex(0);
          activeIndexShared.value = 0;
          setNoVideoFound(true);
          setSearchTimestamp(null);
          setPlaybackLatencyMs(null);
          playbackReportedRef.current = false;
          return;
        }

        // OPTIMIZATION: Prepare search requests while translation is still in cache
        const variantMeta = uniqueVariants.map((variant) => {
          const paddingSeconds = calculatePadding(variant);
          return {
            variant,
            paddingSeconds,
            cacheKey: getCacheKey(variant, VARIANT_SNIPPET_LIMIT, paddingSeconds),
          };
        });

        // OPTIMIZATION: Check cache synchronously first
        const snippetIds = new Set<string>();
        const matchedSnippets: PhraseSnippet[] = [];
        const matchedTranslations: string[] = [];
        const pendingVariants: typeof variantMeta = [];

        variantMeta.forEach((meta) => {
          const cachedResult = getFromCache(meta.cacheKey);
          if (cachedResult && cachedResult.items.length > 0) {
            const snippet = cachedResult.items[0];
            if (snippet && !snippetIds.has(snippet.id)) {
              snippetIds.add(snippet.id);
              matchedSnippets.push(snippet);
              matchedTranslations.push(meta.variant);
            }
          } else {
            pendingVariants.push(meta);
          }
        });

        // If we have cached results, show them immediately
        if (matchedSnippets.length > 0 && pendingVariants.length === 0) {
          setSnippets(matchedSnippets);
          setSnippetTranslations(matchedTranslations);
          setLoading(false);
          setTranslation('');
          setActiveIndex(0);
          activeIndexShared.value = 0;
          setNoVideoFound(false);
          return;
        }

        // OPTIMIZATION: Fetch all variants in parallel
        if (pendingVariants.length > 0) {
          const variantResults: VariantSnippetResult[] = await Promise.all(
            pendingVariants.map(async ({ variant, paddingSeconds, cacheKey }) => {
              try {
                const response = await videoLearningApi.searchPhrase(
                  variant,
                  VARIANT_SNIPPET_LIMIT,
                  userId ?? undefined,
                  paddingSeconds,
                  abortController.signal,
                );

                setInCache(cacheKey, response);
                return {
                  variant,
                  snippet: response.items[0] ?? null,
                };
              } catch (variantError) {
                if (variantError instanceof Error && variantError.name === 'AbortError') {
                  throw variantError;
                }
                console.warn(`[PhraseSearch] Search failed for "${variant}":`, variantError);
                return { variant, snippet: null };
              }
            })
          );

          // Add new results to existing cached results
          variantResults.forEach(({ variant, snippet }) => {
            if (snippet && !snippetIds.has(snippet.id) && isLatestSearch()) {
              snippetIds.add(snippet.id);
              matchedSnippets.push(snippet);
              matchedTranslations.push(variant);
            }
          });
        }

        if (matchedSnippets.length > 0) {
          if (isLatestSearch()) {
            setSnippets(matchedSnippets);
            setSnippetTranslations(matchedTranslations);
            setLoading(false);
          }
          setTranslation('');
          setActiveIndex(0);
          activeIndexShared.value = 0;
          setNoVideoFound(false);
        } else {
          setSnippets([]);
          setSnippetTranslations([]);
          setTranslation(uniqueVariants[0]);
          setActiveIndex(0);
          activeIndexShared.value = 0;
          setNoVideoFound(true);
          setSearchTimestamp(null);
          setPlaybackLatencyMs(null);
          playbackReportedRef.current = false;
        }
        return;
      }

      let searchQueries: string[] = [trimmed];
      let translatedText = '';

      if (lang === 'en') {
        translatedText = await translateEnToRu(trimmed);
      }

      setTranslation(translatedText);

      const limit = DEFAULT_LIMIT;

      // Try searching with each query variant until we get results
      let allSnippets: PhraseSnippet[] = [];
      const snippetIds = new Set<string>(); // Track unique snippets

      for (const searchQuery of searchQueries) {
        const paddingSeconds = calculatePadding(searchQuery);

        // Check cache first
        const cacheKey = getCacheKey(searchQuery, limit, paddingSeconds);
        const cachedResult = getFromCache(cacheKey);

        if (cachedResult) {
          // Add unique snippets from cache
          cachedResult.items.forEach(snippet => {
            if (!snippetIds.has(snippet.id)) {
              snippetIds.add(snippet.id);
              allSnippets.push(snippet);
            }
          });

          // If we have enough results from cache, stop searching
          if (allSnippets.length >= limit) {
            break;
          }
          continue;
        }

        try {
          const response: PhraseSearchResponse = await videoLearningApi.searchPhrase(
            searchQuery,
            limit,
            userId ?? undefined,
            paddingSeconds,
            abortController.signal,
          );

          // Store in cache
          setInCache(cacheKey, response);

          // Add unique snippets
          response.items.forEach(snippet => {
            if (!snippetIds.has(snippet.id)) {
              snippetIds.add(snippet.id);
              allSnippets.push(snippet);
            }
          });

          // If we got results, we can stop trying other variants
          // (or continue to get more diverse results - depends on preference)
          if (response.items.length > 0) {
            break;
          }
        } catch (err) {
          // Continue with next variant if this one failed
          console.warn(`[PhraseSearch] Search failed for "${searchQuery}":`, err);
          continue;
        }
      }

      // Set results
      const limitedSnippets = allSnippets.slice(0, limit);
      setSnippets(limitedSnippets);
      setSnippetTranslations([]);
      setActiveIndex(0);
      activeIndexShared.value = 0;
      setNoVideoFound(limitedSnippets.length === 0);
      if (limitedSnippets.length === 0) {
        setSearchTimestamp(null);
        setPlaybackLatencyMs(null);
        playbackReportedRef.current = false;
      }
    } catch (err) {
      // Ignore aborted requests
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РїРѕР»РЅРёС‚СЊ РїРѕРёСЃРє';
      setError(message);
      setSnippets([]);
      setTranslation('');
      setSnippetTranslations([]);
      setNoVideoFound(false);
      setSearchTimestamp(null);
      setPlaybackLatencyMs(null);
      playbackReportedRef.current = false;
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [phrase, userId, activeIndexShared, calculatePadding]);

  // Debounced search on phrase change
  useEffect(() => {
    if (!phrase.trim()) {
      setSnippets([]);
      setSnippetTranslations([]);
      setTranslation('');
      setNoVideoFound(false);
      setError(null);
      setSearchTimestamp(null);
      setPlaybackLatencyMs(null);
      playbackReportedRef.current = false;
      return;
    }

  }, [phrase]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const hasPerSnippetTranslations = snippetTranslations.length > 0;
  const activeTranslationText = hasPerSnippetTranslations
    ? snippetTranslations[Math.min(activeIndex, snippetTranslations.length - 1)] ?? ''
    : translation;
  const shouldShowTranslationBox = Boolean(activeTranslationText);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View
        style={[
          styles.searchForm,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        {/* РџРѕРёСЃРєРѕРІР°СЏ СЃС‚СЂРѕРєР° СЃ РєРЅРѕРїРєРѕР№ */}
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInputWrapper,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.background },
            ]}
          >
            <TextInput
              style={[
                styles.searchInput,
                {
                  color: theme.colors.text,
                },
              ]}
              placeholder="Введите слово или фразу..."
              placeholderTextColor={theme.colors.textSecondary}
              value={phrase}
              onChangeText={setPhrase}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={() => {
                void performSearch();
              }}
            />
            {phrase.length > 0 && (
              <Pressable style={styles.clearButton} onPress={handleClear} hitSlop={10}>
                <Ionicons name="close-circle" size={18} color={theme.colors.textSecondary} />
              </Pressable>
            )}
          </View>

          <Pressable
            style={[
              styles.searchButton,
              { backgroundColor: theme.colors.primary },
              loading && styles.searchButtonDisabled,
            ]}
            onPress={() => {
              void performSearch();
            }}
            disabled={loading}
            hitSlop={8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="search" size={22} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>

      {error && <Text style={[styles.errorMessage, { color: theme.colors.danger }]}>{error}</Text>}

      {/* Translation display */}
      {shouldShowTranslationBox && (
        <View
          style={[
            styles.translationBox,
            { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
          ]}
        >
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[styles.translationText, { color: theme.colors.text }]}
          >
            {activeTranslationText}
          </Text>
        </View>
      )}
      {playbackLatencyMs !== null && (
        <Text style={[styles.latencyText, { color: theme.colors.textSecondary }]}>
          Видео стартовало через {(playbackLatencyMs / 1000).toFixed(1)} с
        </Text>
      )}
      {noVideoFound && !loading && (
        <Text style={[styles.noVideoText, { color: theme.colors.textSecondary }]}>
          К сожалению, подходящие видео не найдены.
        </Text>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : snippets.length === 0 ? (
        <View style={styles.placeholderContainer}>
          {noVideoFound ? (
            <Typography variant="body" align="center" style={{ color: theme.colors.textSecondary }}>
              Попробуйте изменить запрос и выполните поиск ещё раз.
            </Typography>
          ) : (
            <Typography variant="body" align="center" style={{ color: theme.colors.textSecondary }}>
              Найдите нужную фразу, чтобы увидеть подходящие фрагменты.
            </Typography>
          )}
        </View>
      ) : (
        <View style={styles.resultsContainer}>
          <View style={styles.carouselWrapper}>
            <Carousel
              ref={carouselRef}
              width={SCREEN_WIDTH}
              height={VIDEO_HEIGHT}
              data={snippets}
              renderItem={({ item, index }) => (
                  <View style={styles.carouselItem}>
                    <VideoCard
                      snippet={item}
                      phrase={phrase}
                      highlightPhrase={
                        snippetTranslations[index]
                          ? snippetTranslations[index]
                          : detectedLang === 'en'
                            ? phrase
                            : undefined
                      }
                      theme={theme}
                      isActive={index === activeIndex}
                      isScreenFocused={isScreenFocused}
                      onPlaybackReady={handleSnippetPlaybackReady}
                    />
                  </View>
              )}
              onProgressChange={(_, absoluteProgress) => {
                activeIndexShared.value = absoluteProgress;
              }}
              onSnapToItem={(index) => {
                setActiveIndex(index);
                activeIndexShared.value = index;
              }}
              mode="parallax"
              modeConfig={{
                parallaxScrollingScale: 0.9,
                parallaxScrollingOffset: 50,
              }}
            />

            <CarouselIndicator
              total={snippets.length}
              activeIndex={activeIndex}
              activeIndexShared={activeIndexShared}
              theme={theme}
            />
          </View>
        </View>
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
  searchForm: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 3,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchInputWrapper: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 48,
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    paddingRight: 34,
  },
  clearButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    marginTop: -10,
  },
  searchButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchButtonDisabled: {
    opacity: 0.5,
  },
  errorMessage: {
    marginBottom: 12,
    fontSize: 14,
  },
  translationBox: {
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  translationText: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  latencyText: {
    marginBottom: 8,
    fontSize: 13,
    textAlign: 'center',
  },
  noVideoText: {
    marginBottom: 12,
    textAlign: 'center',
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
  resultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselWrapper: {
    alignItems: 'center',
  },
  carouselItem: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoCard: {
    marginBottom: 0,
    alignItems: 'center',
  },
  indicatorContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: -8,
    marginBottom: 20,
  },
  indicatorDot: {
    height: 8,
    borderRadius: 4,
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
  subtitleControls: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
    zIndex: 10,
  },
  subtitleButton: {
    width: 44,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 4,
  },
  subtitleButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  subtitleOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 40,
    gap: 10,
  },
  subtitleEnglishBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'center',
    maxWidth: '98%',
  },
  subtitleRussianBox: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 18,
    alignSelf: 'center',
    maxWidth: '98%',
  },
  subtitleText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 24,
  },
  subtitleTranslationText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 23,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.8)',
    padding: 20,
  },
  errorText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  errorSubtext: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
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
});
