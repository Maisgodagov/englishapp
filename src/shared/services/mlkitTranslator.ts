/**
 * ML Kit Translator - Local on-device translation using Google ML Kit
 * Faster and works offline, no API limits
 */

import FastTranslator from 'fast-mlkit-translate-text';

// Language codes for ML Kit (different from MyMemory API)
const ML_KIT_LANGUAGES = {
  en: 'English',
  ru: 'Russian',
} as const;

// Simple in-memory cache for translations
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000;

// Track which language pairs have been prepared (models downloaded)
const preparedLanguagePairs = new Set<string>();

/**
 * Get cache key for translation
 */
const getCacheKey = (
  text: string,
  sourceLang: string,
  targetLang: string
): string => {
  return `${sourceLang}:${targetLang}:${text.toLowerCase().trim()}`;
};

/**
 * Prepare language model (download if needed)
 * Must be called before each translation to set the correct language pair
 */
const prepareLanguageModel = async (
  sourceLang: string,
  targetLang: string
): Promise<void> => {
  const pairKey = `${sourceLang}-${targetLang}`;

  const sourceLanguage = ML_KIT_LANGUAGES[sourceLang as keyof typeof ML_KIT_LANGUAGES];
  const targetLanguage = ML_KIT_LANGUAGES[targetLang as keyof typeof ML_KIT_LANGUAGES];

  if (!sourceLanguage || !targetLanguage) {
    throw new Error(`Unsupported language pair: ${sourceLang} -> ${targetLang}`);
  }

  // Check if model is already downloaded (to avoid re-downloading)
  const isDownloaded = preparedLanguagePairs.has(pairKey);

  if (!isDownloaded) {
    console.log(`[MLKitTranslator] Downloading model: ${sourceLanguage} -> ${targetLanguage}`);
  }

  try {
    // IMPORTANT: Always call prepare() to set the active language pair
    // even if the model is already downloaded
    await FastTranslator.prepare({
      source: sourceLanguage,
      target: targetLanguage,
      downloadIfNeeded: true,
    });

    if (!isDownloaded) {
      preparedLanguagePairs.add(pairKey);
      console.log(`[MLKitTranslator] Model downloaded: ${sourceLanguage} -> ${targetLanguage}`);
    }
  } catch (error) {
    console.error(`[MLKitTranslator] Failed to prepare model:`, error);
    throw error;
  }
};

/**
 * Translate text using ML Kit (on-device, offline)
 * @param text - Text to translate
 * @param sourceLang - Source language code ('en' or 'ru')
 * @param targetLang - Target language code ('en' or 'ru')
 * @returns Translated text
 */
export const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<string> => {
  if (!text || text.trim().length === 0) {
    return '';
  }

  const trimmedText = text.trim();

  // Check cache first
  const cacheKey = getCacheKey(trimmedText, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log('[MLKitTranslator] Cache hit');
    return cached;
  }

  const startTime = Date.now();

  try {
    // Prepare language model (download if needed)
    await prepareLanguageModel(sourceLang, targetLang);

    // Translate
    const translatedText = await FastTranslator.translate(trimmedText);
    const elapsed = Date.now() - startTime;

    // Store in cache
    if (translationCache.size >= MAX_CACHE_SIZE) {
      const firstKey = translationCache.keys().next().value;
      if (firstKey) translationCache.delete(firstKey);
    }
    translationCache.set(cacheKey, translatedText);

    console.log(
      `[MLKitTranslator] "${trimmedText}" → "${translatedText}" (${elapsed}ms, on-device)`
    );

    return translatedText;
  } catch (error) {
    console.error('[MLKitTranslator] Translation error:', error);
    throw error;
  }
};

/**
 * Get multiple translation variants (for ML Kit, we only return one variant)
 * ML Kit doesn't support multiple variants, so this returns single translation
 */
export const getTranslationVariants = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  maxVariants: number = 1
): Promise<string[]> => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const translation = await translateText(text, sourceLang, targetLang);
  return [translation];
};

/**
 * Translate from English to Russian
 */
export const translateEnToRu = async (text: string): Promise<string> => {
  return translateText(text, 'en', 'ru');
};

/**
 * Translate from Russian to English
 */
export const translateRuToEn = async (text: string): Promise<string> => {
  return translateText(text, 'ru', 'en');
};

/**
 * Clear translation cache
 */
export const clearTranslationCache = (): void => {
  translationCache.clear();
  console.log('[MLKitTranslator] Cache cleared');
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: translationCache.size,
    maxSize: MAX_CACHE_SIZE,
    preparedModels: Array.from(preparedLanguagePairs),
  };
};

/**
 * Pre-download language models for faster first translation
 * Call this on app startup or when user navigates to phrase search
 */
export const preloadLanguageModels = async (): Promise<void> => {
  console.log('[MLKitTranslator] Preloading language models...');

  try {
    // Preload both directions
    await Promise.all([
      prepareLanguageModel('ru', 'en'),
      prepareLanguageModel('en', 'ru'),
    ]);
    console.log('[MLKitTranslator] Language models preloaded successfully');
  } catch (error) {
    console.error('[MLKitTranslator] Failed to preload models:', error);
  }
};
