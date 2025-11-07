/**
 * Yandex Cloud Translate API client
 * Docs: https://cloud.yandex.com/en/docs/translate/api-ref/Translate/translate
 */

const YANDEX_TRANSLATE_URL = 'https://translate.api.cloud.yandex.net/translate/v2/translate';

const API_KEY = process.env.EXPO_PUBLIC_YANDEX_TRANSLATE_API_KEY;
const FOLDER_ID = process.env.EXPO_PUBLIC_YANDEX_FOLDER_ID;

if (!API_KEY) {
  console.warn('[YandexTranslate] Missing EXPO_PUBLIC_YANDEX_TRANSLATE_API_KEY in .env');
}

if (!FOLDER_ID) {
  console.warn('[YandexTranslate] Missing EXPO_PUBLIC_YANDEX_FOLDER_ID in .env');
}

type LanguageCode = 'en' | 'ru';

interface TranslateResponse {
  translations: Array<{
    text: string;
    detectedLanguageCode?: string;
  }>;
}

const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 1000;

const getCacheKey = (text: string, sourceLang: string, targetLang: string): string =>
  `${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;

const setCacheValue = (key: string, value: string) => {
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    if (firstKey) {
      translationCache.delete(firstKey);
    }
  }
  translationCache.set(key, value);
};

const requestTranslate = async (
  text: string,
  sourceLang: LanguageCode,
  targetLang: LanguageCode
): Promise<string> => {
  if (!API_KEY || !FOLDER_ID) {
    throw new Error('Yandex Translate API key or folder ID is not configured');
  }

  const payload = {
    folderId: FOLDER_ID,
    texts: [text],
    sourceLanguageCode: sourceLang,
    targetLanguageCode: targetLang,
    format: 'PLAIN_TEXT',
  };

  const response = await fetch(YANDEX_TRANSLATE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Api-Key ${API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(
      `[YandexTranslate] API error ${response.status}: ${errorBody || response.statusText}`
    );
  }

  const data = (await response.json()) as TranslateResponse;
  if (!data.translations || data.translations.length === 0) {
    throw new Error('[YandexTranslate] Empty translation response');
  }

  return data.translations[0].text;
};

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
    return cached;
  }

  const start = Date.now();
  const translated = await requestTranslate(trimmed, sourceLang, targetLang);
  const elapsed = Date.now() - start;
  console.log(`[YandexTranslate] "${trimmed}" → "${translated}" (${elapsed}ms)`);

  setCacheValue(cacheKey, translated);
  return translated;
};

export const translateEnToRu = (text: string) => translateText(text, 'en', 'ru');
export const translateRuToEn = (text: string) => translateText(text, 'ru', 'en');

export const clearTranslationCache = () => {
  translationCache.clear();
  console.log('[YandexTranslate] Cache cleared');
};

export const getCacheStats = () => ({
  size: translationCache.size,
  maxSize: MAX_CACHE_SIZE,
});
