import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { Typography } from '@shared/ui';

import type { TranscriptChunk } from '../api/videoLearningApi';

type SubtitleChunkEditorProps = {
  visible: boolean;
  englishValue: string;
  russianValue: string;
  englishTimestamp?: TranscriptChunk['timestamp'];
  russianTimestamp?: TranscriptChunk['timestamp'];
  onChangeEnglish: (value: string) => void;
  onChangeRussian: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  isSaving: boolean;
};

const formatTimestamp = (timestamp?: TranscriptChunk['timestamp']) => {
  if (!timestamp) return '';
  const formatPart = (value: number) => {
    const minutes = Math.floor(value / 60);
    const seconds = Math.floor(value % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  const [start, end] = timestamp;
  return `${formatPart(start)} – ${formatPart(end)}`;
};

export const SubtitleChunkEditor = ({
  visible,
  englishValue,
  russianValue,
  englishTimestamp,
  russianTimestamp,
  onChangeEnglish,
  onChangeRussian,
  onClose,
  onSave,
  isSaving,
}: SubtitleChunkEditorProps) => {
  if (!visible) {
    return null;
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        pointerEvents="box-none"
      >
        <View style={styles.backdrop} />
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Typography variant="title" style={styles.modalTitle}>
              Редактирование субтитров
            </Typography>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Typography variant="caption" style={styles.fieldLabel}>
                Английские субтитры
              </Typography>
              {englishTimestamp && (
                <Typography variant="caption" style={styles.timestamp}>
                  {formatTimestamp(englishTimestamp)}
                </Typography>
              )}
            </View>
            <TextInput
              multiline
              value={englishValue}
              onChangeText={onChangeEnglish}
              placeholder="Введите текст субтитров"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.textArea}
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
          </View>

          <View style={styles.fieldContainer}>
            <View style={styles.fieldHeader}>
              <Typography variant="caption" style={styles.fieldLabel}>
                Русские субтитры
              </Typography>
              {russianTimestamp && (
                <Typography variant="caption" style={styles.timestamp}>
                  {formatTimestamp(russianTimestamp)}
                </Typography>
              )}
            </View>
            <TextInput
              multiline
              value={russianValue}
              onChangeText={onChangeRussian}
              placeholder="Введите перевод"
              placeholderTextColor="rgba(255,255,255,0.4)"
              style={styles.textArea}
              textAlignVertical="top"
              autoCorrect={false}
              autoCapitalize="sentences"
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, styles.cancelButton]} onPress={onClose} disabled={isSaving}>
              <Typography variant="button" style={styles.cancelLabel}>
                Отмена
              </Typography>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.saveButton]}
              onPress={onSave}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#051923" />
              ) : (
                <Typography variant="button" style={styles.saveLabel}>
                  Сохранить
                </Typography>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  modalContent: {
    width: '92%',
    backgroundColor: 'rgba(9, 12, 23, 0.95)',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeButton: {
    padding: 4,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  timestamp: {
    color: 'rgba(255,255,255,0.5)',
    fontWeight: '500',
  },
  textArea: {
    minHeight: 80,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#FFFFFF',
    backgroundColor: 'rgba(6, 9, 16, 0.8)',
    fontSize: 16,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  actionButton: {
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    marginRight: 12,
  },
  saveButton: {
    backgroundColor: '#9dff80',
  },
  cancelLabel: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  saveLabel: {
    color: '#051923',
    fontWeight: '700',
  },
});

export default SubtitleChunkEditor;
