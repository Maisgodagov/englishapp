import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { useTheme } from "styled-components/native";
import {
  Input,
  PrimaryButton,
  SecondaryButton,
  SurfaceCard,
  TextButton,
  Typography,
} from "@shared/ui";
import {
  type CreateLessonPayload,
  type LessonBlockCallout,
  type LessonBlockEmbed,
  type LessonBlockList,
  type LessonBlockMedia,
  type LessonBlockQuiz,
  type LessonBlockText,
  type LessonBlockType,
  type LessonContentBlock,
  type LessonDetail,
} from "../model/types";
import { LessonBlockEditor } from "./LessonBlockEditor";
interface LessonBuilderProps {
  onSubmit: (payload: CreateLessonPayload) => Promise<void>;
  isSaving?: boolean;
  initialLesson?: LessonDetail | null;
  submitLabel?: string;
}
type BlockOption = {
  type: LessonBlockType;
  label: string;
  description: string;
};
const blockOptions: BlockOption[] = [
  {
    type: "text",
    label: "Текст",
    description: "Заголовки, параграфы и цитаты",
  },
  {
    type: "media",
    label: "Медиа",
    description: "Изображения, видео или аудио",
  },
  {
    type: "quiz",
    label: "Тест",
    description: "Вопрос с вариантами ответов",
  },
  {
    type: "callout",
    label: "Подсказка",
    description: "Заметка или важное сообщение",
  },
  {
    type: "list",
    label: "Список",
    description: "Маркированный или нумерованный список",
  },
  {
    type: "embed",
    label: "Встроить",
    description: "Вставка внешнего контента",
  },
];
const generateId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 7)}`;
const createBlock = (type: LessonBlockType): LessonContentBlock => {
  switch (type) {
    case "text":
      return {
        id: generateId("text"),
        type: "text",
        text: "",
        format: "paragraph",
      } as LessonBlockText;
    case "media":
      return {
        id: generateId("media"),
        type: "media",
        mediaType: "image",
        url: "",
      } as LessonBlockMedia;
    case "quiz":
      return {
        id: generateId("quiz"),
        type: "quiz",
        question: "",
        options: ["", ""],
        correctOption: 0,
      } as LessonBlockQuiz;
    case "callout":
      return {
        id: generateId("callout"),
        type: "callout",
        body: "",
        variant: "info",
      } as LessonBlockCallout;
    case "list":
      return {
        id: generateId("list"),
        type: "list",
        ordered: false,
        items: [],
      } as LessonBlockList;
    case "embed":
    default:
      return {
        id: generateId("embed"),
        type: "embed",
        url: "",
      } as LessonBlockEmbed;
  }
};
const normalizeBlocks = (blocks: LessonContentBlock[]): LessonContentBlock[] =>
  blocks.map((block, index) => ({
    ...block,
    id: block.id || `${block.type}-${index + 1}`,
  }));
export const LessonBuilder = ({
  onSubmit,
  isSaving = false,
  initialLesson = null,
  submitLabel,
}: LessonBuilderProps) => {
  const theme = useTheme();
  const styles = useMemo(() => getStyles(theme), [theme]);
  const [title, setTitle] = useState(initialLesson?.title ?? "");
  const [description, setDescription] = useState(
    initialLesson?.description ?? ""
  );
  const [xpReward, setXpReward] = useState(
    String(initialLesson?.xpReward ?? 15)
  );
  const [duration, setDuration] = useState(
    initialLesson?.durationMinutes ? String(initialLesson.durationMinutes) : ""
  );
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [blocks, setBlocks] = useState<LessonContentBlock[]>(
    initialLesson
      ? normalizeBlocks(initialLesson.content.blocks)
      : [createBlock("text")]
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const applyInitialLesson = useCallback((lesson: LessonDetail | null) => {
    if (lesson) {
      setTitle(lesson.title);
      setDescription(lesson.description ?? "");
      setXpReward(String(lesson.xpReward));
      setDuration(lesson.durationMinutes ? String(lesson.durationMinutes) : "");
      setBlocks(normalizeBlocks(lesson.content.blocks));
    } else {
      setTitle("");
      setDescription("");
      setXpReward("15");
      setDuration("");
      setBlocks([createBlock("text")]);
    }
    setTags([]);
    setTagInput("");
    setErrorMessage(null);
  }, []);
  useEffect(() => {
    applyInitialLesson(initialLesson ?? null);
  }, [applyInitialLesson, initialLesson]);
  const handleAddBlock = (type: LessonBlockType) => {
    setBlocks((prev) => [...prev, createBlock(type)]);
  };
  const handleUpdateBlock = (index: number, block: LessonContentBlock) => {
    setBlocks((prev) => prev.map((item, i) => (i === index ? block : item)));
  };
  const handleRemoveBlock = (index: number) => {
    setBlocks((prev) => prev.filter((_, i) => i !== index));
  };
  const handleMoveBlock = (from: number, to: number) => {
    setBlocks((prev) => {
      const next = prev.slice();
      const [removed] = next.splice(from, 1);
      next.splice(to, 0, removed);
      return next;
    });
  };
  const handleAddTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag || tags.includes(nextTag)) return;
    setTags((prev) => [...prev, nextTag]);
    setTagInput("");
  };
  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((item) => item !== tag));
  };
  const validateForm = () => {
    if (!title.trim()) {
      setErrorMessage("Введите название урока.");
      return false;
    }
    if (!blocks.length) {
      setErrorMessage("Добавьте хотя бы один блок с контентом.");
      return false;
    }
    if (
      blocks.some(
        (block) =>
          block.type === "text" &&
          !((block as LessonBlockText).text || "").trim()
      )
    ) {
      setErrorMessage("Заполните текстовые блоки или удалите их.");
      return false;
    }
    setErrorMessage(null);
    return true;
  };
  const handleSubmit = async () => {
    if (!validateForm()) return;
    const parsedXp = Number.parseInt(xpReward, 10);
    const parsedDuration = Number.parseInt(duration, 10);
    const payload: CreateLessonPayload = {
      title: title.trim(),
      description: description.trim() ? description.trim() : undefined,
      xpReward: Number.isFinite(parsedXp) ? parsedXp : undefined,
      durationMinutes: Number.isFinite(parsedDuration)
        ? parsedDuration
        : undefined,
      tags: tags.length ? tags : undefined,
      content: {
        version: "1.0.0",
        blocks: blocks.map((block, index) => ({
          ...block,
          id: block.id || `${block.type}-${index + 1}`,
        })),
      },
    };
    await onSubmit(payload);
    if (!initialLesson) {
      applyInitialLesson(null);
    }
  };
  const handleReset = () => {
    applyInitialLesson(initialLesson);
  };
  const submitText =
    submitLabel ?? (initialLesson ? "Обновить урок" : "Сохранить урок");
  const resetText = initialLesson ? "Сбросить изменения" : "Очистить контент";
  const sectionTitle = initialLesson ? "Редактирование урока" : "Новый урок";
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <SurfaceCard>
        <View style={styles.section}>
          <Typography variant="title" style={styles.sectionTitle}>
            {sectionTitle}
          </Typography>
          <Typography variant="body" style={styles.sectionDescription}>
            Заполните основную информацию и добавьте блоки контента, которые
            увидит ученик.
          </Typography>
          <Input
            label="Название урока"
            value={title}
            onChangeText={setTitle}
            placeholder="Например: Present Simple — основы"
          />
          <Input
            label="Краткое описание"
            value={description}
            onChangeText={setDescription}
            placeholder="Что изучит ученик в этом уроке?"
            multiline
            numberOfLines={4}
          />
          <View style={styles.row}>
            <View style={styles.rowItem}>
              <Input
                label="XP за прохождение"
                value={xpReward}
                onChangeText={setXpReward}
                keyboardType="numeric"
                placeholder="15"
              />
            </View>
            <View style={styles.rowItem}>
              <Input
                label="Длительность (минуты)"
                value={duration}
                onChangeText={setDuration}
                keyboardType="numeric"
                placeholder="10"
              />
            </View>
          </View>
          <View style={styles.tagsContainer}>
            <Typography variant="subtitle" style={styles.tagsTitle}>
              Теги (необязательно)
            </Typography>
            <View style={styles.tagInputRow}>
              <Input
                label="Добавить тег"
                value={tagInput}
                onChangeText={setTagInput}
                placeholder="Грамматика"
              />
              <PrimaryButton
                onPress={handleAddTag}
                style={styles.addTagButton}
                disabled={!tagInput.trim()}
              >
                Добавить
              </PrimaryButton>
            </View>
            <View style={styles.tagsList}>
              {tags.map((tag) => (
                <TagChip
                  key={tag}
                  label={tag}
                  onRemove={() => handleRemoveTag(tag)}
                />
              ))}
            </View>
          </View>
        </View>
      </SurfaceCard>
      <SurfaceCard>
        <View style={styles.section}>
          <Typography variant="subtitle" style={styles.sectionTitle}>
            Контент урока
          </Typography>
          <View style={styles.blockList}>
            {blocks.map((block, index) => (
              <SurfaceCard key={block.id} padded style={styles.blockCard}>
                <LessonBlockEditor
                  block={block}
                  onChange={(next) => handleUpdateBlock(index, next)}
                  onRemove={() => handleRemoveBlock(index)}
                  onMoveUp={() =>
                    handleMoveBlock(index, Math.max(0, index - 1))
                  }
                  onMoveDown={() =>
                    handleMoveBlock(
                      index,
                      Math.min(blocks.length - 1, index + 1)
                    )
                  }
                  canMoveUp={index > 0}
                  canMoveDown={index < blocks.length - 1}
                />
              </SurfaceCard>
            ))}
          </View>
          <View style={styles.addBlockContainer}>
            <Typography variant="body" style={styles.sectionDescription}>
              Добавить блок
            </Typography>
            <View style={styles.blockButtons}>
              {blockOptions.map((option) => (
                <View key={option.type} style={styles.blockButton}>
                  <SecondaryButton onPress={() => handleAddBlock(option.type)}>
                    {option.label}
                  </SecondaryButton>
                  <Typography variant="caption" style={styles.blockDescription}>
                    {option.description}
                  </Typography>
                </View>
              ))}
            </View>
          </View>
        </View>
      </SurfaceCard>
      {errorMessage && (
        <Typography
          variant="body"
          style={[styles.errorText, { color: theme.colors.danger }]}
        >
          {errorMessage}
        </Typography>
      )}
      <PrimaryButton
        onPress={handleSubmit}
        disabled={isSaving}
        style={styles.submitButton}
      >
        {isSaving ? "Сохраняем..." : submitText}
      </PrimaryButton>
      <TextButton onPress={handleReset} disabled={isSaving}>
        {resetText}
      </TextButton>
    </ScrollView>
  );
};
const TagChip = ({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) => {
  const theme = useTheme();
  return (
    <View
      style={[
        tagStyles.tagChip,
        {
          backgroundColor: theme.colors.surfaceAlt,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <Typography variant="caption" style={tagStyles.tagText}>
        {label}
      </Typography>
      <TouchableOpacity onPress={onRemove}>
        <Typography
          variant="caption"
          style={[tagStyles.tagRemove, { color: theme.colors.danger }]}
        >
          ×
        </Typography>
      </TouchableOpacity>
    </View>
  );
};
const getStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      paddingHorizontal: 20,
      paddingVertical: 24,
      gap: 16,
    },
    section: {
      gap: 16,
    },
    sectionTitle: {
      marginBottom: 4,
    },
    sectionDescription: {
      color: theme.colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      gap: 16,
    },
    rowItem: {
      flex: 1,
    },
    tagsContainer: {
      gap: 12,
    },
    tagsTitle: {
      marginBottom: 0,
    },
    tagInputRow: {
      flexDirection: "row",
      gap: 12,
      alignItems: "flex-end",
    },
    addTagButton: {
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    tagsList: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8,
    },
    blockList: {
      gap: 12,
    },
    blockCard: {
      borderColor: theme.colors.border,
    },
    addBlockContainer: {
      gap: 12,
    },
    blockButtons: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 12,
    },
    blockButton: {
      width: "48%",
      gap: 4,
    },
    blockDescription: {
      color: theme.colors.textSecondary,
    },
    errorText: {
      fontWeight: "600",
    },
    submitButton: {
      marginTop: 8,
    },
  });
const tagStyles = StyleSheet.create({
  tagChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: {
    fontWeight: "600",
  },
  tagRemove: {
    fontWeight: "700",
    fontSize: 16,
  },
});
