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

import { adminApi, MuellerWord } from "../api/adminApi";

const PAGE_SIZE = 50;

export default function AdminDictionaryScreen() {
  const [words, setWords] = useState<MuellerWord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState<string>("");

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingWord, setEditingWord] = useState<MuellerWord | null>(null);
  const [editWordText, setEditWordText] = useState("");
  const [editPos, setEditPos] = useState("");
  const [editTranslations, setEditTranslations] = useState("");

  const loadWords = async () => {
    try {
      setLoading(true);
      const response = await adminApi.getWords(page, PAGE_SIZE, filter || undefined);
      setWords(response.words);
      setTotalPages(response.totalPages);
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось загрузить слова");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
  }, [page, filter]);

  const handleEdit = (word: MuellerWord) => {
    setEditingWord(word);
    setEditWordText(word.word);
    setEditPos(word.part_of_speech ?? "");
    setEditTranslations(word.translations.split("||").join("\n"));
    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!editingWord) return;

    const translations = editTranslations
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await adminApi.updateWord(
        editingWord.id,
        editWordText.trim(),
        editPos.trim() || null,
        translations
      );
      setEditModalVisible(false);
      loadWords();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось сохранить изменения");
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert("Удалить слово?", "Это действие нельзя отменить", [
      { text: "Отмена", style: "cancel" },
      {
        text: "Удалить",
        style: "destructive",
        onPress: async () => {
          try {
            await adminApi.deleteWord(id);
            loadWords();
          } catch (error) {
            Alert.alert("Ошибка", "Не удалось удалить слово");
          }
        },
      },
    ]);
  };

  const handleModerate = async (id: number, moderated: boolean) => {
    try {
      await adminApi.moderateWord(id, moderated);
      loadWords();
    } catch (error) {
      Alert.alert("Ошибка", "Не удалось подтвердить слово");
    }
  };

  const renderItem = ({ item }: { item: MuellerWord }) => {
    const translations = item.translations.split("||").slice(0, 3);

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
              {item.moderated ? "✓ Подтвержден" : "✗ Не подтвержден"}
            </Text>
          </View>
        </View>

        <View style={styles.translations}>
          {translations.map((t, idx) => (
            <Text key={idx} style={styles.translationItem}>
              {t}
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
        <Text style={styles.title}>Словарь Мюллера</Text>

        <View style={styles.filters}>
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
          data={words}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
        />
      )}

      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <ScrollView>
              <Text style={styles.modalTitle}>Редактировать слово</Text>

              <Text style={styles.label}>Английское слово</Text>
              <TextInput
                style={styles.input}
                value={editWordText}
                onChangeText={setEditWordText}
                placeholder="Слово"
              />

              <Text style={styles.label}>Часть речи (при необходимости)</Text>
              <TextInput
                style={styles.input}
                value={editPos}
                onChangeText={setEditPos}
                placeholder="noun, verb..."
              />

              <Text style={styles.label}>Переводы (по одному в строке)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={editTranslations}
                onChangeText={setEditTranslations}
                placeholder="перевод 1"
                multiline
                numberOfLines={8}
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
                  onPress={handleSaveEdit}
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
  filters: { flexDirection: "row", gap: 8, marginBottom: 16 },
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  wordId: { fontSize: 12, color: "#999" },
  wordText: { fontSize: 18, fontWeight: "bold", flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  badgeModerated: { backgroundColor: "#d4edda" },
  badgePending: { backgroundColor: "#fff3cd" },
  badgeText: { fontSize: 12, fontWeight: "500" },
  translations: { marginBottom: 12, gap: 4 },
  translationItem: { fontSize: 14, color: "#555" },
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
    marginBottom: 16,
  },
  textArea: { minHeight: 120, textAlignVertical: "top" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 16 },
  modalButton: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: "center" },
  modalButtonCancel: { backgroundColor: "#6c757d" },
  modalButtonSave: { backgroundColor: "#28a745" },
});
