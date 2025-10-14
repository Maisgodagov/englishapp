import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, Platform, Pressable, View, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';

import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import { addUserDictionaryEntry, selectDictionaryItems } from '@features/dictionary/model/dictionarySlice';

type Anchor = { x: number; y: number };
type LookupData = { word: string; translation: string; translations?: string[]; audioUrl?: string; transcription?: string };

type Ctx = {
  open: (word: string, anchor: Anchor) => void;
  close: () => void;
};

export const WordLookupContext = createContext<Ctx | null>(null);

async function fetchLookup(word: string): Promise<LookupData> {
  const apiKey = process.env.EXPO_PUBLIC_YANDEX_DICT_KEY;
  const hasCyrillic = /[\p{Script=Cyrillic}]/u.test(word);
  const lang = hasCyrillic ? 'ru-en' : 'en-ru';
  if (!apiKey) return { word, translation: word };
  
  const params = new URLSearchParams({ key: apiKey, lang, text: word });
  const url = `https://dictionary.yandex.net/api/v1/dicservice.json/lookup?${params.toString()}`;
  const res = await fetch(url);
  if (!res.ok) return { word, translation: word };
  
  const data = (await res.json()) as {
    def?: Array<{ text?: string; ts?: string; pos?: string; tr?: Array<{ text?: string; pos?: string }> }>;
  };
  const defs = data.def ?? [];
  const first = defs[0];
  const allTranslations = (first?.tr ?? []).map((t) => t.text).filter((t): t is string => Boolean(t));
  const trList = allTranslations.slice(0, 4);
  const firstTr = trList[0] ?? word;
  let audioUrl: string | undefined;
  let transcription: string | undefined = first?.ts ?? undefined;
  
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
  const translateY = useRef(new Animated.Value(10)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const profile = useAppSelector((s) => s.user.profile);
  const dispatch = useAppDispatch();
  const soundRef = useRef<Audio.Sound | null>(null);
  const htmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const measuredRef = useRef<{ width: number; height: number }>({ width: 0, height: 0 });
  const items = useAppSelector(selectDictionaryItems);
  const [isPlaying, setIsPlaying] = useState(false);

  const open = useCallback((word: string, a: Anchor) => {
    setAnchor(a);
    setVisible(true);
    setLoading(true);
    setData({ word, translation: '…' });
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 0, duration: 120, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
    ]).start();
    
    // Асинхронно загружаем данные
    (async () => {
      try {
        const info = await fetchLookup(word);
        setData(info);
      } finally {
        setLoading(false);
      }
    })();
  }, [opacity, translateY]);

  const close = useCallback(async () => {
    // Легкая вибрация при закрытии попапа
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Игнорируем ошибки вибрации
    }
    
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: 100, useNativeDriver: false }),
      Animated.timing(translateY, { toValue: 10, duration: 100, useNativeDriver: false }),
    ]).start(() => {
      setVisible(false);
      setData(null);
    });
    if (soundRef.current) { soundRef.current.unloadAsync().catch(() => undefined); soundRef.current = null; }
    if (htmlAudioRef.current) { htmlAudioRef.current.pause(); htmlAudioRef.current = null; }
    setIsPlaying(false);
  }, [opacity, translateY]);

  const play = useCallback(async () => {
    if (!data?.audioUrl || isPlaying) return;

    // Легкая вибрация при начале воспроизведения
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Игнорируем ошибки вибрации
    }

    try {
      if (Platform.OS === 'web') {
        if (htmlAudioRef.current) { htmlAudioRef.current.pause(); htmlAudioRef.current = null; }
        const el = new window.Audio(data.audioUrl);
        htmlAudioRef.current = el;
        setIsPlaying(true);
        el.onended = () => {
          htmlAudioRef.current = null;
          setIsPlaying(false);
        };
        await el.play().catch((error) => {
          console.error('Error playing web audio:', error);
          htmlAudioRef.current = null;
          setIsPlaying(false);
        });
        return;
      }

      // Настройка аудио режима для мобильных платформ
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
      });

      if (soundRef.current) {
        await soundRef.current.stopAsync().catch(()=>{});
        await soundRef.current.unloadAsync().catch(()=>{});
        soundRef.current=null;
      }

      console.log('Loading sound from popup:', data.audioUrl);
      const { sound } = await Audio.Sound.createAsync(
        { uri: data.audioUrl },
        { shouldPlay: true }
      );
      soundRef.current = sound;
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync().catch(()=>{});
          soundRef.current = null;
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error('Error playing audio in popup:', error);
      setIsPlaying(false);
    }
  }, [data?.audioUrl, isPlaying]);

  const save = useCallback(async () => {
    if (!profile?.id || !data) return;
    const joined = (data.translations && data.translations.length ? data.translations.join(', ') : undefined) || data.translation;
    const exists = items.some(
      (it) => it.word.toLowerCase() === data.word.toLowerCase() && it.translation.toLowerCase() === joined.toLowerCase(),
    );
    if (exists) return;
    
    // Вибрация при сохранении слова
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      // Игнорируем ошибки вибрации
    }
    
    dispatch(
      addUserDictionaryEntry({
        userId: profile.id,
        entry: { word: data.word, translation: joined, transcription: data.transcription, audioUrl: data.audioUrl, sourceLang: 'en', targetLang: 'ru' },
      }) as any,
    );
  }, [dispatch, profile?.id, data, items]);

  const value = useMemo(() => ({ open, close }), [open, close]);

  const position = useMemo(() => {
    const screen = Dimensions.get('window');
    const maxW = Math.floor(screen.width * 0.6);
    const cardW = Math.max(200, Math.min(maxW, measuredRef.current.width || 240));
    const cardH = measuredRef.current.height || 180;
    const padding = 16;

    // Центрируем по горизонтали относительно якоря
    let left = Math.round(anchor.x - cardW / 2);
    // Ограничиваем, чтобы не выходил за края экрана
    left = Math.max(padding, Math.min(screen.width - padding - cardW, left));

    // Позиционируем по вертикали - сначала пытаемся поместить сверху
    let top = Math.round(anchor.y - cardH - 16);

    // Если не помещается сверху, размещаем снизу
    if (top < padding + 40) { // 40px для статус-бара
      top = Math.round(anchor.y + 24);
      // Если и снизу не помещается, прижимаем к низу экрана
      if (top + cardH > screen.height - padding) {
        top = screen.height - padding - cardH;
      }
    }

    return { left, top, maxW, cardW };
  }, [anchor, measuredRef.current.width, measuredRef.current.height]);

  const inDict = useMemo(() => {
    if (!data) return false;
    const joined = (data.translations && data.translations.length ? data.translations.join(', ') : undefined) || data.translation;
    return items.some(
      (it) => it.word.toLowerCase() === data.word.toLowerCase() && it.translation.toLowerCase() === joined.toLowerCase(),
    );
  }, [items, data?.word, data?.translation, data?.translations]);

  return (
    <WordLookupContext.Provider value={value}>
      {children}
      {visible && (
        <View pointerEvents="box-none" style={styles.overlay}>
          <Pressable style={styles.backdrop} onPress={close} />
          <Animated.View
            pointerEvents="box-none"
            style={[
              styles.popup,
              {
                left: position.left,
                top: position.top,
                opacity,
                transform: [{ translateY }],
                minWidth: 240,
                maxWidth: position.maxW,
              }
            ]}
          >
            <View
              style={styles.card}
              onLayout={(e) => { measuredRef.current = e.nativeEvent.layout; }}
            >
              <View style={styles.header}>
                <Text style={styles.titleText}>{data?.word}</Text>
                <TouchableOpacity accessibilityRole="button" accessibilityLabel="Закрыть" onPress={close}>
                  <Ionicons name="close" size={18} color="#6B7280" />
                </TouchableOpacity>
              </View>
              <Text style={styles.bodyText}>{loading ? 'Загрузка…' : data?.translation}</Text>
              {!loading && data?.translations && data.translations.length > 1 && (
                <Text style={styles.captionText}>
                  Другие значения: {data.translations.slice(1).join(', ')}
                </Text>
              )}
              <View style={styles.actions}>
                {data?.audioUrl && (
                  <TouchableOpacity style={styles.pill} onPress={play} disabled={isPlaying}>
                    <Ionicons name="volume-high" size={16} color="#FFFFFF" />
                    <Text style={styles.pillText}>{isPlaying ? 'Звук…' : 'Слушать'}</Text>
                  </TouchableOpacity>
                )}
                {inDict ? (
                  <View style={styles.addedTag}>
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                    <Text style={styles.addedText}>В словаре</Text>
                  </View>
                ) : (
                  <TouchableOpacity style={styles.pill} onPress={save} disabled={!profile?.id}>
                    <Ionicons name="add" size={16} color="#FFFFFF" />
                    <Text style={styles.pillText}>Добавить</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Animated.View>
        </View>
      )}
    </WordLookupContext.Provider>
  );
};

export const useWordLookup = () => {
  const ctx = useContext(WordLookupContext);
  if (!ctx) throw new Error('useWordLookup must be used within WordLookupProvider');
  return ctx;
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    zIndex: 9999,
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  popup: {
    position: 'absolute',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    gap: 8,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginBottom: 2,
  },
  titleText: {
    fontSize: 19,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
    letterSpacing: -0.3,
  },
  bodyText: {
    fontSize: 15,
    color: '#4B5563',
    fontWeight: '500',
    lineHeight: 20,
  },
  captionText: {
    fontSize: 12,
    color: '#9CA3AF',
    lineHeight: 16,
    marginTop: -2,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 8,
    marginTop: 2,
  },
  pill: {
    backgroundColor: '#3B82F6',
    borderRadius: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    elevation: 2,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  addedTag: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 7,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  addedText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
});
