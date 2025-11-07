import { apiFetch } from '@shared/api/client';

const basePath = 'dictionary';

export interface UserDictionaryEntry {
  id: string;
  word: string;
  translation: string;
  transcription?: string;
  partOfSpeech?: string;
  audioUrl?: string;
  sourceLang: string;
  targetLang: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDictionaryEntry {
  word: string;
  translation: string;
  transcription?: string;
  partOfSpeech?: string;
  audioUrl?: string;
  sourceLang?: string;
  targetLang?: string;
}

const headersWithUser = (userId: string) => ({ 'x-user-id': userId });

export const dictionaryApi = {
  getUserDictionary(userId: string) {
    return apiFetch<UserDictionaryEntry[]>(basePath, {
      headers: headersWithUser(userId),
    });
  },
  addUserDictionaryEntry(userId: string, payload: CreateUserDictionaryEntry) {
    return apiFetch<UserDictionaryEntry>(basePath, {
      method: 'POST',
      headers: headersWithUser(userId),
      body: payload,
    });
  },
  deleteUserDictionaryEntry(userId: string, id: string) {
    return apiFetch<void>(`${basePath}/${id}`, {
      method: 'DELETE',
      headers: headersWithUser(userId),
    });
  },
};


