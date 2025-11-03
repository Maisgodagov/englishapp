import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, Pressable, View, StyleSheet, Text, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import { addUserDictionaryEntry, selectDictionaryItems } from '@features/dictionary/model/dictionarySlice';

type Anchor = { x: number; y: number };
type LookupData = { word: string; translation: string; translations?: string[]; audioUrl?: string; transcription?: string };
type Ctx = {
  open: (word: string, anchor: Anchor, tokenKey?: string) => void;
  close: () => void;
  selectedWord: string | null;
  selectedTokenKey: string | null;
};

export const WordLookupContext = createContext<Ctx | null>(null);

const POPOVER_HEIGHT = 180;
const POPOVER_WIDTH = 240;
const WORD_GAP = 16;

async function fetchLookup(word: string): Promise<LookupData> {
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_DICT_KEY;
  const hasCyrillic = /[\p{Script=Cyrillic}]/u.test(word);
  const lang = hasCyrillic ? 'ru-en' : 'en-ru';
  if (!apiKey) return { word, translation: word };

  const params = new URLSearchParams({ key: apiKey, lang, text: word });
  const url = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return { word, translation: word };

  const data = (await res.json()) as { def?: Array<{ text?: string; ts?: string; tr?: Array<{ text?: string }> }> };
  const defs = data.def ?? [];
  const first = defs[0];
  const allTranslations = (first?.tr ?? []).map((t) => t.text).filter((t): t is string => Boolean(t));
  const trList = allTranslations.slice(0, 4);
  const firstTr = trList[0] ?? word;
  let audioUrl: string | undefined;
  let transcription: string | undefined = first?.ts;

  try {
    const english = (lang === 'en-ru' ? word : firstTr) || word;
    if (/^[A-Za-z][A-Za-z\-']*$/.test(english)) {
      const f = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(english)}`);
      if (f.ok) {
        const j = (await f.json()) as Array<{ phonetics?: Array<{ audio?: string; text?: string }> }>;
        const ph = j.flatMap((e) => e.phonetics || []);
        const withAudio = ph.find((p) => p.audio) || ph[0];
        audioUrl = withAudio?.audio;
        transcription = transcription || withAudio?.text;
      }
    }
  } catch {}

  return { word, translation: firstTr, translations: trList, audioUrl, transcription };
}

export const WordLookupProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, y: 0 });
  const [data, setData] = useState<LookupData | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedTokenKey, setSelectedTokenKey] = useState<string | null>(null);

  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const soundRef = useRef<Audio.Sound | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);

  const profile = useAppSelector((s) => s.user.profile);
  const items = useAppSelector(selectDictionaryItems);
  const dispatch = useAppDispatch();

  const open = useCallback((word: string, a: Anchor, tokenKey?: string) => {
    setAnchor(a);
    setVisible(true);
    setLoading(true);
    setData({ word, translation: '…' });
    setSelectedWord(word);
    setSelectedTokenKey(tokenKey ?? null);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();

    fetchLookup(word).then(setData).finally(() => setLoading(false));
  }, [opacity, translateY]);

  const close = useCallback(async () => {
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    setSelectedWord(null); // Убираем выделение сразу
    setSelectedTokenKey(null);

    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 10, duration: 100, useNativeDriver: false }),
    ]).start(() => {
      setVisible(false);
      setData(null);
    });

    if (soundRef.current) { soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
    if (htmlAudioRef.current) { htmlAudioRef.current.pause(); htmlAudioRef.current = null; }
    setIsPlaying(false);
  }, [opacity, translateY]);

  const play = useCallback(async () => {
    if (!data?.audioUrl || isPlaying) return;
    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch {}

    try {
      if (Platform.OS === 'web') {
        if (htmlAudioRef.current) { htmlAudioRef.current.pause(); htmlAudioRef.current = null; }
        const el = new window.Audio(data.audioUrl);
        htmlAudioRef.current = el;
        setIsPlaying(true);
        el.onended = () => { htmlAudioRef.current = null; setIsPlaying(false); };
        await el.play().catch(() => { htmlAudioRef.current = null; setIsPlaying(false); });
      } else {
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, allowsRecordingIOS: false, staysActiveInBackground: false });
        if (soundRef.current) { await soundRef.current.unloadAsync().catch(() => {}); soundRef.current = null; }
        const { sound } = await Audio.Sound.createAsync({ uri: data.audioUrl }, { shouldPlay: true });
        soundRef.current = sound;
        setIsPlaying(true);
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) { sound.unloadAsync().catch(() => {}); soundRef.current = null; setIsPlaying(false); }
        });
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
    }
  }, [data?.audioUrl, isPlaying]);

  const save = useCallback(async () => {
    if (!profile?.id || !data) return;
    const joined = (data.translations?.length ? data.translations.join(', ') : undefined) || data.translation;
    const exists = items.some((it) => it.word.toLowerCase() === data.word.toLowerCase() && it.translation.toLowerCase() === joined.toLowerCase());
    if (exists) return;

    try { await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch {}
    dispatch(addUserDictionaryEntry({
      userId: profile.id,
      entry: { word: data.word, translation: joined, transcription: data.transcription, audioUrl: data.audioUrl, sourceLang: 'en', targetLang: 'ru' },
    }) as any);
  }, [dispatch, profile?.id, data, items]);

  const position = useMemo(() => {
    const screen = Dimensions.get('window');
    const padding = 16;

    let left = anchor.x - POPOVER_WIDTH / 2;
    left = Math.max(padding, Math.min(screen.width - padding - POPOVER_WIDTH, left));

    const preferredTop = anchor.y - POPOVER_HEIGHT - WORD_GAP;
    let top = preferredTop;

    if (preferredTop < padding) {
      top = anchor.y + WORD_GAP;
      if (top + POPOVER_HEIGHT > screen.height - padding) {
        top = Math.max(padding, screen.height - padding - POPOVER_HEIGHT);
      }
    } else {
      if (top + POPOVER_HEIGHT > screen.height - padding) {
        top = Math.max(padding, screen.height - padding - POPOVER_HEIGHT);
      }
    }

    return { left: Math.round(left), top: Math.round(top) };
  }, [anchor]);

  const inDict = useMemo(() => {
    if (!data) return false;
    const joined = (data.translations?.length ? data.translations.join(', ') : undefined) || data.translation;
    return items.some((it) => it.word.toLowerCase() === data.word.toLowerCase() && it.translation.toLowerCase() === joined.toLowerCase());
  }, [data, items]);

  if (!visible) return <WordLookupContext.Provider value={{ open, close, selectedWord, selectedTokenKey }}>{children}</WordLookupContext.Provider>;

  return (
    <WordLookupContext.Provider value={{ open, close, selectedWord, selectedTokenKey }}>
      {children}
      <View pointerEvents="box-none" style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={close} />
        <Animated.View
          pointerEvents="box-none"
          style={[styles.popup, { left: position.left, top: position.top, opacity, transform: [{ translateY }] }]}
        >
          <View style={styles.card}>
            <ScrollView style={styles.scroll} bounces={false}>
              <View style={styles.header}>
                <Text style={styles.title}>{data?.word}</Text>
                <TouchableOpacity onPress={close}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <Text style={styles.body}>{loading ? 'Загрузка…' : data?.translation}</Text>

              {!loading && data?.translations && data.translations.length > 1 && (
                <Text style={styles.caption}>Другие значения: {data.translations.slice(1).join(', ')}</Text>
              )}

              <View style={styles.actions}>
                {!loading && data?.audioUrl && (
                  <TouchableOpacity
                    style={[styles.actionButton, isPlaying && styles.actionButtonDisabled]}
                    onPress={play}
                    disabled={isPlaying}
                    accessibilityRole="button"
                    accessibilityLabel={isPlaying ? 'Проигрывается произношение' : 'Прослушать произношение'}
                  >
                    <Ionicons name="volume-high" size={17} color="#FFF" />
                    <Text style={styles.actionButtonText}>{isPlaying ? 'Звук…' : 'Слушать'}</Text>
                  </TouchableOpacity>
                )}
                {!loading &&
                  (inDict ? (
                    <View style={[styles.actionButton, styles.actionButtonSuccess]}>
                      <Ionicons name="checkmark-circle" size={17} color="#047857" />
                      <Text style={[styles.actionButtonText, styles.actionButtonSuccessText]}>В словаре</Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, !profile?.id && styles.actionButtonDisabled]}
                      onPress={save}
                      disabled={!profile?.id}
                      accessibilityRole="button"
                      accessibilityLabel="Добавить слово в словарь"
                    >
                      <Ionicons name="add" size={18} color="#FFF" />
                      <Text style={styles.actionButtonText}>Добавить</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </WordLookupContext.Provider>
  );
};

export const useWordLookup = () => {
  const ctx = useContext(WordLookupContext);
  if (!ctx) throw new Error('useWordLookup must be used within WordLookupProvider');
  return ctx;
};

const styles = StyleSheet.create({
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 9999 },
  backdrop: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  popup: { position: 'absolute', width: POPOVER_WIDTH, height: POPOVER_HEIGHT },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: POPOVER_HEIGHT,
    width: POPOVER_WIDTH,
    overflow: 'visible',
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  scroll: { padding: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 8 },
  title: { fontSize: 19, fontWeight: '700', color: '#1F2937', flex: 1, letterSpacing: -0.3 },
  body: { fontSize: 15, color: '#4B5563', fontWeight: '500', lineHeight: 20, marginBottom: 8 },
  caption: { fontSize: 12, color: '#9CA3AF', lineHeight: 16, marginBottom: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: '#3B82F6',
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  actionButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionButtonSuccess: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#34D399',
    shadowColor: 'transparent',
    elevation: 0,
  },
  actionButtonSuccessText: {
    color: '#047857',
  },
});
