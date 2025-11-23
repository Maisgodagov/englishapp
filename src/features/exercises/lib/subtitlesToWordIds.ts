import { wordIdsFromFormsDb } from './formsDb';

// Split text into words, filtering empty strings
const splitWords = (text: string): string[] =>
  text
    .split(/[^A-Za-z'\-]+/g)
    .filter(Boolean);

type SubtitleChunk = { text: string };

export const wordIdsFromSubtitles = async (
  subtitles: (string | SubtitleChunk)[],
  options?: { limit?: number },
): Promise<number[]> => {
  if (!subtitles.length) return [];
  const forms: string[] = [];

  for (const item of subtitles) {
    const text = typeof item === 'string' ? item : item.text;
    if (!text) continue;
    forms.push(...splitWords(text));
  }

  return wordIdsFromFormsDb(forms, options?.limit);
};
