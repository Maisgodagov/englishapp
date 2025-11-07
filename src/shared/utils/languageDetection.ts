/**
 * Simple language detection for EN/RU text
 */

const CYRILLIC_REGEX = /[\u0400-\u04FF]/;
const LATIN_REGEX = /[a-zA-Z]/;

export type DetectedLanguage = 'en' | 'ru' | 'unknown';

/**
 * Detect if text is in English or Russian
 */
export const detectLanguage = (text: string): DetectedLanguage => {
  if (!text || text.trim().length === 0) {
    return 'unknown';
  }

  const trimmed = text.trim();

  // Check for Cyrillic characters
  const hasCyrillic = CYRILLIC_REGEX.test(trimmed);

  // Check for Latin characters
  const hasLatin = LATIN_REGEX.test(trimmed);

  // Determine language based on character presence
  if (hasCyrillic && !hasLatin) {
    return 'ru';
  }

  if (hasLatin && !hasCyrillic) {
    return 'en';
  }

  // Mixed or no alphabetic characters
  if (hasCyrillic && hasLatin) {
    // Count which is more prevalent
    const cyrillicCount = (trimmed.match(CYRILLIC_REGEX) || []).length;
    const latinCount = (trimmed.match(LATIN_REGEX) || []).length;

    return cyrillicCount > latinCount ? 'ru' : 'en';
  }

  return 'unknown';
};
