const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type MuellerWord = {
  id: number;
  word: string;
  part_of_speech: string | null;
  translations: string;
  moderated: number;
};

export type WordsResponse = {
  words: MuellerWord[];
  total: number;
  page: number;
  totalPages: number;
};

export type PrecomputedExercise = {
  id: number;
  word_id: number;
  word: string;
  part_of_speech: string | null;
  translations: string;
  direction: 'en-ru' | 'ru-en';
  prompt: string;
  correct_answer: string;
  options: string;
  moderated: number;
};

export type PrecomputedResponse = {
  items: PrecomputedExercise[];
  total: number;
  page: number;
  totalPages: number;
};

export const adminApi = {
  async getWords(page: number, limit: number, moderated?: string, search?: string): Promise<WordsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(moderated && { moderated }),
      ...(search && { search }),
    });

    const response = await fetch(`${API_URL}/admin/words?${params}`);
    if (!response.ok) throw new Error('Failed to fetch words');
    return response.json();
  },

  async getPrecomputed(page: number, limit: number, moderated?: string, search?: string): Promise<PrecomputedResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(moderated && { moderated }),
      ...(search && { search }),
    });

    const response = await fetch(`${API_URL}/admin/exercises?${params}`);
    if (!response.ok) throw new Error('Failed to fetch precomputed exercises');
    return response.json();
  },

  async updatePrecomputed(
    id: number,
    prompt: string,
    correctAnswer: string,
    options: string[],
    translations: string[],
    partOfSpeech: string | null,
  ): Promise<void> {
    const response = await fetch(`${API_URL}/admin/exercises/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, correctAnswer, options, translations, partOfSpeech }),
    });

    if (!response.ok) throw new Error('Failed to update precomputed exercise');
  },

  async deletePrecomputed(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/admin/exercises/${id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Failed to delete precomputed exercise');
  },

  async moderatePrecomputed(id: number, moderated: boolean): Promise<void> {
    const response = await fetch(`${API_URL}/admin/exercises/${id}/moderate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderated }),
    });
    if (!response.ok) throw new Error('Failed to moderate precomputed exercise');
  },

  async updateWord(
    id: number,
    word: string,
    partOfSpeech: string | null,
    translations: string[],
  ): Promise<void> {
    const response = await fetch(`${API_URL}/admin/words/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, partOfSpeech, translations }),
    });

    if (!response.ok) throw new Error('Failed to update word');
  },

  async deleteWord(id: number): Promise<void> {
    const response = await fetch(`${API_URL}/admin/words/${id}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Failed to delete word');
  },

  async moderateWord(id: number, moderated: boolean): Promise<void> {
    const response = await fetch(`${API_URL}/admin/words/${id}/moderate`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ moderated }),
    });

    if (!response.ok) throw new Error('Failed to moderate word');
  },
};
