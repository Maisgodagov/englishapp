/**
 * Unified Translation Service
 * Primary: Yandex Cloud Translate API
 * Fallback: MyMemory API (free tier with email rotation)
 */

import * as YandexTranslator from './yandexCloudTranslator';

// MyMemory API fallback configuration
const MYMEMORY_API_URL = 'https://api.mymemory.translated.net/get';
const CONTACT_EMAILS = [
  'mgodagov@vk.com',
  'mgodagov@gmail.com',
  'mgodagov2@gmail.com',
  'mgodagov3@gmail.com',
];

let currentEmailIndex = 0;

type LanguageCode = 'en' | 'ru';

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished: boolean;
  responseStatus: number | string;
  responseDetails?: string;
  matches?: Array<{
    translation: string;
    match: number;
  }>;
}

// Unified cache for all translations
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

const getCacheKey = (text: string, sourceLang: string, targetLang: string): string =>
  `${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;

const setCacheValue = (key: string, value: string) => {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) translationCache.delete(firstKey);
  }
  translationCache.set(key, value);
};

/**
 * Fallback translation using MyMemory API
 */
const translateWithMyMemory = async (
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string> => {
  const url = new URL(MYMEMORY_API_URL);
  url.searchParams.append('q', text);
  url.searchParams.append('langpair', `${sourceLang}|${targetLang}`);

  const currentEmail = CONTACT_EMAILS[currentEmailIndex];
  if (currentEmail) {
    url.searchParams.append('de', currentEmail);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data: MyMemoryResponse = await response.json();

    if (data.quotaFinished) {
      if (currentEmailIndex < CONTACT_EMAILS.length - 1) {
        currentEmailIndex++;
        console.log(`[Translator] MyMemory quota exceeded, switching email ${currentEmailIndex + 1}/${CONTACT_EMAILS.length}`);
        return translateWithMyMemory(text, sourceLang, targetLang);
      }
      throw new Error('MyMemory quota exhausted for all emails');
    }

    if (data.responseStatus !== 200 && data.responseStatus !== '200') {
      throw new Error(data.responseDetails || 'MyMemory translation failed');
    }

    return data.responseData.translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

/**
 * Main translation function with Yandex + MyMemory fallback
 */
export const translateText = async (
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string> => {
  if (!text || !text.trim()) {
    return '';
  }

  const trimmed = text.trim();
  const cacheKey = getCacheKey(trimmed, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log('[Translator] Cache hit');
    return cached;
  }

  const start = Date.now();

  try {
    // Try Yandex first
    const translated = await YandexTranslator.translateText(trimmed, sourceLang, targetLang);
    const elapsed = Date.now() - start;
    console.log(`[Translator] Yandex: "${trimmed}" → "${translated}" (${elapsed}ms)`);
    setCacheValue(cacheKey, translated);
    return translated;
  } catch (yandexError) {
    console.warn('[Translator] Yandex failed, falling back to MyMemory:', yandexError);

    try {
      // Fallback to MyMemory
      const translated = await translateWithMyMemory(trimmed, sourceLang, targetLang);
      const elapsed = Date.now() - start;
      console.log(`[Translator] MyMemory fallback: "${trimmed}" → "${translated}" (${elapsed}ms)`);
      setCacheValue(cacheKey, translated);
      return translated;
    } catch (myMemoryError) {
      console.error('[Translator] Both Yandex and MyMemory failed:', myMemoryError);
      throw new Error('Translation failed: both services unavailable');
    }
  }
};

/**
 * Get translation variants (for search optimization)
 * Uses MyMemory as it provides multiple variants
 */
export const getTranslationVariants = async (
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode,
  maxVariants: number = 5
): Promise<string[]> => {
  if (!text || !text.trim()) {
    return [];
  }

  // For single variant, use main translation
  if (maxVariants === 1) {
    const translation = await translateText(text, sourceLang, targetLang);
    return [translation];
  }

  const trimmed = text.trim();

  try {
    const url = new URL(MYMEMORY_API_URL);
    url.searchParams.append('q', trimmed);
    url.searchParams.append('langpair', `${sourceLang}|${targetLang}`);

    const currentEmail = CONTACT_EMAILS[currentEmailIndex];
    if (currentEmail) {
      url.searchParams.append('de', currentEmail);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error('Failed to get variants');
    }

    const data: MyMemoryResponse = await response.json();

    const variants: string[] = [data.responseData.translatedText];

    if (data.matches && data.matches.length > 0) {
      data.matches
        .filter((match) => match.match >= 0.7)
        .slice(0, maxVariants - 1)
        .forEach((match) => {
          const translation = match.translation.trim();
          if (translation && !variants.includes(translation)) {
            variants.push(translation);
          }
        });
    }

    return variants.slice(0, maxVariants);
  } catch (error) {
    console.warn('[Translator] Failed to get variants, using single translation:', error);
    const fallback = await translateText(text, sourceLang, targetLang);
    return [fallback];
  }
};

export const translateEnToRu = (text: string) => translateText(text, 'en', 'ru');
export const translateRuToEn = (text: string) => translateText(text, 'ru', 'en');

export const clearTranslationCache = () => {
  translationCache.clear();
  YandexTranslator.clearTranslationCache();
  console.log('[Translator] Cache cleared');
};

export const getCacheStats = () => ({
  size: translationCache.size,
  maxSize: MAX_CACHE_SIZE,
  yandex: YandexTranslator.getCacheStats(),
});
