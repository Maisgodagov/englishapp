import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { adminApi, PrecomputedExercise } from "../api/adminApi";

const PAGE_SIZE = 50;

type EditableExercise = {
  id: number;
  prompt: string;
  correctAnswer: string;
  options: string[];
  translations: string[];
  partOfSpeech: string | null;
};

export default function AdminExercisesScreen() {
  const [items, setItems] = useState<PrecomputedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>("");
  const [search, setSearch] = useState("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editing, setEditing] = useState<EditableExercise | null>(null);

  const loadItems = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getPrecomputed(
        page,
        PAGE_SIZE,
        filter || undefined,
        search || undefined,
      );
      setItems(response.items);
      setTotalPages(response.totalPages);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось загрузить упражнения");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, [page, filter, search]);

  const handleEdit = (item: PrecomputedExercise) => {
    const optionsParsed = (() => {
      try {
        const arr = JSON.parse(item.options);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })();
    setEditing({
      id: item.id,
      prompt: item.prompt,
      correctAnswer: item.correct_answer,
      options: optionsParsed,
      translations: item.translations.split("||").filter(Boolean),
      partOfSpeech: item.part_of_speech,
    });
    setEditModalVisible(true);
  };

  const handleSave = async () => {
    if (!editing) return;

    const prompt = editing.prompt.trim();
    const correctAnswer = editing.correctAnswer.trim();
    const options = editing.options.map((o) => o.trim()).filter(Boolean);
    const translations = editing.translations.map((t) => t.trim()).filter(Boolean);
    const partOfSpeech = editing.partOfSpeech?.trim() || null;

    if (!prompt || !correctAnswer || options.length < 1 || translations.length < 1) {
      Alert.alert("Ошибка", "Заполните все поля");
      return;
    }

    try {
      await adminApi.updatePrecomputed(
        editing.id,
        prompt,
        correctAnswer,
        options,
        translations,
        partOfSpeech,
      );
      setEditModalVisible(false);
      loadItems();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Удалить упражнение?", "Это действие нельзя отменить", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.deletePrecomputed(id);
            loadItems();
          } catch (error) {
            Alert.alert("Ошибка", "Не удалось удалить");
          }
        },
      },
    ]);
  };

  const handleModerate = async (id: number, moderated: boolean) => {
    try {
      await adminApi.moderatePrecomputed(id, moderated);
      loadItems();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось подтвердить");
    }
  };

  const renderItem = ({ item }: { item: PrecomputedExercise }) => {
    const translations = item.translations.split("||").slice(0, 3);
    const optionsParsed = (() => {
      try {
        const arr = JSON.parse(item.options);
        return Array.isArray(arr) ? arr : [];
      } catch {
        return [];
      }
    })();

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.wordId}>#{item.id}</Text>
          <Text style={styles.wordText}>{item.word}</Text>
          <View
            style={[
              styles.badge,
              item.moderated ? styles.badgeModerated : styles.badgePending,
            ]}
          >
            <Text style={styles.badgeText}>
              {item.moderated ? "✓ Подтверждено" : "✗ Не подтверждено"}
            </Text>
          </View>
        </View>

        <Text style={styles.direction}>Направление: {item.direction}</Text>
        <Text style={styles.prompt}>Вопрос: {item.prompt}</Text>
        <Text style={styles.correct}>Ответ: {item.correct_answer}</Text>

        <View style={styles.translations}>
          {translations.map((t, idx) => (
            <Text key={idx} style={styles.translationItem}>
              {t}
            </Text>
          ))}
        </View>

        <View style={styles.optionsRow}>
          {optionsParsed.map((opt, idx) => (
            <Text key={idx} style={styles.option}>
              {idx + 1}. {opt}
            </Text>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonEdit]}
            onPress={() => handleEdit(item)}
          >
            <Text style={styles.buttonText}>Редактировать</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.buttonDelete]}
            onPress={() => handleDelete(item.id)}
          >
            <Text style={styles.buttonText}>Удалить</Text>
          </TouchableOpacity>
          {!item.moderated && (
            <TouchableOpacity
              style={[styles.button, styles.buttonConfirm]}
              onPress={() => handleModerate(item.id, true)}
            >
              <Text style={styles.buttonText}>✓ Подтвердить</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Модерация упражнений</Text>

        <View style={styles.filters}>
          <TextInput
            style={styles.searchInput}
            placeholder="Поиск по вопросу"
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
          />

          <TouchableOpacity
            style={[styles.filterButton, filter === "" && styles.filterButtonActive]}
            onPress={() => {
              setFilter("");
              setPage(1);
            }}
          >
            <Text style={styles.filterButtonText}>Все</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === "true" && styles.filterButtonActive]}
            onPress={() => {
              setFilter("true");
              setPage(1);
            }}
          >
            <Text style={styles.filterButtonText}>Подтвержденные</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterButton, filter === "false" && styles.filterButtonActive]}
            onPress={() => {
              setFilter("false");
              setPage(1);
            }}
          >
            <Text style={styles.filterButtonText}>Неподтвержденные</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.pagination}>
          <TouchableOpacity
            style={[styles.pageButton, page === 1 && styles.pageButtonDisabled]}
            onPress={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <Text style={styles.pageButtonText}>← Назад</Text>
          </TouchableOpacity>

          <Text style={styles.pageInfo}>
            Страница {page} из {totalPages}
          </Text>

          <TouchableOpacity
            style={[styles.pageButton, page >= totalPages && styles.pageButtonDisabled]}
            onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            <Text style={styles.pageButtonText}>Вперед →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" style={styles.loader} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Редактировать упражнение</Text>

              <Text style={styles.label}>Вопрос (prompt)</Text>
              <TextInput
                style={styles.input}
                value={editing?.prompt ?? ""}
                onChangeText={(t) => setEditing((prev) => (prev ? { ...prev, prompt: t } : prev))}
                placeholder="Вопрос"
              />

              <Text style={styles.label}>Правильный ответ</Text>
              <TextInput
                style={styles.input}
                value={editing?.correctAnswer ?? ""}
                onChangeText={(t) => setEditing((prev) => (prev ? { ...prev, correctAnswer: t } : prev))}
                placeholder="Ответ"
              />

              <Text style={styles.label}>Опции (по одной в строке)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editing?.options.join("\n") ?? ""}
                onChangeText={(t) =>
                  setEditing((prev) =>
                    prev ? { ...prev, options: t.split("\n").map((x) => x.trim()) } : prev,
                  )
                }
                placeholder="вариант 1"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Переводы (по одному в строке)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editing?.translations.join("\n") ?? ""}
                onChangeText={(t) =>
                  setEditing((prev) =>
                    prev ? { ...prev, translations: t.split("\n").map((x) => x.trim()) } : prev,
                  )
                }
                placeholder="перевод 1"
                multiline
                numberOfLines={4}
              />

              <Text style={styles.label}>Часть речи (optional)</Text>
              <TextInput
                style={styles.input}
                value={editing?.partOfSpeech ?? ""}
                onChangeText={(t) =>
                  setEditing((prev) => (prev ? { ...prev, partOfSpeech: t } : prev))
                }
                placeholder="noun, verb..."
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.buttonText}>Отмена</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSave]}
                  onPress={handleSave}
                >
                  <Text style={styles.buttonText}>Сохранить</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  header: {
    backgroundColor: "#fff",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 16 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  searchInput: {
    flex: 1,
    minWidth: 200,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#e0e0e0",
  },
  filterButtonActive: { backgroundColor: "#007bff" },
  filterButtonText: { color: "#333", fontSize: 14 },
  pagination: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pageButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#007bff",
  },
  pageButtonDisabled: { backgroundColor: "#ccc" },
  pageButtonText: { color: "#fff", fontSize: 14 },
  pageInfo: { fontSize: 14, color: "#666" },
  loader: { marginTop: 32 },
  list: { padding: 16 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 8, gap: 8 },
  wordId: { fontSize: 12, color: "#999" },
  wordText: { fontSize: 18, fontWeight: "bold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeModerated: { backgroundColor: "#d4edda" },
  badgePending: { backgroundColor: "#fff3cd" },
  badgeText: { fontSize: 12, fontWeight: "500" },
  direction: { fontSize: 14, color: "#555", marginBottom: 4 },
  prompt: { fontSize: 14, color: "#333", marginBottom: 4 },
  correct: { fontSize: 14, color: "#111", fontWeight: "600", marginBottom: 4 },
  translations: { marginBottom: 6, gap: 4 },
  translationItem: { fontSize: 13, color: "#555" },
  optionsRow: { marginBottom: 8, gap: 4 },
  option: { fontSize: 13, color: "#444" },
  actions: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  button: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6 },
  buttonEdit: { backgroundColor: "#ffc107" },
  buttonDelete: { backgroundColor: "#dc3545" },
  buttonConfirm: { backgroundColor: "#28a745" },
  buttonText: { color: "#fff", fontSize: 13, fontWeight: "500" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    maxHeight: "80%",
  },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", marginBottom: 8, color: "#333" },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 12 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  modalButtonCancel: { backgroundColor: "#6c757d" },
  modalButtonSave: { backgroundColor: "#28a745" },
});
