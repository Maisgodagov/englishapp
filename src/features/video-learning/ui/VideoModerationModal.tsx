import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from 'styled-components/native';
import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';
import { useAppDispatch, useAppSelector } from '@core/store/hooks';
import { selectUserProfile } from '@entities/user/model/selectors';
import { UserRole } from '@shared/constants/roles';
import type {
  CEFRLevel,
  Exercise,
  GrammarComplexity,
  SpeechSpeed,
  TranscriptChunk,
  VideoContent,
  VocabularyComplexity,
} from '../api/videoLearningApi';
import { videoModerationApi } from '../api/videoModerationApi';
import { fetchVideoFeedWithRelaxation, loadVideoContent } from '../model/videoLearningSlice';
import { getContentHeight } from '@shared/utils/dimensions';

type EditableExercise = {
  id: string;
  type: Exercise['type'];
  question: string;
  options: string[];
  correctAnswer: number;
  word?: string;
};

type EditableCaptionRow = {
  id: string;
  start: string;
  end: string;
  text: string;
  translationStart: string;
  translationEnd: string;
  translationText: string;
};

interface VideoModerationModalProps {
  visible: boolean;
  onClose: () => void;
  video?: VideoContent;
}

const TOPIC_TRANSLATIONS: Record<string, string> = {
  "Business": "Бизнес",
  "Technology": "Технологии",
  "Science": "Наука",
  "Health": "Здоровье",
  "Education": "Образование",
  "Entertainment": "Развлечения",
  "Sports": "Спорт",
  "Travel": "Путешествия",
  "Food": "Еда",
  "Fashion": "Мода",
  "Art": "Искусство",
  "Music": "Музыка",
  "Movies": "Кино",
  "Gaming": "Игры",
  "News": "Новости",
  "Politics": "Политика",
  "History": "История",
  "Nature": "Природа",
  "Animals": "Животные",
  "Space": "Космос",
  "Environment": "Экология",
  "Social Issues": "Социальные вопросы",
  "Psychology": "Психология",
  "Philosophy": "Философия",
  "Lifestyle": "Образ жизни",
  "Relationships": "Отношения",
  "Career": "Карьера",
  "Finance": "Финансы",
  "Motivation": "Мотивация",
  "Comedy": "Комедия",
  "Drama": "Драма",
  "Documentary": "Документальное",
  "Tutorial": "Обучение",
  "Review": "Обзор",
  "Interview": "Интервью",
  "Vlog": "Влог",
  "Challenge": "Челлендж",
  "Story": "История",
  "Daily Life": "Повседневная жизнь",
  "Cooking": "Кулинария",
  "DIY": "Своими руками",
  "Beauty": "Красота",
  "Fitness": "Фитнес",
  "Product": "Продукт",
  "Unboxing": "Распаковка",
  "Comparison": "Сравнение",
  "Culture": "Культура",
  "Language": "Язык",
  "How-to": "Как сделать",
  "Tips": "Советы",
  "Reaction": "Реакция",
  "Prank": "Розыгрыш",
  "Experiment": "Эксперимент",
  "Behind the Scenes": "За кулисами",
};

const AVAILABLE_TOPICS = Object.keys(TOPIC_TRANSLATIONS);

const CEFR_OPTIONS: { value: CEFRLevel; label: string }[] = [
  { value: 'A1', label: 'A1 - Beginner' },
  { value: 'A2', label: 'A2 - Elementary' },
  { value: 'B1', label: 'B1 - Intermediate' },
  { value: 'B2', label: 'B2 - Upper-intermediate' },
  { value: 'C1', label: 'C1 - Advanced' },
  { value: 'C2', label: 'C2 - Proficient' },
];

const SPEED_OPTIONS: { value: SpeechSpeed; label: string }[] = [
  { value: 'slow', label: 'Медленно' },
  { value: 'normal', label: 'Нормально' },
  { value: 'fast', label: 'Быстро' },
];

const GRAMMAR_OPTIONS: { value: GrammarComplexity; label: string }[] = [
  { value: 'simple', label: 'Простая' },
  { value: 'intermediate', label: 'Средняя' },
  { value: 'complex', label: 'Сложная' },
];

const VOCAB_OPTIONS: { value: VocabularyComplexity; label: string }[] = [
  { value: 'basic', label: 'Базовая' },
  { value: 'intermediate', label: 'Средняя' },
  { value: 'advanced', label: 'Продвинутая' },
];

const EXERCISE_TYPE_OPTIONS: { value: Exercise['type']; label: string }[] = [
  { value: 'vocabulary', label: 'Словарный запас' },
  { value: 'topic', label: 'Тематика' },
  { value: 'statementCheck', label: 'Проверка утверждения' },
];

const createRowId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatTimestamp = (value?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '';
  return value.toFixed(2).replace(/\.?0+$/, '');
};

const buildCaptionRows = (
  english: TranscriptChunk[] = [],
  translation: TranscriptChunk[] = [],
): EditableCaptionRow[] => {
  const max = Math.max(english.length, translation.length);
  if (max === 0) return [];
  const rows: EditableCaptionRow[] = [];
  for (let index = 0; index < max; index += 1) {
    const en = english[index];
    const ru = translation[index];
    rows.push({
      id: createRowId(),
      start: en ? formatTimestamp(en.timestamp?.[0]) : '',
      end: en ? formatTimestamp(en.timestamp?.[1]) : '',
      text: en?.text ?? '',
      translationStart: ru
        ? formatTimestamp(ru.timestamp?.[0])
        : en
        ? formatTimestamp(en.timestamp?.[0])
        : '',
      translationEnd: ru
        ? formatTimestamp(ru.timestamp?.[1])
        : en
        ? formatTimestamp(en.timestamp?.[1])
        : '',
      translationText: ru?.text ?? '',
    });
  }
  return rows;
};

const normalizeExercise = (exercise: Exercise): EditableExercise => ({
  id: exercise.id,
  type: exercise.type,
  question: exercise.question ?? '',
  options: exercise.options ? [...exercise.options] : ['', ''],
  correctAnswer: typeof exercise.correctAnswer === 'number' ? exercise.correctAnswer : 0,
  word: exercise.type === 'vocabulary' ? exercise.word ?? '' : undefined,
});

export const VideoModerationModal = ({ visible, onClose, video }: VideoModerationModalProps) => {
  const insets = useSafeAreaInsets();
  const theme = useTheme() as any;
  const dispatch = useAppDispatch();
  const profile = useAppSelector(selectUserProfile);

  const [cefrLevel, setCefrLevel] = useState<CEFRLevel>('A1');
  const [speechSpeed, setSpeechSpeed] = useState<SpeechSpeed>('normal');
  const [grammarComplexity, setGrammarComplexity] = useState<GrammarComplexity>('simple');
  const [vocabComplexity, setVocabComplexity] = useState<VocabularyComplexity>('basic');
  const [topics, setTopics] = useState<string[]>([]);
  const [captionRows, setCaptionRows] = useState<EditableCaptionRow[]>([]);
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [isAdultContent, setIsAdultContent] = useState(false);
  const [isModerated, setIsModerated] = useState(false);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [lastSavedKey, setLastSavedKey] = useState<string | null>(null);

  const screenHeight = useMemo(
    () => getContentHeight(insets.top, insets.bottom),
    [insets.top, insets.bottom],
  );
  const modalHeight = screenHeight * 0.88;

  const contentId = video?.id;
  const isAdmin = profile?.role === UserRole.Admin;

  const syncFromVideo = useCallback(
    (source: VideoContent) => {
      setCefrLevel(source.analysis?.cefrLevel ?? 'A1');
      setSpeechSpeed(source.analysis?.speechSpeed ?? 'normal');
      setGrammarComplexity(source.analysis?.grammarComplexity ?? 'simple');
      setVocabComplexity(source.analysis?.vocabularyComplexity ?? 'basic');
      setTopics((source.analysis?.topics ?? []).filter((topic) => AVAILABLE_TOPICS.includes(topic as typeof AVAILABLE_TOPICS[number])));
      setCaptionRows(buildCaptionRows(source.transcription?.chunks, source.translation?.chunks));
      setExercises(source.exercises?.map(normalizeExercise) ?? []);
      setIsAdultContent(Boolean(source.isAdultContent));
      setIsModerated(Boolean(source.isModerated));
    },
    [],
  );

  useEffect(() => {
    if (visible && video) {
      syncFromVideo(video);
    }
  }, [syncFromVideo, video, visible]);

  const ensureAdmin = useCallback(() => {
    if (!profile?.id || profile.role !== UserRole.Admin) {
      Alert.alert('Недостаточно прав', 'Только администратор может редактировать видео.');
      return false;
    }
    if (!contentId) {
      Alert.alert('Видео недоступно', 'Не удалось определить идентификатор видео.');
      return false;
    }
    return true;
  }, [contentId, profile]);

  const runWithLoader = useCallback(
    async (key: string, action: (headers: { userId: string; role: UserRole }) => Promise<VideoContent>) => {
      if (!ensureAdmin() || !contentId || !profile) return;
      setPendingKey(key);
      setLastSavedKey(null);
      try {
        const updated = await action({ userId: profile.id, role: profile.role });
        syncFromVideo(updated);
        setLastSavedKey(key);
        dispatch(loadVideoContent(updated.id));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Не удалось сохранить изменения. Попробуйте позже.';
        Alert.alert('Ошибка', message);
      } finally {
        setPendingKey((prev) => (prev === key ? null : prev));
      }
    },
    [contentId, dispatch, ensureAdmin, profile, syncFromVideo],
  );

  const saveCefr = useCallback(() => {
    if (!contentId) return;
    runWithLoader('cefr', ({ userId, role }) =>
      videoModerationApi.updateCefrLevel(contentId, cefrLevel, userId, role),
    );
  }, [cefrLevel, contentId, runWithLoader]);

  const saveSpeech = useCallback(() => {
    if (!contentId) return;
    runWithLoader('speech', ({ userId, role }) =>
      videoModerationApi.updateSpeechSpeed(contentId, speechSpeed, userId, role),
    );
  }, [contentId, runWithLoader, speechSpeed]);

  const saveGrammar = useCallback(() => {
    if (!contentId) return;
    runWithLoader('grammar', ({ userId, role }) =>
      videoModerationApi.updateGrammarComplexity(contentId, grammarComplexity, userId, role),
    );
  }, [contentId, grammarComplexity, runWithLoader]);

  const saveVocabulary = useCallback(() => {
    if (!contentId) return;
    runWithLoader('vocab', ({ userId, role }) =>
      videoModerationApi.updateVocabularyComplexity(contentId, vocabComplexity, userId, role),
    );
  }, [contentId, runWithLoader, vocabComplexity]);

const saveTopics = useCallback(() => {
  if (!contentId) return;
  const sanitized = topics.filter((topic) => AVAILABLE_TOPICS.includes(topic as typeof AVAILABLE_TOPICS[number]));
  runWithLoader('topics', ({ userId, role }) =>
    videoModerationApi.updateTopics(contentId, sanitized, userId, role),
  );
}, [contentId, runWithLoader, topics]);

  const transformCaptions = useCallback(() => {
    const english: TranscriptChunk[] = [];
    const translation: TranscriptChunk[] = [];

    captionRows.forEach((row, index) => {
      const start = Number.parseFloat(row.start.replace(',', '.'));
      const end = Number.parseFloat(row.end.replace(',', '.'));
      if (!row.text.trim()) return;
      if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
        throw new Error(`Проверьте таймкоды в фрагменте ${index + 1}`);
      }
      english.push({
        text: row.text.trim(),
        timestamp: [start, end],
      });

      const translationText = row.translationText.trim();
      const translationStart = Number.parseFloat(row.translationStart.replace(',', '.'));
      const translationEnd = Number.parseFloat(row.translationEnd.replace(',', '.'));
      const fallbackStart = Number.isFinite(translationStart) ? translationStart : start;
      const fallbackEnd = Number.isFinite(translationEnd) ? translationEnd : end;
      if (fallbackEnd < fallbackStart) {
        throw new Error(`Проверьте таймкоды перевода в фрагменте ${index + 1}`);
      }
      translation.push({
        text: translationText,
        timestamp: [fallbackStart, fallbackEnd],
      });
    });

    if (!english.length) {
      throw new Error('Добавьте хотя бы один фрагмент субтитров.');
    }

    return { english, translation };
  }, [captionRows]);

  const saveCaptions = useCallback(() => {
    if (!contentId) return;
    try {
      const { english, translation } = transformCaptions();
      runWithLoader('captions', async ({ userId, role }) => {
        await videoModerationApi.updateTranscriptChunks(contentId, english, userId, role);
        return videoModerationApi.updateTranslationChunks(contentId, translation, userId, role);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Не удалось подготовить субтитры.';
      Alert.alert('Ошибка', message);
    }
  }, [contentId, runWithLoader, transformCaptions]);

  const saveExercises = useCallback(() => {
    if (!contentId) return;
    const sanitized = exercises.map((exercise) => ({
      ...exercise,
      question: exercise.question.trim(),
      options: exercise.options.map((option) => option.trim()),
      word: exercise.type === 'vocabulary' ? (exercise.word ?? '').trim() : undefined,
    }));
    runWithLoader('exercises', ({ userId, role }) =>
      videoModerationApi.updateExercises(contentId, sanitized, userId, role),
    );
  }, [contentId, exercises, runWithLoader]);

  const saveAdultFlag = useCallback(() => {
    if (!contentId) return;
    runWithLoader('adult', ({ userId, role }) =>
      videoModerationApi.updateAdultContentFlag(contentId, isAdultContent, userId, role),
    );
  }, [contentId, isAdultContent, runWithLoader]);

  const saveModerationStatus = useCallback(() => {
    if (!contentId) return;
    runWithLoader('moderation', ({ userId, role }) =>
      videoModerationApi.updateModerationStatus(contentId, isModerated, userId, role),
    );
  }, [contentId, isModerated, runWithLoader]);

  const handleDeleteVideo = useCallback(() => {
    if (!ensureAdmin() || !contentId || !profile) return;
    Alert.alert(
      'Удалить видео',
      'Удаление нельзя будет отменить. Продолжить?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            setPendingKey('delete');
            try {
              await videoModerationApi.deleteVideo(contentId, profile.id, profile.role);
              onClose();
              dispatch(fetchVideoFeedWithRelaxation({ attemptNumber: 0 }));
            } catch (error) {
              const message =
                error instanceof Error ? error.message : 'Не удалось удалить видео. Попробуйте позже.';
              Alert.alert('Ошибка', message);
            } finally {
              setPendingKey((prev) => (prev === 'delete' ? null : prev));
            }
          },
        },
      ],
    );
  }, [contentId, dispatch, ensureAdmin, onClose, profile]);

  const updateCaptionRow = useCallback((rowId: string, updates: Partial<EditableCaptionRow>) => {
    setCaptionRows((prev) => prev.map((row) => (row.id === rowId ? { ...row, ...updates } : row)));
  }, []);

  const removeCaptionRow = useCallback((rowId: string) => {
    setCaptionRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const addCaptionRow = useCallback(() => {
    setCaptionRows((prev) => [
      ...prev,
      {
        id: createRowId(),
        start: '',
        end: '',
        text: '',
        translationStart: '',
        translationEnd: '',
        translationText: '',
      },
    ]);
  }, []);

  const updateExercise = useCallback((exerciseId: string, updates: Partial<EditableExercise>) => {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId
          ? {
              ...exercise,
              ...updates,
              options: updates.options ?? exercise.options,
              word:
                updates.type && updates.type !== 'vocabulary'
                  ? undefined
                  : updates.word ?? exercise.word,
            }
          : exercise,
      ),
    );
  }, []);

  const addExercise = useCallback(() => {
    setExercises((prev) => [
      ...prev,
      {
        id: `exercise-${createRowId()}`,
        type: 'vocabulary',
        question: '',
        options: ['', ''],
        correctAnswer: 0,
        word: '',
      },
    ]);
  }, []);

  const removeExercise = useCallback((exerciseId: string) => {
    setExercises((prev) => prev.filter((exercise) => exercise.id !== exerciseId));
  }, []);

  const addExerciseOption = useCallback((exerciseId: string) => {
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === exerciseId ? { ...exercise, options: [...exercise.options, ''] } : exercise,
      ),
    );
  }, []);

  const removeExerciseOption = useCallback((exerciseId: string, optionIndex: number) => {
    setExercises((prev) =>
      prev.map((exercise) => {
        if (exercise.id !== exerciseId) return exercise;
        if (exercise.options.length <= 2) return exercise;
        const nextOptions = exercise.options.filter((_, index) => index !== optionIndex);
        const nextAnswer = Math.min(exercise.correctAnswer, nextOptions.length - 1);
        return { ...exercise, options: nextOptions, correctAnswer: Math.max(0, nextAnswer) };
      }),
    );
  }, []);

  const [dropdownStates, setDropdownStates] = useState<Record<string, boolean>>({});
  const [showTagsModal, setShowTagsModal] = useState(false);
  const [tempSelectedTags, setTempSelectedTags] = useState<string[]>([]);
  const [showSubtitlesEditor, setShowSubtitlesEditor] = useState(false);
  const [showExercisesEditor, setShowExercisesEditor] = useState(false);

  const toggleDropdown = useCallback((key: string) => {
    setDropdownStates(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const closeDropdown = useCallback((key: string) => {
    setDropdownStates(prev => ({ ...prev, [key]: false }));
  }, []);

  const openTagsModal = useCallback(() => {
    setTempSelectedTags([...topics]);
    setShowTagsModal(true);
  }, [topics]);

  const closeTagsModal = useCallback(() => {
    setShowTagsModal(false);
  }, []);

  const toggleTempTag = useCallback((tag: string) => {
    setTempSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  }, []);

  const confirmTagsSelection = useCallback(() => {
    setTopics(tempSelectedTags);
    setShowTagsModal(false);
  }, [tempSelectedTags]);

  const removeTag = useCallback((tag: string) => {
    setTopics(prev => prev.filter(t => t !== tag));
  }, []);

  const renderCompactSelector = (
    title: string,
    options: { value: string; label: string }[],
    value: string,
    onSelect: (next: string) => void,
    saveKey: string,
    onSave: () => void,
  ) => {
    const selectedOption = options.find(opt => opt.value === value);
    const isOpen = dropdownStates[saveKey] || false;

    return (
      <View style={styles.compactSection}>
        <Typography variant="subtitle" weight="semibold" style={styles.sectionTitle}>
          {title}
        </Typography>
        <View style={styles.compactRow}>
          <TouchableOpacity
            style={styles.compactDropdown}
            onPress={() => toggleDropdown(saveKey)}
            activeOpacity={0.7}
          >
            <Typography variant="body" style={{ color: theme.colors.text, flex: 1 }}>
              {selectedOption?.label}
            </Typography>
            <Ionicons
              name={isOpen ? "chevron-up" : "chevron-down"}
              size={20}
              color={theme.colors.textSecondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveIconButton,
              {
                backgroundColor: pendingKey === saveKey ? theme.colors.border : theme.colors.primary,
              }
            ]}
            onPress={onSave}
            activeOpacity={0.7}
            disabled={pendingKey === saveKey}
          >
            {pendingKey === saveKey ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : lastSavedKey === saveKey ? (
              <Ionicons name="checkmark" size={20} color="#FFFFFF" />
            ) : (
              <Ionicons name="save" size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={isOpen}
          transparent
          animationType="fade"
          onRequestClose={() => closeDropdown(saveKey)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => closeDropdown(saveKey)}
          >
            <View style={styles.modalContainer} onStartShouldSetResponder={() => true}>
              <View
                style={[
                  styles.dropdownContent,
                  { backgroundColor: theme.colors.surface }
                ]}
              >
                {options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.option,
                      {
                        backgroundColor: option.value === value
                          ? theme.colors.primary + '15'
                          : 'transparent',
                        borderBottomColor: theme.colors.border,
                      }
                    ]}
                    onPress={() => {
                      onSelect(option.value);
                      closeDropdown(saveKey);
                    }}
                    activeOpacity={0.7}
                  >
                    <Typography
                      variant="body"
                      style={[
                        styles.optionText,
                        { color: option.value === value ? theme.colors.primary : theme.colors.text }
                      ]}
                      enableWordLookup={false}
                    >
                      {option.label}
                    </Typography>
                    {option.value === value && (
                      <Ionicons
                        name="checkmark"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => {}}
          style={[
            styles.modal,
            {
              height: modalHeight,
              backgroundColor: theme.colors.background,
              paddingBottom: Math.max(insets.bottom, 16),
            },
          ]}
        >
          <View style={styles.header}>
            <View>
              <Typography variant="title" weight="bold">
                Модерация видео
              </Typography>
              <Typography variant="caption" style={{ color: theme.colors.textSecondary }}>
                {video?.videoName ?? 'Без названия'} · ID: {contentId ?? '—'}
              </Typography>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={theme.colors.text} />
            </TouchableOpacity>
          </View>

          {!isAdmin ? (
            <View style={styles.centered}>
              <Typography variant="body" align="center">
                Для доступа к модерации требуется роль администратора.
              </Typography>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {renderCompactSelector('Уровень сложности', CEFR_OPTIONS, cefrLevel, (next) => setCefrLevel(next as CEFRLevel), 'cefr', saveCefr)}
              {renderCompactSelector('Скорость речи', SPEED_OPTIONS, speechSpeed, (next) => setSpeechSpeed(next as SpeechSpeed), 'speech', saveSpeech)}
              {renderCompactSelector('Грамматическая сложность', GRAMMAR_OPTIONS, grammarComplexity, (next) => setGrammarComplexity(next as GrammarComplexity), 'grammar', saveGrammar)}
              {renderCompactSelector('Сложность словаря', VOCAB_OPTIONS, vocabComplexity, (next) => setVocabComplexity(next as VocabularyComplexity), 'vocab', saveVocabulary)}

              {/* Topics */}
              <View style={styles.compactSection}>
                <Typography variant="subtitle" weight="semibold" style={styles.sectionTitle}>
                  Теги темы
                </Typography>
                <View style={styles.tagsContainer}>
                  {topics.map((topic) => (
                    <View
                      key={topic}
                      style={[
                        styles.tagChip,
                        { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }
                      ]}
                    >
                      <Typography
                        variant="caption"
                        style={{ color: '#FFFFFF', marginRight: 4 }}
                        enableWordLookup={false}
                      >
                        {TOPIC_TRANSLATIONS[topic] || topic}
                      </Typography>
                      <TouchableOpacity onPress={() => removeTag(topic)} activeOpacity={0.7}>
                        <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addTagButton}
                    onPress={openTagsModal}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={20} color={theme.colors.text} />
                  </TouchableOpacity>
                </View>
                <View style={styles.compactRow}>
                  <TouchableOpacity
                    style={[
                      styles.saveIconButton,
                      {
                        backgroundColor: pendingKey === 'topics' ? theme.colors.border : theme.colors.primary,
                      }
                    ]}
                    onPress={saveTopics}
                    activeOpacity={0.7}
                    disabled={pendingKey === 'topics'}
                  >
                    {pendingKey === 'topics' ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : lastSavedKey === 'topics' ? (
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    ) : (
                      <Ionicons name="save" size={20} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* Tags selection modal */}
                <Modal
                  visible={showTagsModal}
                  transparent
                  animationType="slide"
                  onRequestClose={closeTagsModal}
                >
                  <View style={styles.tagsModalOverlay}>
                    <View
                      style={[
                        styles.tagsModalContent,
                        {
                          backgroundColor: theme.colors.background,
                          paddingBottom: Math.max(insets.bottom, 16),
                        }
                      ]}
                    >
                      <View style={styles.tagsModalHeader}>
                        <Typography variant="title" weight="bold">
                          Выберите теги
                        </Typography>
                        <TouchableOpacity onPress={closeTagsModal} activeOpacity={0.7}>
                          <Ionicons name="close" size={24} color={theme.colors.text} />
                        </TouchableOpacity>
                      </View>
                      <ScrollView style={styles.tagsModalScroll}>
                        <View style={styles.topicGrid}>
                          {AVAILABLE_TOPICS.map((topic) => {
                            const isSelected = tempSelectedTags.includes(topic);
                            return (
                              <TouchableOpacity
                                key={topic}
                                style={[
                                  styles.topicToggle,
                                  {
                                    backgroundColor: isSelected ? theme.colors.primary : theme.colors.surface,
                                    borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                                  },
                                ]}
                                onPress={() => toggleTempTag(topic)}
                                activeOpacity={0.8}
                              >
                                <Typography
                                  variant="body"
                                  weight="semibold"
                                  style={{ color: isSelected ? '#FFFFFF' : theme.colors.text }}
                                  enableWordLookup={false}
                                >
                                  {TOPIC_TRANSLATIONS[topic] || topic}
                                </Typography>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                      <TouchableOpacity
                        style={[
                          styles.confirmButton,
                          { backgroundColor: theme.colors.primary }
                        ]}
                        onPress={confirmTagsSelection}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                        <Typography variant="body" weight="bold" style={{ color: '#FFFFFF' }}>
                          Подтвердить выбор
                        </Typography>
                      </TouchableOpacity>
                    </View>
                  </View>
                </Modal>
              </View>
              {/* Subtitles */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Typography variant="subtitle" weight="semibold" style={styles.sectionTitle}>
                    Субтитры
                  </Typography>
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      { backgroundColor: showSubtitlesEditor ? theme.colors.primary : 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => setShowSubtitlesEditor(!showSubtitlesEditor)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showSubtitlesEditor ? "chevron-up" : "create-outline"}
                      size={20}
                      color={showSubtitlesEditor ? "#FFFFFF" : theme.colors.text}
                    />
                    <Typography
                      variant="body"
                      style={{ color: showSubtitlesEditor ? "#FFFFFF" : theme.colors.text }}
                      enableWordLookup={false}
                    >
                      {showSubtitlesEditor ? "Скрыть" : "Редактировать"}
                    </Typography>
                  </TouchableOpacity>
                </View>

                {showSubtitlesEditor && (
                  <>
                    <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
                      Укажите тайм-коды (секунды) и тексты для английской и русской дорожки.
                    </Typography>
                    {captionRows.map((row, index) => (
                  <View
                    key={row.id}
                    style={[
                      styles.captionCard,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <View style={styles.captionHeader}>
                      <Typography variant="body" weight="semibold">
                        Фрагмент {index + 1}
                      </Typography>
                      <TouchableOpacity onPress={() => removeCaptionRow(row.id)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <RowTimes
                      label="EN"
                      start={row.start}
                      end={row.end}
                      onChangeStart={(value) => updateCaptionRow(row.id, { start: value })}
                      onChangeEnd={(value) => updateCaptionRow(row.id, { end: value })}
                      themeColors={theme.colors}
                    />
                    <LabeledTextArea
                      label="Английский текст"
                      value={row.text}
                      onChange={(value) => updateCaptionRow(row.id, { text: value })}
                      themeColors={theme.colors}
                    />
                    <RowTimes
                      label="RU"
                      start={row.translationStart}
                      end={row.translationEnd}
                      onChangeStart={(value) => updateCaptionRow(row.id, { translationStart: value })}
                      onChangeEnd={(value) => updateCaptionRow(row.id, { translationEnd: value })}
                      themeColors={theme.colors}
                    />
                    <LabeledTextArea
                      label="Перевод"
                      value={row.translationText}
                      onChange={(value) => updateCaptionRow(row.id, { translationText: value })}
                      themeColors={theme.colors}
                    />
                  </View>
                ))}
                <TouchableOpacity
                  style={[
                    styles.addRowButton,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                  ]}
                  onPress={addCaptionRow}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add" size={18} color={theme.colors.text} />
                  <Typography variant="body" style={{ color: theme.colors.text }}>
                    Добавить фрагмент
                  </Typography>
                </TouchableOpacity>
                    <ActionButton
                      label="Сохранить субтитры"
                      variant="primary"
                      loading={pendingKey === 'captions'}
                      onPress={saveCaptions}
                    />
                    {lastSavedKey === 'captions' && (
                      <Typography variant="caption" style={styles.successLabel}>
                        Сохранено
                      </Typography>
                    )}
                  </>
                )}
              </View>

              {/* Exercises */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Typography variant="subtitle" weight="semibold" style={styles.sectionTitle}>
                    Упражнения
                  </Typography>
                  <TouchableOpacity
                    style={[
                      styles.editButton,
                      { backgroundColor: showExercisesEditor ? theme.colors.primary : 'rgba(255, 255, 255, 0.1)' }
                    ]}
                    onPress={() => setShowExercisesEditor(!showExercisesEditor)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={showExercisesEditor ? "chevron-up" : "create-outline"}
                      size={20}
                      color={showExercisesEditor ? "#FFFFFF" : theme.colors.text}
                    />
                    <Typography
                      variant="body"
                      style={{ color: showExercisesEditor ? "#FFFFFF" : theme.colors.text }}
                      enableWordLookup={false}
                    >
                      {showExercisesEditor ? "Скрыть" : "Редактировать"}
                    </Typography>
                  </TouchableOpacity>
                </View>

                {showExercisesEditor && (
                  <>
                    {exercises.map((exercise, index) => (
                  <View
                    key={exercise.id}
                    style={[
                      styles.exerciseCard,
                      { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                    ]}
                  >
                    <View style={styles.captionHeader}>
                      <Typography variant="body" weight="semibold">
                        Упражнение {index + 1}
                      </Typography>
                      <TouchableOpacity onPress={() => removeExercise(exercise.id)} activeOpacity={0.7}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.optionRow}>
                      {EXERCISE_TYPE_OPTIONS.map((option) => {
                        const active = option.value === exercise.type;
                        return (
                          <TouchableOpacity
                            key={option.value}
                            style={[
                              styles.optionChip,
                              {
                                backgroundColor: active ? theme.colors.primary : theme.colors.backgroundAlt,
                                borderColor: active ? theme.colors.primary : theme.colors.border,
                              },
                            ]}
                            onPress={() =>
                              updateExercise(exercise.id, {
                                type: option.value,
                                word: option.value === 'vocabulary' ? exercise.word ?? '' : undefined,
                              })
                            }
                            activeOpacity={0.8}
                          >
                            <Typography
                              variant="caption"
                              weight={active ? 'bold' : 'regular'}
                              style={{ color: active ? '#FFFFFF' : theme.colors.text }}
                            >
                              {option.label}
                            </Typography>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    <LabeledTextArea
                      label="Вопрос"
                      value={exercise.question}
                      onChange={(value) => updateExercise(exercise.id, { question: value })}
                      themeColors={theme.colors}
                    />
                    {exercise.type === 'vocabulary' && (
                      <LabeledTextInput
                        label="Слово"
                        value={exercise.word ?? ''}
                        onChange={(value) => updateExercise(exercise.id, { word: value })}
                        themeColors={theme.colors}
                      />
                    )}
                    <View style={styles.optionsContainer}>
                      {exercise.options.map((option, optionIndex) => {
                        const isCorrect = exercise.correctAnswer === optionIndex;
                        return (
                          <View key={`${exercise.id}-option-${optionIndex}`} style={styles.optionRowItem}>
                            <TouchableOpacity
                              style={[
                                styles.radio,
                                {
                                  borderColor: isCorrect ? theme.colors.primary : theme.colors.border,
                                  backgroundColor: isCorrect ? theme.colors.primary : 'transparent',
                                },
                              ]}
                              onPress={() => updateExercise(exercise.id, { correctAnswer: optionIndex })}
                              activeOpacity={0.7}
                            >
                              {isCorrect && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                            </TouchableOpacity>
                            <TextInput
                              value={option}
                              onChangeText={(value) => {
                                const next = exercise.options.map((current, idx) =>
                                  idx === optionIndex ? value : current,
                                );
                                updateExercise(exercise.id, { options: next });
                              }}
                              style={[
                                styles.textInput,
                                {
                                  backgroundColor: theme.colors.backgroundAlt,
                                  borderColor: theme.colors.border,
                                  color: theme.colors.text,
                                },
                              ]}
                            />
                            {exercise.options.length > 2 && (
                              <TouchableOpacity
                                onPress={() => removeExerciseOption(exercise.id, optionIndex)}
                                style={styles.optionRemove}
                                activeOpacity={0.7}
                              >
                                <Ionicons name="remove-circle-outline" size={20} color={theme.colors.textSecondary} />
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                      <TouchableOpacity
                        style={[
                          styles.addOptionButton,
                          { borderColor: theme.colors.border, backgroundColor: theme.colors.backgroundAlt },
                        ]}
                        onPress={() => addExerciseOption(exercise.id)}
                        activeOpacity={0.8}
                      >
                        <Ionicons name="add" size={16} color={theme.colors.text} />
                        <Typography variant="caption" style={{ color: theme.colors.text }}>
                          Добавить вариант
                        </Typography>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
                <TouchableOpacity
                  style={[
                    styles.addRowButton,
                    { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
                  ]}
                  onPress={addExercise}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={18} color={theme.colors.text} />
                  <Typography variant="body" style={{ color: theme.colors.text }}>
                    Добавить упражнение
                  </Typography>
                </TouchableOpacity>
                    <ActionButton
                      label="Сохранить упражнения"
                      variant="primary"
                      loading={pendingKey === 'exercises'}
                      onPress={saveExercises}
                    />
                    {lastSavedKey === 'exercises' && (
                      <Typography variant="caption" style={styles.successLabel}>
                        Сохранено
                      </Typography>
                    )}
                  </>
                )}
              </View>

              {/* Adult flag */}
              <View style={styles.section}>
                <Typography variant="subtitle" weight="semibold" style={styles.sectionTitle}>
                  Возрастные ограничения
                </Typography>
                <View style={styles.toggleRow}>
                  <Typography variant="body">Видео содержит 18+ контент</Typography>
                  <Switch
                    value={isAdultContent}
                    onValueChange={setIsAdultContent}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <ActionButton
                  label="Сохранить"
                  variant="secondary"
                  loading={pendingKey === 'adult'}
                  onPress={saveAdultFlag}
                />
                {lastSavedKey === 'adult' && (
                  <Typography variant="caption" style={styles.successLabel}>
                    Сохранено
                  </Typography>
                )}
              </View>

              {/* Moderation */}
              <View style={styles.section}>
                <Typography variant="subtitle" weight="semibold" style={styles.sectionTitle}>
                  Статус модерации
                </Typography>
                <View style={styles.toggleRow}>
                  <Typography variant="body">Видео прошло модерацию</Typography>
                  <Switch
                    value={isModerated}
                    onValueChange={setIsModerated}
                    trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                    thumbColor="#FFFFFF"
                  />
                </View>
                <ActionButton
                  label="Сохранить"
                  variant="secondary"
                  loading={pendingKey === 'moderation'}
                  onPress={saveModerationStatus}
                />
                {lastSavedKey === 'moderation' && (
                  <Typography variant="caption" style={styles.successLabel}>
                    Сохранено
                  </Typography>
                )}
              </View>

              {/* Danger zone */}
              <View style={styles.section}>
                <Typography variant="subtitle" weight="semibold" style={[styles.sectionTitle, { color: theme.colors.danger ?? '#EF4444' }]}>
                  Опасная зона
                </Typography>
                <Typography variant="caption" style={{ color: theme.colors.textSecondary, marginBottom: 8 }}>
                  Удаление видео необратимо. Прогресс студентов и лайки будут потеряны.
                </Typography>
                <ActionButton
                  label="Удалить видео"
                  variant="danger"
                  loading={pendingKey === 'delete'}
                  onPress={handleDeleteVideo}
                />
              </View>
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );

  // eslint-disable-next-line react/no-unstable-nested-components
  function ActionButton({
    label,
    onPress,
    loading,
    variant,
  }: {
    label: string;
    onPress: () => void;
    loading: boolean;
    variant: 'primary' | 'secondary' | 'danger';
  }) {
    const backgroundColor =
      variant === 'primary'
        ? theme.colors.primary
        : variant === 'danger'
        ? theme.colors.danger ?? '#EF4444'
        : theme.colors.surface;
    const textColor = variant === 'secondary' ? theme.colors.text : '#FFFFFF';
    const borderColor = variant === 'secondary' ? theme.colors.border : backgroundColor;

    return (
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor,
            borderColor,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.85}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator size="small" color={textColor} />
        ) : (
          <Typography variant="body" weight="bold" style={{ color: textColor }}>
            {label}
          </Typography>
        )}
      </TouchableOpacity>
    );
  }
};

interface ThemeColors {
  text: string;
  textSecondary: string;
  border: string;
  surface: string;
  primary: string;
  backgroundAlt: string;
  danger?: string;
}

const RowTimes = ({
  label,
  start,
  end,
  onChangeStart,
  onChangeEnd,
  themeColors,
}: {
  label: string;
  start: string;
  end: string;
  onChangeStart: (value: string) => void;
  onChangeEnd: (value: string) => void;
  themeColors: ThemeColors;
}) => (
  <View style={styles.timeRow}>
    <View style={styles.timeColumn}>
      <Typography variant="caption" style={styles.captionLabel}>
        {label} start
      </Typography>
      <TextInput
        value={start}
        onChangeText={onChangeStart}
        keyboardType="decimal-pad"
        style={[
          styles.timeInput,
          {
            backgroundColor: themeColors.backgroundAlt,
            borderColor: themeColors.border,
            color: themeColors.text,
          },
        ]}
      />
    </View>
    <View style={styles.timeColumn}>
      <Typography variant="caption" style={styles.captionLabel}>
        {label} end
      </Typography>
      <TextInput
        value={end}
        onChangeText={onChangeEnd}
        keyboardType="decimal-pad"
        style={[
          styles.timeInput,
          {
            backgroundColor: themeColors.backgroundAlt,
            borderColor: themeColors.border,
            color: themeColors.text,
          },
        ]}
      />
    </View>
  </View>
);

const LabeledTextArea = ({
  label,
  value,
  onChange,
  themeColors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  themeColors: ThemeColors;
}) => (
  <View style={styles.textAreaBlock}>
    <Typography variant="caption" style={styles.captionLabel}>
      {label}
    </Typography>
    <TextInput
      value={value}
      onChangeText={onChange}
      multiline
      style={[
        styles.textArea,
        {
          backgroundColor: themeColors.backgroundAlt,
          borderColor: themeColors.border,
          color: themeColors.text,
        },
      ]}
    />
  </View>
);

const LabeledTextInput = ({
  label,
  value,
  onChange,
  themeColors,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  themeColors: ThemeColors;
}) => (
  <View style={styles.textAreaBlock}>
    <Typography variant="caption" style={styles.captionLabel}>
      {label}
    </Typography>
    <TextInput
      value={value}
      onChangeText={onChange}
      style={[
        styles.textInput,
        {
          backgroundColor: themeColors.backgroundAlt,
          borderColor: themeColors.border,
          color: themeColors.text,
        },
      ]}
    />
  </View>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modal: {
    width: '100%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  closeButton: {
    padding: 6,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
  },
  optionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  successLabel: {
    color: '#22C55E',
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  topicToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 12,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  captionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  captionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  timeRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeColumn: {
    flex: 1,
    gap: 6,
  },
  captionLabel: {
    opacity: 0.7,
  },
  timeInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textAreaBlock: {
    gap: 6,
  },
  textArea: {
    minHeight: 72,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    textAlignVertical: 'top',
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  exerciseCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  optionsContainer: {
    gap: 8,
  },
  optionRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRemove: {
    padding: 4,
  },
  addOptionButton: {
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  compactSection: {
    gap: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 0,
  },
  compactRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  compactDropdown: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 0,
  },
  saveIconButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 320,
    maxHeight: '60%',
  },
  dropdownContent: {
    borderRadius: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionText: {
    flex: 1,
    fontSize: 15,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    alignItems: 'center',
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 0,
  },
  addTagButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  tagsModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  tagsModalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    maxHeight: '80%',
  },
  tagsModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  tagsModalScroll: {
    maxHeight: '70%',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 16,
  },
});



