/**
 * MyMemory Translation API service for text translation
 * API Documentation: https://mymemory.translated.net/doc/spec.php
 * Free: 5,000 chars/day (anonymous), 50,000 chars/day with email
 */

const MYMEMORY_API_URL = "https://api.mymemory.translated.net/get";

// Email rotation for fallback when quota is exceeded
// Add multiple emails to get 50k chars/day per email
const CONTACT_EMAILS = [
  "mgodagov@vk.com",
  "mgodagov@gmail.com",
  "mgodagov2@gmail.com",
  "mgodagov3@gmail.com",
  "mgodagov4@gmail.com",
  "mgodago5@gmail.com",
  "mgoda2@gmail.com",
  "mgodagov7@gmail.com",
  "mgodagov452@gmail.com",
  "mgodagortherthv@gmail.com",
];

let currentEmailIndex = 0;

/**
 * Reset email index (useful for testing or daily reset)
 */
export const resetEmailRotation = (): void => {
  currentEmailIndex = 0;
  console.log("[Translator] Email rotation reset to first email");
};

/**
 * Get current email rotation status
 */
export const getEmailRotationStatus = () => {
  return {
    currentIndex: currentEmailIndex,
    currentEmail: CONTACT_EMAILS[currentEmailIndex],
    totalEmails: CONTACT_EMAILS.length,
  };
};

interface MyMemoryMatch {
  id: string;
  segment: string;
  translation: string;
  quality: string;
  reference: string;
  'usage-count': number;
  subject: string;
  'created-by': string;
  'last-updated-by': string;
  'create-date': string;
  'last-update-date': string;
  match: number;
}

interface MyMemoryResponse {
  responseData: {
    translatedText: string;
    match: number;
  };
  quotaFinished: boolean;
  responseStatus: number | string;
  responseDetails?: string;
  matches?: MyMemoryMatch[];
}

// Simple in-memory cache for translations
const translationCache = new Map<string, string>();
const MAX_CACHE_SIZE = 2000; // Increased from 500 for better hit rate

// Cache for translation variants (RU → EN multi-options)
const translationVariantsCache = new Map<string, string[]>();
const MAX_VARIANT_CACHE_SIZE = 1000; // Increased from 300 for better hit rate

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

const getVariantCacheKey = (
  text: string,
  sourceLang: string,
  targetLang: string,
  maxVariants: number
): string => {
  return `${sourceLang}:${targetLang}:${maxVariants}:${text.toLowerCase().trim()}`;
};

const setVariantCache = (key: string, variants: string[]) => {
  if (translationVariantsCache.size >= MAX_VARIANT_CACHE_SIZE) {
    const firstKey = translationVariantsCache.keys().next().value;
    if (firstKey) translationVariantsCache.delete(firstKey);
  }
  translationVariantsCache.set(key, variants);
};

/**
 * Translate text using MyMemory API with email rotation fallback
 * @param text - Text to translate (supports words, phrases, and sentences)
 * @param sourceLang - Source language code (e.g., 'en', 'ru')
 * @param targetLang - Target language code (e.g., 'en', 'ru')
 * @param attemptCount - Internal counter for recursion limit
 * @returns Translated text
 */
export const translateText = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  attemptCount: number = 0
): Promise<string> => {
  if (!text || text.trim().length === 0) {
    return "";
  }

  const trimmedText = text.trim();

  // Check cache first
  const cacheKey = getCacheKey(trimmedText, sourceLang, targetLang);
  const cached = translationCache.get(cacheKey);
  if (cached) {
    console.log("[Translator] Cache hit");
    return cached;
  }

  const startTime = Date.now();

  // Build URL with query parameters
  const url = new URL(MYMEMORY_API_URL);
  url.searchParams.append("q", trimmedText);
  url.searchParams.append("langpair", `${sourceLang}|${targetLang}`);

  // Use current email from rotation
  const currentEmail = CONTACT_EMAILS[currentEmailIndex];
  if (currentEmail) {
    url.searchParams.append("de", currentEmail);
  }

  // OPTIMIZATION: Add timeout to prevent hanging requests
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const elapsed = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Translation API error (${response.status}): ${errorText}`
        );
      }

      const data: MyMemoryResponse = await response.json();

      // Check if quota is finished - try next email
      if (data.quotaFinished) {
        console.log(
          `[Translator] Quota exceeded for email ${currentEmailIndex + 1}/${
            CONTACT_EMAILS.length
          }`
        );

        // Try next email if available
        if (currentEmailIndex < CONTACT_EMAILS.length - 1) {
          currentEmailIndex++;
          console.log(
            `[Translator] Switching to email ${currentEmailIndex + 1}/${
              CONTACT_EMAILS.length
            }`
          );

          // Retry with next email (max attempts = number of emails)
          if (attemptCount < CONTACT_EMAILS.length) {
            return translateText(text, sourceLang, targetLang, attemptCount + 1);
          }
        }

        // All emails exhausted
        throw new Error(
          `Translation quota exceeded for all ${CONTACT_EMAILS.length} email(s). Try again tomorrow.`
        );
      }

      // Check response status
      if (data.responseStatus !== 200 && data.responseStatus !== "200") {
        throw new Error(data.responseDetails || "Translation failed");
      }

      const translatedText = data.responseData.translatedText;

      // Store in cache
      if (translationCache.size >= MAX_CACHE_SIZE) {
        // Remove oldest entry
        const firstKey = translationCache.keys().next().value;
        if (firstKey) translationCache.delete(firstKey);
      }
      translationCache.set(cacheKey, translatedText);

      console.log(
        `[Translator] "${trimmedText}" → "${translatedText}" (${elapsed}ms, match: ${
          data.responseData.match
        }, email: ${currentEmailIndex + 1}/${CONTACT_EMAILS.length})`
      );

      return translatedText;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error("[Translator] Translation error:", error);
    // Handle abort/timeout errors
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Translation request timed out after 5 seconds');
    }
    throw error;
  }
};

/**
 * Get multiple translation variants (useful for RU→EN to improve search accuracy)
 * Returns array of unique translations sorted by quality/match score
 * OPTIMIZED: If maxVariants = 1, uses faster single translation
 */
export const getTranslationVariants = async (
  text: string,
  sourceLang: string,
  targetLang: string,
  maxVariants: number = 5
): Promise<string[]> => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const trimmedText = text.trim();

  // OPTIMIZATION: For single variant, use faster translateText (uses cache)
  if (maxVariants === 1) {
    const translation = await translateText(trimmedText, sourceLang, targetLang);
    return [translation];
  }

  const cacheKey = getVariantCacheKey(trimmedText, sourceLang, targetLang, maxVariants);
  const cachedVariants = translationVariantsCache.get(cacheKey);
  if (cachedVariants) {
    return cachedVariants;
  }

  try {
    // Build URL with query parameters
    const url = new URL(MYMEMORY_API_URL);
    url.searchParams.append("q", trimmedText);
    url.searchParams.append("langpair", `${sourceLang}|${targetLang}`);

    // Use current email from rotation
    const currentEmail = CONTACT_EMAILS[currentEmailIndex];
    if (currentEmail) {
      url.searchParams.append("de", currentEmail);
    }

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Translation API error (${response.status})`);
    }

    const data: MyMemoryResponse = await response.json();

    if (data.quotaFinished) {
      console.warn("[Translator] Quota exceeded when getting variants");
      // Return at least the main translation
      return [data.responseData.translatedText];
    }

    const variants: string[] = [];

    // Add main translation
    variants.push(data.responseData.translatedText);

    // Add alternative translations from matches
    if (data.matches && data.matches.length > 0) {
      data.matches
        .filter((match) => match.match >= 0.7) // Only high-quality matches
        .slice(0, maxVariants - 1) // Leave room for main translation
        .forEach((match) => {
          const translation = match.translation.trim();
          // Add only if unique
          if (translation && !variants.includes(translation)) {
            variants.push(translation);
          }
        });
    }

    const limitedVariants = variants.slice(0, maxVariants);

    setVariantCache(cacheKey, limitedVariants);

    console.log(
      `[Translator] Got ${limitedVariants.length} variant(s) for "${trimmedText}"`
    );

    return limitedVariants;
  } catch (error) {
    console.error("[Translator] Error getting variants:", error);
    // Fallback to regular translation
    const fallback = await translateText(text, sourceLang, targetLang);
    const fallbackVariants = [fallback];
    setVariantCache(cacheKey, fallbackVariants);
    return fallbackVariants;
  }
};

/**
 * Translate from English to Russian
 */
export const translateEnToRu = async (text: string): Promise<string> => {
  return translateText(text, "en", "ru");
};

/**
 * Translate from Russian to English
 */
export const translateRuToEn = async (text: string): Promise<string> => {
  return translateText(text, "ru", "en");
};

/**
 * Clear translation cache
 */
export const clearTranslationCache = (): void => {
  translationCache.clear();
  translationVariantsCache.clear();
  console.log("[Translator] Cache cleared");
};

/**
 * Get cache statistics
 */
export const getCacheStats = () => {
  return {
    size: translationCache.size,
    maxSize: MAX_CACHE_SIZE,
    variantSize: translationVariantsCache.size,
    variantMaxSize: MAX_VARIANT_CACHE_SIZE,
  };
};
