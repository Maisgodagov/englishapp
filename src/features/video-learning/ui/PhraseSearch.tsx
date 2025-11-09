import React, { useState, useCallback, useEffect, useRef } from "react";

import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  View,
  Pressable,
  type StyleProp,
  type TextStyle,
} from "react-native";

import { useTheme } from "styled-components/native";

import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";

import Video from "react-native-video";

import Carousel from "react-native-reanimated-carousel";

import * as FileSystem from "expo-file-system/legacy";

import { Ionicons } from "@expo/vector-icons";

import type { AppTheme } from "@shared/theme/theme";

import { Typography } from "@shared/ui";

import {
  type PhraseSnippet,
  type PhraseSearchResponse,
  videoLearningApi,
} from "@features/video-learning/api/videoLearningApi";

import { SCREEN_WIDTH } from "@shared/utils/dimensions";

import { detectLanguage } from "@shared/utils/languageDetection";

import { translateEnToRu, translateRuToEn } from "@shared/services/translator";

import { useAppSelector } from "@core/store/hooks";

import { UserRole } from "@shared/constants/roles";

type VideoComponentRef = React.ComponentRef<typeof Video>;

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const createHighlightRegex = (value: string): RegExp | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const flexibleGap = "[\\s'’,.?!-]*";
  let pattern = "";

  for (const char of trimmed) {
    if (/\s/.test(char)) {
      pattern += flexibleGap;
    } else {
      pattern += `${escapeRegExp(char)}${flexibleGap}`;
    }
  }

  if (!pattern) {
    return null;
  }

  return new RegExp(pattern, "gi");
};

const buildHighlightedChildren = (
  text: string,
  highlight: string,
  highlightStyle: StyleProp<TextStyle>
): React.ReactNode[] | string => {
  const regex = createHighlightRegex(highlight);
  if (!regex) {
    return text;
  }

  const segments: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    const matchText = match[0];

    if (!matchText) {
      if (regex.lastIndex < text.length) {
        regex.lastIndex += 1;
        continue;
      }
      break;
    }

    if (match.index > lastIndex) {
      segments.push(text.slice(lastIndex, match.index));
    }

    segments.push(
      <Text key={`highlight-${key++}`} style={highlightStyle}>
        {matchText}
      </Text>
    );

    lastIndex = match.index + matchText.length;
  }

  if (lastIndex < text.length) {
    segments.push(text.slice(lastIndex));
  }

  return segments.length ? segments : text;
};

const CAROUSEL_WIDTH = SCREEN_WIDTH - 40;
const VIDEO_WIDTH = CAROUSEL_WIDTH * 0.9;
const VIDEO_HEIGHT = VIDEO_WIDTH * (16 / 9) + 12;
const VIDEO_CROP_TOP = 10;
const VIDEO_CROP_BOTTOM = 40;
const CROPPED_VIDEO_HEIGHT = VIDEO_HEIGHT - VIDEO_CROP_TOP - VIDEO_CROP_BOTTOM;

const PAGE_SIZE = 2;

const DEFAULT_SNIPPET_CAP = 6;

const PREMIUM_SNIPPET_CAP = 50;

const SNIPPET_PADDING_SECONDS = 1;
const PREFETCH_THRESHOLD = 1;
const MAX_DUPLICATE_FETCH_ATTEMPTS = 5;

const CMAF_SEGMENT_DURATION = 4; // seconds

const CMAF_PROFILE_PREFIX = "720p";

const SNIPPET_CACHE_DIR = `${
  FileSystem.cacheDirectory ?? ""
}snippet-playlists/`;

const computePaddingSeconds = (phrase: string): number => {
  const trimmed = phrase.trim();
  if (!trimmed) {
    return 2;
  }
  const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
  if (wordCount <= 2) {
    return 2;
  }
  if (wordCount <= 4) {
    return 2;
  }
  return SNIPPET_PADDING_SECONDS;
};

const formatSegmentIndex = (segmentIndex: number): string =>
  segmentIndex.toString().padStart(3, "0");

const sanitizeSnippetId = (id: string): string =>
  id.replace(/[^a-zA-Z0-9_-]/g, "_");

const resolveBaseVideoUrl = (masterUrl: string): string => {
  try {
    const parsed = new URL(masterUrl);

    const pathSegments = parsed.pathname.split("/");

    pathSegments.pop(); // remove master.m3u8

    parsed.pathname = `${pathSegments.join("/")}/`;

    parsed.search = "";

    parsed.hash = "";

    return parsed.toString();
  } catch {
    if (masterUrl.endsWith("master.m3u8")) {
      return masterUrl.slice(0, masterUrl.lastIndexOf("/") + 1);
    }

    return masterUrl;
  }
};

let snippetCacheDirReady = false;

const ensureSnippetCacheDir = async () => {
  if (snippetCacheDirReady) return;

  try {
    await FileSystem.makeDirectoryAsync(SNIPPET_CACHE_DIR, {
      intermediates: true,
    });

    snippetCacheDirReady = true;
  } catch (error) {
    console.warn(
      "[PhraseSearch] Failed to prepare snippet cache directory:",
      error
    );
  }
};

const buildSnippetPlaylistContent = (snippet: PhraseSnippet) => {
  const baseUrl = resolveBaseVideoUrl(snippet.videoUrl);

  const safeStart = Math.max(0, snippet.startSeconds);

  const safeEnd = Math.max(safeStart + 0.5, snippet.endSeconds);

  const startSegment = Math.max(
    0,
    Math.floor(safeStart / CMAF_SEGMENT_DURATION)
  );

  const endSegmentExclusive = Math.max(
    startSegment + 1,

    Math.ceil(safeEnd / CMAF_SEGMENT_DURATION)
  );

  const lines: string[] = [
    "#EXTM3U",

    "#EXT-X-VERSION:7",

    `#EXT-X-TARGETDURATION:${CMAF_SEGMENT_DURATION}`,

    "#EXT-X-INDEPENDENT-SEGMENTS",

    `#EXT-X-MAP:URI="${baseUrl}${CMAF_PROFILE_PREFIX}_init.mp4"`,
  ];

  for (let idx = startSegment; idx < endSegmentExclusive; idx += 1) {
    lines.push(`#EXTINF:${CMAF_SEGMENT_DURATION.toFixed(1)},`);

    lines.push(
      `${baseUrl}${CMAF_PROFILE_PREFIX}_${formatSegmentIndex(idx)}.m4s`
    );
  }

  lines.push("#EXT-X-ENDLIST");

  return {
    content: lines.join("\n"),

    startSegment,

    endSegmentExclusive,
  };
};

const createSnippetPlaylistFile = async (
  snippet: PhraseSnippet
): Promise<string> => {
  await ensureSnippetCacheDir();

  const { content, startSegment, endSegmentExclusive } =
    buildSnippetPlaylistContent(snippet);

  const fileName = `${sanitizeSnippetId(
    snippet.id
  )}_${startSegment}-${endSegmentExclusive}_${CMAF_PROFILE_PREFIX}.m3u8`;

  const filePath = `${SNIPPET_CACHE_DIR}${fileName}`;

  await FileSystem.writeAsStringAsync(filePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return filePath;
};

interface VideoSnippetItemProps {
  snippet: PhraseSnippet;
  theme: AppTheme;
  isActive: boolean;
  showEnglishSubtitles: boolean;
  showRussianSubtitles: boolean;
  onToggleEnglish: () => void;
  onToggleRussian: () => void;
  onOpenFullVideo: (snippet: PhraseSnippet) => void;
  highlightTerm: string;
}

const VideoSnippetItem: React.FC<VideoSnippetItemProps> = ({
  snippet,
  theme,
  isActive,
  showEnglishSubtitles,
  showRussianSubtitles,
  onToggleEnglish,
  onToggleRussian,
  onOpenFullVideo,
  highlightTerm,
}) => {
  const [ready, setReady] = useState(false);

  const [playlistUri, setPlaylistUri] = useState<string | null>(null);

  const [preparingPlaylist, setPreparingPlaylist] = useState(false);

  const [playlistError, setPlaylistError] = useState<string | null>(null);

  const videoRef = useRef<VideoComponentRef>(null);

  const wasActiveRef = useRef(false);

  const [isManuallyPaused, setIsManuallyPaused] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const preparePlaylist = async () => {
      setPreparingPlaylist(true);

      setPlaylistError(null);

      setReady(false);

      try {
        const fileUri = await createSnippetPlaylistFile(snippet);

        if (isMounted) {
          setPlaylistUri(fileUri);
        }
      } catch (error) {
        console.error(
          `[PhraseSearch] Failed to prepare snippet playlist (${snippet.id})`,
          error
        );

        if (isMounted) {
          setPlaylistError("Не удалось подготовить видео");

          setPlaylistUri(null);
        }
      } finally {
        if (isMounted) {
          setPreparingPlaylist(false);
        }
      }
    };

    preparePlaylist();

    return () => {
      isMounted = false;
    };
  }, [snippet.id, snippet.startSeconds, snippet.endSeconds, snippet.videoUrl]);

  useEffect(() => {
    setReady(false);

    wasActiveRef.current = false;

    setIsManuallyPaused(false);
  }, [playlistUri]);

  useEffect(() => {
    if (ready && isActive && !wasActiveRef.current) {
      videoRef.current?.seek(0);
    }

    wasActiveRef.current = isActive;
  }, [isActive, ready]);

  useEffect(() => {
    if (!isActive) {
      setIsManuallyPaused(false);
    }
  }, [isActive]);

  const paused = !isActive || !ready || isManuallyPaused;

  return (
    <View style={styles.snippetCard}>
      <View style={styles.videoWrapper}>
        <View style={styles.subtitleToggleRow}>
          <Pressable
            style={[
              styles.subtitleToggleButton,
              showEnglishSubtitles
                ? {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  }
                : styles.subtitleToggleButtonInactive,
            ]}
            onPress={onToggleEnglish}
          >
            <Text style={styles.subtitleToggleLabel}>EN</Text>
          </Pressable>
          <Pressable
            style={[
              styles.subtitleToggleButton,
              showRussianSubtitles
                ? {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  }
                : styles.subtitleToggleButtonInactive,
            ]}
            onPress={onToggleRussian}
          >
            <Text style={styles.subtitleToggleLabel}>RU</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.openVideoButton}
          onPress={() => onOpenFullVideo(snippet)}
        >
          <Text style={styles.openVideoLabel}>Full video</Text>
          <Ionicons name="open-outline" size={16} color="#fff" />
        </Pressable>
        {playlistUri ? (
          <>
            <Video
              ref={videoRef}
              source={{ uri: playlistUri, type: "m3u8" as const }}
              style={styles.video}
              resizeMode="cover"
              paused={paused}
              repeat
              onLoad={() => setReady(true)}
              onError={(error) => {
                console.error(
                  `[PhraseSearch] Snippet playback error (${snippet.id})`,
                  error
                );

                setPlaylistError("Не удалось воспроизвести видео");

                setReady(false);
              }}
            />

            {!ready && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            )}

            <Pressable
              style={styles.videoTouchArea}
              onPress={() => {
                if (ready && isActive) {
                  setIsManuallyPaused((prev) => !prev);
                }
              }}
            >
              {paused && ready && (
                <View style={styles.playIcon}>
                  <Ionicons
                    name="play-circle"
                    size={64}
                    color="rgba(255,255,255,0.9)"
                  />
                </View>
              )}
            </Pressable>

            {((showEnglishSubtitles && snippet.contextText) ||
              (showRussianSubtitles && snippet.translationContextText)) &&
              ready && (
                <View style={styles.subtitles}>
                  {showEnglishSubtitles && snippet.contextText && (
                    <View style={styles.subtitleBubble}>
                      <Text style={styles.subtitleText}>
                        {buildHighlightedChildren(
                          snippet.contextText,
                          highlightTerm,
                          styles.subtitleHighlight
                        )}
                      </Text>
                    </View>
                  )}
                  {showRussianSubtitles && snippet.translationContextText && (
                    <View
                      style={[styles.subtitleBubble, styles.subtitleBubbleRu]}
                    >
                      <Text style={styles.subtitleTranslation}>
                        {snippet.translationContextText}
                      </Text>
                    </View>
                  )}
                </View>
              )}
          </>
        ) : (
          <View style={[styles.video, styles.videoPlaceholder]}>
            {preparingPlaylist ? (
              <>
                <ActivityIndicator size="large" color="#fff" />

                <Text style={styles.placeholderText}>Готовим отрывок…</Text>
              </>
            ) : playlistError ? (
              <Text style={styles.placeholderText}>{playlistError}</Text>
            ) : null}
          </View>
        )}
      </View>
    </View>
  );
};

export const PhraseSearch = () => {
  const theme = useTheme() as AppTheme;

  const profile = useAppSelector((state) => state.user.profile);

  const [phrase, setPhrase] = useState("");

  const [snippets, setSnippets] = useState<PhraseSnippet[]>([]);
  const [searchTranslation, setSearchTranslation] = useState<string | null>(
    null
  );
  const [highlightTerm, setHighlightTerm] = useState("");
  const [showEnglishSubtitles, setShowEnglishSubtitles] = useState(true);
  const [showRussianSubtitles, setShowRussianSubtitles] = useState(true);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [isScreenFocused, setIsScreenFocused] = useState(true);

  const [activeIndex, setActiveIndex] = useState(0);

  const [totalSnippets, setTotalSnippets] = useState(0);

  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const [hasMore, setHasMore] = useState(false);

  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const snippetsLengthRef = useRef(0);

  const activePhraseRef = useRef("");

  const abortControllerRef = useRef<AbortController | null>(null);

  const loadedSnippetIdsRef = useRef<Set<string>>(new Set());
  const translationRequestIdRef = useRef(0);

  const snippetQuota =
    profile?.role === UserRole.Admin
      ? PREMIUM_SNIPPET_CAP
      : DEFAULT_SNIPPET_CAP;

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);

      return () => setIsScreenFocused(false);
    }, [])
  );

  useEffect(() => {
    snippetsLengthRef.current = snippets.length;
  }, [snippets.length]);

  const resetSearchState = useCallback(() => {
    setSnippets([]);

    setActiveIndex(0);

    setTotalSnippets(0);

    setNextCursor(null);

    setHasMore(false);

    activePhraseRef.current = "";

    loadedSnippetIdsRef.current.clear();
    snippetsLengthRef.current = 0;
    translationRequestIdRef.current += 1;
    setSearchTranslation(null);
    setHighlightTerm("");
  }, []);

  const requestSnippets = useCallback(
    async ({
      searchValue,

      cursor,

      mode,
    }: {
      searchValue: string;

      cursor?: string | null;

      mode: "initial" | "append";
    }) => {
      if (mode === "append") {
        setIsFetchingMore(true);
      }

      console.log("[PhraseSearch] request start", { mode, cursor });

      const controller = new AbortController();

      abortControllerRef.current?.abort();

      abortControllerRef.current = controller;

      try {
        let cursorToUse: string | null | undefined = cursor;
        let duplicateAttempts = 0;

        while (true) {
          console.log("[PhraseSearch] fetch page", {
            mode,
            cursor: cursorToUse,
            duplicateAttempts,
          });

          const response = await videoLearningApi.searchPhrase({
            phrase: searchValue,

            limit: PAGE_SIZE,

            cursor: cursorToUse ?? undefined,

            paddingSeconds: computePaddingSeconds(searchValue),

            userId: profile?.id,

            maxSnippets: snippetQuota,

            signal: controller.signal,
          });

          const applyMetadata = (resp: PhraseSearchResponse) => {
            setTotalSnippets(resp.total);

            setHasMore(resp.hasMore);

            setNextCursor(resp.nextCursor);

            setError(null);
          };

          if (mode === "initial") {
            loadedSnippetIdsRef.current = new Set(
              response.items.map((item) => item.id)
            );

            setSnippets(response.items);
            snippetsLengthRef.current = response.items.length;

            setActiveIndex(0);

            activePhraseRef.current = searchValue;

            applyMetadata(response);

            break;
          } else {
            const freshItems = response.items.filter(
              (item) => !loadedSnippetIdsRef.current.has(item.id)
            );

            if (!freshItems.length) {
              applyMetadata(response);

              if (
                response.hasMore &&
                response.nextCursor &&
                duplicateAttempts < MAX_DUPLICATE_FETCH_ATTEMPTS
              ) {
                cursorToUse = response.nextCursor;

                duplicateAttempts += 1;

                console.log("[PhraseSearch] duplicate page, retrying", {
                  mode,
                  nextCursor: cursorToUse,
                  duplicateAttempts,
                });

                continue;
              }

              return;
            }

            freshItems.forEach((item) =>
              loadedSnippetIdsRef.current.add(item.id)
            );

            setSnippets((prev) => {
              const next = [...prev, ...freshItems];
              snippetsLengthRef.current = next.length;
              return next;
            });

            applyMetadata(response);

            console.log("[PhraseSearch] appended fresh items", {
              mode,
              added: freshItems.length,
              totalLoaded: snippetsLengthRef.current,
            });

            break;
          }
        }

        console.log("[PhraseSearch] request completed", { mode });
      } catch (err: any) {
        if (err?.name === "AbortError") return;

        console.error("[PhraseSearch] Search failed:", err);

        setError("Search failed. Please try again.");

        if (mode === "initial") {
          resetSearchState();
        }
      } finally {
        if (mode === "append") {
          setIsFetchingMore(false);
        } else {
          setLoading(false);
        }
      }
    },

    [profile?.id, snippetQuota, resetSearchState]
  );
  const prefetchNextSnippet = useCallback(
    (referenceIndex?: number) => {
      if (
        !hasMore ||
        !nextCursor ||
        !activePhraseRef.current ||
        isFetchingMore ||
        loading
      ) {
        return;
      }
      const baselineIndex =
        typeof referenceIndex === "number" && referenceIndex >= 0
          ? referenceIndex
          : activeIndex;
      const totalLoaded = snippetsLengthRef.current;
      if (totalLoaded === 0) {
        return;
      }
      const remainingAhead = totalLoaded - baselineIndex - 1;
      if (remainingAhead >= PREFETCH_THRESHOLD) {
        return;
      }
      console.log("[PhraseSearch] prefetch enqueue", {
        baselineIndex,
        totalLoaded,
        nextCursor,
      });
      requestSnippets({
        searchValue: activePhraseRef.current,
        cursor: nextCursor,
        mode: "append",
      });
    },
    [activeIndex, hasMore, isFetchingMore, loading, nextCursor, requestSnippets]
  );
  const handleClear = useCallback(() => {
    abortControllerRef.current?.abort();
    setPhrase("");
    setError(null);
    resetSearchState();
    setLoading(false);
    setIsFetchingMore(false);
  }, [resetSearchState]);

  const performSearch = useCallback(async () => {
    const trimmed = phrase.trim();

    if (!trimmed) return;

    setError(null);

    resetSearchState();

    setLoading(true);
    setSearchTranslation(null);
    translationRequestIdRef.current += 1;
    const translationRequestId = translationRequestIdRef.current;

    try {
      const detectedLang = detectLanguage(trimmed);

      let searchPhrase = trimmed;
      let highlightValue = "";

      if (detectedLang === "ru") {
        try {
          const translated = await translateRuToEn(trimmed);
          searchPhrase = translated;
          highlightValue = translated;
          if (translationRequestIdRef.current === translationRequestId) {
            setSearchTranslation(translated);
          }
        } catch (translationError) {
          console.warn(
            "[PhraseSearch] Failed to translate Russian query:",
            translationError
          );
          if (translationRequestIdRef.current === translationRequestId) {
            setSearchTranslation(null);
          }
          highlightValue = "";
        }
      } else {
        highlightValue = trimmed;
        translateEnToRu(trimmed)
          .then((translated) => {
            if (translationRequestIdRef.current === translationRequestId) {
              setSearchTranslation(translated);
            }
          })
          .catch((translationError) => {
            console.warn(
              "[PhraseSearch] Failed to translate query:",
              translationError
            );
            if (translationRequestIdRef.current === translationRequestId) {
              setSearchTranslation(null);
            }
          });
      }

      setHighlightTerm(highlightValue.trim());

      await requestSnippets({
        searchValue: searchPhrase,

        cursor: null,

        mode: "initial",
      });
      prefetchNextSnippet(0);
    } catch (err: any) {
      if (err?.name === "AbortError") return;

      console.error("[PhraseSearch] Search failed:", err);

      setError("Search failed. Please try again.");

      setLoading(false);

      resetSearchState();
    }
  }, [phrase, requestSnippets, resetSearchState, prefetchNextSnippet]);

  const handleSnapToItem = useCallback(
    (index: number) => {
      setActiveIndex(index);
      prefetchNextSnippet(index);
    },
    [prefetchNextSnippet]
  );

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const toggleEnglishSubtitles = useCallback(() => {
    setShowEnglishSubtitles((prev) => !prev);
  }, []);

  const toggleRussianSubtitles = useCallback(() => {
    setShowRussianSubtitles((prev) => !prev);
  }, []);

  const handleOpenFullVideo = useCallback((snippet: PhraseSnippet) => {
    if (!snippet?.contentId) return;

    router.push({
      pathname: "/(tabs)/video-learning",
      params: {
        contentId: snippet.contentId,
        focusToken: Date.now().toString(),
      },
    });
  }, []);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View
        style={[
          styles.searchForm,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <View style={styles.searchRow}>
          <View
            style={[
              styles.searchInputWrapper,
              {
                borderColor: theme.colors.border,
                backgroundColor: theme.colors.background,
              },
            ]}
          >
            <TextInput
              style={[styles.searchInput, { color: theme.colors.text }]}
              placeholder="Enter a word or phrase..."
              placeholderTextColor={theme.colors.textSecondary}
              value={phrase}
              onChangeText={setPhrase}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={performSearch}
            />

            {phrase.length > 0 && (
              <Pressable style={styles.clearButton} onPress={handleClear}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.colors.textSecondary}
                />
              </Pressable>
            )}
          </View>

          <Pressable
            style={[
              styles.searchButton,
              { backgroundColor: theme.colors.primary },
            ]}
            onPress={performSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="search" size={22} color="#FFFFFF" />
            )}
          </Pressable>
        </View>
      </View>

      {searchTranslation && (
        <View
          style={[
            styles.translationBadge,
            {
              backgroundColor: theme.colors.surface,
            },
          ]}
        >
          <Text
            style={[
              styles.translationText,
              { color: theme.colors.textSecondary },
            ]}
          >
            {searchTranslation}
          </Text>
        </View>
      )}

      {error && (
        <Text style={[styles.errorMessage, { color: theme.colors.danger }]}>
          {error}
        </Text>
      )}

      {loading ? (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : snippets.length === 0 ? (
        <View style={styles.placeholderContainer}>
          <Typography
            variant="body"
            align="center"
            style={{ color: theme.colors.textSecondary }}
          >
            Nothing found yet. Try another phrase.
          </Typography>
        </View>
      ) : (
        <View style={styles.carouselContainer}>
          <Carousel
            loop={false}
            width={CAROUSEL_WIDTH}
            height={VIDEO_HEIGHT + 60}
            data={snippets}
            renderItem={({ item, index }) => (
              <View style={styles.carouselItem}>
                <VideoSnippetItem
                  snippet={item}
                  theme={theme}
                  isActive={index === activeIndex && isScreenFocused}
                  showEnglishSubtitles={showEnglishSubtitles}
                  showRussianSubtitles={showRussianSubtitles}
                  onToggleEnglish={toggleEnglishSubtitles}
                  onToggleRussian={toggleRussianSubtitles}
                  onOpenFullVideo={handleOpenFullVideo}
                  highlightTerm={highlightTerm}
                />
              </View>
            )}
            onSnapToItem={handleSnapToItem}
            style={styles.carousel}
            enabled={snippets.length > 0}
          />

          {totalSnippets > 0 && (
            <Text
              style={[
                styles.carouselPager,
                { color: theme.colors.textSecondary },
              ]}
            >
              {Math.min(activeIndex + 1, totalSnippets)} / {totalSnippets}
            </Text>
          )}
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
  },

  searchRow: {
    flexDirection: "row",

    gap: 12,
  },

  searchInputWrapper: {
    flex: 1,

    flexDirection: "row",

    alignItems: "center",

    borderWidth: 1,

    borderRadius: 12,

    paddingHorizontal: 14,

    height: 48,
  },

  searchInput: {
    flex: 1,

    fontSize: 16,

    fontWeight: "500",
  },

  clearButton: {
    padding: 4,
  },

  searchButton: {
    width: 48,

    height: 48,

    borderRadius: 12,

    alignItems: "center",

    justifyContent: "center",
  },

  errorMessage: {
    fontSize: 14,

    textAlign: "center",

    marginBottom: 16,
  },

  loaderContainer: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",
  },

  placeholderContainer: {
    flex: 1,

    justifyContent: "center",

    alignItems: "center",

    paddingHorizontal: 40,
  },
  translationBadge: {
    width: CAROUSEL_WIDTH,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
  },
  translationText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  carouselContainer: {
    alignItems: "center",
    marginBottom: -8,
  },
  carousel: {
    flexGrow: 0,
  },
  carouselItem: {
    width: CAROUSEL_WIDTH,
    paddingBottom: 0,
    alignItems: "center",
  },
  carouselPager: {
    position: "absolute",
    bottom: 60,
    fontSize: 14,
    fontWeight: "600",
  },

  snippetCard: {
    marginBottom: 12,

    borderRadius: 12,

    overflow: "hidden",
  },

  videoWrapper: {
    width: VIDEO_WIDTH,

    height: CROPPED_VIDEO_HEIGHT,

    backgroundColor: "#000",

    borderRadius: 12,

    overflow: "hidden",

    alignSelf: "center",
  },

  subtitleToggleRow: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    gap: 8,
    zIndex: 2,
    elevation: 2,
  },

  subtitleToggleButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },

  subtitleToggleButtonInactive: {
    backgroundColor: "rgba(0,0,0,0.45)",
    borderColor: "rgba(255,255,255,0.4)",
  },

  subtitleToggleLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  openVideoButton: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    zIndex: 2,
    elevation: 2,
  },
  openVideoLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  video: {
    width: "100%",

    height: VIDEO_HEIGHT,
    marginTop: -VIDEO_CROP_TOP,
  },

  videoPlaceholder: {
    alignItems: "center",

    justifyContent: "center",

    paddingHorizontal: 16,
  },

  placeholderText: {
    marginTop: 12,

    color: "#fff",

    fontSize: 14,

    textAlign: "center",

    fontWeight: "500",
  },

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: "center",

    alignItems: "center",

    backgroundColor: "#000",
  },

  videoTouchArea: {
    ...StyleSheet.absoluteFillObject,
  },

  playIcon: {
    ...StyleSheet.absoluteFillObject,

    justifyContent: "center",

    alignItems: "center",
  },

  subtitles: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingBottom: 18,
    alignItems: "center",
  },

  subtitleBubble: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.9)",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },

  subtitleBubbleRu: {
    backgroundColor: "rgba(0,0,0,0.9)",
    marginTop: 8,
  },

  subtitleText: {
    color: "#fff",
    fontSize: 17,
    textAlign: "center",
    fontWeight: "600",
  },

  subtitleTranslation: {
    color: "#e5f4ff",
    fontSize: 16,
    textAlign: "center",
    fontWeight: "600",
  },
  subtitleHighlight: {
    color: "#ffe072",
  },
});
